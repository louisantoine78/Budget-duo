'use strict';
// Fictional extracted rows only; independently runnable with Node CLI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',
 'trace-deferred-bank-review-1.0.0.js'),'utf8'),{window:root});
const {compare,reviewSnapshot}=root.TraceDeferredBankReview;
const row=(o={})=>({lineId:'l1',debitDate:'2026-11-05',
 direction:'debit',amount:'12.35',status:'confirmed',
 sourcePage:2,originalText:'debit 12.35 EUR',...o});
const doc=(o={})=>({statementId:'doc-11',importId:'import-1',
 sourceId:'physical-doc',sourceVersion:'fictional-digest',
 accountId:'current',currency:'EUR',sourceType:'pdf_extracted',
 complete:true,fromDate:'2026-11-01',toDate:'2026-11-30',
 rows:[row()],...o});
const settlement=(o={})=>({id:'pay1',settlementMode:'partial',
 cardAccountId:'card',checkingAccountId:'current',currency:'EUR',
 debitDate:'2026-11-05',allocationDueDate:'2026-11-05',
 amount:'12.35',status:'confirmed',purchaseIds:['a'],feeIds:[],
 bankEvidence:{statementId:'doc-11',lineId:'l1',accountId:'current',
  currency:'EUR',direction:'debit',amount:'12.35',
  debitDate:'2026-11-05',status:'confirmed',reviewed:true},...o});
const run=(ds=[doc()],ps=[settlement()],reviews=[])=>
 compare({statements:ds,settlements:ps,reviews});
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label);}
test('exact statement line never confirms or creates a bank entry',()=>{
 const r=run();assert.equal(r.cases[0].status,'needs_human_review');
 assert.equal(r.cases[0].confirmedAutomatically,false);
 assert.equal(r.writes,0);assert.equal(r.financialChanges,0);
 assert.equal(r.createdTransactions,0);assert.equal(r.bankAuthenticated,false);
});
test('explicit manual snapshot can be consistent but not bank certified',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 const r=run([d],[s],[{settlementId:'pay1',approved:true,snapshot:snap}]);
 assert.equal(r.cases[0].status,'manual_review_current');
 assert.equal(r.bankAuthenticated,false);
});
test('changed source amount cannot match after earlier review',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 assert.equal(run([doc({rows:[row({amount:'12.36'})]})],[s],
 [{settlementId:'pay1',approved:true,snapshot:snap}]).cases[0].status,'mismatched_line');
});
test('changing another line makes entire review stale',()=>{
 const d=doc({rows:[row(),row({lineId:'other',amount:'5'})]}),
 s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 const changed=doc({rows:[row(),row({lineId:'other',amount:'6'})]});
 assert.equal(run([changed],[s],[{settlementId:'pay1',approved:true,snapshot:snap}]).
 cases[0].status,'stale_review');
});
test('changing source page or original text invalidates review',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 for(const changed of [row({sourcePage:3}),row({originalText:'different'})])
  assert.equal(run([doc({rows:[changed]})],[s],
  [{settlementId:'pay1',approved:true,snapshot:snap}]).cases[0].status,'stale_review');
});
test('changing statement source version invalidates review',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 assert.equal(run([doc({sourceVersion:'new'})],[s],
 [{settlementId:'pay1',approved:true,snapshot:snap}]).cases[0].status,'stale_review');
});
test('changing due date of payment invalidates review',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 assert.equal(run([d],[settlement({allocationDueDate:'2026-12-05'})],
 [{settlementId:'pay1',approved:true,snapshot:snap}]).cases[0].status,'stale_review');
});
test('pending status remains pending regardless of imported matching amount',()=>{
 const d=doc({rows:[row({status:'pending'})]});
 const s=settlement({status:'pending',bankEvidence:{
  ...settlement().bankEvidence,status:'pending',reviewed:false}});
 const r=run([d],[s]);assert.equal(r.cases[0].status,'pending_review');
 assert.equal(r.writes,0);
});
test('pending bank row cannot match confirmed settlement',()=>{
 assert.equal(run([doc({rows:[row({status:'pending'})]})]).
 cases[0].status,'mismatched_line');
});
test('opposite direction or wrong cent amount is never a match',()=>{
 for(const r of [row({direction:'credit'}),row({amount:'12.36'})])
  assert.equal(run([doc({rows:[r]})]).cases[0].status,'mismatched_line');
});
test('wrong account or currency cannot be silently converted',()=>{
 assert.equal(run([doc({accountId:'other'})]).cases[0].status,'missing_line');
 assert.equal(run([doc({currency:'CAD'})]).cases[0].status,'mismatched_line');
});
test('repeat import of same physical row is marked ambiguous',()=>{
 assert.equal(run([doc(),doc({importId:'again'})]).
 cases[0].status,'duplicate_import');
});
test('renamed statement cannot evade duplicate physical source guard',()=>{
 assert.equal(run([doc(),doc({statementId:'renamed',
  importId:'again'})]).cases[0].status,'duplicate_import');
});
test('duplicate line ID within one import is flagged',()=>{
 assert.equal(run([doc({rows:[row(),row()]})]).
 cases[0].status,'duplicate_import');
});
test('two payments cannot claim one physical source line',()=>{
 const r=run([doc()],[settlement(),settlement({id:'pay2'})]);
 assert.equal(r.cases[0].status,'conflicting_claim');
 assert.equal(r.cases[1].status,'conflicting_claim');
});
test('duplicate payment ID with distinct sources is rejected',()=>{
 const d=doc({rows:[row(),row({lineId:'l2'})]});
 const p2=settlement({bankEvidence:{...settlement().bankEvidence,lineId:'l2'}});
 const r=run([d],[settlement(),p2]);
 assert.equal(r.cases[0].status,'duplicate_settlement_id');
 assert.equal(r.cases[1].status,'duplicate_settlement_id');
});
test('two identical amounts on different real source lines remain distinct',()=>{
 const d=doc({rows:[row(),row({lineId:'l2'})]});
 const p2=settlement({id:'pay2',bankEvidence:{
  ...settlement().bankEvidence,lineId:'l2'}});
 const r=run([d],[settlement(),p2]);
 assert.equal(r.cases[0].status,'needs_human_review');
 assert.equal(r.cases[1].status,'needs_human_review');
});
test('missing line never creates a payment',()=>{
 const r=run([doc({rows:[]})]);assert.equal(r.cases[0].status,'missing_line');
 assert.equal(r.createdTransactions,0);
});
test('incomplete source blocks matching and approvals',()=>{
 assert.equal(run([doc({complete:false})]).cases[0].status,'source_incomplete');
 assert.equal(run([doc(),doc({complete:false,importId:'bad'})]).
 cases[0].status,'source_incomplete');
});
test('invalid dates cents statuses or currency make entire source incomplete',()=>{
 for(const r of [row({debitDate:'2026-02-30'}),
 row({amount:'12.345'}),row({status:'unknown'}),row({currency:'CAD'})])
  assert.equal(run([doc({rows:[r]})]).cases[0].status,'source_incomplete');
});
test('incomplete or mismatching source cannot produce a review snapshot',()=>{
 assert.throws(()=>reviewSnapshot({statement:doc({complete:false}),
 settlement:settlement()}),/incomplet/);
 assert.throws(()=>reviewSnapshot({statement:doc({rows:[row({amount:'12.36'})]}),
 settlement:settlement()}),/concordante/);
});
test('unclaimed imported source line stays visible for inspection',()=>{
 const d=doc({rows:[row(),row({lineId:'unclaimed',amount:'8'})]});
 const r=run([d]);
 assert.equal(r.unclaimedLines.length,1);
 assert.equal(r.unclaimedLines[0].lineId,'unclaimed');
});
test('mismatched imported line is not hidden as a successful match',()=>{
 const r=run([doc({rows:[row({amount:'13'})]})]);
 assert.equal(r.unclaimedLines.length,1);
 assert.equal(r.cases[0].status,'mismatched_line');
});
test('two review receipts or unapproved receipt block manual completion',()=>{
 const d=doc(),s=settlement(),snap=reviewSnapshot({statement:d,settlement:s});
 const a={settlementId:'pay1',approved:true,snapshot:snap};
 assert.equal(run([d],[s],[{...a,approved:false}]).
 cases[0].status,'stale_review');
 assert.equal(run([d],[s],[a,a]).cases[0].status,'stale_review');
});
test('a full settlement is out of scope of partial matching',()=>{
 assert.equal(run([doc()],[settlement({settlementMode:'full'})]).
 cases[0].status,'invalid_settlement');
});
test('inputs remain immutable and outputs remain nonposting',()=>{
 const d=Object.freeze(doc({rows:Object.freeze([Object.freeze(row())])}));
 const s=Object.freeze(settlement({bankEvidence:
  Object.freeze(settlement().bankEvidence)}));
 const old=JSON.stringify({d,s}),snap=reviewSnapshot({statement:d,settlement:s});
 const r=run(Object.freeze([d]),Object.freeze([s]),
 Object.freeze([Object.freeze({settlementId:'pay1',approved:true,snapshot:snap})]));
 assert.equal(JSON.stringify({d,s}),old);assert.equal(r.writes,0);
 assert.equal(r.cases[0].status,'manual_review_current');
});
test('unexpected volumes or invalid collections are rejected',()=>{
 assert.throws(()=>compare({statements:null}),/invalides/);
 assert.throws(()=>compare({statements:Array(101).fill(doc())}),/invalides/);
});

test('incorrectly typed checking or card row can never attest bank settlement',()=>{
 for(const incorrect of [{type:'checking_credit',direction:'debit'},
  {type:'card_fee',direction:'debit'},
  {type:'card_purchase',direction:'debit'},
  {type:'checking_debit',direction:'credit'}]){
  const source=doc({rows:[row(incorrect)]});
  assert.equal(run([source]).cases[0].status,'source_incomplete');
  assert.throws(()=>reviewSnapshot({statement:source,settlement:settlement()}),/incomplet/);
 }
});
test('a correctly typed checking debit remains only locally reviewable',()=>{
 const source=doc({rows:[row({type:'checking_debit'})]});
 const payment=settlement(),snap=reviewSnapshot({statement:source,settlement:payment});
 const result=run([source],[payment],[{settlementId:payment.id,approved:true,snapshot:snap}]);
 assert.equal(result.cases[0].status,'manual_review_current');
 assert.equal(result.createdTransactions,0);
});

test('renamed rows and sources cannot reuse a checking import as fresh evidence',()=>{
 const original=doc(),copy=doc({statementId:'renamed-statement',
  sourceId:'different-physical-source',rows:[row({lineId:'different-bank-row'})]});
 const s=settlement(),snapshot=reviewSnapshot({statement:original,settlement:s});
 const result=run([original,copy],[s],[{settlementId:s.id,approved:true,snapshot}]);
 assert.equal(result.cases[0].status,'duplicate_import');
 assert.equal(result.invalidDocuments.some(d=>d.statementId===original.statementId),true);
 assert.equal(result.invalidDocuments.some(d=>d.statementId===copy.statementId),true);
 assert.equal(result.writes,0);assert.equal(result.financialChanges,0);
});
test('renamed import and line IDs cannot reuse a physical checking source',()=>{
 const original=doc(),copy=doc({statementId:'renamed-statement',
  importId:'different-import-id',rows:[row({lineId:'another-row'})]});
 const result=run([original,copy]);
 assert.equal(result.cases[0].status,'duplicate_import');
 assert.ok(result.invalidDocuments.length>=2);
});
test('an independent additional checking source leaves existing manual review valid',()=>{
 const original=doc(),copy=doc({statementId:'separate-statement',
  sourceId:'other-source',importId:'other-import',rows:[row({lineId:'unrelated'})]});
 const s=settlement(),snapshot=reviewSnapshot({statement:original,settlement:s});
 const result=run([original,copy],[s],[{settlementId:s.id,approved:true,snapshot}]);
 assert.equal(result.cases[0].status,'manual_review_current');
 assert.equal(result.invalidDocuments.length,0);
 assert.equal(result.createdTransactions,0);
});
console.log(passed+' deferred bank review scenarios passed');

test('full settlement is comparable only with its own scheduled due date and checking proof',()=>{
 const d=doc(),s=settlement({settlementMode:'full',
  scheduledDueDate:'2026-11-05',allocationDueDate:undefined});
 const snapshot=reviewSnapshot({statement:d,settlement:s});
 const r=run([d],[s],[{settlementId:'pay1',approved:true,snapshot}]);
 assert.equal(r.cases[0].status,'manual_review_current');
 assert.equal(r.cases[0].bankDateDeviationDays,0);
 assert.equal(r.createdTransactions,0);assert.equal(r.bankAuthenticated,false);
});
test('full settlement without explicit due date stays invalid; no inferred bank proof',()=>{
 const s=settlement({settlementMode:'full',allocationDueDate:undefined});
 assert.equal(run([doc()],[s]).cases[0].status,'invalid_settlement');
 assert.throws(()=>reviewSnapshot({statement:doc(),settlement:s}),/incomplet/);
});
test('a full settlement cannot mix partial allocation and scheduled due metadata',()=>{
 const s=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05'});
 assert.equal(run([doc()],[s]).cases[0].status,'invalid_settlement');
});
test('bank debit actually occurs three days later: no automatic date shift or write',()=>{
 const s=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',
  allocationDueDate:undefined,debitDate:'2026-11-08',
  bankEvidence:{...settlement().bankEvidence,debitDate:'2026-11-08'}});
 const d=doc({rows:[row({debitDate:'2026-11-08'})]});
 const token=reviewSnapshot({statement:d,settlement:s});
 const r=run([d],[s],[{settlementId:s.id,approved:true,snapshot:token}]);
 assert.equal(r.cases[0].bankDateDeviationDays,3);
 assert.equal(r.cases[0].scheduledDueDate,'2026-11-05');
 assert.equal(r.cases[0].observedDebitDate,'2026-11-08');
 assert.equal(r.cases[0].status,'manual_review_current');
 assert.equal(r.financialChanges,0);
});
test('bank debit one day earlier is not reclassified as scheduled date',()=>{
 const s=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',
  allocationDueDate:undefined,debitDate:'2026-11-04',
  bankEvidence:{...settlement().bankEvidence,debitDate:'2026-11-04'}});
 const d=doc({rows:[row({debitDate:'2026-11-04'})]});
 assert.equal(run([d],[s]).cases[0].bankDateDeviationDays,-1);
 assert.equal(run([d],[s]).cases[0].status,'needs_human_review');
});
test('stale human receipt cannot certify a shifted debit date',()=>{
 const old=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',allocationDueDate:undefined});
 const snapshot=reviewSnapshot({statement:doc(),settlement:old});
 const changed=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',
  allocationDueDate:undefined,debitDate:'2026-11-08',
  bankEvidence:{...settlement().bankEvidence,debitDate:'2026-11-08'}});
 const fresh=doc({rows:[row({debitDate:'2026-11-08'})]});
 const r=run([fresh],[changed],[{settlementId:'pay1',approved:true,snapshot}]);
 assert.equal(r.cases[0].status,'stale_review');
});
test('bank evidence must attest the actual date, not merely the scheduled date',()=>{
 const s=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',
  allocationDueDate:undefined,debitDate:'2026-11-08'});
 assert.equal(run([doc()],[s]).cases[0].status,'invalid_settlement');
});
test('two full settlements cannot reuse one physical bank line',()=>{
 const s=settlement({settlementMode:'full',scheduledDueDate:'2026-11-05',allocationDueDate:undefined});
 const r=run([doc()],[s,{...s,id:'pay2'}]);
 assert.equal(r.cases[0].status,'conflicting_claim');
 assert.equal(r.cases[1].status,'conflicting_claim');
});
