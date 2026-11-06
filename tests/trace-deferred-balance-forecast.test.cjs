'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../trace-deferred-debit-1.0.0.js');
const F=globalThis.TraceDeferredDebit.projectCheckingBalance;
const card={id:'visa',type:'card',paymentMode:'deferred',settlementAccountId:'bank',owner:'alice',country:'FR',currency:'EUR'};
const checking={id:'bank',type:'checking',owner:'alice',country:'FR',currency:'EUR'};
const buy=(id,amount=40,dueDate='2026-11-05')=>({id,cardAccountId:'visa',currency:'EUR',purchaseDate:'2026-10-12',budgetDate:'2026-10-12',dueDate,amount,status:'confirmed'});
const pay=(status='confirmed')=>({id:'s',cardAccountId:'visa',checkingAccountId:'bank',currency:'EUR',type:'deferred_settlement',debitDate:'2026-11-05',amount:40,purchaseIds:['p1'],feeIds:[],status});
const run=(checkingBalance=1000,purchases=[buy('p1')],settlements=[],asOfDate='2026-10-20',extra={})=>F({card,checking,checkingBalance,purchases,settlements,asOfDate,...extra});
test('single-card cash forecast never creates ledger movements',()=>{
 const r=run();assert.equal(r.checkingBalance,1000);assert.equal(r.deferredUnpaid,40);
 assert.equal(r.projectedCheckingBalance,960);assert.equal(r.scheduledDebits[0].dueDate,'2026-11-05');
 assert.equal(r.scope,'single_deferred_card');assert.equal(r.balanceSource,'trace_estimate_unverified');
 assert.equal(r.writes,0);assert.equal(r.financialChanges,0);
});
test('future settlement cannot reduce present liability',()=>assert.equal(run(1000,[buy('p1')],[pay()]).deferredUnpaid,40));
test('confirmed bank debit already in checking estimate is not subtracted twice',()=>{
 const r=run(960,[buy('p1')],[pay()],'2026-11-05');
 assert.equal(r.deferredUnpaid,0);assert.equal(r.projectedCheckingBalance,960);
 assert.equal(r.scheduledDebits.length,0);
});
test('pending transfer does not reduce deferred liability',()=>{
 const r=run(1000,[buy('p1')],[pay('pending')],'2026-11-05');
 assert.equal(r.deferredUnpaid,40);assert.equal(r.projectedCheckingBalance,960);
});
test('different future due batches are summed without bank debits',()=>{
 const r=run(1000,[buy('p1'),buy('p2',10,'2026-12-05')]);
 assert.equal(r.deferredUnpaid,50);assert.equal(r.projectedCheckingBalance,950);
 assert.equal(r.scheduledDebits.length,2);
});
test('merchant refund offsets future debit but not current checking estimate',()=>{
 const r=run(1000,[buy('p1')],[],'2026-10-20',{refunds:[{
 id:'r1',purchaseId:'p1',cardAccountId:'visa',currency:'EUR',
 type:'merchant_refund',refundDate:'2026-10-16',budgetDate:'2026-10-16',amount:15,status:'confirmed'}]});
 assert.equal(r.deferredUnpaid,25);assert.equal(r.projectedCheckingBalance,975);
});
test('partial paid settlement never double-debits the checking balance',()=>{
 const e={statementId:'statement',lineId:'line',accountId:'bank',currency:'EUR',
 direction:'debit',amount:10,debitDate:'2026-11-05',status:'confirmed',reviewed:true};
 const s={...pay(),amount:10,settlementMode:'partial',
 allocationDueDate:'2026-11-05',bankEvidence:e};
 const r=run(990,[buy('p1')],[s],'2026-11-05');
 assert.equal(r.deferredUnpaid,30);assert.equal(r.projectedCheckingBalance,960);
});
test('overdraft remains negative',()=>assert.equal(run(-20).projectedCheckingBalance,-60));
test('missing, imprecise or non-native balance fails closed',()=>{
 for(const v of [null,'1000',NaN,Infinity,0.001,10000001])
  assert.throws(()=>run(v),/Solde courant/);
 assert.throws(()=>F({card,checking,purchases:[buy('p1')],asOfDate:'2026-10-20'}),/Solde courant/);
});
test('cross-owner and cross-currency snapshots are rejected',()=>{
 assert.throws(()=>run(1000,[buy('p1')],[],'2026-10-20',{checking:{...checking,currency:'CAD'}}),/incompatibles/);
 assert.throws(()=>run(1000,[buy('p1')],[],'2026-10-20',{card:{...card,owner:'bob'}}),/incompatibles/);
});
test('frozen source transactions remain untouched',()=>{
 const input=Object.freeze({card:Object.freeze({...card}),checking:Object.freeze({...checking}),
 checkingBalance:1000,purchases:Object.freeze([Object.freeze(buy('p1'))]),
 settlements:Object.freeze([]),asOfDate:'2026-10-20'});
 const before=JSON.stringify(input);assert.equal(F(input).projectedCheckingBalance,960);
 assert.equal(JSON.stringify(input),before);
});
