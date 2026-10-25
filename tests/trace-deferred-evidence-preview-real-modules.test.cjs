'use strict';
// Full candidate JS modules + simulated DOM, fictional staged PDF/CSV only.
// Real Node VM regression, NOT a real browser, PDF parser or bank connection.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const names=['trace-statement-evidence-1.0.0.js',
 'trace-deferred-statement-bridge-1.0.0.js',
 'trace-international-1.0.0.js','trace-deferred-debit-1.0.0.js',
 'trace-deferred-write-plan-1.0.0.js',
 'trace-deferred-purchase-evidence-1.0.0.js',
 'trace-deferred-bank-review-1.0.0.js',
 'trace-deferred-evidence-intake-1.0.0.js',
 'trace-deferred-evidence-lab-1.0.0.js'];
function mount(pathname='/trace-international-preview.html',preview=true){
 const els=new Map();
 function get(id){
  if(!els.has(id))els.set(id,{id,dataset:{},style:{},disabled:false,
   textContent:'',listeners:{},setAttribute(){},
   addEventListener(name,fn){this.listeners[name]=fn;},
   click(){this.listeners.click?.();},
   after(item){els.set(item.id,item);},
   set innerHTML(v){for(const found of v.matchAll(/id="([^"]+)"/g))get(found[1]);}});
  return els.get(id);
 }
 get('traceDeferredSandbox');
 const document={readyState:'complete',getElementById:get,
  createElement(){return{id:'',dataset:{},style:{},setAttribute(){},
   set innerHTML(v){for(const found of v.matchAll(/id="([^"]+)"/g))get(found[1]);}};}};
 const root={document,location:{pathname},__TRACE_INTERNATIONAL_PREVIEW__:preview};
 for(const filename of names)
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),{window:root});
 return{get,root};
}
test('full real module fictional preview starts without automatically attesting evidence',()=>{
 const h=mount(),p=h.get('traceDeferredDualEvidenceLab');
 assert.equal(p.dataset.reviewState,'pending');
 assert.equal(p.dataset.purchaseStatus,'needs_human_review');
 assert.equal(p.dataset.settlementStatus,'needs_human_review');
});
test('both independently reviewed statement lines never create transactions',()=>{
 const h=mount(),p=h.get('traceDeferredDualEvidenceLab');
 h.get('traceReviewPurchase').click();
 assert.equal(p.dataset.reviewState,'pending');
 h.get('traceReviewChecking').click();
 assert.equal(p.dataset.reviewState,'local-only');
 assert.match(h.get('traceDeferredEvidenceMessage').textContent,/0 transaction créée/);
});
test('card statement source-version change expires card review only',()=>{
 const h=mount(),p=h.get('traceDeferredDualEvidenceLab');
 h.get('traceReviewPurchase').click();h.get('traceReviewChecking').click();
 h.get('traceChangePurchaseSource').click();
 assert.equal(p.dataset.purchaseStatus,'stale_review');
 assert.equal(p.dataset.settlementStatus,'manual_review_current');
 assert.equal(p.dataset.reviewState,'pending');
});
test('checking source-version change expires checking review only',()=>{
 const h=mount(),p=h.get('traceDeferredDualEvidenceLab');
 h.get('traceReviewPurchase').click();h.get('traceReviewChecking').click();
 h.get('traceChangeCheckingSource').click();
 assert.equal(p.dataset.purchaseStatus,'manual_review_current');
 assert.equal(p.dataset.settlementStatus,'stale_review');
});
test('lab code cannot mount onto stable production route',()=>{
 for(const pathname of ['/index.html','/another.html']){
  const h=mount(pathname);
  assert.equal(h.get('traceDeferredDualEvidenceLab').dataset.reviewState,undefined);
 }
 const h=mount('/trace-international-preview.html',false);
 assert.equal(h.get('traceDeferredDualEvidenceLab').dataset.reviewState,undefined);
});
