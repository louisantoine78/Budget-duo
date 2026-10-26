/* TRACE 5.37.0 — interactive, fictional-only deferred debit laboratory.
 * Loaded only by trace-international-preview.html. Never posts or mutates ledgers.
 */
(function(root){'use strict';
 if(!root.__TRACE_INTERNATIONAL_PREVIEW__||
  String(root.location?.pathname||'').split('/').pop()!=='trace-international-preview.html')return;
 const isoAmount=v=>{
  const raw=String(v??'').trim().replace(',','.');
  if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(raw))throw Error('Montant invalide : deux décimales maximum.');
  const n=Number(raw);
  if(n<=0||n>1e6)throw Error('Montant de règlement hors limites.');
  return n;
 };
 const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
 function mount(){
  const d=root.document,get=id=>d.getElementById(id);
  const container=get('traceDeferredSandbox'),amount=get('traceDeferredAmount'),
   pending=get('traceDeferredPending'),withFee=get('traceDeferredFee'),
   withRefund=get('traceDeferredRefund'),
   actualDate=get('traceDeferredActualDate'),dateNote=get('traceDeferredDates'),
   run=get('traceDeferredRun'),
   review=get('traceDeferredReview'),budget=get('traceDeferredBudget'),
   paid=get('traceDeferredPaid'),remaining=get('traceDeferredRemaining'),
   transfer=get('traceDeferredBank'),message=get('traceDeferredMessage');
  if(!container||!amount||!pending||!withFee||!withRefund||!run||
     !review||!budget||!paid||!remaining||!transfer||!message||
   !actualDate||!dateNote)return;
  const engine=root.TraceDeferredDebit?.simulate,
   comparator=root.TraceDeferredBankReview;
  if(typeof engine!=='function'||typeof comparator?.compare!=='function'){
   message.textContent='Modules financiers fictifs indisponibles.';
   review.disabled=true;return;
  }
  const card={id:'lab-deferred-eur',type:'card',paymentMode:'deferred',
   settlementAccountId:'lab-checking-eur',currency:'EUR',country:'FR',owner:'demo'},
   checking={id:'lab-checking-eur',type:'checking',currency:'EUR',country:'FR',owner:'demo'},
   purchase={id:'demo-purchase',cardAccountId:card.id,currency:'EUR',
    purchaseDate:'2026-10-12',budgetDate:'2026-10-12',dueDate:'2026-11-05',
    amount:'40.00',status:'confirmed',name:'Courses — exemple'},
   fee={id:'demo-fee',type:'card_fee',cardAccountId:card.id,currency:'EUR',
    chargeDate:'2026-10-18',budgetDate:'2026-10-18',dueDate:'2026-11-05',
    amount:'2.30',status:'confirmed'},
   refund={id:'demo-refund',type:'merchant_refund',purchaseId:purchase.id,
    cardAccountId:card.id,currency:'EUR',refundDate:'2026-10-20',
    budgetDate:'2026-10-20',amount:'10.01',status:'confirmed'};
  const resetOutputs=()=>{
   budget.textContent='—';paid.textContent='—';remaining.textContent='—';
   transfer.textContent='—';
  };
  function simulate(manualReview){
   try{
    const value=isoAmount(amount.value),isPending=!!pending.checked,
     actual=String(actualDate.value||''),
     parsed=/^\d{4}-\d{2}-\d{2}$/.test(actual)?
      new Date(actual+'T12:00:00Z'):null;
    if(!parsed||!Number.isFinite(+parsed)||
       parsed.toISOString().slice(0,10)!==actual||
       actual<purchase.purchaseDate)
     throw Error('Date réelle invalide ou antérieure à l’achat fictif.');
    const deviation=Math.round((Date.parse(actual+'T12:00:00Z')-
     Date.parse('2026-11-05T12:00:00Z'))/86400000);
    const month=actual.slice(0,7),
     year=Number(actual.slice(0,4)),number=Number(actual.slice(5,7)),
     monthLast=new Date(Date.UTC(year,number,0)).getUTCDate(),
     monthEnd=month+'-'+String(monthLast).padStart(2,'0'),
     fees=withFee.checked?[fee]:[],refunds=withRefund.checked?[refund]:[],
     max=40+(withFee.checked?2.30:0)-(withRefund.checked?10.01:0);
    if(Math.round(value*100)>Math.round(max*100))
     throw Error('Ce paiement dépasse le montant dû : '+euro(max)+'.');
    const status=isPending?'pending':'confirmed',
     evidence={statementId:'demo-statement',lineId:'demo-line',
      accountId:checking.id,currency:'EUR',direction:'debit',
      amount:value,debitDate:actual,status,reviewed:!isPending},
     settlement={id:'demo-payment',type:'transfer',settlementMode:'partial',
      allocationDueDate:'2026-11-05',cardAccountId:card.id,
      checkingAccountId:checking.id,currency:'EUR',debitDate:actual,
      status,amount:value,purchaseIds:[purchase.id],
      feeIds:fees.map(f=>f.id),bankEvidence:evidence},
     result=engine({card,checking,purchases:[purchase],fees,refunds,
      settlements:[settlement],asOfDate:actual}),
     statement={statementId:'demo-statement',importId:'demo-import',
      sourceId:'demo-physical-pdf',sourceVersion:'demo-version-v1',
      sourceType:'pdf_extracted',accountId:checking.id,currency:'EUR',
      fromDate:month+'-01',toDate:monthEnd,complete:true,
      rows:[{lineId:'demo-line',debitDate:actual,direction:'debit',
       amount:value,status,sourcePage:1,originalText:'Extrait fictif'}]},
     receipts=manualReview&&!isPending?[{
      settlementId:settlement.id,approved:true,
      snapshot:comparator.reviewSnapshot({statement,settlement})}]:[],
     check=comparator.compare({statements:[statement],
      settlements:[settlement],reviews:receipts});
    budget.textContent=euro(result.monthlyBudget['2026-10']||0);
    paid.textContent=euro(result.batches[0].paidAmount);
    remaining.textContent=euro(result.batches[0].remainingAmount);
    transfer.textContent=euro(result.checkingBalanceChange);
    dateNote.textContent='Échéance prévue : 2026-11-05 · relevé fictif : '+
     actual+' · '+(deviation===0?'aucun décalage':
      (deviation>0?'+':'')+deviation+' jour(s)')+
     '. Aucune date bancaire inventée ni mouvement enregistré.';
    message.textContent=isPending?
     'Paiement en attente : le compte courant et la dette restent inchangés.':
     check.cases[0].status==='manual_review_current'?
     'Revue fictive cohérente. Aucune confirmation bancaire, aucune écriture ajoutée.':
     'Ligne fictive trouvée : revue humaine requise, aucune confirmation automatique.';
    review.disabled=isPending;
    container.dataset.simulated='true';
    container.dataset.reviewStatus=check.cases[0].status;
   }catch(error){
    resetOutputs();
    review.disabled=true;container.dataset.simulated='false';
    container.dataset.reviewStatus='invalid';
    message.textContent=String(error?.message||'Simulation impossible.');
   }
  }
  run.addEventListener('click',()=>simulate(false));
  review.addEventListener('click',()=>simulate(true));
  for(const control of [amount,pending,withFee,withRefund,actualDate])
   control.addEventListener('change',()=>simulate(false));
  simulate(false);
 }
 if(root.document?.readyState==='loading')
  root.document.addEventListener('DOMContentLoaded',mount);
 else mount();
})(window);
