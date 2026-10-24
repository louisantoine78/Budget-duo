'use strict';
/* Read-only fixture tests: named friend ledger + safe imported foreign reimbursements. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8'),window={};
vm.runInNewContext(read('trace-movement-5.36.0.js'),{window});
vm.runInNewContext(read('trace-international-1.0.0.js'),{window});
const M=window.TraceMovement,I=window.TraceInternational,app=read('v5-app-5.37.0.js');
const euros={id:'eur',name:'Compte France',owner:'la',type:'checking',country:'FR',currency:'EUR'};
const restaurant={id:'r1',name:'Restaurant',status:'confirmed',type:'expense',payerId:'la',
 beneficiary:'custom',date:'2026-10-10',friendDebtorName:'Camille',splitAmounts:{friends:50}};
const groceries={id:'r2',name:'Courses',status:'confirmed',type:'expense',payerId:'la',
 beneficiary:'custom',date:'2026-10-11',friendDebtorName:'camille',splitAmounts:{friends:35}};
const older={id:'r3',name:'Ancienne avance',status:'confirmed',type:'expense',payerId:'la',
 beneficiary:'custom',date:'2026-10-10',splitAmounts:{friends:40}};
const partner={id:'partner-exp',name:'Part partenaire',status:'confirmed',type:'expense',
 payerId:'partner',beneficiary:'custom',date:'2026-10-10',friendDebtorName:'Camille',splitAmounts:{friends:20}};
const repayment={id:'pay',type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',
 accountId:'eur',date:'2026-10-12',bankCurrency:'EUR',bankAmount:40,amountCAD:60,
 bankRateCad:1.5,fxRateDate:'2026-10-12',fxRateSource:'Taux vérifié',counterparty:'Camille',
 importFingerprint:'proof-60',repaymentAllocations:[{expenseId:'r1',amountCAD:25},{expenseId:'r2',amountCAD:35}]};
const transactions=[restaurant,groceries,older,partner,repayment];
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name)}
test('named Camille receivables merge case-insensitively',()=>{
 const r=M.friendReceivables(transactions,'la');assert.equal(r[0].name,'Camille');
 assert.equal(r[0].advancedCAD,85);assert.equal(r[0].receivedCAD,60);
 assert.equal(r[0].outstandingCAD,25);assert.equal(r[0].advances.length,2);
});
test('unnamed historic friends share remains unassigned, not attributed to sender',()=>{
 const r=M.friendReceivables(transactions,'la');const unknown=r.find(x=>x.unassigned);
 assert.equal(unknown.outstandingCAD,40);assert.equal(unknown.receivedCAD,0);
 assert.equal(r.reduce((a,x)=>a+x.outstandingCAD,0),65);
});
test('partner advances stay separate from other owner',()=>{
 const r=M.friendReceivables(transactions,'partner');
 assert.equal(r.length,1);assert.equal(r[0].outstandingCAD,20);
});
test('repayments already linked reduce receivable only once',()=>{
 assert.equal(M.paidForExpense(transactions,'r1'),2500);
 assert.equal(M.paidForExpense(transactions,'r2'),3500);
});
test('legacy single-link and partial payments reduce same named debtor',()=>{
 const old={id:'old',type:'external_refund',transferPurpose:'friend_reimbursement',
 status:'confirmed',relatedExpenseId:'r1',amountCAD:10};
 const r=M.friendReceivables([...transactions,old],'la');
 assert.equal(r[0].receivedCAD,70);assert.equal(r[0].outstandingCAD,15);
});
test('unconfirmed receipt cannot settle a friend debt',()=>{
 const draft={...repayment,id:'draft',status:'pending'};
 assert.equal(M.friendReceivables([restaurant,groceries,draft],'la')[0].outstandingCAD,85);
});
test('foreign historical FX valuation is accepted only with stored evidence',()=>{
 const q=I.verifiedForeignFriendRefund(repayment,euros);
 assert.equal(q.bankAmount,40);assert.equal(q.amountCAD,60);assert.equal(q.bankRateCad,1.5);
});
test('missing FX source rejects association edits',()=>{
 assert.throws(()=>I.verifiedForeignFriendRefund({...repayment,fxRateSource:''},euros),/Date et source/);
});
test('CAD rate mismatch rejects association edits',()=>{
 assert.throws(()=>I.verifiedForeignFriendRefund({...repayment,bankRateCad:1.2},euros),/Contre-valeur/);
});
test('missing native bank amount cannot be treated as zero',()=>{
 assert.throws(()=>I.verifiedForeignFriendRefund({...repayment,bankAmount:null},euros),/historiques/);
});
const start=app.indexOf('function editForeignFriendRepayment('),
 end=app.indexOf('\nfunction editForeignExpenseMetadata(',start);
assert.ok(start>0&&end>start);
function editor(bankTx=repayment){
 const nodes=new Map(),saved=[],state={accounts:[euros],transactions:[restaurant,groceries,older,partner,bankTx]};
 let heading='',markup='';
 function $(selector){
  const key=selector.replace(/^#/,'');if(!nodes.has(key)){
   const node={value:'',textContent:'',disabled:false,onclick:null,onchange:null,oninput:null,
    classList:{add(){},remove(){}}};
   if(key==='foreignFriendOther'){
    let html='',links=[],amounts=[],remove=[];
    Object.defineProperty(node,'innerHTML',{set:v=>{
     html=v;const ids=[...String(v).matchAll(/data-foreign-expense="(\d+)"/g)].map(m=>m[1]);
     links=ids.map(i=>({dataset:{foreignExpense:i},value:'',onchange:null}));
     amounts=ids.map(i=>({dataset:{foreignAmount:i},value:'',oninput:null}));
     remove=ids.map(i=>({dataset:{foreignRemove:i},onclick:null}));
    },get:()=>html});
    node.querySelectorAll=s=>s==='[data-foreign-expense]'?links:
     s==='[data-foreign-amount]'?amounts:s==='[data-foreign-remove]'?remove:[];
   }else node.innerHTML='';
   nodes.set(key,node);
  }
  return nodes.get(key);
 }
 const dependencies={state,me:'la',window,$,accountType:a=>a?.type,
  openSheet:(title,body)=>{heading=title;markup=body;},closeSheet:()=>{},
  shortAccountLabel:a=>a?.name||'',esc:s=>String(s??''),friendLinkOptions:(date,amount,excluding)=>
    M.linkable(state.transactions,state.transactions,'la',date,amount,excluding),
  saveDocument:async(collection,item)=>saved.push({collection,item:JSON.parse(JSON.stringify(item))}),
  renderAll:()=>{},navigate:()=>{},showTab:()=>{}};
 const fn=new Function(...Object.keys(dependencies),
  'return ('+app.slice(start,end)+');')(...Object.values(dependencies));
 fn(bankTx);
 return{$,saved,heading,markup,state};
}
test('foreign editor exposes verified native and CAD values without changing bank fields',()=>{
 const s=editor();
 assert.match(s.heading,/international/);assert.match(s.markup,/40,00/);
 assert.match(s.markup,/60,00/);assert.match(s.markup,/Taux vérifié/);
 assert.equal(s.saved.length,0);
});
test('foreign editor missing FX shows blocked screen with no save',()=>{
 const s=editor({...repayment,fxRateSource:''});
 assert.match(s.heading,/Taux/);assert.equal(s.$('#foreignFriendSave').onclick,null);
 assert.equal(s.saved.length,0);
});
async function interactive(){
 async function caseRun(name,fn){await fn();n++;console.log('PASS '+name);}
 await caseRun('foreign imported receipt gets two allocations without new bank receipt',async()=>{
  const t={...repayment,id:'unlinked',repaymentAllocations:null},s=editor(t),$=s.$;
  $('#foreignFriendFirst').value='r1';$('#foreignFriendFirstAmount').value='25';
  $('#foreignFriendName').value='Camille';
  $('#foreignFriendAdd').onclick();
  const host=$('#foreignFriendOther'),select=host.querySelectorAll('[data-foreign-expense]')[0],
   amount=host.querySelectorAll('[data-foreign-amount]')[0];
  select.value='r2';select.onchange();amount.value='35';amount.oninput();
  await $('#foreignFriendSave').onclick();assert.equal(s.saved.length,1);
  const row=s.saved[0].item;
  assert.equal(row.id,'unlinked');assert.equal(row.accountId,'eur');
  assert.equal(row.bankAmount,40);assert.equal(row.amountCAD,60);
  assert.equal(row.bankRateCad,1.5);assert.equal(row.fxRateDate,'2026-10-12');
  assert.equal(row.fxRateSource,'Taux vérifié');assert.equal(row.importFingerprint,'proof-60');
  assert.equal(row.repaymentAllocations.length,2);assert.equal(row.counterparty,'Camille');
  assert.equal(s.saved[0].collection,'transactions');
 });
 await caseRun('partial foreign bank allocation never overwrites historical data',async()=>{
  const t={...repayment,id:'partial',repaymentAllocations:null},s=editor(t),$=s.$;
  $('#foreignFriendFirst').value='r1';$('#foreignFriendFirstAmount').value='25';
  await $('#foreignFriendSave').onclick();
  assert.equal(s.saved.length,0);assert.match($('#foreignFriendError').textContent,/somme/);
  assert.equal(t.importFingerprint,'proof-60');assert.equal(t.amountCAD,60);
 });
 await caseRun('foreign refund overpay is refused without mutating original',async()=>{
  const t={...repayment,id:'over',repaymentAllocations:null},s=editor(t),$=s.$;
  $('#foreignFriendFirst').value='r1';$('#foreignFriendFirstAmount').value='60';
  await $('#foreignFriendSave').onclick();assert.equal(s.saved.length,0);
  assert.match($('#foreignFriendError').textContent,/dépasse/);
 });
 console.log(n+' named friend and foreign refund guards passed');
}
interactive().catch(err=>{console.error('FAIL',err);process.exitCode=1;});
