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
let euroSavingsId;
let backupBankId;
const test=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS '+name)};
const text=async id=>{
 if(id==='homeChecking'||id==='homeCard')
  await page.locator('.trace-home-balance-breakdown').evaluate(el=>{el.open=true});
 return page.locator('#'+id).innerText();
};
const selectPrimary=async id=>{
 if(!await page.locator('[data-primary-bank="'+id+'"]').isVisible()){
  if(await page.locator('#sheetBackdrop').evaluate(el=>el.classList.contains('open')))
   await page.locator('#closeSheet').click();
  await accountSettings();
 }
 await page.locator('[data-primary-bank="'+id+'"]').click();
};
const openImports=async(mode='monthly')=>{
 await page.locator('#quickAdd').click();
 await page.locator('#traceAddImport').click();
 await page.locator(mode==='daily'?'#traceAddDaily':'#traceAddMonthly').click();
};
const accountSettings=async()=>{
 await page.locator('#profileBtn').click();await page.locator('#settingsAccounts').click();
};
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
 await test('real candidate boots with nine fictional operations and zero external requests',async()=>{
  const status=await page.evaluate(()=>window.__TRACE_PREVIEW_STATUS__);
  assert.equal(status.fixtureCount,9);assert.equal(status.noSupabase,true);
  assert.match(await text('homeBalance'),/3\s*670,00/);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 });
 await test('Home always displays balance detail, calendar, sharing and essentials without drawers',async()=>{
  const more=page.locator('#homeMoreDetails');
  assert.equal(await more.count(),1);
  assert.equal(await more.evaluate(el=>el.tagName),'DIV');
  assert.equal(await more.locator('summary').count(),0);
  assert.equal(await page.locator('.trace-home-balance-breakdown').evaluate(el=>el.tagName),'DIV');
  assert.equal(await page.locator('#homeImportCalendar').isVisible(),true);
  assert.equal(await page.locator('#shareCard').isVisible(),true);
  assert.equal(await page.locator('#homeChecking').isVisible(),true);
  assert.equal(await page.locator('#homeCard').isVisible(),true);
  const before=await page.locator('#homeBalance').innerText();
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('.trace-home-month-kpis [data-kpi]').count(),3);
   const cards=await page.locator('.trace-home-month-kpis').evaluate(el=>({
    border:getComputedStyle(el).borderTopWidth,
    titles:[...el.querySelectorAll('.k-label')].map(n=>n.textContent),
    values:[...el.querySelectorAll('.k-value')].map(n=>getComputedStyle(n).fontSize)
   }));
   assert.equal(cards.border,'1px');
   assert.deepEqual(cards.titles,['Revenus','Dépenses','Marge du mois']);
   assert.ok(cards.values.every(n=>parseFloat(n)>=15));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  }
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#homeImportCalendar').isVisible(),true);
  assert.equal(await page.locator('#shareCard').isVisible(),true);
  assert.equal(await page.locator('#homeBalance').innerText(),before);
 });
 await test('premium panels share a financial form language across transaction and budget',async()=>{
  const backdrop=page.locator('#sheetBackdrop');
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   await page.locator('#quickAdd').click();
   await page.locator('#traceAddManual').click();
   assert.equal(await backdrop.getAttribute('data-trace-panel'),'manual');
   if(await page.locator('.trace-manual-symbol').count())
    assert.equal(await page.locator('.trace-manual-symbol').evaluate(el=>getComputedStyle(el).display),'none');
   if(await page.locator('.trace-manual-hero').count())
    assert.equal(await page.locator('.trace-manual-hero').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
   assert.equal(await backdrop.locator('.sheet').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
   assert.match(await page.locator('.trace-panel-eyebrow').innerText(),/MOUVEMENT FINANCIER/);
   assert.equal(await backdrop.locator('.trace-panel-caption').count(),1);
   assert.equal(await page.locator('#closeSheet').getAttribute('aria-label'),'Fermer Ajouter une opération');
   assert.ok(await page.locator('#closeSheet').evaluate(el=>el.getBoundingClientRect().height)>=44);
   assert.ok(await page.locator('#saveManualTx').evaluate(el=>el.getBoundingClientRect().height)>=48);
   const amountStyle=await page.locator('#manualTxAmount').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),
    weight:Number(getComputedStyle(el).fontWeight)}));
   assert.ok(amountStyle.size>=19&&amountStyle.size<=21&&amountStyle.weight<650);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#cancelManualTx').click();
   assert.equal(await backdrop.evaluate(el=>el.classList.contains('open')),false);
  }
  await page.setViewportSize({width:390,height:844});
  await go('budget');
  for(const kind of ['income','variable','fixed']){
   const add=page.locator('[data-budget-add="'+kind+'"]').first();
   assert.ok(await add.count(),kind+' budget addition must exist');
   await add.click();
   const panel=await backdrop.getAttribute('data-trace-panel');
   assert.equal(panel,'budget-add','Missing '+kind+' premium form');
   assert.equal(await page.locator('.trace-panel-caption').isVisible(),false);
   assert.ok(await page.locator('#budgetAddAmount').isVisible());
   assert.equal(await page.locator('#sheetBody .trace-budget-amount-stage').count(),1);
   assert.ok(await page.locator('#budgetAddAmount').evaluate(el=>
    !!(el.compareDocumentPosition(document.querySelector('#budgetAddCategory'))&Node.DOCUMENT_POSITION_FOLLOWING)));
   const budgetAmount=await page.locator('#budgetAddAmount').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),
    weight:Number(getComputedStyle(el).fontWeight)}));
   assert.ok(budgetAmount.size>=22&&budgetAmount.size<=25&&budgetAmount.weight<650);
   assert.equal(await page.locator('#sheetBody>.settings-hero .pico').evaluate(el=>getComputedStyle(el).display),'none');
   assert.equal(await page.locator('#sheetBody>.settings-hero').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
   assert.ok(await page.locator('#saveBudgetAdd').evaluate(el=>el.getBoundingClientRect().height)>=48);
   assert.ok(await page.locator('#closeSheet').evaluate(el=>el.getBoundingClientRect().height)>=44);
   assert.equal(await page.locator('.trace-budget-sheet-context small').innerText(),
    kind==='income'?'Revenu':kind==='fixed'?'Dépense fixe':'Dépense variable');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#budgetAddAmount').fill('120');
   await page.locator('#budgetAllocationScope').selectOption('couple');
   assert.equal(await page.locator('#budgetShareFields').isVisible(),true);
   assert.equal(Number(await page.locator('#budgetMineAmount').inputValue())+
    Number(await page.locator('#budgetPartnerAmount').inputValue()),120);
   await page.locator('#cancelBudgetAdd').click();
  }
  if(await page.locator('[data-budget-edit]').count()){
   await page.locator('[data-budget-edit]').first().click();
   assert.equal(await backdrop.getAttribute('data-trace-panel'),'budget-edit');
   assert.ok(await page.locator('#budgetEditAmount').isVisible());
   assert.ok(await page.locator('#saveBudgetEdit').isVisible());
   assert.ok(await page.locator('#deleteBudgetEdit').isVisible());
   assert.ok(await page.locator('#cancelBudgetEdit').isVisible());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#cancelBudgetEdit').click();
  }
  await page.locator('#budgetCopyPrevious').click();
  if(await page.locator('#confirmBudgetCopy').count()){
   assert.equal(await backdrop.getAttribute('data-trace-panel'),'budget-copy');
   assert.ok(await page.locator('#confirmBudgetCopy').evaluate(el=>el.getBoundingClientRect().height)>=48);
  }
  await page.locator('#closeSheet').click();
  assert.equal(await backdrop.getAttribute('data-trace-panel')==='budget-add',false,
   'Opening a different sheet may not retain prior premium labels');
  await go('home');
 });
 await test('Activity transaction details use a quiet editorial form without index badges',async()=>{
  await go('activity');
  await page.locator('#activityTabs [data-tab="transactions"]').click();
  await page.locator('[data-tx-open="demo-groceries"]').first().click();
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'transaction');
  assert.equal(await page.locator('.trace-edit-card-index').first().evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('.trace-edit-card').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
  assert.ok(await page.locator('#txName').isVisible());
  const txAmount=await page.locator('#txAmount').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),
   weight:Number(getComputedStyle(el).fontWeight)}));
  assert.ok(txAmount.size>=19&&txAmount.size<=21&&txAmount.weight<650);
  assert.ok(await page.locator('#txSave').evaluate(el=>el.getBoundingClientRect().height)>=48);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  await page.locator('#closeSheet').click();
  await go('home');
 });
 await test('Budget displays one real-spending heading and each legacy transaction editor is editorial',async()=>{
  await go('budget');
  assert.equal(await page.locator('.page[data-page="budget"] h2').filter({hasText:/Mes dépenses réelles/}).count(),0);
  assert.equal(await page.locator('#budgetCategoryImpact .trace-insights-head strong').count(),1);
  assert.equal(await page.locator('#budgetCategoryImpact .trace-insights-head strong').innerText(),'Où va mon argent ?');
  for(const [id,kind,input] of [
   ['demo-ca-eur-transfer','international-transfer','#fxSent'],
   ['demo-card-payment','bank-movement','#smartMovementSave'],
   ['demo-fr-usd','foreign-expense','#traceForeignMetaName']
  ]){
   await page.evaluate(id=>window.TraceBankBridge.openTransaction(id),id);
   const backdrop=page.locator('#sheetBackdrop');
   assert.equal(await backdrop.getAttribute('data-trace-panel'),kind);
   assert.equal(await page.locator('.trace-panel-eyebrow').count(),1);
   assert.equal(await backdrop.locator('.trace-panel-eyebrow').evaluate(el=>getComputedStyle(el,'::before').display),'none');
   assert.equal(await page.locator('#sheetTitle').isVisible(),true);
   assert.equal(await page.locator(input).isVisible(),true);
   if(kind==='international-transfer'){
    assert.equal(await backdrop.locator('.trace-edit-card .trace-edit-fields>b').evaluate(el=>getComputedStyle(el).display),'block');
    assert.equal(await backdrop.locator('.trace-edit-card .trace-edit-fields>small').evaluate(el=>getComputedStyle(el).display),'block');
    const extra=backdrop.locator('.trace-edit-explanation');
    assert.equal(await extra.count(),1);
    assert.equal(await extra.evaluate(el=>el.open),false);
    assert.ok(await page.locator('#fxReceived').isVisible());
    assert.ok(await page.locator('#fxFee').isVisible());
    assert.ok(await page.locator('#fxRate').isVisible());
    await extra.locator('summary').click();
    assert.equal(await extra.evaluate(el=>el.open),true);
    assert.match(await extra.locator('p').innerText(),/rapprochements/);
    await extra.locator('summary').click();
   }
   if(kind==='foreign-expense'){
    assert.equal(await page.locator('.trace-edit-record-meta strong').count(),1);
    assert.match(await page.locator('.trace-edit-record-meta strong').innerText(),/46,20/);
    assert.match(await page.locator('.trace-edit-record-meta small').innerText(),/taux historique conservés/);
    const extra=backdrop.locator('.trace-edit-explanation');
    assert.equal(await extra.count(),1);
    assert.equal(await extra.evaluate(el=>el.open),false);
    assert.ok(await page.locator('#traceForeignMetaCategory').isVisible());
    await extra.locator('summary').click();
    assert.equal(await extra.evaluate(el=>el.open),true);
    assert.match(await extra.locator('p').innerText(),/valorisation CAD/);
    await extra.locator('summary').click();
   }
   if(await backdrop.locator('.trace-edit-card-index').count())
    assert.equal(await backdrop.locator('.trace-edit-card-index').first().evaluate(el=>getComputedStyle(el).display),'none');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#closeSheet').click();
  }
  await go('home');
 });
 await test('Wealth starts with net valuation and keeps all assets readable as premium rows',async()=>{
  await go('wealth');
  const structure=await page.locator('.page[data-page="wealth"]').evaluate(root=>{
   const ids=['wealthTotal','wealthSavingsGrid','wealthInvestmentsGrid','assetGrid'];
   return ids.map(id=>root.querySelector('#'+id)?.getBoundingClientRect().top??-1);
  });
  assert.ok(structure.every((p,i)=>p>=0&&(i===0||p>structure[i-1])),structure.join(','));
  assert.equal(await page.locator('#wealthTotal').count(),1);
  assert.ok(await page.locator('.trace-wealth-net-card .trace-wealth-note').isVisible());
  assert.equal(await page.locator('#wealthInvestmentsGrid #wealthAddCard').count(),1);
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   for(const id of ['wealthSavingsGrid','wealthInvestmentsGrid','assetGrid']){
    const layout=await page.locator('#'+id).evaluate(root=>{
     const r=root.getBoundingClientRect(),tiles=[...root.querySelectorAll('.asset-card')];
     return{columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,width:r.width,
      tileWidths:tiles.map(x=>x.getBoundingClientRect().width),
      focusTargets:tiles.every(x=>x.tagName==='BUTTON')};
    });
    assert.equal(layout.columns,1,id+' should be a clean one-column list');
    assert.ok(layout.tileWidths.every(w=>w<=layout.width+1),id+' overflows');
    assert.ok(layout.focusTargets);
   }
  }
  await page.setViewportSize({width:390,height:844});
  await go('home');
 });
 await test('premium patrimoine and bank setup share the same responsive sheet standard',async()=>{
  await go('wealth');
  await page.locator('#addAsset').click();
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'investment');
  assert.equal(await page.locator('.trace-panel-eyebrow').innerText(),'PATRIMOINE');
  assert.ok(await page.locator('#investmentAccountName').evaluate(el=>el.getBoundingClientRect().height)>=44);
  assert.equal(await page.locator('#saveInvestmentAccount').isVisible(),true);
  await page.locator('#cancelInvestmentAccount').click();
  await accountSettings();
  await page.locator('#traceAddBankAccount').click();
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'account');
  assert.match(await page.locator('.trace-panel-eyebrow').innerText(),/GESTION DES COMPTES/);
  assert.ok(await page.locator('#traceSaveNewBank').evaluate(el=>el.getBoundingClientRect().height)>=48);
  await page.locator('#traceCancelNewBank').click();
  await page.locator('#closeSheet').click();
  await go('home');
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
   assert.match(budget.background,/(?:16, 62, 55|17, 63, 56)/);assert.match(budget.color,/255, 255, 255/);
   assert.match(budget.amount,/422/);
  }
  await page.setViewportSize({width:390,height:844});
 });
 await test('unified Home reveals the Budget and the view-only accounts shortcut',async()=>{
  await go('home');
  const both=page.locator('.trace-home-unified');
  assert.equal(await both.count(),1);
  assert.match(await both.locator('#homeBalance').innerText(),/3\s*670,00/);
  assert.match(await both.locator('#homeBudgetAvailable').innerText(),/422/);
  assert.equal(await both.locator('#homeBudgetTrack').getAttribute('role'),'progressbar');
  const before=await text('homeBalance');
  await page.locator('#homeAccountsBtn').click();
  assert.equal(await text('sheetTitle'),'Comptes et trésorerie');
  assert.ok(await page.locator('[data-trace-account-open]').count()>=2);
  await page.locator('#traceAccountsClose').click();
  assert.equal(await text('homeBalance'),before);
  await page.locator('#homeBudgetShortcut').click();
  assert.equal(await page.locator('.page[data-page="budget"]').isVisible(),true);
  assert.equal(await page.locator('#budgetSections h2').count(),3);
  await go('home');
 });
 await test('Home import coverage opens the actual calendar without asserting bank synchronization',async()=>{
  await go('home');
  const coverage=await text('homeImportCoverage');
  assert.match(coverage,/\d+ \/ \d+ journées vérifiées/);
  assert.doesNotMatch(coverage,/synchronisé|automatique|banque à jour/i);
  assert.equal(await page.locator('#homeImportCalendar').isVisible(),true);
  await page.locator('#homeImportCalendar').click();
  assert.equal(await page.locator('#activityImport').isVisible(),true);
  assert.equal(await page.locator('#importCalendar').isVisible(),true);
  await page.locator('#activityImportBack').click();
  await go('home');
 });
 await test('Budget renders every configured expense category, including those at zero, without fake spending',async()=>{
  await go('budget');
  assert.deepEqual(await page.locator('#budgetCategoryImpact .trace-insight-category-main strong').allInnerTexts(),
   ['Épicerie','Voyages']);
  assert.deepEqual(await page.locator('#budgetCategoryImpact .trace-insight-inactive-row span').allInnerTexts(),
   ['Logement']);
  assert.match(await page.locator('#budgetCategoryImpact .trace-insight-inactive-row').innerText(),/0 \$ · non budgété/);
  assert.match(await page.locator('#budgetCategoryImpact .trace-insights-head').innerText(),/178 \$/);
  assert.equal(await page.locator('#budgetCategoryImpact [data-insight-expand]').count(),0);
  const all=await page.locator('#budgetCategoryImpact [data-insight-category]').count();
  assert.equal(all,3,'All configured expense categories must be navigable');
  const before=await page.locator('#budgetCategoryImpact .trace-insights-head>b').innerText();
  await page.locator('#budgetCategoryImpact .trace-insight-inactive-row').click();
  assert.match(await page.locator('#sheetTitle').innerText(),/Dépenses · Logement/);
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'budget-category-detail');
  assert.equal(await page.locator('.trace-insight-sheet-kicker').innerText(),'DÉPENSES CONFIRMÉES');
  assert.ok(await page.locator('#traceBudgetToActivity').isVisible());
  assert.match(await page.locator('#sheetBody').innerText(),/Aucune opération confirmée/);
  await page.locator('#closeSheet').click();
  assert.equal(await page.locator('#budgetCategoryImpact .trace-insights-head>b').innerText(),before);
  await go('home');
 });
 await test('Budget and Activity rows are slim, readable and retain complete financial figures',async()=>{
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   await go('budget');
   assert.ok(await page.locator('#budgetCategoryImpact .trace-insights-explain').innerText()
    .then(t=>t.length<105));
   const cards=await page.locator('#budgetCategoryImpact .trace-insight-category').evaluateAll(nodes=>
    nodes.map(el=>({h:el.getBoundingClientRect().height,tag:el.tagName,
     amount:el.querySelector('.trace-insight-category-value')?.textContent,
     progress:getComputedStyle(el.querySelector('.trace-insight-category-track')).height})));
   assert.ok(cards.every(c=>c.h>=70&&c.h<=120&&c.tag==='BUTTON'&&c.progress==='4px'));
   assert.ok(cards.some(c=>c.amount.includes('104')&&c.amount.includes('300')));
   await go('activity');
   const rows=await page.locator('#transactionList .trace-activity-day .tx').evaluateAll(nodes=>
    nodes.map(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,
     title:el.querySelector('.tx-main b')?.textContent,amount:el.querySelector('.tx-amt')?.textContent})));
   assert.ok(rows.length>=3);
   assert.ok(rows.every(r=>r.height>=44&&r.title&&r.amount));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  }
  await page.setViewportSize({width:390,height:844});
  await go('home');
 });
 await test('Annual Budget is now a twelve-month selectable overview with clear actuals',async()=>{
  await go('budget');
  assert.equal(await page.locator('#annualBudgetChart .trace-year-month').count(),12);
  assert.equal(await page.locator('#annualBudgetChart .trace-year-totals>div').count(),3);
  assert.match(await page.locator('#annualBudgetChart .trace-year-totals').innerText(),/Dépenses \/ revenus/);
  assert.equal(await page.locator('#annualBudgetChart .trace-year-selected').count(),1);
  assert.equal(await page.locator('#annualBudgetChart .trace-year-selected span').count(),4);
  const annualDetails=page.locator('#annualBudgetChart .trace-year-diagnosis');
  assert.equal(await annualDetails.evaluate(node=>node.open),false,
   'the annual explanation must start collapsed');
  await annualDetails.locator('summary').click();
  assert.match(await annualDetails.innerText(),/Principal poste classé/);
  assert.equal(await page.locator('#annualBudgetChart .trace-year-result-main strong').count(),1);
  assert.equal(await page.locator('#annualBudgetChart .trace-year-budget-check').count(),1);
  assert.ok(await page.locator('#annualBudgetChart .trace-year-coverage').isVisible());
  assert.ok(await page.locator('#annualBudgetChart .trace-year-diagnosis').isVisible());
  assert.match(await page.locator('#annualBudgetChart .trace-year-result-main').innerText(),/Différence revenus/);
  assert.match(await annualDetails.innerText(),/mois sans mouvement/);
  await annualDetails.locator('summary').click();
  assert.equal(await annualDetails.evaluate(node=>node.open),false);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   assert.ok(await page.locator('#annualBudgetChart .trace-year-result-main').isVisible());
   assert.equal(await page.locator('#annualBudgetChart [data-insight-month]').count(),12);
   if(width===390){
    assert.equal(await page.locator('#annualBudgetChart .trace-year-grid')
     .evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
    assert.equal(await page.locator('#annualBudgetChart .trace-year-selected>div')
     .evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#annualBudgetDetails').click();
  assert.equal(await page.locator('#traceAnnualDetail .trace-year-month').count(),12);
  assert.equal(await page.locator('#traceAnnualDetail .trace-year-selected span').count(),4);
  assert.equal(await page.locator('#traceAnnualDetail .trace-year-grid')
   .evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
  await page.locator('#closeSheet').click();
  const target=page.locator('#annualBudgetChart [data-insight-month]').first();
  const selectedMonth=await target.getAttribute('data-insight-month');
  await target.click();
  assert.equal(await page.locator('#budgetMonthPicker').inputValue(),selectedMonth);
  await page.locator('#budgetCurrentMonth').click();
  await go('home');
 });
 await test('Activity applied filters are shown outside the drawer and cleared individually',async()=>{
  await go('activity');
  await page.locator('#activityAdvancedFilters>summary').click();
  assert.equal(await page.locator('#activityAccountFilter').isVisible(),true);
  assert.equal(await page.locator('#activityAccountFilterChips').isVisible(),false);
  assert.equal(await page.locator('.trace-activity-filters').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
  const metrics=await page.locator('#activityAdvancedFilters').evaluate(panel=>{
   const rect=panel.getBoundingClientRect();
   const filters=[...panel.querySelectorAll('.trace-activity-native-select')];
   const reset=panel.querySelector('#activityResetFilters').getBoundingClientRect();
   const last=filters[4].getBoundingClientRect();
   return{height:rect.height,columns:getComputedStyle(panel.querySelector('.trace-activity-filters')).gridTemplateColumns.split(' ').length,
    controls:filters.map(f=>({height:f.getBoundingClientRect().height,font:parseFloat(getComputedStyle(f).fontSize),
     appearance:getComputedStyle(f).appearance,background:getComputedStyle(f).backgroundImage,
     aria:f.getAttribute('aria-labelledby'),label:f.options[f.selectedIndex]?.text})),
    resetSameRow:Math.abs(reset.top-last.top)<=8,resetHeight:reset.height};
  });
  assert.ok(metrics.height<=340,'Filter panel should be slim, not a long form: '+metrics.height);
  assert.equal(metrics.columns,2);
  assert.ok(metrics.controls.every(f=>f.height===44&&f.font>=16&&f.appearance==='none'&&f.background!=='none'&&f.aria));
  assert.deepEqual(metrics.controls.map(f=>f.label),['Tous','Toutes','Toutes','Toutes','Confirmées']);
  assert.equal(metrics.resetSameRow,true);
  assert.ok(metrics.resetHeight>=44);
  await page.locator('#activityAccountFilter').selectOption('demo-fr-current');
  assert.equal(await page.locator('#activityAppliedFilters').isVisible(),true);
  assert.match(await page.locator('#activityFilterHint').innerText(),/1 filtre actif/);
  await page.locator('#activityAppliedFilters [data-clear-activity-filter="account"]').click();
  assert.equal(await page.locator('#activityAccountFilter').inputValue(),'all');
  assert.equal(await page.locator('#activityAppliedFilters').isVisible(),false);
  await page.locator('#activityAdvancedFilters>summary').click();
  await go('home');
 });
 await test('Add and Import use the same refined financial action list at all phone sizes',async()=>{
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   await go('home');
   await page.locator('#quickAdd').click();
   const box=page.locator('#sheetBackdrop');
   assert.equal(await box.getAttribute('data-trace-panel'),'quick-add');
   assert.equal(await page.locator('#sheetTitle').innerText(),'Ajouter');
   assert.equal(await page.locator('.trace-panel-caption').count(),0);
   assert.equal(await box.locator('.trace-add-choice').count(),2);
   const geometry=await box.locator('.trace-add-choice').evaluateAll(nodes=>nodes.map(el=>({
     height:el.getBoundingClientRect().height,
     width:el.getBoundingClientRect().width,
     hasSymbol:Boolean(el.querySelector('.trace-add-choice-symbol')),
     hasChevron:Boolean(el.querySelector('.trace-add-choice-chevron')),
     background:getComputedStyle(el).backgroundColor,
     text:el.innerText
   })));
   assert.ok(geometry.every(x=>x.height>=70&&x.height<=112&&x.hasSymbol&&x.hasChevron));
   assert.match(geometry[0].text,/Nouvelle opération/);
   assert.match(geometry[1].text,/Importer/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#traceAddImport').click();
   assert.equal(await box.getAttribute('data-trace-panel'),'import-choices');
   assert.equal(await box.locator('.trace-add-choice').count(),2);
   assert.equal(await page.locator('.trace-panel-caption').count(),0);
   assert.match(await page.locator('#traceAddMonthly').innerText(),/validation manuelle/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.locator('#closeSheet').click();
  }
  await page.setViewportSize({width:390,height:844});
 });
 await test('the plus routes manual, daily screenshots and monthly CSV/PDF to one import workspace',async()=>{
  await page.locator('#quickAdd').click();
  assert.equal(await page.locator('#traceAddManual').count(),1);
  await page.locator('#traceAddImport').click();
  assert.equal(await page.locator('#traceAddDaily').count(),1);
  assert.equal(await page.locator('#traceAddMonthly').count(),1);
  await page.locator('#traceAddDaily').click();
  assert.equal(await page.locator('#activityImport').isVisible(),true);
  assert.equal(await page.locator('#importCalendar').isVisible(),true);
  assert.equal(await page.locator('#activityTabs [data-tab="import"]').count(),0);
  assert.equal(await page.locator('#activityPageTitle').innerText(),'Importer');
  await page.locator('#traceImportMonthly').click();
  assert.equal(await page.locator('#traceImportAccountSelection').isVisible(),true);
  assert.equal(await page.locator('#importCalendar').isVisible(),false);
  assert.equal(await page.locator('#importDrop').isVisible(),true);
  assert.equal(await page.locator('#traceStatementDrawer').isVisible(),true);
  await page.locator('#activityImportBack').click();
  assert.equal(await page.locator('#activityTransactions').isVisible(),true);
  assert.equal(await page.locator('#activityTabs [role="tab"]').count(),3);
  assert.equal(await page.locator('#activityAdvancedFilters').evaluate(el=>el.open),false);
  await go('home');
 });
 await test('Activity exposes the same import calendar in one tap at 320, 390 and 768 pixels',async()=>{
  await go('activity');
  const shortcut=page.locator('#activityImportCalendar');
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   assert.equal(await shortcut.isVisible(),true);
   assert.equal(await shortcut.evaluate(el=>el.getBoundingClientRect().height>=44),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await shortcut.click();
   assert.equal(await page.locator('#activityImport').isVisible(),true);
   assert.equal(await page.locator('#importCalendar').isVisible(),true);
   assert.equal(await page.locator('#activityTabs').isVisible(),false);
   assert.equal(await shortcut.isVisible(),false);
   await page.locator('#activityImportBack').click();
   assert.equal(await shortcut.isVisible(),true);
  }
  await page.locator('#activityTabReview').click();
  assert.equal(await shortcut.isVisible(),true);
  await shortcut.click();
  assert.equal(await page.locator('#activityImport').isVisible(),true);
  await page.locator('#activityImportBack').click();
  await go('home');
 });
 await test('native iPhone financial selectors expose every option and preserve validation',async()=>{
  const balance=await text('homeBalance');
  await page.locator('#quickAdd').click();
  await page.locator('#traceAddManual').click();
  for(const id of ['manualTxAccount','manualTxCategory','manualTxBeneficiary','manualPurchaseCurrency']){
   const el=page.locator('#'+id);
   assert.ok(await el.isVisible(),id+' must be a visible native select');
   assert.equal(await el.getAttribute('aria-hidden'),null);
   assert.equal(await el.getAttribute('tabindex'),null);
   assert.ok(await el.evaluate(n=>n.getBoundingClientRect().height)>=44);
  }
  assert.ok(await page.locator('#manualTxAccount option').count()>1);
  assert.ok(await page.locator('#manualTxCategory option').count()>=2);
  const accounts=await page.locator('#manualTxAccount option').evaluateAll(nodes=>
   nodes.map(n=>n.value).filter(Boolean));
  await page.locator('#manualTxAccount').selectOption(accounts[accounts.length-1]);
  assert.equal(await page.locator('#manualTxAccount').inputValue(),accounts[accounts.length-1]);
  await page.locator('#manualTxBeneficiary').selectOption('custom');
  assert.equal(await page.locator('#manualFriendsGroup').isVisible(),true);
  await page.locator('#manualTxAmount').fill('40.005');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/centime/);
  assert.equal(await page.locator('#manualMovementError').getAttribute('role'),'alert');
  assert.equal(await page.locator('#manualMovementError').getAttribute('aria-live'),'assertive');
  await page.locator('#cancelManualTx').click();
  assert.equal(await text('homeBalance'),balance);
 });
 await test('a CAD debit shows indicative EUR purchase conversion without changing bank amount',async()=>{
  await go('home');
  const initial=await text('homeBalance');
  await page.locator('#quickAdd').click();
  await page.locator('#traceAddManual').click();
  const bank=page.locator('#manualTxAccount');
  const cad='demo-ca-current';
  assert.equal(await bank.locator('option[value="demo-ca-current"]').count(),1,
   'the fictional CAD current account must be available');
  await bank.selectOption(cad);
  await page.locator('#manualTxAmount').fill('100');
  await page.locator('#manualPurchaseCurrency').selectOption('EUR');
  const estimate=page.locator('#manualPurchaseEstimate');
  await page.waitForFunction(()=>{
   const value=document.querySelector('#manualPurchaseEstimate')?.textContent||'';
   return /Estimation indicative|Estimation indisponible/.test(value);
  },{timeout:12000});
  const displayed=await estimate.innerText();
  assert.match(displayed,/Estimation indicative|Estimation indisponible/);
  assert.match(displayed,/€|indisponible/);
  assert.equal(await page.locator('#manualTxAmount').inputValue(),'100');
  assert.equal(await page.locator('#manualPurchaseAmount').inputValue(),'');
  await page.locator('#cancelManualTx').click();
  assert.equal(await text('homeBalance'),initial);
 });
 await test('purchase-first EUR quote proposes CAD without silently changing a real bank debit',async()=>{
  await go('home');
  const before=await text('homeBalance');
  await page.locator('#quickAdd').click();
  await page.locator('#traceAddManual').click();
  const purchase=page.locator('#manualPurchaseAmount');
  assert.equal(await purchase.isVisible(),true);
  assert.equal(await purchase.evaluate(n=>n.compareDocumentPosition(
   document.querySelector('#manualTxAmount'))&Node.DOCUMENT_POSITION_FOLLOWING)>0,true);
  await page.locator('#manualTxAccount').selectOption('demo-ca-current');
  await purchase.fill('50');
  await page.locator('#manualPurchaseCurrency').selectOption('EUR');
  await page.waitForFunction(()=>
   /Estimation dans ton compte|Taux non disponible/.test(
    document.querySelector('#manualPurchaseEstimate')?.textContent||''),{timeout:12000});
  const txt=await page.locator('#manualPurchaseEstimate').innerText();
  assert.match(txt,/Estimation dans ton compte/,'fictional dated EUR quote must resolve');
  assert.equal(await page.locator('#manualTxAmount').inputValue(),'');
  assert.equal(await page.locator('#manualApplyBankEstimate').isVisible(),true);
  await page.locator('#manualApplyBankEstimate').click();
  assert.equal(await page.locator('#manualTxAmount').inputValue(),'80.00');
  assert.equal(await purchase.inputValue(),'50');
  await page.locator('#cancelManualTx').click();
  assert.equal(await text('homeBalance'),before,'a suggested FX amount is never posted before saving');
 });
 await test('Analyse opens from the beginning and annual budget shows chart before long guidance',async()=>{
  await go('home');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.locator('#analysisBtn').click();
  await page.waitForFunction(()=>document.querySelector('#sheetBackdrop .sheet')?.scrollTop===0,{timeout:3000});
  assert.equal(await page.locator('#sheetBackdrop .sheet').evaluate(n=>n.scrollTop),0);
  await page.locator('#closeSheet').click();
  await go('budget');
  const grid=page.locator('#annualBudgetChart .trace-year-grid');
  const more=page.locator('#annualBudgetChart .trace-year-diagnosis');
  if(await grid.count()&&await more.count()){
   const order=await grid.evaluate(n=>n.compareDocumentPosition(
    document.querySelector('#annualBudgetChart .trace-year-diagnosis')) & Node.DOCUMENT_POSITION_FOLLOWING);
   assert.ok(order,'month comparisons should precede long annual diagnosis');
  }
 });
 await test('calendar date keyboard focuses adjacent valid days without opening their actions',async()=>{
  await go('activity');
  await page.locator('#activityImportCalendar').click();
  const first=page.locator('#importCalendar .trace-cal-date:not([disabled])').first();
  await first.waitFor({state:'visible'});
  const source=await first.getAttribute('data-select-day');
  await first.focus();await first.press('ArrowRight');
  const focused=await page.evaluate(()=>document.activeElement?.dataset?.selectDay||'');
  assert.notEqual(focused,source);
  assert.equal(await page.locator('#traceDayModal').count(),0,'arrow focus does not open a day');
  await page.locator('[data-select-day="'+focused+'"]').press('Enter');
  assert.equal(await page.locator('#traceDayModal').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#traceDayModal').count(),0);
  await page.locator('#activityImportBack').click();
  await go('home');
 });
 await test('all screens use one premium palette with visible status and safe native controls',async()=>{
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:844});
   for(const name of ['home','budget','activity','wealth']){
    await go(name);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   }
   const asset=page.locator('#assetGrid .asset-card').first();
   if(await asset.count()){
    const style=await asset.evaluate(el=>({
     background:getComputedStyle(el).backgroundColor,
     border:getComputedStyle(el).borderTopColor,
     amount:getComputedStyle(el.querySelector('b')).fontVariantNumeric
    }));
    assert.notEqual(style.background,'rgb(255, 255, 255)');
    assert.match(style.amount,/tabular-nums/);
   }
   await go('activity');
   await page.locator('#activityTabReview').click();
   const review=page.locator('#activityReviewAccountFilter');
   assert.ok(await review.isVisible());
   assert.equal(await review.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=16,true);
   await page.locator('#activityTabTransactions').click();
   await page.locator('#activityAdvancedFilters').evaluate(el=>{el.open=true});
   const selects=await page.locator('#activityAdvancedFilters select').evaluateAll(nodes=>
    nodes.map(el=>({height:el.getBoundingClientRect().height,
      font:parseFloat(getComputedStyle(el).fontSize)})));
   assert.ok(selects.every(x=>x.height>=44&&x.font>=16));
   await page.locator('#activityAdvancedFilters').evaluate(el=>{el.open=false});
  }
  await page.setViewportSize({width:390,height:844});
  await go('home');
 });
 await test('Activity financial totals read as one quiet strip without hiding filters',async()=>{
  await go('activity');
  const drawer=page.locator('#activityAdvancedFilters');
  await drawer.evaluate(el=>{el.open=false});
  assert.equal(await drawer.evaluate(el=>el.open),false);
  assert.equal(await page.locator('.activity-stats .statbox').count(),3);
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   const stats=await page.locator('.activity-stats .statbox').evaluateAll(nodes=>nodes.map(n=>{
    const st=getComputedStyle(n);return {background:st.backgroundColor,topBorder:st.borderTopWidth,
     number:parseFloat(getComputedStyle(n.querySelector('b')).fontSize)};
   }));
   assert.ok(stats.every(s=>s.background==='rgba(0, 0, 0, 0)'&&s.topBorder==='0px'&&s.number>=14));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  }
  await page.setViewportSize({width:390,height:844});
  await drawer.locator('summary').click();
  assert.equal(await drawer.evaluate(el=>el.open),true);
  await drawer.locator('summary').click();
  await go('home');
 });
 await test('Home budget shows real progress without hiding tools or double-counting cash',async()=>{
  await go('home');
  assert.equal(await page.locator('#homeBudgetSub').isVisible(),true);
  assert.equal(await page.locator('#homeBudgetTrack').isVisible(),true);
  assert.equal(await page.locator('#homeBudgetProgressDetails').isVisible(),true);
  const budget=await page.locator('#homeBudgetAvailable').innerText();
  assert.match(await page.locator('#homeBudgetSub').innerText(),/prévus ce mois/);
  assert.match(await page.locator('#homeBudgetPercent').innerText(),/% consommé/);
  assert.match(await page.locator('#homeBudgetSpent').innerText(),/dépensés/);
  assert.equal(await page.locator('#shareCard').isVisible(),true);
  assert.equal(await page.locator('#homeImportCalendar').isVisible(),true);
  assert.equal(await page.locator('#shareOpen').isVisible(),true);
  const row=await page.locator('#homeBudgetProgressDetails').evaluate(el=>{
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   return{display:s.display,height:r.height};
  });
  assert.equal(row.display,'flex');
  assert.ok(row.height<=30,'Progress row should not crowd the Home hero');
  assert.equal(await page.locator('#homeBudgetAvailable').innerText(),budget);
 });
 await test('Activity tabs are subtle underlines, and the three financial totals remain visible',async()=>{
  await go('activity');
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   const tab=await page.locator('#activityTabTransactions').evaluate(el=>{
    const s=getComputedStyle(el),after=getComputedStyle(el,'::after');
    return{bg:s.backgroundColor,radius:s.borderRadius,bar:after.height,color:s.color};
   });
   assert.equal(tab.bg,'rgba(0, 0, 0, 0)');
   assert.equal(tab.bar,'2px');
   assert.equal(await page.locator('.activity-stats .statbox:visible').count(),3);
   assert.ok(await page.locator('.activity-stats').evaluate(el=>el.getBoundingClientRect().height)<95);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  }
  await page.setViewportSize({width:390,height:844});
  await go('home');
 });
 await test('small Home account pills preserve 44px touch targets',async()=>{
  await go('home');
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   const pills=await page.locator('#traceIntlHome .trace-intl-chip').evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect(),sty=getComputedStyle(n),pseudo=getComputedStyle(n,'::before');
    const name=n.querySelector('.trace-intl-chip-name');
    return {height:r.height,width:r.width,font:parseFloat(sty.fontSize),
     visibleHeight:r.height-parseFloat(pseudo.top)-parseFloat(pseudo.bottom),
     label:name?.textContent,unclipped:!name||name.scrollWidth<=name.clientWidth+1,
     fullName:n.getAttribute('title'),aria:n.getAttribute('aria-label')};
   }));
   assert.ok(pills.length>=2);
   assert.ok(pills.every(p=>p.height>=44&&p.width<=152&&p.font<=11&&p.visibleHeight<=31));
   assert.ok(pills.every(p=>p.unclipped&&p.aria?.includes('Consulter')&&p.fullName));
   assert.ok(pills.some(p=>p.label==='Canada')&&pills.some(p=>p.label==='France'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  }
  await page.setViewportSize({width:390,height:844});
 });
 await test('account chips show native EUR without changing the official principal or budget',async()=>{
  const budget=await text('homeBudgetAvailable');
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.traceViewAccount),'demo-fr-current');
  assert.match(await text('homeBalance'),/1\s*208,80/);assert.match(await text('homeBalance'),/€/);
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
  assert.equal(await text('homeBudgetAvailable'),budget);
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*670,00/);
 });
 await test('changing principal requires explicit confirmation; cancelling is read-only',async()=>{
  await selectPrimary('demo-fr-current');
  assert.equal(await text('sheetTitle'),'Changer le compte principal');
  assert.match(await text('homeBalance'),/3\s*670,00/);
  await page.locator('#tracePrimaryCancel').click();
  await page.locator('#closeSheet').click();
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
 });
 await test('confirmed EUR principal keeps CAD historical budget and independent Couple totals',async()=>{
  const budget=await text('homeBudgetAvailable');
  await selectPrimary('demo-fr-current');
  await page.locator('#tracePrimaryConfirm').click();
  await page.locator('#closeSheet').click();
  assert.match(await text('homeBalance'),/1\s*208,80/);
  assert.equal(await text('homeBudgetAvailable'),budget);
  await page.locator('#homeScope [data-scope="couple"]').click();
  assert.match(await text('homeBalance'),/8\s*904,08/);
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
  await page.locator('#homeScope [data-scope="mine"]').click();
 });
 await test('account detail shows two recent operations and opens filtered Activity',async()=>{
  await accountSettings();
  await page.locator('[data-details-bank="demo-fr-current"]').click();
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'account-detail');
  assert.equal(await page.locator('.trace-account-last-line').count(),2);
  assert.equal(await page.locator('.trace-account-detail-section-title').innerText(),'Informations du compte');
  assert.equal(await page.locator('.trace-account-detail-info>div').count(),5);
  assert.ok(await page.locator('#traceAccountDetailBack').isVisible());
  assert.match(await text('sheetBody'),/À vérifier/);
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   assert.ok(await page.locator('#traceAccountAllTx').evaluate(el=>el.getBoundingClientRect().height>=44));
  }
  await page.setViewportSize({width:390,height:844});
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
  assert.equal(await page.locator('#sheetBackdrop').getAttribute('data-trace-panel'),'budget-category-detail');
  assert.match(await page.locator('.trace-insight-sheet-intro strong').innerText(),/104/);
  assert.ok(await page.locator('#traceBudgetToActivity').isVisible());
  await page.locator('#traceBudgetToActivity').click();
  assert.equal(await page.locator('#activityCategoryFilter').inputValue(),'groceries');
 });
 await test('pending EUR activity remains separate from confirmed spending',async()=>{
  await page.locator('#activityAdvancedFilters>summary').click();
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
  await openImports('monthly');
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
  await openImports('monthly');
  await page.locator('#traceStatementFile').setInputFiles(path.join(__dirname,'fixtures/statements/image-only.pdf'));
  await page.locator('#traceStatementExtract').click();
  await page.locator('.trace-statement-extraction-warning').filter({hasText:'Extraction non disponible'}).waitFor();
  assert.equal(await page.locator('#traceStatementUseProposals').count(),0);
  assert.ok(await page.locator('[data-statement-row]').count()>0);
 });
 await test('manual fractional-cent EUR input is blocked instead of silently rounding',async()=>{
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional precision test');
  await page.locator('#manualTxAmount').fill('40.005');
  await page.locator('#manualTxCategory').selectOption('groceries');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/centime/);
  await page.locator('#cancelManualTx').click();
 });
 await test('EUR settlement excludes the CAD Mastercard while retaining the French deferred card',async()=>{
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualKind').selectOption('card_payment');
  const destinations=await page.locator('#manualTarget option').evaluateAll(
   options=>options.map(option=>option.value));
  assert.ok(!destinations.includes('demo-ca-card'),
   'A EUR current account must never settle the CAD Mastercard');
  assert.ok(destinations.includes('demo-fr-deferred-card'),
   'The French deferred card remains visible as an eligible EUR target');
  // Eligibility is read-only here; do not submit a fictitious deferred
  // settlement in the browser smoke without its complete monthly evidence.
  await page.locator('#cancelManualTx').click();
 });
 await test('French deferred forecast is read-only, matches cutoff and debit dates, and rejects fractional cents',async()=>{
  await go('home');
  const budget=await text('homeBudgetAvailable'),spending=await text('homeSpending');
  await accountSettings();
  await page.locator('[data-details-bank="demo-fr-deferred-card"]').click();
  assert.equal(await page.locator('#traceDeferredForecastRun').count(),1);
  await page.locator('#traceDeferredForecastAmount').fill('100.35');
  await page.locator('#traceDeferredForecastPurchase').fill('2026-10-18');
  await page.locator('#traceDeferredForecastBudget').fill('2026-10-18');
  assert.equal(await page.locator('#traceDeferredForecastDue').inputValue(),'2026-11-05');
  assert.equal(await page.locator('#traceDeferredForecastDue').getAttribute('readonly'),'');
  await page.locator('#traceDeferredForecastRun').click();
  assert.match(await text('traceDeferredForecastResult'),/100,35/);
  assert.match(await text('traceDeferredForecastResult'),/2026-11-05/);
  await page.locator('#traceDeferredForecastAmount').fill('100.005');
  await page.locator('#traceDeferredForecastRun').click();
  assert.match(await text('traceDeferredForecastResult'),/décimales|centime/i);
  await page.locator('#closeSheet').click();await go('home');
  assert.equal(await text('homeBudgetAvailable'),budget);
  assert.equal(await text('homeSpending'),spending);
 });
 await test('unreleased French deferred purchase and settlement reject immediately before any FX request',async()=>{
  await go('home');
  const budget=await text('homeBudgetAvailable'),spending=await text('homeSpending');
  const remoteBefore=external.length;
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-deferred-card');
  await page.locator('#manualTxName').fill('Must reject deferred purchase');
  await page.locator('#manualTxAmount').fill('25');
  await page.locator('#manualTxCategory').selectOption('groceries');
  assert.match(await text('manualMovementImpact'),/lecture seule/i);
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/écritures non activées/i);
  await page.locator('#cancelManualTx').click();
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualKind').selectOption('card_payment');
  await page.locator('#manualTarget').selectOption('demo-fr-deferred-card');
  await page.locator('#manualTxAmount').fill('65');
  assert.match(await text('manualMovementImpact'),/lecture seule/i);
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/écritures non activées/i);
  await page.locator('#cancelManualTx').click();
  assert.equal(await text('homeBudgetAvailable'),budget);
  assert.equal(await text('homeSpending'),spending);
  assert.equal(external.length,remoteBefore,'A blocked deferred write must not attempt network FX');
 });
 await test('100 CAD credit purchase and 100 CAD repayment create one expense and one neutral transfer',async()=>{
  await go('home');
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
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
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
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
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional 40 EUR immediate purchase');
  await page.locator('#manualTxAmount').fill('40');
  await page.locator('#manualTxCategory').selectOption('groceries');
  await page.waitForFunction(()=>document.querySelector('#manualMovementImpact').textContent.includes('64,00'));
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  await go('home');
  assert.match(await text('homeBalance'),/1\s*168,80/);
  const after=Number((await text('homeSpending')).replace(/[^0-9]/g,''));
  assert.equal(after-before,64);
 });
 await test('50 USD purchase paid as 46.20 EUR keeps native debit and historical CAD valuation',async()=>{
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional 50 USD paid from EUR');
  await page.locator('#manualTxAmount').fill('46.20');
  await page.locator('#manualPurchaseCurrency').selectOption('USD');
  await page.locator('#manualPurchaseAmount').fill('50');
  await page.locator('#manualTxCategory').selectOption('travel');
  await page.waitForFunction(()=>document.querySelector('#manualMovementImpact').textContent.includes('73,92'));
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});await go('home');
  assert.match(await text('homeBalance'),/1\s*122,60/);
  assert.match(await text('homeSpending'),/416/);
 });
 await test('CAD to EUR transfer preserves actual debit, receipt and included fees with no budget expense',async()=>{
  const budget=await text('homeBudgetAvailable'),spending=await text('homeSpending');
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-ca-current');
  await page.locator('#manualKind').selectOption('transfer');
  await page.locator('#manualTarget').selectOption('demo-fr-current');
  await page.locator('#manualTxName').fill('Fictional CAD EUR transfer with fees');
  await page.locator('#manualTxAmount').fill('150');
  await page.locator('#manualDestAmount').fill('95');
  await page.locator('#manualTransferFee').fill('2.005');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/centime/);
  await page.locator('#manualTransferFee').fill('2');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});await go('home');
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeChecking'),/3\s*850/);
  assert.match(await text('homeBalance'),/3\s*420/);
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  assert.match(await text('homeBalance'),/1\s*217,60/);
  assert.equal(await text('homeBudgetAvailable'),budget);assert.equal(await text('homeSpending'),spending);
 });
 await test('a linked EUR savings account is created with native opening balance and dated indicative conversion',async()=>{
  await go('wealth');await page.locator('#addAsset').click();
  await page.locator('#investmentAccountName').fill('Livret EUR fictif');
  await page.locator('#investmentAccountType').selectOption('Livret');
  await page.locator('#investmentAccountCurrency').selectOption('EUR');
  assert.match(await text('newSavingsAmountLabel'),/EUR/);
  await page.locator('#newSavingsDate').fill('2026-10-01');
  await page.locator('#newSavingsAmount').fill('200.005');
  await page.locator('#saveInvestmentAccount').click();
  assert.match(await text('newSavingsError'),/Vérifie/);
  await page.locator('#newSavingsAmount').fill('200');
  await page.locator('#saveInvestmentAccount').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  const tile=page.locator('#wealthSavingsGrid [data-inv-account]').filter({hasText:'Livret EUR fictif'});
  euroSavingsId=await tile.getAttribute('data-inv-account');
  assert.match(await tile.innerText(),/200,00.*€/);
  assert.match(await tile.innerText(),/320/);
 });
 await test('40 EUR savings deposit moves native cash and savings once with unchanged budget and total wealth',async()=>{
  const wealth=await text('wealthTotal');await go('home');
  const budget=await text('homeBudgetAvailable');
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualKind').selectOption('savings_transfer');
  await page.locator('#manualSavings').selectOption(euroSavingsId);
  await page.locator('#manualTxName').fill('Fictional EUR savings deposit');
  await page.locator('#manualTxAmount').fill('40');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});await go('home');
  assert.match(await text('homeBalance'),/1\s*177,60/);
  assert.equal(await text('homeBudgetAvailable'),budget);await go('wealth');
  assert.equal(await text('wealthTotal'),wealth);
  assert.match(await page.locator('[data-inv-account="'+euroSavingsId+'"]').innerText(),/240,00.*€/);
 });
 await test('150 CAD to EUR savings requires the actual 95 EUR receipt without assuming a 1:1 rate',async()=>{
  await go('home');const budget=await text('homeBudgetAvailable');
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-ca-current');
  await page.locator('#manualKind').selectOption('savings_transfer');
  await page.locator('#manualSavings').selectOption(euroSavingsId);
  await page.locator('#manualTxName').fill('Fictional CAD EUR savings deposit');
  await page.locator('#manualTxAmount').fill('150');
  await page.locator('#saveManualTx').click();
  assert.match(await text('manualMovementError'),/montant réel/);
  await page.locator('#manualDestAmount').fill('95');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});await go('home');
  assert.equal(await text('homeBudgetAvailable'),budget);
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*270/);await go('wealth');
  assert.match(await page.locator('[data-inv-account="'+euroSavingsId+'"]').innerText(),/335,00.*€/);
 });
 await test('a 15 EUR savings withdrawal is a cash transfer without new budget income',async()=>{
  await go('home');const income=await text('homeIncome'),budget=await text('homeBudgetAvailable');
  await page.locator('#quickAdd').click();await page.locator('#traceAddManual').click();
  await page.locator('#manualTxAccount').selectOption('demo-fr-current');
  await page.locator('#manualKind').selectOption('savings_withdrawal');
  await page.locator('#manualSavings').selectOption(euroSavingsId);
  await page.locator('#manualTxName').fill('Fictional EUR savings withdrawal');
  await page.locator('#manualTxAmount').fill('15');
  await page.locator('#saveManualTx').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});await go('home');
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  assert.match(await text('homeBalance'),/1\s*192,60/);
  assert.equal(await text('homeIncome'),income);assert.equal(await text('homeBudgetAvailable'),budget);
  await go('wealth');const tile=page.locator('[data-inv-account="'+euroSavingsId+'"]');
  assert.match(await tile.innerText(),/320,00.*€/);await tile.click();
  assert.match(await text('sheetBody'),/320,00.*€/);assert.match(await text('sheetBody'),/taux du/);
  await page.locator('#savingsReturn').click();
 });
 await test('unknown CHF opening balance remains unconfigured and makes consolidated wealth incomplete',async()=>{
  await page.locator('#addAsset').click();
  await page.locator('#investmentAccountName').fill('CHF sans solde fictif');
  await page.locator('#investmentAccountType').selectOption('Épargne');
  await page.locator('#investmentAccountCurrency').selectOption('CHF');
  await page.locator('#saveInvestmentAccount').click();
  await page.locator('#sheetBackdrop').waitFor({state:'hidden'});
  const tile=page.locator('#wealthSavingsGrid [data-inv-account]').filter({hasText:'CHF sans solde fictif'});
  assert.match(await tile.innerText(),/À configurer/);assert.doesNotMatch(await tile.innerText(),/0,00/);
  assert.equal(await text('wealthTotal'),'Total incomplet');
 });
 await test('account metadata preserves historical currency and partner accounts remain read-only in settings',async()=>{
  await accountSettings();
  await page.locator('[data-config-bank="demo-fr-current"]').click();
  assert.equal(await page.locator('#traceBankMetaCurrency').isDisabled(),true);
  await page.locator('#traceBankMetaName').fill('France · compte EUR validé');
  await page.locator('#traceBankMetaSave').click();
  await page.locator('[data-bank-scope="couple"]').click();
  assert.equal(await page.locator('[data-config-bank="demo-partner-current"]').count(),0);
  await page.locator('[data-details-bank="demo-partner-current"]').click();
  assert.equal(await page.locator('#traceAccountSelectPrimary').count(),0);
  assert.match(await text('sheetBody'),/Titulaire/);
  await page.locator('#closeSheet').click();
 });
 await test('card reassociation uses one valid CAD settlement account without changing any budget or historical cash',async()=>{
  await accountSettings();await page.locator('[data-bank-scope="mine"]').click();
  await page.locator('#traceAddBankAccount').click();
  await page.locator('#traceNewBankName').fill('CAD règlement de secours');
  await page.locator('#traceNewBankAmount').fill('1000');
  await page.locator('#traceNewBankDate').fill('2026-10-01');
  await page.locator('#traceNewBankMode').selectOption('start');
  await page.locator('#traceSaveNewBank').click();
  backupBankId=await page.locator('.trace-bank-account').filter({hasText:'CAD règlement de secours'}).locator('[data-config-bank]').getAttribute('data-config-bank');
  await page.locator('[data-config-bank="demo-ca-card"]').click();
  await page.locator('#traceBankMetaSettlement').selectOption(backupBankId);
  await page.locator('#traceBankMetaSave').click();await page.locator('#closeSheet').click();
  await go('home');const budget=await text('homeBudgetAvailable');
  await page.locator('[data-trace-view-account="'+backupBankId+'"]').click();
  assert.match(await text('homeBalance'),/570,00/);
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*700/);
  await accountSettings();await page.locator('[data-config-bank="demo-ca-card"]').click();
  await page.locator('#traceBankMetaSettlement').selectOption('demo-ca-current');
  await page.locator('#traceBankMetaSave').click();await page.locator('#closeSheet').click();
  assert.match(await text('homeBalance'),/3\s*270/);assert.equal(await text('homeBudgetAvailable'),budget);
 });
 await test('archiving requires a different confirmed principal and preserves filtered transaction history',async()=>{
  const budget=await text('homeBudgetAvailable');await accountSettings();
  await page.locator('[data-config-bank="demo-fr-current"]').click();
  await page.locator('#traceBankMetaArchive').click();
  assert.match(await text('sheetBody'),/autre compte principal/);
  await page.locator('#traceArchiveBack').click();
  await page.locator('[data-primary-bank="demo-ca-current"]').click();
  await page.locator('#tracePrimaryConfirm').click();
  await page.locator('[data-config-bank="demo-fr-current"]').click();
  await page.locator('#traceBankMetaArchive').click();
  assert.match(await text('sheetBody'),/Réassocie ou archive d’abord les cartes liées/,
   'Archiving a checking account must not strand its linked French card');
  await page.locator('#traceArchiveBack').click();
  await page.locator('#traceAddBankAccount').click();
  await page.locator('#traceNewBankName').fill('EUR règlement de secours');
  await page.locator('#traceNewBankCountry').selectOption('FR');
  await page.locator('#traceNewBankCurrency').selectOption('EUR');
  await page.locator('#traceNewBankAmount').fill('0');
  await page.locator('#traceNewBankDate').fill('2026-10-01');
  await page.locator('#traceSaveNewBank').click();
  const euroBackupId=await page.locator('.trace-bank-account').filter({hasText:'EUR règlement de secours'})
   .locator('[data-config-bank]').getAttribute('data-config-bank');
  await page.locator('[data-config-bank="demo-fr-deferred-card"]').click();
  await page.locator('#traceBankMetaSettlement').selectOption(euroBackupId);
  await page.locator('#traceBankMetaSave').click();
  await page.locator('[data-config-bank="demo-fr-current"]').click();
  await page.locator('#traceBankMetaArchive').click();await page.locator('#traceArchiveConfirm').click();
  assert.equal(await page.locator('[data-config-bank="demo-fr-current"]').count(),0);
  await page.locator('.trace-archived-accounts>summary').click();
  await page.locator('[data-archive-history="demo-fr-current"]').click();
  assert.equal(await page.locator('#activityAccountFilter').inputValue(),'demo-fr-current');
  assert.match(await page.locator('#activityAccountFilter option:checked').innerText(),/Archivé/);
  assert.match(await text('transactionList'),/Boulangerie/);
  await go('home');assert.equal(await text('homeBudgetAvailable'),budget);
 });
 await test('restoring an archived account brings back the exact native balance and retained savings links',async()=>{
  await accountSettings();await page.locator('.trace-archived-accounts>summary').click();
  await page.locator('[data-restore-bank="demo-fr-current"]').click();await page.locator('#traceArchiveConfirm').click();
  assert.equal(await page.locator('[data-config-bank="demo-fr-current"]').count(),1);
  await page.locator('#closeSheet').click();await go('home');
  await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  assert.match(await text('homeBalance'),/1\s*192,60/);await go('wealth');
  assert.match(await page.locator('[data-inv-account="'+euroSavingsId+'"]').innerText(),/320,00.*€/);
 });
 await test('a full offline reload uses the dedicated static PWA and resets only fictional data',async()=>{
  await page.waitForFunction(()=>window.TracePreviewPWA?.ready&&navigator.serviceWorker.controller);
  await context.setOffline(true);await go('home');
  await page.locator('[data-trace-view-account="demo-ca-current"]').click();
  assert.match(await text('homeBalance'),/3\s*270,00/);
  await go('wealth');await go('budget');
  await page.reload();
  await page.waitForFunction(()=>window.__TRACE_PREVIEW_STATUS__?.boot==='ok');
  await page.waitForFunction(()=>window.TracePDFJSLocalEngine?.version==='6.4.299');
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
  assert.match(await text('homeBalance'),/3\s*670,00/);
 });
 await test('offline PDF extraction loads the actual cached local engine and worker',async()=>{
  await openImports('monthly');
  await page.locator('#traceStatementDrawer>summary').click();
  await page.locator('#traceStatementAccount').selectOption('demo-fr-current');
  await page.locator('#traceStatementFile').setInputFiles(path.join(__dirname,'fixtures/statements/fr-eur-multipage.pdf'));
  await page.locator('#traceStatementExtract').click();
  await page.locator('#traceStatementUseProposals').waitFor();
  assert.equal(await page.locator('.trace-statement-proposal-list>div').count(),4);
  assert.match(await text('traceStatementExtraction'),/Page 2, ligne 5/);
  await context.setOffline(false);await boot();
  assert.equal(await page.locator('#traceIntlPrimary').count(),0);
 });
 await test('actual CSV upload shows all rows and bank matches, imports pending only and stays idempotent',async()=>{
  const budget=await text('homeBudgetAvailable'),cash=await text('homeBalance');
  await go('activity');await page.locator('#activityTabs [data-tab="review"]').click();
  const pendingBefore=await page.locator('[data-import-pending]').count();
  await openImports('monthly');
  const file={name:'fictional-canadian.csv',mimeType:'text/csv',buffer:Buffer.from(
   'Date;Libellé;Débit;Crédit\n12/10/2026;Paiement CSV;50,00;\n'+
   '15/10/2026;Ticket train;25,00;\n15/10/2026;Ticket train;25,00;\n'+
   '16/10/2026;Fournitures;26,00;\n17/10/2026;Papeterie;27,00;\n'+
   '18/10/2026;Document;28,00;\n19/10/2026;Dernière ligne;29,00;\n'+
   '20/10/2026;Colonnes ambiguës;4,00;2,00;\n21/10/2026;Illisible;??;\n')};
  const load=async()=>{
   await page.locator('#importFile').setInputFiles(file);
   await page.locator('#csvAccount').selectOption('demo-ca-current');
   await page.locator('#csvPreview').click();
  };
  await load();assert.equal(await page.locator('[data-csv-preview-row]').count(),7);
  assert.equal(await page.locator('[data-csv-preview-row="8"]').count(),1);
  assert.match(await text('csvPreviewResult'),/2 ligne\(s\) invalide\(s\)/);
  await page.locator('[data-csv-preview-row="2"]>summary').click();
  assert.match(await page.locator('[data-csv-compare-id="demo-card-payment"]').innerText(),/Paiement Mastercard.*fictif/s);
  assert.match(await page.locator('[data-csv-compare-id="demo-card-payment"]').innerText(),/Confirmée/);
  await page.locator('#csvCommit').click();
  assert.match(await text('csvImportWarnings'),/confirme leur traitement séparé/,
   'CSV with unreadable lines must require explicit human acknowledgement');
  await page.locator('#csvInvalidAcknowledged').check();
  await page.locator('#csvCommit').click();
  await page.waitForFunction(()=>document.getElementById('importResult')?.textContent.includes('7 opération(s) placée(s)'));
  assert.equal(await page.locator('#activityTabReview').getAttribute('aria-selected'),'true',
   'Successful import must lead to the review screen');
  assert.equal(await page.locator('[data-import-pending]').count(),pendingBefore+7,
   'Every valid CSV row must be pending exactly once');
  assert.equal(await page.locator('[data-import-pending]').filter({hasText:'Ticket train'}).count(),2);
  await go('home');assert.equal(await text('homeBudgetAvailable'),budget);assert.equal(await text('homeBalance'),cash);
  await openImports('monthly');
  await load();assert.match(await text('csvPreviewResult'),/0 lignes à vérifier/);
  assert.match(await text('csvPreviewResult'),/7 doublon\(s\) déjà présents non réimportés/);
  assert.equal(await page.locator('#csvCommit').count(),0);
 });
 await test('foreign CSV retains its actual EUR amount while budget and native bank balance remain unchanged pending review',async()=>{
  await go('home');await page.locator('[data-trace-view-account="demo-fr-current"]').click();
  const cash=await text('homeBalance'),budget=await text('homeBudgetAvailable');
  await openImports('monthly');
  await page.locator('#importFile').setInputFiles({name:'fictional-french.csv',mimeType:'text/csv',
   buffer:Buffer.from('Date;Libellé;Débit;Crédit\n20/10/2026;Achat EUR fictif;18,40;\n')});
  await page.locator('#csvAccount').selectOption('demo-fr-current');await page.locator('#csvPreview').click();
  assert.match(await page.locator('[data-csv-preview-row]').innerText(),/18,40.*€/);
  await page.locator('#csvCommit').click();
  await page.waitForFunction(()=>document.getElementById('importResult')?.textContent.includes('1 opération(s) placée(s)'));
  assert.equal(await page.locator('#activityTabReview').getAttribute('aria-selected'),'true');
  assert.match(await page.locator('[data-import-pending]').filter({hasText:'Achat EUR fictif'}).innerText(),/18,40.*€.*CAD à valider/s);
  await go('home');assert.equal(await text('homeBalance'),cash);assert.equal(await text('homeBudgetAvailable'),budget);
 });
 await test('the dedicated laboratory worker caches no credentials, financial records or bank statements',async()=>{
  const cached=await page.evaluate(async()=>({
   registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,script:r.active?.scriptURL})),
   caches:await Promise.all((await caches.keys()).map(async name=>({name,urls:(await (await caches.open(name)).keys()).map(r=>r.url)})))
  }));
  assert.deepEqual(cached.registrations,[{scope:base+'/trace-international-preview.html',script:base+'/trace-international-preview-sw.js'}]);
  assert.equal(cached.caches.length,1);assert.match(cached.caches[0].name,/^trace-lab-537:/);
  for(const url of cached.caches[0].urls){
   assert.ok(url.startsWith(base+'/'));
   assert.doesNotMatch(url,/(?:config\.js|cloud\.js|index\.html|\/sw\.js|\.pdf$|supabase|fixtures\/statements)/);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 });
 await test('Budget keeps compact family totals and add actions',async()=>{
  await go('budget');
  assert.equal(await page.locator('#budgetSections .trace-budget-family').count(),3);
  assert.equal(await page.locator('#budgetSections .trace-budget-family-total').count(),3);
  for(const kind of ['income','fixed','variable']){
   const family=page.locator('#budgetSections [data-budget-family="'+kind+'"]');
   assert.ok((await family.locator(':scope > .budget-card').count())<=2);
   assert.ok(await page.locator('#budgetSections .trace-budget-family-head [data-budget-add="'+kind+'"]').isVisible());
  }
  const folded=page.locator('#budgetSections details[data-budget-extra]');
  if(await folded.count()){
   const first=folded.first(),entry=first.locator('[data-budget-edit]').first();
   assert.equal(await entry.isVisible(),false);
   await first.locator('summary').click();
   assert.equal(await entry.isVisible(),true);
   assert.match(await first.locator('summary').innerText(),/Masquer/);
   await first.locator('summary').click();
   assert.equal(await entry.isVisible(),false);
  }
  assert.ok(await page.locator('#manageBudgetCategories').isVisible());
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
