'use strict';
/* TRACE 5.37.0 international UI smoke — exercise current renderers with fake DOM only.
   No Supabase access, no actual transactions, no browser/network required. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function extract(start,next){
 const begin=app.indexOf('function '+start+'('),end=app.indexOf(next,begin+10);
 assert.ok(begin>=0&&end>begin,'Missing function '+start);
 return app.slice(begin,end);
}
function compile(name,end,deps){const body=extract(name,end);
 return new Function(...Object.keys(deps),'return ('+body+');')(...Object.values(deps));}
const bad=[...app.matchAll(/(?<!\$)\$\([^)]*\)\.forEach/g)];
test('No querySelector(...).forEach startup crash',()=>assert.equal(bad.length,0));
test('No undefined triple-dollar selector',()=>assert.doesNotMatch(app,/\${3,}\(/));
test('querySelectorAll is used for budget render loop',()=>assert.ok(app.includes("$$('#annualBudgetChart [data-insight-month]').forEach")));
test('querySelectorAll is used for category drilldown',()=>assert.ok(app.includes("$$('[data-tx-open]').forEach")));
test('querySelectorAll is used for wealth and analysis buttons',()=>{
 assert.ok(app.includes("$$('[data-analysis-invest]').forEach"));
 assert.ok(app.includes("$$('#analysisScope .seg').forEach"));
});
const nodes=new Map(), clicks=new Map();
const elem=id=>{
 if(!nodes.has(id))nodes.set(id,{
  id,innerHTML:'',textContent:'',value:'',href:'',hidden:false,
  classList:{toggle(){}},style:{},dataset:{insightMonth:'2026-10',analysisInvest:'celi'},
  querySelector(){return elem(id+':child');},querySelectorAll(){return[];}
 });
 return nodes.get(id);
};
const $=selector=>elem(selector);
const $$=selector=>{
 if(!clicks.has(selector)){
  clicks.set(selector,[{dataset:{insightMonth:'2026-10',analysisInvest:'celi',scope:'couple'},
   onclick:null,classList:{toggle(){}}}]);
 }
 return clicks.get(selector);
};
const activeMonth='2026-10';
const state={budgets:[],categories:[],transactions:[],investmentAccounts:[
 {id:'celi',owner:'la',name:'CELI test',currency:'CAD',savingsTracking:'linked'}
]};
const smry={income:900,ib:1000,eb:700,expense:200,saving:700};
const ctx={
 budgetMonth:activeMonth,budgetScope:'mine',wealthScope:'mine',analysisScope:'mine',me:'la',CM:activeMonth,
 state,scope:()=> 'la',summary:()=>smry,monthLabel:m=>m,monthOffset:(m,offset)=>offset<0?'2026-09':'2026-11',
 budgetAmt:()=>0,cat:()=>({type:'expense'}),categoryKind:()=> 'variable',
 shortMonth:m=>m,esc:s=>String(s),money:n=>String(n)+' $',
 $,$$,document:{querySelectorAll:()=>[]},location:{href:'https://test.invalid/app.html'},URL,Date,
 updateSegments(){},manageCategories(){},openBudgetAdd(){},openBudgetEdit(){},
 breakdown:()=>[],insightYear:()=>[{month:activeMonth}],insightMonths:()=>[{month:activeMonth,...smry,hasData:true}],
 insightCategoryDrilldown(){},openSheet(title,html){elem('#sheetBody').innerHTML=html;},
 closeSheet(){},navigate(){},setBudgetMonth(m){elem('#budgetMonthPicker').value=m;},
 window:{TraceInsights:{
  renderCategories(el){el.innerHTML='cat rendered';},
  renderAnnual(el){el.innerHTML='annual rendered';},
  renderTrend(el){el.innerHTML='trend rendered';},
  renderWealth(el){el.innerHTML='wealth rendered';}
 }}
};
const renderBudget=compile('renderBudget','\n/* Account defaults:',ctx);
test('renderBudget completes without selector error',()=>{
 renderBudget();assert.equal(elem('#annualBudgetChart').innerHTML,'annual rendered');
 assert.equal(elem('#budgetCategoryImpact').innerHTML,'cat rendered');
 assert.equal(typeof clicks.get('#annualBudgetChart [data-insight-month]')[0].onclick,'function');
});
const openAnnual=compile('openAnnualBudgetAnalysis','\n/* TRACE 5.37 UX',ctx);
test('annual details opens and months are clickable',()=>{
 openAnnual();assert.equal(typeof clicks.get('#traceAnnualDetail [data-insight-month]')[0].onclick,'function');
});
const drill=compile('insightCategoryDrilldown','\nfunction insightWealthData(',{
 ...ctx,txs:()=>[{id:'purchase',type:'expense',amountCAD:25,categoryId:'cat1'}],
 alloc:()=>25,monthLabel:m=>m,txRow:t=>'<button data-tx-open="'+t.id+'"></button>',
 editTransaction(){}
});
test('category drilldown attaches transaction links',()=>{
 state.categories=[{id:'cat1',name:'Courses',type:'expense'}];
 drill(activeMonth,'la','cat1');
 assert.equal(typeof clicks.get('[data-tx-open]')[0].onclick,'function');
});
const portfolioLedger=()=>({contributions:0,performance:0,value:300,cad:300,hasFx:true,configured:true});
const wealth=compile('openPortfolioAnalysis','\nfunction renderWealth(',{
 ...ctx,portfolioLedger,nativeMoney:n=>n+' $',shortAccountLabel:a=>a.name,
 bank:()=>({checking:100,cardDebt:20,net:80}),insightWealthData:()=>({})
 ,openInvestmentAccount(){}
});
test('wealth details links to accounts',()=>{
 wealth();assert.equal(elem('#traceWealthDetail').innerHTML,'wealth rendered');
 assert.equal(typeof clicks.get('[data-analysis-invest]')[0].onclick,'function');
});
const renderAnalysis=compile('renderAnalysis','\nfunction detail(',{
 ...ctx,scope:()=> 'la',analysisScope:'mine',
});
test('budget analysis scope selector responds',()=>{
 renderAnalysis();assert.equal(elem('#traceAnalysisTrend').innerHTML,'trend rendered');
 assert.equal(typeof clicks.get('#analysisScope .seg')[0].onclick,'function');
});
const activity=compile('renderActivity','\nfunction showTab(',{
 ...ctx,activityMonth:activeMonth,tab:'transactions',
 isFinancialPeriod:()=>true,visibleBankAccounts:()=>[{id:'checking'}],
 shortAccountLabel:a=>a?.name||'Courant',
 txRow:t=>'<button data-tx-open="'+t.id+'"></button>',
 editTransaction(){},showTab(t){elem('#activityTabCurrent').textContent=t;},
 window:{...ctx.window,TraceImportCalendar:{render(){elem('#calendarRendered').textContent='yes';}}}
});
test('Activity renders existing confirmed expense and income',()=>{
 state.accounts=[{id:'checking',name:'Courant',owner:'la',type:'checking'}];
 state.transactions=[
  {id:'tx_expense',accountId:'checking',date:activeMonth+'-12',type:'expense',status:'confirmed',name:'Épicerie',amountCAD:40},
  {id:'tx_salary',accountId:'checking',date:activeMonth+'-13',type:'income',status:'confirmed',name:'Salaire',amountCAD:100},
  {id:'tx_pending',accountId:'checking',date:activeMonth+'-14',type:'expense',status:'pending',name:'À vérifier',amountCAD:19}
 ];
 activity();
 assert.ok(elem('#transactionList').innerHTML.includes('tx_expense'));
 assert.ok(elem('#transactionList').innerHTML.includes('tx_salary'));
 assert.equal(elem('#activityExpenses').textContent,'40 $');
 assert.equal(elem('#activityIncome').textContent,'100 $');
 assert.equal(elem('#calendarRendered').textContent,'yes');
 assert.equal(typeof clicks.get('[data-tx-open]')[0].onclick,'function');
 assert.equal(elem('#activityTabCurrent').textContent,'transactions');
});
test('Activity renders without any transactions',()=>{
 state.transactions=[];
 activity();
 assert.ok(elem('#transactionList').innerHTML.includes('Aucune opération confirmée'));
});

console.log(checks+' interface scenarios passed');
