'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const run=dest=>spawnSync(process.execPath,['scripts/export-trace-537-preview.mjs','--out',dest],
 {cwd:root,encoding:'utf8',timeout:30000});
test('fictional PWA export ships only the generated static allowlist',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'trace-537-export-'));
 try{
  const dest=path.join(tmp,'export'),result=run(dest);
  assert.equal(result.status,0,result.stderr);
  const audit=JSON.parse(fs.readFileSync(path.join(dest,'trace-lab-export-audit.json'),'utf8'));
  assert.equal(audit.schema,'trace-537-isolated-export-v1');
  assert.equal(audit.count,69);
  assert.equal(Object.keys(audit.files).length,69);
  for(const banned of ['config.js','cloud.js','app.js','sw.js','manifest.webmanifest',
    'reset-trace.html','package.json','.env','migrations','.git','tests'])
   assert.equal(fs.existsSync(path.join(dest,banned)),false,banned+' must not ship');
  const manifest=JSON.parse(fs.readFileSync(path.join(dest,audit.manifest),'utf8'));
  assert.equal(manifest.scope,'./trace-international-preview.html');
  assert.equal(manifest.start_url,manifest.scope);
  assert.ok(fs.readFileSync(path.join(dest,audit.entry),'utf8').includes("connect-src 'none'"));
  for(const [name,sha] of Object.entries(audit.files)){
   const bytes=fs.readFileSync(path.join(dest,name));
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,name);
  }
  assert.notEqual(run(dest).status,0,'Must not overwrite an existing export');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('export refuses repository root and arbitrary subdirectories',()=>{
 assert.notEqual(run(root).status,0);
 assert.notEqual(run(path.join(root,'docs','potential-deployment')).status,0);
});
