'use strict';
// Home shortcuts: pure interaction contract over the actual candidate source.
// No browser, Supabase or network writes. Native: node --test tests/trace-home-next-actions.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const start=source.indexOf('function homeReviewAccounts(){');
const end=source.indexOf('window.TraceHomeReview={refresh:renderHomeReview};',start);
assert.ok(start>=0&&end>start,'Home review module missing');
const fragment=source.slice(start,end);
function createContext({accounts=[{id:'cad-checking',name:'Courant',type:'checking',owner:'la'}],
 transactions=[],smartImports=[],importDays=[]}={}){
 const nodes={'#pendingCountBadge':{textContent:''},'#pendingText':{textContent:''}};
 const actions={};
 const root={innerHTML:'',querySelectorAll(query){
  if(query==='[data-home-review-account]')return accounts.map(a=>({
   dataset:{homeReviewAccount:a.id},set onclick(fn){actions['account:'+a.id]=fn;}
  }));
  if(query==='[data-home-next-action]'){
   if(!this.innerHTML.includes('trace-home-next-actions'))return [];
   return ['imports','reconcile','reminders'].map(key=>({
    dataset:{homeNextAction:key},set onclick(fn){actions[key]=fn;}
   }));
  }
  return [];
 }};
 nodes['#homeReviewAccounts']=root;
 const events=[],state={accounts,transactions,smartImports,importDays};
 const factory=new Function('state','visibleBankAccounts','me','shortAccountLabel',
  'accountType','$','esc','window','navigate','showTab',
  'openReconcileSettings','openNotificationSettings','openSheet',
  'money','$$','editTransaction',fragment+'return {renderHomeReview,homeReviewAccounts};');
 const app=factory(state,()=>accounts,'la',a=>a.name,a=>a.type,
  s=>nodes[s],s=>String(s),{},
  page=>events.push(['navigate',page]),tab=>events.push(['tab',tab]),
  ()=>events.push(['reconcile']),()=>events.push(['reminders']),
  ()=>events.push(['sheet']),()=>'',()=>[],()=>{});
 return{...app,root,nodes,actions,events,state};
}
test('three visible action shortcuts link to existing navigation without writing',()=>{
 const ctx=createContext();
 ctx.renderHomeReview();
 assert.match(ctx.root.innerHTML,/data-home-next-action="imports"/);
 assert.match(ctx.root.innerHTML,/data-home-next-action="reconcile"/);
 assert.match(ctx.root.innerHTML,/data-home-next-action="reminders"/);
 ctx.actions.imports();ctx.actions.reconcile();ctx.actions.reminders();
 assert.deepEqual(ctx.events,[['navigate','activity'],['tab','import'],['reconcile'],['reminders']]);
});
test('Home keeps imported draft and pending bank transaction counts distinct',()=>{
 const ctx=createContext({transactions:[{id:'t_abc',status:'pending',accountId:'cad-checking'},
  {id:'t_def',status:'confirmed',accountId:'cad-checking'}],
 smartImports:[{id:'abc',kind:'smart_draft',status:'pending',accountId:'cad-checking'},
  {id:'xyz',kind:'smart_draft',status:'pending',accountId:'cad-checking'}]});
 ctx.renderHomeReview();
 assert.equal(ctx.nodes['#pendingCountBadge'].textContent,'2');
 assert.match(ctx.root.innerHTML,/2 élément\(s\) à vérifier/);
 assert.match(ctx.root.innerHTML,/1 import\(s\) à confirmer/);
});
test('no accounts keeps add-bank guidance and hides unusable shortcuts',()=>{
 const ctx=createContext({accounts:[]});
 ctx.renderHomeReview();
 assert.match(ctx.root.innerHTML,/Profil → Mes comptes/);
 assert.doesNotMatch(ctx.root.innerHTML,/data-home-next-action/);
 assert.equal(ctx.nodes['#pendingCountBadge'].textContent,'0');
});
test('repeated refresh only rebuilds shortcuts once and keeps accessible group',()=>{
 const ctx=createContext();ctx.renderHomeReview();ctx.renderHomeReview();
 assert.equal((ctx.root.innerHTML.match(/data-home-next-action="/g)||[]).length,3);
 assert.match(ctx.root.innerHTML,/aria-label="Actions pour tenir les comptes à jour"/);
});

test('unresolved OCR-only days never display a false all-clear message',()=>{
 const ctx=createContext({importDays:[{accountId:'cad-checking',unresolvedCount:3}]});
 ctx.renderHomeReview();
 assert.equal(ctx.nodes['#pendingCountBadge'].textContent,'0');
 assert.match(ctx.nodes['#pendingText'].textContent,/3 lignes OCR à contrôler/);
 assert.doesNotMatch(ctx.nodes['#pendingText'].textContent,/Tout est à jour/);
 assert.match(ctx.root.innerHTML,/3 ligne\(s\) OCR à revérifier/);
});

test('CSV unreadable evidence appears in Home counter without pretending it is a booked operation',()=>{
 const ctx=createContext({smartImports:[{id:'source-1',kind:'csv_unparsed',
  status:'pending_review',owner:'la',accountId:'cad-checking',sourceIndex:4,
  rawText:'ligne bancaire illisible'}]});
 ctx.renderHomeReview();
 assert.equal(ctx.nodes['#pendingCountBadge'].textContent,'1');
 assert.match(ctx.root.innerHTML,/1 ligne\(s\) CSV non interprétée\(s\)/);
 assert.match(ctx.nodes['#pendingText'].textContent,/élément à vérifier/);
 assert.equal(ctx.state.transactions.length,0);
});

test('Home does not list bank accounts with nothing to verify',()=>{
 const ctx=createContext({accounts:[
  {id:'cad',name:'Canada',type:'checking',owner:'la'},
  {id:'eur',name:'France',type:'checking',owner:'la'}
 ],transactions:[{id:'pending-1',status:'pending',accountId:'cad'}]});
 ctx.renderHomeReview();
 assert.match(ctx.root.innerHTML,/data-home-review-account="cad"/);
 assert.doesNotMatch(ctx.root.innerHTML,/data-home-review-account="eur"/);
 assert.match(ctx.root.innerHTML,/data-home-next-action="imports"/);
});
