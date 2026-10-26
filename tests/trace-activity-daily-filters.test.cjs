'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),get=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=get('v5-app-5.37.0.js'),html=get('trace-international-preview.html');
const i=app.indexOf('/* TRACE 5.37 — filter and journal display'),j=app.indexOf('\nfunction renderActivity(){',i);
assert.ok(i>=0&&j>i);
const state={accounts:[{id:'ca',owner:'la',type:'checking',currency:'CAD',name:'CA'},{id:'fr',owner:'la',type:'checking',currency:'EUR',name:'FR'}],
categories:[{id:'food',name:'Courses'}],transactions:[
{id:'a',date:'2026-10-18',accountId:'ca',categoryId:'food',type:'expense',status:'confirmed',bankAmount:40},
{id:'b',date:'2026-10-14',accountId:'fr',categoryId:'food',type:'expense',status:'confirmed',bankAmount:5},
{id:'c',date:'2026-10-14',accountId:'fr',categoryId:'food',type:'expense',status:'pending',bankAmount:null},
{id:'d',date:'2026-09-30',accountId:'ca',categoryId:'food',type:'expense',status:'confirmed',bankAmount:6}
]};
const controls={},$=id=>(controls[id]??={innerHTML:'',value:'',onclick:null,onchange:null});
const ctx={state,activityMonth:'2026-10',activityAccountFilter:'all',
activityFilters:{category:'all',nature:'all',currency:'all',status:'confirmed'},
$,esc:String,shortAccountLabel:a=>a.name,accountType:a=>a.type,
window:{TraceInternational:{currency:a=>a.currency,money:(n,c)=>n+' '+c,
 amountOnAccount:(t,a,leg)=>leg==='destination'?t.toBankAmount:t.bankAmount}},
txRow:t=>'<button data-tx-open="'+t.id+'"></button>',renderActivity(){},closeSheet(){},navigate(){},showTab(){}};
const m=new Function(...Object.keys(ctx),app.slice(i,j)+
'\nreturn {rows:traceActivityRows,controls:traceActivityControls,group:traceActivityGroupHTML,pending:traceActivityPendingRow,open:openActivityCategory};')(...Object.values(ctx));
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('only October confirmed transactions appear by default',()=>assert.deepEqual(m.rows().map(t=>t.id),['a','b']));
test('account, currency and status selectors are wired',()=>{m.controls();for(const id of ['activityAccountFilter','activityCategoryFilter','activityNatureFilter','activityCurrencyFilter','activityStatusFilter'])assert.equal(typeof $('#'+id).onchange,'function')});
test('EUR account filter isolates French transaction',()=>{$('#activityAccountFilter').value='fr';$('#activityAccountFilter').onchange();assert.deepEqual(m.rows().map(t=>t.id),['b'])});
test('pending exposes missing amount without zero substitution',()=>{$('#activityStatusFilter').value='pending';$('#activityStatusFilter').onchange();assert.deepEqual(m.rows().map(t=>t.id),['c']);assert.match(m.pending(m.rows()[0]),/Montant bancaire à vérifier/)});
test('daily headings and activity category link remain wired',()=>{assert.match(m.group(state.transactions.filter(t=>t.status==='confirmed'&&t.date.startsWith('2026-10'))),/octobre/);assert.match(app,/openActivityCategory\(month,categoryId\)/)});
test('CSP, importer and historical financial protections remain',()=>{assert.match(html,/connect-src 'none'/);assert.match(html,/id="importPendingTransactions"/);assert.match(app,/const counted=confirmed\.filter\(isFinancialPeriod\)/)});

test('currency filter follows selected transfer recipient native leg, not CAD source',()=>{
 state.transactions.push({id:'fx-eur',date:'2026-10-20',accountId:'ca',toAccountId:'fr',
  type:'transfer',status:'confirmed',bankAmount:40,toBankAmount:25,
  bankCurrency:'CAD',toBankCurrency:'EUR'});
 m.controls();
 $('#activityAccountFilter').value='fr';$('#activityAccountFilter').onchange();
 $('#activityCurrencyFilter').value='EUR';$('#activityCurrencyFilter').onchange();
 $('#activityStatusFilter').value='all';$('#activityStatusFilter').onchange();
 assert.ok(m.rows().some(t=>t.id==='fx-eur'));
 $('#activityCurrencyFilter').value='CAD';$('#activityCurrencyFilter').onchange();
 assert.ok(!m.rows().some(t=>t.id==='fx-eur'));
});
test('all-accounts EUR filter includes a transfer arriving in EUR',()=>{
 $('#activityAccountFilter').value='all';$('#activityAccountFilter').onchange();
 $('#activityCurrencyFilter').value='EUR';$('#activityCurrencyFilter').onchange();
 assert.ok(m.rows().some(t=>t.id==='fx-eur'));
});
test('pending incoming EUR transfer displays its actual recipient amount',()=>{
 state.transactions.push({id:'fx-review',date:'2026-10-21',accountId:'ca',
  toAccountId:'fr',type:'transfer',status:'pending',
  bankAmount:40,toBankAmount:25.5,bankCurrency:'CAD',toBankCurrency:'EUR'});
 $('#activityAccountFilter').value='fr';$('#activityAccountFilter').onchange();
 $('#activityCurrencyFilter').value='EUR';$('#activityCurrencyFilter').onchange();
 $('#activityStatusFilter').value='pending';$('#activityStatusFilter').onchange();
 const found=m.rows().find(t=>t.id==='fx-review');
 assert.ok(found);
 assert.match(m.pending(found),/25.5 EUR/);
 assert.doesNotMatch(m.pending(found),/40 CAD/);
});
test('currency filter never silently relabels unknown destination bank amount as source cash',()=>{
 const transfer=state.transactions.find(t=>t.id==='fx-review');
 transfer.toBankAmount=null;
 assert.match(m.pending(transfer),/Montant bancaire à vérifier/);
 assert.doesNotMatch(m.pending(transfer),/40 CAD/);
});
console.log(n+' Activity journal tests passed');