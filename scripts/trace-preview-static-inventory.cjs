'use strict';
// Pure local inventory audit. No fetch, filesystem, secrets, deployment or writes.
// This checks the SW's asset list; the official builder --check authenticates bytes.
function checkLabStaticInventory({html='',manifestText='',workerSource=''}={}){
 const result={passed:false,manifestValid:false,requiredCount:0,cachedCount:0,
  missing:[],unexpected:[],unsafe:[],errors:[]};
 let manifest;
 try{manifest=JSON.parse(manifestText)}catch(_){result.errors.push('Manifest JSON invalide');return result}
 const entry='trace-international-preview.html';
 result.manifestValid=manifest.start_url==='./'+entry&&
  manifest.scope==='./'+entry&&manifest.id==='./'+entry;
 if(!result.manifestValid)result.errors.push('Portée ou ID du laboratoire incorrect');
 const assets=new Set([entry,'trace-international-preview.webmanifest',
  'vendor/pdfjs/pdf.mjs','vendor/pdfjs/pdf.worker.mjs',
  'vendor/pdfjs/LICENSE','vendor/pdfjs/trace-vendor-manifest.json']);
 for(const m of String(html).matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/g))
  assets.add(m[1].split('?')[0]);
 if(!Array.isArray(manifest.icons))result.errors.push('Icônes absentes du manifeste');
 else for(const icon of manifest.icons){
  if(typeof icon?.src==='string')assets.add(icon.src);
  else result.errors.push('Icône invalide');
 }
 const validName=name=>/^[a-zA-Z0-9_./-]+$/.test(name)&&
  !name.includes('..')&&!name.startsWith('/')&&
  !/^(?:index\.html|config\.js|cloud\.js|sw\.js|manifest\.webmanifest)$/.test(name)&&
  (/\.(?:html|js|mjs|css|webmanifest|png|svg|json)$/.test(name)||
   name==='vendor/pdfjs/LICENSE');
 result.unsafe=[...assets].filter(name=>!validName(name)).sort();
 if(result.unsafe.length)result.errors.push('Ressources hors laboratoire interdites');
 const match=String(workerSource).match(/\bconst ASSETS=(\[[\s\S]*?\]);\s*const URLS=/);
 let cached=[];
 if(!match)result.errors.push('Inventaire ASSETS absent du SW de laboratoire');
 else{
  try{cached=JSON.parse(match[1])}catch(_){result.errors.push('Inventaire SW JSON invalide')}
 }
 if(!Array.isArray(cached)){
  result.errors.push('Inventaire SW non tabulaire');cached=[];
 }
 if(new Set(cached).size!==cached.length)result.errors.push('Doublons dans le cache généré');
 if(cached.some(name=>typeof name!=='string'||!validName(name)))
  result.errors.push('Ressources SW non autorisées');
 const required=[...assets].sort(),actual=new Set(cached);
 result.requiredCount=required.length;result.cachedCount=cached.length;
 result.missing=required.filter(name=>!actual.has(name));
 result.unexpected=cached.filter(name=>!assets.has(name)).sort();
 if(result.missing.length)result.errors.push('Fichiers requis absents du cache généré');
 if(result.unexpected.length)result.errors.push('Fichiers non attendus dans le cache généré');
 if(!/\bconst CACHE=PREFIX\+'[0-9a-f]{24}';/.test(String(workerSource)))
  result.errors.push('Empreinte du SW absente ou invalide');
 result.passed=result.manifestValid&&!result.errors.length;
 return result;
}
module.exports={checkLabStaticInventory};
