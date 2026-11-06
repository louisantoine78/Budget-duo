'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const lab=path.resolve(__dirname,'../experiments/wealth-investments-lab');
const E=require(path.join(lab,'engine.js'));
const Bridge=require(path.join(lab,'legacy-bridge.js'));
function account(){return{id:'pea-legacy',name:'PEA TRACE test',type:'PEA',owner:'la',currency:'EUR'};}
function ledger(){return [
 {id:'1',accountId:'pea-legacy',type:'deposit',amount:1000,date:'2026-07-01',bankAccountId:'bank-source',linkedTransactionId:'tx-original'},
 {id:'2',accountId:'pea-legacy',type:'buy',symbol:'DSY',quantity:10,unitPrice:20,fee:1,date:'2026-07-02'},
 {id:'3',accountId:'pea-legacy',type:'buy',symbol:'DSY',quantity:5,unitPrice:25,fee:1,date:'2026-07-03'},
 {id:'4',accountId:'pea-legacy',type:'sell',symbol:'DSY',quantity:3,unitPrice:30,fee:1,date:'2026-07-05'},
 {id:'5',accountId:'pea-legacy',type:'dividend',amount:5,date:'2026-07-07'},
 {id:'6',accountId:'pea-legacy',type:'fee',amount:1,date:'2026-07-08'},
 {id:'7',accountId:'pea-legacy',type:'quote',symbol:'DSY',unitPrice:31.5,date:'2026-07-09'},
 {id:'old-draft',status:'draft',accountId:'pea-legacy',type:'buy',symbol:'DSY',quantity:100,unitPrice:200,date:'2026-07-11'},
 {id:'other-account',accountId:'not-mine',type:'deposit',amount:999,date:'2026-07-15'}
]}
test('READ ONLY bridge preserves historic IDs, order, cash, and realized gain without generating transfers',()=>{
 const a=account(),raw=ledger(),before=JSON.stringify({a,raw});
 const r=Bridge.build(a,raw);
 assert.equal(r.status,'reconciliation-required');
 assert.equal(r.accountId,'pea-legacy');
 assert.equal(r.portfolio.id,'pea-legacy');
 assert.equal(r.operationCount,7);
 assert.equal(r.portfolio.operations.length,6);
 assert.equal(r.portfolio.operations[0].sourceOperationId,'1');
 assert.equal(r.portfolio.operations[0].linkedBankAccountId,'bank-source');
 assert.equal(r.portfolio.operations[0].linkedTransactionId,'tx-original');
 assert.equal(r.portfolio.operations.some(o=>o.type==='quote'),false);
 assert.equal(r.quoteCandidates.length,1);
 assert.equal(r.quoteCandidates[0].state,'source-and-timestamp-unverified');
 assert.equal(r.portfolio.quotes.DSY,undefined);
 const e=E.evaluate(r.portfolio);
 assert.equal(e.cashCents,76600);
 assert.equal(e.realizedCents,2360);
 assert.equal(e.positions.length,1);
 assert.equal(e.positions[0].quantityMicro,E.quantity(12));
 assert.equal(e.positions[0].costBasisCents,26160);
 assert.equal(e.valueCents,null);
 assert.equal(e.profitCents,null);
 assert.equal(JSON.stringify({a,raw}),before);
 assert.match(r.issues.join(' '),/aucune transaction dupliquée/);
});
test('broker corroboration is explicit, read-only and fails on mismatch or missing PRU',()=>{
 const bridge=Bridge.build(account(),ledger());
 const matching={cashCents:76600,positions:[{symbol:'DSY',quantityMicro:E.quantity(12),costBasisCents:26160}]};
 const good=Bridge.reconcile(bridge,matching);
 assert.equal(good.matched,true);
 assert.equal(good.pricesVerified,false);
 assert.equal(good.fxVerified,false);
 const bad=Bridge.reconcile(bridge,{cashCents:76601,positions:[{...matching.positions[0],quantityMicro:E.quantity(13)}]});
 assert.equal(bad.matched,false);
 assert.match(bad.problems.join(' '),/Espèces/);
 assert.match(bad.problems.join(' '),/Quantité/);
 assert.match(Bridge.reconcile(bridge,{cashCents:76600,positions:[{symbol:'DSY',quantityMicro:E.quantity(12)}]}).problems.join(' '),/PRU/);
 assert.equal(Bridge.build(account(),ledger()).status,'reconciliation-required');
});
test('duplicates and invalid prices do not produce a partially importable portfolio',()=>{
 const raw=ledger();
 const duplicate=Bridge.build(account(),[...raw,{...raw[0]}]);
 assert.equal(duplicate.status,'needs-review');
 assert.equal(duplicate.portfolio,null);
 assert.match(duplicate.issues.join(' '),/répété/);
 const highPrecision=Bridge.build(account(),raw.map(o=>o.id==='2'?{...o,unitPrice:20.12345}:o));
 assert.equal(highPrecision.status,'needs-review');
 assert.match(highPrecision.issues.join(' '),/décimales/);
 const missingDeposit=Bridge.build(account(),raw.filter(x=>x.id!=='1'));
 assert.equal(missingDeposit.status,'needs-review');
 assert.match(missingDeposit.issues.join(' '),/Rejeu impossible/);
});
test('bank and savings classification never converts legacy CELI savings or linked accounts',()=>{
 const raw=ledger();
 const savings=Bridge.build({...account(),type:'CELI'},raw);
 assert.equal(savings.status,'excluded');
 const opted=Bridge.build({...account(),type:'CELI',investmentTracking:'securities'},raw);
 assert.equal(opted.status,'reconciliation-required');
 assert.equal(opted.portfolio.type,'CELI');
 assert.equal(Bridge.build({...account(),type:'REER',savingsTracking:'linked'},raw).status,'excluded');
});
test('missing historic journal and FX currency are explicit review blockers, not fabricated opening cash',()=>{
 const nothing=Bridge.build(account(),[]);
 assert.equal(nothing.status,'needs-review');
 assert.equal(nothing.portfolio,null);
 assert.match(nothing.issues.join(' '),/état initial/);
 const fx=Bridge.build({...account(),currency:'ABC'},ledger());
 assert.equal(fx.status,'needs-review');
 assert.match(fx.issues.join(' '),/Devise/);
});
test('unrelated household transactions, statuses and nonmatching IDs never enter the bridge',()=>{
 const all=[...ledger(),{id:'pending',accountId:'pea-legacy',type:'deposit',amount:5000,date:'2026-07-08',status:'pending'}];
 const result=Bridge.build(account(),all);
 assert.equal(result.operationCount,7);
 assert.equal(result.portfolio.operations.length,6);
 assert.equal(result.portfolio.operations.some(x=>x.id==='pending'),false);
 assert.equal(result.portfolio.operations.some(x=>x.id==='other-account'),false);
});
