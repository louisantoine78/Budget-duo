'use strict';
// Isolated client RPC contract tests. No Supabase, browser, filesystem writes,
// live bank data or CI side effects. This is NOT a PostgreSQL integration test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
function section(begin,end){
 const i=source.indexOf(begin),j=source.indexOf(end,i);
 assert.ok(i>=0&&j>i,'App section missing: '+begin);
 return source.slice(i,j);
}
const helpers=section('// 5.37 candidate:','let activityAccountFilter');
const saves=section('async function saveHouseholdSettings(){','function settingsBack(){');
const deletion=section('async function removeDocument(','function categoryKind(');
function createContext(){
 const saved=new Map(),calls=[];
 let settingsRevision=0;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const client={async rpc(method,p){
  calls.push({method,p:copy(p)});
  if(method==='trace_cas_save_document'){
   const key=JSON.stringify([p.p_collection,p.p_item_id]),prior=saved.get(key);
   if((prior&&prior.revision!==p.p_expected_revision)||
      (!prior&&p.p_expected_revision!==null))
    return{error:{message:'TRACE_WRITE_CONFLICT: test fixture'},data:null};
   const revision=prior?prior.revision+1:0;
   saved.set(key,{revision,data:copy(p.p_data)});return{error:null,data:revision};
  }
  if(method==='trace_cas_delete_document'){
   const key=JSON.stringify([p.p_collection,p.p_item_id]),prior=saved.get(key);
   if(!prior||prior.revision!==p.p_expected_revision)
    return{error:{message:'TRACE_WRITE_CONFLICT: test fixture'},data:null};
   saved.delete(key);return{error:null,data:true};
  }
  if(method==='trace_cas_save_household_settings'){
   if(p.p_expected_revision!==settingsRevision)
    return{error:{message:'TRACE_WRITE_CONFLICT: test fixture'},data:null};
   return{error:null,data:++settingsRevision};
  }
  throw Error('Unexpected RPC '+method);
 }};
 const root={items:[],prepend(n){this.items.unshift(n);}};
 const document={querySelector:s=>s==='#app'?root:null,
  createElement:tag=>({tag,children:[],setAttribute(){},
   append(...x){this.children.push(...x)},textContent:''})};
 const syncLog=[];
 const factory=new Function('client','sync','document','window','location',
  'internationalPreviewMode','household','state',
  helpers+saves+deletion+`
return{saveDocument,saveHouseholdSettings,removeDocument,traceWriteKey,traceDocRevisions,
 setRevision:n=>traceSettingsRevision=n,blocked:()=>traceWritesBlocked};`);
 const house={id:'fictional-household',settings:{}};
 const state={household:{baseCurrency:'CAD'},accounts:[],transactions:[],smartImports:[],importDays:[]};
 const app=factory(client,(a,b)=>syncLog.push({status:a,detail:b}),document,
  {confirm:()=>false},{reload(){}},()=>false,house,state);
 return{app,client,saved,calls,root,house,state,syncLog,
  setSettingsRevision:n=>{settingsRevision=n;}};
}
test('CAS document create, update and local serialization retain last value',async()=>{
 const {app,saved}=createContext();
 await app.saveDocument('transactions',{id:'t1',amountCAD:40});
 await app.saveDocument('transactions',{id:'t1',amountCAD:41});
 await Promise.all([app.saveDocument('transactions',{id:'t1',amountCAD:42}),
  app.saveDocument('transactions',{id:'t1',amountCAD:43})]);
 const k=app.traceWriteKey('transactions','t1');
 assert.equal(saved.get(k).data.amountCAD,43);
 assert.equal(app.traceDocRevisions.get(k),3);
});
test('queued CAS saves the amount and nested metadata from each call, not later mutations',async()=>{
 const {app,calls,saved}=createContext();
 const tx={id:'queued-native',type:'expense',amountCAD:40,
  bankCurrency:'CAD',bankEvidence:{note:'original'}};
 const first=app.saveDocument('transactions',tx);
 tx.amountCAD=41;
 tx.bankEvidence.note='second';
 const second=app.saveDocument('transactions',tx);
 tx.amountCAD=900;
 tx.bankEvidence.note='unrelated future edit';
 await Promise.all([first,second]);
 const writes=calls.filter(c=>c.method==='trace_cas_save_document');
 assert.equal(writes.length,2);
 assert.deepEqual(writes.map(w=>w.p.p_data.amountCAD),[40,41]);
 assert.deepEqual(writes.map(w=>w.p.p_data.bankEvidence.note),
  ['original','second']);
 assert.deepEqual(writes.map(w=>w.p.p_expected_revision),[null,0]);
 assert.equal(saved.get(app.traceWriteKey('transactions',tx.id)).data.amountCAD,41);
 assert.equal(saved.get(app.traceWriteKey('transactions',tx.id)).revision,1);
});
test('non-finite and unsafe amounts never become null or rounded financial writes',async()=>{
 const {app,calls,syncLog,saved}=createContext();
 const bad=[NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,
  -(Number.MAX_SAFE_INTEGER+1)];
 for(const amount of bad){
  await assert.rejects(app.saveDocument('transactions',{id:'unsafe',amountCAD:amount}),
   /TRACE_INVALID_FINANCIAL_NUMBER/);
  await assert.rejects(app.saveDocument('transactions',{
   id:'unsafe-nested',amountCAD:10,bankEvidence:{rate:amount}}),
   /TRACE_INVALID_FINANCIAL_NUMBER/);
 }
 assert.equal(calls.length,0,'No RPC must receive a rounded or null monetary amount');
 assert.equal(syncLog.length,0,'Invalid serialization cannot claim saving');
 assert.equal(saved.size,0);
 await app.saveDocument('transactions',{id:'ordinary',amountCAD:0.3,quote:1.4612345});
 assert.equal(calls.length,1,'Ordinary monetary decimals and FX rates remain supported');
});
test('invalid household settings are rejected before synchronization or RPC',async()=>{
 const {app,state,syncLog,calls}=createContext();
 app.setRevision(0);
 state.household.accountOpeningBalances={cad:NaN};
 await assert.rejects(app.saveHouseholdSettings(),/TRACE_INVALID_FINANCIAL_NUMBER/);
 assert.equal(calls.length,0);
 assert.equal(syncLog.length,0);
 state.household.accountOpeningBalances={cad:350.45};
 await app.saveHouseholdSettings();
 assert.equal(calls.length,1);
 assert.equal(syncLog.at(-1)?.status,'synced');
});
test('unserializable financial payload refuses RPC rather than sending a partial record',async()=>{
 const {app,calls}=createContext();
 await assert.rejects(app.saveDocument('transactions',{
  id:'unserializable-money',amountCAD:40n}),/BigInt|serialize/i);
 assert.equal(calls.length,0);
});
test('rejected invalid and deferred saves never show a phantom saving status',async()=>{
 const {app,calls,state,syncLog}=createContext();
 await assert.rejects(app.saveDocument('transactions',{amountCAD:5}),/Identifiant/);
 assert.equal(syncLog.length,0,'Invalid document never started a write');
 state.accounts=[{id:'eur-deferred',owner:'la',paymentMode:'deferred',currency:'EUR'}];
 await assert.rejects(app.saveDocument('transactions',{id:'blocked',type:'expense',
  accountId:'eur-deferred',amountEUR:5}),/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(syncLog.length,0,'Quarantined deferred document never started a write');
 await assert.rejects(app.saveDocument('transactions',{id:'invalid-json',amountCAD:5n}),/BigInt|serialize/i);
 assert.equal(syncLog.length,0,'Unserializable document never started a write');
 assert.equal(calls.length,0);
 await app.saveDocument('transactions',{id:'valid',amountCAD:5});
 assert.equal(syncLog.at(-1)?.status,'synced','Actual successful write updates status');
});
test('queued write snapshots JSON but still blocks metadata promoted to deferred',async()=>{
 const {app,calls}=createContext();
 const row={id:'late-deferred',type:'expense',amountCAD:20,
  bankCurrency:'CAD'};
 const queued=app.saveDocument('transactions',row);
 row.deferredKind='purchase';
 await assert.rejects(queued,/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});
test('Supabase RPC failures remain proper Error instances without dropping server context',async()=>{
 const {app,client}=createContext();
 const original=client.rpc;
 client.rpc=async(method,args)=>method==='trace_cas_save_document'?
  {data:null,error:{message:'Fictional write unavailable',code:'42501',details:'mock RLS context'}}:
  original(method,args);
 await assert.rejects(app.saveDocument('transactions',{id:'server-error',amountCAD:20}),error=>{
  assert.equal(error instanceof Error,true);
  assert.match(error.message,/Fictional write unavailable/);
  assert.equal(error.code,'42501');
  assert.equal(error.details,'mock RLS context');
  return true;
 });
});
test('CAS refuses stale overwrites, preserving original server row',async()=>{
 const {app,saved,root}=createContext(),k=app.traceWriteKey('transactions','x');
 await app.saveDocument('transactions',{id:'x',amountCAD:10});
 saved.get(k).revision=1;saved.get(k).data.amountCAD=20;
 await assert.rejects(app.saveDocument('transactions',{id:'x',amountCAD:100}),
  err=>{assert.match(String(err?.message||''),/TRACE_WRITE_CONFLICT/);return true;});
 assert.equal(saved.get(k).data.amountCAD,20);
 assert.equal(app.blocked(),true);
 assert.equal(root.items.length,1);
 await assert.rejects(app.saveDocument('transactions',{id:'new',amountCAD:20}),/recharge TRACE/);
});
test('in-flight financial deletion displays saving until server confirms removal',async()=>{
 const {app,client,syncLog,saved}=createContext();
 await app.saveDocument('transactions',{id:'delete-pending',amountCAD:30});
 assert.equal(syncLog.at(-1)?.status,'synced');
 let entered,release;
 const started=new Promise(done=>{entered=done;});
 const blocked=new Promise(done=>{release=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_delete_document'&&args.p_item_id==='delete-pending'){
   entered();await blocked;
  }
  return original(method,args);
 };
 const removing=app.removeDocument('transactions','delete-pending');
 await started;
 assert.equal(syncLog.at(-1)?.status,'saving',
  'An unconfirmed deletion must never leave the workspace green');
 assert.equal(saved.has(app.traceWriteKey('transactions','delete-pending')),true);
 release();await removing;
 assert.equal(saved.has(app.traceWriteKey('transactions','delete-pending')),false);
 assert.equal(syncLog.at(-1)?.status,'synced',
  'Successful confirmed deletion restores synchronized status');
});
test('CAS deletion requires loaded version and removes revision on success',async()=>{
 const {app,saved}=createContext();
 await app.saveDocument('transactions',{id:'x',amountCAD:10});
 await app.removeDocument('transactions','x');
 assert.equal(saved.has(app.traceWriteKey('transactions','x')),false);
 assert.equal(app.traceDocRevisions.has(app.traceWriteKey('transactions','x')),false);
 await assert.rejects(app.removeDocument('transactions','x'),/non chargé/);
});
test('CAS household settings increments version without writing client-owned revision',async()=>{
 const {app,house,calls}=createContext();
 app.setRevision(0);
 await app.saveHouseholdSettings();
 await app.saveHouseholdSettings();
 assert.equal(calls.filter(c=>c.method==='trace_cas_save_household_settings').length,2);
 assert.equal(calls.at(-1).p.p_expected_revision,1);
 assert.equal(house.settings.schemaVersion,5);
});
test('settings attempt after CAS conflict never hides the blocked warning with saving',async()=>{
 const {app,client,syncLog}=createContext();
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document')
   return {data:null,error:{message:'TRACE_WRITE_CONFLICT: fictional remote device'}};
  return original(method,args);
 };
 await assert.rejects(app.saveDocument('transactions',{id:'conflict',amountCAD:10}),
  /TRACE_WRITE_CONFLICT/);
 assert.equal(app.blocked(),true);
 assert.equal(syncLog.at(-1)?.status,'error');
 const countBefore=syncLog.length;
 await assert.rejects(app.saveHouseholdSettings(),/Conflit de données/);
 assert.equal(syncLog.length,countBefore,
  'Refused settings save must not create a false saving status');
 assert.equal(syncLog.at(-1)?.status,'error');
});
test('Missing server revision blocks household settings',async()=>{
 const {app,calls}=createContext();
 await assert.rejects(app.saveHouseholdSettings(),/Révision serveur absente/);
 assert.equal(calls.length,0);
});
test('Preview short-circuits cloud writes without RPC access',async()=>{
 const ctx=createContext();
 const stub=new Function('client','sync','document','window','location',
  'internationalPreviewMode','household','state',helpers+saves+deletion+
  'return {saveDocument,saveHouseholdSettings,removeDocument};')(
  ctx.client,()=>{},{querySelector:()=>null}, {},{},()=>true,
  {id:'demo',settings:{}},{household:{}});
 await stub.saveDocument('transactions',{id:'demo'});
 await stub.saveHouseholdSettings();
 await stub.removeDocument('transactions','demo');
 assert.equal(ctx.calls.length,0);
});
test('No direct document update or deletion remains in candidate write adapter',()=>{
 assert.doesNotMatch(source,/client\.from\('documents'\)\.(?:upsert|delete)\(/);
 assert.match(source,/client\.rpc\('trace_cas_save_document'/);
 assert.match(source,/client\.rpc\('trace_cas_delete_document'/);
 assert.match(source,/client\.rpc\('trace_cas_save_household_settings'/);
 assert.match(source,/select\('collection,item_id,data,revision'\)/);
 assert.match(source,/select\('id,name,settings,settings_revision/);
});

test('Queued settings save takes the latest in-memory values before each RPC',async()=>{
 const {app,state,calls}=createContext();
 app.setRevision(0);
 state.household.versionHint='initial';
 await app.saveHouseholdSettings();
 state.household.versionHint='newer';
 await Promise.all([app.saveHouseholdSettings(),app.saveHouseholdSettings()]);
 const writes=calls.filter(x=>x.method==='trace_cas_save_household_settings');
 assert.equal(writes.length,3);
 assert.equal(writes[0].p.p_settings.versionHint,'initial');
 assert.equal(writes[2].p.p_settings.versionHint,'newer');
 assert.deepEqual(writes.map(x=>x.p.p_expected_revision),[0,1,2]);
});

test('household CAS freezes nested settings before an asynchronous RPC resolves',async()=>{
 const {app,client,state,house}=createContext();
 app.setRevision(0);
 state.household.memberNicknames={la:'Alex',partner:'Sam'};
 let entered,release;
 const started=new Promise(resolve=>{entered=resolve;});
 const gate=new Promise(resolve=>{release=resolve;});
 const original=client.rpc;
 let payload;
 client.rpc=async(method,p)=>{
  if(method==='trace_cas_save_household_settings'){
   payload=p.p_settings;
   entered();
   await gate;
  }
  return original(method,p);
 };
 const saving=app.saveHouseholdSettings();
 await started;
 // User interacts with the profile while the HTTP request is pending.
 state.household.memberNicknames.la='Modified after send';
 release();
 await saving;
 assert.equal(payload.memberNicknames.la,'Alex',
  'Server request must retain the values from RPC send time');
 assert.equal(house.settings.memberNicknames.la,'Alex',
  'Confirmed settings should match the server payload');
 assert.equal(state.household.memberNicknames.la,'Modified after send',
  'Later unsaved UI edits must not be discarded');
});

test('later local household edits must not be shown as synchronized after an in-flight save',async()=>{
 const {app,client,state,house,syncLog}=createContext();
 app.setRevision(0);
 state.household.memberNicknames={la:'Before upload',partner:'Partner'};
 let entered,release;
 const requestStarted=new Promise(resolve=>{entered=resolve;});
 const waiting=new Promise(resolve=>{release=resolve;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_household_settings'){
   entered();
   await waiting;
  }
  return original(method,args);
 };
 const pending=app.saveHouseholdSettings();
 await requestStarted;
 state.household.memberNicknames.la='Edited while uploading';
 release();await pending;
 assert.equal(house.settings.memberNicknames.la,'Before upload');
 assert.equal(state.household.memberNicknames.la,'Edited while uploading');
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'An edit made after RPC send is still unsaved, so a green sync badge is misleading');
 assert.match(syncLog.at(-1)?.detail||'',/non enregistrée/i);
 // The legitimate new revision remains usable: retrying should persist the
 // later edit rather than blocking it as a cross-device conflict.
 await app.saveHouseholdSettings();
 assert.equal(house.settings.memberNicknames.la,'Edited while uploading');
 assert.equal(syncLog.at(-1)?.status,'synced');
});

test('two fictional devices detect stale edits and deletions without overwriting server data',async()=>{
 const one=createContext(),two=createContext(),three=createContext();
 // Separate browser instances share one fictional server, not revision maps.
 two.client.rpc=(...a)=>one.client.rpc(...a);
 three.client.rpc=(...a)=>one.client.rpc(...a);
 const k=one.app.traceWriteKey('transactions','two-devices');
 await one.app.saveDocument('transactions',{id:'two-devices',amountCAD:50});
 two.app.traceDocRevisions.set(k,0);
 three.app.traceDocRevisions.set(k,0);
 await one.app.saveDocument('transactions',{id:'two-devices',amountCAD:55});
 await assert.rejects(two.app.saveDocument('transactions',{id:'two-devices',amountCAD:500}),
  error=>{assert.match(String(error?.message||''),/TRACE_WRITE_CONFLICT/);return true;});
 assert.equal(two.app.blocked(),true);
 assert.equal(one.saved.get(k).data.amountCAD,55);
 await assert.rejects(three.app.removeDocument('transactions','two-devices'),
  error=>{assert.match(String(error?.message||''),/TRACE_WRITE_CONFLICT/);return true;});
 assert.equal(one.saved.get(k).revision,1);
});

test('two fictional devices cannot overwrite each other’s household preferences',async()=>{
 const first=createContext(),second=createContext();
 second.client.rpc=(...args)=>first.client.rpc(...args);
 first.app.setRevision(0);second.app.setRevision(0);
 first.state.household.defaultSplit={la:70,partner:30};
 second.state.household.defaultSplit={la:50,partner:50};
 await first.app.saveHouseholdSettings();
 await assert.rejects(second.app.saveHouseholdSettings(),
  error=>{assert.match(String(error?.message||''),/TRACE_WRITE_CONFLICT/);return true;});
 assert.equal(second.app.blocked(),true);
 assert.deepEqual(first.house.settings.defaultSplit,{la:70,partner:30});
 // A conflicted device must not pretend that retrying without reload is safe.
 await assert.rejects(second.app.saveHouseholdSettings(),/recharge TRACE/);
});

test('a financial edit made during an RPC remains explicitly unsaved until retried',async()=>{
 const {app,client,saved,syncLog}=createContext();
 const transaction={id:'during-upload',type:'expense',amountCAD:40,
  bankCurrency:'CAD',bankEvidence:{note:'first'}},key=app.traceWriteKey('transactions','during-upload');
 let entered,release;
 const started=new Promise(resolve=>{entered=resolve;});
 const suspended=new Promise(resolve=>{release=resolve;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'){entered();await suspended;}
  return original(method,args);
 };
 const inFlight=app.saveDocument('transactions',transaction);
 await started;
 transaction.amountCAD=75;
 transaction.bankEvidence.note='edited during upload';
 release();await inFlight;
 assert.equal(saved.get(key).data.amountCAD,40,
  'The server must receive only the original snapshot');
 assert.equal(saved.get(key).data.bankEvidence.note,'first');
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'A newer locally edited financial amount cannot display Synchronisé');
 assert.match(syncLog.at(-1)?.detail||'',/non enregistrée/i);
 await app.saveDocument('transactions',transaction);
 assert.equal(saved.get(key).data.amountCAD,75);
 assert.equal(saved.get(key).data.bankEvidence.note,'edited during upload');
 assert.equal(syncLog.at(-1)?.status,'synced');
});

test('deferred card creation is blocked before RPC but normal bank accounts still save',async()=>{
 const {app,calls}=createContext();
 await assert.rejects(app.saveDocument('accounts',{id:'deferred-fr',type:'card',
  paymentMode:'deferred',currency:'EUR'}),/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
 await app.saveDocument('accounts',{id:'current-fr',type:'checking',currency:'EUR'});
 assert.equal(calls.filter(c=>c.method==='trace_cas_save_document').length,1);
});
test('deferred purchases cannot persist even as pending or confirmed',async()=>{
 const {app,calls}=createContext();
 for(const status of ['pending','confirmed']){
  await assert.rejects(app.saveDocument('transactions',{id:'df-'+status,
   type:'expense',status,deferredKind:'purchase',accountId:'unlinked',
   bankAmount:40,bankCurrency:'EUR'}),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
});
test('transfers targeting deferred card and imports from it are held locally',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'card-eur',type:'card',paymentMode:'deferred',
  owner:'la',currency:'EUR'},{id:'current-eur',type:'checking',currency:'EUR'}];
 for(const [collection,item] of [
  ['transactions',{id:'transfer-1',type:'transfer',accountId:'current-eur',
   toAccountId:'card-eur',status:'confirmed'}],
  ['transactions',{id:'direct-1',type:'expense',accountId:'card-eur',status:'pending'}],
  ['imports',{id:'inbox-1',accountId:'card-eur',status:'pending'}],
  ['import_days',{id:'day-1',accountId:'card-eur'}],
  ['reconciliations',{id:'reconcile-1',cardAccountId:'card-eur'}]
 ])await assert.rejects(app.saveDocument(collection,item),/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});
test('ordinary pending to confirmed CAS updates remain available',async()=>{
 const {app,saved,calls}=createContext();
 await app.saveDocument('transactions',{id:'existing-cad',type:'expense',
  accountId:'current',status:'pending',amountCAD:17});
 await app.saveDocument('transactions',{id:'existing-cad',type:'expense',
  accountId:'current',status:'confirmed',amountCAD:17});
 const doc=saved.get(app.traceWriteKey('transactions','existing-cad'));
 assert.equal(doc.data.status,'confirmed');assert.equal(doc.revision,1);
 assert.equal(calls.length,2);
});
test('historical deferred transaction deletion fails locally without RPC',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'card-eur',type:'card',paymentMode:'deferred'}];
 state.transactions=[{id:'old-card-1',accountId:'card-eur',
  type:'expense',status:'pending'}];
 await assert.rejects(app.removeDocument('transactions','old-card-1'),
  /TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});
test('existing deferred card may not be silently switched to credit',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'old-deferred',type:'card',paymentMode:'deferred'}];
 await assert.rejects(app.saveDocument('accounts',
  {id:'old-deferred',type:'card',paymentMode:'credit'}),/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});

test('queued write revalidates model if card becomes deferred before RPC',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'card-eur',type:'card',paymentMode:'credit'}];
 const pending=app.saveDocument('transactions',{id:'queued',type:'expense',
  accountId:'card-eur',amountCAD:40,status:'pending'});
 state.accounts[0].paymentMode='deferred';
 await assert.rejects(pending,/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});
test('queued write revalidates deferred metadata mutated before RPC',async()=>{
 const {app,calls}=createContext();
 const candidate={id:'queued2',type:'expense',accountId:'unlinked',amountCAD:40};
 const pending=app.saveDocument('transactions',candidate);
 candidate.deferredKind='purchase';
 await assert.rejects(pending,/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});

test('deferred type and transfer purpose cannot bypass the gate with unknown account',async()=>{
 const {app,calls}=createContext();
 const records=[
  {id:'future-p',type:'deferred_purchase',accountId:'unknown',status:'pending'},
  {id:'future-s',type:'deferred_settlement',accountId:'unknown',status:'confirmed'},
  {id:'future-t',type:'transfer',accountId:'unknown',
   transferPurpose:'deferred_settlement',status:'confirmed'},
  {id:'future-allocation',type:'transfer',accountId:'unknown',
   settlementMode:'full',purchaseIds:['p1'],status:'confirmed'}
 ];
 for(const record of records)await assert.rejects(
  app.saveDocument('transactions',record),/TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});

test('settlement and allocation metadata alone cannot bypass client gate',async()=>{
 const {app,calls}=createContext();
 for(const [id,extra] of [
  ['standalone-full',{settlementMode:'full'}],
  ['alloc-only',{purchaseIds:[]}],
  ['fees-only',{feeIds:[]}],
  ['bank-evidence',{deferredBankEvidenceReviewed:false}]
 ]){
  await assert.rejects(app.saveDocument('transactions',{
   id,type:'transfer',accountId:'not-loaded',status:'pending',...extra
  }),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
});

test('real persisted imports and import_days collections cannot bypass deferred gate',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'card-eur',type:'card',paymentMode:'deferred',
  owner:'la',currency:'EUR'},{id:'checking',type:'checking',currency:'EUR'}];
 for(const collection of ['imports','import_days']){
  const item={id:collection+'-001',accountId:'card-eur',status:'pending'};
  await assert.rejects(app.saveDocument(collection,item),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
 await app.saveDocument('import_days',{id:'ordinary-day',accountId:'checking',
  status:'pending'});
 assert.equal(calls.filter(x=>x.method==='trace_cas_save_document').length,1);
 assert.equal(calls.at(-1).p.p_collection,'import_days');
});
test('explicit deferred metadata is blocked even when importer lacks a loaded account',async()=>{
 const {app,calls}=createContext();
 for(const collection of ['imports','import_days']){
  const entry={id:collection+'-missing-card',status:'pending',
   deferredKind:'purchase',bankAmount:40,bankCurrency:'EUR'};
  await assert.rejects(app.saveDocument(collection,entry),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
});


test('internal deferred allocation metadata cannot bypass the unloaded-card client guard',async()=>{
 const {app,calls}=createContext();
 const fields={deferredPurchaseId:'purchase-1',deferredPurchaseIds:['purchase-1'],
  deferredFeeIds:['fee-1'],deferredSettlementMode:'partial',
  deferredDueDate:'2026-11-01',deferredBankEvidence:{},
  deferredBankEvidenceReviewed:false};
 for(const [field,value] of Object.entries(fields)){
  await assert.rejects(app.saveDocument('transactions',{
   id:'metadata-'+field,type:'expense',accountId:'unloaded',status:'pending',
   [field]:value}),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
});

test('deferred imports, import days and reconciliations refuse deletion by persisted names',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'legacy-card',type:'card',paymentMode:'deferred'}];
 state.smartImports=[{id:'import-old',accountId:'legacy-card'}];
 state.importDays=[{id:'day-old',accountId:'legacy-card'}];
 state.reconciliations=[{id:'reconcile-old',accountId:'legacy-card'}];
 for(const [collection,id] of [['imports','import-old'],
  ['import_days','day-old'],['reconciliations','reconcile-old']]){
  await assert.rejects(app.removeDocument(collection,id),/TRACE_DEFERRED_NOT_RELEASED/);
 }
 assert.equal(calls.length,0);
});


test('legacy deferred card without type is refused on create and later mutation',async()=>{
 const {app,state,calls}=createContext();
 const legacy={id:'old-mastercard',name:'Mastercard ancien',owner:'la',
  paymentMode:'deferred',currency:'EUR'};
 await assert.rejects(app.saveDocument('accounts',legacy),/TRACE_DEFERRED_NOT_RELEASED/);
 state.accounts=[legacy];
 await assert.rejects(app.saveDocument('accounts',{...legacy,paymentMode:'credit'}),
  /TRACE_DEFERRED_NOT_RELEASED/);
 await assert.rejects(app.saveDocument('transactions',{id:'old-charge',
  type:'expense',accountId:'old-mastercard',status:'pending'}),
  /TRACE_DEFERRED_NOT_RELEASED/);
 state.transactions=[{id:'old-charge',type:'expense',accountId:'old-mastercard'}];
 await assert.rejects(app.removeDocument('transactions','old-charge'),
  /TRACE_DEFERRED_NOT_RELEASED/);
 assert.equal(calls.length,0);
});


test('investment operation referencing a deferred legacy bank ID is held before RPC',async()=>{
 const {app,state,calls}=createContext();
 state.accounts=[{id:'old-deferred',name:'Visa',paymentMode:'deferred',owner:'la'},
  {id:'real-checking',type:'checking',owner:'la',paymentMode:'immediate'}];
 await assert.rejects(app.saveDocument('investment_operations',{
  id:'investment-deferred',type:'deposit',accountId:'portfolio-la',
  bankAccountId:'old-deferred',status:'pending'}),/TRACE_DEFERRED_NOT_RELEASED/);
 await app.saveDocument('investment_operations',{
  id:'investment-checking',type:'deposit',accountId:'portfolio-la',
  bankAccountId:'real-checking',status:'pending'});
 assert.equal(calls.filter(x=>x.method==='trace_cas_save_document').length,1);
});
test('failed network write stays unsynchronized until the same financial document is retried',async()=>{
 const {app,client,syncLog,saved}=createContext();
 const original=client.rpc;
 let disconnected=true;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'&&args.p_item_id==='failed-a'&&disconnected)
   return {error:{message:'Fictional network unavailable'},data:null};
  return original(method,args);
 };
 await assert.rejects(app.saveDocument('transactions',{id:'failed-a',amountCAD:10}),/network/);
 assert.equal(syncLog.at(-1)?.status,'error');
 await app.saveDocument('transactions',{id:'good-b',amountCAD:20});
 assert.equal(syncLog.at(-1)?.status,'error',
  'Another successful write must not hide a failed network write');
 assert.equal(saved.has(app.traceWriteKey('transactions','failed-a')),false);
 disconnected=false;
 await app.saveDocument('transactions',{id:'failed-a',amountCAD:10});
 assert.equal(saved.get(app.traceWriteKey('transactions','failed-a')).data.amountCAD,10);
 assert.equal(syncLog.at(-1)?.status,'synced',
  'A confirmed retry of the failed financial document can clear its warning');
});
test('an unrelated successful save does not clear an outstanding unsaved document warning',async()=>{
 const {app,syncLog,saved}=createContext();
 const changed={id:'still-local',amountCAD:10};
 const first=app.saveDocument('transactions',changed);
 changed.amountCAD=20;
 await first;
 assert.equal(syncLog.at(-1)?.status,'error');
 await app.saveDocument('transactions',{id:'unrelated',amountCAD:50});
 assert.equal(syncLog.at(-1)?.status,'error',
  'Another later successful save cannot falsely confirm the edited document');
 assert.equal(saved.get(app.traceWriteKey('transactions','still-local')).data.amountCAD,10);
 await app.saveDocument('transactions',changed);
 assert.equal(saved.get(app.traceWriteKey('transactions','still-local')).data.amountCAD,20);
 assert.equal(syncLog.at(-1)?.status,'synced','Saving that same edited document clears its warning');
});
test('an unrelated financial save cannot hide outstanding unsaved household settings',async()=>{
 const {app,client,state,syncLog}=createContext();
 app.setRevision(0);
 let entered,release;
 const started=new Promise(done=>{entered=done;});
 const blocked=new Promise(done=>{release=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_household_settings'){
   entered();await blocked;
  }
  return original(method,args);
 };
 state.household.name='original';
 const settings=app.saveHouseholdSettings();
 await started;
 state.household.name='edited after send';
 release();await settings;
 assert.equal(syncLog.at(-1)?.status,'error');
 await app.saveDocument('transactions',{id:'unrelated',amountCAD:50});
 assert.equal(syncLog.at(-1)?.status,'error',
  'An unrelated transaction cannot confirm dirty household settings');
 await app.saveHouseholdSettings();
 assert.equal(syncLog.at(-1)?.status,'synced',
  'A new confirmed settings revision clears the warning');
});
test('unsaved in-flight document edits remain visibly unsynchronized after another successful save',async()=>{
 const {app,client,syncLog}=createContext();
 let entered,release;
 const started=new Promise(done=>{entered=done;});
 const blocked=new Promise(done=>{release=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'&&args.p_item_id==='held'){
   entered();await blocked;
  }
  return original(method,args);
 };
 const held=app.saveDocument('transactions',{id:'held',amountCAD:10});
 await started;
 const item={id:'dirty',amountCAD:40};
 const changed=app.saveDocument('transactions',item);
 item.amountCAD=90;
 await changed;
 assert.equal(syncLog.at(-1)?.status,'error');
 release();await held;
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'Success of held transaction must never hide a locally unsaved edit');
});
test('unsaved settings edits remain unsynchronized after a separate financial write succeeds',async()=>{
 const {app,client,state,syncLog}=createContext();
 app.setRevision(0);
 let docEntered,releaseDoc,settingsEntered,releaseSettings;
 const docStarted=new Promise(done=>{docEntered=done;});
 const docBlocked=new Promise(done=>{releaseDoc=done;});
 const settingsStarted=new Promise(done=>{settingsEntered=done;});
 const settingsBlocked=new Promise(done=>{releaseSettings=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'&&args.p_item_id==='held'){
   docEntered();await docBlocked;
  }
  if(method==='trace_cas_save_household_settings'){
   settingsEntered();await settingsBlocked;
  }
  return original(method,args);
 };
 const held=app.saveDocument('transactions',{id:'held',amountCAD:10});
 await docStarted;
 state.household.name='original';
 const settings=app.saveHouseholdSettings();
 await settingsStarted;
 state.household.name='edited while pending';
 releaseSettings();await settings;
 assert.equal(syncLog.at(-1)?.status,'error');
 releaseDoc();await held;
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'A successful document must never cover an unsaved local settings edit');
});
test('concurrent financial saves never report synchronized before every request finishes',async()=>{
 const {app,client,syncLog,saved}=createContext();
 let entered,release;
 const started=new Promise(done=>{entered=done;});
 const blocked=new Promise(done=>{release=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'&&args.p_item_id==='slow'){
   entered();await blocked;
  }
  return original(method,args);
 };
 const slow=app.saveDocument('transactions',{id:'slow',amountCAD:40});
 await started;
 const fast=app.saveDocument('transactions',{id:'fast',amountCAD:20});
 await fast;
 assert.equal(saved.size,1);
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'A pending transaction must keep the workspace status unsynchronized');
 release();await slow;
 assert.equal(saved.size,2);
 assert.equal(syncLog.at(-1)?.status,'synced');
});
test('a failed concurrent transaction cannot be hidden by a different successful save',async()=>{
 const {app,client,syncLog,saved}=createContext();
 let entered,release;
 const started=new Promise(done=>{entered=done;});
 const blocked=new Promise(done=>{release=done;});
 const original=client.rpc;
 client.rpc=async(method,args)=>{
  if(method==='trace_cas_save_document'&&args.p_item_id==='slow'){
   entered();await blocked;
  }
  if(method==='trace_cas_save_document'&&args.p_item_id==='conflict')
   return {error:{message:'TRACE_WRITE_CONFLICT: fictional concurrent device'},data:null};
  return original(method,args);
 };
 const slow=app.saveDocument('transactions',{id:'slow',amountCAD:40});
 await started;
 await assert.rejects(app.saveDocument('transactions',{id:'conflict',amountCAD:80}),
  error=>{assert.match(String(error?.message||''),/TRACE_WRITE_CONFLICT/);return true;});
 release();await slow;
 assert.equal(saved.size,1);
 assert.equal(app.blocked(),true);
 assert.notEqual(syncLog.at(-1)?.status,'synced',
  'The green badge must never hide a rejected concurrent financial write');
});
