#!/usr/bin/env node
/**
 * TRACE 5.37 — explicitly opt-in, one-off local PDF.js asset vendor script.
 * Does NOT run in CI, deploy, read bank documents, update a production page,
 * use a CDN at runtime, or contact Supabase.
 *
 * Before running, install pdfjs-dist@6.4.299 into a temporary local build
 * environment (NOT production): npm install --no-save pdfjs-dist@6.4.299
 * Review the npm distribution and LICENSE. Then run:
 *   node scripts/vendor-trace-pdfjs.mjs
 *
 * This only writes vendor/pdfjs/* on the operator's working copy.
 * No caller should enable the loader until Safari/CSP checks succeed.
 */
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const packageDir=join(base,'node_modules','pdfjs-dist');
const pkg=JSON.parse(await readFile(join(packageDir,'package.json'),'utf8'));
const EXPECTED='6.4.299';
if(pkg.name!=='pdfjs-dist'||pkg.version!==EXPECTED)
 throw Error('Refus: pdfjs-dist doit correspondre exactement à '+EXPECTED);
const paths=['legacy/build/pdf.mjs','legacy/build/pdf.worker.mjs','LICENSE'];
const target=join(base,'vendor','pdfjs');await mkdir(target,{recursive:true});
const hashes={};
for(const relative of paths){
 const source=join(packageDir,relative),name=relative.split('/').pop();
 const meta=await stat(source);
 if(!meta.isFile()||meta.size<300||meta.size>8*1024*1024)
  throw Error('Asset PDF.js absent, vide ou trop volumineux: '+relative);
 const bytes=await readFile(source);
 hashes[name]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 await copyFile(source,join(target,name));
}
const manifest={
 product:'TRACE 5.37 local PDF.js adapter (candidate only)',
 package:'pdfjs-dist',version:EXPECTED,license:'Apache-2.0',
 distribution:'legacy/build',noRuntimeCDN:true,
 files:hashes,
 activation:'manual QA gate: local module loader + worker-src self CSP + Safari acceptance'
};
await writeFile(join(target,'trace-vendor-manifest.json'),
 JSON.stringify(manifest,null,2)+'\n','utf8');
process.stdout.write('Local PDF.js '+EXPECTED+' assets staged; activation is NOT automatic.\n');
