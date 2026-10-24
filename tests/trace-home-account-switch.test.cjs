'use strict';
/* Native Node fake-DOM financial display tests. No Supabase, no real accounts. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','trace-international-ui-1.0.0.js'),'utf8');
function harness({accounts,estimates,mainId='ca'}={}){
 const events={writes:0,primaryChanges:[],rates:[]};
 const I={
  currency:a=>a?.currency||'CAD',money:(v,cur)=>Number(v).toFixed(2)+' '+cur,
  snapshot({accounts,owner,mainId,estimates}){
   const active=accounts.filter(a=>!a.archived&&(!owner||a.owner===owner));
   const main=active.find(a=>a.id===mainId&&a.type==='checking')||active.find(a=>a.type==='checking');
   const cards=active.filter(a=>a.type==='card'&&a.settlementAccountId===main?.id);
   const unknown=[main,...cards].some(a=>estimates[a?.id]==null);
   const creditReview=cards.filter(a=>Number(estimates[a.id])>0);
   const checking=unknown?null:Number(estimates[main.id]);
   const card=unknown||creditReview.length?null:cards.reduce((s,a)=>s+Number(estimates[a.id]),0);
   return{main,currency:main.currency,checking,card,
    net:checking==null||card==null?null:checking+card,
    cardsToReview:creditReview,ambiguousCards:[],mixedLinkedCurrencies:[],
    balances:active.map(a=>({id:a.id,name:a.name,balance:estimates[a.id]??null,
     nativeCurrency:a.currency,cad:a.currency==='CAD'?estimates[a.id]:null})),
    complete:active.every(a=>a.currency==='CAD'&&estimates[a.id]!=null)&&!creditReview.length,
    globalCAD:active.reduce((s,a)=>s+Number(estimates[a.id]||0),0)};
  }
 };
 const window={TraceInternational:I};
 vm.runInNewContext(source,{window});
 const nodes={balance:{textContent:''},checking:{textContent:''},card:{textContent:''},
  warning:{textContent:'',hidden:true},badge:{textContent:'Rapproché'}};
 const host={innerHTML:'',onclick:null,buttons:{},select:null,
  querySelector(q){return q==='#traceIntlPrimary'?this.select:null},
  querySelectorAll(q){return q==='[data-trace-view-account]'?Object.values(this.buttons):[]},
  prepare(){
   this.buttons={};
   for(const m of this.innerHTML.matchAll(/data-trace-view-account="([^"]+)"/g))
    this.buttons[m[1]]={dataset:{traceViewAccount:m[1]},onclick:null};
   this.select={value:mainId,onchange:null};
  }};
 let html='';Object.defineProperty(host,'innerHTML',{get(){return html},set(v){html=v;host.prepare()}});
 const args={host,accounts,owner:'la',mainId,estimates,rates:{},balanceNode:nodes.balance,
  checkingNode:nodes.checking,cardNode:nodes.card,warningNode:nodes.warning,
  badgeNode:nodes.badge,onSelect:id=>events.primaryChanges.push(id),
  requestRate:cs=>events.rates.push(cs)};
 const render=()=>window.TraceInternationalUI.render(args);
 const click=id=>host.buttons[id].onclick({stopPropagation(){}});
 return{events,nodes,host,render,click,args};
}
const accounts=[{id:'ca',name:'Courant CA',owner:'la',type:'checking',currency:'CAD'},
 {id:'fr',name:'Courant FR',owner:'la',type:'checking',currency:'EUR'},
 {id:'card',name:'Visa',owner:'la',type:'card',currency:'CAD',settlementAccountId:'ca'}];
test('chips switch read-only display in native currency without changing primary',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:-100}});
 h.render();assert.equal(h.nodes.balance.textContent,'400.00 CAD');
 h.click('fr');assert.equal(h.nodes.balance.textContent,'900.00 EUR');
 assert.equal(h.nodes.card.textContent,'0.00 EUR');
 assert.equal(h.events.primaryChanges.length,0);assert.equal(h.events.writes,0);
 assert.match(h.host.innerHTML,/data-trace-view-account="fr" aria-pressed="true"/);
});
test('switching back restores original balance and status badge',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:-100}});
 h.render();h.click('fr');assert.equal(h.nodes.badge.textContent,'Consultation · compte secondaire');
 h.click('ca');assert.equal(h.nodes.balance.textContent,'400.00 CAD');
 assert.equal(h.nodes.badge.textContent,'Rapproché');
});
test('primary selection delegates to existing explicit confirmation',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:-100}});
 h.render();h.host.select.value='fr';h.host.select.onchange();
 assert.deepEqual(h.events.primaryChanges,['fr']);
 assert.equal(h.nodes.balance.textContent,'400.00 CAD');
});
test('missing native balance is never fabricated as zero',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:null,card:-100}});
 h.render();h.click('fr');assert.equal(h.nodes.balance.textContent,'À configurer');
 assert.notEqual(h.nodes.balance.textContent,'0.00 EUR');
});
test('a credit card is subtracted only from its linked checking account',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:-100}});
 h.render();assert.equal(h.nodes.card.textContent,'100.00 CAD de dette');
 h.click('fr');assert.equal(h.nodes.card.textContent,'0.00 EUR');
});
test('positive linked card balance is flagged and never counted as cash',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:20}});
 h.render();assert.equal(h.nodes.balance.textContent,'À vérifier');
 assert.equal(h.nodes.warning.hidden,false);
 h.click('fr');assert.equal(h.nodes.warning.hidden,true);
 h.click('ca');assert.equal(h.nodes.balance.textContent,'À vérifier');
 assert.equal(h.nodes.warning.hidden,false);
});
test('one checking account needs no chip strip',()=>{
 const h=harness({accounts:[accounts[0]],estimates:{ca:60}});
 h.render();assert.doesNotMatch(h.host.innerHTML,/data-trace-view-account/);
 assert.equal(h.nodes.balance.textContent,'60.00 CAD');
});
test('user-provided account labels are escaped before HTML insertion',()=>{
 const a=[accounts[0],{...accounts[1],name:'<img src=x onerror=alert(1)>'}];
 const h=harness({accounts:a,estimates:{ca:40,fr:20}});
 h.render();assert.doesNotMatch(h.host.innerHTML,/<img/);
 assert.match(h.host.innerHTML,/&lt;img/);
});
test('new primary selection resets the ephemeral view',()=>{
 const h=harness({accounts,estimates:{ca:500,fr:900,card:-100}});
 h.render();h.click('fr');h.args.mainId='fr';h.render();
 assert.equal(h.nodes.balance.textContent,'900.00 EUR');
 assert.equal(h.events.primaryChanges.length,0);
});
