'use strict';
// Real pinned PDF.js bytes + compressed, entirely fictional PDF files.
// This is native integration coverage, not a simulated text-content engine.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
require('../trace-international-1.0.0.js');
require('../trace-statement-evidence-1.0.0.js');
require('../trace-statement-reconcile-1.0.0.js');
require('../trace-statement-pdfjs-adapter-1.0.0.js');
const engine=import(pathToFileURL(path.join(root,'vendor/pdfjs/pdf.mjs')).href);
const file=name=>{const bytes=fs.readFileSync(path.join(__dirname,'fixtures/statements',name));
 return{size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer}};
const scan=async name=>globalThis.TraceStatementPDFJS.scan(file(name),{engine:await engine});

test('real local PDF.js version is the audited pinned distribution',async()=>{
 assert.equal((await engine).version,'6.4.299');
 const m=JSON.parse(fs.readFileSync(path.join(root,'vendor/pdfjs/trace-vendor-manifest.json'),'utf8'));
 assert.equal(m.files['pdf.mjs'].sha256,'bc51f4874a66e3853189cb5d50aba4b3096afa83ed433b885d293a3d94583cdc');
 assert.equal(m.files['pdf.worker.mjs'].sha256,'bb422f60804477de4a0b09091d8347a916a387755ed1cbad24ccaec1d09c78bf');
});
test('compressed French two-page statement retains exact EUR amounts, accents, pages and lines',async()=>{
 const out=await scan('fr-eur-multipage.pdf');
 assert.equal(out.status,'review_required');assert.equal(out.pages,2);
 assert.deepEqual(out.proposals.map(x=>[x.page,x.line,x.date,x.direction,x.amount]),[
  [1,4,'2026-10-08','out',40],[1,5,'2026-10-09','out',46.2],
  [2,4,'2026-10-11','in',95],[2,5,'2026-10-13','out',23.4]]);
 assert.match(out.proposals[3].rawText,/à vérifier/);
 assert.equal(out.complete,false);assert.equal(out.writes,0);assert.equal(out.financialChanges,0);
 assert.ok(out.unparsed.some(x=>x.page===2&&/Solde/.test(x.rawText)));
});
test('compressed Canadian statement preserves thousands and card payment as one bank debit',async()=>{
 const out=await scan('ca-cad-multipage.pdf');
 assert.equal(out.pages,2);
 assert.deepEqual(out.proposals.map(x=>[x.direction,x.amount]),[
  ['in',1800],['out',150],['out',50],['out',27.89]]);
 assert.equal(out.proposals.filter(x=>/Mastercard/.test(x.name)).length,1);
});
test('a French account statement cannot be relabeled CAD by choosing the wrong account',async()=>{
 const out=await globalThis.TraceStatementPDFJS.scan(file('fr-eur-multipage.pdf'),
  {engine:await engine,currency:'CAD'});
 assert.equal(out.status,'unsupported');assert.deepEqual(out.proposals,[]);
 assert.match(out.reason,/EUR.*CAD/);
});
test('USD purchase description does not replace the EUR statement header currency',async()=>{
 const out=await globalThis.TraceStatementPDFJS.scan(file('fr-eur-multipage.pdf'),
  {engine:await engine,currency:'EUR'});
 assert.equal(out.status,'review_required');assert.equal(out.declaredCurrency,'EUR');
 assert.equal(out.currencyReviewRequired,false);assert.equal(out.proposals[1].amount,46.2);
});
test('ambiguous debit/credit, unreadable amount and impossible calendar date are never guessed',async()=>{
 const out=await scan('ambiguous-columns.pdf');
 assert.equal(out.status,'review_required');assert.equal(out.proposals.length,0);
 for(const label of ['Deux montants','Montant illisible','Date impossible'])
  assert.ok(out.unparsed.some(x=>x.rawText.includes(label)));
});
test('a page without any text layer returns manual fallback without proposals',async()=>{
 const out=await scan('image-only.pdf');
 assert.equal(out.status,'unsupported');assert.equal(out.complete,false);
 assert.deepEqual(out.proposals,[]);assert.equal(out.writes,0);
});
test('corrupted actual PDF bytes fail closed without retaining partial proposals',async()=>{
 const bytes=Buffer.from('%PDF-1.7\n'+'broken contents '.repeat(12));
 const out=await globalThis.TraceStatementPDFJS.scan({size:bytes.length,
  arrayBuffer:async()=>Uint8Array.from(bytes).buffer},{engine:await engine});
 assert.equal(out.status,'unsupported');assert.deepEqual(out.proposals,[]);
});
test('real extraction reaches comparator only after explicit line review and never books money',async()=>{
 const out=await scan('ca-cad-multipage.pdf');
 const account={id:'ca-fictional',type:'checking',currency:'CAD'};
 const transactions=[
  {id:'salary',accountId:account.id,type:'income',status:'confirmed',date:'2026-10-04',bankAmount:1800,bankCurrency:'CAD'},
  {id:'fx',accountId:account.id,toAccountId:'fr-fictional',type:'transfer',status:'confirmed',date:'2026-10-11',bankAmount:150,toBankAmount:95,bankCurrency:'CAD'},
  {id:'card',accountId:account.id,toAccountId:'card-fictional',type:'transfer',transferPurpose:'card_repayment',status:'confirmed',date:'2026-10-12',bankAmount:50,toBankAmount:50,bankCurrency:'CAD'}];
 const before=JSON.stringify(transactions),E=globalThis.TraceStatementEvidence;
 const staged=E.stage({documentId:'ca-fictional-pdf',accountId:account.id,currency:'CAD',
  fromDate:'2026-10-01',toDate:'2026-10-31',declaredRowCount:4,rows:out.proposals});
 const compare=approvals=>E.compareReviewed({staged,approvals,account,transactions,
  amountOnAccount:globalThis.TraceInternational.amountOnAccount,
  comparator:globalThis.TraceStatementReconcile.compare,dateTolerance:2});
 assert.equal(compare([]).status,'blocked');
 const approvals=staged.ready.map(x=>({id:x.id,evidenceKey:x.evidenceKey,confirmed:true}));
 const result=compare(approvals);
 assert.equal(result.status,'comparison_ready');
 assert.equal(result.report.totals.matched,3);assert.equal(result.report.totals.missing,1);
 assert.equal(result.report.writes,0);assert.equal(result.report.financialChanges,0);
 assert.equal(JSON.stringify(transactions),before);
});
test('data-byte parsing never calls fetch or sends the statement to a remote service',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=()=>{calls++;throw Error('Network forbidden for a local statement')};
 try{assert.equal((await scan('fr-eur-multipage.pdf')).proposals.length,4);
  assert.equal(calls,0);
 }finally{globalThis.fetch=previous;}
});
