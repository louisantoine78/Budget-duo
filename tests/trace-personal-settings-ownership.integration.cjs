'use strict';
// Candidate 08: real PostgreSQL (PGlite) RLS/trigger checks with fictional rows.
// Not part of the default Node suite: requires TRACE_PGLITE_MODULE, never Supabase.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {PGlite}=require(process.env.TRACE_PGLITE_MODULE||'@electric-sql/pglite');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const root=path.resolve(__dirname,'..');
async function run(){
 const db=new PGlite();let passed=0;
 const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
 const asUser=(n,fn)=>db.transaction(async tx=>{
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
    insert into auth.users(id) values ('${uid(1)}'),('${uid(2)}');`);
  const schema=await fs.readFile(path.join(root,'supabase-schema.sql'),'utf8');
  await db.exec(schema.replace('create extension if not exists pgcrypto;',''));
  const household=(await asUser(1,tx=>tx.query("select * from public.create_household('Fictional','A')"))).rows[0];
  await asUser(2,tx=>tx.query('select * from public.join_household($1,$2)',[household.invite_code,'B']));
  const hid=household.household_id;
  for(const a of [{id:'la-current',owner:'la',currency:'CAD'},
    {id:'partner-current',owner:'partner',currency:'EUR'}]){
   await db.query(`insert into public.documents(household_id,collection,item_id,data,updated_by)
    values($1,'accounts',$2,$3,$4)`,[hid,a.id,JSON.stringify(a),uid(1)]);
  }
  const original={
    accountOpeningBalances:{'la-current':100,'partner-current':200},
    accountOpeningBalanceDates:{'la-current':'2026-09-30','partner-current':'2026-09-30'},
    accountOpeningBalanceModes:{'la-current':'start','partner-current':'start'},
    primaryBankAccountByOwner:{la:'la-current',partner:'partner-current'},
    memberNicknames:{la:'A',partner:'B'},defaultSplit:{la:50,partner:50}
  };
  await db.query('update public.households set settings=$1 where id=$2',[JSON.stringify(original),hid]);
  for(const name of ['05-trace-v5-foundation.sql','06-trace-import-day-states.sql',
   '07-trace-account-owner-write-guard.sql','08-trace-personal-settings-owner-guard.sql']){
   await db.exec(await fs.readFile(path.join(root,'migrations',name),'utf8'));
  }
  await test('migration is idempotent and never rewrites financial records',async()=>{
   const before=(await db.query('select data from public.documents where household_id=$1 order by item_id',[hid])).rows;
   await db.exec(await fs.readFile(path.join(root,'migrations/08-trace-personal-settings-owner-guard.sql'),'utf8'));
   const after=(await db.query('select data from public.documents where household_id=$1 order by item_id',[hid])).rows;
   assert.deepEqual(after,before);
  });
  const read=async()=> (await db.query('select settings from public.households where id=$1',[hid])).rows[0].settings;
  const patch=(n,pathKeys,value)=>asUser(n,tx=>tx.query(
   'update public.households set settings=jsonb_set(settings,$1,$2::jsonb,true),updated_by=$3 where id=$4 returning settings',
   [pathKeys,JSON.stringify(value),uid(n),hid]));
  const denied=async(n,keys,value)=>{
   const before=await read();
   await assert.rejects(patch(n,keys,value),/TRACE_SETTINGS_FORBIDDEN/);
   assert.deepEqual(await read(),before);
  };
  await test('member A cannot change B opening amount, date or boundary mode',async()=>{
   await denied(1,['accountOpeningBalances','partner-current'],999);
   await denied(1,['accountOpeningBalanceDates','partner-current'],'2026-10-01');
   await denied(1,['accountOpeningBalanceModes','partner-current'],'end');
  });
  await test('member B cannot change A opening amount or profile',async()=>{
   await denied(2,['accountOpeningBalances','la-current'],999);
   await denied(2,['primaryBankAccountByOwner','la'],'partner-current');
   await denied(2,['memberNicknames','la'],'Intruder');
  });
  await test('member A cannot erase the other member keyed settings',async()=>{
   const before=await read();
   await assert.rejects(asUser(1,tx=>tx.query(
    "update public.households set settings=settings-'accountOpeningBalances', updated_by=$1 where id=$2",
    [uid(1),hid])),/TRACE_SETTINGS_FORBIDDEN/);
   assert.deepEqual(await read(),before);
  });
  await test('member may change own settings without changing the partner',async()=>{
   await patch(1,['accountOpeningBalances','la-current'],125);
   await patch(2,['accountOpeningBalances','partner-current'],240);
   await patch(1,['primaryBankAccountByOwner','la'],'la-current');
   await patch(2,['memberNicknames','partner'],'Bibi');
   const s=await read();
   assert.equal(s.accountOpeningBalances['la-current'],125);
   assert.equal(s.accountOpeningBalances['partner-current'],240);
   assert.equal(s.memberNicknames.partner,'Bibi');
  });
  await test('validated shared split stays editable by either member',async()=>{
   await patch(1,['defaultSplit'],{la:60,partner:40});
   await patch(2,['defaultSplit'],{la:50,partner:50});
   assert.deepEqual((await read()).defaultSplit,{la:50,partner:50});
  });
  await test('unknown account and unknown member slot are denied',async()=>{
   await denied(1,['accountOpeningBalances','unknown'],10000);
   await denied(1,['primaryBankAccountByOwner','outsider'],'la-current');
  });
  await test('invalid account opening settings type is rejected',async()=>{
   const before=await read();
   await assert.rejects(patch(1,['accountOpeningBalances'],[]),/TRACE_SETTINGS_INVALID/);
   assert.deepEqual(await read(),before);
  });
  console.log(passed+' fictional PostgreSQL guard checks passed; no hosted Supabase');
 }finally{await db.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
