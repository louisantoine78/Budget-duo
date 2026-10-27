'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {runGate,isolatedEnv,EXPECTED,PG_TESTS}=
 require('../scripts/check-trace-537-release-gates.cjs');
function scenario({branch=EXPECTED,dirty=false,untracked='',gitStatusFail=false,
  baseAncestor=true,protectedChanged=false,commits='fix(candidate): safe [skip ci]\\n',
  vercelDisabled=true,vercelMissing=false,
  candidateHead='0123456789abcdef0123456789abcdef01234567',
  headAfter=null,branchAfter=null,dirtyAfter=false,
  sw=0,native=0,nativeSummary=true,nativeEvidence={},pgProbe=0,pgStatuses=[0,0,0,0],
  pgEmptyOutput=false,pgFindings=0}={}){
 const calls=[],spawn=(cmd,args,options)=>{
  calls.push({cmd,args,options});
  let status=0,stdout='';
  if(cmd==='git'&&args[0]==='branch')stdout=
   ((calls.filter(c=>c.cmd==='git'&&c.args[0]==='branch').length>1
     ?branchAfter||branch:branch)+'\n');
  if(cmd==='git'&&args[0]==='rev-parse')stdout=
   ((calls.filter(c=>c.cmd==='git'&&c.args[0]==='rev-parse').length>1
     ?headAfter||candidateHead:candidateHead)+'\n');
  if(cmd==='git'&&args[0]==='merge-base')status=baseAncestor?0:1;
  if(cmd==='git'&&args[0]==='diff')status=protectedChanged?1:0;
  if(cmd==='git'&&args[0]==='log')stdout=commits.replaceAll('\\n','\n');
  if(cmd==='git'&&args[0]==='status'){
   const post=calls.filter(c=>c.cmd==='git'&&c.args[0]==='status').length>1;
   stdout=((post?dirtyAfter:dirty)?' M v5-app-5.37.0.js\n':'')+
    (post?'':untracked);
   if(gitStatusFail)status=1;
  }
  if(args.includes('--check'))status=sw;
  if(args.includes('scripts/test-trace-native.mjs')){
   status=native;
   stdout=nativeSummary?JSON.stringify({syntaxFiles:12,testFiles:107,
    expectedMinTestFiles:106,suiteFloorMet:true,
    committedSuiteInventoryPassed:true,trackedSuiteFiles:107,
    reportedScenarios:815,failedFiles:0,...nativeEvidence})+'\n':'';
  }
  if(args.includes('require.resolve(process.argv[1])'))status=pgProbe;
  const n=PG_TESTS.indexOf(args[0]);
  if(n>=0){
   status=pgStatuses[n];
   stdout=pgEmptyOutput?'':('PASS fictional embedded PostgreSQL check\n'+
    (n===0?pgFindings+' remaining release-blocking findings\n':''));
  }
  return{status,stdout,stderr:status?'Fictitious failure':''};
 };
 return{...runGate({spawn,root:'/fake/isolated',node:'/fake/node',
  readFile:()=>{if(vercelMissing)throw Error('Missing config');
   return JSON.stringify({git:{deploymentEnabled:{[EXPECTED]:vercelDisabled?false:true}}});},
  env:{PATH:'/usr/bin',HOME:'/tmp',SUPABASE_URL:'https://forbidden.example',
   SUPABASE_SERVICE_ROLE_KEY:'SECRET',
   TRACE_PGLITE_MODULE:'/fictional/pglite'}}),calls};
}
test('refuses main and other branches before executing financial tools',()=>{
 const q=scenario({branch:'main'});
 assert.equal(q.automatedPassed,false);assert.equal(q.releaseReady,false);
 assert.equal(q.calls.length,1);assert.equal(q.calls[0].cmd,'git');
});
test('all fictional automated gates passing is still not a production GO',()=>{
 const q=scenario();
 assert.equal(q.automatedPassed,true);assert.equal(q.releaseReady,false);
 assert.equal(q.calls.length,16);assert.ok(q.manualRequired.length>=5);
});
test('supabase credentials and NODE_OPTIONS are never propagated to children',()=>{
 const q=scenario();
 for(const c of q.calls){
  assert.equal(c.options.env.SUPABASE_URL,undefined);
  assert.equal(c.options.env.SUPABASE_SERVICE_ROLE_KEY,undefined);
  assert.equal(c.options.cwd,'/fake/isolated');
 }
});
test('never writes a preview service worker or triggers CI/deploy',()=>{
 const q=scenario();
 assert.ok(q.calls.some(c=>c.args.includes('--check')));
 assert.equal(q.calls.some(c=>c.args.includes('scripts/build-trace-preview-pwa.mjs')&&!c.args.includes('--check')),false);
 assert.equal(q.calls.some(c=>['npm','npx','gh','curl','wget'].includes(c.cmd)),false);
});
test('missing PGlite blocks release without switching to hosted PostgreSQL',()=>{
 const q=scenario({pgProbe:1});assert.equal(q.automatedPassed,false);
 assert.equal(q.calls.some(c=>PG_TESTS.includes(c.args[0])),false);
 assert.ok(q.results.some(x=>x.id==='isolated_pg_blocked'&&!x.passed));
});
test('stale preview cache remains a clear blocking result',()=>{
 const q=scenario({sw:1});assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='preview_sw_fresh'&&!x.passed));
});
test('one failing native Node suite blocks automated approval',()=>{
 const q=scenario({native:1});assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='native_node_suite'&&!x.passed));
});
test('each of the four isolated PostgreSQL suites must pass separately',()=>{
 const q=scenario({pgStatuses:[0,1,0,0]});assert.equal(q.automatedPassed,false);
 assert.equal(q.calls.filter(c=>PG_TESTS.includes(c.args[0])).length,4);
});
test('dirty tracked files prevent reproducible QA on exact HEAD',()=>{
 const q=scenario({dirty:true});assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='clean_snapshot'&&!x.passed));
});
test('child environment is an allowlist, not the production process env',()=>{
 const x=isolatedEnv({PATH:'/bin',TRACE_PGLITE_MODULE:'/fake/pglite',
  SUPABASE_DB_PASSWORD:'SECRET',NODE_OPTIONS:'--require disallowed'});
 assert.deepEqual(x,{NODE_ENV:'test',PATH:'/bin',TRACE_PGLITE_MODULE:'/fake/pglite'});
});

test('migration-12 SQL privilege cutover must be a mandatory isolated gate',()=>{
 assert.equal(PG_TESTS.includes('tests/trace-cas-exclusive-cutover.integration.cjs'),true);
 const q=scenario({pgStatuses:[0,0,0,1]});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='isolated_pg_trace-cas-exclusive-cutover.integration.cjs'&&!x.passed));
});


test('native process exit zero without a summary is a failed gate',()=>{
 const q=scenario({nativeSummary:false});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='native_evidence_missing'&&!x.passed));
});
test('native gate refuses a zero-exit runner with incomplete or forged suite proof',()=>{
 const cases=[
  {testFiles:1,trackedSuiteFiles:1,reportedScenarios:1},
  {suiteFloorMet:false},
  {committedSuiteInventoryPassed:false},
  {committedSuiteInventoryPassed:undefined},
  {trackedSuiteFiles:106},
  {testFiles:106,trackedSuiteFiles:106,expectedMinTestFiles:107},
  {expectedMinTestFiles:1},
  {reportedScenarios:5},
  {failedFiles:1},
  {syntaxFiles:0},
  {testFiles:'107'},
  {reportedScenarios:Infinity}
 ];
 for(const nativeEvidence of cases){
  const q=scenario({nativeEvidence});
  assert.equal(q.automatedPassed,false,JSON.stringify(nativeEvidence));
  assert.ok(q.results.some(x=>x.id==='native_evidence_missing'&&!x.passed),
   JSON.stringify(nativeEvidence));
 }
});
test('valid native evidence still cannot authorize production',()=>{
 const {validNativeSummary,MINIMUM_NATIVE_SUITES}=
  require('../scripts/check-trace-537-release-gates.cjs');
 assert.equal(MINIMUM_NATIVE_SUITES,106);
 assert.equal(validNativeSummary({syntaxFiles:12,testFiles:107,
  expectedMinTestFiles:106,suiteFloorMet:true,
  committedSuiteInventoryPassed:true,trackedSuiteFiles:107,
  reportedScenarios:815,failedFiles:0}),true);
 assert.equal(scenario().releaseReady,false);
});
test('untracked source/test files block a verdict based on git HEAD',()=>{
 for(const untracked of ['?? tests/untracked.test.cjs\n',
  '?? v5-candidate-extra.js\n','?? migrations/\n']){
  const q=scenario({untracked});
  assert.equal(q.automatedPassed,false);
  assert.ok(q.results.some(x=>x.id==='clean_snapshot'&&!x.passed));
 }
});
test('untracked local node_modules may supply PGlite but not release approval',()=>{
 const q=scenario({untracked:'?? node_modules/\n'});
 assert.equal(q.automatedPassed,true);assert.equal(q.releaseReady,false);
});
test('git status failure always fails the release gate',()=>{
 const q=scenario({gitStatusFail:true});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='clean_worktree'&&!x.passed));
});
test('embedded PostgreSQL returning zero without executed assertions is blocked',()=>{
 const q=scenario({pgEmptyOutput:true});
 assert.equal(q.automatedPassed,false);
 assert.equal(q.results.filter(x=>x.id.startsWith('isolated_pg_evidence_missing_')).length,4);
});
test('unresolved PostgreSQL findings block despite a zero process exit',()=>{
 const q=scenario({pgFindings:2});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='isolated_pg_open_findings_trace-database.integration.cjs'&&!x.passed));
});
test('zero findings with passing SQL assertions is automated-only, never production GO',()=>{
 const q=scenario({pgFindings:0});
 assert.equal(q.automatedPassed,true);assert.equal(q.releaseReady,false);
});
test('release gate inspects untracked candidates, not only tracked modifications',()=>{
 const q=scenario();
 assert.ok(q.calls.some(x=>x.cmd==='git'&&x.args[0]==='status'&&
  x.args.includes('--untracked-files=normal')));
});


test('candidate branch must descend from pinned reviewed mission base',()=>{
 const q=scenario({baseAncestor:false});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='mission_base_ancestor'&&!x.passed));
});
test('candidate cannot quietly modify live stable entries or workflows',()=>{
 const q=scenario({protectedChanged:true});
 assert.equal(q.automatedPassed,false);
 const cmd=q.calls.find(x=>x.cmd==='git'&&x.args[0]==='diff');
 assert.ok(cmd.args.includes('index.html'));
 assert.ok(cmd.args.includes('v5-app-5.36.5.js'));
 assert.ok(cmd.args.includes('.github'));
 assert.ok(q.results.some(x=>x.id==='stable_entries_unchanged'&&!x.passed));
});
test('candidate rejects any commit without [skip ci], including a mixed history',()=>{
 const q=scenario({commits:'safe [skip ci]\nunsafe without marker\n'});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='mission_ci_guard'&&!x.passed));
});
test('missing candidate commit history cannot qualify unreviewed HEAD',()=>{
 const q=scenario({commits:''});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(x=>x.id==='mission_ci_guard'&&!x.passed));
});
test('Vercel branch deployment must be explicitly disabled',()=>{
 for(const opts of [{vercelDisabled:false},{vercelMissing:true}]){
  const q=scenario(opts);
  assert.equal(q.automatedPassed,false);
  assert.ok(q.results.some(x=>x.id==='candidate_auto_deploy_disabled'&&!x.passed));
 }
});
test('valid candidate invariants permit automated QA but never override manual NO-GO',()=>{
 const q=scenario();
 assert.equal(q.automatedPassed,true);assert.equal(q.releaseReady,false);
 assert.ok(q.results.some(x=>x.id==='candidate_auto_deploy_disabled'&&x.passed));
});


test('provenance failures stop before any candidate test, PGlite or preview execution',()=>{
 for(const opts of [
  {baseAncestor:false},{protectedChanged:true},
  {commits:'unqualified commit without marker\n'},
  {commits:''},{vercelDisabled:false},{vercelMissing:true},
  {dirty:true},{untracked:'?? migrations/probe.sql\n'},{gitStatusFail:true}
 ]){
  const q=scenario(opts);
  assert.equal(q.automatedPassed,false);
  assert.equal(q.releaseReady,false);
  assert.equal(q.calls.some(c=>c.cmd!=='git'),false);
  assert.equal(q.calls.some(c=>PG_TESTS.includes(c.args[0])),false);
 }
});
test('a failed prerequisite never probes PGlite or invokes the native suite',()=>{
 const q=scenario({protectedChanged:true,pgProbe:0});
 assert.equal(q.calls.some(c=>c.args.includes('scripts/test-trace-native.mjs')),false);
 assert.equal(q.calls.some(c=>c.args.includes('require.resolve(process.argv[1])')),false);
});
test('clean authorized candidate still exercises all isolated gates, not production',()=>{
 const q=scenario();
 assert.equal(q.automatedPassed,true);
 assert.equal(q.releaseReady,false);
 assert.equal(q.calls.filter(c=>PG_TESTS.includes(c.args[0])).length,4);
});

test('every local JS and CSS dependency of stable 5.36.5 is protected',()=>{
 const {PROTECTED}=require('../scripts/check-trace-537-release-gates.cjs');
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const local=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)/g)]
  .map(m=>m[1].split(/[?#]/)[0])
  .filter(v=>v&&!/^(?:https?:|data:|\/\/)/.test(v));
 for(const asset of local)
  assert.ok(PROTECTED.includes(asset),'Stable asset outside release guard: '+asset);
 for(const asset of ['assets','app.js','cloud.js','config.js',
  'supabase-schema.sql','trace-launch-v2.html','.github'])
  assert.ok(PROTECTED.includes(asset),'Stable production resource outside guard: '+asset);
});
test('protected CSS and helper scripts are passed into immutable candidate diff',()=>{
 const q=scenario({protectedChanged:true});
 const diff=q.calls.find(c=>c.cmd==='git'&&c.args[0]==='diff');
 for(const p of ['trace-smart-inbox-3.4.2.js',
  'trace-bank-ui-2.8.1.js','v5-5.31.17.css','config.js'])
  assert.ok(diff.args.includes(p));
 assert.equal(q.automatedPassed,false);
 assert.equal(q.calls.some(c=>c.cmd!=='git'),false);
});


test('candidate cannot change HEAD midflight while keeping green test exits',()=>{
 const q=scenario({headAfter:'abcdef0123456789abcdef0123456789abcdef01'});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(r=>r.id==='candidate_head_moved'&&!r.passed));
 assert.equal(q.releaseReady,false);
});
test('tests cannot switch branches and inherit a green candidate gate',()=>{
 const q=scenario({branchAfter:'main'});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(r=>r.id==='candidate_branch_moved'&&!r.passed));
});
test('a test-generated tracked change invalidates otherwise passing QA',()=>{
 const q=scenario({dirtyAfter:true});
 assert.equal(q.automatedPassed,false);
 assert.ok(q.results.some(r=>r.id==='final_snapshot_dirty'&&!r.passed));
});
test('a malformed candidate SHA is not acceptable release evidence',()=>{
 for(const candidateHead of ['','not-a-sha','01234']){
  const q=scenario({candidateHead});
  assert.equal(q.automatedPassed,false);
  assert.ok(q.results.some(r=>r.id==='candidate_head_invalid'&&!r.passed));
  assert.equal(q.calls.some(c=>c.cmd!=='git'),false);
 }
});
test('clean HEAD and identical branch after Node+PG checks still require manual GO',()=>{
 const q=scenario();
 assert.equal(q.automatedPassed,true);
 assert.equal(q.releaseReady,false);
 assert.ok(q.results.some(r=>r.id==='candidate_head_after'&&r.passed));
 assert.ok(q.results.some(r=>r.id==='final_worktree'&&r.passed));
});

test('international preview isolates UI and insights without changing stable 5.36.5 bytes',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const {MISSION_BASE,PROTECTED}=require('../scripts/check-trace-537-release-gates.cjs');
 const root=path.resolve(__dirname,'..');
 const stable=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const preview=fs.readFileSync(path.join(root,'trace-international-preview.html'),'utf8');
 const matches=[
  ['trace-operation-ui-1.0.0.js','trace-operation-ui-5.37.0.js'],
  ['trace-insights-1.0.0.js','trace-insights-5.37.0.js']
 ];
 for(const [original,candidate] of matches){
  assert.ok(PROTECTED.includes(original),'Stable asset must be guarded: '+original);
  assert.ok(stable.includes('src="'+original+'"'),'Stable entry must keep '+original);
  assert.ok(!stable.includes('src="'+candidate+'"'),'Stable entry cannot load '+candidate);
  assert.ok(preview.includes('src="'+candidate+'"'),'Preview must load '+candidate);
  assert.ok(!preview.includes('src="'+original+'"'),'Preview must not load shared '+original);
  const reference=spawnSync('git',['show',MISSION_BASE+':'+original],
   {cwd:root,encoding:null,timeout:10000,maxBuffer:1024*1024});
  assert.equal(reference.status,0,'Cannot inspect immutable baseline '+original);
  const unchanged=fs.readFileSync(path.join(root,original));
  const enhanced=fs.readFileSync(path.join(root,candidate));
  assert.deepEqual(unchanged,reference.stdout,'Stable file mutated: '+original);
  assert.notDeepEqual(enhanced,unchanged,'Candidate enhancement missing: '+candidate);
 }
});
