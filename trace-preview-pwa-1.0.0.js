/* Static fictional laboratory only. No production registration or data cache. */
(function(){
 'use strict';
 if(window.__TRACE_INTERNATIONAL_PREVIEW__!==true||
    !location.pathname.endsWith('/trace-international-preview.html')||
    !('serviceWorker' in navigator))return;
 const scope=new URL('./trace-international-preview.html',location.href);
 const script=new URL('./trace-international-preview-sw.js',location.href);
 const status=window.TracePreviewPWA={ready:false,scope:scope.href,error:null};
 let reloadRequested=false;
 const notice=text=>{
  const node=document.getElementById('tracePreviewOfflineStatus');
  if(node)node.textContent=text;
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
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(reloadRequested)location.reload();
 });
 navigator.serviceWorker.register(script.href,{scope:scope.href,updateViaCache:'none'})
 .then(async registration=>{
  if(registration.scope!==scope.href)throw Error('Portée du laboratoire incorrecte');
  registration.addEventListener('updatefound',()=>{
   registration.installing?.addEventListener('statechange',()=>updateNotice(registration));
  });
  updateNotice(registration);
  await navigator.serviceWorker.ready;
  status.ready=true;
  notice('Laboratoire disponible hors connexion · données fictives réinitialisées au rechargement.');
  updateNotice(registration);
 }).catch(error=>{
  status.error=error.message;
  notice('Mode hors connexion non disponible sur ce navigateur.');
 });
})();
