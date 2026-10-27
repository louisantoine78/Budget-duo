#!/usr/bin/env node
// Local-only QA. No CI, server, database, credentials or network calls.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {checkSuiteResult,sourceUsesNodeTest} from './trace-native-suite-evidence.cjs';
import {checkLabStaticInventory} from './trace-preview-static-inventory.cjs';
import {checkCommittedSuiteInventory} from './trace-native-suite-inventory.cjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reportIndex=process.argv.indexOf('--report');
const reportPath=reportIndex>=0?process.argv[reportIndex+1]:null;
const preflightOnly=process.argv.includes('--preflight');
// Gate A baseline: 106 committed *.test.cjs suites as of 27 Oct 2026.
// A partial checkout must never qualify because its surviving suites pass.
const MINIMUM_TEST_FILES=106;
if(reportIndex>=0&&!reportPath)throw Error('--report requires an output path');
const active=new Set(['sw.js','trace-international-preview-sw.js','trace-pdfjs-local-loader-1.0.0.mjs']);
for(const entry of ['index.html','trace-international-preview.html']){
 const html=readFileSync(join(root,entry),'utf8');
 for(const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)){
  if(!/^https?:/.test(m[1]))active.add(m[1].split('?')[0]);
 }
}
for(const name of readdirSync(join(root,'scripts')))
 if(name.endsWith('.mjs'))active.add('scripts/'+name);
for(const name of readdirSync(join(root,'tests')))
 if(/\.(?:browser|integration)\.cjs$/.test(name))active.add('tests/'+name);
const report={runtime:process.version,network:'not used',financialData:'fictional only',
 syntax:[],suites:[],passed:false};
const inventory=checkLabStaticInventory({
 html:readFileSync(join(root,'trace-international-preview.html'),'utf8'),
 manifestText:readFileSync(join(root,'trace-international-preview.webmanifest'),'utf8'),
 workerSource:readFileSync(join(root,'trace-international-preview-sw.js'),'utf8')
});
const fresh=spawnSync(process.execPath,['scripts/build-trace-preview-pwa.mjs','--check'],
 {cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
report.preflight={
 passed:inventory.passed&&fresh.status===0&&!fresh.signal&&!fresh.error,
 inventory,generatedCacheFresh:fresh.status===0&&!fresh.signal&&!fresh.error,
 generatorDiagnostic:fresh.status===0?'':String(fresh.stderr||fresh.stdout||fresh.error?.message||'').
  trim().slice(0,1500)
};
// A stale cache is an immediate NO-GO. Do not spend minutes running 104 suites
// against a candidate whose shell cannot be loaded completely on iPhone.
if(preflightOnly||!report.preflight.passed){
 // A successful preflight is not proof that any native financial test passed.
 // Reserve report.passed=true for the full suite with non-zero executed tests.
 report.passed=false;
 report.summary={preflightPassed:report.preflight.passed,
  staticAssets:inventory.requiredCount,cachedAssets:inventory.cachedCount,
  missingAssets:inventory.missing.length,
  testFilesExecuted:0,note:'No financial suite was run in preflight mode'};
 if(reportPath)writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify(report.summary)+'\n');
 if(!report.preflight.passed){
  process.stderr.write('TRACE laboratory preflight NO-GO: '+
   [...inventory.errors,report.preflight.generatorDiagnostic].filter(Boolean).join(' | ')+'\n');
 }
 process.exit(report.preflight.passed?0:1);
}
// Inspect the immutable local HEAD tree, not a mutable remote branch or a count.
// Reject missing or unexpected suites before executing untrusted test code.
const localTestFiles=readdirSync(join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).sort();
const committed=spawnSync('git',['ls-tree','-r','--name-only','HEAD','--','tests/'],
 {cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
report.committedSuites=checkCommittedSuiteInventory({
 treeOutput:committed.stdout,files:localTestFiles,
 exitCode:committed.status,signal:committed.signal,error:committed.error
});
if(!report.committedSuites.passed){
 report.summary={preflightPassed:true,committedSuiteInventoryPassed:false,
  testFiles:0,trackedSuites:report.committedSuites.trackedCount,
  checkoutSuites:report.committedSuites.checkoutCount,
  missingTrackedSuites:report.committedSuites.missing,
  unexpectedSuites:report.committedSuites.unexpected,
  testFilesExecuted:0};
 if(reportPath)writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n');
 process.stderr.write('TRACE native suite inventory NO-GO: checkout does not match Git HEAD.\n');
 process.stdout.write(JSON.stringify(report.summary)+'\n');
 process.exit(1);
}
for(const file of [...active].sort()){
 const run=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});
 report.syntax.push({file,passed:run.status===0});
 if(run.status!==0)process.stderr.write(run.stderr||run.error?.message||'Syntax check failed');
}
for(const file of localTestFiles){
 const run=spawnSync(process.execPath,['--test','--test-reporter=tap',join('tests',file)],{cwd:root,encoding:'utf8',
  timeout:60000,maxBuffer:8*1024*1024});
 const nativeSuite=sourceUsesNodeTest(readFileSync(join(root,'tests',file),'utf8'));
 const {passed,reportedScenarios,reason}=checkSuiteResult({...run,nativeSuite});
 // Suites with zero reported assertions cannot pass; neither can hidden
 // FAIL markers or contradictory TAP summaries when process exit is zero.
 report.suites.push({file,passed,reportedScenarios,reason});
 process.stdout.write((passed?'PASS ':'FAIL ')+file+' ('+reportedScenarios+' scenarios)\n');
 if(!passed)process.stderr.write((run.stdout||'')+(run.stderr||'')+(run.error?.message||''));
}
// An empty checkout is never a successful quality gate, even if every
// reported (empty) array would otherwise pass vacuously.
report.passed=report.preflight.passed&&report.committedSuites.passed&&report.syntax.length>0&&
 report.suites.length>=MINIMUM_TEST_FILES&&report.suites.some(x=>x.reportedScenarios>0)&&
 report.syntax.every(x=>x.passed)&&report.suites.every(x=>x.passed);
report.summary={syntaxFiles:report.syntax.length,testFiles:report.suites.length,
 expectedMinTestFiles:MINIMUM_TEST_FILES,suiteFloorMet:report.suites.length>=MINIMUM_TEST_FILES,
 committedSuiteInventoryPassed:report.committedSuites.passed,
 trackedSuiteFiles:report.committedSuites.trackedCount,
 reportedScenarios:report.suites.reduce((n,x)=>n+x.reportedScenarios,0),
 failedFiles:report.suites.filter(x=>!x.passed).length};
if(reportPath)writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report.summary)+'\n');
if(report.suites.length<MINIMUM_TEST_FILES)process.stderr.write('TRACE native QA NO-GO: '+
 report.suites.length+'/'+MINIMUM_TEST_FILES+' required test files found; incomplete checkout or suite inventory.\n');
if(!report.passed)process.exitCode=1;
