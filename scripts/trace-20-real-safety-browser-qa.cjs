'use strict';
/* Test actual 5.37 app bridge with isolated fictional export, no real HTTP. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os');
const path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium,webkit}=require(process.env.TRACE_PLAYWRIGHT_MODULE||'playwright-core');
const repo=path.resolve(__dirname,'..');
const target=fs.mkdtempSync(path.join(os.tmpdir(),'trace20-safety-'));
const result=cp.spawnSync(process.execPath,
 ['scripts/export-trace-537-preview.mjs','--out',target],
 {cwd:repo,encoding:'utf8',timeout:25000});
if(result.status!==0)throw Error('Fail-closed fictional export: '+(result.stderr||result.stdout));
const root=target;
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.webmanifest':'application/manifest+json',
 '.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  if(!rel||rel.includes('..')||/^(?:config|cloud|sw)\.js$/.test(rel)){
   res.writeHead(404).end('not public');return;
  }
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep))throw Error('Outside laboratory');
  const data=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'}).end(data);
 }catch{res.writeHead(404).end('not in fictional export')}
});
async function check(name,engine,opts){
 const browser=await engine.launch({headless:true,...opts});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 const errors=[],external=[];
 const origin='http://127.0.0.1:'+server.address().port;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  if(!route.request().url().startsWith(origin+'/')){
   external.push(route.request().url());return route.abort();
  }
  return route.continue();
 });
 try{
  await page.goto(origin+'/trace-international-preview.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.Trace20FinancialSafety&&
   typeof window.Trace20FinancialSafety.read==='function');
  let state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.verified,false);
  assert.equal(state.durable,false);
  assert.equal(state.pendingImports,null);
  assert.equal(state.knownImportWrites,0);
  assert.equal(state.knownImportReads,0);
  assert.ok(state.pendingWrites>=0);
  assert.equal(state.coverageIncomplete,true);
  // This invokes the actual bank reader with a deliberately unsupported
  // fictional file. It must fail locally without any external request.
  const preImportSync=state.pendingSync;
  const pdfRejected=await page.evaluate(async()=>{
   try{await window.TraceBankDocuments.extract({
    name:'fictional.unsupported',type:'text/plain',size:5
   });return false}catch(e){return /Format non pris en charge/.test(String(e.message))}
  });
  assert.equal(pdfRejected,true);
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.knownImportReads,0);
  assert.ok(state.pendingSync>=preImportSync+1,'PDF/OCR error must be latched');

  // A paused FileReader in the actual UI proves CSV activity is counted
  // while a browser read is pending, then cleared and flagged on abort.
  await page.waitForFunction(()=>typeof document.querySelector('#importFile')?.onchange==='function');
  await page.evaluate(()=>{
   window.__qaOriginalFileReader=window.FileReader;
   window.FileReader=class{
    readAsText(){window.__qaCsvReader=this}
   };
   const input=document.querySelector('#importFile');
   input.onchange({target:{files:[{
    name:'fictional.csv',type:'text/csv',size:24
   }],value:'fictional.csv'}});
  });
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.knownImportReads,1,'CSV FileReader not counted');
  await page.evaluate(()=>{
   window.__qaCsvReader.onabort();
   window.FileReader=window.__qaOriginalFileReader;
  });
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.knownImportReads,0);
  assert.ok(state.pendingSync>=preImportSync+2,'aborted CSV must latch');
  await page.evaluate(()=>{
   document.querySelector('#sheetBackdrop').classList.add('open');
   document.body.classList.add('sheet-open');
  });
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.unsavedDrafts,1);
  await page.evaluate(()=>{
   document.querySelector('#sheetBackdrop').classList.remove('open');
   document.body.classList.remove('sheet-open');
   document.querySelector('#syncPill').dataset.status='saving';
  });
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.ok(state.pendingSync>=1);
  assert.equal(state.verified,false);
  // Real candidate code, fictional Promise only: no cloud account, no RPC.
  await page.evaluate(()=>{
   window.__TRACE20_QA_FINISH__=null;
   window.__TRACE20_QA_PROMISE__=window.Trace20MutationTracker.run(
    'profile:name',()=>new Promise(resolve=>window.__TRACE20_QA_FINISH__=resolve));
  });
  await page.waitForFunction(()=>typeof window.__TRACE20_QA_FINISH__==='function');
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.ok(state.pendingWrites>=1,'running auxiliary save not reflected');
  await page.evaluate(async()=>{
   window.__TRACE20_QA_FINISH__({data:{id:'fictional'},error:null});
   await window.__TRACE20_QA_PROMISE__;
  });
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.equal(state.pendingWrites,0,'auxiliary counter must drain');
  await page.evaluate(()=>window.Trace20MutationTracker.run('household:invitation',
   async()=>({data:null,error:{message:'fictional rejection'}})));
  state=await page.evaluate(()=>window.Trace20FinancialSafety.read());
  assert.ok(state.pendingSync>=1,'remote rejection must latch');
  assert.equal(state.verified,false);
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  return{name,passed:true,liveCandidateBridge:true,auxiliaryCountVerified:true,
   remoteErrorLatched:true,ocrFailureLatched:true,csvReadAbortTracked:true,
   fictional:true,newExternalRequests:0,realIphone:false,productionReady:false};
 }finally{await context.close();await browser.close()}
}
(async()=>{try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const rows=[];
 rows.push(await check('Chromium',chromium,{executablePath:process.env.TRACE_CHROMIUM_EXECUTABLE,args:['--no-sandbox']}));
 rows.push(await check('WebKit',webkit,{}));
 console.log(JSON.stringify({passed:true,rows}));
 }catch(e){console.error('TRACE 2.0 actual safety bridge QA FAILED:',e.stack);process.exitCode=1;
 }finally{server.close();fs.rmSync(target,{recursive:true,force:true})}
})();
