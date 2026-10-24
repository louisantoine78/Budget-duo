'use strict';
// TRACE CAS candidate 09 — actual PostgreSQL, fictional users and documents.
// Explicit run only: TRACE_PGLITE_MODULE=... node tests/trace-cas-writes.integration.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {PGlite}=require(process.env.TRACE_PGLITE_MODULE||'@electric-sql/pglite');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const root=path.resolve(__dirname,'..');
async function run(){
 const db=new PGlite();let passed=0;
 const check=async(label,fn)=>{await fn();passed++;console.log('PASS '+label);};
 const acting=(n,fn)=>db.transaction(async tx=>{
  await tx.exec('set local role authenticated');
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid(n)]);
  return fn(tx);
 });
 try{
  await db.exec(`create role anon;create role authenticated;
   create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as
   $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;
   insert into auth.users(id) values ('${uid(1)}'),('${uid(2)}'),('${uid(3)}');`);
  await db.exec((await fs.readFile(path.join(root,'supabase-schema.sql'),'utf8'))
   .replace('create extension if not exists pgcrypto;',''));
  const h=(await acting(1,tx=>tx.query("select * from public.create_household('Fake','A')"))).rows[0];
  await acting(2,tx=>tx.query('select * from public.join_household($1,$2)',[h.invite_code,'B']));
  const hid=h.household_id;
  for(const file of ['05-trace-v5-foundation.sql','06-trace-import-day-states.sql',
    '07-trace-account-owner-write-guard.sql','08-trace-personal-settings-owner-guard.sql',
    '09-trace-cas-versioned-writes.sql'])
   await db.exec(await fs.readFile(path.join(root,'migrations',file),'utf8'));
  const rpcSave=(n,collection,id,data,rev)=>acting(n,tx=>tx.query(
   'select public.trace_cas_save_document($1,$2,$3,$4,$5) as revision',
   [hid,collection,id,JSON.stringify(data),rev]));
  const rpcDelete=(n,collection,id,rev)=>acting(n,tx=>tx.query(
   'select public.trace_cas_delete_document($1,$2,$3,$4) as ok',
   [hid,collection,id,rev]));
  const rpcHouse=(n,settings,rev)=>acting(n,tx=>tx.query(
   'select public.trace_cas_save_household_settings($1,$2,$3) as revision',
   [hid,JSON.stringify(settings),rev]));
  const readDoc=async(collection,id)=> (await db.query(
   'select data,revision from public.documents where household_id=$1 and collection=$2 and item_id=$3',
   [hid,collection,id])).rows[0];
  await check('create only uses null revision; existing ID cannot be recreated',async()=>{
   const value={id:'t1',type:'expense',amountCAD:40,status:'pending'};
   assert.equal((await rpcSave(1,'transactions','t1',value,null)).rows[0].revision,0);
   await assert.rejects(rpcSave(1,'transactions','t1',{...value,amountCAD:999},null),/TRACE_WRITE_CONFLICT/);
   assert.equal((await readDoc('transactions','t1')).data.amountCAD,40);
  });
  await check('two stale revisions never overwrite first confirmed write',async()=>{
   const original=(await readDoc('transactions','t1')).data;
   assert.equal((await rpcSave(1,'transactions','t1',{...original,amountCAD:42},0)).rows[0].revision,1);
   await assert.rejects(rpcSave(2,'transactions','t1',{...original,amountCAD:12},0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await readDoc('transactions','t1')).data.amountCAD,42);
   assert.equal((await rpcSave(2,'transactions','t1',{...original,amountCAD:43},1)).rows[0].revision,2);
  });
  await check('stale deletion fails; correct deletion succeeds',async()=>{
   await assert.rejects(rpcDelete(1,'transactions','t1',0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await readDoc('transactions','t1')).data.amountCAD,43);
   assert.equal((await rpcDelete(1,'transactions','t1',2)).rows[0].ok,true);
   assert.equal(await readDoc('transactions','t1'),undefined);
  });
  await check('outsider cannot create, change or delete household documents',async()=>{
   await assert.rejects(rpcSave(3,'transactions','hacker',{id:'hacker',amountCAD:1},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcDelete(3,'transactions','t1',0),/TRACE_WRITE_FORBIDDEN/);
  });
  await check('account owner cannot be forged via SECURITY DEFINER',async()=>{
   const mine={id:'la',owner:'la',type:'checking',currency:'CAD'};
   const other={id:'partner',owner:'partner',type:'checking',currency:'EUR'};
   await rpcSave(1,'accounts','la',mine,null);
   await rpcSave(2,'accounts','partner',other,null);
   await assert.rejects(rpcSave(1,'accounts','forge',{...other,id:'forge'},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcSave(1,'accounts','partner',{...other,name:'forged'},0),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcDelete(1,'accounts','partner',0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await readDoc('accounts','partner')).data.owner,'partner');
  });
  await check('shared transactions remain editable by either authenticated member',async()=>{
   const data={id:'shared',amountCAD:10,type:'transfer',status:'pending'};
   await rpcSave(1,'transactions','shared',data,null);
   await rpcSave(2,'transactions','shared',{...data,status:'confirmed'},0);
   assert.equal((await readDoc('transactions','shared')).data.status,'confirmed');
  });
  await check('stale settings write rejected; shared settings allowed when fresh',async()=>{
   const state0=(await db.query('select settings,settings_revision from public.households where id=$1',[hid])).rows[0];
   const new1={...state0.settings,defaultSplit:{la:60,partner:40}};
   assert.equal((await rpcHouse(1,new1,0)).rows[0].revision,1);
   await assert.rejects(rpcHouse(2,{...state0.settings,defaultSplit:{la:40,partner:60}},0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await rpcHouse(2,{...new1,defaultSplit:{la:50,partner:50}},1)).rows[0].revision,2);
  });
  await check('SECURITY DEFINER settings RPC still enforces partner ownership',async()=>{
   const settings=(await db.query('select settings from public.households where id=$1',[hid])).rows[0].settings;
   await rpcHouse(2,{...settings,accountOpeningBalances:{partner:250}},2);
   const latest=(await db.query('select settings from public.households where id=$1',[hid])).rows[0].settings;
   await assert.rejects(rpcHouse(1,{...latest,accountOpeningBalances:{partner:999}},3),/TRACE_SETTINGS_FORBIDDEN/);
   assert.equal((await db.query('select settings from public.households where id=$1',[hid])).rows[0].settings.accountOpeningBalances.partner,250);
  });
  await check('legacy direct writes bump server revision but remain a cutover blocker',async()=>{
   const old=(await readDoc('transactions','shared')).revision;
   await acting(1,tx=>tx.query("update public.documents set data=data||'{\"memo\":\"legacy\"}'::jsonb, updated_by=$1 where household_id=$2 and collection='transactions' and item_id='shared'",[uid(1),hid]));
   assert.equal((await readDoc('transactions','shared')).revision,old+1);
   await assert.rejects(rpcSave(1,'transactions','shared',{id:'shared',amountCAD:1},old),/TRACE_WRITE_CONFLICT/);
  });
  await check('reapplying migration leaves documents and revisions unchanged',async()=>{
   const before=(await db.query('select collection,item_id,data,revision from public.documents order by collection,item_id')).rows;
   await db.exec(await fs.readFile(path.join(root,'migrations/09-trace-cas-versioned-writes.sql'),'utf8'));
   assert.deepEqual((await db.query('select collection,item_id,data,revision from public.documents order by collection,item_id')).rows,before);
  });
  console.log(passed+' candidate CAS integration checks passed on fictitious PostgreSQL');
 }finally{await db.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
