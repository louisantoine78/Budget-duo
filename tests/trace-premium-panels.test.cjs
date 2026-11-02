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
  'account-detail','budget-category-detail',
  'bank-movement','international-transfer','foreign-expense','settlement',
  'budget-copy','account','investment','reconciliation']){
  assert.ok(types.some(t=>t.key===key),key);
 }
 assert.match(js,/key:'standard',eyebrow:'INFORMATIONS'/);
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


test('editorial financial sheets remove decorative nesting but retain all controls',()=>{
 for(const id of ['manual','transaction','transaction-validate','budget-add','budget-edit']){
  assert.match(css,new RegExp('data-trace-panel="'+id+'"'));
 }
 assert.match(css,/\.trace-edit-card-index,/);
 assert.match(css,/\.trace-manual-symbol,/);
 assert.match(css,/\.trace-budget-share-error/);
 assert.match(css,/min-height:52px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/Saisie manuelle\./);
 assert.match(js,/Poste du budget mensuel\./);
 assert.match(js,/Contrôle avant validation\./);
});

test('one Budget spending analysis, with unified international and movement dialogs',()=>{
 assert.doesNotMatch(html,/<h2>Mes dépenses réelles<\/h2>/);
 assert.match(html,/<article class="card" id="budgetCategoryImpact" aria-label="Où va mon argent \?"><\/article>/);
 for(const selector of ['#smartMovementSave','#fxSave','#traceForeignMetaSave','#saveSettlement']){
  assert.ok(js.includes("selector:'"+selector+"'"),selector);
 }
 for(const name of ['bank-movement','international-transfer','foreign-expense','settlement']){
  assert.ok(css.includes('data-trace-panel="'+name+'"'),name);
 }
 assert.match(css,/\.trace-edit-card-index/);
});

test('technical banking facts are progressively disclosed without hiding editable amounts',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(app,/trace-edit-record-meta/);
 assert.match(app,/trace-edit-explanation/);
 assert.match(app,/Informations protégées/);
 assert.match(app,/Montant et taux historique conservés/);
 assert.match(app,/Vérifie les montants et frais sur tes relevés/);
 for(const selector of ['#fxSent','#fxReceived','#fxFee','#fxRate','#traceForeignMetaName','#traceForeignMetaCategory']){
  assert.ok(app.includes(selector.slice(1)),selector);
 }
 assert.match(css,/trace-edit-record-meta/);
 assert.match(css,/trace-edit-explanation summary:focus-visible/);
 assert.match(js,/key:'foreign-expense'/);
});

test('account and budget-category read-only details share the premium style without hiding evidence',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(js,/key:'account-detail',selector:'#traceAccountAllTx'/);
 assert.match(js,/key:'budget-category-detail',selector:'#traceBudgetToActivity'/);
 assert.match(css,/data-trace-panel="account-detail"/);
 assert.match(css,/data-trace-panel="budget-category-detail"/);
 assert.match(app,/trace-account-detail-section-title/);
 assert.match(app,/trace-account-detail-actions/);
 assert.match(app,/trace-insight-sheet-kicker/);
 assert.match(app,/traceDeferredAccountReview\(a\)/);
 assert.match(app,/traceAccountBankProofNotice\(a,reconcile\?\.date\|\|null\)/);
 assert.match(app,/id="traceBudgetToActivity"/);
});

test('the Add and Import menus keep one consistent accessible visual hierarchy',()=>{
 for(const key of ['quick-add','import-choices'])assert.ok(js.includes("key:'"+key+"'"));
 assert.match(app,/id="traceAddManual"/);
 assert.match(app,/id="traceAddImport"/);
 assert.match(app,/id="traceAddDaily"/);
 assert.match(app,/id="traceAddMonthly"/);
 assert.match(app,/trace-add-choice-symbol/);
 assert.match(app,/trace-add-choice-chevron/);
 assert.match(css,/data-trace-panel="quick-add"/);
 assert.match(css,/data-trace-panel="import-choices"/);
 assert.match(css,/\.trace-add-choice:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(app,/CSV ou PDF · validation manuelle/);
});

test('5.37 forms retain native editors with quiet, accessible validation feedback',()=>{
 for(const key of ['manual','transaction','transaction-validate','budget-add',
  'budget-edit','bank-movement','international-transfer','foreign-expense','settlement']){
  assert.ok(js.includes("'"+key+"'"),key);
 }
 assert.match(js,/function refineFormFeedback\(body,key\)/);
 assert.match(js,/message\.setAttribute\('aria-live','polite'\)/);
 assert.match(js,/message\.setAttribute\('aria-atomic','true'\)/);
 assert.match(js,/backdrop\.classList\.remove\('trace-premium-form-pass'\)/);
 assert.match(css,/\.trace-manual-choice-chip:is\(\[aria-pressed="true"\],\.is-active\)/);
 assert.match(css,/\[aria-invalid="true"\]/);
 assert.match(css,/#manualFriendsGroup/);
 assert.match(css,/#manualDestAmount/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/saveDocument\(|client\.rpc\(|state\.transactions/);
});

test('manual selectors navigate with arrows and reuse the original click handler',()=>{
 const window={};vm.runInNewContext(js,{window});
 const makeButton=(value,hidden=false)=>{
  const b={dataset:{traceChoice:value},hidden,disabled:false,
   clickCount:0,focusCount:0,click(){this.clickCount++},
   focus(){this.focusCount++},getAttribute(){return null},
   closest(){return this}};
  return b;
 };
 const a=makeButton('one'),b=makeButton('two'),hidden=makeButton('hidden',true);
 const c=makeButton('three'),buttons=[a,b,hidden,c];
 const group={dataset:{},addEventListener(type,handler){this.handler=handler},
  querySelectorAll(){return buttons},contains(button){return buttons.includes(button)}};
 const root={querySelector(id){return id==='#manualTxCategoryChips'?group:null}};
 window.TraceSheetPremium.enhanceChoices(root);
 window.TraceSheetPremium.enhanceChoices(root);
 assert.equal(group.dataset.traceKeyboard,'yes');
 let prevented=0;
 const emit=(key,target)=>{
  group.handler({key,target,preventDefault(){prevented++}});
 };
 emit('ArrowRight',b);
 assert.equal(c.clickCount,1);
 assert.equal(c.focusCount,1);
 emit('ArrowRight',c);
 assert.equal(a.clickCount,1,'wrap to the first visible option');
 emit('Home',c);
 assert.equal(a.clickCount,2);
 emit('End',a);
 assert.equal(c.clickCount,2);
 emit('ArrowLeft',a);
 assert.equal(c.clickCount,3);
 emit('Enter',c);
 assert.equal(prevented,5,'native Enter stays untouched');
 assert.equal(hidden.clickCount,0,'hidden categories cannot be selected');
});
