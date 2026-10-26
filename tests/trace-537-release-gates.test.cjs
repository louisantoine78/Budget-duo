'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {runGate,isolatedEnv,EXPECTED,PG_TESTS}=
 require('../scripts/check-trace-537-release-gates.cjs');
function scenario({branch=EXPECTED,dirty=false,sw=0,native=0,pgProbe=0,pgStatuses=[0,0,0,0]}={}){
 const calls=[],spawn=(cmd,args,options)=>{
  calls.push({cmd,args,options});
  let status=0,stdout='';
  if(cmd==='git'&&args[0]==='branch')stdout=branch+'\n';
  if(cmd==='git'&&args[0]==='status')stdout=dirty?' M v5-app-5.37.0.js\n':'';
  if(args.includes('--check'))status=sw;
  if(args.includes('scripts/test-trace-native.mjs'))status=native;
  if(args.includes('require.resolve(process.argv[1])'))status=pgProbe;
  const n=PG_TESTS.indexOf(args[0]);if(n>=0)status=pgStatuses[n];
  return{status,stdout,stderr:status?'Fictitious failure':''};
 };
 return{...runGate({spawn,root:'/fake/isolated',node:'/fake/node',
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
 assert.equal(q.calls.length,9);assert.ok(q.manualRequired.length>=5);
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
