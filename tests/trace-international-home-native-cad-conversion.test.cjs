'use strict';
// Candidate account-summary integration with genuine FX snapshots. Fictional
// accounts and rates only. No live bank, hosted Supabase, or real user data.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ui=fs.readFileSync(path.join(__dirname,'..','trace-international-ui-1.0.0.js'),'utf8');
const fx=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.css'),'utf8');
function view({accounts,estimates,rates={}}={}){
 const window={};
 vm.runInNewContext(fx,{window});
 vm.runInNewContext(ui,{window});
 const host={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],onclick:null};
 const requests=[];
 const bank=accounts||[
  {id:'cad',name:'Compte Canada',type:'checking',owner:'la',currency:'CAD',country:'CA'},
  {id:'eur',name:'Compte France',type:'checking',owner:'la',currency:'EUR',country:'FR'}
 ];
 window.TraceInternationalUI.render({
  host,accounts:bank,owner:'la',mainId:'cad',estimates:estimates||{cad:500,eur:40},
  rates,requestRate:codes=>requests.push(...codes)});
 return{html:host.innerHTML,requests};
}
const q={EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional manual reference'}};
test('native EUR value and explicit CAD estimate are shown separately',()=>{
 const a=view({rates:q});
 assert.match(a.html,/40,00\s*€/);
 assert.match(a.html,/≈\s*64,00\s*\$/);
 assert.match(a.html,/taux du 2026-10-12/);
 assert.match(a.html,/Fictional manual reference/);
 assert.equal(a.requests.length,0);
});
test('missing exchange-rate information does not fabricate CAD conversion',()=>{
 const a=view();
 assert.match(a.html,/Conversion CAD à vérifier/);
 assert.doesNotMatch(a.html,/≈\s*40,00/);
 assert.deepEqual(a.requests,['EUR']);
});
test('foreign balances of zero remain native; unresolved FX never invents a rate',()=>{
 const a=view({estimates:{cad:500,eur:0}});
 assert.match(a.html,/0,00\s*€/);
 assert.match(a.html,/Conversion CAD à vérifier/);
});
test('invalid saved rates trigger another request instead of suppressing it',()=>{
 const a=view({rates:{EUR:{...q.EUR,cadPerUnit:-1}}});
 assert.match(a.html,/Conversion CAD à vérifier/);
 assert.deepEqual(a.requests,['EUR']);
});
test('malicious rate-source text is escaped rather than injected into HTML',()=>{
 const a=view({rates:{EUR:{...q.EUR,source:'<img onerror=alert(1)>'}}});
 assert.doesNotMatch(a.html,/<img/);
 assert.match(a.html,/&lt;img/);
});
test('the native and approximate CAD values remain distinct on small screens',()=>{
 assert.match(css,/\.trace-intl-account-conversion\{/);
 assert.match(css,/flex-basis:100%/);
 assert.match(css,/white-space:normal!important/);
});
test('a second member account is excluded from the current-owner breakdown',()=>{
 const a=view({rates:q,accounts:[
  {id:'cad',name:'Mine',type:'checking',currency:'CAD',owner:'la'},
  {id:'eur',name:'Ma banque',type:'checking',currency:'EUR',owner:'la'},
  {id:'partner',name:'Confidentiel',type:'checking',currency:'CAD',owner:'partner'}
 ]});
 assert.doesNotMatch(a.html,/Confidentiel/);
});
test('no rate lookup happens when the bank balance itself is unknown',()=>{
 const a=view({estimates:{cad:500,eur:null}});
 assert.match(a.html,/Solde inconnu/);
 assert.deepEqual(a.requests,[]);
});
