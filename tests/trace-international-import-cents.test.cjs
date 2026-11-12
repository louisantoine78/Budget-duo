'use strict';
/* Real candidate handlers, fictional in-memory bank imports only. No network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
function pick(from,to,deps={}){
 const a=app.indexOf(from),b=app.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Missing candidate handler '+from);
 return new Function(...Object.keys(deps),'return ('+app.slice(a,b)+');')(...Object.values(deps));
}
const exact=pick('function smartExactBankAmount(','\nfunction smartStrictDate(');
const checking={id:'ca',type:'checking',owner:'la',currency:'CAD'};
const card={id:'mc',type:'card',owner:'la',currency:'CAD'};
const strictDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x);
let count=0;async function test(label,fn){await fn();count++;console.log('PASS '+label);}
function matchFixture(){
 const draft={id:'ocr',kind:'smart_draft',status:'pending',accountId:'mc',bankDirection:'in'};
 const state={accounts:[checking,card],smartImports:[draft],transactions:[{id:'payment',
  type:'transfer',accountId:'ca',toAccountId:'mc',amountCAD:100,status:'confirmed'}]};
 const writes=[],deps={state,me:'la',visibleBankAccounts:()=>[checking,card],accountType:x=>x.type,
  smartExactBankAmount:exact,smartStrictDate:strictDate,smartCardPaymentMatches:()=>[{id:'payment'}],
  window:{TraceInternational:{currency:x=>x.currency},TraceImportGuide:{
   cardStatementSettlementLabel:()=>true,genericCardPaymentLabel:()=>false}},
  saveDocument:async(c,row)=>writes.push({collection:c,row}),renderAll(){}};
 const match=pick('async function smartMatchCardPaymentDraft(','\nasync function smartApproveDraft(',deps);
 const input={date:'2026-10-15',name:'PAIEMENT MASTERCARD',type:'card_payment_received',
  amount:'100.00',verified:true};
 return{draft,state,writes,match,input};
}
function stageFixture(){
 const state={smartImports:[],importDays:[]},writes=[];let n=0;
 const deps={state,me:'la',visibleBankAccounts:()=>[checking],smartStrictDate:strictDate,
  smartExactBankAmount:exact,normalizedMerchant:x=>String(x||'').toLowerCase(),
  txDocId:()=>String(++n),saveDocument:async(c,row)=>writes.push({c,row}),
  recordDayImport:async()=>{},window:{TraceImportCalendar:{render(){}}},console:{warn(){}}};
 return{state,writes,stage:pick('async function smartStageRows(','\nasync function smartSaveDraft(',deps)};
}
async function run(){
 await test('bank cents: valid decimal amounts remain exact',()=>{
  for(const v of [0.01,19.99,'100.05',100,0.1+0.2])
   assert.equal(exact(v),Math.round(Number(v)*100)/100);
 });
 await test('bank cents: fractional-cent OCR cannot be rounded',()=>{
  for(const v of [0.001,10.005,10.999,'99.999'])assert.equal(exact(v),null);
 });
 await test('bank cents: missing, zero, negative and unsafe values are rejected',()=>{
  for(const v of ['',null,undefined,-2,0,'NaN',Infinity,10000001])assert.equal(exact(v),null);
 });
 await test('uncertain OCR amount remains a pending unvalued draft',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Restaurant',amount:12.345,bankDirection:'out'}]);
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].c,'imports');
  assert.equal(s.state.smartImports[0].amount,null);
  assert.equal(s.state.smartImports[0].needsAmountReview,true);
 });
 await test('valid OCR amount stays unchanged',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Courses',amount:12.34}]);
  assert.equal(s.state.smartImports[0].amount,12.34);
  assert.equal(s.state.smartImports[0].needsAmountReview,false);
 });
 await test('invalid suggested OCR amount does not become bank evidence',async()=>{
  const s=stageFixture();await s.stage('ca','capture.png',[{date:'2026-10-15',
   name:'Courses',suggestedAmount:12.345}]);
  assert.equal(s.state.smartImports[0].amount,null);
  assert.equal(s.state.smartImports[0].suggestedAmount,undefined);
 });
 await test('fractional cents cannot match a confirmed card payment',async()=>{
  const s=matchFixture();await assert.rejects(()=>s.match('ocr',
   {...s.input,amount:'99.999'},'payment'),/montant/);
  assert.equal(s.writes.length,0);assert.equal(s.draft.status,'pending');
  assert.equal(s.state.transactions.length,1);
 });
 await test('a missing card amount cannot match a payment',async()=>{
  for(const amount of ['',null,0]){
   const s=matchFixture();await assert.rejects(()=>s.match('ocr',
    {...s.input,amount},'payment'),/montant/);
   assert.equal(s.writes.length,0);
  }
 });
 await test('matching existing card transfer adds zero bank transactions',async()=>{
  const s=matchFixture(),result=await s.match('ocr',s.input,'payment');
  assert.equal(result.additionalTransactions,0);assert.equal(result.budgetChange,0);
  assert.equal(s.draft.amount,100);assert.equal(s.draft.linkedTransactionId,'payment');
  assert.equal(s.writes.length,1);assert.equal(s.writes[0].collection,'imports');
  assert.equal(s.state.transactions.length,1);
 });
 await test('an unverified OCR draft never becomes matched',async()=>{
  const s=matchFixture();await assert.rejects(()=>s.match('ocr',
   {...s.input,verified:false},'payment'),/Vérifie/);
  assert.equal(s.writes.length,0);
 });
 await test('manual approval rejects fractional cents before accounting',async()=>{
  const state={accounts:[checking],smartImports:[{id:'ocr',kind:'smart_draft',
   status:'pending',accountId:'ca'}]};
  const fn=pick('async function smartApproveDraft(','\nasync function smartResetDay(',{
   state,me:'la',visibleBankAccounts:()=>[checking],smartExactBankAmount:exact,
   smartStrictDate:strictDate,window:{TraceMovement:{get:()=>({type:'expense',budget:'expense'})}}
  });
  await assert.rejects(()=>fn('ocr',{verified:true,date:'2026-10-15',
   name:'Restaurant',type:'expense',amount:'20.005'}),/montant/);
  assert.equal(state.smartImports[0].status,'pending');
 });
 await test('CSV invalid-cent rows are blocked before import',()=>{
  assert.match(app,/smartExactBankAmount\(Math\.abs\(n\)\)===null/);
  assert.match(app,/invalid\.push\(index\+2\);return;/);
 });


 await test('Desjardins PDF statement recognizes card purchases, refund and skips settlement',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  const pdf=['DESJARDINS ODYSSEE WORLDELITE MASTERCARD','Date du relevé 08 10 2026',
   '10 09 11 09 EPICERIE TEST MONTREAL QC 1,00 % 14,94',
   '07 10 08 10 RETOUR TEST TORONTO ON 22,87CR',
   '15 09 15 09 PAIEMENT CAISSE 100,00CR'].join(String.fromCharCode(10));
  const rows=p.extractCandidates(pdf);
  assert.equal(rows.candidates.length,2);
  assert.equal(rows.skippedPayments,1);
  assert.equal(rows.candidates[0].amount,14.94);
  assert.equal(rows.candidates[1].type,'refund');
  assert.equal(p.sourceAccountHints(pdf+' 12,30 EURO').currency,'CAD');
  assert.equal(p.sourceAccountHints(pdf).kind,'card');
 });
 await test('CAD captures distinguish negative debits from positive card-payment evidence',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  const currency=String.fromCharCode(36),nl=String.fromCharCode(10);
  const checking=['Achat /EPICERIE -217,30 '+currency,'9 NOV','Virement Interac à /TEST/ -6,00 '+currency,'9 NOV'].join(nl);
  const rows=p.extractCandidates(checking).candidates;
  assert.equal(rows.length,2);
  assert.equal(rows[0].name,'Achat /EPICERIE');
  assert.equal(rows[0].amount,217.30);
  assert.equal(rows[1].bankDirection,'out');
  const card=['Market test 9,29 '+currency,'31 OCT','Paiement Caisse - Merci +500,00 '+currency,'30 OCT'].join(nl);
  const cardRows=p.extractCandidates(card).candidates;
  assert.equal(cardRows.length,2);
  assert.equal(cardRows[1].bankDirection,'in');
  assert.equal(cardRows[1].amount,500);
  assert.equal(cardRows[1].type,'unknown');
  assert.equal(p.sourceAccountHints(card).kind,'card');
 });
 await test('BNP EUR capture understands long weekday dates and mixed bank signs',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments,nl=String.fromCharCode(10);
  const raw=['Compte de chèques','Lundi 02 novembre','Commission test -17,30 €',
   'Dimanche 01 novembre','Assurance test -50,00 €',
   'Jeudi 29 octobre','CB train du 23/10 -89,00 €',
   'Mardi 27 octobre','Virement de test +300,00 €'].join(nl);
  const rows=p.extractCandidates(raw).candidates;
  assert.equal(rows.length,4);
  assert.deepEqual(Array.from(rows.map(x=>x.date)),['2026-11-02','2026-11-01','2026-10-29','2026-10-27']);
  assert.deepEqual(Array.from(rows.map(x=>x.amount)),[17.3,50,89,300]);
  assert.equal(rows[3].bankDirection,'in');
  assert.equal(rows[3].type,'unknown');
  assert.equal(p.sourceAccountHints(raw).currency,'EUR');
 });
 await test('bank import always verifies chosen account and FX before duplicate comparison',()=>{
  const bankUi=fs.readFileSync(path.join(__dirname,'..','trace-bank-ui-5.37.0.js'),'utf8');
  const smart=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');
  assert.ok(bankUi.includes('docAccountConfirmed'));
  assert.ok(bankUi.includes('if(accountMismatch)'));
  assert.ok(bankUi.includes("bankCurrency==='CAD'&&!documentNeedsReview?"));
  assert.ok(smart.includes('evidence.currency!==bank.currency'));
  assert.ok(smart.includes('evidence.kind!==bank.type'));
  const part=app.slice(app.indexOf('async submit(rows,accountId,fileName,method,scopeDay=null){'));
  assert.ok(part.indexOf('const booking=window.TraceInternational.resolveBooking(')>0);
  assert.ok(part.indexOf('const booking=window.TraceInternational.resolveBooking(')<part.indexOf('const existing=findSimilarTransaction(probe)'));
  assert.ok(part.includes('amountCAD:booking.amountCAD'));
 });

 await test('positioned OCR reconstructs multiple BNP transactions under their PRECEDING date',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  const makeTsv=items=>['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
   ...items.map((r,i)=>['5',1,1,1,1,i+1,r[1],r[2],r[3]||90,29,93,r[0]].join('\t'))].join('\n');
  const items=[
   ['Lundi',40,190,110],['02',165,190,30],['novembre',205,190,145],
   ['Commissions',110,275,205],['Cotisation',322,275,165],['-',820,275,16],['17,30',850,275,113],['€',980,275,25],
   ['Dimanche',43,480,175],['01',225,480,32],['novembre',265,480,146],
   ['BNP',110,545,65],['Paribas',185,545,105],['Cardif',300,545,96],['-',820,545,15],['50,00',850,545,114],['€',980,545,25],
   ['Jeudi',43,690,90],['29',145,690,36],['octobre',200,690,135],
   ['Netflix',110,754,128],['-',820,754,15],['14,99',852,754,114],['€',982,754,23],
   ['SNCF',110,835,95],['-',820,835,15],['89,00',852,835,114],['€',982,835,23],
   ['Mardi',43,1010,95],['27',145,1010,40],['octobre',200,1010,135],
   ['Virement',110,1080,155],['reçu',275,1080,74],['+',820,1080,15],['300,00',852,1080,135],['€',1000,1080,23]
  ];
  const candidates=p.screenshotLayoutCandidates(makeTsv(items),1179,2556,'2026-11-10');
  assert.equal(candidates.length,5);
  assert.deepEqual(Array.from(candidates.map(x=>x.date)),['2026-11-02','2026-11-01','2026-10-29','2026-10-29','2026-10-27']);
  assert.deepEqual(Array.from(candidates.map(x=>x.bankDirection)),['out','out','out','out','in']);
  assert.ok(candidates.every(x=>x.source==='screenshot-french-grouped'));
  assert.equal(candidates[2].name,'Netflix');
  assert.equal(candidates[3].name,'SNCF');
 });
 await test('OCR price consensus refuses contradictory sign, zero amount and clipped right columns',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  assert.equal(p.priceEvidence('0,00'),null);
  assert.equal(p.priceEvidence('-0,00'),null);
  assert.equal(p.reconcileBankDirection([{text:'+300,00'},{text:'-300,00'}],'in',true).review,true);
  assert.equal(p.reconcileBankDirection([{text:'300,00'}],'',true).review,true);
  assert.equal(p.reconcileBankDirection([{text:'-17,30'},{text:'-17,30'}],'',true).direction,'out');
  const crop=p.priceImageRegion({width:1179,height:2556},{box:{price:{left:1035,top:800,width:84,height:24}}});
  assert.ok(crop.left<=965&&crop.right>=1120);
  assert.ok(crop.right<=1179&&crop.left>=0);
 });

 await test('Desjardins PDF totals: extracted purchases, credits, payments and statement must match',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  const input=['DESJARDINS ODYSSEE WORLDELITE MASTERCARD','Date du relevé 08 10 2026',
   'Solde précédent 832,98','Achats / débits + 14,94',"Avances d'argent + 0,00",
   'Frais de crédit + 0,00','Paiements / crédits - 102,87',
   'Nouveau solde courant = 745,05','10 09 11 09 EPICERIE TEST MONTREAL QC 1,00 % 14,94',
   '07 10 08 10 RETOUR TEST TORONTO ON 2,87CR','15 09 15 09 PAIEMENT CAISSE 100,00CR'].join('\n');
  const good=p.extractCandidates(input);
  assert.equal(good.statementCheck.status,'matched');
  assert.equal(good.skippedPayments,1);
  const wrong=p.extractCandidates(input.replace('745,05','700,00'));
  assert.equal(wrong.statementCheck.status,'mismatch');
  const annualRate=p.extractCandidates(input.replace("Avances d'argent + 0,00",
   "Avances d'argent: 21,90 %\nAvances d'argent + 0,00"));
  assert.equal(annualRate.statementCheck.status,'matched');
 });
 await test('weekday cross-check and independent coverage warnings prevent false confidence',()=>{
  const vm=require('node:vm'),env={window:{},document:{},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8'),env);
  const p=env.window.TraceBankDocuments;
  assert.equal(p.parseBankDayOCR('Lundi 02 novembre','2026-11-10'),'2026-11-02');
  assert.equal(p.parseBankDayOCR('Lundi 03 novembre','2026-11-10'),null);
  assert.equal(p.parseBankDayOCR('Mardi 27 octobre','2026-11-10'),'2026-10-27');
  const source=fs.readFileSync(path.join(__dirname,'..','trace-bank-doc-1.11.1.js'),'utf8');
  const review=fs.readFileSync(path.join(__dirname,'..','trace-bank-ui-5.37.0.js'),'utf8');
  const smart=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');
  assert.ok(source.includes('quality={textRows:textCandidates,layoutRows:structuredCandidates.length'));
  assert.ok(review.includes('data.quality?.reviewRequired'));
  assert.ok(review.includes('summary?.status===\'mismatch\''));
  assert.ok(review.includes('!documentNeedsReview?'));
  assert.ok(smart.includes('data.quality?.reviewRequired'));
 });
 console.log(count+' import cent-precision and card reconciliation checks passed');
}
run().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
