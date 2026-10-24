'use strict';
/* Actual embedded PostgreSQL persistence + repository SQL/RLS, with fake users.
 * No hosted Supabase, Auth, Realtime, credentials or production queries.
 * Optional test-only dependency: @electric-sql/pglite@0.4.5.
 * TRACE_PGLITE_MODULE=/absolute/module/path node tests/trace-database.integration.cjs
 */
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const {PGlite}=require(process.env.TRACE_PGLITE_MODULE||'@electric-sql/pglite');
require('../trace-international-1.0.0.js');require('../trace-movement-5.36.0.js');
const I=globalThis.TraceInternational,M=globalThis.TraceMovement;
const root=path.resolve(__dirname,'..'),checks=[],findings=[];
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
let db,temp,householdA,householdC;
const test=async(name,fn)=>{await fn();checks.push({name,passed:true});console.log('PASS '+name)};
async function asUser(id,fn,role='authenticated'){
 if(!['authenticated','anon'].includes(role))throw Error('Unsupported fictional role');
 return db.transaction(async tx=>{
  await tx.exec('set local role '+role);
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
  return fn(tx);
 });
}
const rows=async()=> (await db.query('select collection,item_id,data from public.documents where household_id=$1 order by collection,item_id',[householdA.household_id])).rows;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
(async()=>{
 temp=await fs.mkdtemp(path.join(os.tmpdir(),'trace-fictional-db-'));
 const dataDir=path.join(temp,'postgres');db=new PGlite(dataDir);
 await db.exec(`create role anon; create role authenticated;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth to authenticated;
  insert into auth.users(id) values ('${uid(1)}'),('${uid(2)}'),('${uid(3)}'),('${uid(4)}');`);
 // gen_random_uuid is built into this PostgreSQL. Only extension installation
 // is omitted; all repository tables, functions, grants, RLS and publications run.
 const original=await fs.readFile(path.join(root,'supabase-schema.sql'),'utf8');
 await db.exec(original.replace('create extension if not exists pgcrypto;',''));
 await test('anonymous role cannot read financial documents or invoke workspace creation',async()=>{
  await assert.rejects(asUser(null,tx=>tx.query('select * from public.documents'),'anon'),/permission denied/);
  await assert.rejects(asUser(null,tx=>tx.query("select * from public.create_household('X','Y')"),'anon'),/permission denied/);
 });
 await test('repository workspace RPCs create a household and assign its second member',async()=>{
  householdA=(await asUser(uid(1),tx=>tx.query("select * from public.create_household('Fictional A','A')"))).rows[0];
  const joined=(await asUser(uid(2),tx=>tx.query('select * from public.join_household($1,$2)',[householdA.invite_code,'B']))).rows[0];
  assert.equal(joined.household_id,householdA.household_id);assert.equal(joined.slot,'partner');
  householdC=(await asUser(uid(3),tx=>tx.query("select * from public.create_household('Fictional C','C')"))).rows[0];
 });
 await test('a third user cannot join a full couple or self-assign a membership',async()=>{
  await assert.rejects(asUser(uid(4),tx=>tx.query('select * from public.join_household($1,$2)',[householdA.invite_code,'D'])),/Household is full/);
  await assert.rejects(asUser(uid(4),tx=>tx.query("insert into public.household_members(household_id,user_id,slot,display_name) values ($1,$2,'partner','D')",[householdC.household_id,uid(4)])),/permission denied/);
 });
 const accounts=[
  {id:'ca',type:'checking',owner:'la',currency:'CAD',country:'CA'},
  {id:'card',type:'card',owner:'la',currency:'CAD',country:'CA',settlementAccountId:'ca'},
  {id:'fr',type:'checking',owner:'la',currency:'EUR',country:'FR'},
  {id:'partner',type:'checking',owner:'partner',currency:'CAD',country:'CA'}];
 const legacy={id:'legacy',type:'expense',status:'confirmed',accountId:'ca',
  date:'2026-09-28',amountCAD:10,name:'5.36.5 fictional preserved record'};
 async function put(tx,collection,item,user){
  return tx.query(`insert into public.documents(household_id,collection,item_id,data,updated_by)
   values ($1,$2,$3,$4,$5) on conflict(household_id,collection,item_id)
   do update set data=excluded.data,updated_by=excluded.updated_by returning item_id`,
   [householdA.household_id,collection,item.id,JSON.stringify(item),user]);
 }
 await asUser(uid(1),async tx=>{
  for(const a of accounts)await put(tx,'accounts',a,uid(1));
  await put(tx,'transactions',legacy,uid(1));
  await tx.query('update public.households set settings=$1,updated_by=$2 where id=$3',[
   JSON.stringify({referenceDate:'2026-10-01',accountOpeningBalances:{ca:1000,card:0,fr:500,partner:300}}),uid(1),householdA.household_id]);
 });
 await test('additive V5/import-day SQL preserves stable records and creates a pre-migration backup',async()=>{
  const before=await rows();
  await db.exec(await fs.readFile(path.join(root,'migrations/05-trace-v5-foundation.sql'),'utf8'));
  await db.exec(await fs.readFile(path.join(root,'migrations/06-trace-import-day-states.sql'),'utf8'));
  assert.deepEqual(await rows(),before);
  const backup=(await db.query('select documents_snapshot from public.trace_v5_backups where household_id=$1',[householdA.household_id])).rows[0];
  assert.ok(backup.documents_snapshot.some(x=>x.item_id==='legacy'&&x.data.amountCAD===10));
 });
 await test('RLS isolates household reads, inserts, updates and deletes from unrelated users',async()=>{
  assert.equal((await asUser(uid(3),tx=>tx.query('select * from public.documents where household_id=$1',[householdA.household_id]))).rows.length,0);
  await assert.rejects(asUser(uid(3),tx=>put(tx,'transactions',{id:'forbidden',amountCAD:100},uid(3))),/row-level security/);
  const update=await asUser(uid(3),tx=>tx.query("update public.documents set data='{}'::jsonb,updated_by=$1 where household_id=$2 returning item_id",[uid(3),householdA.household_id]));
  const remove=await asUser(uid(3),tx=>tx.query('delete from public.documents where household_id=$1 returning item_id',[householdA.household_id]));
  assert.equal(update.rows.length,0);assert.equal(remove.rows.length,0);
 });
 await test('a member cannot spoof updated_by and outsider cannot rotate the invite',async()=>{
  await assert.rejects(asUser(uid(1),tx=>put(tx,'transactions',{...legacy,name:'spoof'},uid(2))),/row-level security/);
  await assert.rejects(asUser(uid(3),tx=>tx.query('select public.rotate_household_invite($1)',[householdA.household_id])),/Only the household owner/);
 });
 const app=await fs.readFile(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const source=(name,next)=>{let start=app.indexOf('function '+name+'(');
  const end=app.indexOf('\nfunction '+next+'(',start);
  assert.ok(start>0&&end>start);if(app.slice(start-6,start)==='async ')start-=6;
  return app.slice(start,end)};
 // Run the app's actual saveDocument helper. Only its HTTP transport is replaced
 // by parameterized PostgreSQL: persistence, PKs, triggers and RLS are real SQL.
 const saveSource=source('saveDocument','settingsBack');
 const save=new Function('client','session','household','sync','internationalPreviewMode',saveSource+';return saveDocument;')({
  from(table){assert.equal(table,'documents');return{upsert:async doc=>{
   try{await asUser(uid(1),tx=>tx.query(`insert into public.documents(household_id,collection,item_id,data,updated_by)
    values($1,$2,$3,$4,$5) on conflict(household_id,collection,item_id)
    do update set data=excluded.data,updated_by=excluded.updated_by`,
    [doc.household_id,doc.collection,doc.item_id,JSON.stringify(doc.data),doc.updated_by]));return{error:null};
   }catch(error){return{error};}
  }}}},{user:{id:uid(1)}},{id:householdA.household_id},()=>{},()=>false);
 const common={status:'confirmed',payerId:'la',beneficiary:'la',split:{la:100,partner:0}};
 const q={currency:'EUR',cadPerUnit:1.6,date:'2026-10-08',source:'FICTITIOUS PERSISTENCE FIXTURE'};
 const transactions=[
  {...common,id:'purchase',date:'2026-10-04',accountId:'card',type:'expense',amountCAD:100,bankAmount:100,bankCurrency:'CAD'},
  {...common,id:'payment',date:'2026-10-05',accountId:'ca',toAccountId:'card',type:'transfer',transferPurpose:'card_repayment',amountCAD:100,bankAmount:100,toBankAmount:100,bankCurrency:'CAD',toBankCurrency:'CAD'},
  {...common,id:'eur40',date:'2026-10-08',accountId:'fr',type:'expense',...I.resolveBooking({account:accounts[2],bankAmount:40,date:'2026-10-08',quote:q})},
  {...common,id:'usd50',date:'2026-10-09',accountId:'fr',type:'expense',...I.resolveBooking({account:accounts[2],bankAmount:46.2,originalCurrency:'USD',originalAmount:50,date:'2026-10-09',quote:q})},
  {...common,id:'fx',date:'2026-10-11',accountId:'ca',toAccountId:'fr',type:'transfer',bankCurrency:'CAD',amountCAD:150,bankAmount:150,toBankAmount:95,toBankCurrency:'EUR',transferFeeAmount:2,transferFeeCurrency:'CAD',transferFeeIncludedInDebit:true}];
 await test('actual app save helper persists credit, EUR/USD and FX legs without duplicate IDs',async()=>{
  for(const item of transactions)await save('transactions',item);
  await save('transactions',transactions[1]); // Idempotent retry of the same doc.
  const saved=(await rows()).filter(x=>x.collection==='transactions');
  assert.equal(saved.length,6);assert.equal(saved.find(x=>x.item_id==='usd50').data.bankAmount,46.2);
  assert.equal(saved.find(x=>x.item_id==='usd50').data.amountOriginal,50);
 });
 await test('closing and reopening the disk database preserves native balances and fixed CAD history',async()=>{
  const before=digest(await rows());await db.close();db=new PGlite(dataDir);
  assert.equal(digest(await rows()),before);
  const docs=await rows(),state={accounts,transactions:docs.filter(x=>x.collection==='transactions').map(x=>x.data),
   reconciliations:[],investmentOperations:[],household:{accountOpeningBalances:{ca:1000,card:0,fr:500,partner:300}}};
  const estimate=new Function('state','window','accountType','openingBoundary','afterBoundary',
   'return ('+source('accountEstimate','bank')+');')(state,{TraceInternational:I},a=>a.type,
   ()=>({date:'2026-10-01',mode:'start'}),(date,boundary)=>date>=boundary.date);
  const estimates=Object.fromEntries(accounts.map(a=>[a.id,estimate(a)]));
  assert.equal(estimates.ca,750);assert.equal(estimates.card,0);assert.ok(Math.abs(estimates.fr-508.8)<1e-7);
  const beforeBudgetCents=state.transactions.filter(t=>t.date>='2026-10-01'&&t.type==='expense')
   .reduce((n,t)=>n+Math.round(I.exactMoney(t.amountCAD)*100),0);
  assert.equal(beforeBudgetCents,23792);
  const cad=I.snapshot({accounts,estimates,mainId:'ca',fxRates:{EUR:q}}),eur=I.snapshot({accounts,estimates,mainId:'fr',fxRates:{EUR:q}});
  assert.equal(cad.net,750);assert.equal(eur.net,508.8);assert.equal(cad.globalCAD,1864.08);
  assert.equal(digest(await rows()),before);
 });
 await test('partial friend reimbursement persists its allocation without a new budget income',async()=>{
  const advance={...common,id:'advance',accountId:'ca',date:'2026-10-12',type:'expense',
   name:'Fictional shared meal',beneficiary:'custom',amountCAD:100,bankAmount:100,bankCurrency:'CAD',
   splitAmounts:{la:40,partner:0,friends:60},friendDebtorShares:[{name:'Camille',amountCAD:60}]};
  const receipt={...common,id:'partial',accountId:'ca',date:'2026-10-13',type:'external_refund',
   transferPurpose:'friend_reimbursement',name:'Fictional partial reimbursement',counterparty:'Camille',
   amountCAD:20,bankAmount:20,bankCurrency:'CAD',repaymentAllocations:[{expenseId:'advance',amountCAD:20}]};
  await save('transactions',advance);await save('transactions',receipt);
  const saved=(await rows()).filter(x=>x.collection==='transactions').map(x=>x.data);
  assert.equal(M.paidForExpense(saved,'advance'),2000); // Engine contract: cents.
  assert.equal(M.friendReceivables(saved,'la').find(x=>x.name==='Camille').outstandingCAD,40);
  assert.equal(saved.filter(x=>x.type==='income').length,0);
 });
 await test('native EUR savings legs survive SQL persistence and use the real journal calculation',async()=>{
  const saving={id:'eur-save',owner:'la',currency:'EUR',type:'Livret',savingsTracking:'linked',openingDate:'2026-10-01',openingBalance:200};
  await save('investment_accounts',saving);
  await save('transactions',{...common,id:'save-in',date:'2026-10-14',accountId:'ca',type:'external_transfer',
   transferPurpose:'savings',investmentAccountId:saving.id,bankAmount:150,bankCurrency:'CAD',amountCAD:150,
   investmentAmount:95,investmentCurrency:'EUR'});
  await save('transactions',{...common,id:'save-out',date:'2026-10-15',accountId:'fr',type:'external_refund',
   transferPurpose:'savings_withdrawal',investmentAccountId:saving.id,bankAmount:20,bankCurrency:'EUR',amountCAD:32,
   investmentAmount:20,investmentCurrency:'EUR'});
  const state={accounts,investmentAccounts:[saving],transactions:(await rows()).filter(x=>x.collection==='transactions').map(x=>x.data)};
  const compile=(name,next,deps)=>new Function(...Object.keys(deps),'return ('+source(name,next)+');')(...Object.values(deps));
  const deps={state,window:{TraceInternational:I},smartStrictDate:I.calendarDate};
  const ready=compile('isReadySavingsAccount','linkedSavingsMovements',deps);
  const linked=compile('linkedSavingsMovements','savingsLedger',{...deps,isReadySavingsAccount:ready});
  const ledger=compile('savingsLedger','portfolioLedger',{...deps,isReadySavingsAccount:ready,linkedSavingsMovements:linked,internationalQuotes:{EUR:q}})(saving);
  assert.equal(ledger.value,275);assert.equal(ledger.net,75);assert.equal(ledger.cad,440);
 });
 await test('a physical backup restores the same fictional database into another instance',async()=>{
  const before=await rows(),archive=await db.dumpDataDir('gzip');
  const restored=new PGlite({loadDataDir:archive});
  try{
   const after=(await restored.query('select collection,item_id,data from public.documents where household_id=$1 order by collection,item_id',[householdA.household_id])).rows;
   assert.equal(digest(after),digest(before));
  }finally{await restored.close();}
 });
 await test('a checksummed portable export restores complete native JSON rows into a separate fictional PostgreSQL',async()=>{
  const {createSnapshot,verifySnapshot,unpackSnapshot}=await import('../scripts/trace-snapshot.mjs');
  const payload={
   household:(await db.query('select * from public.households where id=$1',[householdA.household_id])).rows[0],
   household_members:(await db.query('select * from public.household_members where household_id=$1 order by slot',[householdA.household_id])).rows,
   documents:(await db.query('select * from public.documents where household_id=$1 order by collection,item_id',[householdA.household_id])).rows
  };
  // PostgreSQL timestamps returned as Date are normalized by the ordinary JSON
  // export step, before constructing the portable snapshot. Financial data is JSONB.
  const raw=JSON.parse(JSON.stringify(payload)),snapshot=createSnapshot(raw);
  verifySnapshot(snapshot,{expectedDocuments:raw.documents.length});
  const backup=unpackSnapshot(JSON.parse(JSON.stringify(snapshot)));
  const restored=new PGlite();
  try{
   // A separate database, not the working fictional DB or a remote service.
   await restored.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;`);
   for(const user of [uid(1),uid(2),uid(3),uid(4)])await restored.query('insert into auth.users values($1)',[user]);
   await restored.exec(original.replace('create extension if not exists pgcrypto;',''));
   for(const migration of ['05-trace-v5-foundation.sql','06-trace-import-day-states.sql'])
    await restored.exec(await fs.readFile(path.join(root,'migrations',migration),'utf8'));
   const insert=async(table,row)=>{
    const keys=Object.keys(row);assert.ok(keys.every(k=>/^[a-z_]+$/.test(k)));
    await restored.query('insert into public.'+table+' ('+keys.join(',')+') values ('+
     keys.map((_,i)=>'$'+(i+1)).join(',')+')',keys.map(k=>row[k]&&typeof row[k]==='object'?JSON.stringify(row[k]):row[k]));
   };
   await insert('households',backup.household);
   for(const member of backup.household_members)await insert('household_members',member);
   for(const row of backup.documents)await insert('documents',row);
   const after=(await restored.query('select collection,item_id,data from public.documents where household_id=$1 order by collection,item_id',[householdA.household_id])).rows;
   assert.equal(digest(after),digest(await rows()));
   assert.deepEqual((await restored.query('select settings from public.households where id=$1',[householdA.household_id])).rows[0].settings,raw.household.settings);
   assert.equal((await restored.query('select count(*)::int as n from public.household_members')).rows[0].n,2);
  }finally{await restored.close();}
 });
 await test('the test explicitly detects household-wide writes instead of claiming partner ownership protection',async()=>{
  const before=digest(await rows());
  await asUser(uid(1),async tx=>{
   await tx.exec('savepoint ownership_probe');
   const changed=await tx.query("update public.documents set data=data||'{\"name\":\"PROBE\"}'::jsonb,updated_by=$1 where household_id=$2 and collection='accounts' and item_id='partner' returning item_id",[uid(1),householdA.household_id]);
   assert.equal(changed.rows.length,1);
   await tx.exec('rollback to savepoint ownership_probe');
  });
  assert.equal(digest(await rows()),before);
  findings.push({id:'RLS-PARTNER-WRITE',severity:'corrected-in-local-candidate-only',
   evidence:'The repository SQL permits a member to update a partner-owned account document within the same household.',
   scope:'Local reproduction from repository schema only; actual hosted policies were neither read nor tested.',
   required:'Candidate migration 07 is qualified below but is not deployed. Verify against the authorized isolated Supabase environment before any production decision.'});
 });
 await test('candidate migration 07 is repeatable and preserves every financial row',async()=>{
  const before=digest(await rows()),sql=await fs.readFile(path.join(root,'migrations/07-trace-account-owner-write-guard.sql'),'utf8');
  await db.exec(sql);await db.exec(sql);assert.equal(digest(await rows()),before);
 });
 await test('both members can still read household accounts while cross-owner insert, update, delete and reassignment are blocked',async()=>{
  for(const user of [uid(1),uid(2)])assert.equal((await asUser(user,tx=>tx.query("select item_id from public.documents where household_id=$1 and collection='accounts'",[householdA.household_id]))).rows.length,4);
  for(const [user,target] of [[uid(1),'partner'],[uid(2),'ca']]){
   assert.equal((await asUser(user,tx=>tx.query("update public.documents set data=data||'{\"name\":\"DENIED\"}'::jsonb,updated_by=$1 where household_id=$2 and collection='accounts' and item_id=$3 returning item_id",[user,householdA.household_id,target]))).rows.length,0);
   assert.equal((await asUser(user,tx=>tx.query("delete from public.documents where household_id=$1 and collection='accounts' and item_id=$2 returning item_id",[householdA.household_id,target]))).rows.length,0);
  }
  await assert.rejects(asUser(uid(1),tx=>put(tx,'accounts',{id:'forged-owner',owner:'partner',currency:'CAD'},uid(1))),/row-level security/);
  await assert.rejects(asUser(uid(1),tx=>put(tx,'investment_accounts',{id:'forged-savings',owner:'partner',currency:'EUR'},uid(1))),/row-level security/);
  const own={...accounts[0],name:'Own account permitted'};
  await asUser(uid(1),tx=>put(tx,'accounts',own,uid(1)));
  await assert.rejects(asUser(uid(1),tx=>put(tx,'accounts',{...own,owner:'partner'},uid(1))),/row-level security/);
  const partner={...accounts[3],name:'Partner own account permitted'};
  await asUser(uid(2),tx=>put(tx,'accounts',partner,uid(2)));
  assert.equal((await rows()).find(x=>x.item_id==='partner').data.name,partner.name);
  // Existing shared settlement documents remain compatible with baseline RLS.
  await asUser(uid(2),tx=>put(tx,'transactions',{id:'shared-settlement',type:'transfer',status:'pending'},uid(2)));
 });
 await test('a missing account owner is rejected instead of silently assigned by migration 07',async()=>{
  const sql=await fs.readFile(path.join(root,'migrations/07-trace-account-owner-write-guard.sql'),'utf8');
  const probe=new PGlite();
  try{
   await probe.exec(`create table public.documents(collection text,data jsonb);
    insert into public.documents values('accounts','{"id":"unowned"}');`);
   await assert.rejects(probe.exec(sql),/Account ownership is incomplete/);
  }finally{await probe.close();}
 });
 await test('remaining personal-settings authorization and lost-update gaps are exposed with rolled-back fictional probes',async()=>{
  const before=(await db.query('select settings from public.households where id=$1',[householdA.household_id])).rows[0].settings;
  await asUser(uid(1),async tx=>{
   await tx.exec('savepoint settings_probe');
   const changed=await tx.query("update public.households set settings=jsonb_set(settings,'{accountOpeningBalances,partner}','9999'::jsonb,true),updated_by=$1 where id=$2 returning settings",[uid(1),householdA.household_id]);
   assert.equal(changed.rows[0].settings.accountOpeningBalances.partner,9999);
   await tx.exec('rollback to savepoint settings_probe');
  });
  assert.deepEqual((await db.query('select settings from public.households where id=$1',[householdA.household_id])).rows[0].settings,before);
  // Explicit deterministic interleaving of two stale client snapshots, not a
  // load/concurrency stress test and not a hosted Supabase transport test.
  await asUser(uid(1),async tx=>{
   await tx.exec('savepoint stale_probe');
   const a=(await tx.query("select data from public.documents where household_id=$1 and collection='accounts' and item_id='ca'",[householdA.household_id])).rows[0].data;
   const b={...a};await put(tx,'accounts',{...a,name:'CLIENT A'},uid(1));
   await put(tx,'accounts',{...b,country:'US'},uid(1));
   const saved=(await tx.query("select data from public.documents where household_id=$1 and collection='accounts' and item_id='ca'",[householdA.household_id])).rows[0].data;
   assert.equal(saved.name,b.name);assert.equal(saved.country,'US');
   await tx.exec('rollback to savepoint stale_probe');
  });
  findings.push({id:'RLS-PERSONAL-SETTINGS',severity:'release-blocker',
   evidence:'Even after migration 07, baseline household settings let one member alter the other member opening balance.',
   scope:'Fictional PostgreSQL only; hosted policies unknown.',required:'Protect personal settings server-side without preventing validated shared settings updates.'});
  findings.push({id:'STALE-WRITE',severity:'release-blocker',
   evidence:'Two interleaved stale app document upserts lose the first client edit; the repository has no server compare-and-swap guard.',
   scope:'Deterministic local SQL interleaving, not an actual concurrent hosted-browser test.',required:'Implement atomic version checks and retry/conflict UI before multi-client qualification.'});
 });
 console.log(checks.length+' PostgreSQL integration checks passed; '+findings.filter(f=>f.severity==='release-blocker').length+' remaining release-blocking findings');
})().catch(error=>{checks.push({name:'first failing SQL boundary',passed:false,error:error.message});console.error(error.message);process.exitCode=1;
}).finally(async()=>{
 const index=process.argv.indexOf('--report');
 if(index>=0)await fs.writeFile(path.resolve(process.argv[index+1]),JSON.stringify({
  engine:'PGlite 0.4.5 / PostgreSQL 17.5 WASM',hostedSupabase:false,auth:'fictional auth.uid session claims',
  schema:'Repository SQL; only pgcrypto installation omitted (built-in UUID used)',
  checks,findings,testsPassed:checks.every(x=>x.passed),productionReady:false},null,2)+'\n');
 await db?.close();if(temp)await fs.rm(temp,{recursive:true,force:true});
});
