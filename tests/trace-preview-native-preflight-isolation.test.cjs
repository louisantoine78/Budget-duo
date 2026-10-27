'use strict';
// Native-only sandbox for the preflight runner. Never touches this repository's
// generated service worker, Supabase, production routes or network.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trace-fictional-gate-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const name of ['scripts','tests','assets','vendor/pdfjs'])
  fs.mkdirSync(path.join(dir,name),{recursive:true});
 for(const name of ['build-trace-preview-pwa.mjs','test-trace-native.mjs',
  'trace-native-suite-evidence.cjs','trace-preview-static-inventory.cjs']){
  fs.copyFileSync(path.join(root,'scripts',name),path.join(dir,'scripts',name));
 }
 const put=(file,text)=>fs.writeFileSync(path.join(dir,file),text);
 const lab='trace-international-preview.html';
 put(lab,'<!doctype html><html><link rel="manifest" href="trace-international-preview.webmanifest">'+
  '<script src="trace-demo.js"></script></html>');
 put('trace-international-preview.webmanifest',JSON.stringify({
  id:'./'+lab,scope:'./'+lab,start_url:'./'+lab,
  icons:[{src:'assets/test.svg',sizes:'any',type:'image/svg+xml'}]
 }));
 put('assets/test.svg','<svg xmlns="http://www.w3.org/2000/svg"/>');
 put('index.html','<!doctype html><html><script src="trace-demo.js"></script></html>');
 put('trace-demo.js','window.TRACE_DEMO=true;');
 put('sw.js','/* inert sandbox production-like worker */');
 put('trace-pdfjs-local-loader-1.0.0.mjs','export const sandbox=true;');
 put('vendor/pdfjs/pdf.mjs','export const pdf=true;');
 put('vendor/pdfjs/pdf.worker.mjs','export const worker=true;');
 put('vendor/pdfjs/LICENSE','Fictional test license only');
 put('vendor/pdfjs/trace-vendor-manifest.json','{}');
 const cmd=(script,...argv)=>spawnSync(process.execPath,['scripts/'+script,...argv],
  {cwd:dir,encoding:'utf8',timeout:20000});
 const build=cmd('build-trace-preview-pwa.mjs');
 assert.equal(build.status,0,build.stderr);
 return{dir,put,cmd,lab};
}
test('real Node --preflight succeeds on generated, complete fictional isolated shell',t=>{
 const f=fixture(t),run=f.cmd('test-trace-native.mjs','--preflight','--report','proof.json');
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.passed,true);
 assert.equal(report.preflight.generatedCacheFresh,true);
 assert.equal(report.summary.testFilesExecuted,0);
 assert.equal(report.suites.length,0);
});
test('real Node --preflight fails early on added unbuilt JS without running financial suites',t=>{
 const f=fixture(t);
 const html=fs.readFileSync(path.join(f.dir,f.lab),'utf8');
 f.put(f.lab,html.replace('</html>','<script src="trace-extra.js"></script></html>'));
 f.put('trace-extra.js','window.EXTRA=true;');
 const run=f.cmd('test-trace-native.mjs','--preflight','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.passed,false);
 assert.ok(report.preflight.inventory.missing.includes('trace-extra.js'));
 assert.equal(report.summary.testFilesExecuted,0);
});
test('real Node preflight refuses production scope despite a generated previous lab cache',t=>{
 const f=fixture(t),m=path.join(f.dir,'trace-international-preview.webmanifest');
 const manifest=JSON.parse(fs.readFileSync(m,'utf8'));
 manifest.scope='./index.html';f.put('trace-international-preview.webmanifest',JSON.stringify(manifest));
 const run=f.cmd('test-trace-native.mjs','--preflight');
 assert.equal(run.status,1);
 assert.match(run.stderr,/Portée|laboratoire|NO-GO/);
});
test('real Node regular runner cannot pass a sandbox with zero test suites',t=>{
 const f=fixture(t),run=f.cmd('test-trace-native.mjs','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.passed,true);
 assert.equal(report.summary.testFiles,0);
 assert.equal(report.passed,false);
});
