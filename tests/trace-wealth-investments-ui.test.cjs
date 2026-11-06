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
 assert.match(detail,/PRU à compléter/);
 assert.match(detail,/Aucune opération saisie/);
 assert.ok(!detail.includes('19,708'));
});
test('position and analysis show honest missing quotes and never fake a graph',()=>{
 const info=U.position(p,'dsy'),analytics=U.analytics(p,'all');
 assert.match(info,/ISIN à renseigner/);
 assert.match(info,/Cours manquant/);
 assert.match(info,/Gains|Gain latent/);
 assert.match(analytics,/Une seule valeur historique/);
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
 assert.match(list,/8 lignes/);
 assert.match(list,/6 actions/);
 assert.match(list,/2 ETF/);
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
