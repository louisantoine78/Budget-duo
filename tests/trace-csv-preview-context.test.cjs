'use strict';
// Candidate CSV bank-state freeze: executes the real helper from v5-app-5.37.0.js.
// Native Node: node --test tests/trace-csv-preview-context.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=source.indexOf('function csvImportAccountSnapshot(');
const end=source.indexOf('function csvFingerprint(',begin);
assert.ok(begin>=0&&end>begin,'CSV account snapshot module missing');
const make=new Function('accountType','window',source.slice(begin,end)+'return csvImportAccountSnapshot;');
const accountType=a=>a?.type==='card'||/visa|mastercard|carte/i.test(a?.name||'')?'card':a?.type==='checking'?'checking':'other';
const snapshot=make(accountType,{TraceInternational:{
 currency:a=>a.currency||'CAD',country:a=>a.country||'CA'
}});
const sample={id:'fr-checking',type:'checking',owner:'la',currency:'EUR',country:'FR',name:'Courant France'};
test('eligible foreign checking account preserves native EUR evidence',()=>{
 const parsed=JSON.parse(snapshot(sample,'la'));
 assert.equal(parsed.currency,'EUR');assert.equal(parsed.country,'FR');
 assert.equal(parsed.kind,'checking');
});
test('historical CAD checking without explicit currency stays eligible',()=>{
 const parsed=JSON.parse(snapshot({id:'old',owner:'la',type:'checking'},'la'));
 assert.equal(parsed.currency,'CAD');
});
test('different owner, archived or missing accounts cannot persist CSV',()=>{
 for(const a of [undefined,{...sample,owner:'partner'}, {...sample,archived:true},
  {...sample,type:'saving'}, {...sample,paymentMode:'deferred'}])
  assert.throws(()=>snapshot(a,'la'),/Compte bancaire indisponible/);
});
test('currency, country, type and card linkage changes invalidate preview',()=>{
 const card={...sample,id:'visa',name:'Visa',type:'card',paymentMode:'credit',
  settlementAccountId:'fr-checking'};
 const saved=snapshot(card,'la');
 for(const change of [
  {currency:'CAD'},{country:'CA'},{type:'checking',name:'Courant'},
  {settlementAccountId:'other'}, {paymentMode:'immediate'}
 ])assert.notEqual(snapshot({...card,...change},'la'),saved);
});
test('normal name update does not invalidate native bank identity',()=>{
 assert.equal(snapshot({...sample,name:'Nouveau nom'},'la'),snapshot(sample,'la'));
});
test('commit path verifies reviewed mapping and refreshed bank state before each pending write',()=>{
 assert.match(source,/const mappingAtPreview=reviewedMapping\(\)/);
 assert.match(source,/reviewedMapping\(\)!==mappingAtPreview/);
 assert.match(source,/csvImportAccountSnapshot\(current,me\)!==accountAtPreview/);
 assert.match(source,/for\(const t of newEntries\)\{[\s\S]*?validateReview\(\)/);
 assert.match(source,/I\.currency\(account\)!==t\.bankCurrency/);
});
