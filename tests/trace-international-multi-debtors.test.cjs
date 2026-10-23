'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const w={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8'),w);
const M=w.window.TraceMovement;
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
console.log(n+' multi-debtor financial tests passed');