'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=app.indexOf('function editForeignExpenseMetadata('),
 end=app.indexOf('\nfunction editSmartBankMovement(',begin);
assert.ok(begin>0&&end>begin);
const create=new Function('state','me','window','openSheet','$','esc','shortAccountLabel',
 'closeSheet','saveDocument','renderAll','navigate','showTab',
 'return ('+app.slice(begin,end)+');');
const sample=()=>({id:'fx-expense',accountId:'fr',type:'expense',status:'confirmed',
 name:'Boulangerie',categoryId:'food',date:'2026-10-16',
 bankCurrency:'EUR',currency:'USD',bankAmount:46.20,amountOriginal:50,
 amountCAD:73.92,bankRateCad:1.6,fxRateDate:'2026-10-16',
 fxRateSource:'historical',beneficiary:'couple',split:{la:50,partner:50},
 splitAmounts:{la:36.96,partner:36.96},source:'csv'});
function fixture(options={}){
 const tx=Object.assign(sample(),options.tx||{}),
  bank=Object.assign({id:'fr',owner:'la',currency:'EUR',name:'Banque EUR'},options.bank||{}),
  state={accounts:[bank],transactions:[tx],categories:[
   {id:'food',name:'Alimentation',type:'expense'},
   {id:'travel',name:'Voyage',type:'expense'},
   {id:'income',name:'Revenu',type:'income'},
   {id:'inactive',name:'Ancienne',type:'expense',archived:true}]},
  ui={},calls={saved:[],render:0,close:0,title:'',html:''},$=id=>
   (ui[id]??={value:'',textContent:'',disabled:false,onclick:null}),
  i={currency:a=>a.currency,amountOnAccount:t=>t.bankAmount,
   money:(n,c)=>n+' '+c},
  fn=create(state,'la',{TraceInternational:i},(title,html)=>{
   calls.title=title;calls.html=html;$('#traceForeignMetaName').value=tx.name;
   $('#traceForeignMetaCategory').value=tx.categoryId;
  },$,x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  a=>a.name,()=>{calls.close++;},async(type,item)=>{
   if(options.fail)throw Error('Storage error');
   calls.saved.push(JSON.parse(JSON.stringify({type,item})));
  },()=>{calls.render++;},()=>{},()=>{});
 return{fn,tx,bank,state,calls,$};
}
let n=0;async function test(name,fn){await fn();n++;console.log('PASS '+name);}
async function main(){
 await test('foreign metadata editing preserves native EUR debit and CAD history',async()=>{
  const h=fixture(),initial=JSON.parse(JSON.stringify(h.tx));h.fn(h.tx);
  assert.match(h.calls.html,/taux historique restent strictement inchangés/);
  h.$('#traceForeignMetaName').value='Repas modifié';
  h.$('#traceForeignMetaCategory').value='travel';
  await h.$('#traceForeignMetaSave').onclick();
  assert.equal(h.calls.saved.length,1);
  const next=h.calls.saved[0].item;
  assert.equal(next.name,'Repas modifié');assert.equal(next.categoryId,'travel');
  for(const field of Object.keys(initial)){
   if(!['name','categoryId'].includes(field))
    assert.deepEqual(next[field],initial[field],field);
  }
  assert.equal(h.tx.bankAmount,46.20);assert.equal(h.tx.amountCAD,73.92);
  assert.equal(h.calls.render,1);
 });
 await test('change of category never changes couple sharing',async()=>{
  const h=fixture();h.fn(h.tx);h.$('#traceForeignMetaCategory').value='travel';
  await h.$('#traceForeignMetaSave').onclick();
  assert.deepEqual(h.tx.splitAmounts,{la:36.96,partner:36.96});
  assert.equal(h.tx.bankRateCad,1.6);
 });
 await test('archived and income categories are rejected',async()=>{
  for(const bad of ['inactive','income','unknown','']){
   const h=fixture();h.fn(h.tx);h.$('#traceForeignMetaCategory').value=bad;
   await h.$('#traceForeignMetaSave').onclick();assert.equal(h.calls.saved.length,0);
  }
 });
 await test('blank or one-character description is rejected',async()=>{
  for(const bad of ['','A','X'.repeat(90)]){
   const h=fixture();h.fn(h.tx);h.$('#traceForeignMetaName').value=bad;
   await h.$('#traceForeignMetaSave').onclick();assert.equal(h.calls.saved.length,0);
  }
 });
 await test('stale local transaction blocks overwriting altered financial fields',async()=>{
  const h=fixture();h.fn(h.tx);h.tx.bankAmount=600;
  h.$('#traceForeignMetaName').value='Repas modifié';
  await h.$('#traceForeignMetaSave').onclick();
  assert.equal(h.calls.saved.length,0);
  assert.match(h.$('#traceForeignMetaError').textContent,/changé/);
 });
 await test('changing account owner or currency invalidates review',async()=>{
  for(const modify of [h=>h.bank.owner='partner',h=>h.bank.currency='CAD']){
   const h=fixture();h.fn(h.tx);modify(h);
   h.$('#traceForeignMetaCategory').value='travel';
   await h.$('#traceForeignMetaSave').onclick();assert.equal(h.calls.saved.length,0);
  }
 });
 await test('a failed cloud save does not change local expense',async()=>{
  const h=fixture({fail:true}),before=JSON.stringify(h.tx);h.fn(h.tx);
  h.$('#traceForeignMetaName').value='Repas';
  await h.$('#traceForeignMetaSave').onclick();
  assert.equal(JSON.stringify(h.tx),before);assert.equal(h.calls.render,0);
 });
 await test('unknown native amount blocks even metadata editing',()=>{
  const h=fixture({tx:{bankAmount:null}});h.fn(h.tx);
  assert.match(h.calls.title,/Montant natif/);
  assert.equal(h.$('#traceForeignMetaSave').onclick,null);
 });
 await test('only confirmed expenses owned by current person can use helper',()=>{
  for(const p of [{tx:{status:'pending'}},{tx:{type:'refund'}},{bank:{owner:'partner'}}]){
   const h=fixture(p);h.fn(h.tx);
   assert.match(h.calls.title,/vérifier/);assert.equal(h.$('#traceForeignMetaSave').onclick,null);
  }
 });
 await test('unchanged metadata exits without a database save',async()=>{
  const h=fixture();h.fn(h.tx);await h.$('#traceForeignMetaSave').onclick();
  assert.equal(h.calls.saved.length,0);assert.equal(h.calls.close,1);
 });
 await test('legacy CAD-only movement editor diverts foreign confirmed expenses',()=>{
  assert.match(app,/if\(originalAccount&&originalAccount\.owner===me&&\s+t\.type==='expense'&&t\.status==='confirmed'&&!t\.toAccountId\)\{\s+editForeignExpenseMetadata\(t\);return;/);
  assert.match(app,/const foreignAccount=state\.accounts\.find\(a=>a\.id===t\.accountId\)/);
  assert.match(app,/editForeignExpenseMetadata\(t\)/);
 });
 await test('deferred card creation remains off until integrated',()=>{
  assert.match(app,/<option value="deferred" disabled>/);
  assert.match(app,/payment\.value!=='credit'/);
 });
 console.log(n+' safe foreign metadata editor scenarios passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
