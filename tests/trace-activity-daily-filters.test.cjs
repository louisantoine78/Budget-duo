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

const windowReal={TraceInternational:{
 currency:a=>a?.currency||'CAD',
 amountOnAccount:(t,a,leg)=> {
  const cur=a?.currency||'CAD';
  const explicit=leg==='destination'?t.toBankAmount:t.bankAmount;
  const actual=explicit??(cur==='CAD'?t.amountCAD:null);
  return actual===null||actual===undefined||!Number.isFinite(Number(actual))?null:Number(actual);
 },
 exactMoney:v=>v===null||v===undefined||v===''?null:
  Number.isFinite(Number(v))?Number(v):null,
 money:(n,c)=>Number(n).toFixed(2)+' '+c
}};
const filesIntlSource=get('trace-international-1.0.0.js');
const actualEngine={};
new Function('window',filesIntlSource)(actualEngine);
const realInternational=actualEngine.TraceInternational;
const realRow=(t,account='all',currency='all',using=windowReal)=>{
 const start=app.indexOf('function txRow(t){'),
  end=app.indexOf('\n/* CSV import:',start);
 assert.ok(start>0&&end>start);
 const real=new Function('state','window','cat','accountType','isFinancialPeriod',
  'esc','money','activityAccountFilter','activityFilters',
  'return ('+app.slice(start,end)+');');
 return real({...state,investmentAccounts:[]},using,id=>({name:'Courses',icon:'◇'}),
  a=>a?.type,()=>true,String,n=>Number(n).toFixed(2),account,
  {currency,category:'all',nature:'all',status:'all'})(t);
};

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

test('confirmed EUR movement without native bank proof never renders historical CAD as EUR',()=>{
 const tx={id:'foreign-unproved',date:'2026-10-22',accountId:'fr',type:'expense',
  status:'confirmed',amountCAD:73.92,bankAmount:null};
 const markup=realRow(tx,'fr');
 assert.match(markup,/Montant à vérifier/);
 assert.doesNotMatch(markup,/73.92 EUR/);
 assert.doesNotMatch(markup,/−73.92 EUR/);
});
test('confirmed EUR expense shows its exact native cent amount and historical CAD reference',()=>{
 const tx={id:'foreign-proved',date:'2026-10-22',accountId:'fr',type:'expense',
  status:'confirmed',bankCurrency:'EUR',bankAmount:46.2,amountCAD:73.92};
 const markup=realRow(tx,'fr');
 assert.match(markup,/46.20 EUR/);
 assert.match(markup,/Env. 73.92 CAD/);
 assert.doesNotMatch(markup,/−73.92 EUR/);
});
test('confirmed cross-currency transfer displays receiving EUR leg for EUR filter',()=>{
 const tx={id:'dual-legged',date:'2026-10-22',accountId:'ca',toAccountId:'fr',
  type:'transfer',status:'confirmed',bankCurrency:'CAD',bankAmount:40,
  toBankCurrency:'EUR',toBankAmount:25.5,amountCAD:40};
 const markup=realRow(tx,'all','EUR');
 assert.match(markup,/25.50 EUR/);
 assert.match(markup,/Réception EUR/);
 assert.doesNotMatch(markup,/40.00 CAD<\/span>/);
});
test('missing transfer receipt does not borrow the source amount in EUR Activity',()=>{
 const tx={id:'missing-receipt',date:'2026-10-22',accountId:'ca',toAccountId:'fr',
  type:'transfer',status:'confirmed',bankAmount:40,bankCurrency:'CAD',
  toBankAmount:null,amountCAD:40};
 const markup=realRow(tx,'fr');
 assert.match(markup,/Montant à vérifier/);
 assert.doesNotMatch(markup,/40.00 EUR/);
});
test('pending all-account EUR filter displays EUR receipt, not source CAD debit',()=>{
 const tx={id:'pending-all-eur',date:'2026-10-23',accountId:'ca',toAccountId:'fr',
  type:'transfer',status:'pending',bankAmount:40,toBankAmount:25.5};
 const src=app.indexOf('/* TRACE 5.37 — filter and journal display'),
  dest=app.indexOf('\nfunction renderActivity(){',src);
 const fake={...ctx,activityAccountFilter:'all',
  activityFilters:{category:'all',nature:'all',currency:'EUR',status:'pending'}};
 const view=new Function(...Object.keys(fake),app.slice(src,dest)+
  '\nreturn traceActivityPendingRow;')(...Object.values(fake));
 assert.match(view(tx),/25.5 EUR/);
 assert.doesNotMatch(view(tx),/40 CAD/);
});


test('real International engine refuses foreign CAD fallback without source proof',()=>{
 const tx={id:'native-unproved',date:'2026-10-21',accountId:'fr',type:'expense',
  status:'confirmed',amountCAD:73.92};
 const out=realRow(tx,'fr','EUR',actualEngine);
 assert.match(out,/Montant à vérifier/);
 assert.doesNotMatch(out,/73,92\s*€/);
});
test('real International engine rejects mismatched or fractional native bank proof',()=>{
 const tx={id:'native-bad',date:'2026-10-21',accountId:'fr',type:'expense',
  status:'confirmed',amountCAD:73.92,bankAmount:46.2,bankCurrency:'CAD'};
 assert.match(realRow(tx,'fr','EUR',actualEngine),/Montant à vérifier/);
 tx.bankCurrency='EUR';tx.bankAmount=46.205;
 assert.match(realRow(tx,'fr','EUR',actualEngine),/Montant à vérifier/);
 tx.bankAmount=46.2;
 assert.match(realRow(tx,'fr','EUR',actualEngine),/46,20\s*€/);
});
test('real International engine confirms a cross-currency EUR recipient amount',()=>{
 const tx={id:'actual-eur-received',date:'2026-10-20',accountId:'ca',toAccountId:'fr',
  type:'transfer',status:'confirmed',bankCurrency:'CAD',bankAmount:40,
  toBankCurrency:'EUR',toBankAmount:25.5,amountCAD:40};
 const out=realRow(tx,'all','EUR',actualEngine);
 assert.match(out,/25,50\s*€/);
 assert.doesNotMatch(out,/40,00\s*\$/);
 tx.toBankCurrency='CAD';
 assert.match(realRow(tx,'fr','EUR',actualEngine),/Montant à vérifier/);
});
console.log(n+' Activity journal tests passed');