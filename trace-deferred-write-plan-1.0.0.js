/* TRACE 5.37.0 — non-persistable deferred purchase document contract.
 * Builds a reviewed PENDING document proposal from native/dated inputs.
 * Does not write, confirm, migrate, insert into state or call any network API.
 * Must remain disabled for financial persistence until CAS/RLS/browser QA.
 */
(function(root){'use strict';
 function prepare({card,checking,owner,fields,quote=null,categories=[],
  existingTransactions=[]}={}){
  const I=root.TraceInternational,D=root.TraceDeferredDebit;
  if(!I?.resolveBooking||typeof D?.simulate!=='function')
   throw Error('Modules de devises et débit différé indisponibles.');
  if(!card||!checking||card.archived||checking.archived||
     card.type!=='card'||card.paymentMode!=='deferred'||
     checking.type!=='checking'||!card.id||!checking.id||
     !owner||card.owner!==owner||checking.owner!==owner||
     card.settlementAccountId!==checking.id||
     card.country!==checking.country||!card.country||
     I.currency(card)!==I.currency(checking))
   throw Error('Carte, titulaire ou compte de règlement incohérent.');
  const id=String(fields?.id||'').trim(),
   name=String(fields?.name||'').trim(),
   date=String(fields?.purchaseDate||''),
   budgetDate=String(fields?.budgetDate||''),
   dueDate=String(fields?.dueDate||''),
   categoryId=String(fields?.categoryId||'').trim();
  if(!/^[A-Za-z0-9_-]{8,96}$/.test(id))
   throw Error('Identifiant unique de préparation requis.');
  if(name.length<2||name.length>85)
   throw Error('Libellé explicite requis, entre 2 et 85 caractères.');
  if(![date,budgetDate,dueDate].every(I.calendarDate)||
     dueDate<date||dueDate<budgetDate)
   throw Error('Dates achat, budget et prélèvement incohérentes.');
  if(!categoryId||!categories.some(c=>c.id===categoryId&&c.type==='expense'&&!c.archived))
   throw Error('Catégorie de dépense active et vérifiée requise.');
  if(!Array.isArray(existingTransactions)||
     existingTransactions.some(t=>t?.id===id))
   throw Error('Identifiant déjà utilisé ou historique illisible.');
  // The 3-date French UI accepts comma decimals; the financial contract
  // normalizes them without changing currency or rounding fractional cents.
  const moneyInput=value=>{
   if(value===null||value===undefined)return value;
   if(typeof value!=='string')return value;
   const raw=value.trim();
   if(!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(raw))
    throw Error('Montant en devise invalide : deux décimales maximum.');
   return raw.replace(',','.');
  };
  const booking=I.resolveBooking({
   account:card,bankAmount:moneyInput(fields?.amount),
   originalCurrency:fields?.purchaseCurrency||I.currency(card),
   originalAmount:moneyInput(fields?.purchaseAmount??null),
   quote,date
  });
  const amount=booking.bankAmount;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  // Human comparison is required when same account/date/name/native amount
  // is already present. Never silently delete, overwrite or auto-approve.
  if(existingTransactions.some(t=>t?.status!=='cancelled'&&
     t?.accountId===card.id&&t?.type==='expense'&&t?.date===date&&
     normalize(t?.name)===normalize(name)&&
     I.amountOnAccount(t,card)===amount))
   throw Error('Achat bancaire similaire déjà présent : comparer les doublons.');
  // Validate the full due-date contract through the independent engine,
  // using ONLY a fictional purchase, no real transactions/refunds/payments.
  const hypothetical=D.simulate({card,checking,asOfDate:date,
   purchases:[{id,type:'deferred_purchase',status:'confirmed',
    cardAccountId:card.id,currency:I.currency(card),
    purchaseDate:date,budgetDate,dueDate,amount}],
   refunds:[],fees:[],settlements:[]});
  if(hypothetical.batches.length!==1||
     hypothetical.bankTransfers.length!==0||
     hypothetical.checkingBalanceChange!==0||
     hypothetical.writes!==0||hypothetical.financialChanges!==0||
     hypothetical.monthlyBudget[budgetDate.slice(0,7)]!==amount)
   throw Error('Préparation refusée : projection financière non neutre.');
  const personalSplit=owner==='la'?{la:100,partner:0}:owner==='partner'?
   {la:0,partner:100}:null;
  if(!personalSplit)throw Error('Titulaire inconnu.');
  const document=Object.freeze({
   id,date,name,note:'',merchant:'',type:'expense',
   deferredKind:'purchase',status:'pending',
   budgetDate,dueDate,
   ...booking,categoryId,accountId:card.id,payerId:owner,
   beneficiary:owner,split:personalSplit,
   splitAmounts:owner==='la'?{la:booking.amountCAD,partner:0}:
    {la:0,partner:booking.amountCAD},
   recurring:false,source:'deferred_candidate',
   deferredBankEvidenceReviewed:false
  });
  return Object.freeze({
   kind:'deferred_write_plan',persistable:false,confirmed:false,
   // Bound at preparation time; no later user-supplied account substitution.
   checkingAccountId:checking.id,
   document,requirements:Object.freeze([
    'Comparer les doublons avec les opérations bancaires importées',
    'Valider les trois dates et les pièces du relevé carte',
    'Faire qualifier les écritures CAS/RLS en base PostgreSQL fictive',
    'Ne jamais créer de revenu ou seconde dépense lors du prélèvement'
   ]),
   impactIfLaterConfirmed:Object.freeze({
    nativeCurrency:I.currency(card),nativeCardLiability:amount,
    referenceCurrency:'CAD',cadBudgetExpense:booking.amountCAD,
    budgetMonth:budgetDate.slice(0,7),checkingDebitNow:0,
    scheduledDebitDate:dueDate
   })
  });
 }
 root.TraceDeferredWritePlan=Object.freeze({prepare});
})(typeof window!=='undefined'?window:globalThis);
