'use strict';
// Isolated debit differe purchase simulator from genuine TRACE engine and UI.
// All figures, accounts, dates and browser controls are fictional.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const fx=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-deferred-debit-1.0.0.js'),'utf8');
const from=app.indexOf('function traceDeferredPurchaseProjection('),
 to=app.indexOf('function openTraceAccountDetail(',from);
assert.ok(from>0&&to>from);
const code=app.slice(from,to),checks=[];
const card={id:'card',type:'card',paymentMode:'deferred',owner:'la',
 currency:'EUR',country:'FR',settlementAccountId:'current'};
const current={id:'current',type:'checking',owner:'la',currency:'EUR',country:'FR'};
function context(extra={}){
 const window={};vm.runInNewContext(fx,{window});
 if(!extra.withoutEngine)vm.runInNewContext(engine,{window});
 const state={accounts:[current,card],transactions:[]},snapshot=JSON.stringify(state);
 if(extra.changeAccounts)extra.changeAccounts(state.accounts);
 const nodes={},makeNode=()=>({value:'',innerHTML:'',textContent:'',
  addEventListener(name,callback){this['on'+name]=callback}});
 const $=s=>nodes[s]||(nodes[s]=makeNode());
 const funcs=new Function('state','window','me','accountType','localDateISO','esc','$',
  code+'return {project:traceDeferredPurchaseProjection,form:traceDeferredPurchaseForm,bind:bindTraceDeferredPurchaseForm};')(
  state,window,'la',a=>a?.type,()=>extra.today||'2026-10-20',
  x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),$);
 return{...funcs,window,state,nodes,$,unchanged:()=>JSON.stringify(state)===snapshot};
}
const fields={amount:'40,00',purchaseDate:'2026-10-12',
 budgetDate:'2026-10-20',dueDate:'2026-11-05'};
test('40 EUR hypothetical purchase impacts one budget month, no checking debit',()=>{
 const c=context(),r=c.project(card,fields);
 assert.equal(r.amount,40);assert.equal(r.month,'2026-10');
 assert.equal(r.monthBudget,40);assert.equal(r.liability,40);
 assert.equal(r.checkingMovement,0);assert.equal(r.status,'scheduled');
 assert.equal(c.unchanged(),true);
});
test('different month for budget is distinct from purchase and due',()=>{
 const c=context(),r=c.project(card,{...fields,budgetDate:'2026-11-01'});
 assert.equal(r.month,'2026-11');assert.equal(r.monthBudget,40);
});
test('future purchase is a scenario as-of its future date, not a current booking',()=>{
 const c=context(),r=c.project(card,{...fields,purchaseDate:'2026-11-02',
  budgetDate:'2026-11-02',dueDate:'2026-12-05'});
 assert.equal(r.asOfDate,'2026-11-02');assert.equal(r.checkingMovement,0);
});
test('safely accepts two-decimal comma or dot input',()=>{
 const c=context();
 assert.equal(c.project(card,{...fields,amount:'12.35'}).amount,12.35);
 assert.equal(c.project(card,{...fields,amount:'12,35'}).amount,12.35);
});
test('fractional cents, letters, empty, negative and zero are refused',()=>{
 const c=context();
 for(const amount of ['40.001','','1e3','-1','0','NaN','Infinity','40,999'])
  assert.throws(()=>c.project(card,{...fields,amount}),/Montant/);
});
test('all three dates must be real calendar days and entered explicitly',()=>{
 const c=context();
 for(const name of ['purchaseDate','budgetDate','dueDate']){
  assert.throws(()=>c.project(card,{...fields,[name]:''}),/trois dates/);
  assert.throws(()=>c.project(card,{...fields,[name]:'2026-02-30'}),/trois dates/);
 }
});
test('no earlier due date than bank purchase or budget date',()=>{
 const c=context();
 assert.throws(()=>c.project(card,{...fields,dueDate:'2026-10-11'}),/précéder/);
 assert.throws(()=>c.project(card,{...fields,budgetDate:'2026-11-10'}),/précéder/);
});
test('requires a valid linked account, currency, owner and banking model',()=>{
 const c=context();
 assert.throws(()=>c.project({...card,settlementAccountId:'missing'},fields),/lié/);
 assert.throws(()=>c.project({...card,currency:'USD'},fields),/incompatibles/);
 assert.throws(()=>c.project({...card,owner:'partner'},fields),/lié/);
 assert.throws(()=>c.project({...card,paymentMode:'credit'},fields),/pas une carte/);
});
test('no module means a clear error and no invented financial numbers',()=>{
 const c=context({withoutEngine:true});
 assert.throws(()=>c.project(card,fields),/indisponible/);
});
test('interface clearly labels planned debit and cannot submit or write',()=>{
 const c=context(),html=c.form(card);
 assert.match(html,/Date d’achat/);assert.match(html,/Date d’impact sur le budget/);
 assert.match(html,/Date prévue de prélèvement/);
 assert.match(html,/sans enregistrer/);
 assert.doesNotMatch(html,/type="submit"/);
 assert.equal(c.form({...card,paymentMode:'credit'}),'');
});
test('UI preview shows isolated expense and liability, never real account total',()=>{
 const c=context();c.form(card);c.bind(card);
 const ids=['#traceDeferredForecastAmount','#traceDeferredForecastPurchase',
  '#traceDeferredForecastBudget','#traceDeferredForecastDue'];
 [fields.amount,fields.purchaseDate,fields.budgetDate,fields.dueDate].forEach((v,i)=>{
  c.$(ids[i]).value=v;});
 c.$('#traceDeferredForecastRun').onclick();
 const html=c.$('#traceDeferredForecastResult').innerHTML;
 assert.match(html,/40,00/);assert.match(html,/Compte courant/);
 assert.match(html,/ne représente pas la dette totale/);
 assert.equal(c.unchanged(),true);
});
test('edited input immediately invalidates the old UI projection',()=>{
 const c=context();c.bind(card);const field=c.$('#traceDeferredForecastAmount');
 assert.equal(typeof field.oninput,'function');field.oninput();
 assert.match(c.$('#traceDeferredForecastResult').textContent,/Paramètres modifiés/);
});
test('name and card owner limitations prevent partner controls',()=>{
 const c=context();
 assert.equal(c.form({...card,owner:'partner'}),'');
 assert.equal(c.form({...card,archived:true}),'');
});
test('account details wire form and listener, distinct from read-only due report',()=>{
 const segment=app.slice(app.indexOf('function openTraceAccountDetail('),
  app.indexOf('function openTraceAccountActivity('));
 assert.match(segment,/traceDeferredAccountReview\(a\)\+/);
 assert.match(segment,/traceDeferredPurchaseForm\(a\)\+/);
 assert.match(segment,/bindTraceDeferredPurchaseForm\(a\)/);
 assert.doesNotMatch(code,/saveDocument|state\.transactions\.push|state\.household\s*=/);
});

test('ordinary credit card and foreign partner never bind missing simulator nodes',()=>{
 const c=context();
 c.bind({...card,paymentMode:'credit'});
 c.bind({...card,owner:'partner'});
 c.bind({...card,archived:true});
 assert.equal(Object.keys(c.nodes).length,0);
});
