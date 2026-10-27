/* Static fictional laboratory only. No production registration or data cache. */
(function(){
 'use strict';
 if(window.__TRACE_INTERNATIONAL_PREVIEW__!==true||
    !location.pathname.endsWith('/trace-international-preview.html')||
    !('serviceWorker' in navigator))return;
 const scope=new URL('./trace-international-preview.html',location.href);
 const script=new URL('./trace-international-preview-sw.js',location.href);
 const status=window.TracePreviewPWA={ready:false,scope:scope.href,error:null};
 let reloadRequested=false,registrationForLab=null,verificationVersion=0;
 const notice=text=>{
  const node=document.getElementById('tracePreviewOfflineStatus');
  if(node)node.textContent=text;
 };

 // A registered SW is not proof that every current module is cached.
 // Cache Storage is read-only here; never fetch statements or use cloud storage.
 const checkOfflineShell=async()=>{
  if(!window.caches)throw Error('Cache Storage indisponible');
  if(document.readyState!=='complete')await new Promise(resolve=>
   window.addEventListener('load',resolve,{once:true}));
  const urls=[...document.querySelectorAll('script[src],link[href]')]
   .map(el=>el.getAttribute('src')||el.getAttribute('href'))
   .filter(Boolean).map(value=>new URL(value,location.href))
   .filter(url=>url.origin===location.origin)
   .map(url=>{url.search='';url.hash='';return url.href;});
  urls.push(scope.href);
  // PDF extraction loads these modules dynamically rather than through a <script> tag.
  for(const name of ['vendor/pdfjs/pdf.mjs','vendor/pdfjs/pdf.worker.mjs'])
   urls.push(new URL(name,location.href).href);
  const required=[...new Set(urls)];
  const prefix='trace-lab-537:'+encodeURIComponent(new URL('./',location.href).pathname)+':';
  const keys=(await window.caches.keys()).filter(key=>key.startsWith(prefix));
  // A cache left behind by a previous lab version must not qualify the
  // current worker. Activation prunes old entries before the badge can pass.
  if(keys.length!==1){
   status.missingAssets=required.map(url=>new URL(url).pathname.split('/').pop());
   throw Error('Cache laboratoire absent ou en cours de mise à jour');
  }
  const cache=await window.caches.open(keys[0]),missing=[];
  for(const url of required)if(!await cache.match(url))missing.push(url);
  if(missing.length){
   status.missingAssets=missing.map(url=>new URL(url).pathname.split('/').pop());
   throw Error('Cache statique incomplet : '+missing.length+' ressource(s) manquante(s)');
  }
  status.missingAssets=[];
  return true;
 };
 const updateNotice=registration=>{
  if(!registration.waiting||!navigator.serviceWorker.controller)return;
  const node=document.getElementById('tracePreviewOfflineStatus');
  if(!node)return;
  node.textContent='Nouvelle version du laboratoire disponible. ';
  const button=document.createElement('button');button.type='button';
  button.textContent='Recharger (réinitialise les données fictives)';
  button.onclick=()=>{reloadRequested=true;registration.waiting?.postMessage('TRACE_LAB_ACTIVATE');};
  node.appendChild(button);
 };
 const verifyActiveLab=async registration=>{
  const current=++verificationVersion;
  status.ready=false;
  const controller=navigator.serviceWorker.controller;
  // An installed/ready registration can exist before it controls this page.
  if(!controller||controller.scriptURL!==script.href){
   status.error=null;status.missingAssets=[];
   notice('Laboratoire hors connexion en cours d’activation…');
   return;
  }
  if(registration.waiting){
   status.error=null;status.missingAssets=[];
   updateNotice(registration);
   return;
  }
  try{
   await checkOfflineShell();
   if(current!==verificationVersion)return;
   status.ready=true;status.error=null;
   notice('Laboratoire disponible hors connexion · données fictives réinitialisées au rechargement.');
   updateNotice(registration);
  }catch(error){
   if(current!==verificationVersion)return;
   status.ready=false;status.error=String(error.message||error);
   notice(status.missingAssets?.length?
    'Mode hors connexion incomplet : des fichiers du laboratoire manquent au cache.':
    'Mode hors connexion non disponible sur ce navigateur.');
  }
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(reloadRequested){location.reload();return;}
  if(registrationForLab)void navigator.serviceWorker.ready.then(()=>verifyActiveLab(registrationForLab))
   .catch(()=>notice('Activation hors connexion impossible.'));
 });
 navigator.serviceWorker.register(script.href,{scope:scope.href,updateViaCache:'none'})
 .then(async registration=>{
  if(registration.scope!==scope.href)throw Error('Portée du laboratoire incorrecte');
  registrationForLab=registration;
  registration.addEventListener('updatefound',()=>{
   registration.installing?.addEventListener('statechange',()=>updateNotice(registration));
  });
  updateNotice(registration);
  await navigator.serviceWorker.ready;
  await verifyActiveLab(registration);
 }).catch(error=>{
  status.ready=false;status.error=String(error.message||error);
  notice('Mode hors connexion non disponible sur ce navigateur.');
 });
})();
