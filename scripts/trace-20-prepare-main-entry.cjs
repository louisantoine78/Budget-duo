'use strict';
/*
 * Prepare the same-URL TRACE 2.0 entrypoint for a future reviewed cutover.
 * OFFLINE ONLY. This command must never replace production index.html or deploy.
 * It does not access or alter Supabase, GitHub main, sw.js or trace-version.json.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

function replaceExactlyOnce(s,needle,replacement){
 const first=s.indexOf(needle);
 if(first<0||s.indexOf(needle,first+needle.length)>=0)
  throw Error('Expected one release entry marker: '+needle.slice(0,90));
 return s.slice(0,first)+replacement+s.slice(first+needle.length);
}

function prepareMainEntry(){
 const stable=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const version=JSON.parse(fs.readFileSync(path.join(ROOT,'trace-version.json'),'utf8'));
 if(!stable.includes('<meta name="trace-build" content="5.36.5">')||
    version.build!=='5.36.5')
  throw Error('Stable main entry or version changed; re-review the cutover');
 let html=fs.readFileSync(path.join(ROOT,'trace-2-0-beta.html'),'utf8');
 html=replaceExactlyOnce(html,'content="5.37.0-beta"','content="5.37.0"');
 html=replaceExactlyOnce(html,
  '<title>TRACE 2.0 | Bêta couple</title>','<title>TRACE</title>');
 html=replaceExactlyOnce(html,
  '<link rel="manifest" href="trace-2-0-beta.webmanifest">',
  '<link rel="manifest" href="manifest.webmanifest?v=5.37.0">');
 html=replaceExactlyOnce(html,
  '<meta name="robots" content="noindex, nofollow">',
  '<meta name="robots" content="noindex, nofollow">\n'+
  '<meta name="trace-release-status" content="NO-GO: root candidate only; PWA upgrade, hosted write safety and external rollback remain unverified">');
 const banner=/  <aside id="tracePreviewStatus" class="trace-intl-lab-banner" role="status">[\s\S]*?<\/aside>\r?\n/;
 const match=html.match(banner);
 if(!match||html.indexOf('id="tracePreviewStatus"',match.index+match[0].length)>=0)
  throw Error('Beta banner missing or duplicated');
 html=html.replace(banner,'');
 for(const required of [
   'id="cloudGate"','id="cloudLoginForm"','id="cloudWorkspacePanel"',
   'id="app"','src="config.js?v=5.37.0"','src="v5-app-5.37.0.js"',
   'https://eiqvabddtgfonouyeavi.supabase.co'
 ])if(!html.includes(required))throw Error('Required real TRACE element missing: '+required);
 for(const forbidden of ['trace-international-preview-fixtures-1.0.0.js',
   'trace-preview-pwa-1.0.0.js','src="v5-app-5.36.5.js"','TRACE 2.0 — BÊTA COUPLE',
   'serviceWorker.register('])
  if(html.includes(forbidden))throw Error('Forbidden release entry marker: '+forbidden);
 // Explicit NO-GO: worker/legacy-data safety is not resolved by changing HTML.
 if(!html.includes('NO-GO: root candidate only'))
  throw Error('Missing non-deployable staging guard');
 return html;
}
function safeOutput(name){
 if(!name||!name.endsWith('.html'))throw Error('Usage: --out /tmp/trace-20-root-candidate.html');
 const target=path.resolve(name),rel=path.relative(ROOT,target);
 if(rel===''||(!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel)))
  throw Error('Refusing to write any file inside the repository');
 return target;
}
if(require.main===module){
 if(process.argv.length!==4||process.argv[2]!=='--out')
  throw Error('Usage: node scripts/trace-20-prepare-main-entry.cjs --out /tmp/trace-20-root-candidate.html');
 const target=safeOutput(process.argv[3]),html=prepareMainEntry();
 fs.writeFileSync(target,html,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({entry:target,build:'5.37.0',candidateOnly:true,
   productionModified:false,readyToDeploy:false,bytes:Buffer.byteLength(html)}));
}
module.exports={prepareMainEntry,safeOutput};
