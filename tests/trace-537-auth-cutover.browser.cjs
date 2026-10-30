'use strict';
// Only fictional stubs and local static assets: tests 5.37 real auth bootstrap
// without touching a hosted database, real credentials, or stable index/SW.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http'),{spawnSync}=require('node:child_process');
const {chromium}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const root=path.resolve(__dirname,'..');
const browserExecutable=process.env.TRACE_CHROMIUM_EXECUTABLE||
 process.env.TRACE_CHROMIUM_PATH||undefined;
const entry='trace-537-auth-cutover.html',mime={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.json':'application/json',
 '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'
};
const run=async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trace-auth-cutover-'));
 const tmp=path.join(dir,entry);
 const builder=spawnSync(process.execPath,['scripts/build-trace-537-auth-entry.mjs','--out',tmp],
  {cwd:root,encoding:'utf8',timeout:30000});
 assert.equal(builder.status,0,builder.stderr||builder.stdout);
 const pageHtml=fs.readFileSync(tmp,'utf8');
 assert.ok(pageHtml.includes('trace-release-status'));
 assert.ok(!pageHtml.includes('trace-international-preview-fixtures'));
 assert.ok(!pageHtml.includes('trace-preview-pwa-1.0.0.js'));
 assert.ok(!pageHtml.includes('navigator.serviceWorker.register'));
 let server=null,browser=null;
 const errors=[],external=[],writeAttempts=[],missing=[];
 try{
  server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://127.0.0.1');
   if(req.method!=='GET'){writeAttempts.push(req.method+' '+url.pathname);res.writeHead(405);res.end();return}
   const f=url.pathname==='/'+entry?tmp:path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(f!==tmp&&!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
   try{
    const data=fs.readFileSync(f);
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream',
      'Cache-Control':'no-store'});res.end(data);
   }catch{missing.push(url.pathname);res.writeHead(404);res.end()}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:browserExecutable,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const configured of [false,true]){
   const ctx=await browser.newContext({viewport:{width:390,height:844},
    serviceWorkers:'block',acceptDownloads:false});
   const page=await ctx.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>{
    const request=route.request(),url=request.url();
    if(url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/')){
     return route.fulfill({status:200,contentType:'text/javascript',
      body:'window.supabase={createClient:function(){window.__TRACE_AUTH_STUB_CLIENT__=true;return {auth:{onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}}},getSession:async function(){return {data:{session:null},error:null}}}}}};' });
    }
    if(url.startsWith(origin+'/config.js')){
     return route.fulfill({status:200,contentType:'text/javascript',
      body:configured?
       "window.BUDGET_DUO_CONFIG={supabaseUrl:'https://fake-auth.invalid',supabasePublishableKey:'test-public-only'};":
       "window.BUDGET_DUO_CONFIG={};"});
    }
    if(url.startsWith(origin+'/')&&request.method()==='GET')return route.continue();
    external.push(request.method()+' '+url);return route.abort();
   });
   const response=await page.goto(origin+'/'+entry,{waitUntil:'load',timeout:25000});
   assert.equal(response.status(),200);
   const panel=configured?'cloudAuthPanel':'cloudConfigPanel';
   await page.waitForFunction(id=>{const e=document.getElementById(id);
    return e&&!e.classList.contains('hidden')},panel);
   assert.equal(await page.locator('#'+panel).isVisible(),true);
   assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('cloud-locked')),true);
   assert.equal(await page.locator('#traceIntlHome').count(),1);
   assert.equal(await page.locator('#homeImportCalendar').count(),1);
   assert.equal(await page.locator('#annualBudgetChart').count(),1);
   assert.equal(await page.locator('#activityAppliedFilters').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(configured){
    assert.equal(await page.evaluate(()=>window.__TRACE_AUTH_STUB_CLIENT__===true),true);
    assert.equal(await page.locator('#cloudLoginForm').isVisible(),true);
    assert.equal(await page.locator('#cloudSignupForm').isVisible(),false);
   }
   assert.equal(await page.evaluate(()=>Boolean(window.__TRACE_INTERNATIONAL_PREVIEW__)),false);
   assert.equal(await page.evaluate(()=>Boolean(window.TraceInternationalPreviewFixtures)),false);
   assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller===null),true);
   await ctx.close();
  }
  assert.deepEqual(writeAttempts,[],'No write requests permitted');
  assert.deepEqual(external,[],'No calls to real external services');
  assert.deepEqual(missing,[],'Auth entry must not omit script or stylesheet');
  assert.deepEqual(errors,[],'Auth bootstrap must not throw page errors');
  console.log('PASS isolated 5.37 auth bootstrap: config missing and mocked unsigned session');
  console.log('PASS no network writes, real secrets, fixture modules or live service-worker install');
 }finally{
  await browser?.close();
  if(server)await new Promise(r=>server.close(r));
 }
};
run().catch(e=>{console.error(e.stack||e);process.exitCode=1});

