'use strict';
/* Isolated read-only screenshot FX discrepancy review, fictional ledger.
 * No network, Supabase, production state or browser runtime. */
const assert=require('node:assert/strict'),{test}=require('node:test'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'trace-bank-ui-2.8.1.js'),'utf8');
const begin=src.indexOf('function tracePossibleForeignDebitCorrection('),
 end=src.indexOf('\nfunction smartDrafts(',begin);
assert.ok(begin>=0&&end>begin,'Candidate FX discrepancy matcher must exist');
const fn=src.slice(begin,end);
const base={id:'manual_1',status:'confirmed',type:'expense',
 accountId:'ca',date:'2026-11-03',name:'Cafe Voyage',
 bankCurrency:'CAD',currency:'GBP',amountOriginal:25,
 bankAmount:45.50,amountCAD:45.50};
function fixture(changes={},bankCurrency='CAD',second=null){
 const state={accounts:[{id:'ca',currency:bankCurrency}],
  transactions:[{...base,...changes},...(second?[second]:[])]};
 const normalizedMerchant=s=>String(s||'').trim().toLowerCase();
 const smartExactBankAmount=v=>typeof v==='number'&&v>0&&
  Math.abs(v*100-Math.round(v*100))<1e-7?v:null;
 const smartStrictDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v));
 const window={TraceInternational:{currency:a=>a.currency,valid:c=>['CAD','EUR','USD','GBP','CHF'].includes(c)}};
 const testMatch=new Function('state','window','normalizedMerchant','smartExactBankAmount',
  'smartStrictDate',fn+'return tracePossibleForeignDebitCorrection;')(
  state,window,normalizedMerchant,smartExactBankAmount,smartStrictDate);
 return{match:row=>testMatch({date:'2026-11-03',name:'Cafe Voyage',amount:46.12,...row},'ca'),state};
}
test('foreign CAD estimate and slightly different actual debit are reviewable without posting',()=>{
 const c=fixture();assert.equal(c.match()?.id,'manual_1');assert.equal(c.state.transactions.length,1);
 assert.equal(c.state.transactions[0].bankAmount,45.50);
});
test('an identical bank debit is not misclassified as a correction',()=>{
 assert.equal(fixture().match({amount:45.5}),null);
});
test('date, merchant or account currency mismatch never becomes a link',()=>{
 assert.equal(fixture().match({date:'2026-11-04'}),null);
 assert.equal(fixture().match({name:'Cafe Autre'}),null);
 assert.equal(fixture({},'EUR').match(),null);
});
test('CAD-native, pending, non-expense and imported transactions are excluded',()=>{
 for(const detail of [{currency:'CAD'},{status:'pending'},{type:'refund'},
  {source:'image'},{source:'csv'},{bankCurrency:'EUR'},{amountOriginal:null}]){
  assert.equal(fixture(detail).match(),null,JSON.stringify(detail));
 }
});
test('large amount discrepancy and unreadable fractional cents are not guessed',()=>{
 assert.equal(fixture().match({amount:70}),null);
 assert.equal(fixture().match({amount:46.125}),null);
 assert.equal(fixture().match({amount:0}),null);
});
test('two plausible same-merchant foreign entries are ambiguous',()=>{
 const candidate={...base,id:'manual_2',bankAmount:45.75};
 assert.equal(fixture({},'CAD',candidate).match(),null);
});
test('screenshot UI renders the original and observed CAD amounts and opens the original entry',()=>{
 assert.match(ui,/status\.amountConflict&&status\.matchId/);
 assert.match(ui,/data-open-estimated/);
 assert.match(ui,/bridge\.openTransaction\(id\)/);
 assert.match(ui,/aucune correction automatique/);
});
test('batch importer rechecks the live candidate and refuses a second posting',()=>{
 assert.match(src,/method==='image'&&type==='expense'&&\s*tracePossibleForeignDebitCorrection\(probe,accountId\)/);
 assert.match(src,/aucun doublon créé/);
 assert.match(src,/amountConflict:!!estimatedCorrection/);
 assert.match(src,/matchAmount:estimatedCorrection\?\.bankAmount/);
});

test('bank-confirmed foreign purchase is not re-offered for correction',()=>{
 assert.equal(fixture({fxBankAmountStatus:'bank_confirmed'}).match(),null);
 assert.equal(fixture({bankDebitReview:{source:'capture_compare_confirmed'}}).match(),null);
});
test('purchase quote and true bank debit retain separate metadata',()=>{
 for(const part of ['bankQuoteMeta={purchaseCurrency,bankCurrency:fromCurrency',
  'purchaseFxReference:savedPurchaseQuote.rate',
  'purchaseFxRateDate:savedPurchaseQuote.observationDate',
  "fxBankAmountStatus:bankOverride?'bank_confirmed':'estimated'"])
  assert.ok(src.includes(part),part);
});
