'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
function fixture({allowReplace=false,unsupported=false,propose=null}={}){
 const root={URL:{createObjectURL:()=> 'blob:fictional',revokeObjectURL(){}},
  confirm:()=>allowReplace};
 vm.runInNewContext(read('trace-statement-evidence-1.0.0.js'),{window:root});
 const items=[
  {page:1,line:2,date:'2026-10-12',direction:'out',amount:40,name:'Food',rawText:'12/10/2026 | Food | DEBIT | 40,00'},
  {page:2,line:1,date:'2026-10-14',direction:'in',amount:200,name:'Pay',rawText:'14/10/2026 | Pay | CREDIT | 200,00'}];
 root.TraceStatementPDFText={scan:propose||async function(){
  if(unsupported)return{status:'unsupported',reason:'Complex font',proposals:[],unparsed:[]};
  return{status:'review_required',pages:2,proposals:items,unparsed:[{page:1,line:1,rawText:'Statement header'}],complete:false};
 }};
 vm.runInNewContext(read('trace-statement-monthly-ui-1.0.0.js'),{window:root});
 let manual=[],listeners={};const dom=new Map();
 const el=id=>{if(!dom.has(id))dom.set(id,{value:'',innerHTML:'',textContent:'',
  checked:false,files:[],dataset:{},onclick:null});return dom.get(id)};
 const rows=el('#traceStatementRows');
 Object.defineProperty(rows,'innerHTML',{get(){return ''},set(x){if(x==='')manual.splice(0)}});
 rows.querySelectorAll=()=>manual;
 rows.insertAdjacentHTML=()=>{
  const values={page:'1',line:String(manual.length+1),date:'',direction:'',amount:'',name:'',rawText:''};
  manual.push({values,querySelector:sel=>{
   const m=sel.match(/data-field="([^"]+)"/);
   if(m)return{get value(){return values[m[1]]},set value(v){values[m[1]]=v}};
   return{textContent:''};
  }});
 };
 el('#traceStatementReview').querySelector=el;
 const host={dataset:{},innerHTML:'',querySelector:el,addEventListener:(k,v)=>listeners[k]=v};
 let transactionReads=0;
 const ui=root.TraceMonthlyStatementUI.mount({host,accounts:()=>[
  {id:'ca',name:'Canada',currency:'CAD',type:'checking'}],
  transactions:()=>{transactionReads++;return[]},
  amountOnAccount:()=>null,currentMonth:'2026-10'});
 el('#traceStatementAccount').value='ca';el('#traceStatementCount').value='1';
 el('#traceStatementFrom').value='2026-10-01';el('#traceStatementTo').value='2026-10-31';
 const file=el('#traceStatementFile');
 file.files=[{name:'example.pdf',type:'application/pdf',size:400,
  slice:()=>({arrayBuffer:async()=>new Uint8Array([37,80,68,70,45]).buffer})}];
 return{ui,el,host,manual,listeners,file,getReads:()=>transactionReads};
}
let count=0;async function t(label,fn){await fn();count++;console.log('PASS '+label);}
async function main(){
 await t('PDF suggestions do not auto-populate or book',async()=>{
  const f=fixture();await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  assert.equal(f.manual.length,1);assert.equal(f.manual[0].values.date,'');
  assert.equal(f.ui.getReport(),null);assert.equal(f.getReads(),0);
  assert.equal(f.ui.getExtraction().proposals.length,2);
  assert.match(f.el('#traceStatementExtraction').innerHTML,/Aucune ligne n’est approuvée/);
 });
 await t('explicit adoption fills page and bank details but does not approve',async()=>{
  const f=fixture();await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  f.el('#traceStatementUseProposals').onclick();
  assert.equal(f.manual.length,2);assert.equal(f.manual[0].values.page,1);
  assert.equal(f.manual[0].values.date,'2026-10-12');
  assert.equal(f.manual[1].values.direction,'in');
  assert.equal(f.el('#traceStatementCount').value,'2');
  assert.equal(f.ui.getReport(),null);assert.equal(f.getReads(),0);
 });
 await t('adopted rows still require staged manual evidence approval',async()=>{
  const f=fixture();await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  f.el('#traceStatementUseProposals').onclick();
  f.el('#traceStatementPrepare').onclick();
  assert.match(f.el('#traceStatementReview').innerHTML,/data-statement-approve="0"/);
  assert.match(f.el('#traceStatementReview').innerHTML,/data-statement-approve="1"/);
  assert.equal(f.ui.getReport(),null);
 });
 await t('manually edited row cannot be overwritten without confirmation',async()=>{
  const f=fixture();f.manual[0].values.amount='90';
  await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  f.el('#traceStatementUseProposals').onclick();
  assert.equal(f.manual.length,1);assert.equal(f.manual[0].values.amount,'90');
 });
 await t('manual overwrite allowed only after consent',async()=>{
  const f=fixture({allowReplace:true});f.manual[0].values.name='My draft';
  await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  f.el('#traceStatementUseProposals').onclick();
  assert.equal(f.manual.length,2);assert.equal(f.manual[0].values.name,'Food');
 });
 await t('unsupported PDF is refused with no suggestions',async()=>{
  const f=fixture({unsupported:true});await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  assert.match(f.el('#traceStatementExtraction').innerHTML,/Complex font/);
  assert.doesNotMatch(f.el('#traceStatementExtraction').innerHTML,/id="traceStatementUseProposals"/);
  assert.equal(f.ui.getReport(),null);
 });
 await t('changing statement period disallows outside-date suggestions',async()=>{
  const f=fixture();await f.file.onchange();await f.el('#traceStatementExtract').onclick();
  f.el('#traceStatementFrom').value='2026-10-13';
  f.el('#traceStatementUseProposals').onclick();
  assert.equal(f.manual.length,1);assert.equal(f.manual[0].values.date,'');
 });
 await t('no network endpoints or financial writes in local UI',()=>{
  const txt=read('trace-statement-monthly-ui-1.0.0.js');
  assert.doesNotMatch(txt,/fetch\s*\(|\.upsert\s*\(|\.insert\s*\(/);
  assert.match(read('trace-international-preview.html'),/connect-src 'none'/);
 });
 console.log(count+' local PDF suggestions UI tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
