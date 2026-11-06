'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'../experiments/wealth-investments-lab');
const Gateway=require(path.join(dir,'trace-state-gateway.js'));
const E=require(path.join(dir,'engine.js'));
const fixture=require(path.join(dir,'trace-fixture.js'));
const run=(snap,scope='mine',coupleAuthorized=false)=>Gateway.select(snap,{viewerOwner:'la',scope,coupleAuthorized});
test('TRACE 5.37-shaped accounts: mine shows owned PEA, ignores partner and preserves linked savings',()=>{
 const snap=fixture.create(),original=JSON.stringify(snap);
 const selected=run(snap);
 assert.equal(selected.readOnly,true);
 assert.equal(selected.kind,'TRACE-5.37-DIAGNOSTIC-ONLY');
 assert.equal(selected.scope,'mine');
 assert.equal(selected.selectedAccounts,3);
 assert.deepEqual(selected.portfolios.map(p=>p.id),['sample-pea']);
 assert.deepEqual(selected.review.map(x=>x.accountId),['sample-cto']);
 assert.deepEqual(selected.excluded.map(x=>x.accountId),['sample-savings']);
 assert.equal(selected.portfolios[0].readOnly,true);
 assert.equal(selected.portfolios[0].openingCashConfirmed,false);
 assert.equal(selected.summary[0].bankLinks,1);
 assert.equal(selected.summary[0].quoteCandidates,1);
 assert.equal(selected.portfolios[0].operations.length,3);
 assert.equal(selected.portfolios[0].operations.some(x=>x.id==='pea-quote'),false);
 assert.equal(E.evaluate(selected.portfolios[0]).cashCents,76100);
 assert.equal(E.evaluate(selected.portfolios[0]).valueCents,null);
 assert.equal(JSON.stringify(snap),original);
});
test('couple requires explicit authorization; never mixes EUR and CAD without dated FX',()=>{
 const snap=fixture.create();
 assert.throws(()=>run(snap,'couple'),/non autorisé/);
 const couple=run(snap,'couple',true);
 assert.equal(couple.selectedAccounts,5);
 assert.deepEqual(couple.portfolios.map(p=>p.id),['sample-pea','sample-reer']);
 assert.equal(couple.review.length,1);
 assert.deepEqual(couple.excluded.map(x=>x.accountId),['sample-celi','sample-savings']);
 assert.deepEqual(couple.currencies,['EUR','CAD']);
 assert.equal(couple.crossCurrencyTotalAllowed,false);
 assert.equal(couple.portfolios[0].owner,'la');
 assert.equal(couple.portfolios[1].owner,'partner');
 assert.equal(E.evaluate(couple.portfolios[1]).cashCents,54800);
 assert.equal(E.evaluate(couple.portfolios[1]).valueCents,null);
 const mineAgain=run(snap);
 assert.equal(mineAgain.portfolios.length,1);
 assert.equal(mineAgain.portfolios.some(p=>p.owner==='partner'),false);
});
test('invalid scope, duplicate IDs and unsupported actor fail before anything can be displayed',()=>{
 const snap=fixture.create();
 assert.throws(()=>Gateway.select(snap,{viewerOwner:'anonymous',scope:'mine'}),/Titulaire/);
 assert.throws(()=>Gateway.select(snap,{viewerOwner:'la',scope:'all'}),/Titulaire/);
 assert.throws(()=>run({...snap,investmentAccounts:[...snap.investmentAccounts,snap.investmentAccounts[0]]}),/dupliqué/);
 assert.throws(()=>run({...snap,investmentOperations:[...snap.investmentOperations,snap.investmentOperations[0]]}),/doublon/);
 assert.throws(()=>run({investmentAccounts:[],investmentOperations:null}),/invalide/);
});
test('only confirmed journal is reused and the blocked empty account cannot become an invented position',()=>{
 const result=run(fixture.create(),'couple',true);
 assert.equal(result.portfolios.length,2);
 assert.equal(result.portfolios[1].operations.some(x=>x.id==='reer-draft'),false);
 assert.ok(result.review.some(x=>x.accountId==='sample-cto'));
 assert.ok(result.review[0].reasons.some(x=>/état initial/.test(x)));
 assert.equal(result.portfolios.some(x=>x.id==='sample-cto'),false);
 assert.equal(result.portfolios.some(x=>x.id==='sample-celi'),false);
});
test('new account projections are deep copies, never shared ledger references',()=>{
 const snap=fixture.create();
 const first=run(snap), second=run(snap);
 first.portfolios[0].name='Modified display only';
 assert.notEqual(first.portfolios[0].name,second.portfolios[0].name);
 assert.equal(snap.investmentAccounts[0].name,'PEA fictif');
 assert.equal(first.portfolios[0].operations[0].sourceOperationId,'pea-cash');
 assert.equal(second.portfolios[0].operations[0].linkedTransactionId,'sample-bank-transfer');
});


test('one linked bank transaction must not feed multiple investment deposits',()=>{
 const source=fixture.create();
 source.investmentOperations.push({
  id:'second-linked-deposit',accountId:'sample-reer',type:'deposit',amount:100,
  date:'2026-10-27',status:'confirmed',linkedTransactionId:'sample-bank-transfer'
 });
 const result=run(source,'couple',true);
 assert.equal(result.portfolios.some(p=>p.id==='sample-pea'),false);
 assert.equal(result.portfolios.some(p=>p.id==='sample-reer'),false);
 assert.equal(result.review.filter(x=>x.status==='duplicate-bank-transfer-link').length,2);
 assert.ok(result.review.some(x=>x.reasons.some(s=>s.includes('plusieurs opérations'))));
 assert.ok(result.excluded.some(x=>x.accountId==='sample-celi'));
});
test('duplicated external transfers in one portfolio are flagged rather than inflating cash',()=>{
 const source=fixture.create();
 const first=source.investmentOperations.find(o=>o.id==='pea-cash');
 source.investmentOperations.push({
  ...first,id:'alternate-deposit',date:'2026-10-30',amount:20
 });
 const result=run(source);
 assert.equal(result.portfolios.length,0);
 assert.equal(result.review.some(x=>x.accountId==='sample-pea'&&
  x.status==='duplicate-bank-transfer-link'),true);
 assert.equal(result.review.some(x=>x.accountId==='sample-cto'),true);
});
