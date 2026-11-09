/* TRACE 2.0.2 — pure, conservative French broker screenshot parser.
   Input is OCR text, never a payment, trade or authenticated document. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TracePortfolioCaptureParser=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const tidy=s=>String(s??'').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
 const unaccent=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const normalized=s=>unaccent(tidy(s)).toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 function decimal(value,places=2){
  const raw=tidy(value).replace(/[€$£]/g,'').replace(/\s/g,'');
  const match=raw.match(/^(\d{1,10})(?:([,.])(\d{1,6}))?$/);
  if(!match||!match[2]&&places===0||match[3]&&match[3].length>places)return null;
  return match[1]+'.'+(match[3]||'').padEnd(places,'0');
 }
 function moneyCents(value){
  const d=decimal(value,2);
  if(d===null)return null;
  const [a,b]=d.split('.');
  const cents=Number(a)*100+Number(b||0);
  return Number.isSafeInteger(cents)?cents:null;
 }
 function valueAfterLabel(lines,re){
  for(let i=0;i<Math.min(20,lines.length);i++){
   if(!re.test(unaccent(lines[i]).toUpperCase()))continue;
   const m=lines[i].match(/(\d[\d \u00a0\u202f]*[,.]\d{2})\s*€/);
   if(m)return moneyCents(m[1]);
   if(i+1<lines.length){
    const n=lines[i+1].match(/^\s*(\d[\d \u00a0\u202f]*[,.]\d{2})\s*€?/);
    if(n)return moneyCents(n[1]);
   }
  }
  return null;
 }
 const ignored=/^(?:PEA|PORTEFEUILLE|CARNET D.?ORDRES|EVALUATION TITRES|ESP[EÈ]CES|POSITIONS?|COMPTE|VALEURS? LATENTES?|PLUS.VALUES?|EUR|EURO|SOLDE|BILAN|TITRES?)$/i;
 function looksLikeName(line){
  const v=tidy(line),n=normalized(v);
  if(v.length<3||v.length>100||!/[A-Za-zÀ-ÿ]/.test(v))return false;
  if(ignored.test(unaccent(v))||/(?:^|\s)PRU(?:\s|$)/i.test(v))return false;
  if(/(?:\bEUR\b|€|\bCAD\b|\d{2}\/\d{2}|\d+\s*%)/i.test(v))return false;
  if(/^[+\-\d\s,.]+$/.test(v))return false;
  // Security names are rendered in uppercase; reject explanatory captions.
  return v===v.toLocaleUpperCase('fr-FR')&&n.length>=3;
 }
 const priceRe=/(\d{1,6}[,.]\d{2,4})\s*(?:EUR\b|€)/i;
 const quantityRe=/^\s*(\d{1,7}(?:[,.]\d{1,6})?)\s+PRU\s+(\d{1,7}(?:[,.]\d{1,4})?)\s+([\d \u202f\u00a0]+[,.]\d{2})/i;
 function captureQuoteDate(dayMonth,captureDate){
  const m=String(dayMonth||'').match(/^(\d{2})\/(\d{2})$/);
  if(!m||!/^(?:20\d\d)-(?:\d\d)-(?:\d\d)$/.test(captureDate))return '';
  let year=Number(captureDate.slice(0,4)),date=year+'-'+m[2]+'-'+m[1];
  const valid=x=>!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
  if(!valid(date))return '';
  if(date>captureDate){date=(year-1)+'-'+m[2]+'-'+m[1];if(!valid(date))return '';}
  return date;
 }
 function parse(text,captureDate=''){
  const lines=String(text??'').split(/\r?\n/).map(tidy).filter(Boolean).slice(0,400);
  const currency=lines.some(line=>/\bEUR\b|€/.test(line))?'EUR':null;
  const securitiesCents=valueAfterLabel(lines,/EVALUATION\s+TITRES?/);
  const cashCents=valueAfterLabel(lines,/^ESPECES\b/);
  let totalCents=valueAfterLabel(lines,/^(?:VALEUR|VALORISATION|TOTAL)\b/);
  if(totalCents===null){
   const i=lines.findIndex(line=>/^PEA(?:\s+\w+)?$/i.test(line));
   if(i>=0&&i+1<lines.length){
    const m=lines[i+1].match(/^(\d[\d \u00a0\u202f]*[,.]\d{2})\s*€?/);
    if(m)totalCents=moneyCents(m[1]);
   }
  }
  const rows=[],warnings=[];
  for(let i=0;i<lines.length;i++){
   if(!looksLikeName(lines[i]))continue;
   const name=lines[i];
   let price='',quoteDay='',quantity='',pru='',value='';
   for(let j=i+1;j<Math.min(i+5,lines.length);j++){
    if(looksLikeName(lines[j]))break;
    const q=lines[j].match(quantityRe);
    if(q){quantity=q[1];pru=q[2];value=q[3];break;}
    const p=lines[j].match(priceRe);
    if(p){price=p[1];const d=lines[j].match(/\b(\d{2}\/\d{2})\b/);if(d)quoteDay=d[1];}
   }
   if(!quantity||!price)continue;
   const qty=decimal(quantity,6),priceDec=decimal(price,4),valuation=moneyCents(value);
   if(qty===null||priceDec===null||valuation===null)continue;
   const calculated=Math.round(Number(qty)*Number(priceDec)*100);
   const consistent=Math.abs(calculated-valuation)<=2;
   if(!consistent)warnings.push(name+' : quantité × cours différent de la valeur affichée.');
   const truncated=/\.\.\.|…/.test(name);
   if(truncated)warnings.push(name+' : libellé tronqué, à compléter manuellement.');
   rows.push({name,quantity,price,pru,valuationCents:valuation,
    quoteDay,quoteDate:captureQuoteDate(quoteDay,captureDate),
    consistent,truncated});
   i+=1;
  }
  const sum=rows.reduce((s,r)=>s+r.valuationCents,0);
  const partial=securitiesCents!==null&&sum!==securitiesCents;
  if(partial)warnings.push('La capture ne couvre pas tous les titres : aucune ligne absente ne doit être supprimée.');
  if(totalCents!==null&&cashCents!==null&&securitiesCents!==null&&
    totalCents!==cashCents+securitiesCents)
   warnings.push('Le total n’est pas égal aux titres plus espèces : contrôle obligatoire.');
  if(!rows.length)warnings.push('Aucune ligne de titre fiable reconnue. Corrige le texte OCR ou ajoute les lignes manuellement.');
  return{rows,currency,lines:lines.length,summary:{totalCents,cashCents,securitiesCents,visibleLinesCents:sum,partial},warnings};
 }
 return Object.freeze({parse,decimal,moneyCents,captureQuoteDate,normalized,looksLikeName});
});
