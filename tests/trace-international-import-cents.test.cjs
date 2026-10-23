'use strict';
/* Real candidate handlers, fictional in-memory bank imports only. No network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
function pick(from,to,deps={}){
 const a=app.indexOf(from),b=app.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Missing candidate handler '+from);
 return new Function(...Object.keys(deps),'return ('+app.slice(a,b)+');')(...Object.values(deps));
}
const exact=pick('function smartExactBankAmount(','\nfunction smartStrictDate(');
const checking={id:'ca',type:'checking',owner:'la',currency:'CAD'};
const card={id:'mc',type:'card',owner:'la',currency:'CAD'};
const strictDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x);
let count=0;async function test(label,fn){await fn();count++;console.log('PASS '+label);}
function matchFixture(){
 const draft={id:'ocr',kind:'smart_draft',status:'pending',accountId:'mc',bankDirection:'in'};
 const state={accounts:[checking,card],smartImports:[draft],transactions:[{id:'payment',
  type:'transfer',accountId:'ca',toAccountId:'mc',amountCAD:100,status:'confirmed'}]};
 const writes=[],deps={state,me:'la',visibleBankAccounts:()=>[checking,card],accountType:x=>x.type,
  smartExactBankAmount:exact,smartStrictDate:strictDate,smartCardPaymentMatches:()=>[{id:'payment'}],
  window:{TraceInternational:{currency:x=>x.currency},TraceImportGuide:{
   cardStatementSettlementLabel:()=>true,genericCardPaymentLabel:()=>false}},
  saveDocument:async(c,row)=>writes.push({collection:c,row}),renderAll(){}};
 const match=pick('async function smartMatchCardPaymentDraft(','\nasync function smartApproveDraft(',deps);
 const input={date:'2026-10-15',name:'PAIEMENT MASTERCARD',type:'card_payment_received',
  amount:'100.00',verified:true};
 return{draft,state,writes,match,input};
}
function stageFixture(){
 const state={smartImports:[],importDays:[]},writes=[];let n=0;
 const deps={state,me:'la',visibleBankAccounts:()=>[checking],smartStrictDate:strictDate,
  smartExactBankAmount:exact,normalizedMerchant:x=>String(x||'').toLowerCase(),
  txDocId:()=>String(++n),saveDocument:async(c,row)=>writes.push({c,row}),
  recordDayImport:async()=>{},window:{TraceImportCalendar:{render(){}}},console:{warn(){}}};
 return{state,writes,stage:pick('async function smartStageRows(','\nasync function smartSaveDraft(',deps)};
}
async function run(){
 await test('bank cents: valid decimal amounts remain exact',()=>{
  for(const v of [0.01,19.99,'100.05',100,0.1+0.2])
   assert.equal(exact(v),Math.round(Number(v)*100)/100);
 });
 await test('bank cents: fractional-cent OCR cannot be rounded',()=>{
  for(const v of [0.001,10.005,10.999,'99.999'])assert.equal(exact(v),null);
 });
 await test('bank cents: missing, zero, negative and unsafe values are rejected',()=>{
  for(const v of ['',null,undefined,-2,0,'NaN',Infinity,10000001])assert.equal(exact(v),null);
 });
 await test('uncertain OCR amount remains a pending unvalued draft',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Restaurant',amount:12.345,bankDirection:'out'}]);
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].c,'imports');
  assert.equal(s.state.smartImports[0].amount,null);
  assert.equal(s.state.smartImports[0].needsAmountReview,true);
 });
 await test('valid OCR amount stays unchanged',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Courses',amount:12.34}]);
  assert.equal(s.state.smartImports[0].amount,12.34);
  assert.equal(s.state.smartImports[0].needsAmountReview,false);
 });
 await test('invalid suggested OCR amount does not become bank evidence',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Courses',suggestedAmount:12.345}]);
  assert.equal(s.state.smartImports[0].amount,null);
  assert.equal(s.state.smartImports[0].suggestedAmount,undefined);
 });
 await test('fractional cents cannot match a confirmed card payment',async()=>{
  const s=matchFixture();await assert.rejects(()=>s.match('ocr',
   {...s.input,amount:'99.999'},'payment'),/montant/);
  assert.equal(s.writes.length,0);assert.equal(s.draft.status,'pending');
  assert.equal(s.state.transactions.length,1);
 });
 await test('a missing card amount cannot match a payment',async()=>{
  for(const amount of ['',null,0]){
   const s=matchFixture();await assert.rejects(()=>s.match('ocr',
    {...s.input,amount},'payment'),/montant/);
   assert.equal(s.writes.length,0);
  }
 });
 await test('matching existing card transfer adds zero bank transactions',async()=>{
  const s=matchFixture(),result=await s.match('ocr',s.input,'payment');
  assert.equal(result.additionalTransactions,0);assert.equal(result.budgetChange,0);
  assert.equal(s.draft.amount,100);assert.equal(s.draft.linkedTransactionId,'payment');
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].collection,'imports');
  assert.equal(s.state.transactions.length,1);
 });
 await test('an unverified OCR draft never becomes matched',async()=>{
  const s=matchFixture();await assert.rejects(()=>s.match('ocr',
   {...s.input,verified:false},'payment'),/Vérifie/);
  assert.equal(s.writes.length,0);
 });
 await test('manual approval rejects fractional cents before accounting',async()=>{
  const state={accounts:[checking],smartImports:[{id:'ocr',kind:'smart_draft',
   status:'pending',accountId:'ca'}]};
  const fn=pick('async function smartApproveDraft(','\nasync function smartResetDay(',{
   state,me:'la',visibleBankAccounts:()=>[checking],smartExactBankAmount:exact,
   smartStrictDate:strictDate,window:{TraceMovement:{get:()=>({type:'expense',budget:'expense'})}}
  });
  await assert.rejects(()=>fn('ocr',{verified:true,date:'2026-10-15',
   name:'Restaurant',type:'expense',amount:'20.005'}),/montant/);
  assert.equal(state.smartImports[0].status,'pending');
 });
 await test('CSV invalid-cent rows are blocked before import',()=>{
  assert.match(app,/smartExactBankAmount\(Math\.abs\(n\)\)===null/);
  assert.match(app,/invalid\.push\(index\+2\);return;/);
 });
 console.log(count+' import cent-precision and card reconciliation checks passed');
}
run().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
