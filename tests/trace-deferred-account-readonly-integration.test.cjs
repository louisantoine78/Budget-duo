'use strict';
// Candidate real-ledger read-only debit differe display. All finance fixtures
// fictional. No browser, Supabase, network, PGlite or state mutation.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const fx=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-deferred-debit-1.0.0.js'),'utf8');
const start=app.indexOf('function traceDeferredAccountReview(card){'),
 end=app.indexOf('function openTraceAccountDetail(',start);
assert.ok(start>0&&end>start);
const code=app.slice(start,end);
const card={id:'card',type:'card',owner:'la',paymentMode:'deferred',currency:'EUR',
 country:'FR',settlementAccountId:'bank'};
const checking={id:'bank',type:'checking',owner:'la',currency:'EUR',country:'FR'};
const purchase={id:'p1',type:'expense',accountId:'card',date:'2026-10-12',
 budgetDate:'2026-10-12',dueDate:'2026-11-05',bankAmount:40,bankCurrency:'EUR',status:'confirmed'};
const transfer={id:'s1',type:'transfer',accountId:'bank',toAccountId:'card',
 date:'2026-11-05',status:'confirmed',bankAmount:40,bankCurrency:'EUR',
 toBankAmount:40,toBankCurrency:'EUR',deferredPurchaseIds:['p1'],deferredFeeIds:[]};
function scenario(rows=[purchase],options={}){
 const window={};vm.runInNewContext(fx,{window});if(!options.noEngine)vm.runInNewContext(engine,{window});
 const state={accounts:[checking,card],transactions:rows.map(t=>({...t}))};
 if(options.noChecking)state.accounts=[card];
 const before=JSON.stringify(state),saves={called:0};
 const factory=new Function('state','window','accountType','localDateISO','esc','accountEstimate',code+
  'return traceDeferredAccountReview;');
 const fn=factory(state,window,a=>a?.type,()=>options.asOf||'2026-10-20',
  s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',
  '"':'&quot;',"'":'&#39;'}[c])),()=>options.balance??null);
 const html=fn(options.card||card);
 return{html,unchanged:JSON.stringify(state)===before};
}
test('properly dated 40 EUR purchase remains a scheduled native debit, no checking write',()=>{
 const s=scenario();
 assert.match(s.html,/Débit différé · échéances/);
 assert.match(s.html,/À venir/);
 assert.match(s.html,/40,00/);
 assert.match(s.html,/Dette différée théorique/);
 assert.equal(s.unchanged,true);
});
test('confirmed 40 EUR card transfer clears only debt and leaves no extra budget expense',()=>{
 const s=scenario([purchase,transfer],{asOf:'2026-11-05'});
 assert.match(s.html,/Réglé/);assert.match(s.html,/0,00/);
 assert.equal(s.unchanged,true);
});
test('merchant refund is explicitly tied to purchase and reduces native liability',()=>{
 const refund={id:'r1',type:'refund',accountId:'card',status:'confirmed',
  date:'2026-10-15',budgetDate:'2026-10-15',bankAmount:10,
  bankCurrency:'EUR',deferredPurchaseId:'p1'};
 const s=scenario([purchase,refund]);
 assert.match(s.html,/30,00/);
});
test('missing budget date or due date blocks preview rather than assuming month',()=>{
 const s=scenario([{...purchase,dueDate:undefined}]);
 assert.match(s.html,/Informations bancaires incomplètes/);
 assert.doesNotMatch(s.html,/Dette différée théorique/);
});
test('unlinked bank card cannot inherit another owners checking account',()=>{
 const s=scenario([purchase],{noChecking:true});
 assert.match(s.html,/Compte de règlement à définir/);
});
test('settlement missing actual credited card amount never invents second bank leg',()=>{
 const s=scenario([purchase,{...transfer,toBankAmount:undefined}]);
 assert.match(s.html,/Informations bancaires incomplètes/);
});
test('a pending expense without confirmed merchant entry blocks a false debt',()=>{
 const s=scenario([{...purchase,status:'pending'}]);
 assert.match(s.html,/Informations bancaires incomplètes/);
});
test('deferred model never silently accepts generic card credit as income',()=>{
 const s=scenario([purchase,{id:'x',type:'income',accountId:'card',status:'confirmed',
  date:'2026-10-14',bankAmount:12,bankCurrency:'EUR'}]);
 assert.match(s.html,/Informations bancaires incomplètes/);
});
test('missing engine fails closed, no card balance is fabricated',()=>{
 const s=scenario([purchase],{noEngine:true});
 assert.match(s.html,/Analyse indisponible/);
});
test('nondeferred card does not render deferred section',()=>{
 const s=scenario([purchase],{card:{...card,paymentMode:'credit'}});
 assert.equal(s.html,'');
});
test('incompatible due date from the engine is a review error, not a write',()=>{
 const s=scenario([{...purchase,dueDate:'2026-10-10'}]);
 assert.match(s.html,/Rapprochement différé à vérifier/);
 assert.equal(s.unchanged,true);
});
test('account detail integrates readonly report before activity shortcuts',()=>{
 const tail=app.slice(app.indexOf('function openTraceAccountDetail('),
  app.indexOf('function openTraceAccountActivity('));
 assert.match(tail,/traceDeferredAccountReview\(a\)/);
 assert.doesNotMatch(code,/saveDocument|state\.transactions\.push|updateDocument/);
});

test('explicitly tagged deferred purchase is included in card reconciliation',()=>{
 const tagged={...purchase,deferredKind:'purchase'};
 const s=scenario([tagged]);
 assert.match(s.html,/Débit différé · échéances/);
 assert.match(s.html,/40,00/);
});
test('unknown deferred transaction type is blocked instead of treated as purchase',()=>{
 const unknown={...purchase,deferredKind:'unrecognized'};
 const s=scenario([unknown]);
 assert.match(s.html,/Informations bancaires incomplètes/);
 assert.doesNotMatch(s.html,/Dette différée théorique/);
});


test('deferred EUR card displays estimated checking, unpaid liability and single-card forecast',()=>{
 const s=scenario([purchase],{balance:1000});
 assert.match(s.html,/Compte courant · solde calculé TRACE/);
 assert.match(s.html,/Différé restant à prélever · cette carte/);
 assert.match(s.html,/Solde prévisionnel · après cette carte/);
 assert.match(s.html,/960,00/);assert.match(s.html,/non attesté en temps réel/);
 assert.equal(s.unchanged,true);
});
test('settlement already included in current bank estimate is never debited twice',()=>{
 const s=scenario([purchase,transfer],{balance:960,asOf:'2026-11-05'});
 assert.match(s.html,/Solde prévisionnel · après cette carte/);
 assert.match(s.html,/960,00/);assert.equal(s.unchanged,true);
});
test('without trusted checking estimate card liabilities remain visible but forecast is hidden',()=>{
 const s=scenario([purchase],{balance:null});
 assert.match(s.html,/Dette différée théorique/);
 assert.match(s.html,/prévision indisponibles/);
 assert.doesNotMatch(s.html,/Solde prévisionnel · après cette carte/);
});
test('future confirmed bank movement cannot contaminate todays cash forecast',()=>{
 const s=scenario([purchase,transfer],{balance:1000,asOf:'2026-10-20'});
 assert.match(s.html,/prévision indisponibles/);
 assert.doesNotMatch(s.html,/Solde prévisionnel · après cette carte/);
});
