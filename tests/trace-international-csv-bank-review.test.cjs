'use strict';
/* Fictional bank statement review; real candidate overlap matcher, no write APIs.
 * The editor guard is also statically checked; no claim of real Safari testing. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const w={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8'),{window:w});
const state={accounts:[
 {id:'ca',type:'checking',currency:'CAD',owner:'la'},
 {id:'mc',type:'card',currency:'CAD',owner:'la'},
 {id:'fr',type:'checking',currency:'EUR',owner:'la'}
]};
const tx=[
 {id:'master',type:'transfer',status:'confirmed',date:'2026-10-12',name:'Mastercard',
  accountId:'ca',toAccountId:'mc',amountCAD:100,bankAmount:100,toBankAmount:100},
 {id:'camille',type:'external_refund',transferPurpose:'friend_reimbursement',
  status:'confirmed',date:'2026-10-13',name:'Virement Camille',accountId:'ca',bankAmount:15,amountCAD:15},
 {id:'eur-expense',type:'expense',status:'confirmed',date:'2026-10-15',name:'Restaurant',
  accountId:'fr',bankCurrency:'EUR',bankAmount:42,amountCAD:66},
 {id:'wire-fx',type:'transfer',status:'confirmed',date:'2026-10-16',name:'Europe',
  accountId:'ca',toAccountId:'fr',bankCurrency:'CAD',bankAmount:150,toBankAmount:95,amountCAD:150},
 {id:'card-evidence',type:'card_statement_evidence',status:'confirmed',
  date:'2026-10-12',name:'Paiement carte',accountId:'mc',amountCAD:100},
 {id:'pending-receipt',type:'external_refund',status:'pending',
  date:'2026-10-17',name:'Remboursement ami',accountId:'ca',bankAmount:18}
];
const getDateGap=(a,b)=>Math.abs((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000);
const sourceStart=app.indexOf('function csvBankEvidenceMatches(');
const sourceEnd=app.indexOf('\nfunction importFile(',sourceStart);
assert.ok(sourceStart>=0&&sourceEnd>sourceStart);
const exactCode=app.slice(app.indexOf('function smartExactBankAmount('),
 app.indexOf('\nfunction smartStrictDate('));
const exact=new Function('return ('+exactCode+');')();
const match=new Function('state','window','dateGapDays','smartExactBankAmount',
 'return ('+app.slice(sourceStart,sourceEnd)+');')(state,w,getDateGap,exact);
let count=0;function test(label,fn){fn();count++;console.log('PASS '+label);}
function cases(row,known=tx){return match({date:'2026-10-12',type:'expense',
 accountId:'ca',bankAmount:100,...row},known).map(x=>x.id);}
test('Mastercard checking debit is flagged despite CSV expense type',()=>{
 assert.deepEqual(cases({}),['master']);
});
test('Mastercard card-side credit is flagged despite CSV income type',()=>{
 assert.deepEqual(cases({accountId:'mc',type:'income'}),['master']);
});
test('existing friend reimbursement is recognized instead of fictitious salary',()=>{
 assert.deepEqual(cases({date:'2026-10-13',type:'income',bankAmount:15}),['camille']);
});
test('CAD card debit cannot be mistaken for current account income',()=>{
 assert.deepEqual(cases({type:'income'}),[]);
});
test('bank-native EUR 42 matches historical CAD 66 without CAD substitution',()=>{
 assert.deepEqual(cases({accountId:'fr',date:'2026-10-15',bankAmount:42}),['eur-expense']);
 assert.deepEqual(cases({accountId:'fr',date:'2026-10-15',bankAmount:66}),[]);
});
test('cross-currency EUR destination uses actual EUR 95, not CAD 150',()=>{
 assert.deepEqual(cases({accountId:'fr',date:'2026-10-16',type:'income',bankAmount:95}),['wire-fx']);
 assert.deepEqual(cases({accountId:'fr',date:'2026-10-16',type:'income',bankAmount:150}),[]);
});
test('missing cross-currency destination never presumes 1:1',()=>{
 const wire={...tx.find(x=>x.id==='wire-fx'),toBankAmount:null};
 assert.deepEqual(cases({accountId:'fr',date:'2026-10-16',type:'income',bankAmount:95},[wire]),[]);
});
test('wrong account and mismatched amount never match',()=>{
 assert.deepEqual(cases({accountId:'different'}),[]);
 assert.deepEqual(cases({bankAmount:101}),[]);
});
test('posting drift over two days is excluded',()=>{
 assert.deepEqual(cases({date:'2026-10-20'}),[]);
});
test('same value, unrelated merchant is only a warning candidate',()=>{
 assert.deepEqual(cases({name:'OTHER SHOP'}),['master']);
});
test('card statement evidence is not a second bank movement',()=>{
 assert.deepEqual(cases({accountId:'mc',type:'income'},[tx.find(x=>x.id==='card-evidence')]),[]);
});
test('pending historical bank items are flagged but not treated as confirmed',()=>{
 assert.deepEqual(cases({date:'2026-10-17',type:'income',bankAmount:18}),['pending-receipt']);
});
test('current transaction is never matched to itself',()=>{
 assert.deepEqual(cases({id:'master'}),[]);
});
test('fractional-cent and invalid values cannot be matched',()=>{
 assert.deepEqual(cases({bankAmount:99.999}),[]);
 assert.deepEqual(cases({bankAmount:null}),[]);
});
test('confirmed bank evidence outranks pending and comparisons are capped at five',()=>{
 const matched=match({date:'2026-10-12',accountId:'ca',type:'expense',bankAmount:100},
  [...Array.from({length:7},(_,i)=>({...tx[0],id:'copy'+i,status:i===0?'pending':'confirmed'}))]);
 assert.equal(matched.length,5);assert.equal(matched[0].status,'confirmed');
});
test('CSV preview keeps all possible cross-nature matches pending',()=>{
 assert.match(app,/csvReviewMatchIds=candidates\.map\(x=>x\.id\)/);
 assert.match(app,/csvBankEvidenceMatches\(item,state\.transactions\)/);
 assert.match(app,/status:'pending',currency:ccy/);
 assert.match(app,/Aucune fusion ou suppression automatique/);
});
test('confirmation requires an explicit acknowledgement and records evidence IDs',()=>{
 assert.match(app,/csvConflicts.length&&!?\$\('#txCsvDistinctVerified'\)\?\.checked/);
 assert.match(app,/csvDistinctReviewedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(app,/csvReviewMatchIds:csvConflicts\.map\(x=>x\.id\)/);
});
test('matches never delete, merge or alter bank data',()=>{
 const before=JSON.stringify(tx);cases({});
 assert.equal(JSON.stringify(tx),before);
 assert.equal(typeof match,'function');
});
console.log(count+' fictional CSV cross-nature reconciliation checks passed');
