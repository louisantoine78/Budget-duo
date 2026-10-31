'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'trace-premium-panels-5.37.0.js'),'utf8'),
 css=fs.readFileSync(path.join(root,'trace-premium-panels-5.37.0.css'),'utf8'),
 html=fs.readFileSync(path.join(root,'trace-international-preview.html'),'utf8'),
 app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8'),
 sw=fs.readFileSync(path.join(root,'trace-international-preview-sw.js'),'utf8');
test('only isolated candidate preview loads the premium design and PWA caches both modules',()=>{
 assert.match(html,/href="trace-premium-panels-5\.37\.0\.css"/);
 assert.match(html,/src="trace-premium-panels-5\.37\.0\.js"/);
 assert.match(sw,/"trace-premium-panels-5\.37\.0\.css"/);
 assert.match(sw,/"trace-premium-panels-5\.37\.0\.js"/);
 const stable=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.doesNotMatch(stable,/trace-premium-panels-5\.37\.0/);
 assert.match(app,/window\.TraceSheetPremium\?\.decorate\?\.\(\$\('#sheetBackdrop'\),t,h\)/);
});
test('premium panel covers manual entries, budget, bank and wealth with standard fallback',()=>{
 const window={};vm.runInNewContext(js,{window});
 const types=window.TraceSheetPremium.types;
 assert.equal(new Set(types.map(t=>t.key)).size,types.length);
 for(const key of ['quick-add','manual','transaction','budget-add','budget-edit',
  'budget-copy','account','investment','reconciliation']){
  assert.ok(types.some(t=>t.key===key),key);
 }
 assert.match(js,/key:'standard',eyebrow:'TRACE · ESPACE DE GESTION'/);
 assert.match(js,/head\.querySelectorAll\('\.trace-panel-eyebrow,\.trace-panel-caption'\)/);
 assert.match(js,/head\.insertBefore\(eyebrow,heading\)/);
 assert.match(js,/setAttribute\('aria-labelledby','sheetTitle'\)/);
});
test('premium presentation is scoped to sheets, accessible and mobile friendly',()=>{
 assert.match(css,/#sheetBackdrop\.trace-intl-premium-dialog/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/trace-budget-share-error/);
 assert.doesNotMatch(js,/saveDocument\(|state\.transactions|state\.budgets|client\.rpc\(/);
});

