'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');

function fixture(mode='failure'){
 let fileChange;
 const overlay={innerHTML:'',classList:{add(){},remove(){},contains(){return false}},
  querySelector(){return{onclick:null}},querySelectorAll(){return[]}};
 const nodes=new Map();
 const input={value:'',click(){},addEventListener(event,fn){if(event==='change')fileChange=fn;}};
 const field=s=>{
  if(s==='#traceSmartOverlay')return overlay;
  if(s==='#traceSmartFiles')return input;
  if(!nodes.has(s))nodes.set(s,{textContent:'',innerHTML:'',onclick:null,
   value:'',disabled:false,addEventListener(){}});
  return nodes.get(s);
 };
 const document={querySelector:field,addEventListener(){}};
 const file={name:'novembre.png',size:12000};
 let stages=0;
 const accounts=[{id:'card',name:'Carte CAD',type:'card',currency:'CAD'}];
 const bridge={accounts:()=>accounts,month:()=> '2026-11',smartDrafts:()=>[],
  async smartStageRows(account,name,rows){stages++;return{added:rows.length,matched:0,suppressed:0};}};
 const win={TraceBankBridge:bridge,TraceImportCalendar:{render(){},closeDayAction(){}},
  TraceImportGuide:{genericCardPaymentLabel:()=>false,suggest:()=> 'expense'},
  TraceBankDocuments:{
   async extract(){
    if(mode==='failure')throw Error('Échec OCR simulé : impossible de charger le module.');
    const row={date:'2026-11-11',name:'Restaurant test',
      amount:20.98,bankDirection:'out'};
    if(mode==='unbilled')return{text:'Autorisées non facturées',structuredCandidates:[
     {...row,authorizationPending:true}],quality:{}};
    return{text:'Novembre 2026',structuredCandidates:[row],quality:{}};
   },
   sourceAccountHints(){return{currency:'CAD',kind:'card'};},
   extractCandidates(){return{candidates:[]};}
  }};
 vm.runInNewContext(source,{
  window:win,document,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  console,Date,Intl,setTimeout,clearTimeout
 },{filename:'trace-smart-inbox-3.5.0.js'});
 return{window:win,overlay,file,stages:()=>stages,field,
  change(){assert.ok(fileChange);fileChange({target:{files:[file],value:'x'}});}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('OCR error keeps filename and exact reason with retry and manual actions',async()=>{
 const f=fixture('failure');
 f.window.TraceSmartInbox.start('card');f.change();
 await flush();await flush();
 assert.match(f.overlay.innerHTML,/novembre.png/);
 assert.match(f.overlay.innerHTML,/Échec OCR simulé/);
 assert.match(f.overlay.innerHTML,/data-smart-retry="0"/);
 assert.match(f.overlay.innerHTML,/data-smart-manual="0"/);
 assert.match(f.overlay.innerHTML,/Aucune ligne enregistrée/);
 assert.equal(f.stages(),0);
});
test('successful extraction stages for review without automatically posting',async()=>{
 const f=fixture('success');
 f.window.TraceSmartInbox.start('card');f.change();
 await flush();await flush();
 assert.match(f.overlay.innerHTML,/1 nouvelle\(s\) opération\(s\)/);
 assert.doesNotMatch(f.overlay.innerHTML,/capture\(s\) à reprendre/);
 assert.equal(f.stages(),1);
});
test('unbilled authorizations are not staged as paid charges',async()=>{
 const f=fixture('unbilled');
 f.window.TraceSmartInbox.start('card');f.change();
 await flush();await flush();
 assert.match(f.overlay.innerHTML,/autorisation\(s\) non facturée\(s\)/);
 assert.equal(f.stages(),0);
});
test('no-balance calendar can navigate to prior months and offers setup',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
 const calendar=fs.readFileSync(path.join(__dirname,'..','trace-import-calendar-5.37.0.js'),'utf8');
 assert.match(app,/function bankBalanceBoundary\(accountId\)/);
 assert.match(app,/const configured=window\.TraceInternational\?\.exactMoney\?\.\(amount\)!=null/);
 assert.match(calendar,/id="traceBankBalanceSetup"/);
 assert.match(calendar,/id="traceCalPrev"/);
 assert.match(calendar,/bridge\.setMonth\(value\)/);
});
