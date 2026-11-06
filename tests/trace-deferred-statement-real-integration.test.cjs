'use strict';
/* Fictional PDF/CSV source staging -> locally reviewed bank sources -> deferred
 * evidence controls. Uses REAL candidate modules in node:vm. No persistence,
 * bank connection, or PDF/CSV parsing occurs in this test. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const names=['trace-statement-evidence-1.0.0.js',
 'trace-deferred-statement-bridge-1.0.0.js',
 'trace-international-1.0.0.js','trace-deferred-debit-1.0.0.js',
 'trace-deferred-write-plan-1.0.0.js',
 'trace-deferred-purchase-evidence-1.0.0.js',
 'trace-deferred-bank-review-1.0.0.js',
 'trace-deferred-evidence-intake-1.0.0.js'];
function setup(){
 const root={};for(const n of names)vm.runInNewContext(
  fs.readFileSync(path.join(__dirname,'..',n),'utf8'),{window:root});
 const card={id:'card',owner:'la',type:'card',currency:'EUR',country:'FR',
  paymentMode:'deferred',settlementAccountId:'current'};
 const checking={id:'current',owner:'la',type:'checking',currency:'EUR',country:'FR'};
 const plan=root.TraceDeferredWritePlan.prepare({card,checking,owner:'la',
  fields:{id:'deferred_fictional_1',name:'Courses fictives',amount:'40,00',
   purchaseDate:'2026-10-12',budgetDate:'2026-11-01',dueDate:'2026-12-05',categoryId:'food'},
  quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional rate'},
  categories:[{id:'food',type:'expense',archived:false}],existingTransactions:[]});
 function source(docId,accountId,date,amount,sourceType){
  const staged=root.TraceStatementEvidence.stage({documentId:docId,accountId,
   currency:'EUR',fromDate:date.slice(0,7)+'-01',
   toDate:date.slice(0,7)+'-31',
   rows:[{page:1,line:4,rawText:'Fictive '+docId+' '+amount,
    date,name:'Exemple fictif',debit:amount}]});
  const approval=staged.ready.map(r=>({id:r.id,
   evidenceKey:r.evidenceKey,confirmed:true}));
  const classifications=staged.ready.map(r=>({
   id:r.id,evidenceKey:r.evidenceKey,statementKey:staged.statementKey,
   kind:accountId==='card'?'card_purchase':'checking_debit',
   confirmed:true,posted:true}));
  const options={staged,approvals:approval,accountKind:accountId==='card'?'card':'checking',
   sourceType,sourceId:'physical-'+docId,importId:'import-'+docId,
   classifications,completeness:{confirmed:true,statementKey:staged.statementKey,
    expectedRows:staged.totalRows,reviewedBy:'la'}};
  return{options,converted:root.TraceDeferredStatementBridge.convert(options)};
 }
 const cardSource=source('oct-card','card','2026-10-12','40,00','pdf_extracted');
 const currentSource=source('dec-current','current','2026-12-05','12,35','csv');
 const settlement={id:'pay1',settlementMode:'partial',cardAccountId:'card',
  checkingAccountId:'current',currency:'EUR',
  debitDate:'2026-12-05',allocationDueDate:'2026-12-05',amount:'12.35',
  status:'confirmed',purchaseIds:[plan.document.id],feeIds:[],
  bankEvidence:{statementId:'dec-current',lineId:'dec-current#1:4',
   accountId:'current',currency:'EUR',direction:'debit',amount:'12.35',
   debitDate:'2026-12-05',status:'confirmed',reviewed:true}};
 return{root,plan,cardSource,currentSource,settlement};
}
function combined(f,extras={}){
 const card=f.cardSource.converted.statement,current=f.currentSource.converted.statement;
 const first=f.root.TraceDeferredPurchaseEvidence.review({plan:f.plan,
  statements:[card],selection:{statementId:card.statementId,lineId:card.rows[0].lineId}});
 const token=f.root.TraceDeferredBankReview.reviewSnapshot({
  statement:current,settlement:f.settlement});
 return f.root.TraceDeferredEvidenceIntake.review({
  plan:f.plan,checkingAccountId:'current',cardStatements:[card],
  cardSelection:{statementId:card.statementId,lineId:card.rows[0].lineId},
  cardReceipts:[{planId:f.plan.document.id,reviewedBy:'la',
   statementId:card.statementId,lineId:card.rows[0].lineId,approved:true,
   snapshot:first.reviewToken}],checkingStatements:[current],
  settlements:[f.settlement],settlementReceipts:[{settlementId:'pay1',
   approved:true,snapshot:token}],...extras});
}
test('real staged local PDF and CSV rows pass through different evidence sources',()=>{
 const f=setup();
 assert.equal(f.cardSource.converted.status,'local_document_ready');
 assert.equal(f.currentSource.converted.status,'local_document_ready');
 assert.equal(f.cardSource.converted.statement.rows[0].purchaseDate,'2026-10-12');
 assert.equal(f.currentSource.converted.statement.rows[0].debitDate,'2026-12-05');
 assert.equal(f.plan.document.amountCAD,64);
 const r=combined(f);
 assert.equal(r.localEvidenceReviewed,true);
 assert.equal(r.purchaseStatus,'manual_review_current');
 assert.equal(r.settlementStatuses[0].status,'manual_review_current');
 assert.equal(r.persistable,false);assert.equal(r.createdTransactions,0);
 assert.equal(r.eligibleForServerConfirmation,false);
});
test('missing completeness attestation never emits a usable statement',()=>{
 const f=setup(),v=f.root.TraceDeferredStatementBridge.convert({
  ...f.cardSource.options,completeness:null});
 assert.equal(v.status,'blocked');assert.equal(v.statement,null);
});
test('all rows must be classified and approved even if one is correct',()=>{
 const f=setup(),v=f.root.TraceDeferredStatementBridge.convert({
  ...f.cardSource.options,classifications:[]});
 assert.equal(v.status,'blocked');
 const missing=f.root.TraceDeferredStatementBridge.convert({
  ...f.cardSource.options,approvals:[]});
 assert.equal(missing.status,'blocked');
});
test('changed raw source invalidates staging approval and cannot be silently adopted',()=>{
 const f=setup(),st=f.cardSource.options.staged;
 st.ready[0].rawText='Changed without restaging';
 const v=f.root.TraceDeferredStatementBridge.convert(f.cardSource.options);
 assert.equal(v.status,'blocked');
});
test('bank line cannot be selected to prove the original card purchase',()=>{
 const f=setup();const bank=f.currentSource.converted.statement;
 const card=f.cardSource.converted.statement;
 const first=f.root.TraceDeferredPurchaseEvidence.review({plan:f.plan,
  statements:[bank],selection:{statementId:bank.statementId,
   lineId:bank.rows[0].lineId}});
 assert.notEqual(first.status,'manual_review_current');
 assert.throws(()=>f.root.TraceDeferredEvidenceIntake.review({
  plan:f.plan,checkingAccountId:'current',
  cardStatements:[bank],cardSelection:{statementId:bank.statementId,
   lineId:bank.rows[0].lineId},checkingStatements:[card],settlements:[f.settlement]}),
 /distinctes/);
});
test('classified source metadata revision expires previous card review',()=>{
 const f=setup(),a=f.cardSource.converted.statement;
 const token=f.root.TraceDeferredPurchaseEvidence.review({plan:f.plan,
  statements:[a],selection:{statementId:a.statementId,lineId:a.rows[0].lineId}}).reviewToken;
 const changed={...a,sourceVersion:a.sourceVersion+'-later'};
 const r=f.root.TraceDeferredPurchaseEvidence.review({plan:f.plan,
  statements:[changed],selection:{statementId:changed.statementId,
   lineId:changed.rows[0].lineId},
  receipts:[{planId:f.plan.document.id,reviewedBy:'la',
   statementId:a.statementId,lineId:a.rows[0].lineId,
   approved:true,snapshot:token}]});
 assert.equal(r.status,'stale_review');
});
test('classified reimbursement cannot be reused as a purchase',()=>{
 const f=setup(),r=f.cardSource.options.staged.ready[0];
 const modified=f.root.TraceDeferredStatementBridge.convert({
  ...f.cardSource.options,classifications:[{
   id:r.id,evidenceKey:r.evidenceKey,statementKey:f.cardSource.options.staged.statementKey,
   kind:'card_refund',confirmed:true,posted:true}]});
 assert.equal(modified.status,'blocked');
});
