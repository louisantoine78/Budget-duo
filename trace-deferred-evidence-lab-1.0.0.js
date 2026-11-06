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
   '<p class="sub">Exemple fictif : achat de 40,00 € sur la carte et prélèvement partiel de 12,35 € sur le compte courant. Lignes PDF/CSV structurées puis revues localement, sans import bancaire ni écriture.</p>'+
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
   !root.TraceDeferredEvidenceIntake?.review||
   !root.TraceStatementEvidence?.stage||
   !root.TraceDeferredStatementBridge?.convert){
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
    cardStage=root.TraceStatementEvidence.stage({
     documentId:'card-doc',accountId:card.id,currency:'EUR',
     fromDate:'2026-10-01',toDate:'2026-10-31',
     rows:[{page:1,line:4,rawText:'12/10 Courses fictives 40,00',
      date:'2026-10-12',name:'Courses de démonstration',debit:'40,00'},
      {page:1,line:5,rawText:'19/10 Remboursement fictif 3,00',
       date:'2026-10-19',name:'Remboursement fictif',credit:'3,00'}]}),
    bankStage=root.TraceStatementEvidence.stage({
     documentId:'checking-doc',accountId:checking.id,currency:'EUR',
     fromDate:'2026-12-01',toDate:'2026-12-31',
     rows:[{page:1,line:7,rawText:'05/12 Débit différé 12,35',
      date:'2026-12-05',name:'Règlement fictif',debit:'12,35'}]}),
    toDocument=(stage,accountKind,sourceType,sourceId,kinds)=>{
     const proposed=root.TraceDeferredStatementBridge.convert({
      staged:stage,accountKind,sourceType,sourceId,
      importId:'import-'+sourceId,
      approvals:stage.ready.map(r=>({id:r.id,evidenceKey:r.evidenceKey,
       confirmed:true})),
      classifications:stage.ready.map((r,i)=>({
       id:r.id,evidenceKey:r.evidenceKey,statementKey:stage.statementKey,
       kind:kinds[i],confirmed:true,posted:true})),
      completeness:{confirmed:true,statementKey:stage.statementKey,
       expectedRows:stage.totalRows,reviewedBy:'la'}});
     if(proposed.status!=='local_document_ready')
      throw Error('Justificatif fictif non vérifiable.');
     return proposed.statement;
    },
    cardBaseDocument=toDocument(cardStage,'card','pdf_extracted',
     'physical-card',['card_purchase','card_refund']),
    bankBaseDocument=toDocument(bankStage,'checking','csv',
     'physical-checking',['checking_debit']),
    settlement={id:'settlement-partial-demo',settlementMode:'partial',
     cardAccountId:card.id,checkingAccountId:checking.id,currency:'EUR',
     debitDate:'2026-12-05',allocationDueDate:'2026-12-05',
     amount:'12.35',status:'confirmed',purchaseIds:[plan.document.id],feeIds:[],
     bankEvidence:{statementId:'checking-doc',lineId:bankBaseDocument.rows[0].lineId,
      accountId:checking.id,currency:'EUR',direction:'debit',
      amount:'12.35',debitDate:'2026-12-05',status:'confirmed',reviewed:true}};
   let cardDocument=cardBaseDocument,bankDocument=bankBaseDocument,
    purchaseReceipt=[],settlementReceipt=[];
   const purchaseInputs=()=>({plan,statements:[cardDocument],
    selection:{statementId:'card-doc',lineId:cardDocument.rows[0].lineId},receipts:purchaseReceipt,
    otherClaims:[]});
   const run=()=>{
    const results=root.TraceDeferredEvidenceIntake.review({
     plan,checkingAccountId:checking.id,cardStatements:[cardDocument],
     cardSelection:{statementId:'card-doc',lineId:cardDocument.rows[0].lineId},
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
      reviewedBy:plan.document.payerId,statementId:'card-doc',lineId:cardDocument.rows[0].lineId,
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
    cardDocument={...cardDocument,sourceVersion:cardDocument.sourceVersion+'-edited'};run();
   });
   get('traceChangeCheckingSource').addEventListener('click',()=>{
    bankDocument={...bankDocument,sourceVersion:bankDocument.sourceVersion+'-edited'};run();
   });
   run();
  }catch(e){unavailable(String(e?.message||e));}
 }
 if(root.document?.readyState==='loading')
  root.document.addEventListener('DOMContentLoaded',mount);
 else mount();
})(window);
