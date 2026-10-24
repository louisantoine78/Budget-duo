'use strict';
/* Real Chromium against the real candidate shell, entirely fictional fixtures.
 * Playwright + a local Chromium executable are test-only prerequisites.
 * TRACE_CHROMIUM_PATH=/path/to/chromium node tests/trace-candidate.browser.cjs
 * No Safari claims, credentials, Supabase, deployments or external HTTP calls.
 */
const assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),results=[],external=[],errors=[],workers=[];
const reportIndex=process.argv.indexOf('--report'),reportPath=reportIndex<0?null:process.argv[reportIndex+1];
let browser,server,page,context;
const test=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS '+name)};
const text=id=>page.locator('#'+id).innerText();
const go=async name=>{await page.locator('[data-nav="'+name+'"]').click();
 await page.locator('.page[data-page="'+name+'"]').waitFor({state:'visible'})};
async function boot(){
 await page.goto(base+'/trace-international-preview.html');
 await page.waitForFunction(()=>window.__TRACE_PREVIEW_STATUS__?.boot==='ok');
 await page.waitForFunction(()=>window.TracePDFJSLocalEngine?.version==='6.4.299');
}
let base;
(async()=>{
 server=http.createServer(async(req,res)=>{try{
  const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'');
  // This server is deliberately unable to serve production credentials or HTML.
  if(!relative||/^(?:config\.js|cloud\.js|index\.html)$/.test(relative)){
   res.writeHead(403);res.end('Forbidden in fictional QA');return;
  }
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const ext=path.extname(file),mime={'.html':'text/html','.js':'text/javascript',
   '.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml',
   '.png':'image/png','.json':'application/json','.pdf':'application/pdf',
   '.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream';
  res.setHeader('Content-Type',mime+'; charset=utf-8');
  res.end(await fs.readFile(file));
 }catch(e){res.writeHead(404);res.end('Not found')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.TRACE_CHROMIUM_PATH||undefined,
  headless:true,args:['--no-sandbox','--no-zygote','--disable-gpu','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  locale:'fr-CA',timezoneId:'America/Toronto',reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  const OriginalDate=Date,fixed=Date.parse('2026-10-24T16:00:00Z');
  window.Date=class extends OriginalDate{
   constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}
  };
 });
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith(base+'/'))return route.continue();
  external.push(url);return route.abort();
 });
 page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 page.on('worker',worker=>workers.push(worker.url()));
 await boot();
 await test('real candidate boots with eight fictional operations and zero external requests',async()=>{
  const status=await page.evaluate(()=>window.__TRACE_PREVIEW_STATUS__);
  assert.equal(status.fixtureCount,8);assert.equal(status.noSupabase,true);
  assert.match(await text('homeBalance'),/3\s*670,00/);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 });
 await test('320, 390 and 430 px layouts keep five tabs, visible budget and unbroken Patrimoine',async()=>{
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('.nav>.navbtn').count(),5);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   const label=await page.locator('[data-nav="wealth"]>span:last-child').evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el);
    return{rects:range.getClientRects().length,whiteSpace:getComputedStyle(el).whiteSpace};
   });
   assert.equal(label.rects,1);assert.equal(label.whiteSpace,'nowrap');
   const budget=await page.locator('.trace-home-available').evaluate(el=>({
    background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color,
    amount:el.querySelector('#homeBudgetAvailable').textContent}));
   assert.match(budget.background,/17, 63, 56/);assert.match(budget.color,/255, 255, 255/);
   assert.match(budget.amount,/422/);
  }
  await page.setViewportSize({width:390,height:844});
 });
 await test('account chips show native EUR without changing the official principal or budget',async()=>{
  const budget=await text('homeBudgetAvailable');
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  assert.match(await text('homeBalance'),/1\s*208,80/);assert.match(await text('homeBalance'),/€/);
  assert.equal(await page.locator('#traceIntlPrimary').inputValue(),'demo-ca-current');
  assert.equal(await text('homeBudgetAvailable'),budget);
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*670,00/);
 });
 await test('changing principal requires explicit confirmation; cancelling is read-only',async()=>{
  await page.locator('#traceIntlPrimary').selectOption('demo-fr-current');
  assert.equal(await text('sheetTitle'),'Changer le compte principal');
  assert.match(await text('homeBalance'),/3\s*670,00/);
  await page.locator('#tracePrimaryCancel').click();
  assert.equal(await page.locator('#traceIntlPrimary').inputValue(),'demo-ca-current');
 });
 await test('confirmed EUR principal keeps CAD historical budget and independent Couple totals',async()=>{
  const budget=await text('homeBudgetAvailable');
  await page.locator('#traceIntlPrimary').selectOption('demo-fr-current');
  await page.locator('#tracePrimaryConfirm').click();
  assert.match(await text('homeBalance'),/1\s*208,80/);
  assert.equal(await text('homeBudgetAvailable'),budget);
  await page.locator('#homeScope [data-scope="couple"]').click();
  assert.match(await text('homeBalance'),/8\s*904,08/);
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
  await page.locator('#homeScope [data-scope="mine"]').click();
 });
 await test('account detail shows two recent operations and opens filtered Activity',async()=>{
  await page.locator('#homeAccountsBtn').click();
  await page.locator('[data-trace-account-open="demo-fr-current"]').click();
  assert.equal(await page.locator('.trace-account-last-line').count(),2);
  assert.match(await text('sheetBody'),/À vérifier/);
  await page.locator('#traceAccountAllTx').click();
  assert.equal(await page.locator('#activityAccountFilter').inputValue(),'demo-fr-current');
  assert.ok(await page.locator('.trace-activity-day').count()>0);
 });
 await test('Budget preserves three families, twelve months and category-to-Activity navigation',async()=>{
  await go('budget');
  const headings=await page.locator('#budgetSections h2').allTextContents();
  assert.deepEqual(headings,['Revenus','Dépenses fixes','Dépenses variables']);
  assert.equal(await page.locator('#annualBudgetChart [data-insight-month]').count(),12);
  await page.locator('#budgetCategoryImpact [data-insight-category="groceries"]').click();
  await page.locator('#traceBudgetToActivity').click();
  assert.equal(await page.locator('#activityCategoryFilter').inputValue(),'groceries');
 });
 await test('pending EUR activity remains separate from confirmed spending',async()=>{
  await page.locator('#activityCategoryFilter').selectOption('all');
  await page.locator('#activityAccountFilter').selectOption('demo-fr-current');
  await page.locator('#activityStatusFilter').selectOption('pending');
  assert.match(await text('transactionList'),/SEPA à vérifier/);
  assert.equal(await page.locator('.trace-activity-day').count(),1);
  await page.locator('#activityStatusFilter').selectOption('confirmed');
  assert.doesNotMatch(await text('transactionList'),/SEPA à vérifier/);
 });
 await test('sharing lives within Activity with Couple before Proches',async()=>{
  await page.locator('#activityTabs [data-tab="sharing"]').click();
  const html=await page.locator('#activitySharing').innerHTML();
  assert.ok(html.indexOf('Couple')<html.indexOf('Proches'));
  assert.equal(await page.locator('.nav>.navbtn').count(),5);
 });
 await test('real local PDF worker rejects a mismatched account currency',async()=>{
  await page.locator('#activityTabs [data-tab="import"]').click();
  await page.locator('#traceStatementDrawer>summary').click();
  await page.locator('#traceStatementAccount').selectOption('demo-ca-current');
  await page.locator('#traceStatementFile').setInputFiles(path.join(__dirname,'fixtures/statements/fr-eur-multipage.pdf'));
  await page.locator('#traceStatementExtract').click();
  await page.locator('.trace-statement-extraction-warning').filter({hasText:'Extraction non disponible'}).waitFor();
  assert.match(await text('traceStatementExtraction'),/EUR.*CAD/);
  assert.equal(await page.locator('#traceStatementUseProposals').count(),0);
 });
 await test('PDF extraction, adoption, human review and comparator preserve all bank transactions',async()=>{
  await page.locator('#traceStatementAccount').selectOption('demo-fr-current');
  await page.locator('#traceStatementExtract').click();
  await page.locator('#traceStatementUseProposals').waitFor();
  assert.equal(await page.locator('.trace-statement-proposal-list>div').count(),4);
  assert.match(await text('traceStatementExtraction'),/Page 2, ligne 5/);
  await page.locator('#traceStatementUseProposals').click();
  assert.equal(await page.locator('[data-statement-row]').count(),4);
  await page.locator('#traceStatementPrepare').click();
  await page.locator('#traceStatementCompare').click();
  assert.equal(await text('traceStatementResults'),'');
  await page.locator('#traceStatementAttest').check();
  for(const box of await page.locator('[data-statement-approve]').all())await box.check();
  await page.locator('#traceStatementCompare').click();
  assert.equal(await page.locator('#traceStatementResults [data-state="matched"]').count(),3);
  assert.equal(await page.locator('#traceStatementResults [data-state="pending"]').count(),1);
  assert.match(await text('traceStatementResults'),/relevé complet n’est pas certifié/);
  assert.ok(workers.some(url=>url===base+'/vendor/pdfjs/pdf.worker.mjs'));
  await go('home');assert.match(await text('homeBalance'),/1\s*208,80/);
 });
 await test('a raster statement without text falls back to manual control without proposals',async()=>{
  await go('activity');await page.locator('#activityTabs [data-tab="import"]').click();
  await page.locator('#traceStatementFile').setInputFiles(path.join(__dirname,'fixtures/statements/image-only.pdf'));
  await page.locator('#traceStatementExtract').click();
  await page.locator('.trace-statement-extraction-warning').filter({hasText:'Extraction non disponible'}).waitFor();
  assert.equal(await page.locator('#traceStatementUseProposals').count(),0);
  assert.ok(await page.locator('[data-statement-row]').count()>0);
 });
 await test('manual fractional-cent EUR input is blocked instead of silently rounding',async()=>{
  await page.locator('#quickAdd').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional precision test');
  await page.locator('#manualTxAmount').fill('40.005');
  await page.locator('#manualTxCategory').selectOption('groceries');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/centime/);
  await page.locator('#cancelManualTx').click();
 });
 await test('a CAD card cannot be paid from the EUR account',async()=>{
  await page.locator('#quickAdd').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualKind').selectOption('card_payment');
  assert.equal(await page.locator('#manualTarget option').count(),0);
  await page.locator('#manualTxAmount').fill('100');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/compte courant/);
  await page.locator('#cancelManualTx').click();
 });
 await test('100 CAD credit purchase and 100 CAD repayment create one expense and one neutral transfer',async()=>{
  await go('home');
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  await page.locator('#quickAdd').click();
  await page.locator('#manualTxAccount').selectOption('demo-ca-card');
  await page.locator('#manualTxName').fill('Fictional 100 CAD card purchase');
  await page.locator('#manualTxAmount').fill('100');
  await page.locator('#manualTxCategory').selectOption('groceries');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  await go('home');
  assert.match(await text('homeChecking'),/4\s*100/);
  assert.match(await text('homeCard'),/530/);
  assert.match(await text('homeBalance'),/3\s*570/);
  const budget=await text('homeBudgetAvailable'),spending=await text('homeSpending');
  await page.locator('#quickAdd').click();
  await page.locator('#manualTxAccount').selectOption('demo-ca-current');
  await page.locator('#manualKind').selectOption('card_payment');
  await page.locator('#manualTxAccount').selectOption('demo-ca-current');
  await page.locator('#manualTarget').selectOption('demo-ca-card');
  await page.locator('#manualTxName').fill('Fictional 100 CAD card repayment');
  await page.locator('#manualTxAmount').fill('100');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  await go('home');
  assert.match(await text('homeChecking'),/4\s*000/);
  assert.match(await text('homeCard'),/430/);
  assert.match(await text('homeBalance'),/3\s*570/);
  assert.equal(await text('homeBudgetAvailable'),budget);
  assert.equal(await text('homeSpending'),spending);
 });
 await test('40 EUR immediate-debit purchase reduces native cash once and records frozen 64 CAD budget impact',async()=>{
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  const before=Number((await text('homeSpending')).replace(/[^0-9]/g,''));
  await page.locator('#quickAdd').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional 40 EUR immediate purchase');
  await page.locator('#manualTxAmount').fill('40');
  await page.locator('#manualTxCategory').selectOption('groceries');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  await go('home');
  assert.match(await text('homeBalance'),/1\s*168,80/);
  const after=Number((await text('homeSpending')).replace(/[^0-9]/g,''));
  assert.equal(after-before,64);
 });
 await test('offline navigation works in the loaded session and online reload resets only fictional data',async()=>{
  await context.setOffline(true);await go('home');
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*570,00/);
  await go('wealth');await go('budget');
  await context.setOffline(false);await boot();
  assert.equal(await page.locator('#traceIntlPrimary').inputValue(),'demo-ca-current');
  assert.match(await text('homeBalance'),/3\s*670,00/);
 });
 await test('no console exceptions, external requests or production service workers were used',async()=>{
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  assert.equal(await page.evaluate(async()=>
   navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0),0);
 });
 console.log(results.length+' real Chromium candidate scenarios passed (not Safari or Supabase)');
})().catch(error=>{results.push({name:'first failing boundary',passed:false,error:error.message});
 console.error(error);process.exitCode=1;
}).finally(async()=>{
 const report={engine:'Chromium',version:browser?.version(),safari:false,
  data:'entirely fictional; in-memory app persistence',externalRequests:external,
  consoleErrors:errors,workers,results,passed:results.length>0&&results.every(x=>x.passed)};
 if(reportPath)await fs.writeFile(path.resolve(reportPath),JSON.stringify(report,null,2)+'\n');
 await browser?.close();if(server)await new Promise(r=>server.close(r));
});
