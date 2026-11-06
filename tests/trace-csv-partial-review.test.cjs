'use strict';
// Partial CSV review: avoid hidden loss of unparsed statement entries.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=source.indexOf('function csvPartialImportAllowed('),end=source.indexOf('function csvFingerprint(',begin);
assert.ok(begin>=0&&end>begin,'Partial import reviewer missing');
const allowed=new Function(source.slice(begin,end)+'return csvPartialImportAllowed;')();
test('fully interpreted CSV needs no extra acknowledgment',()=>{
 assert.equal(allowed(0,false),true);
 assert.equal(allowed(0,undefined),true);
});
test('partial CSV cannot silently discard unparsed lines',()=>{
 assert.equal(allowed(1,false),false);
 assert.equal(allowed(12,undefined),false);
 assert.equal(allowed(2,'true'),false);
});
test('user can acknowledge explicit separate review without losing valid pending rows',()=>{
 assert.equal(allowed(2,true),true);
});
test('invalid negative or fractional counts fail closed',()=>{
 for(const n of [-1,1.5,NaN,undefined])assert.equal(allowed(n,true),false);
});
test('actual CSV UI requires explicit acknowledgment before disabled commit state',()=>{
 assert.match(source,/id="csvInvalidAcknowledged"/);
 assert.match(source,/if\(!csvPartialImportAllowed\(newInvalidEvidence\.length/);
 assert.match(source,/newInvalidEvidence=invalidEvidence\.filter/);
 assert.match(source,/TRACE les conservera dans/);
 assert.match(source,/await saveDocument\('imports',entry\)/);
 assert.match(source,/sans opération bancaire ni incidence sur le budget/);
});
