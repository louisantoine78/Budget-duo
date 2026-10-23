/* TRACE 5.37.0 — ISOLATED deferred-debit accounting laboratory.
 * Not loaded by production, candidate UI or the fictional preview.
 * No bank writes, database, automatic FX rate, UI state or transaction migration.
 *
 * One purchase is a budget expense on budgetDate. The linked checking account
 * moves only when a CONFIRMED debit settles that purchase. Such a settlement
 * is a BANK TRANSFER, never another budget expense.
 *
 * Conservative phase-1 rule: one exact settlement per due-date batch; partial
 * partial settlements/fees/FX legs are not inferred or auto-booked.
 * Merchant refunds before due date are explicit card credits and budget reversals.
 */
(function(root){'use strict';
 const allowed=Object.freeze(['CAD','EUR','USD','GBP','CHF']);
 const date=v=>{
  const s=String(v??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const d=new Date(s+'T12:00:00Z');
  return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?s:null;
 };
 const cents=v=>{
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(v),rounded=Math.round(n*100);
  return Number.isFinite(n)&&n>0&&n<=1e7&&
   Number.isSafeInteger(rounded)&&Math.abs(n*100-rounded)<1e-6?rounded:null;
 };
 const month=d=>d.slice(0,7);
 const amount=v=>v/100;
 function simulate({card,checking,purchases=[],refunds=[],settlements=[],asOfDate}={}){
  if(!card||!checking||card.type!=='card'||card.paymentMode!=='deferred'||
     checking.type!=='checking'||!card.id||!checking.id||
     card.id===checking.id||card.settlementAccountId!==checking.id||
     card.owner!==checking.owner||!card.owner||
     card.country!==checking.country||!card.country||
     !allowed.includes(String(card.currency||'').toUpperCase())||
     String(card.currency).toUpperCase()!==String(checking.currency).toUpperCase())
   throw Error('Carte différée et compte de règlement incompatibles.');
  if(!date(asOfDate))throw Error('Date de situation invalide.');
  if(!Array.isArray(purchases)||!Array.isArray(refunds)||!Array.isArray(settlements)||
     purchases.length>5000||refunds.length>5000||settlements.length>5000)
   throw Error('Nombre de mouvements invalide.');
  const currency=String(card.currency).toUpperCase(),seen=new Set();
  const byId=new Map(),byDue=new Map();
  for(const p of purchases){
   const id=String(p?.id??'').trim(),minor=cents(p?.amount);
   if(!id||seen.has('p:'+id)||!date(p?.purchaseDate)||
      !date(p?.budgetDate)||!date(p?.dueDate)||minor===null||
      p.purchaseDate>p.dueDate||p.budgetDate>p.dueDate||
      p.cardAccountId!==card.id||String(p.currency).toUpperCase()!==currency||
      (p.type&&!['expense','deferred_purchase'].includes(p.type))||
      p.refundAmount!==undefined||p.feeAmount!==undefined||
      p.status&&p.status!=='confirmed')
    throw Error('Achat différé ambigu : date, montant, devise, statut ou identifiant.');
   seen.add('p:'+id);
   const purchase={id,cardAccountId:card.id,purchaseDate:p.purchaseDate,
    budgetDate:p.budgetDate,dueDate:p.dueDate,cents:minor,name:String(p.name||'')};
   byId.set(id,purchase);
   if(!byDue.has(p.dueDate))byDue.set(p.dueDate,[]);
   byDue.get(p.dueDate).push(purchase);
  }
  // Only card credits explicitly tied to purchases and confirmed before due
  // may reduce the outstanding liability. No checking-account or salary flow.
  const refundsByPurchase=new Map(),refundRecords=[];
  for(const r of refunds){
   const id=String(r?.id??'').trim(),purchaseId=String(r?.purchaseId??'').trim(),
    minor=cents(r?.amount),when=date(r?.refundDate),budgetDate=date(r?.budgetDate),
    original=byId.get(purchaseId);
   if(!id||seen.has('r:'+id)||!original||minor===null||!when||!budgetDate||
      !['confirmed','pending'].includes(r.status)||
      r.type!=='merchant_refund'||r.cardAccountId!==card.id||
      String(r.currency).toUpperCase()!==currency||
      r.feeAmount!==undefined||r.taxAmount!==undefined||
      when<original.purchaseDate||when>original.dueDate||
      budgetDate<original.purchaseDate||budgetDate>original.dueDate)
    throw Error('Remboursement commerçant différé ambigu : date, devise, statut ou achat.');
   seen.add('r:'+id);
   const grouped=refundsByPurchase.get(purchaseId)||[];
   if(grouped.reduce((n,x)=>n+x.cents,0)+minor>original.cents)
    throw Error('Remboursements supérieurs à l’achat initial.');
   const refund={id,purchaseId,refundDate:when,budgetDate,cents:minor,status:r.status};
   grouped.push(refund);refundsByPurchase.set(purchaseId,grouped);
   refundRecords.push(refund);
  }
  const creditedFor=(p,cutoff)=>(refundsByPurchase.get(p.id)||[])
   .filter(r=>r.status==='confirmed'&&r.refundDate<=cutoff)
   .reduce((n,r)=>n+r.cents,0);
  const settlementBatches=new Map(),settlementRecords=[];
  for(const s of settlements){
   const id=String(s?.id??'').trim(),minor=cents(s?.amount),
    when=date(s?.debitDate),refs=s?.purchaseIds;
   if(!id||seen.has('s:'+id)||!when||minor===null||
      !['confirmed','pending'].includes(s.status)||
      s.cardAccountId!==card.id||s.checkingAccountId!==checking.id||
      String(s.currency).toUpperCase()!==currency||
      (s.type&&!['transfer','deferred_settlement'].includes(s.type))||
      s.feeAmount!==undefined||s.refundAmount!==undefined||
      !Array.isArray(refs)||!refs.length)
    throw Error('Règlement différé invalide : montant, compte, statut ou justificatif.');
   seen.add('s:'+id);
   const uniqueRefs=new Set(refs);
   if(uniqueRefs.size!==refs.length)throw Error('Un achat est cité deux fois dans le règlement.');
   const lines=refs.map(pid=>byId.get(pid));
   if(lines.some(x=>!x))throw Error('Règlement lié à un achat introuvable.');
   const due=lines[0].dueDate;
   if(lines.some(x=>x.dueDate!==due||x.purchaseDate>when))
    throw Error('Règlement lié à plusieurs échéances ou antérieur à un achat.');
   const batch=byDue.get(due);
   if(batch.length!==refs.length||batch.some(x=>!uniqueRefs.has(x.id)))
    throw Error('Un règlement doit couvrir le lot complet de son échéance.');
   if(batch.some(p=>(refundsByPurchase.get(p.id)||[]).some(r=>r.refundDate>when)))
    throw Error('Remboursement postérieur au règlement : rapprochement spécifique requis.');
   const total=batch.reduce((n,x)=>n+x.cents-creditedFor(x,when),0);
   if(minor!==total)throw Error('Montant du règlement différent du net des achats à l’échéance.');
   if(settlementBatches.has(due))
    throw Error('Règlement répété sur la même échéance.');
   settlementBatches.set(due,id);
   const settlement={id,debitDate:when,dueDate:due,cents:minor,
    status:s.status,purchaseIds:refs.slice()};
   settlementRecords.push(settlement);
  }
  const budgetByMonth=Object.create(null),spendItems=[],dueBatches=[];
  for(const p of byId.values()){
   if(p.purchaseDate>asOfDate)continue; // Future purchase cannot affect today's liability.
   budgetByMonth[month(p.budgetDate)]=(budgetByMonth[month(p.budgetDate)]||0)+p.cents;
   spendItems.push({id:p.id,purchaseDate:p.purchaseDate,
    budgetDate:p.budgetDate,dueDate:p.dueDate,amount:amount(p.cents),
    currency,budgetExpense:true,checkingMovement:0});
  }
  let purchasedCents=0,paidCents=0,pendingDueCents=0,refundedCents=0;
  const budgetRefunds=[];
  for(const r of refundRecords){
   const original=byId.get(r.purchaseId);
   if(r.status!=='confirmed'||r.refundDate>asOfDate||
      original.purchaseDate>asOfDate)continue;
   refundedCents+=r.cents;
   budgetByMonth[month(r.budgetDate)]=(budgetByMonth[month(r.budgetDate)]||0)-r.cents;
   budgetRefunds.push({id:r.id,purchaseId:r.purchaseId,
    refundDate:r.refundDate,budgetDate:r.budgetDate,amount:amount(r.cents),
    currency,budgetReduction:true,budgetIncome:false,checkingMovement:0});
  }
  for(const p of byId.values())if(p.purchaseDate<=asOfDate)purchasedCents+=p.cents;
  for(const s of settlementRecords)if(s.status==='confirmed'&&s.debitDate<=asOfDate)
   paidCents+=s.cents;
  if(paidCents>purchasedCents-refundedCents)throw Error('Solde différé impossible : règlement supérieur au net des achats.');
  for(const [due,lines] of byDue.entries()){
   const applicable=lines.filter(x=>x.purchaseDate<=asOfDate);
   if(!applicable.length)continue;
   const gross=applicable.reduce((n,x)=>n+x.cents,0),
    cardCredits=applicable.reduce((n,x)=>n+creditedFor(x,asOfDate),0),
    total=gross-cardCredits,
    matched=settlementRecords.find(s=>s.dueDate===due),
    settled=!!(matched?.status==='confirmed'&&matched.debitDate<=asOfDate),
    dueUnpaid=due<=asOfDate&&!settled&&total>0;
   if(dueUnpaid)pendingDueCents+=total;
   dueBatches.push({dueDate:due,amount:amount(total),grossAmount:amount(gross),
    confirmedRefunds:amount(cardCredits),currency,
    purchaseIds:applicable.map(x=>x.id),
    status:settled?'settled':!total?'cleared_by_refund':
     matched?.status==='pending'?'pending_review':
     dueUnpaid?'overdue':'scheduled',
    actualDebitDate:matched?.debitDate??null,
    confirmedSettlementId:settled?matched.id:null});
  }
  dueBatches.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  return{cardAccountId:card.id,checkingAccountId:checking.id,currency,asOfDate,
   budgetExpenses:spendItems,budgetRefunds,monthlyBudget:Object.fromEntries(
    Object.entries(budgetByMonth).map(([key,v])=>[key,amount(v)])),
   batches:dueBatches,
   liability:amount(purchasedCents-refundedCents-paidCents),
   overdue:amount(pendingDueCents),
   checkingBalanceChange:paidCents?amount(-paidCents):0,
   cardBalanceChange:amount(-purchasedCents+refundedCents+paidCents),
   merchantRefunds:budgetRefunds.map(r=>({...r,cardAccountId:card.id,internalTransfer:false})),
   bankTransfers:settlementRecords.filter(s=>s.status==='confirmed'&&s.debitDate<=asOfDate)
    .map(s=>({id:s.id,accountId:checking.id,toAccountId:card.id,
     debitDate:s.debitDate,amount:amount(s.cents),currency,
     budgetExpense:false,budgetIncome:false,internalTransfer:true})),
   writes:0,financialChanges:0};
 }
 root.TraceDeferredDebit=Object.freeze({simulate});
})(typeof window!=='undefined'?window:globalThis);
