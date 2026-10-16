(() => {
'use strict';

const VERSION='v5';
let index=0;
let active=false;
let currentKey='';
let resizeTimer=null;
let transitionToken=0;
let transitionTimer=null;
let transitioning=false;

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
    "page": "home",
    "target": "#balanceCard .eyebrow",
    "icon": "home",
    "kicker": "01 · Accueil",
    "title": "Ton argent, au même endroit",
    "body": "Retrouve ton compte courant, ta carte et tes versements d’épargne. La marge du mois correspond aux revenus moins les dépenses.",
    "points": [
      "Les soldes évoluent avec les opérations confirmées.",
      "Renseigne tes soldes de départ dans Profil → Mes comptes."
    ]
  },
  {
    "page": "budget",
    "target": "#budgetPeriodControl",
    "icon": "budget",
    "kicker": "02 · Budget",
    "title": "Prévois tes dépenses",
    "body": "Choisis un mois, ajoute tes revenus et fixe un montant par catégorie. Passe de « Moi » à « Couple » pour changer de vue.",
    "points": [
      "Personnalise les catégories selon tes besoins.",
      "Les versements d’épargne restent séparés des dépenses."
    ]
  },
  {
    "page": "home",
    "target": "#quickAdd",
    "icon": "plus",
    "kicker": "03 · Ajouter",
    "title": "Saisis une opération à la main",
    "body": "Le bouton « Ajouter » permet d’enregistrer un achat, un revenu ou un mouvement sans importer de capture.",
    "points": [
      "Choisis le compte et la catégorie.",
      "Précise si la dépense concerne toi, ton partenaire ou vous deux."
    ]
  },
  {
    "page": "activity",
    "tab": "import",
    "target": "[data-tab=\"import\"]",
    "icon": "activity",
    "kicker": "04 · Importer",
    "title": "Importe tes captures bancaires",
    "body": "Sélectionne d’abord le compte courant ou la carte, puis ajoute les captures correspondant à ce compte.",
    "points": [
      "TRACE lit les dates, les montants et les libellés grâce à l’OCR.",
      "Plusieurs captures d’une même journée sont possibles."
    ]
  },
  {
    "page": "activity",
    "tab": "import",
    "target": "#importCalendar .trace-daily-top",
    "fallback": "[data-tab=\"import\"]",
    "icon": "guide",
    "kicker": "05 · Vérifier",
    "title": "Relis avant de confirmer",
    "body": "Ouvre une journée, compare les opérations avec leurs captures, puis corrige les montants et les catégories si nécessaire.",
    "points": [
      "Une bordure rouge signale un doublon possible : compare avant d’écarter une copie.",
      "Si l’OCR hésite sur un montant, vérifie-le sur la capture."
    ]
  },
  {
    "page": "activity",
    "tab": "transactions",
    "target": "[data-tab=\"transactions\"]",
    "icon": "activity",
    "kicker": "06 · Transactions",
    "title": "Comprends les mouvements",
    "body": "Retrouve tes opérations confirmées. Le remboursement d’une carte ou un virement vers ton CELI diminue ton compte courant sans créer une nouvelle dépense.",
    "points": [
      "L’achat par carte est compté lors du paiement.",
      "Un versement CELI augmente ton épargne, pas tes dépenses."
    ]
  },
  {
    "page": "wealth",
    "target": "[data-page=\"wealth\"] .hero-card .label",
    "fallback": "[data-nav=\"wealth\"]",
    "icon": "wealth",
    "kicker": "07 · Patrimoine",
    "title": "Suis tes comptes et ton épargne",
    "body": "Dans « Patrimoine », retrouve tes liquidités et tes placements. Ajoute tes CELI avec leurs soldes et dates de départ.",
    "points": [
      "Vérifie les soldes initiaux avant tes premiers virements.",
      "Chaque mouvement doit être compté une seule fois."
    ]
  },
  {
    "page": "home",
    "target": "#profileBtn",
    "icon": "heart",
    "kicker": "08 · Profil et couple",
    "title": "Commence seul, invite plus tard",
    "body": "Dans ton profil, configure tes comptes et invite ton partenaire avec un code privé. Chacun se connecte avec son propre accès.",
    "points": [
      "Ton partenaire verra aussi l’historique déjà enregistré dans le foyer.",
      "Retrouve ce guide à tout moment avec le bouton « ? »."
    ]
  }
];

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
  $('#traceGuideDetails').addEventListener('toggle',()=>{if(active)setTimeout(updateSpot,25)});
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
  ++transitionToken;
  transitioning=false;
  document.body.classList.add('trace-guide-open');
  $('#traceGuide').classList.remove('hidden');
  render();
}
function finish(skipped){
  if(!active)return;
  active=false;
  ++transitionToken;
  transitioning=false;
  clearTimeout(transitionTimer);
  markSeen();
  $('#traceGuide')?.classList.add('hidden');
  document.body.classList.remove('trace-guide-open');
  go('home',null);
  
}
function render(){
 if(!active)return;
 const step=steps[index],token=++transitionToken;
 transitioning=true;
 clearTimeout(transitionTimer);
 clearTimeout(resizeTimer);
 $('#traceGuideSpot')?.classList.add('hidden');
 // Update the underlying screen before measuring its highlighted element.
 go(step.page,step);
 $('#traceGuideStep').textContent='Étape '+(index+1)+' sur '+steps.length;
 $('#traceGuideProgress').style.width=((index+1)/steps.length*100)+'%';
 $('#traceGuideIcon').innerHTML=svg(step.icon);
 $('#traceGuideKicker').textContent=step.kicker;
 $('#traceGuideTitle').textContent=step.title;
 $('#traceGuideBody').textContent=step.body;
 $('#traceGuidePoints').innerHTML=step.points.map(p=>'<li>'+escapeHtml(p)+'</li>').join('');
 $('#traceGuideDetails').open=false;
 $('#traceGuideBack').disabled=index===0;
 $('#traceGuideNext').textContent=index===steps.length-1?'Terminer':'Suivant';
 $('#traceGuideCard').scrollTop=0;
 const settle=()=>{
  if(!active||token!==transitionToken)return;
  transitionTimer=setTimeout(()=>{
   if(!active||token!==transitionToken)return;
   transitioning=false;
   focusTarget(step,token);
  },130);
 };
 requestAnimationFrame(()=>requestAnimationFrame(settle));
}
function escapeHtml(v){
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function guideTarget(s){
 const resolve=selector=>{
  if(!selector)return null;
  const el=$(selector);if(!el)return null;
  const style=getComputedStyle(el),r=el.getBoundingClientRect();
  return style.display==='none'||style.visibility==='hidden'||r.height<4||r.width<4?null:el;
 };
 return resolve(s?.target)||resolve(s?.fallback);
}
function focusTarget(s,token=transitionToken){
 if(!active||token!==transitionToken)return;
 const target=guideTarget(s);
 if(!target){$('#traceGuideSpot')?.classList.add('hidden');updateSpot();return}
 if(target.id!=='quickAdd'&&target.id!=='profileBtn'){
  const r=target.getBoundingClientRect();
  if(r.top<94||r.bottom>window.innerHeight-112)
   target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'});
 }
 updateSpot();
 transitionTimer=setTimeout(()=>{if(active&&token===transitionToken)updateSpot();},130);
}
function overlapArea(a,b){
 return Math.max(0,Math.min(a.x+a.width,b.right)-Math.max(a.x,b.left))*
 Math.max(0,Math.min(a.y+a.height,b.bottom)-Math.max(a.y,b.top));
}
function guidePlacement(v,r,size){
 const width=Math.max(0,Math.min(size.width,v.width-24));
 const height=Math.max(0,Math.min(size.height,v.height-v.safeTop-v.safeBottom));
 const gap=14,y0=v.safeTop,y1=Math.max(y0,v.height-v.safeBottom-height);
 const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
 const mobile=v.width<=760,candidates=[];
 const test=(placement,x,y,fits)=>{
  const q={x:clamp(x,12,Math.max(12,v.width-width-12)),y:clamp(y,y0,y1),width,height,name:placement};
  q.overlap=overlapArea(q,r);q.fits=!!fits&&q.overlap===0;candidates.push(q);
 };
 if(mobile){
  let x=(v.width-width)/2;
  test('below',x,r.bottom+gap,r.bottom+gap+height<=v.height-v.safeBottom);
  test('above',x,r.top-gap-height,r.top-gap-height>=y0);
 }else{
  test('right',r.right+gap,r.top,r.right+gap+width<=v.width-12);
  test('left',r.left-gap-width,r.top,r.left-gap-width>=12);
  test('below',r.left,r.bottom+gap,r.bottom+gap+height<=v.height-v.safeBottom);
  test('above',r.left,r.top-gap-height,r.top-gap-height>=y0);
 }
 return candidates.sort((a,b)=>Number(b.fits)-Number(a.fits)||a.overlap-b.overlap||
  ((mobile?(a.name==='below'?0:1):(a.name==='right'?0:1))-
  (mobile?(b.name==='below'?0:1):(b.name==='right'?0:1))))[0];
}
function updateSpot(){
 if(!active||transitioning)return;
 const target=guideTarget(steps[index]),spot=$('#traceGuideSpot'),card=$('#traceGuideCard');
 if(!spot||!card)return;
 const vw=window.innerWidth,vh=window.innerHeight;
 const header=document.querySelector('#app > header'),nav=document.querySelector('[data-nav="home"]')?.closest('nav');
 const safeTop=Math.min(Math.max(64,(header?.getBoundingClientRect().bottom||0)+10),vh*.29);
 const navY=nav?.getBoundingClientRect().top;
 const safeBottom=Math.max(78,Number.isFinite(navY)?vh-navY+12:84);
 card.style.left='';card.style.right='';card.style.top='';card.style.bottom='';card.style.transform='';
 const cr=card.getBoundingClientRect(),size={width:cr.width||300,height:cr.height||230};
 const r=target?.getBoundingClientRect();
 let pos;
 if(r){
  pos=guidePlacement({width:vw,height:vh,safeTop,safeBottom},r,size);
  const padding=6;
  spot.style.left=Math.max(2,r.left-padding)+'px';
  spot.style.top=Math.max(2,r.top-padding)+'px';
  spot.style.width=Math.max(0,Math.min(vw-4,r.width+padding*2))+'px';
  spot.style.height=Math.max(0,Math.min(vh-4,r.height+padding*2))+'px';
  spot.style.borderRadius=getComputedStyle(target).borderRadius||'12px';
  spot.classList.toggle('hidden',pos.overlap>0);
 }else{
  spot.classList.add('hidden');
  pos={x:(vw-size.width)/2,y:Math.max(safeTop,Math.min(vh-safeBottom-size.height,vh*.38)),name:'center'};
 }
 card.style.left=pos.x+'px';card.style.top=pos.y+'px';card.dataset.placement=pos.name;
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
 const showAfterSetup=()=>{
  if(seen()||active)return;
  // Do not close or replace the first bank-account setup sheet.
  if(document.body.classList.contains('sheet-open')){
   const watch=new MutationObserver(()=>{
    if(!document.body.classList.contains('sheet-open')){
     watch.disconnect();
     setTimeout(showAfterSetup,250);
    }
   });
   watch.observe(document.body,{attributes:true,attributeFilter:['class']});
   return;
  }
  start(false);
 };
 const timer=setInterval(()=>{
  const app=$('#app');
  if(app&&!app.classList.contains('cloud-locked')&&$('#profileBtn')){
   clearInterval(timer);
   setTimeout(showAfterSetup,700);
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