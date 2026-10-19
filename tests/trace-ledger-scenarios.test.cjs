'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.35.1.js'),'utf8');
let count=0;
function test(title,run){run();count++;console.log('PASS '+title);}
function pick(name,next,dependencies={}){
 const start=app.indexOf('function '+name+'('),end=app.indexOf('\nfunction '+next+'(',start);
 assert.ok(start>=0&&end>start,'Fonction réelle introuvable : '+name);
 const factory=new Function(...Object.keys(dependencies),'return ('+app.slice(start,end)+');');
 return factory(...Object.values(dependencies));
}
const account={id:'current',type:'checking',owner:'la'},
 card={id:'card',type:'card',owner:'la'};
const today='2026-10-12';
const bankState={
 reconciliations:[],
 household:{accountOpeningBalances:{current:1000,card:-200}},
 accounts:[account,card],
 investmentOperations:[],
 transactions:[
  {id:'buy',accountId:'card',date:today,type:'expense',status:'confirmed',amountCAD:40},
  {id:'pay',accountId:'current',toAccountId:'card',date:'2026-10-13',type:'transfer',transferPurpose:'card_repayment',status:'confirmed',amountCAD:100},
  {id:'salary',accountId:'current',date:'2026-10-14',type:'income',status:'confirmed',amountCAD:200},
  {id:'friend',accountId:'current',date:'2026-10-15',type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',amountCAD:42},
  {id:'celi',accountId:'current',date:'2026-10-16',type:'external_transfer',transferPurpose:'savings',investmentAccountId:'celi1',status:'confirmed',amountCAD:93.12},
  {id:'pending',accountId:'current',date:'2026-10-17',type:'expense',status:'pending',amountCAD:9999}
 ]
};
const accountEstimate=pick('accountEstimate','bank',{
 state:bankState,
 openingBoundary:()=>({date:'2026-10-01',mode:'start'}),
 afterBoundary:(date,b)=>date>=b.date,
 accountType:a=>a?.type
});
test('carte : achat réduit solde, paiement réduit dette',()=>assert.equal(accountEstimate(card),-140));
test('courant : transfert carte, salaire, remboursement, CELI',()=>assert.ok(Math.abs(accountEstimate(account)-1048.88)<.001));
test('liquidité nette courant + carte',()=>assert.ok(Math.abs(accountEstimate(account)+accountEstimate(card)-908.88)<.001));
test('opération en attente hors calcul',()=>assert.ok(accountEstimate(account)<2000));
const savings={id:'celi1',owner:'la',currency:'CAD',savingsTracking:'linked',type:'CELI',openingDate:'2026-10-01',openingBalance:300};
const ready=a=>Boolean(a&&a.savingsTracking==='linked'&&a.currency==='CAD'&&a.openingDate&&Number.isFinite(a.openingBalance));
const linkedSavingsMovements=pick('linkedSavingsMovements','savingsLedger',{state:bankState,isReadySavingsAccount:ready,accountType:a=>a?.type});
const savingsLedger=pick('savingsLedger','portfolioLedger',{state:bankState,isReadySavingsAccount:ready,linkedSavingsMovements});
test('CELI : 93,12 épargne, hors dépense',()=>assert.ok(Math.abs(savingsLedger(savings).value-393.12)<.001));
test('patrimoine incluant CELI conserve transfert interne',()=>assert.ok(Math.abs(accountEstimate(account)+accountEstimate(card)+savingsLedger(savings).value-1302)<.001));
const budgetState={household:{defaultSplit:{la:50,partner:50}},budgets:[],categories:[],accounts:[],
 transactions:[
  {id:'d1',date:today,type:'expense',status:'confirmed',amountCAD:40,beneficiary:'couple',payerId:'la',splitAmounts:{la:20,partner:20}},
  {id:'r1',date:today,type:'refund',status:'confirmed',amountCAD:10,beneficiary:'couple',payerId:'la',splitAmounts:{la:5,partner:5}},
  {id:'f1',date:today,type:'expense',status:'confirmed',amountCAD:180,beneficiary:'la',payerId:'la'},
  {id:'f2',date:today,type:'external_refund',transferPurpose:'friend_reimbursement',status:'confirmed',amountCAD:42,beneficiary:'la',payerId:'la'},
  {id:'i1',date:today,type:'income',status:'confirmed',amountCAD:300,beneficiary:'la',payerId:'la'},
  {id:'pending',date:today,type:'expense',status:'pending',amountCAD:999,beneficiary:'couple',payerId:'la'}
 ]};
const split=pick('split','alloc',{state:budgetState});
const alloc=pick('alloc','budgetAmt',{split});
const txs=pick('txs','summary',{state:budgetState,isFinancialPeriod:()=>true,split});
const summary=pick('summary','breakdown',{state:budgetState,txs,alloc,cat:()=>({type:'expense'}),budgetAmt:()=>0});
test('budget couple : dépense 40 + 180 - retour 10',()=>assert.equal(summary('2026-10','couple').expense,210));
test('budget personnel : 20 + 180 - 5',()=>assert.equal(summary('2026-10','la').expense,195));
test('budget partenaire : 20 - 5',()=>assert.equal(summary('2026-10','partner').expense,15));
test('revenu : remboursement ami 42 non inclus',()=>assert.equal(summary('2026-10','la').income,300));
test('revenu couple 300',()=>assert.equal(summary('2026-10','couple').income,300));
const normalizedMerchant=pick('normalizedMerchant','dateGapDays');
const dateGapDays=pick('dateGapDays','sourceMatch');
const sourceMatch=pick('sourceMatch','findSimilarTransaction',{normalizedMerchant,dateGapDays});
const x={accountId:'current',date:today,type:'expense',name:'Marché Métro',amountCAD:24.50};
test('doublon exact même compte/date/montant',()=>assert.equal(sourceMatch(x,{...x}),'exact'));
test('prix différent même commerçant : distinct',()=>assert.equal(sourceMatch(x,{...x,amountCAD:18.20}),null));
test('même mouvement autre compte : distinct',()=>assert.equal(sourceMatch(x,{...x,accountId:'card'}),null));
test('même prix autre marchand : distinct',()=>assert.equal(sourceMatch(x,{...x,name:'Restaurant Bellevue'}),null));
const gateStart=app.indexOf('function legacyImportNatureReady(');
const gateEnd=app.indexOf('\nasync function validatePendingAll()',gateStart);
assert.ok(gateStart>=0&&gateEnd>gateStart);
const root={};const vm=require('node:vm');
const movement=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.33.0.js'),'utf8');
const guide=fs.readFileSync(path.join(__dirname,'..','trace-import-guide-1.1.1.js'),'utf8');
vm.runInNewContext(movement,{window:root});
vm.runInNewContext(guide,{window:root});
const gateState={accounts:[account,card,{id:'extra',owner:'la',type:'checking'}],investmentAccounts:[savings]};
const gate=new Function('state','window','accountType','isReadySavingsAccount',
 'return ('+app.slice(gateStart,gateEnd)+');')(gateState,root,a=>a?.type,ready);
const baseMove={status:'pending',source:'pdf',date:'2026-10-16',name:'Paiement Mastercard',
 amountCAD:100,accountId:'current',natureReviewed:true};
test('paiement de carte sans destination bloqué',()=>assert.equal(gate({...baseMove,type:'transfer',transferPurpose:'card_repayment'}),false));
test('paiement de carte cible correcte autorisée',()=>assert.equal(gate({...baseMove,type:'transfer',transferPurpose:'card_repayment',toAccountId:'card'}),true));
test('virement sans destinataire bloqué',()=>assert.equal(gate({...baseMove,name:'Virement',type:'transfer'}),false));
test('virement valide entre deux courants',()=>assert.equal(gate({...baseMove,name:'Virement',type:'transfer',toAccountId:'extra'}),true));
test('virement non qualifié vers carte bloqué',()=>assert.equal(gate({...baseMove,name:'Virement',type:'transfer',toAccountId:'card'}),false));
test('CELI sans destination bloqué',()=>assert.equal(gate({...baseMove,name:'Épargne',type:'external_transfer',transferPurpose:'savings'}),false));
test('CELI relié et daté autorisé',()=>assert.equal(gate({...baseMove,name:'Épargne',type:'external_transfer',transferPurpose:'savings',investmentAccountId:'celi1'}),true));
test('CELI antidaté bloqué',()=>assert.equal(gate({...baseMove,name:'Épargne',type:'external_transfer',transferPurpose:'savings',investmentAccountId:'celi1',date:'2026-09-30'}),false));
test('paiement carte reçu carte refusé hors rapprochement',()=>assert.equal(gate({...baseMove,name:'Paiement Mastercard',type:'refund',accountId:'card'}),false));

console.log(count+' scenarios comptables réussis');
