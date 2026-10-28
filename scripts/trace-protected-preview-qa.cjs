'use strict';
// TRACE 5.37 fictional HTTPS/PWA auth regression. NEVER uses hosted credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os');
const path=require('node:path'),https=require('node:https'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {chromium}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const executablePath=process.env.TRACE_CHROMIUM_EXECUTABLE;
if(!executablePath)throw Error('TRACE_CHROMIUM_EXECUTABLE must be an isolated Chromium binary');
const root=process.env.TRACE_LAB_ROOT&&path.resolve(process.env.TRACE_LAB_ROOT);
if(!root||!fs.existsSync(path.join(root,'trace-lab-export-audit.json')))
 throw Error('TRACE_LAB_ROOT must point to a fictional-only PWA export');
const audit=JSON.parse(fs.readFileSync(path.join(root,'trace-lab-export-audit.json'),'utf8'));
if(audit.schema!=='trace-537-isolated-export-v1'||audit.count!==69)
 throw Error('Unexpected fictional export audit');
for(const [file,digest] of Object.entries(audit.files)){
 if(file.includes('..')||path.isAbsolute(file))throw Error('Unsafe filename');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest,file);
}
const allowed=new Set([...Object.keys(audit.files),'trace-international-preview-sw.js']);
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript','.mjs':'application/javascript',
 '.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json',
 '.json':'application/json'};
const certDir=fs.mkdtempSync(path.join(os.tmpdir(),'trace-fake-https-'));
const key=path.join(certDir,'key.pem'),cert=path.join(certDir,'cert.pem');
const openssl=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
 '-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1',
 '-keyout',key,'-out',cert],{encoding:'utf8',timeout:15000});
if(openssl.status!==0)throw Error('OpenSSL unavailable: '+(openssl.stderr||'').slice(-400));
let forceLoginForLicense=false,forceHtmlOkForLicense=false;
const hits=[];
const license='/vendor/pdfjs/LICENSE';
const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
 const url=new URL(req.url,'https://localhost');
 const pathname=decodeURIComponent(url.pathname);
 const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim());
 const authorized=cookie.includes('trace_lab_session=allowed');
 const record={path:pathname,authorized,status:0};
 hits.push(record);
 const send=(status,headers,body='')=>{
  record.status=status;
  res.writeHead(status,{'cache-control':'no-store','x-content-type-options':'nosniff',...headers}).end(body);
 };
 if(pathname==='/__login')return send(200,{'content-type':'text/html'},'<title>Simulated Vercel login</title>');
 if(!authorized||(forceLoginForLicense&&pathname===license))
  return send(302,{location:'/__login'});
 if(forceHtmlOkForLicense&&pathname===license)
  return send(200,{'content-type':'text/html'},'<title>Simulated expired login</title>');
 const name=pathname.slice(1);
 if(pathname==='/'||!allowed.has(name))return send(404,{'content-type':'text/plain'},'Not found');
 const full=path.resolve(root,name);
 if(!full.startsWith(root+path.sep))return send(403,{},'');
 return send(200,{'content-type':mime[path.extname(full)]||'text/plain'},fs.readFileSync(full));
});
let browser;
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='https://127.0.0.1:'+server.address().port;
 const entry=origin+'/trace-international-preview.html';
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors']});
 async function context(){
  const ctx=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'allow',viewport:{width:390,height:844}});
  await ctx.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==origin)return route.abort();
   return route.continue();
  });
  return ctx;
 }
 const blocked=await context();
 const anonymous=await blocked.newPage();
 await anonymous.goto(entry,{waitUntil:'domcontentloaded'});
 assert.equal(new URL(anonymous.url()).pathname,'/__login','No unauthenticated access to page');
 await blocked.close();
 const good=await context();
 await good.addCookies([{name:'trace_lab_session',value:'allowed',url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 const page=await good.newPage();
 await page.goto(entry,{waitUntil:'load'});
 let cacheCount=0;
 const deadline=Date.now()+30000;
 do{
  cacheCount=await page.evaluate(async()=>{
   const keys=(await caches.keys()).filter(x=>x.startsWith('trace-lab-537:'));
   if(keys.length!==1)return 0;
   return (await(await caches.open(keys[0])).keys()).length;
  });
  if(cacheCount===audit.count-1)break;
  await page.waitForTimeout(150);
 }while(Date.now()<deadline);
 assert.equal(cacheCount,audit.count-1,'Authenticated service-worker did not cache all expected static assets');
 const before=hits.filter(x=>x.authorized&&x.status===200);
 assert.ok(before.some(x=>x.path==='/trace-international-preview-sw.js'),'Worker fetched with cookie');
 assert.ok(before.some(x=>x.path==='/vendor/pdfjs/LICENSE'),'Worker assets fetched with cookie');
 await good.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.title(),/TRACE International/);
 assert.equal(await page.locator('.navbtn[data-nav="activity"]').count(),1);
 await good.close();
 // A same-origin sign-in redirect on one static asset must FAIL the install.
 forceLoginForLicense=true;
 const broken=await context();
 await broken.addCookies([{name:'trace_lab_session',value:'allowed',url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 const bp=await broken.newPage();
 await bp.goto(entry,{waitUntil:'load'});
 await bp.waitForFunction(()=>document.readyState==='complete',null,{timeout:15000});
 const start=Date.now();
 while(hits.filter(x=>x.path===license&&x.status===302).length<1&&Date.now()-start<25000)
  await bp.waitForTimeout(150);
 assert.ok(hits.some(x=>x.path===license&&x.status===302),'Auth redirect fixture reached cache installation');
 await bp.waitForTimeout(850);
 const remnants=await bp.evaluate(async()=>await caches.keys());
 assert.equal(remnants.filter(x=>x.startsWith('trace-lab-537:')).length,0,
  'Never retain incomplete/off-target login cache after auth redirect');
 await broken.close();
 // Some gateways respond with HTTP 200 HTML rather than a redirect. The
 // installation must not cache a login document under a static asset URL.
 forceLoginForLicense=false;
 forceHtmlOkForLicense=true;
 const htmlContext=await context();
 await htmlContext.addCookies([{name:'trace_lab_session',value:'allowed',url:origin,
  httpOnly:true,secure:true,sameSite:'Lax'}]);
 const htmlPage=await htmlContext.newPage();
 const seenBefore=hits.filter(x=>x.path===license&&x.status===200).length;
 await htmlPage.goto(entry,{waitUntil:'load'});
 const htmlDeadline=Date.now()+25000;
 while(hits.filter(x=>x.path===license&&x.status===200).length===seenBefore&&Date.now()<htmlDeadline)
  await htmlPage.waitForTimeout(150);
 assert.ok(hits.some(x=>x.path===license&&x.status===200),
  'Simulated 200 HTML sign-in response reached the worker');
 await htmlPage.waitForTimeout(1000);
 const htmlRemnants=await htmlPage.evaluate(async()=>await caches.keys());
 assert.equal(htmlRemnants.filter(x=>x.startsWith('trace-lab-537:')).length,0,
  'HTTP 200 HTML login response must not produce a ready offline cache');
 await htmlContext.close();
 const report={schema:'trace-537-protected-https-qa-v1',passed:true,
  expectedExportAssets:audit.count,cachedAssets:cacheCount,anonymousRedirected:true,authenticatedWorkerAssets:before.length,
  cookieOnWorker:before.some(x=>x.path==='/trace-international-preview-sw.js'),
  cookieOnCachedAssets:before.some(x=>x.path===license),
  offlineReload:true,authRedirectRejected:true,authHtml200Rejected:true,partialCacheRemoved:true,
  certification:'Local HTTPS with fake session only; not real Vercel Authentication or Safari iOS'};
 const idx=process.argv.indexOf('--report');
 if(idx!==-1){const output=process.argv[idx+1];if(!output)throw Error('Missing --report path');
  fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1})
.finally(async()=>{if(browser)await browser.close();server.close();fs.rmSync(certDir,{recursive:true,force:true})});
