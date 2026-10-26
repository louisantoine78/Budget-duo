'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../trace-deferred-debit-1.0.0.js');
const D=globalThis.TraceDeferredDebit;
const card={id:'visa-fr',owner:'la',type:'card',paymentMode:'deferred',country:'FR',currency:'EUR',settlementAccountId:'fr'};
const old={effectiveDate:'2026-09-01',debitDay:5,closingDay:20};
const bank={id:'fr',owner:'la',type:'checking',country:'FR',currency:'EUR'};
const configured=(v,extras={})=>({...card,deferredScheduleVersions:v,...extras});
const prior=configured([old],{deferredDebitDay:5,deferredClosingDay:20});
const plan=(c=card,extra={})=>D.proposeScheduleRevision({card:c,checking:bank,owner:'la',asOfDate:'2026-10-26',
 effectiveDate:'2026-11-21',debitDay:28,closingDay:20,...extra});
const due=(c,d)=>D.scheduleForPurchase({card:c,purchaseDate:d});
test('first effective date is future-only; historical purchase has no computed batch',()=>{
 const p=plan(card,{effectiveDate:'2026-11-01'}),c=configured(p.versions);
 assert.equal(p.persistable,false);assert.equal(p.writes,0);
 assert.equal(due(c,'2026-10-31').dueDate,null);
 assert.equal(due(c,'2026-11-02').dueDate,'2026-11-28');
});
test('version selection honors purchase day and does not move old dues',()=>{
 const p=plan(prior),c=configured(p.versions);
 assert.equal(due(c,'2026-10-12').dueDate,'2026-11-05');
 assert.equal(due(c,'2026-11-19').dueDate,'2026-12-05');
 assert.equal(due(c,'2026-11-22').dueDate,'2026-12-28');
 assert.equal(p.versions[0].debitDay,5);
});
test('cycle open on Oct 26 closes Nov 20; revision must be later',()=>{
 assert.throws(()=>plan(prior,{effectiveDate:'2026-11-20'}),/après la clôture/);
 assert.throws(()=>plan(prior,{effectiveDate:'2026-11-05'}),/après la clôture/);
 assert.equal(plan(prior).currentCycleCloses,'2026-11-20');
});
test('as-of date on cutoff may start the following day',()=>{
 assert.throws(()=>plan(prior,{asOfDate:'2026-11-20',effectiveDate:'2026-11-20'}),/date future/);
 assert.equal(plan(prior,{asOfDate:'2026-11-20',effectiveDate:'2026-11-21'}).effectiveDate,'2026-11-21');
});
test('as-of date after closing rolls next protection to following cycle',()=>{
 assert.throws(()=>plan(prior,{asOfDate:'2026-11-21',effectiveDate:'2026-12-20'}),/après la clôture/);
 assert.equal(plan(prior,{asOfDate:'2026-11-21',effectiveDate:'2026-12-21'}).currentCycleCloses,'2026-12-20');
});
test('year and leap-month transitions are deterministic',()=>{
 const revised=plan(prior,{asOfDate:'2027-01-26',effectiveDate:'2027-02-21',debitDay:31});
 const c=configured(revised.versions);
 assert.equal(due(c,'2027-02-20').dueDate,'2027-03-05');
 assert.equal(due(c,'2027-02-22').dueDate,'2027-03-31');
 const first=plan(card,{asOfDate:'2027-01-31',effectiveDate:'2027-02-01',debitDay:31});
 assert.equal(due(configured(first.versions),'2027-02-02').dueDate,'2027-02-28');
});
test('missing cutoff never allocates a due batch automatically',()=>{
 const p=plan(card,{effectiveDate:'2026-11-01',closingDay:null});
 const r=due(configured(p.versions),'2026-11-12');
 assert.equal(r.dueDate,null);assert.equal(r.allocationVerified,false);
 assert.equal(r.nextDebitDate,'2026-11-28');
});
test('unversioned card days cannot be applied to past purchases',()=>{
 assert.throws(()=>plan({...card,deferredDebitDay:5}),/sans prise d’effet/);
 assert.equal(due({...card,deferredDebitDay:5},'2026-10-12').dueDate,null);
});
test('only one future calendar proposal is permitted',()=>{
 assert.throws(()=>plan(configured([{effectiveDate:'2026-11-01',debitDay:28,closingDay:20}]),
  {effectiveDate:'2026-12-21'}),/attend déjà/);
});
test('invalid dates, days or version ordering are fail-closed',()=>{
 for(const x of ['2026-10-26','2026-10-25','2027-02-29','2026-02-30',''])
  assert.throws(()=>plan(card,{effectiveDate:x}),/date future/);
 for(const x of [0,32,'01',true,1.5,'28x'])
  assert.throws(()=>plan(card,{debitDay:x}),/Jour/);
 for(const arr of [[old,old],[{...old,effectiveDate:'2026-02-30'}],
    [{...old,closingDay:32}],[{...old,unknown:true}],{}])
  assert.throws(()=>due(configured(arr),'2026-10-12'));
});
test('Canadian Mastercard and invalid account ownership never enter French scheduler',()=>{
 for(const c of [{...card,country:'CA',currency:'CAD'},{...card,paymentMode:'credit'},
  {...card,owner:''},{...card,archived:true},{...card,currency:'USD'}])
  assert.throws(()=>plan(c),/carte différée française/);
});
test('old source versions remain immutable; proposal carries zero financial writes',()=>{
 const freeze=Object.freeze({...prior,deferredScheduleVersions:Object.freeze([Object.freeze({...old})])});
 const before=JSON.stringify(freeze),p=plan(freeze);
 assert.equal(JSON.stringify(freeze),before);
 assert.equal(p.versions[0].effectiveDate,'2026-09-01');
 assert.equal(p.confirmed,false);assert.equal(p.financialChanges,0);
});

test('schedule change needs owner-matched native EUR checking evidence',()=>{
 for(const invalid of [{checking:{...bank,owner:'partner'}},
  {checking:{...bank,currency:'CAD'}},{checking:{...bank,country:'CA'}},
  {checking:{...bank,id:'someone-else'}},{checking:{...bank,archived:true}},
  {checking:null},{owner:'partner'}])
  assert.throws(()=>plan(card,invalid),/Compte courant français/);
});
