#!/usr/bin/env node
// Read-only local review. No Git writes, network, CI, DB, merge or deployment.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const qualification=JSON.parse(await readFile(resolve(root,'docs/qa/TRACE-5.37.0-QUALIFICATION.json'),'utf8'));
const checks=[];
const check=(name,passed,detail='')=>checks.push({name,passed:!!passed,detail});
const git=(...args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
check('authorized candidate branch',git('branch','--show-current').stdout.trim()===qualification.branch);
check('production entries, stable application and workflows untouched',git('diff','--quiet',qualification.missionBase,'--',
 'index.html','sw.js','manifest.webmanifest','trace-version.json','v5-app-5.36.5.js','.github').status===0);
check('qualified code is an ancestor of the current checkout',git('merge-base','--is-ancestor',qualification.reviewedCodeCommit,'HEAD').status===0);
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
check('native suites and syntax passed',native.passed&&native.summary.failedFiles===0);
check('recorded Chromium scenarios passed',browser.passed&&browser.safari===false&&browser.externalRequests.length===0&&browser.consoleErrors.length===0);
check('fictional PostgreSQL integration passed',database.testsPassed&&database.hostedSupabase===false);
check('public historical FX evidence passed',valet.passed&&valet.realHTTP===true&&valet.currentMarketQuote===false);
for(const args of [['scripts/verify-trace-pdfjs.mjs','--preview-enabled'],['scripts/build-trace-preview-pwa.mjs','--check']]){
 const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
 check(args[0],run.status===0,(run.stdout||run.stderr).trim());
}
const open=qualification.gates.filter(g=>g.required&&g.status!=='passed');
const failures=checks.filter(c=>!c.passed);
// Recorded test success cannot override an open financial, platform or release gate.
const report={decision:failures.length||open.length?'NO-GO':'GO',
 qualificationCommit:qualification.reviewedCodeCommit,currentHead:git('rev-parse','HEAD').stdout.trim(),
 checks,openGates:open,productionAction:'none; explicit user authorization still required'};
const index=process.argv.indexOf('--report');
if(index>=0){if(!process.argv[index+1])throw Error('--report requires a path');
 await writeFile(resolve(process.argv[index+1]),JSON.stringify(report,null,2)+'\n');}
console.log(report.decision+' — '+checks.length+' local checks, '+failures.length+' failed checks, '+open.length+' open release gates');
for(const gate of open)console.log(gate.id+': '+gate.detail);
if(report.decision!=='GO')process.exitCode=2;
