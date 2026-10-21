'use strict';
// TRACE 5.37.0 integration safety guards.
// Static wiring checks are not a substitute for an iPhone/Safari smoke run.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'index.html'),'utf8');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('new international code remains unpublished on main entrypoint',()=>{
 assert.match(shell,/<meta name="trace-build" content="5\.36\.5">/);
 assert.doesNotMatch(shell,/v5-app-5\.37\.0\.js/);
});
test('bank and wealth event handlers iterate an array of nodes',()=>{
 for(const selector of ['data-foreign-bank','data-setup-bank','data-rename-bank','data-primary-bank']){
  assert.ok(app.includes("$('["+selector+"]')"));
  assert.equal(app.split('\n').some(line=>line.trim().startsWith("$('["+selector+"]')")&&line.includes('.forEach')),false);
 }
});
test('personal international dashboard does not overwrite Couple numbers',()=>{
 assert.match(app,/balanceNode:homeScope==='mine'\?\$\('#homeBalance'\):null/);
 assert.match(app,/cardNode:homeScope==='mine'\?\$\('#homeCard'\):null/);
});
test('unconfirmed foreign CSV rows retain native amount with null CAD',()=>{
 assert.match(app,/amountCAD:ccy==='CAD'\?amount:null/);
 assert.match(app,/const booked=t\.bankCurrency==='CAD'\?/);
});
test('unverified debit différé mode is disabled on card creation',()=>{
 assert.match(app,/<option value="deferred" disabled>/);
 assert.match(app,/payment\.value!=='credit'/);
});
test('new credit card needs explicit same-currency bank settlement',()=>{
 assert.match(app,/settlementAccountId:linkedId/);
 assert.match(app,/!linkedAccount/);
});
test('foreign bank movement editor cannot accidentally rewrite its CAD budget',()=>{
 assert.match(app,/Mouvement international à préserver/);
 assert.match(app,/futur éditeur international/);
});
console.log(count+' international wiring guards passed');
