'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const P=require('../scripts/trace-537-cache-policy.cjs');
test('cache retirement never removes old 5.36.5, lab caches, or unrelated owners',()=>{
 const keys=['trace-shell-v5.36.5','trace-lab-537:old',
  'other-app-cache','trace-shell-v5.37.0:old','trace-shell-v5.37.0:new'];
 const x=P.cacheRetirementPlan(keys,{nextCache:'trace-shell-v5.37.0:new',
  verified:true,clientsMigrated:true});
 assert.deepEqual(x.deleteNames,['trace-shell-v5.37.0:old']);
 for(const k of ['trace-shell-v5.36.5','trace-lab-537:old','other-app-cache'])
  assert.ok(x.preserve.includes(k));
 assert.equal(x.stableRetained,true);
});
test('no cached-version cleanup until verification and all clients migrate',()=>{
 for(const x of [{},{verified:true},{clientsMigrated:true}]){
  const plan=P.cacheRetirementPlan(['trace-shell-v5.37.0:old'],{
   nextCache:'trace-shell-v5.37.0:new',...x});
  assert.deepEqual(plan.deleteNames,[]);
 }
 assert.throws(()=>P.cacheRetirementPlan(['any'],{nextCache:'trace-shell-v5.36.5',verified:true}));
});
test('cache allowlist rejects credentials, requests, old HTML and remote APIs',()=>{
 const origin='https://trace.example.test',files=['v5-app-5.37.0.js',
  'trace-insights-5.37.0.js','config.js','index.html','auth/v1/user'];
 const req=(url,method='GET',headers={})=>({url,method,headers:{get:k=>headers[k]||null}});
 assert.equal(P.cacheableStaticRequest(req(origin+'/v5-app-5.37.0.js'),origin,files),true);
 for(const url of [origin+'/config.js',origin+'/index.html',
  origin+'/auth/v1/user',origin+'/v5-app-5.37.0.js?token=secret',
  origin+'/rest/v1/accounts','https://elsewhere.invalid/v5-app-5.37.0.js'])
  assert.equal(P.cacheableStaticRequest(req(url),origin,files),false,url);
 assert.equal(P.cacheableStaticRequest(req(origin+'/%G0'),origin,files),false);
 assert.equal(P.cacheableStaticRequest(req(origin+'/v5-app-5.37.0.js','POST'),origin,files),false);
 assert.equal(P.cacheableStaticRequest(req(origin+'/v5-app-5.37.0.js','GET',{Authorization:'Bearer token'}),origin,files),false);
});
test('current 5.36.5 production entry and old broad cache deletion remain NO-GO',()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
  worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const readiness=P.releaseEntryReadiness(html,worker);
 assert.deepEqual(readiness,{versionEntryReady:false,workerUpgradeReady:false,releaseReady:false});
 const future=P.releaseEntryReadiness('<meta name="trace-build" content="5.37.0"><script src="v5-app-5.37.0.js"></script>',
  'const cachePrefix="trace-shell-v5.37.0:"; // preserve stable cache');
 assert.equal(future.releaseReady,true);
});

