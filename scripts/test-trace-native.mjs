#!/usr/bin/env node
// Local-only QA. No CI, server, database, credentials or network calls.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reportIndex=process.argv.indexOf('--report');
const reportPath=reportIndex>=0?process.argv[reportIndex+1]:null;
if(reportIndex>=0&&!reportPath)throw Error('--report requires an output path');
const active=new Set(['sw.js','trace-pdfjs-local-loader-1.0.0.mjs']);
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
for(const file of [...active].sort()){
 const run=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});
 report.syntax.push({file,passed:run.status===0});
 if(run.status!==0)process.stderr.write(run.stderr||run.error?.message||'Syntax check failed');
}
for(const file of readdirSync(join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).sort()){
 const run=spawnSync(process.execPath,['--test','--test-reporter=tap',join('tests',file)],{cwd:root,encoding:'utf8',
  timeout:60000,maxBuffer:8*1024*1024});
 const custom=(run.stdout?.match(/^(?:# )?PASS /gm)||[]).length;
 const native=Number(run.stdout?.match(/^# tests (\d+)$/m)?.[1]||0);
 const passed=run.status===0;
 // Legacy scripts print one PASS per scenario; their TAP file wrapper is not
 // another financial scenario. Native node:test files report their own count.
 const reportedScenarios=custom||native;
 report.suites.push({file,passed,reportedScenarios});
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
