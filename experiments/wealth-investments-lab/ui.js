/* Isolated TRACE investment lab presentation. No data persistence or credentials. */
(function(){
'use strict';
const E=window.TraceWealthLabEngine;
const e=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=(n,c='EUR')=>n===null||n===undefined?'—':new Intl.NumberFormat('fr-FR',{style:'currency',currency:c}).format(n/100);
const qty=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(n/1000000);
const date=s=>s?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):'—';
const percent=n=>Number.isFinite(n)?(n*100).toFixed(1).replace('.',',')+' %':'—';
const action=(text,what,id='',cls='wl-btn-alt')=>'<button type="button" class="wl-btn '+cls+'" data-act="'+e(what)+'" data-id="'+e(id)+'">'+e(text)+'</button>';
const placeholder=message=>'<div class="wl-placeholder"><strong>Données à compléter</strong><p>'+e(message)+'</p></div>';
const heading=(tag,name,lead)=>'<span class="wl-kicker">'+e(tag)+'</span><h1 class="wl-page-title">'+e(name)+'</h1><p class="wl-lead">'+e(lead)+'</p>';
const section=(name,body,right='')=>'<section class="wl-section"><div class="wl-section-head"><h2>'+e(name)+'</h2>'+right+'</div>'+body+'</section>';
const ref=(p,v)=>v.valueCents!==null?{label:fmt(v.valueCents,p.currency),note:'Valorisation calculée · cours manuels',historical:false}:
 p.referenceValueCents!==undefined&&p.operations.length===0?
 {label:fmt(p.referenceValueCents,p.currency),note:'Référence fournie au '+date(p.referenceDate)+' · non actualisée',historical:true}:
 {label:'Indisponible',note:'Cours manquants : pas de valorisation inventée',historical:true};
function hero(p,v){
 const r=ref(p,v);
 return '<div class="wl-hero"><small>'+e(p.name)+' · '+e(p.currency)+'</small>'+
 '<div class="wl-value">'+r.label+'</div><div class="wl-sub">'+e(r.note)+'</div>'+
 '<div class="wl-hero-bottom"><div><strong>'+fmt(v.cashCents,p.currency)+'</strong><span>Liquidités'+(p.openingCashConfirmed?'':' · base estimée')+'</span></div>'+
 '<div><strong>'+(v.profitCents===null?'Non calculable':fmt(v.profitCents,p.currency))+'</strong><span>Gain hors versements et retraits</span></div></div></div>'+
 (r.historical?'<p class="wl-note"><strong>Aucun PRU ni cours historique reconstitué.</strong> Les 3 788,69 € sont une valeur de référence, pas une cotation en direct.</p>':'');
}
function cardPortfolio(p){
 const v=E.evaluate(p),r=ref(p,v);
 return '<button type="button" class="wl-card wl-portfolio-card" data-act="portfolio" data-id="'+e(p.id)+'">'+
 '<div class="wl-portfolio-main"><div class="wl-portfolio-left"><span class="wl-tile-icon">◇</span><span>'+
 '<b>'+e(p.name)+'</b><small>'+e(p.type)+' · '+e(p.owner==='la'?'Moi':'Partenaire')+' · '+e(p.currency)+
 ' · '+v.positions.length+' titres</small></span></div><span class="wl-arrow">›</span></div>'+
 '<div class="wl-portfolio-footer"><div><b>'+r.label+'</b><br><span>'+(r.historical?'Référence ou valeurs manquantes':'Valorisation calculée')+'</span></div>'+
 '<div style="text-align:right"><b>'+fmt(v.cashCents,p.currency)+'</b><br><span>Liquidités</span></div></div></button>';
}
const stat=(name,value,sub='')=>'<div class="wl-card wl-stat"><small>'+e(name)+'</small><strong>'+value+'</strong>'+(sub?'<em>'+e(sub)+'</em>':'')+'</div>';
const palette=['#2d7353','#7cab87','#b0c5ac','#cbd9bc','#e1c99b','#759a9e','#bba7c5','#a2ad8d'];
function donut(v){
 if(!v.priced||!v.securitiesCents)return placeholder('La répartition exacte attend les cours de toutes les positions.');
 let progress=0;
 const stops=v.positions.map((s,i)=>{let a=progress;progress+=s.marketValueCents/v.securitiesCents*100;return palette[i%8]+' '+a+'% '+progress+'%';});
 return '<div class="wl-donut-layout"><div class="wl-donut" style="background:conic-gradient('+stops.join(',')+')">'+
 '<span class="wl-donut-label">'+v.positions.length+' titres</span></div><div class="wl-donut-legend">'+
 v.positions.slice(0,5).map((s,i)=>'<div><span><i class="wl-color" style="background:'+palette[i%8]+'"></i>'+e(s.name)+'</span><b>'+percent(s.weight)+'</b></div>').join('')+
 (v.positions.length>5?'<div class="wl-muted-small">+ '+(v.positions.length-5)+' autres positions</div>':'')+'</div></div>';
}
function curve(p,period){
 const points=(p.snapshots||[]).filter(s=>E.dateValid(s.date)&&Number.isSafeInteger(s.valueCents)).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const current=points.at(-1);
 if(!current)return placeholder('Aucun instantané de valorisation enregistré.');
 let filtered=points;
 if(period!=='all'){
  const d=new Date(current.date+'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth()-Number(period));
  const cutoff=d.toISOString().slice(0,10);
  filtered=points.filter(x=>x.date>=cutoff);
 }
 if(filtered.length<2)return placeholder('Une seule valeur historique est fournie au 4 novembre 2026. Ajoute des valorisations datées pour construire une vraie courbe.');
 const minimum=Math.min(...filtered.map(x=>x.valueCents)),maximum=Math.max(...filtered.map(x=>x.valueCents));
 const gap=Math.max(1,maximum-minimum);
 const xy=filtered.map((p,i)=>({x:20+i/(filtered.length-1)*445,y:128-(p.valueCents-minimum)/gap*102,v:p}));
 return '<svg class="wl-svg wl-mini-chart" viewBox="0 0 485 158" role="img" aria-label="Évolution basée sur les instantanés enregistrés">'+
 '<path d="M20 137H465" stroke="#dbe9df"/><path fill="none" stroke="#286c50" stroke-width="3" d="'+
 xy.map((x,i)=>(i?'L':'M')+x.x.toFixed(1)+' '+x.y.toFixed(1)).join(' ')+'"/>'+
 xy.map(x=>'<circle cx="'+x.x+'" cy="'+x.y+'" r="4" fill="#286c50"><title>'+e(date(x.v.date)+' · '+fmt(x.v.valueCents,p.currency))+'</title></circle>').join('')+
 '<text x="20" y="153" font-size="10" fill="#799284">'+e(date(filtered[0].date))+'</text>'+
 '<text x="465" y="153" text-anchor="end" font-size="10" fill="#799284">'+e(date(filtered.at(-1).date))+'</text></svg>';
}
function positionRows(p,v){
 if(!v.positions.length)return '<div class="wl-empty">Aucune position. Ajoute un titre pour commencer.</div>';
 return v.positions.map(s=>'<button type="button" class="wl-row" data-act="position" data-id="'+e(s.id)+'">'+
 '<span class="wl-row-left"><span class="wl-row-icon">'+e(s.assetType==='ETF'?'ETF':s.assetType==='Fonds'?'F':'AC')+'</span>'+
 '<span class="wl-row-label"><b>'+e(s.name)+'</b><small>'+qty(s.quantityMicro)+' titres · '+e(s.assetType||'Titre')+
 (s.isin?' · '+e(s.isin):' · ISIN non renseigné')+'</small></span></span>'+
 '<span class="wl-row-value"><b>'+(s.marketValueCents===null?'Cours manquant':fmt(s.marketValueCents,p.currency))+'</b>'+
 '<small>'+(s.unrealizedCents===null?'PRU à renseigner':fmt(s.unrealizedCents,p.currency)+' latent')+'</small></span></button>').join('');
}
function multiHero(state,p,v){
 if(state.portfolios.length===1)return hero(p,v);
 const items=state.portfolios.map(p=>({p,v:E.evaluate(p)}));
 const same=items.every(x=>x.p.currency===p.currency);
 const ready=same&&items.every(x=>x.v.valueCents!==null);
 const total=ready?items.reduce((sum,x)=>sum+x.v.valueCents,0):null;
 const cash=same?items.reduce((sum,x)=>sum+x.v.cashCents,0):null;
 const gain=same&&items.every(x=>x.v.profitCents!==null)?
  items.reduce((sum,x)=>sum+x.v.profitCents,0):null;
 return '<div class="wl-hero"><small>ENSEMBLE DES INVESTISSEMENTS</small>'+
 '<div class="wl-value">'+(total===null?'Total à compléter':fmt(total,p.currency))+'</div>'+
 '<div class="wl-sub">'+(same?'Tous les cours sont nécessaires pour consolider.':
 'Devises multiples : taux de conversion datés nécessaires.')+'</div>'+
 '<div class="wl-hero-bottom"><div><strong>'+(cash===null?'Par devise':fmt(cash,p.currency))+'</strong><span>Liquidités</span></div>'+
 '<div><strong>'+(gain===null?'Indisponible':fmt(gain,p.currency))+'</strong><span>Gains hors apports</span></div></div></div>';
}
function readiness(p,v){
 const total=v.positions.length;
 if(!total)return '<div class="wl-readiness"><div class="wl-ready-title">Première étape</div><p>Ajoute un titre pour constituer ce portefeuille.</p></div>';
 const quoted=total-v.missingQuote.length,basis=total-v.missingCost.length;
 if(quoted===total&&basis===total)return '<div class="wl-readiness wl-readiness-done"><span class="wl-ready-dot">✓</span><span><b>Positions renseignées</b><small>Les cours et PRU de ce portefeuille sont disponibles.</small></span></div>';
 const toQuote=v.positions.find(x=>v.missingQuote.includes(x.id));
 const toCost=v.positions.find(x=>v.missingCost.includes(x.id));
 return '<div class="wl-readiness"><div class="wl-readiness-head"><div><span class="wl-kicker">VOTRE REPRISE</span><h3>Compléter les données</h3></div>'+
 '<span class="wl-progress-badge">'+(quoted+basis)+' / '+(total*2)+'</span></div>'+
 '<p class="wl-ready-summary">Les positions sont déjà reprises. Il reste à renseigner les données qui permettent de mesurer leur performance.</p>'+
 '<div class="wl-progress-row"><span>Cours enregistrés</span><strong>'+quoted+' / '+total+'</strong></div>'+
 '<div class="wl-progress-track"><i style="width:'+(100*quoted/total).toFixed(0)+'%"></i></div>'+
 '<div class="wl-progress-row"><span>Prix de revient</span><strong>'+basis+' / '+total+'</strong></div>'+
 '<div class="wl-progress-track"><i style="width:'+(100*basis/total).toFixed(0)+'%"></i></div>'+
 '<div class="wl-ready-actions">'+
 (toQuote?'<button class="wl-ready-link" data-act="quote" data-id="'+e(toQuote.id)+'">+ Renseigner un cours</button>':'')+
 (toCost?'<button class="wl-ready-link" data-act="opening" data-id="'+e(toCost.id)+'">+ Renseigner un PRU</button>':'')+'</div></div>';
}
function overview(state){
 const p=state.portfolios[0],v=E.evaluate(p);
 return heading('VOTRE PATRIMOINE','Investissements','Portefeuilles et positions au même endroit. Vos chiffres essentiels, sans complexité inutile.')+
 multiHero(state,p,v)+
 section('Mes portefeuilles','<div style="display:grid;gap:10px">'+state.portfolios.map(cardPortfolio).join('')+'</div>',action('+ Ajouter','newPortfolio','','wl-btn-light'))+
 (v.performanceComplete?section('Performance','<div class="wl-two">'+stat('Plus-values latentes',fmt(v.unrealizedCents,p.currency))+
 stat('Plus-values réalisées',fmt(v.realizedCents,p.currency))+'</div>'):'')+
 section('Analyses','<div class="wl-card wl-analytics">'+
 (v.priced?donut(v):'<p class="wl-muted-small">La répartition et la performance deviennent disponibles après la saisie de cours datés. Aucun cours n’est simulé.</p>')+
 '</div>',action('Explorer','analytics','','wl-btn-light'));
}
function portfolio(p){
 const v=E.evaluate(p);
 return heading('PORTEFEUILLE',p.name,'Positions, liquidités et journal dans sa devise native.')+hero(p,v)+
 '<div class="wl-actions">'+action('+ Opération','newOp','','')+action('Ajouter un titre','newSecurity')+action('Instantané','snapshot','','wl-btn-light')+'</div>'+
 readiness(p,v)+
 section('Positions','<div class="wl-card">'+positionRows(p,v)+'</div>',action('Analyser','analytics','','wl-btn-light'))+
 section('Suivi','<div class="wl-two">'+stat('Liquidités',fmt(v.cashCents,p.currency))+stat('Apports nets',fmt(v.netFlowCents,p.currency))+
 stat('Gains réalisés',fmt(v.realizedCents,p.currency))+stat('Gains latents',v.unrealizedCents===null?'À renseigner':fmt(v.unrealizedCents,p.currency))+'</div>')+
 section('Historique des opérations','<div class="wl-card wl-timeline">'+(p.operations.length?
 p.operations.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(o=>
 '<div class="wl-history-row"><span><b>'+e(({buy:'Achat',sell:'Vente',deposit:'Versement',withdrawal:'Retrait',dividend:'Dividende',fee:'Frais'})[o.type])+'</b>'+
 '<small>'+date(o.date)+(o.securityId?' · '+e(p.catalog.find(s=>s.id===o.securityId)?.name||o.securityId):'')+'</small></span>'+
 '<span style="text-align:right"><b>'+(o.type==='buy'||o.type==='sell'?qty(o.quantityMicro)+' titres':fmt(o.amountCents,p.currency))+
 '</b><br><button class="wl-link" data-act="editOp" data-id="'+e(o.id)+'">Corriger</button></span></div>').join(''):
 '<p class="wl-empty">Aucune opération saisie. Les positions initiales ne créent pas d’achats fictifs.</p>')+'</div>')+
 '<p class="wl-note">Une correction rejoue tout le journal. Les soldes et les PRU restent cohérents ou la modification est refusée.</p>';
}
function position(p,id){
 const v=E.evaluate(p),s=v.positions.find(x=>x.id===id);
 if(!s)return heading('POSITION','Non disponible','Cette position ne fait plus partie du portefeuille.');
 const strategy=s.strategy||{};
 const alerts=[];
 if(s.quote&&strategy.priceAbove&&s.quote.priceUnits>=E.price(strategy.priceAbove))alerts.push('Seuil haut atteint');
 if(s.quote&&strategy.priceBelow&&s.quote.priceUnits<=E.price(strategy.priceBelow))alerts.push('Seuil bas atteint');
 if(s.weight!==null&&strategy.maxWeight&&s.weight*100>=Number(String(strategy.maxWeight).replace(',','.')))alerts.push('Concentration à revoir');
 return heading('POSITION',s.name,(s.assetType||'Titre')+' · '+(s.isin||'ISIN à renseigner'))+
 '<div class="wl-card wl-analytics"><span class="wl-kicker">VALORISATION</span><div class="wl-perf">'+
 (s.marketValueCents===null?'Cours manquant':fmt(s.marketValueCents,p.currency))+'</div>'+
 '<p class="wl-muted-small">Dernier cours : '+(s.quote?
 fmt(E.tradeCents(E.Q_SCALE,s.quote.priceUnits),p.currency)+' · '+date(s.quote.date)+' · '+e(s.quote.source)+' ('+e(s.quote.kind||'manuel')+')':
 'À renseigner')+'</p></div>'+
 '<div class="wl-actions">'+action('Saisir un cours','quote',id,'')+action('Modifier le PRU / ISIN','opening',id)+'</div>'+
 section('Ma position','<div class="wl-two">'+stat('Quantité',qty(s.quantityMicro))+
 stat('PRU moyen',s.averageCostUnits===null?'À renseigner':fmt(E.tradeCents(E.Q_SCALE,s.averageCostUnits),p.currency))+
 stat('Gain latent',s.unrealizedCents===null?'Indisponible':fmt(s.unrealizedCents,p.currency))+
 stat('Poids',s.weight===null?'Indisponible':percent(s.weight))+'</div>')+
 section('Classification','<div class="wl-card wl-analytics wl-muted-small">'+e(s.sector||'Secteur inconnu')+' · '+e(s.geography||'Géographie inconnue')+
 (s.symbol?' · '+e(s.symbol):'')+'</div>')+
 section('Stratégie et alertes','<div class="wl-card wl-analytics"><p style="margin:0">'+e(strategy.thesis||'Thèse d’investissement non renseignée')+'</p>'+
 '<p class="wl-muted-small">'+e(strategy.horizon||'Horizon à définir')+
 (strategy.resultsDate?' · Résultats : '+e(strategy.resultsDate):'')+'</p>'+
 (alerts.length?alerts.map(x=>'<span class="wl-badge wl-badge-warn">'+e(x)+'</span>').join(' '):
 '<p class="wl-muted-small">Aucun seuil déclenché. Les alertes ne placent jamais d’ordre.</p>')+'</div>',
 action('Configurer','strategy',id,'wl-btn-light'));
}
function analytics(p,range){
 const v=E.evaluate(p),perf=E.periodPerformance(p,range),filters=[['1','1 mois'],['3','3 mois'],['6','6 mois'],['12','1 an'],['all','Origine']];
 const assetReady=v.priced&&v.positions.every(s=>s.assetType);
 const byAsset={};if(assetReady)for(const s of v.positions)byAsset[s.assetType]=(byAsset[s.assetType]||0)+s.marketValueCents;
 const sectorReady=v.priced&&v.positions.every(s=>s.sector);
 const bySector={};if(sectorReady)for(const s of v.positions)bySector[s.sector]=(bySector[s.sector]||0)+s.marketValueCents;
 const geographyReady=v.priced&&v.positions.every(s=>s.geography);
 const byGeography={};if(geographyReady)for(const s of v.positions)byGeography[s.geography]=(byGeography[s.geography]||0)+s.marketValueCents;
 return heading('ANALYSE','Comprendre mes placements','Des graphiques alimentés par vos propres valorisations, pas par des prix inventés.')+
 section('Évolution et rendement','<div class="wl-split">'+filters.map(([id,text])=>
 '<button class="wl-pill" aria-pressed="'+(range===id)+'" data-act="range" data-id="'+id+'">'+text+'</button>').join('')+'</div>'+
 '<div class="wl-card wl-analytics">'+curve(p,range)+
 '<p class="wl-note">'+(perf?'Variation hors apports : '+fmt(perf.gainCents,p.currency)+' · rendement estimé : '+(perf.percent===null?'Non calculable':perf.percent.toFixed(2)+' %')+' · '+e(perf.method):
 'Une seconde valorisation datée est nécessaire pour séparer performance et apports.')+'</p></div>')+
 section('Répartition par position','<div class="wl-card wl-analytics">'+donut(v)+'</div>')+
 section('Actions, ETF et autres','<div class="wl-card wl-analytics">'+(assetReady?
 Object.entries(byAsset).map(([type,n])=>'<div class="wl-history-row"><b>'+e(type)+'</b><b>'+percent(n/v.securitiesCents)+'</b></div>').join(''):
 placeholder('Les poids par classe nécessitent une valorisation complète.'))+'</div>')+
 section('Secteurs et géographie','<div class="wl-card wl-analytics">'+(sectorReady?
 Object.entries(bySector).map(([s,n])=>'<div class="wl-history-row"><b>'+e(s)+'</b><b>'+percent(n/v.securitiesCents)+'</b></div>').join(''):
 placeholder('Classe les titres et ajoute leurs cours pour une allocation fiable.'))+'</div>')+
 section('Répartition géographique','<div class="wl-card wl-analytics">'+(geographyReady?
 Object.entries(byGeography).map(([g,n])=>'<div class="wl-history-row"><b>'+e(g)+'</b><b>'+percent(n/v.securitiesCents)+'</b></div>').join(''):
 placeholder('Géographies à renseigner pour chaque position.'))+'</div>')+
 section('Indice de référence',placeholder('Comparaison indisponible sans historique de l’indice, devise et méthodologie cohérentes.'));
}
window.TraceWealthLabUI=Object.freeze({e,fmt,qty,date,action,overview,portfolio,position,analytics,ref});
})();
