'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const css=fs.readFileSync(path.join(root,'trace-international-1.0.0.css'),'utf8');
const start=app.indexOf('let activityReviewVisibleCount=40;');
const end=app.indexOf('\n/* TRACE 5.',start);
assert.ok(start>0&&end>start);
function fakeRows(n){
 return Array.from({length:n},(_,i)=>({
  id:'history-'+i,status:'confirmed',type:'expense',date:'2026-10-20',
  accountId:'cad',amountCAD:1,bankCurrency:'CAD',bankAmount:1
 }));
}
function mount(rows=fakeRows(145)){
 const source=JSON.stringify(rows),state={transactions:rows,accounts:[]};
 const stats=Object.fromEntries(['activityMonthLabel','activityExpenses','activityIncome','activityNet']
  .map(id=>[id,{textContent:''}]));
 const focused=[],opened=[],host={innerHTML:'',
  querySelectorAll(sel){
   if(sel!=='[data-tx-open]')return [];
   return [...this.innerHTML.matchAll(/data-tx-open="([^"]+)"/g)]
    .map(match=>({dataset:{txOpen:match[1]},focus:()=>focused.push(match[1])}));
  }};
 const more={onclick:null};
 const $=sel=>{
  if(sel==='#transactionList')return host;
  if(sel==='#activityHistoryLoadMore')return host.innerHTML.includes('id="activityHistoryLoadMore"')?more:null;
  if(sel.startsWith('#')&&stats[sel.slice(1)])return stats[sel.slice(1)];
  return null;
 };
 const $$=sel=>sel==='[data-tx-open]'?host.querySelectorAll(sel):[];
 const deps={state,me:'la',activityMonth:'2026-10',activityAccountFilter:'all',
  activityFilters:{category:'all',nature:'all',currency:'all',status:'confirmed'},
  renderCsvUnparsedReviewQueue(){},traceActivityControls(){},
  traceActivityRows:()=>rows,isFinancialPeriod:()=>true,
  $,$$,monthLabel:()=> 'octobre 2026',money:x=>x+' CAD',
  traceActivityGroupHTML:shown=>'<section>'+
   shown.map(t=>'<button data-tx-open="'+t.id+'">'+t.name+'</button>').join('')+'</section>',
  editTransaction:id=>opened.push(id),visibleBankAccounts:()=>[],
  traceActivitySelect(){},window:{},CM:'2026-10',tab:'transactions',showTab(){}};
 const snippet=app.slice(start,end);
 const instance=new Function(...Object.keys(deps),snippet+
  '\nreturn {renderActivity,getCap:()=>activityHistoryVisibleCount,'+
  'setMonth:v=>activityMonth=v,setOwner:v=>me=v,'+
  'setAccount:v=>activityAccountFilter=v,'+
  'setStatus:v=>activityFilters.status=v};')(...Object.values(deps));
 return {...instance,state,rows,host,more,stats,focused,opened,source,
  rendered:()=>host.querySelectorAll('[data-tx-open]').map(x=>x.dataset.txOpen)};
}
test('first view renders at most 60 rows while monthly financial totals use all 145',()=>{
 const m=mount();m.renderActivity();
 assert.equal(m.rendered().length,60);
 assert.equal(m.stats.activityExpenses.textContent,'145 CAD');
 assert.match(m.host.innerHTML,/85 restantes/);
 assert.equal(m.getCap(),60);
 assert.equal(JSON.stringify(m.state.transactions),m.source);
});
test('one action reveals 60 more rows, moves focus, and preserves all original rows',()=>{
 const m=mount();m.renderActivity();
 assert.equal(typeof m.more.onclick,'function');
 m.more.onclick();
 assert.equal(m.rendered().length,120);
 assert.equal(m.focused.at(-1),'history-60');
 assert.equal(m.stats.activityExpenses.textContent,'145 CAD');
 assert.match(m.host.innerHTML,/25 restantes/);
 assert.equal(JSON.stringify(m.state.transactions),m.source);
});
test('historical third page completes the month without removing any operations',()=>{
 const m=mount();m.renderActivity();m.more.onclick();m.more.onclick();
 assert.equal(m.rendered().length,145);
 assert.equal(m.getCap(),180);
 assert.equal(m.rendered().at(-1),'history-144');
 assert.doesNotMatch(m.host.innerHTML,/id="activityHistoryLoadMore"/);
 assert.equal(JSON.stringify(m.state.transactions),m.source);
});
test('same month and filters preserve expanded history across harmless re-render',()=>{
 const m=mount();m.renderActivity();m.more.onclick();m.renderActivity();
 assert.equal(m.rendered().length,120);
});
test('changing account, month, status or member resets DOM cap to 60',()=>{
 for(const [name,modify] of [
  ['account',m=>m.setAccount('cad')],['month',m=>m.setMonth('2026-09')],
  ['status',m=>m.setStatus('pending')],['owner',m=>m.setOwner('partner')]
 ]){
  const m=mount();m.renderActivity();m.more.onclick();
  assert.equal(m.rendered().length,120,name);
  modify(m);m.renderActivity();
  assert.equal(m.getCap(),60,name);
  assert.equal(m.rendered().length,60,name);
 }
});
test('empty or short months do not show a useless load-more control',()=>{
 for(const n of [0,1,40,60]){
  const m=mount(fakeRows(n));m.renderActivity();
  assert.equal(m.rendered().length,n);
  assert.doesNotMatch(m.host.innerHTML,/id="activityHistoryLoadMore"/);
 }
});
test('history uses a visible, accessible touch-sized button and focus outline',()=>{
 assert.match(css,/\.trace-history-more\s*\{/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/\.trace-history-more:focus-visible/);
});
