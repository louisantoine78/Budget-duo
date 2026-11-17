'use strict';
// TRACE 5.37.0 integration safety guards.
// Static wiring checks are not a substitute for an iPhone/Safari smoke run.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'index.html'),'utf8');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('main entrypoint matches either stable 5.36 or reviewed release 5.37',()=>{
 const releaseMeta=shell.match(/<meta name="trace-build" content="([^"]+)">/);
 const production=(releaseMeta?.[1]||'').startsWith('5.37.');
 if(production){
  assert.match(shell,/v5-app-5\.37\.0\.js/);
  assert.match(shell,/trace-20-fresh-start-1\.0\.0\.js/);
  assert.match(shell,/__TRACE20_FRESH_START_REQUIRED__=true/);
 }else{
  assert.match(shell,/<meta name="trace-build" content="5\.36\.5">/);
  assert.doesNotMatch(shell,/v5-app-5\.37\.0\.js/);
 }
});
test('bank event handlers remain safe and Patrimoine uses stable delegated clicks',()=>{
 for(const selector of ['data-setup-bank','data-rename-bank','data-primary-bank']){
  assert.ok(app.includes("$('["+selector+"]')"));
  assert.equal(app.split('\n').some(line=>line.trim().startsWith("$('["+selector+"]')")&&line.includes('.forEach')),false);
 }
 assert.ok(app.includes("button.matches('#wealthLiquidityCard,[data-foreign-bank]')"));
 assert.ok(app.includes("page.addEventListener('click',event=>"));
});
test('personal international dashboard does not overwrite Couple numbers',()=>{
 assert.match(app,/balanceNode:homeScope==='mine'\?\$\('#homeBalance'\):null/);
 assert.match(app,/cardNode:homeScope==='mine'\?\$\('#homeCard'\):null/);
});
test('unconfirmed foreign CSV rows retain native amount with null CAD',()=>{
 assert.match(app,/amountCAD:ccy==='CAD'\?amount:null/);
 assert.match(app,/const booked=t\.bankCurrency==='CAD'\?/);
});
test('unverified debit différé mode is disabled on card creation',()=>{
 assert.match(app,/<option value="deferred" disabled>/);
 assert.match(app,/payment\.value!=='credit'/);
});
test('new credit card needs explicit same-currency bank settlement',()=>{
 assert.match(app,/settlementAccountId:linkedId/);
 assert.match(app,/!linkedAccount/);
});
test('foreign bank movement editor cannot accidentally rewrite its CAD budget',()=>{
 assert.match(app,/Mouvement international à préserver/);
 assert.match(app,/futur éditeur international/);
});

/* Independent account snapshots vs household budget start, using the real
 * unmodified production ledger functions with fictional account fixtures. */
function extractLedgerFunction(name,next,deps={}){
 const start=app.indexOf('function '+name+'(');
 const end=app.indexOf('\nfunction '+next+'(',start);
 assert.ok(start>=0&&end>start,'Missing production function: '+name);
 return new Function(...Object.keys(deps),'return ('+app.slice(start,end)+');')(...Object.values(deps));
}
const bankState={
 household:{referenceDate:'2026-11-10',
  accountOpeningBalances:{current:1000,card:-300},
  accountOpeningBalanceDates:{current:'2026-10-30',card:'2026-11-08'},
  accountOpeningBalanceModes:{current:'end',card:'end'}},
 accounts:[{id:'current',type:'checking',currency:'CAD'},{id:'card',type:'card',currency:'CAD'}],
 reconciliations:[],investmentOperations:[],
 transactions:[
  {id:'old-current',date:'2026-10-30',accountId:'current',type:'expense',amountCAD:70,status:'confirmed'},
  {id:'first-current',date:'2026-10-31',accountId:'current',type:'expense',amountCAD:100,status:'confirmed'},
  {id:'refund-current',date:'2026-11-01',accountId:'current',type:'refund',amountCAD:20,status:'confirmed'},
  {id:'old-card',date:'2026-11-08',accountId:'card',type:'expense',amountCAD:40,status:'confirmed'},
  {id:'first-card',date:'2026-11-09',accountId:'card',type:'expense',amountCAD:60,status:'confirmed'},
  {id:'refund-card',date:'2026-11-10',accountId:'card',type:'refund',amountCAD:20,status:'confirmed'},
  {id:'card-payment',date:'2026-11-12',accountId:'current',toAccountId:'card',type:'transfer',amountCAD:100,status:'confirmed'},
  {id:'income',date:'2026-11-15',accountId:'current',type:'income',amountCAD:200,status:'confirmed'}
 ]
};
const I={
 currency:a=>a?.currency||'CAD',
 calendarDate:d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z')),
 exactMoney:v=>{
  if(v===undefined||v===null||v==='')return null;
  const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<1e10&&Math.abs(n*100-Math.round(n*100))<.00001?
   Math.round(n*100)/100:null;
 },
 amountOnAccount:t=>I.exactMoney(t.amountCAD),
 investmentBankAmount:()=>null
};
const accountType=a=>a?.type;
const openingBoundary=extractLedgerFunction('openingBoundary','afterBoundary',{state:bankState});
const afterBoundary=extractLedgerFunction('afterBoundary','isFinancialPeriod');
const isFinancialPeriod=extractLedgerFunction('isFinancialPeriod','isBankBalancePeriod',{
 state:bankState,window:{TraceInternational:I}
});
const bankBalanceBoundary=extractLedgerFunction('bankBalanceBoundary','openingBoundary',{
 state:bankState,window:{TraceInternational:I},openingBoundary
});
const isBankBalancePeriod=extractLedgerFunction('isBankBalancePeriod','normalizedMerchant',{
 state:bankState,bankBalanceBoundary,afterBoundary
});
const accountEstimate=extractLedgerFunction('accountEstimate','bank',{
 state:bankState,window:{TraceInternational:I},
 accountType,openingBoundary,afterBoundary,
 traceCardRepaymentMismatch:()=>false,
 traceLinkedBankTransactionCovers:()=>false
});
const current=bankState.accounts[0],card=bankState.accounts[1];
test('bank dates: October 31 is included for the October 30 checking snapshot',()=>{
 assert.equal(isBankBalancePeriod(bankState.transactions[1],'current'),true);
 assert.equal(isBankBalancePeriod(bankState.transactions[0],'current'),false);
 assert.equal(isBankBalancePeriod(bankState.transactions[3],'card'),false);
 assert.equal(isBankBalancePeriod(bankState.transactions[4],'card'),true);
});
test('budget start Nov 10 does not move individual bank opening dates',()=>{
 assert.equal(isFinancialPeriod(bankState.transactions[1]),false);
 assert.equal(isFinancialPeriod(bankState.transactions[4]),false);
 assert.equal(isFinancialPeriod(bankState.transactions[5]),true);
 assert.equal(isFinancialPeriod({date:'2026-10-31',type:'expense',accountId:'foreign'}),false);
 assert.equal(isFinancialPeriod({date:'2026-10-15',budgetDate:'2026-11-10',type:'expense',deferredKind:'purchase'}),true);
});
test('bank balances respect independent closing dates and count card payment once',()=>{
 assert.equal(accountEstimate(current),1020);
 assert.equal(accountEstimate(card),-240);
});
test('an older reconciliation does not replace a newer account snapshot',()=>{
 bankState.reconciliations.push(
  {accountId:'current',date:'2026-10-20',actualBalance:880,currency:'CAD',status:'confirmed'},
  {accountId:'card',date:'2026-11-07',actualBalance:500,currency:'CAD',status:'confirmed'});
 assert.equal(accountEstimate(current),1020);
 assert.equal(accountEstimate(card),-240);
});
test('a later reconciliation becomes the new dated anchor',()=>{
 bankState.reconciliations.push(
  {accountId:'current',date:'2026-11-12',actualBalance:810,currency:'CAD',status:'confirmed'},
  {accountId:'card',date:'2026-11-12',actualBalance:200,currency:'CAD',status:'confirmed'});
 assert.equal(accountEstimate(current),1010);
 assert.equal(accountEstimate(card),-200);
});
test('a newly entered later statement balance replaces the older reconciliation',()=>{
 bankState.household.accountOpeningBalanceDates.current='2026-11-13';
 bankState.household.accountOpeningBalances.current=950;
 bankState.household.accountOpeningBalanceDates.card='2026-11-13';
 bankState.household.accountOpeningBalances.card=-75;
 assert.equal(accountEstimate(current),1150);
 assert.equal(accountEstimate(card),-75);
});
test('card statement credit remains a credit when later than the opening snapshot',()=>{
 bankState.reconciliations.push({
  accountId:'card',date:'2026-11-14',actualBalance:50,cardBalanceKind:'credit',
  currency:'CAD',status:'confirmed'
 });
 assert.equal(accountEstimate(card),50);
});


test('card without an opening balance allows all import dates but has unknown balance',()=>{
 bankState.reconciliations=[];
 delete bankState.household.accountOpeningBalances.card;
 delete bankState.household.accountOpeningBalanceDates.card;
 assert.equal(openingBoundary('card').date,'');
 assert.equal(bankBalanceBoundary('card').date,'');
 assert.equal(isBankBalancePeriod({date:'2026-10-25',accountId:'card'},'card'),true);
 assert.equal(isBankBalancePeriod({date:'2026-11-02',accountId:'card'},'card'),true);
 assert.equal(accountEstimate(card),null);
});
test('later reconciliation controls import cutoff, not budget start',()=>{
 bankState.reconciliations=[{accountId:'card',date:'2026-11-08',
  status:'confirmed',currency:'CAD',actualBalance:150}];
 assert.equal(bankBalanceBoundary('card').date,'2026-11-08');
 assert.equal(isBankBalancePeriod({date:'2026-11-08',accountId:'card'},'card'),false);
 assert.equal(isBankBalancePeriod({date:'2026-11-09',accountId:'card'},'card'),true);
});

console.log(count+' international wiring guards passed');
