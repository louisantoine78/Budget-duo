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
  return text&&[left,top,width,height].every(Number.isFinite)?{text,left,top,width,height,y:top+height/2,confidence:Number(p[10])}:null;
 }).filter(Boolean);
}

function parseBankDayOCR(text,hintDate=''){
 const compact=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
  .replace(/[|!]/g,'1').replace(/[^A-Z0-9]/g,'').replace(/^([0-3]?\d)0(?=CT)/,'$1O');
 const m=compact.match(/^([0-3]?\d)(JANV?|FEVR?|FEV|MARS?|AVRIL|AVR|MAI|JUIN?|JUIL?|JUN|AOUT?|AOU|SEPT?|SEP|OCT|NOV|DEC)$/);
 if(!m)return null;
 const month=monthsFR[m[2]],year=/^\d{4}-/.test(hintDate)?Number(hintDate.slice(0,4)):new Date().getFullYear();
 return month?isoDate(m[1]+'/'+month+'/'+year,'dmy'):null;
}
function screenshotDateEvidence(words,width,hintDate=''){
 const ws=words.filter(w=>w.left>width*.05&&w.left<width*.55).sort((a,b)=>a.y-b.y||a.left-b.left);
 const bands=[],tol=Math.max(8,Math.min(28,width*.019));
 for(const w of ws){
  let band=bands.find(b=>Math.abs(b.y-w.y)<tol);
  if(!band){band={y:w.y,words:[]};bands.push(band);}
  band.words.push(w);band.y=band.words.reduce((sum,x)=>sum+x.y,0)/band.words.length;
 }
 const markers=[];
 for(const band of bands){
  const ws=band.words.sort((a,b)=>a.left-b.left);
  for(let i=0;i<ws.length;i++)for(let n=1;n<=3&&i+n<=ws.length;n++){
   const segment=ws.slice(i,i+n);
   if(segment[segment.length-1].left-segment[0].left>width*.26)break;
   const date=parseBankDayOCR(segment.map(x=>x.text).join(' '),hintDate);
   if(date&&!markers.some(x=>x.date===date&&Math.abs(x.y-band.y)<tol))
    markers.push({date,y:band.y});
  }
 }
 return markers.sort((a,b)=>a.y-b.y);
}
function screenshotLayoutCandidates(tsv,width,height,hintDate=''){
 const words=readOcrTsv(tsv);if(words.length<5||width<200||height<200)return[];
 const threshold=Math.max(9,Math.min(29,width*.024));
 const lines=[];
 for(const word of words.sort((a,b)=>a.y-b.y||a.left-b.left)){
  let line=lines.find(l=>Math.abs(l.y-word.y)<threshold);
  if(!line){line={y:word.y,words:[]};lines.push(line);}
  line.words.push(word);
  line.y=line.words.reduce((n,w)=>n+w.y,0)/line.words.length;
 }
 lines.forEach(l=>l.words.sort((a,b)=>a.left-b.left));
 const rows=[],dateMarkers=screenshotDateEvidence(words,width,hintDate);
 // Merchant-first reconstruction. Date-first OCR lost lines when "2 OCT"
 // was skipped; find every plausible merchant and resolve its own date.
 for(const line of lines){
  const leftWords=line.words.filter(w=>w.left>width*.065&&w.left<width*.67&&/[A-Za-zÀ-ÿ]{2}/.test(w.text));
  const name=cleanOcrMerchant(leftWords.map(w=>w.text).join(' ').replace(/^[=•\-–\s]+/,''));
  if(name.length<4||parseBankDayOCR(name,hintDate)||/^(?:transactions?|total|solde|compte|ouvrir|accueil|modifier|octobre|verification|v[eé]rifier)\b/i.test(name))continue;
  const amountWords=lines.flatMap(l=>Math.abs(l.y-line.y)<width*.035?l.words:[])
   .filter(w=>w.left>width*.675&&w.left<width*.92&&/\d/.test(w.text));
  const price=amountWords.find(w=>priceEvidence(w.text))||amountWords.find(w=>/[\d][.,]\d\d/.test(w.text))||null;
  const nearbyDates=lines.filter(l=>l.y>line.y+width*.019&&l.y<line.y+width*.145);
  let date=null;
  for(const l of nearbyDates){
   const dw=l.words.filter(w=>w.left>width*.05&&w.left<width*.46).map(w=>w.text);
   const candidates=[dw.join(''),dw.join(' '),...dw];
   date=candidates.map(t=>parseBankDayOCR(t,hintDate)).find(Boolean)||null;
   if(date)break;
  }
  // Require price OCR or a recognized date, so page headings cannot be purchases.
  if(!price&&!date)continue;
  if(rows.some(r=>Math.abs(r.box.y-line.y)<width*.055))continue;
  rows.push({date:date||'',name,amount:'',type:'expense',selected:false,ambiguous:true,
   needsDateReview:!date,columnRaw:price?.text||'',ocrPriceConfidence:price?.confidence??null,
   source:'screenshot-layout',raw:name+' | '+(date||'date à lire'),
   box:{y:line.y,price:price?{left:price.left,top:price.top,width:price.width,height:price.height}:null},
   index:rows.length+1});
 }
 const result=rows.sort((a,b)=>a.box.y-b.box.y).slice(0,65);
 result.forEach((row,i)=>{
  if(row.date)return;
  const next=result[i+1]?.box.y??height;
  const matches=dateMarkers.filter(d=>d.y>row.box.y+width*.015&&d.y<Math.min(next-width*.009,row.box.y+width*.16));
  if(matches.length===1){row.date=matches[0].date;row.needsDateReview=false;}
 });
 return result;
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

/* The originating bank interface always renders two fractional digits.
   A full-page OCR price word can drop the comma ("1141S"), or a local
   crop can miss a leading 1 ("1,41"). Neither is allowed to win silently. */
function priceEvidence(raw){
 const compact=String(raw||'').replace(/[\u00a0\u202f]/g,' ').trim();
 // A stray glyph AFTER the currency symbol must never become extra cents.
 const m=compact.match(/^(\d{1,7}(?:[.,]\d{2})?)\s*(?:[$S€][\s$S€]*(?:[5>›])?)?$/i);
 if(!m)return null;
 const s=m[1];
 if(/^\d{1,6}[,.]\d{2}$/.test(s))return{amount:parseReliablePrice(s),explicit:true,digits:s.replace(/\D/g,'')};
 if(/^\d{3,7}$/.test(s))return{amount:Number(s.slice(0,-2)+'.'+s.slice(-2)),explicit:false,digits:s};
 return null;
}
function reconcilePriceReadings(readings,columnRaw){
 const source=priceEvidence(columnRaw);
 const valid=readings.map(r=>{
  const raw=String(r?.text||'').trim(),source=priceEvidence(raw);
  const score=Number(r?.confidence);
  return source?{...source,confidence:Number.isFinite(score)?score:0,raw}:null;
 }).filter(Boolean);
 if(source)valid.push({...source,confidence:45,raw:columnRaw,fullImage:true});
 if(!valid.length)return{amount:null,review:true,reason:'Montant illisible'};
 const byAmount=new Map();
 for(const row of valid){const k=row.amount.toFixed(2),arr=byAmount.get(k)||[];arr.push(row);byAmount.set(k,arr);}
 const sorted=[...byAmount].sort((a,b)=>{
  const weight=xs=>xs.reduce((n,x)=>n+(x.explicit?2:1)+(x.fullImage?1:0),0);
  return weight(b[1])-weight(a[1]);
 });
 const [winner,evidence]=sorted[0];
 const agreed=evidence.length>=2 && evidence.some(e=>e.fullImage||e.explicit);
 const competing=sorted.length>1;
 const other=sorted.slice(1);
 const weight=xs=>xs.reduce((n,x)=>n+(x.explicit?2:1)+(x.fullImage?1:0),0);
 const sourceSupports=!source||evidence.some(e=>e.fullImage);
 const competitors=other.flatMap(([,list])=>list);
 // A local OCR pass can lose a thin leading "1" (11,41 -> 1,41).
 // If the whole-image token AND a separate crop retain the full digits,
 // treat the truncation as resolved, not as a guessed amount.
 const leadingDigitDropped=Boolean(source&&sourceSupports&&competitors.length&&
   competitors.every(e=>source.digits.length>e.digits.length&&source.digits.endsWith(e.digits)));
 const decisive=agreed&&sourceSupports&&(!competing||weight(evidence)>=weight(competitors)+2||
   (leadingDigitDropped&&weight(evidence)>=weight(competitors)+1));
 // A full-image price with a missing comma is evidence, but can never alone
 // override two crops. In conflicting cases, keep the row unchecked.
 return{amount:Number(winner),review:competing&&!decisive||!agreed,
  reason:competing?'Lectures contradictoires':agreed?'Lectures concordantes':'Montant à confirmer',
  candidates:sorted.map(([amount])=>amount)};
}


function priceImageRegion(frame,row){
 const w=frame.width,h=frame.height,p=row.box?.price;
 const mid=p?p.top+p.height/2:row.box?.y||0;
 const pad=Math.max(27,Math.min(36,w*.03));
 const left=Math.max(0,Math.floor(p?Math.max(w*.635,p.left-w*.026):w*.66));
 const right=Math.min(w,Math.ceil(p?Math.min(w*.914,p.left+p.width+w*.03):w*.90));
 return{left,right,top:Math.max(0,Math.floor(mid-pad)),bottom:Math.min(h,Math.ceil(mid+pad))};
}
function makeRowSnippet(frame,row,nextY){
 // Image excerpt only: merchant, date and price. No account header or other rows.
 const width=frame.width,height=frame.height,y=row.box?.y||0;
 const left=Math.max(0,Math.floor(width*.064)),right=Math.min(width,Math.ceil(width*.93));
 const top=Math.max(0,Math.floor(y-width*.032));
 const bottom=Math.min(height,Math.ceil(Math.min(y+width*.142,(nextY||height)-width*.004)));
 if(bottom<=top+20||right-left<200)return '';
 const canvas=document.createElement('canvas');
 const ratio=Math.min(1.12,880/(right-left));
 canvas.width=Math.round((right-left)*ratio);canvas.height=Math.round((bottom-top)*ratio);
 const ctx=canvas.getContext('2d');if(!ctx)return '';
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(frame.image,left,top,right-left,bottom-top,0,0,canvas.width,canvas.height);
 let data='';
 try{data=canvas.toDataURL('image/jpeg',.69);}catch(error){console.info('Aperçu indisponible',error);}
 canvas.width=canvas.height=1;return data.length<105000?data:'';
}
function cleanOcrMerchant(raw){
 return String(raw||'').replace(/^\s*(?:fj|fv|ug|fy)\s+(?=[A-Za-zÀ-ÿ]{4})/i,'')
  .replace(/[›>]+$/,'').replace(/\s+/g,' ').trim().slice(0,85);
}
function makePriceSnippet(frame,row){
 const box=priceImageRegion(frame,row);
 const canvas=document.createElement('canvas');
 const sw=box.right-box.left,sh=box.bottom-box.top;
 if(!(sw>15&&sh>15))return'';
 const scale=Math.min(2.5,640/sw);
 canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
 const ctx=canvas.getContext('2d');
 if(!ctx)return'';
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(frame.image,box.left,box.top,sw,sh,0,0,canvas.width,canvas.height);
 let value='';
 try{value=canvas.toDataURL('image/jpeg',.84);}catch(err){console.info('OCR preview unavailable',err);}
 canvas.width=canvas.height=1;
 return value;
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
    r.sourcePreview=makeRowSnippet(frame,r,rows[i+1]?.box.y);
    onProgress('Lecture des transactions : '+(i+1)+' / '+rows.length+'…');
    if(r.needsDateReview){
     // Crop only the date immediately beneath the merchant. Never invent a date.
     const y=r.box.y,w0=frame.width,h0=frame.height,next=rows[i+1]?.box.y??h0;
     const top=Math.max(0,Math.floor(y+w0*.022));
     const bottom=Math.min(h0,Math.floor(Math.min(y+w0*.145,next-w0*.01)));
     const left=Math.floor(w0*.047),right=Math.ceil(w0*.53);
     if(bottom-top>12&&right-left>30){
      const canvas=document.createElement('canvas');
      canvas.width=Math.round((right-left)*3);canvas.height=Math.round((bottom-top)*3);
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(ctx){
       ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
       ctx.drawImage(frame.image,left,top,right-left,bottom-top,0,0,canvas.width,canvas.height);
       try{
        const scan=await worker.recognize(canvas);
        const fragments=String(scan?.data?.text||'').split(/\r?\n/);
        let found=fragments.map(x=>parseBankDayOCR(x,hintDate)).find(Boolean)||null;
        if(!found){
         const tokens=fragments.join(' ').split(/\s+/).filter(Boolean);
         for(let n=0;n<tokens.length&&!found;n++)
          found=parseBankDayOCR(tokens[n]+' '+(tokens[n+1]||''),hintDate);
        }
        if(found){r.date=found;r.needsDateReview=false;}
       }catch(error){console.info('Date OCR incertaine',error);}
      }
      canvas.width=canvas.height=1;
     }
    }
    // Anchor the OCR window to the actual price word, avoiding the cashback percentage below.
    const width=frame.width,height=frame.height,box=priceImageRegion(frame,r);
    const {left,right,top,bottom}=box;
    r.priceImageData=makePriceSnippet(frame,r);
    const w=right-left,h=bottom-top,scale=Math.min(4.2,1120/w);
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx){r.needsReview=true;r.raw+=' | Montant non reconnu';continue;}
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const readings=[];
    try{
     ctx.drawImage(frame.image,left,top,w,h,0,0,canvas.width,canvas.height);
     const original=await worker.recognize(canvas);
     readings.push(original?.data);
     let resolution=reconcilePriceReadings(readings,r.columnRaw);
     // Only unclear or contradictory prices require an additional OCR pass.
     if(resolution.review||resolution.amount===null){
      ctx.filter='grayscale(1) contrast(2)';
      ctx.drawImage(frame.image,left,top,w,h,0,0,canvas.width,canvas.height);
      ctx.filter='none';
      const contrasting=await worker.recognize(canvas);
      readings.push(contrasting?.data);
      resolution=reconcilePriceReadings(readings,r.columnRaw);
     }
     r.amount=resolution.amount??'';
     r.needsReview=resolution.review||r.needsDateReview;
     r.selected=!r.needsReview&&r.amount>0&&!!r.date;
     r.ambiguous=r.needsReview;
     r.priceCandidates=resolution.candidates||[];
     r.priceReviewReason=resolution.review?resolution.reason:'';
     if(r.needsReview)r.raw+=' | '+resolution.reason;
    }catch(error){r.needsReview=true;r.selected=false;r.raw+=' | OCR du montant à vérifier';}
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
window.TraceBankDocuments={extract,extractCandidates,readMobileScreenshotText,isoDate,cleanAmount,cleanup,readOcrTsv,screenshotDateEvidence,screenshotLayoutCandidates,parseReliablePrice,priceEvidence,reconcilePriceReadings,priceImageRegion,makePriceSnippet,parseBankDayOCR,version:'1.9.0'};
})();