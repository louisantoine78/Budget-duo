'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const marker='const trace20AuxPending=new Map(),trace20AuxFailures=new Set();';
const final='window.Trace20MutationTracker=Object.freeze({run:trace20TrackAux});';
const begin=app.indexOf(marker),end=app.indexOf(final,begin);
if(begin<0||end<0||app.indexOf(marker,begin+1)!==-1)
 throw Error('Actual auxiliary tracker was not found exactly once.');
const realCode=app.slice(begin,end+final.length);
function build(){
 const window={},context={window,Promise,Map,Set,Error,String};
 vm.runInNewContext(realCode,context);
 const inspect=()=>vm.runInContext('({pending:[...trace20AuxPending.entries()],failed:[...trace20AuxFailures]})',context);
 return{run:window.Trace20MutationTracker.run,inspect};
}
const delay=()=>{let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no});return{promise,resolve,reject}};
test('exact candidate tracker handles parallel auxiliary writes without early idle',async()=>{
 const x=build(),a=delay(),b=delay();
 const p=x.run('profile:name',()=>a.promise);
 const q=x.run('profile:name',()=>b.promise);
 // Let Promise.resolve().then(operation) run.
 await Promise.resolve();
 assert.equal(x.inspect().pending[0][1],2);
 a.resolve({data:'fictional A',error:null});
 await p;
 assert.equal(x.inspect().pending[0][1],1);
 b.resolve({data:'fictional B',error:null});
 await q;
 assert.equal(x.inspect().pending.length,0);
 assert.equal(x.inspect().failed.length,0);
});
test('returned Supabase error latches failure even if caller does not throw',async()=>{
 const x=build();
 const got=await x.run('household:invitation',async()=>({
  data:null,error:{message:'Fake rejected update',code:'PGRST_TEST'}}));
 assert.equal(got.error.code,'PGRST_TEST');
 assert.equal(x.inspect().pending.length,0);
 assert.deepEqual([...x.inspect().failed],['household:invitation']);
});
test('rejection latches failure, but error and return value are unchanged',async()=>{
 const x=build(),error=new Error('mock disconnection');
 await assert.rejects(x.run('household:create',async()=>{throw error}),e=>e===error);
 assert.deepEqual([...x.inspect().failed],['household:create']);
 assert.equal(x.inspect().pending.length,0);
});
test('successful retry does not erase a previously ambiguous failed remote write',async()=>{
 const x=build();
 await assert.rejects(x.run('household:delete',async()=>{throw Error('unconfirmed')}),/unconfirmed/);
 await x.run('household:delete',async()=>({data:{fictional:true},error:null}));
 assert.deepEqual([...x.inspect().failed],['household:delete']);
});
test('invalid calls never invoke the remote operation',async()=>{
 const x=build();let calls=0;
 await assert.rejects(x.run('INVALID LABEL',()=>{calls++}),/TRACE_AUX_TRACKER_INVALID_OPERATION/);
 await assert.rejects(x.run('valid:label',null),/TRACE_AUX_TRACKER_INVALID_OPERATION/);
 assert.equal(calls,0);
 assert.equal(x.inspect().pending.length,0);
});
test('actual candidate marks all high-risk profile, household, session and lifecycle calls',()=>{
 const required={
  'v5-app-5.37.0.js':[
   'profile:name','household:invitation','household:seed','household:delete',
   'household:create','household:join','session:signout','session:verify-delete',
   'session:login','session:signup'],
  'trace-separation-1.1.0.js':['household:separation','session:separation-verify'],
  'trace-household-change-1.0.0.js':['household:change','session:change-verify']
 };
 for(const [file,labels] of Object.entries(required)){
  const code=fs.readFileSync(path.join(root,file),'utf8');
  for(const label of labels)assert.ok(code.includes("'"+label+"'"),file+':'+label);
 }
 assert.ok(app.includes('const pendingImports=null;'),'unknown import parsing must stay blocked');
 assert.ok(app.includes('trace20PendingImportWrites++'));
 assert.ok(app.includes('trace20PendingImportWrites--'));
 assert.ok(app.includes('trace20AuxFailures.size'));
});
test('real import CAS queue counts queued and in-flight import writes, even for same document',async()=>{
 const start=app.indexOf('async function traceSerialWrite(key,task){');
 const end=app.indexOf('function traceConflictNotice(){',start);
 assert.ok(start>=0&&end>start);
 const source=app.slice(start,end);
 const ctx={window:{},Promise,Map,Set,Error};
 vm.runInNewContext([
 'let tracePendingWrites=0,traceBatchHadFailure=false,trace20PendingImportWrites=0;',
 'const traceWriteQueues=new Map(),traceUnsavedWriteKeys=new Set();',
 'let traceWritesBlocked=false;function sync(){}',source,
 'window.run=traceSerialWrite;',
 'window.snapshot=()=>({pending:tracePendingWrites,imports:trace20PendingImportWrites,failures:traceUnsavedWriteKeys.size});'
 ].join('\n'),ctx);
 const pause=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
 const a=pause(),b=pause();
 const p=ctx.window.run('["imports","fake01"]',()=>a.promise);
 const q=ctx.window.run('["imports","fake01"]',()=>b.promise);
 await Promise.resolve();
 assert.equal(ctx.window.snapshot().imports,2);
 assert.equal(ctx.window.snapshot().pending,2);
 a.resolve(true);await p;
 assert.equal(ctx.window.snapshot().imports,1);
 b.resolve(true);await q;
 assert.equal(ctx.window.snapshot().imports,0);
 assert.equal(ctx.window.snapshot().pending,0);
 const c=pause(),f=ctx.window.run('["import_days","fake-day"]',()=>c.promise);
 assert.equal(ctx.window.snapshot().imports,1);
 c.reject(Error('fictional import failure'));
 await assert.rejects(f,/fictional import failure/);
 assert.equal(ctx.window.snapshot().imports,0);
 assert.equal(ctx.window.snapshot().failures,1);
 const normal=pause(),z=ctx.window.run('["transactions","fake02"]',()=>normal.promise);
 assert.equal(ctx.window.snapshot().imports,0);
 normal.resolve(true);await z;
 assert.equal(ctx.window.snapshot().imports,0);
});
