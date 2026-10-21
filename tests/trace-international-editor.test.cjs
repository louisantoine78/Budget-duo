'use strict';
/* Non-browser integration test: exercise the REAL international transfer editor.
   No network, Supabase writes, or real account data are used. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(engine,ctx);
const I=ctx.window.TraceInternational;
const start=app.indexOf('function editInternationalTransfer(');
const end=app.indexOf('\nfunction editSmartBankMovement(',start);
assert.ok(start>0&&end>start,'FX editor function missing');
const factory=new Function('state','me','accountType','window','openSheet','closeSheet','$','esc','shortAccountLabel',
 'saveDocument','renderAll','navigate','showTab',
 'return ('+app.slice(start,end)+');');
const checkingCAD={id:'ca',name:'Courant Canada',owner:'la',type:'checking',currency:'CAD',country:'CA'};
const checkingEUR={id:'fr',name:'Courant France',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const cardCAD={id:'credit',name:'Carte Canada',owner:'la',type:'card',currency:'CAD',settlementAccountId:'ca'};
const compact=x=>JSON.parse(JSON.stringify(x));
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name);}
function setup(t,accounts=[checkingCAD,checkingEUR],fail=false){
 const nodes=new Map(),writes=[];
 const elt=id=>{
  if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false,
   classList:{add(){}},addEventListener(){},onclick:null});
  return nodes.get(id);
 };
 const $=selector=>elt(selector);
 let sheet='',closed=false,rendered=false;
 const editor=factory({accounts},'la',a=>a.type,{TraceInternational:I},
  (title,html)=>{
   sheet=html;
   elt('#fxName').value=t.name;
   elt('#fxSent').value=String(t.bankAmount??t.amountCAD??'');
   elt('#fxReceived').value=t.toBankAmount==null?'':String(t.toBankAmount);
   elt('#fxOriginalCurrency').value=t.currency||I.currency(accounts.find(a=>a.id===t.accountId));
   elt('#fxOriginalAmount').value='';
  },
  ()=>{closed=true;},$,
  value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  a=>a.name,
  async(collection,item)=>{if(fail)throw Error('network unavailable');writes.push({collection,item:compact(item)});},
  ()=>{rendered=true;},()=>{},()=>{}
 );
 return{edit:()=>editor(t),elt,writes,sheet:()=>sheet,closed:()=>closed,rendered:()=>rendered};
}
async function main(){
 await test('CAD to EUR edit changes two native ledger legs with no income or expense',async()=>{
  const t={id:'one',date:'2026-10-05',name:'Virement France',type:'transfer',status:'confirmed',
   accountId:'ca',toAccountId:'fr',bankCurrency:'CAD',bankAmount:140,toBankAmount:90,amountCAD:140,
   categoryId:'',transferPurpose:'card_payment',linkedTransactionId:null};
  const ui=setup(t);ui.edit();
  assert.match(ui.sheet(),/fxSent/);assert.match(ui.sheet(),/fxReceived/);
  ui.elt('#fxSent').value='150';ui.elt('#fxReceived').value='95';
  await ui.elt('#fxSave').onclick();
  assert.equal(ui.writes.length,1);assert.equal(ui.writes[0].collection,'transactions');
  const row=ui.writes[0].item;
  assert.equal(row.id,'one');assert.equal(row.bankAmount,150);assert.equal(row.toBankAmount,95);
  assert.equal(row.amountCAD,150);assert.equal(row.type,'transfer');assert.equal(row.categoryId,'');
  assert.equal(row.date,'2026-10-05');assert.equal(row.accountId,'ca');assert.equal(row.toAccountId,'fr');
  assert.ok(ui.closed());assert.ok(ui.rendered());
 });
 await test('EUR to CAD edit uses a verified manual rate and native receipt',async()=>{
  const t={id:'two',date:'2026-10-06',name:'Retour France',type:'transfer',status:'confirmed',
   accountId:'fr',toAccountId:'ca',bankCurrency:'EUR',bankAmount:80,toBankAmount:120,
   amountCAD:128,bankRateCad:1.6,fxRateDate:'2026-10-06'};
  const ui=setup(t);ui.edit();ui.elt('#fxSent').value='82';
  ui.elt('#fxRate').value='1.58';await ui.elt('#fxSave').onclick();
  assert.equal(ui.writes.length,1);
  const row=ui.writes[0].item;
  assert.equal(row.bankAmount,82);assert.equal(row.toBankAmount,120);
  assert.equal(row.amountCAD,129.56);assert.equal(row.fxRateDate,'2026-10-06');
  assert.equal(row.fxRateSource,'Taux saisi manuellement');
 });
 await test('missing destination amount stops save and leaves original transaction intact',async()=>{
  const t={id:'missing',date:'2026-10-06',name:'Virement',type:'transfer',status:'confirmed',
   accountId:'ca',toAccountId:'fr',bankAmount:100,amountCAD:100};
  const before=JSON.stringify(t),ui=setup(t);ui.edit();
  await ui.elt('#fxSave').onclick();
  assert.equal(ui.writes.length,0);assert.equal(JSON.stringify(t),before);
  assert.match(ui.elt('#fxError').textContent,/deux montants/);
 });
 await test('failed persistence never mutates ledger entry',async()=>{
  const t={id:'offline',date:'2026-10-06',name:'Virement',type:'transfer',status:'confirmed',
   accountId:'ca',toAccountId:'fr',bankAmount:100,toBankAmount:64,amountCAD:100};
  const before=JSON.stringify(t),ui=setup(t,[checkingCAD,checkingEUR],true);ui.edit();
  ui.elt('#fxSent').value='200';ui.elt('#fxReceived').value='130';
  await ui.elt('#fxSave').onclick();
  assert.equal(JSON.stringify(t),before);assert.equal(ui.writes.length,0);
  assert.equal(ui.elt('#fxSave').disabled,false);
  assert.match(ui.elt('#fxError').textContent,/network unavailable/);
 });
 await test('unconfirmed transfer cannot enter editor',async()=>{
  const t={id:'pending',date:'2026-10-06',name:'Virement',type:'transfer',status:'pending',
   accountId:'ca',toAccountId:'fr',bankAmount:100,toBankAmount:64,amountCAD:100};
  const ui=setup(t);ui.edit();assert.match(ui.sheet(),/sans contrôle/);
  assert.equal(ui.writes.length,0);
 });
 await test('a card belonging to another settlement account cannot be relinked',async()=>{
  const t={id:'wrongcard',date:'2026-10-06',name:'Paiement',type:'transfer',status:'confirmed',
   accountId:'fr',toAccountId:'credit',bankAmount:100,toBankAmount:160,
   bankRateCad:1.6,fxRateDate:'2026-10-06',amountCAD:160};
  const ui=setup(t,[checkingCAD,checkingEUR,cardCAD]);ui.edit();
  await ui.elt('#fxSave').onclick();
  assert.equal(ui.writes.length,0);assert.match(ui.elt('#fxError').textContent,/compte courant lié/);
 });
 console.log(count+' international transfer editor interaction scenarios passed');
}
main().catch(error=>{console.error('FAIL',error);process.exitCode=1;});
