/* TRACE 1.0 — optional, privacy-first PWA installation onboarding */
(()=>{'use strict';
const $=selector=>document.querySelector(selector);
const STORAGE='trace-pwa-install-intro-v1';
const LAUNCH='https://louisantoine78.github.io/Budget-duo/trace-launch-v2.html';
let deferredPrompt=null,lastFocus=null;
function installed(){
 return window.matchMedia?.('(display-mode: standalone)')?.matches===true || navigator.standalone===true;
}
function hasSeen(){
 try{return window.localStorage.getItem(STORAGE)==='seen'}catch(e){return false}
}
function markSeen(){
 try{window.localStorage.setItem(STORAGE,'seen')}catch(e){}
}
function platform(){
 const ua=navigator.userAgent||'';
 if(/iPad|iPhone|iPod/i.test(ua)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)return'ios';
 if(/Android/i.test(ua))return'android';
 return'desktop';
}
function instructions(){
 const p=platform();
 if(p==='ios')return{
  label:'Sur iPhone ou iPad',
  steps:[
   'Ouvre TRACE dans Safari.',
   'Touche le bouton Partager (carré avec une flèche vers le haut).',
   'Sélectionne « Sur l’écran d’accueil », puis « Ajouter ».'
  ],
  note:'Ouvre ensuite TRACE depuis sa nouvelle icône. Tu pourras créer ton compte directement dans l’application.'
 };
 if(p==='android')return{
  label:'Sur Android',
  steps:[
   'Ouvre TRACE dans Chrome.',
   'Choisis « Installer l’application » si le bouton apparaît ci-dessous.',
   'Sinon, ouvre le menu ⋮ et sélectionne « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
  ],
  note:'L’option affichée dépend du navigateur. Après installation, ouvre TRACE depuis son icône.'
 };
 return{
  label:'Sur ordinateur',
  steps:[
   'Ouvre TRACE dans Chrome ou Microsoft Edge.',
   'Utilise l’icône d’installation dans la barre d’adresse ou le menu du navigateur.',
   'Lance ensuite TRACE depuis le raccourci installé.'
  ],
  note:'Tu peux aussi utiliser TRACE directement dans ton navigateur.'
 };
}
function content(){
 const info=instructions();
 return '<div class="trace-install-hero">'+
  '<img src="assets/trace-wallet-v1-192.png" alt="Icône de TRACE" width="68" height="68">'+
  '<div><span class="trace-install-kicker">UNE APP SUR TON ÉCRAN D’ACCUEIL</span>'+
  '<h2>TRACE, toujours à portée de main</h2>'+
  '<p>Retrouve ton budget en un geste, comme une application sur ton téléphone. Aucun App Store nécessaire.</p></div></div>'+
  '<div class="trace-install-instructions"><strong>'+info.label+'</strong><ol>'+
  info.steps.map(step=>'<li>'+step+'</li>').join('')+'</ol>'+
  '<p>'+info.note+'</p></div>';
}
function paint(container,selector){
 if(!container)return;
 const body=container.querySelector(selector);
 if(body)body.innerHTML=content();
 const btn=container.querySelector('[data-trace-install-native]');
 if(btn)btn.classList.toggle('hidden',installed()||!deferredPrompt);
}
function paintAll(){
 paint($('#traceInstallIntro'),'[data-trace-install-content]');
 paint($('#traceInstallDialog'),'[data-trace-install-content]');
}
function closeIntro(){
 $('#traceInstallIntro')?.classList.add('hidden');
}
function revealSignup(){
 closeIntro();
 markSeen();
 $('#cloudSignupForm')?.classList.remove('hidden');
}
function showSignupIntro(){
 if(installed()||hasSeen()){
  closeIntro();
  return false;
 }
 const intro=$('#traceInstallIntro');
 if(!intro)return false;
 paint(intro,'[data-trace-install-content]');
 intro.classList.remove('hidden');
 return true;
}
function handleAuthTab(tab){
 if(tab==='signup'){
  const intro=showSignupIntro();
  $('#cloudSignupForm')?.classList.toggle('hidden',intro);
 }else{
  closeIntro();
 }
}
function closeHelp(){
 const modal=$('#traceInstallDialog');
 modal?.classList.add('hidden');
 document.body.classList.remove('trace-install-dialog-open');
 if(lastFocus?.isConnected)lastFocus.focus();
}
function openHelp(){
 if(installed())return;
 const modal=$('#traceInstallDialog');
 if(!modal)return;
 lastFocus=document.activeElement;
 paint(modal,'[data-trace-install-content]');
 modal.classList.remove('hidden');
 document.body.classList.add('trace-install-dialog-open');
 modal.querySelector('[data-trace-install-close]')?.focus();
}
async function requestInstall(button){
 const prompt=deferredPrompt;
 if(!prompt)return;
 deferredPrompt=null;
 if(button){button.disabled=true;button.textContent='Ouverture…'}
 try{
  await prompt.prompt();
  const choice=await prompt.userChoice;
  if(choice?.outcome==='accepted'){
   const status=$('#traceInstallStatus');
   if(status)status.textContent='Installation demandée. Ouvre TRACE depuis sa nouvelle icône.';
  }
 }catch(err){
  const status=$('#traceInstallStatus');
  if(status)status.textContent='Utilise le menu de ton navigateur pour ajouter TRACE.';
 }finally{
  if(button){button.disabled=false;button.textContent='Installer TRACE'}
  paintAll();
 }
}
function bind(){
 $('#traceInstallContinue')?.addEventListener('click',revealSignup);
 $('#traceInstallSkip')?.addEventListener('click',revealSignup);
 document.querySelectorAll('[data-trace-install-native]').forEach(btn=>btn.addEventListener('click',()=>requestInstall(btn)));
 $('#traceInstallDialog')?.querySelectorAll('[data-trace-install-close]').forEach(btn=>btn.addEventListener('click',closeHelp));
 $('#traceInstallDialog')?.addEventListener('click',event=>{
  if(event.target.id==='traceInstallDialog')closeHelp();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#traceInstallDialog')?.classList.contains('hidden'))closeHelp();
 });
 paintAll();
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 deferredPrompt=event;
 paintAll();
});
window.addEventListener('appinstalled',()=>{
 deferredPrompt=null;
 markSeen();
 if(!$('#traceInstallIntro')?.classList.contains('hidden'))revealSignup();
 closeHelp();
});
window.TraceInstall={isInstalled:installed,handleAuthTab,openHelp,showSignupIntro};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
else bind();
})();