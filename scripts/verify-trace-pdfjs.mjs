#!/usr/bin/env node
/** Offline pre-activation integrity check; it NEVER imports PDF.js or reads a bank PDF. */
import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(base,'vendor','pdfjs');
const EXPECTED='6.4.299';
const files=['LICENSE','pdf.mjs','pdf.worker.mjs'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile(join(dir,'trace-vendor-manifest.json'),'utf8'));
if(manifest.package!=='pdfjs-dist'||manifest.version!==EXPECTED||
   manifest.license!=='Apache-2.0'||manifest.distribution!=='legacy/build'||
   manifest.noRuntimeCDN!==true)throw Error('Manifest PDF.js non conforme');
const actual=await readdir(dir);
if(JSON.stringify(actual.sort())!==JSON.stringify([...files,'trace-vendor-manifest.json'].sort())||
   JSON.stringify(Object.keys(manifest.files||{}).sort())!==JSON.stringify([...files].sort()))
 throw Error('Manifest PDF.js incomplet ou fichiers supplémentaires');
for(const name of files){
 const path=join(dir,name),meta=await lstat(path);
 if(!meta.isFile()||meta.isSymbolicLink()||meta.size<300||meta.size>8*1024*1024)
  throw Error('Asset PDF.js invalide : '+name);
 const bytes=await readFile(path),record=manifest.files[name];
 if(!record||!Number.isInteger(record.bytes)||record.bytes!==bytes.length||
    !/^[a-f0-9]{64}$/.test(record.sha256)||sha256(bytes)!==record.sha256)
  throw Error('Empreinte SHA-256 non conforme : '+name);
 if(name==='LICENSE'&&!/Apache License\s+Version 2\.0/.test(bytes.toString('utf8')))
  throw Error('Licence Apache 2.0 non vérifiée');
}
// This is a PRE-activation check. Never silently enable the loader or workers.
const preview=await readFile(join(base,'trace-international-preview.html'),'utf8');
if(!/worker-src 'none'/.test(preview)||
   /<script\b[^>]*\bsrc\s*=\s*["'][^"']*trace-pdfjs-local-loader/i.test(preview)||
   /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*trace-pdfjs-local-loader/i.test(preview))
 throw Error('La préversion ne respecte plus la porte de sécurité PDF.js désactivée');
process.stdout.write('PDF.js '+EXPECTED+' : hachages et licence OK ; loader toujours désactivé. Safari/CSP NON validés.\n');
