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
const compareSource=fs.readFileSync(path.join(root,'trace-statement-reconcile-1.0.0.js'),'utf8');
const start=source.indexOf('function normalizedCsvKey('),
 end=source.indexOf('/* Merchant suggestions never silently validate',start);
assert.ok(start>0&&end>start,'CSV parser+UI block missing');
const guardBegin=source.indexOf('async function csvEnsurePrivateAuditReady()');
const guardEnd=source.indexOf('// Invalid CSV bank lines',guardBegin);
assert.ok(guardBegin>0&&guardEnd>guardBegin,'CSV server readiness gate missing');
const body=source.slice(guardBegin,guardEnd)+source.slice(start,end);
let seq=0;
function scenario({currency='CAD',content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Cafe,-5.50\n',
 filename='octobre.csv',transactionRows=[],importRows=[],onSave,privateReady=true,onPrivacyCheck}={}){
 const accounts=[{id:'checking-la',type:'checking',owner:'la',currency,country:currency==='EUR'?'FR':'CA'}];
 const state={accounts,transactions:transactionRows.map(t=>({...t})),smartImports:importRows.map(t=>({...t}))};
 const dom=new Map(),events=[],writes=[],evidenceWrites=[];
 const node=id=>{
  if(!dom.has(id))dom.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,checked:false,dataset:{}});
  return dom.get(id);
 };
 node('#importFile').dataset.preferredAccount='checking-la';
 function FakeReader(){}
 FakeReader.prototype.readAsText=function(file){this.result=file.content;this.onload();};
 const win={};new Function('window',intlSource)(win);
 new Function('window',compareSource)(win);
 const money=n=>String(n)+' CAD';
 const context=new Function('FileReader','$','visibleBankAccounts','me','state',
  'window','accountType','shortAccountLabel','esc','smartExactBankAmount',
  'txDocId','traceSplit','saveDocument','renderAll','navigate','showTab','money','dateGapDays','console','internationalPreviewMode','client',
  body+'return {importFile};');
 const api=context(FakeReader,node,()=>accounts.filter(a=>!a.archived),'la',state,win,
  a=>a?.type||'other',a=>a?.name||'Compte',s=>String(s||''),
  v=>v==null||v===''?null:Number.isFinite(Number(v))&&Number(v)>0&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<1e-6?Number(v):null,
  ()=>'test_'+(++seq),()=>({split:{la:100,partner:0}}),
  async(collection,item)=>{
   if(collection==='transactions'){writes.push({...item});
    if(onSave)await onSave({item,state,accounts,writes});}
   else if(collection==='imports')evidenceWrites.push({...item});
   else throw Error('Unexpected collection '+collection);
  },()=>events.push('render'),p=>events.push('navigate:'+p),
  t=>events.push('tab:'+t),money,()=>0,{error:()=>{}},()=>false,
  {rpc:async(name)=>{assert.equal(name,'trace_csv_evidence_guard_ready');
   events.push('privacy-check');if(onPrivacyCheck)await onPrivacyCheck({state,accounts});return {data:privateReady,error:null};}});
 api.importFile({name:filename,type:'text/csv',size:content.length,content});
 Object.assign(node('#csvCol_date'),{value:'0'});
 Object.assign(node('#csvCol_name'),{value:'1'});
 Object.assign(node('#csvCol_amount'),{value:'2'});
 Object.assign(node('#csvCol_debit'),{value:'-1'});
 Object.assign(node('#csvCol_credit'),{value:'-1'});
 Object.assign(node('#csvDateFormat'),{value:'dmy'});
 Object.assign(node('#csvSign'),{value:'income'});
 Object.assign(node('#csvAccount'),{value:'checking-la'});
 return{state,accounts,api,node,events,writes,evidenceWrites,
  compare:win.TraceStatementReconcile.compare,amountOnAccount:win.TraceInternational.amountOnAccount,
  preview:()=>node('#csvPreview').onclick(),
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

test('monthly statement flags CSV pending rows as pending, never confirmed matching',async()=>{
 const s=scenario({currency:'EUR'});s.preview();await s.commit();
 const rows=s.writes.map((t,i)=>({
  id:'pdf-'+i,date:t.date,direction:'out',amount:t.bankAmount,currency:'EUR'
 }));
 const compare=()=>s.compare({account:s.accounts[0],fromDate:'2026-10-01',toDate:'2026-10-31',
  statementRows:rows,transactions:s.state.transactions,amountOnAccount:s.amountOnAccount});
 const initial=compare();
 assert.equal(initial.totals.pending,2);assert.equal(initial.totals.matched,0);
 assert.equal(initial.writes,0);assert.equal(initial.financialChanges,0);
 s.state.transactions[0].status='confirmed';
 const reviewed=compare();
 assert.equal(reviewed.totals.matched,1);assert.equal(reviewed.totals.pending,1);
 assert.equal(s.writes.length,2);
});
test('monthly comparison labels identical same-day purchases ambiguous instead of false uniqueness',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Cafe,-5.00\n20/10/2026,Cafe,-5.00\n';
 const s=scenario({content});s.preview();await s.commit();
 const rows=[{date:'2026-10-20',direction:'out',amount:5,currency:'CAD'},
  {date:'2026-10-20',direction:'out',amount:5,currency:'CAD'}];
 const report=s.compare({account:s.accounts[0],fromDate:'2026-10-01',toDate:'2026-10-31',
  statementRows:rows,transactions:s.state.transactions,amountOnAccount:s.amountOnAccount});
 assert.equal(report.totals.ambiguous,2);
 assert.equal(report.totals.matched,0);
});
test('monthly comparison highlights line absent in CSV-imported candidate journal',async()=>{
 const s=scenario();s.preview();await s.commit();
 const rows=[{date:'2026-10-20',direction:'out',amount:40,currency:'CAD'},
  {date:'2026-10-22',direction:'out',amount:15,currency:'CAD'}];
 const report=s.compare({account:s.accounts[0],fromDate:'2026-10-01',toDate:'2026-10-31',
  statementRows:rows,transactions:s.state.transactions,amountOnAccount:s.amountOnAccount});
 assert.equal(report.totals.pending,1);
 assert.equal(report.totals.missing,1);
 assert.equal(report.totals.matched,0);
 assert.equal(s.writes.length,2);
});

test('unreadable CSV lines survive import as non-financial evidence',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Source inconnue,??\n';
 const s=scenario({content});s.preview();s.node('#csvInvalidAcknowledged').checked=true;
 await s.commit();
 assert.equal(s.writes.length,1);
 assert.equal(s.evidenceWrites.length,1);
 assert.equal(s.state.smartImports.length,1);
 const ev=s.evidenceWrites[0];
 assert.equal(ev.kind,'csv_unparsed');assert.equal(ev.status,'pending_review');
 assert.equal(ev.accountId,'checking-la');assert.equal(ev.sourceIndex,3);
 assert.match(ev.rawText,/Source inconnue/);
 assert.equal(ev.amountCAD,undefined);assert.equal(ev.bankAmount,undefined);
 assert.ok(s.state.transactions.every(t=>t.status==='pending'));
});
test('same invalid source row is not recreated on an identical later import',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Source inconnue,??\n';
 const s=scenario({content});s.preview();s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 const again=scenario({content,transactionRows:s.state.transactions,importRows:s.state.smartImports});
 again.preview();again.node('#csvInvalidAcknowledged').checked=true;await again.commit();
 assert.equal(again.evidenceWrites.length,0);
 assert.equal(again.writes.length,0);
 assert.equal(again.state.smartImports.length,1);
});
test('changed unreadable source text on same file line blocks import completely',async()=>{
 const older=scenario({content:'Date,Description,Montant\n20/10/2026,Inconnu,??\n'});
 older.preview();older.node('#csvInvalidAcknowledged').checked=true;await older.commit();
 const changed=scenario({content:'Date,Description,Montant\n20/10/2026,Autre,??\n',
  importRows:older.state.smartImports});
 changed.preview();
 assert.match(changed.node('#csvPreviewResult').innerHTML,/Import suspendu/);
 assert.equal(changed.writes.length,0);assert.equal(changed.evidenceWrites.length,0);
});
test('all-invalid CSV still retains lines without a bank transaction',async()=>{
 const s=scenario({content:'Date,Description,Montant\n20/10/2026,Inconnu,??\n'});
 s.preview();
 assert.match(s.node('#csvPreviewResult').innerHTML,/id="csvCommit"/);
 s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 assert.equal(s.writes.length,0);assert.equal(s.evidenceWrites.length,1);
 assert.equal(s.state.transactions.length,0);
});
test('unreadable CSV cannot overwrite a previously interpreted bank row',()=>{
 const prior={id:'old',source:'csv',importFileName:'octobre.csv',
  csvSourceRowIndex:2,accountId:'checking-la',date:'2026-10-20',
  type:'expense',name:'Courses',bankAmount:40,status:'pending'};
 const s=scenario({content:'Date,Description,Montant\n20/10/2026,Courses,??\n',
  transactionRows:[prior]});s.preview();
 assert.match(s.node('#csvPreviewResult').innerHTML,/Import suspendu/);
 assert.equal(s.writes.length,0);
});
test('unreadable evidence survives later transaction import interruption',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Courses,-40.00\n21/10/2026,Inconnu,??\n';
 const s=scenario({content,onSave:async()=>{throw Error('Fictional RPC timeout')}});
 s.preview();s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 assert.equal(s.evidenceWrites.length,1);
 assert.equal(s.state.smartImports.length,1);
 assert.equal(s.state.transactions.length,0);
 assert.match(s.node('#importResult').textContent,/Import interrompu/);
});

test('too many uninterpretable CSV rows fail before storing any evidence',()=>{
 const rows=Array.from({length:101},(_,i)=>
  '20/10/2026,Non reconnu '+i+',??');
 const s=scenario({content:'Date,Description,Montant\n'+rows.join('\n')+'\n'});
 s.preview();
 assert.match(s.node('#csvPreviewResult').textContent,/100 lignes illisibles maximum/);
 assert.equal(s.writes.length,0);
 assert.equal(s.evidenceWrites.length,0);
});

test('CSV private evidence cannot be persisted when server security gate is missing',async()=>{
 const s=scenario({privateReady:false,
  content:'Date,Description,Montant\n20/10/2026,Courses,-40\n21/10/2026,Inconnu,??\n'});
 s.preview();s.node('#csvInvalidAcknowledged').checked=true;
 await s.commit();
 assert.equal(s.evidenceWrites.length,0);
 assert.equal(s.writes.length,0);
 assert.match(s.node('#importResult').textContent,/confidentialité des preuves CSV/);
});
test('valid-only CSV imports do not depend on the private-evidence capability',async()=>{
 const s=scenario({privateReady:false});
 s.preview();await s.commit();
 assert.equal(s.writes.length,2);assert.equal(s.evidenceWrites.length,0);
 assert.equal(s.events.includes('privacy-check'),false);
});
test('CSV privacy gate is verified before writing an unreadable record',async()=>{
 const s=scenario({content:'Date,Description,Montant\n20/10/2026,Inconnu,??\n'});
 s.preview();s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 assert.equal(s.evidenceWrites.length,1);
 assert.equal(s.events.filter(x=>x==='privacy-check').length,1);
});

test('account modified while awaiting privacy probe cancels every write in the CSV batch',async()=>{
 const content='Date,Description,Montant\n20/10/2026,Courses,-40\n21/10/2026,Non identifiable,??\n';
 const s=scenario({content,onPrivacyCheck:async({accounts})=>{
  accounts[0].currency='EUR';
 }});
 s.preview();s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 assert.equal(s.writes.length,0);
 assert.equal(s.evidenceWrites.length,0);
 assert.match(s.node('#importResult').textContent,/compte bancaire a changé/);
});

test('line that was unreadable in an earlier import cannot become a booked pending transaction silently',async()=>{
 const source='Date,Description,Montant\n20/10/2026,Cafe,??\n';
 const first=scenario({content:source});first.preview();
 first.node('#csvInvalidAcknowledged').checked=true;await first.commit();
 assert.equal(first.evidenceWrites.length,1);
 const fixed=scenario({content:'Date,Description,Montant\n20/10/2026,Cafe,-5.00\n',
  importRows:first.state.smartImports});
 fixed.preview();
 assert.match(fixed.node('#csvPreviewResult').innerHTML,/Import suspendu/);
 assert.doesNotMatch(fixed.node('#csvPreviewResult').innerHTML,/id="csvCommit"/);
 assert.equal(fixed.writes.length,0);
});
test('reviewed unreadable evidence remains immutable and prevents a new transaction on same physical CSV line',async()=>{
 const first=scenario({content:'Date,Description,Montant\n20/10/2026,Cafe,??\n'});
 first.preview();first.node('#csvInvalidAcknowledged').checked=true;await first.commit();
 const reviewed=first.state.smartImports.map(x=>({...x,status:'reviewed'}));
 const later=scenario({content:'Date,Description,Montant\n20/10/2026,Cafe,-5.00\n',
  importRows:reviewed});
 later.preview();
 assert.match(later.node('#csvPreviewResult').innerHTML,/Import suspendu/);
 assert.equal(later.writes.length,0);
});

test('long bank CSV filename is never silently truncated into a colliding source',()=>{
 const filename='octobre-'+('x'.repeat(112))+'.csv';
 const s=scenario({filename,content:'Date,Description,Montant\n20/10/2026,Inconnu,??\n'});
 s.preview();
 assert.match(s.node('#csvPreviewResult').textContent,/Nom de fichier CSV trop long/);
 assert.equal(s.writes.length,0);
 assert.equal(s.evidenceWrites.length,0);
});
test('overlong CSV bank row is retained with explicit incomplete-evidence flag',async()=>{
 const content='Date,Description,Montant\n20/10/2026,'+'DETAIL'.repeat(160)+',??\n';
 const s=scenario({content});s.preview();
 s.node('#csvInvalidAcknowledged').checked=true;await s.commit();
 assert.equal(s.evidenceWrites.length,1);
 assert.equal(s.evidenceWrites[0].rawText.length,650);
 assert.equal(s.evidenceWrites[0].rawTruncated,true);
 assert.equal(s.writes.length,0);
});
