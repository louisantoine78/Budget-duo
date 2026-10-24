'use strict';
// TRACE 5.37.0: actual bank-capture and batch approval code with fictional accounts.
// Requires Node native rerun. Harmless: no real API, database, PWA, or browser.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
function between(start,end){
 const i=app.indexOf(start),j=app.indexOf(end,i);
 assert.ok(i>=0&&j>i,'Missing function '+start);
 return app.slice(i,j);
}
const smartCode=between('async function smartApproveDraft(id,v){','async function smartResetDay(');
const quickCode=between('async quickFinalizeApproved(items){','afterBoundaryFor:(')
 .replace('async quickFinalizeApproved(items){','async function quickFinalizeApproved(items){')
 .replace(/\},\s*$/, '}');
function capture(currency='EUR'){
 const bank={id:'bank',owner:'la',currency,type:'checking'};
 const draft={id:'draft',kind:'smart_draft',status:'pending',accountId:'bank'};
 const state={smartImports:[draft],accounts:[bank],transactions:[]},writes=[];
 const window={TraceMovement:{get:id=>({id,type:'expense',budget:'expense',direction:-1})},
  TraceInternational:{currency:bank=>bank.currency},
  TraceImportGuide:{direction:()=> 'out',allowed:()=>true,cardStatementSettlementLabel:()=>false}};
 const handler=new Function('state','me','visibleBankAccounts','smartStrictDate',
  'smartExactBankAmount','window','accountType','manualCategories','saveDocument',
  smartCode+'return smartApproveDraft;')(
  state,'la',()=>[bank],date=>date==='2026-10-11',v=>Number(v),
  window,a=>a.type,()=>[],async(...x)=>writes.push(x));
 return {state,bank,draft,writes,handler,
  input:{verified:true,date:'2026-10-11',name:'Café',amount:'10',type:'expense'}};
}
test('EUR OCR draft remains pending and financial transaction is not written',async()=>{
 const c=capture('EUR');
 await assert.rejects(c.handler(c.draft.id,c.input),/Capture en devise étrangère/);
 assert.equal(c.draft.status,'pending');
 assert.equal(c.state.transactions.length,0);assert.equal(c.writes.length,0);
});
test('USD card capture is also blocked from unqualified financial confirmation',async()=>{
 const c=capture('USD');c.bank.type='card';
 await assert.rejects(c.handler(c.draft.id,c.input),/Capture en devise étrangère/);
 assert.equal(c.draft.status,'pending');assert.equal(c.writes.length,0);
});
test('CAD capture still reaches its existing category validation',async()=>{
 const c=capture('CAD');
 await assert.rejects(c.handler(c.draft.id,c.input),/Choisis une catégorie/);
 assert.equal(c.draft.status,'pending');assert.equal(c.writes.length,0);
});
function quickContext(){
 const bank={id:'bank',owner:'la',currency:'CAD',type:'checking'};
 const make=(id,status)=>({id,status,accountId:'bank',source:'csv',
  date:'2026-10-11',amountCAD:10,type:'expense'});
 const state={accounts:[bank],transactions:[
  make('ignored','ignored'),make('done','done'),make('received','received'),make('pending','pending')]};
 const saved=[];
 const fn=new Function('state','me','partner','manualCategories','legacyImportNatureReady',
  'traceCustomShares','traceImportSplit','saveDocument','renderAll',
  quickCode+'return quickFinalizeApproved;')(
  state,'la','partner',()=>[{id:'groceries'}],()=>true,()=>{},
  ()=>({beneficiary:'la',split:{la:100,partner:0},
   splitAmounts:{la:10,partner:0}}),
  async(c,item)=>saved.push({c,item}),()=>{});
 return{fn,state,saved,items:state.transactions.map(t=>({
  id:t.id,categoryId:'groceries',beneficiary:'la'}))};
}
test('quick bulk approval never revives ignored, received or done entries',async()=>{
 const c=quickContext(),res=await c.fn(c.items);
 assert.equal(res.confirmed,1);assert.equal(res.pending,3);
 assert.equal(c.saved.length,1);assert.equal(c.saved[0].item.id,'pending');
 assert.equal(c.state.transactions.find(t=>t.id==='ignored').status,'ignored');
 assert.equal(c.state.transactions.find(t=>t.id==='pending').status,'confirmed');
});
test('manual batch screen selects only pending transactions',()=>{
 assert.match(app,/const unresolved=uniq\.map\(id=>state\.transactions\.find\(t=>t\.id===id&&t\.status==='pending'\)\)/);
});
