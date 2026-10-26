'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../trace-international-1.0.0.js');
const I=globalThis.TraceInternational;
const ca={id:'ca',owner:'la',type:'checking',currency:'CAD',country:'CA'},
 fr={id:'fr',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const day='2026-10-12',quote={currency:'EUR',cadPerUnit:1.6,date:day,source:'Fictional verified quote'};
const app=fs.readFileSync(path.join(__dirname,'../v5-app-5.37.0.js'),'utf8');
function extract(name,next,deps){
 const start=app.indexOf('function '+name+'('),end=app.indexOf('\nfunction '+next+'(',start);
 assert.ok(start>0&&end>start);
 return new Function(...Object.keys(deps),'return ('+app.slice(start,end)+');')(...Object.values(deps));
}

test('missing, whitespace, boolean and nonfinite native amounts never become a numeric bank balance',()=>{
 for(const bad of [null,undefined,'',' ',true,false,NaN,Infinity,{},[]]){
  assert.equal(I.amountOnAccount({bankAmount:bad},fr),null,String(bad));
  assert.equal(I.fxValue(bad,'CAD'),null,String(bad));
  const snap=I.snapshot({accounts:[ca],owner:'la',mainId:'ca',estimates:{ca:bad}});
  assert.equal(snap.net,null);assert.equal(snap.globalCAD,null);assert.equal(snap.complete,false);
 }
 assert.equal(I.amountOnAccount({bankAmount:0},fr),0);
 assert.equal(I.snapshot({accounts:[ca],estimates:{ca:0}}).net,0);
});
test('source and destination amounts must agree with the explicitly declared account currency',()=>{
 assert.equal(I.amountOnAccount({bankAmount:50,bankCurrency:'USD'},fr),null);
 assert.equal(I.amountOnAccount({bankAmount:50,bankCurrency:'EUR'},fr),50);
 assert.equal(I.amountOnAccount({toBankAmount:50,toBankCurrency:'USD'},fr,'destination'),null);
 assert.equal(I.amountOnAccount({toBankAmount:50,toBankCurrency:'EUR'},fr,'destination'),50);
 assert.equal(I.amountOnAccount({bankCurrency:'CAD',toBankAmount:95},fr,'destination'),95);
 assert.equal(I.amountOnAccount({bankAmount:'bad',amountCAD:80},ca),null);
 assert.equal(I.amountOnAccount({toBankAmount:'bad',amountCAD:80},ca,'destination'),null);
});
test('indicative conversions require a calendar-valid dated source, not just a positive number',()=>{
 assert.equal(I.fxValue(40,'EUR',quote),64);
 for(const patch of [{source:''},{source:' '},{date:''},{date:'2026-02-31'},
  {date:'2026-10-12',cadPerUnit:true},{currency:'USD'}])
  assert.equal(I.fxValue(40,'EUR',{...quote,...patch}),null,JSON.stringify(patch));
});
test('bookings reject fractional cents in bank and purchase amounts without silently rounding',()=>{
 for(const bad of [40.001,40.005,40.009]){
  assert.throws(()=>I.resolveBooking({account:fr,bankAmount:bad,date:day,quote}),/centime|Montant bancaire/);
  assert.throws(()=>I.resolveBooking({account:fr,bankAmount:40,originalAmount:bad,date:day,quote}),/centime|Montant d’achat/);
 }
 assert.equal(I.resolveBooking({account:fr,bankAmount:46.2,originalAmount:50,
  originalCurrency:'USD',date:day,quote}).amountCAD,73.92);
});
test('booking date and FX evidence cannot be impossible, absent or later than the purchase',()=>{
 assert.throws(()=>I.resolveBooking({account:fr,bankAmount:40,date:'2026-02-31',quote}),/Date/);
 assert.throws(()=>I.resolveBooking({account:fr,bankAmount:40,date:day,quote:{...quote,date:'2026-10-13'}}),/Date du taux/);
 assert.throws(()=>I.resolveBooking({account:fr,bankAmount:40,date:day,quote:{...quote,source:''}}),/source|Taux/);
});
test('transfer receipt and included fee retain real cent values without fractional rounding',()=>{
 const transaction={id:'fx',accountId:'ca',toAccountId:'fr',type:'transfer',
  status:'confirmed',date:day,name:'Fictional transfer',amountCAD:150,bankAmount:150,toBankAmount:95};
 const before=JSON.stringify(transaction);
 assert.throws(()=>I.resolveTransferEdit({transaction,from:ca,to:fr,bankAmount:150,receivedAmount:95.005}),/centime|Montant reçu/);
 assert.throws(()=>I.resolveTransferEdit({transaction,from:ca,to:fr,bankAmount:150,receivedAmount:95,feeAmount:2.005}),/centime|Frais/);
 assert.equal(JSON.stringify(transaction),before);
});
test('an impossible requested quote date is rejected before any HTTP transport call',async()=>{
 let calls=0;const transport=()=>{calls++;throw Error('Transport must not run')};
 await assert.rejects(I.fetchDailyRate('EUR','2026-02-31',transport),/Date/);
 assert.equal(calls,0);
});
test('an obsolete or malformed API observation cannot masquerade as a recent usable rate',async()=>{
 for(const d of ['2020-01-01','2026-10-99']){
  await assert.rejects(I.fetchDailyRate('EUR',day,async()=>({ok:true,json:async()=>
   ({observations:[{d,FXEURCAD:{v:'1.6'}}]})})),/Aucun taux/);
 }
});
test('actual account ledger rejects malformed opening balances and wrong-currency reconciliations',()=>{
 const state={household:{accountOpeningBalances:{ca:500}},reconciliations:[],transactions:[],investmentOperations:[]};
 const estimate=extract('accountEstimate','bank',{state,window:{TraceInternational:I},
  accountType:a=>a.type,openingBoundary:()=>({date:'2026-10-01',mode:'start'}),
  afterBoundary:(date,boundary)=>date>boundary.date});
 for(const bad of ['',true,' ',NaN,500.001]){
  state.household.accountOpeningBalances.ca=bad;assert.equal(estimate(ca),null);
 }
 state.household.accountOpeningBalances.ca=500;
 state.reconciliations=[{accountId:'ca',date:'2026-10-20',actualBalance:999,currency:'EUR',status:'confirmed'}];
 assert.equal(estimate(ca),500);
 state.reconciliations=[{accountId:'ca',date:'2026-02-31',actualBalance:999,currency:'CAD',status:'confirmed'}];
 assert.equal(estimate(ca),500);
 state.investmentOperations=[{bankAccountId:'ca',date:day,type:'deposit',status:'pending',amount:100}];
 assert.equal(estimate(ca),500);
 state.investmentOperations[0].status='confirmed';assert.equal(estimate(ca),400);
});
test('Couple CAD totals never silently omit an unknown current account or credit card',()=>{
 const partner={...ca,id:'partner',owner:'partner'},card={...ca,id:'card',type:'card'};
 const state={accounts:[ca,partner,card]},estimates={ca:500,partner:null,card:-100};
 const bank=extract('bank','sharingMovement',{state,window:{TraceInternational:I},
  accountType:a=>a.type,accountEstimate:a=>estimates[a.id]});
 assert.equal(bank('couple').net,null);assert.equal(bank('couple').checking,null);
 estimates.partner=400;estimates.card=null;
 assert.equal(bank('couple').net,null);assert.equal(bank('couple').cardDebt,null);
 estimates.card=-100;assert.equal(bank('couple').net,800);
});
test('foreign investment bank legs reject fractional cents and retain real EUR debit',()=>{
 assert.equal(I.investmentBankAmount({bankAmount:40.005,bankCurrency:'EUR'},fr),null);
 assert.equal(I.investmentBankAmount({bankAmount:40,bankCurrency:'EUR'},fr),40);
});


test('unsafe cents may never be used as booked bank money or FX valuations',()=>{
 const tooLarge=1e14;
 assert.equal(I.exactMoney(tooLarge),null);
 assert.equal(I.amountOnAccount({bankAmount:tooLarge,bankCurrency:'EUR'},fr),null);
 assert.equal(I.amountOnAccount({bankAmount:tooLarge,bankCurrency:'CAD'},ca),null);
 assert.equal(I.fxValue(tooLarge,'CAD'),null);
 assert.equal(I.fxValue(40.005,'CAD'),null);
 assert.throws(()=>I.resolveBooking({account:ca,bankAmount:tooLarge,date:day}),/Montant bancaire/);
 assert.equal(I.exactMoney(46.2),46.2);
 assert.equal(I.fxValue(46.2,'EUR',quote),73.92);
});
test('snapshot refuses unsafe aggregate cash even when every account is individually valid',()=>{
 const one=6e13;
 assert.equal(I.exactMoney(one),one);
 const second={...ca,id:'ca2'};
 const snap=I.snapshot({accounts:[ca,second],owner:'la',mainId:'ca',
  estimates:{ca:one,ca2:one}});
 assert.equal(snap.net,null);
 assert.equal(snap.globalCAD,null);
 assert.equal(snap.complete,false);
 assert.equal(snap.checking,null);
});
test('large opposite bank balances cannot disguise unsafe checking totals as known net',()=>{
 const one=6e13;
 const two={...ca,id:'ca2'};
 const debt1={...ca,id:'debt1',type:'card',settlementAccountId:'ca'};
 const debt2={...ca,id:'debt2',type:'card',settlementAccountId:'ca'};
 const snap=I.snapshot({accounts:[ca,two,debt1,debt2],owner:'la',mainId:'ca',
  estimates:{ca:one,ca2:one,debt1:-one,debt2:-one}});
 assert.equal(snap.net,null);
 assert.equal(snap.checking,null);
 assert.equal(snap.card,null);
});
