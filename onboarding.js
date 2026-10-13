(() => {
'use strict';

const VERSION='v1';
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
    page:'home', target:'.brand', icon:'guide', kicker:'Guide express',
    title:'Bienvenue sur Trace',
    body:'Trace rassemble budget, opérations, partage à deux et patrimoine dans une seule app.',
    points:['Une opération n’est saisie qu’une fois.','Les vues Moi et Couple restent distinctes.','Ce guide prend environ 2 minutes.']
  },
  {
    page:'home', target:'[data-page="home"] .hero-card', icon:'home', kicker:'Accueil',
    title:'Ta situation en un coup d’œil',
    body:'L’Accueil répond d’abord à une question : où en es-tu maintenant ?',
    points:['Budget disponible et solde estimé en premier.','Revenus, dépenses et épargne donnent accès au détail.','Moi / Couple change uniquement la vue affichée.']
  },
  {
    page:'budget', target:'[data-page="budget"] .hero-card', icon:'budget', kicker:'Budget',
    title:'Prévoir avant de dépenser',
    body:'Le Budget organise le mois sans transformer Trace en tableur.',
    points:['Revenus, dépenses fixes et variables sont séparés.','Passe de Moi à Couple selon le budget consulté.','La vue annuelle compare le prévu et le réel.']
  },
  {
    page:'activity', target:'#activityTabs', icon:'activity', kicker:'Activité',
    title:'Toutes les opérations au même endroit',
    body:'Activité est le centre de contrôle des transactions.',
    points:['Transactions : ce qui est déjà validé.','À valider : catégorie, bénéficiaire et répartition.','Importer : capture, PDF ou CSV avant validation.']
  },
  {
    page:'home', target:'#shareCard', icon:'heart', kicker:'Partage',
    title:'Savoir qui doit quoi',
    body:'Les dépenses communes alimentent automatiquement votre solde de Partage.',
    points:['Une dépense peut être personnelle ou commune.','La répartition peut être 50/50 ou personnalisée.','Le solde reste continu d’un mois à l’autre.']
  },
  {
    page:'home', target:'#quickAdd', icon:'plus', kicker:'Ajout rapide',
    title:'Ajouter quand il le faut',
    body:'Le bouton central sert aux opérations que tu veux saisir immédiatement.',
    points:['Utile pour cash, remboursement ou opération manquante.','Pour les opérations bancaires, l’import reste le flux principal.']
  },
  {
    page:'wealth', target:'[data-page="wealth"] .hero-card', icon:'wealth', kicker:'Patrimoine',
    title:'Suivre ce que vous construisez',
    body:'Patrimoine regroupe liquidités, épargne et investissements.',
    points:['Moi / Couple change le périmètre suivi.','Les comptes d’investissement regroupent positions et opérations.','Les analyses séparent progressivement contributions et performance.']
  },
  {
    page:'home', target:'#profileBtn', icon:'user', kicker:'Profil & routine',
    title:'Garder Trace fiable dans le temps',
    body:'Ton profil regroupe les réglages utiles et la routine de suivi.',
    points:['Comptes et soldes de référence.','Rapprochement bancaire hebdomadaire.','Notifications, confidentialité et accès permanent à ce guide.']
  }
];

function $(s){return document.querySelector(s)}
function $$(s){return [...document.querySelectorAll(s)]}
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.guide)+'</svg>'}
function key(){
  const who=($('#profileBtn')?.textContent||'user').trim().toLowerCase().replace(/\s+/g,'-');
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
      '<ul id="traceGuidePoints"></ul>'+
      '<div class="trace-guide-actions"><button class="secondary" id="traceGuideBack" type="button">Retour</button><button class="primary" id="traceGuideNext" type="button">Suivant</button></div>'+
    '</section>';
  document.body.appendChild(el);
  $('#traceGuideSkip').onclick=()=>finish(true);
  $('#traceGuideBack').onclick=()=>{if(index>0){index--;render()}};
  $('#traceGuideNext').onclick=()=>index===steps.length-1?finish(false):(index++,render());
}
function go(page){
  const nav=document.querySelector('[data-nav="'+page+'"]');
  if(nav)nav.click();
  if(page==='activity')document.querySelector('[data-tab="transactions"]')?.click();
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
  go('home');
  if(!skipped)setTimeout(()=>$('#profileBtn')?.click(),180);
}
function render(){
  const s=steps[index];
  go(s.page);
  $('#traceGuideStep').textContent='Étape '+(index+1)+' sur '+steps.length;
  $('#traceGuideProgress').style.width=((index+1)/steps.length*100)+'%';
  $('#traceGuideIcon').innerHTML=svg(s.icon);
  $('#traceGuideKicker').textContent=s.kicker;
  $('#traceGuideTitle').textContent=s.title;
  $('#traceGuideBody').textContent=s.body;
  $('#traceGuidePoints').innerHTML=s.points.map(p=>'<li>'+escapeHtml(p)+'</li>').join('');
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
  const r=target.getBoundingClientRect();
  if(r.top<65||r.bottom>window.innerHeight-170){
    if(selector!=='#quickAdd'&&selector!=='#profileBtn'){
      target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    }
  }
  setTimeout(updateSpot,selector!=='#quickAdd'&&selector!=='#profileBtn'?250:0);
}
function updateSpot(){
  if(!active)return;
  const target=$(steps[index]?.target);
  const spot=$('#traceGuideSpot');
  const card=$('#traceGuideCard');
  if(!target||!spot)return;
  const r=target.getBoundingClientRect(),pad=8;
  spot.style.left=Math.max(6,r.left-pad)+'px';
  spot.style.top=Math.max(6,r.top-pad)+'px';
  spot.style.width=Math.min(window.innerWidth-12,r.width+pad*2)+'px';
  spot.style.height=Math.min(window.innerHeight-12,r.height+pad*2)+'px';
  spot.style.borderRadius=getComputedStyle(target).borderRadius||'18px';
  card.classList.toggle('top',r.top+r.height/2>window.innerHeight*.58);
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
  btn.innerHTML='<span class="pico">'+svg('guide')+'</span><span class="pmain"><b>Guide express</b><small>Revoir les 8 étapes de prise en main</small></span><span class="profile-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>';
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
document.addEventListener('DOMContentLoaded',()=>{ensureMarkup();watchProfile();autoStartWhenReady()});
})();