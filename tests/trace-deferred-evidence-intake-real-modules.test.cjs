'use strict';
// Cross-module fictional-data regression. Native Node execution REQUIRED in
// a checkout before qualifying this change; no network or real Supabase.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const names=[
 'trace-international-1.0.0.js',
 'trace-deferred-debit-1.0.0.js',
 'trace-deferred-write-plan-1.0.0.js',
 'trace-deferred-purchase-evidence-1.0.0.js',
 'trace-deferred-bank-review-1.0.0.js',
 'trace-deferred-evidence-intake-1.0.0.js'
];
function fixture(){
 const root={};
 for(const n of names)vm.runInNewContext(fs.readFileSync(path.join(base,n),'utf8'),{window:root});
 const card={id:'card-eur-demo',owner:'la',type:'card',currency:'EUR',
  country:'FR',paymentMode:'deferred',settlementAccountId:'current-eur-demo'};
 const checking={id:'current-eur-demo',owner:'la',type:'checking',currency:'EUR',country:'FR'};
 const plan=root.TraceDeferredWritePlan.prepare({card,checking,owner:'la',
  fields:{id:'deferred_demo_purchase_1',name:'Courses de démonstration',
   amount:'40,00',purchaseDate:'2026-10-12',budgetDate:'2026-11-01',
   dueDate:'2026-12-05',categoryId:'food'},
  quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Taux fictif'},
  categories:[{id:'food',type:'expense',archived:false}],existingTransactions:[]});
 const cardDoc={statementId:'card-doc',importId:'card-import',sourceId:'physical-card',
  sourceVersion:'card-v1',sourceType:'pdf_extracted',complete:true,
  accountId:card.id,currency:'EUR',fromDate:'2026-10-01',toDate:'2026-10-31',
  rows:[{lineId:'purchase-line',type:'card_purchase',purchaseDate:'2026-10-12',
   direction:'debit',status:'confirmed',amount:'40.00'},
   {lineId:'refund-line',type:'card_refund',debitDate:'2026-10-19',
    direction:'credit',status:'confirmed',amount:'3.00'}]};
 const checkingDoc={statementId:'checking-doc',importId:'checking-import',
  sourceId:'physical-checking',sourceVersion:'checking-v1',sourceType:'csv',
  complete:true,accountId:checking.id,currency:'EUR',
  fromDate:'2026-12-01',toDate:'2026-12-31',
  rows:[{lineId:'debit-line',debitDate:'2026-12-05',
   direction:'debit',amount:'12.35',status:'confirmed'}]};
 const settlement={id:'settlement-partial-demo',settlementMode:'partial',
  cardAccountId:card.id,checkingAccountId:checking.id,currency:'EUR',
  debitDate:'2026-12-05',allocationDueDate:'2026-12-05',
  amount:'12.35',status:'confirmed',purchaseIds:[plan.document.id],feeIds:[],
  bankEvidence:{statementId:'checking-doc',lineId:'debit-line',
   accountId:checking.id,currency:'EUR',direction:'debit',amount:'12.35',
   debitDate:'2026-12-05',status:'confirmed',reviewed:true}};
 const cardSelection={statementId:'card-doc',lineId:'purchase-line'};
 const before=root.TraceDeferredPurchaseEvidence.review({
  plan,statements:[cardDoc],selection:cardSelection});
 const cardReceipts=[{planId:plan.document.id,reviewedBy:plan.document.payerId,
  statementId:'card-doc',lineId:'purchase-line',approved:true,snapshot:before.reviewToken}];
 const bankSnapshot=root.TraceDeferredBankReview.reviewSnapshot({
  statement:checkingDoc,settlement});
 const settlementReceipts=[{settlementId:settlement.id,approved:true,snapshot:bankSnapshot}];
 const args={plan,checkingAccountId:checking.id,
  cardStatements:[cardDoc],cardSelection,cardReceipts,
  checkingStatements:[checkingDoc],settlements:[settlement],settlementReceipts};
 return{root,plan,cardDoc,checkingDoc,settlement,args,before};
}
test('real deferred modules use exact native EUR and dated CAD once',()=>{
 const f=fixture();
 assert.equal(f.plan.document.bankAmount,40);
 assert.equal(f.plan.document.amountCAD,64);
 assert.equal(f.before.status,'needs_human_review');
 assert.equal(f.plan.impactIfLaterConfirmed.budgetMonth,'2026-11');
});
test('two exact separately attested fictional imports never authorize a write',()=>{
 const f=fixture(),r=f.root.TraceDeferredEvidenceIntake.review(f.args);
 assert.equal(r.localEvidenceReviewed,true);
 assert.equal(r.purchaseStatus,'manual_review_current');
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.eligibleForServerConfirmation,false);
 assert.equal(r.persistable,false);assert.equal(r.writes,0);
 assert.equal(r.createdTransactions,0);assert.equal(r.financialChanges,0);
});
test('card source revision invalidates only the card attestation',()=>{
 const f=fixture(),r=f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,cardStatements:[{...f.cardDoc,sourceVersion:'card-v2'}]});
 assert.equal(r.purchaseStatus,'stale_review');
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.localEvidenceReviewed,false);
});
test('checking source revision invalidates only the debit attestation',()=>{
 const f=fixture(),r=f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingStatements:[{...f.checkingDoc,sourceVersion:'check-v2'}]});
 assert.equal(r.purchaseStatus,'manual_review_current');
 assert.equal(r.settlementStatuses[0].status,'stale_review');
 assert.equal(r.localEvidenceReviewed,false);
});
test('card refund cannot be selected as proof of card purchase',()=>{
 const f=fixture(),r=f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,cardSelection:{statementId:'card-doc',lineId:'refund-line'}});
 assert.equal(r.purchaseStatus,'mismatched_bank_line');
 assert.equal(r.eligibleForServerConfirmation,false);
});
test('same physical source and incompatible checking account rejected',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingStatements:[{...f.checkingDoc,sourceId:'physical-card'}]}),
 /distinctes/);
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingAccountId:'other'}),/distinctes/);
});


test('actual linked modules refuse an import reused across card/checking source IDs',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingStatements:[{...f.checkingDoc,
   sourceId:'renamed-statement',importId:f.cardDoc.importId}]}),/distinctes/);
});
test('actual linked modules reject missing fee list before accepting an overpayment',()=>{
 const f=fixture(),s={...f.settlement,amount:'40.01'};
 delete s.feeIds;
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[s]}),/distinctes/);
});

test('duplicate card import with a new source ID is refused by the real modules',()=>{
 const f=fixture(),d={...f.cardDoc,statementId:'card-clone',sourceId:'renamed'};
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,cardStatements:[f.cardDoc,d]}),/distinctes/);
});
test('duplicate checking source with a new import ID is refused by real modules',()=>{
 const f=fixture(),d={...f.checkingDoc,statementId:'check-clone',
  importId:'renamed-check-import'};
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingStatements:[f.checkingDoc,d]}),/distinctes/);
});
test('plan locks the original checking account against reassignment',()=>{
 const f=fixture();assert.equal(f.plan.checkingAccountId,'current-eur-demo');
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingAccountId:'other',
  checkingStatements:[{...f.checkingDoc,accountId:'other'}],
  settlements:[{...f.settlement,checkingAccountId:'other'}]}),/distinctes/);
});
test('payment for unrelated purchase is never treated as this one',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[{...f.settlement,purchaseIds:['unrelated'] }]}),/distinctes/);
});
test('a multi-purchase allocation expires its earlier bank attestation',()=>{
 const f=fixture(),multi={...f.settlement,
  purchaseIds:[f.plan.document.id,'second']};
 const expired=f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[multi]});
 assert.equal(expired.settlementStatuses[0].status,'stale_review');
 assert.equal(expired.localEvidenceReviewed,false);
 const token=f.root.TraceDeferredBankReview.reviewSnapshot({
  statement:f.checkingDoc,settlement:multi});
 const reviewed=f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[multi],
  settlementReceipts:[{settlementId:multi.id,approved:true,snapshot:token}]});
 assert.equal(reviewed.localEvidenceReviewed,true);
 assert.equal(reviewed.eligibleForServerConfirmation,false);
});
test('checking statement in different currency is not a valid settlement source',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,checkingStatements:[{...f.checkingDoc,currency:'CAD'}]}),/distinctes/);
});

test('an exclusive payment exceeding the card purchase is refused',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[{...f.settlement,amount:'40.01'}]}),/distinctes/);
});
test('two exclusive installments exceeding purchase native cents are refused',()=>{
 const f=fixture();
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[
   {...f.settlement,id:'p1',amount:'25'},
   {...f.settlement,id:'p2',amount:'16'}]}),/distinctes/);
});

test('complete EUR settlement reviewed on checking statement keeps real bank delay explicit',()=>{
 const f=fixture();
 const s={...f.settlement,id:'full-payment',settlementMode:'full',
  scheduledDueDate:'2026-12-05',allocationDueDate:undefined,
  debitDate:'2026-12-08',amount:'40.00',
  bankEvidence:{...f.settlement.bankEvidence,debitDate:'2026-12-08',amount:'40.00'}};
 const d={...f.checkingDoc,rows:[{...f.checkingDoc.rows[0],
  debitDate:'2026-12-08',amount:'40.00'}]};
 const token=f.root.TraceDeferredBankReview.reviewSnapshot({
  statement:d,settlement:s});
 const r=f.root.TraceDeferredEvidenceIntake.review({...f.args,
  checkingStatements:[d],settlements:[s],
  settlementReceipts:[{settlementId:'full-payment',approved:true,snapshot:token}]});
 assert.equal(r.localEvidenceReviewed,true);
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.settlementStatuses[0].bankDateDeviationDays,3);
 assert.equal(r.settlementStatuses[0].scheduledDueDate,'2026-12-05');
 assert.equal(r.settlementStatuses[0].observedDebitDate,'2026-12-08');
 assert.equal(r.persistable,false);assert.equal(r.confirmed,false);
 assert.equal(r.checkingDebitBooked,0);
});
test('full payment for single purchase must equal exact native charge',()=>{
 const f=fixture();
 const s={...f.settlement,settlementMode:'full',
  scheduledDueDate:'2026-12-05',allocationDueDate:undefined};
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[s]}),/distinctes/);
});
test('complete payment cannot borrow a different batch due date',()=>{
 const f=fixture();
 const s={...f.settlement,settlementMode:'full',
  scheduledDueDate:'2027-01-05',allocationDueDate:undefined,amount:'40.00'};
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  ...f.args,settlements:[s]}),/distinctes/);
});
test('full payment spanning another purchase cannot become locally batch-complete',()=>{
 const f=fixture();
 const s={...f.settlement,id:'mixed-full',settlementMode:'full',
  scheduledDueDate:'2026-12-05',allocationDueDate:undefined,
  purchaseIds:[f.plan.document.id,'another-purchase'],amount:'40.00',
  bankEvidence:{...f.settlement.bankEvidence,amount:'40.00'}};
 const d={...f.checkingDoc,rows:[{...f.checkingDoc.rows[0],amount:'40.00'}]};
 const snap=f.root.TraceDeferredBankReview.reviewSnapshot({statement:d,settlement:s});
 const r=f.root.TraceDeferredEvidenceIntake.review({...f.args,
  checkingStatements:[d],settlements:[s],settlementReceipts:[
   {settlementId:'mixed-full',approved:true,snapshot:snap}]});
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.fullBatchEvidenceComplete,false);
 assert.equal(r.localEvidenceReviewed,false);
 assert.equal(r.persistable,false);
});
