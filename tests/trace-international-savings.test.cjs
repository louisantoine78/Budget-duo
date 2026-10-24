'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../trace-international-1.0.0.js');const I=globalThis.TraceInternational;
const app=fs.readFileSync(path.join(__dirname,'../v5-app-5.37.0.js'),'utf8');
function pick(name,next,deps){const start=app.indexOf('function '+name+'('),end=app.indexOf('\nfunction '+next+'(',start);
 assert.ok(start>0&&end>start);return new Function(...Object.keys(deps),'return ('+app.slice(start,end)+');')(...Object.values(deps));}
const fr={id:'fr',owner:'la',type:'checking',currency:'EUR'},ca={id:'ca',owner:'la',type:'checking',currency:'CAD'},
 saving={id:'save',owner:'la',type:'Épargne',currency:'EUR',savingsTracking:'linked',openingDate:'2026-10-01',openingBalance:200},
 quote={currency:'EUR',cadPerUnit:1.6,date:'2026-10-20',source:'FICTITIOUS SAVINGS QUOTE'};
const deposit=(more={})=>({id:'deposit',accountId:'fr',investmentAccountId:'save',type:'external_transfer',
 transferPurpose:'savings',date:'2026-10-10',status:'confirmed',bankCurrency:'EUR',bankAmount:40,amountCAD:64,...more});
function harness(transactions=[],rates={EUR:quote},account=saving){
 const state={accounts:[fr,ca],transactions,investmentAccounts:[account],investmentOperations:[]};
 const deps={state,window:{TraceInternational:I},smartStrictDate:I.calendarDate};
 const ready=pick('isReadySavingsAccount','linkedSavingsMovements',deps);
 const linked=pick('linkedSavingsMovements','savingsLedger',{...deps,isReadySavingsAccount:ready});
 const ledger=pick('savingsLedger','portfolioLedger',{...deps,isReadySavingsAccount:ready,linkedSavingsMovements:linked,internationalQuotes:rates});
 return{state,ledger:()=>ledger(account),ready:()=>ready(account)};
}
test('a confirmed EUR transfer uses the actual EUR leg and frozen CAD history only for reference',()=>{
 const tx=deposit(),before=JSON.stringify(tx),h=harness([tx]),out=h.ledger();
 assert.equal(h.ready(),true);assert.equal(out.value,240);assert.equal(out.net,40);assert.equal(out.cad,384);
 assert.equal(JSON.stringify(tx),before);assert.equal(tx.amountCAD,64);
});
test('CAD to EUR savings transfer requires an explicit 95 EUR receipt, never 150 CAD budget value',()=>{
 const tx=deposit({accountId:'ca',bankCurrency:'CAD',bankAmount:150,amountCAD:150,
  investmentAmount:95,investmentCurrency:'EUR'});
 assert.equal(harness([tx]).ledger().value,295);
 delete tx.investmentAmount;delete tx.investmentCurrency;
 const missing=harness([tx]).ledger();assert.equal(missing.value,null);assert.equal(missing.cad,null);
 assert.equal(missing.reviewRequired,true);
});
test('a cross-currency withdrawal preserves the actual amount leaving savings',()=>{
 const tx=deposit({type:'external_refund',transferPurpose:'savings_withdrawal',accountId:'ca',
  bankCurrency:'CAD',bankAmount:100,amountCAD:100,investmentAmount:60,investmentCurrency:'EUR'});
 const out=harness([tx]).ledger();assert.equal(out.net,-60);assert.equal(out.value,140);
});
test('pending, opening-day and unrelated movements never change savings',()=>{
 const out=harness([deposit({status:'pending'}),deposit({id:'opening',date:'2026-10-01'}),
  deposit({id:'unrelated',investmentAccountId:'other'})]).ledger();
 assert.equal(out.value,200);assert.equal(out.movements.length,0);
});
test('native savings remains visible when FX evidence is missing or has no source',()=>{
 for(const rates of [{},{EUR:{...quote,source:''}},{EUR:{...quote,date:'2026-02-31'}}]){
  const out=harness([deposit()],rates).ledger();assert.equal(out.value,240);
  assert.equal(out.hasFx,false);assert.equal(out.cad,null);
 }
});
test('a manual dated sourced valuation is preserved instead of silently replaced by live rates',()=>{
 const account={...saving,fxAutoUpdate:false,fxCadPerUnit:1.8,fxRateDate:'2026-10-12',fxRateProvider:'Verified manual fixture'};
 const before=JSON.stringify(account),out=harness([],undefined,account).ledger();
 assert.equal(out.value,200);assert.equal(out.cad,360);assert.equal(out.fxSource,'Verified manual fixture');
 assert.equal(JSON.stringify(account),before);
});
test('CAD CELI historical transfers remain exactly compatible with 5.36.5',()=>{
 const account={...saving,type:'CELI',currency:'CAD',openingBalance:300};
 const tx=deposit({accountId:'ca',bankCurrency:null,bankAmount:undefined,amountCAD:93.12});
 const out=harness([tx],{},account).ledger();assert.equal(out.value,393.12);assert.equal(out.cad,393.12);
 assert.equal(out.fx,1);
});
test('invalid native cents, wrong investment currency and another owner require review',()=>{
 for(const patch of [{bankAmount:40.005},{investmentAmount:20,investmentCurrency:'USD'},
  {accountId:'missing-bank'},{bankAmount:true}]){
  const out=harness([deposit(patch)]).ledger();assert.equal(out.value,null);assert.equal(out.reviewRequired,true);
 }
 const h=harness([deposit()]);h.state.accounts[0]={...fr,owner:'partner'};
 assert.equal(h.ledger().reviewRequired,true);
});
test('all five supported currencies can track native savings without a fictitious exchange rate',()=>{
 for(const currency of I.currencies()){
  const account={...saving,currency},h=harness([],{},account),out=h.ledger();
  assert.equal(out.value,200);assert.equal(out.hasFx,currency==='CAD');
  assert.equal(out.cad,currency==='CAD'?200:null);
 }
});
