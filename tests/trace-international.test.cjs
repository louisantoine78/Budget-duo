'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(source,ctx,{filename:'trace-international-1.0.0.js'});
const I=ctx.window.TraceInternational;
const CAD={id:'checkingCAD',owner:'la',name:'Desjardins',type:'checking',country:'CA',currency:'CAD'};
const CARD={id:'cardCAD',owner:'la',name:'Mastercard',type:'card',country:'CA',currency:'CAD',settlementAccountId:'checkingCAD'};
const EUR={id:'checkingEUR',owner:'la',name:'BoursoBank',type:'checking',country:'FR',currency:'EUR',paymentMode:'immediate'};
const DEFERRED={id:'deferredEUR',owner:'la',name:'Carte différée',type:'card',country:'FR',currency:'EUR',paymentMode:'deferred',settlementAccountId:'checkingEUR'};
let count=0;function test(name,fn){Promise.resolve().then(fn).then(()=>{count++;console.log('PASS '+name);},error=>{console.error('FAIL '+name,error);process.exitCode=1;});}
test('legacy bank documents remain CAD',()=>{assert.equal(I.currency({type:'checking'}),'CAD');});
test('CAD without quote has identity rate and preserved native amount',()=>{
 const booked=I.resolveBooking({account:CAD,bankAmount:40,date:'2026-10-01'});
 assert.equal(booked.bankAmount,40);assert.equal(booked.amountCAD,40);assert.equal(booked.bankCurrency,'CAD');
 assert.equal(booked.fxRateSource,'identité');
});
test('French native bank EUR converted only in budget without changing 46.20 EUR debit',()=>{
 const quote={currency:'EUR',cadPerUnit:1.6,date:'2026-10-01',source:'test'};
 const booked=I.resolveBooking({account:EUR,bankAmount:46.20,originalAmount:50,originalCurrency:'USD',quote,date:'2026-10-01'});
 assert.equal(booked.amountOriginal,50);assert.equal(booked.currency,'USD');
 assert.equal(booked.bankAmount,46.2);assert.equal(booked.bankCurrency,'EUR');
 assert.equal(booked.amountCAD,73.92);assert.equal(booked.fxRateDate,'2026-10-01');
});
test('foreign amount without verified rate is blocked',()=>{
 assert.throws(()=>I.resolveBooking({account:EUR,bankAmount:46,date:'2026-10-01'}),/Taux CAD requis/);
});
test('negative or zero manual rate rejected',()=>{
 assert.throws(()=>I.resolveBooking({account:EUR,bankAmount:3,quote:{currency:'EUR',cadPerUnit:-1}}),/Taux CAD requis/);
});
test('card and checking are linked and card debt lowers CAD net',()=>{
 const out=I.snapshot({owner:'la',accounts:[CAD,CARD,EUR],estimates:{checkingCAD:1700,cardCAD:-424,checkingEUR:1000},mainId:'checkingCAD',
 fxRates:{EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-01'}}});
 assert.equal(out.currency,'CAD');assert.equal(out.net,1276);assert.equal(out.globalCAD,2876);
});
test('French main EUR only includes its linked deferred card',()=>{
 const out=I.snapshot({owner:'la',accounts:[CAD,CARD,EUR,DEFERRED],
 estimates:{checkingCAD:1700,cardCAD:-424,checkingEUR:2000,deferredEUR:-140},
 mainId:'checkingEUR',fxRates:{EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-01'}}});
 assert.equal(out.currency,'EUR');assert.equal(out.net,1860);assert.equal(out.globalCAD,4252);
});
test('missing exchange rate yields incomplete global total rather than mixing currencies',()=>{
 const out=I.snapshot({owner:'la',accounts:[CAD,EUR],estimates:{checkingCAD:1000,checkingEUR:2000},mainId:'checkingCAD'});
 assert.equal(out.globalCAD,null);assert.equal(out.complete,false);assert.equal(out.missing.length,1);
});
test('card repayment credits card once at actual destination amount',()=>{
 const tx={type:'transfer',accountId:'checkingCAD',toAccountId:'checkingEUR',amountCAD:150,bankAmount:150,toBankAmount:95};
 assert.equal(I.amountOnAccount(tx,CAD),150);assert.equal(I.amountOnAccount(tx,EUR,'destination'),95);
});
test('foreign destination without confirmed bank amount cannot be guessed',()=>{
 const tx={type:'transfer',accountId:'checkingCAD',toAccountId:'checkingEUR',amountCAD:150,bankAmount:150};
 assert.equal(I.amountOnAccount(tx,EUR,'destination'),null);
});
test('FX quote uses last available published business day and records exact date',async()=>{
 const quote=await I.fetchDailyRate('EUR','2026-10-19',async url=>({ok:true,json:async()=>({observations:[
  {d:'2026-10-16',FXEURCAD:{v:'1.615'}},{d:'2026-10-15',FXEURCAD:{v:'1.602'}}]})}));
 assert.equal(quote.cadPerUnit,1.615);assert.equal(quote.date,'2026-10-16');
 assert.equal(quote.kind,'previous_business_day');assert.match(quote.url,/FXEURCAD/);
});
test('unsafe quote or empty API response cannot create fake exchange rate',async()=>{
 await assert.rejects(()=>I.fetchDailyRate('CHF','2026-10-19',async()=>({ok:true,json:async()=>({observations:[]})})),/Aucun taux/);
});
test('currency choices include European and North American bank currencies',()=>{
 assert.deepEqual([...I.currencies()],['CAD','EUR','USD','GBP','CHF']);
});
process.on('beforeExit',()=>console.log(count+' international FX scenarios passed'));
