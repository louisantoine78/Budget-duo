'use strict';
/* Executes the actual internationalHome function with fake couple data. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const engineSrc=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const b=app.indexOf('function internationalHome(){'),e=app.indexOf('\nfunction requestInternationalRates(',b);
assert.ok(b>=0&&e>b,'internationalHome must be available');
function run(estimateB){
 const root={};vm.runInNewContext(engineSrc,{window:root,Intl});
 let host={innerHTML:'',onclick:null};
 const accounts=[
  {id:'ca1',name:'Courant A',owner:'la',type:'checking',currency:'CAD'},
  {id:'ca2',name:'Courant B',owner:'partner',type:'checking',currency:'CAD'}];
 const deps={window:root,homeScope:'couple',state:{accounts},
  accountType:a=>a.type,accountEstimate:a=>a.id==='ca1'?500:estimateB,
  $:id=>id==='#traceIntlHome'?host:null,
  esc:x=>String(x),shortAccountLabel:a=>a.name,requestInternationalRates:()=>{throw Error('CAD must not require FX');}};
 const f=new Function(...Object.keys(deps),'return ('+app.slice(b,e)+');')(...Object.values(deps));
 f();return host.innerHTML;
}
test('all-CAD Couple view is the foyer, never a personal account selector',()=>{
 const html=run(300);
 assert.match(html,/Voir les comptes du foyer/);
 assert.match(html,/Courant A/);assert.match(html,/Courant B/);
 assert.doesNotMatch(html,/traceIntlPrimary/);
});
test('unknown spouse balance is displayed as unknown, never zero',()=>{
 const html=run(null);
 assert.match(html,/Solde inconnu/);assert.doesNotMatch(html,/traceIntlPrimary/);
});
test('each displayed bank amount remains native CAD',()=>{
 const html=run(300);
 assert.match(html,/CAD/);assert.match(html,/Patrimoine/);
});
