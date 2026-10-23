'use strict';
// Fictional accounts and ledger operations only; no network/Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=get('v5-app-5.37.0.js'),root={};vm.runInNewContext(get('trace-international-1.0.0.js'),{window:root});
const I=root.TraceInternational;
const CA={id:'ca',name:'Courant CA',owner:'la',type:'checking',currency:'CAD',country:'CA'};
const EU={id:'eu',name:'Courant FR',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const PEA={id:'pea',name:'PEA',owner:'la',type:'broker',currency:'EUR'};
const block=(name,next,vars)=>{
 const i=app.indexOf('function '+name+'('),j=app.indexOf('\nfunction '+next+'(',i);
 assert.ok(i>=0&&j>i);return new Function(...Object.keys(vars),'return ('+app.slice(i,j)+');')(...Object.values(vars));
};
function ui(account=PEA,original=null,tx=[]){
 const accounts=[CA,EU],nodes=new Map(),writes=[];
 const originalBank=accounts.find(a=>a.id===original?.bankAccountId);
 const native=original?.bankAmount??(originalBank?.currency==='CAD'?original?.bankAmountCAD:null);
 const defaults={'#invDate':'2026-10-12','#invAmount':String(original?.amount??46.2),
  '#invBankCad':String(native??''),'#invQty':'0','#invPrice':'0','#invQuote':'0',
  '#invFee':'0','#invBank':'','#invSymbol':''};
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:defaults[id]??'',disabled:false,textContent:'',
  classList:{toggle(){}},placeholder:'',onclick:null,onchange:null,oninput:null});return nodes.get(id);};
 const state={accounts,transactions:tx,investmentOperations:[]};let html='';
 const vars={state,window:root,openSheet:(title,markup)=>{html=markup;},
  esc:x=>String(x??''),visibleBankAccounts:owner=>accounts.filter(a=>a.owner===owner),
  accountType:a=>a.type,shortAccountLabel:a=>a.name,traceFeedback:()=>'', $,
  $$:()=>[{classList:{toggle(){}}}],localDateISO:()=> '2026-10-12',
  openInvestmentAccount:()=>{},portfolioLedger:()=>{},
  saveDocument:async(collection,item)=>{writes.push({collection,item:JSON.parse(JSON.stringify(item))});},
  renderWealth:()=>{},txDocId:()=> 'fictional',traceNotice:e=>{throw e;},removeDocument:async()=>{}};
 block('openInvestmentOperation','openPortfolioAnalysis',vars)(account,original);
 return{$,writes,html:()=>html};
}
let count=0;async function test(n,fn){await fn();count++;console.log('PASS '+n);}
async function main(){
 await test('EUR linked deposit saves real EUR and no fictional CAD leg',async()=>{
  const s=ui();s.$('#invBank').value='eu';s.$('#invBank').onchange();
  assert.match(s.$('#invBankNativeLabel').textContent,/EUR/);assert.equal(s.$('#invBankCad').value,'46.2');
  await s.$('#saveInvOp').onclick();assert.equal(s.writes.length,1);
  const v=s.writes[0];assert.equal(v.collection,'investment_operations');
  assert.equal(v.item.bankAmount,46.2);assert.equal(v.item.bankCurrency,'EUR');
  assert.equal(v.item.bankAmountCAD,null);assert.equal(v.item.amount,46.2);
 });
 await test('foreign bank and CAD investment requires explicit foreign amount',async()=>{
  const s=ui({...PEA,currency:'CAD'});s.$('#invBank').value='eu';s.$('#invBank').onchange();
  assert.equal(s.$('#invBankCad').value,'');
  await s.$('#saveInvOp').onclick();assert.equal(s.writes.length,0);
  s.$('#invBankCad').value='32.1';await s.$('#saveInvOp').onclick();
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].item.bankAmount,32.1);
  assert.equal(s.writes[0].item.bankAmountCAD,null);
 });
 await test('CAD bank linked to EUR investment keeps exactly debited CAD',async()=>{
  const s=ui();s.$('#invBank').value='ca';s.$('#invBank').onchange();
  s.$('#invBankCad').value='74';await s.$('#saveInvOp').onclick();
  assert.equal(s.writes[0].item.bankAmount,74);
  assert.equal(s.writes[0].item.bankAmountCAD,74);
  assert.equal(s.writes[0].item.bankCurrency,'CAD');
 });
 await test('historical CAD operation retains 300 CAD bank amount',async()=>{
  const old={id:'one',accountId:'pea',type:'deposit',date:'2026-10-12',amount:200,
   bankAccountId:'ca',bankAmountCAD:300};
  const s=ui(PEA,old);assert.equal(s.$('#invBankCad').value,'300');
  await s.$('#saveInvOp').onclick();assert.equal(s.writes[0].item.id,'one');
  assert.equal(s.writes[0].item.bankAmountCAD,300);
 });
 await test('historical EUR operation with only CAD valuation remains blank',async()=>{
  const old={id:'two',accountId:'pea',type:'deposit',date:'2026-10-12',amount:46.2,
   bankAccountId:'eu',bankAmountCAD:73.92};
  const s=ui(PEA,old);assert.equal(s.$('#invBankCad').value,'');
  await s.$('#saveInvOp').onclick();assert.equal(s.writes.length,0);
 });
 await test('linked booked transaction stays one bank source',async()=>{
  const t={id:'transfer',type:'external_transfer',status:'confirmed',
   accountId:'eu',bankAmount:46.2,bankCurrency:'EUR'};
  const old={id:'one',accountId:'pea',type:'deposit',date:'2026-10-12',
   amount:46.2,bankAccountId:'eu',bankCurrency:'EUR',bankAmount:46.2,linkedTransactionId:'transfer'};
  const s=ui(PEA,old,[t]);await s.$('#saveInvOp').onclick();
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].collection,'investment_operations');
  assert.equal(s.writes[0].item.linkedTransactionId,'transfer');
 });
 await test('linked bank source cannot change amount without correction',async()=>{
  const t={id:'transfer',type:'external_transfer',status:'confirmed',
   accountId:'eu',bankAmount:46.2,bankCurrency:'EUR'};
  const old={id:'one',accountId:'pea',type:'deposit',date:'2026-10-12',
   amount:46.2,bankAccountId:'eu',bankCurrency:'EUR',bankAmount:46.2,linkedTransactionId:'transfer'};
  const s=ui(PEA,old,[t]);s.$('#invBankCad').value='45';await s.$('#saveInvOp').onclick();
  assert.equal(s.writes.length,0);assert.match(s.$('#traceFeedback').textContent,/Montant différent/);
 });
 await test('linked booked source cannot switch bank silently',async()=>{
  const t={id:'transfer',type:'external_transfer',status:'confirmed',accountId:'eu',bankAmount:46.2,bankCurrency:'EUR'};
  const old={id:'one',accountId:'pea',type:'deposit',date:'2026-10-12',
   amount:46.2,bankAccountId:'eu',bankAmount:46.2,linkedTransactionId:'transfer'};
  const s=ui(PEA,old,[t]);s.$('#invBank').value='ca';s.$('#invBank').onchange();
  s.$('#invBankCad').value='74';await s.$('#saveInvOp').onclick();
  assert.equal(s.writes.length,0);assert.match(s.$('#traceFeedback').textContent,/opération confirmée/);
 });
 await test('CAD to EUR transfer fee is included, no second budget posting',()=>{
  const t={id:'wire',type:'transfer',status:'confirmed',accountId:'ca',toAccountId:'eu',
   date:'2026-10-12',name:'Virement France',amountCAD:150};
  const v=I.resolveTransferEdit({transaction:t,from:CA,to:EU,bankAmount:150,
   receivedAmount:95,feeAmount:5});
  assert.equal(v.bankAmount,150);assert.equal(v.toBankAmount,95);
  assert.equal(v.transferFeeAmount,5);assert.equal(v.transferFeeCurrency,'CAD');
  assert.equal(v.transferFeeIncludedInDebit,true);assert.equal(v.type,'transfer');
 });
 await test('fee cannot be negative, greater than debit or non-numeric',()=>{
  const t={id:'wire',type:'transfer',status:'confirmed',accountId:'ca',toAccountId:'eu',
   date:'2026-10-12',name:'Virement France'};
  for(const feeAmount of [-1,151,'abc'])assert.throws(
   ()=>I.resolveTransferEdit({transaction:t,from:CA,to:EU,
    bankAmount:150,receivedAmount:95,feeAmount}),/Frais de virement invalides/);
 });
 await test('fee metadata survives edit if not changed',()=>{
  const t={id:'wire',type:'transfer',status:'confirmed',accountId:'ca',toAccountId:'eu',
   date:'2026-10-12',name:'Virement France',transferFeeAmount:3};
  const v=I.resolveTransferEdit({transaction:t,from:CA,to:EU,bankAmount:150,receivedAmount:95});
  assert.equal(v.transferFeeAmount,3);
 });
 console.log(count+' bank-native and transfer-fee interaction tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});