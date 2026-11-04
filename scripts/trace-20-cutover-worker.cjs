'use strict';
/*
 * Experimental TRACE 2.0 production-scope worker generator.
 * Cannot publish, register, replace sw.js, access a database or deploy.
 */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),VERSION='5.37.0';
const STATIC=Object.freeze([
 'v5-app-5.37.0.js','trace-international-1.0.0.css',
 'trace-bank-ui-5.37.0.js','trace-premium-panels-5.37.0.js',
 'trace-premium-panels-5.37.0.css'
]);
function validate(files){
 if(!Array.isArray(files)||files.length===0||new Set(files).size!==files.length)
  throw Error('Non-empty unique static allowlist required');
 for(const f of files){
  if(typeof f!=='string'||!/^[A-Za-z0-9_./-]+$/.test(f)||
    f.startsWith('/')||f.includes('..')||!/\.(?:js|mjs|css|png|svg)$/.test(f)||
    /(?:^|\/)(?:config|cloud|app|sw|index|trace-launch-v2)\.(?:js|html)$/.test(f)||
    /(?:^|\/)(?:auth|rest|realtime|storage|functions)\//.test(f))
   throw Error('Forbidden static resource: '+f);
 }
}
function buildCutoverWorker({files=STATIC}={}){
 validate(files);
 const hash=crypto.createHash('sha256');
 for(const f of files){
  const target=path.resolve(ROOT,f);
  if(!target.startsWith(ROOT+path.sep)||!fs.existsSync(target)||
   !fs.statSync(target).isFile())throw Error('Missing file '+f);
  hash.update(f+'\0');hash.update(fs.readFileSync(target));
 }
 const cache='trace-shell-v'+VERSION+':'+hash.digest('hex').slice(0,24);
 const offline='<!doctype html><html lang="fr"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>TRACE — Hors ligne</title><body><h1>Connexion indisponible</h1>'+
  '<p>Reconnectez-vous avant de continuer. Aucune opération bancaire '+
  'n’a été enregistrée.</p></body></html>';
 const source=[
  '/* GENERATED QA DRAFT; NOT REGISTERED OR RELEASED. TRACE 2.0 '+VERSION+' */',
  "'use strict';",
  'const TRACE_CACHE='+JSON.stringify(cache)+';',
  'const TRACE_FILES='+JSON.stringify(files)+';',
  'const TRACE_BASE=new URL("./",self.location.href);',
  'const TRACE_PATHS=new Set(TRACE_FILES.map(p=>new URL(p,TRACE_BASE).pathname));',
  'const TRACE_OFFLINE='+JSON.stringify(offline)+';',
  'self.addEventListener("install",event=>{',
  ' // Do not auto-activate: allow users to finish pending drafts in 5.36.5.',
  ' event.waitUntil(caches.open(TRACE_CACHE).then(c=>c.addAll(',
  '  TRACE_FILES.map(p=>new Request(new URL(p,TRACE_BASE),{cache:"reload"})))));',
  '});',
  'self.addEventListener("message",event=>{',
  ' if(event.data&&event.data.type==="TRACE_2_0_ACTIVATE"&&',
  '  event.data.cache===TRACE_CACHE)',
  '   event.waitUntil(Promise.resolve(self.skipWaiting()));',
  '});',
  'self.addEventListener("activate",event=>{',
  ' // Intentionally do not retire any cache or claim existing 5.36.5 tabs.',
  ' event.waitUntil(Promise.resolve());',
  '});',
  'self.addEventListener("fetch",event=>{',
  ' const request=event.request;if(request.method!=="GET")return;',
  ' let u;try{u=new URL(request.url)}catch{return}',
  ' if(u.origin!==TRACE_BASE.origin||u.username||u.password)return;',
  ' const h=request.headers;',
  ' if(h&&(h.get("authorization")||h.get("apikey")))return;',
  ' if(request.mode==="navigate"){',
  '  event.respondWith(fetch(request,{cache:"no-store"}).catch(()=>',
  '    new Response(TRACE_OFFLINE,{status:503,headers:{',
  '      "Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})));',
  '  return;',
  ' }',
  ' // Cache only versioned anonymous code; never finance, JSON or credentials.',
  ' if(u.search||u.hash||!TRACE_PATHS.has(u.pathname))return;',
  ' event.respondWith(caches.open(TRACE_CACHE).then(c=>c.match(request).then(',
  '  hit=>hit||fetch(request,{cache:"no-store"}))));',
  '});',
  ''
 ].join('\n');
 return{cache,source,files:[...files]};
}
if(require.main===module){
 const args=process.argv.slice(2),target=args[0]==='--out'&&args.length===2?path.resolve(args[1]):null;
 if(!target||!target.endsWith('.js')||target===ROOT||target.startsWith(ROOT+path.sep))
  throw Error('Usage: node scripts/trace-20-cutover-worker.cjs --out /tmp/trace-20-cutover.js');
 const candidate=buildCutoverWorker();
 fs.writeFileSync(target,candidate.source,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({candidateOnly:true,cache:candidate.cache,files:candidate.files.length,productionModified:false}));
}
module.exports={buildCutoverWorker,validate,STATIC};
