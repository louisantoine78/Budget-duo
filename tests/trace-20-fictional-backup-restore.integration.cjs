'use strict';
// TRACE 2.0 recovery rehearsal. Two ephemeral PostgreSQL WASM instances,
// invented identities and data, no network, no Supabase project or production.
// Usage: TRACE_PGLITE_MODULE=... node tests/trace-20-fictional-backup-restore.integration.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {PGlite}=require(process.env.TRACE_PGLITE_MODULE||'@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const migrations={
 5:'trace-v5-foundation',6:'trace-import-day-states',
 7:'trace-account-owner-write-guard',8:'trace-personal-settings-owner-guard',
 9:'trace-cas-versioned-writes',10:'trace-deferred-write-quarantine',
 11:'trace-csv-unparsed-owner-privacy',12:'trace-cas-exclusive-write-cutover'
};
const as=(db,n,fn)=>db.transaction(async tx=>{
 await tx.exec('set local role authenticated');
 await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid(n)]);
 return fn(tx);
});
const save=(db,n,hid,coll,id,data,rev)=>as(db,n,tx=>tx.query(
 'select public.trace_cas_save_document($1,$2,$3,$4,$5) as revision',
 [hid,coll,id,JSON.stringify(data),rev]));
const read=(db,n,hid,coll,id)=>as(db,n,tx=>tx.query(
 'select item_id,data,revision from public.documents where household_id=$1 and collection=$2 and item_id=$3',
 [hid,coll,id]));
const members=(db,n,hid)=>as(db,n,tx=>tx.query(
 'select user_id,slot from public.household_members where household_id=$1 order by slot',[hid]));
async function digest(db){
 const pieces=[];
 for(const [table,order] of [
  ['households','id'],['household_members','household_id,user_id'],
  ['documents','household_id,collection,item_id']]){
  const {rows}=await db.query('select * from public.'+table+' order by '+order);
  pieces.push({table,rows});
 }
 return createHash('sha256').update(JSON.stringify(pieces)).digest('hex');
}
async function bootstrap(db){
 await db.exec('create role anon; create role authenticated; create schema auth;'+
  'create table auth.users(id uuid primary key);'+
  "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;"+
  'grant usage on schema auth to authenticated;');
 for(let i=1;i<=4;i++)await db.query('insert into auth.users(id) values($1)',[uid(i)]);
 await db.exec((await fs.readFile(path.join(root,'supabase-schema.sql'),'utf8'))
  .replace('create extension if not exists pgcrypto;',''));
 const h1=(await as(db,1,tx=>tx.query("select * from public.create_household('Fictional family A','Alex')"))).rows[0];
 await as(db,2,tx=>tx.query('select * from public.join_household($1,$2)',[h1.invite_code,'Camille']));
 const h2=(await as(db,3,tx=>tx.query("select * from public.create_household('Fictional family B','Robin')"))).rows[0];
 for(const [n,name] of Object.entries(migrations).map(([n,name])=>[n,name])){
  const sql=await fs.readFile(path.join(root,'migrations',String(n).padStart(2,'0')+'-'+name+'.sql'),'utf8');
  await db.exec(sql);
 }
 return{familyA:h1.household_id,familyB:h2.household_id};
}
async function run(){
 let source=null,target=null,checks=0;
 const ok=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
 try{
  source=new PGlite();
  const {familyA,familyB}=await bootstrap(source);
  const cad={id:'cad-chequing',type:'checking',owner:'la',currency:'CAD',country:'CA',name:'Fictional Canada'};
  const eur={id:'eur-current',type:'checking',owner:'partner',currency:'EUR',country:'FR',name:'Fictional France'};
  const trans={id:'eur-purchase',type:'expense',status:'pending',date:'2026-11-02',
   accountId:'eur-current',bankCurrency:'EUR',bankAmount:49.25,currency:'EUR',
   amountOriginal:49.25,name:'Fictional purchase',importFileName:'demo.csv'};
  await ok('independent fictional users create two isolated households',async()=>{
   assert.equal((await members(source,1,familyA)).rows.length,2);
   assert.equal((await members(source,3,familyB)).rows.length,1);
   assert.equal((await members(source,4,familyA)).rows.length,0);
  });
  await ok('CAS records distinct native CAD/EUR bank accounts and pending import evidence',async()=>{
   assert.equal((await save(source,1,familyA,'accounts',cad.id,cad,null)).rows[0].revision,0);
   assert.equal((await save(source,2,familyA,'accounts',eur.id,eur,null)).rows[0].revision,0);
   const legacyShared={id:'legacy-shared',owner:'household',type:'other',
    currency:'CAD',name:'Shared fictional legacy'};
   assert.equal((await save(source,1,familyA,'accounts',legacyShared.id,legacyShared,null)).rows[0].revision,0);
   assert.equal((await save(source,2,familyA,'accounts',legacyShared.id,
    {...legacyShared,name:'Shared reviewed'},0)).rows[0].revision,1);
   assert.equal((await save(source,2,familyA,'transactions',trans.id,trans,null)).rows[0].revision,0);
   const updated={...trans,note:'Verified fictional review'};
   assert.equal((await save(source,2,familyA,'transactions',trans.id,updated,0)).rows[0].revision,1);
   const separate={id:'house-b-only',type:'expense',accountId:'none',status:'pending',
    date:'2026-11-01',amountOriginal:18,currency:'CAD',name:'Other fictional household'};
   assert.equal((await save(source,3,familyB,'transactions',separate.id,separate,null)).rows[0].revision,0);
  });
  await ok('owner guard and cross-household CAS deny foreign mutations before backup',async()=>{
   await assert.rejects(save(source,1,familyA,'accounts',eur.id,{...eur,name:'forged'},0),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(save(source,3,familyA,'transactions','intrusion',{id:'intrusion'},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(save(source,4,familyA,'transactions','intrusion2',{id:'intrusion2'},null),/TRACE_WRITE_FORBIDDEN/);
  });
  let beforeDigest=await digest(source);
  let snapshot=null,snapshotHash=null;
  await ok('create independent binary PostgreSQL snapshot with SHA-256 evidence',async()=>{
   snapshot=await source.dumpDataDir();
   const bytes=Buffer.from(await snapshot.arrayBuffer());
   assert.ok(bytes.length>102400,'snapshot should contain a real PGDATA image');
   snapshotHash=createHash('sha256').update(bytes).digest('hex');
   assert.match(snapshotHash,/^[0-9a-f]{64}$/);
  });
  await ok('detect changed snapshot before restore',async()=>{
   const bytes=Buffer.from(await snapshot.arrayBuffer());
   const damaged=Buffer.from(bytes);damaged[damaged.length-27]^=1;
   const tampered=createHash('sha256').update(damaged).digest('hex');
   assert.notEqual(tampered,snapshotHash);
  });
  await source.close();source=null;
  await ok('restore into another independent PostgreSQL instance and verify full digest',async()=>{
   // Recompute full hash immediately before loading image (tamper guard).
   const current=createHash('sha256').update(Buffer.from(await snapshot.arrayBuffer())).digest('hex');
   assert.equal(current,snapshotHash,'snapshot must not change before restore');
   target=new PGlite({loadDataDir:snapshot});
   await target.waitReady;
   assert.equal(await digest(target),beforeDigest,'all persisted household and document rows must match');
  });
  await ok('restored member permissions exclude foreign households and outsiders',async()=>{
   assert.equal((await members(target,1,familyA)).rows.length,2);
   assert.equal((await members(target,3,familyA)).rows.length,0);
   assert.equal((await read(target,3,familyA,'transactions',trans.id)).rows.length,0);
   assert.equal((await read(target,4,familyA,'transactions',trans.id)).rows.length,0);
   assert.equal((await read(target,1,familyB,'transactions','house-b-only')).rows.length,0);
   assert.equal((await read(target,2,familyA,'transactions',trans.id)).rows.length,1);
   assert.equal((await read(target,1,familyA,'accounts','legacy-shared')).rows[0].revision,1);
   assert.equal((await read(target,2,familyA,'accounts','legacy-shared')).rows[0].data.owner,'household');
  });
  await ok('the restored pending EUR transaction preserves native value and latest revision',async()=>{
   const doc=(await read(target,2,familyA,'transactions',trans.id)).rows[0];
   assert.equal(doc.revision,1);
   assert.equal(doc.data.bankCurrency,'EUR');
   assert.equal(doc.data.bankAmount,49.25);
   assert.equal(doc.data.status,'pending');
   assert.equal(doc.data.note,'Verified fictional review');
   assert.equal(doc.data.amountCAD,undefined,'no fabricated conversion or booked amount');
  });
  await ok('restored CAS rejects stale revision and accepts expected revision',async()=>{
   await assert.rejects(save(target,1,familyA,'transactions',trans.id,{...trans,note:'stale'},0),/TRACE_WRITE_CONFLICT/);
   const current=(await read(target,1,familyA,'transactions',trans.id)).rows[0].data;
   const fresh=await save(target,2,familyA,'transactions',trans.id,{...current,note:'Post-restore review'},1);
   assert.equal(fresh.rows[0].revision,2);
   assert.equal((await read(target,1,familyA,'transactions',trans.id)).rows[0].data.note,'Post-restore review');
  });
  await ok('restored CAS forbids unauthorized writes and direct legacy writes',async()=>{
   await assert.rejects(save(target,3,familyA,'transactions','outsider',{id:'outsider'},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(as(target,2,tx=>tx.query(
    'insert into public.documents(household_id,collection,item_id,data) values($1,$2,$3,$4)',
    [familyA,'transactions','old-path',JSON.stringify({id:'old-path'})])),
   /permission denied/);
  });
  console.log(JSON.stringify({passed:true,checks,pgSnapshotSha256:snapshotHash,
   restoreRowsIdentical:true,originalDataUsed:false,networkWrites:0,
   hostedSupabase:false,physicalIphone:false,productionReady:false}));
 }finally{if(source)await source.close();if(target)await target.close();}
}
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1});
module.exports={run};
