'use strict';
/* Execute the REAL save() closure from the production-candidate transaction
 * editor with entirely fictional records; no DOM, HTTP, Supabase or storage.
 * All assertions concern user consent, native cents, audit trail and writes. */
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),
 app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8'),
 engine=fs.readFileSync(path.join(root,'trace-international-1.0.0.js'),'utf8');
function section(first,last){
 const i=app.indexOf(first),j=app.indexOf(last,i);
 assert.ok(i>=0&&j>i,'Missing live candidate section '+first);
 return app.slice(i,j);
}
const helper=section('function tracePossibleForeignDebitCorrection(','\nfunction smartDrafts(');
const saveSource=section(' async function save(confirm){',"\n $('#txSave').onclick=()=>save(false);");
function setup(options={}){
 const window={};new Function('window',engine)(window);
 const I=window.TraceInternational;
 window.TraceMovement={paidForExpense:()=>options.reimbursed||0};
 window.TraceImportGuide={cardStatementSettlementLabel:()=>false};
 const bank={id:'ca',type:'checking',country:'CA',currency:'CAD',owner:'la',
   ...options.bank};
 const t={id:'manual_1',status:'confirmed',type:'expense',
   date:'2026-11-03',name:'Cafe Voyage',accountId:'ca',
   bankCurrency:'CAD',bankAmount:45.50,amountCAD:45.50,
   currency:'GBP',amountOriginal:25,categoryId:'food',
   beneficiary:'la',payerId:'la',
   split:{la:100,partner:0},splitAmounts:{la:45.50,partner:0},
   fxBankAmountStatus:'estimated',
   purchaseFxReference:1.82,purchaseFxRateDate:'2026-11-03',
   purchaseFxRateSource:'Fictional quoted rate',
   ...options.transaction};
 const state={accounts:[bank],transactions:[t],
  categories:[{id:'food',name:'Restaurants',type:'expense'}]};
 const entries={
  '#txAmount':{value:String(options.bankAmount??46.12)},
  '#txType':{value:'expense'},'#txDate':{value:'2026-11-03'},
  '#txName':{value:'Cafe Voyage'},'#txCategory':{value:t.categoryId},
  '#txAccount':{value:'ca'},'#txWho':{value:t.beneficiary},
  '#txOriginalCurrency':{value:'GBP'},'#txOriginalAmount':{value:'25'},
  '#txFxOverride':{value:''},'#txFriendsAmount':{value:String(t.splitAmounts?.friends||0)},
  '#txPartnerAmount':{value:String(t.splitAmounts?.partner||0)},'#txFriendDebtorName':{value:''},
  '#txFriendDebtorShares':{value:''},
  '#txDebitReviewConfirm':{checked:options.checked??false},
  '#txCsvDistinctVerified':{checked:false},
  '#txSave':{disabled:false},'#txValidate':{disabled:false},
  '#traceFeedback':{textContent:''}
 };
 const $=sel=>{assert.ok(entries[sel], 'Missing DOM stub '+sel);return entries[sel];};
 const writes=[],ui={closed:0,render:0},debitReview={
  accountId:'ca',date:'2026-11-03',amount:46.12,
  previousAmount:45.50,snapshot:''
 };
 const deps={t,debitReview,state,M:{get:()=>({type:'expense',budget:'expense'})},
  U:{kindsFor:()=>[{id:'expense'}]},$,
  window,me:'la',partner:'partner',accountType:a=>a.type,initialDirection:'out',
  csvInitiallyReviewed:'same',csvReviewIdentity:()=> 'same',
  csvBankEvidenceMatches:()=>[],normalizedMerchant:x=>String(x||'').trim().toLowerCase(),
  smartExactBankAmount:I.exactMoney,smartStrictDate:s=>/^\d{4}-\d{2}-\d{2}$/.test(s),
  traceCustomShares:()=>{throw Error('Unexpected custom share');},
  traceSplit:(who,cad)=>({split:{la:100,partner:0},splitAmounts:{la:cad,partner:0}}),
  friendDebtorFields:()=>({}),
  saveDocument:async(type,row)=>{
   if(options.fail)throw Error('Simulated bank write failure');
   writes.push({type,row:JSON.parse(JSON.stringify(row))});
  },
  closeSheet:()=>{ui.closed++;},renderAll:()=>{ui.render++;},
  navigate:()=>{},showTab:()=>{},traceNotice:e=>{entries['#traceFeedback'].textContent=String(e)}
 };
 const names=Object.keys(deps);
 const real=new Function(...names,helper+'\n'+saveSource+
  '\nreturn {save,fingerprint:traceForeignDebitFingerprint};')(...Object.values(deps));
 debitReview.snapshot=real.fingerprint(t);
 return {...real,state,t,bank,debitReview,entries,writes,ui};
}
test('unchecked screenshot attestation cannot alter the bank ledger',async()=>{
 const c=setup(),before=JSON.stringify(c.t);
 await c.save(false);
 assert.equal(c.writes.length,0);
 assert.equal(JSON.stringify(c.t),before);
 assert.match(c.entries['#traceFeedback'].textContent,/Confirme le débit bancaire/);
});
test('approved screenshot updates exactly one existing transaction and preserves purchase source',async()=>{
 const c=setup({checked:true});
 await c.save(false);
 assert.equal(c.writes.length,1);
 assert.equal(c.writes[0].type,'transactions');
 const next=c.writes[0].row;
 assert.equal(next.id,'manual_1');
 assert.equal(next.bankAmount,46.12);
 assert.equal(next.amountCAD,46.12);
 assert.equal(next.bankCurrency,'CAD');
 assert.equal(next.currency,'GBP');
 assert.equal(next.amountOriginal,25);
 assert.equal(next.fxBankAmountStatus,'bank_confirmed');
 assert.equal(next.purchaseFxReference,1.82);
 assert.equal(next.purchaseFxRateDate,'2026-11-03');
 assert.equal(next.purchaseFxRateSource,'Fictional quoted rate');
 assert.equal(next.bankDebitReview.previousBankAmount,45.50);
 assert.equal(next.bankDebitReview.actualBankAmount,46.12);
 assert.equal(next.bankDebitReview.source,'capture_compare_confirmed');
 assert.equal(next.categoryId,'food');
 assert.equal(next.split.la,100);
 assert.equal(next.splitAmounts,null);
 assert.equal(c.state.transactions.length,1);
 assert.equal(c.t.bankAmount,46.12);
 assert.equal(c.ui.closed,1);
 assert.equal(c.ui.render,1);
});
test('a changed transaction during screenshot review rejects stale evidence',async()=>{
 const c=setup({checked:true});c.t.bankAmount=49.99;
 await c.save(false);
 assert.equal(c.writes.length,0);
 assert.match(c.entries['#traceFeedback'].textContent,/changé/);
});
test('modifying the original 25 GBP price is forbidden during a debit-only review',async()=>{
 const c=setup({checked:true});c.entries['#txOriginalAmount'].value='30';
 await c.save(false);
 assert.equal(c.writes.length,0);
 assert.equal(c.t.amountOriginal,25);
});
test('wrong evidence amount, currency or merchant blocks the bank correction',async()=>{
 for(const [field,value] of [
  ['#txAmount','46.13'],['#txOriginalCurrency','EUR'],
  ['#txName','Other merchant'],['#txAccount','wrong']]){
  const c=setup({checked:true});c.entries[field].value=value;
  await c.save(false);assert.equal(c.writes.length,0,field);
 }
});
test('bank ownership/currency change during a screenshot review blocks writing',async()=>{
 for(const change of [{owner:'partner'},{currency:'EUR'},{paymentMode:'deferred'}]){
  const c=setup({checked:true});Object.assign(c.bank,change);
  await c.save(false);
  assert.equal(c.writes.length,0,JSON.stringify(change));
  assert.match(c.entries['#traceFeedback'].textContent,/compte bancaire a changé/);
 }
});
test('invalid fractional cents and negative values cannot be persisted',async()=>{
 for(const amount of ['46.125','-1','0']){
  const c=setup({checked:true});c.entries['#txAmount'].value=amount;
  await c.save(false);assert.equal(c.writes.length,0,amount);
 }
});
test('failed cloud persistence leaves the original operation untouched',async()=>{
 const c=setup({checked:true,fail:true}),before=JSON.stringify(c.t);
 await c.save(false);
 assert.equal(c.writes.length,0);
 assert.equal(JSON.stringify(c.t),before);
 assert.equal(c.entries['#txSave'].disabled,false);
});

test('existing 70/30 couple split persists even if default split later changes',async()=>{
 const c=setup({checked:true,transaction:{
  beneficiary:'couple',split:{la:70,partner:30},
  splitAmounts:{la:31.85,partner:13.65}
 }});
 await c.save(false);
 assert.equal(c.writes.length,1);
 const s=c.writes[0].row.splitAmounts;
 assert.equal(s.la,32.28);
 assert.equal(s.partner,13.84);
 assert.equal(Math.round(s.la*100)+Math.round(s.partner*100),4612);
 assert.equal(c.writes[0].row.beneficiary,'couple');
});
test('a custom share preserves friends and partner fixed amounts; the owner absorbs FX delta',async()=>{
 const c=setup({checked:true,transaction:{
  beneficiary:'custom',split:{la:34.065934,partner:21.978022,friends:43.956044},
  splitAmounts:{la:15.50,partner:10,friends:20},friendDebtorName:'Camille'
 }});
 await c.save(false);
 assert.equal(c.writes.length,1);
 const row=c.writes[0].row;
 assert.equal(row.splitAmounts.la,16.12);
 assert.equal(row.splitAmounts.partner,10);
 assert.equal(row.splitAmounts.friends,20);
 assert.equal(row.friendDebtorName,'Camille');
 assert.equal(Math.round(row.splitAmounts.la*100)+Math.round(row.splitAmounts.partner*100)+Math.round(row.splitAmounts.friends*100),4612);
});
test('an approved friends repayment remains protected after a banking correction',async()=>{
 const c=setup({checked:true,reimbursed:1250,transaction:{
  beneficiary:'custom',splitAmounts:{la:15.5,partner:10,friends:20},
  friendDebtorName:'Camille'
 }});
 await c.save(false);
 assert.equal(c.writes.length,1);
 assert.equal(c.writes[0].row.splitAmounts.friends,20);
 assert.equal(c.t.friendDebtorName,'Camille');
});
test('changed category, beneficiary or manual FX rate must be rejected',async()=>{
 for(const [field,value] of [['#txCategory','other'],['#txWho','couple'],['#txFxOverride','1.5']]){
  const c=setup({checked:true});c.entries[field].value=value;
  await c.save(false);
  assert.equal(c.writes.length,0,field);
 }
});
test('a confirmed friend share cannot exceed the corrected bank debit',async()=>{
 const c=setup({checked:true,bankAmount:46.12,transaction:{
  beneficiary:'custom',splitAmounts:{la:5.5,partner:20,friends:20},
  friendDebtorName:'Camille'
 }});
 c.entries['#txAmount'].value='20';
 c.debitReview.amount=20;
 await c.save(false);
 assert.equal(c.writes.length,0);
});
