'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../trace-insights-1.0.0.js');
const I=globalThis.TraceInsights;
function render(options){
 const target={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 I.renderCategories(target,options);return target.innerHTML;
}
test('budget consumed percentage is distinguished from share of total spending',()=>{
 const html=render({rows:[{id:'food',name:'Food',actual:40,budget:100}],totalExpense:80,budgetTotal:200});
 assert.match(html,/40 % du budget/);assert.match(html,/50 % des dépenses du mois/);
 assert.match(html,/Reste 60/);assert.match(html,/data-budget-state="within"/);
});
test('near-budget and over-budget categories have separate soft-warning states',()=>{
 const near=render({rows:[{id:'n',actual:85,budget:100}],totalExpense:85});
 const over=render({rows:[{id:'o',actual:120,budget:100}],totalExpense:120});
 assert.match(near,/data-budget-state="near"/);
 assert.match(over,/data-budget-state="over"/);assert.match(over,/120 % du budget/);
 assert.match(over,/Budget dépassé de 20/);assert.match(over,/width:100%/);
});
test('a category with no budget is explicitly unbudgeted without invented percent',()=>{
 const html=render({rows:[{id:'f',actual:20,budget:0}],totalExpense:20});
 assert.match(html,/data-budget-state="unbudgeted"/);
 assert.match(html,/Sans budget prévu/);assert.doesNotMatch(html,/0 % du budget/);
});
test('home ring uses the same confirmed spending and planned total as the categories',()=>{
 const html=render({rows:[{id:'f',actual:40,budget:100}],totalExpense:40,budgetTotal:100,showSummary:true});
 assert.match(html,/--trace-budget-pct:40%/);assert.match(html,/40 % du budget consommé/);
 assert.match(html,/Encore 60/);assert.match(html,/40 \$ dépensés sur 100 \$/);
});
test('missing overall budget leaves an empty ring and a request to complete it',()=>{
 const html=render({rows:[],totalExpense:0,budgetTotal:0,showSummary:true});
 assert.match(html,/Budget à compléter/);assert.match(html,/<b>—<\/b>/);
 assert.doesNotMatch(html,/0 % du budget consommé/);
});
test('untrusted category names remain escaped in the richer progress view',()=>{
 const html=render({rows:[{id:'x',name:'<img src=x onerror=alert(1)>',actual:10,budget:20}],totalExpense:10});
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
test('compact trend compares budget and confirmed spending without turning missing months into zero',()=>{
 const target={innerHTML:''};
 I.renderTrend(target,{compact:true,selected:'2026-10',months:[
  {month:'2026-09',hasData:false},{month:'2026-10',hasData:true,current:true,expense:40,budget:100}]
 });
 assert.match(target.innerHTML,/is-planned" style="height:72px/);
 assert.match(target.innerHTML,/is-spent" style="height:29px/);
 assert.match(target.innerHTML,/septembre : non renseigné/);
 assert.match(target.innerHTML,/mois non renseigné/);
 assert.match(target.innerHTML,/Premier mois documenté/);
});
test('compact trend empty state never fabricates history or a comparison',()=>{
 const target={innerHTML:''};I.renderTrend(target,{compact:true,months:[]});
 assert.match(target.innerHTML,/Pas encore de mois renseigné/);
 assert.doesNotMatch(target.innerHTML,/par rapport|0 \$/);
});
test('wealth insights never turn unknown cash, FX or card debt into numeric zero',()=>{
 const target={innerHTML:''};
 I.renderWealth(target,{checking:null,cardDebt:null,investments:[{name:'Unknown FX',ready:false,cad:null}],hasIncomplete:true});
 assert.match(target.innerHTML,/Total incomplet/);assert.match(target.innerHTML,/À vérifier/);
 assert.doesNotMatch(target.innerHTML,/Dettes de carte connues<\/small><b>0/);
});
test('wealth insights retain known overdrafts and explicit zero card debt',()=>{
 const target={innerHTML:''};
 I.renderWealth(target,{checking:-50,cardDebt:0,investments:[{name:'Savings',ready:true,cad:200}]});
 assert.match(target.innerHTML,/Comptes et placements suivis<\/small><b>150/);
 assert.match(target.innerHTML,/Dettes de carte connues<\/small><b>0/);
});
