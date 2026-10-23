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
 assert.match(app,/csvReviewIdentity/);
 assert.match(app,/!csvReviewUnchanged/);
 assert.match(app,/csvDistinctReviewedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(app,/csvReviewMatchIds:csvConflicts\.map\(x=>x\.id\)/);
});
test('matches never delete, merge or alter bank data',()=>{
 const before=JSON.stringify(tx);cases({});
 assert.equal(JSON.stringify(tx),before);
 assert.equal(typeof match,'function');
});

async function editorScenario({initialAmount=15,bankAmount=15,onResolveBooking=null}={}){
 const checking={id:'ca',type:'checking',currency:'CAD',owner:'la',name:'Courant'};
 const pending={id:'csv-pending',source:'csv',status:'pending',type:'income',
  date:'2026-10-13',name:'Virement Camille',accountId:'ca',
  bankAmount:initialAmount,amountCAD:initialAmount,
  payerId:'la',beneficiary:'la',categoryId:'salary'};
 const prior={id:'friend-refund',type:'external_refund',status:'confirmed',
  date:'2026-10-13',accountId:'ca',bankAmount:bankAmount,amountCAD:bankAmount,
  name:'Camille'};
 const environment={accounts:[checking],transactions:[pending,prior],
  household:{defaultSplit:{la:50,partner:50}},
  categories:[{id:'salary',name:'Salaire',type:'income'}]};
 const nodes=new Map();function $(id){
  if(!nodes.has(id))nodes.set(id,{value:'',checked:false,textContent:'',innerHTML:'',
   classList:{add(){},remove(){},toggle(){}},dataset:{},disabled:false,
   addEventListener(){},querySelector:()=>({disabled:false})});
  return nodes.get(id);
 }
 const inputs={txAccount:'ca',txWho:'la',txType:'income',
  txName:'Virement Camille',txAmount:String(initialAmount),
  txDate:'2026-10-13',txCategory:'salary',txFxOverride:'',
  txOriginalCurrency:'CAD',txOriginalAmount:'',
  txFriendsAmount:'0',txPartnerAmount:'0'};
 Object.entries(inputs).forEach(([key,value])=>{$('#'+key).value=value});
 const fakeWindow={TraceInternational:onResolveBooking?{...w.TraceInternational,resolveBooking:options=>{onResolveBooking(environment);return w.TraceInternational.resolveBooking(options);}}:w.TraceInternational,
  TraceOperationUI:{enhanceTransaction(){},kindsFor(){return[{id:'income'}]},
   options(){return'<option value="income">Revenu</option>'}},
  TraceFriendDebtorUI:{mount(){}},
  TraceImportGuide:{cardStatementSettlementLabel:()=>false},
  TraceMovement:{fromStored:()=> 'income',get:()=>({type:'income',budget:'income',help:''}),paidForExpense:()=>0}};
 const matcher=new Function('state','window','dateGapDays','smartExactBankAmount',
  'return ('+app.slice(sourceStart,sourceEnd)+');')(
   environment,fakeWindow,getDateGap,exact);
 let rendered='',saved=[];
 const deps={state:environment,window:fakeWindow,$,me:'la',partner:'partner',
  csvBankEvidenceMatches:matcher,requireCardEvidenceUnlink:()=>false,
  accountType:a=>a?.type,openSheet:(title,html)=>{rendered=html},
  closeSheet(){},esc:x=>String(x??''),visibleBankAccounts:()=>[checking],
  shortAccountLabel:a=>a.name,shortMemberName:()=> 'Partenaire',
  traceFeedback:()=>'',traceNotice:e=>{throw e},
  manualCategories:()=>environment.categories,
  movementImpact:()=>({bank:15,budget:{la:15,partner:0,couple:15},friends:0}),
  money:x=>String(x)+' CAD',friendDebtorFields:()=>({}),
  traceSplit:()=>({split:{la:100,partner:0},splitAmounts:{la:15,partner:0}}),
  traceCustomShares:()=>({}),renderAll(){},navigate(){},showTab(){},
  saveDocument:async(collection,item)=>{saved.push({collection,item})}};
 const at=app.indexOf('function editTransaction('),
  until=app.indexOf('\nfunction deleteTransaction(',at);
 const editor=new Function(...Object.keys(deps),'return ('+app.slice(at,until)+');')(
  ...Object.values(deps));
 editor('csv-pending',true);
 return{$,pending,rendered,saved,prior};
}
async function editorTests(){
 const matched=await editorScenario();
 assert.match(matched.rendered,/txCsvDistinctVerified/);
 await matched.$('#txValidate').onclick();
 assert.equal(matched.saved.length,0);
 assert.match(matched.$('#traceFeedback').textContent,/Compare les opérations/);
 matched.$('#txCsvDistinctVerified').checked=true;
 await matched.$('#txValidate').onclick();
 assert.equal(matched.saved.length,1);
 assert.equal(matched.saved[0].item.status,'confirmed');
 assert.deepEqual(matched.saved[0].item.csvReviewMatchIds,['friend-refund']);
 assert.ok(matched.saved[0].item.csvDistinctReviewedAt);
 const changed=await editorScenario({initialAmount:16,bankAmount:15});
 assert.doesNotMatch(changed.rendered,/txCsvDistinctVerified/);
 changed.$('#txAmount').value='15';
 await changed.$('#txValidate').onclick();
 assert.equal(changed.saved.length,0);
 assert.match(changed.$('#traceFeedback').textContent,/rouvre cette fiche/i);

 const staleAmount=await editorScenario();
 staleAmount.$('#txCsvDistinctVerified').checked=true;
 staleAmount.$('#txAmount').value='16';
 staleAmount.prior.bankAmount=16;
 await staleAmount.$('#txValidate').onclick();
 assert.equal(staleAmount.saved.length,0);
 assert.match(staleAmount.$('#traceFeedback').textContent,/ont changé/);
 const staleName=await editorScenario();
 staleName.$('#txCsvDistinctVerified').checked=true;
 staleName.$('#txName').value='Autre description';
 await staleName.$('#txValidate').onclick();
 assert.equal(staleName.saved.length,0);
 assert.match(staleName.$('#traceFeedback').textContent,/ont changé/);
 const staleStatus=await editorScenario();
 staleStatus.$('#txCsvDistinctVerified').checked=true;
 staleStatus.prior.status='pending';
 await staleStatus.$('#txValidate').onclick();
 assert.equal(staleStatus.saved.length,0);
 assert.match(staleStatus.$('#traceFeedback').textContent,/ont changé/);
 const late=await editorScenario({onResolveBooking:environment=>{
  environment.transactions.push({id:'new-proof',type:'external_refund',status:'confirmed',
   accountId:'ca',date:'2026-10-13',bankAmount:15,name:'Nouveau remboursement'});
 }});
 late.$('#txCsvDistinctVerified').checked=true;
 await late.$('#txValidate').onclick();
 assert.equal(late.saved.length,0);
 assert.match(late.$('#traceFeedback').textContent,/a changé depuis/);
 const categoryOnly=await editorScenario();
 categoryOnly.$('#txCsvDistinctVerified').checked=true;
 categoryOnly.$('#txCategory').value='salary';
 await categoryOnly.$('#txValidate').onclick();
 assert.equal(categoryOnly.saved.length,1);
 const distinct=await editorScenario({initialAmount:16,bankAmount:15});
 await distinct.$('#txValidate').onclick();
 assert.equal(distinct.saved.length,1);
 assert.equal(distinct.saved[0].item.status,'confirmed');
}

async function importCsvIntegration(){
 const account={id:'ca',type:'checking',currency:'CAD',owner:'la',name:'Courant'};
 const existing=[
  {id:'card-payment',type:'transfer',status:'confirmed',date:'2026-10-12',
   name:'Règlement Mastercard',accountId:'ca',toAccountId:'mc',bankAmount:100,amountCAD:100},
  {id:'camille',type:'external_refund',status:'confirmed',date:'2026-10-13',
   name:'Camille',accountId:'ca',amountCAD:15,bankAmount:15}];
 const environment={accounts:[account],transactions:existing.slice()},writes=[];
 const nodes=new Map(),$=key=>{
  if(!nodes.has(key))nodes.set(key,{value:'',dataset:{},
   innerHTML:'',textContent:'',disabled:false,onclick:null});
  return nodes.get(key);
 };
 class FileReaderFake{readAsText(file){this.result=file.csv;this.onload();}}
 const deps={state:environment,window:w,$,me:'la',FileReader:FileReaderFake,
  visibleBankAccounts:()=>[account],shortAccountLabel:a=>a.name,
  esc:x=>String(x??''),txDocId:(()=>{let n=0;return()=> 'import-'+(++n)})(),
  smartExactBankAmount:exact,dateGapDays:getDateGap,
  traceSplit:()=>({split:{la:100,partner:0},splitAmounts:{la:15,partner:0}}),
  saveDocument:async(c,row)=>writes.push({c,row}),
  renderAll(){},navigate(){},showTab(){},console:{error(){}}};
 const source=app.slice(app.indexOf('function normalizedCsvKey('),
  app.indexOf('/* Merchant suggestions',app.indexOf('function normalizedCsvKey(')));
 const importFile=new Function(...Object.keys(deps),source+'\nreturn importFile;')(
  ...Object.values(deps));
 const csv='Date;Libellé;Débit;Crédit\n'+
  '12/10/2026;Paiement Mastercard;100,00;\n'+
  '13/10/2026;Virement Camille;;15,00\n';
 importFile({name:'octobre.csv',size:csv.length,type:'text/csv',csv});
 const columns={date:'0',name:'1',amount:'-1',debit:'2',credit:'3'};
 for(const [name,value] of Object.entries(columns))$('#csvCol_'+name).value=value;
 $('#csvDateFormat').value='dmy';$('#csvAccount').value='ca';
 $('#csvPreview').onclick();
 const preview=$('#csvPreviewResult').innerHTML;
 assert.match(preview,/2 rapprochement\(s\) possible\(s\)/);
 assert.match(preview,/Règlement Mastercard/);
 assert.match(preview,/Camille/);
 await $('#csvCommit').onclick();
 assert.equal(writes.length,2);
 assert.ok(writes.every(x=>x.c==='transactions'&&x.row.status==='pending'));
 assert.deepEqual(writes.map(x=>x.row.csvReviewMatchIds),[['card-payment'],['camille']]);
 assert.equal(environment.transactions.filter(x=>x.status==='confirmed').length,2);
 assert.equal(environment.transactions.length,4);
 assert.equal(existing[0].type,'transfer');
 assert.equal(existing[1].type,'external_refund');
}

editorTests().then(async()=>{
 count+=8;
 console.log('PASS changed bank amount invalidates stale explicit review');
 console.log('PASS changed merchant name invalidates stale explicit review');
 console.log('PASS changed historical bank status invalidates stale explicit review');
 console.log('PASS newly inserted matching bank evidence blocks delayed validation');
 console.log('PASS unchanged bank evidence permits category-only editing');
 console.log('PASS unreviewed overlap blocked before financial save');
 console.log('PASS changed amount cannot bypass a newly discovered overlap');
 console.log('PASS distinct CSV line can be confirmed without false overlap');
 await importCsvIntegration();
 count+=2;
 console.log('PASS real CSV preview flags Mastercard and friend refund for review');
 console.log('PASS committing CSV creates pending rows only and preserves original bank ledger');
 console.log(count+' fictional CSV cross-nature reconciliation checks passed');
}).catch(error=>{console.error('FAIL CSV editor guards',error);process.exitCode=1;});

