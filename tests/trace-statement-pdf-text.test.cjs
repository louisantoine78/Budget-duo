'use strict';
/* Synthetic yet structurally valid PDF fixtures with xref, local only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','trace-statement-pdf-text-1.0.0.js'),'utf8');
const window={};vm.runInNewContext(source,{window});
const scan=window.TraceStatementPDFText.scan;
function pdf(pages,{font='Helvetica',encoding='',badLength=false,encrypt=false,withImage=false,rotate=false}={}){
 let objects=new Map(),root=1,pagesId=2,fontId=3+2*pages.length;
 const put=(id,data)=>objects.set(id,data);
 put(root,'<< /Type /Catalog /Pages 2 0 R >>');
 put(pagesId,'<< /Type /Pages /Kids ['+pages.map((_,i)=>(3+i*2)+' 0 R').join(' ')+'] /Count '+pages.length+' >>');
 pages.forEach((lines,i)=>{
  const p=3+i*2,s=p+1;
  const content=lines.map((line,j)=>
   'BT /F1 11 Tf 72 '+(730-18*j)+' Td ('+
     String(line).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)')+
   ') Tj ET').join('\n');
  put(p,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]'+
   (rotate?' /Rotate 90':'')+
   ' /Resources << /Font << /F1 '+fontId+' 0 R >> >> /Contents '+s+' 0 R >>');
  put(s,'<< /Length '+(content.length+(badLength?3:0))+' >>\nstream\n'+content+'\nendstream');
 });
 put(fontId,'<< /Type /Font /Subtype /Type1 /BaseFont /'+font+
   (encoding?' /Encoding /'+encoding:'')+' >>');
 const sorted=[...objects.entries()].sort((a,b)=>a[0]-b[0]);
 let text='%PDF-1.4\n',offsets=[0];for(const [id,body] of sorted){
  offsets[id]=text.length;text+=id+' 0 obj\n'+body+'\nendobj\n';
 }
 const at=text.length,maxId=sorted[sorted.length-1][0];
 text+='xref\n0 '+(maxId+1)+'\n0000000000 65535 f \n';
 for(let id=1;id<=maxId;id++)text+=(offsets[id]===undefined?
  '0000000000 00000 f \n':String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 text+='trailer\n<< /Size '+(maxId+1)+' /Root 1 0 R '+
  (encrypt?'/Encrypt 11 0 R ':'')+'>>\nstartxref\n'+at+'\n%%EOF\n';
 if(withImage)text=text.replace('/Contents 4 0 R','/XObject << /Im1 21 0 R >> /Contents 4 0 R');
 const bytes=Uint8Array.from(text,c=>c.charCodeAt(0));
 return{size:bytes.length,arrayBuffer:async()=>bytes.buffer};
}
let checks=0;async function test(label,fn){await fn();checks++;console.log('PASS '+label);}
async function main(){
 await test('two-page real-structure ASCII text yields page/line evidence and native amounts',async()=>{
  const r=await scan(pdf([
   ['EXAMPLE BANK STATEMENT','12/10/2026 | Groceries | DEBIT | 40,00',
    '13/10/2026 | Transfer received | CREDIT | 1000.25'],
   ['15/10/2026 | Restaurant | OUT | 55.20']
  ]));
  assert.equal(r.status,'review_required');assert.equal(r.pages,2);
  assert.equal(r.proposals.length,3);assert.equal(r.unparsed.length,1);
  assert.equal(r.proposals[0].page,1);assert.equal(r.proposals[0].line,2);
  assert.equal(r.proposals[0].date,'2026-10-12');
  assert.equal(r.proposals[0].amount,40);
  assert.equal(r.proposals[1].direction,'in');
  assert.equal(r.proposals[2].page,2);
  assert.equal(r.complete,false);assert.equal(r.writes,0);
 });
 await test('all recognitions remain proposed and never implicitly approved',async()=>{
  const r=await scan(pdf([['2026-10-15 | Salary | IN | 2500.00']]));
  assert.equal(r.status,'review_required');assert.equal(r.proposals.length,1);
  assert.equal(r.proposals[0].direction,'in');
  assert.equal(r.proposals[0].name,'Salary');
  assert.equal(r.financialChanges,0);assert.equal(r.complete,false);
 });
 await test('bad dates and decimal precision are NOT normalized by guessing',async()=>{
  const r=await scan(pdf([['31/02/2026 | Coffee | DEBIT | 3,00',
    '12/10/2026 | Coffee | DEBIT | 3,123',
    '12/10/2026 | Coffee | DEBIT | 3.25']]));
  assert.equal(r.proposals.length,1);assert.equal(r.unparsed.length,2);
  assert.equal(r.proposals[0].amount,3.25);
 });
 await test('unsupported font encodings fail closed before proposing any bank row',async()=>{
  const r=await scan(pdf([['12/10/2026 | Test | OUT | 3.20']],{font:'CustomFont'}));
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
  assert.match(r.reason,/Police PDF/);
 });
 await test('PDFs marked encrypted are never scanned',async()=>{
  const r=await scan(pdf([['12/10/2026 | Test | OUT | 3.20']],{encrypt:true}));
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 await test('page XObjects do not silently hide graphic bank rows',async()=>{
  const r=await scan(pdf([['12/10/2026 | Test | OUT | 3.20']],{withImage:true}));
  assert.equal(r.status,'unsupported');
 });
 await test('broken stream lengths cannot produce credible movements',async()=>{
  const r=await scan(pdf([['12/10/2026 | Test | OUT | 3.20']],{badLength:true}));
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 await test('rotated pages are rejected conservatively',async()=>{
  const r=await scan(pdf([['12/10/2026 | Test | OUT | 3.20']],{rotate:true}));
  assert.equal(r.status,'unsupported');
 });
 await test('non-PDF and truncated PDF are rejected',async()=>{
  const bad=new Uint8Array([65,66,67,68,69,70,71,72]);
  const r=await scan({size:bad.length,arrayBuffer:async()=>bad.buffer});
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 await test('ambiguous natural-language amounts remain unparsed',async()=>{
  const r=await scan(pdf([['12/10/2026 Coffee 42.00','12/10/2026 | Taxi | DEBIT | 42,00',
    '12/10/2026 | Balance | 42,00']]));
  assert.equal(r.proposals.length,1);assert.equal(r.unparsed.length,2);
 });
 await test('more than 250 detected text lines returns unsupported, no partial rows',async()=>{
  const lines=Array.from({length:251},(_,i)=>'12/10/2026 | Line '+i+' | DEBIT | 3,00');
  const r=await scan(pdf([lines]));
  assert.equal(r.status,'unsupported');assert.equal(r.proposals.length,0);
 });
 console.log(checks+' limited PDF text scanner controls passed');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1;});
