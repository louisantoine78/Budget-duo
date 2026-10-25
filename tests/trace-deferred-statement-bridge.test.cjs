'use strict';
// Fictional structured statement bridge. Real Node test on an isolated module;
// line-review dependency is explicitly a mock, not full PDF/CSV integration.
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..',
 'trace-deferred-statement-bridge-1.0.0.js'),'utf8');
function fixture(options={}){
 const row={id:'doc#1:1',date:'2026-10-12',direction:'out',
  amount:40,currency:'EUR',name:'Courses',rawText:'Courses 40,00',
  page:1,line:1,evidenceKey:'row-evidence-v1',...options.row};
 const staged={documentId:'doc',statementKey:'doc-version-1',
  totalRows:1,accountId:'card',currency:'EUR',
  fromDate:'2026-10-01',toDate:'2026-10-31',
  issues:[],ready:[row],...options.staged};
 const approval={id:row.id,evidenceKey:row.evidenceKey,confirmed:true};
 const root={TraceStatementEvidence:{reviewedRows(st,ap){
  if(options.blockReview)return{status:'blocked'};
  if(ap.length!==1||ap[0].evidenceKey!==st.ready[0].evidenceKey)
   return{status:'blocked'};
  return{status:'reviewed',writes:0,financialChanges:0,
   verifiedRows:[{id:row.id}],documentId:st.documentId,
   accountId:st.accountId,currency:st.currency,
   fromDate:st.fromDate,toDate:st.toDate};
 }}};
 vm.runInNewContext(code,{window:root});
 const args={staged,approvals:[approval],accountKind:'card',
  sourceType:'pdf_extracted',sourceId:'file-sha',importId:'import-1',
  classifications:[{id:row.id,evidenceKey:row.evidenceKey,
   statementKey:staged.statementKey,kind:'card_purchase',confirmed:true,posted:true}],
  completeness:{confirmed:true,statementKey:staged.statementKey,
   expectedRows:1,reviewedBy:'la'}};
 return{convert:root.TraceDeferredStatementBridge.convert,args};
}
test('reviewed structured PDF purchase emits exact native card row with no write',()=>{
 const f=fixture(),v=f.convert(f.args);
 assert.equal(v.status,'local_document_ready');
 assert.equal(v.statement.rows[0].purchaseDate,'2026-10-12');
 assert.equal(v.statement.rows[0].amount,40);
 assert.equal(v.statement.rows[0].type,'card_purchase');
 assert.equal(v.statement.rows[0].direction,'debit');
 assert.equal(v.persistable,false);assert.equal(v.writes,0);
 assert.equal(v.bankAuthenticated,false);
});
test('any unreviewed bank row or missing completeness remains blocked',()=>{
 const f=fixture();
 assert.equal(f.convert({...f.args,approvals:[]}).status,'blocked');
 assert.equal(f.convert({...f.args,completeness:null}).status,'blocked');
});
test('stale classified statement and row keys cannot be reused',()=>{
 const f=fixture();
 assert.equal(f.convert({...f.args,classifications:[{
  ...f.args.classifications[0],statementKey:'old'}]}).status,'blocked');
 assert.equal(f.convert({...f.args,classifications:[{
  ...f.args.classifications[0],evidenceKey:'old'}]}).status,'blocked');
});
test('a card refund cannot masquerade as purchase debit',()=>{
 const f=fixture();
 assert.equal(f.convert({...f.args,classifications:[{
  ...f.args.classifications[0],kind:'card_refund'}]}).status,'blocked');
});
test('checking statement enforces checking-only row classifications',()=>{
 const f=fixture(),v=f.convert({...f.args,accountKind:'checking',
  classifications:[{...f.args.classifications[0],kind:'checking_debit'}]});
 assert.equal(v.status,'local_document_ready');
 assert.equal(v.statement.rows[0].debitDate,'2026-10-12');
 assert.equal(v.statement.rows[0].type,'checking_debit');
 assert.equal(f.convert({...f.args,accountKind:'checking'}).status,'blocked');
});
test('changing classification changes whole source version',()=>{
 const f=fixture({row:{direction:'in'}}),x=f.args.classifications[0];
 const one=f.convert({...f.args,classifications:[{...x,kind:'card_refund'}]});
 const two=f.convert({...f.args,classifications:[{...x,kind:'card_payment'}]});
 assert.equal(one.status,'local_document_ready');
 assert.equal(two.status,'local_document_ready');
 assert.notEqual(one.statement.sourceVersion,two.statement.sourceVersion);
});
test('a partial verification, invalid row or unseen extra row is blocked',()=>{
 const f=fixture();
 for(const staged of [
  {...f.args.staged,totalRows:2},
  {...f.args.staged,issues:[{id:'broken'}]},
  {...f.args.staged,ready:[...f.args.staged.ready,{}]}
 ])assert.equal(f.convert({...f.args,staged}).status,'blocked');
});
test('CSV already structured rows can be reviewed, without performing CSV parsing',()=>{
 const f=fixture(),v=f.convert({...f.args,sourceType:'csv'});
 assert.equal(v.statement.sourceType,'csv');
 assert.equal(v.statement.rows[0].sourceLine,1);
 assert.equal(v.statement.complete,true);
});
test('only local source; no credentials or persistence introduced',()=>{
 const f=fixture(),v=f.convert(f.args);
 assert.equal(Object.isFrozen(v),true);
 assert.equal(Object.isFrozen(v.statement.rows),true);
 assert.equal(v.serverUniquenessChecked,false);
 assert.doesNotMatch(code,/supabase|localStorage|indexedDB|fetch\(|XMLHttpRequest/i);
});
