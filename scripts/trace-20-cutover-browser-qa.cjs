'use strict';
/* Localhost-only SW 5.36.5 -> TRACE 2.0 upgrade with synthetic browser data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const http=require('node:http'),cp=require('node:child_process');
const {chromium,webkit}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const {buildCutoverWorker}=require('./trace-20-cutover-worker.cjs');
const root=path.resolve(__dirname,'..'),stable=cp.execFileSync('git',[
 'show','02c70f50e7e51da79b77a91dde96a03c6c719909:sw.js'],{cwd:root,encoding:'utf8'});
const candidate=buildCutoverWorker();
let revision='stable',hits=0;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const shell='<!doctype html><html><meta charset="utf-8"><title>Fictional migration QA</title><body><h1>Simulated finance data only</h1></body></html>';
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 const headers={'Cache-Control':'no-store','Service-Worker-Allowed':'/'};
 if(p==='/sw.js'){hits++;res.writeHead(200,{...headers,'Content-Type':'text/javascript'});
  res.end(revision==='stable'?stable:candidate.source);return}
 if(p==='/index.html'||p==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html'});res.end(shell);return}
 if(!/^\/[A-Za-z0-9_./-]+$/.test(p)||p.includes('..')){res.writeHead(400);res.end();return}
 try{const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error('path');
  const bytes=fs.readFileSync(f);
  res.writeHead(200,{...headers,'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
  res.end(bytes);}catch{res.writeHead(404);res.end('missing')}
});
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function verify(engine,name,launchOptions={}){
 revision='stable';
 const browser=await engine.launch({headless:true,...launchOptions});
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await ctx.newPage();
 let errorLogs=[];
 page.on('pageerror',e=>errorLogs.push(e.message));
 try{
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/index.html',{waitUntil:'load'});
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  if(!r.active)throw Error('stable worker did not activate');
 });
 await page.evaluate(async()=>{
  await caches.open('unrelated-app-cache');
  await caches.open('trace-lab-537:unrelated');
  localStorage.setItem('qa-draft','FICTITIOUS 50 EUR not submitted');
 });
 const initial=await page.evaluate(async()=>({controller:!!navigator.serviceWorker.controller,
  keys:await caches.keys(),draft:localStorage.getItem('qa-draft')}));
 assert.ok(initial.keys.includes('trace-shell-v5.36.5'));
 revision='candidate';
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');
  await r.update();
  const expires=Date.now()+12000;
  while(!r.waiting&&Date.now()<expires)await new Promise(resolve=>setTimeout(resolve,80));
  if(!r.waiting)throw Error('candidate worker not waiting');
 });
 const before=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');
  return{waiting:!!r.waiting,oldActive:!!r.active,keys:await caches.keys(),
   draft:localStorage.getItem('qa-draft'),waitingUrl:r.waiting?.scriptURL}});
 assert.equal(before.waiting,true);assert.equal(before.draft,'FICTITIOUS 50 EUR not submitted');
 for(const k of ['trace-shell-v5.36.5','unrelated-app-cache','trace-lab-537:unrelated',candidate.cache])
  assert.ok(before.keys.includes(k),'missing before consent: '+k);
 // Another live 5.36.5 tab must prevent a user from forcing activation.
 const second=await ctx.newPage();
 await second.goto(base+'/index.html',{waitUntil:'load'});
 await second.evaluate(()=>localStorage.setItem('qa-second-tab','FICTITIOUS unsaved edit'));
 // A candidate browser-side adapter checks persisted state before allowing
 // an explicit user action to contact the waiting worker.
 await page.addScriptTag({path:path.resolve(root,'scripts/trace-20-upgrade-consent.cjs')});
 const askUpgrade=async({pendingWrites=0,unsavedDrafts=0,consent=true,durable=true,
   secondCheckBusy=false}={})=>page.evaluate(async({cache,pendingWrites,unsavedDrafts,consent,durable,secondCheckBusy})=>{
  const reg=await navigator.serviceWorker.getRegistration('/');
  let reads=0;
  return Trace20UpgradeConsent.requestActivation({
   registration:reg,cache,MessageChannelCtor:MessageChannel,isOnline:()=>true,
   readSafety:async()=>({verified:true,durable,pendingWrites:
     secondCheckBusy&&++reads>1?1:pendingWrites,pendingSync:0,pendingImports:0,unsavedDrafts}),
   askConsent:async()=>consent});
 },{cache:candidate.cache,pendingWrites,unsavedDrafts,consent,durable,secondCheckBusy});
 const unsaved=await askUpgrade({unsavedDrafts:1});
 assert.deepEqual(unsaved,{status:'blocked',reason:'writes-or-drafts-pending'});
 const writing=await askUpgrade({pendingWrites:1});
 assert.deepEqual(writing,{status:'blocked',reason:'writes-or-drafts-pending'});
 const notDurable=await askUpgrade({durable:false});
 assert.deepEqual(notDurable,{status:'blocked',reason:'writes-or-drafts-pending'});
 const declined=await askUpgrade({consent:false});
 assert.equal(declined.status,'declined');
 const race=await askUpgrade({secondCheckBusy:true});
 assert.equal(race.reason,'state-changed-after-consent');
 const refused=await askUpgrade();
 assert.equal(refused.status,'blocked');
 assert.equal(refused.reason,'multiple-tabs');
 assert.equal((await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration('/')).waiting!==null)),true);
 await second.close();
 const accepted=await askUpgrade();
 assert.equal(accepted.status,'activation-requested');
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');
  const expiry=Date.now()+12000;
  while((!r.active||r.waiting)&&Date.now()<expiry)await new Promise(resolve=>setTimeout(resolve,80));
  if(!r.active||r.waiting)throw Error('candidate did not activate');
 });
 const after=await page.evaluate(async()=>({keys:await caches.keys(),
  draft:localStorage.getItem('qa-draft')}));
 for(const k of ['trace-shell-v5.36.5','unrelated-app-cache','trace-lab-537:unrelated',candidate.cache])
  assert.ok(after.keys.includes(k),'deleted by candidate: '+k);
 assert.equal(after.draft,before.draft,'draft changed during update');
 await page.reload({waitUntil:'load'});
 const postReload=await page.evaluate(async()=>({draft:localStorage.getItem('qa-draft'),
  controlled:!!navigator.serviceWorker.controller}));
 assert.equal(postReload.draft,before.draft);
 assert.equal(postReload.controlled,true);
 const resources=await page.evaluate(async(candidateCache)=>{
  const worker=await navigator.serviceWorker.getRegistration('/');
  const activeCache=await caches.open(candidateCache);
  return{staticAssets:(await activeCache.keys()).length,workerActive:!!worker.active};
 },candidate.cache);
 assert.equal(resources.staticAssets,candidate.files.length);
 await ctx.setOffline(true);
 const response=await page.goto(base+'/index.html?offline-check=1',{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),503,'offline must fail closed, not show a stale budget');
 assert.match(await page.locator('body').innerText(),/Connexion indisponible/);
 await ctx.setOffline(false);
 await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('qa-draft')),
  'FICTITIOUS 50 EUR not submitted','offline cycle must preserve local draft');
 if(errorLogs.length)throw Error('Browser JS errors: '+JSON.stringify(errorLogs));
 return{name,passed:true,stableRetained:true,unrelatedRetained:true,
  optInRequired:true,multiTabBlocked:true,unsafeDraftBlocked:true,
  pendingWritesBlocked:true,userDeclineBlocked:true,postConsentRaceBlocked:true,
  syntheticDraftRetained:true,afterReload:true,
  offlineFailsClosed:true,cachedStaticCount:resources.staticAssets,
  workerRequests:hits,pageErrors:0};
 }finally{await ctx.close();await browser.close()}
}
(async()=>{try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const results=[];
 results.push(await verify(chromium,'Chromium',{
  executablePath:process.env.TRACE_CHROMIUM_EXECUTABLE, args:['--no-sandbox']}));
 results.push(await verify(webkit,'WebKit'));
 console.log(JSON.stringify({passed:true,labOnly:true,results}));
 }catch(e){console.error('TRACE 2.0 SW browser upgrade FAILED:',e.stack);process.exitCode=1;
 }finally{server.close()}
})();
