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
// Freeze every locally loaded stable entry, not just the index itself.
// A modified shared JS/CSS dependency could otherwise change stable 5.36.5.
const PROTECTED=Object.freeze([
 "index.html",
 "sw.js",
 "manifest.webmanifest",
 "trace-version.json",
 "v5-app-5.36.5.js",
 ".github",
 "trace-launch-v2.html",
 "app.js",
 "cloud.js",
 "config.js",
 "supabase-schema.sql",
 "assets",
 "MIGRATION-V4-A-COLLER-DANS-SUPABASE.sql",
 "assets/trace-wallet-v1.svg",
 "assets/trace-wallet-v1-180.png",
 "v5-5.31.17.css",
 "trace-home-review-1.0.0.css",
 "trace-movement-5.32.0.css",
 "trace-import-guide-1.0.0.css",
 "trace-edit-premium-1.0.0.css",
 "trace-edit-compact-1.0.0.css",
 "trace-edit-finishing-1.0.0.css",
 "trace-edit-date-center-1.0.0.css",
 "trace-movement-guidance-1.0.0.css",
 "trace-bank-editor-premium-1.0.0.css",
 "trace-unified-operation-ui-1.0.0.css",
 "trace-import-unified-1.0.0.css",
 "trace-card-balance-1.0.0.css",
 "trace-insights-1.0.0.css",
 "trace-card-payment-detail-1.0.0.css",
 "trace-duplicate-compare-1.0.0.css",
 "onboarding-2.0.0.css",
 "trace-install-1.1.0.css",
 "trace-email-confirmation-1.0.0.css",
 "trace-email-confirmation-1.0.0.js",
 "trace-movement-5.36.0.js",
 "trace-import-guide-1.2.1.js",
 "trace-operation-ui-1.0.0.js",
 "trace-insights-1.0.0.js",
 "trace-card-payment-detail-1.0.0.js",
 "trace-duplicate-compare-1.0.0.js",
 "trace-bank-doc-1.11.1.js",
 "trace-bank-ui-2.8.1.js",
 "trace-import-calendar-2.1.2.js",
 "trace-smart-inbox-3.4.2.js",
 "onboarding-2.0.3.js",
 "trace-reminders-1.0.0.js",
 "trace-swipe-1.1.0.js",
 "trace-separation-1.1.0.js",
 "trace-household-change-1.0.0.js",
 "trace-install-1.1.0.js"
]);
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
// Validate the child runner's complete, committed-suite evidence. The exit
// code alone cannot prove that a truncated checkout executed the 5.37 QA.
// Keep the floor independent of the child script, which might regress.
const MINIMUM_NATIVE_SUITES=106;
function validNativeSummary(s){
 return !!s&&s.committedSuiteInventoryPassed===true&&s.suiteFloorMet===true&&
  Number.isSafeInteger(s.expectedMinTestFiles)&&s.expectedMinTestFiles>=MINIMUM_NATIVE_SUITES&&
  Number.isSafeInteger(s.testFiles)&&s.testFiles>=s.expectedMinTestFiles&&
  Number.isSafeInteger(s.trackedSuiteFiles)&&s.trackedSuiteFiles===s.testFiles&&
  Number.isSafeInteger(s.syntaxFiles)&&s.syntaxFiles>0&&
  Number.isSafeInteger(s.reportedScenarios)&&s.reportedScenarios>=s.testFiles&&
  s.failedFiles===0;
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
 // Pin the exact immutable snapshot checked before running any candidate
 // code. The subsequent tests must not change HEAD behind the reviewer's back.
 const initialHead=exec('candidate_head','git',['rev-parse','HEAD'],10000);
 if(initialHead.passed&&!/^[0-9a-f]{40}$/i.test(initialHead.stdout.trim()))
  results.push({id:'candidate_head_invalid',passed:false,
   message:'SHA du candidat invalide ou illisible.'});
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
 // Fail CLOSED before executing ANY candidate Node or SQL code. A changed
 // production entry, untrusted commit history, dirty tests/migrations, missing
 // Vercel protection or a failed git probe invalidates this checkout.
 if(results.some(r=>!r.passed))
  return{automatedPassed:false,releaseReady:false,results,
   manualRequired:MANUAL};
 // --check is deliberately read-only and fails on stale SW.
 exec('preview_sw_fresh',node,['scripts/build-trace-preview-pwa.mjs','--check'],30000);
 const native=exec('native_node_suite',node,['scripts/test-trace-native.mjs'],600000);
 if(native.passed){
  let s;
  try{s=JSON.parse(native.stdout.trim().split(/\r?\n/).at(-1));}catch{}
  if(!validNativeSummary(s))
   results.push({id:'native_evidence_missing',passed:false,
    message:'Le rapport Node ne démontre pas un inventaire commit vérifié, '+
     'au moins '+MINIMUM_NATIVE_SUITES+' suites complètes et des scénarios exécutés.'});
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
 // Fail closed if a test script changed or produced any tracked/untracked
 // candidate source, switched the branch, or moved HEAD during qualification.
 const afterHead=exec('candidate_head_after','git',['rev-parse','HEAD'],10000);
 if(initialHead.passed&&afterHead.passed&&
    afterHead.stdout.trim()!==initialHead.stdout.trim())
  results.push({id:'candidate_head_moved',passed:false,
   message:'HEAD a changé pendant les tests : qualifications non reproductibles.'});
 const afterBranch=exec('candidate_branch_after','git',
  ['branch','--show-current'],10000);
 if(afterBranch.passed&&afterBranch.stdout.trim()!==EXPECTED)
  results.push({id:'candidate_branch_moved',passed:false,
   message:'Branche candidate changée pendant les tests.'});
 const afterWorking=exec('final_worktree','git',
  ['status','--porcelain=v1','--untracked-files=normal'],10000);
 if(afterWorking.passed&&afterWorking.stdout.split(/\r?\n/).some(s=>
    s.trim()&&s!=='?? node_modules/'))
  results.push({id:'final_snapshot_dirty',passed:false,
   message:'Les tests ont modifié des fichiers : la qualification HEAD est invalide.'});
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
module.exports={isolatedEnv,runGate,validNativeSummary,EXPECTED,PG_TESTS,MANUAL,
 MISSION_BASE,PROTECTED,MINIMUM_NATIVE_SUITES};
