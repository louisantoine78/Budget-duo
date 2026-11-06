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
 const bank={id:'fr',owner:'la',type:'checking',currency:options.bankCurrency||'EUR',
  country:options.bankCurrency==='CAD'?'CA':'FR'};
 const d={id:'draft',kind:'smart_draft',status:'pending',accountId:'fr',date:'2026-10-12',
  bankDirection:options.bankDirection||'',amount:40,name:'Librairie',sourceFileName:'fake.png'};
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
  purchaseCurrency:options.currency||options.bankCurrency||'EUR',
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
 const el={dataset:{bankDirection:''},querySelector:key=>q[key]},bridge=()=>({accounts:()=>[bank],currentOwner:()=> 'la'});
 const window={};new Function('window',guide)(window);new Function('window',movement)(window);
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

test('editing the reviewed bank capture invalidates the foreign-purchase consent',()=>{
 assert.match(ui,/const resetForeignReview=\(\)=>\{/);
 assert.match(ui,/if\(consent\)consent\.checked=false/);
 assert.match(ui,/\['\.smart-amount','\.smart-name','\.smart-date'\]\.forEach\(selector=>\{/);
 assert.match(ui,/\['\.smart-type','\.smart-direction','\.smart-purchase-currency','\.smart-purchase-amount'\]/);
 // The helper is the same handler installed on each change to the reviewed evidence.
 const fn=new Function('el','return ()=>{'+
  "const consent=el.querySelector('.smart-foreign-nature-confirm');"+
  'if(consent)consent.checked=false;}')({querySelector:()=>({checked:true})});
 assert.equal(typeof fn,'function');
});

test('captured bank credit cannot be posted as foreign expense despite explicit consent',async()=>{
 const c=env({bankDirection:'in'});
 await assert.rejects(c.approve('draft',c.input),/achats explicitement vérifiés/);
 assert.equal(c.writes.length,0);assert.equal(c.d.status,'pending');
});
test('captured bank debit can be accepted only after individual attestation',async()=>{
 const c=env({bankDirection:'out'});
 await c.approve('draft',c.input);
 assert.equal(c.writes[0].item.type,'expense');
 assert.equal(c.writes[0].item.bankCurrency,'EUR');
});
test('foreign UI rejects captured credit independently of selected expense type',()=>{
 const start=ui.indexOf('function applyApprovalConstraints(el){'),
  end=ui.indexOf('function synchronizeRow(',start);
 assert.ok(start>=0&&end>start);
 const bank={id:'fr',currency:'EUR',type:'checking',owner:'la'},
  button={disabled:false,dataset:{duplicateBlocked:'no'},textContent:''},
  confirmed={checked:true},fields={'.smart-approve':button,'.smart-type':{value:'expense'},
   '.smart-direction':{value:'out'},'.smart-name':{value:'Librairie'},
   '.smart-foreign-nature-confirm':confirmed};
 const el={dataset:{bankDirection:'in'},querySelector:key=>fields[key]},
  bridge=()=>({accounts:()=>[bank],currentOwner:()=> 'la'});
 const window={};new Function('window',guide)(window);new Function('window',movement)(window);
 const fn=new Function('bridge','account','window',
  ui.slice(start,end)+'return applyApprovalConstraints;')(bridge,'fr',window);
 fn(el);assert.equal(button.disabled,true);
 assert.match(button.textContent,/À vérifier/);
 el.dataset.bankDirection='out';fn(el);assert.equal(button.disabled,false);
});

test('foreign OCR rejects a bank object replaced during awaited FX quote',async()=>{
 let c;c=env({manualRate:'',quote:async()=>{
  c.state.accounts[0]={...c.bank,currency:'USD'};
  return{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional quote'};
 }});
 await assert.rejects(c.approve('draft',c.input),/changé pendant la recherche du taux/);
 assert.equal(c.writes.length,0);
 assert.equal(c.d.status,'pending');
});
test('foreign OCR rejects a draft object replaced or resolved during FX wait',async()=>{
 let c;c=env({manualRate:'',quote:async()=>{
  c.state.smartImports[0]={...c.d,status:'done'};
  return{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Fictional quote'};
 }});
 await assert.rejects(c.approve('draft',c.input),/changé pendant la recherche du taux/);
 assert.equal(c.writes.length,0);
});

test('CAD capture marked bank credit cannot be confirmed as an expense',async()=>{
 const c=env({bankCurrency:'CAD',bankDirection:'in'});
 await assert.rejects(c.approve('draft',c.input),/Sens bancaire incohérent/);
 assert.equal(c.writes.length,0);assert.equal(c.d.status,'pending');
});
test('CAD captured debit remains valid without foreign FX',async()=>{
 const c=env({bankCurrency:'CAD',bankDirection:'out'});
 const result=await c.approve('draft',c.input);
 assert.equal(result.saved,true);assert.equal(c.writes[0].item.amountCAD,40);
 assert.equal(c.writes[0].item.bankCurrency,'CAD');
});
test('CAD bank debit cannot be relabeled as an income credit',async()=>{
 const c=env({bankCurrency:'CAD',bankDirection:'out',type:'income'});
 await assert.rejects(c.approve('draft',c.input),/Sens bancaire incohérent/);
 assert.equal(c.writes.length,0);
});
test('CAD UI locks confirmation if the capture says credit but expense is chosen',()=>{
 const i=ui.indexOf('function applyApprovalConstraints(el){'),
  j=ui.indexOf('function synchronizeRow(',i);
 assert.ok(i>0&&j>i);
 const bank={id:'fr',owner:'la',type:'checking',currency:'CAD'},
  button={disabled:false,dataset:{duplicateBlocked:'no'},textContent:''};
 const q={'.smart-approve':button,'.smart-type':{value:'expense'},
  '.smart-direction':{value:'out'},'.smart-name':{value:'Librairie'}};
 const el={dataset:{bankDirection:'in'},querySelector:key=>q[key]},
  bridge=()=>({accounts:()=>[bank],currentOwner:()=> 'la'});
 const window={};new Function('window',guide)(window);new Function('window',movement)(window);
 const apply=new Function('bridge','account','window',ui.slice(i,j)+'return applyApprovalConstraints;')(bridge,'fr',window);
 apply(el);assert.equal(button.disabled,true);assert.match(button.textContent,/Sens bancaire incompatible/);
 el.dataset.bankDirection='out';apply(el);assert.equal(button.disabled,false);
});
