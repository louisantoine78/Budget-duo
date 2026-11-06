'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../trace-international-1.0.0.js');const I=globalThis.TraceInternational;
const ca={id:'ca',owner:'la',type:'checking',currency:'CAD',country:'CA',name:'Courant'},
 backup={...ca,id:'backup',name:'Autre courant'},fr={...ca,id:'fr',currency:'EUR',country:'FR',name:'France'},
 card={id:'card',owner:'la',type:'card',currency:'CAD',country:'CA',settlementAccountId:'ca',name:'Carte'};
const accounts=[ca,backup,fr,card];
const edit=(account,input,more={})=>I.resolveAccountEdit({account,owner:'la',accounts,input,...more});
const archive=(account,more={})=>I.resolveAccountArchive({account,owner:'la',accounts,primaryId:'ca',date:'2026-10-24',...more});
test('renaming and bank metadata preserve native history and all unrelated fields',()=>{
 const tx={id:'t',accountId:'fr',bankAmount:40,bankCurrency:'EUR',amountCAD:64};
 const before=JSON.stringify([fr,tx]),next=edit(fr,{name:'France renommée'},{transactions:[tx]});
 assert.equal(next.name,'France renommée');assert.equal(next.currency,'EUR');assert.equal(JSON.stringify([fr,tx]),before);
});
test('a native opening, transaction, incoming transfer, reconciliation or bank investment locks currency',()=>{
 for(const proof of [{openingBalances:{fr:0}},{transactions:[{accountId:'fr'}]},
  {transactions:[{toAccountId:'fr'}]},{reconciliations:[{accountId:'fr'}]},
  {investmentOperations:[{bankAccountId:'fr'}]}])
  assert.throws(()=>edit(fr,{currency:'USD'},proof),/devise est verrouillée/);
 assert.equal(edit(fr,{currency:'USD'}).currency,'USD');
});
test('a card can be reassociated only to the owner, country and currency it actually settles in',()=>{
 assert.equal(edit(card,{settlementAccountId:'backup'}).settlementAccountId,'backup');
 assert.throws(()=>edit(card,{settlementAccountId:'fr'}),/même pays et même devise/);
 assert.throws(()=>edit(card,{settlementAccountId:'backup'},{accounts:[card,{...backup,owner:'partner'}]}),/même pays et même devise/);
});
test('changing a checking country cannot silently break its active card association',()=>{
 assert.throws(()=>edit(ca,{country:'FR'}),/cartes liées/);
});
test('legacy unlinked cards remain editable without inventing a settlement account',()=>{
 const old={...card,settlementAccountId:null};assert.equal(edit(old,{name:'Ancienne carte'}).settlementAccountId,null);
});
test('archive blocks the effective principal and checking accounts with active linked cards',()=>{
 assert.throws(()=>archive(ca),/autre compte principal/);
 assert.throws(()=>archive(ca,{primaryId:'fr'}),/cartes liées/);
});
test('archiving and reactivation preserve balances and transactions without deleting any document',()=>{
 const before=JSON.stringify(fr),next=archive(fr);assert.equal(next.archived,true);
 assert.equal(next.currency,'EUR');assert.equal(next.id,'fr');assert.equal(JSON.stringify(fr),before);
 const restored=archive(next,{archived:false});assert.equal(restored.archived,false);assert.equal(restored.archivedAt,null);
});
test('partner accounts cannot be renamed, archived or restored by the other person',()=>{
 const partner={...fr,owner:'partner'};assert.throws(()=>edit(partner,{name:'No'}),/tes comptes/);
 assert.throws(()=>archive(partner),/non autorisée/);
 assert.throws(()=>archive({...partner,archived:true},{archived:false}),/non autorisée/);
});
test('restoring a card never silently reconnects an archived bank',()=>{
 assert.throws(()=>archive({...card,archived:true},{archived:false,accounts:[{...ca,archived:true},card]}),/Réactive d’abord/);
});
test('duplicate active names, unsupported currency and invalid metadata are rejected',()=>{
 assert.throws(()=>edit(fr,{name:'Courant'}),/déjà ce nom/);
 assert.throws(()=>edit(fr,{currency:'JPY'}),/devise du compte/);
 assert.throws(()=>edit(fr,{name:' '}),/Vérifie/);
});


test('deferred card stores a monthly debit day and optional cutoff as per-card settings',()=>{
 const deferred={...card,id:'visa-fr',name:'Visa FR',currency:'EUR',country:'FR',
  settlementAccountId:'fr',paymentMode:'deferred'};
 const before=JSON.stringify(deferred);
 const prepared=edit(deferred,{deferredDebitDay:'28',deferredClosingDay:'20'},
  {accounts:[...accounts,deferred]});
 assert.equal(prepared.deferredDebitDay,28);
 assert.equal(prepared.deferredClosingDay,20);
 assert.equal(JSON.stringify(deferred),before);
 assert.equal(card.deferredDebitDay,undefined);
});
test('monthly debit day alone is allowed, but a due cycle remains unknown',()=>{
 const deferred={...card,id:'visa-fr',name:'Visa FR',currency:'EUR',country:'FR',
  settlementAccountId:'fr',paymentMode:'deferred'};
 const result=edit(deferred,{deferredDebitDay:'31'},
  {accounts:[...accounts,deferred]});
 assert.equal(result.deferredDebitDay,31);
 assert.equal(result.deferredClosingDay,null);
});
test('invalid monthly days are rejected before any account document can be prepared',()=>{
 const deferred={...card,id:'visa-fr',name:'Visa FR',currency:'EUR',country:'FR',
  settlementAccountId:'fr',paymentMode:'deferred'};
 for(const day of [0,32,-3,2.2,'2.2','21foo','01',true,{},'NaN'])
  assert.throws(()=>edit(deferred,{deferredDebitDay:day},
   {accounts:[...accounts,deferred]}),/calendrier différé/);
 for(const day of [0,32,'30mars',false])
  assert.throws(()=>edit(deferred,{deferredDebitDay:28,deferredClosingDay:day},
   {accounts:[...accounts,deferred]}),/calendrier différé/);
});
test('closing date alone is refused, avoiding silent purchase-batch allocation',()=>{
 const deferred={...card,id:'visa-fr',name:'Visa FR',currency:'EUR',country:'FR',
  settlementAccountId:'fr',paymentMode:'deferred'};
 assert.throws(()=>edit(deferred,{deferredClosingDay:20},
  {accounts:[...accounts,deferred]}),/jour de clôture exige/);
});
test('ordinary Canadian credit card cannot silently acquire deferred schedule metadata',()=>{
 assert.throws(()=>edit(card,{deferredDebitDay:28}),/réservé aux cartes/);
 assert.throws(()=>edit(card,{deferredClosingDay:20}),/réservé aux cartes/);
});
test('renaming a deferred card does not recalculate historical due dates or bank evidence',()=>{
 const deferred={...card,id:'visa-fr',name:'Visa FR',currency:'EUR',country:'FR',
  settlementAccountId:'fr',paymentMode:'deferred',deferredDebitDay:5,
  deferredClosingDay:20};
 const historic={id:'historical-eur',cardAccountId:deferred.id,
  purchaseDate:'2026-09-10',dueDate:'2026-10-05',amountCAD:64};
 const before=JSON.stringify([deferred,historic]);
 const edited=edit(deferred,{name:'Visa FR renommée'},
  {accounts:[...accounts,deferred],transactions:[historic]});
 assert.equal(edited.deferredDebitDay,5);
 assert.equal(edited.deferredClosingDay,20);
 assert.equal(historic.dueDate,'2026-10-05');
 assert.equal(JSON.stringify([deferred,historic]),before);
});
