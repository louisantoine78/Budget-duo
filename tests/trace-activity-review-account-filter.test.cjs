'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html'),
 css=read('trace-international-1.0.0.css');
function preview(filter='all',cap=40,owner='la',large=false,opts={}){
 const a=app.indexOf(' const reviewAccounts=visibleBankAccounts(me);',app.indexOf('function renderActivity(){'));
 const b=app.indexOf("\n const picker=$('#activityMonthPicker')",a);
 assert.ok(a>=0&&b>a,'Expected current review implementation');
 const accounts=[
  {id:'eur',owner:'la',name:'Compte France',currency:'EUR'},
  {id:'cad',owner:'la',name:'Compte Canada',currency:'CAD'},
  {id:'empty',owner:'la',name:'Compte sans attente',currency:'CHF'},
  {id:'partner',owner:'partner',name:'Compte privé',currency:'GBP'},
  {id:'closed',owner:'la',name:'Compte archivé',currency:'USD',archived:true}
 ];
 const transactions=[
  {id:'eur-september',accountId:'eur',status:'pending',date:'2026-09-19',name:'Septembre',bankCurrency:'EUR',bankAmount:7},
  {id:'eur-october',accountId:'eur',status:'pending',date:'2026-10-20',name:'Octobre',bankCurrency:'EUR',bankAmount:null,amountCAD:45},
  {id:'cad-pending',accountId:'cad',status:'pending',date:'2026-10-21',name:'Canada',bankCurrency:'CAD',bankAmount:10},
  {id:'partner-pending',accountId:'partner',status:'pending',date:'2026-10-12',bankAmount:80},
  {id:'closed-pending',accountId:'closed',status:'pending',date:'2026-09-10',bankAmount:55},
  {id:'settled',accountId:'eur',status:'confirmed',date:'2026-10-16',bankAmount:20}
 ];
 if(opts.transfer)transactions.push({
  id:'cad-to-eur',accountId:'cad',toAccountId:'eur',type:'transfer',
  status:'pending',date:'2026-07-11',name:'Échange',bankCurrency:'CAD',
  bankAmount:50,toBankCurrency:'EUR',toBankAmount:46.2
 });
 if(opts.incoming)transactions.push({
  id:'partner-to-eur',accountId:'partner',toAccountId:'eur',type:'transfer',
  status:'pending',date:'2026-06-04',name:'Virement partenaire',
  bankCurrency:'GBP',bankAmount:100,toBankCurrency:'EUR',toBankAmount:91.34
 });
 if(opts.unproved)transactions.push({
  id:'cad-to-eur-unproved',accountId:'cad',toAccountId:'eur',type:'transfer',
  status:'pending',date:'2026-05-02',name:'Échange non prouvé',
  bankCurrency:'CAD',bankAmount:80,toBankCurrency:'CAD',toBankAmount:72.3,amountCAD:80
 });
 if(opts.partnerOnly)transactions.push({
  id:'partner-only',accountId:'partner',type:'expense',
  status:'pending',date:'2026-04-01',name:'Privé',bankCurrency:'GBP',bankAmount:30
 });
 if(large)for(let n=0;n<100;n++)transactions.push({
  id:'historic-'+n,accountId:'eur',status:'pending',date:'2026-08-10',bankCurrency:'EUR',bankAmount:n+.01
 });
 const state={accounts,transactions},before=JSON.stringify(state);
 const chosen={items:[],value:null,change:null},actions=[],renderCalls=[];
 const legacy={innerHTML:'',classList:{toggle(){}},querySelectorAll:()=>[],
 querySelector:()=>null};
 const f=new Function('state','me','visibleBankAccounts','$','esc','shortAccountLabel',
 'window','editTransaction','activityReviewVisibleCount','renderActivity',
 'activityReviewAccountFilter','traceActivitySelect',
 app.slice(a,b)+';return {all:pendingAll.map(x=>x.id),shown:visiblePending.map(x=>x.id),'+
 'remaining:remaining.map(x=>x.id),filter:()=>activityReviewAccountFilter,cap:()=>activityReviewVisibleCount};');
 const engine=opts.realEngine?{}:null;
 if(engine)new Function('window',read('trace-international-1.0.0.js'))(engine);
 const fake={TraceInternational:{
  amountOnAccount:(t,a,leg)=>leg==='destination'?
   (t.toBankCurrency===a.currency?t.toBankAmount:null):
   (t.bankCurrency===a.currency?t.bankAmount:null),
  money:(v,c)=>v+' '+c,currency:a=>a.currency
 }};
 const result=f(state,owner,who=>state.accounts.filter(x=>x.owner===who&&!x.archived),
 ()=>legacy,s=>String(s),a=>a.name,engine||fake,
 (id,review)=>actions.push([id,review]),cap,()=>renderCalls.push('render'),filter,
 (id,items,value,onChange)=>{
  assert.equal(id,'activityReviewAccountFilter');
  chosen.items=items;chosen.value=value;
  chosen.change=v=>{onChange(v);renderCalls.push('render');};
 });
 return{...result,chosen,legacy,state,before,actions,renderCalls};
}
test('filter lists only active accounts of signed-in owner, with native currency',()=>{
 const a=preview();
 assert.deepEqual(a.chosen.items.map(x=>x[0]),['all','eur','cad','empty']);
 assert.match(a.chosen.items[0][1],/3/);
 assert.match(a.chosen.items[1][1],/EUR · 2 à valider/);
 assert.match(a.chosen.items[2][1],/CAD · 1 à valider/);
 assert.match(a.chosen.items[3][1],/CHF · 0 à valider/);
 assert.doesNotMatch(a.chosen.items.map(x=>x[1]).join(' '),/Compte privé|Compte archivé/);
 assert.deepEqual(a.remaining,['cad-pending','eur-october','eur-september']);
});
test('filtering EUR preserves previous month but never reveals CAD or another member',()=>{
 const a=preview('eur');
 assert.deepEqual(a.remaining,['eur-october','eur-september']);
 assert.match(a.legacy.innerHTML,/Montant bancaire à vérifier/);
 assert.match(a.legacy.innerHTML,/7 EUR/);
 assert.doesNotMatch(a.legacy.innerHTML,/10 CAD|80 GBP|45 CAD/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('selecting CAD shows only the exact source-bank amount',()=>{
 const a=preview('cad');
 assert.deepEqual(a.remaining,['cad-pending']);
 assert.match(a.legacy.innerHTML,/10 CAD/);
 assert.doesNotMatch(a.legacy.innerHTML,/Septembre|Octobre/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('stale or foreign account filter resets without exposing partner',()=>{
 for(const id of ['partner','closed','unknown']){
  const a=preview(id,80);
  assert.equal(a.filter(),'all');
  assert.equal(a.chosen.value,'all');
  assert.equal(a.cap(),40);
  assert.deepEqual(a.remaining,['cad-pending','eur-october','eur-september']);
  assert.equal(JSON.stringify(a.state),a.before);
 }
});
test('member change invalidates previously selected personal account',()=>{
 const a=preview('eur',80,'partner');
 assert.equal(a.filter(),'all');
 assert.equal(a.chosen.value,'all');
 assert.deepEqual(a.chosen.items.map(x=>x[0]),['all','partner']);
 assert.deepEqual(a.remaining,['partner-pending']);
 assert.doesNotMatch(a.legacy.innerHTML,/Compte France|Canada/);
});
test('switching account resets progressive pagination without altering transactions',()=>{
 const a=preview('all',80,'la',true);
 assert.equal(a.shown.length,80);
 a.chosen.change('cad');
 assert.equal(a.filter(),'cad');
 assert.equal(a.cap(),40);
 assert.deepEqual(a.renderCalls,['render']);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('empty account-specific state never fabricates a pending operation',()=>{
 const a=preview('empty');
 assert.equal(a.filter(),'empty');
 assert.deepEqual(a.remaining,[]);
 assert.match(a.legacy.innerHTML,/Aucune opération à valider sur ce compte/);
 assert.doesNotMatch(a.legacy.innerHTML,/data-import-pending/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('visual selector exists before the queue, with a large tactile target',()=>{
 const review=html.indexOf('id="activityReview"'),select=html.indexOf('id="activityReviewAccountFilter"'),
 queue=html.indexOf('id="importPendingTransactions"'),imports=html.indexOf('id="activityImport"');
 assert.ok(review>=0&&select>review&&queue>select&&imports>queue);
 assert.match(html,/for="activityReviewAccountFilter"/);
 assert.match(css,/trace-review-account-label/);
 assert.match(css,/min-height:44px/);
});


test('one CAD-to-EUR transfer counts exactly once overall, once on each linked bank',()=>{
 const a=preview('all',40,'la',false,{transfer:true});
 assert.equal(a.all.filter(id=>id==='cad-to-eur').length,1);
 assert.equal(a.chosen.items[0][1],'Tous mes comptes · 4');
 assert.match(a.chosen.items.find(x=>x[0]==='eur')[1],/EUR · 3 à valider/);
 assert.match(a.chosen.items.find(x=>x[0]==='cad')[1],/CAD · 2 à valider/);
 assert.match(a.legacy.innerHTML,/50 CAD/);
 assert.doesNotMatch(a.legacy.innerHTML,/46.2 EUR/);
 assert.match(a.legacy.innerHTML,/Virement émis/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('EUR recipient filter displays true receiving amount, not CAD source value',()=>{
 const a=preview('eur',40,'la',false,{transfer:true});
 assert.ok(a.remaining.includes('cad-to-eur'));
 assert.match(a.legacy.innerHTML,/46.2 EUR/);
 assert.match(a.legacy.innerHTML,/Virement reçu/);
 assert.doesNotMatch(a.legacy.innerHTML,/50 CAD/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('CAD source filter displays only sending leg of the same foreign transfer',()=>{
 const a=preview('cad',40,'la',false,{transfer:true});
 assert.ok(a.remaining.includes('cad-to-eur'));
 assert.match(a.legacy.innerHTML,/50 CAD/);
 assert.doesNotMatch(a.legacy.innerHTML,/46.2 EUR/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('inbound transfer from another member exposes own EUR proof only',()=>{
 const a=preview('all',40,'la',false,{incoming:true,partnerOnly:true});
 assert.ok(a.remaining.includes('partner-to-eur'));
 assert.ok(!a.remaining.includes('partner-only'));
 assert.match(a.legacy.innerHTML,/91.34 EUR/);
 assert.match(a.legacy.innerHTML,/Virement reçu/);
 assert.doesNotMatch(a.legacy.innerHTML,/100 GBP|30 GBP|Compte privé/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('inbound other-owner transfer counts only receiving account and no foreign source',()=>{
 const a=preview('eur',40,'la',false,{incoming:true});
 assert.ok(a.remaining.includes('partner-to-eur'));
 assert.equal(a.chosen.items[0][1],'Tous mes comptes · 4');
 assert.match(a.chosen.items.find(x=>x[0]==='eur')[1],/EUR · 3 à valider/);
 assert.match(a.chosen.items.find(x=>x[0]==='cad')[1],/CAD · 1 à valider/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('recipient with mismatched bank evidence displays review warning, never an inferred FX',()=>{
 const a=preview('eur',40,'la',false,{unproved:true});
 assert.ok(a.remaining.includes('cad-to-eur-unproved'));
 assert.match(a.legacy.innerHTML,/Échange non prouvé/);
 assert.match(a.legacy.innerHTML,/Montant bancaire à vérifier/);
 assert.doesNotMatch(a.legacy.innerHTML,/72.3 EUR|80 EUR/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('a receiving account owned only by the other member is not added to review',()=>{
 const a=preview('all',40,'partner',false,{transfer:true,partnerOnly:true});
 assert.ok(!a.remaining.includes('cad-to-eur'));
 assert.ok(a.remaining.includes('partner-only'));
 assert.deepEqual(a.chosen.items.map(v=>v[0]),['all','partner']);
 assert.equal(JSON.stringify(a.state),a.before);
});

test('real International engine validates native recipient transfer proof',()=>{
 const engine={};new Function('window',read('trace-international-1.0.0.js'))(engine);
 const EUR={id:'eur',currency:'EUR',type:'checking',country:'FR'};
 const CAD={id:'cad',currency:'CAD',type:'checking',country:'CA'};
 const t={id:'fx',type:'transfer',status:'pending',accountId:'cad',toAccountId:'eur',
  bankAmount:50,bankCurrency:'CAD',toBankAmount:46.2,toBankCurrency:'EUR',amountCAD:50};
 const value=(a,leg)=>engine.TraceInternational.amountOnAccount(t,a,leg);
 assert.equal(value(EUR,'destination'),46.2);
 assert.equal(value(CAD,'source'),50);
 t.toBankCurrency='CAD';assert.equal(value(EUR,'destination'),null);
 t.toBankCurrency='EUR';t.toBankAmount=null;assert.equal(value(EUR,'destination'),null);
 t.toBankAmount=46.205;assert.equal(value(EUR,'destination'),null);
});
test('review lives in the dedicated Activity tab, without a redundant History shortcut',()=>{
 assert.match(html,/id="activityTabReview"[^>]*data-tab="review"/);
 assert.doesNotMatch(html,/id="activityShowPending"/);
 assert.match(html,/id="activityStatusFilter"/);
 assert.doesNotMatch(app,/activityShowPending/);
 assert.match(app,/traceActivitySelect\('activityStatusFilter'/);
});

test('actual international renderer displays destination EUR cents, not CAD cents',()=>{
 const a=preview('eur',40,'la',false,{transfer:true,realEngine:true});
 assert.ok(a.remaining.includes('cad-to-eur'));
 assert.match(a.legacy.innerHTML,/46,20\s*€/);
 assert.doesNotMatch(a.legacy.innerHTML,/50,00\s*\$|50 CAD/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('actual international renderer rejects wrong destination currency, never 72.30 EUR',()=>{
 const a=preview('eur',40,'la',false,{unproved:true,realEngine:true});
 assert.ok(a.remaining.includes('cad-to-eur-unproved'));
 assert.match(a.legacy.innerHTML,/Échange non prouvé/);
 assert.match(a.legacy.innerHTML,/Montant bancaire à vérifier/);
 assert.doesNotMatch(a.legacy.innerHTML,/72,30\s*€|80,00\s*€/);
 assert.equal(JSON.stringify(a.state),a.before);
});
