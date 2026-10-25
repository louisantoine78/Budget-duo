'use strict';
// Real TRACE duplicate review handlers, fictional OCR rows and DOM.
// Consent must be specific to reviewed evidence, not a reusable authorization.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');
const guide=fs.readFileSync(path.join(__dirname,'..','trace-import-guide-1.2.1.js'),'utf8');
const movement=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8');
function get(name,end){
 const i=source.indexOf('function '+name+'('),j=source.indexOf('function '+end+'(',i);
 assert.ok(i>=0&&j>i,'Source handler not found '+name);return source.slice(i,j);
}
function fixture({currency='CAD'}={}){
 const window={};new Function('window',guide)(window);new Function('window',movement)(window);
 window.TraceDuplicateCompare={render:()=>'<div>Fictional comparison</div>'};
 const bank={id:'bank',owner:'la',type:'checking',currency};
 const draft={id:'ocr1',kind:'smart_draft',accountId:'bank',name:'Librairie',
  amount:40,date:'2026-10-12',status:'pending'};
 let matches=[{id:'existing',status:'unconfirmed',exact:true,date:'2026-10-12',
  amount:40,name:'Librairie'}];
 const action={dataset:{duplicateBlocked:'no'},disabled:false,textContent:''};
 const vals={'.smart-date':{value:'2026-10-12'},'.smart-name':{value:'Librairie'},
  '.smart-amount':{value:'40'},'.smart-type':{value:'expense'},
  '.smart-direction':{value:'out'},'.smart-approve':action,
  '.smart-category':{selectedOptions:[{textContent:'Livres'}]},
  '.smart-foreign-nature-confirm':{checked:true},'.trace-review-state':{textContent:''}};
 const slot={checkbox:null,_html:'',querySelector(s){return s==='.smart-duplicate-confirm'?this.checkbox:null;}};
 Object.defineProperty(slot,'innerHTML',{
  get(){return this._html;},set(s){this._html=s;
   this.checkbox=s.includes('class="smart-duplicate-confirm"')?
    {checked:/class="smart-duplicate-confirm" checked/.test(s),
     addEventListener(event,cb){if(event==='change')this.onChange=cb}}:null;
  }
 });
 vals['.trace-smart-risk-slot']=slot;
 const el={dataset:{smartId:'ocr1',bankDirection:'out',duplicateReviewSignature:''},
  classList:{toggle:()=>{}},querySelector:key=>key==='.smart-duplicate-confirm'?slot.checkbox:vals[key]};
 const bridge=()=>({smartDrafts:()=>[draft],smartDuplicateMatches:()=>matches,
  inspect:()=>[{status:'possible'}],accounts:()=>[bank],currentOwner:()=> 'la'});
 const exec=new Function('window','bridge','account','esc','money',
  get('applyApprovalConstraints','synchronizeRow')+
  get('updateDuplicateReview','readRow')+'return updateDuplicateReview;');
 const update=exec(window,bridge,'bank',x=>String(x),n=>String(n));
 return {update,el,slot,action,vals,setMatches:arr=>{matches=arr;}};
}
test('potential OCR duplicate disables save until explicit comparison',()=>{
 const c=fixture();c.update(c.el);
 assert.equal(c.action.disabled,true);
 assert.equal(c.slot.checkbox.checked,false);
 c.slot.checkbox.checked=true;c.slot.checkbox.onChange();
 assert.equal(c.action.disabled,false);
});
test('editing bank amount invalidates previous duplicate attestation',()=>{
 const c=fixture();c.update(c.el);c.slot.checkbox.checked=true;c.slot.checkbox.onChange();
 c.vals['.smart-amount'].value='41';c.update(c.el);
 assert.equal(c.slot.checkbox.checked,false);assert.equal(c.action.disabled,true);
});
test('changing OCR date and merchant invalidates previous duplicate attestation',()=>{
 const c=fixture();c.update(c.el);c.slot.checkbox.checked=true;
 c.vals['.smart-date'].value='2026-10-13';c.update(c.el);
 assert.equal(c.slot.checkbox.checked,false);
 c.slot.checkbox.checked=true;c.vals['.smart-name'].value='Café';c.update(c.el);
 assert.equal(c.slot.checkbox.checked,false);
});
test('different matched transaction evidence expires duplicate review',()=>{
 const c=fixture();c.update(c.el);c.slot.checkbox.checked=true;
 c.setMatches([{id:'another',status:'unconfirmed',exact:true,date:'2026-10-12',
  name:'Librairie',amount:40}]);
 c.update(c.el);assert.equal(c.slot.checkbox.checked,false);assert.equal(c.action.disabled,true);
});
test('same unchanged OCR and duplicate evidence preserve reviewed attestation',()=>{
 const c=fixture();c.update(c.el);c.slot.checkbox.checked=true;
 c.update(c.el);assert.equal(c.slot.checkbox.checked,true);assert.equal(c.action.disabled,false);
});
test('legacy-only financial type cannot re-enable smart confirmation',()=>{
 const c=fixture();c.update(c.el);c.slot.checkbox.checked=true;
 c.vals['.smart-type'].value='friend_payment_settlement';c.update(c.el);
 assert.equal(c.action.disabled,true);
});
test('recorded same-day expense duplicate remains blocked even with consent',()=>{
 const c=fixture();c.setMatches([{id:'recorded',status:'recorded',
  exact:true,date:'2026-10-12',name:'Librairie',amount:40}]);
 c.update(c.el);assert.equal(c.action.disabled,true);
 assert.equal(c.action.dataset.duplicateBlocked,'yes');
 assert.equal(c.slot.checkbox,null);
});
test('CAD no-duplicate state clears old review fingerprint',()=>{
 const c=fixture();c.update(c.el);
 c.setMatches([]);
 // This bridge has a fixed possible inspection, so risk remains; safety requires
 // at least the new fingerprint not to reuse the old checked authorization.
 c.slot.checkbox.checked=true;c.update(c.el);
 assert.equal(c.slot.checkbox.checked,false);
});
