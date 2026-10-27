'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const source=read('v5-app-5.37.0.js'),foreign=read('trace-international-1.0.0.js');
const start=source.indexOf('function openSettlement(original){'),
 end=source.indexOf('\nfunction coupleBalance(){',start);
assert.ok(start>=0&&end>start);
const engine={};new Function('window',foreign)(engine);
const I=engine.TraceInternational;
const accounts=[
 {id:'la-ca',owner:'la',type:'checking',country:'CA',currency:'CAD',name:'Source CAD'},
 {id:'partner-ca',owner:'partner',type:'checking',country:'CA',currency:'CAD',name:'Recipient CAD'},
 {id:'la-eur',owner:'la',type:'checking',country:'FR',currency:'EUR',name:'Source EUR'},
 {id:'partner-eur',owner:'partner',type:'checking',country:'FR',currency:'EUR',name:'Recipient EUR'},
 {id:'la-card',owner:'la',type:'card',country:'CA',currency:'CAD',name:'Carte CAD'}
];
const existing=(patch={})=>({id:'existing',type:'transfer',status:'confirmed',
 accountId:'la-ca',toAccountId:'partner-ca',payerId:'la',
 date:'2026-10-20',amountCAD:50,bankAmount:50,bankCurrency:'CAD',
 toBankAmount:50,toBankCurrency:'CAD',...patch});
function mount(original=null){
 const nodes=new Map(),writes=[],actions={render:0},openings=[];
 const node=id=>{
  if(!nodes.has(id)){
   let html='',value='',lastOptions='';
   const entry={disabled:false,textContent:'',onclick:null,onchange:null,
    classList:{add(){}},addEventListener(){},get innerHTML(){return html},
    set innerHTML(s){html=s;lastOptions=s;
     const match=s.match(/<option value="([^"]*)">/);
     if(match)this.value=match[1];},get value(){return value},
    set value(v){value=String(v)}};
   nodes.set(id,entry);
  }
  return nodes.get(id);
 };
 node('#settleAmount').value='50';
 node('#settleDate').value='2026-10-20';
 const deps={state:{accounts,transactions:[]},window:{TraceInternational:I},
  $:node,openSheet:(title,html)=>openings.push({title,html}),
  closeSheet:()=>{},coupleBalance:()=>50,
  shortMemberName:n=>n==='la'?'Membre A':'Membre B',
  shortAccountLabel:a=>a.name,
  traceEditorDateLabel:x=>x,localDateISO:()=> '2026-10-20',
  money:n=>n+' CAD',esc:x=>String(x??'').replace(/"/g,'&quot;'),
  traceFeedback:()=>'',visibleBankAccounts:owner=>accounts.filter(a=>a.owner===owner&&!a.archived),
  accountType:a=>a.type,member:id=>({name:id}),
  txDocId:()=> 'new-settlement',traceSplit:()=>({split:{la:0,partner:0}}),
  saveDocument:async(collection,item)=>writes.push({collection,item:JSON.parse(JSON.stringify(item))}),
  renderAll:()=>actions.render++,navigate:()=>{},showTab:()=>{},
  openSharing:()=>{},deleteTransaction:()=>{},traceNotice:e=>{throw e}};
 const fn=new Function(...Object.keys(deps),
  source.slice(start,end)+'\nreturn openSettlement;')(...Object.values(deps));
 fn(original);
 return{nodes,node,writes,actions,openings,original,
  async submit({amount='50',date='2026-10-20',payer='la',from='la-ca',to='partner-ca'}={}){
   node('#settleAmount').value=amount;node('#settleDate').value=date;
   node('#settlePayer').value=payer;
   node('#settlePayer').onchange?.();
   node('#settleFrom').value=from;node('#settleTo').value=to;
   const handler=node('#saveSettlement').onclick;
   if(typeof handler!=='function')return false;
   await handler();return true;
  }};
}
test('cross-currency confirmed settlement is read-only and never opens CAD editor',async()=>{
 const row=existing({accountId:'la-ca',toAccountId:'partner-eur',
  toBankAmount:46.2,toBankCurrency:'EUR'});
 const before=JSON.stringify(row),m=mount(row);
 assert.match(m.openings[0].title,/vérifier/);
 assert.match(m.openings[0].html,/devises natives/);
 assert.equal(await m.submit(),false);
 assert.deepEqual(m.writes,[]);
 assert.equal(JSON.stringify(row),before);
});
test('foreign source and pending CAD transfer cannot be reclassified as settled CAD',async()=>{
 for(const patch of [
  {accountId:'la-eur',bankAmount:40,bankCurrency:'EUR'},
  {status:'pending'}, {toBankCurrency:'EUR'},
  {type:'expense'}
 ]){
  const row=existing(patch),before=JSON.stringify(row),m=mount(row);
  assert.match(m.openings[0].title,/vérifier/);
  assert.equal(await m.submit(),false);
  assert.deepEqual(m.writes,[]);
  assert.equal(JSON.stringify(row),before);
 }
});
test('new CAD settlement posts one transfer with two verified CAD legs, not income',async()=>{
 const m=mount();assert.equal(await m.submit({amount:'45.67'}),true);
 assert.equal(m.writes.length,1);
 const t=m.writes[0].item;
 assert.equal(m.writes[0].collection,'transactions');
 assert.equal(t.type,'transfer');assert.equal(t.status,'confirmed');
 assert.equal(t.amountCAD,45.67);assert.equal(t.bankAmount,45.67);
 assert.equal(t.toBankAmount,45.67);assert.equal(t.bankCurrency,'CAD');
 assert.equal(t.toBankCurrency,'CAD');assert.equal(t.accountId,'la-ca');
 assert.equal(t.toAccountId,'partner-ca');
 assert.equal(t.categoryId,'');
 assert.equal(m.actions.render,1);
});
test('foreign checking accounts and credit cards are absent from CAD settlement selector',()=>{
 const m=mount(),from=m.node('#settleFrom').innerHTML,
  to=m.node('#settleTo').innerHTML;
 assert.match(from,/partner-ca/);assert.doesNotMatch(from,/partner-eur|la-card|la-ca/);
 assert.match(to,/la-ca/);assert.doesNotMatch(to,/la-eur|la-card|partner-ca/);
});
test('fractional cents, invalid date, wrong owner and foreign account fail closed',async()=>{
 for(const input of [{amount:'42.001'},{amount:'NaN'}, {amount:'-5'},
  {date:'2026-02-31'},{payer:'partner'},
  {from:'la-eur'}, {to:'partner-eur'},{from:'la-card'}]){
  const m=mount();await m.submit(input);
  assert.equal(m.writes.length,0,JSON.stringify(input));
  assert.match(m.node('#traceFeedback').textContent,/centime|CAD/);
 }
});
test('confirmed transfer with existing bank proof cannot rewrite a different native amount',async()=>{
 const row=existing(),before=JSON.stringify(row),m=mount(row);
 await m.submit({amount:'55.12'});
 assert.equal(m.writes.length,0);
 assert.match(m.node('#traceFeedback').textContent,/montants bancaires/);
 assert.equal(JSON.stringify(row),before);
});
test('unchanged CAD statement-based settlement remains editable without double expense',async()=>{
 const row=existing(),m=mount(row);
 await m.submit({amount:'50'});
 assert.equal(m.writes.length,1);
 assert.equal(m.writes[0].item.bankAmount,50);
 assert.equal(m.writes[0].item.toBankAmount,50);
 assert.equal(m.writes[0].item.type,'transfer');
 assert.equal(row.amountCAD,50);
});
