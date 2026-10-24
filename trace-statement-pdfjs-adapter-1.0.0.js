/* TRACE International 5.37 — strict PDF.js text-item adapter (NO PDF.js bundled).
 * The caller must inject an audited LOCAL pinned pdfjs-dist engine.
 * No remote URLs, storage, budget booking, OCR or confidence guesses.
 * Never assert statement completeness merely because text items were parsed.
 */
(function(root){'use strict';
 const MAX_SIZE=12*1024*1024,MAX_PAGES=40,MAX_LINES=250,MAX_ITEMS_PER_PAGE=10000;
 const result=(reason)=>({status:'unsupported',reason,pages:0,lines:[],proposals:[],
  unparsed:[],writes:0,financialChanges:0,complete:false});
 const iso=value=>{
  let m=/^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value);
  if(!m)m=/^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(value);
  if(!m)return null;
  const date=m[1].length===4?m[1]+'-'+m[2]+'-'+m[3]:m[3]+'-'+m[2]+'-'+m[1];
  const d=new Date(date+'T12:00:00Z');
  return Number.isFinite(+d)&&d.toISOString().slice(0,10)===date?date:null;
 };
 const amount=value=>{
  const s=String(value??'').replace(/[\u00a0\u202f]/g,' ').trim();
  if(!/^\d{1,3}(?:[ .]\d{3})+,\d{2}$|^\d{1,3}(?:[, ]\d{3})+\.\d{2}$|^\d{1,7}[,.]\d{2}$/.test(s))return null;
  const normalized=s.includes(',')&&s.includes('.')?
   s.lastIndexOf(',')>s.lastIndexOf('.')?
    s.replace(/\./g,'').replace(/\s/g,'').replace(',','.') :
    s.replace(/,/g,'').replace(/ /g,'') :
   s.includes(',')?s.replace(/ /g,'').replace(',','.') :
    s.replace(/ /g,'');
  const n=Number(normalized);
  return Number.isFinite(n)&&n>0&&n<=10000000&&
   Math.abs(n*100-Math.round(n*100))<1e-5?Math.round(n*100)/100:null;
 };
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[\s\u00a0]+/g,' ').trim();
 const looksFinancial=s=>/\d{1,3}(?:[ .,]\d{3})*[,.]\d{2}/.test(String(s||''));
 const isBoilerplate=s=>/^(?:date|libelle|description|operation|debit|credit|solde|balance|page \d+|releve|statement|transactions|du \d|au \d)/i.test(norm(s));
 function pageText(pageNumber,items){
  if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>MAX_PAGES||
     !Array.isArray(items)||!items.length||items.length>MAX_ITEMS_PER_PAGE)
   return result('Page ou quantité de texte invalide');
  const tokens=[];
  for(const item of items){
   if(!item||typeof item.str!=='string'||!Array.isArray(item.transform)||
      item.transform.length<6)return result('Position du texte PDF manquante');
   const str=item.str.replace(/[\u00a0\u202f]/g,' ').trim(),
    x=item.transform[4],y=item.transform[5];
   if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e6||Math.abs(y)>1e6)
    return result('Position du texte PDF invalide');
   if(str.length>250)return result('Fragment de texte bancaire anormalement long');
   if(str)tokens.push({str,x,y});
  }
  if(!tokens.length)return result('Page sans couche texte exploitable');
  // Group items on a printed baseline; do not heuristically merge across rows.
  tokens.sort((a,b)=>b.y-a.y||a.x-b.x);
  const groups=[];
  for(const token of tokens){
   const group=groups.find(g=>Math.abs(g.y-token.y)<=2);
   if(group)group.tokens.push(token);
   else groups.push({y:token.y,tokens:[token]});
   if(groups.length>MAX_LINES)return result('Nombre excessif de lignes PDF');
  }
  groups.sort((a,b)=>b.y-a.y);
  const headers=[],raw=[];
  for(let index=0;index<groups.length;index++){
   const tokens=groups[index].tokens.sort((a,b)=>a.x-b.x);
   const text=tokens.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
   if(!text||text.length>500)return result('Ligne PDF incomplète ou trop longue');
   raw.push({page:pageNumber,line:index+1,rawText:text,tokens});
   const words=tokens.map(t=>({label:norm(t.str),x:t.x}));
   const find=key=>words.find(t=>key.test(t.label));
   const date=find(/^date$/),desc=find(/^(?:libelle|description|operations?|detail)$/),
    debit=find(/^debit$/),credit=find(/^credit$/);
   if(date&&desc&&debit&&credit)headers.push({line:index+1,date:date.x,
     desc:desc.x,debit:debit.x,credit:credit.x});
  }
  if(headers.length!==1)return result('En-tête unique Date / Libellé / Débit / Crédit non reconnu sur cette page');
  const h=headers[0];
  if(!(h.date<h.desc&&h.desc<h.debit&&h.debit<h.credit)||
   [h.desc-h.date,h.debit-h.desc,h.credit-h.debit].some(x=>x<18))
   return result('Colonnes bancaires trop rapprochées ou non ordonnées');
  const cuts=[(h.date+h.desc)/2,(h.desc+h.debit)/2,(h.debit+h.credit)/2];
  const proposals=[],unparsed=[];
  for(const line of raw){
   if(line.line<=h.line){unparsed.push({page:line.page,line:line.line,rawText:line.rawText,reason:'En-tête ou texte hors du tableau'});continue;}
   const cells=['','','',''];
   for(const token of line.tokens){
    let column=token.x<cuts[0]?0:token.x<cuts[1]?1:token.x<cuts[2]?2:3;
    // Tokens outside expected printed column bounds may be balance or misc.
    if(token.x<h.date-25||token.x>h.credit+130){
     cells[3]+=' [EXTRA]';continue;
    }
    cells[column]+=(cells[column]?' ':'')+token.str;
   }
   const date=iso(cells[0].trim()),description=cells[1].trim(),
    debit=cells[2].trim(),credit=cells[3].trim();
   if(!date||!description||description.length>120||
      (debit&&credit)||(!debit&&!credit)||/\[EXTRA\]/.test(credit)){
    unparsed.push({page:line.page,line:line.line,rawText:line.rawText,
     reason:'Date, libellé ou colonnes bancaires ambigus'});continue;
   }
   const direction=debit?'out':'in',n=amount(debit||credit);
   if(n===null){unparsed.push({page:line.page,line:line.line,rawText:line.rawText,
    reason:'Montant bancaire non interprétable'});continue;}
   proposals.push({page:line.page,line:line.line,rawText:line.rawText,
    date,name:description,direction,amount:n});
  }
  return{status:'review_required',reason:unparsed.length?
   'Lignes et en-têtes restant à vérifier sur le relevé.':
   'Reconnaissance partielle à vérifier, sans preuve de complétude.',
   pages:1,lines:raw.map(x=>({page:x.page,line:x.line,rawText:x.rawText})),
   proposals,unparsed,complete:false,writes:0,financialChanges:0};
 }
 async function scan(file,{engine}={}){
  if(!engine||typeof engine.getDocument!=='function')
   return result('PDF.js local versionné non disponible : utilise le contrôle manuel');
  if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||
     file.size<40||file.size>MAX_SIZE)return result('Fichier PDF invalide ou supérieur à 12 Mo');
  let task=null,document=null;
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(bytes.byteLength!==file.size||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')
    return result('Signature PDF invalide');
   task=engine.getDocument({data:bytes,disableRange:true,disableStream:true,
    disableAutoFetch:true,stopAtErrors:true,isEvalSupported:false,
    useSystemFonts:false,useWasm:false});
   if(!task||typeof task.promise?.then!=='function')
    return result('Document PDF.js non initialisé');
   document=await task.promise;
   if(!Number.isInteger(document.numPages)||document.numPages<1||document.numPages>MAX_PAGES)
    return result('Pagination PDF absente ou supérieure à 40 pages');
   const proposals=[],unparsed=[],lines=[];
   for(let p=1;p<=document.numPages;p++){
    const page=await document.getPage(p);
    if(!page||typeof page.getTextContent!=='function'||page.rotate%360!==0)
     return result('Page pivotée ou illisible, contrôle manuel requis');
    const content=await page.getTextContent({disableNormalization:false});
    const out=pageText(p,content?.items);
    page.cleanup?.();
    if(out.status!=='review_required')return result('Page '+p+' : '+out.reason);
    lines.push(...out.lines);proposals.push(...out.proposals);unparsed.push(...out.unparsed);
    if(lines.length>MAX_LINES)return result('Plus de 250 lignes détectées : contrôle manuel requis');
   }
   return{status:'review_required',reason:'Propositions à vérifier, aucune preuve de complétude.',
    pages:document.numPages,lines,proposals,unparsed,
    complete:false,writes:0,financialChanges:0};
  }catch(e){return result('Lecture PDF.js impossible : '+String(e?.message||'document non pris en charge').slice(0,160));}
  finally{try{await task?.destroy?.();}catch(e){}}
 }
 root.TraceStatementPDFJS=Object.freeze({scan,pageText});
})(typeof window!=='undefined'?window:globalThis);
