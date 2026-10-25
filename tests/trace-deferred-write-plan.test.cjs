'use strict';
// A pure preparation contract. No production writes, network or database.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'trace-deferred-write-plan-1.0.0.js'),'utf8');
const fx=fs.readFileSync(path.join(root,'trace-international-1.0.0.js'),'utf8');
const deferred=fs.readFileSync(path.join(root,'trace-deferred-debit-1.0.0.js'),'utf8');
const card={id:'french-card',owner:'la',type:'card',currency:'EUR',
 country:'FR',paymentMode:'deferred',settlementAccountId:'french-current'};
const checking={id:'french-current',owner:'la',type:'checking',currency:'EUR',country:'FR'};
const fields={id:'deferred_p_1',name:'Courses',amount:'40',
 purchaseDate:'2026-10-12',budgetDate:'2026-11-01',dueDate:'2026-12-05',
 categoryId:'groceries'};
const categories=[{id:'groceries',type:'expense',name:'Courses',archived:false}];
const quote={currency:'EUR',cadPerUnit:1.60,date:'2026-10-12',source:'Fictional manual review'};
function env(opts={}){
 const window={};vm.runInNewContext(fx,{window});
 vm.runInNewContext(deferred,{window});vm.runInNewContext(code,{window});
 const args={card,checking,owner:'la',fields,quote,categories,
  existingTransactions:[],...opts};
 return{prepare:()=>window.TraceDeferredWritePlan.prepare(args),args};
}
test('builds pending native EUR document with dated CAD budget and no write',()=>{
 const e=env(),p=e.prepare(),d=p.document;
 assert.equal(p.persistable,false);assert.equal(p.confirmed,false);
 assert.equal(d.status,'pending');assert.equal(d.type,'expense');
 assert.equal(d.deferredKind,'purchase');assert.equal(d.date,'2026-10-12');
 assert.equal(d.budgetDate,'2026-11-01');assert.equal(d.dueDate,'2026-12-05');
 assert.equal(d.bankAmount,40);assert.equal(d.bankCurrency,'EUR');
 assert.equal(d.amountCAD,64);assert.equal(d.fxRateDate,'2026-10-12');
 assert.equal(p.impactIfLaterConfirmed.budgetMonth,'2026-11');
 assert.equal(p.impactIfLaterConfirmed.checkingDebitNow,0);
 assert.equal(d.deferredBankEvidenceReviewed,false);
});
test('quotes are never invented and missing foreign FX aborts',()=>{
 const p=env({quote:null});assert.throws(p.prepare,/Taux CAD requis/);
});
test('historical quote needs valid dated source, rejects future day',()=>{
 const p=env({quote:{...quote,date:'2026-11-02'}});
 assert.throws(p.prepare,/Date du taux/);
});
test('currency conversion zero after rounding is refused',()=>{
 const p=env({quote:{...quote,cadPerUnit:0.000001}});
 assert.throws(p.prepare,/nulle après arrondi/);
});
test('same expense on same account/day/native value/name is blocked',()=>{
 const p=env({existingTransactions:[{id:'prior',type:'expense',
  status:'confirmed',accountId:card.id,date:fields.purchaseDate,name:'COURSES',
  bankCurrency:'EUR',bankAmount:40}]});
 assert.throws(p.prepare,/doublons/);
});
test('duplicate document ID is always forbidden regardless of amount',()=>{
 const p=env({existingTransactions:[{id:fields.id,type:'transfer'}]});
 assert.throws(p.prepare,/Identifiant déjà utilisé/);
});
test('duplicate is compared natively, not using false CAD equality',()=>{
 const p=env({existingTransactions:[{id:'prior',type:'expense',
  status:'confirmed',accountId:card.id,date:fields.purchaseDate,name:'Courses',
  bankCurrency:'EUR',bankAmount:64,amountCAD:40}]});
 assert.equal(p.prepare().document.bankAmount,40);
});
test('missing or disabled category cannot be posted as an expense',()=>{
 assert.throws(env({categories:[]}).prepare,/Catégorie/);
 assert.throws(env({categories:[{...categories[0],archived:true}]}).prepare,/Catégorie/);
});
test('owner mismatch, archived bank, country mismatch and disabled model fail',()=>{
 for(const wrong of [
  {owner:'partner'}, {card:{...card,archived:true}},
  {checking:{...checking,country:'CA'}},
  {card:{...card,paymentMode:'credit'}}
 ])assert.throws(env(wrong).prepare,/incohérent/);
});
test('each missing or impossible date fails closed',()=>{
 for(const k of ['purchaseDate','budgetDate','dueDate'])
  assert.throws(env({fields:{...fields,[k]:''}}).prepare,/Dates/);
 assert.throws(env({fields:{...fields,dueDate:'2026-10-01'}}).prepare,/Dates/);
});
test('purchase currency distinct from bank requires origin amount',()=>{
 assert.throws(env({fields:{...fields,purchaseCurrency:'USD'}}).prepare,/Prix d’achat d’origine requis/);
 const p=env({fields:{...fields,purchaseCurrency:'USD',purchaseAmount:'50'}});
 assert.equal(p.prepare().document.currency,'USD');
 assert.equal(p.prepare().document.amountOriginal,50);
});
test('personal split stays 100 percent with the actual card owner',()=>{
 const partnerCard={...card,owner:'partner'};
 const partnerChecking={...checking,owner:'partner'};
 const p=env({owner:'partner',card:partnerCard,checking:partnerChecking}).prepare();
 assert.equal(p.document.beneficiary,'partner');
 assert.equal(p.document.splitAmounts.partner,64);
 assert.equal(p.document.splitAmounts.la,0);
});
test('freeze proposal and finance fields; no browser/remote calls',()=>{
 const p=env().prepare();
 assert.equal(Object.isFrozen(p),true);
 assert.equal(Object.isFrozen(p.document),true);
 assert.equal(Object.isFrozen(p.impactIfLaterConfirmed),true);
 assert.equal(p.requirements.length,4);
});
test('budgetDate remains distinct while debit settles later and is not another expense',()=>{
 const p=env().prepare();
 assert.equal(p.document.date,'2026-10-12');
 assert.equal(p.document.budgetDate,'2026-11-01');
 assert.equal(p.document.dueDate,'2026-12-05');
 assert.equal(p.impactIfLaterConfirmed.checkingDebitNow,0);
});
