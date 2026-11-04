'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),cp=require('node:child_process');
const {buildCutoverWorker,validate,STATIC}=require('../scripts/trace-20-cutover-worker.cjs');
function harness({offline=false,windows=1}={}){
 const b=buildCutoverWorker(),handlers={},deleted=[],added=[];
 let activation=0,claims=0,fetches=0;const responses=[];
 const cache={addAll:async items=>{added.push(...items.map(x=>x.url))},match:async()=>null};
 const caches={open:async k=>{assert.equal(k,b.cache);return cache},
  keys:async()=>['trace-shell-v5.36.5','trace-shell-v5.37.0:old',
   'trace-lab-537:old','other-app'],delete:async k=>(deleted.push(k),true)};
 const self={location:{href:'https://trace.example.test/sw.js'},registration:{waiting:null},
  addEventListener:(name,fn)=>handlers[name]=fn,
  skipWaiting:async()=>{activation++},clients:{claim:async()=>{claims++},
   matchAll:async()=>Array.from({length:windows},(_,i)=>({id:i?'tab-two':'tab-one'}))}};
 const fetch=async()=>{fetches++;if(offline)throw Error('offline');return{ok:true}};
 const Request=class {constructor(url,options={}){this.url=String(url);this.cache=options.cache}};
 const Response=class {constructor(body,options){this.body=body;this.status=options.status;this.headers=options.headers}};
 vm.runInNewContext(b.source,{self,caches,fetch,URL,Request,Response,Promise,Set});
 const event=()=>{let task=Promise.resolve();return{source:{id:'tab-one'},
  ports:[{postMessage:msg=>responses.push(msg)}],
  waitUntil:p=>task=Promise.resolve(p),done:()=>task}};
 return{built:b,handlers,self,deleted,added,event,responses,stats:()=>({activation,claims,fetches})};
}
const req=(path,method='GET',mode='cors',auth=false)=>({url:'https://trace.example.test/'+path,
 method,mode,headers:{get:key=>auth&&key==='authorization'?'Bearer fake':null}});
test('worker is a reproducible draft and is not the live sw.js',()=>{
 const x=buildCutoverWorker();
 assert.match(x.cache,/^trace-shell-v5\.37\.0:[a-f0-9]{24}$/);
 assert.match(x.source,/NOT REGISTERED OR RELEASED/);
 assert.deepEqual(x.files,STATIC);
 assert.ok(x.files.every(f=>f.endsWith('.js')||f.endsWith('.css')));
});
test('invalid/mutable/cross-tenant/static credentials are prohibited',()=>{
 for(const x of ['config.js','index.html','sw.js','cloud.js',
 'statements/receipt.pdf','transactions.json','../token.js','/absolute.js',
 'auth/v1/private.js','rest/v1/accounts.js']){
  assert.throws(()=>validate(['v5-app-5.37.0.js',x]),/Forbidden/);
 }
 assert.throws(()=>validate([]),/non-empty/i);
 assert.throws(()=>validate(['v5-app-5.37.0.js','v5-app-5.37.0.js']),/unique/i);
});
test('install precaches only immutable code and does not auto skip waiting',async()=>{
 const h=harness(),e=h.event();h.handlers.install(e);await e.done();
 assert.equal(h.added.length,STATIC.length);
 assert.ok(h.added.every(url=>url.startsWith('https://trace.example.test/')));
 assert.equal(h.stats().activation,0);
});
test('activate preserves older shell and unrelated names with no clients.claim',async()=>{
 const h=harness(),e=h.event();h.handlers.activate(e);await e.done();
 assert.deepEqual(h.deleted,[]);
 assert.equal(h.stats().claims,0);
});
test('only exact explicit consent and matching cache can initiate skipWaiting',async()=>{
 const h=harness();
 for(const data of [{type:'SKIP_WAITING',cache:h.built.cache},
  {type:'TRACE_2_0_ACTIVATE',cache:'wrong',userConfirmed:true},
  {type:'TRACE_2_0_ACTIVATE',cache:h.built.cache},
  {type:'TRACE_2_0_ACTIVATE',cache:h.built.cache,userConfirmed:false}]){
  const e=h.event();h.handlers.message({...e,data});await e.done();
 }
 assert.equal(h.stats().activation,0);
 const e=h.event();h.handlers.message({...e,data:{
  type:'TRACE_2_0_ACTIVATE',cache:h.built.cache,userConfirmed:true}});await e.done();
 assert.equal(h.stats().activation,1);
 assert.equal(h.responses.at(-1).type,'TRACE_2_0_ACCEPTED');
});
test('multi-tab activation is blocked by the waiting worker, even with consent',async()=>{
 const h=harness({windows:2}),e=h.event();
 h.handlers.message({...e,data:{type:'TRACE_2_0_ACTIVATE',
  cache:h.built.cache,userConfirmed:true}});await e.done();
 assert.equal(h.stats().activation,0);
 assert.equal(h.responses.at(-1).reason,'multiple-tabs');
});
test('missing source identity blocks activation without affecting unrelated caches',async()=>{
 const h=harness(),e=h.event();
 h.handlers.message({...e,source:null,data:{type:'TRACE_2_0_ACTIVATE',
  cache:h.built.cache,userConfirmed:true}});await e.done();
 assert.equal(h.stats().activation,0);assert.deepEqual(h.deleted,[]);
});
test('financial, authenticated, external, POST, and query requests bypass this worker',()=>{
 const h=harness();
 const blocked=[
 req('config.js'),req('api/balances'),req('documents/statement.pdf'),
 req('v5-app-5.37.0.js?token=secret'),req('v5-app-5.37.0.js','POST'),
 req('v5-app-5.37.0.js','GET','cors',true),req('rest/v1/accounts'),
 {...req('v5-app-5.37.0.js'),url:'https://external.example.test/v5-app-5.37.0.js'}
 ];
 for(const request of blocked)h.handlers.fetch({request,respondWith:()=>assert.fail('Forbidden intercept')});
 assert.equal(h.stats().fetches,0);
});
test('only strictly allowlisted CSS and JS pass through isolated static cache',async()=>{
 const h=harness();
 for(const name of ['v5-app-5.37.0.js','trace-premium-panels-5.37.0.css']){
  let pending;h.handlers.fetch({request:req(name),respondWith:p=>pending=p});
  await pending;
 }
 assert.equal(h.stats().fetches,2);
});
test('offline navigation is a fail-closed inert 503, not a banking UI',async()=>{
 const h=harness({offline:true});
 let pending;h.handlers.fetch({request:req('index.html?fake=1','GET','navigate'),respondWith:p=>pending=p});
 const response=await pending;
 assert.equal(response.status,503);
 assert.match(response.body,/Connexion indisponible/);
 assert.doesNotMatch(response.body,/account|balance|montant|transaction|user_id/i);
 assert.equal(response.headers['Cache-Control'],'no-store');
});
test('original 5.36.5 worker deletes other cache owners; candidate does not',async()=>{
 const old=cp.execFileSync('git',['show','02c70f50e7e51da79b77a91dde96a03c6c719909:sw.js'],{encoding:'utf8'});
 const handlers={},deleted=[];
 const caches={keys:async()=>['trace-shell-v5.36.5','other-app','trace-lab-537:unrelated'],
  delete:async k=>(deleted.push(k),true)};
 vm.runInNewContext(old,{self:{addEventListener:(k,f)=>handlers[k]=f,clients:{claim:async()=>{}}},caches,URL});
 let pending;handlers.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(deleted,['other-app','trace-lab-537:unrelated']);
 const h=harness(),e=h.event();h.handlers.activate(e);await e.done();assert.deepEqual(h.deleted,[]);
});
