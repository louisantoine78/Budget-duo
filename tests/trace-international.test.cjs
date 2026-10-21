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
test('CAD destination of EUR transfer without explicit receipt is unknown, not budget valuation',()=>{
 const tx={type:'transfer',bankCurrency:'EUR',bankAmount:100,amountCAD:160,toAccountId:'checkingCAD'};
 assert.equal(I.amountOnAccount(tx,CAD,'destination'),null);
});
test('unlinked cards across multiple same-currency current accounts require mapping',()=>{
 const other={...CAD,id:'checkingCAD2'};
 const snap=I.snapshot({accounts:[CAD,other,CARD],owner:'la',mainId:CAD.id,
  estimates:{checkingCAD:1000,checkingCAD2:2000,cardCAD:-300}});
 assert.equal(snap.net,700); // The card explicitly links to the first account.
 const unknown={...CARD,settlementAccountId:null};
 const ambiguous=I.snapshot({accounts:[CAD,other,unknown],owner:'la',mainId:CAD.id,
  estimates:{checkingCAD:1000,checkingCAD2:2000,cardCAD:-300}});
 assert.equal(ambiguous.net,null);
 assert.equal(ambiguous.ambiguousCards.length,1);
 assert.equal(ambiguous.globalCAD,2700);
});
test('cannot invent original purchase amount when purchase currency differs',()=>{
 assert.throws(()=>I.resolveBooking({account:EUR,bankAmount:46.20,originalCurrency:'USD',
  quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-01'},date:'2026-10-01'}),/Prix d’achat d’origine requis/);
});
test('dated rate cannot be taken from a future date',()=>{
 assert.throws(()=>I.resolveBooking({account:EUR,bankAmount:100,date:'2026-10-01',
  quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-02'}}),/Date du taux/);
});
test('currency choices include European and North American bank currencies',()=>{
 assert.deepEqual([...I.currencies()],['CAD','EUR','USD','GBP','CHF']);
});
test('edit CAD to EUR transfer preserves the actual 150 CAD debit and 95 EUR receipt',()=>{
 const tx={id:'transfer1',type:'transfer',status:'confirmed',accountId:CAD.id,toAccountId:EUR.id,
  date:'2026-10-05',name:'Voyage',amountCAD:140,bankAmount:140,toBankAmount:90,categoryId:'',linkedTransactionId:null};
 const next=I.resolveTransferEdit({transaction:tx,from:CAD,to:EUR,bankAmount:150,receivedAmount:95,name:'Virement France'});
 assert.equal(next.bankAmount,150);assert.equal(next.amountCAD,150);assert.equal(next.toBankAmount,95);
 assert.equal(next.type,'transfer');assert.equal(next.categoryId,'');assert.equal(next.date,tx.date);
 assert.equal(next.accountId,CAD.id);assert.equal(next.toAccountId,EUR.id);
 assert.equal(next.linkedTransactionId,null);assert.equal(tx.bankAmount,140);
 assert.equal(I.amountOnAccount(next,EUR,'destination'),95);
});
test('edit EUR to CAD transfer preserves both native legs and dated rate without second income',()=>{
 const tx={id:'transfer2',type:'transfer',status:'confirmed',accountId:EUR.id,toAccountId:CAD.id,
  date:'2026-10-05',name:'Retour France',bankCurrency:'EUR',bankAmount:80,toBankAmount:119,
  amountCAD:126,categoryId:'',statusTag:'matched'};
 const quote={currency:'EUR',cadPerUnit:1.6,date:'2026-10-03',source:'fictitious fixture'};
 const next=I.resolveTransferEdit({transaction:tx,from:EUR,to:CAD,bankAmount:82,receivedAmount:120,quote,name:tx.name});
 assert.equal(next.bankAmount,82);assert.equal(next.bankCurrency,'EUR');
 assert.equal(next.toBankAmount,120);assert.equal(next.amountCAD,131.2);
 assert.equal(next.fxRateDate,'2026-10-03');assert.equal(next.fxRateSource,'fictitious fixture');
 assert.equal(next.type,'transfer');assert.equal(next.statusTag,'matched');
 assert.equal(I.amountOnAccount(next,CAD,'destination'),120);
});
test('edit transfer with original purchase currency preserves original price and source bank debit',()=>{
 const tx={type:'transfer',status:'confirmed',accountId:EUR.id,toAccountId:CAD.id,date:'2026-10-05',name:'Dollar settlement'};
 const next=I.resolveTransferEdit({transaction:tx,from:EUR,to:CAD,bankAmount:46.2,receivedAmount:70,
  originalCurrency:'USD',originalAmount:50,quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-03'}});
 assert.equal(next.currency,'USD');assert.equal(next.amountOriginal,50);
 assert.equal(next.bankCurrency,'EUR');assert.equal(next.bankAmount,46.2);assert.equal(next.toBankAmount,70);
 assert.equal(next.amountCAD,73.92);
});
test('transfer editor never accepts unknown destination leg',()=>{
 const t={type:'transfer',status:'confirmed',accountId:CAD.id,toAccountId:EUR.id,date:'2026-10-05',name:'Virement'};
 assert.throws(()=>I.resolveTransferEdit({transaction:t,from:CAD,to:EUR,bankAmount:200,receivedAmount:''}),/deux montants/);
 assert.throws(()=>I.resolveTransferEdit({transaction:t,from:CAD,to:EUR,bankAmount:200,receivedAmount:null}),/deux montants/);
});
test('transfer editor forbids changing account pair or editing unconfirmed movements',()=>{
 const tx={type:'transfer',status:'confirmed',accountId:CAD.id,toAccountId:EUR.id,date:'2026-10-05',name:'Virement'};
 assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:{...CAD,id:'another'},to:EUR,bankAmount:100,receivedAmount:60}),/incohérente/);
 assert.throws(()=>I.resolveTransferEdit({transaction:{...tx,status:'pending'},from:CAD,to:EUR,bankAmount:100,receivedAmount:60}),/confirmé/);
 assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:CAD,to:{...EUR,owner:'partner'},bankAmount:100,receivedAmount:60}),/incohérente/);
});
test('transfer into a card respects its linked settlement account',()=>{
 const tx={type:'transfer',status:'confirmed',accountId:EUR.id,toAccountId:CARD.id,date:'2026-10-05',name:'Paiement'};
 assert.throws(()=>I.resolveTransferEdit({transaction:tx,from:EUR,to:CARD,bankAmount:100,receivedAmount:160,
  quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-05'}}),/compte courant lié/);
});

test('unverified positive card credit must not be reported as cash or global wealth',()=>{
 const snap=I.snapshot({owner:'la',accounts:[CAD,CARD],
  mainId:CAD.id,estimates:{checkingCAD:1000,cardCAD:120}});
 assert.equal(snap.net,null);assert.equal(snap.card,null);
 assert.equal(snap.globalCAD,null);assert.equal(snap.complete,false);
 assert.equal(snap.cardsToReview.length,1);assert.equal(snap.missing[0].id,CARD.id);
});
test('foreign card credit blocks worldwide wealth even if primary CAD account is valid',()=>{
 const foreignCard={...CARD,id:'foreignCard',currency:'EUR',country:'FR',settlementAccountId:EUR.id};
 const snap=I.snapshot({owner:'la',accounts:[CAD,EUR,foreignCard],mainId:CAD.id,
  estimates:{checkingCAD:1500,checkingEUR:500,foreignCard:50},
  fxRates:{EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12'}}});
 assert.equal(snap.net,1500);assert.equal(snap.globalCAD,null);
 assert.equal(snap.complete,false);assert.equal(snap.cardsToReview.length,1);
});
test('credit card linked to primary checking in another currency cannot be subtracted natively',()=>{
 const cardUSD={...CARD,currency:'USD',country:'CA'};
 const out=I.snapshot({owner:'la',accounts:[CAD,cardUSD],mainId:CAD.id,
  estimates:{checkingCAD:1000,cardCAD:-100},
  fxRates:{USD:{currency:'USD',cadPerUnit:1.4,date:'2026-10-20'}}});
 assert.equal(out.net,null);
 assert.equal(out.card,null);
 assert.equal(out.mixedLinkedCurrencies.length,1);
 assert.equal(out.complete,true);
 assert.equal(out.globalCAD,860);
});
test('when only a card exists there is no fictitious cash primary balance',()=>{
 const out=I.snapshot({owner:'la',accounts:[CARD],mainId:CARD.id,
  estimates:{cardCAD:-100}});
 assert.equal(out.net,null);assert.equal(out.checking,null);
});
process.on('beforeExit',()=>console.log(count+' international FX scenarios passed'));
