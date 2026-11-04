'use strict';
/*
 * TRACE 2.0 candidate: fail-closed static inventory of hosted persistence.
 * Reads the actual scripts referenced by the fictional candidate HTML.
 * Never makes network, authentication or data calls and never reports
 * production safety from source analysis alone.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const ENTRY='trace-international-preview.html';
const READ_ONLY=new Set([
 'trace_csv_evidence_guard_ready','trace_separation_status',
 'trace_household_change_status'
]);
const GUARDED=new Map([
 ['trace_cas_delete_document','removeDocument'],
 ['trace_cas_save_household_settings','saveHouseholdSettings'],
 ['trace_cas_save_document','saveDocument']
]);
const ALWAYS_BLOCK=new Set([
 'trace_cas_save_document:seedNewHouseholdCategories',
 'trace_delete_my_solo_space','trace_separation_respond',
 'trace_household_change_respond','rotate_household_invite',
 'household_members:update'
]);
function lineNumber(src,index){return src.slice(0,index).split('\n').length}
function functionAt(src,index){
 const expr=/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
 let found=null,m;
 while((m=expr.exec(src))&&m.index<index)found=m[1];
 return found;
}
function scriptSources(html){
 const scripts=[];
 for(const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)){
  const f=m[1].split('?')[0];
  if(/^https?:\/\//.test(f))continue;
  if(!/^[a-zA-Z0-9_./-]+\.(?:js|mjs)$/.test(f)||f.includes('..')||f.startsWith('/'))
   throw Error('Unexpected candidate script '+f);
  if(!scripts.includes(f))scripts.push(f);
 }
 if(!scripts.includes('v5-app-5.37.0.js')||
    !scripts.includes('trace-household-change-1.0.0.js')||
    !scripts.includes('trace-separation-1.1.0.js'))
  throw Error('Incomplete candidate script inventory');
 return scripts;
}
function scanScript(file,src){
 const found=[],add=(type,id,index,method)=>{
  const fn=functionAt(src,index);
  let coverage='untracked';
  if(type==='rpc'&&READ_ONLY.has(id))coverage='read-only';
  else if(type==='rpc'&&GUARDED.get(id)===fn)coverage='guarded';
  else if(type==='rpc'&&!ALWAYS_BLOCK.has(id)&&!ALWAYS_BLOCK.has(id+':'+fn))
   coverage='unreviewed';
  else if(type==='write'&&!ALWAYS_BLOCK.has(id+':'+method))
   coverage='unreviewed';
  // Observability is not durability: monitored calls stay release blockers.
  const prefix=src.slice(src.lastIndexOf('\n',index)+1,index);
  if(!['guarded','read-only'].includes(coverage)&&
    /(?:trace20TrackAux|Trace20MutationTracker\.run)\s*\(\s*['"][a-z][a-z0-9:-]{2,70}['"]\s*,\s*\(\)\s*=>\s*$/.test(prefix))
    coverage='observed-only';
  const entry={file,line:lineNumber(src,index),kind:type,id,
   function:fn||'unresolved',coverage};
  if(method)entry.method=method;
  found.push(entry);
 };
 const rpc=/\b(?:current\.)?client\s*\.\s*rpc\s*\(\s*['"]([^'"]+)['"]/g;
 for(const m of src.matchAll(rpc))add('rpc',m[1],m.index);
 const write=/\b(?:current\.)?client\s*\.\s*from\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/g;
 for(const m of src.matchAll(write))add('write',m[1],m.index,m[2]);
 const auth=/\b(?:current\.)?client\s*\.\s*auth\s*\.\s*(signInWithPassword|signOut|signUp|updateUser)\s*\(/g;
 for(const m of src.matchAll(auth))add('session',m[1],m.index);
 return found.sort((a,b)=>a.line-b.line);
}
function audit({html,load}={}){
 const htmlSource=html??fs.readFileSync(path.join(ROOT,ENTRY),'utf8');
 const scripts=scriptSources(htmlSource);
 const resolveFile=load??(f=>fs.readFileSync(path.join(ROOT,f),'utf8'));
 const evidence=crypto.createHash('sha256');
 const paths=[];
 for(const f of scripts){
  const src=resolveFile(f);
  if(typeof src!=='string')throw Error('Missing source '+f);
  evidence.update(f+'\0');evidence.update(src);
  paths.push(...scanScript(f,src));
 }
 const blocked=paths.filter(x=>x.coverage!=='guarded'&&x.coverage!=='read-only');
 const guarded=paths.filter(x=>x.coverage==='guarded');
 const observed=paths.filter(x=>x.coverage==='observed-only');
 const untracked=paths.filter(x=>['untracked','unreviewed'].includes(x.coverage));
 // Even perfect static coverage never proves hosted durability/synchronization.
 return Object.freeze({
  schema:'trace-20-remote-mutation-inventory-v1',
  decision:'NO-GO',
  staticAuditOnly:true,completeCoverage:false,
  scripts:scripts.length,sourceFingerprint:evidence.digest('hex'),
  scanned:paths.length,guarded:guarded.length,observed:observed.length,
  untracked:untracked.length,requiresReview:blocked.length,
  missingRealEvidence:[
   'All non-CAS and lifecycle write paths must expose a shared in-flight tracker',
   'Persisted success and errors must be independently confirmed by hosted Auth/RLS/CAS',
   'Import/unsaved-draft state must be read from the running application',
   'No physical iPhone or production data migration has been verified'
  ],paths,blocked
 });
}
if(require.main===module){
 const result=audit();
 console.log(JSON.stringify(result,null,2));
 if(process.argv.includes('--strict')&&result.decision!=='GO')process.exitCode=2;
}
module.exports={audit,scriptSources,scanScript};
