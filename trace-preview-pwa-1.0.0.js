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
  const required=[...new Set(urls)];
  const prefix='trace-lab-537:'+encodeURIComponent(new URL('./',location.href).pathname)+':';
  const keys=(await window.caches.keys()).filter(key=>key.startsWith(prefix));
  let missing=required;
  for(const key of keys){
   const cache=await window.caches.open(key);
   const current=[];
   for(const url of required)if(!await cache.match(url))current.push(url);
   if(!current.length)return;
   if(current.length<missing.length)missing=current;
  }
  status.missingAssets=missing.map(url=>new URL(url).pathname.split('/').pop());
  throw Error('Cache statique incomplet : '+missing.length+' ressource(s) manquante(s)');
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
  await checkOfflineShell();
  status.ready=true;
  notice('Laboratoire disponible hors connexion · données fictives réinitialisées au rechargement.');
  updateNotice(registration);
 }).catch(error=>{
  status.error=error.message;
  notice(status.missingAssets?.length?
   'Mode hors connexion incomplet : des fichiers du laboratoire manquent au cache.':
   'Mode hors connexion non disponible sur ce navigateur.');
 });
})();
