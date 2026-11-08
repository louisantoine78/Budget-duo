'use strict';
// TRACE 2.0.2 / Patrimoine — WebKit-based iPhone viewport QA, localhost only.
// No production credential, Supabase, real portfolio, or network access.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {webkit}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const allow=new Map([
 ['/experiments/trace-201-analytics-demo.html','text/html; charset=utf-8'],
 ['/v5-5.31.17.css','text/css; charset=utf-8'],
 ['/trace-international-1.0.0.css','text/css; charset=utf-8'],
 ['/trace-premium-system-5.37.0.css','text/css; charset=utf-8'],
 ['/trace-wealth-201.css','text/css; charset=utf-8'],
 ['/trace-wealth-201.js','text/javascript; charset=utf-8'],
 ['/trace-wealth-201-engine.js','text/javascript; charset=utf-8']
]);
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/__trace203_wealth_layout.html'){
   const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
   const start=source.indexOf('    <section class="page" data-page="wealth">');
   const end=source.indexOf('  </main>',start);
   if(start<0||end<=start)throw Error('Real Patrimoine markup missing');
   const content=source.slice(start,end).replace('class="page" data-page="wealth"',
    'class="page active" data-page="wealth"');
   const html=`<!doctype html><html lang="fr"><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <link rel="stylesheet" href="/v5-5.31.17.css">
    <link rel="stylesheet" href="/trace-international-1.0.0.css">
    <link rel="stylesheet" href="/trace-premium-system-5.37.0.css">
    <link rel="stylesheet" href="/trace-wealth-201.css">
    <style>.page[data-page=wealth]{display:block!important}body{margin:0}
     .app{min-height:0} .topbar{display:none}</style></head>
    <body><main class="app">${content}</main>
    <script src="/__trace203_wealth_host.js"></script></body></html>`;
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);return;
  }
  if(url.pathname==='/__trace203_wealth_host.js'){
   const source=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
   const renderStart=source.indexOf('function renderWealth(){');
   const renderEnd=source.indexOf('// TRACE 2.0.1: scoped, additive bridge',renderStart);
   const routerStart=source.indexOf('function trace202OpenTracking(');
   const routerEnd=source.lastIndexOf('\n})();');
   if(renderStart<0||renderEnd<=renderStart||routerStart<0||routerEnd<=routerStart)
    throw Error('Real Patrimoine rendering or router missing');
   const render=source.slice(renderStart,renderEnd),router=source.slice(routerStart,routerEnd);
   const code=`'use strict';
    const me='la',wealthScope='mine';
    const state={investmentAccounts:[
     {id:'pea',owner:'la',type:'PEA',name:'PEA de démonstration',currency:'EUR'},
     {id:'celi1',owner:'la',type:'CELI',name:'CELI ET1',currency:'CAD',savingsTracking:'linked'},
     {id:'celi2',owner:'la',type:'CELI',name:'CELI ET2',currency:'CAD',savingsTracking:'linked'}
    ],investmentOperations:[],accounts:[{id:'bank',owner:'la',type:'checking',currency:'CAD'}]};
    const $=selector=>document.querySelector(selector);
    const scope=x=>x==='mine'?me:'couple';
    const bank=()=>({needsCardReview:false});
    const accountType=a=>a.type;
    const accountEstimate=a=>a.type==='checking'?1117:null;
    const internationalQuotes={};
    const money=x=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(x);
    const nativeMoney=(x,c)=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:c||'CAD'}).format(x);
    const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    const shortAccountLabel=a=>a.name;
    const requestInternationalRates=()=>{};
    const portfolioLedger=a=>a.id==='pea'?{value:0,cad:null,hasFx:false,configured:false,reviewRequired:false}:
     a.id==='celi2'?{value:0,cad:null,hasFx:false,configured:false,reviewRequired:true}:
      {value:5000,cad:5000,hasFx:true,configured:true,reviewRequired:false};
    const insightWealthData=()=>({});
    const updateSegments=()=>{};
    const windowOriginal=window;
    window.TraceInternational={currency:a=>a.currency,fxValue:(value)=>value,
      money:(value,currency)=>nativeMoney(value,currency)};
    window.TraceInsights={renderWealth:()=>{}};
    window.TraceWealth201={dashboardSummary:()=>({portfolios:1,positions:0,verified:0}),
      portfolioOverview:()=>({complete:false,totalCadCents:null}),
      open:id=>{document.body.dataset.opened=id||'home';}};
    function openSheet(title){document.body.dataset.opened=title;}
    function openInvestmentAccountAdd(){document.body.dataset.opened='add';}
    function openAccountSettings(){document.body.dataset.opened='cash';}
    function openInvestmentAccount(account){document.body.dataset.opened='legacy-'+account.id;}
    ${render}
    ${router}
    renderWealth();
    trace202BindWealthActions();
   `;
   res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}).end(code);return;
  }
  if(url.pathname==='/__trace202_csp_bridge.html'){
   const html=`<!doctype html><html lang="fr"><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'">
    <title>TRACE CSP investment bridge</title></head><body>
    <h1 id="fixtureTitle">Investissements CSP</h1><div id="fixtureBody"></div>
    <script src="/__trace202_csp_host.js"></script>
    <script src="/trace-wealth-201-engine.js"></script>
    <script src="/trace-wealth-201.js?v=2.0.2.1"></script>
    </body></html>`;
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);return;
  }
  if(url.pathname==='/__trace202_csp_host.js'){
   const js=[
    "window.__CSP_TEST_OPEN_COUNT__=0;",
    "window.Trace201Host={",
    " context(){return {active:true,viewer:'la',scope:'mine',accounts:[{id:'pea-fictif',owner:'la',name:'PEA de test',type:'PEA',currency:'EUR'}],operations:[]};},",
    " async save(){throw Error('Fixture locale : aucun enregistrement');},",
    " openSheet(title,html){window.__CSP_TEST_OPEN_COUNT__++;document.querySelector('#fixtureTitle').textContent=title;document.querySelector('#fixtureBody').innerHTML=html;}",
    "};"
   ].join('\n');
   res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}).end(js);return;
  }
  if(url.pathname==='/__trace202_patrimoine_taps.html'){
   const source=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
   const from=source.indexOf('function trace202OpenTracking('),to=source.lastIndexOf('\n})();');
   if(from<0||to<from)throw Error('Patrimoine delegated router absent');
   const methods=source.slice(from,to);
   const page=`<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font:16px system-ui;padding:20px;background:#f6f5ef}
    button{display:block;min-height:48px;margin:10px 0;padding:12px;border-radius:12px;border:1px solid #c6daca;background:#fff;color:#12402f}
    #result{padding:15px;min-height:28px;background:#eaf5ec}</style>
    <body><div class="page" data-page="wealth">
    <button type="button" id="trace201Entry">Suivi des titres</button>
    <button type="button" id="trace202Explore">Voir mes positions et analyses</button>
    <div id="wealthInvestmentsGrid">
      <button type="button" data-inv-account="pea">PEA courtier de test</button>
      <button type="button" id="wealthAddCard">Ajouter un placement</button>
    </div>
    <button type="button" id="wealthLiquidityCard">Comptes bancaires</button>
    <div id="result" role="status"></div></div>
    <script>
      const state={investmentAccounts:[{id:'pea',name:'PEA de test',type:'PEA',owner:'la'}],investmentOperations:[]};
      function report(kind,id=''){document.querySelector('#result').textContent=kind+':'+id;}
      window.TraceWealth201={open:id=>report('tracking',id)};
      function openSheet(title){report('sheet',title);}
      function openInvestmentAccountAdd(){report('add');}
      function openAccountSettings(){report('settings');}
      function openInvestmentAccount(a){report('legacy',a.id);}
      ${methods}
      trace202BindWealthActions();
    </script></body></html>`;
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(page);return;
  }
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
    assert.ok(gainRect&&gainParentRect&&gainRect.x+gainRect.width<=gainParentRect.x+gainParentRect.width+1,
     label+' position return must fit its financial card');
    assert.ok(gainRect.height<=22,label+' percent return must stay on a single line');
    await assertLayout(page,label,'position-detail');
    await saveImage(page,label,'position-detail');
    await page.locator('[data-w201="new-buy"]').click();
    await page.locator('#w201-form').waitFor();
    await assertLayout(page,label,'buy-form');
    await saveImage(page,label,'buy-form');
    // Submit valid fictional data: the preview must reject every save, without
    // freezing the action button or losing the form, on each iPhone viewport.
    await page.locator('#w201-form input[name="date"]').fill('2026-11-05');
    await page.locator('#w201-form input[name="quantity"]').fill('1');
    await page.locator('#w201-form input[name="unitPrice"]').fill('10');
    await page.locator('#w201-save').click();
    await page.waitForFunction(()=>document.querySelector('#w201-error')?.textContent.includes('Mode démonstration'));
    assert.match(await page.locator('#w201-error').innerText(),/aucune écriture ou sauvegarde/);
    assert.equal(await page.locator('#w201-save').isEnabled(),true,label+' save must be retryable after rejection');
    assert.equal(await page.locator('#w201-form input[name="quantity"]').inputValue(),'1');
    await assertLayout(page,label,'buy-rejected');
    // A second attempt must also fail safely, without any external traffic.
    await page.locator('#w201-save').click();
    assert.equal(await page.locator('#w201-save').isEnabled(),true,label+' retry must remain enabled');
    assert.ok(await page.locator('#w201-form').count()===1);
    // Real WebKit touch events on replaceable Patrimoine buttons.
    // Uses the exact delegated handler extracted from the live application,
    // a completely local fixture and no finance database or network requests.
    await page.goto(origin+'/__trace202_patrimoine_taps.html',{waitUntil:'load'});
    await page.locator('#trace202Explore').tap();
    assert.equal(await page.locator('#result').innerText(),'tracking:');
    await page.locator('[data-inv-account="pea"]').tap();
    assert.equal(await page.locator('#result').innerText(),'tracking:pea');
    await page.evaluate(()=>{
     document.querySelector('#wealthInvestmentsGrid').innerHTML=
      '<button type="button" data-inv-account="pea">PEA remplacé après recalcul FX</button>'+
      '<button type="button" id="wealthAddCard">Ajouter un placement</button>';
    });
    await page.locator('[data-inv-account="pea"]').tap();
    assert.equal(await page.locator('#result').innerText(),'tracking:pea');
    await page.locator('#wealthAddCard').tap();
    assert.equal(await page.locator('#result').innerText(),'add:');
    await page.locator('#wealthLiquidityCard').tap();
    assert.equal(await page.locator('#result').innerText(),'settings:');
    await page.evaluate(()=>{window.TraceWealth201.open=()=>{throw Error('Simulated follow-up failure');};});
    await page.locator('#trace201Entry').tap();
    assert.match(await page.locator('#result').innerText(),/sheet:Investissements indisponibles/);
    // Live CSP blocks the former inline connect() call. Check the actual
    // external module connects to an authenticated fixture under strict CSP.
    await page.goto(origin+'/__trace202_csp_bridge.html',{waitUntil:'load'});
    assert.equal(await page.evaluate(()=>typeof window.TraceWealth201?.open),'function');
    assert.equal(await page.evaluate(()=>window.TraceWealth201.dashboardSummary().portfolios),1);
    await page.evaluate(()=>window.TraceWealth201.open());
    await page.locator('#fixtureBody .w201-account').waitFor();
    assert.match(await page.locator('#fixtureTitle').innerText(),/Investissements/);
    await page.locator('#fixtureBody .w201-account').tap();
    assert.match(await page.locator('#fixtureTitle').innerText(),/TRACE 2.0.2/);
    assert.match(await page.locator('#fixtureBody').innerText(),/PEA de test/);
    assert.ok(await page.evaluate(()=>window.__CSP_TEST_OPEN_COUNT__>=2));
    // Real Patrimoine HTML, stylesheet and renderWealth(), with fictional
    // accounts and real delegated touch routing — no Supabase or bank access.
    await page.goto(origin+'/__trace203_wealth_layout.html',{waitUntil:'load'});
    assert.equal(await page.locator('#wealthQuickInvestments').innerText(),'1 compte');
    assert.equal(await page.locator('#wealthQuickSavings').innerText(),'2 comptes');
    assert.equal(await page.locator('#wealthQuickCash').innerText(),'1 compte');
    assert.equal(await page.locator('#wealthTotal').innerText(),'Total incomplet');
    assert.equal(await page.locator('#trace202Explore').count(),0);
    assert.match(await page.locator('[data-inv-account="pea"]').innerText(),/À initialiser/);
    const beforeLayout=await page.evaluate(()=>({
     viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
     navWidth:document.querySelector('.trace203-wealth-nav').getBoundingClientRect().width,
     order:[...document.querySelectorAll('#traceWealthInvestments,#traceWealthSavings,#traceWealthCash')]
      .map(node=>node.id)
    }));
    assert.ok(beforeLayout.documentWidth<=beforeLayout.viewport+2,label+' redesigned Patrimoine overflow');
    assert.deepEqual(beforeLayout.order,['traceWealthInvestments','traceWealthSavings','traceWealthCash']);
    await page.locator('[data-wealth-jump="traceWealthSavings"]').tap();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'traceWealthSavings');
    await page.locator('[data-wealth-jump="traceWealthCash"]').tap();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'traceWealthCash');
    await page.locator('#trace201Entry').tap();
    assert.equal(await page.evaluate(()=>document.body.dataset.opened),'home');
    await page.locator('[data-inv-account="pea"]').tap();
    assert.equal(await page.evaluate(()=>document.body.dataset.opened),'pea');
    await page.locator('#wealthAddCard').tap();
    assert.equal(await page.evaluate(()=>document.body.dataset.opened),'add');
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
