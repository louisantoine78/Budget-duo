'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('v5-app-5.37.0.js'),html=read('trace-international-preview.html'),
 css=read('trace-international-1.0.0.css');
const i=app.indexOf('/* TRACE 5.37 UX — read-only account overview and detail'),
 j=app.indexOf('\nfunction internationalHome(){',i);
assert.ok(i>0&&j>i);
const accountModule=app.slice(i,j);
const helperFrom=app.indexOf('function traceLinkedBankTransactionCovers('),
 helperTo=app.indexOf('\nfunction accountEstimate(a){',helperFrom);
assert.ok(helperFrom>0&&helperTo>helperFrom);
const linkHelper=app.slice(helperFrom,helperTo);
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
  reconciliations:[{accountId:'fr',date:'2026-10-05',status:'confirmed',currency:'EUR',actualBalance:100}]};
 const calls={save:0,render:0,navigate:0,activity:0,close:0,title:''},els=new Map(),
 $=k=>{if(!els.has(k))els.set(k,{textContent:'',innerHTML:'',onclick:null,disabled:false});return els.get(k)};
 let scope=opts.scope||'mine';
 const deps={state,
  openingBoundary:id=>({date:state.household.accountOpeningBalanceDates?.[id]||
    state.household.referenceDate||'',mode:
    state.household.accountOpeningBalanceModes?.[id]==='end'?'end':'start'}),
  afterBoundary:(date,b)=>!b?.date||(b.mode==='end'?String(date||'')>b.date:String(date||'')>=b.date),
  me:'la',homeScope:scope,activityAccountFilter:'all',activityMonth:'2026-10',
  accountType:a=>a.type,accountEstimate:a=>a.id==='fr'?(opts.noBalance?null:100):
   a.id==='ca'?500:a.id==='card'?-100:200,
  internationalQuotes:opts.rate?{EUR:{date:'2026-10-23',cadPerUnit:1.6}}:{},
  $,$$:()=>[],shortAccountLabel:a=>a.name,shortMemberName:x=>x==='la'?'Moi':'Partenaire',
  esc:x=>String(x??'').replace(/[&<>"]/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[y])),
  window:{TraceInternational:{currency:a=>a.currency,
   calendarDate:d=>/^\d{4}-\d\d-\d\d$/.test(String(d||''))&&
    !Number.isNaN(Date.parse(String(d)+'T00:00:00Z')),
   exactMoney:v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))||
    !Number.isSafeInteger(Math.round(Number(v)*100))?null:Number(v),
   money:(n,c)=>n+' '+c,fxValue:(n,c,r)=>r?n*r.cadPerUnit:null,
   amountOnAccount:(t,a,leg)=>{
    if(opts.strictEvidence){
     const expected=a.currency||'CAD';
     const declared=leg==='destination'?t.toBankCurrency:t.bankCurrency;
     if(expected!=='CAD'&&declared!==expected)return null;
     if(declared&&declared!==expected)return null;
    }
    return leg==='destination'?t.toBankAmount??null:t.bankAmount??t.amountCAD??null;
   },
   investmentBankAmount:(o,a)=>opts.strictEvidence&&a.currency!=='CAD'&&
    o.bankCurrency!==a.currency?null:o.bankAmount??o.bankAmountCAD??null}},
  openSheet:(title,content)=>{calls.title=title;$('#sheetBody').innerHTML=content},
  closeSheet:()=>calls.close++,openAccountSettings(){},renderHome:()=>calls.render++,
  renderAll:()=>calls.render++,navigate:()=>calls.navigate++,renderActivity:()=>calls.activity++,
  showTab(){},traceNotice(){},
  saveHouseholdSettings:async()=>{calls.save++;if(opts.fail)throw Error('failure')}
 };
 const fn=new Function(...Object.keys(deps),linkHelper+'\n'+accountModule+
 '\nreturn {openAccountsOverview,openTraceAccountDetail,openTraceAccountActivity,'+
 'confirmTracePrimaryAccount,traceAccountNative,traceAccountCAD,traceAccountOperations,'+
 'getFilter:()=>activityAccountFilter,getMonth:()=>activityMonth};');
 return {...fn(...Object.values(deps)),state,calls,$,window:deps.window};
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
 await test('foreign account details identify unresolved bank currency since last reconciliation',()=>{
  const f=fixture({strictEvidence:true});f.openTraceAccountDetail('fr');
  const html=f.$('#sheetBody').innerHTML;
  assert.match(html,/Justificatifs bancaires à vérifier/);
  assert.match(html,/1 mouvement\(s\)/);
  assert.match(html,/Recent/);
  assert.doesNotMatch(html,/Old · 2026-09-02/);
  assert.equal(f.calls.save,0);
  assert.equal(f.calls.navigate,0);
 });
 await test('documented foreign movements remove read-only proof warning',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.openTraceAccountDetail('fr');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.equal(f.calls.save,0);
 });
 await test('a self-transfer surfaces a bank evidence warning without altering records',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.push({id:'bad-self',name:'Same account',accountId:'ca',
   toAccountId:'ca',type:'transfer',status:'confirmed',
   date:'2026-10-18',bankAmount:40,toBankAmount:40,
   bankCurrency:'CAD',toBankCurrency:'CAD'});
  const before=JSON.stringify(f.state);
  f.openTraceAccountDetail('ca');
  assert.match(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.match(f.$('#sheetBody').innerHTML,/Same account/);
  assert.equal(JSON.stringify(f.state),before);
  assert.equal(f.calls.save,0);
 });
 await test('foreign investment bank evidence is reviewable without a phantom balance',()=>{
  const f=fixture({strictEvidence:true});
  f.state.investmentOperations=[
   {id:'broker',bankAccountId:'fr',type:'deposit',status:'confirmed',
    date:'2026-10-19',bankAmount:46.2}];
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Opération de placement/);
  assert.match(f.$('#sheetBody').innerHTML,/1 mouvement\(s\)/);
  assert.equal(f.calls.save,0);
 });
 await test('opening-day foreign proof is included in the diagnostic',()=>{
  const f=fixture({strictEvidence:true});
  f.state.household.accountOpeningBalanceDates={fr:'2026-10-21'};
  f.state.reconciliations=[];
  f.state.transactions.push({id:'opening-day-fx',accountId:'fr',
   status:'confirmed',type:'expense',date:'2026-10-21',
   name:'Opening-day purchase',bankAmount:15});
  f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Opening-day purchase/);
  assert.equal(f.calls.save,0);
 });
 await test('reconciliation day is excluded but next-day invalid leg is flagged',()=>{
  const f=fixture({strictEvidence:true});
  f.state.reconciliations.push({accountId:'ca',date:'2026-10-18',status:'confirmed',currency:'CAD',actualBalance:500});
  f.state.transactions.push({id:'same-day',accountId:'ca',toAccountId:'ca',
   type:'transfer',status:'confirmed',date:'2026-10-18',name:'Already reconciled',
   bankAmount:40,toBankAmount:40});
  f.openTraceAccountDetail('ca');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  f.state.transactions.push({id:'day-after',accountId:'ca',toAccountId:'ca',
   type:'transfer',status:'confirmed',date:'2026-10-19',name:'After reconciliation',
   bankAmount:40,toBankAmount:40});
  f.openTraceAccountDetail('ca');
  assert.match(f.$('#sheetBody').innerHTML,/After reconciliation/);
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Already reconciled ·/);
 });
 await test('reconciliation without a real balance must not hide earlier unproved FX legs',()=>{
  const f=fixture({strictEvidence:true});
  // Newer administrative status is NOT a verified financial balance.
  f.state.reconciliations.push({accountId:'fr',date:'2026-10-23',
   status:'confirmed',currency:'EUR'});
  f.openTraceAccountDetail('fr');
  const html=f.$('#sheetBody').innerHTML;
  assert.match(html,/Justificatifs bancaires à vérifier/);
  assert.match(html,/Recent/);
  assert.match(html,/2026-10-05/);
  assert.doesNotMatch(html,/Dernier rapprochement<\/span><b>2026-10-23/);
  assert.equal(f.calls.save,0);
 });
 await test('reconciliation with wrong currency cannot suppress missing EUR bank evidence',()=>{
  const f=fixture({strictEvidence:true});
  f.state.reconciliations.push({accountId:'fr',date:'2026-10-22',
   status:'confirmed',currency:'CAD',actualBalance:500});
  f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.match(f.$('#sheetBody').innerHTML,/Recent/);
  assert.equal(f.calls.save,0);
 });
 await test('valid newer EUR reconciliation closes reviewed bank evidence',()=>{
  const f=fixture({strictEvidence:true});
  f.state.reconciliations.push({accountId:'fr',date:'2026-10-22',
   status:'confirmed',currency:'EUR',actualBalance:200});
  f.openTraceAccountDetail('fr');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.match(f.$('#sheetBody').innerHTML,/2026-10-22/);
  assert.equal(f.calls.save,0);
 });

 await test('end-of-day opening excludes same-day FX proof alert',()=>{
  const f=fixture({strictEvidence:true});f.state.reconciliations=[];
  f.state.household.accountOpeningBalanceDates={fr:'2026-10-21'};
  f.state.household.accountOpeningBalanceModes={fr:'end'};
  f.state.transactions.push({id:'end-day',accountId:'fr',status:'confirmed',
   type:'expense',date:'2026-10-21',name:'Same-day purchase',bankAmount:15});
  f.openTraceAccountDetail('fr');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.equal(f.calls.save,0);
 });
 await test('statement-only link cannot hide missing investment bank evidence',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.state.transactions.push({id:'marker',type:'card_statement_evidence',
   status:'confirmed',accountId:'fr',date:'2026-10-12'});
  f.state.investmentOperations=[{id:'i',bankAccountId:'fr',linkedTransactionId:'marker',
   type:'deposit',status:'confirmed',date:'2026-10-19',bankAmount:46.2}];
  f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Opération de placement/);
  assert.equal(f.calls.save,0);
 });
 await test('pre-reconciliation link cannot hide missing bank proof',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.state.transactions.push({id:'old-linked',type:'expense',
   status:'confirmed',accountId:'fr',date:'2026-10-01',bankAmount:46.2,bankCurrency:'EUR'});
  f.state.investmentOperations=[{id:'i',bankAccountId:'fr',linkedTransactionId:'old-linked',
   type:'deposit',status:'confirmed',date:'2026-10-19',bankAmount:46.2}];
  f.openTraceAccountDetail('fr');
  assert.match(f.$('#sheetBody').innerHTML,/Opération de placement/);
  assert.equal(f.calls.save,0);
 });
 await test('true linked debit is never reported twice',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.state.transactions.push({id:'real-linked',type:'expense',accountId:'fr',
   status:'confirmed',date:'2026-10-12',bankAmount:46.2,bankCurrency:'EUR'});
  f.state.investmentOperations=[{id:'i',bankAccountId:'fr',linkedTransactionId:'real-linked',
   type:'deposit',status:'confirmed',date:'2026-10-19',bankAmount:46.2}];
  f.openTraceAccountDetail('fr');
  assert.doesNotMatch(f.$('#sheetBody').innerHTML,/Justificatifs bancaires à vérifier/);
  assert.equal(f.calls.save,0);
 });
 await test('real accountEstimate handles bank statement, old link and genuine debit',()=>{
  const from=app.indexOf('function traceLinkedBankTransactionCovers('),
   to=app.indexOf('\nfunction bank(s){',from);
  assert.ok(from>0&&to>from);
  const make=new Function('state','window','accountType','openingBoundary','afterBoundary',
   app.slice(from,to)+'\nreturn accountEstimate;');
  const f=fixture({strictEvidence:true}),fr=f.state.accounts.find(a=>a.id==='fr');
  const estimate=make(f.state,f.window,a=>a.type,
   id=>({date:'2026-10-01',mode:'start'}),
   (date,b)=>!b?.date||(b.mode==='end'?date>b.date:date>=b.date));
  f.state.transactions=[];
  const linked={id:'t',accountId:'fr',date:'2026-10-11',status:'confirmed',
   type:'card_statement_evidence',bankAmount:46.2,bankCurrency:'EUR'};
  f.state.transactions.push(linked);
  f.state.investmentOperations=[{id:'i',bankAccountId:'fr',
   linkedTransactionId:'t',type:'deposit',status:'confirmed',
   date:'2026-10-19',bankAmount:46.2,bankCurrency:'EUR'}];
  assert.equal(estimate(fr),53.8);
  linked.type='expense';assert.equal(estimate(fr),53.8);
  linked.date='2026-10-01';assert.equal(estimate(fr),53.8);
  assert.equal(f.calls.save,0);
 });


 await test('bank proof provides an accessible scoped Activity link without saving',()=>{
  const f=fixture({strictEvidence:true}),before=JSON.stringify(f.state);
  f.openTraceAccountDetail('fr');
  const markup=f.$('#sheetBody').innerHTML;
  assert.match(markup,/data-trace-bank-proof-open="recent"/);
  assert.match(markup,/aria-label="Retrouver Recent dans Activité"/);
  assert.match(app,/openTraceAccountActivity\(a\.id,btn\.dataset\.traceBankProofOpen\)/);
  assert.equal(f.calls.save,0);assert.equal(JSON.stringify(f.state),before);
 });
 await test('bank proof opens the right historic month over a more recent movement',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.push({id:'later',accountId:'fr',type:'expense',
   status:'confirmed',date:'2026-12-02',bankAmount:10,bankCurrency:'EUR'});
  const before=JSON.stringify(f.state);
  f.openTraceAccountActivity('fr','recent');
  assert.equal(f.getFilter(),'fr');assert.equal(f.getMonth(),'2026-10');
  assert.equal(f.calls.activity,1);assert.equal(f.calls.save,0);
  assert.equal(JSON.stringify(f.state),before);
 });
 await test('proof id from another account cannot redirect month selection',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.push({id:'later',accountId:'fr',type:'expense',
   status:'confirmed',date:'2026-12-02',bankAmount:10,bankCurrency:'EUR'});
  f.openTraceAccountActivity('fr','transfer');
  assert.equal(f.getFilter(),'fr');assert.equal(f.getMonth(),'2026-12');
  assert.equal(f.calls.save,0);
 });
 await test('investment warning is explicitly separate from clickable bank transactions',()=>{
  const f=fixture({strictEvidence:true});
  f.state.transactions.filter(t=>t.accountId==='fr').forEach(t=>t.bankCurrency='EUR');
  f.state.investmentOperations=[{id:'unproved-investment',bankAccountId:'fr',
   type:'deposit',date:'2026-10-19',status:'confirmed',bankAmount:46.2}];
  f.openTraceAccountDetail('fr');
  const markup=f.$('#sheetBody').innerHTML;
  assert.match(markup,/Opération de placement/);
  assert.match(markup,/vérifient dans Patrimoine/);
  assert.doesNotMatch(markup,/data-trace-bank-proof-open=/);
  assert.match(css,/\.trace-bank-proof-review \.trace-bank-proof-link/);
  assert.equal(f.calls.save,0);
 });

 await test('premium sheets and missing-rate safeguards exist',()=>{
  assert.match(css,/\.trace-account-detail-hero/);
  assert.match(css,/\.trace-account-activity-filter/);
  assert.match(html,/connect-src 'none'/);
 });
 console.log(n+' targeted account UX tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
