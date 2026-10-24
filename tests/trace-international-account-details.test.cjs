'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html'),
 css=read('trace-international-1.0.0.css');
const i=app.indexOf('/* TRACE 5.37 UX — read-only account overview and detail'),
 j=app.indexOf('\nfunction internationalHome(){',i);
assert.ok(i>0&&j>i);
const module=app.slice(i,j);
function fixture(opts={}){
 const state={accounts:[
  {id:'ca',owner:'la',name:'Compte CA',type:'checking',currency:'CAD'},
  {id:'fr',owner:'la',name:'Compte FR',type:'checking',currency:'EUR',country:'FR'},
  {id:'card',owner:'la',name:'Visa CA',type:'card',currency:'CAD',settlementAccountId:'ca'},
  {id:'partner',owner:'partner',name:'Compte partenaire',type:'checking',currency:'EUR'}],
  household:{primaryBankAccountByOwner:{la:'ca',partner:'partner'}},
  transactions:[
   {id:'old',accountId:'fr',date:'2026-09-02',status:'confirmed',bankAmount:20,name:'Old'},
   {id:'recent',accountId:'fr',date:'2026-10-11',status:'confirmed',bankAmount:12.35,name:'Recent'},
   {id:'pending',accountId:'fr',date:'2026-10-19',status:'pending',bankAmount:null,name:'Pending'},
   {id:'transfer',accountId:'ca',toAccountId:'card',date:'2026-10-20',status:'confirmed',toBankAmount:5,bankAmount:5,name:'Carte'}],
  reconciliations:[{accountId:'fr',date:'2026-10-05',status:'confirmed'}]};
 const calls={save:0,render:0,navigate:0,activity:0,close:0,title:''},els=new Map(),
 $=k=>{if(!els.has(k))els.set(k,{textContent:'',innerHTML:'',onclick:null,disabled:false});return els.get(k)};
 let scope=opts.scope||'mine';
 const deps={state,me:'la',homeScope:scope,activityAccountFilter:'all',activityMonth:'2026-10',
  accountType:a=>a.type,accountEstimate:a=>a.id==='fr'?(opts.noBalance?null:100):
   a.id==='ca'?500:a.id==='card'?-100:200,
  internationalQuotes:opts.rate?{EUR:{date:'2026-10-23',cadPerUnit:1.6}}:{},
  $,$$:()=>[],shortAccountLabel:a=>a.name,shortMemberName:x=>x==='la'?'Moi':'Partenaire',
  esc:x=>String(x??'').replace(/[&<>"]/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[y])),
  window:{TraceInternational:{currency:a=>a.currency,
   money:(n,c)=>n+' '+c,fxValue:(n,c,r)=>r?n*r.cadPerUnit:null,
   amountOnAccount:(t,a,leg)=>leg==='destination'?t.toBankAmount??null:t.bankAmount??null}},
  openSheet:(title,content)=>{calls.title=title;$('#sheetBody').innerHTML=content},
  closeSheet:()=>calls.close++,openAccountSettings(){},renderHome:()=>calls.render++,
  renderAll:()=>calls.render++,navigate:()=>calls.navigate++,renderActivity:()=>calls.activity++,
  showTab(){},traceNotice(){},
  saveHouseholdSettings:async()=>{calls.save++;if(opts.fail)throw Error('failure')}
 };
 const fn=new Function(...Object.keys(deps),module+
 '\nreturn {openAccountsOverview,openTraceAccountDetail,openTraceAccountActivity,'+
 'confirmTracePrimaryAccount,traceAccountNative,traceAccountCAD,traceAccountOperations,'+
 'getFilter:()=>activityAccountFilter,getMonth:()=>activityMonth};');
 return {...fn(...Object.values(deps)),state,calls,$};
}
let n=0;
async function test(label,fn){await fn();n++;console.log('PASS '+label)}
async function main(){
 await test('mine-only overview excludes partner',()=>{
  const f=fixture();f.openAccountsOverview();
  assert.match(f.$('#sheetBody').innerHTML,/Compte FR/);
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Compte partenaire/);
 });
 await test('couple overview includes partner without write',()=>{
  const f=fixture({scope:'couple'});f.openAccountsOverview();
  assert.match(f.$('#sheetBody').innerHTML,/Compte partenaire/);
  assert.equal(f.calls.save,0);
 });
 await test('partner account details do not show main selection control',()=>{
  const f=fixture({scope:'couple'});f.openTraceAccountDetail('partner');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/id="traceAccountSelectPrimary"/);
 });
 await test('native account detail shows two most recent operations only',()=>{
  const f=fixture({rate:true});f.openTraceAccountDetail('fr');const s=f.$('#sheetBody').innerHTML;
  assert.match(s,/Recent/);assert.match(s,/Pending/);assert.doesNotMatch(s,/>Old</);
  assert.match(s,/160 CAD/);assert.match(s,/2026-10-05/);
 });
 await test('linked card and debt remain explicit',()=>{
  const f=fixture();f.openTraceAccountDetail('ca');
  assert.match(f.$('#sheetBody').innerHTML,/Visa CA/);
  f.openTraceAccountDetail('card');
  assert.match(f.$('#sheetBody').innerHTML,/100 CAD de dette/);
 });
 await test('no FX or native balance creates no made-up zero',()=>{
  const f=fixture({noBalance:true});f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Solde à vérifier/);
  assert.match(f.$('#sheetBody').innerHTML,/Conversion indisponible/);
 });
 await test('last operations link selects correct account and month',()=>{
  const f=fixture();const snap=JSON.stringify(f.state);f.openTraceAccountActivity('fr');
  assert.equal(f.getFilter(),'fr');assert.equal(f.getMonth(),'2026-10');
  assert.equal(f.calls.activity,1);assert.equal(f.calls.save,0);
  assert.equal(JSON.stringify(f.state),snap);
 });
 await test('changing main asks for confirmation without prior write',()=>{
  const f=fixture();f.confirmTracePrimaryAccount('fr',()=>{});
  assert.equal(f.calls.title,'Changer le compte principal');
  assert.equal(f.calls.save,0);assert.equal(f.state.household.primaryBankAccountByOwner.la,'ca');
 });
 await test('cancel preserves both personal and partner choice',()=>{
  const f=fixture();f.confirmTracePrimaryAccount('fr',()=>{});f.$('#tracePrimaryCancel').onclick();
  assert.equal(f.calls.save,0);assert.equal(f.state.household.primaryBankAccountByOwner.la,'ca');
 });
 await test('approved choice changes only personal main after persistence',async()=>{
  const f=fixture();f.confirmTracePrimaryAccount('fr',()=>{});
  await f.$('#tracePrimaryConfirm').onclick();
  assert.equal(f.calls.save,1);assert.equal(f.state.household.primaryBankAccountByOwner.la,'fr');
  assert.equal(f.state.household.primaryBankAccountByOwner.partner,'partner');
 });
 await test('failed save rolls back main account',async()=>{
  const f=fixture({fail:true});f.confirmTracePrimaryAccount('fr',()=>{});
  await f.$('#tracePrimaryConfirm').onclick();
  assert.equal(f.state.household.primaryBankAccountByOwner.la,'ca');
  assert.match(f.$('#tracePrimaryConfirmError').textContent,/inchangé/);
 });
 await test('stale confirmation and partner/card target are refused',async()=>{
  const f=fixture();f.confirmTracePrimaryAccount('fr',()=>{});
  f.state.household.primaryBankAccountByOwner.la='third';
  await f.$('#tracePrimaryConfirm').onclick();
  assert.equal(f.calls.save,0);
  for(const id of ['card','partner','missing']){
   const a=fixture();a.confirmTracePrimaryAccount(id,()=>{});
   assert.equal(a.calls.save,0);
  }
 });
 await test('both primary selectors use explicit confirmation and UI exposes filter',()=>{
  assert.match(app,/confirmTracePrimaryAccount\(button\.dataset\.primaryBank,openAccountSettings\)/);
  assert.match(app,/onSelect:id=>\{[\s\S]*?confirmTracePrimaryAccount\(id,/);
  assert.match(html,/id="homeAccountsBtn"/);assert.match(html,/id="activityAccountFilter"/);
 });
 await test('premium sheets and missing-rate safeguards exist',()=>{
  assert.match(css,/\.trace-account-detail-hero/);
  assert.match(css,/\.trace-account-activity-filter/);
  assert.match(html,/connect-src 'none'/);
 });
 console.log(n+' targeted account UX tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
