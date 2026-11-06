'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const lab=path.join(root,'experiments/wealth-investments-lab');
const E=require(path.join(lab,'engine.js'));
function blank(){
 return{id:'sandbox',name:'Simulation',type:'PEA',currency:'EUR',owner:'la',openingDate:'2026-11-04',
 openingCashCents:100000,positions:[],catalog:[{id:'X',name:'Titre X',assetType:'Action'}],
 quotes:{},snapshots:[],operations:[]};
}
const op=(id,type,date='2026-11-05',more={})=>({id,type,date,amountCents:0,feeCents:0,quantityMicro:0,unitPriceUnits:0,...more});
test('provided Fortuneo positions and reference are faithfully seeded without inventing trades/prices',()=>{
 const d=E.demo(),p=d.portfolios[0],v=E.evaluate(p);
 assert.deepEqual(p.positions.map(s=>[s.name,s.quantityMicro/E.Q_SCALE]),[
 ['Dassault Systèmes',40],['TUI AG',92],['Air Liquide',3],['Amundi PEA S&P 500',8],
 ['Compagnie des Alpes',15],['SAF-Holland',11],['BNP STOXX Europe 600',10],['Sanofi',2]
 ]);
 assert.equal(p.referenceValueCents,378869);
 assert.equal(p.openingCashCents,13829);
 assert.equal(p.operations.length,0);
 assert.equal(p.snapshots.length,1);
 assert.equal(v.valueCents,null);
 assert.equal(v.profitCents,null);
 assert.deepEqual(v.missingCost.length,8);
 assert.deepEqual(v.missingQuote.length,8);
});
test('strict cents, share quantities and market values avoid float cent errors',()=>{
 assert.equal(E.cents('138,29'),13829);
 assert.equal(E.quantity('0.000001'),1);
 assert.equal(E.price('19,7080'),197080);
 assert.equal(E.tradeCents(E.quantity('3'),E.price('19.708')),5912);
 assert.throws(()=>E.cents('1.234'));
 assert.throws(()=>E.price('1.12345'));
 assert.throws(()=>E.quantity('-1'));
});
test('buy with capitalized fees, partial sale, realized and latent gains, dividend, standalone fee and withdrawal',()=>{
 let p=blank();
 p=E.appendOperation(p,op('deposit','deposit','2026-11-05',{amountCents:20000}));
 assert.equal(E.evaluate(p).netFlowCents,20000);
 p=E.appendOperation(p,op('buy','buy','2026-11-06',{securityId:'X',quantityMicro:E.quantity(10),unitPriceUnits:E.price(10),feeCents:100}));
 p=E.setQuote(p,'X',{priceUnits:E.price(12),date:'2026-11-06',kind:'manuel',source:'Saisie'});
 let v=E.evaluate(p);
 assert.equal(v.cashCents,109900);
 assert.equal(v.positions[0].costBasisCents,10100);
 assert.equal(v.positions[0].marketValueCents,12000);
 assert.equal(v.valueCents,121900);
 assert.equal(v.profitCents,1900);
 p=E.appendOperation(p,op('sell','sell','2026-11-07',{securityId:'X',quantityMicro:E.quantity(4),unitPriceUnits:E.price(12),feeCents:50}));
 v=E.evaluate(p);
 assert.equal(v.realizedCents,710);
 assert.equal(v.positions[0].costBasisCents,6060);
 assert.equal(v.positions[0].quantityMicro,E.quantity(6));
 assert.equal(v.unrealizedCents,1140);
 assert.equal(v.profitCents,1850);
 p=E.appendOperation(p,op('div','dividend','2026-11-08',{amountCents:200,securityId:'X'}));
 p=E.appendOperation(p,op('fees','fee','2026-11-08',{amountCents:70}));
 p=E.appendOperation(p,op('withdraw','withdrawal','2026-11-08',{amountCents:2000}));
 v=E.evaluate(p);
 assert.equal(v.netFlowCents,18000);
 assert.equal(v.dividendsCents,200);
 assert.equal(v.directFeesCents,70);
 assert.equal(v.profitCents,1980);
 assert.equal(v.valueCents,119980);
});
test('unknown opening PRU blocks sales without destroying initial holdings',()=>{
 let p=E.demo().portfolios[0];
 const before=JSON.stringify(p);
 assert.throws(()=>E.appendOperation(p,op('sale','sell','2026-11-08',{securityId:'dsy',quantityMicro:E.quantity(1),unitPriceUnits:E.price(20)})),/PRU initial manquant/);
 assert.equal(JSON.stringify(p),before);
 p=E.setOpeningPosition(p,'dsy',E.tradeCents(E.quantity(40),E.price('19.7')));
 assert.equal(E.evaluate(p).missingCost.length,7);
});
test('duplicate operations, overdrawn cash, excessive sales, invalid corrections fail atomically',()=>{
 const p=blank(),buy=op('a','buy','2026-11-06',{securityId:'X',quantityMicro:E.quantity(1),unitPriceUnits:E.price(10)});
 const good=E.appendOperation(p,buy);
 assert.throws(()=>E.appendOperation(good,buy),/déjà enregistré/);
 assert.throws(()=>E.appendOperation(good,op('x','sell','2026-11-08',{securityId:'X',quantityMicro:E.quantity(2),unitPriceUnits:E.price(10)})),/Vente supérieure/);
 assert.throws(()=>E.appendOperation(good,op('x','withdrawal','2026-11-08',{amountCents:200000})),/Retrait supérieur/);
 assert.throws(()=>E.appendOperation(good,op('a','buy','2026-11-06',{securityId:'X',quantityMicro:E.quantity(120),unitPriceUnits:E.price(10)}),'a'),/Liquidités insuffisantes/);
 assert.equal(good.operations.length,1);
 assert.equal(p.operations.length,0);
});
test('correction replays all operations instead of patching already computed balances',()=>{
 const p=E.appendOperation(blank(),op('a','withdrawal','2026-11-07',{amountCents:15000}));
 const revised=E.appendOperation(p,op('a','withdrawal','2026-11-07',{amountCents:3000}),'a');
 assert.equal(E.evaluate(p).cashCents,85000);
 assert.equal(E.evaluate(revised).cashCents,97000);
 assert.equal(revised.operations.length,1);
});
test('multiple portfolio currencies remain distinct, and no ungrounded FX or tax P&L is returned',()=>{
 const eur=blank(),cad={...blank(),currency:'CAD',id:'cad'};
 assert.equal(E.evaluate(eur).cashCents,100000);
 assert.equal(E.evaluate(cad).cashCents,100000);
 assert.equal(E.evaluate(cad).conversionRate,undefined);
 assert.equal(E.evaluate(cad).taxableGain,undefined);
});
test('performance vs cash-flow estimate requires two real snapshots',()=>{
 let p=blank();
 assert.equal(E.periodPerformance(p,'all'),null);
 p={...p,snapshots:[{date:'2026-11-05',valueCents:100000},{date:'2026-11-20',valueCents:125000}]};
 p=E.appendOperation(p,op('flow','deposit','2026-11-12',{amountCents:10000}));
 const perf=E.periodPerformance(p,'all');
 assert.equal(perf.gainCents,15000);
 assert.ok(perf.percent>0);
 assert.match(perf.method,/Dietz modifiée/);
});
test('static laboratory cannot read or mutate TRACE production and preserves its entrypoints',()=>{
 const html=fs.readFileSync(path.join(lab,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(lab,'app.js'),'utf8');
 const ui=fs.readFileSync(path.join(lab,'ui.js'),'utf8');
 const engine=fs.readFileSync(path.join(lab,'engine.js'),'utf8');
 const prod=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(!/supabase|config\.js|v5-app-5\.37\.0\.js|serviceWorker|localStorage|sessionStorage/i.test(html+app+ui+engine));
 assert.match(html,/LABORATOIRE/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/src="\.\/engine\.js"/);
 assert.match(html,/src="\.\/ui\.js"/);
 assert.match(html,/src="\.\/app\.js"/);
 assert.match(prod,/data-page="wealth"/);
 assert.doesNotMatch(prod,/wealth-investments-lab/);
 assert.match(prod,/<meta name="trace-build" content="5\.37\.0">/);
});
