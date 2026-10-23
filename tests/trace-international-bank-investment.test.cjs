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
 return new Function('state','window','accountType','openingBoundary','afterBoundary',
 'return ('+app.slice(from,to)+');')(state,root,a=>a.type,
 ()=>({date:'2026-10-01',mode:'start'}),()=>true)(bank);
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
test('foreign investment link is guarded until native editor',()=>assert.ok(app.includes('la liaison bancaire est bloquée')));
console.log(count+' bank-native investment tests passed');
