/* TRACE 2.0.1 — Native investment tracking inside existing Patrimoine.
 * Uses only the original investment_accounts JSON document, with optimistic CAS
 * through TRACE's existing authenticated saveDocument workflow.
 * Never imports sample holdings or changes bank transactions automatically. */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./trace-wealth-201-engine.js'):root.TraceWealth201Engine,
  root
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealth201=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,root){
 'use strict';
 const key='investments201',today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const fmt=(c,cur)=>c===null||c===undefined?'—':new Intl.NumberFormat('fr-FR',{style:'currency',currency:cur||'EUR'}).format(c/100);
 const qstr=q=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(q/1e6);
 const pxstr=x=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:4}).format(x/1e4);
 const validText=(s,n=100)=>String(s||'').trim().slice(0,n);
 const within=(d,opened)=>E.dateValid(d)&&d>=opened&&d<=today();
 const labelType={buy:'Achat',sell:'Vente',deposit:'Versement',withdrawal:'Retrait',dividend:'Dividende',fee:'Frais'};
 const mkid=()=>('w201_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9));
 function blank(account){
  return{id:account.id,name:account.name||account.type||'Placement',
   owner:account.owner,type:account.type,currency:account.currency||'CAD',
   openingDate:today(),openingCashCents:0,openingCashConfirmed:false,
   positions:[],catalog:[],operations:[],quotes:{},quoteHistory:{},snapshots:[],
   status:'draft',schema:1};
 }
 function load(account){
  if(!account?.id)throw Error('Compte de placement introuvable');
  const stored=account[key];
  if(!stored)return blank(account);
  if(stored.schema!==1||stored.id!==account.id||stored.owner!==account.owner||
   stored.currency!==account.currency)throw Error('Compte non compatible avec TRACE 2.0.1 : aucune modification autorisée');
  const p=JSON.parse(JSON.stringify(stored));
  E.evaluate(p);
  return p;
 }
 function reconcile(p,record){
  if(!p.openingCashConfirmed||!p.positions.length)
   throw Error('Renseigne les espèces et au moins une position avant de rapprocher le portefeuille.');
  const date=validText(record?.date,10),source=validText(record?.source,100);
  if(!within(date,p.openingDate)||!source)throw Error('Date et référence de relevé valides obligatoires.');
  if(p.operations.some(o=>o.date>date))throw Error('Le relevé doit couvrir la dernière opération enregistrée.');
  const snap=E.snapshotAt(p,date);
  const brokerCents=E.cents(record.value);
  if(snap.valueCents!==brokerCents)
   throw Error('Écart entre le relevé et TRACE : '+fmt(snap.valueCents,p.currency)+' contre '+fmt(brokerCents,p.currency)+'.');
  return{...p,status:'verified',brokerVerification:{
   date,source,statementValueCents:brokerCents,verifiedAt:today()
  },snapshots:[...p.snapshots.filter(s=>s.date!==date),{
   ...snap,source:'Rapprochement : '+source
  }].sort((a,b)=>a.date.localeCompare(b.date))};
 }
 function invalidate(p){
  const copy={...p,status:'draft'};
  delete copy.brokerVerification;
  return copy;
 }
 function evaluateStrict(p){
  const out=E.evaluate(p);
  if(p.status==='verified'){
   const v=p.brokerVerification;
   if(!v||!E.dateValid(v.date)||!Number.isSafeInteger(v.statementValueCents))
    throw Error('Rapprochement incomplet : retour en brouillon nécessaire');
  }
  return out;
 }
 function productionSummary(p){
  if(p.status!=='verified')return{ready:false,reason:'Brouillon à rapprocher'};
  const val=evaluateStrict(p);
  if(!val.priced||!val.performanceComplete)
   return{ready:false,reason:'Cours ou prix de revient non vérifiés'};
  return{ready:true,cash:val.cashCents/100,securities:val.securitiesCents/100,
   value:val.valueCents/100,contributions:val.netFlowCents/100,
   realized:val.realizedCents/100,dividends:val.dividendsCents/100,
   fees:val.directFeesCents/100,performance:val.profitCents/100,
   positions:val.positions.map(s=>({
    symbol:s.symbol||s.name,quantity:s.quantityMicro/1e6,
    price:s.quote.priceUnits/1e4,value:s.marketValueCents/100,
    unrealized:s.unrealizedCents/100
   }))};
 }
 // host is injected from authenticated original TRACE runtime.
 let host=null,accountId='',screen='home',selected='',error='',saving=false,filter='all',chartMode='value',chartPeriod='all';
 function context(){if(!host)throw Error('TRACE indisponible');const c=host.context();if(!c||!c.active)throw Error('Connecte-toi à TRACE pour accéder au Patrimoine');return c;}
 function accounts(){const c=context();return c.accounts.filter(a=>
  !a.archived&&a.savingsTracking!=='linked'&&!['CELI','Épargne','Livret','Savings'].includes(a.type));}
 function pick(){const a=accounts().find(x=>x.id===accountId);if(!a)throw Error('Compte indisponible dans ce périmètre');return a;}
 function ledgerRows(a){return context().operations.filter(o=>o.accountId===a.id&&(!o.status||o.status==='confirmed'));}
 function isLegacy(a){return ledgerRows(a).length>0;}
 function own(a){return a.owner===context().viewer;}
 function btn(label,act,value='',cls=''){return '<button type="button" class="w201-btn '+cls+'" data-w201="'+e(act)+'" data-id="'+e(value)+'">'+e(label)+'</button>';}
 function positionLabel(s){return e(s.name||s.symbol||'Titre');}
 function renderHome(){
  const data=accounts();
  return '<div class="w201-kicker">PATRIMOINE · TRACE 2.0.1</div>'+
   '<h2 class="w201-headline">Mes investissements</h2>'+
   '<p class="w201-muted">Les portefeuilles existants, sans nouvel onglet ni doublon bancaire.</p>'+
   (!data.length?'<div class="w201-empty">Aucun compte de placement dans ce périmètre. Utilise « Ajouter un placement » dans Patrimoine.</div>':
    '<div class="w201-accounts">'+data.map(a=>{
     let p=null,status='À initialiser';try{p=load(a);status=p.status==='verified'?'Rapproché':
      p.positions.length||p.operations.length?'À vérifier':'À initialiser';}catch{status='Données à vérifier'}
     return '<button type="button" class="w201-account" data-w201="account" data-id="'+e(a.id)+'">'+
      '<span class="w201-account-icon">◇</span><span class="w201-account-name"><strong>'+e(a.name||a.type)+'</strong><small>'+
      e(a.type)+' · '+e(a.currency||'CAD')+' · '+(a.owner===context().viewer?'Moi':'Partenaire')+
      '</small></span><span class="w201-account-status">'+status+' ›</span></button>';
    }).join('')+'</div>')+
   '<p class="w201-fine">Les données actuelles de Patrimoine restent inchangées jusqu’au rapprochement. Aucune position fictive n’est importée.</p>';
 }
 function lineChart(rows,cur,mode){
  const pts=rows.map(x=>({date:x.date,value:mode==='flows'?x.flowAdjustedCents:x.valueCents,source:x.source}));
  const first=Date.parse(pts[0].date),last=Date.parse(pts.at(-1).date),span=Math.max(1,last-first);
  const min=Math.min(...pts.map(x=>x.value)),max=Math.max(...pts.map(x=>x.value)),range=Math.max(1,max-min);
  const xy=pts.map(x=>({x:18+Math.round((Date.parse(x.date)-first)/span*282),
   y:116-Math.round((x.value-min)/range*88),...x}));
  const points=xy.map(x=>x.x+','+x.y).join(' ');
  const elements=xy.map(x=>'<circle cx="'+x.x+'" cy="'+x.y+'" r="3.5" fill="#2c7954" stroke="#fff" stroke-width="1.4">'+
   '<title>'+e(x.date)+' · '+e(fmt(x.value,cur))+' · '+e(x.source)+'</title></circle>').join('');
  return '<svg class="w201-chart" viewBox="0 0 320 145" role="img" aria-label="Évolution datée '+e(mode==='flows'?'hors apports':'de la valeur')+'">'+
   '<path d="M18 129H300" stroke="#dae7dd" stroke-width="1" />'+
   '<polyline points="'+points+'" fill="none" stroke="#276f4c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+
   elements+'<text x="18" y="142" font-size="9" fill="#789380">'+e(pts[0].date)+'</text>'+
   '<text x="300" y="142" font-size="9" text-anchor="end" fill="#789380">'+e(pts.at(-1).date)+'</text></svg>';
 }
 function renderAllocation(title,rows,cur){
  if(!rows.length)return '';
  const rest=rows.slice(5).reduce((sum,x)=>sum+x.valueCents,0);
  const visible=rows.slice(0,5);
  if(rest)visible.push({label:'Autres',valueCents:rest,
   percentage:rest/rows.reduce((sum,x)=>sum+x.valueCents,0)*100});
  return '<section class="w201-card w201-allocation"><b>'+e(title)+'</b>'+
   '<div class="w201-bars">'+visible.map(x=>{
    const pct=Math.max(0,Math.min(100,x.percentage));
    return '<div class="w201-bar-row"><div class="w201-bar-label"><span>'+e(x.label)+'</span>'+
     '<strong>'+pct.toFixed(1).replace('.',',')+' %</strong></div>'+
     '<div class="w201-bar-track" aria-hidden="true"><span style="width:'+pct.toFixed(2)+'%"></span></div>'+
     '<small>'+e(fmt(x.valueCents,cur))+'</small></div>';
   }).join('')+'</div></section>';
 }
 const percentText=n=>Number.isFinite(n)?n.toFixed(1).replace('.',',')+' %':'—';
 const signedMoney=(c,cur)=>c>0?'+'+fmt(c,cur):fmt(c,cur);
 function renderAccount(){
  const a=pick(),p=load(a),v=E.evaluate(p),legacy=isLegacy(a),owned=own(a);
  let html='<div class="w201-kicker">PATRIMOINE · '+e(a.type)+' · '+e(p.currency)+'</div>'+
   '<h2 class="w201-headline">'+e(a.name||p.name)+'</h2>'+
   '<div class="w201-hero"><small>Valeur du suivi</small><strong>'+
    (v.valueCents===null||!p.positions.length?'À compléter':fmt(v.valueCents,p.currency))+
    '</strong><span>'+(legacy?'Journal historique TRACE : consultation conservée':
    p.status==='verified'?'Référence courtier rapprochée le '+e(p.brokerVerification?.date||'')+' · valeur actuelle indicative':
    'Suivi en préparation · non intégré au patrimoine net')+'</span></div>'+
   (legacy?'<p class="w201-warning">Des mouvements existent déjà dans ce compte. Pour éviter les doublons, utilise le journal historique TRACE ; la reprise avancée reste en lecture seule.</p>':
    '<p class="w201-note">Les comptes bancaires, budgets et autres éléments du Patrimoine ne sont pas modifiés. Les cours manuels ne sont pas des cours en direct.</p>')+
   '<div class="w201-tabs" role="group" aria-label="Détails des investissements">'+
   [['positions','Positions'],['operations','Opérations'],['analysis','Analyses']].map(([id,name])=>
    '<button type="button" data-w201="tab" data-id="'+id+'" aria-pressed="'+(screen===id)+'">'+name+'</button>').join('')+'</div>';
  const edit=owned&&!legacy&&!saving;
  if(screen==='operations'){
   html+=edit?'<div class="w201-actionbar">'+btn('+ Opération','new-operation','','primary')+'</div>':'';
   html+=p.operations.length?'<div class="w201-list">'+p.operations.slice().sort((x,y)=>y.date.localeCompare(x.date)).map(o=>
    '<div class="w201-listrow"><span><b>'+e(labelType[o.type]||o.type)+'</b>'+
    '<small>'+e(o.date)+(o.securityId?' · '+e(p.catalog.find(s=>s.id===o.securityId)?.name||o.securityId):'')+'</small></span>'+
    '<strong>'+(o.quantityMicro?qstr(o.quantityMicro)+' titre(s)':fmt(o.amountCents,p.currency))+'</strong>'+
    (edit?btn('Corriger','edit-operation',o.id,'link'):'')+'</div>').join('')+'</div>':
    '<div class="w201-empty">Aucun mouvement. Tu peux enregistrer les futurs achats, ventes, dividendes et versements.</div>';
   if(!legacy&&edit)html+=btn('Renseigner les espèces de départ','cash','','soft');
  }else if(screen==='analysis'){
   const count=v.positions.filter(x=>x.quantityMicro>0).length,
    active=v.positions.filter(x=>x.quantityMicro>0),
    prices=active.filter(x=>x.quote).length,
    costs=active.filter(x=>x.costBasisCents!==null).length;
   const ts=E.chartSeries(p,chartPeriod),performance=E.periodPerformance(p,chartPeriod);
   const allocation=E.allocationBreakdown(p);
   html+='<div class="w201-metrics"><div><small>Liquidités de départ</small><strong>'+
    (p.openingCashConfirmed?fmt(v.cashCents,p.currency):'À confirmer')+'</strong></div>'+
    '<div><small>Apports nets depuis la reprise</small><strong>'+fmt(v.netFlowCents,p.currency)+'</strong></div>'+
    '<div><small>Gains réalisés</small><strong>'+fmt(v.realizedCents,p.currency)+'</strong></div>'+
    '<div><small>Gains latents</small><strong>'+(v.unrealizedCents===null?'Inconnus':fmt(v.unrealizedCents,p.currency))+
    '</strong></div></div>'+
    '<div class="w201-card"><b>Qualité des données</b><p>Cours : '+prices+'/'+count+
    ' · Prix de revient : '+costs+'/'+count+'.</p></div>';
   html+='<section class="w201-card"><b>Performance et évolution</b>'+
    '<div class="w201-periods" role="group" aria-label="Période des analyses">'+
    [['1','1M'],['3','3M'],['6','6M'],['12','1A'],['all','Tout']].map(([id,label])=>
      btn(label,'period',id,chartPeriod===id?'selected':'')).join('')+'</div>'+
    (performance?
      '<div class="w201-perf"><div><small>Gain hors versements et retraits</small><strong>'+
       e(signedMoney(performance.gainCents,p.currency))+'</strong></div>'+
       '<div><small>Performance estimée</small><strong>'+e(percentText(performance.percent))+
       '</strong></div></div>'+
       '<p class="w201-fine">Dietz modifiée : rendement approximatif calculé sur les relevés existants du '+
       e(performance.from)+' au '+e(performance.to)+'. Aucun cours historique fictif.</p>':
       '<p class="w201-fine">Performance en % indisponible : au moins deux relevés datés distincts sont nécessaires pour cette période.</p>')+
    (ts.ready?'<div class="w201-chart-controls">'+
     btn('Valeur totale','metric','value',chartMode==='value'?'selected':'')+
     btn('Hors apports','metric','flows',chartMode==='flows'?'selected':'')+'</div>'+
     lineChart(ts.points,p.currency,chartMode)+
     '<div class="w201-history">'+ts.points.map(x=>'<div><span>'+e(x.date)+'</span><strong>'+
      fmt(chartMode==='flows'?x.flowAdjustedCents:x.valueCents,p.currency)+'</strong><small>'+e(x.source)+'</small></div>').join('')+'</div>'+
     '<p class="w201-fine">La courbe « Hors apports » n’est pas un rendement TWR. Les dates sont celles des relevés.</p>':
     '<p class="w201-fine">Aucune courbe inventée : deux valorisations datées sont nécessaires dans cette période.</p>')+
     '</section>';
   html+=allocation.ready?
     '<div class="w201-section-title">Répartition des titres <span>Valorisation des lignes · hors espèces</span></div>'+
      renderAllocation('Par position',allocation.positions,p.currency)+
      renderAllocation('Actions, ETF et fonds',allocation.types,p.currency)+
      renderAllocation('Par secteur',allocation.sectors,p.currency)+
      renderAllocation('Par zone géographique',allocation.geographies,p.currency):
     '<div class="w201-note">Répartitions non calculables : '+
      e(allocation.reason)+'. Aucune pondération fictive n’est affichée.</div>';
   if(edit)html+='<div class="w201-actionbar">'+btn('Enregistrer une valorisation','snapshot','','soft')+
     btn('Rapprocher au relevé courtier','reconcile','','primary')+'</div>';
  }else{
   html+=edit?'<div class="w201-actionbar">'+btn('+ Position initiale','new-position','','primary')+
    btn('Espèces initiales','cash','','soft')+'</div>':'';
   if(legacy){
    html+='<div class="w201-empty">Ce compte comporte des opérations dans l’ancien journal. Le suivi détaillé préserve cet historique, sans le dupliquer.</div>';
   }else{
    const rows=v.positions.filter(x=>filter==='all'||x.assetType===filter);
    if(v.positions.length>3)html+='<div class="w201-filters">'+[['all','Tous'],['Action','Actions'],['ETF','ETF'],['Fonds','Fonds']].map(([id,t])=>
     btn(t,'filter',id,filter===id?'selected':'')).join('')+'</div>';
    html+=rows.length?'<div class="w201-list">'+rows.map(x=>
     '<button type="button" class="w201-position" data-w201="position" data-id="'+e(x.id)+'">'+
     '<span><b>'+positionLabel(x)+'</b><small>'+qstr(x.quantityMicro)+' titre(s) · '+
     e(x.isin||'ISIN à renseigner')+'</small></span><span class="w201-posvalue">'+
     (x.marketValueCents===null?'Cours absent':fmt(x.marketValueCents,p.currency))+
     '<small>'+(x.unrealizedCents===null?'Gain non calculable':fmt(x.unrealizedCents,p.currency)+' latent')+'</small></span></button>').join('')+'</div>':
     '<div class="w201-empty">Aucune position initiale. Saisis les quantités figurant sur ton relevé courtier ; aucun achat fictif ne sera créé.</div>';
   }
  }
  html+='<div class="w201-footer">'+btn('‹ Mes portefeuilles','home','','link')+'</div>';
  return html;
 }
 function renderPosition(){
  const a=pick(),p=load(a),v=E.evaluate(p),s=v.positions.find(x=>x.id===selected);
  if(!s)return renderAccount();
  const editable=own(a)&&!isLegacy(a)&&!saving;
  let html='<div class="w201-kicker">POSITION · '+e(a.name)+'</div>'+
   '<h2 class="w201-headline">'+positionLabel(s)+'</h2>'+
   '<p class="w201-muted">'+e(s.symbol||'Symbole à compléter')+' · '+e(s.isin||'ISIN à renseigner')+
   ' · '+e(s.marketMic||'MIC non renseigné')+'</p>'+
   '<div class="w201-hero"><small>Valorisation indicative</small><strong>'+
   (s.marketValueCents===null?'Cours manquant':fmt(s.marketValueCents,p.currency))+
   '</strong><span>'+(s.quote?e(s.quote.source)+' · '+e(s.quote.date)+' · '+e(s.quote.kind||'manuel'):'Aucun cours daté vérifié')+'</span></div>'+
   '<div class="w201-metrics"><div><small>Quantité</small><strong>'+qstr(s.quantityMicro)+'</strong></div>'+
   '<div><small>PRU moyen</small><strong>'+(s.averageCostUnits===null?'Inconnu':pxstr(s.averageCostUnits)+' '+e(p.currency))+'</strong></div>'+
   '<div><small>Gain latent</small><strong>'+(s.unrealizedCents===null?'Non calculable':fmt(s.unrealizedCents,p.currency))+'</strong></div>'+
   '<div><small>Poids</small><strong>'+(s.weight===null?'Inconnu':(s.weight*100).toFixed(1)+' %')+'</strong></div></div>'+
   '<div class="w201-card"><b>Classification et stratégie</b><p>'+e(s.sector||'Secteur inconnu')+' · '+
   e(s.geography||'Géographie inconnue')+'</p><p>'+e(s.strategy?.thesis||'Thèse non renseignée')+'</p>'+
   '<small>'+e(s.strategy?.horizon||'Horizon non renseigné')+'</small></div>';
  if(editable)html+='<div class="w201-actionbar">'+btn('Saisir un cours','quote',s.id,'primary')+
   btn('Stratégie et alertes','strategy',s.id,'soft')+btn('Modifier la fiche','edit-position',s.id,'soft')+'</div>'+
   '<div class="w201-actionbar">'+btn('Acheter','new-buy',s.id,'soft')+
   btn('Vendre','new-sell',s.id,'soft')+'</div>';
  return html+'<div class="w201-footer">'+btn('‹ Positions','tab','positions','link')+'</div>';
 }
 const formHead=(name,desc)=>'<div class="w201-kicker">SAISIE CONTRÔLÉE</div><h2 class="w201-headline">'+e(name)+'</h2><p class="w201-muted">'+e(desc)+'</p>';
 const fld=(label,name,value='',type='text',other='')=>'<label class="w201-field">'+e(label)+
  '<input name="'+e(name)+'" type="'+type+'" value="'+e(value)+'" '+other+'></label>';
 function renderForm(){
  const a=pick(),p=load(a),id=selected,k=screen.replace('form-',''),
   s=p.positions.find(x=>x.id===id),date=today();
  if(!own(a)||isLegacy(a))return '<p class="w201-warning">Modifications non autorisées dans ce compte.</p>'+btn('Retour','account');
  let content='';
  if(k==='cash')content=formHead('Espèces de départ','Montant réellement disponible à la date de reprise.')+
    fld('Date du relevé','date',p.openingDate,'date','required')+
    fld('Espèces initiales ('+p.currency+')','cash',p.openingCashConfirmed?(p.openingCashCents/100).toFixed(2):'','text','required inputmode="decimal"');
  else if(k==='new-position'||k==='edit-position'){
   content=formHead(k==='new-position'?'Nouvelle position initiale':'Modifier la fiche','Les titres initialement détenus ne créent pas un achat fictif.')+
    fld('Nom du titre','name',s?.name||'','text','required maxlength="100"')+
    fld('Symbole (identifiant de la ligne)','symbol',s?.symbol||'','text','required maxlength="16"')+
    '<label class="w201-field">Type<select name="assetType">'+['Action','ETF','Fonds','Obligation','Autre'].map(t=>'<option '+(s?.assetType===t?'selected ':'')+'value="'+t+'">'+t+'</option>').join('')+'</select></label>'+
    fld('Quantité initiale','quantity',s?String(s.quantityMicro/1e6):'','text','required inputmode="decimal"')+
    fld('Prix de revient unitaire ('+p.currency+')','cost',s?.costBasisCents===null?'':s?String(Math.round(s.costBasisCents*1e8/s.quantityMicro)/1e4):'','text','inputmode="decimal"')+
    fld('ISIN (facultatif)','isin',s?.isin||'','text','maxlength="12"')+
    fld('Place MIC (facultatif)','mic',s?.marketMic||'','text','maxlength="4"')+
    fld('Secteur','sector',s?.sector||'','text','maxlength="60"')+
    fld('Géographie','geography',s?.geography||'','text','maxlength="60"');
  }else if(k==='quote'){
   content=formHead('Cours manuel','Saisis un cours daté et sa source. Ce n’est pas un ordre en bourse.')+
    fld('Date du cours','date',date,'date','required')+
    fld('Prix unitaire ('+p.currency+')','price','','text','required inputmode="decimal"')+
    fld('Source / relevé','source','','text','required maxlength="100"')+
    '<label class="w201-field">Nature du cours<select name="kind"><option value="manuel">Manuel</option><option value="clôture">Clôture</option><option value="différé">Différé</option></select></label>';
  }else if(k==='strategy'){
   content=formHead('Ma stratégie','Une information pour ton suivi ; aucune alerte automatique ni ordre.')+
    fld('Thèse d’investissement','thesis',s?.strategy?.thesis||'','text','maxlength="250"')+
    fld('Horizon','horizon',s?.strategy?.horizon||'','text','maxlength="80"')+
    fld('Seuil bas (cours)','priceBelow',s?.strategy?.priceBelow||'','text','inputmode="decimal"')+
    fld('Seuil haut (cours)','priceAbove',s?.strategy?.priceAbove||'','text','inputmode="decimal"')+
    fld('Poids maximal (%)','maxWeight',s?.strategy?.maxWeight||'','text','inputmode="decimal"');
  }else if(k==='operation'){
   const original=selected.startsWith('edit:')?p.operations.find(o=>o.id===selected.slice(5)):null;
   const def=original?.type||(selected.startsWith('sell:')?'sell':selected.startsWith('buy:')?'buy':'deposit');
   content=formHead(original?'Corriger l’opération':'Nouvelle opération','Le journal est rejoué entièrement ; aucun virement bancaire n’est créé.')+
    '<label class="w201-field">Nature<select name="type" id="w201-type">'+Object.entries(labelType).map(([v,t])=>
     '<option value="'+v+'" '+(def===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
    fld('Date','date',original?.date||date,'date','required')+
    '<div class="w201-trade-fields"><label class="w201-field">Titre<select name="securityId">'+p.catalog.map(s=>
      '<option value="'+e(s.id)+'" '+((original?.securityId||selected.split(':')[1])===s.id?'selected':'')+'>'+positionLabel(s)+'</option>').join('')+'</select></label>'+
    fld('Quantité','quantity',original?.quantityMicro?String(original.quantityMicro/1e6):'','text','inputmode="decimal"')+
    fld('Prix unitaire ('+p.currency+')','unitPrice',original?.unitPriceUnits?String(original.unitPriceUnits/1e4):'','text','inputmode="decimal"')+
    fld('Frais ('+p.currency+')','fee',original?String(original.feeCents/100):'0','text','inputmode="decimal"')+'</div>'+
    '<div class="w201-cash-fields">'+fld('Montant ('+p.currency+')','amount',original?.amountCents?String(original.amountCents/100):'','text','inputmode="decimal"')+'</div>'+
    '<div class="w201-impact" id="w201-impact" role="status" aria-live="polite">Saisis les montants pour voir leur effet sur les espèces.</div>';
  }else if(k==='snapshot'){
   content=formHead('Valorisation datée','Enregistre un relevé réel ou calcule depuis les cours datés disponibles.')+
    '<label class="w201-field">Origine de la valeur<select name="mode">'+
    '<option value="broker">Valeur totale du relevé courtier</option>'+
    '<option value="calculated">Calcul à partir des cours enregistrés</option></select></label>'+
    fld('Date de l’instantané','date',date,'date','required')+
    fld('Valeur totale du relevé ('+p.currency+')','value','','text','inputmode="decimal"')+
    fld('Source / référence du relevé','source','','text','maxlength="100"');
  }else if(k==='reconcile'){
   content=formHead('Rapprocher au relevé','Cette étape contrôle la valeur totale du portefeuille. Les informations doivent venir du courtier.')+
    fld('Date du relevé','date',date,'date','required')+
    fld('Valeur totale du relevé ('+p.currency+')','value','','text','required inputmode="decimal"')+
    fld('Référence du relevé','source','','text','required maxlength="100"')+
    '<label class="w201-confirm"><input name="approved" type="checkbox" required> J’ai comparé les espèces, les positions et les cours avec mon relevé courtier.</label>'+
    '<p class="w201-fine">Si un écart existe ou si un cours manque, l’activation reste bloquée.</p>';
  }
  return '<form id="w201-form" data-kind="'+e(k)+'">'+content+
   '<p id="w201-error" class="w201-error" role="alert"></p>'+
   '<div class="w201-actionbar"><button type="submit" class="w201-btn primary" id="w201-save">Enregistrer</button>'+
   btn('Annuler','cancel','','soft')+'</div></form>';
 }
 function html(){
  if(screen==='home')return renderHome();
  if(screen==='position')return renderPosition();
  if(screen.startsWith('form-'))return renderForm();
  return renderAccount();
 }
 function draw(){
  if(!host)return;
  host.openSheet('Investissements · TRACE 2.0.1','<div class="w201" id="w201-root">'+
   (error?'<p class="w201-error" role="alert">'+e(error)+'</p>':'')+html()+'</div>');
  const rootNode=document.querySelector('#w201-root');
  rootNode.querySelectorAll('[data-w201]').forEach(button=>button.addEventListener('click',()=>handle(button.dataset.w201,button.dataset.id||'')));
  const form=rootNode.querySelector('#w201-form');
  if(form)form.addEventListener('submit',event=>{event.preventDefault();submit(form).catch(ex=>showError(ex));});
  const type=form?.querySelector('#w201-type');
  if(type){
   const sync=()=>{const trade=['buy','sell'].includes(type.value);
    form.querySelector('.w201-trade-fields').hidden=!trade;
    form.querySelector('.w201-cash-fields').hidden=trade;
    preview(form);
   };
   type.addEventListener('change',sync);
   form.addEventListener('input',()=>preview(form));
   sync();
  }
 }
 function showError(ex){const n=document.querySelector('#w201-error');if(n)n.textContent=String(ex.message||ex);else{error=String(ex.message||ex);draw();}}
 function preview(form){
  if(!form||!form.querySelector('#w201-impact'))return;
  const out=form.querySelector('#w201-impact');
  try{
   const fd=new FormData(form),p=load(pick()),op=operationFrom(fd,p,true),
    original=selected.startsWith('edit:')?p.operations.find(x=>x.id===selected.slice(5)):null;
   if(original)op.id=original.id;
   const estimate=E.previewOperation(p,op,original?.id||null);
   out.textContent='Espèces après : '+fmt(estimate.cashAfterCents,p.currency)+
    ' · variation : '+fmt(estimate.deltaCashCents,p.currency)+
    (op.type==='sell'?' · gain réalisé : '+fmt(estimate.deltaRealizedCents,p.currency):'');
  }catch{out.textContent='Complète les montants pour prévisualiser le solde avant enregistrement.';}
 }
 function operationFrom(fd,p,previewOnly=false){
  const get=k=>String(fd.get(k)||'').trim(),type=get('type'),date=get('date');
  if(!within(date,p.openingDate))throw Error('Date postérieure à la reprise et non future obligatoire.');
  const op={id:previewOnly?'w201-preflight':mkid(),type,date,
   amountCents:0,feeCents:0,quantityMicro:0,unitPriceUnits:0};
  if(type==='buy'||type==='sell'){
   op.securityId=get('securityId');
   if(!p.catalog.some(s=>s.id===op.securityId))throw Error('Sélectionne un titre existant.');
   op.quantityMicro=E.quantity(get('quantity'));
   op.unitPriceUnits=E.price(get('unitPrice'));
   op.feeCents=E.cents(get('fee')||'0');
  }else if(['deposit','withdrawal','dividend','fee'].includes(type))
   op.amountCents=E.cents(get('amount'));
  else throw Error('Type d’opération invalide');
  return op;
 }
 async function save(account,portfolio){
  if(saving)throw Error('Un enregistrement est déjà en cours.');
  const c=context();
  if(account.owner!==c.viewer)throw Error('Compte du partenaire : consultation seule.');
  if(isLegacy(account))throw Error('Journal TRACE historique présent : reprise sans doublons requise.');
  E.evaluate(portfolio);
  saving=true;
  const submit=document.querySelector('#w201-save');if(submit)submit.disabled=true;
  try{
   await host.save(account.id,portfolio);
   error='';
   return true;
  }finally{saving=false;}
 }
 async function submit(form){
  const a=pick(),p=load(a),fd=new FormData(form),get=k=>String(fd.get(k)||'').trim(),kind=form.dataset.kind;
  let next=p;
  if(kind==='cash'){
   const date=get('date'),cash=E.cents(get('cash'));
   if(!E.dateValid(date)||date>today())throw Error('Date du relevé invalide.');
   if(p.operations.some(o=>o.date<date))throw Error('Le solde initial ne peut pas être déplacé après les opérations.');
   next={...p,openingDate:date,openingCashCents:cash,openingCashConfirmed:true};
  }else if(kind==='new-position'||kind==='edit-position'){
   const symbol=get('symbol').toUpperCase(),name=get('name');
   if(!/^[A-Z0-9._-]{1,16}$/.test(symbol)||!name||name.length>100)throw Error('Nom et symbole obligatoires.');
   const quantity=E.quantity(get('quantity'));
   if(quantity===0)throw Error('Quantité positive obligatoire.');
   const cost=get('cost')?E.tradeCents(quantity,E.price(get('cost'))):null;
   const isin=get('isin').toUpperCase(),marketMic=get('mic').toUpperCase();
   if(isin&&!E.isinValid(isin))throw Error('ISIN invalide.');
   if(marketMic&&!E.micValid(marketMic))throw Error('MIC invalide.');
   const fields={name,symbol,assetType:get('assetType'),isin,marketMic,
    sector:get('sector'),geography:get('geography'),quantityMicro:quantity,costBasisCents:cost};
   if(kind==='new-position'){
    if(p.catalog.some(s=>s.symbol===symbol))throw Error('Symbole déjà suivi dans ce portefeuille.');
    const item={id:mkid(),...fields,strategy:{}};
    next={...p,positions:[...p.positions,item],catalog:[...p.catalog,item]};
   }else{
    if(p.operations.some(o=>o.securityId===selected))throw Error('Corrige d’abord les opérations de ce titre.');
    if(p.positions.some(s=>s.id!==selected&&s.symbol===symbol))throw Error('Symbole déjà utilisé.');
    next={...p,positions:p.positions.map(s=>s.id===selected?{...s,...fields}:s),
     catalog:p.catalog.map(s=>s.id===selected?{...s,...fields}:s)};
   }
  }else if(kind==='quote'){
   const date=get('date');
   if(!within(date,p.openingDate))throw Error('Date du cours invalide.');
   next=E.setQuote(p,selected,{priceUnits:E.price(get('price')),date,
    source:get('source'),kind:get('kind')});
  }else if(kind==='strategy'){
   for(const key of ['priceBelow','priceAbove'])if(get(key))E.price(get(key));
   const max=get('maxWeight').replace(',','.');
   if(max&&(!(Number(max)>0)||Number(max)>100))throw Error('Concentration maximale entre 0 et 100 %.');
   const item=p.positions.find(x=>x.id===selected);
   if(!item)throw Error('Position introuvable');
   const strategy={thesis:get('thesis'),horizon:get('horizon'),
    priceBelow:get('priceBelow'),priceAbove:get('priceAbove'),maxWeight:max};
   next={...p,positions:p.positions.map(s=>s.id===selected?{...s,strategy}:s),
    catalog:p.catalog.map(s=>s.id===selected?{...s,strategy}:s)};
  }else if(kind==='operation'){
   const old=selected.startsWith('edit:')?p.operations.find(x=>x.id===selected.slice(5)):null;
   if(selected.startsWith('edit:')&&!old)throw Error('Opération à corriger introuvable.');
   const op=operationFrom(fd,p,false);
   if(old)op.id=old.id;
   next=E.appendOperation(p,op,old?.id||null);
  }else if(kind==='snapshot'){
   const date=get('date');
   if(!within(date,p.openingDate)||p.snapshots.some(x=>x.date===date))throw Error('Date unique obligatoire.');
   let snapshot;
   if(get('mode')==='broker'){
    const source=get('source');
    if(!source)throw Error('La source du relevé est obligatoire.');
    snapshot={date,valueCents:E.cents(get('value')),source:'Relevé courtier : '+source,estimated:false};
   }else if(get('mode')==='calculated')snapshot=E.snapshotAt(p,date);
   else throw Error('Type de valorisation invalide.');
   next={...p,snapshots:[...p.snapshots,snapshot].sort((a,b)=>a.date.localeCompare(b.date))};
  }else if(kind==='reconcile'){
   if(fd.get('approved')!=='on')throw Error('Confirme la comparaison du relevé.');
   next=reconcile(p,{date:get('date'),value:get('value'),source:get('source')});
  }else throw Error('Action inconnue.');
  // Keep the historical broker baseline on later, sourced operations/quotes.
  // A retroactive change affecting that baseline requires new reconciliation.
  if(['cash','new-position','edit-position'].includes(kind)||
    kind==='operation'&&p.brokerVerification&&next.operations.some(o=>
     !p.operations.some(prev=>prev.id===o.id)&&o.date<=p.brokerVerification.date)||
    kind==='quote'&&p.brokerVerification&&get('date')<=p.brokerVerification.date)
   next=invalidate(next);
  E.evaluate(next);
  await save(a,next);
  screen=kind==='quote'||kind==='strategy'||kind==='edit-position'?'position':'positions';
  if(kind==='operation')screen='operations';
  if(kind==='snapshot'||kind==='reconcile')screen='analysis';
  draw();
 }
 function handle(action,id){
  error='';
  if(action==='home'){screen='home';accountId='';selected='';draw();return;}
  if(action==='account'){accountId=id||accountId;screen='positions';selected='';draw();return;}
  if(action==='tab'){screen=id;selected='';draw();return;}
  if(action==='filter'){filter=id;draw();return;}
  if(action==='metric'){chartMode=id==='flows'?'flows':'value';draw();return;}
  if(action==='period'){if(!['1','3','6','12','all'].includes(id))return;chartPeriod=id;draw();return;}
  if(action==='position'){selected=id;screen='position';draw();return;}
  if(action==='cancel'){screen=selected?'position':'positions';draw();return;}
  const p=load(pick()),a=pick();
  if(!own(a)||isLegacy(a))return showError(Error('Compte en consultation seule.'));
  if(['cash','new-position','edit-position','quote','strategy','snapshot','reconcile'].includes(action)){
   if(['quote','strategy','edit-position'].includes(action))selected=id||selected;
   screen='form-'+action;draw();return;
  }
  if(['new-operation','new-buy','new-sell','edit-operation'].includes(action)){
   selected=action==='new-buy'?'buy:'+id:action==='new-sell'?'sell:'+id:
    action==='edit-operation'?'edit:'+id:'';
   screen='form-operation';draw();return;
  }
 }
 function open(id=''){
  const list=accounts();
  if(id&&list.some(a=>a.id===id)){accountId=id;screen='positions';}
  else{accountId='';screen='home';}
  selected='';error='';filter='all';chartPeriod='all';draw();
 }
 function connect(h){if(!h||typeof h.context!=='function'||typeof h.save!=='function'||typeof h.openSheet!=='function')throw Error('Hôte TRACE 2.0.1 incomplet');host=h;return true;}
 return Object.freeze({connect,open,blank,load,reconcile,productionSummary,evaluateStrict});
});
