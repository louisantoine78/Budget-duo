(() => {
'use strict';

const VERSION='v5';
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
    page:'home',target:'.brand',icon:'guide',kicker:'Guide express · environ 2 min',
    title:'Bienvenue sur TRACE',
    body:'TRACE réunit ton budget, tes comptes, tes imports bancaires et ton patrimoine. Chaque foyer possède son espace privé.',
    points:['Moi affiche ta part, Couple votre vision commune.','Chaque personne se connecte avec son propre compte.']
  },
  {
    page:'home',target:'#balanceCard',icon:'home',kicker:'01 · Accueil',
    title:'Budget et argent disponible : deux choses',
    body:'Le compte courant mesure ton argent disponible. La carte indique ta dette. La marge du mois = revenus moins dépenses, pas les versements au CELI.',
    points:['Un virement vers un CELI diminue le courant mais ne compte pas comme une dépense.','Le montant versé aux CELI ce mois est affiché séparément.','Les soldes sont estimatifs à partir de tes références et opérations confirmées.']
  },
  {
    page:'budget',target:'#budgetPeriodControl',icon:'budget',kicker:'02 · Budget',
    title:'Prépare tes enveloppes du mois',
    body:'Renseigne tes revenus prévus et tes postes de dépenses. Tu peux personnaliser les catégories et répartir le budget entre vous deux.',
    points:['Moi montre ta part ; Couple affiche le budget commun.','Les objectifs de versements CELI distincts du budget de dépenses sont une évolution à venir.']
  },
  {
    page:'home',target:'#quickAdd',icon:'plus',kicker:'03 · Ajouter',
    title:'Une dépense à saisir ?',
    body:'Le bouton + crée manuellement une opération si tu ne souhaites pas importer une capture.',
    points:['Choisis le compte débité, la catégorie et la personne concernée.','Pour une dépense avec des amis, renseigne leur part pour ne pas la compter dans le couple.']
  },
  {
    page:'activity',tab:'transactions',target:'#activityTransactions',icon:'activity',kicker:'04 · Activité · Transactions',
    title:'Retrouve les mouvements confirmés',
    body:'Transactions conserve les dépenses, revenus, remboursements et virements déjà validés.',
    points:['Une transaction enregistrée peut être ouverte et corrigée.','Les remboursements de carte ou virements entre tes comptes ne créent pas une deuxième dépense.']
  },
  {
    page:'activity',tab:'import',target:'#importCalendar',icon:'activity',kicker:'05 · Activité · Importer',
    title:'D’abord le compte, ensuite les captures',
    body:'Choisis Compte courant ou Carte de crédit, puis importe uniquement les captures de ce compte. Le calendrier suit les journées à compléter.',
    points:['TRACE cherche les dates, montants et commerçants de chaque ligne bancaire.','Aucune opération douteuse ne doit être confirmée automatiquement.','Les PDF et CSV servent également au contrôle des relevés.']
  },
  {
    page:'activity',tab:'import',target:'#importCalendar',icon:'guide',kicker:'06 · Vérification intelligente',
    title:'Relis, classe puis confirme',
    body:'Ouvre une journée puis une opération. La ligne originale de ta capture apparaît dans TRACE pour comparer date, montant et description.',
    points:['Les catégories sont proposées selon des règles et tes choix précédemment validés.','Une alerte rouge signale un doublon possible ; garde une ligne et écarte la copie seulement après comparaison.','Si un montant OCR est incertain, confirme toi-même sa lecture avant validation.']
  },
  {
    page:'home',target:'#balanceCard',icon:'budget',kicker:'07 · Carte et épargne',
    title:'Un transfert ne double jamais le budget',
    body:'Un paiement de carte réduit le courant et la dette de carte. Un versement CELI réduit le courant et augmente le placement suivi.',
    points:['Paiement de carte : hors dépenses, destinataire = ta carte.','Versement CELI : hors dépenses, destinataire = le CELI choisi.','Ces mouvements influencent les soldes mais pas les dépenses de consommation.']
  },
  {
    page:'wealth',target:'[data-page="wealth"] .hero-card',icon:'wealth',kicker:'08 · Patrimoine',
    title:'Suis tes placements séparément',
    body:'Ajoute un CELI avec son solde initial daté pour suivre les versements après cette date, ou enregistre tes autres placements.',
    points:['Un virement vers un CELI est lié à sa transaction bancaire d’origine.','Les soldes des placements restent estimatifs et ne doivent pas être doublés.']
  },
  {
    page:'home',target:'#shareCard',icon:'heart',kicker:'09 · Couple',
    title:'Une application, votre foyer partagé',
    body:'Deux comptes personnels peuvent rejoindre le même foyer via un code d’invitation. Vous partagez le budget, mais chacun conserve ses comptes bancaires.',
    points:['Chaque couple possède un foyer indépendant des autres.','La répartition Moi / Couple et les remboursements entre vous sont distincts des dépenses des amis.']
  },
  {
    page:'home',action:'profile',target:'#sheetBody .settings-group',icon:'user',kicker:'10 · Profil et réglages',
    title:'Configure, invite et revois le guide',
    body:'Dans le profil, retrouve les comptes, les soldes de référence, le code pour inviter ton partenaire et le Guide express à tout moment.',
    points:['Vérifie les soldes initiaux et leurs dates avant tes premiers imports.','Les changements restent synchronisés avec ton foyer.','Une première prise en main avec de fausses opérations est recommandée.']
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
  if(!body||!body.querySelector('.settings-group'))return;
  const groups=[...body.querySelectorAll('.settings-group')];
  const prefs=groups.find(g=>g.querySelector('.settings-group-title')?.textContent.trim()==='Préférences')||groups.at(-1);
  if(!prefs)return;
  const btn=document.createElement('button');
  btn.id='traceGuideReplay';
  btn.className='profile-action settings-row';
  btn.innerHTML='<span class="pico">'+svg('guide')+'</span><span class="pmain"><b>Guide express</b><small>Revoir les '+steps.length+' étapes de prise en main</small></span><span class="profile-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>';
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