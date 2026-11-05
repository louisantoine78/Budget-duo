'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {evaluate,CHECKS}=require('../scripts/trace-20-production-release-gate.cjs');
const facts=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/TRACE-2.0-PRODUCTION-READINESS-2026-11-05.json'),'utf8'));
const now=new Date('2026-11-05T04:30:00Z');
const evalFacts=f=>evaluate(f,{now});
test('real read-only production inventory remains NO-GO and never authorizes deployment',()=>{
 const r=evalFacts(facts);
 assert.equal(r.decision,'NO-GO');
 assert.equal(r.productionReady,false);
 assert.equal(r.liveChangesMade,false);
 assert.equal(r.manualReviewMandatory,true);
 assert.ok(r.blockers.length>=9);
 for(const id of ['revision_columns','cas_rpc','household_accounts','backup_present',
  'backup_current','live_entry','pwa_upgrade','compatibility','rollback'])
  assert.ok(r.blockers.some(b=>b.id===id),id);
});
test('missing or stale inventory fails closed',()=>{
 const r=evalFacts({...facts,checkedAt:'2026-11-01T04:24:00Z'});
 assert.ok(r.blockers.some(b=>b.id==='fresh_inventory'));
 const bad=evalFacts({...facts,checkedAt:'not a time'});
 assert.ok(bad.blockers.some(b=>b.id==='fresh_inventory'));
});
test('a different project ref cannot be authorized',()=>{
 assert.ok(evalFacts({...facts,projectRef:'rawugpdmtgumokeljefj'}).blockers.some(b=>b.id==='target_project'));
});
test('passing all sanitized metadata checks still cannot autonomously release finances',()=>{
 let f={...facts,checkedAt:'2026-11-05T04:30:00Z'};
 for(const [id] of CHECKS){
  if(id==='revision_columns'){f.documentRevision=true;f.settingsRevision=true}
  else if(id==='cas_rpc'){f.casSave=true;f.casDelete=true;f.casHousehold=true}
  else if(id==='privacy_guard')f.csvGuard=true;
  else if(id==='household_accounts'){f.sharedAccountOwners=1;
   f.sharedAccountPolicyVerified=true;f.sharedOwnerImmutable=true;
   f.sharedCasVerified=true;}
  else if(id==='backup_present')f.backupVerifiedIndependent=true;
  else if(id==='backup_current')f.backupTakenAt='2026-11-05T04:28:00Z';
  else if(id==='live_entry'){f.realAuthEntrypoint=true;f.fictionalPreview=false}
  else if(id==='pwa_upgrade')f.realPwaMigrationReviewed=true;
  else if(id==='rollback'){f.databaseRollbackRehearsed=true;f.frontendRollbackRehearsed=true}
  else if(id==='compatibility')f.legacyClientsProtected=true;
  else if(id==='financial_approval')f.financialReleaseApproved=true;
 }
 const r=evalFacts(f);
 assert.equal(r.decision,'PRECHECK-PASS-NOT-A-DEPLOYMENT');
 assert.equal(r.productionReady,false);
 assert.equal(r.manualReviewMandatory,true);
});
test('null, partial or invented schemas reject',()=>{
 assert.throws(()=>evalFacts(null),/schema/);
 assert.throws(()=>evalFacts({schema:'random'}),/schema/);
 const r=evalFacts({schema:'trace-20-production-facts-v1'});
 assert.equal(r.decision,'NO-GO');
});
test('the release gate performs no database, network, git or deployment action',()=>{
 const file=fs.readFileSync(path.resolve(__dirname,'../scripts/trace-20-production-release-gate.cjs'),'utf8');
 assert.doesNotMatch(file,/fetch\(|https:|child_process|execFile|spawn\(|apply_migration|create_deployment|createClient\(/);
});

test('legacy shared account requires all three live-server proofs',()=>{
 for(const key of ['sharedAccountPolicyVerified','sharedOwnerImmutable','sharedCasVerified']){
  const f={...facts,sharedAccountPolicyVerified:true,
   sharedOwnerImmutable:true,sharedCasVerified:true,[key]:false};
  assert.ok(evalFacts(f).blockers.some(b=>b.id==='household_accounts'),key);
 }
});
