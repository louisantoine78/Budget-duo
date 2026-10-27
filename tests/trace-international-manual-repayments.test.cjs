'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=read('v5-app-5.37.0.js'),w={};
vm.runInNewContext(read('trace-movement-5.36.0.js'),{window:w});
vm.runInNewContext(read('trace-international-1.0.0.js'),{window:w});
w.TraceImportGuide={allowed:()=>true};
w.TraceOperationUI={enhanceManual:()=>{},steps:{allocation:'Répartition',additional:'Précisions'},options:()=>''};
const ca={id:'ca',owner:'la',type:'checking',currency:'CAD',country:'CA',name:'Courant'};
const expenses=[{id:'restaurant',type:'expense',status:'confirmed',payerId:'la',date:'2026-10-10',name:'Restaurant',beneficiary:'custom',splitAmounts:{la:25,partner:25,friends:50}},
{id:'courses',type:'expense',status:'confirmed',payerId:'la',date:'2026-10-11',name:'Courses',beneficiary:'custom',splitAmounts:{friends:35}}];
const start=app.indexOf('function openManualTransaction('),end=app.indexOf('\nfunction openInvestmentAccountAdd(',start);
assert.ok(start>=0&&end>start);
function run(){
 const defaults={manualTxAccount:'ca',manualTxAmount:'60',manualTxName:'Remboursement Camille',manualTxDate:'2026-10-12',
 manualTxBeneficiary:'la',manualPurchaseCurrency:'CAD',manualFriendName:'Camille',manualRelatedExpense:'',
 manualRelatedAmount:'',manualFxRate:'',manualPurchaseAmount:'',manualFriendsAmount:'0',manualPartnerAmount:'0'};
 const nodes=new Map(),saved=[],state={accounts:[ca],transactions:expenses.slice(),investmentAccounts:[],
 household:{defaultSplit:{la:50,partner:50}}};
 const $=sel=>{
  const id=sel.replace(/^#/,'');
  if(!nodes.has(id)){
   let n={id,value:defaults[id]??'',disabled:false,textContent:'',hidden:false,options:[],
    dataset:{},classList:{toggle(){},add(){}},innerHTML:'',
    querySelector:()=>({textContent:''}),querySelectorAll:()=>[],onclick:null,onchange:null,oninput:null};
   if(id==='manualFriendAllocationRows'){
    let data={links:[],amounts:[],removes:[]},html='';
    Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{
     html=v;
     const ix=[...String(v).matchAll(/data-friend-link="(\d+)"/g)].map(m=>m[1]);
     data.links=ix.map(i=>({dataset:{friendLink:i},value:'',onchange:null}));
     data.amounts=ix.map(i=>({dataset:{friendAmount:i},value:'',oninput:null}));
     data.removes=ix.map(i=>({dataset:{friendRemove:i},onclick:null}));
    }});
    n.querySelectorAll=sel=>sel==='[data-friend-link]'?data.links:sel==='[data-friend-amount]'?data.amounts:sel==='[data-friend-remove]'?data.removes:[];
   }
   nodes.set(id,n);
  }
  return nodes.get(id);
 };
 const helperFrom=app.indexOf('function friendDebtorFields('),
 helperTo=app.indexOf('\nfunction traceCustomShares(',helperFrom);
 assert.ok(helperFrom>0&&helperTo>helperFrom);
 const friendDebtorFields=new Function('state','window','return ('+app.slice(helperFrom,helperTo)+');')(state,w);
 const deps={window:w,state,friendDebtorFields,me:'la',partner:'partner',$,esc:x=>String(x??''),uiIcon:()=>'',openSheet:()=>{},closeSheet:()=>{},
 visibleBankAccounts:()=>[ca],preferredBankAccount:()=>ca,accountType:a=>a?.type,shortAccountLabel:a=>a.name||'',
 shortMemberName:()=> 'Élise',manualCategories:()=>[],localDateISO:()=> '2026-10-12',
 friendLinkOptions:(d,a)=>w.TraceMovement.linkable(state.transactions,state.transactions,'la',d,a),
 trackedSavingsAccounts:()=>[],isReadySavingsAccount:()=>false,
 movementImpactText:()=>'',money:a=>String(a)+' CAD',suggestImportCategory:()=>({categoryId:''}),
 traceSplit:()=>({split:{la:100,partner:0},splitMode:'percent',splitAmounts:null}),
 traceCustomShares:()=>{throw Error('unneeded')},validateFriendLink:()=>{throw Error('single legacy function used for multi')},
 // This test exercises reimbursement allocations; deferred quarantine has
 // its own suite, and all synthetic fixture accounts are immediate checking.
 traceRefuseUnqualifiedDeferredWrite:()=>{},
 txDocId:()=> 'bank-60',saveDocument:async(collection,item)=>saved.push({collection,item:JSON.parse(JSON.stringify(item))}),
 renderAll:()=>{},navigate:()=>{},showTab:()=>{}};
 const fn=new Function(...Object.keys(deps),'return ('+app.slice(start,end)+');')(...Object.values(deps));
 fn();$('#manualKind').value='friend_reimbursement';$('#manualKind').onchange();
 return{$,saved,state};
}
let n=0;async function test(name,f){await f();n++;console.log('PASS '+name);}
async function main(){
 await test('one bank 60 CAD receipt linked to two advances',async()=>{
  const u=run(),$=u.$;$('#manualRelatedExpense').value='restaurant';$('#manualRelatedAmount').value='25';
  $('#manualAddFriendLink').onclick();
  const box=$('#manualFriendAllocationRows'),select=box.querySelectorAll('[data-friend-link]')[0],money=box.querySelectorAll('[data-friend-amount]')[0];
  assert.ok(select?.onchange&&money?.oninput);
  select.value='courses';select.onchange();money.value='35';money.oninput();
  await $('#saveManualTx').onclick();
  assert.equal(u.saved.length,1);assert.equal(u.saved[0].collection,'transactions');
  const t=u.saved[0].item;
  assert.equal(t.type,'external_refund');assert.equal(t.amountCAD,60);assert.equal(t.counterparty,'Camille');
  assert.equal(t.repaymentAllocations.length,2);assert.equal(t.repaymentAllocations[0].amountCAD,25);
  assert.equal(t.repaymentAllocations[1].amountCAD,35);assert.equal(u.state.transactions.filter(x=>x.id==='bank-60').length,1);
 });
 await test('unbalanced allocation cannot create bank transaction',async()=>{
  const u=run(),$=u.$;$('#manualRelatedExpense').value='restaurant';$('#manualRelatedAmount').value='25';
  $('#manualAddFriendLink').onclick();const b=$('#manualFriendAllocationRows');
  const x=b.querySelectorAll('[data-friend-link]')[0],y=b.querySelectorAll('[data-friend-amount]')[0];
  x.value='courses';x.onchange();y.value='30';y.oninput();
  await $('#saveManualTx').onclick();
  assert.equal(u.saved.length,0);assert.match($('#manualMovementError').textContent,/somme/);
 });
 await test('single link remains backward-compatible',async()=>{
  const u=run(),$=u.$;$('#manualTxAmount').value='20';$('#manualRelatedExpense').value='restaurant';
  await $('#saveManualTx').onclick();
  assert.equal(u.saved.length,1);assert.equal(u.saved[0].item.relatedExpenseId,'restaurant');
  assert.equal(u.saved[0].item.repaymentAllocations.length,1);
 });
 console.log(n+' manual reimbursement integration scenarios passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});