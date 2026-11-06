'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const {prepareMainEntry,safeOutput}=require('../scripts/trace-20-prepare-main-entry.cjs');
test('TRACE 2.0 same-URL candidate is the real 5.37 app, not the beta shell',()=>{
 const html=prepareMainEntry();
 assert.match(html,/<meta name="trace-build" content="5\.37\.0">/);
 assert.match(html,/<title>TRACE<\/title>/);
 assert.match(html,/href="manifest\.webmanifest\?v=5\.37\.0"/);
 assert.match(html,/src="v5-app-5\.37\.0\.js"/);
 assert.match(html,/src="config\.js\?v=5\.37\.0"/);
 assert.match(html,/id="cloudLoginForm"/);
 assert.match(html,/id="cloudWorkspacePanel"/);
 assert.match(html,/NO-GO: root candidate only/);
 assert.doesNotMatch(html,/id="tracePreviewStatus"/);
 assert.doesNotMatch(html,/trace-international-preview-fixtures-1\.0\.0\.js/);
 assert.doesNotMatch(html,/v5-app-5\.36\.5\.js/);
});
test('preparation leaves all production files unchanged and cannot overwrite in-repo files',()=>{
 const before=['index.html','sw.js','manifest.webmanifest','trace-version.json','trace-2-0-beta.html']
  .map(p=>fs.readFileSync(path.join(root,p),'utf8'));
 const output=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'trace20-candidate-')),'index.html');
 try{
  assert.equal(safeOutput(output),output);
  assert.throws(()=>safeOutput(path.join(root,'index.html')),/Refusing/);
  assert.throws(()=>safeOutput(path.join(root,'release','index.html')),/Refusing/);
  assert.throws(()=>safeOutput('output.txt'),/Usage/);
  assert.ok(prepareMainEntry().length>30000);
 }finally{fs.rmSync(path.dirname(output),{recursive:true,force:true})}
 const after=['index.html','sw.js','manifest.webmanifest','trace-version.json','trace-2-0-beta.html']
  .map(p=>fs.readFileSync(path.join(root,p),'utf8'));
 assert.deepEqual(after,before);
 assert.equal(JSON.parse(after[3]).build,'5.36.5');
});
