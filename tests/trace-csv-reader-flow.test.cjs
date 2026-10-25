'use strict';
// Integration-style harness of the REAL CSV importFile, parser, preview and
// commit callbacks. In-memory FileReader, DOM and RPC; NO real bank or Supabase.
// Native command: node --test tests/trace-csv-reader-flow.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const intlSource=fs.readFileSync(path.join(root,'trace-international-1.0.0.js'),'utf8');
const start=source.indexOf('function normalizedCsvKey('),
 end=source.indexOf('/* Merchant suggestions never silently validate',start);
assert.ok(start>0&&end>start,'CSV parser+UI block missing');
const body=source.slice(start,end);
let seq=0;
function scenario({currency='CAD',content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Cafe,-5.50\n',
 filename='octobre.csv',transactionRows=[],onSave}={}){
 const accounts=[{id:'checking-la',type:'checking',owner:'la',currency,country:currency==='EUR'?'FR':'CA'}];
 const state={accounts,transactions:transactionRows.map(t=>({...t}))};
 const dom=new Map(),events=[],writes=[];
 const node=id=>{
  if(!dom.has(id))dom.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,checked:false,dataset:{}});
  return dom.get(id);
 };
 node('#importFile').dataset.preferredAccount='checking-la';
 function FakeReader(){}
 FakeReader.prototype.readAsText=function(file){this.result=file.content;this.onload();};
 const win={};new Function('window',intlSource)(win);
 const money=n=>String(n)+' CAD';
 const context=new Function('FileReader','$','visibleBankAccounts','me','state',
  'window','accountType','shortAccountLabel','esc','smartExactBankAmount',
  'txDocId','traceSplit','saveDocument','renderAll','navigate','showTab','money','dateGapDays','console',
  body+'return {importFile};');
 const api=context(FakeReader,node,()=>accounts.filter(a=>!a.archived),'la',state,win,
  a=>a?.type||'other',a=>a?.name||'Compte',s=>String(s||''),
  v=>v==null||v===''?null:Number.isFinite(Number(v))&&Number(v)>0&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<1e-6?Number(v):null,
  ()=>'test_'+(++seq),()=>({split:{la:100,partner:0}}),
  async(collection,item)=>{
   assert.equal(collection,'transactions');writes.push({...item});
   if(onSave)await onSave({item,state,accounts,writes});
  },()=>events.push('render'),p=>events.push('navigate:'+p),
  t=>events.push('tab:'+t),money,()=>0,{error:()=>{}});
 api.importFile({name:filename,type:'text/csv',size:content.length,content});
 Object.assign(node('#csvCol_date'),{value:'0'});
 Object.assign(node('#csvCol_name'),{value:'1'});
 Object.assign(node('#csvCol_amount'),{value:'2'});
 Object.assign(node('#csvCol_debit'),{value:'-1'});
 Object.assign(node('#csvCol_credit'),{value:'-1'});
 Object.assign(node('#csvDateFormat'),{value:'dmy'});
 Object.assign(node('#csvSign'),{value:'income'});
 Object.assign(node('#csvAccount'),{value:'checking-la'});
 return{state,accounts,api,node,events,writes,preview:()=>node('#csvPreview').onclick(),
  commit:async()=>{const cb=node('#csvCommit').onclick;assert.equal(typeof cb,'function');await cb();}};
}
test('CSV FileReader to preview to pending CAD ledger; no confirmed booking',async()=>{
 const s=scenario();
 s.preview();
 assert.match(s.node('#csvPreviewResult').innerHTML,/2 lignes à vérifier/);
 await s.commit();
 assert.equal(s.state.transactions.length,2);
 assert.deepEqual(s.state.transactions.map(t=>t.bankAmount),[40,5.5]);
 assert.ok(s.state.transactions.every(t=>t.status==='pending'&&t.amountCAD===t.bankAmount));
 assert.equal(s.writes.length,2);
 assert.deepEqual(s.events.slice(-3),['render','navigate:activity','tab:review']);
});
test('same imported physical source rows are idempotent on reimport',async()=>{
 const first=scenario();first.preview();await first.commit();
 const second=scenario({transactionRows:first.state.transactions});
 second.preview();
 assert.match(second.node('#csvPreviewResult').innerHTML,/0 lignes à vérifier/);
 assert.equal(second.writes.length,0);
});
test('same merchant and price in two distinct physical rows remain two pending expenses',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Cafe,-5.00\n20/10/2026,Cafe,-5.00\n';
 const s=scenario({content});s.preview();await s.commit();
 assert.equal(s.writes.length,2);
 assert.notEqual(s.writes[0].csvSourceRowIndex,s.writes[1].csvSourceRowIndex);
});
test('source file collision prevents a clickable commit and creates no ledger entries',()=>{
 const prior={id:'older',source:'csv',importFileName:'octobre.csv',csvSourceRowIndex:2,
  accountId:'checking-la',date:'2026-10-20',type:'expense',name:'Courses',
  bankAmount:60,status:'pending'};
 const s=scenario({transactionRows:[prior]});s.preview();
 assert.match(s.node('#csvPreviewResult').innerHTML,/Import suspendu/);
 assert.doesNotMatch(s.node('#csvPreviewResult').innerHTML,/id="csvCommit"/);
 assert.equal(s.writes.length,0);
});
test('mapping edited after preview blocks every pending write',async()=>{
 const s=scenario();s.preview();
 s.node('#csvSign').value='expense';
 await s.commit();
 assert.equal(s.writes.length,0);
 assert.equal(s.state.transactions.length,0);
 assert.match(s.node('#importResult').textContent,/Colonnes ou compte modifiés/);
});
test('bank currency changed during asynchronous import stops later rows',async()=>{
 const s=scenario({onSave:async({writes,accounts})=>{
  if(writes.length===1)accounts[0].currency='EUR';
 }});
 s.preview();await s.commit();
 assert.equal(s.writes.length,1);
 assert.equal(s.state.transactions.length,1);
 assert.match(s.node('#importResult').textContent,/compte bancaire a changé/);
});
test('foreign EUR file stores native pending amount without fictitious CAD',async()=>{
 const s=scenario({currency:'EUR'});s.preview();await s.commit();
 assert.equal(s.writes.length,2);
 assert.ok(s.writes.every(t=>t.bankCurrency==='EUR'&&t.amountCAD===null&&t.rate===null));
});
test('partial import requires explicit acknowledgment of unreadable lines',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Cafe,??\n';
 const s=scenario({content});s.preview();
 assert.match(s.node('#csvPreviewResult').innerHTML,/id="csvInvalidAcknowledged"/);
 await s.commit();
 assert.equal(s.writes.length,0);
 assert.match(s.node('#csvImportWarnings').textContent,/Vérifie les lignes non interprétées/);
 s.node('#csvInvalidAcknowledged').checked=true;
 await s.commit();
 assert.equal(s.writes.length,1);
 assert.equal(s.state.transactions.length,1);
});
