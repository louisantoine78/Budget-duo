(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let pendingFiles=[],preferredDate='',preferredAccount='',batchTotal=0,batchNumber=1;
function nextCapture(){if(pendingFiles.length){const next=pendingFiles.shift();batchNumber++;void readDocument(next);}else{const root=$('#importResult');if(root){const btn=root.querySelector('#goToReview');if(btn)btn.onclick=()=>{document.querySelector('#activityTabs [data-tab="review"]')?.click();};}}}
async function readDocument(file){
 const target=$('#importResult');
 target.innerHTML='<article class="card"><b>Lecture sur cet appareil…</b><div class="empty-note" id="readProgress"></div></article>';
 try{
  const extracted=await window.TraceBankDocuments.extract(file,msg=>{const e=$('#readProgress');if(e)e.textContent=msg;});
  showDocumentReview(file,extracted);
 }catch(error){target.innerHTML='<div class="empty-note">'+esc(error.message)+'</div><button type="button" class="secondary full" id="skipFailedCapture">Ignorer et continuer</button>';$('#skipFailedCapture').onclick=nextCapture;}
}
function showDocumentReview(file,data){
 const root=$('#importResult');
 const accounts=window.TraceBankBridge.accounts();
 root.innerHTML='<article class="card"><div class="trace-import-filehead"><span class="trace-kicker">'+(batchTotal>1?'CAPTURE '+batchNumber+' SUR '+batchTotal:'DOCUMENT À VÉRIFIER')+'</span><b>'+esc(file.name)+'</b></div><div class="empty-note">Texte détecté localement : corrige-le puis vérifie les montants avant import. Plusieurs captures peuvent être ajoutées pour la même journée.</div>'+
 '<textarea id="docText" class="input" style="width:100%;min-height:140px;font-size:16px">'+esc(data.text)+'</textarea>'+
 '<label class="label2">Compte</label><select class="input" id="docAccount">'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select>'+
 '<label class="label2">Format de date</label><select class="input" id="docFormat"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select>'+
 '<div id="preferredImportNote" class="empty-note"></div><button id="docParse" class="primary full" style="margin-top:10px">Préparer les lignes</button><div id="docRows"></div></article>';
 if(preferredAccount&&accounts.some(a=>a.id===preferredAccount))$('#docAccount').value=preferredAccount;
 else {const card=accounts.find(a=>a.type==='card');if(card)$('#docAccount').value=card.id;}
 if(preferredDate)$('#preferredImportNote').textContent='Import limité au '+preferredDate+' : seules les opérations de cette date pourront être enregistrées. Les autres dates de la capture seront ignorées pour cette journée.';
 $('#docAccount').onchange=()=>renderCandidateRows(file,data);
 $('#docParse').onclick=()=>renderCandidateRows(file,data);
 $('#docParse').click();
}
function renderCandidateRows(file,data){
 const importer=window.TraceBankDocuments,bridge=window.TraceBankBridge;
 const parsed=importer.extractCandidates($('#docText').value,$('#docFormat').value);
 const accountId=$('#docAccount').value;
 const scoped=Boolean(preferredDate);
 const dayCandidates=scoped?parsed.candidates.filter(row=>row.date===preferredDate):parsed.candidates;
 const excludedByDay=scoped?parsed.candidates.length-dayCandidates.length:0;
 const records=dayCandidates.slice(0,150);
 const statuses=bridge.inspect(records,accountId);
 const labels={historical:'Hors période du solde · conservable en historique',already:'Déjà dans Trace',possible:'Ressemblance trouvée · vérification nécessaire',missing:'Nouvelle opération potentielle'};
 const counts=statuses.reduce((n,r)=>(n[r.status]=(n[r.status]||0)+1,n),{});
 const isPdf=file.name.toLowerCase().endsWith('.pdf');
 const node=$('#docRows');
 node.innerHTML='<div class="trace-import-report">'+
  '<b>'+(scoped?'Import du '+esc(preferredDate):isPdf?'Contrôle mensuel du relevé':'Ajout depuis une capture')+'</b>'+
  '<div class="trace-import-metrics"><span>Déjà présentes : '+(counts.already||0)+'</span><span>À vérifier : '+(counts.possible||0)+'</span><span>Potentiellement manquantes : '+(counts.missing||0)+'</span><span>Hors période : '+(counts.historical||0)+'</span></div>'+
  (scoped?'<div class="trace-day-scope-note" role="status"><strong>Journée du '+esc(preferredDate)+'</strong> · '+records.length+' opération(s) trouvée(s) pour cette date. '+excludedByDay+' opération(s) d’autres dates laissée(s) de côté. Elles pourront être importées depuis leur propre journée.</div>':'')+
  '<small>Les lignes hors période du solde ne sont pas supprimées. '+(parsed.skippedPayments||0)+' paiement(s) de carte écarté(s) par le relevé.</small>'+
  '</div>'+
  (records.length?records.map((r,i)=>{
   const st=statuses[i],include=st.status==='missing'&&r.selected;
   const matched=st.matchName?'<small>Correspondance : '+esc(st.matchName)+' ('+esc(st.matchDate)+')'+(st.matchStatus==='confirmed'?' · validée':' · à valider')+'</small>':'';
   return '<div class="trace-doc-row '+(st.status==='historical'?'trace-historical':'')+'" data-record="'+i+'">'+
    '<div class="trace-import-flag"><strong>'+esc(labels[st.status])+'</strong><label><input type="checkbox" class="docSelected" '+(include?'checked':'')+'> Sélectionner</label></div>'+
    matched+
    '<div class="formrow"><div><label class="label2">Date d’opération</label><input type="date" class="input docDate" value="'+esc(r.date)+'"></div>'+
    '<div><label class="label2">Nature</label><select class="input docType"><option value="expense" '+(r.type==='expense'?'selected':'')+'>Dépense</option><option value="income" '+(r.type==='income'?'selected':'')+'>Revenu</option><option value="refund" '+(r.type==='refund'?'selected':'')+'>Remboursement</option></select></div></div>'+
    '<label class="label2">Libellé</label><input class="input docName" maxlength="80" value="'+esc(r.name)+'">'+
    '<label class="label2">Montant en CAD</label><input class="input docAmount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+esc(r.amount)+'">'+
    '<small class="trace-source-line">Source : '+esc(r.raw)+'</small></div>';
  }).join(''):'<div class="empty-note">Aucune opération identifiable. Modifie le texte extrait ou utilise un CSV.</div>')+
  (records.length?'<button type="button" class="primary full" id="docSave" style="margin-top:14px">Envoyer la sélection dans À valider</button>':scoped?'<div class="trace-day-scope-empty">Aucune opération du '+esc(preferredDate)+' détectée dans ce document. Aucune autre date ne sera importée. Tu peux passer à la capture suivante ou corriger le texte reconnu.</div>':'')+
  '<button type="button" class="secondary full" id="docSkip" style="margin-top:8px">'+(pendingFiles.length?'Ignorer cette capture et passer à la suivante':'Ignorer ce document')+'</button>'+
  '<div class="trace-feedback" id="docError" role="status"></div>';
 $('#docSkip').onclick=()=>{if(pendingFiles.length)nextCapture();else $('#importResult').innerHTML='<div class="empty-note">Document ignoré. Aucune transaction importée.</div>';};
 if(!records.length)return;
 $('#docSave').onclick=async()=>{
  const chosen=[...node.querySelectorAll('[data-record]')].filter(el=>el.querySelector('.docSelected').checked);
  if(!chosen.length){$('#docError').textContent='Coche au moins une opération réellement manquante.';return;}
  const rows=chosen.map(el=>{
   const i=Number(el.dataset.record),stat=statuses[i];
   return{date:el.querySelector('.docDate').value,name:el.querySelector('.docName').value.trim(),
    amount:Number(el.querySelector('.docAmount').value),type:el.querySelector('.docType').value,
    allowPossibleDuplicate:stat.status==='possible'};
  });
  if(rows.some(r=>!r.date||!r.name||!(r.amount>0)||!Number.isFinite(r.amount))){$('#docError').textContent='Corrige les lignes sélectionnées : date, libellé et montant obligatoires.';return;}
  if(preferredDate&&rows.some(r=>r.date!==preferredDate)){
   $('#docError').textContent='Cet import est réservé au '+preferredDate+'. Décoche les autres dates ou sélectionne leur journée dans le calendrier.';return;
  }
  const suspicious=chosen.filter(el=>['possible','already','historical'].includes(statuses[Number(el.dataset.record)].status));
  if(suspicious.length){
   const yes=window.confirm(suspicious.length+' opération(s) déjà présentes, ressemblantes ou hors période sont sélectionnées. Confirmer leur import en attente de validation ?');
   if(!yes)return;
  }
  const btn=$('#docSave');btn.disabled=true;btn.textContent='Enregistrement…';
  try{
   const kind=/\.pdf$/i.test(file.name)||file.type==='application/pdf'?'pdf':'image';
  const r=await bridge.submit(rows,accountId,file.name,kind,preferredDate||null);
   $('#importResult').innerHTML='<div class="trace-import-finished"><b>✓ '+r.added+' opération(s) envoyée(s) à la validation</b><p>'+(preferredDate?'Journée du '+esc(preferredDate)+'. ':'')+r.duplicates+' doublon(s) ignoré(s). '+esc(r.coverageWarning||'')+' Les opérations ne sont pas encore comptées dans le Budget.</p><button type="button" class="secondary full" id="goToReview">Ouvrir À valider</button></div>';
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