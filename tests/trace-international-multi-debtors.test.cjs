'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const w={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8'),w);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8'),w);
const M=w.window.TraceMovement;
const I=w.window.TraceInternational;
const e={id:'meal',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-05',
 amountCAD:120,splitAmounts:{la:45,partner:25,friends:50},
 friendDebtorShares:[{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]};
const r={id:'p',type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',
 date:'2026-10-06',counterparty:'Camille',amountCAD:15,repaymentAllocations:[{expenseId:'meal',amountCAD:15}]};
const due=name=>M.friendReceivables([e,r],'la').find(x=>x.name===name).outstandingCAD;
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('two named shares add to bank-advanced friends amount',()=>{
 assert.equal(M.validateFriendDebtorShares(e.friendDebtorShares,50).length,2);
});
test('Camille partial refund leaves Alex untouched',()=>{
 assert.equal(due('Camille'),15);assert.equal(due('Alex'),20);
});
test('Camille cannot overpay after prior fifteen',()=>{
 assert.throws(()=>M.validateRepaymentAllocations([{expenseId:'meal',amountCAD:16}],
 [e],[e,r],'la','2026-10-09',16,'','Camille'),/dépasse/);
});
test('unknown payer cannot settle a named debtor',()=>{
 assert.throws(()=>M.validateRepaymentAllocations([{expenseId:'meal',amountCAD:10}],
 [e],[e],'la','2026-10-09',10,'',''),/Choisis le proche/);
});
test('duplicate friend names rejected',()=>{
 assert.throws(()=>M.validateFriendDebtorShares([{name:'Camille',amountCAD:30},
 {name:'camille',amountCAD:20}],50),/double/);
});
test('wrong allocation total rejected',()=>{
 assert.throws(()=>M.validateFriendDebtorShares([{name:'Camille',amountCAD:30},
 {name:'Alex',amountCAD:19}],50),/somme/);
});
test('cannot lower named debt below confirmed payment',()=>{
 assert.throws(()=>M.validateFriendDebtorShares([{name:'Camille',amountCAD:10},
 {name:'Alex',amountCAD:40}],50,[e,r],'meal'),/remboursements/);
});
test('legacy unnamed advance stays unassigned',()=>{
 assert.equal(M.friendReceivables([{...e,friendDebtorShares:null}],'la')[0].unassigned,true);
});

test('card purchase 120 with friends 50 and partner 25 has one consumption expense',()=>{
 const x=M.impact('expense',120,'custom','la',{la:50,partner:50},50,25);
 assert.equal(x.bank,-120);assert.equal(x.budget.la,45);
 assert.equal(x.budget.partner,25);assert.equal(x.budget.couple,70);assert.equal(x.friends,50);
});
test('linked Mastercard settlement 100 is budget neutral',()=>{
 const current={id:'ca',type:'checking',owner:'la',country:'CA',currency:'CAD'};
 const card={id:'mc',type:'card',owner:'la',country:'CA',currency:'CAD',settlementAccountId:'ca'};
 const tx={id:'payment',type:'transfer',status:'confirmed',name:'Mastercard',date:'2026-10-12',
  accountId:'ca',toAccountId:'mc',amountCAD:100};
 const booked=I.resolveTransferEdit({transaction:tx,from:current,to:card,bankAmount:100,receivedAmount:100});
 assert.equal(booked.bankAmount,100);assert.equal(booked.toBankAmount,100);
 assert.equal(M.impact('card_payment',100,'la').budget.couple,0);
 assert.equal(I.amountOnAccount(booked,current),100);
 assert.equal(I.amountOnAccount(booked,card,'destination'),100);
});
test('friend reimbursement is inbound cash but never earned income',()=>{
 const x=M.impact('friend_reimbursement',15,'la');assert.equal(x.bank,15);
 assert.equal(x.budget.la,0);assert.equal(x.budget.partner,0);
});
test('merchant refund lowers expense budget and is not a friend receipt',()=>{
 const x=M.impact('refund',20,'la');assert.equal(x.bank,20);
 assert.equal(x.budget.la,-20);assert.equal(x.budget.couple,-20);
 assert.equal(M.repaymentLines({type:'refund',amountCAD:20,relatedExpenseId:'meal'}).length,0);
});
test('one incoming bank receipt allocates 25+35 without duplicate transaction',()=>{
 const a={...e,id:'restaurant',friendDebtorShares:null,friendDebtorName:'Camille',splitAmounts:{friends:25}};
 const b={...e,id:'groceries',friendDebtorShares:null,friendDebtorName:'Camille',splitAmounts:{friends:35}};
 const lines=M.validateRepaymentAllocations([{expenseId:'restaurant',amountCAD:25},{expenseId:'groceries',amountCAD:35}],
  [a,b],[a,b],'la','2026-10-10',60,'','Camille');
 const receipt={id:'bank-60',type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',
  amountCAD:60,repaymentAllocations:lines};
 assert.equal(M.repaymentLines(receipt).length,2);
 assert.equal(M.paidForExpense([a,b,receipt],'restaurant'),2500);
 assert.equal(M.paidForExpense([a,b,receipt],'groceries'),3500);
});
test('legacy repayment link is overridden by new allocations without double booking',()=>{
 const t={type:'external_refund',transferPurpose:'friend_reimbursement',amountCAD:60,relatedExpenseId:'old',
  repaymentAllocations:[{expenseId:'restaurant',amountCAD:25},{expenseId:'groceries',amountCAD:35}]};
 assert.equal(M.repaymentLines(t).length,2);
 assert.equal(M.repaymentLines(t).some(x=>x.expenseId==='old'),false);
});
test('individual named friend debt cannot be repaid under wrong name',()=>{
 assert.throws(()=>M.validateRepaymentAllocations([{expenseId:'meal',amountCAD:10}],
  [e],[e,r],'la','2026-10-12',10,'','AlexWrong'),/Choisis le proche/);
});
test('partner receivables remain independent from my friends',()=>{
 const ep={...e,id:'partner-meal',payerId:'partner',friendDebtorShares:[{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]};
 const mine=M.friendReceivables([e,r,ep],'la');
 const partner=M.friendReceivables([e,r,ep],'partner');
 assert.equal(mine.find(x=>x.name==='Camille').outstandingCAD,15);
 assert.equal(partner.find(x=>x.name==='Camille').outstandingCAD,30);
});
test('verified EUR friend receipt preserves historical CAD and import proof',()=>{
 const bank={id:'fr',owner:'la',type:'checking',country:'FR',currency:'EUR'};
 const receipt={id:'eur-pay',accountId:'fr',type:'external_refund',transferPurpose:'friend_reimbursement',
  status:'confirmed',date:'2026-10-12',bankCurrency:'EUR',bankAmount:40,amountCAD:60,
  bankRateCad:1.5,fxRateDate:'2026-10-12',fxRateSource:'Taux documenté',importFingerprint:'unchanged'};
 const before=JSON.stringify(receipt),v=I.verifiedForeignFriendRefund(receipt,bank);
 assert.equal(v.bankAmount,40);assert.equal(v.amountCAD,60);
 assert.equal(JSON.stringify(receipt),before);
 assert.throws(()=>I.verifiedForeignFriendRefund({...receipt,fxRateSource:''},bank),/Date et source/);
});
test('unverified EUR conversion never defaults to 1:1',()=>{
 const bank={id:'fr',owner:'la',type:'checking',country:'FR',currency:'EUR'};
 assert.throws(()=>I.resolveBooking({account:bank,bankAmount:46.2,
  originalCurrency:'USD',originalAmount:50,date:'2026-10-12'}),/Taux CAD requis/);
});
test('CAD-EUR transfer fee stays inside bank debit, not a new expense',()=>{
 const ca={id:'ca',owner:'la',type:'checking',country:'CA',currency:'CAD'};
 const fr={id:'fr',owner:'la',type:'checking',country:'FR',currency:'EUR'};
 const tx={id:'wire',name:'Transfert Europe',status:'confirmed',type:'transfer',date:'2026-10-12',
  accountId:'ca',toAccountId:'fr'};
 const booked=I.resolveTransferEdit({transaction:tx,from:ca,to:fr,bankAmount:150,receivedAmount:95,feeAmount:5});
 assert.equal(booked.bankAmount,150);assert.equal(booked.toBankAmount,95);
 assert.equal(booked.transferFeeAmount,5);assert.equal(booked.transferFeeIncludedInDebit,true);
 assert.equal(M.impact('transfer',150,'la').budget.couple,0);
});
test('missing foreign destination cannot be inferred from CAD',()=>{
 const fr={id:'fr',owner:'la',type:'checking',country:'FR',currency:'EUR'};
 assert.equal(I.amountOnAccount({amountCAD:100,bankCurrency:'CAD'},fr,'destination'),null);
});

console.log(n+' multi-debtor financial tests passed');