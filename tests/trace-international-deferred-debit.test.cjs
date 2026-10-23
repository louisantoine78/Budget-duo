'use strict';
// Pure fictional deferred-debit accounting: no Supabase or bank file access.
// Test the real, deliberately isolated 5.37.0 module.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-deferred-debit-1.0.0.js'),'utf8'),{window:root});
const simulate=root.TraceDeferredDebit.simulate;
const card={id:'def_eur',type:'card',paymentMode:'deferred',
 settlementAccountId:'checking_eur',currency:'EUR',country:'FR',owner:'alice'};
const checking={id:'checking_eur',type:'checking',currency:'EUR',country:'FR',owner:'alice'};
const purchase=(id,amount='40.00',options={})=>({id,cardAccountId:card.id,
 currency:card.currency,purchaseDate:'2026-10-12',budgetDate:'2026-10-12',
 dueDate:'2026-11-05',amount,name:'Courses',status:'confirmed',...options});
const debit=(id,amount='40.00',ids=['p1'],options={})=>({id,cardAccountId:card.id,
 checkingAccountId:checking.id,currency:card.currency,debitDate:'2026-11-05',
 amount,purchaseIds:ids,status:'confirmed',...options});
const calculate=(purchases=[],settlements=[],asOfDate='2026-10-20',extra={})=>
 simulate({card,checking,purchases,settlements,asOfDate,...extra});
let count=0;function test(label,fn){fn();count++;console.log('PASS '+label);}
test('purchase spends budget on selected budgetDate with no checking debit yet',()=>{
 const r=calculate([purchase('p1')]);
 assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.liability,40);assert.equal(r.checkingBalanceChange,0);
 assert.equal(r.cardBalanceChange,-40);assert.equal(r.bankTransfers.length,0);
 assert.equal(r.budgetExpenses[0].checkingMovement,0);
});
test('future confirmed settlement does not debit checking early',()=>{
 const r=calculate([purchase('p1')],[debit('s1')]);
 assert.equal(r.liability,40);assert.equal(r.checkingBalanceChange,0);
 assert.equal(r.batches[0].status,'scheduled');
});
test('confirmed exact settlement debits checking and clears card, not budget',()=>{
 const r=calculate([purchase('p1')],[debit('s1')],'2026-11-05');
 assert.equal(r.liability,0);assert.equal(r.cardBalanceChange,0);
 assert.equal(r.checkingBalanceChange,-40);
 assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.monthlyBudget['2026-11'],undefined);
 assert.equal(r.bankTransfers.length,1);
 assert.equal(r.bankTransfers[0].internalTransfer,true);
 assert.equal(r.bankTransfers[0].budgetExpense,false);
 assert.equal(r.bankTransfers[0].budgetIncome,false);
});
test('budgetDate can be separate from purchaseDate and actual bank debit',()=>{
 const r=calculate([purchase('p1',40,{budgetDate:'2026-11-01'})],[debit('s1')],'2026-11-05');
 assert.equal(r.budgetExpenses[0].purchaseDate,'2026-10-12');
 assert.equal(r.monthlyBudget['2026-11'],40);
 assert.equal(r.checkingBalanceChange,-40);
});
test('purchase still outstanding on planned due date is overdue',()=>{
 const r=calculate([purchase('p1')],[],'2026-11-05');
 assert.equal(r.batches[0].status,'overdue');assert.equal(r.overdue,40);
});
test('future due-date batch is scheduled without overdue warning',()=>{
 const r=calculate([purchase('p1')],[],'2026-10-12');
 assert.equal(r.batches[0].status,'scheduled');assert.equal(r.overdue,0);
});
test('a pending bank settlement does not debit checking or reduce liability',()=>{
 const r=calculate([purchase('p1')],[debit('draft',40,['p1'],{status:'pending'})],'2026-11-05');
 assert.equal(r.batches[0].status,'pending_review');
 assert.equal(r.liability,40);assert.equal(r.checkingBalanceChange,0);
});
test('same due-date purchases form one full settlement with exact cents',()=>{
 const r=calculate([purchase('p1',19.99),purchase('p2',20.01)],[debit('s1',40,['p1','p2'])],'2026-11-05');
 assert.equal(r.liability,0);assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.bankTransfers[0].amount,40);
});
test('two batches on different due dates settle independently',()=>{
 const p=[purchase('p1',40),purchase('p2',20,{dueDate:'2026-12-05'})];
 const s=[debit('s1',40,['p1']),debit('s2',20,['p2'],{debitDate:'2026-12-05'})];
 const r=calculate(p,s,'2026-11-05');
 assert.equal(r.liability,20);assert.equal(r.checkingBalanceChange,-40);
 assert.equal(r.batches.length,2);assert.equal(r.batches[1].status,'scheduled');
});
test('late actual settlement can be tracked separately from expected date',()=>{
 const r=calculate([purchase('p1')],[debit('s1',40,['p1'],{debitDate:'2026-11-07'})],'2026-11-07');
 assert.equal(r.liability,0);assert.equal(r.batches[0].dueDate,'2026-11-05');
 assert.equal(r.batches[0].actualDebitDate,'2026-11-07');
});
test('no double spending when a debit is booked in a new calendar month',()=>{
 const p=[purchase('p1',30.05,{budgetDate:'2026-10-31',purchaseDate:'2026-10-31',dueDate:'2026-11-06'})];
 const r=calculate(p,[debit('settle',30.05,['p1'],{debitDate:'2026-11-06'})],'2026-11-06');
 assert.equal(r.monthlyBudget['2026-10'],30.05);
 assert.equal(r.monthlyBudget['2026-11'],undefined);
 assert.equal(r.bankTransfers[0].budgetExpense,false);
});
test('reject same purchase referenced twice in one bank debit',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('s1',80,['p1','p1'])]),/deux fois/);
});
test('reject two bank debits for the same batch, even one pending',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('s1'),debit('s2',40,['p1'],{status:'pending'})]),/répété/);
});
test('reject partial settlement so no debt silently disappears',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('s1',25,['p1'])]),/différent/);
});
test('reject settlement that covers only some purchases in same due-date batch',()=>{
 assert.throws(()=>calculate([purchase('p1'),purchase('p2')],[debit('s1',40,['p1'])]),/lot complet/);
});
test('reject a settlement combining two different due-date batches',()=>{
 assert.throws(()=>calculate([purchase('p1'),purchase('p2',10,{dueDate:'2026-12-05'})],
 [debit('s1',50,['p1','p2'])]),/échéances/);
});
test('reject settlement referencing unknown bank purchase',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('s1',40,['missing'])]),/introuvable/);
});
test('reject actual debit date earlier than card purchase',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('s1',40,['p1'],{debitDate:'2026-10-11'})]),/antérieur/);
});
test('reject dueDate earlier than purchaseDate or budgetDate',()=>{
 assert.throws(()=>calculate([purchase('p1',40,{dueDate:'2026-10-01'})]),/ambigu/);
 assert.throws(()=>calculate([purchase('p1',40,{budgetDate:'2026-12-01'})]),/ambigu/);
});
test('reject incomplete dates and invalid calendar dates',()=>{
 assert.throws(()=>calculate([purchase('p1',40,{purchaseDate:'2026-02-30'})]),/ambigu/);
 assert.throws(()=>calculate([purchase('p1',40,{budgetDate:'31/10/2026'})]),/ambigu/);
 assert.throws(()=>calculate([],[],'2026-02-30'),/invalide/);
});
test('reject fractional-cent, negative, zero and unverified purchase amounts',()=>{
 for(const amount of [10.005,-2,0,null,'']){
  assert.throws(()=>calculate([purchase('p1',amount)]),/ambigu/);
 }
 assert.throws(()=>calculate([purchase('p1',40,{status:'pending'})]),/ambigu/);
});
test('reject duplicate purchase identifiers',()=>{
 assert.throws(()=>calculate([purchase('same'),purchase('same')]),/ambigu/);
});
test('reject duplicate settlement identifiers',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('same'),debit('same')]),/répété|invalide/);
});
test('reject card and checking belonging to different people',()=>{
 assert.throws(()=>calculate([purchase('p1')],[],undefined,
 {checking:{...checking,owner:'bob'}}),/incompatibles/);
});
test('reject linked card and current account with different currencies',()=>{
 assert.throws(()=>calculate([purchase('p1')],[],undefined,
 {checking:{...checking,currency:'CAD'}}),/incompatibles/);
});
test('reject card and checking located in different countries',()=>{
 assert.throws(()=>calculate([],[],undefined,
 {checking:{...checking,country:'CA'}}),/incompatibles/);
});
test('reject credit card mistakenly passed off as deferred card',()=>{
 assert.throws(()=>calculate([],[],undefined,
 {card:{...card,paymentMode:'credit'}}),/incompatibles/);
});
test('EUR amount remains EUR, never assumes an exchange rate of 1 to CAD',()=>{
 const r=calculate([purchase('p1',52.35)],[],undefined,
 {card:{...card,currency:'EUR'},checking:{...checking,currency:'EUR'}});
 assert.equal(r.currency,'EUR');assert.equal(r.liability,52.35);
 assert.equal(r.budgetExpenses[0].currency,'EUR');
 assert.equal('amountCAD' in r.budgetExpenses[0],false);
});
test('status as of before purchase cannot create a phantom debt or expense',()=>{
 const r=calculate([purchase('p1',40,{purchaseDate:'2026-12-10',budgetDate:'2026-12-10',
 dueDate:'2027-01-05'})],[],'2026-10-23');
 assert.equal(r.liability,0);assert.equal(r.budgetExpenses.length,0);
 assert.equal(r.checkingBalanceChange,0);
});
test('reject a merchant refund mistakenly passed as a deferred expense',()=>{
 assert.throws(()=>calculate([purchase('p1',40,{type:'refund'})]),/ambigu/);
});
test('reject an income transaction disguised as a deferred card settlement',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('income',40,['p1'],{type:'income'})]),/invalide/);
});
test('reject implicit purchase refunds/fees instead of silently dropping their effects',()=>{
 assert.throws(()=>calculate([purchase('p1',40,{refundAmount:10})]),/ambigu/);
 assert.throws(()=>calculate([purchase('p1',40,{feeAmount:2})]),/ambigu/);
});
test('reject hidden settlement fees/refunds instead of inventing a zero-impact transfer',()=>{
 assert.throws(()=>calculate([purchase('p1')],[debit('settle',40,['p1'],{feeAmount:2})]),/invalide/);
 assert.throws(()=>calculate([purchase('p1')],[debit('settle',40,['p1'],{refundAmount:5})]),/invalide/);
});
test('known explicit accounting nature for a purchase and transfer is accepted',()=>{
 const r=calculate([purchase('p1',40,{type:'deferred_purchase'})],
 [debit('settle',40,['p1'],{type:'transfer'})],'2026-11-05');
 assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.checkingBalanceChange,-40);
});
test('input source objects remain unchanged and no writes are performed',()=>{
 const p=Object.freeze(purchase('p1')),s=Object.freeze(debit('settle'));
 const arrP=Object.freeze([p]),arrS=Object.freeze([s]);
 const before=JSON.stringify({p:arrP,s:arrS});
 const r=calculate(arrP,arrS,'2026-11-05');
 assert.equal(JSON.stringify({p:arrP,s:arrS}),before);
 assert.equal(r.writes,0);assert.equal(r.financialChanges,0);
});

const merchantRefund=(id,amount='10.01',options={})=>({id,purchaseId:'p1',
 cardAccountId:card.id,currency:card.currency,type:'merchant_refund',
 refundDate:'2026-10-20',budgetDate:'2026-10-20',
 amount,status:'confirmed',...options});
const withRefund=(refunds=[],settlements=[],asOfDate='2026-11-05',
 purchases=[purchase('p1')])=>simulate({card,checking,purchases,refunds,settlements,asOfDate});
test('merchant refund reduces budget, debt, and exact full net settlement',()=>{
 const r=withRefund([merchantRefund('r1')],[debit('s1',29.99)]);
 assert.equal(r.monthlyBudget['2026-10'],29.99);
 assert.equal(r.checkingBalanceChange,-29.99);
 assert.equal(r.cardBalanceChange,0);assert.equal(r.liability,0);
 assert.equal(r.merchantRefunds[0].budgetIncome,false);
 assert.equal(r.budgetRefunds[0].budgetReduction,true);
 assert.equal(r.bankTransfers[0].budgetExpense,false);
});
test('merchant refund on card never generates a checking debit or salary',()=>{
 const r=withRefund([merchantRefund('r1')]);
 assert.equal(r.liability,29.99);assert.equal(r.checkingBalanceChange,0);
 assert.equal(r.cardBalanceChange,-29.99);assert.equal(r.bankTransfers.length,0);
 assert.equal(r.merchantRefunds[0].checkingMovement,0);
});
test('pending merchant refund does not reduce budget or confirmed liability',()=>{
 const r=withRefund([merchantRefund('r1',10,{status:'pending'})]);
 assert.equal(r.liability,40);assert.equal(r.budgetRefunds.length,0);
 assert.equal(r.monthlyBudget['2026-10'],40);
});
test('full confirmed merchant refund clears due batch without transfer',()=>{
 const r=withRefund([merchantRefund('r1',40)]);
 assert.equal(r.liability,0);assert.equal(r.batches[0].status,'cleared_by_refund');
 assert.equal(r.overdue,0);assert.equal(r.bankTransfers.length,0);
});
test('refund not yet posted is excluded at earlier asOfDate',()=>{
 const r=withRefund([merchantRefund('r1')],[],'2026-10-19');
 assert.equal(r.liability,40);assert.equal(r.monthlyBudget['2026-10'],40);
});
test('multiple partial merchant refunds add exactly to original purchase',()=>{
 const r=withRefund([merchantRefund('r1','9.99'),merchantRefund('r2','30.01')]);
 assert.equal(r.liability,0);assert.equal(r.monthlyBudget['2026-10'],0);
});
test('reject refunds exceeding original purchase and fractional cents',()=>{
 assert.throws(()=>withRefund([merchantRefund('r1','40.01')]),/supérieurs/);
 assert.throws(()=>withRefund([merchantRefund('r1','10.005')]),/ambigu/);
});
test('reject orphan, wrong currency, fee, and unverified merchant refund',()=>{
 for(const opt of [{purchaseId:'missing'},{currency:'CAD'},
  {feeAmount:2},{status:'unverified'},{type:'income'}]){
  assert.throws(()=>withRefund([merchantRefund('r1',10,opt)]),/ambigu/);
 }
});
test('reject refund date after due date or before original purchase',()=>{
 assert.throws(()=>withRefund([merchantRefund('r1',10,{refundDate:'2026-11-06'})]),/ambigu/);
 assert.throws(()=>withRefund([merchantRefund('r1',10,{refundDate:'2026-10-11'})]),/ambigu/);
});
test('reject refunds after bank debit rather than guessing a credit account',()=>{
 assert.throws(()=>withRefund(
  [merchantRefund('r1',10,{refundDate:'2026-11-01'})],
  [debit('s1',30,['p1'],{debitDate:'2026-10-28'})]),/postérieur/);
});
test('partial settlement without a merchant refund remains blocked',()=>{
 assert.throws(()=>withRefund([], [debit('s1',29.99)]),/différent/);
});
test('unmodeled bank settlement fees remain explicitly blocked',()=>{
 assert.throws(()=>withRefund([], [debit('s1',40,['p1'],{feeAmount:2})]),/invalide/);
});
test('strict Node numeric zero for checking movement without a payment',()=>{
 const r=withRefund([merchantRefund('r1')]);
 assert.equal(Object.is(r.checkingBalanceChange,0),true);
});

const cardFee=(id,amount='2.30',opt={})=>({id,type:'card_fee',cardAccountId:card.id,
 currency:card.currency,chargeDate:'2026-10-21',budgetDate:'2026-10-21',
 dueDate:'2026-11-05',amount,status:'confirmed',...opt});
const withFee=(fees=[],purchases=[purchase('p1')],settlements=[],
 asOfDate='2026-11-05',refunds=[])=>simulate({card,checking,fees,purchases,settlements,
 refunds,asOfDate});
test('explicit card fee creates own budget expense and native card liability',()=>{
 const r=withFee([cardFee('f1')]);
 assert.equal(r.monthlyBudget['2026-10'],42.3);
 assert.equal(r.liability,42.3);assert.equal(r.checkingBalanceChange,0);
 assert.equal(r.cardBalanceChange,-42.3);
 assert.equal(r.budgetFees[0].budgetExpense,true);
 assert.equal(r.budgetFees[0].budgetIncome,false);
 assert.equal(r.batches[0].confirmedFees,2.3);
});
test('full due-date debit settles purchases and specifically named card fee',()=>{
 const r=withFee([cardFee('f1')],[purchase('p1')],
 [debit('s1',42.30,['p1'],{feeIds:['f1']})]);
 assert.equal(r.liability,0);assert.equal(r.checkingBalanceChange,-42.3);
 assert.equal(r.monthlyBudget['2026-10'],42.3);
 assert.equal(r.bankTransfers[0].budgetExpense,false);
 assert.equal(r.bankTransfers[0].budgetIncome,false);
 assert.equal(r.bankTransfers[0].amount,42.3);
});
test('separate bank transfer never creates another fee expense',()=>{
 const r=withFee([cardFee('f1')],[purchase('p1')],
 [debit('s1',42.30,['p1'],{feeIds:['f1'],type:'transfer'})]);
 assert.equal(r.budgetFees.length,1);
 assert.equal(r.bankTransfers.length,1);
 assert.equal(r.budgetExpenses.length,1);
});
test('fee-only due batch is payable with explicit fee references',()=>{
 const r=withFee([cardFee('f1')],[],[
  debit('s1',2.3,[],{feeIds:['f1']})]);
 assert.equal(r.liability,0);
 assert.equal(r.monthlyBudget['2026-10'],2.3);
 assert.equal(r.batches[0].status,'settled');
});
test('confirmed fee-only due batch outstanding counts toward overdue',()=>{
 const r=withFee([cardFee('f1')],[],[]);
 assert.equal(r.liability,2.3);assert.equal(r.overdue,2.3);
 assert.equal(r.batches[0].status,'overdue');
});
test('pending fee has no budget or debt impact and cannot be auto-settled',()=>{
 const r=withFee([cardFee('f1',2.30,{status:'pending'})]);
 assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.liability,40);assert.equal(r.budgetFees.length,0);
 assert.throws(()=>withFee([cardFee('f1',2.30,{status:'pending'})],
  [purchase('p1')],[debit('s1',42.30,['p1'],{feeIds:['f1']})]),/attente/);
});
test('future fee not yet charged cannot affect earlier snapshot',()=>{
 const r=withFee([cardFee('f1')],[purchase('p1')],[], '2026-10-20');
 assert.equal(r.liability,40);assert.equal(r.budgetFees.length,0);
});
test('two explicitly itemized card fees settle to the cent',()=>{
 const f=[cardFee('f1','0.01'),cardFee('f2','2.29')];
 const r=withFee(f,[purchase('p1')],[debit('s1',42.30,['p1'],
  {feeIds:['f1','f2']})]);
 assert.equal(r.liability,0);assert.equal(r.budgetFees.length,2);
});
test('merchant credit and fee produce net settlement with no duplicate expense',()=>{
 const r=withFee([cardFee('f1')],[purchase('p1')],
 [debit('s1',32.29,['p1'],{feeIds:['f1']})],
 '2026-11-05',[merchantRefund('r1','10.01')]);
 assert.equal(r.liability,0);assert.equal(r.monthlyBudget['2026-10'],32.29);
 assert.equal(r.bankTransfers[0].budgetExpense,false);
});
test('fee budget date is independent of checking settlement month',()=>{
 const f=[cardFee('f1','2.30',{chargeDate:'2026-10-31',
  budgetDate:'2026-11-01',dueDate:'2026-11-05'})];
 const r=withFee(f,[purchase('p1')],[debit('s1',42.3,['p1'],
  {feeIds:['f1']})]);
 assert.equal(r.monthlyBudget['2026-10'],40);
 assert.equal(r.monthlyBudget['2026-11'],2.3);
});
test('reject missing or duplicate fee references and partial fee settlement',()=>{
 assert.throws(()=>withFee([cardFee('f1')],[purchase('p1')],
  [debit('s1',42.30,['p1'])]),/lot complet/);
 assert.throws(()=>withFee([cardFee('f1')],[purchase('p1')],
  [debit('s1',42.30,['p1'],{feeIds:['f1','f1']})]),/deux fois/);
 assert.throws(()=>withFee([cardFee('f1')],[purchase('p1')],
  [debit('s1',40,['p1'],{feeIds:['f1']})]),/différent/);
});
test('reject fee with wrong currency, card, type, amount, or unknown metadata',()=>{
 for(const o of [{currency:'CAD'},{cardAccountId:'wrong'},
  {type:'income'},{amount:'0.001'},{amount:null},
  {taxAmount:'0.1'},{fxLegAmount:'1.2'}]){
  assert.throws(()=>withFee([cardFee('f1','2.30',o)]),/ambigus/);
 }
});
test('reject malformed fee dates and disallow hidden fee surcharge',()=>{
 for(const o of [{chargeDate:'2026-11-06'},{budgetDate:'2026-10-20'},
   {budgetDate:'2026-12-02'},{dueDate:'2026-02-30'}]){
  assert.throws(()=>withFee([cardFee('f1','2.30',o)]),/ambigus/);
 }
 assert.throws(()=>withFee([],[purchase('p1')],
  [debit('s1',42.3,['p1'],{feeAmount:2.3})]),/invalide/);
});
test('reject card fee dated after bank settlement even if same due date',()=>{
 assert.throws(()=>withFee([cardFee('f1','2.30',{chargeDate:'2026-11-01',
  budgetDate:'2026-11-01'})],[purchase('p1')],
  [debit('s1',42.3,['p1'],{feeIds:['f1'],debitDate:'2026-10-31'})]),/antérieur/);
});
test('reject mismatched due dates, unknown fee references and repeated fee id',()=>{
 assert.throws(()=>withFee([cardFee('f1')],[purchase('p1')],
 [debit('s1',42.3,['p1'],{feeIds:['notfound']})]),/introuvables/);
 assert.throws(()=>withFee([cardFee('f1','2.3',{dueDate:'2026-12-05'})],
 [purchase('p1')],[debit('s1',42.3,['p1'],{feeIds:['f1']})]),/échéances/);
 assert.throws(()=>withFee([cardFee('f1'),cardFee('f1')]),/ambigus/);
});
test('reject settlement partial even when card fee is explicitly recorded',()=>{
 assert.throws(()=>withFee([cardFee('f1')],[purchase('p1')],
 [debit('s1',30,['p1'],{feeIds:['f1']})]),/différent/);
});
test('input card fee objects stay immutable with no bank writes',()=>{
 const fees=Object.freeze([Object.freeze(cardFee('f1'))]);
 const before=JSON.stringify(fees);
 const r=withFee(fees);
 assert.equal(JSON.stringify(fees),before);
 assert.equal(r.writes,0);assert.equal(r.financialChanges,0);
});
console.log(count+' deferred-debit accounting laboratory scenarios passed');
