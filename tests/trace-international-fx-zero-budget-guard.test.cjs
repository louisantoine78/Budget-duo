'use strict';
// Native Node-compatible isolated FX assertions; all examples fictional.
// No calls to hosted Supabase, actual banks, or FX providers.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const sandbox={window:{}};
vm.runInNewContext(source,sandbox);
const I=sandbox.window.TraceInternational;
const account={id:'eur',owner:'la',type:'checking',country:'FR',currency:'EUR'};
const at='2026-10-12';
function book(amount,rate){
 return I.resolveBooking({account,bankAmount:amount,date:at,
  quote:{currency:'EUR',cadPerUnit:rate,date:at,source:'Fictional manual quote'}});
}
test('foreign one-cent debit cannot disappear from CAD budget after rounding',()=>{
 assert.throws(()=>book(0.01,0.000001),/Contre-valeur CAD nulle/);
});
test('near-threshold nonzero foreign debit cannot be silently zero valued',()=>{
 assert.throws(()=>book(0.02,0.02),/Contre-valeur CAD nulle/);
});
test('real 40 EUR at sourced 1.6 produces 64 CAD with native preserved',()=>{
 const t=book(40,1.6);
 assert.equal(t.bankAmount,40);assert.equal(t.bankCurrency,'EUR');
 assert.equal(t.amountCAD,64);assert.equal(t.bankRateCad,1.6);
 assert.equal(t.fxRateSource,'Fictional manual quote');
});
test('a small but representable foreign purchase is retained',()=>{
 const t=book(0.01,1.6);
 assert.equal(t.amountCAD,0.02);assert.equal(t.bankAmount,0.01);
});
test('missing or zero FX quote never gets automatic 1:1 valuation',()=>{
 assert.throws(()=>I.resolveBooking({account,bankAmount:40,date:at}),/Taux CAD requis/);
 assert.throws(()=>book(40,0),/Taux CAD requis/);
});
test('one-unit CAD account needs no FX conversion and stays nonzero',()=>{
 const cad={id:'cad',owner:'la',currency:'CAD',type:'checking',country:'CA'};
 const t=I.resolveBooking({account:cad,bankAmount:0.01,date:at});
 assert.equal(t.amountCAD,0.01);assert.equal(t.bankAmount,0.01);
});

test('finite but overflowing FX quote cannot produce infinite budget or assets',()=>{
 const quote={currency:'EUR',cadPerUnit:1e308,date:at,source:'Fictional extreme rate'};
 assert.equal(I.fxValue(40,'EUR',quote),null);
 assert.throws(()=>I.resolveBooking({account,bankAmount:40,date:at,quote}),/Taux CAD requis/);
 const view=I.snapshot({accounts:[account],owner:'la',mainId:'eur',
  estimates:{eur:40},fxRates:{EUR:quote}});
 assert.equal(view.complete,false);
 assert.equal(view.globalCAD,null);
});
test('FX amounts exceeding safe cent precision stay unknown rather than a fake wealth total',()=>{
 const quote={currency:'EUR',cadPerUnit:1e14,date:at,source:'Fictional unsafe rate'};
 assert.equal(I.fxValue(100,'EUR',quote),null);
 const view=I.snapshot({accounts:[account],estimates:{eur:100},fxRates:{EUR:quote}});
 assert.equal(view.complete,false);assert.equal(view.globalCAD,null);
});
test('ordinary foreign credit and debit balances still use their native currency',()=>{
 const quote={currency:'EUR',cadPerUnit:1.6,date:at,source:'Fictional quote'};
 assert.equal(I.fxValue(-30,'EUR',quote),-48);
 assert.equal(I.fxValue(30,'EUR',quote),48);
});

test('nonzero foreign bank balance that rounds to 0 CAD is marked incomplete',()=>{
 const quote={currency:'EUR',cadPerUnit:0.001,date:at,source:'Fictional tiny FX quote'};
 const s=I.snapshot({accounts:[account],mainId:'eur',owner:'la',
  estimates:{eur:0.01},fxRates:{EUR:quote}});
 assert.equal(s.complete,false);assert.equal(s.globalCAD,null);
 assert.equal(s.balances[0].balance,0.01);
 assert.equal(s.balances[0].cad,null);
});
test('genuinely zero foreign account balance stays safely known at 0 CAD',()=>{
 const quote={currency:'EUR',cadPerUnit:0.001,date:at,source:'Fictional tiny FX quote'};
 const s=I.snapshot({accounts:[account],mainId:'eur',owner:'la',
  estimates:{eur:0},fxRates:{EUR:quote}});
 assert.equal(s.complete,true);assert.equal(s.globalCAD,0);
 assert.equal(s.balances[0].cad,0);
});
