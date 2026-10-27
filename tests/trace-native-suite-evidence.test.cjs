'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkSuiteResult}=require('../scripts/trace-native-suite-evidence.cjs');
const evaluate=(stdout,status=0)=>checkSuiteResult({stdout,status});
test('native seven passing cases',()=>{
 const r=evaluate('TAP version 13\n# tests 7\n# pass 7\n# fail 0\n');
 assert.equal(r.passed,true);assert.equal(r.reportedScenarios,7);
});
test('empty or skipped suites fail closed even on exit zero',()=>{
 for(const stdout of ['','# tests 0\n# pass 0\n# fail 0\n',
  '# tests 3\n# pass 0\n# fail 0\n# skipped 3\n'])
  assert.equal(evaluate(stdout).passed,false);
});
test('custom cases counted rather than single TAP wrapper',()=>{
 const r=checkSuiteResult({status:0,nativeSuite:false,stdout:'# PASS bank proof\n# PASS budget\n# tests 1\n# pass 1\n# fail 0\n'});
 assert.equal(r.passed,true);assert.equal(r.reportedScenarios,2);
});
test('explicit FAIL marker or native not-ok overrides exit zero',()=>{
 for(const stdout of ['PASS good\nFAIL lost cent\n',
  'not ok 1 - bad\n# tests 2\n# pass 1\n# fail 1\n'])
  assert.equal(evaluate(stdout).passed,false);
});
test('status, signal, and execution errors fail despite successful text',()=>{
 const stdout='PASS one\n# tests 1\n# pass 1\n# fail 0\n';
 for(const opts of [{status:1},{status:0,signal:'SIGTERM'},
   {status:0,error:new Error('timeout')}])
  assert.equal(checkSuiteResult({...opts,stdout}).passed,false);
});
test('contradictory or incomplete TAP summaries never authorize QA',()=>{
 for(const stdout of ['# tests 1\n# pass 3\n# fail 0\n',
  '# tests 5\n','# tests 5\n# fail 0\n'])
  assert.equal(evaluate(stdout).passed,false);
});
test('unrelated prose does not masquerade as test scenarios',()=>{
 assert.equal(evaluate('PASSAGE after deploy\n').passed,false);
});

test('an empty legacy script cannot inherit a passing TAP wrapper',()=>{
 const stdout='TAP version 13\n1..1\n# tests 1\n# pass 1\n# fail 0\n';
 const r=checkSuiteResult({status:0,stdout,nativeSuite:false});
 assert.equal(r.passed,false);assert.equal(r.reportedScenarios,0);
});
test('legacy script with two PASS cases retains two rather than wrapper count',()=>{
 const stdout='# PASS bank\n# PASS checking\n# tests 1\n# pass 1\n# fail 0\n';
 const r=checkSuiteResult({status:0,stdout,nativeSuite:false});
 assert.equal(r.passed,true);assert.equal(r.reportedScenarios,2);
});
test('detect true Node test imports while ignoring comments and legacy test helpers',()=>{
 const {sourceUsesNodeTest}=require('../scripts/trace-native-suite-evidence.cjs');
 for(const v of ["const {test}=require('node:test')",
   'const test=require("test")',"import test from 'node:test'"])
   assert.equal(sourceUsesNodeTest(v),true);
 for(const v of ["const test=(name,fn)=>fn()", '// node:test only comment',
   "const assert=require('node:assert/strict')"])
   assert.equal(sourceUsesNodeTest(v),false);
});
test('single real node:test case is valid without printed legacy PASS markers',()=>{
 assert.equal(checkSuiteResult({status:0,nativeSuite:true,
  stdout:'# tests 1\n# pass 1\n# fail 0\n'}).passed,true);
});

test('one ignored, TODO or cancelled case never counts as an entirely passing native suite',()=>{
 const base='# tests 2\n# pass 1\n# fail 0\n';
 for(const marker of ['# skipped 1\n','# todo 1\n','# cancelled 1\n']){
  const report=evaluate(base+marker);
  assert.equal(report.passed,false,marker);
  assert.equal(report.reportedScenarios,0,marker);
 }
 // A maliciously contradictory summary must fail even if it says all passed.
 for(const marker of ['# skipped 1\n','# todo 1\n','# cancelled 1\n'])
  assert.equal(evaluate('# tests 2\n# pass 2\n# fail 0\n'+marker).passed,false);
});
test('native child-process TAP with a skipped banking case is rejected',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trace-tap-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'sandbox.test.cjs');
 fs.writeFileSync(file,"const {test}=require('node:test');test('ok',()=>{});test.skip('bank proof not checked',()=>{});");
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const run=spawnSync(process.execPath,['--test','--test-reporter=tap',file],
  {encoding:'utf8',timeout:10000,env});
 assert.equal(run.status,0,run.stderr);
 assert.match(run.stdout,/# skipped 1/);
 assert.equal(checkSuiteResult({status:run.status,stdout:run.stdout}).passed,false);
});

test('commentary and quoted import examples never masquerade as native suites',()=>{
 const {sourceUsesNodeTest}=require('../scripts/trace-native-suite-evidence.cjs');
 for(const source of [
  "// const {test}=require('node:test')\nconsole.log('PASS financial')",
  "/* import test from 'node:test' */\nconsole.log('PASS financial')",
  'const note = "require(\\\'node:test\\\')"; console.log("PASS financial")',
  'const example = `import test from "node:test"`; console.log("PASS financial")',
  "const note = 'require(\"node:test\")';\nconsole.log('PASS financial')",
 ]) assert.equal(sourceUsesNodeTest(source),false,source);
});
test('native imports remain detectable among comments and unrelated literal strings',()=>{
 const {sourceUsesNodeTest}=require('../scripts/trace-native-suite-evidence.cjs');
 for(const source of [
  "// noop\nconst {test}=require('node:test');",
  "/* noop */ import {test} from 'node:test';",
  "import 'node:test';",
  'const test = require("test");',
  "require('node:test').test('ok',()=>{});",
 ]) assert.equal(sourceUsesNodeTest(source),true,source);
});
