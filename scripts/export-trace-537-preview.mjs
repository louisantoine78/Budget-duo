#!/usr/bin/env node
// Deterministic static-only fictional TRACE preview export; no repository copy.
import {readFile,lstat,mkdir,writeFile,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),outIndex=args.indexOf('--out');
const target=outIndex>=0?args[outIndex+1]:null;
if(!target||target.startsWith('--')||outIndex!==0||args.length!==2)
 throw Error('Usage: node scripts/export-trace-537-preview.mjs --out /tmp/trace-537-lab');
const dest=resolve(root,target);
if(dest===root||dest.startsWith(root+'/')&&!dest.startsWith(resolve(root,'trace-537-preview-export')+'/'))
 throw Error('Export destination must be outside the source repo or inside the dedicated export directory');
const check=spawnSync(process.execPath,['scripts/build-trace-preview-pwa.mjs','--check'],{cwd:root,encoding:'utf8',timeout:60000});
if(check.status!==0)throw Error('PWA asset cache is stale: '+check.stderr.slice(0,450));
const sw=await readFile(resolve(root,'trace-international-preview-sw.js'),'utf8');
const match=sw.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!match)throw Error('Missing generated service-worker asset allowlist');
const assets=JSON.parse(match[1]),entry='trace-international-preview.html';
if(!Array.isArray(assets)||!assets.includes(entry)||assets.length<55||new Set(assets).size!==assets.length)
 throw Error('Invalid static allowlist');
const forbidden=/^(?:config(?:\.example)?\.js|cloud\.js|index\.html|sw\.js|manifest\.webmanifest|app\.js|reset-trace\.html|\.env.*|package(?:-lock)?\.json|vercel\.json)$/i;
const whitelist=[...assets,'trace-international-preview-sw.js'].sort();
for(const name of whitelist){
 if(typeof name!=='string'||!name||name.startsWith('/')||name.includes('..')||
  !/^[A-Za-z0-9_./-]+$/.test(name)||forbidden.test(name))throw Error('Forbidden asset: '+name);
 const src=resolve(root,name);
 if(!src.startsWith(root+'/'))throw Error('File escapes root: '+name);
 const stat=await lstat(src);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error('Unexpected file type: '+name);
}
const html=await readFile(resolve(root,entry),'utf8');
const manifest=JSON.parse(await readFile(resolve(root,'trace-international-preview.webmanifest'),'utf8'));
if(!html.includes("connect-src 'none'")||
 !html.includes('name="robots" content="noindex, nofollow"')||
 manifest.id!=='./'+entry||manifest.scope!=='./'+entry||manifest.start_url!=='./'+entry)
 throw Error('CSP/manifest isolation changed');
await mkdir(dest,{recursive:true});
if((await readdir(dest)).length)throw Error('Output directory must be empty: '+dest);
const hashes={};
for(const name of whitelist){
 const bytes=await readFile(resolve(root,name)),dst=resolve(dest,name);
 await mkdir(dirname(dst),{recursive:true});
 await copyFile(resolve(root,name),dst);
 hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
const banner=[
'<!doctype html>',
'<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src '+ "'none'"+'; style-src '+ "'unsafe-inline'"+'">',
'<title>TRACE 5.37 — Laboratoire fictif</title>',
'<style>body{font-family:system-ui;background:#f7f5ef;color:#143e31;max-width:42rem;margin:9vh auto;padding:1rem;line-height:1.6}a{color:#126044;font-weight:700}</style>',
'</head><body><h1>TRACE 5.37 — Laboratoire fictif</h1><p>Cette version sert uniquement à tester l’installation et l’ergonomie. Les montants sont fictifs et les modifications sont perdues au rechargement. Aucune connexion à votre budget réel.</p>',
'<p><a href="./'+entry+'">Ouvrir le laboratoire TRACE</a></p></body></html>'
].join('\n')+'\n';
await writeFile(resolve(dest,'index.html'),banner,'utf8');
await writeFile(resolve(dest,'robots.txt'),'User-agent: *\nDisallow: /\n','utf8');
const audit={schema:'trace-537-isolated-export-v1',entry,manifest:'trace-international-preview.webmanifest',
 serviceWorker:'trace-international-preview-sw.js',count:whitelist.length,
 excludedProduction:['config.js','cloud.js','app.js','sw.js','original index.html'],
 files:hashes,security:{network:'connect-src none in entry',data:'fictional only',scope:'single HTML entry'}};
await writeFile(resolve(dest,'trace-lab-export-audit.json'),JSON.stringify(audit,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,output:dest,count:whitelist.length,entry,scope:manifest.scope,
 sourceWorker:hashes['trace-international-preview-sw.js']}));
