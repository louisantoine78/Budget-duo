'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../trace-preview-pwa-1.0.0.js'),'utf8');
const base='https://fictional.invalid/app/',entry=base+'trace-international-preview.html';
const files=['trace-deferred-write-plan-1.0.0.js','trace-deferred-statement-bridge-1.0.0.js','trace-international-1.0.0.css'];
const pdfRuntime=['vendor/pdfjs/pdf.mjs','vendor/pdfjs/pdf.worker.mjs'];
function fixture({missing=[],prodOnly=false,loaded=true,hasWorker=true,
 controlled=true,foreignController=false,multipleLabCaches=false,waiting=false}={}){
 const requests=[],events={},label={textContent:'',appendChild:()=>{}};
 const location={href:entry,pathname:'/app/trace-international-preview.html',origin:'https://fictional.invalid'};
 const registration={scope:entry,active:{},waiting:waiting?{postMessage:()=>{}}:null,addEventListener(){}};
 const controller=controlled?{scriptURL:foreignController?base+'sw.js':base+'trace-international-preview-sw.js'}:null;
 const worker={controller,addEventListener:(name,fn)=>{events['sw-'+name]=fn},register:async(src,opt)=>{
  requests.push(['register',src,opt.scope]);return registration;},ready:Promise.resolve(registration)};
 const assets=new Set([entry,...files.map(x=>base+x),...pdfRuntime.map(x=>base+x)].filter(url=>!missing.includes(url.split('/').at(-1))));
 const store={keys:async()=>prodOnly?['trace-prod-5365']:
  multipleLabCaches?['trace-lab-537:%2Fapp%2F:old','trace-lab-537:%2Fapp%2F:fixture']:
  ['trace-lab-537:%2Fapp%2F:fixture'],
  open:async key=>{requests.push(['open',key]);return {match:async u=>{
   requests.push(['match',u]);return assets.has(u)?{ok:true}:undefined;}}}};
 const window={__TRACE_INTERNATIONAL_PREVIEW__:true,caches:store,
  addEventListener:(name,fn)=>{events[name]=fn}};
 const document={readyState:loaded?'complete':'loading',
  getElementById:id=>id==='tracePreviewOfflineStatus'?label:null,
  querySelectorAll:()=>files.map(name=>({getAttribute:key=>
   (key===(name.endsWith('.css')?'href':'src'))?name:null})),
  createElement:()=>({type:'button',textContent:'',onclick:null})};
 const navigator=hasWorker?{serviceWorker:worker}:{};
 vm.runInNewContext(app,{window,navigator,document,location,URL,Promise,Set});
 return{window,label,requests,events,worker,registration};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('offline-ready is true only when all declared scripts and shell are cached',async()=>{
 const f=fixture();await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,true);
 assert.match(f.label.textContent,/disponible hors connexion/);
 assert.equal(f.requests.filter(x=>x[0]==='match').length,files.length+pdfRuntime.length+1);
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

test('dynamic PDF worker missing means the laboratory is not fully offline-ready',async()=>{
 const f=fixture({missing:['pdf.worker.mjs']});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.match(f.window.TracePreviewPWA.error,/Cache statique incomplet/);
 assert.deepEqual(Array.from(f.window.TracePreviewPWA.missingAssets),['pdf.worker.mjs']);
});

test('installation is not offline-ready until the lab worker actually controls the page',async()=>{
 const f=fixture({controlled:false});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.match(f.label.textContent,/en cours d’activation/);
 assert.equal(f.requests.some(x=>x[0]==='open'),false);
 f.worker.controller={scriptURL:base+'trace-international-preview-sw.js'};
 assert.equal(typeof f.events['sw-controllerchange'],'function');
 f.events['sw-controllerchange']();
 await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,true);
});
test('unrelated or production controller never qualifies fictional offline badge',async()=>{
 const f=fixture({foreignController:true});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.equal(f.requests.some(x=>x[0]==='open'),false);
 assert.match(f.label.textContent,/en cours d’activation/);
});
test('multiple lab cache generations fail closed until activation has pruned old cache',async()=>{
 const f=fixture({multipleLabCaches:true});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.match(f.window.TracePreviewPWA.error,/Cache laboratoire absent ou en cours de mise à jour/);
 assert.equal(f.requests.some(x=>x[0]==='open'),false);
});
test('waiting updated worker cannot advertise older cache as current offline version',async()=>{
 const f=fixture({waiting:true});await settle();await settle();
 assert.equal(f.window.TracePreviewPWA.ready,false);
 assert.equal(f.requests.some(x=>x[0]==='open'),false);
 assert.match(f.label.textContent,/Nouvelle version du laboratoire/);
});
