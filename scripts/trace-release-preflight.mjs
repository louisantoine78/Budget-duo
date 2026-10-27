#!/usr/bin/env node
// Read-only local review. No Git writes, network, CI, DB, merge or deployment.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
// Read-only, exact-snapshot evidence: a green historical run cannot
// certify a later HEAD or a SQL report with known release-blocking findings.
function traceQualificationHeadMatches(current,reviewed){
 return typeof current==='string'&&typeof reviewed==='string'&&
  /^[a-f0-9]{40}$/.test(current)&&current===reviewed;
}
// The independent release preflight must not accept a tiny or fabricated
// green report when native QA requires >=106 committed suite files.
// Validate the actual per-file evidence, not merely summary counters.
function traceQualifiedNativeEvidence(native){
 const s=native?.summary, suites=native?.suites, syntax=native?.syntax;
 const min=106;
 if(native?.passed!==true||s?.committedSuiteInventoryPassed!==true||
    s?.suiteFloorMet!==true||s?.failedFiles!==0||
    !Number.isSafeInteger(s?.expectedMinTestFiles)||s.expectedMinTestFiles<min||
    !Number.isSafeInteger(s?.testFiles)||s.testFiles<s.expectedMinTestFiles||
    !Number.isSafeInteger(s?.trackedSuiteFiles)||s.trackedSuiteFiles!==s.testFiles||
    !Number.isSafeInteger(s?.syntaxFiles)||s.syntaxFiles<1||
    !Number.isSafeInteger(s?.reportedScenarios)||s.reportedScenarios<s.testFiles||
    !Array.isArray(suites)||suites.length!==s.testFiles||
    !Array.isArray(syntax)||syntax.length!==s.syntaxFiles||
    !suites.every(x=>x?.passed===true&&typeof x.file==='string'&&
      /^trace-[a-zA-Z0-9_.-]+\.test\.cjs$/.test(x.file)&&
      Number.isSafeInteger(x.reportedScenarios)&&x.reportedScenarios>=1)||
    !syntax.every(x=>x?.passed===true&&typeof x.file==='string'&&x.file.length>0))return false;
 const names=suites.map(x=>x.file);
 return new Set(names).size===names.length&&
  suites.reduce((n,x)=>n+x.reportedScenarios,0)===s.reportedScenarios;
}
function traceQualifiedPostgresEvidence(db){
 return db?.testsPassed===true&&db?.hostedSupabase===false&&
  Array.isArray(db?.checks)&&db.checks.length>0&&
  db.checks.every(x=>x?.passed===true)&&
  Array.isArray(db?.findings)&&
  !db.findings.some(x=>x?.severity==='release-blocker');
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const qualification=JSON.parse(await readFile(resolve(root,'docs/qa/TRACE-5.37.0-QUALIFICATION.json'),'utf8'));
const checks=[];
const check=(name,passed,detail='')=>checks.push({name,passed:!!passed,detail});
const git=(...args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
check('authorized candidate branch',git('branch','--show-current').stdout.trim()===qualification.branch);
check('production entries, stable application and workflows untouched',git('diff','--quiet',qualification.missionBase,'--',
 'index.html','sw.js','manifest.webmanifest','trace-version.json','v5-app-5.36.5.js','.github').status===0);
const headResult=git('rev-parse','HEAD');
const currentHead=headResult.status===0?headResult.stdout.trim():'';
check('qualified code matches the exact reviewed commit',
 traceQualificationHeadMatches(currentHead,qualification.reviewedCodeCommit));
const messages=git('log',qualification.missionBase+'..HEAD','--format=%s');
check('all mission commits skip CI',messages.status===0&&messages.stdout.trim().split('\n').every(message=>message.includes('[skip ci]')));
const config=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8'));
check('candidate automatic Vercel deployment disabled',config.git?.deploymentEnabled?.[qualification.branch]===false);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [file,hash] of Object.entries(qualification.sourceHashes)){
 if(file.startsWith('/')||file.split('/').includes('..'))throw Error('Invalid qualification path');
 let actual;try{actual=sha(await readFile(resolve(root,file)));}catch{}
 check('qualified source '+file,actual===hash);
}
for(const [file,hash] of Object.entries(qualification.reportHashes)){
 check('evidence integrity '+file,sha(await readFile(resolve(root,file)))===hash);
}
const native=JSON.parse(await readFile(resolve(root,qualification.reports.native),'utf8'));
const browser=JSON.parse(await readFile(resolve(root,qualification.reports.browser),'utf8'));
const database=JSON.parse(await readFile(resolve(root,qualification.reports.database),'utf8'));
const valet=JSON.parse(await readFile(resolve(root,qualification.reports.valet),'utf8'));
check('native suites and syntax passed',traceQualifiedNativeEvidence(native));
check('recorded Chromium scenarios passed',browser.passed&&browser.safari===false&&browser.externalRequests.length===0&&browser.consoleErrors.length===0);
check('fictional PostgreSQL integration passed without open blockers',
 traceQualifiedPostgresEvidence(database));
check('public historical FX evidence passed',valet.passed&&valet.realHTTP===true&&valet.currentMarketQuote===false);
for(const args of [['scripts/verify-trace-pdfjs.mjs','--preview-enabled'],['scripts/build-trace-preview-pwa.mjs','--check']]){
 const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
 check(args[0],run.status===0,(run.stdout||run.stderr).trim());
}
const open=qualification.gates.filter(g=>g.required&&g.status!=='passed');
const failures=checks.filter(c=>!c.passed);
// Recorded test success cannot override an open financial, platform or release gate.
const report={decision:failures.length||open.length?'NO-GO':'GO',
 qualificationCommit:qualification.reviewedCodeCommit,currentHead,
 checks,openGates:open,productionAction:'none; explicit user authorization still required'};
const index=process.argv.indexOf('--report');
if(index>=0){if(!process.argv[index+1])throw Error('--report requires a path');
 await writeFile(resolve(process.argv[index+1]),JSON.stringify(report,null,2)+'\n');}
console.log(report.decision+' — '+checks.length+' local checks, '+failures.length+' failed checks, '+open.length+' open release gates');
for(const gate of open)console.log(gate.id+': '+gate.detail);
if(report.decision!=='GO')process.exitCode=2;
