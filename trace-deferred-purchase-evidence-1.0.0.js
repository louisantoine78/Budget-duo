/* TRACE 5.37.0 — purchase evidence review for deferred credit-card purchases.
 * Fictional/local review contract only. Not an authenticated bank check.
 * No writes, persistence, network, status transition or budget mutation.
 * Evidence on the card is DISTINCT from later checking-account settlement.
 * JSON snapshots expire with any plan or imported-source change. They are
 * client staleness tokens, NOT cryptographic evidence or server authorization.
 */
(function(root){'use strict';
 const I=()=>root.TraceInternational;
 const date=v=>I()?.calendarDate?.(v)===true;
 const cents=v=>{
  const n=I()?.exactMoney?.(v);
  return n!==null&&n!==undefined&&Number.isSafeInteger(Math.round(n*100))&&
   n>0?Math.round(n*100):null;
 };
 const str=v=>typeof v==='string'&&v.trim().length>0;
 const identity=(s,r)=>JSON.stringify([s.accountId,s.sourceId,r.lineId]);
 const sameEvidence=(plan,doc,row)=>{
  const t=plan.document;
  return doc.accountId===t.accountId&&
   doc.currency.toUpperCase()===String(t.bankCurrency).toUpperCase()&&
   row.purchaseDate===t.date&&row.direction==='debit'&&
   row.type==='card_purchase'&&cents(row.amount)===cents(t.bankAmount);
 };
 const validDoc=s=>!!(s&&str(s.statementId)&&str(s.importId)&&
  str(s.sourceId)&&str(s.sourceVersion)&&str(s.accountId)&&
  str(s.currency)&&['csv','pdf_extracted'].includes(s.sourceType)&&
  s.complete===true&&date(s.fromDate)&&date(s.toDate)&&
  s.fromDate<=s.toDate&&Array.isArray(s.rows)&&s.rows.length<=2000&&
  s.rows.every(row=>row&&str(row.lineId)&&date(row.purchaseDate)&&
   row.purchaseDate>=s.fromDate&&row.purchaseDate<=s.toDate&&
   row.type==='card_purchase'&&['debit','credit'].includes(row.direction)&&
   ['confirmed','pending'].includes(row.status)&&
   cents(row.amount)!==null&&
   (!row.currency||String(row.currency).toUpperCase()===
    String(s.currency).toUpperCase())));
 function checkPlan(plan){
  const t=plan?.document;
  if(plan?.kind!=='deferred_write_plan'||plan.persistable!==false||
     plan.confirmed!==false||t?.type!=='expense'||
     t.deferredKind!=='purchase'||t.status!=='pending'||
     t.deferredBankEvidenceReviewed!==false||
     !str(t.id)||!str(t.accountId)||!str(t.bankCurrency)||
     !str(t.name)||!date(t.date)||!date(t.budgetDate)||
     !date(t.dueDate)||t.dueDate<t.date||t.dueDate<t.budgetDate||
     cents(t.bankAmount)===null||cents(t.amountCAD)===null)
   throw Error('Préparation différée non admissible à une revue de preuve.');
 }
 const signature=(p,s,lineId)=>JSON.stringify({
  purchasePlan:p,statement:s,selectedLineId:lineId});
 function review({plan,statements=[],selection=null,receipts=[],otherClaims=[]}={}){
  checkPlan(plan);
  if(!Array.isArray(statements)||statements.length>50||
     !Array.isArray(receipts)||receipts.length>1000||
     !Array.isArray(otherClaims)||otherClaims.length>5000)
   throw Error('Justificatifs ou accords de revue invalides.');
  const result=(status,extras={})=>Object.freeze({
   status,planId:plan.document.id,
   persistable:false,confirmed:false,
   bankAuthenticated:false,serverUniquenessChecked:false,
   createdTransactions:0,budgetExpenseBooked:0,checkingDebitBooked:0,
   ...extras
  });
  const selectStatement=String(selection?.statementId||''),
   selectLine=String(selection?.lineId||'');
  if(!selectStatement||!selectLine)return result('select_card_statement_line');
  const candidates=statements.filter(s=>s?.statementId===selectStatement);
  if(candidates.length!==1)return result(candidates.length?'duplicate_statement':'missing_statement');
  const doc=candidates[0];
  if(!validDoc(doc)||statements.some(s=>s?.statementId===selectStatement&&
     !validDoc(s)))return result('source_incomplete');
  const allValid=statements.every(validDoc);
  if(!allValid)return result('source_incomplete');
  const matches=doc.rows.filter(row=>row.lineId===selectLine);
  if(matches.length!==1)return result(matches.length?'duplicate_line':'missing_line');
  const row=matches[0];
  // The same physical card row cannot be imported twice and "reviewed" twice.
  const key=identity(doc,row);
  let physicalCount=0;
  for(const s of statements)for(const r of s.rows)
   if(identity(s,r)===key)physicalCount++;
  if(physicalCount!==1)return result('duplicate_import');
  if(otherClaims.some(c=>c?.planId!==plan.document.id&&
     c?.accountId===doc.accountId&&c?.sourceId===doc.sourceId&&
     c?.lineId===row.lineId))
   return result('conflicting_purchase_claim');
  if(!sameEvidence(plan,doc,row))return result('mismatched_bank_line');
  if(row.status!=='confirmed')return result('pending_bank_line');
  // If same-day same-cents lines exist, the reader must explicitly
  // disambiguate. No implicit bank row deduplication.
  const collisions=statements.flatMap(s=>s.rows.filter(r=>
   s.accountId===doc.accountId&&s.currency.toUpperCase()===doc.currency.toUpperCase()&&
   r.purchaseDate===row.purchaseDate&&r.direction==='debit'&&
   cents(r.amount)===cents(row.amount)&&r.type==='card_purchase'));
  if(collisions.length>1)return result('ambiguous_card_lines');
  const token=signature(plan,doc,selectLine);
  const related=receipts.filter(r=>r?.planId===plan.document.id);
  if(!related.length)return result('needs_human_review',{reviewToken:token});
  if(related.length!==1||related[0].approved!==true||
     related[0].reviewedBy!==plan.document.payerId||
     related[0].statementId!==doc.statementId||
     related[0].lineId!==row.lineId||
     related[0].snapshot!==token)
   return result('stale_review',{reviewToken:token});
  return result('manual_review_current',{reviewToken:token,
   bankRow:Object.freeze({accountId:doc.accountId,
    statementId:doc.statementId,lineId:row.lineId,
    sourceId:doc.sourceId,sourceVersion:doc.sourceVersion,
    nativeAmount:row.amount,nativeCurrency:doc.currency,
    purchaseDate:row.purchaseDate}),
   // Even current human review DOES NOT authorize a CAS write.
   serverApprovalRequired:true});
 }
 root.TraceDeferredPurchaseEvidence=Object.freeze({review});
})(typeof window!=='undefined'?window:globalThis);
