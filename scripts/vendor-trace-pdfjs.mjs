#!/usr/bin/env node
/**
 * TRACE 5.37.0 — opt-in preparation of pinned LOCAL PDF.js assets.
 * Run manually in a disposable checkout after inspecting the npm package:
 *   npm install --no-save --ignore-scripts pdfjs-dist@6.4.299
 *   node scripts/vendor-trace-pdfjs.mjs
 * This is NOT activation, a deployment, or an authorization to process bank PDFs.
 * Never run from CI or use a CDN at runtime.
 */
import { readFile, writeFile, mkdir, stat, lstat, mkdtemp, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkgDir=join(base,'node_modules','pdfjs-dist');
const EXPECTED='6.4.299';
const sourceFiles=[
 ['legacy/build/pdf.mjs','pdf.mjs'],
 ['legacy/build/pdf.worker.mjs','pdf.worker.mjs'],
 ['LICENSE','LICENSE']
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pkg=JSON.parse(await readFile(join(pkgDir,'package.json'),'utf8'));
if(pkg.name!=='pdfjs-dist'||pkg.version!==EXPECTED)
 throw Error('Refus : version PDF.js différente de '+EXPECTED);

// Validate *every* source before creating or changing any vendor output.
const assets=[];
for(const [relative,name] of sourceFiles){
 const from=join(pkgDir,relative),meta=await stat(from);
 if(!meta.isFile()||meta.size<300||meta.size>8*1024*1024)
  throw Error('Asset PDF.js invalide ou hors limite : '+relative);
 const bytes=await readFile(from);
 if(bytes.length!==meta.size)throw Error('Asset PDF.js modifié pendant la lecture : '+relative);
 if(name==='LICENSE'&&!/Apache License\s+Version 2\.0/.test(bytes.toString('utf8')))
  throw Error('Licence Apache 2.0 non vérifiée dans le package PDF.js');
 assets.push({name,bytes,sha256:hash(bytes)});
}
const target=join(base,'vendor','pdfjs');
try{await lstat(target);throw Error('Dossier vendor/pdfjs déjà présent : vérifie-le, sans écrasement automatique');}
catch(error){if(error.code!=='ENOENT')throw error;}
const parent=join(base,'vendor');
await mkdir(parent,{recursive:true});
let staged=await mkdtemp(join(parent,'.trace-pdfjs-staging-'));
try{
 const files={};
 for(const asset of assets){
  await writeFile(join(staged,asset.name),asset.bytes,{flag:'wx'});
  const onDisk=await readFile(join(staged,asset.name));
  if(hash(onDisk)!==asset.sha256)throw Error('Empreinte différente pendant la préparation : '+asset.name);
  files[asset.name]={sha256:asset.sha256,bytes:onDisk.length};
 }
 const manifest={product:'TRACE 5.37 local PDF.js adapter (candidate only)',
  package:'pdfjs-dist',version:EXPECTED,license:'Apache-2.0',
  distribution:'legacy/build',noRuntimeCDN:true,files,
  activation:'NOT ENABLED - requires manual CSP, offline and Safari QA'};
 await writeFile(join(staged,'trace-vendor-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 await rename(staged,target);
 staged=null;
 process.stdout.write('PDF.js '+EXPECTED+' assets prepared atomically, NOT enabled. Verify: node scripts/verify-trace-pdfjs.mjs\n');
}finally{if(staged)await rm(staged,{recursive:true,force:true});}
