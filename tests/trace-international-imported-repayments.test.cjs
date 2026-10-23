'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const get=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8'),code=get('v5-app-5.37.0.js'),w={};
vm.runInNewContext(get('trace-movement-5.36.0.js'),{window:w});
vm.runInNewContext(get('trace-international-1.0.0.js'),{window:w});
const M=w.TraceMovement;
w.TraceOperationUI={kindsFor:(a,dir)=>M.kinds.filter(x=>x.direction===(dir==='in'?1:-1)),options:()=>'',enhanceBankMovement(){}};
const bank={id:'ca',owner:'la',type:'checking',currency:'CAD',name:'Courant'};
const expenses=[{id:'resto',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-10',name:'Restaurant',splitAmounts:{friends:50}},
 {id:'courses',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-11',name:'Courses',splitAmounts:{friends:35}}];
const start=code.indexOf('function editSmartBankMovement('),end=code.indexOf('\nfunction cardPaymentEvidenceFor(',start);
assert.ok(start>0&&end>start);
function setup(){
 const bankTx={id:'existing-bank-receipt',type:'external_refund',transferPurpose:'friend_reimbursement',
  status:'confirmed',date:'2026-10-12',name:'Virement Camille',accountId:'ca',bankCurrency:'CAD',
  bankAmount:60,amountCAD:60,importFingerprint:'bank-proof',payerId:'la'};
 const state={accounts:[bank],transactions:[...expenses,bankTx],investmentAccounts:[],household:{}},nodes=new Map(),writes=[];
 const defaults={smartMovementName:bankTx.name,smartMovementAmount:'60',smartMovementDate:bankTx.date,
  smartMovementFrom:'ca',smartMovementType:'friend_reimbursement',smartMovementLink:'',
  smartMovementFirstAmount:'',smartMovementFriendName:'Camille',smartMovementWho:'la',
  smartMovementFriends:'0',smartMovementPartner:'0'};
 const $=selector=>{
  const id=selector.replace(/^#/,'');
  if(!nodes.has(id)){
   const x={id,value:defaults[id]??'',dataset:{},textContent:'',disabled:false,innerHTML:'',
    classList:{toggle(){},add(){}},addEventListener(){},
    closest:()=>({querySelector:()=>({classList:{toggle(){}}})}),querySelectorAll:()=>[]};
   if(id==='smartMovementMoreLinks'){
    let links=[],amounts=[],remove=[],html='';
    Object.defineProperty(x,'innerHTML',{set:v=>{html=v;
     const indices=[...v.matchAll(/data-repay-expense="(\d+)"/g)].map(m=>m[1]);
     links=indices.map(i=>({value:'',dataset:{repayExpense:i}}));
     amounts=indices.map(i=>({value:'',dataset:{repayAmount:i}}));
     remove=indices.map(i=>({dataset:{repayRemove:i}}));
    },get:()=>html});
    x.querySelectorAll=s=>s==='[data-repay-expense]'?links:s==='[data-repay-amount]'?amounts:s==='[data-repay-remove]'?remove:[];
   }
   nodes.set(id,x);
  }return nodes.get(id);
 };
 const helperFrom=code.indexOf('function friendDebtorFields('),
 helperTo=code.indexOf('\nfunction traceCustomShares(',helperFrom);
 assert.ok(helperFrom>0&&helperTo>helperFrom);
 const friendDebtorFields=new Function('state','window','return ('+code.slice(helperFrom,helperTo)+');')(state,w);
 const deps={state,friendDebtorFields,me:'la',partner:'partner',window:w,$,openSheet:()=>{},closeSheet:()=>{},
  visibleBankAccounts:()=>[bank],trackedSavingsAccounts:()=>[],isReadySavingsAccount:()=>false,
  accountType:a=>a?.type,shortAccountLabel:a=>a?.name||'',traceEditorDateLabel:x=>x,
  traceFeedback:()=>'',esc:x=>String(x??''),shortMemberName:()=> 'Élise',money:x=>String(x),
  manualCategories:()=>[],friendLinkOptions:(d,n,exc)=>M.linkable(state.transactions,state.transactions,'la',d,n,exc),
  smartCardPaymentMatches:()=>[],movementImpactText:()=>'',smartStrictDate:d=>/^\d{4}-\d{2}-\d{2}$/.test(d),
  traceSplit:()=>({split:{la:100,partner:0},splitMode:'percent',splitAmounts:null}),
  traceCustomShares:()=>{},validateFriendLink:()=>{throw Error('legacy multi path')},
  saveDocument:async(c,item)=>writes.push({c,item:JSON.parse(JSON.stringify(item))}),
  renderAll:()=>{},traceNotice:e=>{throw e;},deleteTransaction:()=>{}};
 new Function(...Object.keys(deps),'return ('+code.slice(start,end)+');')(...Object.values(deps))(bankTx);
 return{bankTx,state,$,writes};
}
function assign(ui,amount2=35){
 const $=ui.$;$('#smartMovementLink').value='resto';$('#smartMovementFirstAmount').value='25';
 $('#smartMovementAddLink').onclick();
 const host=$('#smartMovementMoreLinks'),s=host.querySelectorAll('[data-repay-expense]')[0],v=host.querySelectorAll('[data-repay-amount]')[0];
 assert.ok(s.onchange&&v.oninput);s.value='courses';s.onchange();v.value=String(amount2);v.oninput();
}
let n=0;async function test(name,fn){await fn();n++;console.log('PASS '+name);}
async function main(){
 await test('imported 60 CAD transaction remains a single source with two advance links',async()=>{
  const u=setup();assign(u);await u.$('#smartMovementSave').onclick();
  assert.equal(u.writes.length,1);
  const row=u.writes[0].item;assert.equal(row.id,'existing-bank-receipt');
  assert.equal(row.type,'external_refund');assert.equal(row.amountCAD,60);
  assert.equal(row.repaymentAllocations.length,2);
  assert.equal(row.repaymentAllocations[0].amountCAD,25);
  assert.equal(row.repaymentAllocations[1].amountCAD,35);
  assert.equal(row.importFingerprint,'bank-proof');
  assert.equal(u.state.transactions.filter(x=>x.id===row.id).length,1);
 });
 await test('invalid total refuses save without changing original imported transaction',async()=>{
  const u=setup(),before=JSON.stringify(u.bankTx);assign(u,30);
  await u.$('#smartMovementSave').onclick();
  assert.equal(u.writes.length,0);assert.equal(JSON.stringify(u.bankTx),before);
  assert.match(u.$('#traceFeedback').textContent,/somme/);
 });
 console.log(n+' imported bank repayment interaction tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});