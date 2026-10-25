/* TRACE 5.37.0 — read-only bridge from reviewed structured PDF/CSV rows.
 * Consumes TraceStatementEvidence.stage/reviewedRows, never raw PDF or CSV.
 * Classification and completeness are explicit LOCAL attestations only.
 * Not bank authenticated, not server unique, NEVER a posting permission.
 */
(function(root){'use strict';
 const str=v=>typeof v==='string'&&v.trim().length>0;
 const status=(reason)=>Object.freeze({status:'blocked',reason,statement:null,
  writes:0,financialChanges:0,createdTransactions:0,
  bankAuthenticated:false,serverUniquenessChecked:false,persistable:false});
 const kindDirection=Object.freeze({card_purchase:'out',card_refund:'in',
  card_payment:'in',card_fee:'out',checking_debit:'out',checking_credit:'in'});
 function convert({staged,approvals=[],accountKind,sourceType,sourceId,
   importId,classifications=[],completeness}={}){
  if(typeof root.TraceStatementEvidence?.reviewedRows!=='function')
   return status('Moteur de preuve de relevé indisponible.');
  if(!staged||!str(sourceId)||!str(importId)||
     !['card','checking'].includes(accountKind)||
     !['pdf_extracted','csv'].includes(sourceType)||
     !Array.isArray(approvals)||!Array.isArray(classifications)||
     classifications.length>2000||
     !str(staged.statementKey)||!str(staged.documentId)||
     !Number.isInteger(staged.totalRows)||staged.totalRows<1||
     !Array.isArray(staged.ready)||!Array.isArray(staged.issues)||
     !completeness||completeness.confirmed!==true||
     completeness.statementKey!==staged.statementKey||
     completeness.expectedRows!==staged.totalRows||
     !str(completeness.reviewedBy))
   return status('Identité, origine ou complétude manuelle du relevé à vérifier.');
  let review;
  try{review=root.TraceStatementEvidence.reviewedRows(staged,approvals);}
  catch(e){return status('Revue des lignes du relevé impossible.');}
  if(review?.status!=='reviewed'||review.writes!==0||
     review.financialChanges!==0||
     review.verifiedRows?.length!==staged.totalRows||
     staged.issues.length!==0||staged.ready.length!==staged.totalRows||
     review.documentId!==staged.documentId||
     review.accountId!==staged.accountId||
     review.currency!==staged.currency||
     review.fromDate!==staged.fromDate||
     review.toDate!==staged.toDate)
   return status('Lignes non vérifiées, ambigües ou modifiées depuis l’attestation.');
  if(classifications.length!==staged.totalRows)
   return status('Chaque ligne doit être classée explicitement.');
  const categories=new Map();
  for(const a of classifications){
   if(!a||!str(a.id)||categories.has(a.id)||
      a.confirmed!==true||a.posted!==true||
      a.statementKey!==staged.statementKey||!str(a.evidenceKey)||
      !Object.prototype.hasOwnProperty.call(kindDirection,a.kind)||
      (accountKind==='card'?!a.kind.startsWith('card_'):
       !a.kind.startsWith('checking_')))
    return status('Classification bancaire manquante, périmée ou incompatible.');
   categories.set(a.id,a);
  }
  const rows=[];
  for(const original of staged.ready){
   const approval=categories.get(original.id);
   if(!approval||approval.evidenceKey!==original.evidenceKey||
      kindDirection[approval.kind]!==original.direction||
      !str(original.rawText)||!Number.isSafeInteger(original.page)||
      original.page<1||!Number.isSafeInteger(original.line)||original.line<1)
    return status('Ligne source ou nature bancaire incohérente.');
   const bankDate=original.date;
   const entry={lineId:original.id,amount:original.amount,
    direction:original.direction==='out'?'debit':'credit',
    status:'confirmed',type:approval.kind,
    currency:staged.currency,sourcePage:original.page,
    sourceLine:original.line,originalText:original.rawText};
   if(accountKind==='card'&&approval.kind==='card_purchase')
    entry.purchaseDate=bankDate;
   else entry.debitDate=bankDate;
   rows.push(Object.freeze(entry));
  }
  // Review token binds ALL classified rows and the full source snapshot;
  // it is an expiration marker, NEVER cryptographic proof or bank authority.
  const sourceVersion=JSON.stringify([staged.statementKey,
   rows.map(r=>[r.lineId,r.type,r.status,r.amount,r.purchaseDate||r.debitDate,
    r.direction,r.originalText])]);
  const statement=Object.freeze({statementId:staged.documentId,
   importId,sourceId,sourceVersion,sourceType,
   accountId:staged.accountId,currency:staged.currency,
   fromDate:staged.fromDate,toDate:staged.toDate,
   complete:true,rows:Object.freeze(rows)});
  return Object.freeze({status:'local_document_ready',statement,
   accountKind,reviewer:completeness.reviewedBy,
   // The user reviewed a source; neither posted status nor this flag
   // attests bank authentication or server-wide source uniqueness.
   persistable:false,bankAuthenticated:false,
   serverUniquenessChecked:false,createdTransactions:0,
   financialChanges:0,writes:0});
 }
 root.TraceDeferredStatementBridge=Object.freeze({convert});
})(typeof window!=='undefined'?window:globalThis);
