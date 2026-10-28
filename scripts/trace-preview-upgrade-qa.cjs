'use strict';
// TRACE 5.37.0 fictional laboratory: two-version service worker upgrade.
// Requires Chromium installed outside the repository. No live financial data.

const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const executablePath=process.env.TRACE_CHROMIUM_EXECUTABLE;
if(!executablePath)throw Error('TRACE_CHROMIUM_EXECUTABLE must be an isolated Chromium binary');
const root=process.env.TRACE_LAB_ROOT?path.resolve(process.env.TRACE_LAB_ROOT):path.resolve(__dirname,'..'),
 file='trace-international-preview-sw.js';
if(process.env.TRACE_LAB_ROOT&&!fs.existsSync(path.join(root,'trace-lab-export-audit.json')))
 throw Error('TRACE_LAB_ROOT must point to a fictional-only PWA export');
const initial=fs.readFileSync(path.join(root,file),'utf8');
const match=initial.match(/const CACHE=PREFIX\+'([a-f0-9]+)';/);
if(!match)throw Error('Unrecognized service-worker version');
const versionA=match[1],versionB='abcdef0123456789abcdef01';
assert.notEqual(versionA,versionB,'The fake new worker needs a distinct cache');
const candidate=initial.replace(match[0],"const CACHE=PREFIX+'"+versionB+"';");
let revision='a',workerRequests=0;const logs=[];
const mime={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname);
  const target=path.resolve(root,'.'+relative);
  if(!target.startsWith(root+'/'))throw Error('blocked');
  const isSW=target===path.resolve(root,file);
  if(isSW){workerRequests++;logs.push({sw:revision,count:workerRequests})}
  const bytes=isSW?(revision==='a'?initial:candidate):fs.readFileSync(target);
  response.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'}).end(bytes);
 }catch(error){response.writeHead(404).end();}
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:850},serviceWorkers:'allow'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const link=origin+'trace-international-preview.html';
 await page.goto(link,{waitUntil:'load'});
 await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:25000});
 await page.reload({waitUntil:'load'});
 await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true&&!!navigator.serviceWorker?.controller,{timeout:15000});
 const before=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  return{ready:TracePreviewPWA.ready,script:reg.active?.scriptURL,workerControlled:!!navigator.serviceWorker.controller,
   caches:(await caches.keys()).filter(x=>x.startsWith('trace-lab-537:'))};
 });
 await page.locator('#quickAdd').click();
 await page.locator('#manualTxName').fill('Brouillon pendant mise à jour');
 assert.equal(await page.locator('#manualTxName').inputValue(),'Brouillon pendant mise à jour');
 revision='b';
 const update=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  await reg.update();
  return{scope:reg.scope,waiting:!!reg.waiting,installing:!!reg.installing};
 });
 await page.waitForFunction(()=>!!document.querySelector('#tracePreviewOfflineStatus button'),{timeout:25000});
 const during=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  return{ready:TracePreviewPWA.ready,label:document.querySelector('#tracePreviewOfflineStatus').innerText,
   waiting:!!reg.waiting,open:document.querySelector('#sheetBackdrop').classList.contains('open'),
   draft:document.querySelector('#manualTxName').value};
 });
 assert.equal(during.waiting,true);
 assert.equal(during.ready,false);
 assert.equal(during.open,true);
 assert.equal(during.draft,'Brouillon pendant mise à jour');
 assert.match(during.label,/Nouvelle version/);
 const tip=await page.locator('#tracePreviewSheetUpdateNotice').innerText();
 assert.match(tip,/Nouvelle version disponible/);
 assert.equal(await page.locator('#manualTxName').inputValue(),'Brouillon pendant mise à jour');
 await page.locator('#cancelManualTx').click();
 assert.equal(await page.locator('#sheetBackdrop').evaluate(x=>x.classList.contains('open')),false);
 const originCounter=await page.evaluate(()=>{window.__traceUpgradeCounter='before-click';return window.__traceUpgradeCounter});
 assert.equal(originCounter,'before-click');
 await page.locator('#tracePreviewOfflineStatus button').click();
 await page.waitForFunction(()=>window.__traceUpgradeCounter!== 'before-click',{timeout:30000});
 await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:30000});
 const after=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  return{ready:TracePreviewPWA.ready,
   caches:(await caches.keys()).filter(x=>x.startsWith('trace-lab-537:')),
   waiting:!!reg.waiting,formOpen:document.querySelector('#sheetBackdrop').classList.contains('open'),
   notice:document.querySelector('#tracePreviewOfflineStatus').innerText};
 });
 assert.equal(after.ready,true);
 assert.equal(after.waiting,false);
 assert.equal(after.formOpen,false);
 assert.equal(after.caches.length,1);
 assert.ok(after.caches[0].endsWith(versionB),'Only new worker cache must remain');
 assert.deepEqual(errors,[]);
 const report={schema:'trace-537-pwa-upgrade-qa-v1',passed:true,workerRequests,
  update,before,during,after,versionA,versionB,errors,logs,modalNotice:tip,
  scope:'isolated fictional laboratory, not physical iPhone'};
 const reportFlag=process.argv.indexOf('--report');
 if(reportFlag!==-1){
  const dest=process.argv[reportFlag+1];
  if(!dest||dest.startsWith('--'))throw Error('--report requires a local output path');
  fs.writeFileSync(path.resolve(dest),JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({passed:true,workerRequests,
  cachePruned:after.caches.length===1,modalNoticeShown:!!tip,
  draftProtected:during.draft==='Brouillon pendant mise à jour',
  activationOptIn:true,newCache:after.caches[0],errors}));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());

