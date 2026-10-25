'use strict';
// Deferred purchase line evidence must remain disjoint from bank settlement
// evidence and from any actual ledger write. Entirely fictional records.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const scripts=['trace-international-1.0.0.js','trace-deferred-debit-1.0.0.js',
 'trace-deferred-write-plan-1.0.0.js','trace-deferred-purchase-evidence-1.0.0.js'];
const card={id:'card',owner:'la',type:'card',currency:'EUR',country:'FR',
 paymentMode:'deferred',settlementAccountId:'checking'};
const checking={id:'checking',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const fields={id:'def_purchase_1',name:'Courses',amount:'40,00',
 purchaseDate:'2026-10-12',budgetDate:'2026-11-01',dueDate:'2026-12-05',categoryId:'food'};
const quote={currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional quote'};
const category={id:'food',type:'expense',archived:false};
const row=(over={})=>({lineId:'line-10',type:'card_purchase',
 purchaseDate:'2026-10-12',direction:'debit',status:'confirmed',
 amount:'40.00',name:'Courses',...over});
const statement=(over={})=>({statementId:'statement-card',importId:'import-card',
 sourceId:'physical-card-file',sourceVersion:'sha-fictive-a',accountId:'card',
 currency:'EUR',sourceType:'pdf_extracted',complete:true,
 fromDate:'2026-10-01',toDate:'2026-10-31',rows:[row()],...over});
function context({fieldOverrides={},docOverrides={},sourceOverrides={},others=[]}={}){
 const window={};
 for(const name of scripts)vm.runInNewContext(read(name),{window});
 const plan=window.TraceDeferredWritePlan.prepare({card,checking,owner:'la',
  fields:{...fields,...fieldOverrides},quote,categories:[category],
  existingTransactions:[]});
 const doc=statement(sourceOverrides);
 const review=(more={})=>window.TraceDeferredPurchaseEvidence.review({
  plan,statements:[doc],selection:{statementId:doc.statementId,lineId:'line-10'},
  receipts:[],otherClaims:others,...more});
 return{plan,doc,review,window};
}
test('exact card purchase line still NEEDS explicit human review',()=>{
 const c=context(),r=c.review();
 assert.equal(r.status,'needs_human_review');
 assert.equal(r.persistable,false);assert.equal(r.confirmed,false);
 assert.equal(r.bankAuthenticated,false);assert.equal(r.createdTransactions,0);
 assert.equal(r.checkingDebitBooked,0);assert.equal(r.budgetExpenseBooked,0);
});
test('a current voluntary receipt is never equivalent to bank or server approval',()=>{
 const c=context(),first=c.review(),r=c.review({receipts:[{planId:c.plan.document.id,
  reviewedBy:'la',statementId:c.doc.statementId,lineId:'line-10',
  approved:true,snapshot:first.reviewToken}]});
 assert.equal(r.status,'manual_review_current');
 assert.equal(r.serverApprovalRequired,true);
 assert.equal(r.persistable,false);assert.equal(r.confirmed,false);
 assert.equal(r.createdTransactions,0);
});
test('no selected card row blocks without automatic matching',()=>{
 const c=context();
 assert.equal(c.review({selection:null}).status,'select_card_statement_line');
});
test('missing statement or wrong line leaves purchase pending',()=>{
 const c=context();
 assert.equal(c.review({statements:[]}).status,'missing_statement');
 assert.equal(c.review({selection:{statementId:c.doc.statementId,lineId:'unknown'}}).status,'missing_line');
});
test('incomplete PDF or CSV statement cannot provide trusted evidence',()=>{
 for(const mod of [{complete:false},{rows:[row({status:'unknown'})]},
  {sourceType:'unknown'},{rows:[row({amount:'40.001'})]},
  {rows:[row({purchaseDate:'2026-02-30'})]}]){
  const c=context({sourceOverrides:mod});
  assert.equal(c.review().status,'source_incomplete');
 }
});
test('a statement with duplicate row IDs is rejected explicitly',()=>{
 const c=context({sourceOverrides:{rows:[row(),row()]}});
 assert.equal(c.review().status,'duplicate_line');
});
test('reimports of one physical card row are not reviewed twice',()=>{
 const c=context(),copy=statement({statementId:'renamed',importId:'other'});
 assert.equal(c.review({statements:[c.doc,copy]}).status,'duplicate_import');
});
test('two bank rows with same amount and date are ambiguous without more evidence',()=>{
 const c=context({sourceOverrides:{rows:[row(),row({lineId:'line-11',name:'Different shop'})]}});
 assert.equal(c.review().status,'ambiguous_card_lines');
});
test('card credit cannot be relabeled a new expense',()=>{
 const c=context({sourceOverrides:{rows:[row({direction:'credit'})]}});
 assert.equal(c.review().status,'mismatched_bank_line');
});
test('wrong currency, bank account, date and exact cents are all mismatches',()=>{
 for(const change of [
  {currency:'CAD'}, {accountId:'checking'},
  {rows:[row({purchaseDate:'2026-10-13'})]},
  {rows:[row({amount:'40.01'})]}]){
  const c=context({sourceOverrides:change});
  assert.equal(c.review().status,'mismatched_bank_line');
 }
});
test('pending imported card line cannot be used as confirmed proof',()=>{
 const c=context({sourceOverrides:{rows:[row({status:'pending'})]}});
 assert.equal(c.review().status,'pending_bank_line');
});
test('two plans cannot claim the same physical purchase line',()=>{
 const c=context({others:[{planId:'other',accountId:'card',
  sourceId:'physical-card-file',lineId:'line-10'}]});
 assert.equal(c.review().status,'conflicting_purchase_claim');
});
test('a receipt expires if amount or date changes on card statement',()=>{
 const c=context(),receipt={planId:c.plan.document.id,reviewedBy:'la',
  statementId:c.doc.statementId,lineId:'line-10',
  approved:true,snapshot:c.review().reviewToken};
 const changed=statement({rows:[row({amount:'40.01'})]});
 assert.equal(c.review({statements:[changed],receipts:[receipt]}).status,'mismatched_bank_line');
 const changedMeta=statement({sourceVersion:'sha-fictive-b'});
 assert.equal(c.review({statements:[changedMeta],receipts:[receipt]}).status,'stale_review');
});
test('a receipt expires if any other imported source line changes',()=>{
 const initial=statement({rows:[row(),row({lineId:'other',amount:'9'})]}),
  c=context({sourceOverrides:{rows:initial.rows}});
 // A noncolliding unrelated line still participates in the snapshot.
 const receipt={planId:c.plan.document.id,reviewedBy:'la',
  statementId:c.doc.statementId,lineId:'line-10',
  approved:true,snapshot:c.review().reviewToken};
 const changed=statement({rows:[row(),row({lineId:'other',amount:'11'})]});
 assert.equal(c.review({statements:[changed],receipts:[receipt]}).status,'stale_review');
});
test('a changed purchase plan can never inherit previous human consent',()=>{
 const c=context(),token=c.review().reviewToken;
 const newPlan=context({fieldOverrides:{name:'Autres courses'}}).plan;
 assert.equal(c.review({plan:newPlan,receipts:[{planId:newPlan.document.id,
  reviewedBy:'la',statementId:'statement-card',lineId:'line-10',
  approved:true,snapshot:token}]}).status,'stale_review');
});
test('wrong reviewer, duplicate receipts or refused consent are stale',()=>{
 const c=context(),token=c.review().reviewToken;
 const good={planId:c.plan.document.id,reviewedBy:'la',
  statementId:'statement-card',lineId:'line-10',approved:true,snapshot:token};
 for(const receipts of [[{...good,reviewedBy:'partner'}],
  [{...good,approved:false}],[good,good]]){
  assert.equal(c.review({receipts}).status,'stale_review');
 }
});
test('a checking-bank settlement line cannot masquerade as a card purchase',()=>{
 const c=context({sourceOverrides:{rows:[row({type:'transfer'})]}});
 assert.equal(c.review().status,'source_incomplete');
});
test('a non-pending plan or any persistable plan cannot enter review',()=>{
 const c=context();
 for(const override of [{persistable:true},{confirmed:true},
  {document:{...c.plan.document,status:'confirmed'}}]){
  assert.throws(()=>c.review({plan:{...c.plan,...override}}),/non admissible/);
 }
});
test('a malformed or huge receipt collection is rejected without effects',()=>{
 const c=context();
 assert.throws(()=>c.review({receipts:Array(1001).fill({})}),/invalides/);
 assert.throws(()=>c.review({statements:null}),/invalides/);
});
test('inputs and source lines remain unchanged and outputs cannot write',()=>{
 const c=context();const before=JSON.stringify({p:c.plan,s:c.doc});
 const r=c.review();
 assert.equal(JSON.stringify({p:c.plan,s:c.doc}),before);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(r.persistable,false);
});
