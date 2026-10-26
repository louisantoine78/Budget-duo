'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const app=read('v5-app-5.37.0.js'),root={};
vm.runInNewContext(read('trace-international-1.0.0.js'),{window:root});
const I=root.TraceInternational,EUR={id:'eur',type:'checking',currency:'EUR'},
 CAD={id:'cad',type:'checking',currency:'CAD'};
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
function estimate(bank,opening,transactions=[],investmentOperations=[]){
 const from=app.indexOf('function accountEstimate('),to=app.indexOf('\nfunction bank(',from);
 assert.ok(from>0&&to>from);
 const state={household:{accountOpeningBalances:{[bank.id]:opening}},transactions,
 investmentOperations,reconciliations:[]};
 const helperStart=app.indexOf('function traceLinkedBankTransactionCovers(');
 assert.ok(helperStart>0&&helperStart<from);
 return new Function('state','window','accountType','openingBoundary','afterBoundary',
 app.slice(helperStart,from)+'\nreturn ('+app.slice(from,to)+');')(state,root,a=>a.type,
 ()=>({date:'2026-10-01',mode:'start'}),
 (date,b)=>b?.mode==='end'?String(date)>b.date:String(date)>=b.date)(bank);
}
test('CAD legacy 300 debit',()=>assert.equal(I.investmentBankAmount({bankAmountCAD:300},CAD),300));
test('EUR native bank debit',()=>assert.equal(I.investmentBankAmount({bankAmount:46.2,bankCurrency:'EUR',bankAmountCAD:73.92},EUR),46.2));
test('EUR never guesses native from CAD',()=>assert.equal(I.investmentBankAmount({bankAmountCAD:73.92},EUR),null));
test('unknown currency mismatch',()=>assert.equal(I.investmentBankAmount({bankAmount:100,bankCurrency:'CAD'},EUR),null));
test('EUR native cash balance',()=>assert.equal(estimate(EUR,500,[],[{bankAccountId:'eur',type:'deposit',date:'2026-10-12',bankAmount:46.2,bankCurrency:'EUR'}]),453.8));
test('unknown EUR cash balance',()=>assert.equal(estimate(EUR,500,[],[{bankAccountId:'eur',type:'deposit',date:'2026-10-12',bankAmountCAD:73.92}]),null));
test('historic CAD cash balance',()=>assert.equal(estimate(CAD,1000,[],[{bankAccountId:'cad',type:'deposit',date:'2026-10-12',bankAmountCAD:300}]),700));
test('explicit linked bank transfer counted once',()=>{
 const tx={id:'wire',accountId:'cad',type:'external_transfer',status:'confirmed',date:'2026-10-12',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',date:'2026-10-12',bankAmountCAD:300,linkedTransactionId:'wire'};
 assert.equal(estimate(CAD,1000,[tx],[op]),700);
});
test('pending transfer never suppresses bank leg',()=>{
 const tx={id:'wire',accountId:'cad',type:'external_transfer',status:'pending',date:'2026-10-12',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',date:'2026-10-12',bankAmountCAD:300,linkedTransactionId:'wire'};
 assert.equal(estimate(CAD,1000,[tx],[op]),700);
});
test('foreign investment link requires explicit bank-native amount',()=>{
 assert.ok(app.includes("bankRaw=$('#invBankCad').value.trim()"));
 assert.ok(app.includes('bankCurrency,bankAmount,bankAmountCAD'));
 assert.ok(!app.includes('la liaison bancaire est bloquée'));
});

test('wrong-amount linked debit blocks the bank balance, never hides 50 CAD',()=>{
 const tx={id:'wrong',accountId:'cad',type:'external_transfer',status:'confirmed',
  date:'2026-10-12',amountCAD:250};
 const op={bankAccountId:'cad',type:'deposit',date:'2026-10-12',
  bankAmountCAD:300,linkedTransactionId:'wrong'};
 assert.equal(estimate(CAD,1000,[tx],[op]),null);
});
test('bank income with same amount cannot disguise an investment debit',()=>{
 const tx={id:'income',accountId:'cad',type:'income',status:'confirmed',
  date:'2026-10-12',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',date:'2026-10-12',
  bankAmountCAD:300,linkedTransactionId:'income'};
 assert.equal(estimate(CAD,1000,[tx],[op]),null);
});
test('confirmed withdrawal linked to real incoming refund increases cash once',()=>{
 const tx={id:'refund',accountId:'cad',type:'external_refund',status:'confirmed',
  date:'2026-10-12',amountCAD:60};
 const op={bankAccountId:'cad',type:'withdrawal',date:'2026-10-12',
  bankAmountCAD:60,linkedTransactionId:'refund'};
 assert.equal(estimate(CAD,1000,[tx],[op]),1060);
});
test('withdrawal pointing to a bank debit is a contradiction, not neutral cash',()=>{
 const tx={id:'debit',accountId:'cad',type:'external_transfer',status:'confirmed',
  date:'2026-10-12',amountCAD:60};
 const op={bankAccountId:'cad',type:'withdrawal',date:'2026-10-12',
  bankAmountCAD:60,linkedTransactionId:'debit'};
 assert.equal(estimate(CAD,1000,[tx],[op]),null);
});
test('EUR linked debit needs valid, matching native currency and cents',()=>{
 const tx={id:'foreign',accountId:'eur',type:'external_transfer',
  status:'confirmed',date:'2026-10-12',bankCurrency:'EUR',bankAmount:46.2};
 const op={bankAccountId:'eur',type:'deposit',date:'2026-10-12',
  bankAmount:46.2,bankCurrency:'EUR',linkedTransactionId:'foreign'};
 assert.equal(estimate(EUR,500,[tx],[op]),453.8);
 delete op.bankCurrency;assert.equal(estimate(EUR,500,[tx],[op]),null);
 op.bankCurrency='EUR';op.bankAmount=46.21;assert.equal(estimate(EUR,500,[tx],[op]),null);
});
test('statement-only evidence cannot suppress the cash deposit leg',()=>{
 const tx={id:'marker',accountId:'cad',type:'card_statement_evidence',
  status:'confirmed',date:'2026-10-12',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',date:'2026-10-12',
  bankAmountCAD:300,linkedTransactionId:'marker'};
 assert.equal(estimate(CAD,1000,[tx],[op]),700);
});

test('two investments cannot both claim one confirmed CAD bank debit',()=>{
 const tx={id:'single-debit',type:'external_transfer',accountId:'cad',
  status:'confirmed',date:'2026-10-12',amountCAD:100};
 const first={id:'investment-a',bankAccountId:'cad',type:'deposit',
  status:'confirmed',date:'2026-10-12',bankAmountCAD:100,linkedTransactionId:'single-debit'};
 const second={...first,id:'investment-b',date:'2026-10-13'};
 assert.equal(estimate(CAD,1000,[tx],[first,second]),null);
 // Separate deposit legs without duplicated links remain ordinary cash debits.
 assert.equal(estimate(CAD,1000,[],[
  {...first,linkedTransactionId:null},{...second,linkedTransactionId:null}]),800);
});

test('linked bank proof moved to another account cannot debit the old account silently',()=>{
 const tx={id:'moved',type:'external_transfer',accountId:'elsewhere',
  status:'confirmed',date:'2026-10-12',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',status:'confirmed',
  date:'2026-10-12',bankAmountCAD:300,linkedTransactionId:'moved'};
 assert.equal(estimate(CAD,1000,[tx],[op]),null);
});
test('invalid active bank date blocks fictional cash balance',()=>{
 assert.equal(estimate(CAD,1000,[{id:'invalid',accountId:'cad',type:'expense',
  status:'confirmed',date:'2026-13-01',amountCAD:100}],[]),null);
});
test('impossible active investment date never creates cash',()=>{
 assert.equal(estimate(CAD,1000,[],[{bankAccountId:'cad',type:'deposit',
  status:'confirmed',date:'2026-11-31',bankAmountCAD:100}]),null);
});
test('pending or pre-opening links remain independently booked with verified amount',()=>{
 const tx={id:'old',type:'external_transfer',accountId:'elsewhere',
  status:'confirmed',date:'2026-09-01',amountCAD:300};
 const op={bankAccountId:'cad',type:'deposit',status:'confirmed',
  date:'2026-10-12',bankAmountCAD:300,linkedTransactionId:'old'};
 assert.equal(estimate(CAD,1000,[tx],[op]),700);
 tx.date='2026-10-12';tx.status='pending';
 assert.equal(estimate(CAD,1000,[tx],[op]),700);
});
console.log(count+' bank-native investment tests passed');
