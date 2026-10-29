'use strict';
// TRACE 5.37 UX design contract: deterministic DOM/content checks + rendered wealth.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const shell=get('trace-international-preview.html'),
 css=get('trace-international-1.0.0.css'),
 app=get('v5-app-5.37.0.js'),
 stable=get('index.html');
const home=shell.slice(shell.indexOf('<section class="page active" data-page="home">'),
 shell.indexOf('<section class="page" data-page="budget">'));
const wealth=shell.slice(shell.indexOf('<section class="page" data-page="wealth">'),
 shell.indexOf('</main>'));
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const ordered=(source,terms)=>{
 const indices=terms.map(term=>source.indexOf(term));
 assert.ok(indices.every((value,index)=>value>=0&&(index===0||value>indices[index-1])),
 'Expected visual source order: '+terms.join(' → '));
};
test('concise Home preserves core priority order without a duplicate category list',()=>ordered(home,[
 'id="homeBalance"','id="homeBudgetAvailable"','id="homeIncome"',
 'id="pendingCountBadge"','id="homeTrend"','id="shareCard"']));
test('Home lead card is estimated balance, not budget availability',()=>{
 assert.ok(home.indexOf('id="balanceCard"')<home.indexOf('id="homeBudgetAvailable"'));
 assert.match(home,/Disponible sur mon budget/);
 assert.match(home,/<h2>Ce mois-ci<\/h2>/);
});
test('Home existing live IDs survive and are unique',()=>{
 for(const id of ['homeBalance','homeBudgetAvailable','homeChecking','homeCard',
  'traceIntlHome','reconcileBadge','homeBudgetProgress',
  'homeReviewAccounts','homeTrendCard','shareCard'])
  assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
test('Savings then Investments then net patrimonio then liquidity appear in order',()=>ordered(wealth,[
 'id="wealthSavingsGrid"','id="wealthInvestmentsGrid"',
 'id="wealthTotal"','id="assetGrid"']));
test('Savings and investments have distinct card hosts, without lost actions',()=>{
 for(const id of ['wealthSavingsGrid','wealthInvestmentsGrid','assetGrid',
  'wealthTotal','wealthSub','wealthTrend','addAsset'])
  assert.equal((wealth.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(wealth,/<h2>Épargne<\/h2>/);assert.match(wealth,/<h2>Placements<\/h2>/);
 assert.match(wealth,/<h2>Patrimoine net accessible<\/h2>/);
});
test('heritage link remains visible and non-claims cash immediately accessible',()=>{
 assert.match(wealth,/n'est pas nécessairement disponible immédiatement/);
 assert.match(wealth,/taux manquant reste à vérifier/);
});
test('premium CSS uses layout, subtle elevation, focus and reduced motion',()=>{
 for(const v of ['.trace-home-priority','.trace-wealth-grid','.trace-wealth-net-card',
  ':focus-visible','prefers-reduced-motion'])assert.ok(css.includes(v),v);
});
test('premium layout remains readable at 320–360px without changing five main tabs',()=>{
 assert.match(css,/\.trace-activity-main-tabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.trace-home-balance-breakdown summary\{[^}]*min-height:44px/);
 assert.match(css,/\.trace-activity-filter-drawer>summary\{[^}]*min-height:48px/);
 assert.doesNotMatch(home,/id="homeBudgetCategories"|id="homeAccountsBtn"/);
});
test('six-month charts scroll inside their region on narrow phones, never widen the page',()=>{
 assert.match(css,/@media\(max-width:420px\)\{[\s\S]*?\.trace-trend-columns\{grid-template-columns:repeat\(6,minmax\(48px,1fr\)\)/);
 assert.match(css,/\.trace-trend-columns\{[^}]*overflow-x:auto/);
 assert.match(css,/\.trace-trend-col\{scroll-snap-align:start/);
 assert.match(css,/\.trace-intl-row b\{[^}]*overflow-wrap:anywhere/);
});
test('financial form controls avoid iOS zoom and preserve minimum touch targets',()=>{
 assert.match(css,/\.trace-intl-transaction :is\(input:not\(\[type="checkbox"\]\),select,textarea\)/);
 assert.match(css,/\.trace-intl-import :is\(input:not\(\[type="checkbox"\]\),select,textarea\)\{[^}]*font-size:16px;min-height:44px/);
 assert.match(css,/\.trace-intl-set-primary\{min-height:44px/);
 assert.match(css,/\.trace-intl-details>summary\{[^}]*min-height:44px/);
 assert.match(css,/:focus-visible/);
});
test('small text contrasts with light premium surfaces',()=>{
 const lightest='#ffffff',softest='#f5faf6';
 const luminance=color=>{
  const parts=color.slice(1).match(/../g).map(value=>parseInt(value,16)/255);
  const linear=parts.map(value=>value<=0.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
 };
 const contrast=(a,b)=>{const high=Math.max(luminance(a),luminance(b));
  const low=Math.min(luminance(a),luminance(b));return(high+.05)/(low+.05);};
 for(const ink of ['#486858','#4d695a']){
  assert.ok(contrast(ink,lightest)>=4.5,'Insufficient contrast on white: '+ink);
  assert.ok(contrast(ink,softest)>=4.5,'Insufficient contrast on soft card: '+ink);
 }
 assert.match(css,/\.trace-home-next-action small\{[^}]*color:#486858/);
 assert.match(css,/\.trace-intl-account-conversion\{color:#4d695a!important/);
});
test('premium secondary financial labels reach WCAG AA contrast on light surfaces',()=>{
 const luminance=color=>{
  const channels=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
  const linear=channels.map(x=>x<=0.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
 };
 const contrast=(fg,bg)=>{
  const hi=Math.max(luminance(fg),luminance(bg));
  const lo=Math.min(luminance(fg),luminance(bg));
  return(hi+.05)/(lo+.05);
 };
 for(const foreground of ['#475f54','#4d695a']){
  assert.ok(contrast(foreground,'#fffefa')>=4.5,'Ivory contrast: '+foreground);
  assert.ok(contrast(foreground,'#f5faf6')>=4.5,'Mint contrast: '+foreground);
 }
 assert.match(css,/\.navbtn:not\(\.active\)\{color:#475f54\}/);
 assert.match(css,/\.trace-share-history-row small,[\s\S]*?\.trace-trend-col>small\{color:#4d695a\}/);
});
test('compact navigation keeps a legible 10px minimum and four accessible destinations',()=>{
 assert.match(css,/\.navbtn>span:last-child\{font-size:clamp\(10px,2\.65vw,11px\);line-height:1\.3\}/);
 const nav=shell.slice(shell.indexOf('<nav class="nav"'),shell.indexOf('</nav>'));
 for(const key of ['home','budget','activity','wealth'])
  assert.match(nav,new RegExp('data-nav="'+key+'"'));
});
test('320px journal wraps dates without clipping and motion can be reduced',()=>{
 assert.match(css,/@media\(max-width:360px\)\{[\s\S]*?\.trace-activity-day-heading\{flex-wrap:wrap/);
 assert.match(css,/\.trace-activity-day-heading small\{white-space:normal;max-width:100%\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.trace-trend-columns\{scroll-behavior:auto;scroll-snap-type:none\}/);
});
test('tablet and desktop use balanced financial lead cards without touching stable assets',()=>{
 assert.match(css,/@media\(min-width:800px\)\{[\s\S]*?\.trace-home-priority\{grid-template-columns:minmax\(0,1\.25fr\) minmax\(0,\.9fr\)/);
 assert.match(css,/\.trace-trend-bars \.is-spent\{background:linear-gradient/);
 assert.doesNotMatch(stable,/trace-international-1\.0\.0\.css/);
});
test('Patrimoine bottom nav label stays whole on iPhone sized widths',()=>{
 assert.match(css,/\.navbtn>span:last-child\{[^}]*white-space:nowrap/);
 assert.match(shell,/data-nav="wealth" aria-label="Patrimoine"/);
});
test('original five-tab navigation and central add-operation action preserved',()=>{
 const nav=shell.slice(shell.indexOf('<nav class="nav"'),shell.indexOf('</nav>'));
 ordered(nav,['data-nav="home"','data-nav="budget"','id="quickAdd"',
  'data-nav="activity"','data-nav="wealth"']);
 assert.match(nav,/aria-label="Ajouter une opération"/);
});
test('only protected lab is changed: CSP and production shell preserved',()=>{
 assert.match(shell,/connect-src 'none'/);
 assert.match(shell,/trace-international-preview-fixtures-1\.0\.0\.js/);
 assert.match(stable,/<meta name="trace-build" content="5\.36\.5">/);
 assert.doesNotMatch(stable,/trace-international-preview-fixtures/);
});
function makeWealth({missingFx=false,noPortfolio=false}={}){
 const accounts=noPortfolio?[]:[{id:'celi',owner:'la',type:'CELI',
  savingsTracking:'linked',name:'CELI test',currency:'CAD'},
  {id:'pea',owner:'la',type:'PEA',name:'PEA test',currency:'EUR'}];
 const bank=[{id:'ca',type:'checking',owner:'la',currency:'CAD'},
  {id:'credit',type:'card',owner:'la',currency:'CAD'},
  ...(missingFx?[{id:'fr',type:'checking',owner:'la',currency:'EUR'}]:[])];
 const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',onclick:null});return nodes.get(id)};
 const state={investmentAccounts:accounts,accounts:bank},before=JSON.stringify(state);
 const i=app.indexOf('function renderWealth(){'),j=app.indexOf('\nfunction renderAll(){',i);
 assert.ok(i>=0&&j>i);
 const ctx={state,wealthScope:'mine',scope:()=> 'la',bank:()=>({needsCardReview:false}),
  portfolioLedger:acc=>({hasFx:acc.id!=='pea'||!missingFx,
   configured:true,cad:acc.id==='celi'?200:300,value:acc.id==='celi'?200:300}),
  accountEstimate:acc=>acc.id==='ca'?1000:acc.id==='credit'?-50:100,
  accountType:acc=>acc.type,internationalQuotes:{CAD:{}},
  window:{TraceInternational:{currency:acc=>acc.currency,
   fxValue:(n,c,rate)=>c==='CAD'?n:rate?n:null,
   money:(n,c)=>n+' '+c},TraceInsights:{renderWealth(){}}},
  money:n=>n+' CAD',nativeMoney:(n,c)=>n+' '+c,
  esc:x=>String(x),shortAccountLabel:acc=>acc.id,
  $:el,$$:()=>[],openInvestmentAccountAdd(){},openAccountSettings(){},
  openInvestmentAccount(){},insightWealthData:()=>[],updateSegments(){},requestInternationalRates(){}};
 const fn=new Function(...Object.keys(ctx),'return ('+app.slice(i,j)+');')(...Object.values(ctx));
 fn();assert.equal(JSON.stringify(state),before,'renderer mutated user data');
 return{el};
}
test('real renderer splits CELI into savings, PEA into investments',()=>{
 const {el}=makeWealth();
 assert.match(el('#wealthSavingsGrid').innerHTML,/CELI test/);
 assert.doesNotMatch(el('#wealthSavingsGrid').innerHTML,/PEA test/);
 assert.match(el('#wealthInvestmentsGrid').innerHTML,/PEA test/);
 assert.match(el('#wealthInvestmentsGrid').innerHTML,/id="wealthAddCard"/);
 assert.match(el('#assetGrid').innerHTML,/wealthLiquidityCard/);
 assert.doesNotMatch(el('#assetGrid').innerHTML,/PEA test/);
 assert.match(el('#wealthTotal').textContent,/1450/);
});
test('unknown foreign conversion keeps net visibly incomplete',()=>{
 const {el}=makeWealth({missingFx:true});
 assert.equal(el('#wealthTotal').textContent,'Total incomplet');
 assert.match(el('#assetGrid').innerHTML,/100 EUR/);
 assert.match(el('#assetGrid').innerHTML,/Conversion indisponible/);
});
test('empty saving/investment grids remain helpful and add action exists',()=>{
 const {el}=makeWealth({noPortfolio:true});
 assert.match(el('#wealthSavingsGrid').innerHTML,/Ajoute un livret/);
 assert.match(el('#wealthInvestmentsGrid').innerHTML,/wealthAddCard/);
 assert.match(el('#wealthTotal').textContent,/950/);
});
console.log(count+' approved premium home/wealth scenarios passed');

test('small iPhone finance trend shows legible month labels and wraps long values',()=>{
 assert.match(css,/@media\(max-width:420px\)\{[\s\S]*?\.trace-trend-col>small\{font-size:11px/);
 assert.match(css,/\.trace-trend-col>b\{font-size:11px;line-height:1\.35;font-weight:700;/);
 assert.match(css,/white-space:normal;overflow:visible;overflow-wrap:anywhere/);
 assert.match(css,/\.trace-trend-columns\{gap:10px;padding-bottom:12px/);
});

test('manual financial fields have explicit accessible label associations',()=>{
 const form=app.slice(app.indexOf("openSheet('Ajouter une opération',"),
  app.indexOf('window.TraceOperationUI.enhanceManual();'));
 for(const id of ['manualTxName','manualTxAmount','manualTxDate',
  'manualPurchaseCurrency','manualPurchaseAmount','manualFxRate',
  'manualDestAmount','manualTransferFee','manualTxCategory',
  'manualTxBeneficiary','manualFriendsAmount','manualPartnerAmount',
  'manualSavings','manualFriendName','manualRelatedExpense','manualRelatedAmount'])
  assert.match(form,new RegExp('for="'+id+'"'),id+' must have an explicit form label');
});
test('horizontal monthly trend can be focused and understood on the keyboard',()=>{
 const insights=get('trace-insights-5.37.0.js');
 assert.match(insights,/class="trace-trend-columns" tabindex="0" role="region" aria-label="Évolution des dépenses/);
 assert.match(css,/\.trace-trend-columns:focus-visible\{outline:3px solid #2d8062/);
});


test('bank balances and cutoff dates have unique visible label associations',()=>{
 const section=app.slice(app.indexOf('function openAccountSettings(){'),
  app.indexOf('function ',app.indexOf('function openAccountSettings(){')+12));
 for(const id of ['traceBankOpening_','traceBankDate_','traceBankMode_']){
  assert.ok(section.includes('for="'+id+"'+esc(a.id)+'"),id+' label');
  assert.ok(section.includes('id="'+id+"'+esc(a.id)+'"),id+' input');
 }
});

test('candidate-only subdued labels use higher-contrast premium greens',()=>{
 assert.match(css,/:root\{--muted:#52685e;--teal:#21695e;--green:#216b52\}/);
 assert.match(css,/\.seg:not\(\.active\)\{color:#50645a\}/);
 assert.match(css,/\.trace-home-review-info small\{color:#4d695a\}/);
});

test('foreign purchase fields keep readable premium contrast inside the sheet',()=>{
 assert.match(css,/#sheetBackdrop \.trace-edit-currency,/);
 assert.match(css,/#sheetBackdrop label\[for="manualPurchaseCurrency"\]/);
 assert.match(css,/#sheetBackdrop label\[for="manualPurchaseAmount"\]\{color:#365a49!important\}/);
});

test('compact Budget copy action keeps an accessible name when its text is hidden',()=>{
 assert.match(shell,/id="budgetCopyPrevious" type="button" aria-label="Recopier le budget du mois précédent"/);
});

test('browser QA supports isolated WebKit touch tests without replacing Safari sign-off',()=>{
 const runner=get('scripts/trace-browser-537-qa.cjs');
 assert.match(runner,/TRACE_BROWSER_ENGINE must be chromium or webkit/);
 assert.match(runner,/browser=await webkit\.launch\(\{headless:true\}\)/);
 assert.match(runner,/isMobile:touch,hasTouch:touch/);
 assert.match(runner,/touch\?locator\.tap\(options\):locator\.click\(options\)/);
 assert.match(runner,/__traceQaTouchStarts>=4/);
 assert.match(runner,/const executablePath=process\.env\.TRACE_CHROMIUM_EXECUTABLE/);
 assert.match(runner,/No external URLs permitted/);
 assert.match(runner,/outside\.push\(route\.request\(\)\.url\(\)\);return route\.abort\(\)/);
});

test('WebKit mobile qualification preserves an unsaved form across rotation',()=>{
 const runner=get('scripts/trace-browser-537-qa.cjs');
 assert.match(runner,/if\(engine==='webkit'&&width===390\)/);
 assert.match(runner,/setViewportSize\(\{width:844,height:390\}\)/);
 assert.match(runner,/el\.scrollHeight>el\.clientHeight/);
 assert.match(runner,/Rotation must preserve unsaved form text/);
 assert.match(runner,/tabResumePreserved:true/);
 assert.match(runner,/Canceled without saving|Cancel must close the form without saving/);
});
