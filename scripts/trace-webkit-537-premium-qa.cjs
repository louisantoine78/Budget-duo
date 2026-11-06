'use strict';
/*
 * TRACE 5.37 — opt-in premium WebKit smoke, fictional data only.
 * Requires an isolated local checkout and Playwright's Linux WebKit.
 * TRACE_PLAYWRIGHT_MODULE=/path/to/playwright-core \
 *   PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers \
 *   node scripts/trace-webkit-537-premium-qa.cjs --report /tmp/webkit.json
 *
 * This is NOT Safari running on a physical iPhone; it does NOT certify
 * offline/PWA, banking synchronization or a production release.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {webkit}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const root=path.resolve(__dirname,'..'),widths=[320,390,768,1440];
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.svg':'image/svg+xml',
 '.png':'image/png','.webmanifest':'application/manifest+json'};
const report={engine:'Linux WebKit',widths:[],checks:[],failures:[],
 externalRequests:[],pageErrors:[],offline:'not covered; strict offline gate remains separate',
 realIphoneSafari:false,productionReady:false,passed:false};
const server=http.createServer((req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  if(!relative||['index.html','config.js','cloud.js'].includes(relative)){
   res.writeHead(403).end();return;
  }
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep))throw Error('Outside isolated checkout');
  const data=fs.readFileSync(file);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream',
   'cache-control':'no-store'}).end(data);
 }catch{res.writeHead(404).end()}
});
async function run(){
 let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 try{
  browser=await webkit.launch({headless:true});
  for(const width of widths){
   const mobile=width<=390,context=await browser.newContext({
    viewport:{width,height:850},isMobile:mobile,hasTouch:mobile,
    locale:'fr-CA',timezoneId:'America/Toronto',reducedMotion:'reduce'});
   const page=await context.newPage();
   page.on('pageerror',error=>report.pageErrors.push({width,message:error.message}));
   page.on('response',response=>{
    if(response.status()>=400)report.failures.push({
     width,name:'missing static asset',message:response.status()+' '+response.url()});
   });
   await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin))return route.continue();
    report.externalRequests.push({width,url});
    return route.abort();
   });
   await context.addInitScript(()=>{
    const RealDate=Date,fixed=Date.parse('2026-10-24T16:00:00Z');
    window.Date=class extends RealDate{
     constructor(...args){super(...(args.length?args:[fixed]))}
     static now(){return fixed}
    };
   });
   const check=async(name,fn)=>{
    try{await fn();report.checks.push({width,name,passed:true});}
    catch(error){report.failures.push({width,name,message:error.message});}
   };
   try{
    await page.goto(origin+'trace-international-preview.html',
     {waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.__TRACE_PREVIEW_STATUS__?.boot==='ok',
     {timeout:20000});
    assert.equal(await page.evaluate(()=>window.__TRACE_PREVIEW_STATUS__.noSupabase),true);
    for(const name of ['home','budget','activity','wealth']){
     await check(name+' navigation and no horizontal overflow',async()=>{
      await page.locator('[data-nav="'+name+'"]').click();
      const dimensions=await page.evaluate(()=>({
       page:document.querySelector('.page.active')?.dataset.page,
       scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.equal(dimensions.page,name);
      assert.equal(dimensions.scroll,dimensions.width);
     });
    }
    await check('Activity native filters keep visible dropdown arrows',async()=>{
     await page.locator('[data-nav="activity"]').click();
     const drawer=page.locator('#activityAdvancedFilters');
     await drawer.locator('summary').click();
     const selects=await page.locator(
      '#activityAdvancedFilters .trace-activity-native-select').evaluateAll(nodes=>
      nodes.map(node=>{
       const style=getComputedStyle(node);
       return{height:node.getBoundingClientRect().height,
        font:parseFloat(style.fontSize),appearance:style.appearance,
        arrow:style.backgroundImage};
      }));
     assert.equal(selects.length,5);
     assert.ok(selects.every(item=>item.height>=44&&item.font>=16&&
      item.appearance==='none'&&item.arrow!=='none'),JSON.stringify(selects));
     await drawer.locator('summary').click();
    });
    await check('À valider retains accessible account selection',async()=>{
     await page.locator('#activityTabReview').click();
     const control=page.locator('#activityReviewAccountFilter');
     assert.equal(await control.isVisible(),true);
     const size=await control.evaluate(node=>({
      height:node.getBoundingClientRect().height,
      font:parseFloat(getComputedStyle(node).fontSize)}));
     assert.ok(size.height>=44&&size.font>=16,JSON.stringify(size));
     assert.equal(await page.locator('#importPendingTransactions').isVisible(),true);
     await page.locator('#activityTabTransactions').click();
    });
    await check('Patrimoine bank cards retain amounts and avoid clipping',async()=>{
     await page.locator('[data-nav="wealth"]').click();
     const cards=await page.locator('#assetGrid .asset-card').evaluateAll(nodes=>
      nodes.map(node=>({tag:node.tagName,amount:node.querySelector('b')?.textContent,
       clipped:node.scrollWidth>node.clientWidth+2})));
     assert.ok(cards.length>=1);
     assert.ok(cards.every(card=>card.tag==='BUTTON'&&card.amount&&
      !card.clipped),JSON.stringify(cards));
    });
    if(width===390){
     await check('unsaved financial form survives portrait-landscape-portrait',async()=>{
      await page.locator('[data-nav="home"]').click();
      await page.locator('#quickAdd').click();
      await page.locator('#traceAddManual').click();
      const input=page.locator('#manualTxName');
      await input.fill('Brouillon fictif non enregistré');
      await page.setViewportSize({width:844,height:390});
      assert.equal(await input.inputValue(),'Brouillon fictif non enregistré');
      const sheet=await page.locator('#sheetBackdrop .sheet').evaluate(node=>({
       height:node.getBoundingClientRect().height,
       scrollHeight:node.scrollHeight,clientHeight:node.clientHeight}));
      assert.ok(sheet.height<=391&&sheet.scrollHeight>sheet.clientHeight,JSON.stringify(sheet));
      await page.setViewportSize({width:390,height:850});
      assert.equal(await input.inputValue(),'Brouillon fictif non enregistré');
      await page.locator('#cancelManualTx').scrollIntoViewIfNeeded();
      await page.locator('#cancelManualTx').click();
      assert.equal(await page.locator('#sheetBackdrop').evaluate(node=>
       node.classList.contains('open')),false);
     });
     await check('calendar arrows move focus without financial action',async()=>{
      await page.locator('[data-nav="activity"]').click();
      await page.locator('#activityImportCalendar').click();
      const first=page.locator('#importCalendar .trace-cal-date:not([disabled])').first();
      const before=await first.getAttribute('data-select-day');
      await first.focus();
      await first.press('ArrowRight');
      const after=await page.evaluate(()=>document.activeElement?.dataset?.selectDay||'');
      assert.ok(after&&before!==after,JSON.stringify({before,after}));
      assert.equal(await page.locator('#traceDayModal').count(),0);
      await page.locator('#activityImportBack').click();
     });
    }
    report.widths.push(width);
   }catch(error){report.failures.push({width,name:'browser boot',message:error.message});}
   finally{await context.close()}
  }
 }finally{await browser?.close();server.close()}
 report.passed=report.failures.length===0&&report.pageErrors.length===0&&
  report.externalRequests.length===0&&report.widths.length===widths.length&&
  report.checks.length===30;
}
run().catch(error=>{report.failures.push({name:'fatal',message:error.stack||error.message})})
.finally(()=>{
 const i=process.argv.indexOf('--report');
 if(i!==-1){if(!process.argv[i+1])throw Error('--report needs a path');
  fs.writeFileSync(path.resolve(process.argv[i+1]),JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify({passed:report.passed,engine:report.engine,
  widths:report.widths,checks:report.checks.length,failures:report.failures,
  pageErrors:report.pageErrors,externalRequests:report.externalRequests.length,
  offline:report.offline,realIphoneSafari:report.realIphoneSafari}));
 if(!report.passed)process.exitCode=1;
});
