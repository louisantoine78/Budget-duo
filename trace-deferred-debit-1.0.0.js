/* TRACE 5.37.0 — ISOLATED deferred-debit accounting laboratory.
 * Not loaded by production, candidate UI or the fictional preview.
 * No bank writes, database, automatic FX rate, UI state or transaction migration.
 *
 * One purchase is a budget expense on budgetDate. The linked checking account
 * moves only when a CONFIRMED debit settles that purchase. Such a settlement
 * is a BANK TRANSFER, never another budget expense.
 *
 * Conservative phase-1: full settlements remain exact; partial settlements
 * require an explicit due-date allocation and a human-reviewed bank line.
 * This is a simulation, NOT verification of imported bank evidence. Checking
 * fees, unknown FX legs and allocation across multiple dues stay blocked.
 * Merchant refunds before due date are explicit card credits/budget reversals.
 * Explicit confirmed card fees are distinct budget expenses/card liabilities.
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

 // Monthly recurrence is a PLANNED calendar date, never bank evidence.
 // Card settings carry day-of-month (1..31); short months use their last day.
 // The cutoff is optional: without it, a future debit date can be displayed,
 // but purchases CANNOT be allocated to a due batch.
 const dayNumber=(v,required=false)=>{
  if(v===null||v===undefined||v===''){
   if(required)throw Error('Jour mensuel de prélèvement requis (1 à 31).');
   return null;
  }
  const s=String(v).trim();
  if(!/^(?:[1-9]|[12][0-9]|3[01])$/.test(s))
   throw Error('Jour mensuel invalide : choisis une valeur de 1 à 31.');
  return Number(s);
 };
 const monthDay=(year,month,day)=>{
  const max=new Date(Date.UTC(year,month,0)).getUTCDate();
  return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+
   String(Math.min(day,max)).padStart(2,'0');
 };
 const addMonth=(year,month,step=1)=>{
  const index=year*12+month-1+step;
  return{year:Math.floor(index/12),month:index%12+1};
 };
 const monthlyDebitSchedule=({purchaseDate,debitDay,closingDay=null}={})=>{
  const purchase=date(purchaseDate),debit=dayNumber(debitDay,true),
   closing=dayNumber(closingDay,false);
  if(!purchase)throw Error('Date d’achat invalide pour le calendrier différé.');
  const year=Number(purchase.slice(0,4)),month=Number(purchase.slice(5,7));
  if(!closing){
   // Informational NEXT date only. The purchase is NOT allocated to it.
   let next=monthDay(year,month,debit);
   if(next<purchase){
    const p=addMonth(year,month);next=monthDay(p.year,p.month,debit);
   }
   return{debitDay:debit,closingDay:null,cutoffDate:null,
    nextDebitDate:next,dueDate:null,allocationVerified:false};
  }
  // An item after the cycle closing date belongs to the following cycle.
  let cutoff=monthDay(year,month,closing),period={year,month};
  if(purchase>cutoff){
   period=addMonth(year,month);
   cutoff=monthDay(period.year,period.month,closing);
  }
  // A debit on the cutoff day is never assumed settled the same day.
  // Find the first scheduled debit strictly AFTER the cycle closes.
  let due=monthDay(period.year,period.month,debit),cursor=period;
  for(let i=0;i<3&&due<=cutoff;i++){
   cursor=addMonth(cursor.year,cursor.month);
   due=monthDay(cursor.year,cursor.month,debit);
  }
  if(due<=cutoff)throw Error('Échéance mensuelle impossible à calculer.');
  return{debitDay:debit,closingDay:closing,cutoffDate:cutoff,
   nextDebitDate:due,dueDate:due,allocationVerified:true};
 };

 // This versioned plan is read-only. Earlier purchase due dates and bank
 // evidence remain untouched; unversioned old rules are never backdated.
 const scheduleVersions=card=>{
  const records=card?.deferredScheduleVersions??[];
  if(!Array.isArray(records)||records.length>120)
   throw Error('Historique du calendrier différé invalide.');
  let last='';
  return records.map(v=>{
   if(!v||typeof v!=='object'||Array.isArray(v)||
      Object.keys(v).some(k=>!['effectiveDate','debitDay','closingDay'].includes(k)))
    throw Error('Version de calendrier différé non reconnue.');
   const effectiveDate=date(v.effectiveDate),debitDay=dayNumber(v.debitDay,true),
    closingDay=dayNumber(v.closingDay);
   if(!effectiveDate||effectiveDate<=last)
    throw Error('Versions sans dates de prise d’effet croissantes.');
   last=effectiveDate;
   return{effectiveDate,debitDay,closingDay};
  });
 };
 const frenchDeferred=card=>{
  if(!card||card.type!=='card'||card.paymentMode!=='deferred'||
     card.country!=='FR'||card.archived||!String(card.id||'').trim()||
     !String(card.owner||'').trim()||!String(card.settlementAccountId||'').trim()||
     String(card.currency||'').toUpperCase()!=='EUR')
   throw Error('Calendrier réservé à une carte différée française active liée à un compte EUR.');
 };
 const proposeScheduleRevision=({card,checking,owner,asOfDate,effectiveDate,debitDay,closingDay=null}={})=>{
  frenchDeferred(card);
  if(!owner||owner!==card.owner||!checking||checking.archived||
     checking.type!=='checking'||checking.id!==card.settlementAccountId||
     checking.owner!==owner||checking.country!=='FR'||
     String(checking.currency||'').toUpperCase()!=='EUR')
   throw Error('Compte courant français EUR du même titulaire requis pour le calendrier différé.');
  const today=date(asOfDate),start=date(effectiveDate);
  if(!today||!start||start<=today)
   throw Error('La règle doit prendre effet à une date future valide.');
  const history=scheduleVersions(card),prior=history[history.length-1];
  if(!prior&&(card.deferredDebitDay!=null||card.deferredClosingDay!=null))
   throw Error('Ancien calendrier sans prise d’effet : revue bancaire requise.');
  if(prior&&(
    (card.deferredDebitDay!=null&&dayNumber(card.deferredDebitDay,true)!==prior.debitDay)||
    (card.deferredClosingDay!=null&&dayNumber(card.deferredClosingDay)!==prior.closingDay)))
   throw Error('Historique et calendrier actuel contradictoires.');
  if(prior?.effectiveDate>today)
   throw Error('Une modification future attend déjà une revue.');
  const debit=dayNumber(debitDay,true),closing=dayNumber(closingDay);
  let openCycleCloses=null;
  if(prior?.closingDay){
   let y=Number(today.slice(0,4)),m=Number(today.slice(5,7));
   let cutoff=monthDay(y,m,prior.closingDay);
   if(cutoff<today){
    const next=addMonth(y,m);y=next.year;m=next.month;
    cutoff=monthDay(y,m,prior.closingDay);
   }
   openCycleCloses=cutoff;
   if(start<=cutoff)
    throw Error('La nouvelle règle doit commencer après la clôture du cycle ouvert.');
  }
  const version={effectiveDate:start,debitDay:debit,closingDay:closing};
  return{cardAccountId:card.id,owner:card.owner,effectiveDate:start,
   currentCycleCloses:openCycleCloses,versions:[...history,version],
   proposedVersion:version,persistable:false,confirmed:false,
   writes:0,financialChanges:0};
 };
 const scheduleForPurchase=({card,purchaseDate}={})=>{
  frenchDeferred(card);
  const purchased=date(purchaseDate);
  if(!purchased)throw Error('Date d’achat invalide.');
  const active=scheduleVersions(card).filter(x=>x.effectiveDate<=purchased).slice(-1)[0];
  if(!active)return{purchaseDate:purchased,versionEffectiveDate:null,
   cutoffDate:null,nextDebitDate:null,dueDate:null,allocationVerified:false,
   reason:'no_dated_configuration'};
  const forecast=monthlyDebitSchedule({purchaseDate:purchased,
   debitDay:active.debitDay,closingDay:active.closingDay});
  return{purchaseDate:purchased,versionEffectiveDate:active.effectiveDate,
   ...forecast,reason:forecast.allocationVerified?
    'effective_calendar_projection':'closing_day_not_configured'};
 };

 const month=d=>d.slice(0,7);
 const amount=v=>v/100;
 function simulate({card,checking,purchases=[],refunds=[],fees=[],settlements=[],asOfDate}={}){
  if(!card||!checking||card.type!=='card'||card.paymentMode!=='deferred'||
     checking.type!=='checking'||!card.id||!checking.id||
     card.id===checking.id||card.settlementAccountId!==checking.id||
     card.owner!==checking.owner||!card.owner||
     card.country!==checking.country||!card.country||
     !allowed.includes(String(card.currency||'').toUpperCase())||
     String(card.currency).toUpperCase()!==String(checking.currency).toUpperCase())
   throw Error('Carte différée et compte de règlement incompatibles.');
  if(!date(asOfDate))throw Error('Date de situation invalide.');
  if(!Array.isArray(purchases)||!Array.isArray(refunds)||!Array.isArray(fees)||
     !Array.isArray(settlements)||purchases.length>5000||refunds.length>5000||
     fees.length>5000||settlements.length>5000)
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
  // A card fee is an explicit native-currency card charge, not an implicit
  // surcharge on the checking-bank transfer. Taxes must be included in amount;
  // separate tax/FX/payment charges are blocked until itemized and reconciled.
  const feesByDue=new Map(),feeRecords=[],feeById=new Map();
  const feeKeys=new Set(['id','type','cardAccountId','currency','chargeDate',
   'budgetDate','dueDate','amount','status']);
  for(const f of fees){
   const id=String(f?.id??'').trim(),minor=cents(f?.amount),
    chargeDate=date(f?.chargeDate),budgetDate=date(f?.budgetDate),
    dueDate=date(f?.dueDate);
   if(!id||seen.has('f:'+id)||minor===null||!chargeDate||!budgetDate||!dueDate||
      chargeDate>dueDate||budgetDate<chargeDate||budgetDate>dueDate||
      f.type!=='card_fee'||!['confirmed','pending'].includes(f.status)||
      f.cardAccountId!==card.id||String(f.currency).toUpperCase()!==currency||
      Object.keys(f).some(k=>!feeKeys.has(k)))
    throw Error('Frais de carte différée ambigus : montant, date, compte, devise ou statut.');
   seen.add('f:'+id);
   const record={id,chargeDate,budgetDate,dueDate,cents:minor,status:f.status};
   feeRecords.push(record);feeById.set(id,record);
   if(!feesByDue.has(dueDate))feesByDue.set(dueDate,[]);
   feesByDue.get(dueDate).push(record);
  }
  const settlementBatches=new Map(),settlementRecords=[],sourceLines=new Set();
  const settlementKeys=new Set(['id','amount','debitDate','purchaseIds',
   'feeIds','status','cardAccountId','checkingAccountId','currency',
   'type','settlementMode','allocationDueDate','bankEvidence']);
  const evidenceKeys=new Set(['statementId','lineId','accountId',
   'currency','direction','amount','debitDate','status','reviewed']);
  for(const s of settlements){
   const id=String(s?.id??'').trim(),minor=cents(s?.amount),
    when=date(s?.debitDate),refs=s?.purchaseIds,feeRefs=s?.feeIds??[],
    mode=s?.settlementMode??'full';
   if(!id||seen.has('s:'+id)||!when||minor===null||
      !['confirmed','pending'].includes(s.status)||
      s.cardAccountId!==card.id||s.checkingAccountId!==checking.id||
      String(s.currency).toUpperCase()!==currency||
      (s.type&&!['transfer','deferred_settlement'].includes(s.type))||
      s.feeAmount!==undefined||s.refundAmount!==undefined||
      !['full','partial'].includes(mode)||
      Object.keys(s).some(k=>!settlementKeys.has(k))||
      !Array.isArray(refs)||!Array.isArray(feeRefs)||
      (!refs.length&&!feeRefs.length))
    throw Error('Règlement différé invalide : montant, compte, statut ou justificatif.');
   seen.add('s:'+id);
   // A partial payment must explicitly nominate ONE due batch and a matching
   // bank-statement debit. Client-reviewed metadata is NOT bank certification.
   if(mode==='partial'){
    const e=s.bankEvidence;
    if(s.allocationDueDate===undefined||!date(s.allocationDueDate)||
       !e||typeof e!=='object'||Array.isArray(e)||
       Object.keys(e).some(k=>!evidenceKeys.has(k))||
       !String(e.statementId??'').trim()||!String(e.lineId??'').trim()||
       e.accountId!==checking.id||
       String(e.currency).toUpperCase()!==currency||
       e.direction!=='debit'||cents(e.amount)!==minor||
       e.debitDate!==when||e.status!==s.status||
       e.reviewed!==(s.status==='confirmed'))
     throw Error('Règlement partiel sans preuve bancaire explicite cohérente et revue.');
    const key=JSON.stringify([checking.id,e.statementId,e.lineId]);
    if(sourceLines.has(key))
     throw Error('Ligne bancaire réutilisée pour plusieurs règlements.');
    sourceLines.add(key);
   }else if(s.allocationDueDate!==undefined||s.bankEvidence!==undefined)
    throw Error('Mode de règlement complet avec champs partiels ambigus.');
   const uniqueRefs=new Set(refs),uniqueFees=new Set(feeRefs);
   if(uniqueRefs.size!==refs.length||uniqueFees.size!==feeRefs.length)
    throw Error('Un identifiant est cité deux fois dans le règlement.');
   const lines=refs.map(pid=>byId.get(pid));
   const feeLines=feeRefs.map(fid=>feeById.get(fid));
   if(lines.some(x=>!x)||feeLines.some(x=>!x))
    throw Error('Règlement lié à un achat ou des frais introuvables.');
   const due=lines[0]?.dueDate??feeLines[0].dueDate;
   if(mode==='partial'&&s.allocationDueDate!==due)
    throw Error('Échéance explicitement allouée différente du lot.');
   if(lines.some(x=>x.dueDate!==due||x.purchaseDate>when)||
      feeLines.some(x=>x.dueDate!==due||x.chargeDate>when))
    throw Error('Règlement lié à plusieurs échéances ou antérieur à une charge.');
   const batch=byDue.get(due)||[],feeBatch=feesByDue.get(due)||[];
   if(batch.length!==refs.length||batch.some(x=>!uniqueRefs.has(x.id))||
      feeBatch.length!==feeRefs.length||feeBatch.some(x=>!uniqueFees.has(x.id)))
    throw Error('Un règlement doit couvrir le lot complet, frais explicites inclus.');
   if(feeBatch.some(x=>x.status!=='confirmed'))
    throw Error('Frais en attente : règlement non certifiable avant revue.');
   if(batch.some(p=>(refundsByPurchase.get(p.id)||[]).some(r=>r.refundDate>when)))
    throw Error('Remboursement postérieur au règlement : rapprochement spécifique requis.');
   const total=batch.reduce((n,x)=>n+x.cents-creditedFor(x,when),0)+
    feeBatch.reduce((n,f)=>n+f.cents,0);
   if(mode==='full'&&minor!==total)
    throw Error('Montant du règlement différent du net des achats à l’échéance.');
   const existing=settlementBatches.get(due);
   if(existing&&(mode!=='partial'||existing.mode!=='partial'))
    throw Error('Règlement répété ou modes mélangés sur la même échéance.');
   const group=existing||{mode,records:[],reservedCents:0};
   if(group.reservedCents+minor>total)
    throw Error('Total des règlements partiels supérieur au solde du lot.');
   group.reservedCents+=minor;
   const settlement={id,debitDate:when,dueDate:due,cents:minor,
    status:s.status,mode,purchaseIds:refs.slice(),feeIds:feeRefs.slice(),
    bankSource:mode==='partial'?{
     statementId:String(s.bankEvidence.statementId),lineId:String(s.bankEvidence.lineId),
     reviewed:s.bankEvidence.reviewed
    }:null};
   group.records.push(settlement);
   settlementBatches.set(due,group);
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
  let purchasedCents=0,paidCents=0,pendingDueCents=0,refundedCents=0,chargedFeesCents=0;
  const budgetFees=[];
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
  for(const f of feeRecords)if(f.status==='confirmed'&&f.chargeDate<=asOfDate){
   chargedFeesCents+=f.cents;
   budgetByMonth[month(f.budgetDate)]=(budgetByMonth[month(f.budgetDate)]||0)+f.cents;
   budgetFees.push({id:f.id,cardAccountId:card.id,chargeDate:f.chargeDate,
    budgetDate:f.budgetDate,dueDate:f.dueDate,amount:amount(f.cents),
    currency,budgetExpense:true,budgetIncome:false,checkingMovement:0});
  }
  for(const p of byId.values())if(p.purchaseDate<=asOfDate)purchasedCents+=p.cents;
  for(const s of settlementRecords)if(s.status==='confirmed'&&s.debitDate<=asOfDate)
   paidCents+=s.cents;
  if(paidCents>purchasedCents+chargedFeesCents-refundedCents)
   throw Error('Solde différé impossible : règlement supérieur au net des charges.');
  for(const due of new Set([...byDue.keys(),...feesByDue.keys()])){
   const lines=byDue.get(due)||[];
   const applicable=lines.filter(x=>x.purchaseDate<=asOfDate);
   const applicableFees=(feesByDue.get(due)||[]).filter(f=>
    f.status==='confirmed'&&f.chargeDate<=asOfDate);
   if(!applicable.length&&!applicableFees.length)continue;
   const gross=applicable.reduce((n,x)=>n+x.cents,0),
    cardCredits=applicable.reduce((n,x)=>n+creditedFor(x,asOfDate),0),
    feeTotal=applicableFees.reduce((n,x)=>n+x.cents,0),
    total=gross-cardCredits+feeTotal,
    matched=settlementRecords.filter(s=>s.dueDate===due),
    confirmed=matched.filter(s=>s.status==='confirmed'&&s.debitDate<=asOfDate),
    pending=matched.filter(s=>s.status==='pending'&&s.debitDate<=asOfDate),
    confirmedCents=confirmed.reduce((n,s)=>n+s.cents,0),
    remaining=total-confirmedCents,
    hasPending=pending.length>0,
    dueUnpaid=due<=asOfDate&&remaining>0;
   if(remaining<0)
    throw Error('Solde différé impossible : règlement excédentaire par échéance.');
   if(dueUnpaid)pendingDueCents+=remaining;
   const paid=confirmedCents>0,complete=remaining===0;
   dueBatches.push({dueDate:due,amount:amount(total),grossAmount:amount(gross),
    confirmedRefunds:amount(cardCredits),confirmedFees:amount(feeTotal),currency,
    feeIds:applicableFees.map(x=>x.id),
    purchaseIds:applicable.map(x=>x.id),
    paidAmount:amount(confirmedCents),remainingAmount:amount(remaining),
    pendingAmount:amount(pending.reduce((n,s)=>n+s.cents,0)),
    confirmedSettlementIds:confirmed.map(s=>s.id),
    pendingSettlementIds:pending.map(s=>s.id),
    status:complete?(paid?'settled':'cleared_by_refund'):
     paid?(hasPending?'partially_settled_pending_review':'partially_settled'):
     hasPending?'pending_review':
     dueUnpaid?'overdue':'scheduled',
    actualDebitDate:confirmed.length?
     confirmed.map(s=>s.debitDate).sort().slice(-1)[0]:null,
    confirmedSettlementId:complete&&confirmed.length===1?confirmed[0].id:null});
  }
  dueBatches.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  return{cardAccountId:card.id,checkingAccountId:checking.id,currency,asOfDate,
   budgetExpenses:spendItems,budgetRefunds,budgetFees,monthlyBudget:Object.fromEntries(
    Object.entries(budgetByMonth).map(([key,v])=>[key,amount(v)])),
   batches:dueBatches,
   liability:amount(purchasedCents+chargedFeesCents-refundedCents-paidCents),
   overdue:amount(pendingDueCents),
   checkingBalanceChange:paidCents?amount(-paidCents):0,
   cardBalanceChange:amount(-purchasedCents-chargedFeesCents+refundedCents+paidCents),
   merchantRefunds:budgetRefunds.map(r=>({...r,cardAccountId:card.id,internalTransfer:false})),
   bankTransfers:settlementRecords.filter(s=>s.status==='confirmed'&&s.debitDate<=asOfDate)
    .map(s=>({id:s.id,accountId:checking.id,toAccountId:card.id,
     debitDate:s.debitDate,amount:amount(s.cents),currency,
     budgetExpense:false,budgetIncome:false,internalTransfer:true,
     dueDate:s.dueDate,settlementMode:s.mode,
     bankSource:s.bankSource})),
   writes:0,financialChanges:0};
 }
 // Read-only, ONE deferred card. A supplied TRACE account estimate is not
 // a certified bank balance. No ledger mutation or payment can occur here.
 function projectCheckingBalance({checkingBalance,...scenario}={}){
  const n=checkingBalance,minor=typeof n==='number'?Math.round(n*100):NaN;
  if(!Number.isFinite(n)||Math.abs(n)>1e7||
     !Number.isSafeInteger(minor)||Math.abs(n*100-minor)>=1e-6)
   throw Error('Solde courant natif exact et vérifiable requis.');
  const r=simulate(scenario),unpaid=Math.round(r.liability*100);
  const batched=r.batches.reduce((sum,b)=>{
   const c=Math.round(b.remainingAmount*100);
   if(!Number.isSafeInteger(c)||c<0||
      Math.abs(b.remainingAmount*100-c)>=1e-6)
    throw Error('Échéance différée incohérente.');
   return sum+c;
  },0);
  if(!Number.isSafeInteger(unpaid)||unpaid<0||unpaid!==batched)
   throw Error('Dette différée non rapprochable aux échéances.');
  const after=minor-unpaid;
  if(!Number.isSafeInteger(after)||Math.abs(after)>1e9)
   throw Error('Solde prévisionnel hors limite de sécurité.');
  return{cardAccountId:r.cardAccountId,checkingAccountId:r.checkingAccountId,
   currency:r.currency,asOfDate:r.asOfDate,
   checkingBalance:minor/100,deferredUnpaid:unpaid/100,
   projectedCheckingBalance:after/100,overdue:r.overdue,
   scheduledDebits:r.batches.filter(b=>b.remainingAmount>0).map(b=>({
    dueDate:b.dueDate,remainingAmount:b.remainingAmount,status:b.status
   })),
   scope:'single_deferred_card',balanceSource:'trace_estimate_unverified',
   writes:0,financialChanges:0};
 }
 root.TraceDeferredDebit=Object.freeze({simulate,monthlyDebitSchedule,projectCheckingBalance,proposeScheduleRevision,scheduleForPurchase});
})(typeof window!=='undefined'?window:globalThis);
