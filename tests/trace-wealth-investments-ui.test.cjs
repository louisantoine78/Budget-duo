'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../experiments/wealth-investments-lab');
const E=require(path.join(root,'engine.js'));
const window={TraceWealthLabEngine:E};
vm.runInNewContext(fs.readFileSync(path.join(root,'ui.js'),'utf8'),{window,Intl,Date,Number,String,console});
const U=window.TraceWealthLabUI;
const demo=E.demo(),p=demo.portfolios[0];
test('premium lab renders the eight exact demo positions without synthetic performance',()=>{
 const html=U.overview(demo),detail=U.portfolio(p);
 assert.match(html,/Investissements/);
 assert.match(html,/3.788,69/);
 assert.match(html,/Référence fournie/);
 assert.match(html,/cours/);
 assert.match(detail,/Dassault Systèmes/);
 assert.match(detail,/Sanofi/);
 assert.match(detail,/Liquidités/);
 assert.match(detail,/Prix de revient/);
 assert.match(detail,/Aucune opération saisie/);
 assert.ok(!detail.includes('19,708'));
});
test('position and analysis show honest missing quotes and never fake a graph',()=>{
 const info=U.position(p,'dsy'),analytics=U.analytics(p,'all');
 assert.match(info,/ISIN à renseigner/);
 assert.match(info,/Cours manquant/);
 assert.match(info,/Gains|Gain latent/);
 assert.match(analytics,/Deux valorisations réellement datées/);
 assert.doesNotMatch(analytics,/<svg class="wl-svg wl-mini-chart"/);
 assert.match(analytics,/Indice de référence/);
 assert.match(analytics,/Répartition géographique/);
});
test('multi-currency dashboard refuses to sum EUR and CAD without observed FX',()=>{
 const second={...p,id:'cad',name:'CELI Canada',currency:'CAD',openingCashCents:10000,
  positions:[],catalog:[],operations:[],quotes:{},snapshots:[],referenceValueCents:undefined};
 const html=U.overview({portfolios:[p,second]});
 assert.match(html,/Devises multiples/);
 assert.match(html,/Total à compléter/);
 assert.match(html,/CELI Canada/);
});
test('derived valuation and allocation become visible only after manual input',()=>{
 const quoted={...p,positions:p.positions.map(s=>({...s,sector:'Test',geography:'France',
  costBasisCents:E.tradeCents(s.quantityMicro,E.price('10'))})),
  quotes:Object.fromEntries(p.positions.map(s=>[s.id,{priceUnits:E.price('12'),
   date:'2026-11-04',source:'Saisie manuelle',kind:'manuel'}]))};
 const v=E.evaluate(quoted);
 assert.equal(v.priced,true);
 assert.equal(v.performanceComplete,true);
 assert.match(U.overview({portfolios:[quoted]}),/conic-gradient/);
 assert.match(U.analytics(quoted,'all'),/Test/);
 assert.match(U.analytics(quoted,'all'),/France/);
});
test('client-only page bootstraps Patrimoine navigation with no Supabase or live app',()=>{
 const callbacks={};
 const nodes={
  'wl-crumb':{innerHTML:''},
  'wl-main':{innerHTML:'',prepend(){}},
  'wl-close':{addEventListener(){}},
  'wl-dialog-title':{textContent:''},
  'wl-dialog-body':{innerHTML:''},
  'wl-dialog':{opened:false,addEventListener(){},showModal(){this.opened=true}}
 };
 const doc={
  getElementById:id=>nodes[id]||null,
  addEventListener:(n,fn)=>{callbacks[n]=fn},
  createElement:()=>({textContent:'',className:''})
 };
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const screen={TraceWealthLabEngine:E,TraceWealthLabUI:U,scrollTo(){}};
 vm.runInNewContext(js,{window:screen,document:doc,Intl,Date,console,URLSearchParams});
 assert.match(nodes['wl-main'].innerHTML,/Investissements/);
 const click=(act,id)=>callbacks.click({target:{closest:()=>({dataset:{act,id}})}});
 click('portfolio','pea-demo');
 assert.match(nodes['wl-main'].innerHTML,/Journal|Historique des opérations/);
 click('position','dsy');
 assert.match(nodes['wl-main'].innerHTML,/PRU moyen/);
 click('analytics','');
 assert.match(nodes['wl-main'].innerHTML,/Indice de référence/);
 assert.match(nodes['wl-main'].innerHTML,/Relevés &amp; sources/);
 click('viewSnapshot','2026-11-04');
 assert.equal(nodes['wl-dialog'].opened,true);
 assert.match(nodes['wl-dialog-body'].innerHTML,/3.788,69/);
 assert.match(nodes['wl-dialog-body'].innerHTML,/Valeur totale fournie/);
 assert.match(nodes['wl-dialog-body'].innerHTML,/ne prouve pas les cours individuels/);
});


test('mobile portfolio suggests one-tap completion of missing quote and opening PRU',()=>{
 const html=U.portfolio(p);
 assert.match(html,/Compléter les données/);
 assert.match(html,/Cours enregistrés/);
 assert.match(html,/Prix de revient/);
 assert.match(html,/0 \/ 8/);
 assert.match(html,/data-act="quote" data-id="dsy"/);
 assert.match(html,/data-act="opening" data-id="dsy"/);
});
test('quote-backed valuation unlocks only facts supported by the entered prices',()=>{
 const known={...p,positions:p.positions.map(s=>({...s,
  costBasisCents:E.tradeCents(s.quantityMicro,E.price('10'))})),
  quotes:Object.fromEntries(p.positions.map(s=>[s.id,{
   priceUnits:E.price('12'),date:'2026-11-05',kind:'manuel',source:'Saisie utilisateur'
  }]))};
 const html=U.portfolio(known);
 assert.match(html,/Positions renseignées/);
 assert.doesNotMatch(html,/Renseigner un cours/);
 assert.match(U.position(known,'dsy'),/Place de cotation à renseigner/);
 assert.match(U.analytics(known,'all'),/Actions, ETF et autres/);
});

test('contextual buy/sell and simplified glance are available directly in a position',()=>{
 const screen=U.position(p,'dsy'),list=U.portfolio(p),home=U.overview(demo);
 assert.match(screen,/data-act="quickBuy" data-id="dsy"/);
 assert.match(screen,/data-act="quickSell" data-id="dsy"/);
 assert.match(screen,/Saisir un cours/);
 assert.match(screen,/Modifier la fiche/);
 assert.match(list,/data-act="positionFilter" data-id="all"/);
 assert.match(list,/data-act="positionFilter" data-id="Action"/);
 assert.match(list,/data-act="positionFilter" data-id="ETF"/);
 assert.match(list,/Actions <b>6<\/b>/);
 assert.match(list,/ETF <b>2<\/b>/);
 assert.match(list,/Cours à compléter/);
 assert.match(home,/Analyses/);
 assert.doesNotMatch(home,/Vue rapide/);
 assert.doesNotMatch(list,/<h2>Gains latents<\/h2>/);
});
test('transaction form includes segmented operation types and non-mutating financial preview',()=>{
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(js,/data-op-kind/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/function operationPreview/);
 assert.match(js,/previewOperation\(current\(\),op/);
 assert.match(js,/data-act="quickBuy"|a==='quickBuy'/);
 assert.match(js,/Simulation locale uniquement/);
 assert.match(css,/\.wl-op-kinds/);
 assert.match(css,/\.wl-op-preview/);
});

test('position filters show the correct securities without losing underlying portfolio data',()=>{
 const etf=U.portfolio(p,'ETF'),shares=U.portfolio(p,'Action');
 assert.match(etf,/Amundi PEA S&amp;P 500/);
 assert.match(etf,/BNP STOXX Europe 600/);
 assert.doesNotMatch(etf,/Dassault Systèmes/);
 assert.doesNotMatch(etf,/TUI AG/);
 assert.match(shares,/Dassault Systèmes/);
 assert.match(shares,/Sanofi/);
 assert.doesNotMatch(shares,/Amundi PEA S&amp;P 500/);
 assert.match(etf,/aria-pressed="true">ETF/);
 assert.equal(E.evaluate(p).positions.length,8);
});

test('interactive chart switches evidence-backed total and net-external-flow series',()=>{
 const scenario={...p,operations:[
  {id:'contrib',type:'deposit',date:'2026-11-10',amountCents:10000,feeCents:0}
 ],snapshots:[
  {date:'2026-11-04',valueCents:378869,source:'Valeur de référence fournie'},
  {date:'2026-11-12',valueCents:396869,source:'Relevé manuscrit'}
 ]};
 const total=U.analytics(scenario,'all','value','2026-11-12');
 const adjusted=U.analytics(scenario,'all','flows','2026-11-12');
 assert.match(total,/396.869|3.968,69/);
 assert.match(total,/data-act="trendPoint"/);
 assert.match(total,/data-act="trendMetric" data-id="flows"/);
 assert.match(total,/aria-pressed="true">Valeur totale/);
 assert.match(adjusted,/aria-pressed="true">Hors apports/);
 assert.match(adjusted,/3.868,69/);
 assert.match(adjusted,/Ce n’est pas un indice de rendement/);
 assert.match(adjusted,/Relevé manuscrit/);
 assert.match(adjusted,/wl-trend-chart/);
});
test('single-point history never draws fabricated performance nor emits synthetic dates',()=>{
 const html=U.interactiveTrend(p,'all','flows','');
 assert.match(html,/Deux valorisations réellement datées/);
 assert.doesNotMatch(html,/<svg/);
 assert.doesNotMatch(html,/data-act="trendPoint"/);
});
test('chart controls use the same persisted-in-memory state as analysis navigation',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/chartMetric='value'/);
 assert.match(app,/a==='trendMetric'/);
 assert.match(app,/a==='trendPoint'/);
 assert.match(app,/U.analytics\(p,range,chartMetric,chartFocus\)/);
});

test('four-decimal stock and ETF quotes remain visible without rounding to cents',()=>{
 const native=U.fmtPrice(E.price('19.7085'),'EUR');
 assert.match(native,/19,7085/);
 const basis=U.fmtPrice(E.price('1.1234'),'EUR');
 assert.match(basis,/1,1234/);
 const userQuote={...p,quotes:{dsy:{priceUnits:E.price('19.7085'),date:'2026-11-05',source:'Manuel',kind:'manuel'}}};
 assert.match(U.position(userQuote,'dsy'),/19,7085/);
});


const integration=require(path.join(root,'integration-contract.js'));
test('integration host preserves all actual Patrimoine sections and does not load production financial code',()=>{
 const html=fs.readFileSync(path.join(root,'patrimoine-host.html'),'utf8');
 const embedded=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(html,/data-page="wealth"/);
 for(const id of ['wealthTotal','wealthSavingsGrid','wealthInvestmentsGrid','assetGrid','wealthTrend'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const label of ['Épargne','Placements','Trésorerie et comptes','Comprendre mon patrimoine'])
  assert.ok(html.includes(label));
 assert.match(html,/src="\.\/integration-contract\.js"/);
 assert.match(html,/src="\.\/wealth-host\.js"/);
 assert.doesNotMatch(html,/<iframe\b/i);
 assert.match(html,/id="wl-native-root"/);
 assert.match(html,/id="wlNativeScroll"/);
 assert.match(html,/id="wl-crumb"/);
 assert.match(html,/id="wl-main"/);
 assert.match(html,/id="wl-dialog"/);
 assert.match(html,/src="\.\/ui\.js"/);
 assert.match(html,/src="\.\/app\.js"/);
 assert.match(html,/data-scenario="pea"/);
 assert.match(html,/data-scenario="existing"/);
 assert.match(embedded,/get\("embedded"\)==="1"/);
 assert.match(css,/\.wl-embedded \.wl-bottom/);
 assert.ok(!/src="[^"]*(?:config\.js|v5-app-5\.37\.0\.js|supabase)/i.test(html));
 assert.ok(!/\bfetch\s*\(|\blocalStorage\s*\.|\bsessionStorage\s*\./i.test(
  fs.readFileSync(path.join(root,'wealth-host.js'),'utf8')+
  fs.readFileSync(path.join(root,'integration-contract.js'),'utf8')));
});
test('Patrimoine mount is opt-in, idempotent, and can only append one link to Placements header',()=>{
 let clicks=0;
 const children=[],head={appendChild(node){children.push(node);node.parentNode=this;},
  removeChild(node){const i=children.indexOf(node);if(i>=0)children.splice(i,1);node.parentNode=null;}};
 const section={getAttribute:k=>k==='aria-label'?'Placements':null,
  querySelector:s=>s==='.section-head'?head:null};
 const grid={closest:s=>s==='section.trace-wealth-section'?section:null};
 const nodes={wealthInvestmentsGrid:grid,wealthSavingsGrid:{},assetGrid:{},wealthTotal:{},wealthTrend:{}};
 const doc={getElementById:id=>id==='traceWealthInvestmentDetailEntry'?
  children.find(n=>n.id===id)||null:nodes[id]||null,
  createElement:()=>({attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v;},
   addEventListener(e,cb){this.handlers[e]=cb;},
   removeEventListener(e,cb){if(this.handlers[e]===cb)delete this.handlers[e];}})};
 const original=Object.keys(nodes).join('|');
 assert.equal(integration.mount(doc,{enabled:false,onOpen:()=>{}}).reason,'feature-disabled');
 assert.equal(children.length,0);
 assert.throws(()=>integration.mount(doc,{enabled:true}),/Action d’ouverture manquante/);
 const handle=integration.mount(doc,{enabled:true,onOpen:()=>{clicks++;}});
 assert.equal(handle.mounted,true);
 assert.equal(children.length,1);
 assert.equal(children[0].id,'traceWealthInvestmentDetailEntry');
 assert.equal(children[0].className,'linkbtn trace-wealth-investments-link');
 assert.match(children[0].attrs['aria-label'],/Patrimoine/);
 children[0].handlers.click();
 assert.equal(clicks,1);
 assert.equal(integration.mount(doc,{enabled:true,onOpen:()=>{clicks++;}}).reason,'already-mounted');
 assert.equal(children.length,1);
 assert.equal(Object.keys(nodes).join('|'),original);
 handle.unmount();
 assert.equal(children.length,0);
 assert.equal(typeof handle.element.handlers.click,'undefined');
 const incomplete={...doc,getElementById:id=>id==='wealthTrend'?null:doc.getElementById(id)};
 assert.equal(integration.mount(incomplete,{enabled:true,onOpen:()=>{}}).reason,'wealth-structure-mismatch');
});
test('existing investment accounts are mapped diagnostically without inventing opening positions or altering CELI savings',()=>{
 const accounts=[
  {id:'pea',type:'PEA',owner:'la',currency:'EUR'},
  {id:'c1',type:'CELI',owner:'partner',currency:'CAD'},
  {id:'c2',type:'CELI',owner:'partner',currency:'CAD',investmentTracking:'securities'},
  {id:'savings',type:'Livret',owner:'la',currency:'EUR',savingsTracking:'linked'},
  {id:'reer',type:'REER',owner:'la',currency:'CAD'}
 ];
 const ops=[{id:'q',accountId:'pea',type:'quote',symbol:'DSY'},
  {id:'cash',accountId:'pea',type:'deposit',bankAccountId:'bank1',amount:200},
  {id:'buy',accountId:'pea',type:'buy',symbol:'DSY',quantity:2,unitPrice:20}];
 const original=JSON.stringify({accounts,ops});
 const results=integration.auditAccountMapping(accounts,ops);
 assert.deepEqual(results.map(x=>x.accountId),['pea','c2','reer']);
 assert.deepEqual(results[0].knownSymbols,['DSY']);
 assert.ok(results[0].issues.some(x=>x.includes('ISIN')));
 assert.ok(results[0].issues.some(x=>x.includes('Virements')));
 assert.ok(results[0].issues.some(x=>x.includes('provenance')));
 assert.equal(results[0].mode,'read-only-diagnostic');
 assert.equal(JSON.stringify({accounts,ops}),original);
 assert.equal(integration.eligible(accounts[1]),false);
 assert.equal(integration.eligible(accounts[2]),true);
 assert.throws(()=>integration.auditAccountMapping([...accounts,accounts[0]],ops),/répété/);
});


test('native Patrimoine dialog opens without iframe and switches two fictitious scenarios',()=>{
 const children=[],bridge=require(path.join(root,'legacy-bridge.js'));
 const header={appendChild(node){children.push(node);node.parentNode=this;},removeChild(node){children.splice(children.indexOf(node),1);}};
 const section={getAttribute:k=>k==='aria-label'?'Placements':null,querySelector:k=>k==='.section-head'?header:null};
 const grid={closest:k=>k==='section.trace-wealth-section'?section:null};
 const popup={opened:false,events:{},showModal(){this.opened=true;},
  close(){this.opened=false;this.events.close?.();},addEventListener(k,fn){this.events[k]=fn;}};
 const close={events:{},focus(){this.focused=true;},addEventListener(k,fn){this.events[k]=fn;}};
 const origin={focused:0,focus(){this.focused++;}};
 const choices=[{dataset:{scenario:'pea'},attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
  {dataset:{scenario:'existing'},attrs:{},setAttribute(k,v){this.attrs[k]=v;}}];
 const scenarios={events:{},addEventListener(k,fn){this.events[k]=fn;},
  contains(node){return choices.includes(node);},
  querySelectorAll(){return choices;}};
 const scopeButtons=[{dataset:{scope:'mine'},classList:{toggle(){}}},
  {dataset:{scope:'couple'},classList:{toggle(){}}}];
 const scope={events:{},addEventListener(k,cb){this.events[k]=cb;},querySelectorAll(){return scopeButtons;}};
 const total={textContent:'—'},sub={textContent:'Liquidités, épargne, placements et dettes'},msg={textContent:''};
 const nodes={wealthInvestmentsGrid:grid,wealthSavingsGrid:{},assetGrid:{},
  wealthTotal:total,wealthTrend:{},wlWealthDetail:popup,wlPortalScenarios:scenarios,
  wlScenarioNotice:msg,wlPortalClose:close,wealthScope:scope,wealthSub:sub};
 const doc={activeElement:origin,
  getElementById:k=>k==='traceWealthInvestmentDetailEntry'?children.find(x=>x.id===k)||null:nodes[k]||null,
  createElement:()=>({attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},
   addEventListener(k,cb){this.events[k]=cb;},removeEventListener(k){delete this.events[k];}})};
 const loaded=[];
 const runtime={activateScenario(model){
  loaded.push(model);assert.equal(model.portfolios.length,1);
  assert.doesNotThrow(()=>E.evaluate(model.portfolios[0]));
 }};
 const js=fs.readFileSync(path.join(root,'wealth-host.js'),'utf8');
 vm.runInNewContext(js,{window:{TraceWealthIntegrationContract:integration,TraceWealthLegacyBridge:bridge,
   TraceWealthLabRuntime:runtime,TraceWealthLabEngine:E},document:doc,Error});
 assert.equal(children.length,1);
 assert.equal(popup.opened,false);
 children[0].events.click();
 assert.equal(popup.opened,true);
 assert.equal(close.focused,true);
 scenarios.events.click({target:{closest:()=>choices[1]}});
 assert.equal(loaded.length,1);
 assert.equal(loaded[0].portfolios[0].id,'simulation-portefeuille');
 assert.equal(loaded[0].portfolios[0].operations.length,2);
 assert.equal(choices[1].attrs['aria-pressed'],'true');
 assert.match(msg.textContent,/fictif/);
 scenarios.events.click({target:{closest:()=>choices[0]}});
 assert.equal(loaded.length,2);
 assert.equal(loaded[1].portfolios[0].id,'pea-demo');
 assert.equal(loaded[1].portfolios[0].positions.length,8);
 assert.equal(choices[0].attrs['aria-pressed'],'true');
 close.events.click();
 assert.equal(popup.opened,false);
 assert.equal(origin.focused,1);
 scope.events.click({target:{closest:()=>scopeButtons[1]}});
 assert.match(sub.textContent,/Couple/);
 assert.equal(total.textContent,'—');
 assert.equal(nodes.wealthSavingsGrid,doc.getElementById('wealthSavingsGrid'));
 assert.equal(nodes.assetGrid,doc.getElementById('assetGrid'));
});
test('embedded navigation never pretends Patrimoine is another internal investment tab',()=>{
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(js,/document\.documentElement\?\.classList\?\.contains\('wl-embedded'\)/);
 assert.match(js,/embedded\?'<b>Investissements<\/b>'/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'wealth-host.js'),'utf8'),/navigate\(|saveDocument\(|client\.rpc\(/);
});


test('read-only compatibility explainer stays folded unless opened and uses fictitious records',()=>{
 const html=fs.readFileSync(path.join(root,'patrimoine-host.html'),'utf8');
 assert.match(html,/<details class="wl-host-compat" id="wlLegacyDemoToggle">/);
 assert.match(html,/id="wlLegacyDemoReport"/);
 assert.match(html,/src="\.\/legacy-bridge\.js"/);
 const bridge=require(path.join(root,'legacy-bridge.js'));
 const head={appendChild(x){x.parentNode=this;}};
 const section={getAttribute(k){return k==='aria-label'?'Placements':null;},
  querySelector(){return head;}};
 const grid={closest(){return section;}};
 const compatibility={open:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}};
 const report={children:[],textContent:'',replaceChildren(){this.children=[];},
  appendChild(node){this.children.push(node);}};
 const node=()=>({children:[],handlers:{},attrs:{},textContent:'',
  appendChild(x){this.children.push(x);},
  setAttribute(k,v){this.attrs[k]=v;},
  addEventListener(k,fn){this.handlers[k]=fn;}});
 const scope={addEventListener(){}};
 const popup={addEventListener(){},showModal(){}};
 const close={addEventListener(){}};
 const scenarios={addEventListener(){}};
 const nodes={wealthInvestmentsGrid:grid,wealthSavingsGrid:{},assetGrid:{},wealthTotal:{},
  wealthTrend:{},wlWealthDetail:popup,wlPortalScenarios:scenarios,wlPortalClose:close,
  wealthScope:scope,wlLegacyDemoToggle:compatibility,wlLegacyDemoReport:report};
 const document={
  getElementById:id=>nodes[id]||null,
  createElement:node,activeElement:null
 };
 const src=fs.readFileSync(path.join(root,'wealth-host.js'),'utf8');
 vm.runInNewContext(src,{window:{TraceWealthIntegrationContract:integration,TraceWealthLegacyBridge:bridge},document});
 assert.equal(report.children.length,0);
 compatibility.open=true;
 compatibility.handlers.toggle();
 assert.equal(report.children.length,3);
 const bullets=report.children[1].children.map(x=>x.textContent);
 assert.equal(bullets.length,5);
 assert.match(bullets[0],/1 compte/);
 assert.match(bullets[1],/3 opérations fictives/);
 assert.match(bullets[2],/sans écriture supplémentaire/);
 assert.match(bullets[3],/cotation mise en attente/);
 assert.match(bullets[4],/concordants/);
 assert.match(report.children[2].textContent,/ne consulte aucun compte/);
 assert.match(report.children[2].textContent,/accord/);
});
