'use strict';
/* Fake-DOM, fully fictional monthly PDF review: no browser, file transfer or DB. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const root={URL:{createObjectURL:()=> 'blob:fictional-statement',revokeObjectURL(){}}};
for(const n of ['trace-international-1.0.0.js','trace-statement-evidence-1.0.0.js',
 'trace-statement-reconcile-1.0.0.js','trace-statement-monthly-ui-1.0.0.js'])
 vm.runInNewContext(read(n),{window:root});
const account={id:'ca',name:'Canadian demo',type:'checking',currency:'CAD'};
const tx={id:'t1',date:'2026-10-12',name:'Groceries',type:'expense',
  accountId:'ca',bankCurrency:'CAD',bankAmount:40,amountCAD:40,status:'confirmed'};
function fixture(){
 const elements=new Map(),listeners={},manual=[],navigations=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',
  files:[],checked:false,dataset:{},onclick:null,onchange:null});
  return elements.get(id)};
 const host={dataset:{},innerHTML:'',querySelector:el,addEventListener:(name,fn)=>listeners[name]=fn};
 const rows=el('#traceStatementRows');rows.querySelectorAll=()=>manual;
 rows.insertAdjacentHTML=()=>{
  const vals={page:'1',line:String(manual.length+1),date:'2026-10-12',
   direction:'out',amount:'40,00',name:'Groceries',rawText:'12 Oct groceries debit 40.00'};
  const row={values:vals,querySelector:selector=>{
   const m=selector.match(/data-field="([^"]+)"/);
   return m?{get value(){return vals[m[1]]},set value(v){vals[m[1]]=v}}:null;
  }};manual.push(row);
 };
 el('#traceStatementReview').querySelector=selector=>el(selector);
 const transactions=[{...tx}];
 const ui=root.TraceMonthlyStatementUI.mount({host,accounts:()=>[account],
  transactions:()=>transactions,amountOnAccount:root.TraceInternational.amountOnAccount,
  currentMonth:'2026-10',onOpenActivity:(id,month)=>navigations.push([id,month])});
 el('#traceStatementAccount').value='ca';
 el('#traceStatementFrom').value='2026-10-01';
 el('#traceStatementTo').value='2026-10-31';
 el('#traceStatementCount').value='1';
 const pdf=el('#traceStatementFile');
 pdf.files=[{name:'statement-demo.pdf',size:280,type:'application/pdf',
  slice:()=>({arrayBuffer:async()=>new Uint8Array([37,80,68,70,45]).buffer})}];
 const confirmAll=()=>{
  el('#traceStatementAttest').checked=true;
  manual.forEach((row,index)=>{el('[data-statement-approve="'+index+'"]').checked=true});
 };
 return{el,ui,host,manual,listeners,navigations,transactions,pdf,confirmAll};
}
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name)}
async function main(){
 await test('only the lab references monthly PDF UI, not stable 5.36.5',()=>{
  const lab=read('trace-international-preview.html');
  assert.match(lab,/trace-statement-monthly-ui-1\.0\.0\.js/);
  assert.match(lab,/id="traceStatementControl"/);
  assert.match(lab,/connect-src 'none'/);
  assert.doesNotMatch(read('index.html'),/trace-statement-monthly-ui/);
 });
 await test('unsigned PDF is rejected without a report',async()=>{
  const x=fixture();x.pdf.files=[{name:'fake.pdf',size:100,type:'application/pdf',
   slice:()=>({arrayBuffer:async()=>new Uint8Array([1,2,3,4,5]).buffer})}];
  await x.pdf.onchange();x.el('#traceStatementPrepare').onclick();
  assert.equal(x.ui.getReport(),null);
  assert.match(x.el('#traceStatementNotice').textContent,/Choisis d’abord un PDF/);
 });
 await test('valid file creates local blob link, without upload',async()=>{
  const x=fixture();await x.pdf.onchange();
  assert.match(x.el('#traceStatementLocalFile').innerHTML,/blob:fictional-statement/);
 });
 await test('statement count mismatch blocks even a valid PDF',async()=>{
  const x=fixture();await x.pdf.onchange();x.el('#traceStatementCount').value='3';
  x.el('#traceStatementPrepare').onclick();
  assert.equal(x.ui.getReport(),null);
  assert.match(x.el('#traceStatementNotice').textContent,/exactement égal/);
 });
 await test('unattested and unapproved evidence never reaches comparator',async()=>{
  const x=fixture();await x.pdf.onchange();x.el('#traceStatementPrepare').onclick();
  x.el('#traceStatementCompare').onclick();assert.equal(x.ui.getReport(),null);
  x.el('#traceStatementAttest').checked=true;
  x.el('#traceStatementCompare').onclick();assert.equal(x.ui.getReport(),null);
  assert.match(x.el('#traceStatementNotice').textContent,/Toutes les lignes/);
 });
 await test('one verified bank line matches one recorded native-CAD transaction',async()=>{
  const x=fixture();await x.pdf.onchange();x.el('#traceStatementPrepare').onclick();
  x.confirmAll();x.el('#traceStatementCompare').onclick();
  assert.equal(x.ui.getReport().totals.matched,1);
  assert.equal(x.ui.getReport().financialChanges,0);
  assert.equal(x.ui.getReport().writes,0);
  assert.match(x.el('#traceStatementResults').innerHTML,/relevé complet n’est pas certifié/);
 });
 await test('multiple identical PDF lines never reuse a single transaction as matched',async()=>{
  const x=fixture();await x.pdf.onchange();
  x.listeners.click({target:{closest:q=>q==='#traceStatementAdd'?{}:null}});
  assert.equal(x.manual.length,2);
  x.el('#traceStatementCount').value='2';x.el('#traceStatementPrepare').onclick();
  assert.match(x.el('#traceStatementReview').innerHTML,/data-statement-approve="0"/);
  assert.match(x.el('#traceStatementReview').innerHTML,/data-statement-approve="1"/);
  x.confirmAll();x.el('#traceStatementCompare').onclick();
  assert.equal(x.ui.getReport().totals.ambiguous,2);
  assert.equal(x.ui.getReport().totals.matched,0);
 });
 await test('editing a prepared statement invalidates former approvals and report',async()=>{
  const x=fixture();await x.pdf.onchange();x.el('#traceStatementPrepare').onclick();
  x.confirmAll();x.el('#traceStatementCompare').onclick();assert.ok(x.ui.getReport());
  x.manual[0].values.amount='42,00';
  x.listeners.input({target:{closest:()=>null}});
  assert.equal(x.ui.getReport(),null);
  assert.equal(x.el('#traceStatementReview').innerHTML,'');
 });
 await test('opening the account history changes no transaction',async()=>{
  const x=fixture();const snapshot=JSON.stringify(x.transactions);
  await x.pdf.onchange();x.el('#traceStatementPrepare').onclick();x.confirmAll();
  x.el('#traceStatementCompare').onclick();
  x.el('#traceStatementOpenActivity').onclick();
  assert.deepEqual(x.navigations,[['ca','2026-10']]);
  assert.equal(JSON.stringify(x.transactions),snapshot);
 });
 await test('month end calculator handles February leap years',()=>{
  assert.deepEqual(root.TraceMonthlyStatementUI.monthBoundaries('2028-02'),
   {from:'2028-02-01',to:'2028-02-29'});
 });
 await test('monthly UI explicitly prohibits automatic PDF extraction and mutation',()=>{
  const script=read('trace-statement-monthly-ui-1.0.0.js');
  assert.doesNotMatch(script,/fetch\s*\(|\.upsert\s*\(|\.insert\s*\(/);
  assert.match(script,/Limited local PDF text-layer suggestions/);
  assert.match(script,/Aucune ligne n’est approuvée/);
  assert.match(script,/TraceStatementPDFText\?\.scan/);
  assert.match(read('v5-app-5.37.0.js'),/if\(internationalPreviewMode\(\)\)window\.TraceMonthlyStatementUI\?\.mount/);
 });
 console.log(count+' fictional monthly PDF UX scenarios passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
