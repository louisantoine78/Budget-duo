'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx=vm.createContext({window:{}});
for(const name of ['trace-movement-5.36.0.js','trace-import-guide-1.2.1.js','trace-operation-ui-1.0.0.js']){
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
test('menu crédit carte',()=>same(U.kindsFor('card','in').map(x=>x.id),['refund','card_payment_received']));
const original={id:'e1',type:'expense',status:'confirmed',payerId:'la',beneficiary:'custom',date:'2026-10-01',name:'Hôtel',splitAmounts:{la:30,partner:20,friends:50},amountCAD:100};
const already={id:'r1',type:'external_refund',status:'confirmed',transferPurpose:'friend_reimbursement',relatedExpenseId:'e1',amountCAD:20};
test('remboursement partiel encore 30',()=>assert.equal(M.linkable([original],[original,already],'la','2026-10-19',30)[0].remaining,30));
test('refus dépassement remboursement',()=>assert.throws(()=>M.validateLink('e1',[original],[original,already],'la','2026-10-19',31)));
test('répartition dépasse montant',()=>assert.throws(()=>M.amounts(100,'custom','la',{},80,30)));
test('interac aucune nature automatique',()=>assert.equal(G.suggest('checking','transfer','Virement Interac envoyé'),''));
const appSource=fs.readFileSync(path.join(__dirname,'..','v5-app-5.36.3.js'),'utf8');
test('validation par lot sécurisée',()=>assert.match(appSource,/selected\.some\(x=>!legacyImportNatureReady\(x\.t\)\)/));
test('validation globale sécurisée',()=>assert.match(appSource,/return legacyImportNatureReady\(t\)/));
test('validation rapide OCR sécurisée',()=>assert.match(appSource,/legacyImportNatureReady\(t\)&&\s*manualCategories/));
test('requalification tracée',()=>assert.ok(appSource.includes("natureReviewed:t.status!=='confirmed'?true:t.natureReviewed")));
test('carte rapprochée non transformable en retour marchand',()=>assert.match(appSource,/accountType\(bank\)==='card'&&window\.TraceImportGuide\.cardStatementSettlementLabel\(t\.name\)/));
const importerSource=fs.readFileSync(path.join(__dirname,'..','trace-bank-ui-2.8.1.js'),'utf8');
test('OCR nature unique',()=>assert.match(importerSource,/class="input docNature"/));
test('OCR nature groups via shared UI',()=>assert.match(importerSource,/U\.options\(U\.kindsFor\(bankKind,dir\),nature\)/));
test('OCR old Type removed',()=>assert.doesNotMatch(importerSource,/class="input docType"/));
test('OCR bank direction available',()=>assert.match(importerSource,/class="input docDirection"/));
test('OCR rejects missing nature',()=>assert.match(importerSource,/const missing=rows\.findIndex/));
test('OCR card settlement protected',()=>assert.match(importerSource,/bankKind==='card'&&G\.cardStatementSettlementLabel\(r\.name\)/));
test('OCR explicit review tracked',()=>assert.match(importerSource,/natureReviewed:el\.dataset\.natureReviewed==='yes'/));
test('OCR budget-only category',()=>assert.match(importerSource,/docCategoryWrap/));
test('OCR budget-only sharing',()=>assert.match(importerSource,/docShareWrap/));
test('OCR compact movement impact',()=>assert.match(importerSource,/trace-doc-impact/));
test('import stores movement purpose',()=>assert.match(appSource,/transferPurpose:nature\.purpose\|\|null/));
test('import validates banking direction',()=>assert.match(appSource,/nature\.direction!==\(direction==='in'\?1:-1\)/));
test('import card evidence not double counted',()=>assert.match(appSource,/accountType\(bank\)==='card'&&window\.TraceImportGuide\.cardStatementSettlementLabel\(name\)/));
test('import nonbudget no category',()=>assert.match(appSource,/const chosenCategory=nature\.budget==='none'\?'':/));
test('movement editor validates pending operation',()=>assert.match(appSource,/const next=\{\.\.\.t,type,date,name,status:'confirmed'/));
test('active 5.36.3',()=>assert.match(appSource,/__TRACE_BUILD__='5\.36\.3'/));
[
 ['expense',true,'expense'],['friend_payment_expense',true,'expense'],['refund',true,'refund'],
 ['income',true,'income'],['card_payment',false,'none'],['transfer',false,'none'],
 ['savings_transfer',false,'none'],['savings_withdrawal',false,'none'],
 ['friend_reimbursement',false,'none'],['friend_advance',false,'none'],
 ['friend_advance_return',false,'none']
].forEach(([kind,budget,purpose])=>test('nature import '+kind,()=>{
 const def=M.get(kind);assert.ok(def);
 assert.equal(def.budget!=='none',budget);assert.equal(def.budget,purpose);
}));


test('home affiche une dette positive sans ajouter la carte',()=>assert.match(appSource,/money\(b\.cardDebt\)\+' de dette'/));
test('un avoir estimé n’est pas ajouté au disponible',()=>assert.match(appSource,/net:hc\?checking-cardDebt:null/));
test('ancien solde positif de carte interprété comme dette',()=>assert.match(appSource,/accountType\(a\)==='card'&&r\?\.cardBalanceKind!=='credit'\?-Math\.abs\(rawBase\)/));
test('carte saisie comme dette positive et stockée avec signe',()=>assert.match(appSource,/accountType\(account\)==='card'\?-Math\.abs\(amount\):amount/));
test('alerte pour crédit non rapproché',()=>assert.match(appSource,/cardWarning\.hidden=!b\.needsCardReview/));
test('CELI uniquement en information sur accueil',()=>assert.match(appSource,/\$\('#homeCELITransfers'\)\.textContent=money\(savedToCeli\)/));

const inboxSource=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.4.1.js'),'utf8');
[
 'PAIEMENT CAISSE','PAIEMENT REÇU','Paiement reçue','PAYMENT RECEIVED',
 'PAYMENT THANK YOU','Paiement de ma Mastercard','Règlement carte Visa'
].forEach(label=>test('card statement label '+label,()=>assert.equal(G.cardStatementSettlementLabel(label),true)));
[
 'PAIEMENT FACTURE ÉLECTRICITÉ','paiement IGA','FACTURE LOYER',
 'RETOUR COMMERÇANT AMAZON','UBER CANADA','Paiement internet mobile'
].forEach(label=>test('not a card settlement '+label,()=>assert.equal(G.cardStatementSettlementLabel(label),false)));
test('checking paiement caisse is not automatically a credit-card transfer',()=>assert.notEqual(G.suggest('checking','transfer','PAIEMENT CAISSE'),'card_payment'));
test('card paiement caisse selects evidence type',()=>assert.equal(G.suggest('card','refund','PAIEMENT CAISSE'),'card_payment_received'));
test('card paiement caisse credit direction',()=>assert.equal(G.direction('refund','card','PAIEMENT CAISSE'),'in'));
test('card caisse cannot be approved as merchant refund',()=>assert.equal(G.safeForQuickApproval('card','refund','PAIEMENT CAISSE'),false));
test('inbox detects card-side evidence',()=>assert.match(inboxSource,/guided\.cardStatementSettlementLabel\(d\.name\)/));
test('inbox offers reconciliation for manual credit or bank label',()=>assert.ok(inboxSource.includes("payment=type==='card_payment_received'||guide.cardStatementSettlementLabel(name)")));
test('legacy OCR blocks double credit',()=>assert.match(importerSource,/G\.cardStatementSettlementLabel\(r\.name\)/));
test('backend checks manual evidence selection',()=>assert.ok(appSource.includes("values?.type!=='card_payment_received'")));
const accounts=[
 {id:'checking',type:'checking',owner:'la'},
 {id:'card',type:'card',owner:'la'},
 {id:'partnercard',type:'card',owner:'partner'}
];
const transfer={id:'transfer500',type:'transfer',status:'confirmed',accountId:'checking',toAccountId:'card',date:'2026-10-07',amountCAD:500,name:'Paiement carte'};
test('one eligible existing transfer for a card statement credit',()=>assert.equal(
 G.eligibleCardPayments([transfer],[],'card','2026-10-08',500,accounts).length,1));
test('matched transfer not eligible a second time',()=>assert.equal(
 G.eligibleCardPayments([transfer],[{kind:'smart_draft',status:'matched_card_payment',linkedTransactionId:'transfer500'}],'card','2026-10-08',500,accounts).length,0));
test('different amount must not be reconciled',()=>assert.equal(
 G.eligibleCardPayments([transfer],[],'card','2026-10-08',501,accounts).length,0));
test('more than five days mismatch is not auto-suggested',()=>assert.equal(
 G.eligibleCardPayments([transfer],[],'card','2026-10-15',500,accounts).length,0));
test('different destination card is not eligible',()=>assert.equal(
 G.eligibleCardPayments([transfer],[],'partnercard','2026-10-08',500,accounts).length,0));
test('card evidence has no second bank transaction',()=>assert.match(appSource,/additionalTransactions:0,budgetChange:0/));

const insightSource=fs.readFileSync(path.join(__dirname,'..','trace-insights-1.0.0.js'),'utf8');
vm.runInContext(insightSource,ctx,{filename:'trace-insights-1.0.0.js'});
const I=ctx.window.TraceInsights;
test('card credit classification is in incoming menu',()=>assert.ok(U.kindsFor('card','in').some(k=>k.id==='card_payment_received')));
test('card credit not available on checking',()=>assert.equal(G.allowed('card_payment_received','checking','in'),false));
test('card received never quick confirms',()=>assert.equal(G.safeForQuickApproval('card','card_payment_received','PAIEMENT CAISSE'),false));
test('card received never adds budget spending',()=>same(M.impact('card_payment_received',500,'la').budget,{la:0,partner:0,couple:0}));
test('global validation excludes unmatched card receipt',()=>assert.ok(appSource.includes("nature.id==='card_payment_received')return false")));
test('bank pending row converted only to linked evidence',()=>assert.ok(appSource.includes("type:'card_statement_evidence',transferPurpose:'card_payment_received'")));
test('bank pending row linked without new financial transaction',()=>assert.ok(appSource.includes("status:'confirmed',linkedTransactionId:target,natureReviewed:true")));
test('linked bank rows cannot match a second time',()=>assert.ok(appSource.includes("priorMatches=state.transactions.filter(t=>t.type==='card_statement_evidence'")));
test('smart incoming card cannot be normally approved',()=>assert.ok(inboxSource.includes("type==='card_payment_received'||guide.cardStatementSettlementLabel(name)")));
test('insights sorts category spending descending',()=>same(I.categoryRows([
 {id:'a',name:'A',actual:50,budget:80},{id:'b',name:'B',actual:200,budget:250}],250).map(x=>x.name),['B','A']));
test('insights reports unclassified spending',()=>assert.equal(I.categoryRows([{id:'a',actual:60,budget:100}],100).find(x=>x.id==='').actual,40));
test('insights makes no-budget item understandable',()=>{
 const node={innerHTML:'',querySelector:()=>null};
 I.renderCategories(node,{rows:[{id:'r',name:'Restaurant',actual:100,budget:0}],totalExpense:100});
 assert.ok(node.innerHTML.includes('Sans budget prévu'));
});
test('insights escapes unsafe labels',()=>{
 const node={innerHTML:'',querySelector:()=>null};
 I.renderCategories(node,{rows:[{id:'r',name:'<script>alert(1)</script>',actual:15,budget:25}],totalExpense:15});
 assert.ok(!node.innerHTML.includes('<script>'));
});
test('annual view does not call unfilled month zero',()=>{
 const node={innerHTML:''};
 I.renderAnnual(node,{year:'2026',months:[{month:'2026-02',elapsed:true,hasBudget:false,hasTransactions:false,budget:0,expense:0}]});
 assert.ok(node.innerHTML.includes('Non renseigné'));
});
test('wealth view avoids fictitious price series',()=>{
 const node={innerHTML:''};
 I.renderWealth(node,{checking:500,cardDebt:200,investments:[{name:'CELI',cad:250,ready:true,linked:true}],
 flows:[{month:'2026-10',kind:'deposit',amount:50}]});
 assert.ok(node.innerHTML.includes('Mouvements par mois'));
 assert.ok(node.innerHTML.includes('pas une courbe de performance historique'));
});
test('wealth chart renders documented contributions',()=>assert.ok(appSource.includes("TraceInsights.renderWealth($('#wealthTrend')")));
test('annual view renders 12 relevant months',()=>assert.ok(appSource.includes("TraceInsights.renderAnnual($('#annualBudgetChart')")));
test('home categories expandable',()=>assert.ok(appSource.includes('limit:8,onCategory:')));


test('budget render iterates querySelectorAll not a single element',()=>assert.match(appSource,/\$\$\('#annualBudgetChart \[data-insight-month\]'\)\.forEach/));
test('analysis filter buttons use all matching elements',()=>assert.match(appSource,/\$\$\('#analysisScope \.seg'\)\.forEach/));
test('portfolio account details bind every button',()=>assert.match(appSource,/\$\$\('\[data-analysis-invest\]'\)\.forEach/));
test('no querySelector(...).forEach remains',()=>assert.equal([...appSource.matchAll(/(?<!\$)\$\([^)]*\)\.forEach/g)].length,0));

test('Activity list must use querySelectorAll helper',()=>assert.ok(appSource.includes("$$('[data-tx-open]').forEach")));
test('Prevent undefined triple-dollar selector throughout app',()=>assert.doesNotMatch(appSource,/\${3,}\(/));
const bankDocSource=fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8');
const docScope={window:{}};vm.runInNewContext(bankDocSource,docScope,{filename:'trace-bank-doc-1.11.1.js'});
const doc=docScope.window.TraceBankDocuments;
test('simple card Paiement suggests received payment',()=>assert.equal(G.suggest('card','expense','Paiement'),'card_payment_received'));
test('payment received direction is credit',()=>assert.equal(G.direction('card_payment_received','card','Paiement'),'in'));
test('generic Paiement cannot be quick-approved as an expense',()=>assert.equal(G.safeForQuickApproval('card','expense','Paiement'),false));
test('checking Paiement remains expense',()=>assert.equal(G.suggest('checking','expense','Paiement'),'expense'));
test('merchant purchase is not a card payment',()=>assert.equal(G.suggest('card','expense','Supermarché Métro'),'expense'));
test('plain card payment matching needs checked + sign when OCR has no evidence',()=>assert.ok(appSource.includes("d.bankDirection!=='in'&&!values?.creditChecked")));
test('card receipt matching stays one existing transfer',()=>assert.ok(appSource.includes('additionalTransactions:0,budgetChange:0')));
test('incoming sign is preserved from OCR to pending draft',()=>assert.ok(appSource.includes("bankDirection:['in','out'].includes(r.bankDirection)?r.bankDirection:''")));
test('pending old OCR proof requires explicit positive-sign confirmation',()=>assert.ok(inboxSource.includes("el.dataset.bankDirection!=='in'")));
test('OCR debit sign on payment never suggests a received transfer',()=>assert.ok(inboxSource.includes("row.bankDirection==='out'&&window.TraceImportGuide.genericCardPaymentLabel(name)")));
test('check box exists for generic OCR payment',()=>assert.ok(inboxSource.includes('class="smart-credit-confirm"')));
test('OCR bank source exports amount-side sign',()=>assert.ok(bankDocSource.includes("const bankDirection=prefix==='+'?'in'")));
const ocrWord=(label,x,y)=>'5\t1\t1\t1\t1\t1\t'+x+'\t'+y+'\t'+(label.length*12)+'\t24\t96\t'+label;
const creditTsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+[
 ocrWord('Paiement',150,300),ocrWord('+750,00',735,300),
 ocrWord('7',105,425),ocrWord('OCT',145,425),
 ocrWord('Texte',170,340)
].join('\n');
test('real OCR layout retains visible +750 as a card credit',()=>{
 const rows=doc.screenshotLayoutCandidates(creditTsv,1000,1200,'2026-10-01');
 assert.ok(rows.length>0,'No screenshot transaction row parsed');
 assert.equal(rows[0].bankDirection,'in');
});
const debitTsv=creditTsv.replace('+750,00','-750,00');
test('real OCR layout retains visible -750 as debit',()=>{
 const rows=doc.screenshotLayoutCandidates(debitTsv,1000,1200,'2026-10-01');
 assert.ok(rows.length>0,'No screenshot transaction row parsed');
 assert.equal(rows[0].bankDirection,'out');
});

console.log(checked+' assertions réussies');
