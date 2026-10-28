'use strict';
// TRACE 5.37.0 International — opt-in browser/PWA smoke test.
// Usage: TRACE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core \
//        TRACE_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
//        node scripts/trace-browser-537-qa.cjs [--report /tmp/trace-browser.json]
// Set TRACE_BROWSER_ENGINE=webkit with PLAYWRIGHT_BROWSERS_PATH for
// Playwright-managed WebKit Linux. This is not Safari on physical iPhone.
// Never load a production origin, financial data, credentials or external requests.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const engine=process.env.TRACE_BROWSER_ENGINE||'chromium';
if(!['chromium','webkit'].includes(engine))
 throw Error('TRACE_BROWSER_ENGINE must be chromium or webkit');
const root=process.env.TRACE_LAB_ROOT?path.resolve(process.env.TRACE_LAB_ROOT):
 path.resolve(__dirname,'..');
if(process.env.TRACE_LAB_ROOT&&!fs.existsSync(path.join(root,'trace-lab-export-audit.json')))
 throw Error('TRACE_LAB_ROOT must point to a fictional-only PWA export');
const preview='trace-international-preview.html';
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const widths=[320,390,768,1440],tabs=['budget','activity','wealth','home'];
const report={schema:'trace-537-browser-qa-v1',engine,commit:null,widths:[],offline:null,
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
  if(engine==='webkit'){
   // WebKit Linux cannot replace a physical Safari/iPhone release check.
   browser=await webkit.launch({headless:true});
  }else{
   const executablePath=process.env.TRACE_CHROMIUM_EXECUTABLE;
   if(!executablePath)throw Error('TRACE_CHROMIUM_EXECUTABLE is required for isolated QA');
   browser=await chromium.launch({headless:true,executablePath,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  }
  for(const width of widths){
   const touch=engine==='webkit'&&width<=390;
   const context=await browser.newContext({viewport:{width,height:850},
    serviceWorkers:'allow',reducedMotion:'reduce',
    deviceScaleFactor:touch?3:1,isMobile:touch,hasTouch:touch});
   const page=await context.newPage(),errors=[],httpErrors=[],outside=[];
   const activate=(locator,options={})=>touch?locator.tap(options):locator.click(options);
   page.on('pageerror',error=>errors.push(error.message+' STACK '+(error.stack||'')));
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
    if(touch)await page.evaluate(()=>{
     window.__traceQaTouchStarts=0;
     document.addEventListener('touchstart',()=>{window.__traceQaTouchStarts++},{passive:true});
    });
    if(width<=390){
     const help=await page.locator('#helpBtn').boundingBox();
     assert.ok(help&&help.width>=44&&help.height>=44,
      'iPhone-sized viewport must expose a 44px help touch target');
    }
    const home=await metrics(page);
    assert.equal(home.active,'home');
    assert.ok(home.heading.length>12,'Home must render actual text');
    assert.equal(home.scrollWidth,width,'No horizontal document overflow on '+width);
    assert.equal(home.navTargets.length,4,'Four real navigation destinations');
    for(const target of home.navTargets){
     assert.ok(target.width>=44&&target.height>=44,'Touch target under 44px: '+target.label);
    }
    // Six monthly financial chart columns are accessible, not 10px ellipses.
    const trends=page.locator('[data-page="home"] .trace-trend-bars[role="img"]');
    assert.equal(await trends.count(),6,'Six accessible finance chart months');
    for(const label of await trends.evaluateAll(els=>els.map(el=>el.getAttribute('aria-label'))))
     assert.ok(label&&label.length>10,'Month chart must expose accessible values');
    if(width<=420){
     const small=await page.locator('[data-page="home"] .trace-trend-col>small').first()
       .evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
     assert.ok(small>=11,'Compact month labels must be readable at 11px or above');
     const amountStyle=await page.locator('[data-page="home"] .trace-trend-col>b').first()
       .evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),
        wrapping:getComputedStyle(el).whiteSpace}));
     assert.ok(amountStyle.size>=11&&amountStyle.wrapping==='normal',
      'Chart amounts must wrap instead of using tiny ellipses');
    }
    const checked=[];
    for(const tab of tabs){
     await activate(page.locator('.navbtn[data-nav="'+tab+'"]'),{timeout:6000});
     const data=await metrics(page);
     assert.equal(data.active,tab,'Wrong page active for '+tab);
     assert.equal(data.selectedNav,tab,'Wrong selected tab for '+tab);
     assert.ok(data.heading.length>5,'Empty content for '+tab);
     assert.equal(data.scrollWidth,width,'Horizontal overflow after '+tab);
     checked.push({tab,heading:data.heading});
    }
    if(touch){
     assert.ok(await page.evaluate(()=>window.__traceQaTouchStarts>=4),
      'WebKit mobile navigation must dispatch actual touchstart events');
     assert.equal(await page.locator('.trace-trend-columns').first().getAttribute('tabindex'),'0',
      'Finance trends must remain keyboard accessible in WebKit');
    }
    report.widths.push({width,home:home.heading,nav:checked,touch:home.navTargets,
     touchEmulated:touch,documentOverflow:false});
    if(width===390){
     // Real financial UI interactions: scope summaries, journal tabs, validation.
     // All operations stay in fictional preview; no save or external request.
     const mineBalance=await page.locator('#homeBalance').innerText();
     // Home account browsing uses direct touch choices, never a visible
     // dropdown and never a silent primary-account change.
     const accountPills=page.locator('#traceIntlHome [data-trace-view-account]');
     assert.ok(await accountPills.count()>=2,'Home needs direct account choices');
     for(const height of await accountPills.evaluateAll(nodes=>
      nodes.map(n=>n.getBoundingClientRect().height)))
      assert.ok(height>=44,'Home account buttons must be 44px tall');
     await activate(page.locator('#traceIntlHome [data-trace-view-account="demo-fr-current"]'));
     assert.match(await page.locator('#homeBalance').innerText(),/€|EUR/);
     assert.equal(await page.locator('#traceIntlPrimary').inputValue(),'demo-ca-current');
     await activate(page.locator('#traceIntlHome [data-trace-view-account="demo-ca-current"]'));
     assert.equal(await page.locator('#homeBalance').innerText(),mineBalance);
     await activate(page.locator('#traceIntlHome .trace-intl-primary-control>summary'));
     const primaryNative=await page.locator('#traceIntlPrimary').evaluate(el=>({
      hidden:el.getAttribute('aria-hidden'),clip:getComputedStyle(el).clipPath
     }));
     assert.equal(primaryNative.hidden,'true');
     assert.equal(primaryNative.clip,'inset(50%)','No visible account dropdown on Home');
     assert.ok(await page.locator('#traceIntlHome [data-trace-primary-account]').count()>=2);
     await activate(page.locator('[data-trace-primary-account="demo-fr-current"]'));
     assert.equal(await page.locator('#sheetTitle').innerText(),'Changer le compte principal');
     assert.equal(await page.locator('#homeBalance').innerText(),mineBalance);
     await activate(page.locator('#tracePrimaryCancel'));
     assert.equal(await page.locator('#homeBalance').innerText(),mineBalance);
     await activate(page.locator('#homeScope [data-scope="couple"]'));
     const coupleBalance=await page.locator('#homeBalance').innerText();
     assert.notEqual(coupleBalance,mineBalance,'Couple must update the visible total');
     await activate(page.locator('#homeScope [data-scope="mine"]'));
     assert.equal(await page.locator('#homeBalance').innerText(),mineBalance,
      'Returning to Moi must restore the original financial summary');
     await activate(page.locator('.navbtn[data-nav="budget"]'));
     const mineBudget=await page.locator('.budget-hero-card').innerText();
     await page.locator('#budgetScope [data-scope="couple"]').click();
     const coupleBudget=await page.locator('.budget-hero-card').innerText();
     assert.notEqual(coupleBudget,mineBudget,'Couple budget must reflect the shared view');
     await page.locator('#budgetScope [data-scope="mine"]').click();
     assert.equal(await page.locator('.budget-hero-card').innerText(),mineBudget);
     await activate(page.locator('.navbtn[data-nav="activity"]'));
     // Premium 5.37: the five history filters must present compact buttons
     // rather than visible native dropdowns, without changing filtering.
     for(const id of ['activityAccountFilter','activityCategoryFilter',
       'activityNatureFilter','activityCurrencyFilter','activityStatusFilter']){
      assert.equal(await page.locator('#'+id+'Chips button').count()>0,true,
       'Missing premium buttons for '+id);
      const nativeStyle=await page.locator('#'+id).evaluate(el=>({
       hidden:el.getAttribute('aria-hidden'),clip:getComputedStyle(el).clipPath,
       pointer:getComputedStyle(el).pointerEvents
      }));
      assert.equal(nativeStyle.hidden,'true','Legacy dropdown must not be announced');
      assert.equal(nativeStyle.clip,'inset(50%)','Legacy dropdown must be visually clipped');
      assert.equal(nativeStyle.pointer,'none','Legacy dropdown must not intercept touch');
      const targets=await page.locator('#'+id+'Chips button').evaluateAll(nodes=>
       nodes.map(el=>el.getBoundingClientRect().height));
      assert.ok(targets.every(h=>h>=44),'Filter buttons must be touch friendly: '+id);
     }
     await activate(page.locator('#activityStatusFilterChips [data-value="pending"]'));
     assert.equal(await page.locator('#activityStatusFilter').inputValue(),'pending');
     assert.equal(await page.locator('#activityStatusFilterChips [data-value="pending"]').getAttribute('aria-pressed'),'true');
     await activate(page.locator('#activityStatusFilterChips [data-value="confirmed"]'));
     assert.equal(await page.locator('#activityStatusFilter').inputValue(),'confirmed');
     await activate(page.locator('#activityCurrencyFilterChips [data-value="EUR"]'));
     assert.equal(await page.locator('#activityCurrencyFilter').inputValue(),'EUR');
     await activate(page.locator('#activityCurrencyFilterChips [data-value="all"]'));
     assert.equal(await page.locator('#activityCurrencyFilter').inputValue(),'all');
     const journal=[];
     for(const [tab,panel] of [['transactions','activityTransactions'],
       ['review','activityReview'],['sharing','activitySharing'],['import','activityImport']]){
      await page.locator('#activityTabs [data-tab="'+tab+'"]').click();
      const status=await page.evaluate(id=>{
       const el=document.getElementById(id);
       return{visible:!!el&&getComputedStyle(el).display!=='none',
        selected:document.querySelector('#activityTabs [aria-selected="true"]')?.dataset.tab||null,
        text:(el?.innerText||'').trim().slice(0,80)}
      },panel);
      assert.equal(status.selected,tab,'Wrong activity selected tab');
      assert.equal(status.visible,true,'Activity panel not visible: '+tab);
      assert.ok(status.text.length>8,'Empty activity panel: '+tab);
      journal.push(tab);
     }
     await activate(page.locator('#quickAdd'));
     assert.equal(await page.locator('#sheetBackdrop').evaluate(el=>el.classList.contains('open')),true);
     assert.equal(await page.locator('#manualTxAmount').evaluate(el=>getComputedStyle(el).fontSize),'16px',
      'iPhone inputs below 16px trigger Safari focus zoom');
     // Compact manual-operation choices: no native dropdown interaction and
     // no persistence until the real Save button is explicitly confirmed.
     for(const id of ['manualTxAccount','manualPurchaseCurrency','manualTxBeneficiary']){
      const style=await page.locator('#'+id).evaluate(el=>({
       hidden:el.getAttribute('aria-hidden'),tab:el.tabIndex,
       clip:getComputedStyle(el).clipPath,pointer:getComputedStyle(el).pointerEvents
      }));
      assert.equal(style.hidden,'true',id+' must not be read twice by VoiceOver');
      assert.equal(style.tab,-1,id+' native selector must not trap focus');
      assert.equal(style.clip,'inset(50%)',id+' native selector must be clipped');
      assert.equal(style.pointer,'none',id+' native selector must not intercept touch');
      const choices=page.locator('#'+id+'Chips [data-trace-choice]');
      assert.ok(await choices.count()>=(id==='manualTxAccount'?3:4),
       'Pill group missing: '+id);
      assert.ok((await choices.evaluateAll(buttons=>
       buttons.map(b=>b.getBoundingClientRect().height))).every(h=>h>=44),
       'At least 44px touch height required for '+id);
     }
     const initialBank=await page.locator('#manualTxAccount').inputValue();
     await activate(page.locator('#manualTxAccountChips [data-trace-choice="demo-fr-current"]'));
     assert.equal(await page.locator('#manualTxAccount').inputValue(),'demo-fr-current');
     assert.equal(await page.locator('#manualPurchaseCurrency').inputValue(),'EUR',
      'Selecting a French account must reset the purchase currency to EUR');
     assert.equal(await page.locator('#manualTxAccountChips [data-trace-choice="demo-fr-current"]').getAttribute('aria-pressed'),'true');
     await activate(page.locator('#manualTxAccountChips [data-trace-choice="'+initialBank+'"]'));
     assert.equal(await page.locator('#manualTxAccount').inputValue(),initialBank);
     assert.equal(await page.locator('#manualPurchaseCurrency').inputValue(),'CAD');
     assert.equal(await page.locator('#manualTxAccountSearch').count(),0,
      'Small account collections must not waste space on an unnecessary search');
     await activate(page.locator('#manualPurchaseCurrencyChips [data-trace-choice="USD"]'));
     assert.equal(await page.locator('#manualPurchaseCurrency').inputValue(),'USD');
     assert.equal(await page.locator('#manualPurchaseCurrencyChips [data-trace-choice="USD"]').getAttribute('aria-pressed'),'true');
     await activate(page.locator('#manualPurchaseCurrencyChips [data-trace-choice="CAD"]'));
     assert.equal(await page.locator('#manualPurchaseCurrency').inputValue(),'CAD');
     await activate(page.locator('#manualTxBeneficiaryChips [data-trace-choice="custom"]'));
     assert.equal(await page.locator('#manualTxBeneficiary').inputValue(),'custom');
     assert.equal(await page.locator('#manualFriendsGroup').evaluate(el=>el.classList.contains('hidden')),false);
     await activate(page.locator('#manualTxBeneficiaryChips button').first());
     assert.equal(await page.locator('#manualFriendsGroup').evaluate(el=>el.classList.contains('hidden')),true);
     // Only eligible, active expense categories. Selection is user-owned.
     const nativeCategory=await page.locator('#manualTxCategory').evaluate(el=>({
      hidden:el.getAttribute('aria-hidden'),tab:el.tabIndex,
      clip:getComputedStyle(el).clipPath,pointer:getComputedStyle(el).pointerEvents
     }));
     assert.equal(nativeCategory.hidden,'true');
     assert.equal(nativeCategory.tab,-1);
     assert.equal(nativeCategory.clip,'inset(50%)');
     assert.equal(nativeCategory.pointer,'none');
     assert.equal(await page.locator('#manualTxCategoryChips button').count(),3);
     assert.equal(await page.locator('#manualTxCategorySearch').isVisible(),false);
     assert.ok((await page.locator('#manualTxCategoryChips button').evaluateAll(nodes=>
      nodes.map(n=>n.getBoundingClientRect().height))).every(h=>h>=44));
     await activate(page.locator('#manualTxCategoryChips [data-trace-choice="groceries"]'));
     assert.equal(await page.locator('#manualTxCategory').inputValue(),'groceries');
     assert.equal(await page.locator('#manualTxCategoryChips [data-trace-choice="groceries"]').getAttribute('aria-pressed'),'true');
     await page.locator('#manualTxName').fill('Voyage à Paris');
     assert.equal(await page.locator('#manualTxCategory').inputValue(),'groceries',
      'Merchant/category suggestion must not replace an explicit category');
     await page.locator('#saveManualTx').click();
     assert.match(await page.locator('#manualMovementError').innerText(),/Vérifie le montant/);
     const options=await page.locator('#manualTxAccount option').evaluateAll(els=>els.map(el=>el.value));
     assert.ok(options.includes('demo-fr-deferred-card'),'French deferred card should be visible for read-only context');
     await page.locator('#manualTxAccount').selectOption('demo-fr-deferred-card');
     await page.locator('#manualTxAmount').fill('24.50');
     const category=page.locator('#manualTxCategory');
     if(await category.locator('option').count()>1)await category.selectOption({index:1});
     await page.locator('#saveManualTx').click();
     const deferredError=await page.locator('#manualMovementError').innerText();
     assert.match(deferredError,/débit différé|écritures non activées/i,
      'Deferred card writes must remain blocked before save');
     assert.equal(await page.locator('#homeBalance').innerText(),mineBalance,
      'Rejected writes must leave the financial summary unchanged');
     await page.locator('#cancelManualTx').click();
     assert.equal(await page.locator('#sheetBackdrop').evaluate(el=>el.classList.contains('open')),false);
     report.financialUi={mineBalance,coupleBalance,mineBudget:mineBudget.slice(0,100),
      coupleBudget:coupleBudget.slice(0,100),journal,emptyFormRejected:true,
      deferredWriteRejected:true,noServerWrites:true};
     await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:18000});
     const before=await metrics(page);
     assert.equal(before.offlineReady,true,'Offline shell not ready');
     assert.equal(before.offlineError,null);
     // Wait until worker activation and offline shell cache checks finish.
     // WebKit can stop a still-running worker during a sudden offline switch.
     await page.reload({waitUntil:'load',timeout:18000});
     await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true&&
      !!navigator.serviceWorker.controller,{timeout:18000});
     await context.setOffline(true);
     await page.reload({waitUntil:'load',timeout:15000});
     await page.waitForFunction(()=>window.TracePreviewPWA?.ready===true,{timeout:15000});
     const after=await metrics(page);
     assert.equal(after.active,'home');
     assert.equal(after.scrollWidth,390);
     await activate(page.locator('.navbtn[data-nav="activity"]'));
     const activity=await metrics(page);
     assert.equal(activity.active,'activity');
     report.offline={width:390,readyBefore:true,reloadedWithoutNetwork:true,
      cachedShellVerified:after.offlineReady,activityAvailable:activity.active==='activity'};
     await context.setOffline(false);
     if(engine==='chromium'){
      // Dedicated isolated fictitious fixture with 7 extra current accounts.
      // Never mutate app globals, user records or a connected database.
      const manyPage=await context.newPage();
      await manyPage.addInitScript(()=>{
       let fixture;
       Object.defineProperty(window,'TraceInternationalPreviewFixtures',{
        configurable:true,get:()=>fixture,set(source){
         fixture=Object.freeze({...source,create(){
          const data=source.create();
          const account=data.accounts.find(a=>a.owner==='la'&&a.type==='checking');
          for(let i=1;i<=7;i++)data.accounts.push({...account,
           id:'qa-bank-'+i,name:'Compte fictif '+i,currency:'CAD'});
          for(let i=1;i<=7;i++)data.categories.push({
           id:'qa-category-'+i,name:'Catégorie fictive '+i,type:'expense',
           budgetKind:'variable',icon:'•'});
          data.categories.push({id:'qa-archived',name:'Catégorie archivée',
           type:'expense',archived:true,icon:'•'});
          return data;
         }});
        }
       });
      });
      await manyPage.route('**/*',route=>{
       if(route.request().url().startsWith(origin))return route.continue();
       outside.push(route.request().url());return route.abort();
      });
      await manyPage.goto(entry,{waitUntil:'load',timeout:25000});
      await manyPage.locator('#quickAdd').click();
      const search=manyPage.locator('#manualTxAccountSearch');
      assert.equal(await search.count(),1,'Seven accounts must expose search');
      await search.fill('Compte fictif 5');
      assert.equal(await manyPage.locator('#manualTxAccountChips [data-trace-choice]:visible').count(),1);
      await manyPage.locator('#manualTxAccountChips [data-trace-choice="qa-bank-5"]').click();
      assert.equal(await manyPage.locator('#manualTxAccount').inputValue(),'qa-bank-5');
      await search.fill('aucun compte ne correspond');
      assert.equal(await manyPage.locator('#manualTxAccountChips [data-trace-choice]:visible').count(),0);
      assert.equal(await manyPage.locator('#manualTxAccountNoResults').isVisible(),true);
      const categorySearch=manyPage.locator('#manualTxCategorySearch');
      assert.equal(await categorySearch.isVisible(),true,'Long list requires category search');
      assert.equal(await manyPage.locator('#manualTxCategoryChips [data-trace-choice="qa-archived"]').count(),0,
       'Archived categories must not be offered');
      await categorySearch.fill('epicerie');
      assert.equal(await manyPage.locator('#manualTxCategoryChips [data-trace-choice]:visible').count(),1);
      await manyPage.locator('#manualTxCategoryChips [data-trace-choice="groceries"]').click();
      assert.equal(await manyPage.locator('#manualTxCategory').inputValue(),'groceries');
      await manyPage.locator('#manualTxName').fill('Voyages fictifs');
      assert.equal(await manyPage.locator('#manualTxCategory').inputValue(),'groceries');
      await categorySearch.fill('aucune catégorie');
      assert.equal(await manyPage.locator('#manualTxCategoryChips [data-trace-choice]:visible').count(),0);
      assert.equal(await manyPage.locator('#manualTxCategoryNoResults').isVisible(),true);
      await manyPage.locator('#cancelManualTx').click();
      await manyPage.close();
     }
    }
    if(engine==='webkit'&&width===390){
     // Responsive interruption lab: an iPhone-like touch viewport rotates
     // while a long, unsaved financial form is open. This does not emulate
     // the real iOS software keyboard, home-screen PWA or OS suspension.
     await activate(page.locator('.navbtn[data-nav="home"]'));
     await activate(page.locator('#quickAdd'));
     const name=page.locator('#manualTxName');
     await name.fill('Brouillon fictif non enregistré');
     const form=page.locator('.sheet-backdrop.open .sheet');
     await page.setViewportSize({width:844,height:390});
     await page.waitForFunction(()=>{
      const r=document.querySelector('.sheet-backdrop.open .sheet')?.getBoundingClientRect();
      return r&&r.height>0&&r.height<=390&&r.bottom<=390&&
       document.documentElement.scrollWidth<=innerWidth;
     },{timeout:8000});
     const landscape=await form.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return{height:Math.round(r.height),viewport:innerHeight,
       scrollable:el.scrollHeight>el.clientHeight};
     });
     assert.equal(landscape.scrollable,true,'Landscape finance form must scroll vertically');
     await page.locator('#cancelManualTx').scrollIntoViewIfNeeded();
     assert.equal(await name.inputValue(),'Brouillon fictif non enregistré',
      'Rotation must preserve unsaved form text');
     await page.setViewportSize({width:390,height:850});
     await page.waitForFunction(()=>{
      const r=document.querySelector('.sheet-backdrop.open .sheet')?.getBoundingClientRect();
      return r&&r.height>0&&r.height<=850&&r.bottom<=850&&
       document.documentElement.scrollWidth<=innerWidth;
     },{timeout:8000});
     await activate(page.locator('#cancelManualTx'));
     assert.equal(await page.locator('#sheetBackdrop').evaluate(el=>el.classList.contains('open')),false,
      'Cancel must close the form without saving');
     assert.equal((await metrics(page)).active,'home',
      'Rotation must not lose the current page');
     const otherPage=await context.newPage();
     await otherPage.route('**/*',route=>{
      if(route.request().url().startsWith(origin))return route.continue();
      outside.push(route.request().url());return route.abort();
     });
     await otherPage.goto(entry,{waitUntil:'load'});
     await otherPage.bringToFront();
     await page.bringToFront();
     assert.equal((await metrics(page)).active,'home',
      'Returning to the original tab must preserve navigation state');
     await otherPage.close();
     report.mobileInterruption={engine,portrait:390,landscape:844,
      formScrollable:true,unsavedTextPreserved:true,
      canceledWithoutSaving:true,tabResumePreserved:true};
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
  console.log(JSON.stringify({passed:report.passed,engine,financialUi:report.financialUi,
   screens:report.widths.map(v=>v.width),navigation:report.widths.reduce((n,v)=>n+v.nav.length,0),
   offline:report.offline,failures:report.failures}));
 }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;server.close()});

