'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('trace-premium-system-5.37.0.css');
const html=read('trace-international-preview.html');
const sw=read('trace-international-preview-sw.js');
const app=read('v5-app-5.37.0.js');
const stable=read('index.html');
test('shared premium system loads only in fictional 5.37 and offline allowlist',()=>{
 assert.match(html,/href="trace-premium-system-5\.37\.0\.css"/);
 assert.match(sw,/"trace-premium-system-5\.37\.0\.css"/);
 assert.doesNotMatch(stable,/trace-premium-system-5\.37\.0/);
 assert.ok(html.indexOf('href="trace-premium-system-5.37.0.css"')>
  html.indexOf('href="trace-premium-panels-5.37.0.css"'));
});
test('consistent TRACE tokens govern home budget activity wealth and bank-account sheets',()=>{
 for(const variable of ['--trace37-paper','--trace37-tint','--trace37-border',
  '--trace37-ink','--trace37-accent','--trace37-muted','--trace37-radius'])
  assert.ok(css.includes(variable+':'),variable);
 for(const selector of ['.page[data-page="home"]','.page[data-page="budget"]',
  '.page[data-page="activity"]','.page[data-page="wealth"]',
  '#sheetBackdrop .trace-account-overview-row'])
  assert.ok(css.includes(selector),selector);
});
test('Activity native filters retain 16px iPhone-safe size, focus and all original choices',()=>{
 for(const id of ['activityAdvancedFilters','activityAccountFilter','activityCategoryFilter',
  'activityNatureFilter','activityCurrencyFilter','activityStatusFilter','activityResetFilters'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/\.trace-activity-native-select\{[\s\S]*?min-height:44px!important;font-size:16px!important/);
 assert.match(css,/\.trace-activity-native-select:focus-visible/);
 assert.doesNotMatch(css,/(?:display:\s*none|visibility:\s*hidden)\s*!important\s*;/);
});
test('À valider preserves every pending-item mount and uses no fake financial amount',()=>{
 for(const id of ['activityReview','activityReviewAccountFilter','importPendingTransactions'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/#importPendingTransactions \.trace-unconfirmed-rows/);
 assert.match(css,/#importPendingTransactions \.trace-unconfirmed-row/);
 assert.match(app,/Montant bancaire à vérifier/);
 assert.match(app,/CAD à valider/);
 assert.doesNotMatch(css,/content:\s*['"](?:0|\$|€)/);
});
test('wealth preserves three distinct grids with truthful native-currency values',()=>{
 for(const id of ['wealthTotal','wealthSavingsGrid','wealthInvestmentsGrid','assetGrid']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(css,/#assetGrid \.asset-card:first-child/);
 assert.match(css,/\.trace-wealth-grid \.asset-card>b/);
 assert.match(app,/window\.TraceInternational\.money\(native,currency\)/);
});
test('shared palette keeps body labels legible against white and mint',()=>{
 function L(hex){let channels=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255);
 channels=channels.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
 const contrast=(a,b)=>{let x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 for(const ink of ['#1b4030','#246b50','#4d6857']){
  for(const bg of ['#fffdfa','#f5f9f4'])assert.ok(contrast(ink,bg)>=4.5,ink+' on '+bg);
 }
});
test('presentation cannot alter posting, financial calculations or application navigation',()=>{
 for(const forbidden of [/saveDocument\(/,/state\.transactions/,/window\.TraceBankBridge/,
  /innerHTML\s*=/,/\.hidden\s*\{/])
  assert.doesNotMatch(css,forbidden);
 // Only visually redundant manual chips, search, and empty estimate can hide.
 // All four real native financial selects must remain visible and usable.
 const hideRules=[...css.matchAll(/([^{}]+)\{[^{}]*display:\s*none[^}]*\}/g)];
 assert.ok(hideRules.length>0);
 assert.ok(hideRules.every(match=>match[1].includes('#sheetBackdrop[data-trace-panel="manual"]')),
  'Only the isolated manual selector mirrors may be hidden');
 assert.match(css,/select\.trace-manual-choice-native\{[\s\S]*?pointer-events:auto!important/);
 assert.equal((html.match(/data-tab="transactions"/g)||[]).length,1);
 assert.equal((html.match(/data-tab="review"/g)||[]).length,1);
 assert.equal((html.match(/data-tab="sharing"/g)||[]).length,1);
 assert.equal((html.match(/data-nav="/g)||[]).length,4);
});

test('premium filter surface preserves the custom native-select chevron',()=>{
 const rule=css.match(/\.page\[data-page="activity"\] #activityAdvancedFilters \.trace-activity-filters \.trace-activity-native-select\{([^}]*)\}/);
 assert.ok(rule,'the narrowed filter rule must exist');
 assert.match(rule[1],/background-color:var\(--trace37-tint\)!important/);
 assert.doesNotMatch(rule[1],/(?:^|;)\s*background\s*:/,
  'background shorthand would erase the accessible selector arrow');
 const base=read('trace-international-1.0.0.css');
 assert.match(base,/\.trace-activity-native-select/);
 assert.match(base,/background-image:url\(/);
});
