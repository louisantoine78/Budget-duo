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
 assert.equal(version.build,'5.37.8');
 assert.ok(version.release.includes('2.0.2'));
 assert.ok(main.includes("window.__TRACE_BUILD__='5.37.8'"));
 assert.match(html,/id="trace201Entry"/);
 assert.ok(html.includes('trace-wealth-201-engine.js?v=2.0.2'));
 assert.ok(html.includes('trace-wealth-201.js?v=2.0.2'));
 assert.ok(html.includes('trace-wealth-201.css?v=2.0.2'));
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
  {date:'2026-11-07',valueCents:33000,source:'Courtier : contrôle'}
 ];
 p.operations=[{id:'cash-1',date:'2026-11-04',type:'deposit',amountCents:2000,feeCents:0}];
 const perf=E.periodPerformance(p,'all');
 assert.equal(perf.from,'2026-11-01');
 assert.equal(perf.to,'2026-11-07');
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
 assert.match(preview,/Données et cotations fictives/);
 assert.match(preview,/date:'2026-01-10',valueCents:E\.cents\('2200'\)/);
 assert.doesNotMatch(preview,/createClient\(|trace_cas_save_document|config\.js|\.from\(['"]documents/);
 assert.match(ui,/s\.unrealizedCents\/s\.costBasisCents\*100/);
 assert.match(ui,/x\.unrealizedCents\/x\.costBasisCents\*100/);
});

test('Patrimoine investment summary is scoped, broker-neutral, and leaves linked CELIs in Épargne',()=>{
 const pea={...acct(),name:'Mon PEA · courtier libre',investments201:started()};
 const reer={id:'retirement',name:'REER local',type:'REER',owner:'partner',currency:'CAD'};
 const celi={id:'savings-celi',name:'CELI épargne',type:'CELI',owner:'la',currency:'CAD',
  savingsTracking:'linked'};
 let view={active:true,viewer:'la',scope:'mine',accounts:[pea,celi],operations:[]};
 W.connect({
  context(){return view;},
  openSheet(){},
  async save(){throw Error('No writes in summary test');}
 });
 const personal=W.dashboardSummary();
 assert.equal(personal.portfolios,1);
 assert.equal(personal.positions,1);
 assert.equal(personal.initialized,1);
 assert.equal(personal.verified,0);
 assert.equal(personal.toReview,1);
 assert.equal(personal.savings,1);
 view={...view,scope:'couple',accounts:[pea,celi,reer]};
 const household=W.dashboardSummary();
 assert.equal(household.portfolios,2);
 assert.equal(household.positions,1);
 assert.equal(household.savings,1);
 assert.equal(household.verified,0);
 view={...view,operations:[{id:'old-op',accountId:pea.id,status:'confirmed'}]};
 const legacy=W.dashboardSummary();
 assert.equal(legacy.legacy,1);
 assert.equal(legacy.positions,0);
 assert.equal(legacy.toReview,2);
 assert.equal(JSON.stringify(pea.investments201),JSON.stringify(started()));
});

test('new in-place Patrimoine summary never enters bank or portfolio total calculations',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'trace-wealth-201.css'),'utf8');
 assert.match(html,/<section class="trace-wealth-section" id="traceWealthInvestments" aria-label="Investissements"/);
 assert.match(html,/id="trace201WealthSummary"/);
 assert.match(html,/id="wealthInvestmentsGrid"/);
 assert.match(html,/id="trace201Entry"/);
 assert.match(css,/#trace201WealthSummary\.trace201-wealth-summary/);
 const net=app.slice(app.indexOf('function renderWealth('),app.indexOf('function renderAll('));
 assert.match(net,/window\.TraceWealth201\?\.dashboardSummary\?\.\(\)/);
 assert.match(net,/investmentSummaryNode\.innerHTML/);
 assert.match(net,/const investments=ports\.reduce/);
 assert.match(net,/total=bankCAD\+investments/);
 const totalCalculation=net.slice(0,net.indexOf('const savings=ports.filter('));
 const amountArithmetic=totalCalculation.slice(totalCalculation.indexOf('const investments=ports.reduce'));
 assert.ok(amountArithmetic.length>0);
 assert.doesNotMatch(amountArithmetic,/investments201|\bE\.evaluate\(/);
 // A captured broker balance may block an incomplete total; it must NEVER
 // contribute its unverified amount to the actual CAD calculation.
 assert.ok(totalCalculation.includes('x.p.netReady!==true'));
 assert.ok(app.includes('function trace202PortfolioForNet(a)'));
 assert.ok(app.includes('window.TraceWealth201?.netWorthBridge?.(a,legacyExists)'));
 for(const page of ['home','budget','activity'])assert.match(html,new RegExp('data-page="'+page+'"'));
});

test('dated FX conversion uses fixed-point cents and refuses stale, future or unsourced rates',()=>{
 const quote={cadPerUnit:1.5732,date:'2026-11-06',source:'Banque du Canada · Valet'};
 const eur=E.cadValue(32000,'EUR',quote,'2026-11-07');
 assert.equal(eur.ready,true);
 assert.equal(eur.valueCents,50342);
 assert.equal(eur.rate,'1.5732');
 assert.equal(eur.date,'2026-11-06');
 assert.equal(eur.source,quote.source);
 assert.equal(E.cadValue(32000,'CAD',null,'2026-11-07').valueCents,32000);
 assert.equal(E.cadValue(32000,'EUR',null,'2026-11-07').ready,false);
 assert.equal(E.cadValue(32000,'EUR',{...quote,source:''},'2026-11-07').ready,false);
 assert.equal(E.cadValue(32000,'EUR',{...quote,date:'2026-10-31'},'2026-11-07').ready,true);
 assert.equal(E.cadValue(32000,'EUR',{...quote,date:'2026-10-30'},'2026-11-07').ready,false);
 assert.equal(E.cadValue(32000,'EUR',{...quote,date:'2026-11-08'},'2026-11-07').ready,false);
 assert.equal(E.cadValue(32000,'EUR',{...quote,cadPerUnit:0},'2026-11-07').ready,false);
 assert.equal(E.cadValue(32000,'EUR',{...quote,cadPerUnit:Infinity},'2026-11-07').ready,false);
 assert.equal(E.cadValue(Number.MAX_SAFE_INTEGER,'EUR',{...quote,cadPerUnit:99999},'2026-11-07').ready,false);
 assert.equal(E.cadValue(1,'EUR',{...quote,cadPerUnit:'1.005'},'2026-11-07').valueCents,1);
 assert.throws(()=>E.cadValue(-1,'EUR',quote,'2026-11-07'),/invalide/);
 assert.throws(()=>E.cadValue(100,'EUR',quote,'2026-11-32'),/Date/);
});

test('multi-portfolio view requires broker validation and a dated CAD quote to show a complete total',()=>{
 const a=acct();
 let p=started();
 p=E.setQuote(p,'line-a',{priceUnits:E.price('60'),date:'2026-11-05',source:'Relevé fictif',kind:'manuel'});
 p=W.reconcile(p,{date:'2026-11-06',value:'320',source:'Courtier fictif'});
 const day=new Date().toISOString().slice(0,10);
 const account={...a,investments201:p,fxCadPerUnit:1.5732,
  fxRateDate:day,fxRateProvider:'Banque du Canada · Valet'};
 let env={active:true,viewer:'la',scope:'mine',accounts:[account],operations:[]};
 W.connect({context(){return env;},openSheet(){},async save(){throw Error('No writes');}});
 const ok=W.portfolioOverview();
 assert.equal(ok.complete,true);
 assert.equal(ok.totalCadCents,50342);
 assert.equal(ok.records[0].nativeCents,32000);
 assert.equal(ok.records[0].verified,true);
 assert.equal(ok.records[0].status,'Rapproché');
 assert.equal(ok.records[0].fx.source,'Banque du Canada · Valet');
 const without={...account,id:'another',name:'Autre PEA',investments201:undefined};
 env={...env,accounts:[account,without]};
 const incomplete=W.portfolioOverview();
 assert.equal(incomplete.complete,false);
 assert.equal(incomplete.totalCadCents,null);
 assert.equal(incomplete.missing,1);
 env={...env,accounts:[{...account,fxRateProvider:null}]};
 const noSource=W.portfolioOverview();
 assert.equal(noSource.complete,false);
 assert.equal(noSource.records[0].status,'Taux à vérifier');
 assert.equal(noSource.totalCadCents,null);
});

test('multicurrency UI preserves account-only gains and does not create a global percentage',()=>{
 const js=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'trace-wealth-201.css'),'utf8');
 const legacy=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(js,/portfolioOverview\(\)/);
 assert.match(js,/E\.cadValue\(value,p\.currency,p\.currency==='CAD'\?null/);
 assert.match(js,/Une performance commune en %/);
 assert.match(js,/Aucune position fictive n’est importée/);
 assert.match(js,/const legacy=isLegacy\(a\)/);
 assert.match(css,/\.w201-overview/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|createClient\(|window\.fetch\(/);
 const oldNet=legacy.slice(legacy.indexOf('function renderWealth('),legacy.indexOf('function renderAll('));
 assert.match(oldNet,/const investments=ports\.reduce/);
 assert.match(oldNet,/total=bankCAD\+investments/);
});


test('TRACE 2.0.2 opens uninitialized portfolios directly but protects legacy journals and savings',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const entry=app.slice(app.indexOf('function openInvestmentAccount(account)'),app.indexOf('function editInvestmentRate('));
 assert.ok(entry.includes('!state.investmentOperations.some(o=>o.accountId===account.id)'));
 assert.ok(entry.includes("!['CELI','Épargne','Livret','Savings'].includes(account.type)"));
 assert.ok(entry.includes('window.TraceWealth201.open(account.id);return;'));
 assert.ok(!entry.includes('window.TraceWealth201.save('));
});

test('TRACE 2.0.2 displays a read-only Patrimoine gateway without inventing missing holdings',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'trace-wealth-201.css'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const wealth=app.slice(app.indexOf('function renderWealth(){'),app.indexOf('window.Trace201Host=Object.freeze('));
 for(const needle of [
  'const needsSetup=!isSavings&&!a.investments201&&',
  "needsSetup?'À initialiser'",
  'Renseigner les positions et les espèces',
  'window.TraceWealth201?.dashboardSummary?.()',
  'window.TraceWealth201?.portfolioOverview?.()',
  'valuation?.complete===true&&valuation.totalCadCents!==null',
  'trace204-invest-overview',
  'trace204-invest-state',
  'quickCount(\'wealthQuickInvestments\',placements.length)',
  'quickCount(\'wealthQuickSavings\',savings.length)',
  'quickCount(\'wealthQuickCash\',banks.length)',
  'const investments=ports.reduce',
  'total=bankCAD+investments'
 ])assert.ok(wealth.includes(needle),'Missing read-only Patrimoine guard: '+needle);
 assert.ok(app.includes("button.matches('#trace201Entry,#trace202Explore')"));
 assert.ok(app.includes('trace202BindWealthActions();'));
 assert.ok(index.includes('id="trace201WealthSummary"'));
 assert.ok(css.includes('.trace202-wealth-panel'));
 assert.ok(css.includes('@media(max-width:370px)'));
 for(const forbidden of ['saveDocument(','removeDocument(','createClient(']){
  assert.ok(!wealth.includes(forbidden),'Unexpected mutation in overview: '+forbidden);
 }
});

test('TRACE 2.0.2 release stamp, runtime and investment assets remain aligned',()=>{
 const version=JSON.parse(fs.readFileSync(path.join(root,'trace-version.json'),'utf8'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 assert.equal(version.build,'5.37.8');
 assert.ok(version.release.startsWith('TRACE 2.0.2'));
 assert.ok(app.includes("window.__TRACE_BUILD__='5.37.8';window.__TRACE_PUBLIC_RELEASE__='2.0.2';"));
 assert.ok(html.includes('<meta name="trace-build" content="5.37.8">'));
 for(const asset of ['trace-wealth-201.css','trace-wealth-201-engine.js','trace-wealth-201.js']){
  assert.ok(html.includes(asset+'?v='+(asset==='trace-wealth-201.js'?'2.0.2.2':asset==='trace-wealth-201.css'?'2.0.2.4':'2.0.2')),'Missing cache-bust: '+asset);
 }
 assert.ok(html.includes('v5-app-5.37.0.js?v=5.37.8'));
 assert.ok(ui.includes("host.openSheet('Investissements · TRACE 2.0.2'"));
});


test('TRACE 2.0.2 iPhone hotfix delegates dynamic investment clicks safely without financial writes',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const from=app.indexOf('function trace202OpenTracking(');
 const to=app.lastIndexOf('\n})();');
 assert.ok(from>0&&to>from,'Actual delegated click functions must exist');
 const source=app.slice(from,to);
 const attached={},opened=[],errors=[],notices=[];
 const page={dataset:{},contains(){return true;},addEventListener(name,fn){
  assert.equal(name,'click');
  assert.equal(attached.click,undefined,'one listener, not one listener per redraw');
  attached.click=fn;
 }};
 const state={investmentAccounts:[
  {id:'pea',name:'PEA courtier indépendant',type:'PEA',owner:'la'},
  {id:'celi',name:'CELI épargne',type:'CELI',savingsTracking:'linked',owner:'la'},
  {id:'historical',name:'PEA historique',type:'PEA',owner:'la'}
 ],investmentOperations:[{accountId:'historical',id:'old-op'}]};
 const window={TraceWealth201:{open:id=>opened.push(['tracking',id])},alert:msg=>notices.push(msg)};
 const context={
  document:{querySelector:selector=>selector==='.page[data-page="wealth"]'?page:null},
  window,state,
  openSheet:(title)=>opened.push(['sheet',title]),
  openInvestmentAccountAdd:()=>opened.push(['add']),
  openAccountSettings:()=>opened.push(['settings']),
  openInvestmentAccount:account=>opened.push(['legacy',account.id]),
  console:{error:(...args)=>errors.push(args.map(String).join(' '))}
 };
 const api=new Function(...Object.keys(context),source+
  '\nreturn {trace202OpenTracking,trace202BindWealthActions};')(...Object.values(context));
 api.trace202BindWealthActions();
 api.trace202BindWealthActions();
 assert.equal(typeof attached.click,'function');
 const tap=(selector,dataset={})=>{
  const button={dataset,matches:list=>list.split(',').includes(selector)};
  attached.click({target:{closest:()=>button}});
 };
 tap('#trace201Entry');
 tap('#trace202Explore');
 tap('[data-inv-account]',{invAccount:'pea'});
 tap('[data-inv-account]',{invAccount:'celi'});
 tap('[data-inv-account]',{invAccount:'historical'});
 tap('#wealthAddCard');
 tap('#wealthLiquidityCard');
 tap('[data-foreign-bank]');
 assert.deepEqual(opened,[
  ['tracking',''],['tracking',''],['tracking','pea'],
  ['legacy','celi'],['legacy','historical'],['add'],['settings'],['settings']
 ]);
 // Replacement button nodes still route through the same page listener.
 tap('[data-inv-account]',{invAccount:'pea'});
 assert.deepEqual(opened.at(-1),['tracking','pea']);
 // Invalid tracking module reports failure rather than a no-op.
 window.TraceWealth201.open=()=>{throw Error('Open failed');};
 tap('#trace202Explore');
 assert.equal(opened.at(-1)[0],'sheet');
 assert.ok(notices.length===0);
 assert.ok(errors.some(x=>x.includes('Open failed')));
 assert.ok(!source.includes('saveDocument('));
 assert.ok(!source.includes('removeDocument('));
});


test('CSP-safe production bridge connects real investment module without inline execution',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'trace-wealth-201.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
 assert.doesNotMatch(html,/script-src[^;"]*'unsafe-inline'/);
 assert.ok(html.includes('trace-wealth-201.js?v=2.0.2.2'));
 assert.ok(!html.includes('window.TraceWealth201?.connect(window.Trace201Host)'));
 assert.ok(js.includes('if(root.Trace201Host)api.connect(root.Trace201Host);'));
 assert.ok(app.includes('window.Trace201Host=Object.freeze({'));
 assert.ok(html.indexOf('src="v5-app-5.37.0.js?v=5.37.8"')<
   html.indexOf('src="trace-wealth-201.js?v=2.0.2.2"'));
 assert.ok(!js.includes('createClient('));
 assert.ok(!js.includes('localStorage'));
});

test('Patrimoine 2.0.2 premium reorganisation preserves counts, grouping and trusted totals',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'trace-wealth-201.css'),'utf8');
 const i=html.indexOf('id="traceWealthInvestments"');
 const s=html.indexOf('id="traceWealthSavings"');
 const c=html.indexOf('id="traceWealthCash"');
 const nav=html.indexOf('class="trace203-wealth-nav"');
 const total=html.indexOf('id="wealthTotal"');
 assert.ok(total>=0&&nav>total&&i>nav&&s>i&&c>s,
  'Estimated net value, shortcut navigation, Investments, Savings, Treasury must stay in that order');
 for(const id of ['traceWealthInvestments','traceWealthSavings','traceWealthCash']){
  assert.match(html,new RegExp('data-wealth-jump="'+id+'"'));
  assert.match(html,new RegExp('id="'+id+'" aria-label='));
 }
 for(const id of ['wealthSavingsGrid','wealthInvestmentsGrid','assetGrid','wealthTrend','wealthAnalysis','addAsset','trace201Entry']){
  assert.ok(html.includes('id="'+id+'"'),'Existing functionality was removed: '+id);
 }
 const wealth=app.slice(app.indexOf('function renderWealth(){'),app.indexOf('window.Trace201Host=Object.freeze('));
 assert.ok(wealth.includes('const investments=ports.reduce'));
 assert.ok(wealth.includes('total=bankCAD+investments'));
 assert.ok(wealth.includes('valuation?.complete===true&&valuation.totalCadCents!==null'));
 assert.ok(wealth.includes("'À vérifier'"));
 assert.ok(!wealth.includes('id="trace202Explore"'),'Repeated full width button should not be presented');
 assert.ok(!wealth.includes('trace203-wealth-compact'),'Repeated summary panel should not be rendered');
 assert.ok(html.includes('id="wealthNetState"'));
 assert.ok(html.includes('id="wealthReviewAction"'));
 assert.ok(wealth.includes('reviewAction.hidden=netComplete'));
 assert.ok(wealth.includes("$('#wealthTotal').textContent=netComplete?money(total):'—'"));
 assert.ok(css.includes('.trace204-invest-overview'));
 assert.ok(app.includes("button.matches('[data-wealth-jump]')"));
 assert.ok(css.includes('.trace203-wealth-nav'));
 assert.ok(css.includes('scroll-margin-top:'));
 for(const dangerous of ['saveDocument(','removeDocument(','createClient(']){
  assert.ok(!wealth.includes(dangerous),'Read-only overview should not write finance data');
 }
});


test('TRACE 2.0.2 Patrimoine never shows an invented zero for imported broker holdings',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const wealth=app.slice(app.indexOf('function renderWealth('),app.indexOf('function renderAll('));
 assert.ok(app.includes('function trace202PortfolioForNet(a)'),
  'detailed unintegrated positions must block the legacy zero from net worth');
 const start=wealth.indexOf(' const tile=({a,p})=>{');
 const end=wealth.indexOf('\n };',start);
 assert.ok(start>=0&&end>start,'expected an isolated portfolio card renderer');
 const expression=wealth.slice(start+' const tile='.length,end+3).trim();
 const state={investmentOperations:[]};
 const nativeMoney=(n,c)=>c+':'+Number(n).toFixed(2);
 const money=n=>'CAD:'+Number(n).toFixed(2);
 const window={TraceWealth201:{productionSummary:()=>({ready:true,value:3819.25})}};
 const tile=Function('state','window','nativeMoney','money','esc',
  'return ('+expression+');')(state,window,nativeMoney,money,x=>String(x));
 const a={id:'pea',name:'PEA TEST',type:'PEA',currency:'EUR',investments201:{
  status:'draft',positions:[{id:'air'},{id:'cda'},{id:'sp'},{id:'dsy'}],
  brokerCapture:{date:'2026-11-08',currency:'EUR',
   securitiesCents:368096,cashCents:13829,totalCents:null,partial:true}
 }};
 const ledger={value:0,hasFx:true,netReady:false,fx:1.5732,fxDate:'2026-11-06'};
 const html=tile({a,p:ledger});
 assert.match(html,/EUR:3819\.25/,'sum of read-only broker securities and cash is visible');
 assert.match(html,/CAD:6008\./,'EUR/CAD reference is not a fabricated 0');
 assert.match(html,/Titres \+ espèces de la capture/);
 assert.match(html,/non rapprochée/);
 assert.doesNotMatch(html,/EUR:0\.00|CAD:0\.00/);
 const noCapture={...a,investments201:{...a.investments201,brokerCapture:null}};
 assert.match(tile({a:noCapture,p:ledger}),/À rapprocher/);
 assert.doesNotMatch(tile({a:noCapture,p:ledger}),/EUR:0\.00/);
 const verified={...a,investments201:{...a.investments201,status:'verified'}};
 assert.match(tile({a:verified,p:{...ledger,netReady:true}}),/EUR:3819\.25/);
 const withoutTracking={...a,investments201:null};
 assert.match(tile({a:withoutTracking,p:ledger}),/À initialiser/);
 assert.match(wealth,/portefeuille.*rapproché/);
});

test('verified new investment ledger contributes exactly once, while draft, FX and legacy conflicts fail closed',()=>{
 let p=started();
 p=E.setQuote(p,'line-a',{priceUnits:E.price('60'),date:'2026-11-05',
  source:'Relevé courtier fictif',kind:'manuel'});
 const verified=W.reconcile(p,{date:'2026-11-06',value:'320',source:'Relevé complet fictif'});
 const a={...acct(),investments201:verified,fxCadPerUnit:1.5732,
  fxRateDate:'2026-11-06',fxRateProvider:'Banque du Canada · Valet'};
 const net=W.netWorthBridge(a,false,'2026-11-08');
 assert.equal(net.ready,true);
 assert.equal(net.mode,'detailed');
 assert.equal(net.nativeCents,32000);
 assert.equal(net.cadCents,50342);
 assert.equal(net.fx,'1.5732');
 assert.equal(net.fxDate,'2026-11-06');
 assert.equal(W.netWorthBridge(a,true,'2026-11-08').ready,false,
  'new and legacy journals for the same account cannot be added twice');
 assert.equal(W.netWorthBridge({...a,investments201:null},false,'2026-11-08').mode,'legacy');
 const copy=JSON.stringify(a);
 const pending={...verified,status:'draft',brokerCapture:{totalCents:123456789,partial:true}};
 assert.equal(W.netWorthBridge({...a,investments201:pending},false,'2026-11-08').ready,false,
  'captured totals are evidence only, not net-worth values');
 assert.equal(W.netWorthBridge({...a,fxRateProvider:''},false,'2026-11-08').ready,false,
  'an unsourced FX rate must not be silently accepted');
 assert.equal(W.netWorthBridge({...a,fxRateDate:'2026-10-31'},false,'2026-11-08').ready,false,
  'a stale FX rate must block current net worth');
 assert.equal(W.netWorthBridge({...a,fxRateDate:'2026-11-09'},false,'2026-11-08').ready,false,
  'a future FX rate must block current net worth');
 const tampered={...verified,openingCashCents:verified.openingCashCents+100};
 assert.equal(W.netWorthBridge({...a,investments201:tampered},false,'2026-11-08').ready,false,
  'a stale verified flag must not survive a changed broker baseline');
 assert.equal(JSON.stringify(a),copy,'the net bridge must never mutate account data');
 // A dated, sourced CAD-equivalent value is consistently visible in summary.
 W.connect({context(){return{active:true,viewer:'la',scope:'mine',accounts:[a],operations:[]};},
  openSheet(){},async save(){throw Error('Read-only test');}});
 const overview=W.portfolioOverview();
 assert.equal(overview.verified,1);
 assert.equal(overview.totalCadCents,50342);
 assert.equal(overview.complete,true);
});

test('net-worth renderer and financial analysis use the same one-ledger bridge',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const bridge=app.slice(app.indexOf('function trace202PortfolioForNet('),
  app.indexOf('function renderWealth('));
 const view=app.slice(app.indexOf('function renderWealth('),
  app.indexOf('window.Trace201Host=Object.freeze('));
 const analysis=app.slice(app.indexOf('function openPortfolioAnalysis('),
  app.indexOf('function renderWealth('));
 assert.match(bridge,/const legacyExists=state\.investmentOperations\.some/);
 assert.match(bridge,/window\.TraceWealth201\?\.netWorthBridge\?\.\(a,legacyExists\)/);
 assert.match(bridge,/if\(!bridge\.ready\)return/);
 assert.match(bridge,/netReady:false/);
 assert.match(bridge,/netReady:true,detailedNet:true/);
 assert.match(view,/const ports=accounts\.map\(a=>\(\{a,p:trace202PortfolioForNet\(a\)\}\)\)/);
 assert.match(view,/const investments=ports\.reduce\(\(sum,x\)=>sum\+\(x\.p\.netReady\?x\.p\.cad:0\),0\)/);
 assert.match(analysis,/trace202PortfolioForNet\(a\)/);
 assert.match(app,/cad:p\.netReady\?p\.cad:null/);
 assert.match(app,/ready:p\.netReady===true/);
 for(const forbidden of ['saveDocument(', 'removeDocument(', 'createClient('])
  assert.ok(!bridge.includes(forbidden),'wealth bridge must not write persistent financial data');
});
