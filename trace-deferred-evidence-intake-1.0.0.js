/* TRACE 5.37.0 — two independent evidence channels for deferred cards.
 * Structured CSV/PDF data already extracted; NO parsing or financial writes.
 * The card purchase and the checking-account settlement require distinct
 * sources and independent, expiring human attestations. Neither permits a
 * pending -> confirmed transition. Never consume bank credentials or Supabase.
 */
(function(root){'use strict';
 const str=v=>typeof v==='string'&&v.trim().length>0;
 const arr=(v,max)=>Array.isArray(v)&&v.length<=max;
 const error=()=>{throw Error('Sources différées distinctes et complètes requises.');};
 function review({plan,checkingAccountId,cardStatements=[],cardSelection=null,
  cardReceipts=[],purchaseClaims=[],checkingStatements=[],settlements=[],
  settlementReceipts=[]}={}){
  const purchase=root.TraceDeferredPurchaseEvidence;
  const bank=root.TraceDeferredBankReview;
  if(typeof purchase?.review!=='function'||typeof bank?.compare!=='function')
   throw Error('Contrôleurs de preuve différée indisponibles.');
  if(!str(checkingAccountId)||!str(plan?.document?.accountId)||
   !str(plan?.document?.payerId)||!str(plan?.document?.id)||
   !str(plan?.checkingAccountId)||plan.checkingAccountId!==checkingAccountId||
   checkingAccountId===plan.document.accountId||
   !arr(cardStatements,50)||!arr(cardReceipts,1000)||
   !arr(purchaseClaims,5000)||!arr(checkingStatements,100)||
   !arr(settlements,5000)||!arr(settlementReceipts,5000))error();
  // NEVER accept one physical imported item as both card-purchase evidence
  // and current-account debit evidence, even if a renamed import is supplied.
  const physical=new Set(),imports=new Set();
  // Each physical bank source and each import is unique across the WHOLE
  // review batch, including multiple statements from the same channel.
  const register=(doc,accountId,checkCurrency)=>{
   if(!doc||doc.accountId!==accountId||
      (checkCurrency&&String(doc.currency||'').toUpperCase()!==
       String(plan.document.bankCurrency||'').toUpperCase())||
      !str(doc.sourceId)||!str(doc.sourceVersion)||!str(doc.importId)||
      physical.has(doc.sourceId)||imports.has(doc.importId))error();
   physical.add(doc.sourceId);imports.add(doc.importId);
  };
  for(const doc of cardStatements)register(doc,plan.document.accountId,false);
  for(const doc of checkingStatements)register(doc,checkingAccountId,true);
  // For an installment allocated ONLY to this purchase with no card fees,
  // even the sum of several debits cannot exceed the purchase's native cost.
  // Mixed allocations and refunds still require a complete ledger validation.
  let exclusivePaidCents=0,fullBatchEvidenceComplete=true;
  const cents=v=>{
   if(typeof v!=='number'&&typeof v!=='string')return null;
   if(typeof v==='string'&&!/^\d{1,8}(?:\.\d{1,2})?$/.test(v))return null;
   const x=Number(v),c=Math.round(x*100);
   return Number.isFinite(x)&&x>0&&Number.isSafeInteger(c)&&
    Math.abs(x*100-c)<1e-6?c:null;
  };
  const nativeCap=cents(plan.document.bankAmount);
  for(const s of settlements){
   if(!s||s.checkingAccountId!==checkingAccountId||
      s.cardAccountId!==plan.document.accountId||
      String(s.currency||'').toUpperCase()!==
       String(plan.document.bankCurrency||'').toUpperCase()||
      !Array.isArray(s.purchaseIds)||s.purchaseIds.length<1||
      s.purchaseIds.length>5000||
      new Set(s.purchaseIds).size!==s.purchaseIds.length||
      !s.purchaseIds.includes(plan.document.id)||
      !Array.isArray(s.feeIds)||s.feeIds.length>5000||
      s.feeIds.some(id=>!str(id))||
      new Set(s.feeIds).size!==s.feeIds.length)error();
   // Missing or malformed fee metadata must never bypass the exclusive
   // partial-payment cap by masquerading as a fee-bearing settlement.
   if(s.purchaseIds.length===1&&!s.feeIds.length){
    const paid=cents(s.amount);
    if(paid===null||nativeCap===null||
       exclusivePaidCents+paid>nativeCap)error();
    // Without the other charges/credits, a "full" payment must actually
    // equal this purchase in native cents, on its declared due batch.
    if(s.settlementMode==='full'&&
       (paid!==nativeCap||s.scheduledDueDate!==plan.document.dueDate||
        exclusivePaidCents!==0))
     error();
    exclusivePaidCents+=paid;
   }
   // For a full payment spanning purchases or fees, this single-purchase
   // intake cannot attest the COMPLETE due batch. Require a later ledger-wide
   // server check; never advertise it as locally fully reviewed.
   if(s.settlementMode==='full'&&
      (s.purchaseIds.length!==1||s.feeIds.length!==0))
    fullBatchEvidenceComplete=false;
  }
  const card=purchase.review({plan,statements:cardStatements,
   selection:cardSelection,receipts:cardReceipts,otherClaims:purchaseClaims});
  // Comparing the checking statement must never be a substitute for
  // a matching purchase line on the card, nor automatically book a payment.
  const checking=bank.compare({statements:checkingStatements,
   settlements,reviews:settlementReceipts});
  if(card.persistable!==false||card.confirmed!==false||
     card.createdTransactions!==0||checking.writes!==0||
     checking.financialChanges!==0||checking.createdTransactions!==0)error();
  const settlementStatuses=checking.cases.map(c=>Object.freeze({
   settlementId:c.settlementId,status:c.status,
   reviewToken:c.reviewToken||null,
   scheduledDueDate:c.scheduledDueDate||null,
   observedDebitDate:c.observedDebitDate||null,
   bankDateDeviationDays:Number.isInteger(c.bankDateDeviationDays)?
    c.bankDateDeviationDays:null
  }));
  const sourceBatchComplete=Array.isArray(checking.invalidDocuments)&&
   checking.invalidDocuments.length===0;
  const purchaseReviewed=card.status==='manual_review_current';
  const settlementReviewed=settlements.length>0&&
   settlementStatuses.length===settlements.length&&
   settlementStatuses.every(c=>c.status==='manual_review_current');
  return Object.freeze({kind:'deferred_evidence_intake',
   planId:plan.document.id,cardAccountId:plan.document.accountId,
   checkingAccountId,purchaseStatus:card.status,
   purchaseReviewToken:card.reviewToken||null,
   settlementStatuses:Object.freeze(settlementStatuses),
   awaitingSettlement:settlements.length===0,
   localEvidenceReviewed:purchaseReviewed&&settlementReviewed&&
    sourceBatchComplete&&fullBatchEvidenceComplete,
   fullBatchEvidenceComplete,
   checkingSourcesComplete:sourceBatchComplete,
   // This status is only a local review marker. Auth, bank, server CAS and
   // source uniqueness cannot be validated in this browser module.
   bankAuthenticated:false,serverUniquenessChecked:false,
   eligibleForServerConfirmation:false,persistable:false,confirmed:false,
   createdTransactions:0,budgetExpenseBooked:0,
   checkingDebitBooked:0,financialChanges:0,writes:0});
 }
 root.TraceDeferredEvidenceIntake=Object.freeze({review});
})(typeof window!=='undefined'?window:globalThis);
