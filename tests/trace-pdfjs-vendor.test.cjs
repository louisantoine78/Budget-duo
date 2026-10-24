'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const SOURCE=path.resolve(__dirname,'../scripts');
function fixture(options={}){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'trace-pdfjs-'));
 fs.mkdirSync(path.join(base,'scripts'));
 for(const name of ['vendor-trace-pdfjs.mjs','verify-trace-pdfjs.mjs'])
  fs.copyFileSync(path.join(SOURCE,name),path.join(base,'scripts',name));
 const pkg=path.join(base,'node_modules','pdfjs-dist');
 fs.mkdirSync(path.join(pkg,'legacy','build'),{recursive:true});
 fs.writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'pdfjs-dist',version:options.version||'6.4.299'}));
 fs.writeFileSync(path.join(pkg,'legacy','build','pdf.mjs'),'/* Synthetic LOCAL JS fixture */\n'+'a'.repeat(350));
 if(!options.missingWorker)fs.writeFileSync(path.join(pkg,'legacy','build','pdf.worker.mjs'),'/* Synthetic worker fixture */\n'+'b'.repeat(350));
 fs.writeFileSync(path.join(pkg,'LICENSE'),options.badLicense?'not the license'.repeat(30):'Apache License\nVersion 2.0\n'+'license fixture\n'.repeat(25));
 fs.writeFileSync(path.join(base,'trace-international-preview.html'),
  '<meta http-equiv="Content-Security-Policy" content="worker-src \'none\'; connect-src \'none\';">');
 return {base,run:(script)=>spawnSync(process.execPath,[path.join(base,'scripts',script)],{encoding:'utf8'}),
  cleanup:()=>fs.rmSync(base,{recursive:true,force:true})};
}
function use(fn,options){const f=fixture(options);try{fn(f)}finally{f.cleanup()}}
test('stages all files and verifies actual SHA-256 locally with preview still gated',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 assert.equal(f.run('verify-trace-pdfjs.mjs').status,0);
 const dir=path.join(f.base,'vendor','pdfjs');
 const m=JSON.parse(fs.readFileSync(path.join(dir,'trace-vendor-manifest.json'),'utf8'));
 assert.equal(m.version,'6.4.299');assert.equal(m.noRuntimeCDN,true);
 for(const [name,item]of Object.entries(m.files)){
  const b=fs.readFileSync(path.join(dir,name));
  assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);
 }
 assert.equal(fs.readdirSync(path.join(f.base,'vendor')).length,1);
}));
test('rejects mismatched package version without creating vendor output',()=>use(f=>{
 assert.notEqual(f.run('vendor-trace-pdfjs.mjs').status,0);
 assert.equal(fs.existsSync(path.join(f.base,'vendor','pdfjs')),false);
},{version:'6.3.289'}));
test('rejects missing worker without any partial copied assets',()=>use(f=>{
 assert.notEqual(f.run('vendor-trace-pdfjs.mjs').status,0);
 assert.equal(fs.existsSync(path.join(f.base,'vendor','pdfjs')),false);
},{missingWorker:true}));
test('rejects unverified license without creating output',()=>use(f=>{
 assert.notEqual(f.run('vendor-trace-pdfjs.mjs').status,0);
 assert.equal(fs.existsSync(path.join(f.base,'vendor','pdfjs')),false);
},{badLicense:true}));
test('existing staged vendor directory cannot be silently overwritten',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 const target=path.join(f.base,'vendor','pdfjs','pdf.mjs');
 const previous=fs.readFileSync(target);
 assert.notEqual(f.run('vendor-trace-pdfjs.mjs').status,0);
 assert.deepEqual(fs.readFileSync(target),previous);
}));
test('any bit flip in a prepared asset is detected',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 const p=path.join(f.base,'vendor','pdfjs','pdf.worker.mjs');
 fs.appendFileSync(p,'mutated');
 assert.notEqual(f.run('verify-trace-pdfjs.mjs').status,0);
}));
test('missing or extra asset is rejected',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 fs.writeFileSync(path.join(f.base,'vendor','pdfjs','extra.js'),'unexpected');
 assert.notEqual(f.run('verify-trace-pdfjs.mjs').status,0);
}));
test('worker unlock in preview is refused by the pre-activation gate',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 fs.writeFileSync(path.join(f.base,'trace-international-preview.html'),
  '<meta http-equiv="Content-Security-Policy" content="worker-src \'self\';">');
 assert.notEqual(f.run('verify-trace-pdfjs.mjs').status,0);
}));
test('loader inclusion in preview is refused by the pre-activation gate',()=>use(f=>{
 assert.equal(f.run('vendor-trace-pdfjs.mjs').status,0);
 fs.appendFileSync(path.join(f.base,'trace-international-preview.html'),
  '<script type="module" src="trace-pdfjs-local-loader-1.0.0.mjs"></script>');
 assert.notEqual(f.run('verify-trace-pdfjs.mjs').status,0);
}));
