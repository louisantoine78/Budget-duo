'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../v5-app-5.37.0.js'),'utf8');
const a=source.indexOf('function homeReconciliationBadge(){'),b=source.indexOf('\nfunction renderHome(){',a);
assert.ok(a>0&&b>a);
const code=source.slice(a,b);
function status({mode='mine',primary='main',checks=[],accounts,now='2026-10-30'}={}){
 const state={household:{primaryBankAccountByOwner:{la:primary}},reconciliations:checks,
 accounts:accounts||[{id:'main',owner:'la',type:'checking'},{id:'other',owner:'la',type:'checking'},{id:'partner',owner:'partner',type:'checking'},{id:'card',owner:'la',type:'card'}]};
 const run=new Function('homeScope','visibleBankAccounts','me','accountType','state','localDateISO','CM',code+';return homeReconciliationBadge();');
 return run(mode,owner=>state.accounts.filter(a=>a.owner===owner),'la',a=>a.type,state,()=>now,'2026-10');
}
const r=(accountId,date,status='confirmed')=>({accountId,date,status});
test('unrelated member, account, card, or couple cannot claim a verified primary account',()=>{
 for(const id of ['other','partner','card'])assert.equal(status({checks:[r(id,'2026-10-30')]}),'À rapprocher');
 assert.equal(status({mode:'couple',checks:[r('main','2026-10-30')]}),'À rapprocher');
});
test('past months, future statements and pending data never grant verified status',()=>{
 for(const [d,state] of [['2026-09-30','confirmed'],['2026-10-31','confirmed'],['2026-10-20','pending'],['2026-11-01','confirmed']])
  assert.equal(status({checks:[r('main',d,state)]}),'À rapprocher');
});
test('current month confirmed evidence shows its actual date, preferring most recent',()=>{
 assert.equal(status({checks:[r('main','2026-10-12'),r('main','2026-10-25'),r('main','2026-10-19')]}),'Rapproché au 25/10');
});
test('switching primary or losing checking account invalidates old evidence',()=>{
 assert.equal(status({primary:'other',checks:[r('main','2026-10-30')]}),'À rapprocher');
 assert.equal(status({accounts:[{id:'card',owner:'la',type:'card'}],checks:[r('main','2026-10-30')]}),'À configurer');
 assert.match(source,/b\.needsCardReview\?'Carte à vérifier':homeReconciliationBadge\(\)/);
});
