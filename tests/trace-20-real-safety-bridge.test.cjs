'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {verifiedIdle,requestActivation}=require('../scripts/trace-20-upgrade-consent.cjs');
const candidate=fs.readFileSync(path.resolve(__dirname,'../v5-app-5.37.0.js'),'utf8');
const start=candidate.indexOf('function trace20FinancialSafetyRead(){');
const last='window.Trace20FinancialSafety=Object.freeze({read:trace20FinancialSafetyRead});';
const end=candidate.indexOf(last,start);
if(start<0||end<0||candidate.indexOf(last,end+1)>=0)
 throw Error('Candidate bridge is missing or ambiguous');
const actualBridge=candidate.slice(start,end+last.length);
function actual({status='synced',pending=0,queues=0,unsaved=0,batchFailure=false,
 blocked=false,sheet=false,bodySheet=false}={}){
 const window={};const document={
  querySelector(selector){
   if(selector==='#syncPill')return{dataset:{status}};
   if(selector==='#sheetBackdrop')return{classList:{contains:x=>x==='open'&&sheet}};
   return null;
  },
  body:{classList:{contains:x=>x==='sheet-open'&&bodySheet}}
 };
 const context={window,document};
 vm.runInNewContext([
  'let tracePendingWrites='+pending+';',
  'const traceWriteQueues=new Map('+JSON.stringify(
   Array.from({length:queues},(_,i)=>['doc'+i,1]))+');',
  'const traceUnsavedWriteKeys=new Set('+JSON.stringify(
   Array.from({length:unsaved},(_,i)=>'failed'+i))+');',
  'let traceBatchHadFailure='+JSON.stringify(batchFailure)+';',
  'let traceWritesBlocked='+JSON.stringify(blocked)+';',
  actualBridge
 ].join('\n'),context);
 return window.Trace20FinancialSafety.read();
}
test('actual 5.37.0 app exposes a read-only financial safety surface',()=>{
 assert.match(actualBridge,/tracePendingWrites/);
 assert.match(actualBridge,/traceUnsavedWriteKeys/);
 assert.match(actualBridge,/traceWritesBlocked/);
 const r=actual();
 assert.equal(r.source,'TRACE-5.37.0');
 assert.equal(r.pendingWrites,0);
 assert.equal(r.pendingSync,0);
 assert.equal(r.pendingImports,null);
 assert.equal(r.unsavedDrafts,0);
 assert.equal(r.verified,false);
 assert.equal(r.durable,false);
 assert.equal(r.coverageIncomplete,true);
 assert.equal(verifiedIdle(r),false);
 assert.equal(verifiedIdle({...r,verified:true,durable:true}),false,
  'unknown import state must remain fail-closed even if verification is toggled');
 assert.equal(Object.isFrozen(r),true);
});
test('real document queue in-flight count is reported, including queued requests',()=>{
 assert.equal(actual({pending:2}).pendingWrites,2);
 assert.equal(actual({pending:1,queues:3}).pendingWrites,3);
});
test('failed writes and CAS conflicts are never mistaken for synced data',()=>{
 assert.equal(actual({unsaved:2}).pendingSync,2);
 assert.ok(actual({batchFailure:true}).pendingSync>=1);
 assert.ok(actual({blocked:true}).pendingSync>=1);
 assert.ok(actual({status:'saving'}).pendingSync>=1);
 assert.ok(actual({status:'error'}).pendingSync>=1);
});
test('any open transaction sheet conservatively counts a possible unsaved draft',()=>{
 assert.equal(actual({sheet:true}).unsavedDrafts,1);
 assert.equal(actual({bodySheet:true}).unsavedDrafts,1);
});
test('the real app bridge can NEVER authorize upgrade before full coverage review',async()=>{
 const readSafety=async()=>actual();
 let prompted=false;
 const r=await requestActivation({
  registration:{waiting:{postMessage:()=>{throw Error('forbidden')}}},
  cache:'trace-shell-v5.37.0:01234567890123456789abcd',
  readSafety,
  askConsent:async()=>{prompted=true;return true},
  isOnline:()=>true,
  MessageChannelCtor:class{}
 });
 assert.deepEqual(r,{status:'blocked',reason:'writes-or-drafts-pending'});
 assert.equal(prompted,false);
});
test('no sensitive client objects or financial account data are exported',()=>{
 assert.deepEqual(Object.keys(actual()).sort(),[
  'coverageIncomplete','durable','pendingImports','pendingSync',
  'pendingWrites','source','unsavedDrafts','verified'].sort());
 assert.doesNotMatch(actualBridge,/client\.(?:from|rpc)|session\?\.|household\?\.|JSON\.stringify\(state/);
});
