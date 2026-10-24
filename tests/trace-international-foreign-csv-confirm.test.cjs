'use strict';
// Real TRACE foreign-CSV review and financial engine; fake DOM and cloud.
// No live FX HTTP, user data, browser, or hosted Supabase. Node test fixture.
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'trace-international-1.0.0.js'),'utf8');
const start=app.indexOf('function reviewForeignPendingCsvExpense(t){'),
 end=app.indexOf('/* Edit native-currency expense metadata',start);
assert.ok(start>0&&end>start);
const excerpt=app.slice(start,end);
function build(overrides={}){
 const window={TraceImportGuide:{
  cardStatementSettlementLabel:name=>/PAIEMENT CARTE/i.test(name),
  safeForQuickApproval:(accountType,type,name)=>type==='expense'&&
   !/PAIEMENT CARTE|VIREMENT|INTERAC/i.test(name)
 }};
 new Function('window',engine)(window);
 window.TraceInternational={...window.TraceInternational,getRate:async()=>{throw Error('Historical FX service unavailable')}};
 const account={id:'fr',name:'Compte EUR fictif',owner:'la',type:'checking',currency:'EUR'};
 const t={id:'eur-40',accountId:'fr',name:'Librairie',date:'2026-10-08',
  type:'expense',source:'csv',status:'pending',bankCurrency:'EUR',currency:'EUR',
  bankAmount:40,amountOriginal:40,amountCAD:null,...overrides.transaction};
 const state={accounts:[account],categories:[{id:'books',name:'Livres',type:'expense'}],transactions:[t]};
 const nodes={},saved=[],sheets=[];
 const node=id=>nodes[id]||(nodes[id]={id,value:'',checked:false,disabled:false,textContent:'',onclick:null});
 const quoteMatches=()=>overrides.matches||[];
 const func=new Function('window','state','me','partner','visibleBankAccounts','accountType',
  'shortAccountLabel','shortMemberName','manualCategories','csvBankEvidenceMatches',
  'openSheet','closeSheet','esc','$','traceImportSplit','legacyImportNatureReady',
  'saveDocument','renderAll','navigate','showTab',excerpt+'return reviewForeignPendingCsvExpense;');
 const show=(title,body)=>sheets.push({title,body});
 const review=func(window,state,'la','partner',()=>[account],a=>a.type,a=>a.name,
  x=>x,()=>state.categories,quoteMatches,show,()=>{},x=>String(x),node,
  ({beneficiary},v)=>({beneficiary,split:{la:100,partner:0},
   splitAmounts:{la:v.amountCAD,partner:0}}),()=>true,
  async(collection,item)=>{if(overrides.saveError)throw Error(overrides.saveError);
    saved.push({collection,item});},()=>{},()=>{},()=>{});
 return {review,t,account,nodes,node,saved,sheets,state,window};
}
function fill(ctx,{rate='1.60',confirm=true,distinct=false}={}){
 ctx.node('#foreignCsvCategory').value='books';
 ctx.node('#foreignCsvWho').value='la';
 ctx.node('#foreignCsvRate').value=rate;
 ctx.node('#foreignCsvNature').checked=confirm;
 ctx.node('#foreignCsvDistinct').checked=distinct;
}
test('40 EUR CSV validates only after human confirmation and explicit dated FX',async()=>{
 const c=build();c.review(c.t);fill(c);
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,1);assert.equal(c.saved[0].collection,'transactions');
 assert.equal(c.t.bankAmount,40);assert.equal(c.t.bankCurrency,'EUR');
 assert.equal(c.t.amountCAD,64);assert.equal(c.t.status,'confirmed');
 assert.equal(c.t.fxRateDate,'2026-10-08');
 assert.match(c.t.fxRateSource,/manuellement/);
});
test('missing nature confirmation leaves transaction pending',async()=>{
 const c=build();c.review(c.t);fill(c,{confirm:false});
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,0);assert.equal(c.t.status,'pending');
});
test('missing historical quote cannot produce invented CAD conversion',async()=>{
 const c=build();c.review(c.t);fill(c,{rate:''});
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,0);assert.equal(c.t.amountCAD,null);
 assert.match(c.node('#foreignCsvError').textContent,/Historical FX service unavailable/);
});
test('a server write rejection never mutates local financial state',async()=>{
 const c=build({saveError:'TRACE_WRITE_CONFLICT'});c.review(c.t);fill(c);
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,0);assert.equal(c.t.status,'pending');
 assert.equal(c.t.amountCAD,null);
});
test('confirmed same-day matching movement requires manual distinctness',async()=>{
 const c=build({matches:[{id:'existing',status:'confirmed',name:'Librairie',date:'2026-10-08'}]});
 c.review(c.t);fill(c);
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,0);assert.equal(c.t.status,'pending');
 c.node('#foreignCsvDistinct').checked=true;
 await c.node('#foreignCsvSave').onclick();
 assert.equal(c.saved.length,1);
});
test('bank settlement label is blocked rather than confirmed as expense',()=>{
 const c=build({transaction:{name:'PAIEMENT CARTE'}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
 assert.equal(c.node('#foreignCsvSave').onclick,null);
});
test('unknown foreign CSV movement remains in safety fallback',()=>{
 const c=build({transaction:{type:'transfer',toAccountId:'another'}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
});
test('ambiguous transfer description is never offered as simple CSV expense',()=>{
 const c=build({transaction:{name:'VIREMENT INTERAC'}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
 assert.equal(c.node('#foreignCsvSave').onclick,null);
});
test('mismatched original purchase currency must not be invented from native CSV amount',()=>{
 const c=build({transaction:{currency:'USD'}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
 assert.equal(c.node('#foreignCsvSave').onclick,null);
});
test('prevalued foreign CSV draft is kept out of native-only fast confirmation',()=>{
 const c=build({transaction:{amountCAD:64,bankRateCad:1.60}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
 assert.equal(c.node('#foreignCsvSave').onclick,null);
});
test('inconsistent original and bank amount cannot create a false historical booking',()=>{
 const c=build({transaction:{amountOriginal:50}});
 c.review(c.t);
 assert.match(c.sheets[0].title,/Nature bancaire/);
 assert.equal(c.node('#foreignCsvSave').onclick,null);
});
test('foreign CSV validator is routed only for non-confirmed expenses',()=>{
 assert.match(app,/reviewForeignPendingCsvExpense\(t\);return;/);
 assert.match(app,/t\.type==='expense'&&t\.source==='csv'&&t\.status!=='confirmed'/);
});
