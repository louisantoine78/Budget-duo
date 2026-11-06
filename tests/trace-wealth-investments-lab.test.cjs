'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const lab=path.join(root,'experiments/wealth-investments-lab');
const E=require(path.join(lab,'engine.js'));
const market=require(path.join(lab,'quote-policy.js'));

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
 assert.ok(!/window\.supabase|supabase\.createClient|client\.from|fetch\s*\(|(?:localStorage|sessionStorage)\s*\./i.test(app+ui+engine));
 assert.ok(!/src=[\"'][^\"']*(?:config\.js|v5-app-5\.37\.0\.js)|serviceWorker\.register/i.test(html));
 assert.match(html,/LABORATOIRE/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/src="\.\/engine\.js"/);
 assert.match(html,/src="\.\/ui\.js"/);
 assert.match(html,/src="\.\/app\.js"/);
 assert.match(prod,/data-page="wealth"/);
 assert.doesNotMatch(prod,/wealth-investments-lab/);
 assert.match(prod,/<meta name="trace-build" content="5\.37\.0">/);
});


test('dated valuation never reuses a future market quote or a future transaction',()=>{
 let p=blank();
 p=E.appendOperation(p,op('buy-date','buy','2026-11-06',{
  securityId:'X',quantityMicro:E.quantity(1),unitPriceUnits:E.price('10')
 }));
 p=E.setQuote(p,'X',{priceUnits:E.price('14'),date:'2026-11-15',source:'Manuel',kind:'manuel'});
 assert.throws(()=>E.snapshotAt(p,'2026-11-07'),/Cours datés manquants/);
 const early=E.snapshotAt(p,'2026-11-05');
 assert.equal(early.valueCents,100000);
 assert.deepEqual(early.evidence,[]);
 p=E.setQuote(p,'X',{priceUnits:E.price('11'),date:'2026-11-07',source:'Manuel',kind:'manuel'});
 assert.equal(p.quotes.X.priceUnits,E.price('14')); // later latest quote remains latest
 const onDay=E.snapshotAt(p,'2026-11-07');
 assert.equal(onDay.valueCents,100100);
 assert.equal(onDay.estimated,false);
 assert.equal(onDay.evidence[0].quoteDate,'2026-11-07');
 const stale=E.snapshotAt(p,'2026-11-12');
 assert.equal(stale.valueCents,100100);
 assert.equal(stale.estimated,true);
 const future=E.snapshotAt(p,'2026-11-15');
 assert.equal(future.valueCents,100400);
 assert.equal(future.evidence[0].quoteDate,'2026-11-15');
 assert.equal(E.evaluate(p).valueCents,100400);
});
test('same-day manual quotation correction retains one entry and a clear source',()=>{
 let p=blank();
 p=E.appendOperation(p,op('buy','buy','2026-11-06',{securityId:'X',quantityMicro:E.quantity(1),unitPriceUnits:E.price('10')}));
 p=E.setQuote(p,'X',{date:'2026-11-06',priceUnits:E.price('11'),source:'Saisie A',kind:'manuel'});
 p=E.setQuote(p,'X',{date:'2026-11-06',priceUnits:E.price('12'),source:'Saisie B',kind:'manuel'});
 assert.equal(p.quoteHistory.X.length,1);
 assert.equal(E.snapshotAt(p,'2026-11-06').evidence[0].source,'Saisie B');
 assert.equal(E.snapshotAt(p,'2026-11-06').valueCents,100200);
 assert.throws(()=>E.snapshotAt(p,'2026-11-03'),/antérieure/);
});
test('snapshot replays partial sale at the effective day rather than applying the latest share count',()=>{
 let p=blank();
 p=E.appendOperation(p,op('buy10','buy','2026-11-06',{securityId:'X',quantityMicro:E.quantity(10),unitPriceUnits:E.price('10')}));
 p=E.appendOperation(p,op('sell4','sell','2026-11-13',{securityId:'X',quantityMicro:E.quantity(4),unitPriceUnits:E.price('12')}));
 p=E.setQuote(p,'X',{date:'2026-11-12',priceUnits:E.price('12'),source:'Saisie',kind:'manuel'});
 assert.equal(E.snapshotAt(p,'2026-11-12').valueCents,102000);
 assert.equal(E.snapshotAt(p,'2026-11-14').valueCents,102000);
 assert.equal(E.snapshotAt(p,'2026-11-14').estimated,true);
});


test('ISO 6166 ISIN check-digit and exchange MIC validation avoid mistyped identifiers',()=>{
 assert.equal(E.isinValid('FR0000120073'),true);
 assert.equal(E.isinValid('FR0000130577'),true);
 assert.equal(E.isinValid('FR0011871128'),true);
 assert.equal(E.isinValid('DE000TUAG505'),true);
 assert.equal(E.isinValid('FR0000120074'),false);
 assert.equal(E.isinValid('NOT-AN-ISIN'),false);
 assert.equal(E.micValid('XPAR'),true);
 assert.equal(E.micValid('XETR'),true);
 assert.equal(E.micValid('PAR'),false);
 const p=blank();
 p.positions=[{id:'a',quantityMicro:E.quantity(1),costBasisCents:1000,isin:'FR0000120073',marketMic:'XPAR'}];
 assert.doesNotThrow(()=>E.evaluate(p));
 p.positions.push({id:'b',quantityMicro:E.quantity(1),costBasisCents:1000,isin:'FR0000120073',marketMic:'XPAR'});
 assert.throws(()=>E.evaluate(p),/Même ISIN et place/);
 p.positions[1].marketMic='XETR';
 assert.doesNotThrow(()=>E.evaluate(p));
 p.positions[1].isin='FR0000120074';
 assert.throws(()=>E.evaluate(p),/ISIN invalide/);
});


test('operation preview calculates gross fees and after-cash without mutating portfolio',()=>{
 const p=blank();
 const before=JSON.stringify(p);
 const buy=op('preview1','buy','2026-11-06',{
  securityId:'X',quantityMicro:E.quantity(5),unitPriceUnits:E.price('10'),feeCents:120
 });
 const preview=E.previewOperation(p,buy);
 assert.equal(preview.cashBeforeCents,100000);
 assert.equal(preview.cashAfterCents,94880);
 assert.equal(preview.deltaCashCents,-5120);
 assert.equal(preview.quantityAfterMicro,E.quantity(5));
 assert.equal(preview.deltaFlowCents,0);
 assert.equal(preview.candidate.operations.length,1);
 assert.equal(JSON.stringify(p),before);
 assert.throws(()=>E.previewOperation(p,op('overdrawn','withdrawal','2026-11-06',{amountCents:200000})),/Retrait supérieur/);
});
test('edit preview shows net correction impact without creating a second transaction',()=>{
 const p=E.appendOperation(blank(),op('a','withdrawal','2026-11-06',{amountCents:12000}));
 const revised=op('a','withdrawal','2026-11-06',{amountCents:4000});
 const preview=E.previewOperation(p,revised,'a');
 assert.equal(preview.cashBeforeCents,88000);
 assert.equal(preview.cashAfterCents,96000);
 assert.equal(preview.deltaCashCents,8000);
 assert.equal(preview.deltaFlowCents,8000);
 assert.equal(preview.candidate.operations.length,1);
 assert.equal(E.evaluate(p).cashCents,88000);
});
test('partial sell preview refuses unknown opening PRU but passes once supplied',()=>{
 let p=E.demo().portfolios[0];
 const sale=op('s','sell','2026-11-07',{securityId:'dsy',quantityMicro:E.quantity(1),unitPriceUnits:E.price('20')});
 assert.throws(()=>E.previewOperation(p,sale),/PRU initial manquant/);
 p=E.setOpeningPosition(p,'dsy',E.tradeCents(E.quantity(40),E.price('19.70')));
 const result=E.previewOperation(p,sale);
 assert.equal(result.quantityAfterMicro,E.quantity(39));
 assert.equal(result.deltaRealizedCents,30);
 assert.equal(result.cashAfterCents,15829);
 assert.equal(p.operations.length,0);
});


test('real snapshot chart corrects external deposits without erasing investment gain',()=>{
 const p={...blank(),snapshots:[
  {date:'2026-11-04',valueCents:100000,source:'Opening'},
  {date:'2026-11-12',valueCents:125000,source:'Broker extract'}
 ],operations:[op('external','deposit','2026-11-09',{amountCents:10000})]};
 const chart=E.chartSeries(p,'all');
 assert.equal(chart.ready,true);
 assert.equal(chart.points.length,2);
 assert.equal(chart.points[0].valueCents,100000);
 assert.equal(chart.points[1].valueCents,125000);
 assert.equal(chart.points[1].netExternalCents,10000);
 assert.equal(chart.points[1].flowAdjustedCents,115000);
 assert.equal(chart.from,'2026-11-04');
 assert.equal(chart.to,'2026-11-12');
 assert.match(chart.method,/pas de TWR/);
 assert.equal(E.periodPerformance(p,'all').gainCents,15000);
 assert.equal(E.evaluate(p).cashCents,110000); // independent of observed snapshot
});
test('chart filters actual dated points only and rejects duplicated same-day observations',()=>{
 const p={...blank(),snapshots:[
  {date:'2026-08-01',valueCents:101000,source:'Relevé'},
  {date:'2026-10-30',valueCents:110000,source:'Relevé'},
  {date:'2026-11-04',valueCents:111000,source:'Relevé'}
 ]};
 const whole=E.chartSeries(p,'all');
 const month=E.chartSeries(p,1);
 assert.equal(whole.points.length,3);
 assert.equal(month.points.length,2);
 assert.equal(month.ready,true);
 assert.equal(month.points[0].date,'2026-10-30');
 assert.throws(()=>E.chartSeries(p,0),/Période de graphique invalide/);
 assert.throws(()=>E.chartSeries({...p,snapshots:[...p.snapshots,{date:'2026-11-04',valueCents:115000}]},'all'),/même date/);
});
test('one reference snapshot remains a point, never a continuous chart or pretend return',()=>{
 const p=E.demo().portfolios[0],series=E.chartSeries(p,'all');
 assert.equal(series.points.length,1);
 assert.equal(series.ready,false);
 assert.equal(series.points[0].valueCents,378869);
 assert.equal(series.points[0].reference,true);
 assert.equal(series.points[0].flowAdjustedCents,378869);
});


test('future price adapter accepts attributed EUR Euronext close without using a live API',()=>{
 const security={isin:'FR0000120073',marketMic:'XPAR',currency:'EUR'};
 const feed={isin:'FR0000120073',marketMic:'XPAR',currency:'EUR',
  price:'32.1234',vendor:'Demo provider',feed:'eod',marketState:'closed',
  tradingDate:'2026-11-05',timestampUTC:'2026-11-05T16:37:00Z',
  redistributionAllowed:true,delayMinutes:0};
 const quote=market.acceptQuote(feed,security,'2026-11-06T10:00:00Z');
 assert.equal(quote.priceUnits,321234);
 assert.equal(quote.kind,'clôture');
 assert.equal(quote.date,'2026-11-05');
 assert.equal(quote.observedAt,'2026-11-05T16:37:00Z');
 assert.equal(quote.marketState,'fermé');
 assert.equal(quote.marketMic,'XPAR');
 assert.equal(quote.displayRights,'confirmed');
 const p=blank();
 const injected=E.setQuote(p,'X',quote);
 assert.equal(injected.quotes.X.kind,'clôture');
 assert.equal(injected.quotes.X.priceUnits,321234);
 assert.equal(p.quotes.X,undefined);
});
test('market quote contract refuses mismatched symbols, FX, unlicensed feeds and invented real-time status',()=>{
 const security={isin:'FR0000120073',marketMic:'XPAR',currency:'EUR'};
 const good={isin:'FR0000120073',marketMic:'XPAR',currency:'EUR',
  price:'32.1234',vendor:'Demo provider',feed:'eod',marketState:'closed',
  tradingDate:'2026-11-05',timestampUTC:'2026-11-05T16:37:00Z',
  redistributionAllowed:true};
 const now='2026-11-06T10:00:00Z';
 assert.throws(()=>market.acceptQuote({...good,redistributionAllowed:false},security,now),/Licence/);
 assert.throws(()=>market.acceptQuote({...good,isin:'FR0000130577'},security,now),/correspondance/);
 assert.throws(()=>market.acceptQuote({...good,marketMic:'XETR'},security,now),/correspondance/);
 assert.throws(()=>market.acceptQuote({...good,currency:'USD'},security,now),/Devise incompatible/);
 assert.throws(()=>market.acceptQuote({...good,feed:'unknown'},security,now),/Statut/);
 assert.throws(()=>market.acceptQuote({...good,timestampUTC:'2026-11-09T13:00:00Z'},security,now),/futur/);
 assert.throws(()=>market.acceptQuote({...good,tradingDate:'2026-11-09'},security,now),/Date de marché/);
 assert.throws(()=>market.acceptQuote({...good,price:'0'},security,now),/positif/);
 assert.throws(()=>market.acceptQuote({...good,price:'32.12345'},security,now),/décimales/);
 assert.throws(()=>market.acceptQuote(good,{...security,isin:''},now),/ISIN/);
});
