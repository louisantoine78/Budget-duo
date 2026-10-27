'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../trace-preview-pwa-1.0.0.js'),'utf8');
const base='https://fictional.invalid/app/',entry=base+'trace-international-preview.html';
const files=['trace-deferred-write-plan-1.0.0.js','trace-deferred-statement-bridge-1.0.0.js','trace-international-1.0.0.css'];
function fixture({missing=[],prodOnly=false,loaded=true,hasWorker=true}={}){
 const requests=[],events={},label={textContent:'',appendChild:()=>{}};
 const location={href:entry,pathname:'/app/trace-international-preview.html',origin:'https://fictional.invalid'};
 const registration={scope:entry,active:{},waiting:null,addEventListener(){}};
 const worker={controller:{},addEventListener(){},register:async(src,opt)=>{
  requests.push(['register',src,opt.scope]);return registration;},ready:Promise.resolve(registration)};
 const assets=new Set([entry,...files.map(x=>base+x)].filter(url=>!missing.includes(url.split('/').at(-1))));
 const store={keys:async()=>prodOnly?['trace-prod-5365']:['trace-lab-537:%2Fapp%2F:fixture'],
  open:async key=>{requests.push(['open',key]);return {match:async u=>{
   requests.push(['match',u]);return assets.has(u)?{ok:true}:undefined;}}}};
 const window={__TRACE_INTERNATIONAL_PREVIEW__:true,caches:store,
  addEventListener:(name,fn)=>{events[name]=fn}};
 const document={readyState:loaded?'complete':'loading',
  getElementById:id=>id==='tracePreviewOfflineStatus'?label:null,
  querySelectorAll:()=>files.map(name=>({getAttribute:key=>
   (key===(name.endsWith('.css')?'href':'src'))?name:null}))};
 const navigator=hasWorker?{serviceWorker:worker}:{};
 vm.runInNewContext(app,{window,navigator,document,location,URL,Promise,Set});
 return{window,label,requests,events};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('offline-ready is true only when all declared scripts and shell are cached',async()=>{
 const f=fixture();await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,true);
 assert.match(f.label.textContent,/disponible hors connexion/);
 assert.equal(f.requests.filter(x=>x[0]==='match').length,files.length+1);
});
test('missing deferred JS blocks offline-ready and names missing asset',async()=>{
 const f=fixture({missing:['trace-deferred-statement-bridge-1.0.0.js']});
 await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.match(f.window.TracePreviewPWA.error,/Cache statique incomplet/);
 assert.match(f.label.textContent,/hors connexion incomplet/);
 assert.deepEqual(Array.from(f.window.TracePreviewPWA.missingAssets),['trace-deferred-statement-bridge-1.0.0.js']);
});
test('production cache can never qualify fictional lab',async()=>{
 const f=fixture({prodOnly:true});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.equal(f.requests.some(x=>x[0]==='open'),false);
 assert.match(f.label.textContent,/hors connexion incomplet/);
});
test('cache verification starts only after the full document is parsed',async()=>{
 const f=fixture({loaded:false});await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.equal(f.requests.some(x=>x[0]==='match'),false);
 assert.equal(typeof f.events.load,'function');
 f.events.load();await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,true);
});
test('worker unsupported means no registration and no cache reads',()=>{
 const f=fixture({hasWorker:false});
 assert.equal(f.window.TracePreviewPWA,undefined);
 assert.deepEqual(f.requests,[]);
});
