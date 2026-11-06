'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const rootPath=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(rootPath,name),'utf8');
const program=['trace-deferred-debit-1.0.0.js','trace-deferred-bank-review-1.0.0.js',
 'trace-deferred-lab-ui-1.0.0.js'];
function harness(options={}){
 const els=new Map(),events={};
 function el(id){
  if(!els.has(id)){
   const listeners={};
   els.set(id,{id,value:id==='traceDeferredAmount'?'12.35':
    id==='traceDeferredActualDate'?'2026-11-05':'',
    checked:false,disabled:false,textContent:'',dataset:{},
    addEventListener(name,fn){listeners[name]=fn;},
    change(){listeners.change?.();},click(){listeners.click?.();}});
  }
  return els.get(id);
 }
 const document={readyState:'complete',getElementById:el,
  addEventListener(name,fn){events[name]=fn;}};
 const window={location:{pathname:options.path||'/trace-international-preview.html'},
  __TRACE_INTERNATIONAL_PREVIEW__:options.preview!==false,document};
 let requests=0;
 window.fetch=()=>{requests++;throw Error('No network allowed');};
 for(const p of program)vm.runInNewContext(read(p),{window});
 return{els:el,window,requests:()=>requests};
}
let count=0;function test(label,fn){fn();count++;console.log('PASS '+label);}
test('module only runs in fictional preview with correct pathname',()=>{
 const a=harness({preview:false});assert.equal(a.els('traceDeferredSandbox').dataset.simulated,undefined);
 const b=harness({path:'/index.html'});assert.equal(b.els('traceDeferredSandbox').dataset.simulated,undefined);
});
test('confirmed partial payment displays a neutral budget and correct remainder',()=>{
 const {els,requests}=harness();
 assert.equal(els('traceDeferredSandbox').dataset.simulated,'true');
 assert.match(els('traceDeferredBudget').textContent,/40/);
 assert.match(els('traceDeferredPaid').textContent,/12,35/);
 assert.match(els('traceDeferredRemaining').textContent,/27,65/);
 assert.match(els('traceDeferredBank').textContent,/-12,35/);
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'needs_human_review');
 assert.equal(requests(),0);
});
test('pending payment never reduces liability or checking balance',()=>{
 const {els}=harness();
 els('traceDeferredPending').checked=true;els('traceDeferredPending').change();
 assert.match(els('traceDeferredPaid').textContent,/0,00/);
 assert.match(els('traceDeferredRemaining').textContent,/40,00/);
 assert.match(els('traceDeferredBank').textContent,/0,00/);
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'pending_review');
 assert.equal(els('traceDeferredReview').disabled,true);
});
test('full payment remains a partial-mode installment and clears debt exactly',()=>{
 const {els}=harness();els('traceDeferredAmount').value='40';els('traceDeferredRun').click();
 assert.match(els('traceDeferredRemaining').textContent,/0,00/);
});
test('fee and refund are budgeted once, never as salary or duplicated payment',()=>{
 const {els}=harness();els('traceDeferredFee').checked=true;
 els('traceDeferredRefund').checked=true;els('traceDeferredRun').click();
 assert.match(els('traceDeferredBudget').textContent,/32,29/);
 assert.match(els('traceDeferredRemaining').textContent,/19,94/);
});
test('payment exceeding balance is blocked with no numeric values',()=>{
 const {els}=harness();els('traceDeferredAmount').value='1000';els('traceDeferredRun').click();
 assert.equal(els('traceDeferredSandbox').dataset.simulated,'false');
 assert.equal(els('traceDeferredRemaining').textContent,'—');
 assert.match(els('traceDeferredMessage').textContent,/dépasse/);
});
test('payment in thirds of a cent rejected without implicit rounding',()=>{
 const {els}=harness();els('traceDeferredAmount').value='10.005';els('traceDeferredRun').click();
 assert.equal(els('traceDeferredSandbox').dataset.simulated,'false');
});
test('manual review changes only advisory status, never finances',()=>{
 const {els}=harness(),before=els('traceDeferredRemaining').textContent;
 els('traceDeferredReview').click();
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'manual_review_current');
 assert.equal(els('traceDeferredRemaining').textContent,before);
 assert.match(els('traceDeferredMessage').textContent,/Aucune confirmation bancaire/);
});
test('changing an input invalidates previous review state',()=>{
 const {els}=harness();els('traceDeferredReview').click();
 els('traceDeferredAmount').value='13';els('traceDeferredAmount').change();
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'needs_human_review');
});
test('no app data, database or network dependencies are referenced',()=>{
 const ui=read('trace-deferred-lab-ui-1.0.0.js');
 assert.doesNotMatch(ui,/supabase|localStorage|indexedDB|fetch\(|XMLHttpRequest|client\./i);
});
console.log(count+' fictional deferred lab UI scenarios passed');

test('late bank date is explicit, not an extra budget purchase',()=>{
 const {els,requests}=harness();
 els('traceDeferredActualDate').value='2026-11-08';
 els('traceDeferredActualDate').change();
 assert.equal(els('traceDeferredSandbox').dataset.simulated,'true');
 assert.match(els('traceDeferredDates').textContent,/\+3 jour/);
 assert.match(els('traceDeferredBudget').textContent,/40/);
 assert.match(els('traceDeferredPaid').textContent,/12,35/);
 assert.match(els('traceDeferredBank').textContent,/-12,35/);
 assert.equal(requests(),0);
});
test('early bank debit remains distinct from planned maturity date',()=>{
 const {els}=harness();
 els('traceDeferredActualDate').value='2026-11-04';
 els('traceDeferredActualDate').change();
 assert.match(els('traceDeferredDates').textContent,/-1 jour/);
 assert.match(els('traceDeferredRemaining').textContent,/27,65/);
});
test('invalid real bank dates fail closed and never fabricate a balance',()=>{
 const {els}=harness();
 for(const value of ['2026-02-30','2026-10-01','']){
  els('traceDeferredActualDate').value=value;
  els('traceDeferredActualDate').change();
  assert.equal(els('traceDeferredSandbox').dataset.simulated,'false');
  assert.equal(els('traceDeferredPaid').textContent,'—');
 }
});
test('edit of observed bank date invalidates a prior human review',()=>{
 const {els}=harness();els('traceDeferredReview').click();
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'manual_review_current');
 els('traceDeferredActualDate').value='2026-11-08';
 els('traceDeferredActualDate').change();
 assert.equal(els('traceDeferredSandbox').dataset.reviewStatus,'needs_human_review');
});
