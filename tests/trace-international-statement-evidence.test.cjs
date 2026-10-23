'use strict';
/* TRACE 5.37.0: fictional PDF-extracted bank rows must be verified before the
 * read-only monthly comparator can run. This does NOT extract PDF files. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root={};
for(const file of ['trace-international-1.0.0.js','trace-statement-reconcile-1.0.0.js',
 'trace-statement-evidence-1.0.0.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{window:root});
const E=root.TraceStatementEvidence,S=root.TraceStatementReconcile,I=root.TraceInternational;
const account={id:'ca',type:'checking',currency:'CAD'};
const meta={documentId:'oct-2026-courant',accountId:'ca',currency:'CAD',
 fromDate:'2026-10-01',toDate:'2026-10-31'};
const line=(page,line,date,values={})=>({page,line,rawText:'Original PDF page '+page+' / ligne '+line,
 date,name:'Opération fictive',...values});
const single=(values={})=>E.stage({...meta,rows:[line(1,1,'15/10/2026',{debit:'42,50',...values})]});
const approvals=staged=>staged.ready.map(x=>({id:x.id,evidenceKey:x.evidenceKey,confirmed:true}));
const tx=(id,date,type,amount,more={})=>({id,date,type,bankAmount:amount,
 accountId:'ca',status:'confirmed',name:id,...more});
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
test('French calendar dates and exact native cents normalize without CAD FX invention',()=>{
 const s=single();assert.equal(s.ready.length,1);assert.equal(s.ready[0].date,'2026-10-15');
 assert.equal(s.ready[0].amount,42.5);assert.equal(s.ready[0].direction,'out');
 assert.equal(s.ready[0].currency,'CAD');assert.equal(s.ready[0].page,1);
 assert.equal(s.ready[0].line,1);assert.equal(s.writes,0);
});
test('original raw PDF excerpt and exact page/line survive human review',()=>{
 const s=single();assert.match(s.ready[0].rawText,/Original PDF page/);
 assert.match(s.ready[0].id,/oct-2026-courant#1:1/);
 assert.equal(typeof s.ready[0].evidenceKey,'string');
});
test('US and FR thousands separators are correctly normalized without rounding',()=>{
 const s=E.stage({...meta,rows:[
  line(1,1,'12/10/2026',{debit:'1 234,56'}),
  line(1,2,'13/10/2026',{credit:'1,234.56'}),
  line(1,3,'14/10/2026',{amount:'12.30',direction:'out'})
 ]});
 assert.equal(s.issues.length,0);
 assert.deepEqual(s.ready.map(x=>x.amount),[1234.56,1234.56,12.3]);
 assert.deepEqual(s.ready.map(x=>x.direction),['out','in','out']);
});
test('both debit and credit amounts reject invented bank movement',()=>{
 const s=single({debit:'42,50',credit:'20,00'});
 assert.equal(s.ready.length,0);assert.equal(s.issues.length,1);
 assert.match(s.issues[0].reason,/Débit\/Crédit/);
});
test('unreadable nonempty amount beside valid credit blocks',()=>{
 const s=single({debit:'MONTANT ILLISIBLE',credit:'20,00'});
 assert.equal(s.issues.length,1);assert.match(s.issues[0].reason,/illisible/);
});
test('blank or zero debit and credit must not certify a transaction',()=>{
 const s=single({debit:'0',credit:'0'});
 assert.equal(s.issues.length,1);assert.equal(s.ready.length,0);
});
test('an amount with fractional cents cannot be normalized by rounding',()=>{
 const s=single({debit:'42,505'});
 assert.equal(s.issues.length,1);assert.equal(s.ready.length,0);
});
test('ambiguous thousands amount cannot be guessed',()=>{
 const s=single({debit:'1,234'});
 assert.equal(s.issues.length,1);
});
test('invalid/impossible date and out-of-period date both block',()=>{
 const a=single({date:'31/02/2026'}),b=single({date:'30/09/2026'});
 assert.equal(a.issues.length,1);assert.equal(b.issues.length,1);
 assert.match(a.issues[0].reason,/Date/);assert.match(b.issues[0].reason,/hors période/);
});
test('wrong currency and contradictory direction block rather than converting',()=>{
 const a=single({currency:'EUR'}),b=single({direction:'in'});
 assert.equal(a.ready.length,0);assert.equal(b.ready.length,0);
 assert.match(a.issues[0].reason,/Devise/);assert.match(b.issues[0].reason,/contradictoire/);
});
test('duplicate source page/line are detected even when values differ',()=>{
 const s=E.stage({...meta,rows:[
  line(1,2,'15/10/2026',{debit:'20,00'}),
  line(1,2,'16/10/2026',{debit:'30,00'})
 ]});
 assert.equal(s.ready.length,1);assert.equal(s.issues.length,1);
 assert.match(s.issues[0].reason,/répétée/);
});
test('missing source location or original excerpt always blocks',()=>{
 const a=single({rawText:''}),b=single({page:0}),c=single({line:-1});
 assert.equal(a.issues.length,1);assert.equal(b.issues.length,1);
 assert.equal(c.issues.length,1);
});
test('an empty or implausibly large document cannot receive false completeness',()=>{
 assert.throws(()=>E.stage({...meta,rows:[]}),/invalides/);
 assert.throws(()=>E.stage({...meta,rows:new Array(2001).fill({})}),/invalides/);
});
test('unreviewed but parseable source cannot be silently compared',()=>{
 const s=single(),res=E.compareReviewed({staged:s,approvals:[],
 account,transactions:[],amountOnAccount:I.amountOnAccount,comparator:S.compare});
 assert.equal(res.status,'blocked');assert.equal(res.report,null);
 assert.equal(res.missingIds.length,1);
});
test('an outdated approval cannot be transferred to altered amount or evidence',()=>{
 const original=single(),ok=approvals(original);
 const revised=single({debit:'43,50'});
 const result=E.reviewedRows(revised,ok);
 assert.equal(result.status,'blocked');assert.equal(result.verifiedRows.length,0);
 const changedExcerpt=single({rawText:'Other original excerpt'});
 assert.equal(E.reviewedRows(changedExcerpt,ok).status,'blocked');
});
test('mixed valid/invalid extracted lines must block the whole completeness report',()=>{
 const s=E.stage({...meta,rows:[
  line(1,1,'15/10/2026',{debit:'20,00'}),
  line(1,2,'15/10/2026',{debit:'0',credit:'0'})
 ]});
 assert.equal(s.ready.length,1);assert.equal(s.issues.length,1);
 assert.equal(E.reviewedRows(s,approvals(s)).status,'blocked');
});
test('duplicate approvals and unknown line IDs are rejected',()=>{
 const s=single(),ok=approvals(s);
 assert.throws(()=>E.reviewedRows(s,[ok[0],ok[0]]),/dupliquée/);
 assert.equal(E.reviewedRows(s,[...ok,{id:'ghost',confirmed:true,evidenceKey:'other'}]).status,'blocked');
});
test('fully verified bank evidence can be compared read-only with existing expense',()=>{
 const s=single();
 const existing=[tx('original','2026-10-15','expense',42.5)];
 const res=E.compareReviewed({staged:s,approvals:approvals(s),account,
  transactions:existing,amountOnAccount:I.amountOnAccount,comparator:S.compare});
 assert.equal(res.status,'comparison_ready');
 assert.equal(res.report.totals.matched,1);
 assert.equal(res.writes,0);assert.equal(res.financialChanges,0);
});
test('document account/currency cannot be switched during comparison',()=>{
 const s=single();
 assert.throws(()=>E.compareReviewed({staged:s,approvals:approvals(s),
  account:{id:'fr',currency:'EUR'},transactions:[],
  amountOnAccount:I.amountOnAccount,comparator:S.compare}),/non conforme/);
});
test('two identical verified PDF source rows do not reuse one booked purchase',()=>{
 const s=E.stage({...meta,rows:[
  line(1,1,'15/10/2026',{debit:'25,00',name:'TRAIN'}),
  line(1,2,'15/10/2026',{debit:'25,00',name:'TRAIN'})
 ]});
 const existing=[tx('single','2026-10-15','expense',25)];
 const res=E.compareReviewed({staged:s,approvals:approvals(s),account,
  transactions:existing,amountOnAccount:I.amountOnAccount,comparator:S.compare});
 assert.equal(res.report.totals.matched,0);assert.equal(res.report.totals.ambiguous,2);
});
test('incoming friend refund and card payment remain bank-only, not salaries',()=>{
 const s=E.stage({...meta,rows:[
  line(1,1,'12/10/2026',{debit:'100,00',name:'Mastercard'}),
  line(1,2,'13/10/2026',{credit:'15,00',name:'Camille'})
 ]});
 const records=[
  tx('pay','2026-10-12','transfer',100,{toAccountId:'mc',toBankAmount:100}),
  tx('camille','2026-10-13','external_refund',15)
 ];
 const res=E.compareReviewed({staged:s,approvals:approvals(s),account,
  transactions:records,amountOnAccount:I.amountOnAccount,comparator:S.compare});
 assert.equal(res.report.totals.matched,2);
});
test('no source input or stored bank document is mutated during review',()=>{
 const source=Object.freeze(line(1,1,'15/10/2026',{debit:'10,00'}));
 const s=E.stage({...meta,rows:Object.freeze([source])});
 const copies=JSON.stringify([source,s]),bank=[tx('x','2026-10-15','expense',10)];
 const beforeBank=JSON.stringify(bank);
 E.compareReviewed({staged:s,approvals:approvals(s),account,
  transactions:bank,amountOnAccount:I.amountOnAccount,comparator:S.compare});
 assert.equal(JSON.stringify([source,s]),copies);
 assert.equal(JSON.stringify(bank),beforeBank);
});
console.log(count+' extracted PDF evidence / explicit review checks passed');
