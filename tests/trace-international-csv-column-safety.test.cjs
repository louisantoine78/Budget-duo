'use strict';
// Real candidate CSV parser/importer, all fake DOM, FileReader and bank documents.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const w={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8'),{window:w});
const st=app.indexOf('function normalizedCsvKey('),ed=app.indexOf('/* Merchant suggestions',st);
const i=app.indexOf('function smartExactBankAmount('),j=app.indexOf('\nfunction smartStrictDate(',i);
const exact=new Function('return ('+app.slice(i,j)+');')();
let passed=0;async function test(label,fn){await fn();passed++;console.log('PASS '+label);}
function load(lines,signed=false){
 const account={id:'ca',name:'Courant',currency:'CAD',type:'checking',owner:'la'};
 const state={accounts:[account],transactions:[],smartImports:[]},nodes=new Map(),writes=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},textContent:'',
  innerHTML:'',disabled:false,onclick:null});return nodes.get(id)};
 class Reader{readAsText(f){this.result=f.csv;this.onload();}}
 const ctx={state,window:w,$,me:'la',FileReader:Reader,
  visibleBankAccounts:()=>[account],shortAccountLabel:x=>x.name,esc:x=>String(x??''),
  txDocId:(()=>{let seq=0;return()=> 'fake-'+(++seq)})(),
  smartExactBankAmount:exact,
  accountType:a=>a?.type,internationalPreviewMode:()=>true,
  dateGapDays:(a,b)=>Math.abs((Date.parse(a)-Date.parse(b))/86400000),
  traceSplit:()=>({split:{la:100,partner:0}}),
  saveDocument:async(c,item)=>writes.push({c,item:{...item}}),
  renderAll(){},navigate(){},showTab(){},console:{error(){}}
 };
 const fn=new Function(...Object.keys(ctx),app.slice(st,ed)+'\nreturn importFile;')(...Object.values(ctx));
 const csv=(signed?'Date;Libellé;Montant':'Date;Libellé;Débit;Crédit')+'\n'+lines.join('\n')+'\n';
 fn({name:'fiction.csv',type:'text/csv',size:csv.length,csv});
 const mapping={date:'0',name:'1',amount:signed?'2':'-1',debit:signed?'-1':'2',credit:signed?'-1':'3'};
 for(const [k,v] of Object.entries(mapping))$('#csvCol_'+k).value=v;
 $('#csvDateFormat').value='dmy';$('#csvAccount').value='ca';$('#csvSign').value='income';
 $('#csvPreview').onclick();
 return{state,writes,preview:$('#csvPreviewResult').innerHTML,
  acknowledgeInvalid:()=>{$('#csvInvalidAcknowledged').checked=true;},
  commit:async()=>{if($('#csvCommit').onclick)await $('#csvCommit').onclick()}};
}
async function main(){
 await test('simultaneous debit and credit never silently become income',async()=>{
  const h=load(['15/10/2026;AMBIGUE;75,00;50,00']);
  assert.match(h.preview,/1 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0);
 });
 await test('valid debit remains an expense',async()=>{
  const h=load(['15/10/2026;COURSES;75,00;']);
  await h.commit();assert.equal(h.writes[0].item.type,'expense');
  assert.equal(h.writes[0].item.bankAmount,75);assert.equal(h.writes[0].item.status,'pending');
 });
 await test('valid credit remains income',async()=>{
  const h=load(['15/10/2026;VIREMENT;;50,00']);
  await h.commit();assert.equal(h.writes[0].item.type,'income');
  assert.equal(h.writes[0].item.bankAmount,50);
 });
 await test('malformed debit is never silently ignored beside valid credit',async()=>{
  const h=load(['15/10/2026;INCOHERENT;illisible;50,00']);
  assert.match(h.preview,/1 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0);
 });
 await test('malformed credit is never silently ignored beside valid debit',async()=>{
  const h=load(['15/10/2026;INCOHERENT;75,00;N-A']);
  assert.match(h.preview,/1 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0);
 });
 await test('both columns blank or zero cannot create money',async()=>{
  const h=load(['15/10/2026;EMPTY;;','15/10/2026;ZERO;0;0']);
  assert.match(h.preview,/2 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0);
 });
 await test('explicit zero in one column and positive in the other is valid',async()=>{
  const h=load(['15/10/2026;SHOP;75,00;0','15/10/2026;REFUND;0;50,00']);
  await h.commit();assert.deepEqual(h.writes.map(x=>x.item.type),['expense','income']);
  assert.deepEqual(h.writes.map(x=>x.item.bankAmount),[75,50]);
 });
 await test('malformed sign-only bank cell beside a valid credit must be rejected',async()=>{
  const h=load(['15/10/2026;INVALID;--;50,00']);
  assert.match(h.preview,/1 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0);
 });
 await test('embedded sign must be rejected, while legitimate negative money remains valid',async()=>{
  const h=load(['15/10/2026;INVALID;1-0;',
    '15/10/2026;LEGITIMATE;50,00-;',
    '15/10/2026;NEGATIVE;-25,00;']);
  assert.match(h.preview,/1 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0,'Partial import requires explicit acknowledgement');
  h.acknowledgeInvalid();await h.commit();
  assert.deepEqual(h.writes.filter(x=>x.c==='transactions').map(x=>x.item.bankAmount),[50,25]);
  assert.equal(h.writes.filter(x=>x.c==='imports').length,1,'Unparsed row retained separately');
 });
 await test('mixed rows retain original physical row references',async()=>{
  const h=load(['15/10/2026;BAD;75,00;50,00',
    '15/10/2026;OK;42,50;',
    '15/10/2026;BAD;unknown;12,50',
    '15/10/2026;OK;;100,00']);
  assert.match(h.preview,/2 ligne\(s\) invalide\(s\)/);
  await h.commit();assert.equal(h.writes.length,0,'No partial import before acknowledgement');
  h.acknowledgeInvalid();await h.commit();
  assert.deepEqual(h.writes.filter(x=>x.c==='transactions').map(x=>x.item.csvSourceRowIndex),[3,5]);
  assert.ok(h.writes.filter(x=>x.c==='transactions').every(x=>x.item.status==='pending'));
  assert.deepEqual(h.writes.filter(x=>x.c==='imports').map(x=>x.item.sourceIndex),[2,4]);
 });
 await test('separate signed-amount CSV layout still works',async()=>{
  const h=load(['15/10/2026;DÉBIT;-23,50','15/10/2026;CRÉDIT;19,00'],true);
  await h.commit();assert.deepEqual(h.writes.map(x=>x.item.type),['expense','income']);
  assert.deepEqual(h.writes.map(x=>x.item.bankAmount),[23.50,19]);
 });
 console.log(passed+' CSV debit and credit column safety checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
