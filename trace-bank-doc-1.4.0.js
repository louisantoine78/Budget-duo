/* Trace Bank Documents 1.0.0 – on-device PDF text extraction and OCR */
(()=>{'use strict';
const PDF_JS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDF_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
const TESSERACT='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let workers=new Map(), ocrLoader=null;
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
async function getOcrWorker(lang='fra+eng'){
 if(workers.has(lang))return workers.get(lang);
 const t=await ocrReady();
 const w=await t.createWorker(lang);
 workers.set(lang,w);return w;
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

/* Mobile banking screenshots: rebuild each row from OCR word coordinates.
   The whole-page OCR may drop commas or reorder rows. The price is
   re-read separately from its own enlarged image region. */
function readOcrTsv(tsv){
 return String(tsv||'').split(/\r?\n/).slice(1).map(line=>{
  const p=line.split('\t');if(p.length<12||p[0]!=='5')return null;
  const text=p.slice(11).join('\t').trim();
  const left=Number(p[6]),top=Number(p[7]),width=Number(p[8]),height=Number(p[9]);
  return text&&[left,top,width,height].every(Number.isFinite)?{text,left,top,width,height,y:top+height/2}:null;
 }).filter(Boolean);
}
function screenshotLayoutCandidates(tsv,width,height,hintDate=''){
 const words=readOcrTsv(tsv);
 if(words.length<6||width<200||height<200)return[];
 const threshold=Math.max(9,height*.022);
 const lines=[];
 for(const word of words.sort((a,b)=>a.y-b.y||a.left-b.left)){
  let line=lines.find(line=>Math.abs(line.y-word.y)<threshold);
  if(!line){line={y:word.y,words:[]};lines.push(line);}
  line.words.push(word);
  line.y=line.words.reduce((n,w)=>n+w.y,0)/line.words.length;
 }
 for(const l of lines)l.words.sort((a,b)=>a.left-b.left);
 const dayYears=hintDate&&/^\d{4}-\d\d-\d\d$/.test(hintDate)?Number(hintDate.slice(0,4)):new Date().getFullYear();
 const normalizeMonth=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'').toUpperCase();
 const rows=[];
 for(const line of lines){
  // Tesseract commonly reads the day and month as a single token: "1OCT".
  // Support both "1OCT" and two words "1 OCT" using physical x-coordinates.
  let date=null;
  for(const word of line.words){
   if(word.left>width*.62)continue;
   const normalized=normalizeMonth(word.text).replace(/^0/,'O');
   const direct=word.text.replace(/[.,:]/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/^([0-3]?\d)([A-Z0-9]{3,6})$/);
   let day=null,month=null;
   if(direct){day=Number(direct[1]);month=monthsFR[direct[2].replace(/^0/,'O')];}
   if(!month&&monthsFR[normalized]){
    const prior=line.words.filter(w=>w.left<word.left&&word.left-w.left-w.width<width*.075).reverse();
    const number=prior.find(w=>/^\d{1,2}$/.test(w.text));
    if(number){day=Number(number.text);month=monthsFR[normalized];}
   }
   if(day&&month){date=isoDate(String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+dayYears,'dmy');if(date)break;}
  }
  if(!date)continue;
  // On these lists the name/price appear above their date. Read horizontal
  // alignment, not the order OCR returned its text in.
  const possible=lines.filter(l=>l.y<line.y-Math.max(10,height*.018)&&l.y>line.y-height*.14).map(l=>{
   const words=l.words.filter(w=>w.left>width*.155&&w.left<width*.68&&/[A-Za-zÀ-ÿ]/.test(w.text));
   const name=words.map(w=>w.text).join(' ').replace(/\s+/g,' ').trim();
   return{line:l,name,delta:line.y-l.y};
  }).filter(x=>x.name.length>3&&!/^\d{1,2}\s+[A-Z]{3,5}$/i.test(x.name))
   .sort((a,b)=>a.delta-b.delta);
  const match=possible[0];
  if(!match)continue;
  let name=match.name.replace(/^[^a-zA-ZÀ-ÿ]+/,'').replace(/\s+[›>]$/,'').trim();
  if(!name||rows.some(r=>r.date===date&&r.name===name&&Math.abs(r.box.y-match.line.y)<20))continue;
  rows.push({date,name,amount:'',type:'expense',selected:false,ambiguous:true,
   source:'screenshot-layout',raw:name+' | '+date,
   box:{y:match.line.y},index:rows.length+1});
 }
 return rows.slice(0,60);
}
async function decodeImageForOcr(file){
 if(typeof createImageBitmap==='function'){
  try{const bitmap=await createImageBitmap(file);return{image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};}
  catch(e){console.info('ImageBitmap unavailable, using image decode');}
 }
 return new Promise((resolve,reject)=>{
  const img=document.createElement('img'),url=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(url);resolve({image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>{img.src='';}});};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image incompatible avec la lecture locale. Essaie une capture JPG ou PNG.'));};
  img.src=url;
 });
}
function parseReliablePrice(text){
 const cleaned=String(text||'').replace(/[\u00a0\u202f]/g,' ').replace(/[S$€]/gi,'').trim();
 const matches=[...cleaned.matchAll(/(?:^|[^\d])(\d{1,6}(?:[ ]\d{3})*[,\.]\d{2})(?=$|[^\d])/g)];
 if(matches.length!==1)return null;
 const n=cleanAmount(matches[0][1]);return Number.isFinite(n)&&n>.001&&n<1000000?Number(n.toFixed(2)):null;
}
async function recognizeStructuredScreenshot(file,worker,base,onProgress=()=>{},hintDate=''){
 const frame=await decodeImageForOcr(file);
 try{
  const rows=screenshotLayoutCandidates(base.tsv,frame.width,frame.height,hintDate);
  if(!rows.length)return[];
  await worker.setParameters({tessedit_pageseg_mode:'7'});
  try{
   for(let i=0;i<rows.length;i++){
    const r=rows[i];
    onProgress('Lecture des montants : '+(i+1)+' / '+rows.length+'…');
    const width=frame.width,height=frame.height,
     left=Math.round(width*.66),right=Math.round(width*.875),center=r.box.y;
    const top=Math.max(0,Math.floor(center-height*.044)),bottom=Math.min(height,Math.ceil(center+height*.044));
    const w=right-left,h=bottom-top,scale=Math.min(4,1200/w);
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx){r.raw+=' | Montant non reconnu';continue;}
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(frame.image,left,top,w,h,0,0,canvas.width,canvas.height);
    try{
     const primary=await worker.recognize(canvas);
     let amount=parseReliablePrice(primary?.data?.text);
     const primaryScore=Number(primary?.data?.confidence);
     let confidence=Number.isFinite(primaryScore)?primaryScore:null;
     let disagreement=false;
     // Only low-confidence / unreadable prices get the slower contrast pass.
     // Cents must be visibly separated; never infer 24,13 from "2413S".
     if(amount===null||(confidence!==null&&confidence<55)){
      ctx.filter='grayscale(1) contrast(1.8)';
      ctx.drawImage(frame.image,left,top,w,h,0,0,canvas.width,canvas.height);
      const alternate=await worker.recognize(canvas);
      const other=parseReliablePrice(alternate?.data?.text);
      const otherScore=Number(alternate?.data?.confidence);
      const otherConfidence=Number.isFinite(otherScore)?otherScore:null;
      ctx.filter='none';
      if(amount!==null&&other!==null&&amount!==other){
       disagreement=true;
       if(otherConfidence!==null&&(confidence===null||otherConfidence>confidence)){amount=other;confidence=otherConfidence;}
      }else if(amount!==null&&other===amount){
       // Independent recognition profiles agree on the exact cents.
       confidence=Math.max(70,confidence??0,otherConfidence??0);
      }else if(amount===null&&other!==null){amount=other;confidence=otherConfidence;}
     }
     if(amount!==null){
      r.amount=amount;r.ambiguous=false;
      r.confidence=confidence;
      r.needsReview=disagreement||(confidence!==null&&confidence<45);
      r.selected=!r.needsReview;
      if(disagreement)r.raw+=' | Lectures OCR contradictoires';
     }else{r.needsReview=true;r.raw+=' | Montant à renseigner';}
    }catch(e){r.raw+=' | OCR du montant à vérifier';}
    canvas.width=canvas.height=1;
    delete r.box;
   }
  }finally{await worker.setParameters({tessedit_pageseg_mode:'3'}).catch(()=>{});}
  return rows;
 }finally{frame.close();}
}

async function extract(file,onProgress=()=>{},options={}){
 const name=(file.name||'').toLowerCase();
 const isPdf=file.type==='application/pdf'||name.endsWith('.pdf');
 const isImage=file.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|heic)$/i.test(name);
 if(!isPdf&&!isImage)throw new Error('Format non pris en charge : choisis une image, un PDF ou un CSV.');
 if(file.size>12*1024*1024)throw new Error('Document trop volumineux (maximum 12 Mo).');
 let result='',pageCount=1,ocrPages=0,structuredCandidates=[];
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
  const w=await getOcrWorker('eng');
  // TSV contains coordinates even when the OCR reading order is incorrect.
  const base=await w.recognize(file,{}, {text:true,tsv:true});
  result=String(base?.data?.text||'');
  ocrPages=1;
  onProgress('Analyse des lignes de transactions…');
  if(base?.data?.tsv)structuredCandidates=await recognizeStructuredScreenshot(file,w,base.data,onProgress,options.hintDate||'');
 }
 if(!result.trim()&&!structuredCandidates.length)throw new Error('Aucun texte lisible. Envoie une capture plus nette ou un PDF contenant du texte.');
 return {text:result.slice(0,120000),pageCount,ocrPages,structuredCandidates,source:structuredCandidates.length?'OCR local · lignes et montants relus':ocrPages?'OCR local + PDF':'PDF texte'};
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
function extractGenericCandidates(raw,locale='dmy'){
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

/* Verified against Desjardins Mastercard statement layout (date, posting date, merchant, reward %, CAD amount). */
function extractDesjardins(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 const stamp=String(raw).match(/\b(\d{1,2})\s+(\d{1,2})\s+(20\d{2})\b/);
 const year=stamp?Number(stamp[3]):null,statementMonth=stamp?Number(stamp[2]):null;
 const re=/^(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(.+?)\s+(\d{1,3}(?:[ \u00a0\u202f]\d{3})*,\d{2})(CR)?$/i;
 const candidates=[];let skippedPayments=0,flagged=0;
 for(const [i,line] of lines.entries()){
  const m=line.match(re);if(!m)continue;
  const day=Number(m[1]),month=Number(m[2]),postingMonth=Number(m[4]);
  if(month<1||month>12||postingMonth<1||postingMonth>12)continue;
  let txnYear=year;
  if(!txnYear){flagged++;continue;}
  if(statementMonth&&month>statementMonth)txnYear--;
  const date=isoDate(String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+txnYear,'dmy');
  if(!date){flagged++;continue;}
  const whole=m[5].trim(),amount=cleanAmount(m[6]);
  if(!Number.isFinite(amount)||amount<=0){flagged++;continue;}
  if(/^(?:PAIEMENT CAISSE|PAIEMENT PAR|PAYMENT RECEIVED|PAIEMENT REÇU)/i.test(whole)){skippedPayments++;continue;}
  const name=whole.replace(/\s+\d{1,2},\d{2}\s*%\s*$/,'').replace(/\s+/g,' ').trim().slice(0,80);
  const credit=!!m[7];
  candidates.push({date,name,amount,type:credit?'refund':'expense',selected:true,ambiguous:false,raw:line,index:i+1,source:'desjardins'});
 }
 return{candidates,flagged,lines:lines.length,skippedPayments};
}
const monthsFR={JAN:1,JANV:1,FEV:2,FEVR:2,MAR:3,MARS:3,AVR:4,AVRIL:4,MAI:5,JUN:6,JUIN:6,JUL:7,JUIL:7,AOU:8,AOUT:8,SEP:9,SEPT:9,OCT:10,NOV:11,DEC:12};
/* Text-only OCR fallback for card-list screenshots.
   Keep uncertain prices blank; never invent 24,13 from "2413S". */
function readMobileScreenshotText(raw,hintDate=''){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
 const monthNames=Object.keys(monthsFR).join('|');
 const year=Number((hintDate.match(/^(\d{4})-/)||[])[1]||new Date().getFullYear());
 const candidates=[];
 for(let i=1;i<lines.length;i++){
  const cleaned=lines[i].replace(/[\s.,]/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const dateParts=cleaned.match(/^([0-3]?\d)(JANV?|FEVR?|MARS?|AVRIL|AVR|MAI|JUIN?|JUIL?|AOUT?|SEPT?|OCT|NOV|DEC)$/);
  if(!dateParts)continue;
  const month=monthsFR[dateParts[2]],date=month?isoDate(dateParts[1]+'/'+month+'/'+year,'dmy'):null;
  if(!date)continue;
  const rawMerchant=lines[i-1].replace(/^\s*[=−\-–]+\s*/,'').replace(/\s*[›>]\s*$/,'').trim();
  const priceSuffix=rawMerchant.match(/(?:^|\s)(\d{1,6}[.,]\d{2})\s*[S$€]?\s*$/);
  const uncertainSuffix=rawMerchant.match(/\s+\d{2,8}[S$€]\s*$/i);
  let amount='',name=rawMerchant;
  if(priceSuffix){amount=cleanAmount(priceSuffix[1]);name=rawMerchant.slice(0,priceSuffix.index).trim();}
  else if(uncertainSuffix){name=rawMerchant.slice(0,uncertainSuffix.index).trim();}
  name=name.replace(/^[=\s]+/,'').replace(/\s+/g,' ').slice(0,80);
  if(!name||name.length<3)continue;
  candidates.push({date,name,amount,type:'expense',selected:Number.isFinite(amount)&&amount>0,ambiguous:!(amount>0),
   raw:lines.slice(i-1,i+1).join(' | '),index:i+1,source:'screenshot-text'});
 }
 return{candidates,lines:lines.length,flagged:0};
}
function extractScreenshotTransactions(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 const date=/^(\d{1,2})\s*(JANV?|F[ÉE]VR?|MARS?|AVR(?:IL)?|MAI|JUIN?|JUIL?|AO[UÛ]T?|SEPT?|OCT|NOV|D[ÉE]C)\.?$/i;
 const money=/(\d{1,6}(?:[ \u00a0\u202f]\d{3})*[,\.]\d{2})\s*\$?\s*[›>]*$/;
 const candidates=[];const year=(raw.match(/\b(20\d{2})\b/)||[])[1]||new Date().getFullYear();
 for(let i=1;i<lines.length;i++){
  const match=lines[i].match(date);if(!match)continue;
  const mm=monthsFR[match[2].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()];
  const day=Number(match[1]),dateISO=mm?isoDate(String(day).padStart(2,'0')+'/'+String(mm).padStart(2,'0')+'/'+year):null;
  if(!dateISO)continue;
  let before=lines[i-1],m=before.match(money),name=m?before.slice(0,m.index).trim():'';
  if((!m||!name)&&i>=2){if(m)name=lines[i-2];else{m=lines[i-2].match(money);name=m?lines[i-2].slice(0,m.index).trim():'';}}
  if(!m||!name||/^transactions?$/i.test(name))continue;
  const amount=cleanAmount(m[1]);if(!(amount>0))continue;
  candidates.push({date:dateISO,name:name.replace(/[›>]+$/,'').trim().slice(0,80),amount,type:'expense',selected:true,ambiguous:false,raw:lines.slice(Math.max(0,i-2),i+1).join(' | '),index:i+1,source:'screenshot'});
 }
 return{candidates,flagged:0,lines:lines.length};
}
function extractCandidates(raw,locale='dmy'){
 const txt=String(raw||'');
 if(/DESJARDINS/i.test(txt)&&/BONIDOLLARS|ODYSSEE|ODYSSE[EÉ]E|Transactions effectuées avec la carte|PAIEMENT CAISSE/i.test(txt)){
  const r=extractDesjardins(txt);
  if(r.candidates.length>0)return r;
 }
 if(/(?:OCT|NOV|SEP|SEPT|JAN|FEV|FÉV|DÉC)/i.test(txt)){
  const r=extractScreenshotTransactions(txt);
  if(r.candidates.length>0)return r;
  const mobile=readMobileScreenshotText(txt);
  if(mobile.candidates.length)return mobile;
 }
 return extractGenericCandidates(raw,locale);
}

async function cleanup(){const all=[...workers.values()];workers.clear();for(const w of all)await w.terminate();}
window.TraceBankDocuments={extract,extractCandidates,readMobileScreenshotText,isoDate,cleanAmount,cleanup,readOcrTsv,screenshotLayoutCandidates,parseReliablePrice,version:'1.4.0'};
})();