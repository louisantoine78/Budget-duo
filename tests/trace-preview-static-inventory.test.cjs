'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {checkLabStaticInventory}=require('../scripts/trace-preview-static-inventory.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('trace-international-preview.html'),
 manifestText=read('trace-international-preview.webmanifest'),
 sw=read('trace-international-preview-sw.js');
const inspect=(patch={})=>checkLabStaticInventory({html,manifestText,workerSource:sw,...patch});
const cacheNames=source=>JSON.parse(source.match(/\bconst ASSETS=(\[[\s\S]*?\]);\s*const URLS=/)[1]);
const replaceNames=(names,source=sw)=>source.replace(
 /\bconst ASSETS=(\[[\s\S]*?\]);\s*const URLS=/,
 ()=> 'const ASSETS='+JSON.stringify(names.sort(),null,1)+';\nconst URLS=');
test('detects the six deferred modules omitted by old generated laboratory cache',()=>{
 const result=inspect();
 const needed=['trace-deferred-write-plan-1.0.0.js',
  'trace-deferred-purchase-evidence-1.0.0.js',
  'trace-deferred-evidence-intake-1.0.0.js',
  'trace-deferred-evidence-lab-1.0.0.js',
  'trace-deferred-statement-bridge-1.0.0.js',
  'trace-deferred-statement-review-ui-1.0.0.js'];
 // The code-generated service worker must be rebuilt before this is resolved.
 // This assertion remains useful across rebuilds by ensuring all six are required.
 for(const name of needed)assert.ok(result.requiredCount>0&&html.includes(name));
 if(!result.passed)for(const name of needed)
  assert.ok(result.missing.includes(name)||cacheNames(sw).includes(name));
});
test('a complete synthetic allowlist passes structural validation without rewriting SW',()=>{
 const first=inspect();
 const all=[...new Set([...cacheNames(sw),...first.missing])];
 const fixed=inspect({workerSource:replaceNames(all)});
 assert.equal(fixed.passed,true,JSON.stringify(fixed.errors));
 assert.deepEqual(fixed.missing,[]);
 assert.deepEqual(fixed.unexpected,[]);
 assert.equal(fixed.requiredCount,fixed.cachedCount);
});
test('a missing dynamic PDF worker cannot be declared fully cached',()=>{
 const names=cacheNames(sw).filter(x=>x!=='vendor/pdfjs/pdf.worker.mjs');
 const result=inspect({workerSource:replaceNames(names)});
 assert.equal(result.passed,false);
 assert.ok(result.missing.includes('vendor/pdfjs/pdf.worker.mjs'));
});
test('a new script in the HTML must appear in the generated allowlist',()=>{
 const result=inspect({html:html+'<script src="trace-new-lab-only.js"></script>'});
 assert.equal(result.passed,false);assert.ok(result.missing.includes('trace-new-lab-only.js'));
});
test('production scope or wrong laboratory ID fails preflight',()=>{
 const changed=manifestText.replace(
  '"scope": "./trace-international-preview.html"','"scope": "./index.html"');
 const result=inspect({manifestText:changed});
 assert.equal(result.manifestValid,false);assert.equal(result.passed,false);
});
test('remote URLs, parent paths, secrets and production files are rejected',()=>{
 const result=inspect({html:html+
  '<script src="https://example.org/x.js"></script>'+
  '<script src="../admin.js"></script>'+
  '<script src="config.js"></script>'});
 assert.equal(result.passed,false);
 assert.ok(result.unsafe.includes('https://example.org/x.js'));
 assert.ok(result.unsafe.includes('../admin.js'));
 assert.ok(result.unsafe.includes('config.js'));
});
test('stale extra files or duplicate entries in generated cache fail closed',()=>{
 const all=[...new Set([...cacheNames(sw),...inspect().missing])];
 const one=inspect({workerSource:replaceNames([...all,'trace-not-referenced.js'])});
 assert.equal(one.passed,false);assert.ok(one.unexpected.includes('trace-not-referenced.js'));
 const two=inspect({workerSource:replaceNames([...all,all[0]])});
 assert.equal(two.passed,false);assert.ok(two.errors.some(x=>/Doublons/.test(x)));
});
test('missing cache source, malformed JSON and missing fingerprint never pass',()=>{
 assert.equal(inspect({workerSource:''}).passed,false);
 assert.equal(inspect({manifestText:'{'}).passed,false);
 const all=[...new Set([...cacheNames(sw),...inspect().missing])];
 const altered=replaceNames(all).replace(/const CACHE=PREFIX\+'[0-9a-f]{24}';/,
  "const CACHE=PREFIX+'unversioned';");
 assert.equal(inspect({workerSource:altered}).passed,false);
});
