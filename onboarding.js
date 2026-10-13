(() => {
'use strict';

const VERSION='v3';
let index=0;
let active=false;
let currentKey='';
let resizeTimer=null;

const icons={
  guide:'<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12H7.5A2.5 2.5 0 0 1 5 16.5v-12Z"/><path d="M7.5 19A2.5 2.5 0 0 1 5 16.5 2.5 2.5 0 0 1 7.5 14H18"/><path d="M9 8h5M9 11h4"/>',
  home:'<path d="M3.5 10.5 12 3.75l8.5 6.75"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.5 20v-6h5v6"/>',
  budget:'<path d="M4 7.5h16"/><path d="M6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><path d="M15.5 13h4.5"/>',
  activity:'<path d="M7 4v16M4.5 6.5 7 4l2.5 2.5"/><path d="M17 20V4M14.5 17.5 17 20l2.5-2.5"/>',
  heart:'<path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5C4 5.8 5.9 4 8.3 4c1.6 0 3 .8 3.7 2 .7-1.2 2.1-2 3.7-2C18.1 4 20 5.8 20 8.5Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  wealth:'<path d="M4 18.5V13l4-3 4 2 4-6 4 2.5"/><path d="M4 20h16"/>',
  user:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>'
};

const steps=[
  {
    page:'home', target:'.brand', icon:'guide', kicker:'Guide complet · environ 3 min',
    title:'Bienvenue sur Trace',
    body:'Trace sert à prévoir le mois, enregistrer ce qui s’est vraiment passé, puis comprendre votre situation sans multiplier les saisies.',
    points:[
      'Une opération doit exister une seule fois dans Trace : elle alimente ensuite budget, activité, partage et analyses.',
      'Moi affiche tes chiffres ; Couple affiche les données communes ou combinées.',
      'Le cycle à retenir : Prévoir → importer ou saisir → valider → comprendre.'
    ]
  },
  {
    page:'home', target:'[data-page="home"] .hero-card', icon:'home', kicker:'Accueil · Synthèse',
    title:'Commence toujours par l’Accueil',
    body:'L’Accueil te donne l’état du mois sans avoir à parcourir toute l’app.',
    points:[
      'Disponible sur le budget = budget de dépenses prévu moins dépenses déjà validées.',
      'Solde estimé = comptes bancaires suivis moins dette de carte, à partir des soldes de référence et des opérations enregistrées.',
      'Le statut de rapprochement indique si Trace a récemment été comparé au vrai solde bancaire.',
      'Le bouton Moi / Couple change uniquement le périmètre de lecture.'
    ]
  },
  {
    page:'home', target:'.grid.grid-3', icon:'wealth', kicker:'Accueil · Indicateurs & analyses',
    title:'Les chiffres importants sont interactifs',
    body:'Revenus, Dépenses et Épargne sont des portes d’entrée vers le détail du mois.',
    points:[
      'Revenus ouvre les entrées d’argent du mois.',
      'Dépenses ouvre les sorties classées dans Trace.',
      'Épargne correspond au flux net du mois : revenus moins dépenses.',
      'Évolution et Analyses servent à comparer plusieurs mois et peuvent être consultées en Moi ou Couple.'
    ]
  },
  {
    page:'budget', target:'#budgetPeriodControl', icon:'budget', kicker:'Budget · Prévision',
    title:'Le Budget définit le cadre du mois',
    body:'Cette section sépare clairement ce que vous prévoyez de ce qui s’est réellement produit.',
    points:[
      'Choisis librement le mois avec les flèches ou le sélecteur de date.',
      'Copier le mois précédent reprend les montants du même périmètre sans toucher aux transactions réelles.',
      'Revenus, dépenses fixes et dépenses variables sont présentés séparément.',
      'Le budget personnel et le budget Couple ont chacun leur vue ; la vue annuelle compare prévu et réel.'
    ]
  },
  {
    page:'activity', tab:'transactions', target:'#activityTransactions .activity-stats', icon:'activity', kicker:'Activité · Transactions',
    title:'Activité est le journal financier',
    body:'C’est ici que tu retrouves les opérations qui expliquent réellement les chiffres de Trace.',
    points:[
      'Transactions contient les opérations déjà confirmées.',
      'Le haut de l’écran résume dépenses, revenus et flux net du mois.',
      'Chaque opération conserve sa date, son montant, sa catégorie et à qui elle appartient.',
      'Les transferts et remboursements doivent être distingués des revenus et dépenses pour éviter les doubles comptes.'
    ]
  },
  {
    page:'activity', tab:'review', target:'#activityTabs [data-tab="review"]', icon:'activity', kicker:'Activité · À valider',
    title:'Valide avant de laisser une opération compter',
    body:'Les opérations importées ou incertaines passent par À valider avant d’alimenter le budget et les analyses.',
    points:[
      'Vérifie la catégorie : épicerie, restaurant, logement, transport, etc.',
      'Vérifie Pour qui ? : toi, ton partenaire ou vous deux.',
      'Pour une dépense commune, contrôle la répartition 50/50 ou personnalisée.',
      'Le but est simple : une donnée propre une fois, puis réutilisée partout.'
    ]
  },
  {
    page:'activity', tab:'import', target:'#activityImport .drop', icon:'plus', kicker:'Activité · Import & ajout',
    title:'Ajoute les opérations de la façon la plus simple',
    body:'Trace est pensé pour limiter la saisie manuelle et rapprocher facilement l’app de la banque.',
    points:[
      'Importer accepte les fichiers prévus pour le suivi bancaire : CSV, capture ou PDF selon le flux activé.',
      'Les doublons doivent être écartés avant validation pour ne jamais compter deux fois la même opération.',
      'Le bouton + sert à l’ajout manuel : cash, remboursement ou opération manquante.',
      'L’extraction intelligente image/PDF et certains formulaires sont encore activés progressivement dans cette V5.'
    ]
  },
  {
    page:'home', target:'#shareCard', icon:'heart', kicker:'Partage · Couple',
    title:'Le Partage suit qui a avancé quoi',
    body:'Une dépense commune peut servir au budget tout en mettant à jour automatiquement le solde entre vous deux.',
    points:[
      'Indique qui a payé et pour qui était la dépense.',
      'Une dépense commune peut être répartie 50/50 ou selon votre répartition préférée.',
      'Le solde de Partage est continu : il ne repart pas à zéro chaque mois.',
      'Un remboursement entre vous règle le solde sans créer un faux revenu ou une fausse dépense.'
    ]
  },
  {
    page:'home', action:'analysis', target:'#analysisScope', icon:'wealth', kicker:'Analyses · Comprendre',
    title:'Passe du chiffre à l’explication',
    body:'Les analyses servent à voir les tendances plutôt qu’une simple liste de transactions.',
    points:[
      'Compare dépenses, budget et épargne sur plusieurs mois.',
      'Repère les catégories qui consomment le plus de budget.',
      'Le sélecteur Moi / Couple recalcule les indicateurs selon le périmètre choisi.',
      'L’objectif est d’aider à décider, pas d’ajouter des tableaux inutiles.'
    ]
  },
  {
    page:'wealth', target:'[data-page="wealth"] .hero-card', icon:'wealth', kicker:'Patrimoine · Long terme',
    title:'Patrimoine regroupe ce que vous possédez',
    body:'Cette vue complète le budget mensuel avec une lecture plus long terme.',
    points:[
      'Liquidités, épargne et comptes d’investissement sont regroupés au même endroit.',
      'Moi / Couple permet de suivre ton patrimoine personnel ou l’ensemble suivi.',
      'Les comptes d’investissement sont prévus pour conserver positions et opérations datées : achats, ventes, dividendes, frais et versements.',
      'Les analyses distingueront contributions et performance pour éviter de confondre argent versé et rendement.'
    ]
  },
  {
    page:'home', action:'profile', target:'#sheetBody .profile-menu', icon:'user', kicker:'Profil & paramètres',
    title:'Configure Trace une fois, puis garde-le fiable',
    body:'Le Profil contient les réglages qui structurent tous les calculs de l’app.',
    points:[
      'Mon profil : identité et devise principale.',
      'Mon couple : partenaire et répartition par défaut.',
      'Mes comptes : soldes et dates de référence ; Rapprochement : comparaison avec la banque.',
      'Notifications : validations, import et rapprochement ; Données & confidentialité : date de référence, solde Partage d’ouverture et sauvegarde.',
      'Guide express permet de relancer cette formation à tout moment.'
    ]
  },
  {
    page:'home', target:'.brand', icon:'guide', kicker:'Routine recommandée',
    title:'La bonne routine tient en quelques minutes',
    body:'Trace reste simple si tu le mets à jour régulièrement au lieu de tout corriger en fin de mois.',
    points:[
      'Début de mois : vérifie ou prépare le budget.',
      'Tous les 3 à 7 jours : importe les nouvelles opérations et valide ce qui demande ton avis.',
      'Une fois par semaine : rapproche Trace du vrai solde bancaire.',
      'Fin de mois : regarde l’épargne, les écarts de budget, le Partage et l’évolution du patrimoine.'
    ]
  }
]

function $(s){return document.querySelector(s)}
function $$(s){return [...document.querySelectorAll(s)]}
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.guide)+'</svg>'}
function key(){
  const who=document.documentElement.dataset.traceUserId||($('#profileBtn')?.textContent||'user').trim().toLowerCase().replace(/\s+/g,'-');
  return 'trace:onboarding:'+VERSION+':'+who;
}
function seen(){
  try{return localStorage.getItem(key())==='done'}catch{return false}
}
function markSeen(){
  try{localStorage.setItem(currentKey||key(),'done')}catch{}
}
function ensureMarkup(){
  if($('#traceGuide'))return;
  const el=document.createElement('div');
  el.id='traceGuide';
  el.className='trace-guide hidden';
  el.innerHTML=
    '<div class="trace-guide-spot" id="traceGuideSpot"></div>'+
    '<section class="trace-guide-card" id="traceGuideCard" role="dialog" aria-modal="true" aria-labelledby="traceGuideTitle">'+
      '<div class="trace-guide-top"><span id="traceGuideStep"></span><button id="traceGuideSkip" type="button">Passer</button></div>'+
      '<div class="trace-guide-progress"><i id="traceGuideProgress"></i></div>'+
      '<div class="trace-guide-icon" id="traceGuideIcon"></div>'+
      '<div class="trace-guide-kicker" id="traceGuideKicker"></div>'+
      '<h2 id="traceGuideTitle"></h2>'+
      '<p id="traceGuideBody"></p>'+
      '<details class="trace-guide-details" id="traceGuideDetails"><summary>Voir les explications détaillées</summary><ul id="traceGuidePoints"></ul></details>'+
      '<div class="trace-guide-actions"><button class="secondary" id="traceGuideBack" type="button">Retour</button><button class="primary" id="traceGuideNext" type="button">Suivant</button></div>'+
    '</section>';
  document.body.appendChild(el);
  $('#traceGuideSkip').onclick=()=>finish(true);
  $('#traceGuideBack').onclick=()=>{if(index>0){index--;render()}};
  $('#traceGuideNext').onclick=()=>index===steps.length-1?finish(false):(index++,render());
}
function go(page,step){
  document.querySelector('#closeSheet')?.click();
  const nav=document.querySelector('[data-nav="'+page+'"]');
  if(nav)nav.click();
  if(page==='activity'){
    const tabName=step?.tab||'transactions';
    document.querySelector('[data-tab="'+tabName+'"]')?.click();
  }
  if(step?.action==='analysis'){
    setTimeout(()=>document.querySelector('#analysisBtn')?.click(),40);
  }
  if(step?.action==='profile'){
    setTimeout(()=>document.querySelector('#profileBtn')?.click(),40);
  }
}
function start(replay=false){
  if(!replay&&seen())return;
  ensureMarkup();
  currentKey=key();
  index=0;
  active=true;
  document.body.classList.add('trace-guide-open');
  $('#traceGuide').classList.remove('hidden');
  render();
}
function finish(skipped){
  if(!active)return;
  active=false;
  markSeen();
  $('#traceGuide')?.classList.add('hidden');
  document.body.classList.remove('trace-guide-open');
  go('home',null);
  if(!skipped)setTimeout(()=>$('#profileBtn')?.click(),180);
}
function render(){
  const s=steps[index];
  go(s.page,s);
  $('#traceGuideStep').textContent='Étape '+(index+1)+' sur '+steps.length;
  $('#traceGuideProgress').style.width=((index+1)/steps.length*100)+'%';
  $('#traceGuideIcon').innerHTML=svg(s.icon);
  $('#traceGuideKicker').textContent=s.kicker;
  $('#traceGuideTitle').textContent=s.title;
  $('#traceGuideBody').textContent=s.body;
  $('#traceGuidePoints').innerHTML=s.points.map(p=>'<li>'+escapeHtml(p)+'</li>').join('');
  $('#traceGuideDetails').open=false;
  $('#traceGuideBack').disabled=index===0;
  $('#traceGuideNext').textContent=index===steps.length-1?'Terminer':'Suivant';
  setTimeout(()=>focusTarget(s.target),80);
}
function escapeHtml(v){
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function focusTarget(selector){
  const target=$(selector);
  const spot=$('#traceGuideSpot');
  if(!target||!spot){spot?.classList.add('hidden');return}
  spot.classList.remove('hidden');
  const fixed=selector==='#quickAdd'||selector==='#profileBtn';
  if(!fixed){
    const r=target.getBoundingClientRect();
    const margin=window.innerWidth<=760?150:100;
    if(r.top<margin||r.bottom>window.innerHeight-margin){
      target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    }
  }
  setTimeout(updateSpot,fixed?20:260);
}
function updateSpot(){
  if(!active)return;
  const target=$(steps[index]?.target);
  const spot=$('#traceGuideSpot');
  const card=$('#traceGuideCard');
  if(!target||!spot||!card)return;
  const r=target.getBoundingClientRect(),pad=7;
  spot.style.left=Math.max(6,r.left-pad)+'px';
  spot.style.top=Math.max(6,r.top-pad)+'px';
  spot.style.width=Math.min(window.innerWidth-12,r.width+pad*2)+'px';
  spot.style.height=Math.min(window.innerHeight-12,r.height+pad*2)+'px';
  spot.style.borderRadius=getComputedStyle(target).borderRadius||'16px';

  card.style.left='';card.style.right='';card.style.top='';card.style.bottom='';card.style.transform='';
  card.dataset.placement='';
  const vw=window.innerWidth,vh=window.innerHeight,gap=12;
  const cr=card.getBoundingClientRect();
  const cw=cr.width||280,ch=Math.min(cr.height||220,Math.max(180,vh*.34));

  if(vw<=760){
    card.style.left='50%';
    card.style.transform='translateX(-50%)';
    const safeTop=Math.max(58,Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))||58);
    const safeBottom=82;
    const above=r.top-safeTop;
    const below=vh-safeBottom-r.bottom;
    if(below>=ch+gap){
      card.style.top=Math.min(vh-safeBottom-ch,r.bottom+gap)+'px';
      card.dataset.placement='below';
    }else if(above>=ch+gap){
      card.style.top=Math.max(safeTop,r.top-ch-gap)+'px';
      card.dataset.placement='above';
    }else if((r.top+r.bottom)/2<vh/2){
      card.style.bottom=(safeBottom-8)+'px';
      card.dataset.placement='below';
    }else{
      card.style.top=safeTop+'px';
      card.dataset.placement='above';
    }
  }else{
    const safe=24;
    const rightSpace=vw-r.right-safe;
    const leftSpace=r.left-safe;
    if(rightSpace>=cw+gap){
      card.style.left=(r.right+gap)+'px';
      card.style.top=Math.max(safe,Math.min(vh-ch-safe,r.top))+'px';
      card.dataset.placement='right';
    }else if(leftSpace>=cw+gap){
      card.style.left=Math.max(safe,r.left-cw-gap)+'px';
      card.style.top=Math.max(safe,Math.min(vh-ch-safe,r.top))+'px';
      card.dataset.placement='left';
    }else if(r.top>ch+gap+safe){
      card.style.left=Math.max(safe,Math.min(vw-cw-safe,r.left))+'px';
      card.style.top=Math.max(safe,r.top-ch-gap)+'px';
      card.dataset.placement='above';
    }else{
      card.style.left=Math.max(safe,Math.min(vw-cw-safe,r.left))+'px';
      card.style.top=Math.min(vh-ch-safe,r.bottom+gap)+'px';
      card.dataset.placement='below';
    }
  }
}
function injectReplayButton(){
  if($('#traceGuideReplay'))return;
  const body=$('#sheetBody');
  if(!body||!body.querySelector('.profile-menu'))return;
  const groups=[...body.querySelectorAll('.settings-group')];
  const prefs=groups.find(g=>g.querySelector('.settings-group-title')?.textContent.trim()==='Préférences')||groups.at(-1);
  if(!prefs)return;
  const btn=document.createElement('button');
  btn.id='traceGuideReplay';
  btn.className='profile-action settings-row';
  btn.innerHTML='<span class="pico">'+svg('guide')+'</span><span class="pmain"><b>Guide express</b><small>Revoir les 12 étapes de prise en main</small></span><span class="profile-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>';
  btn.onclick=()=>{document.querySelector('#closeSheet')?.click();setTimeout(()=>start(true),100)};
  prefs.insertBefore(btn,prefs.children[1]||null);
}
function watchProfile(){
  const body=$('#sheetBody');
  if(!body)return;
  const observer=new MutationObserver(()=>injectReplayButton());
  observer.observe(body,{childList:true,subtree:true});
}
function autoStartWhenReady(){
  const started=Date.now();
  const timer=setInterval(()=>{
    const app=$('#app');
    if(app&&!app.classList.contains('cloud-locked')&&$('#profileBtn')){
      clearInterval(timer);
      setTimeout(()=>{if(!seen())start(false)},700);
    }else if(Date.now()-started>15000)clearInterval(timer);
  },250);
}
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(updateSpot,80)},{passive:true});
window.addEventListener('scroll',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(updateSpot,50)},{passive:true,capture:true});
window.TraceGuide={start};
function bootTraceGuide(){
  ensureMarkup();
  watchProfile();
  $('#helpBtn')?.addEventListener('click',()=>start(true));
  autoStartWhenReady();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootTraceGuide,{once:true});
}else{
  bootTraceGuide();
}
})();