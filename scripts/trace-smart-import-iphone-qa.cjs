'use strict';
/* Isolated Safari iPhone flow. All bank data is fictional; localhost only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {webkit}=require('playwright-core');
const root=path.join(__dirname,'..');
const allowed=new Map([
 ['/trace-smart-inbox-3.5.0.js','text/javascript'],
 ['/trace-import-calendar-5.37.0.js','text/javascript'],
 ['/trace-premium-panels-5.37.0.css','text/css'],
 ['/v5-5.31.17.css','text/css']
]);
const html=[
 '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<link rel="stylesheet" href="/v5-5.31.17.css"><link rel="stylesheet" href="/trace-premium-panels-5.37.0.css">',
 '</head><body><div id="importCalendar"></div><div id="traceDayNotice"></div>',
 '<div id="traceSmartOverlay" class="hidden"></div>',
 '<input type="file" id="traceSmartFiles" accept="image/*" multiple hidden><script>',
 'window.__month="2026-11";window.__staged=[];window.__attempts={};window.__boundary="";',
 'window.TraceBankBridge={',
 'accounts(){return[{id:"card",name:"Carte fictive CAD",type:"card",currency:"CAD",opening:{date:window.__boundary,mode:"end"}}];},',
 'month(){return window.__month;},setMonth(m){window.__month=m;},',
 'smartDrafts(id,date){return window.__staged.filter(x=>x.accountId===id&&(date==null||x.date===date));},',
 'importDays(){return[];},gaps(){return[];},afterBoundaryFor(id,day){return !window.__boundary||day>window.__boundary;},',
 'importDayInfo(){return{entry:null,pending:0,unresolved:0,confirmed:0,drafts:0};},dayTransactions(){return[];},',
 'async smartStageRows(id,name,rows){rows.forEach((row,i)=>window.__staged.push({id:"draft-"+window.__staged.length,',
 'kind:"smart_draft",accountId:id,status:"pending",...row}));',
 'return{added:rows.length,matched:0,suppressed:0};},openBankSettings(){window.__openSettings=true;}',
 '};',
 'window.TraceImportGuide={genericCardPaymentLabel(){return false;},suggest(){return "expense";}};',
 'window.TraceBankDocuments={',
 'async extract(file){const n=file.name;const count=window.__attempts[n]=(window.__attempts[n]||0)+1;',
 'if(n.startsWith("fail")||(n.startsWith("retry")&&count===1))throw Error("OCR indisponible sur cette capture test");',
 'const row={date:"2026-11-12",name:"Restaurant test",amount:20.98,bankDirection:"out"};',
 'if(n.startsWith("unbilled"))return{text:"Autorisées non facturées",structuredCandidates:[{...row,authorizationPending:true}],quality:{}};',
 'return{text:"Novembre 2026",structuredCandidates:[row],quality:{}};',
 '},sourceAccountHints(){return{currency:"CAD",kind:"card"};},extractCandidates(){return{candidates:[]};}};',
 '</script>',
 '<script src="/trace-smart-inbox-3.5.0.js"></script><script src="/trace-import-calendar-5.37.0.js"></script>',
 '<script>window.TraceImportCalendar.render();</script></body></html>'
].join('');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
 const type=allowed.get(pathname);
 if(!type){res.writeHead(404);res.end('Not found');return;}
 try{res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(path.join(root,pathname.slice(1))));}
 catch(err){res.writeHead(500);res.end(String(err));}
});
const wait=page=>page.waitForTimeout(100);
async function upload(page,name){
 await page.locator('#smartBatchStart').click();
 await page.locator('#traceSmartFiles').setInputFiles({
  name,mimeType:'image/png',buffer:Buffer.from('fictional screenshot bytes')
 });
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='127.0.0.1')return route.abort();
   return route.continue();
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.locator('[data-calendar-account="card"]').click();
  assert.equal(await page.locator('[data-select-day="2026-11-02"]').isDisabled(),false,
   'A card with no initial balance must not inherit Nov 10 as its cutoff');
  await page.locator('#traceCalPrev').click();
  assert.match(await page.locator('.trace-cal-month-control').innerText(),/octobre 2026/i);
  assert.equal(await page.locator('[data-select-day="2026-10-31"]').isDisabled(),false);
  await page.locator('#traceCalNext').click();
  assert.match(await page.locator('.trace-cal-legend-help').first().innerText(),/Aucun solde de référence/i);
  // A recorded Nov 9 closing balance must NOT disable historical calendar imports.
  await page.evaluate(()=>{window.__boundary='2026-11-09';window.TraceImportCalendar.render();});
  assert.equal(await page.locator('[data-select-day="2026-11-02"]').isDisabled(),false,
   'November 2 remains accessible even with a November 9 bank snapshot');
  assert.match(await page.locator('.trace-cal-legend-help').first().innerText(),/journées antérieures/i);
  await page.locator('[data-select-day="2026-11-02"]').click();
  assert.match(await page.locator('#traceDayAction').innerText(),/Journée historique avant le solde de référence/i);
  await page.locator('#dayActionClose').click();
  await page.locator('#traceCalPrev').click();
  assert.equal(await page.locator('[data-select-day="2026-10-31"]').isDisabled(),false);
  await page.locator('#traceCalNext').click();
  await page.evaluate(()=>{window.__boundary='';window.TraceImportCalendar.render();});

  await upload(page,'fail.png');
  await page.locator('.trace-smart-failures').waitFor();
  assert.match(await page.locator('.trace-smart-failures').innerText(),/OCR indisponible sur cette capture test/);
  assert.equal(await page.locator('[data-smart-retry]').count(),1);
  await page.locator('[data-smart-manual]').click();
  await page.locator('.manual-date').fill('2026-11-12');
  await page.locator('.manual-name').fill('Restaurant test');
  await page.locator('.manual-amount').fill('20,98');
  await page.locator('#manualStageRows').click();
  await page.waitForFunction(()=>window.__staged.length===1);
  assert.equal(await page.evaluate(()=>window.__staged[0].status),'pending');
  assert.match(await page.locator('#smartTitle').innerText(),/Opérations à examiner/);
  await page.locator('#smartDone').click();
  await upload(page,'retry.png');
  await page.locator('[data-smart-retry]').waitFor();
  await page.locator('[data-smart-retry]').click();
  await page.waitForFunction(()=>window.__staged.length===2);
  assert.equal(await page.evaluate(()=>window.__attempts['retry.png']),2);
  await page.locator('#smartDone').click();
  await upload(page,'unbilled.png');
  await page.waitForFunction(()=>document.querySelector('#smartTitle')?.textContent==='Opérations à examiner');
  await wait(page);
  assert.equal(await page.evaluate(()=>window.__staged.length),2,'Unbilled authorization must not be staged');
  assert.match(await page.locator('.trace-smart-intro').innerText(),/autorisation/i);
  await context.close();
  console.log('PASS Safari iPhone: missing bank balance, past months, failed OCR, manual fallback, retry, unbilled exclusion');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
