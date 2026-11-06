'use strict';
// TRACE 5.37 current-HEAD release rehearsal fails closed and never touches production.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'scripts/trace-537-current-head-rehearsal.cjs'),'utf8');
const test=(name,fn)=>{fn();console.log('PASS '+name)};
test('report always denies production approval even if laboratory passes',()=>{
 assert.match(source,/productionReady:false/);
 assert.match(source,/laboratoryPassed=true/);
 assert.match(source,/manualRequired:MANUAL/);
 assert.match(source,/physicalIphone:false/);
});
test('current-HEAD rehearsal requires clean worktree and exact candidate branch',()=>{
 assert.match(source,/git.*rev-parse/);
 assert.match(source,/trace-5\.37\.0-international-accounts-fx/);
 assert.match(source,/Rehearsal requires a clean committed HEAD/);
 assert.match(source,/HEAD moved during QA/);
});
test('all browser, finance and offline tests are mandatory and the export is verified',()=>{
 for(const token of ['scripts/check-trace-537-release-gates.cjs',
  'scripts/export-trace-537-preview.mjs','tests/trace-candidate.browser.cjs',
  'tests/trace-537-auth-cutover.browser.cjs',
  'trace-browser-537-qa.cjs','TRACE_LAB_ROOT:site',
  'trace-lab-export-audit.json','sha256Verified:true',
  "browserSmoke(site,'webkit'","browserSmoke(site,'chromium'"]){
  assert.ok(source.includes(token),token);
 }
});
test('a missing browser dependency fails without running user or production code',()=>{
 const env={...process.env,TRACE_PGLITE_MODULE:'',TRACE_PLAYWRIGHT_MODULE:'',
  TRACE_CHROMIUM_EXECUTABLE:'',PLAYWRIGHT_BROWSERS_PATH:''};
 const p=spawnSync(process.execPath,['scripts/trace-537-current-head-rehearsal.cjs'],
  {cwd:root,env,encoding:'utf8',timeout:12000});
 assert.equal(p.status,2);
 const lines=p.stdout.trim().split(/\r?\n/),result=JSON.parse(lines.at(-1));
 assert.equal(result.laboratoryPassed,false);
 assert.equal(result.productionReady,false);
 assert.match(result.error,/TRACE_PGLITE_MODULE required/);
 assert.equal(result.tests.official,undefined);
});

