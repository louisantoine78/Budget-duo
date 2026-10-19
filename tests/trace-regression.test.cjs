'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx=vm.createContext({window:{}});
for(const name of ['trace-movement-5.33.0.js','trace-import-guide-1.1.1.js','trace-operation-ui-1.0.0.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx,{filename:name});
}
const M=ctx.window.TraceMovement,G=ctx.window.TraceImportGuide,U=ctx.window.TraceOperationUI;
let checked=0;
function test(name,fn){try{fn();checked++;process.stdout.write('PASS '+name+'\n');}catch(e){process.stderr.write('FAIL '+name+': '+e.message+'\n');process.exitCode=1;}}
function same(a,b){assert.equal(JSON.stringify(a),JSON.stringify(b));}
[
 ['checking','expense','out',true],['checking','friend_payment_expense','out',true],
 ['checking','card_payment','out',true],['checking','savings_transfer','out',true],
 ['checking','friend_reimbursement','in',true],['checking','income','in',true],
 ['card','expense','out',true],['card','refund','in',true],
 ['card','card_payment','in',false],['card','transfer','out',false],
 ['checking','card_payment','in',false]
].forEach(([account,nature,direction,expected])=>test('nature '+account+' '+nature+' '+direction,()=>assert.equal(G.allowed(nature,account,direction),expected)));
[
 ['checking','expense','Restaurant 123',true],
 ['card','expense','IGA Epicerie',true],
 ['checking','income','Salaire Wavency',true],
 ['card','refund','Remboursement Amazon',true],
 ['checking','expense','Paiement Mastercard Odyssée',false],
 ['card','refund','Paiement Mastercard Odyssée',false],
 ['checking','expense','Virement Interac envoyé Agathe',false],
 ['checking','income','Virement reçu Mathilde',false],
 ['checking','expense','Versement CELI',false],
 ['checking','income','Argent prêté rendu',false],
 ['card','income','Salaire',false],
 ['checking','refund','Retour commerçant boutique',true],
 ['checking','expense','Transfert vers compte épargne',false]
].forEach(([account,nature,label,expected])=>test('validation OCR '+label,()=>assert.equal(G.safeForQuickApproval(account,nature,label),expected)));
test('partage 40 dollars',()=>same(M.impact('expense',40,'couple','la',{la:50,partner:50}).budget,{la:20,partner:20,couple:40}));
test('frais avancés par proche',()=>same(M.impact('friend_payment_expense',180,'la').budget,{la:180,partner:0,couple:180}));
test('remboursement amis sans revenu',()=>same(M.impact('friend_reimbursement',42,'la').budget,{la:0,partner:0,couple:0}));
test('remboursement amis solde créditeur',()=>assert.equal(M.impact('friend_reimbursement',42,'la').bank,42));
test('carte hors budget',()=>same(M.impact('card_payment',100,'la').budget,{la:0,partner:0,couple:0}));
test('carte courant débité',()=>assert.equal(M.impact('card_payment',100,'la').bank,-100));
test('retour commerçant',()=>same(M.impact('refund',20,'couple','la',{la:50,partner:50}).budget,{la:-10,partner:-10,couple:-20}));
test('parts amis centimes',()=>same(M.amounts(100,'custom','la',{la:50,partner:50},30,20),{la:50,partner:20,friends:30,couple:70}));
test('stockage paiement carte',()=>assert.equal(M.fromStored({type:'transfer',transferPurpose:'card_repayment'}),'card_payment'));
test('stockage CELI',()=>assert.equal(M.fromStored({type:'external_transfer',transferPurpose:'savings'}),'savings_transfer'));
test('menu compte courant',()=>assert.equal(U.kindsFor('checking','out').length,7));
test('menu crédit carte',()=>same(U.kindsFor('card','in').map(x=>x.id),['refund']));
const original={id:'e1',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-01',name:'Hôtel',splitAmounts:{la:30,partner:20,friends:50},amountCAD:100};
const already={id:'r1',type:'external_refund',status:'confirmed',transferPurpose:'friend_reimbursement',relatedExpenseId:'e1',amountCAD:20};
test('remboursement partiel encore 30',()=>assert.equal(M.linkable([original],[original,already],'la','2026-10-19',30)[0].remaining,30));
test('refus dépassement remboursement',()=>assert.throws(()=>M.validateLink('e1',[original],[original,already],'la','2026-10-19',31)));
test('répartition dépasse montant',()=>assert.throws(()=>M.amounts(100,'custom','la',{},80,30)));
test('interac aucune nature automatique',()=>assert.equal(G.suggest('checking','transfer','Virement Interac envoyé'),''));
console.log(checked+' assertions réussies');
