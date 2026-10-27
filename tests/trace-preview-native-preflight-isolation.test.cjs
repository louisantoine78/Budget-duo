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
 // Nested node --test must start in a fresh native test context.
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const cmd=(script,...argv)=>spawnSync(process.execPath,['scripts/'+script,...argv],
  {cwd:dir,encoding:'utf8',timeout:20000,env});
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
 assert.equal(report.passed,false,'preflight cannot certify the full financial suite');
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
test('binary asset changed without changing its name invalidates SHA-256 generated cache',t=>{
 const f=fixture(t),icon=path.join(f.dir,'assets/test.svg');
 const before=fs.readFileSync(icon);
 const replacement=Buffer.from(before);
 replacement[replacement.length-3]^=1;
 f.put('assets/test.svg',replacement);
 assert.equal(fs.statSync(icon).size,before.length,'the asset retains the same size');
 const check=f.cmd('build-trace-preview-pwa.mjs','--check');
 assert.equal(check.status,1,'generator --check must compare real asset bytes');
 const run=f.cmd('test-trace-native.mjs','--preflight','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.inventory.passed,true,'names remain present');
 assert.equal(report.preflight.generatedCacheFresh,false,'cryptographic check catches modified bytes');
 assert.equal(report.summary.testFilesExecuted,0);
});
test('tampering with worker source is rejected despite an intact static asset list',t=>{
 const f=fixture(t),sw=path.join(f.dir,'trace-international-preview-sw.js');
 f.put('trace-international-preview-sw.js',fs.readFileSync(sw,'utf8')+'\n// altered without regenerating\n');
 const run=f.cmd('test-trace-native.mjs','--preflight','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.inventory.passed,true);
 assert.equal(report.preflight.generatedCacheFresh,false);
});
test('generator refuses remote and parent-directory assets without network access',t=>{
 const f=fixture(t),entry=path.join(f.dir,f.lab);
 const original=fs.readFileSync(entry,'utf8');
 for(const unsafe of ['https://example.org/not-in-lab.js','../config.js']){
  f.put(f.lab,original+'<script src="'+unsafe+'"></script>');
  const run=f.cmd('build-trace-preview-pwa.mjs');
  assert.equal(run.status,1,unsafe);
  assert.match(run.stderr,/Asset interdit/,unsafe);
 }
});
test('official builder hashes actual PNG bytes and rejects a changed icon of equal length',t=>{
 const f=fixture(t),manifestPath=path.join(f.dir,'trace-international-preview.webmanifest');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/fQUAAAAASUVORK5CYII=','base64');
 const imagePath=path.join(f.dir,'assets/one-pixel.png');
 fs.writeFileSync(imagePath,png);
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 manifest.icons[0].src='assets/one-pixel.png';
 f.put('trace-international-preview.webmanifest',JSON.stringify(manifest));
 assert.equal(f.cmd('build-trace-preview-pwa.mjs').status,0);
 assert.equal(f.cmd('build-trace-preview-pwa.mjs','--check').status,0);
 const changed=Buffer.from(png);changed[changed.length-13]^=1;
 fs.writeFileSync(imagePath,changed);
 assert.equal(fs.statSync(imagePath).size,png.length);
 assert.equal(f.cmd('build-trace-preview-pwa.mjs','--check').status,1);
 const run=f.cmd('test-trace-native.mjs','--preflight','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.inventory.passed,true);
 assert.equal(report.preflight.generatedCacheFresh,false);
});

test('real Node runner refuses a partial one-suite checkout despite a passing assertion',t=>{
 const f=fixture(t);
 f.put('tests/one.test.cjs',"const {test}=require('node:test');test('real assertion',()=>{require('node:assert/strict').equal(1,1)});");
 const run=f.cmd('test-trace-native.mjs','--report','proof.json');
 assert.equal(run.status,1);
 const report=JSON.parse(fs.readFileSync(path.join(f.dir,'proof.json'),'utf8'));
 assert.equal(report.preflight.passed,true);
 assert.equal(report.suites.length,1);
 assert.equal(report.suites[0].passed,true);
 assert.equal(report.suites[0].reportedScenarios,1);
 assert.equal(report.summary.suiteFloorMet,false);
 assert.equal(report.summary.expectedMinTestFiles,106);
 assert.equal(report.passed,false);
 assert.match(run.stderr,/incomplete checkout/);
});
