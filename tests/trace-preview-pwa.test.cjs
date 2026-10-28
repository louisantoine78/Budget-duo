'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'trace-international-preview-sw.js'),'utf8');
function worker(scope='https://fictional.invalid/app/trace-international-preview.html'){
 const handlers={},deleted=[],added=[],matches=[],requestsSeen=[];
 let skipped=0,claimed=0;
 const cache={addAll:async requests=>{requestsSeen.push(...requests);added.push(...requests.map(r=>r.url));},
  match:async key=>{matches.push(key);return {static:true}}};
 const self={location:{href:'https://fictional.invalid/app/trace-international-preview-sw.js'},
  registration:{scope,active:null},addEventListener:(type,fn)=>handlers[type]=fn,
  skipWaiting:async()=>{skipped++},clients:{claim:async()=>{claimed++}}};
 const caches={open:async()=>cache,keys:async()=>[
  'trace-prod-5365','unrelated','trace-lab-537:%2Fapp%2F:old'],
  delete:async key=>{deleted.push(key);return true}};
 vm.runInNewContext(code,{self,caches,URL,Request,fetch:()=>{throw Error('Unexpected network')}});
 return{handlers,deleted,added,matches,requestsSeen,skipped:()=>skipped,claimed:()=>claimed};
}
test('generated cache is current and the manifest is isolated from the stable PWA',()=>{
 const check=spawnSync(process.execPath,['scripts/build-trace-preview-pwa.mjs','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'trace-international-preview.webmanifest')));
 assert.equal(manifest.scope,'./trace-international-preview.html');
 assert.equal(manifest.start_url,manifest.scope);assert.equal(manifest.id,manifest.scope);
});
test('worker refuses root and production scope before registering any event',()=>{
 assert.throws(()=>worker('https://fictional.invalid/app/'),/Refusing a scope/);
 assert.throws(()=>worker('https://fictional.invalid/app/index.html'),/Refusing a scope/);
});
test('install caches only allowlisted static files, PDF.js and no statements or credentials',async()=>{
 const w=worker();let work;w.handlers.install({waitUntil:p=>work=p});await work;
 assert.ok(w.added.length>50);assert.equal(new Set(w.added).size,w.added.length);
 assert.ok(w.added.includes('https://fictional.invalid/app/vendor/pdfjs/pdf.worker.mjs'));
 for(const url of w.added){
  assert.equal(new URL(url).origin,'https://fictional.invalid');
  assert.doesNotMatch(url,/(?:config\.js|cloud\.js|index\.html|\/sw\.js|\.pdf$|supabase|fixtures\/statements)/);
 }
 assert.equal(w.skipped(),1);
});
test('activation cleans only previous caches of this lab and preserves production caches',async()=>{
 const w=worker();let work;w.handlers.activate({waitUntil:p=>work=p});await work;
 assert.deepEqual(w.deleted,['trace-lab-537:%2Fapp%2F:old']);assert.equal(w.claimed(),1);
});
test('non-GET, cloud, bank PDF, external and unknown routes bypass cache completely',()=>{
 const w=worker();
 for(const [method,url] of [['POST','https://fictional.invalid/app/trace-international-preview.html'],
  ['GET','https://fictional.invalid/app/config.js'],['GET','https://fictional.invalid/app/index.html'],
  ['GET','https://fictional.invalid/app/statement.pdf'],['GET','https://example.invalid/data'],
  ['GET','https://fictional.invalid/app/user-data.json']]){
  w.handlers.fetch({request:{method,url},respondWith:()=>assert.fail('Forbidden cache intercept')});
 }
 assert.deepEqual(w.matches,[]);
});
test('offline navigation with a budget month query serves only the cached static shell',async()=>{
 const w=worker();let response;
 w.handlers.fetch({request:{method:'GET',url:'https://fictional.invalid/app/trace-international-preview.html?month=2026-10#budget'},respondWith:p=>response=p});
 assert.equal((await response).static,true);
 assert.deepEqual(w.matches,['https://fictional.invalid/app/trace-international-preview.html']);
});
test('activation messages require an exact same-origin laboratory client',()=>{
 const w=worker();
 for(const url of ['https://example.invalid/app/trace-international-preview.html',
  'https://fictional.invalid/app/index.html'])w.handlers.message({data:'TRACE_LAB_ACTIVATE',source:{url}});
 assert.equal(w.skipped(),0);
 w.handlers.message({data:'TRACE_LAB_ACTIVATE',source:{url:'https://fictional.invalid/app/trace-international-preview.html?month=2026-10'}});
 assert.equal(w.skipped(),1);
});

test('isolated PWA caches only local static assets with same-origin auth when preview is protected',async()=>{
 const w=worker();
 let install;
 w.handlers.install({waitUntil:p=>install=p});
 await install;
 assert.ok(w.requestsSeen.length>=65);
 for(const request of w.requestsSeen){
  assert.equal(request.credentials,'same-origin');
  assert.equal(request.cache,'reload');
  assert.equal(new URL(request.url).origin,'https://fictional.invalid');
  assert.doesNotMatch(request.url,/config\.js|cloud\.js|index\.html|supabase|\/api\//);
 }
 assert.match(code,/Refusing a scope outside the fictional laboratory/);
});
