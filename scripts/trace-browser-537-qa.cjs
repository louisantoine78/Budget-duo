'use strict';
// TRACE 5.37.0 International — opt-in browser/PWA smoke test.
// Usage: TRACE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core \
//        TRACE_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
//        node scripts/trace-browser-537-qa.cjs [--report /tmp/trace-browser.json]
// Never load a production origin, financial data, credentials or external requests.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const root=path.resolve(__dirname,'..');
const preview='trace-international-preview.html';
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const widths=[320,390,768,1440],tabs=['budget','activity','wealth','home'];
const report={schema:'trace-537-browser-qa-v1',commit:null,widths:[],offline:null,
 privacy:'No external URLs permitted. All content is fictional preview.',passed:false};
const server=http.createServer((request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(root+path.sep))throw Error('Path outside checkout');
  const content=fs.readFileSync(target);
  response.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream',
   'cache-control':'no-store'}).end(content);
 }catch{response.writeHead(404).end()}
});
const metrics=page=>page.evaluate(()=>({
 active:document.querySelector('.page.active')?.dataset.page||null,
 selectedNav:document.querySelector('.navbtn.active')?.dataset.nav||null,
 scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,
 heading:(document.querySelector('.page.active')?.innerText||'').trim().slice(0,80),
 offlineReady:window.TracePreviewPWA?.ready===true,
 offlineError:window.TracePreviewPWA?.error||null,
 navTargets:[...document.querySelectorAll('.navbtn[data-nav]')].map(el=>{
  const r=el.getBoundingClientRect();return{label:el.getAttribute('aria-label'),
   width:Math.floor(r.width),height:Math.floor(r.height)}
 })
}));
async function main(){
 const failures=[];let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 const entry=origin+preview;
 try{
  const executablePath=process.env.TRACE_CHROMIUM_EXECUTABLE;
  if(!executablePath)throw Error('TRACE_CHROMIUM_EXECUTABLE is required for isolated QA');
  browser=await chromium.launch({headless:true,executablePath,
   args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:850},
    serviceWorkers:'allow',reducedMotion:'reduce',deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],httpErrors=[],outside=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{
    if(response.status()>=400)httpErrors.push(response.status()+' '+response.url());
   });
   // The QA process must never access real banking services or hosted Supabase.
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(origin))return route.continue();
    outside.push(route.request().url());return route.abort();
   });
   try{
    await page.goto(entry,{waitUntil:'load',timeout:25000});
    const home=await metrics(page);
    assert.equal(home.active,'home');
    assert.ok(home.heading.length>12,'Home must render actual text');
    assert.equal(home.scrollWidth,width,'No horizontal document overflow on '+width);
    assert.equal(home.navTargets.length,4,'Four real navigation destinations');
    for(const target of home.navTargets){
     assert.ok(target.width>=44&&target.height>=44,'Touch target under 44px: '+target.label);
    }
    const checked=[];
    for(const tab of tabs){
     await page.locator('.navbtn[data-nav="'+tab+'"]').click({timeout:6000});
     const data=await metrics(page);
     assert.equal(data.active,tab,'Wrong page active for '+tab);
     assert.equal(data.selectedNav,tab,'Wrong selected tab for '+tab);
     assert.ok(data.heading.length>5,'Empty content for '+tab);
     assert.equal(data.scrollWidth,width,'Horizontal overflow after '+tab);
     checked.push({tab,heading:data.heading});
    }
    report.widths.push({width,home:home.heading,nav:checked,touch:home.navTargets,
     documentOverflow:false});
    if(width===390){
     await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:18000});
     const before=await metrics(page);
     assert.equal(before.offlineReady,true,'Offline shell not ready');
     assert.equal(before.offlineError,null);
     // First online reload guarantees a controlling service worker.
     await page.reload({waitUntil:'load',timeout:18000});
     await context.setOffline(true);
     await page.reload({waitUntil:'load',timeout:15000});
     await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:15000});
     const after=await metrics(page);
     assert.equal(after.active,'home');
     assert.equal(after.scrollWidth,390);
     await page.locator('.navbtn[data-nav="activity"]').click();
     const activity=await metrics(page);
     assert.equal(activity.active,'activity');
     report.offline={width:390,readyBefore:true,reloadedWithoutNetwork:true,
      cachedShellVerified:after.offlineReady,activityAvailable:activity.active==='activity'};
     await context.setOffline(false);
    }
    assert.deepEqual(errors,[],'Page JavaScript errors '+width);
    assert.deepEqual(httpErrors,[],'Missing HTTP assets '+width);
    assert.deepEqual(outside,[],'External network attempted');
   }catch(error){failures.push({width,message:error.message});}
   finally{await context.close()}
  }
  report.passed=failures.length===0&&report.widths.length===widths.length&&
   report.offline?.activityAvailable===true;
  report.failures=failures;
  if(!report.passed)process.exitCode=1;
 }finally{
  if(browser)await browser.close();
  server.close();
  const i=process.argv.indexOf('--report');
  if(i!==-1){
   const dest=process.argv[i+1];
   if(!dest||dest.startsWith('--'))throw Error('--report requires destination');
   fs.writeFileSync(path.resolve(dest),JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({passed:report.passed,
   screens:report.widths.map(v=>v.width),navigation:report.widths.reduce((n,v)=>n+v.nav.length,0),
   offline:report.offline,failures:report.failures}));
 }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;server.close()});

