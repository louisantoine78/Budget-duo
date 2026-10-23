'use strict';
// Fictional monthly statement facts, not a PDF parser or a live bank connector.
// Validate actual isolated TRACE comparison engine with actual native amounts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8'),{window:root});
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-statement-reconcile-1.0.0.js'),'utf8'),{window:root});
const compare=root.TraceStatementReconcile.compare;
const ca={id:'ca',currency:'CAD',type:'checking'},mc={id:'mc',currency:'CAD',type:'card'};
const fr={id:'fr',currency:'EUR',type:'checking'};
const options={account:ca,fromDate:'2026-10-01',toDate:'2026-10-31',
 amountOnAccount:root.TraceInternational.amountOnAccount};
const row=(id,date,direction,amount,name)=>({id,date,direction,amount,name});
const transaction=(id,date,type,bankAmount,accountId='ca',props={})=>({
 id,date,type,bankAmount,accountId,status:'confirmed',name:id,...props});
function run(statementRows,transactions,overrides={}){
 return compare({...options,statementRows,transactions,...overrides});
}
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('one-to-one confirmed expense matches exactly, never creates a transaction',()=>{
 const result=run([row('s1','2026-10-15','out',40,'Courses')],
  [transaction('t1','2026-10-15','expense',40)]);
 assert.equal(result.lines[0].status,'matched');
 assert.equal(result.totals.matched,1);
 assert.equal(result.writes,0);assert.equal(result.financialChanges,0);
});
test('missing statement purchase is identified without creating a budget expense',()=>{
 const result=run([row('s1','2026-10-15','out',45,'Boulangerie')],[]);
 assert.equal(result.totals.missing,1);assert.equal(result.writes,0);
});
test('extra recorded expense absent from statement is listed separately',()=>{
 const result=run([],[transaction('t1','2026-10-10','expense',55)]);
 assert.equal(result.totals.notOnStatement,1);
 assert.equal(result.notOnStatement[0].id,'t1');
});
test('two identical statement rows cannot reuse one confirmed financial movement',()=>{
 const result=run([row('a','2026-10-10','out',25,'Train'),
  row('b','2026-10-10','out',25,'Train')],
  [transaction('t','2026-10-10','expense',25)]);
 assert.equal(result.totals.ambiguous,2);assert.equal(result.totals.matched,0);
 assert.equal(result.lines[0].candidates[0].id,'t');
 assert.equal(result.lines[1].candidates[0].id,'t');
});
test('two identical booked amounts and two identical statement rows remain ambiguous',()=>{
 const result=run([row('a','2026-10-10','out',25,'Train'),
  row('b','2026-10-10','out',25,'Train')],
  [transaction('t1','2026-10-10','expense',25),
   transaction('t2','2026-10-10','expense',25)]);
 assert.equal(result.totals.ambiguous,2);assert.equal(result.totals.matched,0);
});
test('pending transaction is evidence to investigate, not bank confirmation',()=>{
 const result=run([row('s','2026-10-14','out',20,'Lunch')],
  [transaction('t','2026-10-14','expense',20,'ca',{status:'pending'})]);
 assert.equal(result.lines[0].status,'pending');
});
test('pending and confirmed candidates of same amount create ambiguity',()=>{
 const result=run([row('s','2026-10-14','out',20,'Lunch')],
 [transaction('a','2026-10-14','expense',20),
  transaction('b','2026-10-14','expense',20,'ca',{status:'pending'})]);
 assert.equal(result.lines[0].status,'ambiguous');
});
test('a Mastercard payment is checking debit, not income or expense',()=>{
 const transfer=transaction('mastercard','2026-10-12','transfer',100,'ca',
  {toAccountId:'mc',toBankAmount:100});
 const checking=run([row('debit','2026-10-12','out',100,'Paiement carte')],[transfer]);
 assert.equal(checking.lines[0].status,'matched');
 assert.equal(checking.lines[0].candidates[0].kind,'transfer');
 const card=run([row('credit','2026-10-12','in',100,'Paiement reçu')],[transfer],
  {account:mc});
 assert.equal(card.lines[0].status,'matched');
 assert.equal(card.lines[0].candidates[0].leg,'destination');
});
test('linked card statement evidence is never counted as additional money',()=>{
 const statement=transaction('e','2026-10-12','card_statement_evidence',100,'mc',
   {linkedTransactionId:'pay'});
 const result=run([row('s','2026-10-12','in',100,'Reçu')],[statement],
   {account:mc});
 assert.equal(result.lines[0].status,'missing');
});
test('friend partial reimbursement is an incoming bank fact, not salary',()=>{
 const result=run([row('cam','2026-10-13','in',15,'Camille')],
  [transaction('repayment','2026-10-13','external_refund',15,'ca',
   {repaymentAllocations:[{expenseId:'food',amountCAD:15,counterparty:'Camille'}]})]);
 assert.equal(result.lines[0].status,'matched');
 assert.equal(result.lines[0].candidates[0].kind,'external_refund');
});
test('merchant refund offsets card debt using the card native receipt',()=>{
 const result=run([row('refund','2026-10-14','in',12,'Retour commerçant')],
  [transaction('credit','2026-10-14','refund',12,'mc')],{account:mc});
 assert.equal(result.lines[0].status,'matched');
});
test('cross-currency transfer compares CAD debit and EUR receipt independently',()=>{
 const transfer=transaction('fx','2026-10-16','transfer',150,'ca',
  {toAccountId:'fr',toBankAmount:95,bankCurrency:'CAD',amountCAD:150});
 const debit=run([row('cad','2026-10-16','out',150,'Virement')],[transfer]);
 assert.equal(debit.lines[0].status,'matched');
 const credit=run([row('eur','2026-10-16','in',95,'Virement')],[transfer],
  {account:fr});
 assert.equal(credit.lines[0].status,'matched');
 assert.equal(credit.currency,'EUR');
 const falseConversion=run([row('bad','2026-10-16','in',150,'Virement')],[transfer],
  {account:fr});
 assert.equal(falseConversion.lines[0].status,'missing');
});
test('missing EUR destination never silently inherits CAD value',()=>{
 const transfer=transaction('fx','2026-10-16','transfer',150,'ca',
  {toAccountId:'fr',toBankAmount:null,bankCurrency:'CAD',amountCAD:150});
 const result=run([row('eur','2026-10-16','in',95,'Virement')],[transfer],{account:fr});
 assert.equal(result.lines[0].status,'missing');
});
test('historical EUR bank amount beats its unrelated CAD budget value',()=>{
 const purchase=transaction('eur','2026-10-15','expense',42,'fr',
  {bankCurrency:'EUR',amountCAD:66});
 const matched=run([row('s','2026-10-15','out',42,'Repas')],[purchase],{account:fr});
 assert.equal(matched.lines[0].status,'matched');
 const wrong=run([row('s','2026-10-15','out',66,'Repas')],[purchase],{account:fr});
 assert.equal(wrong.lines[0].status,'missing');
});
test('a transaction booked on a separate account must not match',()=>{
 const result=run([row('s','2026-10-15','out',20,'Coffee')],
  [transaction('t','2026-10-15','expense',20,'mc')]);
 assert.equal(result.lines[0].status,'missing');
});
test('incoming and outgoing transactions of identical amounts never cross-match',()=>{
 const result=run([row('s','2026-10-15','in',20,'Refund')],
  [transaction('t','2026-10-15','expense',20)]);
 assert.equal(result.lines[0].status,'missing');
});
test('date tolerance accepts two-day delay and rejects three-day delay',()=>{
 const ledger=[transaction('t','2026-10-10','expense',20)];
 assert.equal(run([row('a','2026-10-12','out',20,'Shop')],ledger).totals.matched,1);
 assert.equal(run([row('a','2026-10-13','out',20,'Shop')],ledger).totals.missing,1);
});
test('invalid, impossible, fractional-cent and cross-currency statement rows are isolated',()=>{
 const result=run([row('a','2026-02-30','out',20,'Bad date'),
  row('b','2026-10-01','none',20,'Bad sense'),
  row('c','2026-10-01','out',10.005,'Bad cents'),
  {...row('d','2026-10-01','out',20,'Wrong FX'),currency:'EUR'}],[]);
 assert.equal(result.totals.invalid,4);assert.equal(result.totals.rows,0);
});
test('out-of-period statement rows do not silently enter monthly coverage',()=>{
 const result=run([row('a','2026-09-30','out',20,'Old'),
  row('b','2026-11-01','out',20,'Future')],[]);
 assert.equal(result.totals.outOfPeriod,2);assert.equal(result.totals.rows,0);
});
test('confirmed transactions outside statement date are not counted as absent lines',()=>{
 const result=run([],[transaction('old','2026-09-28','expense',20),
  transaction('new','2026-11-01','expense',25)]);
 assert.equal(result.totals.notOnStatement,0);
});
test('all statement inputs and bank records remain byte-for-byte unchanged',()=>{
 const statementRows=Object.freeze([Object.freeze(row('r','2026-10-15','out',10,'Test'))]);
 const transactions=Object.freeze([Object.freeze(transaction('t','2026-10-15','expense',10))]);
 const before=JSON.stringify({statementRows,transactions});
 const result=run(statementRows,transactions);
 assert.equal(JSON.stringify({statementRows,transactions}),before);
 assert.equal(result.totals.matched,1);assert.equal(result.writes,0);
});
test('invalid month or amountOnAccount dependency fails explicitly',()=>{
 assert.throws(()=>run([],[],{fromDate:'2026-02-30'}),/invalides/);
 assert.throws(()=>run([],[],{amountOnAccount:null}),/requis/);
 assert.throws(()=>run([],[],{dateTolerance:12}),/invalide/);
});
console.log(passed+' fictional monthly statement reconciliation controls passed');
