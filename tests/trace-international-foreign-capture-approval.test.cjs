'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','trace-smart-inbox-3.5.0.js'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8');
const movement=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8');
const guide=fs.readFileSync(path.join(__dirname,'..','trace-import-guide-1.2.1.js'),'utf8');
const si=app.indexOf('async function smartApproveDraft(id,v){'),ei=app.indexOf('async function smartResetDay(',si);
assert.ok(si>=0&&ei>si);
const approveSource=app.slice(si,ei);
function env(options={}){
 const bank={id:'fr',owner:'la',type:'checking',currency:'EUR',country:'FR'};
 const d={id:'draft',kind:'smart_draft',status:'pending',accountId:'fr',date:'2026-10-12',
  amount:40,name:'Librairie',sourceFileName:'fake.png'};
 const state={accounts:[bank],smartImports:[d],transactions:[],investmentAccounts:[],
  importDays:[{date:'2026-10-12',accountId:'fr'}]},writes=[];
 const window={};
 new Function('window',engine)(window);new Function('window',movement)(window);
 new Function('window',guide)(window);
 const I=window.TraceInternational;
 window.TraceInternational={...I,getRate:options.quote||(async()=>{throw Error('Quote unavailable')})};
 const deps={state,me:'la',partner:'partner',window,visibleBankAccounts:()=>[bank],
  smartStrictDate:x=>x==='2026-10-12',smartExactBankAmount:I.exactMoney,
  accountType:a=>a.type,manualCategories:()=>[{id:'books',type:'expense'}],
  isReadySavingsAccount:()=>false,normalizedMerchant:x=>String(x).toLowerCase(),
  smartDuplicateMatches:()=>[],findSimilarTransaction:()=>null,traceSplit:()=>({}),
  traceImportSplit:({beneficiary},{amountCAD})=>({beneficiary,split:{la:100,partner:0},
   splitAmounts:{la:amountCAD,partner:0}}),
  validateFriendLink:()=>null,csvFingerprint:()=> 'fake',isFinancialPeriod:()=>true,
  recordDayImport:async()=>{},renderAll:()=>{},
  saveDocument:async(collection,item)=>{
   if(options.reject)throw Error('TRACE_WRITE_CONFLICT');
   writes.push({collection,item:JSON.parse(JSON.stringify(item))});}};
 const names=Object.keys(deps),approve=new Function(...names,approveSource+'return smartApproveDraft;')(...Object.values(deps));
 const input={verified:true,foreignNatureConfirmed:true,date:'2026-10-12',name:options.name||'Librairie',
  type:options.type||'expense',amount:'40',categoryId:'books',beneficiary:'la',
  manualFxRate:options.manualRate===undefined?'1.60':options.manualRate,
  purchaseCurrency:options.currency||'EUR',
  purchaseAmount:options.original===undefined?'40':options.original};
 return{bank,d,state,writes,approve,input};
}
test('reviewed 40 EUR capture is booked once with native EUR and dated CAD',async()=>{
 const c=env(),r=await c.approve('draft',c.input);
 assert.equal(r.saved,true);assert.equal(c.writes.length,2);
 const t=c.writes[0].item;assert.equal(t.status,'confirmed');
 assert.equal(t.bankAmount,40);assert.equal(t.bankCurrency,'EUR');
 assert.equal(t.amountCAD,64);assert.equal(t.fxRateDate,'2026-10-12');
 assert.match(t.fxRateSource,/manuellement/);
 assert.equal(c.writes[1].item.status,'done');
});
test('unchecked explicit OCR foreign confirmation never creates financial writes',async()=>{
 const c=env();c.input.foreignNatureConfirmed=false;
 await assert.rejects(c.approve('draft',c.input),/achats explicitement vérifiés/);
 assert.equal(c.writes.length,0);assert.equal(c.d.status,'pending');
});
test('transfer and card repayment remain foreign pending',async()=>{
 const c=env({type:'transfer'});
 await assert.rejects(c.approve('draft',c.input),/achats explicitement vérifiés/);
 assert.equal(c.writes.length,0);
});
test('bank settlement description is blocked even if labeled expense',async()=>{
 const c=env({name:'PAIEMENT CARTE VISA'});
 await assert.rejects(c.approve('draft',c.input),/achats explicitement vérifiés/);
 assert.equal(c.writes.length,0);
});
test('no FX source means no invented CAD valuation',async()=>{
 const c=env({manualRate:''});
 await assert.rejects(c.approve('draft',c.input),/Quote unavailable/);
 assert.equal(c.writes.length,0);
});
test('verified bank reference FX can be used with source and date retained',async()=>{
 const c=env({manualRate:'',quote:async()=>({currency:'EUR',cadPerUnit:1.55,
  date:'2026-10-12',source:'Fictional verified quote'})});
 await c.approve('draft',c.input);
 assert.equal(c.writes[0].item.amountCAD,62);
 assert.equal(c.writes[0].item.fxRateSource,'Fictional verified quote');
});
test('new bank evidence while awaiting an FX rate invalidates the screenshot',async()=>{
 let c;c=env({manualRate:'',quote:async()=>{
  c.state.transactions.push({id:'duplicate',accountId:'fr',status:'confirmed',
   type:'expense',date:'2026-10-12',name:'Librairie',bankAmount:40});
  return{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional quote'};
 }});
 await assert.rejects(c.approve('draft',c.input),/changé pendant la recherche du taux/);
 assert.equal(c.writes.length,0);assert.equal(c.d.status,'pending');
});
test('currency mutation during async quote lookup leaves screenshot unconfirmed',async()=>{
 let c;c=env({manualRate:'',quote:async()=>{
  c.bank.currency='USD';
  return{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional quote'};
 }});
 await assert.rejects(c.approve('draft',c.input),/changé pendant la recherche du taux/);
 assert.equal(c.writes.length,0);
});
test('failed server write does not update local foreign evidence',async()=>{
 const c=env({reject:true});
 await assert.rejects(c.approve('draft',c.input),/TRACE_WRITE_CONFLICT/);
 assert.equal(c.writes.length,0);assert.equal(c.d.status,'pending');
});
test('foreign purchase currency differing from bank requires original purchase amount',async()=>{
 const c=env({currency:'USD',original:''});
 await assert.rejects(c.approve('draft',c.input),/Prix d’achat d’origine requis/);
 assert.equal(c.writes.length,0);
});
test('UI enables foreign purchase only after consent; ambiguous labels stay disabled',()=>{
 const start=ui.indexOf('function applyApprovalConstraints(el){'),
  end=ui.indexOf('function synchronizeRow(',start);
 assert.ok(start>=0&&end>start);
 const bank={id:'fr',currency:'EUR',type:'checking',owner:'la'};
 const button={disabled:false,dataset:{duplicateBlocked:'no'},textContent:''};
 const checkbox={checked:false};
 const q={'.smart-approve':button,'.smart-type':{value:'expense'},
  '.smart-direction':{value:'out'},'.smart-name':{value:'Librairie'},
  '.smart-foreign-nature-confirm':checkbox};
 const el={querySelector:key=>q[key]},bridge=()=>({accounts:()=>[bank],currentOwner:()=> 'la'});
 const window={};new Function('window',guide)(window);
 const apply=new Function('bridge','account','window',ui.slice(start,end)+'return applyApprovalConstraints;')(bridge,'fr',window);
 apply(el);assert.equal(button.disabled,true);
 checkbox.checked=true;apply(el);assert.equal(button.disabled,false);
 assert.match(button.textContent,/achat étranger/);
 q['.smart-name'].value='VIREMENT INTERAC';apply(el);assert.equal(button.disabled,true);
});
test('foreign OCR consent is passed through UI and revalidates button state',()=>{
 assert.match(ui,/foreignNatureConfirmed:!!q\('\.smart-foreign-nature-confirm'\)\?\.checked/);
 assert.match(ui,/smart-foreign-nature-confirm'\)\?\.addEventListener\('change',\(\)=>applyApprovalConstraints\(el\)\)/);
});
