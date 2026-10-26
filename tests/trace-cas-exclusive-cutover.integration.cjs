'use strict';
// Isolated PGlite PostgreSQL qualification of candidate migration 12.
// Never connect to hosted Supabase or any real bank data.
// Run: TRACE_PGLITE_MODULE=... node tests/trace-cas-exclusive-cutover.integration.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {PGlite}=require(process.env.TRACE_PGLITE_MODULE||'@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function run(){
 const db=new PGlite();let passed=0;
 const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
 const asUser=(n,fn)=>db.transaction(async tx=>{
  await tx.exec('set local role authenticated');
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid(n)]);
  return fn(tx);
 });
 const migration=async n=>db.exec(await fs.readFile(path.join(root,'migrations',
  String(n).padStart(2,'0')+'-'+({
   5:'trace-v5-foundation',6:'trace-import-day-states',
   7:'trace-account-owner-write-guard',
   8:'trace-personal-settings-owner-guard',
   9:'trace-cas-versioned-writes',
   10:'trace-deferred-write-quarantine',
   11:'trace-csv-unparsed-owner-privacy',
   12:'trace-cas-exclusive-write-cutover'}[n])+'.sql'),'utf8'));
 try{
  await db.exec(`create role anon; create role authenticated;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as
   $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;
   insert into auth.users(id) values ('${uid(1)}'),('${uid(2)}'),('${uid(3)}');`);
  await db.exec((await fs.readFile(path.join(root,'supabase-schema.sql'),'utf8'))
   .replace('create extension if not exists pgcrypto;',''));
  const h=(await asUser(1,tx=>tx.query(
   "select * from public.create_household('Foyer fictif','A')"))).rows[0];
  await asUser(2,tx=>tx.query(
   'select * from public.join_household($1,$2)',[h.invite_code,'B']));
  const hid=h.household_id;
  for(const n of [5,6,7,8,9])await migration(n);
  await check('cutover refuses incomplete 10/11 without altering original grants',async()=>{
   assert.equal((await db.query(
    "select has_table_privilege('authenticated','public.documents','INSERT') as allowed")).rows[0].allowed,true);
   await assert.rejects(migration(12),/TRACE_CAS_CUTOVER_BLOCKED/);
   assert.equal((await db.query(
    "select has_table_privilege('authenticated','public.documents','INSERT') as allowed")).rows[0].allowed,true);
  });
  for(const n of [10,11])await migration(n);
  await check('cutover refuses removed CSV uniqueness before revoking any write grants',async()=>{
   await db.exec('drop index public.trace_csv_unparsed_source_unique');
   assert.equal((await asUser(1,tx=>tx.query(
    'select public.trace_csv_evidence_guard_ready() as ok'))).rows[0].ok,false);
   await assert.rejects(migration(12),/TRACE_CAS_CUTOVER_BLOCKED/);
   assert.equal((await db.query(
    "select has_table_privilege('authenticated','public.documents','INSERT') as allowed")).rows[0].allowed,true);
   await migration(11);
   assert.equal((await asUser(1,tx=>tx.query(
    'select public.trace_csv_evidence_guard_ready() as ok'))).rows[0].ok,true);
  });
  const save=(n,collection,id,data,rev)=>asUser(n,tx=>tx.query(
   'select public.trace_cas_save_document($1,$2,$3,$4,$5) as revision',
   [hid,collection,id,JSON.stringify(data),rev]));
  const del=(n,collection,id,rev)=>asUser(n,tx=>tx.query(
   'select public.trace_cas_delete_document($1,$2,$3,$4) as ok',
   [hid,collection,id,rev]));
  const settings=(n,data,rev)=>asUser(n,tx=>tx.query(
   'select public.trace_cas_save_household_settings($1,$2,$3) as revision',
   [hid,JSON.stringify(data),rev]));
  const account={id:'checking-la',owner:'la',type:'checking',currency:'CAD'};
  const otherAccount={id:'checking-partner',owner:'partner',type:'checking',currency:'EUR'};
  await save(1,'accounts',account.id,account,null);
  await save(2,'accounts',otherAccount.id,otherAccount,null);
  await check('cutover clears surprise column-level grants before admitting clients',async()=>{
   // Reproduce old clients (or third-party migrations) granting independent
   // write access on columns not listed by the first candidate cutover.
   await db.exec(`grant insert (created_at), update (updated_at)
    on table public.documents to authenticated;
    grant update (created_at) on table public.households to authenticated;`);
   assert.equal((await db.query(
    "select has_column_privilege('authenticated','public.documents','updated_at','UPDATE') as allowed")).rows[0].allowed,true);
   assert.equal((await db.query(
    "select has_column_privilege('authenticated','public.households','created_at','UPDATE') as allowed")).rows[0].allowed,true);
  });
  await check('cutover installs only with ready migration 05-11 guards',async()=>{
   assert.equal((await asUser(1,tx=>tx.query(
    'select public.trace_csv_evidence_guard_ready() as ok'))).rows[0].ok,true);
   await migration(12);
   for(const [table,column,action] of [
    ['documents','created_at','INSERT'],
    ['documents','updated_at','UPDATE'],
    ['households','created_at','UPDATE']
   ]){
    const x=(await db.query(
     'select has_column_privilege($1,$2,$3,$4) as allowed',
     ['authenticated','public.'+table,column,action])).rows[0];
    assert.equal(x.allowed,false,table+'.'+column+' retained write permission');
   }
  });
  await check('authenticated loses document direct insert/update/delete and household settings',async()=>{
   const q=`select
    has_table_privilege('authenticated','public.documents','SELECT') as can_read,
    has_table_privilege('authenticated','public.documents','INSERT') as can_insert,
    has_table_privilege('authenticated','public.documents','UPDATE') as can_update,
    has_table_privilege('authenticated','public.documents','DELETE') as can_delete,
    has_column_privilege('authenticated','public.documents','data','UPDATE') as can_patch_data,
    has_column_privilege('authenticated','public.households','settings','UPDATE') as can_patch_settings,
    has_column_privilege('authenticated','public.households','name','UPDATE') as can_rename`;
   const x=(await db.query(q)).rows[0];
   assert.equal(x.can_read,true);
   assert.equal(x.can_insert,false);
   assert.equal(x.can_update,false);
   assert.equal(x.can_delete,false);
   assert.equal(x.can_patch_data,false);
   assert.equal(x.can_patch_settings,false);
   assert.equal(x.can_rename,false);
  });
  await check('both members cannot bypass CAS through legacy documents writes',async()=>{
   for(const n of [1,2]){
    await assert.rejects(asUser(n,tx=>tx.query(
     'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
     [hid,'transactions','forged-direct-'+n,
      JSON.stringify({id:'forged-direct-'+n,amountCAD:999}),uid(n)])),
     /permission denied/i);
    await assert.rejects(asUser(n,tx=>tx.query(
     "update public.documents set data='{}'::jsonb where household_id=$1 and collection='accounts'",
     [hid])),/permission denied/i);
    await assert.rejects(asUser(n,tx=>tx.query(
     "delete from public.documents where household_id=$1 and collection='accounts'",
     [hid])),/permission denied/i);
    await assert.rejects(asUser(n,tx=>tx.query(
     "update public.households set settings='{}'::jsonb where id=$1",
     [hid])),/permission denied/i);
   }
  });
  await check('member CAS still creates, revises and deletes normal transactions',async()=>{
   const tx={id:'rent-fictional',type:'expense',amountCAD:40,
    accountId:'checking-la',status:'pending'};
   assert.equal((await save(1,'transactions',tx.id,tx,null)).rows[0].revision,0);
   await assert.rejects(save(2,'transactions',tx.id,{...tx,amountCAD:900},null),
    /TRACE_WRITE_CONFLICT/);
   assert.equal((await save(1,'transactions',tx.id,
    {...tx,status:'confirmed'},0)).rows[0].revision,1);
   await assert.rejects(del(1,'transactions',tx.id,0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await del(1,'transactions',tx.id,1)).rows[0].ok,true);
  });
  await check('member CAS still updates authorized settings and denies personal forgery',async()=>{
   const before=(await db.query('select settings,settings_revision from public.households where id=$1',
    [hid])).rows[0];
   const old=before.settings||{};
   assert.equal((await settings(1,{...old,defaultSplit:{la:60,partner:40}},
    Number(before.settings_revision))).rows[0].revision,
    Number(before.settings_revision)+1);
   await assert.rejects(settings(2,{...old,
    primaryBankAccountByOwner:{la:'checking-partner'}},
    Number(before.settings_revision)+1),/TRACE_SETTINGS_FORBIDDEN/);
  });
  await check('direct household rename is blocked while partner read RLS remains intact',async()=>{
   await assert.rejects(asUser(1,tx=>tx.query(
    'update public.households set name=$1 where id=$2',
    ['Foyer fictif renommé',hid])),/permission denied/i);
   const rows=(await asUser(1,tx=>tx.query(
    "select item_id from public.documents where household_id=$1 and collection='accounts'",
    [hid]))).rows;
   assert.equal(rows.length,2);
   await assert.rejects(save(1,'accounts','checking-partner',
    {...otherAccount,name:'forged'},0),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(save(3,'transactions','outsider',{id:'outsider'},null),
    /TRACE_WRITE_FORBIDDEN/);
  });
  await check('cutover repeat does not mutate financial documents or revisions',async()=>{
   const before=(await db.query('select item_id,revision,data from public.documents order by collection,item_id')).rows;
   await migration(12);
   const after=(await db.query('select item_id,revision,data from public.documents order by collection,item_id')).rows;
   assert.deepEqual(after,before);
  });
  console.log(passed+' exclusive-CAS fictional PG checks passed; NEVER hosted Supabase');
 }finally{await db.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
