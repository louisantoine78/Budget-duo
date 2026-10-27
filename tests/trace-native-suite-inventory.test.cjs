'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkCommittedSuiteInventory:check}=require('../scripts/trace-native-suite-inventory.cjs');
const tree='tests/alpha.test.cjs\ntests/beta.test.cjs\ntests/browser.browser.cjs\n';
test('exact committed suites, no extras, qualifies locally',()=>{
 const r=check({treeOutput:tree,files:['alpha.test.cjs','beta.test.cjs']});
 assert.equal(r.passed,true);assert.equal(r.trackedCount,2);
});
test('same count with swapped test names is never sufficient',()=>{
 const r=check({treeOutput:tree,files:['alpha.test.cjs','rogue.test.cjs']});
 assert.equal(r.passed,false);assert.deepEqual(r.missing,['tests/beta.test.cjs']);
 assert.deepEqual(r.unexpected,['tests/rogue.test.cjs']);
});
test('missing committed suite fails even if others succeed',()=>{
 const r=check({treeOutput:tree,files:['alpha.test.cjs']});
 assert.equal(r.passed,false);assert.deepEqual(r.missing,['tests/beta.test.cjs']);
});
test('untracked test is not silently executed',()=>{
 const r=check({treeOutput:tree,files:['alpha.test.cjs','beta.test.cjs','rogue.test.cjs']});
 assert.equal(r.passed,false);assert.deepEqual(r.unexpected,['tests/rogue.test.cjs']);
});
test('cannot certify without a real readable git tree',()=>{
 for(const r of [check(),check({treeOutput:'',files:['alpha.test.cjs']}),
  check({treeOutput:tree,files:['alpha.test.cjs','beta.test.cjs'],exitCode:128}),
  check({treeOutput:tree,files:['alpha.test.cjs','beta.test.cjs'],error:new Error('no git')})])
  assert.equal(r.passed,false);
});
test('a duplicated path or a duplicated checkout entry is invalid',()=>{
 for(const r of [check({treeOutput:tree+'tests/alpha.test.cjs\n',files:['alpha.test.cjs','beta.test.cjs']}),
  check({treeOutput:tree,files:['alpha.test.cjs','alpha.test.cjs','beta.test.cjs']})])
  assert.equal(r.passed,false);
});
test('regular non-test assets do not change expected test inventory',()=>{
 const r=check({treeOutput:tree+'index.html\ntrace-a.js\n',files:['beta.test.cjs','alpha.test.cjs']});
 assert.equal(r.passed,true);
});
