'use strict';
// Fictional CSV statement rows: identical merchant, date and amount can be distinct.
// Exercise real candidate importFile with in-memory bank docs; no actual database or file.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','trace-international-1.0.0.js'),'utf8'),{window});
const start=app.indexOf('function normalizedCsvKey('),end=app.indexOf('/* Merchant suggestions',start);
assert.ok(start>=0&&end>start);
const helperStart=app.indexOf('function smartExactBankAmount(');
const exact=new Function('return ('+app.slice(helperStart,app.indexOf('\nfunction smartStrictDate(',helperStart))+');')();
const nativeFunctions=new Function(app.slice(start,app.indexOf('\nfunction importFile(',start))+
 '\nreturn {csvFingerprint,csvImportedDuplicate,csvAlreadyImportedSourceRow};')();
const accounts=[{id:'ca',name:'Courant',type:'checking',currency:'CAD',owner:'la'},
 {id:'second',name:'Secondaire',type:'checking',currency:'CAD',owner:'la'}];
function harness(existing=[]){
 const state={accounts,transactions:existing.map(x=>({...x}))},nodes=new Map(),writes=[];let counter=0;
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',
  dataset:{},disabled:false,onclick:null});return nodes.get(id);};
 class FakeFileReader{readAsText(file){this.result=file.csv;this.onload();}}
 const deps={state,window,$,me:'la',FileReader:FakeFileReader,
  visibleBankAccounts:()=>accounts,shortAccountLabel:a=>a.name,
  esc:x=>String(x??''),txDocId:()=> 'csv-test-'+(++counter),
  smartExactBankAmount:exact,
  dateGapDays:(a,b)=>Math.abs((Date.parse(a+'T12:00:00')-Date.parse(b+'T12:00:00'))/86400000),
  traceSplit:()=>({split:{la:100,partner:0},splitAmounts:{la:25,partner:0}}),
  saveDocument:async(c,item)=>writes.push({c,item:{...item}}),
  renderAll(){},navigate(){},showTab(){},console:{error(){}}};
 const importFile=new Function(...Object.keys(deps),app.slice(start,end)+'\nreturn importFile;')(
  ...Object.values(deps));
 function load(csv,name='octobre.csv',accountId='ca'){
  importFile({name,csv,size:csv.length,type:'text/csv'});
  for(const [k,v] of Object.entries({date:'0',name:'1',amount:'-1',debit:'2',credit:'3'}))
   $('#csvCol_'+k).value=v;
  $('#csvDateFormat').value='dmy';$('#csvAccount').value=accountId;
  $('#csvPreview').onclick();
  return $('#csvPreviewResult').innerHTML;
 }
 async function commit(){if(!$('#csvCommit').onclick)return false;
  await $('#csvCommit').onclick();return true;}
 return{state,$,writes,load,commit};
}
const csv='Date;Libellé;Débit;Crédit\n'+
 '15/10/2026;BILLET TRAIN;25,00;\n'+
 '15/10/2026;BILLET TRAIN;25,00;\n';
let n=0;
async function test(label,fn){await fn();n++;console.log('PASS '+label);}
async function main(){
 await test('two identical-looking transactions in one statement stay separate pending rows',async()=>{
  const h=harness(),preview=h.load(csv);
  assert.match(preview,/2 lignes à vérifier/);
  assert.match(preview,/1 rapprochement\(s\) possible\(s\)/);
  await h.commit();assert.equal(h.writes.length,2);
  assert.equal(h.state.transactions.length,2);
  assert.ok(h.writes.every(x=>x.item.status==='pending'));
  assert.deepEqual(h.writes.map(x=>x.item.csvSourceRowIndex),[2,3]);
  assert.equal(h.writes[0].item.importFingerprint,h.writes[1].item.importFingerprint);
  assert.deepEqual(h.writes[1].item.csvReviewMatchIds,[h.writes[0].item.id]);
 });
 await test('reimporting the exact same CSV and source rows is idempotent',async()=>{
  const h=harness();h.load(csv);await h.commit();
  const preview=h.load(csv);
  assert.match(preview,/0 lignes à vérifier/);
  assert.match(preview,/2 doublon\(s\) déjà présents non réimportés/);
  assert.equal(h.state.transactions.length,2);
  assert.equal(h.writes.length,2);
 });
 await test('renamed source file stays reviewable rather than silently disappearing',async()=>{
  const h=harness();h.load(csv,'releve-a.csv');await h.commit();
  const preview=h.load(csv,'releve-b.csv');
  assert.match(preview,/2 lignes à vérifier/);
  assert.match(preview,/rapprochement\(s\) possible\(s\)/);
  await h.commit();
  assert.equal(h.writes.length,4);
  assert.ok(h.writes.slice(2).every(x=>x.item.csvReviewMatchIds.length>0));
  assert.ok(h.state.transactions.every(x=>x.status==='pending'));
 });
 await test('a manual matching expense remains untouched while the CSV row is flagged',async()=>{
  const manual={id:'manual-purchase',status:'confirmed',type:'expense',
   source:'manual',accountId:'ca',date:'2026-10-15',name:'BILLET TRAIN',
   bankAmount:25,amountCAD:25};
  const h=harness([manual]);const p=h.load(csv);
  assert.match(p,/2 lignes à vérifier/);
  assert.match(p,/rapprochement\(s\) possible\(s\)/);
  await h.commit();
  assert.equal(h.state.transactions.length,3);
  assert.equal(h.state.transactions[0].status,'confirmed');
  assert.equal(h.state.transactions[0].type,'expense');
  assert.ok(h.writes.every(x=>x.item.csvReviewMatchIds.includes('manual-purchase')));
 });
 await test('row provenance, account and bank fingerprint all matter to idempotence',()=>{
  const old={id:'x',source:'csv',importFileName:'oct.csv',csvSourceRowIndex:2,
   accountId:'ca',date:'2026-10-15',name:'TRAIN',type:'expense',bankAmount:25};
  const same={...old,id:'y'};
  assert.equal(nativeFunctions.csvAlreadyImportedSourceRow(same,[old]),true);
  assert.equal(nativeFunctions.csvAlreadyImportedSourceRow({...same,csvSourceRowIndex:3},[old]),false);
  assert.equal(nativeFunctions.csvAlreadyImportedSourceRow({...same,accountId:'second'},[old]),false);
  assert.equal(nativeFunctions.csvAlreadyImportedSourceRow({...same,bankAmount:26},[old]),false);
  assert.equal(nativeFunctions.csvAlreadyImportedSourceRow({...same,importFileName:'other.csv'},[old]),false);
 });
 await test('all seven proposals and rejected source lines remain inspectable beyond the old five-row limit',()=>{
  const many='Date;Libellé;Débit;Crédit\n'+Array.from({length:7},(_,i)=>
   '15/10/2026;Achat '+i+';'+(20+i)+',00;').join('\n')+'\n16/10/2026;Ambigu;4,00;2,00';
  const h=harness(),preview=h.load(many);
  assert.equal((preview.match(/data-csv-preview-row=/g)||[]).length,7);
  assert.match(preview,/data-csv-preview-row="8"/);
  assert.match(preview,/Ligne 9 : 16\/10\/2026 \| Ambigu \| 4,00 \| 2,00/);
  assert.match(preview,/1 ligne\(s\) invalide\(s\)/);assert.equal(h.writes.length,0);
 });
 console.log(n+' source-row CSV idempotence and preservation checks passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
