#!/usr/bin/env node
// Local-only QA. No CI, server, database, credentials or network calls.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {checkSuiteResult,sourceUsesNodeTest} from './trace-native-suite-evidence.cjs';
import {checkLabStaticInventory} from './trace-preview-static-inventory.cjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reportIndex=process.argv.indexOf('--report');
const reportPath=reportIndex>=0?process.argv[reportIndex+1]:null;
const preflightOnly=process.argv.includes('--preflight');
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
 report.passed=report.preflight.passed&&preflightOnly;
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
 process.exit(report.passed?0:1);
}
for(const file of [...active].sort()){
 const run=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});
 report.syntax.push({file,passed:run.status===0});
 if(run.status!==0)process.stderr.write(run.stderr||run.error?.message||'Syntax check failed');
}
for(const file of readdirSync(join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).sort()){
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
report.passed=report.syntax.every(x=>x.passed)&&report.suites.every(x=>x.passed);
report.summary={syntaxFiles:report.syntax.length,testFiles:report.suites.length,
 reportedScenarios:report.suites.reduce((n,x)=>n+x.reportedScenarios,0),
 failedFiles:report.suites.filter(x=>!x.passed).length};
if(reportPath)writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report.summary)+'\n');
if(!report.passed)process.exitCode=1;
