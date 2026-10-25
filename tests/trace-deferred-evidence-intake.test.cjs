'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scripts=path.join(__dirname,'..','trace-deferred-evidence-intake-1.0.0.js');
function harness({purchase='manual_review_current',settlement='manual_review_current',
            evidenceOverride=null,bankOverride=null}={}){
 const calls=[];
 const window={TraceDeferredPurchaseEvidence:{review(o){calls.push(['purchase',o]);
  return {status:purchase,persistable:false,confirmed:false,createdTransactions:0,reviewToken:'token-card'};}},
  TraceDeferredBankReview:{compare(o){calls.push(['bank',o]);
   return bankOverride||{cases:o.settlements.map(s=>({settlementId:s.id,status:settlement,reviewToken:'token-bank'})),
    writes:0,financialChanges:0,createdTransactions:0,invalidDocuments:[]};}}};
 if(evidenceOverride)window.TraceDeferredPurchaseEvidence.review=()=>evidenceOverride;
 vm.runInNewContext(fs.readFileSync(scripts,'utf8'),{window});
 const plan={kind:'deferred_write_plan',persistable:false,confirmed:false,
  checkingAccountId:'checking',
  document:{id:'candidate1',payerId:'la',accountId:'card',bankCurrency:'EUR'}};
 const cardStatements=[{statementId:'card-statement',accountId:'card',sourceId:'card-physical',
  sourceVersion:'v1',importId:'card-import'}];
 const checkingStatements=[{statementId:'check-statement',accountId:'checking',currency:'EUR',
  sourceId:'check-physical',sourceVersion:'v1',importId:'checking-import'}];
 const settlements=[{id:'pay1',cardAccountId:'card',checkingAccountId:'checking',
  currency:'EUR',purchaseIds:['candidate1']}];
 const input={plan,checkingAccountId:'checking',cardStatements,checkingStatements,settlements};
 return{review:window.TraceDeferredEvidenceIntake.review,input,calls,window};
}
test('combines purchase and settlement evidence in separate controllers',()=>{
 const h=harness(),r=h.review(h.input);
 assert.equal(h.calls.length,2);
 assert.deepEqual(h.calls.map(c=>c[0]),['purchase','bank']);
 assert.equal(r.purchaseStatus,'manual_review_current');
 assert.equal(r.localEvidenceReviewed,true);
 assert.equal(r.eligibleForServerConfirmation,false);
 assert.equal(r.persistable,false);
 assert.equal(r.createdTransactions,0);
 assert.equal(r.bankAuthenticated,false);
});
test('unreviewed card purchase blocks combined local review',()=>{
 const h=harness({purchase:'needs_human_review'});
 assert.equal(h.review(h.input).localEvidenceReviewed,false);
});
test('unreviewed checking debit blocks combined local review',()=>{
 const h=harness({settlement:'pending_review'});
 assert.equal(h.review(h.input).localEvidenceReviewed,false);
});
test('before bank debit there is no invented settlement or checking expense',()=>{
 const h=harness(),r=h.review({...h.input,settlements:[],checkingStatements:[]});
 assert.equal(r.awaitingSettlement,true);
 assert.equal(r.localEvidenceReviewed,false);
 assert.equal(r.checkingDebitBooked,0);
 assert.equal(r.budgetExpenseBooked,0);
});
test('no same source can be reused as card and checking evidence',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,checkingStatements:[{
  ...h.input.checkingStatements[0],sourceId:'card-physical'}]}),/distinctes/);
});
test('checking imports cannot be secretly passed in card sources',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,cardStatements:[h.input.checkingStatements[0]]}),/distinctes/);
});
test('settlement linked to another person/card or different currency rejected',()=>{
 const h=harness();
 for(const override of [{cardAccountId:'someone-else'},{checkingAccountId:'other'},{currency:'CAD'}]){
  assert.throws(()=>h.review({...h.input,settlements:[{...h.input.settlements[0],...override}]}),/distinctes/);
 }
});
test('malformed collections are refused before calling either controller',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,cardStatements:null}),/distinctes/);
 assert.throws(()=>h.review({...h.input,settlements:Array(5001).fill({})}),/distinctes/);
 assert.equal(h.calls.length,0);
});
test('any accidental write from a child module fails closed',()=>{
 const h=harness({bankOverride:{cases:[],writes:1,financialChanges:0,createdTransactions:0}});
 assert.throws(()=>h.review(h.input),/distinctes/);
 const h2=harness({evidenceOverride:{status:'manual_review_current',persistable:true,
  confirmed:false,createdTransactions:0}});
 assert.throws(()=>h2.review(h2.input),/distinctes/);
});
test('the bridge neither mutates statements nor keeps privileged state',()=>{
 const h=harness(),before=JSON.stringify(h.input),r=h.review(h.input);
 assert.equal(JSON.stringify(h.input),before);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.isFrozen(r.settlementStatuses),true);
 assert.equal(r.serverUniquenessChecked,false);
 assert.equal(r.confirmed,false);
 assert.equal(r.writes,0);
});
test('purchase and checking reviews remain independent at different snapshots',()=>{
 const h=harness(),r=h.review({...h.input,cardReceipts:[{snapshot:'card-v2'}],
  settlementReceipts:[{snapshot:'checking-v1'}]});
 assert.equal(h.calls[0][1].receipts[0].snapshot,'card-v2');
 assert.equal(h.calls[1][1].reviews[0].snapshot,'checking-v1');
 assert.equal(r.purchaseReviewToken,'token-card');
 assert.equal(r.settlementStatuses[0].reviewToken,'token-bank');
});

test('a broken unrelated checking statement prevents a successful combined review',()=>{
 const h=harness({bankOverride:{cases:[{settlementId:'pay1',status:'manual_review_current'}],
  invalidDocuments:[{statementId:'bad-extra'}],writes:0,financialChanges:0,createdTransactions:0}});
 const r=h.review(h.input);
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.checkingSourcesComplete,false);
 assert.equal(r.localEvidenceReviewed,false);
});

test('a different checking account cannot inherit valid card evidence',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,checkingAccountId:'other',
  checkingStatements:[{...h.input.checkingStatements[0],accountId:'other'}],
  settlements:[{...h.input.settlements[0],checkingAccountId:'other'}]}),/distinctes/);
});
test('a settlement for another purchase cannot attest this plan',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,settlements:[{
  ...h.input.settlements[0],purchaseIds:['unrelated']}]}),/distinctes/);
});
test('duplicate purchase allocations do not create false local certainty',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,settlements:[{
  ...h.input.settlements[0],purchaseIds:['candidate1','candidate1']}]}),/distinctes/);
});
test('an explicitly allocated multiple-purchase payment remains reviewable',()=>{
 const h=harness();
 const r=h.review({...h.input,settlements:[{
  ...h.input.settlements[0],purchaseIds:['another','candidate1']} ]});
 assert.equal(r.localEvidenceReviewed,true);
 assert.equal(r.persistable,false);
});
test('wrong checking statement currency is rejected before comparison',()=>{
 const h=harness();
 assert.throws(()=>h.review({...h.input,checkingStatements:[{
  ...h.input.checkingStatements[0],currency:'CAD'}]}),/distinctes/);
});
test('missing or empty purchase allocation is never silently accepted',()=>{
 const h=harness();
 for(const purchaseIds of [undefined,[],['unrelated']])
  assert.throws(()=>h.review({...h.input,settlements:[{
   ...h.input.settlements[0],purchaseIds}]}),/distinctes/);
});
