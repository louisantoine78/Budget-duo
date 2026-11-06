'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'trace-2-0-beta.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'trace-international-preview.html'),'utf8');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'trace-2-0-beta.webmanifest'),'utf8'));
test('real beta entry preserves required editing and bank panels without fictional tools',()=>{
 for(const id of ['cloudGate','cloudLoginForm','cloudWorkspacePanel','app',
 'wealthTotal','importResult','addAsset','activitySharing'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(!html.includes('traceDeferredSandbox'));
 assert.ok(!html.includes('trace-import-test-tools'));
 assert.ok(!html.includes('LABORATOIRE FICTIF'));
 assert.ok(!html.includes('Données entièrement fictives'));
});
test('real beta loads public project config and actual Supabase client before candidate app',()=>{
 const urls=[
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
 'config.js?v=5.37.0','v5-app-5.37.0.js'
 ].map(x=>html.indexOf('src="'+x+'"'));
 assert.ok(urls.every(x=>x>0));
 assert.ok(urls[0]<urls[1]&&urls[1]<urls[2]);
 assert.match(html,/eiqvabddtgfonouyeavi\.supabase\.co/);
 assert.ok(!html.includes('service_role'));
});
test('real beta never registers the isolated fictional worker or uses fake session fixtures',()=>{
 assert.ok(!html.includes('trace-international-preview-fixtures-1.0.0.js'));
 assert.ok(!html.includes('trace-preview-pwa-1.0.0.js'));
 assert.ok(!html.includes('trace-international-preview-sw.js'));
 assert.ok(!html.includes('__TRACE_INTERNATIONAL_PREVIEW__'));
 assert.ok(!html.includes('serviceWorker.register'));
 assert.ok(lab.includes('trace-international-preview-fixtures-1.0.0.js'));
});
test('beta is a separate launch path from stable index or preview, with no automatic version redirect',()=>{
 assert.match(app,/location\.pathname\.endsWith\('\/trace-2-0-beta\.html'\)/);
 assert.match(html,/<title>TRACE 2\.0 \| Bêta couple<\/title>/);
 assert.ok(!html.includes('v5-app-5.36.5.js'));
 assert.ok(!html.includes('sw.js'));
});
test('CSP restricts Supabase and official FX endpoint, without fictional offline policy',()=>{
 assert.match(html,/connect-src 'self' https:\/\/eiqvabddtgfonouyeavi\.supabase\.co wss:\/\//);
 assert.match(html,/https:\/\/www\.bankofcanada\.ca/);
 assert.match(html,/script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
 assert.ok(!html.includes("connect-src 'none'"));
 assert.ok(!html.includes("default-src *"));
});
test('beta manifest installs only beta route and does not target isolated fictional preview',()=>{
 assert.equal(manifest.start_url,'./trace-2-0-beta.html');
 assert.equal(manifest.scope,'./trace-2-0-beta.html');
 assert.equal(manifest.id,'./trace-2-0-beta.html');
 assert.equal(manifest.short_name,'TRACE 2.0');
 assert.ok(html.includes('href="trace-2-0-beta.webmanifest"'));
});
test('all release gates remain fail-closed independent of the beta HTML',()=>{
 assert.ok(app.includes('const pendingImports=null;'));
 assert.ok(app.includes('verified:false,durable:false'));
 assert.match(app,/trace_cas_save_document/);
});
