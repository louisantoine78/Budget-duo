'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','trace-statement-pdfjs-adapter-1.0.0.js'),'utf8');
const root={};vm.runInNewContext(src,{window:root});
const adapter=root.TraceStatementPDFJS;
const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
const HEADER=[item('Date',30,780),item('Libellé',135,780),item('Débit',420,780),item('Crédit',545,780)];
const PAGE=[...HEADER,item('12/10/2026',30,750),item('Épicerie',135,750),item('40,50',420,750),
item('13/10/2026',30,725),item('Salaire',135,725),item('2 100,00',545,725)];
const make=(pages,opts={})=>{
 let called=0,destroyed=0;
 const engine={getDocument(args){
  called++;
  if(args.data===undefined||args.stopAtErrors!==true||args.disableAutoFetch!==true)
    throw Error('Unsafe getDocument options');
  return{promise:Promise.resolve({numPages:pages.length,
    getPage:async index=>({rotate:opts.rotation||0,getTextContent:async()=>({items:pages[index-1]}),cleanup(){}})}),
    async destroy(){destroyed++}};
 }};
 const bytes=new Uint8Array(64);[37,80,68,70,45].forEach((v,i)=>bytes[i]=v);
 return{engine,file:{size:bytes.length,arrayBuffer:async()=>bytes.buffer},
    calls:()=>called,destroys:()=>destroyed};
};
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
async function main(){
 await test('French debit and salary credit parsed with original page/line references',()=>{
  const r=adapter.pageText(1,PAGE);
  assert.equal(r.status,'review_required');assert.equal(r.proposals.length,2);
  assert.equal(r.proposals[0].direction,'out');assert.equal(r.proposals[0].amount,40.5);
  assert.equal(r.proposals[1].direction,'in');assert.equal(r.proposals[1].amount,2100);
  assert.equal(r.proposals[0].page,1);assert.equal(r.proposals[0].line,2);
  assert.equal(r.complete,false);assert.equal(r.writes,0);
 });
 await test('decimal values across Canada and France remain native, no FX inferred',()=>{
  const r=adapter.pageText(1,[...HEADER,item('2026-10-15',30,740),item('Restaurant',135,740),item('4,209.75',420,740)]);
  assert.equal(r.proposals.length,1);assert.equal(r.proposals[0].amount,4209.75);
  assert.equal(r.proposals[0].currency,undefined);
 });
 await test('bank header column order must be unique and valid',()=>{
  const r=adapter.pageText(1,[item('Date',30,780),item('Libellé',135,780),item('Crédit',420,780),item('Débit',545,780)]);
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 await test('no recognizable header prevents silent interpretation',()=>{
  const r=adapter.pageText(1,[item('12/10/2026',30,750),item('Groceries',135,750),item('40,50',420,750)]);
  assert.equal(r.status,'unsupported');
 });
 await test('simultaneous debit and credit is ambiguous, not booked',()=>{
  const r=adapter.pageText(1,[...HEADER,item('12/10/2026',30,750),item('Refund?',135,750),item('40,50',420,750),item('9,00',545,750)]);
  assert.equal(r.proposals.length,0);assert.equal(r.unparsed.length,2);
 });
 await test('invalid bank dates, missing cents and descriptions are not guessed',()=>{
  const r=adapter.pageText(1,[...HEADER,item('31/02/2026',30,750),item('Shop',135,750),item('40,00',420,750),
   item('13/10/2026',30,725),item('Taxi',135,725),item('40',420,725)]);
  assert.equal(r.proposals.length,0);assert.equal(r.unparsed.length,3);
 });
 await test('mixed prose after header remains explicitly unparsed',()=>{
  const r=adapter.pageText(1,[...HEADER,item('Balance previous period',140,740),item('12/10/2026',30,715),item('Groceries',135,715),item('12,30',420,715)]);
  assert.equal(r.proposals.length,1);assert.equal(r.unparsed.length,2);
 });
 await test('synthetic two-page PDF.js document scanned locally without network',async()=>{
  const f=make([PAGE,PAGE]);
  const r=await adapter.scan(f.file,{engine:f.engine});
  assert.equal(r.status,'review_required');assert.equal(r.pages,2);
  assert.equal(r.proposals.length,4);assert.equal(r.proposals[2].page,2);
  assert.equal(f.calls(),1);assert.equal(f.destroys(),1);
  assert.equal(r.complete,false);assert.equal(r.financialChanges,0);
 });
 await test('missing local pinned engine refuses without fetching',async()=>{
  const f=make([PAGE]);const r=await adapter.scan(f.file);
  assert.equal(r.status,'unsupported');assert.equal(f.calls(),0);
  assert.match(r.reason,/local/);
 });
 await test('rotated page fails closed and destroys loading task',async()=>{
  const f=make([PAGE],{rotation:90});const r=await adapter.scan(f.file,{engine:f.engine});
  assert.equal(r.status,'unsupported');assert.equal(f.destroys(),1);
 });
 await test('one unreadable page refuses the entire monthly statement',async()=>{
  const f=make([PAGE,[item('scanned image',50,770)]]);
  const r=await adapter.scan(f.file,{engine:f.engine});
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 await test('page item without trustworthy position fails closed',()=>{
  const r=adapter.pageText(1,[...HEADER,{str:'Amount with no coordinates'}]);
  assert.equal(r.status,'unsupported');
 });
 console.log(count+' PDF.js strict-column adapter synthetic tests passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
