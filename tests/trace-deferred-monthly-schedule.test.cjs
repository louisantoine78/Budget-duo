'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../trace-deferred-debit-1.0.0.js');
const S=globalThis.TraceDeferredDebit.monthlyDebitSchedule;
const plan=(purchaseDate,debitDay=28,closingDay=20)=>S({purchaseDate,debitDay,closingDay});
test('pre-cutoff purchase is allocated to current-month debit when debit follows cutoff',()=>{
 const p=plan('2026-10-12');
 assert.equal(p.cutoffDate,'2026-10-20');
 assert.equal(p.dueDate,'2026-10-28');assert.equal(p.allocationVerified,true);
});
test('post-cutoff purchase is allocated to next month',()=>{
 const p=plan('2026-10-21');assert.equal(p.cutoffDate,'2026-11-20');
 assert.equal(p.dueDate,'2026-11-28');
});
test('purchase on cutoff date is included in that cycle',()=>{
 assert.equal(plan('2026-10-20').dueDate,'2026-10-28');
});
test('debit date earlier than closing date falls in following month',()=>{
 assert.equal(plan('2026-10-12',5,20).dueDate,'2026-11-05');
});
test('debit day same as closing day falls in following month',()=>{
 assert.equal(plan('2026-10-12',20,20).dueDate,'2026-11-20');
});
test('31st debit clamps February without rolling into March, leap-year aware',()=>{
 assert.equal(plan('2027-01-21',31,20).dueDate,'2027-02-28');
 assert.equal(plan('2028-01-21',31,20).dueDate,'2028-02-29');
});
test('31st closing clamps short months and last-day purchases count',()=>{
 const p=plan('2027-02-28',5,31);
 assert.equal(p.cutoffDate,'2027-02-28');assert.equal(p.dueDate,'2027-03-05');
});
test('post-closing February purchase moves to March cycle',()=>{
 const p=plan('2027-02-28',31,27);
 assert.equal(p.cutoffDate,'2027-03-27');assert.equal(p.dueDate,'2027-03-31');
});
test('year rollover is correct',()=>{
 assert.equal(plan('2026-12-24',5,20).dueDate,'2027-02-05');
 assert.equal(plan('2026-12-12',5,20).dueDate,'2027-01-05');
});
test('without cutoff next calendar debit is informational, not an allocated due batch',()=>{
 const p=S({purchaseDate:'2026-10-29',debitDay:28});
 assert.equal(p.nextDebitDate,'2026-11-28');
 assert.equal(p.cutoffDate,null);assert.equal(p.dueDate,null);
 assert.equal(p.allocationVerified,false);
});
test('same-day calendar debit without cutoff is not falsely allocated',()=>{
 const p=S({purchaseDate:'2026-10-28',debitDay:28});
 assert.equal(p.nextDebitDate,'2026-10-28');assert.equal(p.dueDate,null);
});
test('optional blank closing day remains unconfigured',()=>{
 const p=S({purchaseDate:'2026-10-12',debitDay:28,closingDay:''});
 assert.equal(p.allocationVerified,false);assert.equal(p.cutoffDate,null);
});
test('missing debit day is never defaulted silently',()=>{
 assert.throws(()=>plan('2026-10-12',null,20),/prélèvement requis/);
});
test('malformed debit or closing day rejects unsupported values',()=>{
 for(const bad of [0,32,-1,1.5,'1.5','30abc',true,{},'  01']){
  assert.throws(()=>plan('2026-10-12',bad,20),/Jour/);
  assert.throws(()=>plan('2026-10-12',28,bad),/Jour/);
 }
});
test('bad dates including non-leap February are rejected',()=>{
 for(const d of ['2027-02-29','2026-11-31','2026-02-30','2026-13-01',''])
  assert.throws(()=>plan(d),/Date d’achat/);
});
test('weekends and holidays are NOT automatically shifted',()=>{
 assert.equal(plan('2026-10-12',31,20).dueDate,'2026-10-31');
});
test('input objects are immutable and schedule has no side effects',()=>{
 const p=Object.freeze({purchaseDate:'2026-10-12',debitDay:28,closingDay:20});
 assert.equal(S(p).dueDate,'2026-10-28');
 assert.equal(p.debitDay,28);
});
