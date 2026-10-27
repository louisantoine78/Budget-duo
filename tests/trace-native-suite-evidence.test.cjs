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
 const r=evaluate('# PASS bank proof\n# PASS budget\n# tests 1\n# pass 1\n# fail 0\n');
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
