/* Trace Bank Documents 1.0.0 – on-device PDF text extraction and OCR */
(()=>{'use strict';
const PDF_JS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
const TESSERACT='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let worker=null, ocrLoader=null;
async function ocrReady(){
 if(window.Tesseract?.createWorker)return window.Tesseract;
 if(!ocrLoader)ocrLoader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=TESSERACT;script.async=true;
  script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR non disponible'));
  script.onerror=()=>reject(new Error('Impossible de charger le module OCR. Vérifie ta connexion.'));
  document.head.appendChild(script);
 });
 return ocrLoader;
}
async function getOcrWorker(){
 if(worker)return worker;
 const t=await ocrReady();
 worker=await t.createWorker('fra+eng');
 return worker;
}
async function recognize(data){
 const w=await getOcrWorker();
 const result=await w.recognize(data);
 return String(result?.data?.text||'');
}
function pdfText(items){
 const lines=new Map();
 for(const item of items){
  if(!item?.str?.trim())continue;
  const y=Math.round((item.transform?.[5]||0)/3)*3;
  if(!lines.has(y))lines.set(y,[]);
  lines.get(y).push({x:Number(item.transform?.[4]||0),value:item.str});
 }
 return [...lines.entries()].sort((a,b)=>b[0]-a[0]).map(([y,parts])=>parts.sort((a,b)=>a.x-b.x).map(p=>p.value.trim()).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
async function extract(file,onProgress=()=>{}){
 const name=(file.name||'').toLowerCase();
 const isPdf=file.type==='application/pdf'||name.endsWith('.pdf');
 const isImage=file.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|heic)$/i.test(name);
 if(!isPdf&&!isImage)throw new Error('Format non pris en charge : choisis une image, un PDF ou un CSV.');
 if(file.size>12*1024*1024)throw new Error('Document trop volumineux (maximum 12 Mo).');
 let result='',pageCount=1,ocrPages=0;
 if(isPdf){
  onProgress('Ouverture du PDF sur cet appareil…');
  let pdfjs;
  try{pdfjs=await import(PDF_JS)}catch(e){throw new Error('Le lecteur PDF n’a pas pu être téléchargé. Vérifie la connexion.');}
  pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  const doc=await task.promise;
  try{
   pageCount=doc.numPages;
   if(pageCount>12)throw new Error('PDF de plus de 12 pages : exporte uniquement la période à importer.');
   for(let i=1;i<=pageCount;i++){
    const page=await doc.getPage(i);
    const content=await page.getTextContent();
    const text=pdfText(content.items);
    if(text.replace(/\s/g,'').length>=35){result+=text+'\n';onProgress('PDF : texte lu, page '+i+'/'+pageCount);}
    else{
     onProgress('PDF scanné : lecture OCR '+i+'/'+pageCount+'…');
     const viewport=page.getViewport({scale:1.6});
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
     result+=(await recognize(canvas))+'\n';ocrPages++;
     canvas.width=canvas.height=1;
    }
    page.cleanup?.();
   }
  }finally{await doc.destroy();}
 }else{
  onProgress('Analyse de l’image sur ton appareil…');
  result=await recognize(file);ocrPages=1;
 }
 if(!result.trim())throw new Error('Aucun texte lisible. Envoie une capture plus nette ou un PDF contenant du texte.');
 return {text:result.slice(0,120000),pageCount,ocrPages,source:ocrPages?'OCR local + PDF':'PDF texte'};
}
const dateRe=/\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:20)?\d{2})\b/;
const moneyRe=/[-−+]?\(?\d{1,7}(?:[ \u00a0\u202f.,]\d{3})*(?:[.,]\d{2})\)?\s*(?:\$|€|CAD|USD|EUR)?/gi;
function isoDate(str,locale='dmy'){
 let s=String(str||'').trim(),m=s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
 if(!m)return null;
 let y,month,day;
 if(m[1].length===4){y=+m[1];month=+m[2];day=+m[3];}
 else{y=+m[3];if(y<100)y+=2000;day=+(locale==='mdy'?m[2]:m[1]);month=+(locale==='mdy'?m[1]:m[2]);}
 const d=new Date(y,month-1,day);
 return y>=2000&&y<=2100&&d.getFullYear()===y&&d.getMonth()+1===month&&d.getDate()===day?
  String(y)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'):null;
}
function cleanAmount(raw){
 let s=String(raw||'').replace(/\b(?:CAD|USD|EUR)\b/gi,'').replace(/[\u00a0\u202f\s$€]/g,'').trim();
 if(!s)return NaN;
 const neg=/^\(.*\)$/.test(s)||/^[-−]/.test(s);s=s.replace(/[()−+-]/g,'');
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(s.includes(','))s=/,\d\d$/.test(s)?s.replace(',','.'):s.replace(/,/g,'');
 const n=Number(s);return Number.isFinite(n)?n*(neg?-1:1):NaN;
}
function extractCandidates(raw,locale='dmy'){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 const out=[];let flagged=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],dateMatch=line.match(dateRe);if(!dateMatch)continue;
  const date=isoDate(dateMatch[0],locale);if(!date){flagged++;continue;}
  const rest=line.slice(dateMatch.index+dateMatch[0].length).trim();
  if(!rest||/^(?:solde|balance|total|subtotal|opening|closing|date|relevé|statement)\b/i.test(rest)){flagged++;continue;}
  let matches=[...rest.matchAll(moneyRe)].map(m=>({value:cleanAmount(m[0]),raw:m[0],index:m.index,length:m[0].length})).filter(x=>Number.isFinite(x.value)&&x.value!==0&&/[\.,]\d{2}\b/.test(x.raw));
  if(!matches.length){flagged++;continue;}
  const amount=matches.length===1?matches[0]:null;
  const end=amount?amount.index:matches[0].index;
  const name=rest.slice(0,end).replace(/[\s\-–]+$/,'').trim().slice(0,90);
  if(name.length<2){flagged++;continue;}
  const plausible=!!amount&&Math.abs(amount.value)<1000000;
  out.push({date,name,amount:plausible?Math.abs(amount.value):'',type:/(?:salaire|paie|remboursement|d[eé]p[oô]t|virement re[cç]u|cr[eé]dit)/i.test(rest)||/^\+/.test(String(amount?.raw||'').trim())?'income':'expense',selected:plausible,ambiguous:!plausible,raw:line,index:i+1});
  if(out.length>=300)break;
 }
 return{candidates:out,flagged,lines:lines.length};
}
async function cleanup(){if(worker){const w=worker;worker=null;await w.terminate();}}
window.TraceBankDocuments={extract,extractCandidates,isoDate,cleanAmount,cleanup,version:'1.0.0'};
})();