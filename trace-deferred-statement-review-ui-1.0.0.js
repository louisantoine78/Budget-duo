/* TRACE 5.37.0 — candidate PREVIEW-ONLY PDF statement -> deferred proof UI.
 * All money lines are manually reviewed before being classified.
 * Physical file identity is SHA-256 of LOCAL bytes; no upload, storage,
 * transfer, pending/confirmed status change or financial write.
 * A SHA-256 is document identification, not bank authentication.
 */
(function(root){'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const preview=()=>root.__TRACE_INTERNATIONAL_PREVIEW__===true&&
  String(root.location?.pathname||'').split('/').pop()==='trace-international-preview.html';
 const choices={
  card:{out:[['card_purchase','Achat sur la carte'],['card_fee','Frais de carte']],
   in:[['card_refund','Remboursement commerçant'],['card_payment','Paiement reçu sur la carte']]},
  checking:{out:[['checking_debit','Débit du compte courant']],
   in:[['checking_credit','Crédit sur le compte courant']]}
 };
 const warning='Aucune transaction créée. Justificatif local non authentifié, sans autorisation bancaire ni serveur.';
 const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 async function digest(file){
  if(!file||!Number.isSafeInteger(file.size)||file.size<5||
     file.size>12*1024*1024||!/\.pdf$/i.test(String(file.name||''))||
     (file.type&&file.type!=='application/pdf')||
     typeof file.arrayBuffer!=='function'||!root.crypto?.subtle?.digest)
   throw Error('PDF local ou empreinte SHA-256 indisponible.');
  const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);
  if(bytes.byteLength!==file.size||
    String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')
   throw Error('Fichier PDF modifié ou signature invalide.');
  return hex(await root.crypto.subtle.digest('SHA-256',buffer));
 }
 function mount({host,staged,approvals,file,account,active}={}){
  if(!preview()||!host||typeof host.querySelectorAll!=='function'||
     typeof active!=='function'||!file||!staged||
     !['card','checking'].includes(account?.type)||!root.TraceDeferredStatementBridge?.convert||
     !root.TraceStatementEvidence?.reviewedRows)return null;
  const kind=account.type,currency=String(account.currency||'CAD').toUpperCase();
  if(account.id!==staged.accountId||currency!==staged.currency||
     !Array.isArray(staged.ready)||staged.ready.length===0||
     staged.issues?.length||!active())return null;
  let chosenStatement=null,busy=false;
  host.innerHTML='<div class="trace-statement-stage" data-local-deferred-review>'+
   '<h3>Préparer un justificatif pour débit différé</h3>'+
   '<p>Étape facultative en laboratoire : classe chaque ligne du PDF déjà relue. '+
   'Ce contrôle ne rapproche pas encore une carte à son paiement et ne crée aucun mouvement.</p>'+
   staged.ready.map((r,i)=>{
    const select='<select class="input" data-deferred-classify="'+i+'">'+
     '<option value="">Choisir la nature de la ligne</option>'+
     (choices[kind][r.direction]||[]).map(([code,label])=>
      '<option value="'+esc(code)+'">'+esc(label)+'</option>').join('')+'</select>';
    return '<label class="trace-statement-confirm"><span><b>Page '+esc(r.page)+
      ', ligne '+esc(r.line)+' · '+esc(r.date)+' · '+
      esc(r.amount)+' '+esc(currency)+'</b><small>'+esc(r.rawText)+
      '</small>'+select+'</span></label>';
   }).join('')+
   '<label class="trace-statement-attest"><input type="checkbox" data-deferred-complete>'+
   '<span>Je confirme avoir contrôlé tout le relevé original, le nombre de lignes, '+
   'leur sens et leur classification. Cela ne prouve pas que la banque a authentifié le document.</span></label>'+
   '<button class="secondary full" type="button" data-deferred-prepare>'+
   'Préparer le justificatif local (sans enregistrer)</button>'+
   '<p data-deferred-result role="status" aria-live="polite">'+esc(warning)+'</p></div>';
  const get=s=>host.querySelector(s),button=get('[data-deferred-prepare]'),
   result=get('[data-deferred-result]'),attestation=get('[data-deferred-complete]');
  const reset=()=>{chosenStatement=null;result.textContent=warning;};
  const valid=()=>preview()&&active()&&
   account.id===staged.accountId&&currency===staged.currency;
  // A reclassification or withdrawn completeness approval always invalidates
  // any previously prepared local result.
  host.addEventListener('change',reset);
  host.addEventListener('input',reset);
  button.onclick=async()=>{
   if(busy)return;
   reset();
   if(!valid()){result.textContent='Document modifié : reprends la revue du PDF.';return;}
   const selectors=[...host.querySelectorAll('[data-deferred-classify]')];
   if(selectors.length!==staged.ready.length||!attestation.checked||
      selectors.some(x=>!x.value)){
    result.textContent='Classe toutes les lignes et confirme la relecture complète.';return;
   }
   const snapshot=staged.statementKey,chosen=selectors.map(x=>x.value);
   const approvalsSnapshot=approvals.map(x=>({...x}));
   busy=true;button.disabled=true;
   try{
    const fingerprint=await digest(file);
    if(!valid()||snapshot!==staged.statementKey||
       selectors.some((x,i)=>x.value!==chosen[i])||!attestation.checked)
     throw Error('Relevé ou classification modifié : recommence.');
    const proposal=root.TraceDeferredStatementBridge.convert({
     staged,approvals:approvalsSnapshot,accountKind:kind,
     sourceType:'pdf_extracted',sourceId:'sha256:'+fingerprint,
     importId:'local-pdf:'+fingerprint,
     classifications:staged.ready.map((r,i)=>({
      id:r.id,evidenceKey:r.evidenceKey,statementKey:snapshot,
      kind:chosen[i],confirmed:true,posted:true})),
     completeness:{confirmed:true,statementKey:snapshot,
      expectedRows:staged.totalRows,reviewedBy:String(account.owner||'local-reviewer')}
    });
    if(proposal.status!=='local_document_ready'||proposal.persistable!==false||
       proposal.writes!==0||proposal.bankAuthenticated!==false||
       !proposal.statement)throw Error(proposal.reason||'Justificatif incomplet.');
    chosenStatement=proposal.statement;
    result.textContent='Justificatif local préparé : '+chosenStatement.rows.length+
     ' ligne(s), devise '+currency+'. '+warning;
   }catch(e){reset();result.textContent=String(e?.message||'Revue interrompue.');}
   finally{busy=false;button.disabled=false;}
  };
  return Object.freeze({getLocalStatement:()=>valid()&&!busy?chosenStatement:null,
   clear:reset});
 }
 root.TraceDeferredStatementReviewUI=Object.freeze({mount,digest});
})(typeof window!=='undefined'?window:globalThis);
