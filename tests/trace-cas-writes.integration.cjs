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
  // Fictional legacy rows created before quarantine to exercise old-client
  // update/delete attempts without ever using real bank data.
  await db.query('insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
   [hid,'accounts','legacy-deferred-card',JSON.stringify({
    id:'legacy-deferred-card',type:'card',paymentMode:'deferred',owner:'la',
    country:'FR',currency:'EUR',settlementAccountId:'la'}),uid(1)]);
  await db.query('insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
   [hid,'transactions','legacy-deferred-purchase',JSON.stringify({
    id:'legacy-deferred-purchase',type:'expense',status:'pending',
    deferredKind:'purchase',accountId:'legacy-deferred-card',bankAmount:40}),uid(1)]);
  // 5.36.x legacy card documents could omit 'type'; type/name inference
  // must not weaken SQL quarantine when migrated.
  await db.query('insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
   [hid,'accounts','legacy-typeless-deferred',JSON.stringify({
    id:'legacy-typeless-deferred',name:'Ancienne Mastercard',
    paymentMode:'deferred',owner:'la',currency:'EUR'}),uid(1)]);
  await db.exec(await fs.readFile(path.join(root,'migrations/10-trace-deferred-write-quarantine.sql'),'utf8'));
  await db.exec(await fs.readFile(path.join(root,'migrations/11-trace-csv-unparsed-owner-privacy.sql'),'utf8'));
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
  await check('investment operations require native portfolio and banking ownership',async()=>{
   const ownPortfolio={id:'pea-la',owner:'la',type:'broker',currency:'EUR'};
   const otherPortfolio={id:'pea-partner',owner:'partner',type:'broker',currency:'EUR'};
   await rpcSave(1,'investment_accounts','pea-la',ownPortfolio,null);
   await rpcSave(2,'investment_accounts','pea-partner',otherPortfolio,null);
   const ownOperation={id:'op-la',accountId:'pea-la',type:'deposit',
    bankAccountId:'la',bankAmount:40,bankCurrency:'CAD',status:'confirmed'};
   const otherOperation={id:'op-partner',accountId:'pea-partner',type:'deposit',
    bankAccountId:'partner',bankAmount:20,bankCurrency:'EUR',status:'confirmed'};
   assert.equal((await rpcSave(1,'investment_operations','op-la',ownOperation,null)).rows[0].revision,0);
   assert.equal((await rpcSave(2,'investment_operations','op-partner',otherOperation,null)).rows[0].revision,0);
   await assert.rejects(rpcSave(2,'investment_operations','forged', {
    ...ownOperation,id:'forged'},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcSave(1,'investment_operations','foreign-bank',{
    ...ownOperation,id:'foreign-bank',bankAccountId:'partner'},null),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcSave(1,'investment_operations','ghost',{
    ...ownOperation,id:'ghost',accountId:'nonexistent'},null),/TRACE_WRITE_FORBIDDEN/);
   // Changing the destination of an existing operation must not steal it.
   await assert.rejects(rpcSave(2,'investment_operations','op-la',{
    ...ownOperation,accountId:'pea-partner'},0),/TRACE_WRITE_CONFLICT/);
   await assert.rejects(rpcDelete(2,'investment_operations','op-la',0),/TRACE_WRITE_CONFLICT/);
   assert.equal((await readDoc('investment_operations','op-la')).data.accountId,'pea-la');
   assert.equal((await rpcSave(1,'investment_operations','op-la',{
    ...ownOperation,bankAmount:41},0)).rows[0].revision,1);
   assert.equal((await rpcDelete(1,'investment_operations','op-la',1)).rows[0].ok,true);
   assert.equal(await readDoc('investment_operations','op-la'),undefined);
  });
  await check('arbitrary collections cannot be written by privileged RPC',async()=>{
   await assert.rejects(rpcSave(1,'unknown_settings','intruder',
    {id:'intruder',amountCAD:9000},null),/TRACE_WRITE_INVALID/);
   const rows=(await db.query("select count(*)::integer as count from public.documents where collection='unknown_settings'")).rows;
   assert.equal(rows[0].count,0);
  });
  await check('bank and investment accounts cannot be physically deleted',async()=>{
   await assert.rejects(rpcDelete(1,'accounts','la',0),/TRACE_WRITE_FORBIDDEN/);
   await assert.rejects(rpcDelete(2,'accounts','partner',0),/TRACE_WRITE_FORBIDDEN/);
   assert.equal((await readDoc('accounts','la')).data.owner,'la');
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
  await check('server quarantines deferred cards through CAS and direct document insert',async()=>{
   const disabled={id:'deferred-fr',owner:'la',type:'card',paymentMode:'deferred',
    country:'FR',currency:'EUR',settlementAccountId:'la'};
   await assert.rejects(rpcSave(1,'accounts','deferred-fr',disabled,null),
    /TRACE_DEFERRED_NOT_RELEASED/);
   assert.equal(await readDoc('accounts','deferred-fr'),undefined);
   await assert.rejects(db.query(
    'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
    [hid,'accounts','deferred-direct',JSON.stringify({...disabled,id:'deferred-direct'}),uid(1)]
   ),/TRACE_DEFERRED_NOT_RELEASED/);
   assert.equal(await readDoc('accounts','deferred-direct'),undefined);
  });
  await check('type-free legacy deferred cards remain quarantined',async()=>{
   const card=await readDoc('accounts','legacy-typeless-deferred');
   assert.equal(card.data.paymentMode,'deferred');
   await assert.rejects(rpcSave(1,'accounts','legacy-typeless-deferred',{
    ...card.data,paymentMode:'credit',type:'card'},card.revision),
    /TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(rpcSave(1,'transactions','legacy-typeless-charge',{
    id:'legacy-typeless-charge',accountId:'legacy-typeless-deferred',
    type:'expense',status:'pending'},null),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(rpcSave(1,'accounts','new-typeless-deferred',{
    id:'new-typeless-deferred',name:'Visa',paymentMode:'deferred',owner:'la'},
    null),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(db.query(
    'delete from public.documents where household_id=$1 and collection=$2 and item_id=$3',
    [hid,'accounts','legacy-typeless-deferred']),/TRACE_DEFERRED_NOT_RELEASED/);
  });
  await check('pending, confirmed and direct deferred settlement writes are blocked',async()=>{
   for(const status of ['pending','confirmed']){
    const item={id:'purchase-'+status,type:'expense',status,
     accountId:'la',bankCurrency:'EUR',bankAmount:40,
     deferredKind:'purchase'};
    await assert.rejects(rpcSave(1,'transactions',item.id,item,null),
     /TRACE_DEFERRED_NOT_RELEASED/);
   }
   const settlement={id:'payment-df',type:'transfer',status:'confirmed',
    accountId:'la',toAccountId:'partner',transferPurpose:'deferred_settlement',
    purchaseIds:['p1'],settlementMode:'partial'};
   await assert.rejects(rpcSave(1,'transactions',settlement.id,settlement,null),
    /TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(db.query(
    'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
    [hid,'transactions','direct-deferred',JSON.stringify({...settlement,id:'direct-deferred'}),uid(1)]
   ),/TRACE_DEFERRED_NOT_RELEASED/);
  });
  await check('legacy deferred records cannot be modified, laundered or deleted',async()=>{
   const oldCard=await readDoc('accounts','legacy-deferred-card');
   const oldPurchase=await readDoc('transactions','legacy-deferred-purchase');
   await assert.rejects(rpcSave(1,'transactions','legacy-deferred-purchase',{
    id:'legacy-deferred-purchase',type:'expense',status:'confirmed',
    accountId:'la',amountCAD:1},oldPurchase.revision),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(rpcSave(1,'accounts','legacy-deferred-card',{
    ...oldCard.data,paymentMode:'credit'},oldCard.revision),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(rpcDelete(1,'transactions','legacy-deferred-purchase',
    oldPurchase.revision),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(db.query(
    'delete from public.documents where household_id=$1 and collection=$2 and item_id=$3',
    [hid,'transactions','legacy-deferred-purchase']),/TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(db.query(
    'delete from public.documents where household_id=$1 and collection=$2 and item_id=$3',
    [hid,'accounts','legacy-deferred-card']),/TRACE_DEFERRED_NOT_RELEASED/);
   assert.equal((await readDoc('transactions','legacy-deferred-purchase')).data.status,'pending');
  });
  await check('untagged transactions and imports linked to an old deferred card fail server guard',async()=>{
   for(const collection of ['transactions','imports','import_days','reconciliations']){
    const id='deferred-reference-'+collection;
    await assert.rejects(rpcSave(1,collection,id,{
     id,accountId:'legacy-deferred-card',status:'pending'
    },null),/TRACE_DEFERRED_NOT_RELEASED/);
    assert.equal(await readDoc(collection,id),undefined);
   }
   // A foreign-card transfer leg is also forbidden, even if its spending
   // classification and primary checking account look ordinary.
   const transfer={id:'hidden-deferred-leg',type:'transfer',
    accountId:'la',toAccountId:'legacy-deferred-card',status:'confirmed'};
   await assert.rejects(rpcSave(1,'transactions',transfer.id,transfer,null),
    /TRACE_DEFERRED_NOT_RELEASED/);
  });
  await check('deferred bank account cannot enter investment operations through direct table write',async()=>{
   const item={id:'investment-card-bypass',type:'deposit',status:'pending',
    accountId:'pea-la',bankAccountId:'legacy-deferred-card'};
   await assert.rejects(rpcSave(1,'investment_operations',item.id,item,null),
    /TRACE_WRITE_FORBIDDEN|TRACE_DEFERRED_NOT_RELEASED/);
   await assert.rejects(db.query(
    'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
    [hid,'investment_operations','direct-investment-card-bypass',
      JSON.stringify({...item,id:'direct-investment-card-bypass'}),uid(1)]
   ),/TRACE_DEFERRED_NOT_RELEASED/);
   assert.equal(await readDoc('investment_operations','direct-investment-card-bypass'),undefined);
  });
  await check('unlinked deferred allocation fields are quarantined by SQL',async()=>{
   const reserved={deferredPurchaseId:'purchase-x',deferredPurchaseIds:['purchase-x'],
    deferredFeeIds:['fee-x'],deferredSettlementMode:'partial',
    deferredDueDate:'2026-11-01',deferredBankEvidence:{},
    deferredBankEvidenceReviewed:false};
   for(const [field,value] of Object.entries(reserved)){
    const item={id:'server-deferred-'+field,type:'expense',status:'pending',
     accountId:'la',[field]:value};
    await assert.rejects(rpcSave(1,'transactions',item.id,item,null),
     /TRACE_DEFERRED_NOT_RELEASED/);
    assert.equal(await readDoc('transactions',item.id),undefined);
   }
   const direct={id:'direct-deferred-alias',type:'transfer',accountId:'la',
    deferredPurchaseIds:['purchase-x']};
   await assert.rejects(db.query(
    'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
    [hid,'transactions',direct.id,JSON.stringify(direct),uid(1)]
   ),/TRACE_DEFERRED_NOT_RELEASED/);
  });
  await check('ordinary pending transactions and credit cards still work',async()=>{
   const credit={id:'credit-fake',owner:'la',type:'card',
    country:'CA',currency:'CAD',paymentMode:'credit',settlementAccountId:'la'};
   assert.equal((await rpcSave(1,'accounts','credit-fake',credit,null)).rows[0].revision,0);
   const item={id:'normal-pending',type:'expense',accountId:'credit-fake',
    amountCAD:12.5,status:'pending'};
   assert.equal((await rpcSave(1,'transactions',item.id,item,null)).rows[0].revision,0);
   assert.equal((await rpcSave(2,'transactions',item.id,{
    ...item,status:'confirmed'},0)).rows[0].revision,1);
  });
  await check('quarantine migration is repeatable without modifying existing rows',async()=>{
   const before=(await db.query('select collection,item_id,data,revision from public.documents order by collection,item_id')).rows;
   await db.exec(await fs.readFile(path.join(root,
    'migrations/10-trace-deferred-write-quarantine.sql'),'utf8'));
   const after=(await db.query('select collection,item_id,data,revision from public.documents order by collection,item_id')).rows;
   assert.deepEqual(after,before);
  });
  await check('legacy direct writes bump server revision but remain a cutover blocker',async()=>{
   const old=(await readDoc('transactions','shared')).revision;
   await acting(1,tx=>tx.query("update public.documents set data=data||'{\"memo\":\"legacy\"}'::jsonb, updated_by=$1 where household_id=$2 and collection='transactions' and item_id='shared'",[uid(1),hid]));
   assert.equal((await readDoc('transactions','shared')).revision,old+1);
   await assert.rejects(rpcSave(1,'transactions','shared',{id:'shared',amountCAD:1},old),/TRACE_WRITE_CONFLICT/);
  });

  await check('owner CSV evidence is private on authenticated SELECT but shared imports remain unchanged',async()=>{
   const item={id:'csv_unparsed_own',kind:'csv_unparsed',
    status:'pending_review',owner:'la',accountId:'la',
    source:'csv',sourceFileName:'octobre.csv',sourceIndex:4,
    rawText:'2026-10-20 | Achats | non lisible',createdAt:'2026-10-25T12:00:00Z'};
   assert.equal((await rpcSave(1,'imports',item.id,item,null)).rows[0].revision,0);
   const mine=await acting(1,tx=>tx.query(
    "select item_id from public.documents where household_id=$1 and collection='imports' and item_id=$2",
    [hid,item.id]));
   const partnerView=await acting(2,tx=>tx.query(
    "select item_id from public.documents where household_id=$1 and collection='imports' and item_id=$2",
    [hid,item.id]));
   assert.equal(mine.rows.length,1);
   assert.equal(partnerView.rows.length,0);
   assert.equal((await readDoc('imports',item.id)).data.rawText,item.rawText);
   const shared={id:'old-shared-draft',kind:'smart_draft',status:'pending'};
   await rpcSave(1,'imports',shared.id,shared,null);
   const oldView=await acting(2,tx=>tx.query(
    "select item_id from public.documents where household_id=$1 and collection='imports' and item_id=$2",
    [hid,shared.id]));
   assert.equal(oldView.rows.length,1);
  });
  await check('partner cannot forge owner or linked bank account in private CSV evidence',async()=>{
   const forged={id:'forged-source',kind:'csv_unparsed',status:'pending_review',
    owner:'la',accountId:'la',source:'csv',sourceFileName:'octobre.csv',
    sourceIndex:5,rawText:'bank line',createdAt:'2026-10-25T12:00:00Z'};
   await assert.rejects(rpcSave(2,'imports',forged.id,forged,null),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(rpcSave(2,'imports','forged-account',
    {...forged,id:'forged-account',owner:'partner',accountId:'la'},null),
    /TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(acting(2,tx=>tx.query(
    'insert into public.documents(household_id,collection,item_id,data,updated_by) values($1,$2,$3,$4,$5)',
    [hid,'imports','direct-forged',JSON.stringify({...forged,id:'direct-forged'}),uid(2)])),
    /TRACE_CSV_EVIDENCE_FORBIDDEN/);
   assert.equal(await readDoc('imports','forged-source'),undefined);
  });
  await check('private CSV original cannot be changed or reassigned after insert',async()=>{
   const item=(await readDoc('imports','csv_unparsed_own')).data;
   await assert.rejects(rpcSave(1,'imports',item.id,
    {...item,rawText:'different bank line'},0),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(rpcSave(1,'imports',item.id,
    {...item,kind:'smart_draft'},0),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(rpcSave(1,'imports',item.id,
    {...item,accountId:'partner',owner:'partner'},0),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(rpcSave(2,'imports',item.id,
    {...item,status:'reviewed',reviewedBy:'partner'},0),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   assert.equal((await readDoc('imports',item.id)).revision,0);
  });
  await check('manual review is the only permitted state change; deletions blocked',async()=>{
   const item=(await readDoc('imports','csv_unparsed_own')).data;
   await assert.rejects(rpcSave(1,'imports',item.id,
    {...item,status:'reviewed',reviewedBy:'partner',
      reviewedAt:'2026-10-25T13:00:00Z'},0),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   const next={...item,status:'reviewed',reviewedBy:'la',
    reviewedAt:'2026-10-25T13:00:00Z'};
   assert.equal((await rpcSave(1,'imports',item.id,next,0)).rows[0].revision,1);
   await assert.rejects(rpcSave(1,'imports',item.id,
    {...item,status:'pending_review'},1),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(acting(1,tx=>tx.query(
    'delete from public.documents where household_id=$1 and collection=$2 and item_id=$3',
    [hid,'imports',item.id])),/TRACE_CSV_EVIDENCE_FORBIDDEN/);
   await assert.rejects(rpcDelete(1,'imports',item.id,1),/TRACE_WRITE_FORBIDDEN/);
   assert.equal((await readDoc('imports',item.id)).data.status,'reviewed');
  });
  await check('CSV privacy migration can be reapplied without rewriting evidence',async()=>{
   const before=(await readDoc('imports','csv_unparsed_own')).data;
   await db.exec(await fs.readFile(path.join(root,
     'migrations/11-trace-csv-unparsed-owner-privacy.sql'),'utf8'));
   assert.deepEqual((await readDoc('imports','csv_unparsed_own')).data,before);
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
