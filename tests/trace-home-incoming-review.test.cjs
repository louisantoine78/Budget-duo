'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('v5-app-5.37.0.js'),engine={};
new Function('window',read('trace-international-1.0.0.js'))(engine);
const from=app.indexOf('function homeReviewAccounts(){'),
 to=app.indexOf('\nfunction renderHomeReview(){',from);
assert.ok(from>0&&to>from);
const accounts=[
 {id:'ca',name:'Compte CAD',owner:'la',type:'checking',currency:'CAD',country:'CA'},
 {id:'eur',name:'Compte EUR',owner:'la',type:'checking',currency:'EUR',country:'FR'},
 {id:'partner',name:'Partenaire CAD',owner:'partner',type:'checking',currency:'CAD',country:'CA'},
 {id:'old',name:'Ancien compte',owner:'la',type:'checking',currency:'USD',archived:true}
];
const transactions=[
 {id:'same-owner',type:'transfer',status:'pending',date:'2026-10-18',name:'Change interne',
  accountId:'ca',toAccountId:'eur',bankCurrency:'CAD',bankAmount:50,
  toBankCurrency:'EUR',toBankAmount:46.2,amountCAD:50},
 {id:'received',type:'transfer',status:'pending',date:'2026-10-19',name:'Reçu du partenaire',
  accountId:'partner',toAccountId:'eur',bankCurrency:'CAD',bankAmount:99,
  toBankCurrency:'EUR',toBankAmount:60.17,amountCAD:99},
 {id:'unproved',type:'expense',status:'pending',date:'2026-09-30',name:'Paiement sans preuve',
  accountId:'eur',bankCurrency:'CAD',bankAmount:31.2,amountCAD:31.2},
 {id:'partner-only',type:'expense',status:'pending',date:'2026-10-15',name:'Privé',
  accountId:'partner',bankCurrency:'CAD',bankAmount:12},
 {id:'done',type:'expense',status:'confirmed',date:'2026-10-15',name:'Confirmé',
  accountId:'eur',bankCurrency:'EUR',bankAmount:22}
];
function mount(owner='la'){
 const state={accounts,transactions,smartImports:[],importDays:[]},before=JSON.stringify(state);
 const captures=[],tabs=[],nav=[];
 const args={state,me:owner,visibleBankAccounts:id=>accounts.filter(a=>a.owner===id&&!a.archived),
  shortAccountLabel:a=>a.name,accountType:a=>a.type,
  window:{TraceInternational:engine.TraceInternational},
  navigate:x=>nav.push(x),showTab:x=>tabs.push(x),
  openSheet:(title,html)=>captures.push({title,html}),esc:x=>String(x),
  $$:()=>[],editTransaction:()=>{}};
 const funcs=new Function(...Object.keys(args),app.slice(from,to)+
  '\nreturn {homeReviewAccounts,openHomeReviewAccount};')(...Object.values(args));
 return{...funcs,captures,tabs,nav,state,before};
}
test('Home review counts both own transfer legs but one movement per account',()=>{
 const m=mount(),counts=Object.fromEntries(m.homeReviewAccounts().map(x=>[x.id,x.existing]));
 assert.deepEqual(counts,{ca:1,eur:3});
 assert.equal(JSON.stringify(m.state),m.before);
});
test('Home EUR review shows native receiving EUR amounts, not partner CAD source',()=>{
 const m=mount();m.openHomeReviewAccount('eur');
 assert.equal(m.captures.length,1);
 assert.match(m.captures[0].html,/46,20\s*€/);
 assert.match(m.captures[0].html,/60,17\s*€/);
 assert.match(m.captures[0].html,/Virement reçu/);
 assert.doesNotMatch(m.captures[0].html,/99,00\s*\$|50,00\s*\$|12,00\s*\$/);
 assert.deepEqual(m.nav,['activity']);
 assert.deepEqual(m.tabs,['transactions']);
 assert.equal(JSON.stringify(m.state),m.before);
});
test('unproved EUR bank amount never falls back to 0 or CAD budgeting',()=>{
 const m=mount();m.openHomeReviewAccount('eur');
 assert.match(m.captures[0].html,/Montant bancaire à vérifier/);
 assert.doesNotMatch(m.captures[0].html,/31,20\s*€|0,00\s*€/);
});
test('other member sees only their own account in Home review and no EUR account',()=>{
 const m=mount('partner');assert.deepEqual(m.homeReviewAccounts().map(x=>x.id),['partner']);
 const r=m.homeReviewAccounts();assert.equal(r[0].existing,2);
 assert.equal(m.captures.length,0);assert.equal(JSON.stringify(m.state),m.before);
});
test('unknown, archived, and foreign account shortcuts cannot expose hidden review',()=>{
 const m=mount();
 for(const id of ['old','partner','unknown'])m.openHomeReviewAccount(id);
 assert.equal(m.captures.length,0);assert.deepEqual(m.nav,[]);
});
