'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const api=import('../scripts/trace-snapshot.mjs');
const household='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002';
const payload=()=>({household:{id:household,settings:{primaryBankAccountByOwner:{la:'eur'},currency:'CAD'}},
 household_members:[{household_id:household,user_id:user,slot:'la',display_name:'Fictional'}],
 documents:[{household_id:household,collection:'transactions',item_id:'x',data:{id:'x',status:'pending',
  bankAmount:46.2,bankCurrency:'EUR',amountOriginal:50,currency:'USD',amountCAD:null}},
 {household_id:household,collection:'accounts',item_id:'eur',data:{id:'eur',currency:'EUR',owner:'la'}}]});
test('portable snapshot preserves all native, historical and pending fields without conversion',async()=>{
 const {createSnapshot,verifySnapshot,unpackSnapshot}=await api;
 const data=payload(),snapshot=createSnapshot(data,{sourceCommit:'a'.repeat(40)});
 assert.deepEqual(unpackSnapshot(snapshot),data);assert.equal(snapshot.inventory.documents,2);
 assert.equal(verifySnapshot(snapshot,{expectedDocuments:2}).integrityVerified,true);
 assert.equal(verifySnapshot(snapshot).completenessVerified,false);
 assert.equal(snapshot.payload.documents[0].data.amountCAD,null);
});
test('changing a monetary amount or any metadata invalidates the checksum',async()=>{
 const {createSnapshot,verifySnapshot}=await api;
 for(const mutate of [s=>s.payload.documents[0].data.bankAmount=50,
  s=>s.inventory.documents=3,s=>s.sourceCommit='b'.repeat(40)]){
  const s=createSnapshot(payload());mutate(s);assert.throws(()=>verifySnapshot(s),/Empreinte/);
 }
});
test('duplicate IDs, cross-household rows and lossy JSON are rejected before backup',async()=>{
 const {createSnapshot}=await api;
 for(const mutate of [p=>p.documents.push(p.documents[0]),
  p=>p.documents[0].household_id=user,p=>p.documents[0].data.amountCAD=NaN,
  p=>p.household.settings.rate=undefined,p=>p.household_members[0].slot='unknown',
  p=>p.extra_private_table=[]]){
  const data=payload();mutate(data);assert.throws(()=>createSnapshot(data));
 }
});
test('an independently expected row count is checked without claiming completeness',async()=>{
 const {createSnapshot,verifySnapshot}=await api;
 assert.throws(()=>verifySnapshot(createSnapshot(payload()),{expectedDocuments:3}),/comptage/);
});
test('independent member counts catch incomplete couple backups despite valid SHA-256',async()=>{
 const {createSnapshot,verifySnapshot}=await api;
 const couple=payload();
 couple.household_members.push({household_id:household,
  user_id:'00000000-0000-4000-8000-000000000003',slot:'partner',display_name:'Partner'});
 assert.equal(verifySnapshot(createSnapshot(couple),{expectedMembers:2}).members,2);
 const incomplete=createSnapshot(payload()); // SHA is valid but partner was omitted before snapshot.
 assert.equal(verifySnapshot(incomplete).integrityVerified,true);
 assert.throws(()=>verifySnapshot(incomplete,{expectedMembers:2}),/Nombre de membres/);
});
test('independent collection counts reject omissions and swapped inventory categories',async()=>{
 const {createSnapshot,verifySnapshot}=await api;
 const expectedCollections={accounts:1,transactions:1};
 const full=createSnapshot(payload());
 const checked=verifySnapshot(full,{expectedDocuments:2,expectedMembers:1,expectedCollections});
 assert.deepEqual(checked.collections,expectedCollections);
 assert.equal(checked.completenessVerified,false);
 const missing=payload();missing.documents=missing.documents.filter(d=>d.collection==='accounts');
 const incomplete=createSnapshot(missing); // Internally consistent but missing transaction.
 assert.equal(verifySnapshot(incomplete).integrityVerified,true);
 assert.throws(()=>verifySnapshot(incomplete,{expectedCollections}),/Collections différentes/);
 for(const invalid of [[],null,{accounts:2},{accounts:1,transactions:0},
  {accounts:1,transactions:1,other:1},{accounts:1,transactions:'1'}])
  assert.throws(()=>verifySnapshot(full,{expectedCollections:invalid}),/Collections différentes/);
});
test('restore guard rejects a valid snapshot from another household or source commit',async()=>{
 const {createSnapshot,verifySnapshot,unpackSnapshot}=await api;
 const snapshot=createSnapshot(payload(),{sourceCommit:'a'.repeat(40)});
 const guards={expectedHouseholdId:household,expectedSourceCommit:'a'.repeat(40),
  expectedDocuments:2,expectedMembers:1,expectedCollections:{accounts:1,transactions:1}};
 assert.deepEqual(unpackSnapshot(snapshot,guards),payload());
 for(const wrong of [
  {expectedHouseholdId:user},
  {expectedHouseholdId:'not-a-uuid'},
  {expectedSourceCommit:'b'.repeat(40)},
  {expectedSourceCommit:'bad-sha'},
  {expectedMembers:2},
  {expectedCollections:{accounts:2}}
 ]){
  assert.throws(()=>verifySnapshot(snapshot,{...guards,...wrong}));
  assert.throws(()=>unpackSnapshot(snapshot,{...guards,...wrong}));
 }
 assert.equal(verifySnapshot(snapshot,guards).completenessVerified,false);
});
test('unpack CLI refuses incomplete but cryptographically valid backup without writing output',async()=>{
 const {createSnapshot}=await api;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'trace-fictional-restore-'));
 try{
  const snapshot=path.join(dir,'snapshot.json'),out=path.join(dir,'restored.json');
  const counts=path.join(dir,'source-counts.json');
  await fs.writeFile(snapshot,JSON.stringify(createSnapshot(payload(),{sourceCommit:'a'.repeat(40)})));
  await fs.writeFile(counts,JSON.stringify({accounts:1,transactions:1}));
  const run=(...args)=>spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/trace-snapshot.mjs'),...args],{encoding:'utf8'});
  const {sourceFingerprint}=await api;
  const guards=['--expected-household-id',household,'--expected-source-commit','a'.repeat(40),
   '--expected-documents','2','--expected-members','1','--expected-collections',counts,
   '--expected-payload-sha256',sourceFingerprint(payload()).payloadSha256];
  assert.notEqual(run('unpack',snapshot,out,...guards,'--expected-members','2').status,0);
  // A missing partner is NOT detected by the checksum; the independent count is mandatory.
  assert.notEqual(run('unpack',snapshot,out,'--expected-members','2').status,0);
  assert.notEqual(run('unpack',snapshot,out,'--expected-household-id',user).status,0);
  assert.notEqual(run('unpack',snapshot,out,'--expected-member','2').status,0,
   'A misspelled safety guard must never be silently ignored');
  assert.notEqual(run('unpack',snapshot,out,'--expected-members').status,0,
   'A missing expected count must reject before output');
  assert.notEqual(run('unpack',snapshot,out,'--expected-members','1','stray-value').status,0);
  assert.notEqual(run('unpack',snapshot,out,'--expected-source-commit','b'.repeat(40)).status,0);
  await assert.rejects(fs.stat(out),{code:'ENOENT'});
  assert.equal(run('unpack',snapshot,out,...guards).status,0);
  assert.deepEqual(JSON.parse(await fs.readFile(out,'utf8')),payload());
  assert.notEqual(run('unpack',snapshot,out,...guards).status,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('independent source fingerprint rejects same-count monetary tampering with a valid snapshot checksum',async()=>{
 const {createSnapshot,verifySnapshot,unpackSnapshot,sourceFingerprint}=await api;
 const source=payload(),evidence=sourceFingerprint(source);
 assert.equal(evidence.documents,2);
 assert.match(evidence.payloadSha256,/^[a-f0-9]{64}$/);
 const changed=payload();changed.documents[0].data.bankAmount=982.15;
 const regenerated=createSnapshot(changed,{sourceCommit:'a'.repeat(40)});
 assert.equal(verifySnapshot(regenerated,{expectedDocuments:2}).integrityVerified,true);
 const guards={expectedHouseholdId:household,expectedSourceCommit:'a'.repeat(40),
  expectedDocuments:2,expectedMembers:1,expectedCollections:{accounts:1,transactions:1},
  expectedPayloadSha256:evidence.payloadSha256};
 assert.throws(()=>verifySnapshot(regenerated,guards),/Empreinte du contenu/);
 assert.throws(()=>unpackSnapshot(regenerated,guards),/Empreinte du contenu/);
 const original=createSnapshot(source,{sourceCommit:'a'.repeat(40)});
 assert.deepEqual(unpackSnapshot(original,guards),source);
});
test('unpack CLI refuses missing independently verified guards and accepts fingerprinted raw export',async()=>{
 const {createSnapshot}=await api;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'trace-guarded-restore-'));
 try{
  const raw=path.join(dir,'raw.json'),snapshot=path.join(dir,'snapshot.json');
  const out=path.join(dir,'extracted.json'),counts=path.join(dir,'counts.json');
  const run=(...args)=>spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/trace-snapshot.mjs'),...args],{encoding:'utf8'});
  await fs.writeFile(raw,JSON.stringify(payload()));
  await fs.writeFile(snapshot,JSON.stringify(createSnapshot(payload(),{sourceCommit:'a'.repeat(40)})));
  await fs.writeFile(counts,JSON.stringify({accounts:1,transactions:1}));
  const fingerprint=run('fingerprint',raw);
  assert.equal(fingerprint.status,0,fingerprint.stderr);
  const digest=JSON.parse(fingerprint.stdout).payloadSha256;
  const guards=['--expected-household-id',household,'--expected-source-commit','a'.repeat(40),
   '--expected-documents','2','--expected-members','1','--expected-collections',counts,
   '--expected-payload-sha256',digest];
  assert.notEqual(run('unpack',snapshot,out).status,0);
  assert.notEqual(run('unpack',snapshot,out,...guards.slice(0,-2)).status,0);
  assert.notEqual(run('unpack',snapshot,out,...guards.slice(2)).status,0);
  assert.notEqual(run('unpack',snapshot,out,...guards.slice(0,-2),'--expected-payload-sha256','f'.repeat(64)).status,0);
  await assert.rejects(fs.stat(out),{code:'ENOENT'});
  const ok=run('unpack',snapshot,out,...guards);
  assert.equal(ok.status,0,ok.stderr);
  assert.deepEqual(JSON.parse(await fs.readFile(out,'utf8')),payload());
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('CLI creates and unpacks exclusively local files, refusing any overwrite',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'trace-fictional-snapshot-'));
 try{
  const raw=path.join(dir,'input.json'),snapshot=path.join(dir,'snapshot.json'),out=path.join(dir,'restored.json'),counts=path.join(dir,'source-counts.json');
  await fs.writeFile(raw,JSON.stringify(payload()));
  await fs.writeFile(counts,JSON.stringify({accounts:1,transactions:1}));
  const run=(...args)=>spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/trace-snapshot.mjs'),...args],{encoding:'utf8'});
  assert.equal(run('create',raw,snapshot).status,0);
  assert.notEqual(run('create',raw,snapshot).status,0);
  assert.equal((await fs.stat(snapshot)).mode&0o777,0o600);
  assert.equal(run('verify',snapshot,'--expected-documents','2','--expected-members','1',
   '--expected-collections',counts).status,0);
  assert.notEqual(run('verify',snapshot,'--expected-members','2').status,0);
  assert.notEqual(run('verify',snapshot,'--expected-documents','3').status,0);
  const {sourceFingerprint}=await api;
  const guards=['--expected-household-id',household,
   '--expected-documents','2','--expected-members','1','--expected-collections',counts,
   '--expected-payload-sha256',sourceFingerprint(payload()).payloadSha256];
  assert.notEqual(run('unpack',snapshot,out).status,0);
  assert.equal(run('unpack',snapshot,out,...guards).status,0);
  assert.deepEqual(JSON.parse(await fs.readFile(out,'utf8')),payload());
  assert.notEqual(run('unpack',snapshot,raw).status,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
