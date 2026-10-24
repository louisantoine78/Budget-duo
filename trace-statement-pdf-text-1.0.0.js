/* TRACE 5.37.0 — deliberately LIMITED local PDF text-layer scanner.
 * Supports only simple unencrypted PDFs with directly referenced page streams,
 * base-14 fonts and plain/Flate streams. No OCR, network, writing or storage.
 * Unsupported PDFs MUST fail closed. Extracted bank rows are suggestions ONLY:
 * never proof of completeness, account identity or bank booking.
 */
(function(root){'use strict';
 const MAX_BYTES=12*1024*1024,MAX_TEXT=2*1024*1024,MAX_PAGES=40,MAX_LINES=250;
 const err=reason=>({status:'unsupported',reason,pages:0,lines:[],proposals:[],unparsed:[],
  writes:0,financialChanges:0,complete:false});
 const latin=bytes=>{
  let out='';
  for(let i=0;i<bytes.length;i+=16384)
   out+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+16384)));
  return out;
 };
 const dateISO=s=>{
  if(/^\d{4}-\d\d-\d\d$/.test(s))return s;
  const m=/^(\d\d)[/.](\d\d)[/.](\d{4})$/.exec(s);
  return m?m[3]+'-'+m[2]+'-'+m[1]:null;
 };
 const validDate=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||''))&&
  Number.isFinite(+new Date(s+'T12:00:00Z'))&&
  new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const record=line=>{
  const match=/^(\d{4}-\d\d-\d\d|\d\d[/.]\d\d[/.]\d{4})\s*[|;]\s*([^|;]{1,120}?)\s*[|;]\s*(D[EÉ]BIT|CR[EÉ]DIT|OUT|IN)\s*[|;]\s*(\d{1,7}(?:[,.]\d{1,2})?)$/i.exec(line);
  if(!match)return null;
  const date=dateISO(match[1]),n=Number(match[4].replace(',','.'));
  if(!validDate(date)||!Number.isFinite(n)||n<=0||n>10000000)return null;
  const money=Math.round(n*100)/100;
  if(Math.abs(money-n)>0.000001)return null;
  return{date,name:match[2].trim(),direction:/^(?:OUT|D[EÉ]BIT)$/i.test(match[3])?'out':'in',
   amount:money};
 };
 const unescapePDF=s=>{
  let bytes=[];
  for(let i=0;i<s.length;i++){
   let c=s[i];
   if(c==='\\'){
    const e=s[++i];if(e===undefined)return null;
    if(/[0-7]/.test(e)){let n=e;for(let j=0;j<2&&/[0-7]/.test(s[i+1]||'');j++)n+=s[++i];bytes.push(parseInt(n,8)&255);}
    else if(e==='n')bytes.push(10);
    else if(e==='r')bytes.push(13);
    else if(e==='t')bytes.push(9);
    else if(e==='b')bytes.push(8);
    else if(e==='f')bytes.push(12);
    else if(e==='\r'){if(s[i+1]==='\n')i++;}
    else if(e==='\n'){}
    else bytes.push(e.charCodeAt(0)&255);
   }else bytes.push(c.charCodeAt(0)&255);
  }
  if(bytes.length>=2&&bytes[0]===254&&bytes[1]===255){
   if(bytes.length%2)return null;
   let out='';for(let j=2;j<bytes.length;j+=2)out+=String.fromCharCode((bytes[j]<<8)|bytes[j+1]);return out;
  }
  // WinAnsi subset: bail out on non-ASCII to avoid misleading bank characters.
  if(bytes.some(b=>b<32&&b!==9&&b!==10&&b!==13||b>126))return null;
  return String.fromCharCode(...bytes);
 };
 const tokenText=token=>{
  if(token.startsWith('(')&&token.endsWith(')'))return unescapePDF(token.slice(1,-1));
  if(/^<[0-9A-Fa-f]*>$/.test(token)){
   const hex=token.slice(1,-1);if(hex.length%2)return null;
   return unescapePDF(hex.match(/../g)?.map(x=>String.fromCharCode(parseInt(x,16))).join('')||'');
  }
  return null;
 };
 function contentLines(str){
  if(/\bDo\b/.test(str))throw Error('Objet graphique ou formulaire non pris en charge');
  const blocks=[...str.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)];
  if(!blocks.length)throw Error('Couche texte absente (PDF scanné ou format non pris en charge)');
  let lines=[];
  for(const [,block] of blocks){
   const pieces=block.split(/\bT\*\b|\bTd\b|\bTD\b/); // Uncertain positioning remains a review issue.
   for(const piece of pieces){
    const chunks=[];
    const re=/(\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f]*>)\s*Tj\b|\[([\s\S]*?)\]\s*TJ\b/g;
    let match;
    while((match=re.exec(piece))){
     if(match[1]){const out=tokenText(match[1]);if(out===null)throw Error('Codage des caractères non supporté');chunks.push(out);}
     else{
      const parts=[...match[2].matchAll(/\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f]*>/g)];
      if(!parts.length)throw Error('Séquence texte TJ non supportée');
      const converted=parts.map(x=>tokenText(x[0]));
      if(converted.some(x=>x===null))throw Error('Codage texte TJ non supporté');
      chunks.push(converted.join(''));
     }
    }
    if(chunks.length){
     const line=chunks.join(' ').replace(/\s+/g,' ').trim();
     if(line){if(line.length>500)throw Error('Ligne PDF trop longue');lines.push(line);}
    }
   }
  }
  if(lines.length===0)throw Error('Texte PDF illisible ou scanné');
  return lines;
 }
 const parseObjects=str=>{
  const objects=new Map();
  const re=/(?:^|[\r\n])(\d{1,8})\s+0\s+obj\b([\s\S]*?)\bendobj\b/g;let m;
  while((m=re.exec(str))){
   if(objects.has(m[1]))throw Error('Objets PDF répétés ou révisions non supportées');
   objects.set(m[1],m[2]);
   if(objects.size>3000)throw Error('PDF trop complexe');
  }
  return objects;
 };
 async function streamData(obj){
  const st=/stream\r?\n/.exec(obj);
  if(!st)throw Error('Flux de page absent');
  const header=obj.slice(0,st.index),len=/\/Length\s+(\d+)\s*(?=\/|>>)/.exec(header);
  if(!len)throw Error('Longueur de flux indirecte non supportée');
  const bytes=Number(len[1]),start=st.index+st[0].length;
  if(!Number.isSafeInteger(bytes)||bytes<=0||bytes>MAX_BYTES)throw Error('Longueur PDF invalide');
  const raw=obj.slice(start,start+bytes);
  if(raw.length!==bytes||!/^\r?\n?endstream\b/.test(obj.slice(start+bytes)))
   throw Error('Flux PDF tronqué');
  let data=Uint8Array.from(raw,c=>c.charCodeAt(0)&255);
  if(/\/Filter\b/.test(header)){
   if(!/\/Filter\s*\/FlateDecode\b/.test(header)||
       /\/Filter\s*\[/.test(header))throw Error('Compression PDF non supportée');
   if(typeof root.DecompressionStream!=='function'||
      typeof root.Blob!=='function')throw Error('Décompression locale indisponible');
   const stream=new root.Blob([data]).stream().pipeThrough(new root.DecompressionStream('deflate'));
   const reader=stream.getReader(),chunks=[];let size=0;
   try{while(true){
    const {value,done}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_TEXT){await reader.cancel();throw Error('Couche texte PDF trop volumineuse');}
    chunks.push(value);
   }}finally{reader.releaseLock();}
   data=new Uint8Array(size);let off=0;for(const chunk of chunks){data.set(chunk,off);off+=chunk.length;}
  }
  if(data.length>MAX_TEXT)throw Error('Flux PDF trop volumineux');
  return latin(data);
 }
 const kids=obj=>{
  const match=/\/Kids\s*\[([^\]]+)\]/.exec(obj);
  if(!match)return null;
  const refs=[...match[1].matchAll(/(\d+)\s+0\s+R/g)].map(m=>m[1]);
  const extra=match[1].replace(/\d+\s+0\s+R/g,'').trim();
  return refs.length&&extra===''?refs:null;
 };
 const contentRefs=obj=>{
  const one=/\/Contents\s+(\d+)\s+0\s+R\b/.exec(obj);
  if(one)return[one[1]];
  const many=/\/Contents\s*\[([^\]]+)\]/.exec(obj);
  if(!many)return null;
  const refs=[...many[1].matchAll(/(\d+)\s+0\s+R/g)].map(m=>m[1]);
  return refs.length&&many[1].replace(/\d+\s+0\s+R/g,'').trim()===''?refs:null;
 };
 async function scan(file){
  try{
   if(!file||!Number.isFinite(file.size)||file.size<40||file.size>MAX_BYTES||
      typeof file.arrayBuffer!=='function')return err('PDF local invalide ou trop volumineux');
   const raw=new Uint8Array(await file.arrayBuffer());
   if(raw.byteLength!==file.size)return err('Lecture du PDF incomplète');
   const str=latin(raw);
   if(!str.startsWith('%PDF-')||!str.includes('%%EOF'))return err('Document PDF incomplet');
   if(/\/Encrypt\b|\/ObjStm\b|\/XRef\b|\/ToUnicode\b|\/XObject\b/.test(str))
    return err('PDF chiffré, graphique ou avec polices complexes : contrôle manuel requis');
   const objects=parseObjects(str);
   const catalogs=[...objects.entries()].filter(([,s])=>/\/Type\s*\/Catalog\b/.test(s));
   if(catalogs.length!==1) return err('Structure des pages PDF non reconnue');
   const rootRef=/\/Pages\s+(\d+)\s+0\s+R\b/.exec(catalogs[0][1])?.[1];
   if(!rootRef)return err('Arbre de pages PDF absent');
   const pageIds=[],seen=new Set();
   function visit(ref,depth=0){
    if(depth>20||seen.has(ref))throw Error('Arbre de pages invalide');seen.add(ref);
    const obj=objects.get(ref);if(!obj)throw Error('Page manquante');
    if(/\/Type\s*\/Pages\b/.test(obj)){
     const children=kids(obj);if(!children)throw Error('Ordre des pages incertain');
     children.forEach(ref=>visit(ref,depth+1));
    }else if(/\/Type\s*\/Page\b/.test(obj)){
     if(/\/Annots\b|\/Rotate\s+(?:90|180|270)\b/.test(obj))
      throw Error('Page annotée ou pivotée non prise en charge');
     pageIds.push(ref);
     if(pageIds.length>MAX_PAGES)throw Error('PDF avec trop de pages');
    }else throw Error('Type de page non reconnu');
   }
   visit(rootRef);
   if(pageIds.length===0)return err('Aucune page trouvée');
   const lines=[];
   for(let page=0;page<pageIds.length;page++){
    const refs=contentRefs(objects.get(pageIds[page]));
    if(!refs)return err('Page '+(page+1)+' sans couche texte exploitable');
    let pageText=[];
    for(const ref of refs){
     const obj=objects.get(ref);if(!obj)return err('Flux PDF manquant page '+(page+1));
     pageText.push(...contentLines(await streamData(obj)));
    }
    if(!pageText.length)return err('Page '+(page+1)+' sans texte exploitable');
    for(let i=0;i<pageText.length;i++){
     lines.push({page:page+1,line:i+1,rawText:pageText[i]});
     if(lines.length>MAX_LINES)return err('Trop de lignes détectées (limite 250)');
    }
   }
   const proposals=[],unparsed=[];
   for(const x of lines){
    const row=record(x.rawText);
    if(row)proposals.push({...x,...row});else unparsed.push(x);
   }
   return{status:'review_required',reason:unparsed.length?
    'Certaines lignes ne correspondent pas au format simple reconnu. Vérifie-les manuellement.':
    'Toutes les lignes au format simple ont été reconnues, sans preuve d’exhaustivité du PDF.',
    pages:pageIds.length,lines,proposals,unparsed,
    writes:0,financialChanges:0,complete:false};
  }catch(e){return err(String(e.message||'PDF non supporté'));}
 }
 root.TraceStatementPDFText=Object.freeze({scan});
})(typeof window!=='undefined'?window:globalThis);
