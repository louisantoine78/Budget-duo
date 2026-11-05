'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../v5-app-5.37.0.js'),'utf8');
const begin=app.indexOf('let trace20ImportInFlight=0;');
const until="},{once:true});";
const end=app.indexOf(until,begin);
assert.ok(begin>0&&end>begin,'actual app import monitor is missing');
const monitor=app.slice(begin,end+until.length);
function fixture(){
 const listeners=new Map(),window={TraceBankDocuments:{
  async extract(file,notify,options){
   if(file.mode==='fail')throw Error('fictional OCR error');
   return file.task;
  }}};
 window.addEventListener=(name,cb,opts)=>{listeners.set(name,cb);};
 const ctx={window,Promise,Set,Error,Math};
 vm.runInNewContext(monitor+
 '\nwindow.__read=()=>({pending:trace20ImportInFlight,failures:[...trace20ImportReadFailures]});'+
 '\nwindow.__begin=trace20BeginImportRead;'+
 '\nwindow.__track=trace20TrackImportRead;',ctx);
 return{window,loaded:()=>listeners.get('DOMContentLoaded')()};
}
function deferred(){
 let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
 return{promise,resolve,reject};
}
test('actual import monitor is fail-closed until the operation settles',async()=>{
 const x=fixture(),f=deferred();x.loaded();
 const out=x.window.TraceBankDocuments.extract({task:f.promise},()=>{},{hintDate:'2026-10-01'});
 await Promise.resolve();
 assert.equal(x.window.__read().pending,1);
 f.resolve({text:'fictional bank statement',pageCount:1});
 const result=await out;
 assert.equal(result.pageCount,1);
 assert.equal(x.window.__read().pending,0);
 assert.deepEqual([...x.window.__read().failures],[]);
});
test('two PDF/OCR extractions run concurrently and do not incorrectly clear each other',async()=>{
 const x=fixture(),a=deferred(),b=deferred();x.loaded();
 const first=x.window.TraceBankDocuments.extract({task:a.promise});
 const second=x.window.TraceBankDocuments.extract({task:b.promise});
 assert.equal(x.window.__read().pending,2);
 a.resolve({text:'first'});await first;
 assert.equal(x.window.__read().pending,1);
 b.resolve({text:'second'});await second;
 assert.equal(x.window.__read().pending,0);
});
test('OCR error preserves caller-visible rejection and latches failure',async()=>{
 const x=fixture();x.loaded();
 await assert.rejects(x.window.TraceBankDocuments.extract({mode:'fail'}),/fictional OCR error/);
 assert.equal(x.window.__read().pending,0);
 assert.deepEqual([...x.window.__read().failures],['pdf-ocr']);
});
test('aborted CSV read closes exactly once and records the failure',()=>{
 const x=fixture();
 const close=x.window.__begin('csv');
 assert.equal(x.window.__read().pending,1);
 close(true);close(false);
 assert.equal(x.window.__read().pending,0);
 assert.deepEqual([...x.window.__read().failures],['csv']);
});
test('invalid import labels do not create an in-flight operation',()=>{
 const x=fixture();
 assert.throws(()=>x.window.__begin('unknown-bank'),/TRACE_IMPORT_KIND_UNKNOWN/);
 assert.equal(x.window.__read().pending,0);
});
test('actual reader handlers account for success, errors, abort and synchronous failures',()=>{
 const a=app.slice(app.indexOf('function importFile(file){'),app.indexOf('/* Merchant suggestions never silently validate',app.indexOf('function importFile(file){')));
 assert.match(a,/trace20BeginImportRead\('csv'\)/);
 assert.ok(app.indexOf('function trace20BeginImportRead(')<app.indexOf('function importFile('),
  'The real candidate includes the actual import monitor before CSV ingestion');
 assert.match(a,/reader\.onerror=\(\)=>\{finishRead\(true\)/);
 assert.match(a,/reader\.onabort=\(\)=>\{finishRead\(true\)/);
 assert.match(a,/finally\{finishRead\(false\);\}/);
 assert.match(a,/catch\(e\)\{finishRead\(true\);box\.textContent='Impossible de lire le fichier\.';\}/);
});
test('candidate wraps original protected bank-document reader without editing its source',()=>{
 const moduleName='trace-bank-doc-1.11.1.js';
 const child=require('node:child_process');
 const root=path.resolve(__dirname,'..');
 const original=child.execFileSync('git',['show','6eb6c17e5c9eba2d3727ebea404cce5fec0424c6:'+moduleName],{cwd:root});
 assert.ok(original.equals(fs.readFileSync(path.join(root,moduleName))));
 assert.match(monitor,/original\.apply\(this,args\)/);
});
