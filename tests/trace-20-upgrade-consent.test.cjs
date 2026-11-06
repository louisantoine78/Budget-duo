'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {requestActivation,verifiedIdle}=require('../scripts/trace-20-upgrade-consent.cjs');
const cache='trace-shell-v5.37.0:01234567890123456789abcd';
const safe=()=>({verified:true,durable:true,pendingWrites:0,
 pendingSync:0,pendingImports:0,unsavedDrafts:0});
function context(changes={}){
 let posted=0;
 const waiting={postMessage:()=>posted++};
 const values={registration:{waiting},cache,readSafety:async()=>safe(),
  askConsent:async()=>true,MessageChannelCtor:class{},isOnline:()=>true,...changes};
 return{values,posted:()=>posted,waiting};
}
test('safety state demands explicit verified durable absence of all four queues',()=>{
 assert.equal(verifiedIdle(safe()),true);
 for(const key of ['verified','durable','pendingWrites','pendingSync','pendingImports','unsavedDrafts']){
  const x=safe();
  if(typeof x[key]==='boolean')x[key]=false;else x[key]=1;
  assert.equal(verifiedIdle(x),false,key);
 }
 for(const key of ['pendingWrites','pendingSync','pendingImports','unsavedDrafts']){
  const x=safe();delete x[key];assert.equal(verifiedIdle(x),false,key);
 }
 assert.ok(!verifiedIdle(null));
});
test('unknown waiting worker cannot be contacted',async()=>{
 const x=context({registration:{waiting:null}});
 assert.deepEqual(await requestActivation(x.values),{status:'no-update'});
 assert.equal(x.posted(),0);
});
test('no safety reader or no real consent callback is fail-closed',async()=>{
 for(const key of ['readSafety','askConsent']){
  const x=context({[key]:undefined});
  assert.equal((await requestActivation(x.values)).status,'blocked');
  assert.equal(x.posted(),0);
 }
});
test('offline or an unrecognised version is blocked before prompting',async()=>{
 const x=context({isOnline:()=>false});
 assert.equal((await requestActivation(x.values)).reason,'offline-or-unknown');
 assert.equal(x.posted(),0);
 const y=context({cache:'trace-shell-v5.36.5'});
 assert.equal((await requestActivation(y.values)).reason,'unknown-version');
 assert.equal(y.posted(),0);
});
test('every pending queue prevents notification to waiting worker',async()=>{
 for(const key of ['pendingWrites','pendingSync','pendingImports','unsavedDrafts']){
  const x=context({readSafety:async()=>({...safe(),[key]:1})});
  assert.equal((await requestActivation(x.values)).reason,'writes-or-drafts-pending',key);
  assert.equal(x.posted(),0);
 }
});
test('user declines: no worker message sent',async()=>{
 const x=context({askConsent:async()=>false});
 assert.equal((await requestActivation(x.values)).status,'declined');
 assert.equal(x.posted(),0);
});
test('state changing during confirmation is rechecked and blocked',async()=>{
 let reads=0;
 const x=context({readSafety:async()=>({...safe(),pendingWrites:++reads>1?1:0})});
 assert.equal((await requestActivation(x.values)).reason,'state-changed-after-consent');
 assert.equal(reads,2);assert.equal(x.posted(),0);
});
test('waiting worker changing while user reads confirmation is blocked',async()=>{
 const x=context();x.values.askConsent=async()=>{x.values.registration.waiting={postMessage:()=>{throw Error('should not send')}};return true};
 assert.equal((await requestActivation(x.values)).reason,'state-changed-after-consent');
 assert.equal(x.posted(),0);
});
test('unavailable response channel blocks without writing',async()=>{
 const x=context({MessageChannelCtor:undefined});
 assert.equal((await requestActivation(x.values)).reason,'no-response-channel');
 assert.equal(x.posted(),0);
});
