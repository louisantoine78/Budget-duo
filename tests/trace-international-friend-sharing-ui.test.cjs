'use strict';
/* Real existing Share view, mocked presentation, fictional data only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8'),app=read('v5-app-5.37.0.js'),w={};
vm.runInNewContext(read('trace-movement-5.36.0.js'),{window:w});
vm.runInNewContext(read('trace-international-1.0.0.js'),{window:w});
const start=app.indexOf('function openSharing('),end=app.indexOf('\nfunction openSettlement(',start);
assert.ok(start>=0&&end>start,'missing Share view');
const code=app.slice(start,end);
function draw(transactions,balance=120){
 const state={household:{sharingOpeningBalance:0,referenceDate:'2026-10-01'},transactions};
 const nodes=new Map(),$=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{onclick:null});return nodes.get(selector);
 };
 let title='',html='';
 const deps={state,me:'la',window:w,coupleBalance:()=>balance,sharingHistory:()=>[],
  openSheet:(t,s)=>{title=t;html=s;},uiIcon:()=>'',member:id=>({name:id==='la'?'Moi':'Élise'}),
  shortMemberName:id=>id==='la'?'Moi':'Élise',
  money:n=>String(n)+' CAD',esc:x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  $,openSettlement:()=>{},editTricountOpening:()=>{}};
 const fn=new Function(...Object.keys(deps),'return ('+code+');')(...Object.values(deps));
 fn();return{title,html};
}
const transactions=[
 {id:'a',name:'Restaurant',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-10',friendDebtorName:'Camille',splitAmounts:{friends:50}},
 {id:'b',name:'Courses',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-11',friendDebtorName:'camille',splitAmounts:{friends:35}},
 {id:'c',name:'Ancienne avance',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-11',splitAmounts:{friends:40}},
 {id:'d',name:'Chez Élise',type:'expense',status:'confirmed',payerId:'partner',beneficiary:'custom',date:'2026-10-11',friendDebtorName:'Alex',splitAmounts:{friends:20}},
 {id:'pay',type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',amountCAD:60,repaymentAllocations:[{expenseId:'a',amountCAD:25},{expenseId:'b',amountCAD:35}]}
];
let count=0;function test(n,f){f();count++;console.log('PASS '+n);}
test('Share shows outstanding for named friend and legacy unknown without changing couple balance',()=>{
 const out=draw(transactions,120);
 assert.match(out.title,/Partage du couple/);assert.match(out.html,/Avances aux proches/);
 assert.match(out.html,/Camille/);assert.match(out.html,/À attribuer/);
 assert.match(out.html,/85,00/);assert.match(out.html,/120 CAD/);
 assert.match(out.html,/Historique partagé/);
});
test('Share does not pretend unknown historical receivables belong to named bank sender',()=>{
 const out=draw(transactions);
 assert.match(out.html,/Ancienne avance/);
 assert.match(out.html,/40,00/);
});
test('Share empty state remains usable with no fictional ledger entries',()=>{
 const out=draw([],0);
 assert.match(out.html,/Aucune avance aux proches/);
 assert.match(out.html,/équilibre/);
});
test('all three entry routes retain optional named friend fields',()=>{
 assert.match(app,/id="manualFriendDebtorName"/);
 assert.match(app,/id="smartMovementDebtorName"/);
 assert.match(app,/id="txFriendDebtorName"/);
});
console.log(count+' Share view named-ledger smoke checks passed');
