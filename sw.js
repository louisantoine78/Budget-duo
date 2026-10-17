/* Trace 5.8.0 – app shell, network-first, self-updating home screen PWA */
const SHELL='trace-shell-v5.32.3';
const SHELL_URLS=['./index.html','./trace-launch-v2.html','./manifest.webmanifest','./assets/trace-wallet-v1-192.png','./assets/trace-wallet-v1-512.png','./assets/trace-wallet-v1-180.png','./assets/trace-wallet-v1.svg'];
self.addEventListener('install',event=>{
 self.skipWaiting();
 event.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_URLS)));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const url=new URL(request.url);
 const isPage=request.mode==='navigate';
 const fresh=/\.(?:html|js|css|json)$/.test(url.pathname)||isPage;
 if(!fresh){event.respondWith(fetch(request).catch(()=>caches.match(request)));return;}
 event.respondWith((async()=>{
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok&&isPage)await (await caches.open(SHELL)).put(request,response.clone());
   return response;
  }catch(error){
   return (await caches.match(request))||(isPage?(await caches.match('./index.html')):undefined)||Response.error();
  }
 })());
});
