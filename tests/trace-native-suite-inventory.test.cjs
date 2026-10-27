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
test('real git ls-tree identifies a missing tracked test replaced by another',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'trace-git-tree-'));
 t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const git=(...args)=>spawnSync('git',args,{cwd:d,encoding:'utf8',timeout:10000});
 fs.mkdirSync(path.join(d,'tests'));
 fs.writeFileSync(path.join(d,'tests/expected.test.cjs'),'// fictional');
 assert.equal(git('init','-q','-b','sandbox').status,0);
 assert.equal(git('add','tests/expected.test.cjs').status,0);
 assert.equal(git('-c','user.name=QA','-c','user.email=qa@localhost','commit','-qm','fixture').status,0);
 const treeResult=git('ls-tree','-r','--name-only','HEAD','--','tests/');
 assert.equal(treeResult.status,0,treeResult.stderr);
 assert.equal(check({treeOutput:treeResult.stdout,files:['expected.test.cjs']}).passed,true);
 fs.rmSync(path.join(d,'tests/expected.test.cjs'));
 fs.writeFileSync(path.join(d,'tests/replacement.test.cjs'),'// untrusted');
 const mismatched=check({treeOutput:treeResult.stdout,files:['replacement.test.cjs']});
 assert.equal(mismatched.passed,false);
 assert.deepEqual(mismatched.missing,['tests/expected.test.cjs']);
 assert.deepEqual(mismatched.unexpected,['tests/replacement.test.cjs']);
});
