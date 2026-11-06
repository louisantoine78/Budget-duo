'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'../experiments/wealth-investments-lab');
const Parity=require(path.join(dir,'legacy-parity.js'));
const Bridge=require(path.join(dir,'legacy-bridge.js'));
const Fixture=require(path.join(dir,'trace-fixture.js'));
const Gateway=require(path.join(dir,'trace-state-gateway.js'));
function get(){const snapshot=Fixture.create(),a=snapshot.investmentAccounts[0];
 const bridge=Bridge.build(a,snapshot.investmentOperations);
 assert.equal(bridge.status,'reconciliation-required');
 return{snapshot,account:a,portfolio:bridge.portfolio};}
test('independent TRACE 5.37 ledger parity: cash, deposits, dividends, cost, positions and fees',()=>{
 const {snapshot,account,portfolio}=get();
 const result=Parity.compare(account,snapshot.investmentOperations,portfolio);
 assert.equal(result.matched,true);
 assert.equal(result.status,'matched');
 assert.deepEqual(result.problems,[]);
 assert.equal(result.legacy.cashCents,76100);
 assert.equal(result.legacy.netFlowCents,100000);
 assert.equal(result.legacy.dividendsCents,300);
 assert.equal(result.legacy.feesCents,200);
 assert.deepEqual(result.legacy.positions,[{
  symbol:'EXMP',quantityMicro:2000000,costBasisCents:24200
 }]);
 assert.equal(result.marketPricesReconciled,false);
 assert.deepEqual(result.checked,['cash','contributions','dividends','fees','realized','positions']);
});
test('a cent of drift blocks the migrated display while source ledger is preserved',()=>{
 const {snapshot,account,portfolio}=get();
 const changed=structuredClone(portfolio);
 changed.operations[0].amountCents+=1;
 const diff=Parity.compare(account,snapshot.investmentOperations,changed);
 assert.equal(diff.matched,false);
 assert.equal(diff.status,'mismatch');
 assert.ok(diff.problems.some(s=>/Espèces/.test(s)));
 assert.ok(diff.problems.some(s=>/Apports/.test(s)));
 assert.equal(portfolio.operations[0].amountCents,100000);
 assert.equal(snapshot.investmentOperations[0].amount,1000);
});
test('quotes are quarantined for display and do not become assumed market quotes',()=>{
 const {snapshot,account,portfolio}=get();
 const m=Parity.compare(account,snapshot.investmentOperations,portfolio);
 assert.equal(m.matched,true);
 assert.equal(m.marketPricesReconciled,false);
 assert.deepEqual(portfolio.quotes,{});
 assert.ok(!portfolio.operations.some(o=>o.type==='quote'));
});
test('partial sales and weighted-average PRU remain consistent with original TRACE when exact in cents',()=>{
 const account={id:'acct',name:'Fictif',type:'PEA',owner:'la',currency:'EUR'};
 const journal=[
  {id:'1',accountId:'acct',type:'deposit',date:'2026-10-01',amount:1000},
  {id:'2',accountId:'acct',type:'buy',date:'2026-10-02',symbol:'ABC',quantity:5,unitPrice:20,fee:1},
  {id:'3',accountId:'acct',type:'buy',date:'2026-10-03',symbol:'ABC',quantity:5,unitPrice:20,fee:1},
  {id:'4',accountId:'acct',type:'sell',date:'2026-10-04',symbol:'ABC',quantity:5,unitPrice:25,fee:1}
 ];
 const bridge=Bridge.build(account,journal);
 assert.equal(bridge.status,'reconciliation-required');
 const result=Parity.compare(account,journal,bridge.portfolio);
 assert.equal(result.matched,true);
 assert.equal(result.legacy.positions[0].quantityMicro,5000000);
 assert.equal(result.legacy.positions[0].costBasisCents,10100);
 assert.equal(result.legacy.realizedCents,2300);
});
test('fractional costs that produce different rounding must be surfaced rather than silently reconciled',()=>{
 const account={id:'fractional',name:'Fictif',type:'PEA',owner:'la',currency:'EUR'};
 const journal=[
  {id:'1',accountId:'fractional',type:'deposit',date:'2026-10-01',amount:100},
  {id:'2',accountId:'fractional',type:'buy',date:'2026-10-02',symbol:'ETF',quantity:3,unitPrice:3.331,fee:0},
  {id:'3',accountId:'fractional',type:'buy',date:'2026-10-03',symbol:'ETF',quantity:3,unitPrice:3.331,fee:0}
 ];
 const bridge=Bridge.build(account,journal);
 assert.equal(bridge.status,'reconciliation-required');
 const diff=Parity.compare(account,journal,bridge.portfolio);
 // Original: aggregate 19.986 => 19.99; new: round each 9.993 to 9.99 = 19.98.
 assert.equal(diff.status,'mismatch');
 assert.ok(diff.problems.some(s=>/Espèces/.test(s)));
 assert.ok(diff.problems.some(s=>/Coût/.test(s)));
});
test('unrelated account data and invalid/corrupt sources do not contaminate parity reports',()=>{
 const {snapshot,account,portfolio}=get();
 const copied=structuredClone(snapshot.investmentOperations);
 copied.push({id:'outside',accountId:'partner',type:'deposit',date:'2026-11-01',amount:99999});
 assert.equal(Parity.compare(account,copied,portfolio).matched,true);
 assert.equal(Parity.compare({...account,id:'fake'},copied,portfolio).status,'unavailable');
 assert.equal(Parity.compare(account,[{id:'corrupt',accountId:account.id,type:'exploit'}],portfolio).status,'unavailable');
});
test('owner-scoped gateway only includes portfolios with successful parity',()=>{
 const source=Fixture.create();
 const result=Gateway.select(source,{viewerOwner:'la',scope:'couple',coupleAuthorized:true});
 assert.equal(result.portfolios.length,2);
 assert.deepEqual(result.summary.map(p=>p.ledgerParity),['matched','matched']);
 assert.equal(result.review.length,1);
 assert.equal(result.portfolios.every(p=>p.readOnly),true);
});


test('gateway actually blocks an instrument when independent cost rounding disagrees by one cent',()=>{
 const snapshot={
  investmentAccounts:[{id:'p',name:'Test écart',type:'PEA',owner:'la',currency:'EUR'}],
  investmentOperations:[
   {id:'1',accountId:'p',type:'deposit',date:'2026-10-01',amount:100},
   {id:'2',accountId:'p',type:'buy',date:'2026-10-02',symbol:'ETF',quantity:3,unitPrice:3.331,fee:0},
   {id:'3',accountId:'p',type:'buy',date:'2026-10-03',symbol:'ETF',quantity:3,unitPrice:3.331,fee:0}
  ]
 };
 const selected=Gateway.select(snapshot,{viewerOwner:'la',scope:'mine'});
 assert.equal(selected.portfolios.length,0);
 assert.equal(selected.review.length,1);
 assert.equal(selected.review[0].status,'ledger-divergence');
 assert.ok(selected.review[0].reasons.some(x=>/Coût de revient divergent/.test(x)));
 assert.equal(snapshot.investmentOperations.length,3);
});
