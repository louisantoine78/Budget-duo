'use strict';
/* TRACE International fixture boot + navigation smoke.
   The real 5.37 app/bootstrap, FX engine, account UI, movement and import
   modules run against a synthetic DOM. This is NOT a Safari or browser test. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const scripts=[
 'trace-international-preview-fixtures-1.0.0.js','trace-international-1.0.0.js',
 'trace-international-ui-1.0.0.js','trace-movement-5.36.0.js',
 'trace-import-guide-1.2.1.js','trace-operation-ui-1.0.0.js'
];
const handlers={},els=new Map(),buttons=new Map(),logs=[];
function element(selector){
 if(els.has(selector))return els.get(selector);
 const o={id:selector,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},
  dataset:{},checked:false,files:[],classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(name,fn){this['on'+name]=fn;},setAttribute(){},removeAttribute(){},
  querySelector:s=>element(s),querySelectorAll:()=>[],closest:s=>element(s),
  appendChild(){},getAttribute(){return null},focus(){},click(){},replaceChildren(){}
 };
 els.set(selector,o);return o;
}
function queryAll(selector){
 if(selector==='#homeScope .seg'){
  if(!buttons.has(selector))buttons.set(selector,[{dataset:{scope:'mine'},classList:{toggle(){}},onclick:null},
   {dataset:{scope:'couple'},classList:{toggle(){}},onclick:null}]);
  return buttons.get(selector);
 }
 return [];
}
const document={readyState:'loading',hidden:false,body:element('body'),
 documentElement:element('documentElement'),querySelector:element,querySelectorAll:queryAll,
 getElementById:id=>element('#'+id),createElement:name=>element('create-'+name),
 addEventListener:(name,fn)=>{handlers[name]=fn;}
};
const location={pathname:'/trace-international-preview.html',
 href:'https://lab.invalid/trace-international-preview.html',search:'',hash:''};
const window={document,location,innerWidth:390,
 __TRACE_INTERNATIONAL_PREVIEW__:true,scrollTo(){},addEventListener(){}};
const fakeConsole={error:(...a)=>logs.push(a.join(' ')),warn(){},log(){},info(){}};
for(const name of scripts)new Function('window','document','location','console',read(name))(window,document,location,fakeConsole);
window.TraceInsights={renderCategories(){},renderTrend(){},renderAnnual(){},renderWealth(){}};
window.TraceReminders={refresh(){}};
window.TraceImportCalendar={render(){},selectedAccount(){return 'demo-ca-current';}};
const URLSearchParamsFake=class {get(){return null;}};
const URLFake=class{constructor(href){this.href=href;this.searchParams={set(){},delete(){}};}
 toString(){return this.href;}};
let externalRequests=0;
const forbidFetch=()=>{externalRequests++;throw Error('Unexpected network request')};
new Function('window','document','location','navigator','setTimeout','console','URLSearchParams','URL','Date','Intl','fetch',
 read('v5-app-5.37.0.js'))(window,document,location,{},()=>{},fakeConsole,URLSearchParamsFake,URLFake,Date,Intl,forbidFetch);
assert.equal(typeof handlers.DOMContentLoaded,'function');
handlers.DOMContentLoaded();
let total=0;async function test(name,fn){await fn();total++;console.log('PASS '+name);}
async function main(){
 await test('fixture mode enters real 5.37 bootstrap without auth or network',()=>{
  assert.equal(window.__TRACE_PREVIEW_STATUS__.boot,'ok');
  assert.equal(window.__TRACE_PREVIEW_STATUS__.build,'5.37.0');
  assert.equal(window.__TRACE_PREVIEW_STATUS__.fixtureCount,8);
  assert.equal(window.__TRACE_PREVIEW_STATUS__.noSupabase,true);
  assert.equal(externalRequests,0);assert.deepEqual(logs,[]);
 });
 await test('account summary calculates CAD credit-card debt only once',()=>{
  assert.match(element('#homeBalance').textContent,/3[\s\u00a0\u202f]?670/);
  assert.match(element('#homeCard').textContent,/430/);
  assert.match(element('#traceIntlHome').innerHTML,/Compte principal/);
  assert.match(element('#traceIntlHome').innerHTML,/France/);
  assert.ok(element('#transactionList').innerHTML.includes('demo-fr-purchase'));
  assert.ok(element('#assetGrid').innerHTML.length>30);
 });
 await test('switch primary account to French EUR changes only fictional view',async()=>{
  const select=element('#traceIntlPrimary');assert.equal(typeof select.onchange,'function');
  select.value='demo-fr-current';await select.onchange();
  assert.match(element('#homeBalance').textContent,/1[\s\u00a0\u202f]?208/);
  assert.match(element('#homeBalance').textContent,/€/);
  assert.equal(externalRequests,0);
 });
 await test('Couple scope computes combined CAD liquidity and separate account list',()=>{
  const couple=buttons.get('#homeScope .seg')[1];assert.equal(typeof couple.onclick,'function');
  couple.onclick();
  assert.match(element('#homeBalance').textContent,/8[\s\u00a0\u202f]?904/);
  assert.match(element('#traceIntlHome').innerHTML,/Voir les comptes du foyer/);
  assert.match(element('#traceIntlHome').innerHTML,/Élise/);
 });
 await test('lab remains explicit and does not attempt version redirect',()=>{
  assert.match(element('#syncLabel').textContent,/Démo fictive/);
  assert.match(element('#brandSubtitle').textContent,/LABORATOIRE/);
  assert.equal(externalRequests,0);
 });
 console.log(total+' synthetic full-bootstrap laboratory scenarios passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
