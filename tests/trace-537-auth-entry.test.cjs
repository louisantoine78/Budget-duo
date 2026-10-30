'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),script='scripts/build-trace-537-auth-entry.mjs';
const stable=['index.html','sw.js','v5-app-5.36.5.js'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const before=Object.fromEntries(stable.map(p=>[p,hash(p)]));
const generate=out=>spawnSync(process.execPath,[script,'--out',out],{cwd:root,encoding:'utf8',timeout:15000});
test('candidate auth entry exposes current 5.37 app without lab fixtures or production registration',()=>{
 const destination=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'trace-537-auth-node-')),'candidate.html');
 const result=generate(destination);
 assert.equal(result.status,0,result.stderr);
 const html=fs.readFileSync(destination,'utf8');
 assert.match(html,/trace-build" content="5\.37\.0-auth-candidate"/);
 assert.match(html,/NO-GO: isolated auth rehearsal only; not deployable/);
 assert.match(html,/src="config\.js\?v=5\.2\.2"/);
 assert.match(html,/src="v5-app-5\.37\.0\.js"/);
 assert.match(html,/src="trace-insights-5\.37\.0\.js"/);
 assert.doesNotMatch(html,/trace-international-preview-fixtures|trace-preview-pwa-1\.0\.0\.js|tracePreviewStatus|__TRACE_INTERNATIONAL_PREVIEW__/);
 assert.doesNotMatch(html,/src="v5-app-5\.36\.5\.js"|navigator\.serviceWorker\.register\(/);
 assert.deepEqual(Object.fromEntries(stable.map(p=>[p,hash(p)])),before);
});
test('candidate auth entry refuses to overwrite protected production assets',()=>{
 for(const target of ['index.html','sw.js','trace-537-auth-candidate.html']){
  const result=generate(target);
  assert.notEqual(result.status,0,target);
 }
 assert.deepEqual(Object.fromEntries(stable.map(p=>[p,hash(p)])),before);
});

