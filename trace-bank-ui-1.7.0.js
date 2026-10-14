(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let pendingFiles=[],preferredDate='',preferredAccount='',batchTotal=0,batchNumber=1;
function nextCapture(){if(pendingFiles.length){const next=pendingFiles.shift();batchNumber++;void readDocument(next);}else{const root=$('#importResult');if(root){const btn=root.querySelector('#goToReview');if(btn)btn.onclick=()=>{document.querySelector('#activityTabs [data-tab="review"]')?.click();};}}}
async function readDocument(file){
 const target=$('#importResult');
 target.innerHTML='<article class="card"><b>Lecture sur cet appareil…</b><div class="empty-note" id="readProgress"></div></article>';
 try{
  const extracted=await window.TraceBankDocuments.extract(file,msg=>{const e=$('#readProgress');if(e)e.textContent=msg;},{hintDate:preferredDate});
  showDocumentReview(file,extracted);
 }catch(error){target.innerHTML='<div class="empty-note">'+esc(error.message)+'</div><button type="button" class="secondary full" id="skipFailedCapture">Ignorer et continuer</button>';$('#skipFailedCapture').onclick=nextCapture;}
}

function showDocumentReview(file,data){
 const root=$('#importResult'),accounts=window.TraceBankBridge.accounts();
 const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
 root.innerHTML='<article class="card trace-smart-import">'+
 '<div class="trace-smart-head"><span class="trace-kicker">'+(batchTotal>1?'CAPTURE '+batchNumber+' SUR '+batchTotal:isPdf?'CONTRÔLE MENSUEL':'IMPORT DE CAPTURE')+'</span>'+
 '<h3>Opérations détectées</h3><p>'+esc(file.name)+'</p></div>'+
 '<label class="label2" for="docAccount">Compte concerné</label>'+
 '<select class="input trace-smart-account" id="docAccount">'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select>'+
 (preferredDate?'<div class="trace-smart-day">Journée du <strong>'+esc(preferredDate)+'</strong> · seules ses transactions seront proposées.</div>':'')+
 '<div id="docRows" aria-live="polite"></div>'+
 '<details class="trace-smart-advanced" id="docAdvanced">'+
 '<summary><span>Une transaction est mal reconnue ?</span><small>Afficher le texte extrait et réanalyser</small></summary>'+
 '<div class="trace-smart-advanced-content"><label class="label2" for="docText">Texte extrait</label>'+
 '<textarea id="docText" class="input" rows="6" style="width:100%;min-height:110px;font-size:16px">'+esc(data.text||'')+'</textarea>'+
 '<label class="label2" for="docFormat">Format de date</label><select id="docFormat" class="input"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select>'+
 '<button type="button" class="secondary full" id="docParse" style="margin-top:9px">Réanalyser le texte corrigé</button></div></details>'+
 '</article>';
 const current=accounts.find(a=>a.id===preferredAccount);
 const card=accounts.find(a=>a.type==='card');
 const chosen=card||current||accounts[0];
 if(chosen)$('#docAccount').value=chosen.id;
 $('#docAccount').onchange=()=>renderCandidateRows(file,data);
 $('#docParse').onclick=()=>renderCandidateRows(file,data);
 renderCandidateRows(file,data);
}
function formatBankDay(iso){
 const m=String(iso||'').match(/^\d{4}-(\d{2})-(\d{2})$/);
 return m?Number(m[2])+'/'+m[1]:String(iso||'');
}
function renderCandidateRows(file,data){
 const importer=window.TraceBankDocuments,bridge=window.TraceBankBridge,raw=$('#docText').value;
 const layoutReady=Array.isArray(data.structuredCandidates)&&data.structuredCandidates.length>0&&raw===data.text;
 const parsed=layoutReady?
 {candidates:data.structuredCandidates,flagged:0,lines:data.structuredCandidates.length,skippedPayments:0}:
 importer.extractCandidates(raw,$('#docFormat').value);
 const accountId=$('#docAccount').value,scoped=Boolean(preferredDate);
 const dayCandidates=scoped?parsed.candidates.filter(r=>r.date===preferredDate):parsed.candidates;
 const skipped=scoped?parsed.candidates.length-dayCandidates.length:0;
 const records=dayCandidates.slice(0,150);
 const statuses=bridge.inspect(records,accountId);
 const actionable=records.filter((r,i)=>statuses[i].status==='missing'&&r.selected&&Number(r.amount)>0).length;
 const uncertain=records.filter(r=>!(Number(r.amount)>0)).length;
 const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
 const node=$('#docRows');
 node.innerHTML='<div class="trace-smart-results">'+
 '<div class="trace-smart-count"><b>'+records.length+' opération'+(records.length>1?'s':'')+' détectée'+(records.length>1?'s':'')+'</b>'+
 '<small>'+esc(scoped?formatBankDay(preferredDate):isPdf?'Relevé bancaire':'Capture bancaire')+'</small></div>'+
 (skipped?'<p class="trace-smart-omitted">'+skipped+' opération(s) d’autres dates ignorée(s) pour ce jour.</p>':'')+
 (uncertain?'<p class="trace-smart-warning">'+uncertain+' montant(s) non reconnu(s) : corrige-les sur les lignes concernées. Aucun montant ne sera inventé.</p>':'')+
 '<div class="trace-smart-rows">'+
 records.map((r,i)=>{
  const status=statuses[i];
  const defaultChecked=status.status==='missing'&&r.selected&&Number(r.amount)>0;
  const stateLabel={missing:'À importer',already:'Déjà présente',possible:'Doublon possible',historical:'Hors solde initial'}[status.status]||'À vérifier';
  const amount=Number(r.amount)>0?Number(r.amount):'';
  const needsAmount=amount==='';
  return '<div class="trace-smart-row'+(status.status==='already'?' trace-smart-duplicate':'')+'" data-record="'+i+'">'+
  '<div class="trace-smart-row-main"><label class="trace-smart-row-check"><input class="docSelected" type="checkbox" '+(defaultChecked?'checked':'')+' aria-label="Sélectionner '+esc(r.name)+'"></label>'+
  '<div class="trace-smart-row-description"><strong>'+esc(r.name)+'</strong>'+
  '<small>'+esc(formatBankDay(r.date))+' · <span class="trace-smart-status">'+esc(stateLabel)+'</span></small></div>'+
  '<div class="trace-smart-row-money"><input class="input docAmount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+esc(amount)+'" placeholder="0,00" aria-label="Montant CAD '+esc(r.name)+'"><small>CAD</small></div></div>'+
  (needsAmount?'<div class="trace-smart-needs">Montant à confirmer sur ta capture.</div>':'')+
  (status.matchName?'<div class="trace-smart-match">Correspond à '+esc(status.matchName)+' ('+esc(status.matchDate)+')</div>':'')+
  '<details class="trace-smart-row-details"><summary>Modifier la date, le libellé ou le type</summary>'+
  '<div class="trace-smart-edit-fields"><label>Date<input class="input docDate" type="date" value="'+esc(r.date)+'"></label>'+
  '<label>Type<select class="input docType"><option value="expense"'+(r.type==='expense'?' selected':'')+'>Dépense</option><option value="income"'+(r.type==='income'?' selected':'')+'>Revenu</option><option value="refund"'+(r.type==='refund'?' selected':'')+'>Remboursement</option></select></label>'+
  '<label class="trace-smart-full">Commerçant<input class="input docName" maxlength="80" value="'+esc(r.name)+'"></label></div></details></div>';
 }).join('')+'</div>'+
 (records.length?'<button type="button" class="primary full trace-smart-confirm" id="docSave">Ajouter les opérations sélectionnées à « À valider »</button>':
 '<div class="trace-smart-empty">Aucune opération'+(scoped?' du '+esc(preferredDate):'')+' reconnue. Si besoin, ouvre « Une transaction est mal reconnue ? » pour corriger le texte, ou essaie une capture plus nette.</div>')+
 '<button type="button" class="secondary full trace-smart-skip" id="docSkip">'+(pendingFiles.length?'Passer à la capture suivante':'Fermer cet import')+'</button>'+
 '<div class="trace-feedback" id="docError" role="status"></div></div>';
 $('#docSkip').onclick=()=>{if(pendingFiles.length)nextCapture();else $('#importResult').innerHTML='<div class="empty-note">Import fermé. Aucune transaction supplémentaire enregistrée.</div>';};
 if(!records.length)return;
 $('#docSave').onclick=async()=>{
  const chosen=[...node.querySelectorAll('[data-record]')].filter(el=>el.querySelector('.docSelected').checked);
  if(!chosen.length){$('#docError').textContent='Sélectionne au moins une opération.';return;}
  const rows=chosen.map(el=>{
   const i=Number(el.dataset.record),st=statuses[i];
   return{date:el.querySelector('.docDate').value,name:el.querySelector('.docName').value.trim(),amount:Number(el.querySelector('.docAmount').value),
    type:el.querySelector('.docType').value,allowPossibleDuplicate:st.status==='possible'};
  });
  if(rows.some(r=>!r.date||!r.name||!Number.isFinite(r.amount)||!(r.amount>0))){$('#docError').textContent='Une ligne sélectionnée a un montant manquant ou invalide. Corrige-le avant de continuer.';return;}
  if(preferredDate&&rows.some(r=>r.date!==preferredDate)){$('#docError').textContent='Cet import concerne uniquement le '+preferredDate+'. Décoche les autres dates.';return;}
  const suspicious=chosen.filter(el=>['possible','already','historical'].includes(statuses[Number(el.dataset.record)].status));
  if(suspicious.length&&!window.confirm(suspicious.length+' opération(s) ressemblantes ou hors période sont sélectionnées. Confirmer l’import en attente de validation ?'))return;
  const btn=$('#docSave');btn.disabled=true;btn.textContent='Enregistrement…';
  try{
   const kind=/\.pdf$/i.test(file.name)||file.type==='application/pdf'?'pdf':'image';
   const result=await bridge.submit(rows,accountId,file.name,kind,preferredDate||null);
   $('#importResult').innerHTML='<div class="trace-import-finished"><b>'+result.added+' opération(s) ajoutée(s) à « À valider »</b>'+
   '<p>'+result.duplicates+' doublon(s) évité(s). '+esc(result.coverageWarning||'')+' Elles ne seront comptées dans le Budget qu’après la validation finale.</p>'+
   '<button type="button" class="secondary full" id="goToReview">Ouvrir « À valider »</button></div>';
   $('#goToReview').onclick=()=>document.querySelector('#activityTabs [data-tab="review"]')?.click();
   if(pendingFiles.length)setTimeout(nextCapture,350);
  }catch(error){btn.disabled=false;btn.textContent='Réessayer';$('#docError').textContent=esc(error.message);}
 };
}

document.addEventListener('change',e=>{
 if(e.target?.id!=='importFile')return;
 const input=e.target,files=[...(input.files||[])];
 if(!files.length||files[0].name.toLowerCase().endsWith('.csv')||files[0].type==='text/csv')return;
 e.preventDefault();e.stopImmediatePropagation();
 preferredDate=input.dataset.preferredDate||'';preferredAccount=input.dataset.preferredAccount||'';
 pendingFiles=files.slice(1);batchTotal=files.length;batchNumber=1;input.value='';
 void readDocument(files[0]);
},true);
})();