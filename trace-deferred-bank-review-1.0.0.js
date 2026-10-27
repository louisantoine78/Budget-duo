/* TRACE 5.37.0 - deferred settlement/import evidence comparison, READ ONLY.
 * ALREADY structured fictional CSV/PDF rows. No parsing, bank authentication,
 * database writes, budget changes or automatic confirmation. The exact JSON
 * snapshot is a client staleness control, NOT a cryptographic signature.
 */
(function(root){'use strict';
 const day=s=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+'T12:00:00Z');
  return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
 };
 // Bank evidence must be normalized to native decimal cents before review.
 // JS numeric syntax (hex, exponent), locales, coercible objects and boolean
 // amounts are not acceptable as bank provenance.
 const money=v=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  if(typeof v==='string'&&!/^\d{1,8}(?:\.\d{1,2})?$/.test(v))return null;
  const n=Number(v),c=Math.round(n*100);
  return Number.isFinite(n)&&n>0&&n<=1e7&&Number.isSafeInteger(c)&&
   Math.abs(n*100-c)<1e-6?c:null;
 };
 const str=v=>typeof v==='string'&&v.trim().length>0;
 const key=(a,s,l)=>JSON.stringify([a,s,l]);
 const goodDoc=d=>!!(d&&str(d.statementId)&&str(d.importId)&&
  str(d.sourceId)&&str(d.sourceVersion)&&str(d.accountId)&&
  str(d.currency)&&['csv','pdf_extracted'].includes(d.sourceType)&&
  d.complete===true&&day(d.fromDate)&&day(d.toDate)&&
  d.fromDate<=d.toDate&&Array.isArray(d.rows)&&d.rows.length<=2000&&
  d.rows.every(r=>r&&str(r.lineId)&&day(r.debitDate)&&
   r.debitDate>=d.fromDate&&r.debitDate<=d.toDate&&
   ['debit','credit'].includes(r.direction)&&money(r.amount)!==null&&
   // Typed checking evidence must agree with its accounting direction.
   // A card charge or checking credit cannot prove a checking debit.
   (!r.type||r.type==='checking_debit'&&r.direction==='debit'||
    r.type==='checking_credit'&&r.direction==='credit')&&
   ['confirmed','pending'].includes(r.status)&&
   (!r.currency||String(r.currency).toUpperCase()===
    String(d.currency).toUpperCase())));
 // A complete payment is matched to a bank line with its OWN explicit
 // scheduled due date; a partial payment keeps its allocated due batch.
 // Actual bank debit may differ from the scheduled date, but is never
 // inferred from weekends/holidays. An evidence flag is not bank auth.
 const due=s=>s?.settlementMode==='partial'?s.allocationDueDate:s?.scheduledDueDate;
 const goodSettlement=s=>{
  const e=s?.bankEvidence;
  return !!(s&&str(s.id)&&['partial','full'].includes(s.settlementMode)&&
   (s.settlementMode==='partial'?s.scheduledDueDate===undefined:
     s.allocationDueDate===undefined)&&
   str(s.checkingAccountId)&&str(s.cardAccountId)&&str(s.currency)&&
   day(s.debitDate)&&day(due(s))&&money(s.amount)!==null&&
   ['confirmed','pending'].includes(s.status)&&
   Array.isArray(s.purchaseIds)&&Array.isArray(s.feeIds)&&
   (s.purchaseIds.length+s.feeIds.length)>0&&
   s.purchaseIds.length<=5000&&s.feeIds.length<=5000&&
   e&&str(e.statementId)&&str(e.lineId)&&
   e.accountId===s.checkingAccountId&&
   String(e.currency).toUpperCase()===String(s.currency).toUpperCase()&&
   e.direction==='debit'&&money(e.amount)===money(s.amount)&&
   e.debitDate===s.debitDate&&e.status===s.status&&
   e.reviewed===(s.status==='confirmed'));
 };
 const same=(d,r,s)=>{
  const e=s.bankEvidence;
  return d.statementId===e.statementId&&d.accountId===e.accountId&&
   String(d.currency).toUpperCase()===String(e.currency).toUpperCase()&&
   r.lineId===e.lineId&&r.debitDate===e.debitDate&&
   r.direction===e.direction&&money(r.amount)===money(e.amount)&&
   r.status===e.status;
 };
 const fingerprint=(d,s)=>JSON.stringify({statement:d,settlement:s});
 function reviewSnapshot({statement,settlement}={}){
  if(!goodDoc(statement)||!goodSettlement(settlement))
   throw Error('Source ou règlement incomplet pour revue.');
  const matches=statement.rows.filter(r=>r.lineId===settlement.bankEvidence.lineId);
  if(matches.length!==1||!same(statement,matches[0],settlement))
   throw Error('Ligne non concordante ou ambiguë.');
  return fingerprint(statement,settlement);
 }
 function compare({statements=[],settlements=[],reviews=[]}={}){
  if(!Array.isArray(statements)||!Array.isArray(settlements)||
     !Array.isArray(reviews)||statements.length>100||
     settlements.length>5000||reviews.length>5000)
   throw Error('Entrées de comparaison invalides.');
  const indexed=new Map(),physical=new Map(),claims=new Map(),ids=new Map(),
   approvals=new Map(),invalidDocuments=[],allRows=[],
   seenSources=new Map(),seenImports=new Map(),duplicatedDocuments=new Set();
  for(const d of statements){
   if(!goodDoc(d)){
    invalidDocuments.push({statementId:String(d?.statementId||''),
     importId:String(d?.importId||'')});continue;
   }
   // Statement/line renaming does not make a reimport independent evidence.
   // Taint BOTH identities so a previously reviewed first import is no
   // longer locally certified when its duplicate arrives later in the batch.
   const aliases=[seenSources.get(d.sourceId),seenImports.get(d.importId)].filter(Boolean);
   for(const prior of aliases){
    duplicatedDocuments.add(prior.statementId);
    duplicatedDocuments.add(d.statementId);
    for(const conflicted of [prior,d]){
     if(!invalidDocuments.some(x=>x.reason==='duplicate_identity'&&
        x.statementId===conflicted.statementId&&x.importId===conflicted.importId))
      invalidDocuments.push({statementId:conflicted.statementId,
       importId:conflicted.importId,reason:'duplicate_identity'});
    }
   }
   if(!seenSources.has(d.sourceId))seenSources.set(d.sourceId,d);
   if(!seenImports.has(d.importId))seenImports.set(d.importId,d);
   for(const r of d.rows){
    const item={doc:d,row:r},ident=key(d.accountId,d.statementId,r.lineId),
     source=key(d.accountId,d.sourceId,r.lineId);
    if(!indexed.has(ident))indexed.set(ident,[]);
    if(!physical.has(source))physical.set(source,[]);
    indexed.get(ident).push(item);physical.get(source).push(item);
    allRows.push(item);
   }
  }
  for(const s of settlements){
   const id=String(s?.id||'');ids.set(id,(ids.get(id)||0)+1);
   if(!goodSettlement(s))continue;
   const e=s.bankEvidence,k=key(e.accountId,e.statementId,e.lineId);
   claims.set(k,(claims.get(k)||0)+1);
  }
  for(const r of reviews){
   if(!str(r?.settlementId))continue;
   if(!approvals.has(r.settlementId))approvals.set(r.settlementId,[]);
   approvals.get(r.settlementId).push(r);
  }
  const cases=[],recognized=new Set();
  for(const s of settlements){
   const id=String(s?.id||''),e=s?.bankEvidence;
   const item={settlementId:id,statementId:String(e?.statementId||''),
    lineId:String(e?.lineId||''),status:'',reviewToken:null,
    scheduledDueDate:null,observedDebitDate:null,bankDateDeviationDays:null,
    budgetExpense:false,budgetIncome:false,confirmedAutomatically:false};
   if(!goodSettlement(s))item.status='invalid_settlement';
   else{
    const k=key(e.accountId,e.statementId,e.lineId),found=indexed.get(k)||[];
    if(ids.get(id)>1)item.status='duplicate_settlement_id';
    else if(claims.get(k)>1)item.status='conflicting_claim';
    else if(invalidDocuments.some(d=>d.statementId===e.statementId&&
      d.reason!=='duplicate_identity'))item.status='source_incomplete';
    else if(duplicatedDocuments.has(e.statementId)||found.length>1)
     item.status='duplicate_import';
    else if(!found.length)item.status='missing_line';
    else{
     const {doc:d,row:r}=found[0],p=key(d.accountId,d.sourceId,r.lineId);
     if((physical.get(p)||[]).length>1)item.status='duplicate_import';
     else if(!same(d,r,s))item.status='mismatched_line';
     else{
      recognized.add(k);
      item.scheduledDueDate=due(s);
      item.observedDebitDate=s.debitDate;
      // Signed civil-date difference, informational until separately
      // authenticated in a real bank/SQL workflow.
      item.bankDateDeviationDays=Math.round((
       Date.parse(s.debitDate+'T12:00:00Z')-
       Date.parse(due(s)+'T12:00:00Z'))/86400000);
      if(s.status==='pending')item.status='pending_review';
      else{
       const token=fingerprint(d,s),review=approvals.get(id)||[];
       item.reviewToken=token;
       item.status=!review.length?'needs_human_review':
        review.length!==1||review[0].approved!==true||
        review[0].snapshot!==token?'stale_review':'manual_review_current';
      }
     }
    }
   }
   cases.push(item);
  }
  const unclaimedLines=allRows.filter(({doc:d,row:r})=>
   !recognized.has(key(d.accountId,d.statementId,r.lineId))).
   map(({doc:d,row:r})=>({statementId:d.statementId,importId:d.importId,
    lineId:r.lineId,accountId:d.accountId,status:'unclaimed_or_disputed'}));
  const totals={};
  for(const i of cases)totals[i.status]=(totals[i.status]||0)+1;
  return{cases,totals,invalidDocuments,unclaimedLines,writes:0,
   financialChanges:0,createdTransactions:0,bankAuthenticated:false,
   serverUniquenessChecked:false};
 }
 root.TraceDeferredBankReview=Object.freeze({compare,reviewSnapshot});
})(typeof window!=='undefined'?window:globalThis);
