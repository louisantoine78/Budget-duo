'use strict';
/* Integrated fictional Mastercard + friends ledger cycle, no real account or network.
 * These are extracted real TRACE functions with in-memory state, not Safari/PWA tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=read('v5-app-5.37.0.js'),root={};
vm.runInNewContext(read('trace-movement-5.36.0.js'),{window:root});
vm.runInNewContext(read('trace-international-1.0.0.js'),{window:root});
const M=root.TraceMovement,I=root.TraceInternational;
const accounts=[
 {id:'ca',type:'checking',name:'Courant CAD',owner:'la',country:'CA',currency:'CAD'},
 {id:'mc',type:'card',name:'Mastercard',owner:'la',country:'CA',currency:'CAD',settlementAccountId:'ca'}
];
const purchase={id:'purchase',type:'expense',status:'confirmed',name:'Restaurant',
 date:'2026-10-09',payerId:'la',accountId:'mc',beneficiary:'custom',amountCAD:120,
 splitAmounts:{la:45,partner:25,friends:50},
 friendDebtorShares:[{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]};
const camille={id:'camille-pay',type:'external_refund',transferPurpose:'friend_reimbursement',
 status:'confirmed',name:'Camille',date:'2026-10-10',payerId:'la',accountId:'ca',
 counterparty:'Camille',amountCAD:15,repaymentAllocations:[{expenseId:'purchase',amountCAD:15}]};
const mastercard={id:'card-pay',type:'transfer',transferPurpose:'card_repayment',
 status:'confirmed',name:'Mastercard',date:'2026-10-11',
 payerId:'la',beneficiary:'la',accountId:'ca',toAccountId:'mc',amountCAD:100,toBankAmount:100};
const evidence={id:'card-evidence',type:'card_statement_evidence',
 transferPurpose:'card_payment_received',status:'confirmed',
 accountId:'mc',linkedTransactionId:'card-pay',date:'2026-10-11',amountCAD:100};
const merchantRefund={id:'merchant-refund',type:'refund',status:'confirmed',
 name:'Retour commerçant',date:'2026-10-12',payerId:'la',accountId:'mc',
 beneficiary:'custom',amountCAD:12,splitAmounts:{la:12,partner:0,friends:0}};
function pick(name,deps){
 const from=app.indexOf('function '+name+'('),to=app.indexOf('\nfunction ',from+10);
 assert.ok(from>=0&&to>from,'Missing real function '+name);
 const helper=name==='accountEstimate'?
  app.slice(app.indexOf('function traceLinkedBankTransactionCovers('),from):'';
 return new Function(...Object.keys(deps),helper+'\nreturn ('+app.slice(from,to)+');')(...Object.values(deps));
}
function scenario(transactions=[],reconciliations=[],accountCatalogue=accounts){
 const state={household:{referenceDate:'2026-10-01',accountOpeningBalances:{ca:1000,mc:0},
  accountOpeningBalanceDates:{ca:'2026-10-01',mc:'2026-10-01'},
  defaultSplit:{la:50,partner:50},sharingOpeningBalance:0},
  accounts:accountCatalogue,reconciliations,investmentOperations:[],categories:[],budgets:[],transactions};
 const openingBoundary=pick('openingBoundary',{state});
 const afterBoundary=pick('afterBoundary',{});
 const accountType=pick('accountType',{});
 const split=pick('split',{state});
 const alloc=pick('alloc',{split});
 const isFinancialPeriod=pick('isFinancialPeriod',{state,openingBoundary,afterBoundary,window:root});
 const traceBudgetPostingMonth=pick('traceBudgetPostingMonth',{window:root});
 const txs=pick('txs',{state,isFinancialPeriod,split,traceBudgetPostingMonth});
 const summary=pick('summary',{state,txs,alloc,cat:()=>({type:'expense'}),budgetAmt:()=>0});
 const accountEstimate=pick('accountEstimate',{state,openingBoundary,afterBoundary,accountType,window:root});
 const sharingMovement=pick('sharingMovement',{split});
 const sharingHistory=pick('sharingHistory',{state,afterBoundary,isFinancialPeriod,sharingMovement});
 const coupleBalance=pick('coupleBalance',{state,sharingHistory});
 return{state,accountEstimate,summary,sharingHistory,coupleBalance,
  balance:id=>accountEstimate(accountCatalogue.find(a=>a.id===id)),
  due:name=>M.friendReceivables(state.transactions,'la').find(x=>x.name===name)?.outstandingCAD,
  budget:scope=>summary('2026-10',scope).expense};
}
let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label);}
test('Mastercard purchase creates debt, not immediate checking debit',()=>{
 const x=scenario([purchase]);
 assert.equal(x.balance('ca'),1000);assert.equal(x.balance('mc'),-120);
});
test('120 CAD expense allocates 45 mine, 25 partner, 50 outside couple budget',()=>{
 const x=scenario([purchase]);
 assert.equal(x.budget('la'),45);assert.equal(x.budget('partner'),25);
 assert.equal(x.budget('couple'),70);
 assert.equal(x.coupleBalance(),25);
});
test('30 Camille and 20 Alex are independent named receivables',()=>{
 const x=scenario([purchase]);assert.equal(x.due('Camille'),30);
 assert.equal(x.due('Alex'),20);
});
test('confirmed partial Camille receipt increases checking only and is not income',()=>{
 const x=scenario([purchase,camille]);
 assert.equal(x.balance('ca'),1015);assert.equal(x.balance('mc'),-120);
 assert.equal(x.due('Camille'),15);assert.equal(x.due('Alex'),20);
 assert.equal(x.summary('2026-10','la').income,0);
 assert.equal(x.budget('couple'),70);assert.equal(x.coupleBalance(),25);
});
test('unconfirmed receipt affects neither cash nor debt to friend',()=>{
 const x=scenario([purchase,{...camille,status:'pending'}]);
 assert.equal(x.balance('ca'),1000);assert.equal(x.due('Camille'),30);
});
test('single Mastercard payment debits checking and reduces card debt without budget impact',()=>{
 const x=scenario([purchase,camille,mastercard]);
 assert.equal(x.balance('ca'),915);assert.equal(x.balance('mc'),-20);
 assert.equal(x.budget('couple'),70);assert.equal(x.coupleBalance(),25);
 assert.equal(M.impact('card_payment',100,'la').budget.couple,0);
});
test('linked card statement evidence does not create a second 100 CAD credit',()=>{
 const x=scenario([purchase,camille,mastercard,evidence]);
 assert.equal(x.balance('ca'),915);assert.equal(x.balance('mc'),-20);
 assert.equal(x.state.transactions.filter(t=>t.type==='transfer').length,1);
});
test('merchant refund reduces card debt and actual spending, never a friend repayment',()=>{
 const x=scenario([purchase,camille,mastercard,evidence,merchantRefund]);
 assert.equal(x.balance('ca'),915);assert.equal(x.balance('mc'),-8);
 assert.equal(x.budget('la'),33);assert.equal(x.budget('partner'),25);
 assert.equal(x.budget('couple'),58);assert.equal(x.due('Camille'),15);
 assert.equal(x.coupleBalance(),25);assert.equal(M.repaymentLines(merchantRefund).length,0);
});
test('card debt and checking net after partial repayment are not double counted',()=>{
 const x=scenario([purchase,camille,mastercard,evidence]);
 const snapshot=I.snapshot({accounts,owner:'la',mainId:'ca',estimates:{ca:x.balance('ca'),mc:x.balance('mc')}});
 assert.equal(snapshot.net,895);assert.equal(snapshot.globalCAD,895);
});
test('wrong debtor cannot reimburse another person after partial payment',()=>{
 assert.throws(()=>M.validateRepaymentAllocations([{expenseId:'purchase',amountCAD:16}],
  [purchase],[purchase,camille],'la','2026-10-13',16,'','Camille'),/dépasse/);
 assert.throws(()=>M.validateRepaymentAllocations([{expenseId:'purchase',amountCAD:10}],
  [purchase],[purchase,camille],'la','2026-10-13',10,'','Jordan'),/Choisis le proche/);
});
test('reallocation cannot put Camille share below already-confirmed reimbursement',()=>{
 assert.throws(()=>M.validateFriendDebtorShares(
  [{name:'Camille',amountCAD:10},{name:'Alex',amountCAD:40}],50,[purchase,camille],'purchase'),/remboursements/);
});
test('same-day confirmed reconciliation anchors both bank balances without replay',()=>{
 const ledger=[purchase,camille,mastercard,evidence,merchantRefund];
 const before=scenario(ledger);
 const reconciliations=[
  {id:'rec-ca',accountId:'ca',date:'2026-10-12',status:'confirmed',actualBalance:915,currency:'CAD'},
  {id:'rec-mc',accountId:'mc',date:'2026-10-12',status:'confirmed',
   cardBalanceKind:'debt',actualBalance:-8,currency:'CAD'}
 ];
 const after=scenario(ledger,reconciliations);
 assert.equal(before.balance('ca'),915);assert.equal(after.balance('ca'),915);
 assert.equal(before.balance('mc'),-8);assert.equal(after.balance('mc'),-8);
 assert.equal(after.budget('couple'),58);
});
test('a later pending reconciliation cannot replace an earlier confirmed bank closing',()=>{
 const x=scenario([purchase,camille,mastercard,evidence],[
 {id:'confirmed',accountId:'ca',date:'2026-10-11',status:'confirmed',actualBalance:915},
 {id:'pending',accountId:'ca',date:'2026-10-12',status:'pending',actualBalance:3}
 ]);
 assert.equal(x.balance('ca'),915);
});
test('after a matched card reconciliation, a new purchase changes debt once',()=>{
 const x=scenario([purchase,camille,mastercard,evidence,merchantRefund,
  {id:'purchase-2',type:'expense',accountId:'mc',payerId:'la',
   status:'confirmed',date:'2026-10-13',amountCAD:5,beneficiary:'la'}],[
  {id:'rec-card',accountId:'mc',status:'confirmed',date:'2026-10-12',
   cardBalanceKind:'debt',actualBalance:-8}
 ]);
 assert.equal(x.balance('mc'),-13);
});
test('no bank opening must stay unknown rather than treating missing cash as zero',()=>{
 const x=scenario([purchase]);
 delete x.state.household.accountOpeningBalances.ca;
 assert.equal(x.balance('ca'),null);
});

test('historical mismatched Mastercard payment makes both balances unknown',()=>{
 const mismatch={...mastercard,id:'wrong-card-credit',amountCAD:100,
  toBankAmount:80,bankAmount:100,transferFeeAmount:0};
 const x=scenario([purchase,mismatch]);
 assert.equal(x.balance('ca'),null);
 assert.equal(x.balance('mc'),null);
});
test('card settlement reassignment keeps historical balanced payments unchanged',()=>{
 const backup={...accounts[0],id:'backup',name:'Backup CAD checking'};
 const updated=accounts.map(a=>a.id==='mc'?{...a,settlementAccountId:'backup'}:a);
 const x=scenario([purchase,mastercard],[],[...updated,backup]);
 assert.equal(x.balance('ca'),900,'Previously debited checking remains correct');
 assert.equal(x.balance('mc'),-20,'Valid historical repayment remains a card credit');
 assert.equal(x.budget('couple'),70,'Card payment does not create additional expenses');
});
test('historic credit-card transfer with fee cannot be silently counted as debt repayment',()=>{
 const wrongFee={...mastercard,id:'fee-on-card-pay',bankAmount:100,
  toBankAmount:100,transferFeeAmount:1};
 const x=scenario([purchase,wrongFee]);
 assert.equal(x.balance('ca'),null);
 assert.equal(x.balance('mc'),null);
});
test('old CAD card payment lacking native bank fields retains legacy equal cash legs',()=>{
 const old={...mastercard,id:'legacy-card-payment'};
 delete old.toBankAmount;
 const x=scenario([purchase,old]);
 assert.equal(x.balance('ca'),900);
 assert.equal(x.balance('mc'),-20);
});
test('bad card settlement before an authenticated later reconciliation does not poison later cash',()=>{
 const oldBad={...mastercard,id:'old-unequal-card',date:'2026-10-11',
  bankAmount:100,toBankAmount:70};
 const after=scenario([purchase,oldBad],[{
  id:'checking-reconciled',accountId:'ca',date:'2026-10-12',
  status:'confirmed',currency:'CAD',actualBalance:800
 },{
  id:'card-reconciled',accountId:'mc',date:'2026-10-12',
  status:'confirmed',currency:'CAD',actualBalance:-50,cardBalanceKind:'debt'
 }]);
 assert.equal(after.balance('ca'),800);
 assert.equal(after.balance('mc'),-50);
});
console.log(count+' fictional Mastercard/friends lifecycle checks passed');
