'use strict';
/* Real statement staging, bridge and preview UI with fake DOM and in-memory
 * PDF bytes. Native Node tests when checkout is available; no real browser,
 * import persistence, Supabase, or real document content. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files=['trace-statement-evidence-1.0.0.js',
 'trace-deferred-statement-bridge-1.0.0.js',
 'trace-deferred-statement-review-ui-1.0.0.js'];
function setup(options={}){
 const root={__TRACE_INTERNATIONAL_PREVIEW__:options.preview!==false,
  location:{pathname:options.pathname||'/trace-international-preview.html'},
  crypto:options.noCrypto?null:{subtle:{digest:options.digest||
   (async()=>new Uint8Array(32).fill(7).buffer)}}};
 for(const file of files)vm.runInNewContext(
  fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{window:root});
 const account={id:'account',owner:'la',type:options.kind||'card',
  currency:'EUR',...options.account};
 const date='2026-10-12',direction=options.direction||'out';
 const row={page:1,line:1,rawText:'Relevé fictif 40,00',
  date,name:'Courses fictives',...(direction==='out'?{debit:'40,00'}:{credit:'40,00'})};
 const staged=root.TraceStatementEvidence.stage({
  documentId:'document-fictif',accountId:'account',currency:'EUR',
  fromDate:'2026-10-01',toDate:'2026-10-31',
  rows:options.rows||[row]});
 const approvals=staged.ready.map(r=>({id:r.id,evidenceKey:r.evidenceKey,confirmed:true}));
 const bytes=options.fileBytes||new Uint8Array([37,80,68,70,45,10]);
 const file={name:'fiction.pdf',type:'application/pdf',size:bytes.byteLength,
  arrayBuffer:async()=>bytes.buffer,...options.file};
 let active=options.active!==false,nodes={},selectors=[],html='',events={};
 const host={
  addEventListener(name,fn){events[name]=fn;},
  querySelector(s){return nodes[s]||null;},
  querySelectorAll(s){return s==='[data-deferred-classify]'?selectors:[];},
  set innerHTML(value){
   html=value;
   selectors=[...value.matchAll(/data-deferred-classify="(\d+)"/g)].map(()=>({value:''}));
   nodes={'[data-deferred-prepare]':{disabled:false,onclick:null},
    '[data-deferred-result]':{textContent:''},
    '[data-deferred-complete]':{checked:false}};
  },
  get innerHTML(){return html;}
 };
 const review=root.TraceDeferredStatementReviewUI.mount({
  host,staged,approvals,file,account,active:()=>active});
 return{root,review,host,staged,approvals,file,selectors:()=>selectors,
  result:()=>nodes['[data-deferred-result]'],
  button:()=>nodes['[data-deferred-prepare]'],
  attest:()=>nodes['[data-deferred-complete]'],
  choose:(kind=options.kind==='checking'?'checking_debit':
   direction==='in'?'card_refund':'card_purchase')=>{
    selectors.forEach(s=>s.value=kind);nodes['[data-deferred-complete]'].checked=true;},
  deactivate:()=>{active=false;},
  change:()=>events.change?.()};
}
test('preview-only feature never mounts in production or without flag',()=>{
 assert.equal(setup({preview:false}).review,null);
 assert.equal(setup({pathname:'/index.html'}).review,null);
});
test('reviewed card PDF classification prepares local-only source in exact EUR',async()=>{
 const h=setup();h.choose();await h.button().onclick();
 const s=h.review.getLocalStatement();
 assert.equal(s.rows.length,1);assert.equal(s.rows[0].type,'card_purchase');
 assert.equal(s.rows[0].purchaseDate,'2026-10-12');
 assert.equal(s.rows[0].amount,40);assert.equal(s.currency,'EUR');
 assert.match(s.sourceId,/^sha256:/);
 assert.match(s.importId,/^local-pdf:/);
 assert.match(h.result().textContent,/Aucune transaction créée/);
});
test('checking debit classification prepares a checking document, not a card expense',async()=>{
 const h=setup({kind:'checking'});h.choose();await h.button().onclick();
 assert.equal(h.review.getLocalStatement().rows[0].type,'checking_debit');
 assert.equal(h.review.getLocalStatement().rows[0].debitDate,'2026-10-12');
});
test('no automatic classification, human attestation or bank approval',async()=>{
 const h=setup();await h.button().onclick();
 assert.equal(h.review.getLocalStatement(),null);
 assert.match(h.result().textContent,/Classe toutes les lignes/);
 h.selectors()[0].value='card_purchase';
 await h.button().onclick();assert.equal(h.review.getLocalStatement(),null);
});
test('wrong direction/financial nature fails closed',async()=>{
 const h=setup();h.choose('card_refund');await h.button().onclick();
 assert.equal(h.review.getLocalStatement(),null);
 assert.match(h.result().textContent,/incohérente|Classification|Ligne/i);
});
test('a later classification edit clears a previous local document',async()=>{
 const h=setup();h.choose();await h.button().onclick();
 assert.ok(h.review.getLocalStatement());
 h.selectors()[0].value='card_fee';h.change();
 assert.equal(h.review.getLocalStatement(),null);
});
test('withdrawn full-document attestation clears a prepared document',async()=>{
 const h=setup();h.choose();await h.button().onclick();
 h.attest().checked=false;h.change();
 assert.equal(h.review.getLocalStatement(),null);
});
test('edited bank amount after staging blocks the bridge even with old approvals',async()=>{
 const h=setup();h.choose();h.staged.ready[0].amount=99;
 await h.button().onclick();assert.equal(h.review.getLocalStatement(),null);
});
test('changing account or PDF identity while digest waits aborts without a document',async()=>{
 let resume;const promise=new Promise(resolve=>resume=resolve);
 const h=setup({digest:async()=>{await promise;return new Uint8Array(32).buffer;}});
 h.choose();const working=h.button().onclick();h.deactivate();resume();
 await working;assert.equal(h.review.getLocalStatement(),null);
 assert.match(h.result().textContent,/modifié/);
});
test('no crypto digest refuses document identity instead of guessing from file name',async()=>{
 const h=setup({noCrypto:true});h.choose();await h.button().onclick();
 assert.equal(h.review.getLocalStatement(),null);
 assert.match(h.result().textContent,/SHA-256/);
});
test('invalid PDF signature rejects even if the extension is .pdf',async()=>{
 const h=setup({fileBytes:new Uint8Array([0,0,0,0,0,0])});
 h.choose();await h.button().onclick();
 assert.equal(h.review.getLocalStatement(),null);
 assert.match(h.result().textContent,/signature invalide/);
});
test('every line of a multirow document must be classified',async()=>{
 const h=setup({rows:[
  {page:1,line:1,rawText:'One',date:'2026-10-12',debit:'25,00'},
  {page:1,line:2,rawText:'Two',date:'2026-10-12',debit:'15,00'}
 ]});
 h.selectors()[0].value='card_purchase';h.attest().checked=true;
 await h.button().onclick();assert.equal(h.review.getLocalStatement(),null);
 h.selectors()[1].value='card_fee';await h.button().onclick();
 assert.equal(h.review.getLocalStatement().rows.length,2);
});
test('unknown account type and account mismatch never mount',()=>{
 assert.equal(setup({kind:'investment'}).review,null);
 assert.equal(setup({account:{id:'wrong'}}).review,null);
});
test('read-only source code contains no network or persistence API calls',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..',files[2]),'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|indexedDB|localStorage|\.rpc\s*\(/);
});
