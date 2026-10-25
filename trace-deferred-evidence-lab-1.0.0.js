/* TRACE 5.37.0: FICTIONAL preview only. Dual-source evidence demo.
 * Uses already-structured mock CSV/PDF lines. Never fetches, persists,
 * authenticates, or confirms any real operation. */
(function(root){'use strict';
 if(!root.__TRACE_INTERNATIONAL_PREVIEW__||
  String(root.location?.pathname||'').split('/').pop()!==
   'trace-international-preview.html')return;
 function mount(){
  const d=root.document,sandbox=d?.getElementById('traceDeferredSandbox');
  if(!sandbox||typeof d.createElement!=='function')return;
  const section=d.createElement('section');
  section.className='card';section.id='traceDeferredDualEvidenceLab';
  section.setAttribute('aria-label','Revue fictive distincte des justificatifs');
  section.style.marginTop='16px';
  section.innerHTML='<h3>Deux justificatifs, deux contrôles</h3>'+
   '<p class="sub">Exemple fictif : achat de 40,00 € sur la carte et prélèvement partiel de 12,35 € sur le compte courant. Relevés PDF/CSV déjà structurés, sans import bancaire ni écriture.</p>'+
   '<div class="grid grid-2" style="margin:12px 0">'+
   '<div class="statbox"><span>Preuve de l’achat (carte)</span><b id="tracePurchaseEvidenceStatus">—</b></div>'+
   '<div class="statbox"><span>Preuve du prélèvement (courant)</span><b id="traceCheckingEvidenceStatus">—</b></div></div>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
   '<button type="button" class="secondary" id="traceReviewPurchase">Comparer l’achat</button>'+
   '<button type="button" class="secondary" id="traceReviewChecking">Comparer le prélèvement</button>'+
   '<button type="button" class="secondary" id="traceChangePurchaseSource">Modifier le relevé carte fictif</button>'+
   '<button type="button" class="secondary" id="traceChangeCheckingSource">Modifier le relevé courant fictif</button></div>'+
   '<p class="sub" id="traceDeferredEvidenceMessage" role="status" aria-live="polite">Aucune preuve ne permet de confirmer une transaction.</p>';
  sandbox.after(section);
  const get=id=>d.getElementById(id);
  const set=(id,t)=>{get(id).textContent=t;};
  const unavailable=reason=>{
   section.dataset.reviewState='invalid';
   set('traceDeferredEvidenceMessage','Revue indisponible : '+reason);
   for(const id of ['traceReviewPurchase','traceReviewChecking',
      'traceChangePurchaseSource','traceChangeCheckingSource'])get(id).disabled=true;
  };
  if(!root.TraceInternational?.resolveBooking||
   !root.TraceDeferredDebit?.simulate||
   !root.TraceDeferredWritePlan?.prepare||
   !root.TraceDeferredPurchaseEvidence?.review||
   !root.TraceDeferredBankReview?.reviewSnapshot||
   !root.TraceDeferredEvidenceIntake?.review){
   unavailable('contrôleurs requis absents.');return;
  }
  try{
   const card={id:'card-eur-demo',owner:'la',type:'card',currency:'EUR',
    country:'FR',paymentMode:'deferred',settlementAccountId:'current-eur-demo'},
    checking={id:'current-eur-demo',owner:'la',type:'checking',currency:'EUR',country:'FR'},
    plan=root.TraceDeferredWritePlan.prepare({card,checking,owner:'la',
     fields:{id:'deferred_demo_purchase_1',name:'Courses de démonstration',
      amount:'40,00',purchaseDate:'2026-10-12',budgetDate:'2026-11-01',
      dueDate:'2026-12-05',categoryId:'food'},
     quote:{currency:'EUR',cadPerUnit:1.6,date:'2026-10-12',source:'Taux fictif'},
     categories:[{id:'food',type:'expense',archived:false}],
     existingTransactions:[]}),
    cardDocument={statementId:'card-doc',importId:'card-import',
     sourceId:'physical-card',sourceVersion:'card-v1',sourceType:'pdf_extracted',
     complete:true,accountId:card.id,currency:'EUR',
     fromDate:'2026-10-01',toDate:'2026-10-31',
     rows:[{lineId:'purchase-line',type:'card_purchase',
      purchaseDate:'2026-10-12',direction:'debit',status:'confirmed',amount:'40.00'},
      {lineId:'refund-line',type:'card_refund',debitDate:'2026-10-19',
       direction:'credit',status:'confirmed',amount:'3.00'}]},
    bankDocument={statementId:'checking-doc',importId:'checking-import',
     sourceId:'physical-checking',sourceVersion:'checking-v1',sourceType:'csv',
     complete:true,accountId:checking.id,currency:'EUR',
     fromDate:'2026-12-01',toDate:'2026-12-31',
     rows:[{lineId:'debit-line',debitDate:'2026-12-05',direction:'debit',
      amount:'12.35',status:'confirmed'}]},
    settlement={id:'settlement-partial-demo',settlementMode:'partial',
     cardAccountId:card.id,checkingAccountId:checking.id,currency:'EUR',
     debitDate:'2026-12-05',allocationDueDate:'2026-12-05',
     amount:'12.35',status:'confirmed',purchaseIds:[plan.document.id],feeIds:[],
     bankEvidence:{statementId:'checking-doc',lineId:'debit-line',
      accountId:checking.id,currency:'EUR',direction:'debit',
      amount:'12.35',debitDate:'2026-12-05',status:'confirmed',reviewed:true}};
   let purchaseReceipt=[],settlementReceipt=[];
   const purchaseInputs=()=>({plan,statements:[cardDocument],
    selection:{statementId:'card-doc',lineId:'purchase-line'},receipts:purchaseReceipt,
    otherClaims:[]});
   const run=()=>{
    const results=root.TraceDeferredEvidenceIntake.review({
     plan,checkingAccountId:checking.id,cardStatements:[cardDocument],
     cardSelection:{statementId:'card-doc',lineId:'purchase-line'},
     cardReceipts:purchaseReceipt,checkingStatements:[bankDocument],
     settlements:[settlement],settlementReceipts:settlementReceipt});
    const bankStatus=results.settlementStatuses[0]?.status||'preuve manquante';
    set('tracePurchaseEvidenceStatus',results.purchaseStatus);
    set('traceCheckingEvidenceStatus',bankStatus);
    set('traceDeferredEvidenceMessage',
     'Deux validations locales indépendantes. Aucune identité bancaire / '+
     'autorisation serveur vérifiée ; 0 transaction créée.');
    section.dataset.purchaseStatus=results.purchaseStatus;
    section.dataset.settlementStatus=bankStatus;
    section.dataset.reviewState=results.localEvidenceReviewed?'local-only':'pending';
   };
   get('traceReviewPurchase').addEventListener('click',()=>{
    try{const r=root.TraceDeferredPurchaseEvidence.review(purchaseInputs());
     purchaseReceipt=r.reviewToken?[{planId:plan.document.id,
      reviewedBy:plan.document.payerId,statementId:'card-doc',lineId:'purchase-line',
      approved:true,snapshot:r.reviewToken}]:[];run();}
    catch(e){unavailable(String(e.message||e));}
   });
   get('traceReviewChecking').addEventListener('click',()=>{
    try{const snapshot=root.TraceDeferredBankReview.reviewSnapshot({
     statement:bankDocument,settlement});
     settlementReceipt=[{settlementId:settlement.id,approved:true,snapshot}];run();}
    catch(e){unavailable(String(e.message||e));}
   });
   get('traceChangePurchaseSource').addEventListener('click',()=>{
    cardDocument.sourceVersion+='-edited';run();
   });
   get('traceChangeCheckingSource').addEventListener('click',()=>{
    bankDocument.sourceVersion+='-edited';run();
   });
   run();
  }catch(e){unavailable(String(e?.message||e));}
 }
 if(root.document?.readyState==='loading')
  root.document.addEventListener('DOMContentLoaded',mount);
 else mount();
})(window);
