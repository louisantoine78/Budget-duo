'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8');
const w={window:{}};vm.runInNewContext(text,w);const M=w.window.TraceMovement;
const expenses=[
{id:'resto',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-10',splitAmounts:{la:25,partner:25,friends:50},name:'Restaurant'},
{id:'courses',type:'group_expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-11',splitAmounts:{friends:35},name:'Courses'},
{id:'other',type:'expense',status:'confirmed',payerId:'partner',beneficiary:'custom',date:'2026-10-10',splitAmounts:{friends:80}},
{id:'future',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-20',splitAmounts:{friends:80}}
];
const lines=[{expenseId:'resto',amountCAD:25},{expenseId:'courses',amountCAD:35}];
const payment=(id,amount,extras={})=>({id,type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',date:'2026-10-12',amountCAD:amount,accountId:'ca',...extras});
let n=0;function test(label,f){f();n++;console.log('PASS '+label);}
test('one bank transfer may pay two distinct advances',()=>{
 const x=M.validateRepaymentAllocations(lines,expenses,[],'la','2026-10-12',60);
 assert.equal(x.length,2);assert.equal(x[0].amountCAD,25);assert.equal(x[1].amountCAD,35);
});
test('remaining advance balances are exact',()=>{
 const tx=payment('pay',60,{repaymentAllocations:lines});
 assert.equal(M.paidForExpense([tx],'resto'),2500);assert.equal(M.paidForExpense([tx],'courses'),3500);
 const opts=M.linkable(expenses,[tx],'la','2026-10-13',1);
 assert.equal(opts.find(x=>x.id==='resto').remaining,25);
 assert.equal(opts.some(x=>x.id==='courses'),false);
});
test('legacy single relatedExpenseId is backward compatible',()=>{
 const tx=payment('old',20,{relatedExpenseId:'resto'});
 assert.equal(M.repaymentLines(tx).length,1);assert.equal(M.paidForExpense([tx],'resto'),2000);
});
test('legacy and multi linked repayments combine',()=>{
 const txs=[payment('old',20,{relatedExpenseId:'resto'}),
 payment('new',10,{repaymentAllocations:[{expenseId:'resto',amountCAD:10}]})];
 assert.equal(M.linkable(expenses,txs,'la','2026-10-13',1).find(x=>x.id==='resto').remaining,20);
});
test('pending bank receipt never closes receivable',()=>{
 const tx=payment('draft',60,{status:'pending',repaymentAllocations:lines});
 assert.equal(M.paidForExpense([tx],'resto'),0);
});
test('edit can exclude own bank receipt',()=>{
 const tx=payment('pay',60,{repaymentAllocations:lines});
 assert.equal(M.validateRepaymentAllocations(lines,expenses,[tx],'la','2026-10-12',60,'pay').length,2);
});
test('over-repayment blocked',()=>assert.throws(()=>M.validateRepaymentAllocations(
 [{expenseId:'resto',amountCAD:51}],expenses,[],'la','2026-10-12',51),/dépasse/));
test('unallocated difference blocked',()=>assert.throws(()=>M.validateRepaymentAllocations(
 [{expenseId:'resto',amountCAD:25}],expenses,[],'la','2026-10-12',60),/somme/));
test('repeated source blocked',()=>assert.throws(()=>M.validateRepaymentAllocations(
 [{expenseId:'resto',amountCAD:20},{expenseId:'resto',amountCAD:40}],expenses,[],'la','2026-10-12',60),/une fois/));
test('partner expense cannot be linked as own',()=>assert.throws(()=>M.validateRepaymentAllocations(
 [{expenseId:'other',amountCAD:60}],expenses,[],'la','2026-10-12',60),/introuvable/));
test('future expense cannot be linked',()=>assert.throws(()=>M.validateRepaymentAllocations(
 [{expenseId:'future',amountCAD:60}],expenses,[],'la','2026-10-12',60),/postérieure/));
test('all allocations use integral cents without surplus',()=>{
 const x=M.validateRepaymentAllocations([{expenseId:'resto',amountCAD:25.01},{expenseId:'courses',amountCAD:34.99}],
 expenses,[],'la','2026-10-12',60);
 assert.equal(x[0].amountCAD,25.01);assert.equal(x[1].amountCAD,34.99);
});
test('legacy single-link aware of multi-assignment',()=>{
 const tx=payment('pay',60,{repaymentAllocations:lines});
 assert.throws(()=>M.validateLink('resto',expenses,[tx],'la','2026-10-13',30),/dépasse/);
});
test('ordinary income never participates in advance repayment',()=>{
 assert.equal(M.repaymentLines({type:'income',relatedExpenseId:'resto',amountCAD:60}).length,0);
});
console.log(n+' multi-advance tests passed');
