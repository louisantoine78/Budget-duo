'use strict';
/*
 * TRACE 5.37.0 current-HEAD candidate rehearsal, offline and read-only.
 * NO production release, hosted DB, migrations, app changes or network.
 * Output is a locally generated report using only fictional browser data.
 * Successful laboratory QA never authorizes publication to real users.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const BRANCH='trace-5.37.0-international-accounts-fx';
const MANUAL=Object.freeze([
 'Physical iPhone Safari / installed PWA and interrupted/offline writes',
 'Hosted isolated Supabase Auth/RLS/PostgREST/Realtime with two clients',
 'Complete deferred-debit and FR/CA OCR/PDF financial acceptance',
 'Prospective FX reference-currency historical behavior',
 'Fresh independently inventoried production backup and restore/rollback rehearsal',
 'Production service-worker upgrade from 5.36.5 and explicit finance/release approval'
]);
const report={schema:'trace-537-current-head-rehearsal-v1',head:null,
 branch:null,codeChecks:{},tests:{},export:{},manualRequired:MANUAL,
 laboratoryPassed:false,productionReady:false};
const run=(cmd,args,options={})=>{
 const r=spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',timeout:options.timeout||20000,
  maxBuffer:16*1024*1024,env:{...process.env,...options.env}});
 if(r.error||r.status!==0)throw Error((options.name||cmd+' '+args[0])+
   ': exit '+r.status+(r.error?' '+r.error.message:'')+
   ' / '+String(r.stderr||r.stdout||'').slice(-500));
 return String(r.stdout||'');
};
function checkShell(){
 const head=run('git',['rev-parse','HEAD']).trim(),
  branch=run('git',['branch','--show-current']).trim(),
  status=run('git',['status','--porcelain=v1','--untracked-files=normal']).trim();
 assert.match(head,/^[0-9a-f]{40}$/);
 assert.equal(branch,BRANCH,'Candidate branch is mandatory');
 assert.equal(status,'','Rehearsal requires a clean committed HEAD');
 report.head=head;report.branch=branch;
 report.codeChecks={exactHead:true,cleanWorktree:true,branchLocked:true};
}
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function verifyExport(site){
 const file=path.join(site,'trace-lab-export-audit.json');
 const audit=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(audit.schema,'trace-537-isolated-export-v1');
 assert.equal(audit.entry,'trace-international-preview.html');
 assert.equal(audit.manifest,'trace-international-preview.webmanifest');
 assert.equal(audit.serviceWorker,'trace-international-preview-sw.js');
 assert.ok(Number.isInteger(audit.count)&&audit.count>=65);
 assert.equal(Object.keys(audit.files).length,audit.count);
 const safe=/^[A-Za-z0-9_./-]+$/;
 for(const [name,digest] of Object.entries(audit.files)){
  assert.ok(safe.test(name)&&!name.startsWith('/')&&!name.split('/').includes('..'),'Unsafe file '+name);
  assert.ok(!/^(?:config\.js|cloud\.js|app\.js|sw\.js|vercel\.json|trace-launch-v2\.html)$/i.test(name));
  const p=path.resolve(site,name);
  assert.ok(p.startsWith(site+path.sep));
  assert.ok(fs.lstatSync(p).isFile(),'Only regular files in preview: '+name);
  assert.equal(hash(fs.readFileSync(p)),digest,'Export SHA mismatch '+name);
 }
 const actual=[];
 const walk=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,ent.name);
  assert.ok(!ent.isSymbolicLink(),'Preview must not contain symlinks');
  if(ent.isDirectory())walk(full);else if(ent.isFile())actual.push(path.relative(site,full).split(path.sep).join('/'));
  else throw Error('Unexpected export entry');
 }};
 walk(site);
 const allowed=new Set([...Object.keys(audit.files),'trace-lab-export-audit.json','index.html','robots.txt']);
 assert.equal(actual.length,allowed.size);
 assert.deepEqual(new Set(actual),allowed);
 const html=fs.readFileSync(path.join(site,audit.entry),'utf8');
 assert.ok(html.includes("connect-src 'none'")&&html.includes('noindex, nofollow'));
 report.export={files:audit.count,totalFiles:actual.length,sha256Verified:true,
  privacyHeadersInHtml:true,forbiddenFilesAbsent:true};
}
function browserSmoke(site,engine,dir){
 const outfile=path.join(dir,engine+'-browser.json');
 run(process.execPath,['scripts/trace-browser-537-qa.cjs','--report',outfile],
  {name:'Browser smoke '+engine,timeout:240000,
   env:{TRACE_BROWSER_ENGINE:engine,TRACE_LAB_ROOT:site}});
 const x=JSON.parse(fs.readFileSync(outfile,'utf8'));
 assert.equal(x.passed,true,engine+' smoke failed');
 assert.equal(x.engine,engine);
 assert.deepEqual(x.widths.map(w=>w.width),[320,390,768,1440]);
 assert.equal(x.offline?.activityAvailable,true);
 assert.deepEqual(x.failures,[]);
 return{passed:true,widths:x.widths.map(w=>w.width),offline:true,
  physicalIphone:false};
}
function rehearsal(){
 for(const key of ['TRACE_PGLITE_MODULE','TRACE_PLAYWRIGHT_MODULE','TRACE_CHROMIUM_EXECUTABLE','PLAYWRIGHT_BROWSERS_PATH'])
  assert.ok(process.env[key],key+' required — no test may be silently skipped');
 checkShell();
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'trace-537-current-head-'));
 report.reportDirectory=output;
 const official=run(process.execPath,['scripts/check-trace-537-release-gates.cjs'],
  {name:'Official 17/17 release safeguards',timeout:720000});
 const officialPassed=(official.match(/^PASS /gm)||[]).length;
 assert.equal(officialPassed,17,'Official gate count is not 17');
 assert.ok(official.includes('Automated: PASS; Production: NO-GO'));
 report.tests.official={passed:true,checks:officialPassed};
 const site=path.join(output,'fictional-preview');
 run(process.execPath,['scripts/export-trace-537-preview.mjs','--out',site],
  {name:'Static-only export',timeout:90000});
 verifyExport(site);
 const financialReport=path.join(output,'financial-chromium.json');
 run(process.execPath,['tests/trace-candidate.browser.cjs','--report',financialReport],
  {name:'Real financial Chromium scenarios',timeout:240000});
 const financial=JSON.parse(fs.readFileSync(financialReport,'utf8'));
 assert.equal(financial.passed,true);
 assert.equal(financial.engine,'Chromium');
 assert.ok(financial.results.length>=39,'Missing current financial browser coverage');
 assert.ok(financial.results.every(x=>x.passed===true));
 assert.deepEqual(financial.externalRequests,[]);
 assert.deepEqual(financial.consoleErrors,[]);
 report.tests.financial={passed:true,scenarios:financial.results.length,
  fictional:true,externalRequests:0};
 report.tests.chromium=browserSmoke(site,'chromium',output);
 report.tests.webkit=browserSmoke(site,'webkit',output);
 assert.equal(run('git',['rev-parse','HEAD']).trim(),report.head,'HEAD moved during QA');
 assert.equal(run('git',['status','--porcelain=v1']).trim(),'','Worktree changed during QA');
 report.laboratoryPassed=true;
}
let error=null;
try{rehearsal()}catch(e){error=e;report.error=String(e.message||e).slice(0,1000)}
finally{
 report.generatedAt=new Date().toISOString();
 if(report.reportDirectory){
  fs.writeFileSync(path.join(report.reportDirectory,'rehearsal-summary.json'),
   JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({head:report.head,branch:report.branch,
  laboratoryPassed:report.laboratoryPassed,productionReady:false,
  tests:report.tests,export:report.export,manualRequired:report.manualRequired,
  reportDirectory:report.reportDirectory,error:report.error||null}));
 if(error)process.exitCode=2;
}

