'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','trace-duplicate-compare-1.0.0.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.36.5.js'),'utf8');
const inbox=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.4.2.js'),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(code,ctx);
const comp=ctx.window.TraceDuplicateCompare;
let ok=0;
function test(name,fn){try{fn();ok++;console.log('PASS '+name);}catch(err){console.error('FAIL '+name,err);process.exitCode=1;}}
const account={id:'card',owner:'la',name:'LA — Carte',type:'card'};
const category={id:'groceries',name:'Épicerie',type:'expense'};
const old={id:'tx_atwater',type:'expense',name:'Fromagerie Atwater Cen',amountCAD:27.89,
 date:'2026-10-11',accountId:'card',categoryId:'groceries',status:'confirmed',source:'image'};
const draft={id:'draft_01',kind:'smart_draft',name:'Fromagerie Atwater Cen',amount:27.89,
 accountId:'card',date:'2026-10-11',status:'pending'};
const bankState={accounts:[account],household:{members:[]},categories:[category],transactions:[old],smartImports:[draft]};
const normalizedMerchant=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const shortAccountLabel=a=>a?.name||'';
const maker=(name,end,bindings)=>{
 const begin=app.indexOf('function '+name+'('),stop=app.indexOf(end,begin);
 assert.ok(begin>=0&&stop>begin,'Function '+name+' not found');
 return new Function(...Object.keys(bindings),'return ('+app.slice(begin,stop)+')')(...Object.values(bindings));
};
const matches=maker('smartDuplicateMatches','\nfunction smartDrafts(',{
 state:bankState,normalizedMerchant,shortAccountLabel
});
test('actual confirmed ledger record returned with all identifiers',()=>{
 const m=matches('draft_01');
 assert.equal(m.length,1);
 assert.equal(m[0].id,'tx_atwater');
 assert.equal(m[0].status,'recorded');
 assert.equal(m[0].accountName,'LA — Carte');
 assert.equal(m[0].categoryName,'Épicerie');
 assert.equal(m[0].date,'2026-10-11');
 assert.equal(m[0].amount,27.89);
});
test('matching content explains the real existing item side by side',()=>{
 const html=comp.render({draft:{name:draft.name,date:draft.date,amount:draft.amount},
  matches:matches('draft_01'),accountName:account.name});
 assert.ok(html.includes('Ta ligne à importer'));
 assert.ok(html.includes('Transaction déjà comptabilisée'));
 assert.ok(html.includes('Épicerie'));
 assert.ok(html.includes('LA — Carte'));
 assert.ok(html.includes('27,89'));
 assert.ok(html.includes('Fromagerie Atwater Cen'));
 assert.ok(html.includes('2026-10-11'));
});
test('a different purchase amount is not marked duplicate',()=>{
 bankState.transactions=[{...old,amountCAD:29.50}];
 assert.equal(matches('draft_01').length,0);
 bankState.transactions=[old];
});
test('an import pending confirmation is not called already accounted',()=>{
 bankState.transactions=[{...old,status:'pending'}];
 const m=matches('draft_01');
 assert.equal(m.length,1);assert.equal(m[0].status,'unconfirmed');
 const html=comp.render({draft,matches:m,accountName:account.name});
 assert.ok(html.includes('Opération enregistrée à vérifier'));
 assert.ok(!html.includes('Transaction déjà comptabilisée'));
 bankState.transactions=[old];
});
test('another captured draft is labeled pending not confirmed',()=>{
 bankState.smartImports=[draft,{...draft,id:'draft_02'}];
 const arr=matches('draft_01');
 assert.equal(arr.filter(x=>x.status==='pending').length,1);
 const html=comp.render({draft,matches:arr,accountName:account.name});
 assert.ok(html.includes('Autre capture en attente'));
 bankState.smartImports=[draft];
});
test('multiple matches prioritize already confirmed transactions',()=>{
 bankState.smartImports=[draft,{...draft,id:'draft_02'}];
 const arr=matches('draft_01');
 assert.equal(arr[0].status,'recorded');
 bankState.smartImports=[draft];
});
test('inaccurate merchant name on different account is excluded',()=>{
 bankState.transactions=[{...old,accountId:'checking'}];
 assert.equal(matches('draft_01').length,0);
 bankState.transactions=[old];
});
test('untrusted labels are escaped before inserting into HTML',()=>{
 const html=comp.render({draft:{name:'<img src=x onerror=alert(1)>',date:draft.date,amount:27.89},
  matches:[{...old,name:'<script>alert(1)</script>',status:'recorded'}],accountName:account.name});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('fallback near-date match includes real amount account and category',()=>{
 const html=comp.render({draft,matches:[],inspected:{
  status:'possible',matchId:'tx_atwater',matchName:old.name,matchDate:'2026-10-10',
  matchAmount:27.89,matchAccount:'LA — Carte',matchCategory:'Épicerie',
  matchSource:'Activité · opération confirmée',matchRecorded:true,matchStatus:'possible'
 },accountName:'LA — Carte'});
 assert.ok(html.includes('2026-10-10'));assert.ok(html.includes('Épicerie'));
 assert.ok(html.includes('27,89'));assert.ok(html.includes('Transaction déjà comptabilisée'));
});
test('UI inserts comparison dynamically on every input change',()=>{
 assert.ok(inbox.includes('TraceDuplicateCompare.render({'));
 assert.ok(inbox.includes('updateDuplicateReview(el)'));
 assert.ok(inbox.includes('compare+'));
});
test('UI does not replace duplicate detection or blocking controls',()=>{
 assert.ok(inbox.includes("action.dataset.duplicateBlocked=recorded?'yes':'no'"));
 assert.ok(inbox.includes("Ce sont bien deux opérations distinctes"));
 assert.ok(inbox.includes('Garder cette ligne · Écarter '));
});
test('matching metadata only comes from already loaded household state',()=>{
 assert.ok(app.includes("state.transactions.forEach(x=>{if(x.accountId===d.accountId"));
 assert.ok(app.includes("source:x.status==='confirmed'?'Activité · opération confirmée'"));
});
console.log(ok+' duplicate comparison scenarios passed');
