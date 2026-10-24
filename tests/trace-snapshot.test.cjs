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
test('CLI creates and unpacks exclusively local files, refusing any overwrite',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'trace-fictional-snapshot-'));
 try{
  const raw=path.join(dir,'input.json'),snapshot=path.join(dir,'snapshot.json'),out=path.join(dir,'restored.json');
  await fs.writeFile(raw,JSON.stringify(payload()));
  const run=(...args)=>spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/trace-snapshot.mjs'),...args],{encoding:'utf8'});
  assert.equal(run('create',raw,snapshot).status,0);
  assert.notEqual(run('create',raw,snapshot).status,0);
  assert.equal((await fs.stat(snapshot)).mode&0o777,0o600);
  assert.equal(run('verify',snapshot,'--expected-documents','2').status,0);
  assert.notEqual(run('verify',snapshot,'--expected-documents','3').status,0);
  assert.equal(run('unpack',snapshot,out).status,0);
  assert.deepEqual(JSON.parse(await fs.readFile(out,'utf8')),payload());
  assert.notEqual(run('unpack',snapshot,raw).status,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
