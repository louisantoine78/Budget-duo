'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const E=require(path.join(root,'trace-wealth-201-engine.js'));
const W=require(path.join(root,'trace-wealth-201.js'));
const acct=()=>({id:'one-pea',name:'PEA de test fictif',type:'PEA',owner:'la',currency:'EUR'});
const started=()=>{
 const p=W.blank(acct());p.openingDate='2026-11-01';p.openingCashCents=20000;p.openingCashConfirmed=true;
 p.positions=[{id:'line-a',name:'Titre fictif',symbol:'TEST',assetType:'Action',
  quantityMicro:E.quantity(2),costBasisCents:10000,isin:'',marketMic:'',strategy:{}}];
 p.catalog=p.positions.map(x=>({...x}));return p;
};
test('TRACE 2.0.1 uses existing investment account identity, no import or demo positions',()=>{
 const a=acct(),p=W.blank(a);
 assert.equal(p.id,a.id);
 assert.equal(p.schema,1);
 assert.equal(p.status,'draft');
 assert.equal(p.positions.length,0);
 assert.equal(p.operations.length,0);
 assert.equal(p.openingCashConfirmed,false);
 assert.equal(W.productionSummary(p).ready,false);
 assert.doesNotThrow(()=>E.evaluate(p));
 assert.equal(W.load({...a,investments201:p}).id,a.id);
 assert.deepEqual(W.load({...a,investments201:p}).positions,[]);
});
test('a confirmed broker baseline requires real prices, opening cash, and a matching valuation',()=>{
 let p=started();
 assert.throws(()=>W.reconcile(p,{date:'2026-11-06',value:'300',source:'Courtier'}),/Cours datés manquants/);
 p=E.setQuote(p,'line-a',{priceUnits:E.price('60'),date:'2026-11-05',source:'Relevé de test',kind:'manuel'});
 assert.throws(()=>W.reconcile(p,{date:'2026-11-06',value:'300',source:'Courtier'}),/Écart/);
 const verified=W.reconcile(p,{date:'2026-11-06',value:'320',source:'Courtier fictif'});
 assert.equal(verified.status,'verified');
 assert.equal(verified.brokerVerification.statementValueCents,32000);
 assert.equal(verified.brokerVerification.source,'Courtier fictif');
 const summary=W.productionSummary(verified);
 assert.equal(summary.ready,true);
 assert.equal(summary.value,320);
 assert.equal(summary.cash,200);
 assert.equal(summary.securities,120);
 assert.equal(summary.positions.length,1);
 assert.equal(summary.positions[0].symbol,'TEST');
 assert.equal(summary.positions[0].quantity,2);
 assert.equal(summary.positions[0].value,120);
 assert.equal(verified.snapshots.length,1);
 assert.equal(verified.snapshots[0].source,'Rapprochement : Courtier fictif');
 assert.equal(p.status,'draft');
 assert.equal(p.snapshots.length,0);
});
test('unverified or mismatched account data never silently becomes live Patrimoine value',()=>{
 const a=acct(),p=started();
 assert.equal(W.productionSummary(p).ready,false);
 assert.throws(()=>W.load({...a,investments201:{...p,id:'different'}}),/non compatible/);
 assert.throws(()=>W.load({...a,investments201:{...p,currency:'CAD'}}),/non compatible/);
 const invalid={...p,status:'verified',brokerVerification:{date:'bad'}};
 assert.throws(()=>W.productionSummary(invalid),/Rapprochement incomplet/);
});
test('same journal engine can reject overselling and insufficient cash without mutating an opening snapshot',()=>{
 const p=started(),initial=JSON.stringify(p);
 const buy={id:'op1',date:'2026-11-04',type:'buy',securityId:'line-a',
  quantityMicro:E.quantity(1),unitPriceUnits:E.price('30'),feeCents:100,amountCents:0};
 const trial=E.previewOperation(p,buy);
 assert.equal(trial.cashBeforeCents,20000);
 assert.equal(trial.cashAfterCents,16900);
 const next=E.appendOperation(p,buy);
 assert.equal(E.evaluate(next).positions[0].quantityMicro,E.quantity(3));
 const tooMany={...buy,id:'op2',type:'sell',quantityMicro:E.quantity(4)};
 assert.throws(()=>E.appendOperation(next,tooMany),/Vente supérieure/);
 assert.equal(JSON.stringify(p),initial);
});
test('version, assets, original wealth sections, live host bridge and conservative release scope',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const main=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const version=JSON.parse(fs.readFileSync(path.join(root,'trace-version.json'),'utf8'));
 assert.equal(version.build,'5.37.1');
 assert.match(version.release,/2\.0\.1/);
 assert.match(main,/window\.__TRACE_BUILD__='5\.37\.1'/);
 assert.match(html,/id="trace201Entry"/);
 assert.match(html,/trace-wealth-201-engine\.js\?v=2\.0\.1/);
 assert.match(html,/trace-wealth-201\.js\?v=2\.0\.1/);
 assert.match(html,/trace-wealth-201\.css\?v=2\.0\.1/);
 assert.match(main,/window\.Trace201Host=Object\.freeze/);
 assert.match(main,/traceStrictWriteSnapshot\(portfolio\)/);
 assert.match(main,/await saveDocument\('investment_accounts',next\)/);
 assert.match(main,/const ops=state\.investmentOperations\.filter\(o=>o\.accountId===account\.id/);
 assert.doesNotMatch(main,/if\(account\.investments201\?\.schema===1&&account\.investments201\.status==='verified'\)/);
 assert.match(main,/function portfolioLedger\(account,override=null,removeId=null,cutoff=null\)/);
 for(const id of ['wealthTotal','wealthSavingsGrid','wealthInvestmentsGrid','assetGrid','wealthTrend'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const page of ['home','budget','activity','wealth'])
  assert.match(html,new RegExp('data-page="'+page+'"'));
 assert.match(html,/data-nav="wealth"/);
 assert.doesNotMatch(html,/src="experiments\/wealth-investments-lab/);
 const js=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 assert.doesNotMatch(js,/createClient\(|\.rpc\(|\.from\(['"]transactions|localStorage|sessionStorage|window\.fetch\(/);
 assert.match(js,/n’aura|aucune position fictive|aucun achat fictif/i);
});


test('native TRACE 2.0.1 UI uses authenticated existing accounts, respects owner and does not preload sample holdings',()=>{
 const a=acct(),partner={id:'partner-reer',name:'REER fictif',type:'REER',owner:'partner',currency:'CAD'};
 let last='',lastTitle='';
 const rootEl={querySelectorAll(){return[];},querySelector(){return null;}};
 const prior=global.document;
 global.document={querySelector(sel){if(sel==='#w201-root')return rootEl;return null;}};
 try{
  W.connect({
   context(){return{active:true,viewer:'la',scope:'couple',accounts:[a,partner],operations:[]};},
   openSheet(t,h){lastTitle=t;last=h;},
   async save(){throw Error('No persistence during UI tests');}
  });
  W.open();
  assert.match(lastTitle,/Investissements/);
  assert.match(last,/PEA de test fictif/);
  assert.match(last,/REER fictif/);
  assert.doesNotMatch(last,/Dassault Systèmes|Air Liquide/);
  W.open(a.id);
  assert.match(last,/Aucune position initiale/);
  assert.match(last,/Position initiale/);
  W.open(partner.id);
  assert.match(last,/REER fictif/);
  assert.doesNotMatch(last,/data-w201="new-position"/);
  assert.doesNotMatch(last,/data-w201="new-operation"/);
 }finally{global.document=prior;}
});
test('portfolio edits and correction actions are structurally available but source-account writes are strictly scoped',()=>{
 const code=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 const main=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(code,/data-w201="edit-operation"|btn\('Corriger','edit-operation'/);
 assert.match(code,/E\.appendOperation\(p,op,old\?\.id\|\|null\)/);
 assert.match(code,/E\.previewOperation\(p,op,original\?\.id\|\|null\)/);
 assert.match(main,/account\.owner!==me/);
 assert.match(main,/traceWritesBlocked/);
 assert.match(main,/traceStrictWriteSnapshot\(portfolio\)/);
 assert.match(main,/await saveDocument\('investment_accounts',next\)/);
 assert.doesNotMatch(code,/\bSupabase\b.*createClient|localStorage\.setItem/);
});


test('dated broker-reported valuations yield true chart points, never fabricated market quotes',()=>{
 let p=started();
 p.snapshots=[
  {date:'2026-11-02',valueCents:30000,source:'Relevé du 02 novembre'},
  {date:'2026-11-04',valueCents:30100,source:'Relevé du 04 novembre'}
 ];
 assert.equal(E.chartSeries(p,'all').ready,true);
 assert.equal(E.chartSeries(p,'all').points[1].valueCents,30100);
 assert.equal(E.chartSeries(p,'all').points[1].source,'Relevé du 04 novembre');
 assert.equal(E.evaluate(p).valueCents,null);
 assert.equal(W.productionSummary(p).ready,false);
 const js=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 assert.match(js,/Relevé courtier :/);
 assert.match(js,/const snapshot=E\.snapshotAt|snapshot=E\.snapshotAt/);
 assert.match(js,/lineChart\(ts\.points,p\.currency,chartMode\)/);
 assert.match(js,/Ce n’est pas un rendement TWR|pas un rendement TWR/);
});
test('TRACE 2.0.1 does not modify legacy 5.37 portfolioLedger, savingsLedger or global net logic',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const oldLedger=app.slice(app.indexOf('function portfolioLedger('),app.indexOf('const nativeMoney='));
 assert.doesNotMatch(oldLedger,/investments201/);
 const oldSavings=app.slice(app.indexOf('function savingsLedger('),app.indexOf('function portfolioLedger('));
 assert.doesNotMatch(oldSavings,/investments201/);
 const oldNet=app.slice(app.indexOf('function renderWealth('),app.indexOf('function renderAll('));
 assert.match(oldNet,/bankCAD\+investments/);
 assert.match(oldNet,/const investments=ports\.reduce/);
 assert.doesNotMatch(oldNet,/addPortfolioValue|trace201Total|snapshotTotalCents/);
 assert.match(app,/if\(account\?\.investments201\?\.schema===1/);
});

test('allocation breakdown is exact, excludes cash, and refuses missing active prices',()=>{
 let p=started();
 p.positions[0].symbol='TEST';p.positions[0].sector='Technologie';p.positions[0].geography='Europe';
 p.positions.push({id:'line-b',name:'Fonds fictif',symbol:'ETF',assetType:'ETF',
  sector:'Diversifié',geography:'Monde',quantityMicro:E.quantity(2),costBasisCents:30000});
 p.catalog=p.positions.map(x=>({...x}));
 p=E.setQuote(p,'line-a',{priceUnits:E.price('50'),date:'2026-11-05',source:'Relevé contrôlé',kind:'manuel'});
 const missing=E.allocationBreakdown(p);
 assert.equal(missing.ready,false);
 assert.equal(missing.missing,1);
 assert.match(missing.reason,/Cours manquants/);
 p=E.setQuote(p,'line-b',{priceUnits:E.price('150'),date:'2026-11-05',source:'Relevé contrôlé',kind:'manuel'});
 const a=E.allocationBreakdown(p);
 assert.equal(a.ready,true);
 assert.equal(a.currency,'EUR');
 assert.equal(a.totalCents,40000);
 assert.equal(a.positions.length,2);
 assert.equal(a.types.length,2);
 assert.equal(a.types[0].label,'ETF');
 assert.equal(a.types[0].percentage,75);
 assert.equal(a.types[1].percentage,25);
 assert.equal(a.sectors.find(x=>x.label==='Technologie').valueCents,10000);
 assert.equal(a.geographies.find(x=>x.label==='Monde').valueCents,30000);
 assert.equal(a.types.reduce((sum,x)=>sum+x.valueCents,0),a.totalCents);
 assert.equal(E.evaluate(p).cashCents,20000);
});

test('dated period performance removes external flows and is explicit about its approximation',()=>{
 let p=started();
 p.snapshots=[
  {date:'2026-11-01',valueCents:30000,source:'Courtier : ouverture'},
  {date:'2026-11-11',valueCents:33000,source:'Courtier : contrôle'}
 ];
 p.operations=[{id:'cash-1',date:'2026-11-06',type:'deposit',amountCents:2000,feeCents:0}];
 const perf=E.periodPerformance(p,'all');
 assert.equal(perf.from,'2026-11-01');
 assert.equal(perf.to,'2026-11-11');
 assert.equal(perf.gainCents,1000);
 assert.ok(Math.abs(perf.percent-(1000/31000*100))<1e-9);
 assert.match(perf.method,/Dietz modifiée/);
 assert.equal(E.chartSeries(p,'all').points.at(-1).flowAdjustedCents,31000);
 assert.equal(E.periodPerformance({...p,snapshots:p.snapshots.slice(0,1)},'all'),null);
});

test('analytics are limited to investment module and surface missing evidence rather than fake values',()=>{
 const ui=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'trace-wealth-201.css'),'utf8');
 assert.match(ui,/periodPerformance\(p,chartPeriod\)/);
 assert.match(ui,/allocationBreakdown\(p\)/);
 assert.match(ui,/\['1','1M'\].*\['3','3M'\].*\['6','6M'\].*\['12','1A'\].*\['all','Tout'\]/);
 assert.match(ui,/aucune pondération fictive|Aucune pondération fictive/);
 assert.match(ui,/Dietz modifiée/);
 assert.match(css,/\.w201-periods/);
 assert.match(css,/\.w201-bar-track/);
 assert.doesNotMatch(css,/(^|\n)\s*(?:body|:root|\.home|\.budget|\.activity)\s*\{/m);
});

test('standalone iPhone prototype is disconnected from real financial storage',()=>{
 const preview=fs.readFileSync(path.join(root,'experiments/trace-201-analytics-demo.html'),'utf8');
 const ui=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 assert.match(preview,/E\.demo\(\)/);
 assert.match(preview,/Mode démonstration : aucune écriture ou sauvegarde autorisée/);
 assert.match(preview,/Les cours et relevés du portefeuille/);
 assert.doesNotMatch(preview,/createClient\(|trace_cas_save_document|config\.js|\.from\(['"]documents/);
 assert.match(ui,/s\.unrealizedCents\/s\.costBasisCents\*100/);
 assert.match(ui,/x\.unrealizedCents\/x\.costBasisCents\*100/);
});
