#!/usr/bin/env node
// Assemble an AUTH BOOT rehearsal entry for the 5.37 candidate, never production.
// No credentials, network or DB access; output outside deployment roots only.
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {resolve,dirname,isAbsolute,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),out=args[0]==='--out'&&args.length===2?args[1]:null;
if(!out)throw Error('Usage: node scripts/build-trace-537-auth-entry.mjs --out /tmp/trace-537-auth-candidate.html');
const target=resolve(root,out),relativeToRoot=relative(root,target);
if(!target.endsWith('.html')||relativeToRoot===''||
  (!relativeToRoot.startsWith('..'+sep)&&!isAbsolute(relativeToRoot)&&
   !relativeToRoot.startsWith('trace-537-preview-export'+sep)))
 throw Error('Auth rehearsal entry must be outside the project or inside trace-537-preview-export/');
const preview=await readFile(resolve(root,'trace-international-preview.html'),'utf8');
const stable=await readFile(resolve(root,'index.html'),'utf8');
const stableLib=stable.match(/<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+)"><\/script>/);
if(!stableLib||!stable.includes('<script src="config.js?v=5.2.2"></script>'))
 throw Error('Stable external auth bootstrap changed; explicit release review required');
let html=preview;
const replace=(needle,next)=>{
 if(html.split(needle).length!==2)throw Error('Missing or duplicate lab marker: '+needle.slice(0,75));
 html=html.replace(needle,next);
};
replace('content="5.37.0-lab"','content="5.37.0-auth-candidate"');
replace('<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; connect-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; object-src \'none\'; worker-src \'self\'; form-action \'none\'; base-uri \'self\';">',
 '<meta name="trace-release-status" content="NO-GO: isolated auth rehearsal only; not deployable">');
replace('<title>TRACE International 5.37.0 | Laboratoire fictif</title>',
 '<title>TRACE 5.37.0 — Candidat de connexion isolé</title>');
replace('<link rel="manifest" href="trace-international-preview.webmanifest">','');
const banner=html.match(/  <aside id="tracePreviewStatus"[\s\S]*?<\/aside>\n/);
if(!banner||html.match(/id="tracePreviewStatus"/g)?.length!==1)throw Error('Laboratory banner changed');
html=html.replace(banner[0],'');
const fixture='<script src="trace-international-preview-fixtures-1.0.0.js"></script>';
replace(fixture,'<script src="'+stableLib[1]+'"></script>\n<script src="config.js?v=5.2.2"></script>');
replace('<script src="trace-preview-pwa-1.0.0.js"></script>','');
if(html.includes('TRACE_INTERNATIONAL_PREVIEW')||html.includes('trace-international-preview-fixtures')||
 html.includes('trace-preview-pwa-1.0.0.js')||html.includes('tracePreviewStatus')||
 !html.includes('src="v5-app-5.37.0.js"')||
 html.includes('src="v5-app-5.36.5.js"'))
 throw Error('Auth entry contains a lab-only path or old finance engine');
const local=new Set();
for(const item of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/g)){
 const url=item[1].split('?')[0];
 if(url.startsWith('https://')||url.startsWith('#'))continue;
 if(!/^[A-Za-z0-9_./-]+$/.test(url)||url.includes('..')||url==='config.js')
  {if(url!=='config.js')throw Error('Unsafe asset '+url);continue;}
 local.add(url);
}
for(const file of local){
 const p=resolve(root,file),rel=relative(root,p);
 if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Asset outside project');
 if(!(await lstat(p)).isFile())throw Error('Missing candidate asset: '+file);
}
// The output intentionally has no live config, no SW registration and no
// production entry mutation. Authentication requires a local test stub.
if(html.includes("navigator.serviceWorker.register("))throw Error('Unexpected live SW registration');
await mkdir(dirname(target),{recursive:true});
await writeFile(target,html,'utf8');
console.log('AUTH_CANDIDATE_ONLY '+target+' '+local.size+' local assets; production unchanged');

