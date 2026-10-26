'use strict';
// Real app inbox functions, fake DOM and persistence; no financial writes.
// Native: node --test tests/trace-csv-unparsed-inbox.test.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const start=source.indexOf('function openCsvUnparsedReview('),end=source.indexOf('function renderActivity(){',start);
assert.ok(start>=0&&end>start,'CSV inbox and human review module missing');
const guardBegin=source.indexOf('async function csvEnsurePrivateAuditReady()');
const guardEnd=source.indexOf('// Invalid CSV bank lines',guardBegin);
assert.ok(guardBegin>0&&guardEnd>guardBegin,'CSV readiness check missing');
const code=source.slice(guardBegin,guardEnd)+source.slice(start,end);
function scenario({items=[{id:'unparsed-1',kind:'csv_unparsed',status:'pending_review',
 owner:'la',accountId:'la-bank',sourceFileName:'octobre.csv',sourceIndex:4,
 rawText:'20/10 | <script> | inconnu',createdAt:'2026-10-25T12:00:00Z'}],privateReady=true,onPrivacyCheck}={}){
 const state={smartImports:items.map(x=>({...x})),accounts:[{id:'la-bank',owner:'la',name:'Courant',type:'checking'}],
 transactions:[]};
 const elements=new Map(),events=[],saves=[],buttons=new Map();
 const el=id=>elements.get(id)||null;
 const parent={insertAdjacentHTML(){
  if(!elements.has('#traceCsvReviewQueue'))elements.set('#traceCsvReviewQueue',{
   hidden:false,innerHTML:'',querySelectorAll:()=>state.smartImports
    .filter(d=>d.kind==='csv_unparsed'&&d.status==='pending_review'&&d.owner==='la')
    .map(d=>{const btn={dataset:{csvUnparsedOpen:d.id}};buttons.set(d.id,btn);return btn;})
  });
 }};
 elements.set('#activityImport',parent);
 const esc=s=>String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const fn=new Function('state','$','me','visibleBankAccounts','openSheet','esc',
  'shortAccountLabel','saveDocument','closeSheet','renderAll','navigate','showTab','internationalPreviewMode','client',
  code+'return {renderCsvUnparsedReviewQueue,openCsvUnparsedReview};');
 const api=fn(state,el,'la',()=>state.accounts.filter(a=>a.owner==='la'),(name,markup)=>{
  events.push('open:'+name);elements.set('#sheetMarkup',{innerHTML:markup});
  for(const id of ['csvReviewChecked','csvReviewConfirm','csvReviewCancel','csvReviewError'])
   elements.set('#'+id,{checked:false,disabled:false,textContent:'',onclick:null});
 },esc,a=>a?.name||'Compte inconnu',
 async(collection,doc)=>{assert.equal(collection,'imports');saves.push({...doc});},
 ()=>events.push('close'),()=>events.push('render'),page=>events.push('navigate:'+page),
 tab=>events.push('tab:'+tab),()=>false,
 {rpc:async()=>{if(onPrivacyCheck)await onPrivacyCheck(state);return{data:privateReady,error:null};}});
 return{...api,state,el,saves,events,buttons};
}
test('unreadable CSV evidence is shown as safe escaped text in Imports',()=>{
 const s=scenario();s.renderCsvUnparsedReviewQueue();
 const html=s.el('#traceCsvReviewQueue').innerHTML;
 assert.match(html,/octobre\.csv/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/Lignes CSV non interprétées/);
});
test('only own bank evidence is visible in this account',()=>{
 const s=scenario({items:[{id:'not-mine',kind:'csv_unparsed',status:'pending_review',
 owner:'partner',accountId:'partner-bank',sourceFileName:'other.csv',sourceIndex:2}]});
 s.renderCsvUnparsedReviewQueue();
 assert.equal(s.el('#traceCsvReviewQueue').hidden,true);
});
test('human attestation is mandatory before closing unreadable evidence',async()=>{
 const s=scenario();s.renderCsvUnparsedReviewQueue();
 s.buttons.get('unparsed-1').onclick();
 assert.match(s.el('#sheetMarkup').innerHTML,/Aucune transaction|ne crée ni dépense/);
 await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,0);
 assert.match(s.el('#csvReviewError').textContent,/Vérifie le relevé/);
});
test('approved manual review stores import metadata but creates no transaction',async()=>{
 const s=scenario();s.renderCsvUnparsedReviewQueue();s.buttons.get('unparsed-1').onclick();
 s.el('#csvReviewChecked').checked=true;
 await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,1);
 assert.equal(s.saves[0].status,'reviewed');
 assert.equal(s.saves[0].kind,'csv_unparsed');
 assert.equal(s.state.smartImports[0].status,'reviewed');
 assert.equal(s.state.transactions.length,0);
 assert.deepEqual(s.events.slice(-3),['render','navigate:activity','tab:import']);
});
test('changing the source during review fails closed and does not save',async()=>{
 const s=scenario();s.renderCsvUnparsedReviewQueue();s.buttons.get('unparsed-1').onclick();
 s.state.smartImports[0].rawText='changed evidence';
 s.el('#csvReviewChecked').checked=true;
 await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,0);
 assert.match(s.el('#csvReviewError').textContent,/a changé/);
});

test('a removed SQL privacy gate prevents reviewing evidence, leaving it pending',async()=>{
 const s=scenario({privateReady:false});s.renderCsvUnparsedReviewQueue();
 s.buttons.get('unparsed-1').onclick();s.el('#csvReviewChecked').checked=true;
 await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,0);
 assert.equal(s.state.smartImports[0].status,'pending_review');
 assert.match(s.el('#csvReviewError').textContent,/confidentialité des preuves CSV/);
});

test('source changed during the awaited privacy probe cannot be marked reviewed',async()=>{
 const s=scenario({onPrivacyCheck:async state=>{
  state.smartImports[0].sourceFileName='replaced.csv';
 }});
 s.renderCsvUnparsedReviewQueue();s.buttons.get('unparsed-1').onclick();
 s.el('#csvReviewChecked').checked=true;await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,0);
 assert.equal(s.state.smartImports[0].status,'pending_review');
 assert.match(s.el('#csvReviewError').textContent,/a changé pendant/);
});

test('truncated bank evidence visibly requires consulting the complete CSV original',()=>{
 const s=scenario({items:[{id:'trimmed',kind:'csv_unparsed',status:'pending_review',
  owner:'la',accountId:'la-bank',sourceFileName:'octobre.csv',sourceIndex:6,
  rawText:'limited excerpt',rawTruncated:true}]});
 s.renderCsvUnparsedReviewQueue();
 s.buttons.get('trimmed').onclick();
 assert.match(s.el('#sheetMarkup').innerHTML,/Extrait incomplet/);
 assert.match(s.el('#sheetMarkup').innerHTML,/CSV bancaire original/);
});
test('changing truncation evidence after opening review blocks closure',async()=>{
 const s=scenario();s.renderCsvUnparsedReviewQueue();
 s.buttons.get('unparsed-1').onclick();
 s.state.smartImports[0].rawTruncated=true;
 s.el('#csvReviewChecked').checked=true;
 await s.el('#csvReviewConfirm').onclick();
 assert.equal(s.saves.length,0);
 assert.match(s.el('#csvReviewError').textContent,/a changé/);
});
