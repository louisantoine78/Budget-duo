'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8'),
 ui=fs.readFileSync(path.join(root,'trace-premium-panels-5.37.0.js'),'utf8'),
 css=fs.readFileSync(path.join(root,'trace-premium-system-5.37.0.css'),'utf8'),
 browser=fs.readFileSync(path.join(root,'scripts/trace-browser-537-qa.cjs'),'utf8');
test('unreleased deferred card rejects before a missing estimated debit masks the real reason',()=>{
 const save=app.slice(app.indexOf(" $m('saveManualTx').onclick=async()=>{"));
 const reject=save.indexOf("traceRefuseUnqualifiedDeferredWrite('transactions',"),
  required=save.indexOf("if(!(amount>0)||!Number.isFinite(amount)");
 assert.ok(reject>=0&&required>reject,'deferred guard must precede amount validation');
 assert.ok(save.includes("Carte à débit différé : écritures non activées."));
});
test('native iPhone selector is accessible while its old chips are hidden',()=>{
 assert.ok(ui.includes("control.removeAttribute('aria-hidden')"));
 assert.ok(ui.includes("control.removeAttribute('tabindex')"));
 assert.ok(ui.includes("body.dataset.traceManualSelectors='native'"));
 assert.ok(css.includes('data-trace-manual-selectors="native"'));
 assert.ok(browser.includes("style.hidden,null,id+' native select must be VoiceOver accessible'"));
 assert.ok(browser.includes("id+' duplicate chips must remain hidden"));
});
test('Chromium smoke uses the actual purchase input and not hidden account estimate',()=>{
 assert.ok(browser.includes("page.locator('#manualPurchaseAmount').fill('24.50')"));
 assert.ok(!browser.includes("page.locator('#manualTxAmount').fill('24.50')"));
});
