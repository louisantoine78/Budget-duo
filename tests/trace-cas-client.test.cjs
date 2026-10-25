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
test('CAS refuses stale overwrites, preserving original server row',async()=>{
 const {app,saved,root}=createContext(),k=app.traceWriteKey('transactions','x');
 await app.saveDocument('transactions',{id:'x',amountCAD:10});
 saved.get(k).revision=1;saved.get(k).data.amountCAD=20;
 await assert.rejects(app.saveDocument('transactions',{id:'x',amountCAD:100}),/TRACE_WRITE_CONFLICT/);
 assert.equal(saved.get(k).data.amountCAD,20);
 assert.equal(app.blocked(),true);
 assert.equal(root.items.length,1);
 await assert.rejects(app.saveDocument('transactions',{id:'new',amountCAD:20}),/recharge TRACE/);
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
