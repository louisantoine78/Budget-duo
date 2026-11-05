'use strict';
/*
 * TRACE 2.0 production-only go/no-go review. It never connects to the
 * database, writes files, pushes a branch, or launches a deployment.
 * Its input is ONLY a recent sanitized inventory from read-only queries.
 * No financial accounts, user IDs, passwords, snapshots or tokens.
 */
const fs=require('node:fs');
const path=require('node:path');
const EXPECTED_PROJECT='eiqvabddtgfonouyeavi';
const EXPECTED_STABLE='02c70f50e7e51da79b77a91dde96a03c6c719909';
const CHECKS=[
 ['target_project',f=>f.projectRef===EXPECTED_PROJECT,'Incorrect TRACE project'],
 ['stable_head',f=>f.stableSha===EXPECTED_STABLE,'Stable rollback baseline not independently preserved'],
 ['revision_columns',f=>f.documentRevision===true&&f.settingsRevision===true,'Required CAS revision columns absent'],
 ['cas_rpc',f=>f.casSave===true&&f.casDelete===true&&f.casHousehold===true,'Required CAS functions absent'],
 ['privacy_guard',f=>f.csvGuard===true,'CSV evidence protection unavailable'],
 ['household_accounts',f=>Number.isSafeInteger(f.sharedAccountOwners)&&f.sharedAccountOwners===0,'Household-owned account needs reviewed compatible migration'],
 ['document_inventory',f=>Number.isSafeInteger(f.documentCount)&&f.documentCount>=0,'Missing document inventory'],
 ['backup_present',f=>f.backupVerifiedIndependent===true,'No independent verified current production backup'],
 ['backup_current',f=>!!Date.parse(f.latestDocumentWrite)&&!!Date.parse(f.backupTakenAt)&&
   Date.parse(f.backupTakenAt)>=Date.parse(f.latestDocumentWrite),'Backup predates latest financial write'],
 ['live_entry',f=>f.realAuthEntrypoint===true&&f.fictionalPreview===false,'Candidate is still an isolated fictional laboratory'],
 ['pwa_upgrade',f=>f.realPwaMigrationReviewed===true,'Production service-worker upgrade not reviewed'],
 ['rollback',f=>f.databaseRollbackRehearsed===true&&f.frontendRollbackRehearsed===true,'Full rollback not rehearsed'],
 ['compatibility',f=>f.legacyClientsProtected===true,'Existing 5.36.5 clients may keep writing or fail unexpectedly'],
 ['financial_approval',f=>f.financialReleaseApproved===true,'Financial release approval missing']
];
function evaluate(f,{now=new Date()}={}){
 if(!f||f.schema!=='trace-20-production-facts-v1')throw Error('Unexpected report schema');
 let checkedAt=Date.parse(f.checkedAt||'');
 const blockers=[];
 if(!Number.isFinite(checkedAt)||checkedAt>now.getTime()+60000||
   now.getTime()-checkedAt>24*60*60*1000)
  blockers.push({id:'fresh_inventory',reason:'Supabase and Vercel inventory older than 24 hours or invalid'});
 for(const [id,accept,reason] of CHECKS){
  try{if(!accept(f))blockers.push({id,reason})}
  catch{blockers.push({id,reason})}
 }
 return Object.freeze({
  schema:'trace-20-production-preflight-v1',
  checkedAt:f.checkedAt,
  decision:blockers.length?'NO-GO':'PRECHECK-PASS-NOT-A-DEPLOYMENT',
  productionReady:false,
  // A passing metadata checklist is NOT a financial release or authorization
  // to apply SQL. Human review of actual client/server changes is mandatory.
  manualReviewMandatory:true,
  liveChangesMade:false,
  blockers
 });
}
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--facts')
  throw Error('Usage: node scripts/trace-20-production-release-gate.cjs --facts <sanitized-meta.json>');
 const file=path.resolve(args[1]);
 const report=evaluate(JSON.parse(fs.readFileSync(file,'utf8')));
 console.log(JSON.stringify(report,null,2));
 if(report.decision==='NO-GO')process.exitCode=2;
}
module.exports={evaluate,CHECKS,EXPECTED_PROJECT,EXPECTED_STABLE};
