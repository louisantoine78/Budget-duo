/* TRACE 5.37.0 — extracted monthly statement EVIDENCE staging, isolated.
 * This is NOT a PDF parser. It receives pre-extracted candidate bank rows with
 * page/line references, requires human confirmation, then optionally passes
 * reviewed rows to the separate read-only statement comparison laboratory.
 * No storage, Supabase, financial booking, OCR, PDF binary or UI side effects.
 */
(function(root){'use strict';
 const validDate=value=>{
  const s=String(value??'').trim();
  let iso=s,match;
  if((match=/^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(s)))
   iso=match[3]+'-'+match[2]+'-'+match[1];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
  const day=new Date(iso+'T12:00:00Z');
  return Number.isFinite(+day)&&day.toISOString().slice(0,10)===iso?iso:null;
 };
 const parseAmount=value=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  if(typeof value==='number')return Number.isFinite(value)&&value>0&&value<=1e7&&
   Number.isSafeInteger(Math.round(value*100))&&
   Math.abs(value*100-Math.round(value*100))<1e-6?
   Math.round(value*100)/100:null;
  let s=String(value).trim().replace(/[\u00a0\u202f]/g,' ');
  // Reject ambiguous signs, currencies and three-decimal amounts.
  if(!/^[\d ,.]+$/.test(s)||!/\d/.test(s))return null;
  if(/^\d{1,3}(?:[ .]\d{3})+,\d{1,2}$/.test(s))
   s=s.replace(/[ .]/g,'').replace(',','.');
  else if(/^\d{1,3}(?:[, ]\d{3})+\.\d{1,2}$/.test(s))
   s=s.replace(/[, ]/g,'');
  else if(/^\d+(?:[,.]\d{1,2})?$/.test(s))
   s=s.replace(',','.');
  else return null;
  const n=Number(s);
  return Number.isFinite(n)&&n>0&&n<=1e7&&
   Math.abs(n*100-Math.round(n*100))<1e-6?
   Math.round(n*100)/100:null;
 };
 // Recompute identity at review time. A saved checkbox is not authority for
 // an extracted amount, date or excerpt that was edited after staging.
 const identity=row=>JSON.stringify([row.id,row.date,row.direction,row.amount,
  row.currency,row.name,row.rawText,row.accountId,row.documentId,row.page,row.line]);
 function stage({documentId,accountId,currency,fromDate,toDate,rows}={}){
  const code=String(currency||'').toUpperCase();
  if(!String(documentId||'').trim()||!String(accountId||'').trim()||
    !['CAD','EUR','USD','GBP','CHF'].includes(code)||
    !validDate(fromDate)||!validDate(toDate)||fromDate>toDate||
    !Array.isArray(rows)||rows.length===0||rows.length>2000)
   throw Error('Document, compte, devise, période ou lignes du relevé invalides.');
  const ready=[],issues=[],seen=new Set();
  rows.forEach((source,index)=>{
   const page=Number(source?.page),line=Number(source?.line),
    rawText=String(source?.rawText??'').trim();
   const id=String(documentId)+'#'+page+':'+line;
   const common={id,index,page,line,rawText,documentId:String(documentId)};
   let problem='';
   if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(line)||line<1||
      !rawText||rawText.length>500||seen.has(id))problem='Source PDF page/ligne invalide ou répétée';
   seen.add(id);
   const date=validDate(source?.date),name=String(source?.name||'').trim();
   if(!problem&&!date)problem='Date illisible ou impossible';
   if(!problem&&(date<fromDate||date>toDate))problem='Date hors période du relevé';
   if(!problem&&String(source?.currency||code).toUpperCase()!==code)
    problem='Devise de ligne différente du compte';
   const hasDebit=source?.debit!==null&&source?.debit!==undefined&&
     String(source.debit).trim()!=='';
   const hasCredit=source?.credit!==null&&source?.credit!==undefined&&
     String(source.credit).trim()!=='';
   const columns=hasDebit||hasCredit;
   let direction=null,amount=null;
   if(columns){
    if(source?.amount!==null&&source?.amount!==undefined&&String(source.amount).trim()!=='')
     problem=problem||'Montant global et colonnes bancaires simultanés';
    const debit=hasDebit?parseAmount(source.debit):null,
      credit=hasCredit?parseAmount(source.credit):null;
    const emptyOrZero=v=>v===null||v===undefined||String(v).trim()===''||
      /^(?:0+)(?:[,.]0{1,2})?$/.test(String(v).trim());
    const invalidDebit=hasDebit&&debit===null&&!emptyOrZero(source.debit);
    const invalidCredit=hasCredit&&credit===null&&!emptyOrZero(source.credit);
    if(invalidDebit||invalidCredit)problem=problem||'Cellule Débit/Crédit illisible';
    if(!problem&&((debit!==null)===(credit!==null)))
     problem='Débit/Crédit simultanés ou absents';
    if(!problem){
     direction=debit!==null?'out':'in';amount=debit??credit;
     if(source?.direction&&source.direction!==direction)
      problem='Sens bancaire contradictoire';
    }
   }else{
    direction=source?.direction;
    amount=parseAmount(source?.amount);
    if(!['in','out'].includes(direction))problem=problem||'Sens bancaire à vérifier';
    if(amount===null)problem=problem||'Montant bancaire à vérifier';
   }
   if(problem){issues.push({...common,reason:problem});return;}
   const normalized={id,date,name,direction,amount,currency:code,
    page,line,rawText,documentId:String(documentId),accountId:String(accountId)};
   // An approval must bind to all material evidence, including the raw excerpt.
   const evidenceKey=identity(normalized);
   ready.push({...normalized,evidenceKey,reviewed:false});
  });
  return{documentId:String(documentId),accountId:String(accountId),currency:code,
   fromDate,toDate,ready,issues,totalRows:rows.length,
   writes:0,financialChanges:0};
 }
 function reviewedRows(staged,approvals=[]){
  if(!staged||!Array.isArray(staged.ready)||!Array.isArray(staged.issues)||
     !Array.isArray(approvals))throw Error('Révision du relevé invalide.');
  const given=new Map();
  for(const a of approvals){
   if(!a||typeof a.id!=='string'||given.has(a.id))
    throw Error('Confirmation de ligne dupliquée ou invalide.');
   given.set(a.id,a);
  }
  const missing=staged.ready.filter(row=>{
   const a=given.get(row.id);
   return a?.confirmed!==true||a.evidenceKey!==row.evidenceKey||
    identity(row)!==row.evidenceKey;
  });
  const unknown=[...given.keys()].filter(id=>!staged.ready.some(row=>row.id===id));
  const blockers=staged.issues.length+missing.length+unknown.length;
  if(blockers)return{status:'blocked',reason:'Toutes les lignes doivent être vérifiées sur leur preuve PDF.',
   issues:staged.issues.map(x=>({...x})),missingIds:missing.map(x=>x.id),
   unknownIds:unknown,verifiedRows:[],writes:0,financialChanges:0};
  return{status:'reviewed',documentId:staged.documentId,
   accountId:staged.accountId,currency:staged.currency,fromDate:staged.fromDate,
   toDate:staged.toDate,
   verifiedRows:staged.ready.map(x=>({id:x.id,date:x.date,name:x.name,
    direction:x.direction,amount:x.amount,currency:x.currency})),
   writes:0,financialChanges:0};
 }
 function compareReviewed({staged,approvals,account,transactions=[],
  amountOnAccount,comparator,dateTolerance=2}={}){
  const review=reviewedRows(staged,approvals);
  if(review.status!=='reviewed')return{...review,report:null};
  if(!account||account.id!==review.accountId||
    String(account.currency||'').toUpperCase()!==review.currency||
    typeof comparator!=='function')throw Error('Compte ou comparateur non conforme.');
  const report=comparator({account,fromDate:review.fromDate,toDate:review.toDate,
   statementRows:review.verifiedRows,transactions,amountOnAccount,dateTolerance});
  return{status:'comparison_ready',review,report,writes:0,financialChanges:0};
 }
 root.TraceStatementEvidence=Object.freeze({stage,reviewedRows,compareReviewed});
})(typeof window!=='undefined'?window:globalThis);
