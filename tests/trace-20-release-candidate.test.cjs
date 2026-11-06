'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'trace-20-release-candidate.html'),'utf8');
const stable=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('release candidate keeps original installed app scope and original launch URL',()=>{
 assert.match(html,/href="manifest.webmanifest\?v=5\.37\.0"/);
 assert.match(html,/content="5\.37\.0"/);
 assert.match(html,/<title>TRACE<\/title>/);
 assert.match(html,/navigator\.serviceWorker\.register\('\.\/sw\.js'/);
 assert.ok(html.includes('src="trace-20-fresh-start-1.0.0.js"'));
 assert.ok(html.includes('window.__TRACE20_FRESH_START_REQUIRED__=true'));
 assert.ok(html.indexOf('src="trace-20-fresh-start-1.0.0.js"')<
  html.indexOf('src="v5-app-5.37.0.js"'));
 assert.ok(!html.includes('tracePreviewStatus'));
 assert.ok(!html.includes('v5-app-5.36.5.js'));
 assert.match(html,/src="config\.js\?v=5\.37\.0"/);
});
test('candidate does not automatically publish or change version of live app',()=>{
 assert.ok(stable.includes('content="5.36.5"'));
 assert.ok(!stable.includes('window.__TRACE20_FRESH_START_REQUIRED__'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'trace-version.json'),'utf8')).build,'5.36.5');
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 assert.ok(app.includes("window.__TRACE20_FRESH_START_REQUIRED__===true&&!freshDocs.active"));
});

test('every versioned CSS and JS referenced by the release candidate is present',()=>{
 const refs=[...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/g)]
  .map(x=>x[1].split('?')[0])
  .filter(x=>!x.startsWith('https:')&&!x.startsWith('#'));
 for(const p of refs){
  assert.match(p,/^[A-Za-z0-9_./-]+$/);
  assert.ok(!p.includes('..'),'unsafe asset: '+p);
  assert.ok(fs.existsSync(path.join(root,p)),'missing asset: '+p);
 }
 assert.ok(refs.length>=60);
});
