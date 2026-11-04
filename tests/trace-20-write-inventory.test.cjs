'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {audit,scriptSources,scanScript}=require('../scripts/trace-20-write-inventory.cjs');
const root=path.resolve(__dirname,'..');
test('audit reads every locally linked script from actual 2.0 candidate',()=>{
 const x=audit();
 assert.equal(x.schema,'trace-20-remote-mutation-inventory-v1');
 assert.equal(x.decision,'NO-GO');
 assert.equal(x.staticAuditOnly,true);
 assert.equal(x.completeCoverage,false);
 assert.ok(x.scripts>=35);
 assert.ok(x.scanned>=20);
 assert.match(x.sourceFingerprint,/^[0-9a-f]{64}$/);
});
test('existing CAS document/settings/delete functions are identified as guarded',()=>{
 const x=audit();
 for(const n of ['trace_cas_delete_document','trace_cas_save_document',
  'trace_cas_save_household_settings']){
  assert.ok(x.paths.some(p=>p.id===n&&p.coverage==='guarded'),n);
 }
});
test('direct non-queued writes in actual candidate block release',()=>{
 const x=audit();
 const expected=[
  ['v5-app-5.37.0.js','household_members','write'],
  ['v5-app-5.37.0.js','rotate_household_invite','rpc'],
  ['v5-app-5.37.0.js','trace_cas_save_document','rpc','seedNewHouseholdCategories'],
  ['v5-app-5.37.0.js','trace_delete_my_solo_space','rpc'],
  ['v5-app-5.37.0.js','create_household','rpc'],
  ['v5-app-5.37.0.js','join_household','rpc'],
  ['trace-separation-1.1.0.js','trace_separation_respond','rpc'],
  ['trace-household-change-1.0.0.js','trace_household_change_respond','rpc']
 ];
 for(const [file,id,kind,fn] of expected){
  assert.ok(x.blocked.some(p=>p.file===file&&p.id===id&&p.kind===kind&&
    (!fn||p.function===fn)),file+':'+id);
 }
 assert.equal(x.blocked.length,x.requiresReview);
 assert.ok(x.observed>=8,'Expected observed but still unverified paths');
});
test('known read-only RPC names cannot silently authorize new writes',()=>{
 const q=scanScript('fake.js',[
  "async function inspect(){await client.rpc('trace_separation_status');}",
  "async function save(){await client.rpc('trace_unreviewed_mutation');}",
  "async function other(){await client.from('documents').update({foo:1});}"
 ].join('\n'));
 assert.deepEqual(q.map(x=>x.coverage),['read-only','unreviewed','unreviewed']);
});
test('same CAS RPC is not automatically marked safe outside guarded function',()=>{
 const q=scanScript('fake.js',[
  "async function saveDocument(){await client.rpc('trace_cas_save_document',{foo:1});}",
  "async function seedNewHouseholdCategories(){await client.rpc('trace_cas_save_document',{foo:1});}"
 ].join('\n'));
 assert.equal(q[0].coverage,'guarded');
 assert.equal(q[1].coverage,'untracked');
});
test('source changes introduce new unreviewed calls instead of a green badge',()=>{
 const html=fs.readFileSync(path.join(root,'trace-international-preview.html'),'utf8');
 const normal=f=>fs.readFileSync(path.join(root,f),'utf8');
 const x=audit({html,load:f=>f==='v5-app-5.37.0.js'?
  normal(f)+"\nasync function unsafeNew(){await client.rpc('new_rpc_to_save_finances',{p:1});}\n":normal(f)});
 assert.ok(x.blocked.some(p=>p.id==='new_rpc_to_save_finances'&&p.coverage==='unreviewed'));
 assert.equal(x.completeCoverage,false);
});
test('a missing or traversal-linked candidate source makes inventory fail',()=>{
 const html=fs.readFileSync(path.join(root,'trace-international-preview.html'),'utf8');
 assert.throws(()=>scriptSources(html.replace('v5-app-5.37.0.js','../private.js')),
  /Unexpected candidate script|Incomplete/);
 assert.throws(()=>audit({html,load:f=>f==='v5-app-5.37.0.js'?undefined:''}),/Missing source/);
});
test('live signup/auth session work remains explicit upgrade blocker',()=>{
 const x=audit();
 for(const id of ['signInWithPassword','signOut','create_household','join_household'])
  assert.ok(x.blocked.some(p=>p.id===id));
 assert.ok(x.missingRealEvidence.length>=4);
});
test('strict release gate returns NO-GO without mutating user data',()=>{
 const cp=require('node:child_process');
 const p=cp.spawnSync(process.execPath,['scripts/trace-20-write-inventory.cjs','--strict'],
  {cwd:root,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 assert.equal(p.status,2);
 const report=JSON.parse(p.stdout);
 assert.equal(report.decision,'NO-GO');
 assert.equal(report.staticAuditOnly,true);
 assert.ok(report.blocked.length>0);
 assert.doesNotMatch(p.stdout,/Bearer |supabasePublishableKey|BEGIN PRIVATE KEY/);
});

test('monitored auxiliary RPCs are observed but are NOT qualified as durable',()=>{
 const x=audit();
 for(const id of ['rotate_household_invite','trace_separation_respond',
 'trace_household_change_respond','create_household','join_household',
 'trace_delete_my_solo_space']){
  assert.ok(x.blocked.some(p=>p.id===id&&p.coverage==='observed-only'),id);
 }
 assert.equal(x.decision,'NO-GO');
 assert.equal(x.completeCoverage,false);
 assert.ok(x.requiresReview>=x.observed);
});
test('inventoried unwrapped RPC remains unreviewed, not auto-approved',()=>{
 const x=scanScript('fake.js',"async function bad(){await client.rpc('trace_unknown_write');}");
 assert.equal(x[0].coverage,'unreviewed');
});
