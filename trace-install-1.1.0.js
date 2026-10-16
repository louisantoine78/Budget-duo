/* TRACE · Guide d'installation, accessible depuis la page de connexion et le profil. */
(()=>{'use strict';
 const $=s=>document.querySelector(s);
 const APP_LINK='https://louisantoine78.github.io/Budget-duo/trace-launch-v2.html';
 let deferredPrompt=null,chosen=null,lastFocus=null;
 const installed=()=>Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true);
 function defaultPlatform(){
  const ua=navigator.userAgent||'';
  if(/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'ios';
  if(/Android/i.test(ua))return'android';
  return'desktop';
 }
 const instructions={
  ios:{label:'iPhone / iPad',title:'Installer depuis Safari',steps:[
   'Ouvre TRACE dans Safari.',
   'Appuie sur Partager (le carré avec la flèche vers le haut).',
   'Choisis « Sur l’écran d’accueil », puis « Ajouter ».'
  ],note:'Sur certains iPhone, « Sur l’écran d’accueil » se trouve dans les options de partage. Ouvre ensuite TRACE avec la nouvelle icône.'},
  android:{label:'Android / Samsung',title:'Installer depuis le navigateur',steps:[
   'Ouvre TRACE dans Chrome ou Samsung Internet.',
   'Dans Chrome : menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
   'Dans Samsung Internet : menu ☰ → option pour ajouter la page à l’écran d’accueil.'
  ],note:'Le nom du menu varie selon le navigateur. Si « Installer TRACE » apparaît ci-dessous, tu peux aussi utiliser ce bouton.'},
  desktop:{label:'Ordinateur',title:'Installer depuis le navigateur',steps:[
   'Ouvre TRACE dans Chrome ou Microsoft Edge.',
   'Cherche l’icône d’installation dans la barre d’adresse ou le menu du navigateur.',
   'Installe le raccourci, puis ouvre TRACE depuis celui-ci.'
  ],note:'L’installation est facultative. TRACE fonctionne également dans le navigateur.'}
 };
 function content(){
  const platform=chosen||defaultPlatform(),info=instructions[platform];
  return '<div class="trace-install-hero">'+
   '<img src="assets/trace-wallet-v1-192.png" alt="Icône de TRACE" width="60" height="60">'+
   '<div><span class="trace-install-kicker">TRACE À PORTÉE DE MAIN</span>'+
   '<h2>Ajoute TRACE à ton écran d’accueil</h2>'+
   '<p>Accède à ton budget comme à une application, sans boutique de téléchargement.</p></div></div>'+
   '<div class="trace-install-platforms" role="group" aria-label="Choisir son appareil">'+
   Object.keys(instructions).map(k=>'<button type="button" data-trace-platform="'+k+'" aria-pressed="'+(k===platform)+'" class="'+(k===platform?'is-selected':'')+'">'+instructions[k].label+'</button>').join('')+
   '</div><section class="trace-install-instructions"><strong>'+info.title+'</strong><ol>'+
   info.steps.map(s=>'<li>'+s+'</li>').join('')+'</ol><p>'+info.note+'</p></section>';
 }
 function refresh(){
  const dialog=$('#traceInstallDialog');
  if(!dialog)return;
  const host=dialog.querySelector('[data-trace-install-content]');
  if(host)host.innerHTML=content();
  dialog.querySelectorAll('[data-trace-platform]').forEach(btn=>btn.addEventListener('click',()=>{
   chosen=btn.dataset.tracePlatform;
   refresh();
  }));
  const nativeButton=dialog.querySelector('[data-trace-install-native]');
  if(nativeButton)nativeButton.classList.toggle('hidden',installed()||!deferredPrompt);
 }
 function close(){
  $('#traceInstallDialog')?.classList.add('hidden');
  document.body.classList.remove('trace-install-dialog-open');
  if(lastFocus?.isConnected)lastFocus.focus();
 }
 function open(){
  if(installed())return;
  const modal=$('#traceInstallDialog');
  if(!modal)return;
  lastFocus=document.activeElement;
  chosen=defaultPlatform();
  refresh();
  modal.classList.remove('hidden');
  document.body.classList.add('trace-install-dialog-open');
  modal.querySelector('[data-trace-install-close]')?.focus();
 }
 function status(message){
  const el=$('#traceInstallStatus');
  if(el)el.textContent=message;
 }
 async function nativeInstall(){
  const prompt=deferredPrompt;
  if(!prompt)return;
  deferredPrompt=null;
  try{
   await prompt.prompt();
   const result=await prompt.userChoice;
   status(result?.outcome==='accepted'?'Installation demandée. Retrouve TRACE depuis son icône.':'Tu peux aussi passer par le menu du navigateur.');
  }catch(e){status('Passe par le menu du navigateur pour installer TRACE.');}
  refresh();
 }
 async function copyLink(){
  try{
   await navigator.clipboard.writeText(APP_LINK);
   status('Lien copié. Ouvre-le dans le navigateur de ton choix.');
  }catch(e){status('Ouvre cette adresse dans ton navigateur : '+APP_LINK);}
 }
 function bind(){
  const banner=$('#traceInstallAuthBanner');
  if(banner&&installed())banner.classList.add('hidden');
  $('#traceInstallAuthHelp')?.addEventListener('click',open);
  $('#traceInstallDialog')?.querySelectorAll('[data-trace-install-close]').forEach(el=>el.addEventListener('click',close));
  $('#traceInstallDialog')?.addEventListener('click',e=>{if(e.target.id==='traceInstallDialog')close();});
  $('#traceInstallDialog')?.querySelector('[data-trace-install-native]')?.addEventListener('click',nativeInstall);
  $('#traceInstallCopy')?.addEventListener('click',copyLink);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#traceInstallDialog')?.classList.contains('hidden'))close();});
  refresh();
 }
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredPrompt=event;
  refresh();
 });
 window.addEventListener('appinstalled',()=>{
  deferredPrompt=null;
  $('#traceInstallAuthBanner')?.classList.add('hidden');
  close();
 });
 window.TraceInstall={isInstalled:installed,openHelp:open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();