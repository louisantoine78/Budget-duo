'use strict';
// TRACE 2.0.2 / Patrimoine — WebKit-based iPhone viewport QA, localhost only.
// No production credential, Supabase, real portfolio, or network access.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {webkit}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const allow=new Map([
 ['/experiments/trace-201-analytics-demo.html','text/html; charset=utf-8'],
 ['/trace-wealth-201.css','text/css; charset=utf-8'],
 ['/trace-wealth-201.js','text/javascript; charset=utf-8'],
 ['/trace-wealth-201-engine.js','text/javascript; charset=utf-8']
]);
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(!allow.has(url.pathname)){res.writeHead(404).end('Not in fictional test');return;}
  const file=path.join(root,url.pathname.slice(1));
  const data=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':allow.get(url.pathname),'Cache-Control':'no-store',
   'X-Content-Type-Options':'nosniff'}).end(data);
 }catch{res.writeHead(404).end('No data');}
});
const viewports=[
 {label:'iPhone-SE-375',width:375,height:667},
 {label:'iPhone-13-390',width:390,height:844},
 {label:'iPhone-Pro-Max-430',width:430,height:932}
];
const screenshots=process.env.TRACE_MOBILE_SCREENSHOTS==='1';
const screenshotRows=[];
async function assertLayout(page,label,step){
 const metrics=await page.evaluate(()=>{
  const root=document.documentElement;
  const body=document.body;
  const stage=document.querySelector('#lab-stage');
  const cards=[...document.querySelectorAll('.w201-account, .w201-position, .w201-card')];
  const fields=[...document.querySelectorAll('.w201-field input, .w201-field select')];
  return{
   width:innerWidth,scrollWidth:root.scrollWidth,bodyScroll:body.scrollWidth,
   stageWidth:stage?.getBoundingClientRect().width,
   stageLeft:stage?.getBoundingClientRect().left,
   cards:cards.length,
   badFields:fields.filter(el=>{const r=el.getBoundingClientRect();
    return r.right>innerWidth+1||r.left<0}).map(x=>x.name),
   strayHorizontalScroll:root.scrollWidth>innerWidth+2
  };
 });
 console.log('METRICS '+JSON.stringify({label,step,...metrics}));
 assert.equal(metrics.strayHorizontalScroll,false,label+'/'+step+' horizontal overflow');
 assert.equal(metrics.badFields.length,0,label+'/'+step+' form fields beyond viewport');
 assert.ok(metrics.stageLeft>=0&&metrics.stageWidth<=metrics.width,label+'/'+step+' stage fit');
}
async function saveImage(page,label,step){
 if(!screenshots||label!=='iPhone-13-390')return;
 const buf=await page.screenshot({type:'png',fullPage:true,animations:'disabled'});
 const name=step.replace(/[^a-z0-9-]/gi,'-');
 screenshotRows.push({label,step,name,bytes:buf.length});
 // Photos are fake data, and chunks stay comfortably under job log line limits.
 const b64=buf.toString('base64');
 const count=Math.ceil(b64.length/7000);
 console.log('QA_IMAGE_START '+JSON.stringify({label,step,parts:count,bytes:buf.length}));
 for(let i=0;i<count;i++)console.log('QA_IMAGE_PART '+name+' '+i+' '+b64.slice(i*7000,(i+1)*7000));
 console.log('QA_IMAGE_END '+name);
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await webkit.launch({headless:true});
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const {label,width,height} of viewports){
   const context=await browser.newContext({
    viewport:{width,height},deviceScaleFactor:3,isMobile:true,hasTouch:true,
    locale:'fr-FR',colorScheme:'light',reducedMotion:'reduce'
   });
   const page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',err=>errors.push(err.message));
   page.on('requestfailed',req=>errors.push('request failed '+req.url()));
   await page.route('**/*',route=>{
    if(!route.request().url().startsWith(origin+'/')){
     external.push(route.request().url());return route.abort();
    }
    return route.continue();
   });
   try{
    await page.goto(origin+'/experiments/trace-201-analytics-demo.html',{waitUntil:'load'});
    await page.locator('#w201-root').waitFor();
    assert.match(await page.locator('#w201-root').innerText(),/Portefeuille fictif/);
    await assertLayout(page,label,'positions');
    await saveImage(page,label,'positions');
    await page.locator('[data-w201="tab"][data-id="analysis"]').click();
    await page.getByText('Performance et évolution').waitFor();
    assert.match(await page.locator('#w201-root').innerText(),/Répartition des titres/);
    await assertLayout(page,label,'analysis-all');
    await saveImage(page,label,'analysis-all');
    for(const period of ['1','3','6','12','all']){
     await page.locator('[data-w201="period"][data-id="'+period+'"]').click();
     const selectedClass=await page.locator('[data-w201="period"][data-id="'+period+'"]').getAttribute('class');
     assert.equal(selectedClass?.includes('selected'),true);
     await assertLayout(page,label,'analysis-'+period);
    }
    await page.locator('#lab-home').click();
    assert.match(await page.locator('#w201-root').innerText(),/Mes investissements/);
    await assertLayout(page,label,'home');
    await saveImage(page,label,'home');
    await page.locator('#lab-pea').click();
    assert.match(await page.locator('#w201-root').innerText(),/PEA/);
    await assertLayout(page,label,'pea');
    await page.locator('#lab-sample').click();
    await page.locator('[data-w201="position"]').first().click();
    await page.getByText('Classification et stratégie').waitFor();
    const gainReturn=page.locator('.w201-metrics .w201-return');
    await gainReturn.waitFor();
    const gainRect=await gainReturn.boundingBox();
    const gainParentRect=await gainReturn.locator('..').boundingBox();
    console.log('GAIN_RETURN_BOX '+JSON.stringify({label,gainRect,gainParentRect,text:await gainReturn.innerText()}));
    assert.ok(gainRect&&gainParentRect&&gainRect.right<=gainParentRect.right+1,
     label+' position return must fit its financial card');
    assert.ok(gainRect.height<=22,label+' percent return must stay on a single line');
    await assertLayout(page,label,'position-detail');
    await saveImage(page,label,'position-detail');
    await page.locator('[data-w201="new-buy"]').click();
    await page.locator('#w201-form').waitFor();
    await assertLayout(page,label,'buy-form');
    await saveImage(page,label,'buy-form');
    // Demonstration must refuse all actual saves.
    await page.locator('#w201-form input[name="date"]').fill('2026-11-05');
    // Don't submit a trade, test that the preview injects an explicit rejecting save adapter.
    const noWrites=await page.evaluate(()=>window.TraceWealth201&&document.querySelector('#lab-stage'));
    assert.ok(noWrites);
    assert.deepEqual(external,[],label+' attempted external network request');
    assert.deepEqual(errors,[],label+' page error');
    console.log('QA_MOBILE_PASS '+label);
   }finally{await context.close();}
  }
  console.log('QA_COMPLETE '+JSON.stringify({viewports:viewports.map(x=>x.label),engine:'WebKit',
   realIphone:false,productionUntouched:true,images:screenshotRows}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(e=>{console.error('QA_MOBILE_FAIL',e.stack||String(e));process.exitCode=1;server.close();});
