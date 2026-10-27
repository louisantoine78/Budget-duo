'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const context={location:{pathname:'/trace-international-preview.html'}};
vm.runInNewContext(fs.readFileSync(path.join(root,'trace-international-preview-fixtures-1.0.0.js'),'utf8'),{window:context});
vm.runInNewContext(fs.readFileSync(path.join(root,'trace-deferred-debit-1.0.0.js'),'utf8'),{window:context});
const get=()=>context.TraceInternationalPreviewFixtures.create();
const card=()=>get().accounts.find(a=>a.id==='demo-fr-deferred-card');
test('fictional French deferred card has real effective-dated sample, no bank writes',()=>{
 const c=card(),data=get();
 assert.equal(c.paymentMode,'deferred');assert.equal(c.country,'FR');
 assert.equal(c.currency,'EUR');assert.equal(c.deferredDebitDay,5);
 assert.equal(c.deferredClosingDay,20);
 assert.equal(c.deferredScheduleVersions[0].effectiveDate,'2026-09-01');
 assert.equal(data.transactions.some(t=>t.accountId===c.id),false);
 assert.equal(JSON.stringify(data).includes('SUPABASE_SERVICE_ROLE_KEY'),false);
});
test('example purchase before closing has the next-month theoretical debit',()=>{
 const r=context.TraceDeferredDebit.scheduleForPurchase({
  card:card(),purchaseDate:'2026-10-12'});
 assert.equal(r.cutoffDate,'2026-10-20');
 assert.equal(r.dueDate,'2026-11-05');assert.equal(r.allocationVerified,true);
});
test('fictional future update keeps historical October due dates intact',()=>{
 const c=card(),data=get(),checking=data.accounts.find(a=>a.id==='demo-fr-current');
 const before=JSON.stringify(data);
 const p=context.TraceDeferredDebit.proposeScheduleRevision({
  card:c,checking,owner:'la',asOfDate:'2026-10-26',
  effectiveDate:'2026-11-21',debitDay:28,closingDay:20});
 const after={...c,deferredScheduleVersions:p.versions,
  deferredDebitDay:28,deferredClosingDay:20};
 assert.equal(context.TraceDeferredDebit.scheduleForPurchase({
  card:after,purchaseDate:'2026-10-12'}).dueDate,'2026-11-05');
 assert.equal(context.TraceDeferredDebit.scheduleForPurchase({
  card:after,purchaseDate:'2026-11-22'}).dueDate,'2026-12-28');
 assert.equal(p.writes,0);assert.equal(p.persistable,false);
 assert.equal(JSON.stringify(data),before);
});
test('production location cannot mount fictional card or quote engine',()=>{
 const window={location:{pathname:'/index.html'}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'trace-international-preview-fixtures-1.0.0.js'),'utf8'),{window});
 assert.equal(window.TraceInternationalPreviewFixtures,undefined);
});

test('fictional deferred card opening zero is explicitly anchored rather than unknown',()=>{
 const data=get(),c=card(),hh=data.household;
 assert.equal(hh.accountOpeningBalances[c.id],0);
 assert.equal(typeof hh.accountOpeningBalanceDates[c.id],'string');
 assert.equal(hh.accountOpeningBalanceModes[c.id],'start');
 assert.equal(data.transactions.some(t=>t.accountId===c.id),false);
});
test('CAD to EUR sample provides independent booked EUR destination amount',()=>{
 const data=get(),transfer=data.transactions.find(t=>t.id==='demo-ca-eur-transfer');
 assert.equal(transfer.bankCurrency,'CAD');
 assert.equal(transfer.bankAmount,150);
 assert.equal(transfer.toBankCurrency,'EUR');
 assert.equal(transfer.toBankAmount,95);
 assert.equal(transfer.amountCAD,150);
});
