'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html'),
 css=read('trace-international-1.0.0.css');
test('four approved sections are in order and import panel remains distinct',()=>{
 const ids=['data-tab="transactions"','data-tab="review"','data-tab="sharing"','data-tab="import"'];
 const at=ids.map(s=>html.indexOf(s));
 assert.ok(at.every((x,i)=>x>=0&&(i===0||x>at[i-1])));
 assert.match(html,/data-tab="transactions"[^>]*>Historique<\/button>/);
 assert.match(html,/data-tab="review"[^>]*>À valider<\/button>/);
 assert.equal((html.match(/id="importPendingTransactions"/g)||[]).length,1);
 assert.ok(html.indexOf('id="importPendingTransactions"')<html.indexOf('id="activityImport"'));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(html,/role="tablist"/);
});
function mountTabs(){
 const i=app.indexOf('function showTab(t){'),j=app.indexOf('\n}\n',i)+2;
 assert.ok(i>0&&j>i);
 const nodes=Object.fromEntries(['activityTransactions','activityReview','activityImport',
 'activitySharing','activityPeriodControl','activityMonthLabel'].map(x=>['#'+x,{
 textContent:'',classList:{hidden:false,toggle(n,v){this.hidden=v}}}]));
 const buttons=['transactions','review','sharing','import'].map(x=>({dataset:{tab:x},
 classList:{active:false,toggle(n,v){this.active=v}},
 setAttribute(n,v){if(n==='aria-selected')this.selected=v}}));
 let sharing=0;
 const real=new Function('$','$$','monthLabel','renderActivitySharing','activityMonth',
 'let tab="transactions";'+app.slice(i,j)+';return {showTab,tab:()=>tab};')(
 id=>nodes[id],()=>buttons,()=> 'octobre 2026',()=>sharing++,'2026-10');
 return{...real,nodes,buttons,sharing:()=>sharing};
}
test('À valider shows only review view, across all dates, with accessible state',()=>{
 const m=mountTabs();m.showTab('review');
 assert.equal(m.nodes['#activityReview'].classList.hidden,false);
 assert.equal(m.nodes['#activityTransactions'].classList.hidden,true);
 assert.equal(m.nodes['#activityImport'].classList.hidden,true);
 assert.equal(m.nodes['#activityPeriodControl'].classList.hidden,true);
 assert.equal(m.nodes['#activityMonthLabel'].textContent,'À valider · toutes périodes');
 assert.equal(m.buttons.find(b=>b.dataset.tab==='review').selected,'true');
 assert.equal(m.sharing(),0);
});
test('Historique, Partage and Imports retain their individual navigation',()=>{
 const m=mountTabs();m.showTab('import');
 assert.equal(m.nodes['#activityImport'].classList.hidden,false);
 m.showTab('sharing');
 assert.equal(m.nodes['#activitySharing'].classList.hidden,false);
 assert.equal(m.sharing(),1);
 m.showTab('transactions');
 assert.equal(m.nodes['#activityTransactions'].classList.hidden,false);
 assert.equal(m.nodes['#activityPeriodControl'].classList.hidden,false);
 assert.equal(m.nodes['#activityMonthLabel'].textContent,'octobre 2026');
 assert.equal(m.buttons.find(b=>b.dataset.tab==='transactions').selected,'true');
});
test('old validation shortcuts open dedicated review and never upload',()=>{
 assert.match(app,/if\(b\.dataset\.go==='review'\)\{navigate\('activity'\);showTab\('review'\)/);
 assert.match(app,/showTab\(tx\.status==='confirmed'\?'transactions':'review'\)/);
 assert.match(app,/pendingBtn\.onclick=\(\)=>showTab\('review'\)/);
});
function queue(){
 const i=app.indexOf(' const active=new Set(visibleBankAccounts(me).map(a=>a.id));',
  app.indexOf('function renderActivity(){'));
 const j=app.indexOf("\n const picker=$('#activityMonthPicker')",i);
 assert.ok(i>0&&j>i);
 const account={id:'eur',owner:'la',currency:'EUR',name:'Compte français'};
 const foreign={id:'other',owner:'partner',currency:'CAD',name:'Autre'};
 const state={accounts:[account,foreign],transactions:[
 {id:'early',accountId:'eur',status:'pending',date:'2026-09-12',
  name:'Septembre',bankCurrency:'EUR',bankAmount:7},
 {id:'late',accountId:'eur',status:'pending',date:'2026-10-19',
  name:'Octobre',bankCurrency:'EUR',bankAmount:null,amountCAD:45},
 {id:'partner',accountId:'other',status:'pending',date:'2026-10-18',bankAmount:100},
 {id:'settled',accountId:'eur',status:'confirmed',date:'2026-10-20',bankAmount:5}
 ]};
 const before=JSON.stringify(state);
 const buttons=[{dataset:{importPending:'late'},onclick:null}],node={
 innerHTML:'',classList:{toggle(){}},querySelectorAll:()=>buttons};
 let writes=0,opened=[];
 const f=new Function('state','me','visibleBankAccounts','$','esc',
 'shortAccountLabel','window','editTransaction',app.slice(i,j)+';return remaining.map(t=>t.id);');
 const listed=f(state,'la',()=>[account],()=>node,s=>String(s),a=>a.name,{
 TraceInternational:{currency:a=>a.currency,amountOnAccount:t=>t.bankAmount,
 money:(v,c)=>v+' '+c}},(id,review)=>opened.push([id,review]));
 return{listed,node,buttons,before,state,opened,writes};
}
test('pending shows every month for owner only, no phantom CAD-to-EUR amount',()=>{
 const a=queue();
 assert.deepEqual(a.listed,['late','early']);
 assert.match(a.node.innerHTML,/Montant bancaire à vérifier/);
 assert.match(a.node.innerHTML,/7 EUR/);
 assert.doesNotMatch(a.node.innerHTML,/45 CAD|0 EUR|Autre/);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('review actions open existing editor and never write during rendering',()=>{
 const a=queue();assert.equal(typeof a.buttons[0].onclick,'function');
 a.buttons[0].onclick();
 assert.deepEqual(a.opened,[['late',true]]);
 assert.equal(JSON.stringify(a.state),a.before);
});
test('the 5 main navigation items stay intact',()=>{
 const begin=html.indexOf('<nav class="nav"'),end=html.indexOf('</nav>',begin);
 const nav=html.slice(begin,end);
 assert.doesNotMatch(nav,/data-nav="review"|data-nav="sharing"/);
 assert.match(nav,/data-nav="wealth"/);
});
