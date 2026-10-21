'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const env=vm.createContext({window:{}});vm.runInContext(engine,env);
const I=env.window.TraceInternational;
const start=app.indexOf('function internationalHome('),end=app.indexOf('\nfunction requestInternationalRates(',start);
assert.ok(start>0&&end>start);
const factory=new Function('state','homeScope','accountType','window','accountEstimate','requestInternationalRates',
 'internationalQuotes','$','esc','visibleBankAccounts','me','saveHouseholdSettings','renderHome','traceNotice',
 'return ('+app.slice(start,end)+');');
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const ca={id:'ca',type:'checking',owner:'la',name:'Canada',currency:'CAD',country:'CA'};
const fr={id:'fr',type:'checking',owner:'la',name:'France',currency:'EUR',country:'FR'};
const card={id:'card',type:'card',owner:'la',name:'Mastercard',currency:'CAD',country:'CA',settlementAccountId:'ca'};
const partner={id:'partner',type:'checking',owner:'partner',name:'Deuxième compte',currency:'CAD'};
function view(accounts,balances,quotes={}){
 const nodes={};const $=sel=>nodes[sel]||(nodes[sel]={textContent:'',innerHTML:'',hidden:false,onclick:null});
 const calls=[];
 const state={accounts,household:{}},rates=quotes;
 const f=factory(state,'couple',a=>a.type,{TraceInternational:I},
  a=>balances[a.id]??null,c=>calls.push(c),rates,$,String,
  ()=>accounts.filter(a=>a.owner==='la'),'la',async()=>{},()=>{},()=>{});
 f();
 return{nodes,calls,$};
}
test('two countries and linked debt produce one CAD household net',()=>{
 const a=view([ca,fr,card,partner],{ca:1000,fr:1000,card:-200,partner:300},
  {EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-20',requestedDate:'2026-10-20'}});
 assert.equal(a.$('#homeBalance').textContent,I.money(2700,'CAD'));
 assert.equal(a.$('#homeChecking').textContent,I.money(2900,'CAD'));
 assert.equal(a.$('#homeCard').textContent,I.money(200,'CAD')+' de dette');
 assert.match(a.$('#traceIntlHome').innerHTML,/France/);
 assert.match(a.$('#traceIntlHome').innerHTML,/EUR/);
 assert.match(a.$('#traceIntlHome').innerHTML,/2026-10-20/);
});
test('missing EUR exchange rate never reports incomplete household as CAD only',()=>{
 const a=view([ca,fr,card],{ca:1000,fr:1000,card:-200});
 assert.equal(a.$('#homeBalance').textContent,'Situation à vérifier');
 assert.equal(a.$('#homeChecking').textContent,'—');
 assert.equal(a.$('#homeCard').textContent,I.money(200,'CAD')+' de dette');
 assert.equal(a.calls.length,1);assert.equal(a.calls[0][0],'EUR');
});
test('missing French opening balance remains unknown, not zero',()=>{
 const a=view([ca,fr],{ca:1000,fr:null},
  {EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-20'}});
 assert.equal(a.$('#homeBalance').textContent,'Situation à vérifier');
 assert.match(a.$('#traceIntlHome').innerHTML,/Solde inconnu/);
});
test('positive card estimate is never included in combined net',()=>{
 const a=view([ca,fr,{...card,currency:'EUR',settlementAccountId:'fr'}],
  {ca:1000,fr:500,card:60},
  {EUR:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-20'}});
 assert.equal(a.$('#homeBalance').textContent,'Situation à vérifier');
 assert.equal(a.$('#homeCard').textContent,'À vérifier');
 assert.match(a.$('#homeCardWarning').textContent,/avoir de carte/);
});
console.log(count+' household international balance scenarios passed');
