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
 const state={household:{baseCurrency:'CAD'}};
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
