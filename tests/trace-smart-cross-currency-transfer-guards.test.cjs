'use strict';
// Actual extracted CAD-source screenshot smart approval, fictional recipients.
// No Supabase, network, real transactions or browser. Rerun under Node CLI.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const start=source.indexOf('async function smartApproveDraft(id,v){');
const end=source.indexOf('async function smartResetDay(',start);
assert.ok(start>=0&&end>start,'Smart bank-approval source unavailable');
const sourceFn=source.slice(start,end);
function create({toCurrency='EUR',receivedAmount='63.75',kind='transfer',linkCard=true,extraChecking=false}={}){
 const bank={id:'bank-ca',owner:'la',currency:'CAD',country:'CA',type:'checking'};
 const destination={id:'dest',owner:'la',currency:toCurrency,country:toCurrency==='CAD'?'CA':'FR',
  type:kind==='card_payment'?'card':'checking',
  ...(kind==='card_payment'&&linkCard?{settlementAccountId:'bank-ca'}:{})};
 const draft={id:'d1',kind:'smart_draft',status:'pending',date:'2026-10-15',name:'Virement',amount:100,
  accountId:'bank-ca',sourceFileName:'fictitious.png'};
 const state={smartImports:[draft],accounts:[bank,destination,
  ...(extraChecking?[{id:'other-ca',owner:'la',currency:'CAD',country:'CA',type:'checking'}]:[])],
  transactions:[],investmentAccounts:[],importDays:[{accountId:'bank-ca',date:'2026-10-15'}]};
 const writes=[],window={TraceImportGuide:{direction:()=> 'out',allowed:()=>true,
   cardStatementSettlementLabel:()=>false},TraceMovement:{get:t=>({id:t,type:'transfer',budget:'none',
     direction:-1,purpose:null})}};
 new Function('window',engine)(window);
 const vars={
  state,me:'la',partner:'partner',visibleBankAccounts:()=>[bank,destination],
  smartStrictDate:date=>date==='2026-10-15',
  smartExactBankAmount:n=>window.TraceInternational.exactMoney(n),
  window,accountType:a=>a.type,manualCategories:()=>[],
  isReadySavingsAccount:()=>false,normalizedMerchant:x=>String(x).toLowerCase(),
  smartDuplicateMatches:()=>[],findSimilarTransaction:()=>null,
  traceSplit:()=>({split:{la:0,partner:0},splitAmounts:{la:0,partner:0}}),
  traceImportSplit:()=>({}),validateFriendLink:()=>null,csvFingerprint:()=> 'fictional-fingerprint',
  isFinancialPeriod:()=>true,recordDayImport:async()=>{},renderAll:()=>{},
  saveDocument:async(collection,item)=>writes.push({collection,item:JSON.parse(JSON.stringify(item))})
 };
 const names=Object.keys(vars);
 const approve=new Function(...names,sourceFn+'return smartApproveDraft;')(...Object.values(vars));
 const input={verified:true,date:'2026-10-15',name:'Virement',amount:'100',
  type:kind,toAccountId:'dest',destinationBankAmount:receivedAmount,
  purchaseCurrency:'CAD',purchaseAmount:'100'};
 return{approve,draft,state,writes,input,bank,destination,window};
}
test('actual EUR received amount and currency remain frozen on CAD-source transfer',async()=>{
 const c=create();
 const result=await c.approve('d1',c.input);
 assert.equal(result.saved,true);
 assert.equal(c.writes.length,2);
 const tx=c.writes[0].item;
 assert.equal(c.writes[0].collection,'transactions');
 assert.equal(tx.status,'confirmed');
 assert.equal(tx.type,'transfer');
 assert.equal(tx.bankAmount,100);
 assert.equal(tx.bankCurrency,'CAD');
 assert.equal(tx.amountCAD,100);
 assert.equal(tx.toBankAmount,63.75);
 assert.equal(tx.toBankCurrency,'EUR');
 assert.equal(c.window.TraceInternational.amountOnAccount(tx,c.destination,'destination'),63.75);
 assert.equal(c.window.TraceInternational.amountOnAccount(tx,c.bank),100);
});
test('a sub-cent foreign destination cannot be booked or mark the draft done',async()=>{
 const c=create({receivedAmount:'63.751'});
 await assert.rejects(c.approve('d1',c.input),/centimes requis/);
 assert.equal(c.writes.length,0);
 assert.equal(c.state.transactions.length,0);
 assert.equal(c.draft.status,'pending');
});
test('missing foreign destination does not invent a one-for-one FX receipt',async()=>{
 const c=create({receivedAmount:''});
 await assert.rejects(c.approve('d1',c.input),/centimes requis/);
 assert.equal(c.writes.length,0);assert.equal(c.draft.status,'pending');
});
test('same-currency CAD transfer records both leg currencies without FX invention',async()=>{
 const c=create({toCurrency:'CAD'});
 await c.approve('d1',c.input);
 const tx=c.writes[0].item;
 assert.equal(tx.bankCurrency,'CAD');assert.equal(tx.toBankCurrency,'CAD');
 assert.equal(tx.bankAmount,100);assert.equal(tx.toBankAmount,100);
});

test('a card payment to a foreign-currency card cannot invent settlement legs',async()=>{
 const c=create({toCurrency:'EUR',kind:'card_payment'});
 await assert.rejects(c.approve('d1',c.input),/compte courant lié/);
 assert.equal(c.writes.length,0);assert.equal(c.draft.status,'pending');
});
test('card settlement to linked CAD card stays outside new income and expense',async()=>{
 const c=create({toCurrency:'CAD',kind:'card_payment'});
 await c.approve('d1',c.input);
 const tx=c.writes[0].item;
 assert.equal(tx.type,'transfer');
 assert.equal(tx.transferPurpose,undefined);
 assert.equal(tx.bankAmount,100);assert.equal(tx.toBankAmount,100);
 assert.equal(tx.toBankCurrency,'CAD');
});
test('unlinked card cannot guess settlement source when multiple checking accounts exist',async()=>{
 const c=create({toCurrency:'CAD',kind:'card_payment',linkCard:false,extraChecking:true});
 await assert.rejects(c.approve('d1',c.input),/compte courant lié/);
 assert.equal(c.writes.length,0);
});
test('unlinked legacy CAD card with a unique checking source stays compatible',async()=>{
 const c=create({toCurrency:'CAD',kind:'card_payment',linkCard:false});
 await c.approve('d1',c.input);
 assert.equal(c.writes[0].item.toBankCurrency,'CAD');
});
