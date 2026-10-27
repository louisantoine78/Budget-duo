'use strict';
// Client-side defense in depth must mirror migration 10's deferred quarantine.
// These tests execute the exact guard extracted from the candidate app.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=app.indexOf('function traceRefuseUnqualifiedDeferredWrite(collection,item){');
const end=app.indexOf('\n}\n',begin)+2;
assert.ok(begin>=0&&end>begin);
const source=app.slice(begin,end);
function guard(accounts){
 const state={accounts};
 const invoke=new Function('state','return ('+source+');');
 return invoke(state);
}
const credit={id:'ca-credit',owner:'la',type:'card',country:'CA',currency:'CAD',
 paymentMode:'credit',settlementAccountId:'ca-checking'};
const bank={id:'ca-checking',owner:'la',type:'checking',country:'CA',currency:'CAD'};
const card={id:'fr-card',owner:'la',type:'card',country:'FR',currency:'EUR',
 paymentMode:'deferred',settlementAccountId:'fr-checking'};
const checking={id:'fr-checking',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const denied=(fn)=>assert.throws(fn,/TRACE_DEFERRED_NOT_RELEASED/);
test('normal Canadian card and genuine ordinary transfer are unaffected',()=>{
 const run=guard([bank,credit]);
 assert.doesNotThrow(()=>run('accounts',credit));
 assert.doesNotThrow(()=>run('transactions',{id:'repay',type:'transfer',
  accountId:'ca-checking',toAccountId:'ca-credit',bankAmount:50,toBankAmount:50,
  transferPurpose:'card_repayment'}));
});
test('real deferred card is quarantined even without calendar fields',()=>{
 const run=guard([checking,card]);denied(()=>run('accounts',card));
 denied(()=>run('transactions',{id:'p',type:'expense',accountId:card.id}));
});
test('credit-mode forgery with any of the three reserved calendar keys fails',()=>{
 const run=guard([bank,credit]);
 for(const [key,value] of Object.entries({deferredDebitDay:5,deferredClosingDay:20,
  deferredScheduleVersions:[{effectiveDate:'2026-11-01',debitDay:5,closingDay:20}]}))
  denied(()=>run('accounts',{...credit,id:'forged-'+key,[key]:value}));
});
test('absence of paymentMode does not permit unversioned or future schedules',()=>{
 const run=guard([bank]);
 for(const key of ['deferredDebitDay','deferredClosingDay','deferredScheduleVersions'])
  denied(()=>run('accounts',{id:'unknown',type:'card',[key]:null}));
});
test('already stored disguised calendar prevents a later clean-looking edit',()=>{
 const stored={...credit,deferredScheduleVersions:[{effectiveDate:'2026-11-01',
  debitDay:5,closingDay:20}]};
 const run=guard([bank,stored]);
 denied(()=>run('accounts',{...credit,name:'Renamed Mastercard'}));
 denied(()=>run('transactions',{id:'movement',type:'transfer',
  accountId:'ca-checking',toAccountId:credit.id}));
});
test('native scheduled and allocated due-date aliases reject any transaction',()=>{
 const run=guard([bank,credit]);
 for(const key of ['scheduledDueDate','allocationDueDate']){
  denied(()=>run('transactions',{id:'transfer',type:'transfer',
   accountId:bank.id,toAccountId:credit.id,[key]:'2026-11-05'}));
  denied(()=>run('transactions',{id:'empty',type:'expense',[key]:null}));
 }
});
test('existing source statement and deferred payment flags remain guarded',()=>{
 const run=guard([bank,credit]);
 for(const data of [
  {deferredBankEvidenceReviewed:false},{deferredPurchaseIds:[]},
  {deferredKind:'purchase'},{settlementMode:'full'}, {purchaseIds:[]}])
  denied(()=>run('transactions',{id:'attempt',...data}));
});
test('unrelated collections cannot silently unlock any account change',()=>{
 const run=guard([bank,credit]);
 assert.doesNotThrow(()=>run('household',{id:'settings'}));
 assert.doesNotThrow(()=>run('investments',{id:'nonbank'}));
});
