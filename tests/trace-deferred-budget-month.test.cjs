'use strict';
// TRACE 5.37 candidate: purchase-date versus budget-date accounting.
// These assertions run the candidate's real txs/summary/breakdown functions,
// with fictional accounts and no data writes or remote dependencies.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const eng=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const begin=app.indexOf('function traceBudgetPostingMonth(');
const end=app.indexOf('function months6(',begin);
assert.ok(begin>=0&&end>begin,'Budget month selector must be defined');
const factory=app.slice(begin,end);
function fixture(){
 const window={};vm.runInNewContext(eng,{window});
 const state={
  transactions:[],
  budgets:[{month:'2026-10',categoryId:'food',amount:80},
   {month:'2026-11',categoryId:'food',amount:100}],
  categories:[{id:'food',type:'expense',name:'Courses',archived:false}]
 };
 const funcs=new Function('state','window','isFinancialPeriod','split','alloc','budgetAmt','cat',
  factory+'return {posting:traceBudgetPostingMonth,txs,summary,breakdown};')(
  state,window,()=>true,()=>0,
  t=>t.amountCAD,b=>b.amount,id=>state.categories.find(x=>x.id===id));
 const add=t=>state.transactions.push({status:'confirmed',beneficiary:'la',payerId:'la',
  categoryId:'food',...t});
 return{...funcs,state,add};
}
test('a deferred purchase consumes its explicit budget month, not purchase month',()=>{
 const c=fixture();c.add({id:'p',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-11-01',dueDate:'2026-12-05',amountCAD:40});
 assert.equal(c.summary('2026-10','la').expense,0);
 assert.equal(c.summary('2026-11','la').expense,40);
 assert.equal(c.breakdown('2026-11','la')[0].actual,40);
});
test('historical ordinary expenses retain their original purchase month',()=>{
 const c=fixture();c.add({id:'old',type:'expense',date:'2026-10-10',amountCAD:25});
 assert.equal(c.summary('2026-10','la').expense,25);
 assert.equal(c.summary('2026-11','la').expense,0);
});
test('credit-card payment is never a second expense in the debit month',()=>{
 const c=fixture();
 c.add({id:'buy',type:'expense',deferredKind:'purchase',date:'2026-10-18',
  budgetDate:'2026-10-20',amountCAD:60});
 c.add({id:'bank',type:'transfer',date:'2026-11-05',amountCAD:60});
 assert.equal(c.summary('2026-10','la').expense,60);
 assert.equal(c.summary('2026-11','la').expense,0);
 assert.equal(c.summary('2026-11','la').income,0);
});
test('explicit deferred merchant refund reverses its chosen budget month',()=>{
 const c=fixture();
 c.add({id:'buy',type:'expense',deferredKind:'purchase',date:'2026-10-10',
  budgetDate:'2026-11-01',amountCAD:40});
 c.add({id:'refund',type:'refund',deferredKind:'merchant_refund',
  date:'2026-10-15',budgetDate:'2026-11-02',amountCAD:10});
 assert.equal(c.summary('2026-10','la').expense,0);
 assert.equal(c.summary('2026-11','la').expense,30);
});
test('ordinary merchant refunds remain in the original bank-date period',()=>{
 const c=fixture();
 c.add({id:'buy',type:'expense',date:'2026-10-01',amountCAD:40});
 c.add({id:'refund',type:'refund',date:'2026-10-15',amountCAD:10});
 assert.equal(c.summary('2026-10','la').expense,30);
});
test('malformed deferred budget dates are NOT guessed from purchase date',()=>{
 const c=fixture();c.add({id:'bad',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-02-30',amountCAD:50});
 assert.equal(c.posting(c.state.transactions[0]),null);
 assert.equal(c.summary('2026-10','la').expense,0);
 assert.equal(c.summary('2026-02','la').expense,0);
});
test('missing deferred budget date fails closed instead of booking in bank month',()=>{
 const c=fixture();c.add({id:'bad',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',amountCAD:50});
 assert.equal(c.posting(c.state.transactions[0]),null);
 assert.equal(c.txs('2026-10','la').length,0);
});
test('pending deferred item does not affect confirmed budgets',()=>{
 const c=fixture();c.add({id:'pending',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-11-01',amountCAD:40,status:'pending'});
 assert.equal(c.summary('2026-11','la').expense,0);
 assert.equal(c.txs('2026-11','la',false).length,1);
});
test('CAD foreign FX booked value, not native amount, enters budget period',()=>{
 const c=fixture();c.add({id:'eur',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-11-01',
  bankAmount:40,bankCurrency:'EUR',amountCAD:64});
 assert.equal(c.summary('2026-11','la').expense,64);
});
test('an untagged custom legacy budgetDate cannot retroactively move history',()=>{
 const c=fixture();c.add({id:'legacy',type:'expense',
  date:'2026-10-10',budgetDate:'2026-11-01',amountCAD:40});
 assert.equal(c.summary('2026-10','la').expense,40);
 assert.equal(c.summary('2026-11','la').expense,0);
});
test('different personal and couple scopes cannot duplicate the booked expense',()=>{
 const c=fixture();c.add({id:'p',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-11-01',amountCAD:40});
 assert.equal(c.summary('2026-11','la').expense,40);
 assert.equal(c.summary('2026-11','couple').expense,40);
 assert.equal(c.summary('2026-11','partner').expense,0);
});
test('bank date stays untouched by selection of budget posting month',()=>{
 const c=fixture();c.add({id:'p',type:'expense',deferredKind:'purchase',
  date:'2026-10-10',budgetDate:'2026-11-01',amountCAD:40});
 c.summary('2026-11','la');
 assert.equal(c.state.transactions[0].date,'2026-10-10');
});
