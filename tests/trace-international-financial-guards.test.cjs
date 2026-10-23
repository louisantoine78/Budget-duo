'use strict';
/* Fictional TRACE International financial invariants. No Supabase, browser or network. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const sandbox={window:{}};
vm.runInNewContext(load('trace-international-1.0.0.js'),sandbox);
const I=sandbox.window.TraceInternational;
const app=load('v5-app-5.37.0.js');
const ca={id:'ca',name:'Compte Canada',owner:'la',type:'checking',country:'CA',currency:'CAD'};
const fr={id:'fr',name:'Compte France',owner:'la',type:'checking',country:'FR',currency:'EUR'};
const card={id:'card',name:'Mastercard',owner:'la',type:'card',country:'CA',currency:'CAD'};
let count=0;
async function test(name,run){await run();count++;console.log('PASS '+name);}
function extract(name,next,args){
 const from=app.indexOf('function '+name+'('),to=app.indexOf('\nfunction '+next+'(',from);
 assert.ok(from>0&&to>from,'Missing source function '+name);
 return new Function(...Object.keys(args),'return ('+app.slice(from,to)+');')(...Object.values(args));
}
function estimate(opening,reconciliations=[],transactions=[]){
 const state={household:{accountOpeningBalances:{ca:opening}},reconciliations,transactions,investmentOperations:[]};
 const f=extract('accountEstimate','bank',{state,accountType:a=>a.type,
  openingBoundary:()=>({date:'2026-10-01',mode:'start'}),
  afterBoundary:date=>date>='2026-10-01',window:{TraceInternational:I}});
 return f(ca);
}
function form(account,estimated){
 const state={accounts:[account],reconciliations:[]};
 const elements=new Map(),writes=[];
 const $=selector=>{
  if(!elements.has(selector))elements.set(selector,{value:'',disabled:false,onclick:null});
  return elements.get(selector);
 };
 let markup='';
 const open=extract('openSingleReconcile','notificationToggle',{
  state,me:'la',accountEstimate:()=>estimated,accountType:a=>a.type,
  window:{TraceInternational:I},
  openSheet:(_,html)=>{markup=html;},$,
  money:n=>'$'+Number(n).toFixed(2),settingsBack:()=>'',saveDocument:async(_,row)=>{writes.push({...row});},
  renderAll:()=>{},openReconcileSettings:()=>{},traceNotice:e=>{throw e;},bindSettingsBack:()=>{}
 });
 open(account.id);
 $('#reconcileDate').value='2026-10-22';
 $('#reconcileCardKind').value='debt';
 return{markup,writes,$,save:async(value)=>{$('#reconcileActual').value=String(value);await $('#saveReconciliation').onclick();}};
}
async function main(){
 await test('historical account without currency remains CAD',()=>assert.equal(I.currency({}), 'CAD'));
 await test('explicit unsupported bank currency cannot masquerade as CAD',()=>assert.throws(()=>I.currency({currency:'JPY'}),/Devise bancaire/));
 await test('missing CAD source and destination never become zero',()=>{
  assert.equal(I.amountOnAccount({},ca),null);
  assert.equal(I.amountOnAccount({},ca,'destination'),null);
  assert.equal(I.amountOnAccount({amountCAD:null,bankAmount:''},ca),null);
  assert.equal(I.amountOnAccount({toBankAmount:''},ca,'destination'),null);
 });
 await test('verified historical zero and 750 CAD remain exact',()=>{
  assert.equal(I.amountOnAccount({amountCAD:0},ca),0);
  assert.equal(I.amountOnAccount({amountCAD:750},card,'destination'),750);
 });
 await test('foreign incoming leg cannot inherit CAD valuation',()=>{
  assert.equal(I.amountOnAccount({bankCurrency:'CAD',amountCAD:150,bankAmount:150},fr,'destination'),null);
 });
 await test('unknown formatted money is not presented as zero',()=>{
  assert.equal(I.money(null,'EUR'),'—');
  assert.equal(I.money(undefined,'CAD'),'—');
 });
 await test('unknown original purchase currency is rejected',()=>assert.throws(
  ()=>I.resolveBooking({account:fr,bankAmount:46.2,originalCurrency:'JPY',originalAmount:50,date:'2026-10-01'}),
  /Devise d’achat/));
 await test('50 USD purchase, real 46.20 EUR debit, dated CAD conversion',()=>{
  const booked=I.resolveBooking({account:fr,bankAmount:46.2,originalCurrency:'usd',originalAmount:50,date:'2026-10-01',
   quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-01',source:'test'}});
  assert.equal(booked.bankAmount,46.2);
  assert.equal(booked.amountOriginal,50);
  assert.equal(booked.currency,'USD');
  assert.equal(booked.amountCAD,73.92);
 });
 await test('card transfer requires explicit linked current account',()=>{
  const tx={id:'payment',accountId:ca.id,toAccountId:card.id,type:'transfer',status:'confirmed',date:'2026-10-01',name:'Règlement'};
  assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:ca,to:card,bankAmount:100,receivedAmount:100}),/compte courant lié/);
  const linked={...card,settlementAccountId:ca.id};
  const booked=I.resolveTransferEdit({transaction:tx,from:ca,to:linked,bankAmount:100,receivedAmount:100});
  assert.equal(booked.toBankAmount,100);assert.equal(booked.type,'transfer');
 });
 await test('missing opening balance is truly unknown',()=>{
  assert.equal(estimate(null),null);
  assert.equal(estimate(''),null);
 });
 await test('incomplete later reconciliation never silently resets a valid opening',()=>{
  assert.equal(estimate(500,[{accountId:ca.id,date:'2026-10-15',actualBalance:null}]),500);
 });
 await test('last valid bank reconciliation wins over later incomplete item',()=>{
  assert.equal(estimate(500,[
   {accountId:ca.id,date:'2026-10-15',actualBalance:125},
   {accountId:ca.id,date:'2026-10-20',actualBalance:null}
  ]),125);
 });
 await test('a real reconciled bank balance of zero stays zero',()=>{
  assert.equal(estimate(500,[{accountId:ca.id,date:'2026-10-15',actualBalance:0}]),0);
 });
 await test('unknown reconciliation opens blank in the account native currency',async()=>{
  const ui=form(fr,null);
  assert.match(ui.markup,/Solde inconnu/);
  assert.match(ui.markup,/value=""/);
  assert.match(ui.markup,/Solde réel dans la banque \(EUR\)/);
  await ui.save(46.2);
  assert.equal(ui.writes.length,1);
  assert.equal(ui.writes[0].estimatedBalance,null);
  assert.equal(ui.writes[0].actualBalance,46.2);
  assert.equal(ui.writes[0].difference,null);
  assert.equal(ui.writes[0].currency,'EUR');
  assert.equal(ui.writes[0].status,'confirmed');
  assert.equal(ui.writes[0].source,'manual_balance');
 });
 await test('known native reconciliation saves exact difference without extra transaction',async()=>{
  const ui=form(ca,100);
  assert.match(ui.markup,/value="100.00"/);
  await ui.save(120);
  assert.equal(ui.writes.length,1);
  assert.equal(ui.writes[0].difference,20);
  assert.equal(ui.writes[0].currency,'CAD');
 });

 await test('unsupported display currency is never labelled CAD',()=>{
  assert.equal(I.money(42,'JPY'),'—');assert.match(I.money(42,'EUR'),/€/);
 });
 await test('unconfirmed or undated statements never overwrite the opening balance',()=>{
  assert.equal(estimate(500,[
   {accountId:ca.id,date:'2026-10-21',actualBalance:170,status:'pending'},
   {accountId:ca.id,date:'2026-10-20',actualBalance:190,status:'incomplete'},
   {accountId:ca.id,date:'2026-10-19',actualBalance:210,confirmed:false},
   {accountId:ca.id,date:'',actualBalance:999,status:'confirmed'}
  ]),500);
 });
 await test('confirmed reconciliation is not superseded by later draft',()=>{
  assert.equal(estimate(500,[
   {accountId:ca.id,date:'2026-10-15',actualBalance:125,status:'confirmed'},
   {accountId:ca.id,date:'2026-10-20',actualBalance:150,status:'pending'}
  ]),125);
 });
 await test('card linkage cannot cross countries or bank currencies',()=>{
  const tx={id:'pay',accountId:ca.id,toAccountId:card.id,type:'transfer',status:'confirmed',date:'2026-10-10',name:'Règlement'};
  assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:ca,to:{...card,settlementAccountId:ca.id,currency:'EUR'},bankAmount:80,receivedAmount:80}),/compte courant lié/);
  assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:ca,to:{...card,settlementAccountId:ca.id,country:'FR'},bankAmount:80,receivedAmount:80}),/compte courant lié/);
 });

 console.log(count+' financial invariants checked (fictional/isolated)');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});