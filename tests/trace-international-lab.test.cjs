'use strict';
/* TRACE International lab — static integrity and read-only boot preflight.
   These tests use real project files but do not claim a Safari/browser run. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const get=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=get('trace-international-preview.html');
const stable=get('index.html');
const app=get('v5-app-5.37.0.js');
const fixture=get('trace-international-preview-fixtures-1.0.0.js');
const engine=get('trace-international-1.0.0.js');
const ui=get('trace-international-ui-1.0.0.js');
let checked=0;function test(name,fn){fn();checked++;console.log('PASS '+name);}
test('production HTML remains TRACE 5.36.5 and does not contain lab fixtures',()=>{
 assert.match(stable,/<meta name="trace-build" content="5\.36\.5"/);
 assert.doesNotMatch(stable,/trace-international-preview-fixtures/);
 assert.doesNotMatch(stable,/traceIntlHome/);
});
test('lab loads the actual versioned application and international modules in order',()=>{
 const names=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 for(const file of ['trace-international-preview-fixtures-1.0.0.js','trace-international-1.0.0.js',
  'trace-international-ui-1.0.0.js','v5-app-5.37.0.js','trace-smart-inbox-3.5.0.js']){
  assert.equal(names.filter(x=>x===file).length,1,'Missing or duplicate '+file);
  assert.ok(!file.endsWith('.js')||get(file).length>100,'Empty '+file);
 }
 assert.ok(names.indexOf('trace-international-1.0.0.js')<names.indexOf('v5-app-5.37.0.js'));
 assert.ok(names.indexOf('trace-international-ui-1.0.0.js')<names.indexOf('v5-app-5.37.0.js'));
 assert.ok(names.indexOf('trace-international-preview-fixtures-1.0.0.js')<names.indexOf('v5-app-5.37.0.js'));
});
test('lab imports neither credentials, real Supabase SDK nor the production service worker',()=>{
 assert.doesNotMatch(html,/<script[^>]+src="(?:https?:\/\/|config\.js)/i);
 assert.doesNotMatch(html,/navigator\.serviceWorker\.register/);
 assert.doesNotMatch(html,/supabase\.min\.js/);
 assert.doesNotMatch(html,/trace-launch-v2\.html/);
 assert.match(html,/href="trace-international-preview\.webmanifest"/);
 assert.match(html,/src="trace-preview-pwa-1\.0\.0\.js"/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/worker-src 'self';/);
 assert.match(html,/<script type="module" src="trace-pdfjs-local-loader-1\.0\.0\.mjs"/);
 assert.doesNotMatch(html,/worker-src[^;]*(?:blob:|data:|https?:|\*)/);
 assert.match(html,/form-action 'none'/);
});
test('lab contains the actual international balance mount and all essential page nodes',()=>{
 for(const id of ['app','cloudGate','sheetBackdrop','tracePreviewStatus','traceIntlHome',
  'homeBalance','homeChecking','homeCard','homeCardWarning','homeBudgetCategories',
  'homeTrend','transactionList','activityTabs','homeScope','wealthTotal','syncLabel','brandSubtitle']){
  assert.match(html,new RegExp('id="'+id+'"'),'Missing HTML id '+id);
 }
 assert.equal((html.match(/id="traceIntlHome"/g)||[]).length,1);
 assert.match(html,/trace-international-1\.0\.0\.css/);
});
test('lab boot returns before real authentication and before version redirects',()=>{
 const boot=app.slice(app.indexOf('function bootTrace('),app.indexOf('\ndocument.addEventListener',app.indexOf('function bootTrace(')));
 assert.ok(boot.indexOf('if(internationalPreviewMode())')>0);
 assert.ok(boot.indexOf('if(internationalPreviewMode())')<boot.lastIndexOf('init();'));
 assert.match(boot,/id:'trace-laboratory-fixture'/);
 assert.match(boot,/me='la';partner='partner';client=null/);
 assert.match(boot,/window\.__TRACE_PREVIEW_STATUS__/);
 assert.match(app,/if\(internationalPreviewMode\(\)\|\|versionCheckBusy\)return/);
 assert.match(app,/if\(internationalPreviewMode\(\)\)return;.*The laboratory never requests/);
});
test('lab data can never be stored by ordinary Supabase helpers',()=>{
 assert.match(app,/async function saveDocument\(collection,item\)\{\s*sync\('saving'\);\s*if\(internationalPreviewMode\(\)\)\{/);
 assert.match(app,/async function saveHouseholdSettings\(\)\{\s*sync\('saving'\);[\s\S]{0,180}if\(internationalPreviewMode\(\)\)\{/);
 assert.match(app,/async function removeDocument\(collection,id\)\{if\(internationalPreviewMode\(\)\)return;/);
});
test('fictional fixtures have two countries, one card and a two-person household',()=>{
 const root={location:{pathname:'/trace-international-preview.html'}};
 vm.runInNewContext(fixture,{window:root});
 const data=root.TraceInternationalPreviewFixtures.create(),rate=root.TraceInternationalPreviewFixtures.quote();
 assert.equal(data.accounts.length,4);assert.ok(data.accounts.some(a=>a.currency==='EUR'&&a.country==='FR'));
 assert.ok(data.accounts.some(a=>a.currency==='CAD'&&a.type==='card'));
 assert.ok(data.transactions.some(t=>t.currency==='USD'&&t.bankCurrency==='EUR'));
 assert.ok(data.transactions.some(t=>t.type==='transfer'&&t.toBankAmount===95));
 assert.equal(rate.source.includes('FICTIF'),true);
 assert.deepEqual(Array.from(data.household.workspaceMembers),['la','partner']);
});
test('all module source files parse in isolation',()=>{
 for(const code of [fixture,engine,ui,app,get('trace-smart-inbox-3.5.0.js')])
  new Function(code);
});
console.log(checked+' TRACE International laboratory wiring checks passed');
