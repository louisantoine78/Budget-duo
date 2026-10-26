'use strict';
/*
 * TRACE 5.37.0 READ-ONLY local release QA. No hosted Supabase, CI,
 * deployment, migrations on live data or service-worker regeneration.
 * Use only in a complete isolated development checkout:
 *   node scripts/check-trace-537-release-gates.cjs
 * Even perfect automation does NOT grant a production GO. Safari,
 * rollback and finance verification remain manual release conditions.
 */
const {spawnSync}=require('node:child_process');
const {resolve}=require('node:path');
const {readFileSync}=require('node:fs');
const ROOT=resolve(__dirname,'..');
const EXPECTED='trace-5.37.0-international-accounts-fx';
// Pinned to the mission-start candidate, NOT to a mutable remote ref.
const MISSION_BASE='6eb6c17e5c9eba2d3727ebea404cce5fec0424c6';
const PROTECTED=['index.html','sw.js','manifest.webmanifest',
 'trace-version.json','v5-app-5.36.5.js','.github'];
const PG_TESTS=Object.freeze([
 'tests/trace-database.integration.cjs',
 'tests/trace-personal-settings-ownership.integration.cjs',
 'tests/trace-cas-writes.integration.cjs',
 'tests/trace-cas-exclusive-cutover.integration.cjs'
]);
const MANUAL=Object.freeze([
 'Real two-client CAS/RLS/Auth tests reviewed after isolated PostgreSQL QA',
 'Chromium/PWA offline check after deliberate preview service-worker rebuild',
 'Physical iPhone Safari: import, account switch, rendering and offline use',
 'Deferred debit, couple FX, premium UX and all financial scenarios signed off',
 'Documented backup/restore, rollback and explicit deployment authorization'
]);
function isolatedEnv(env={}){
 const safe={NODE_ENV:'test'};
 for(const key of ['PATH','HOME','TMPDIR','TEMP','TMP','SystemRoot','WINDIR'])
  if(typeof env[key]==='string')safe[key]=env[key];
 if(env.TRACE_PGLITE_MODULE)safe.TRACE_PGLITE_MODULE=env.TRACE_PGLITE_MODULE;
 return safe;
}
function runGate({spawn=spawnSync,root=ROOT,env=process.env,
 node=process.execPath,readFile=readFileSync}={}){
 const safe=isolatedEnv(env),results=[];
 function exec(id,cmd,args,timeout=600000){
  let outcome;
  try{outcome=spawn(cmd,args,{cwd:root,encoding:'utf8',timeout,
   maxBuffer:8*1024*1024,env:safe});}
  catch(e){outcome={status:null,error:e,stdout:'',stderr:''};}
  const passed=outcome.status===0&&!outcome.error;
  const result={id,passed,exitCode:outcome.status,
   message:String(outcome.error?.message||outcome.stderr||(!passed?outcome.stdout:'')||'').slice(0,1000)};
  results.push(result);return{...result,stdout:String(outcome.stdout||'')};
 }
 const branch=exec('branch','git',['branch','--show-current'],10000);
 if(!branch.passed||branch.stdout.trim()!==EXPECTED){
  results.push({id:'branch_guard',passed:false,
   message:'Refus : branche autorisée '+EXPECTED+' uniquement'});
  return{automatedPassed:false,releaseReady:false,results,manualRequired:MANUAL};
 }
 // The branch name alone cannot guarantee that production assets and
 // workflow definitions stayed untouched during candidate development.
 exec('mission_base_ancestor','git',
  ['merge-base','--is-ancestor',MISSION_BASE,'HEAD'],10000);
 exec('stable_entries_unchanged','git',
  ['diff','--quiet',MISSION_BASE,'HEAD','--',...PROTECTED],10000);
 const log=exec('mission_commit_messages','git',
  ['log',MISSION_BASE+'..HEAD','--format=%s'],10000);
 if(log.passed){
  const subjects=log.stdout.split(/\r?\n/).filter(Boolean);
  if(!subjects.length||subjects.some(s=>!s.includes('[skip ci]')))
   results.push({id:'mission_ci_guard',passed:false,
    message:'Chaque commit candidat doit conserver [skip ci].'});
 }
 // Verify static Vercel configuration before test execution. A hosted
 // auto-deployment is not acceptable even if every local test succeeds.
 let vercelSafe=false;
 try{
  const conf=JSON.parse(readFile(resolve(root,'vercel.json'),'utf8'));
  vercelSafe=conf?.git?.deploymentEnabled?.[EXPECTED]===false;
 }catch{}
 results.push({id:'candidate_auto_deploy_disabled',passed:vercelSafe,
  message:vercelSafe?'':'Déploiement automatique Vercel de la branche non désactivé.'});
 const working=exec('clean_worktree','git',['status','--porcelain=v1','--untracked-files=normal'],10000);
 if(working.passed){
  const changed=working.stdout.split(/\r?\n/).filter(s=>s.trim()&&s!=='?? node_modules/');
  if(changed.length)results.push({id:'clean_snapshot',passed:false,
   message:'Fichiers modifiés ou non suivis : QA non reproductible sur HEAD.'});
 }
 // --check is deliberately read-only and fails on stale SW.
 exec('preview_sw_fresh',node,['scripts/build-trace-preview-pwa.mjs','--check'],30000);
 const native=exec('native_node_suite',node,['scripts/test-trace-native.mjs'],600000);
 if(native.passed){
  let s;
  try{s=JSON.parse(native.stdout.trim().split(/\r?\n/).at(-1));}catch{}
  if(!s||!Number.isSafeInteger(s.testFiles)||s.testFiles<1||
     !Number.isSafeInteger(s.syntaxFiles)||s.syntaxFiles<1||
     !Number.isSafeInteger(s.reportedScenarios)||s.reportedScenarios<1||
     s.failedFiles!==0)
   results.push({id:'native_evidence_missing',passed:false,
    message:'Aucune preuve de scénarios Node réellement exécutés.'});
 }
 // Require only the embedded fictional PostgreSQL package, no install/network.
 const moduleName=safe.TRACE_PGLITE_MODULE||'@electric-sql/pglite';
 const probe=exec('embedded_postgres_present',node,
  ['-e','require.resolve(process.argv[1])',moduleName],10000);
 if(probe.passed)for(const file of PG_TESTS){
  const name=file.split('/').at(-1),pg=exec('isolated_pg_'+name,node,[file],180000);
  if(!pg.passed)continue;
  const found=pg.stdout.match(/\b(\d+)\s+remaining release-blocking findings\b/i);
  if(found&&Number(found[1])>0)results.push({
   id:'isolated_pg_open_findings_'+name,passed:false,
   message:found[1]+' PostgreSQL blockers still open.'});
  if(!/(?:^|\r?\n)PASS\s+[^\r\n]+/m.test(pg.stdout))results.push({
   id:'isolated_pg_evidence_missing_'+name,passed:false,
   message:'No passing SQL assertion reported.'});
 }
 else results.push({id:'isolated_pg_blocked',passed:false,
  message:'PGlite local introuvable. Ne jamais substituer un Supabase hébergé.'});
 return{automatedPassed:results.every(r=>r.passed),releaseReady:false,
  results,manualRequired:MANUAL};
}
if(require.main===module){
 const report=runGate();
 for(const r of report.results)process.stdout.write((r.passed?'PASS ':'FAIL ')+r.id+
  (r.passed?'':' — '+r.message)+'\n');
 process.stdout.write('Automated: '+(report.automatedPassed?'PASS':'NO-GO')+
  '; Production: NO-GO pending browser, iPhone and explicit finance sign-off.\n');
 if(!report.automatedPassed)process.exitCode=1;
}
module.exports={isolatedEnv,runGate,EXPECTED,PG_TESTS,MANUAL,
 MISSION_BASE,PROTECTED};
