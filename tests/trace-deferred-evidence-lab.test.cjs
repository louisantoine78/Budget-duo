'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const filename=path.join(__dirname,'..','trace-deferred-evidence-lab-1.0.0.js');
function mount({pathname='/trace-international-preview.html',enabled=true}={}){
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{
  id,dataset:{},disabled:false,textContent:'',style:{},listeners:{},
  setAttribute(){},addEventListener(k,f){this.listeners[k]=f;},
  click(){this.listeners.click?.();},after(child){elements.set('traceDeferredDualEvidenceLab',child);},
  set innerHTML(v){this.html=v;const ids=[...v.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
   ids.forEach(el);}
 });return elements.get(id);};
 el('traceDeferredSandbox');
 const window={location:{pathname},__TRACE_INTERNATIONAL_PREVIEW__:enabled,
  document:{readyState:'complete',getElementById:el,createElement(){return{
   dataset:{},style:{},setAttribute(){},
   set innerHTML(v){[...v.matchAll(/id="([^"]+)"/g)].forEach(m=>el(m[1]));}
  };}}};
 for(const filename of ['trace-statement-evidence-1.0.0.js',
  'trace-deferred-statement-bridge-1.0.0.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),{window});
 window.TraceInternational={resolveBooking(){}};
 window.TraceDeferredDebit={simulate(){}};
 window.TraceDeferredWritePlan={prepare(){return{kind:'deferred_write_plan',persistable:false,
  confirmed:false,document:{id:'demo',payerId:'la',accountId:'card-eur-demo',bankCurrency:'EUR'}};}};
 window.TraceDeferredPurchaseEvidence={review({statements,receipts}){
  const token=statements[0].sourceVersion;
  return{status:receipts.length?(receipts[0].snapshot===token?'manual_review_current':'stale_review'):
   'needs_human_review',reviewToken:token};}};
 window.TraceDeferredBankReview={reviewSnapshot({statement}){return statement.sourceVersion;}};
 window.TraceDeferredEvidenceIntake={review(a){
  const purchase=window.TraceDeferredPurchaseEvidence.review({
   statements:a.cardStatements,receipts:a.cardReceipts});
  const token=a.checkingStatements[0].sourceVersion;
  const bank=a.settlementReceipts.length?
   (a.settlementReceipts[0].snapshot===token?'manual_review_current':'stale_review'):
   'needs_human_review';
  return{purchaseStatus:purchase.status,settlementStatuses:[{status:bank}],
   localEvidenceReviewed:purchase.status==='manual_review_current'&&bank==='manual_review_current'};
 }};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{window});
 return{el,window,elements};
}
test('lab feature exists only in isolated preview route and flag',()=>{
 assert.equal(mount({enabled:false}).elements.has('traceDeferredDualEvidenceLab'),false);
 assert.equal(mount({pathname:'/index.html'}).elements.has('traceDeferredDualEvidenceLab'),false);
});
test('two separate attestations required for local review',()=>{
 const h=mount(),panel=h.el('traceDeferredDualEvidenceLab');
 assert.equal(panel.dataset.reviewState,'pending');
 h.el('traceReviewPurchase').click();
 assert.equal(panel.dataset.purchaseStatus,'manual_review_current');
 assert.equal(panel.dataset.reviewState,'pending');
 h.el('traceReviewChecking').click();
 assert.equal(panel.dataset.reviewState,'local-only');
 assert.match(h.el('traceDeferredEvidenceMessage').textContent,/0 transaction/);
});
test('changing card statement invalidates only purchase attestation',()=>{
 const h=mount(),panel=h.el('traceDeferredDualEvidenceLab');
 h.el('traceReviewPurchase').click();h.el('traceReviewChecking').click();
 h.el('traceChangePurchaseSource').click();
 assert.equal(panel.dataset.purchaseStatus,'stale_review');
 assert.equal(panel.dataset.settlementStatus,'manual_review_current');
 assert.equal(panel.dataset.reviewState,'pending');
});
test('changing checking statement invalidates only checking attestation',()=>{
 const h=mount(),panel=h.el('traceDeferredDualEvidenceLab');
 h.el('traceReviewPurchase').click();h.el('traceReviewChecking').click();
 h.el('traceChangeCheckingSource').click();
 assert.equal(panel.dataset.purchaseStatus,'manual_review_current');
 assert.equal(panel.dataset.settlementStatus,'stale_review');
});
test('missing financial modules disables all fictional review buttons',()=>{
 const h=mount();h.window.TraceDeferredWritePlan=null;
 const code=fs.readFileSync(filename,'utf8');
 assert.match(code,/unavailable\('contrôleurs requis absents\.'/);
 assert.doesNotMatch(code,/fetch\(|supabase|localStorage|indexedDB|XMLHttpRequest/i);
});
