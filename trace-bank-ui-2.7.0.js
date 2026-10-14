(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let pendingFiles=[],preferredDate='',preferredAccount='',batchTotal=0,batchNumber=1,batchIds=[],activeImageUrl='',quickWhoChoice='',quickConfirmed=0,quickPending=0,batchAccountIds=new Set();
let importToastTimer=null,batchUnresolved=0;
function showDayCompletion(accountId,date,summary){
 const toast=$('#traceImportToast');if(!toast)return false;
 const info=window.TraceBankBridge?.importDayInfo?.(accountId,date);
 if(!info?.entry&&!info?.confirmed)return false;
 const pending=Number(info.pending)||0,unresolved=Number(info.unresolved)||0;
 const account=window.TraceBankBridge.accounts().find(a=>a.id===accountId);
 const label=account?.name||'Compte bancaire';
 if(importToastTimer){clearTimeout(importToastTimer);importToastTimer=null;}
 const dayText=new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
 const canFinish=pending===0&&unresolved===0;
 toast.classList.add('trace-finish-day');
 toast.innerHTML='<div class="trace-finish-heading"><span class="trace-finish-icon" aria-hidden="true">✓</span><div><span class="trace-kicker">IMPORT TERMINÉ</span>'+
 '<b>'+dayText+'</b><small>'+esc(label)+'</small></div>'+
 '<button type="button" class="trace-toast-close" id="closeImportToast" aria-label="Fermer">×</button></div>'+
 '<p class="trace-finish-result">'+esc(summary)+'</p>'+
 (canFinish?'<p class="trace-finish-explain">Toutes les opérations connues sont confirmées. Tu peux terminer cette journée <b>si toutes ses captures ont été ajoutées.</b></p>':
 '<p class="trace-finish-warning">'+(pending?pending+' opération(s) encore à vérifier dans Activité.':'')+(unresolved?(pending?' ':'')+unresolved+' ligne(s) de capture doivent être revérifiées depuis le calendrier.':'')+' La journée reste en cours.</p>')+
 (canFinish?'<button type="button" class="primary full trace-finish-primary" id="finishImportDay">Valider et terminer la journée</button>':
 (info.drafts?'<button type="button" class="primary full trace-finish-primary" id="finishSmartReview">Vérifier les opérations importées</button>':pending?'<button type="button" class="primary full trace-finish-primary" id="finishImportReview">Voir les opérations à vérifier</button>':'<button type="button" class="primary full trace-finish-primary" id="finishImportCalendar">Revoir la journée</button>'))+
 '<button type="button" class="secondary full trace-finish-later" id="keepDayInProgress">Garder la journée en cours</button>'+
 '<div class="trace-finish-error" id="finishDayError" role="status"></div>';
 toast.classList.remove('hidden');
 const dismiss=()=>{toast.classList.add('hidden');toast.classList.remove('trace-finish-day');};
 $('#closeImportToast')?.addEventListener('click',dismiss);
 $('#keepDayInProgress')?.addEventListener('click',dismiss);
 $('#finishImportReview')?.addEventListener('click',()=>{dismiss();document.querySelector('#activityTabs [data-tab="review"]')?.click();});
 $('#finishSmartReview')?.addEventListener('click',()=>{dismiss();window.TraceSmartInbox?.openDay?.(accountId,date);});
 $('#finishImportCalendar')?.addEventListener('click',()=>{dismiss();window.TraceImportCalendar?.openDayAction?.(accountId,date);});
 $('#finishImportDay')?.addEventListener('click',async()=>{
  const button=$('#finishImportDay');button.disabled=true;button.textContent='Validation de la journée…';
  try{
   // Recheck authoritative state at click time; do not mark partially reviewed days.
   const current=window.TraceBankBridge.importDayInfo(accountId,date);
   if(current.pending)throw Error(current.pending+' opération(s) restent à vérifier.');
   if(current.unresolved)throw Error(current.unresolved+' ligne(s) de capture restent à revérifier.');
   if(!current.entry&&!current.confirmed)throw Error('Aucun import enregistré pour cette journée.');
   await window.TraceBankBridge.markDayChecked(accountId,date,false);
   toast.innerHTML='<div class="trace-finish-success"><span>✓</span><div><strong>Journée validée</strong><small>'+dayText+' · '+esc(label)+'. Tu peux toujours y ajouter des captures plus tard.</small></div></div>';
   importToastTimer=setTimeout(dismiss,5000);
  }catch(error){button.disabled=false;button.textContent='Valider et terminer la journée';const message=$('#finishDayError');if(message)message.textContent=String(error.message||error);}
 });
 return true;
}
function showBatchReady(){
 // Previous versions left a large success panel below the calendar,
 // causing confirmed operations to look as if they were pending again.
 const result=$('#importResult');if(result)result.innerHTML='';
 const dayAccount=batchAccountIds.size===1?[...batchAccountIds][0]:null;
 const summary=quickPending?(quickConfirmed?quickConfirmed+' enregistrée(s) et '+quickPending+' à vérifier':quickPending+' opération(s) à vérifier'):
  quickConfirmed?quickConfirmed+' opération(s) enregistrée(s)':'Aucun nouveau doublon ajouté.';
 if(preferredDate&&dayAccount&&showDayCompletion(dayAccount,preferredDate,summary))return;
 const toast=$('#traceImportToast');if(!toast)return;
 toast.classList.remove('trace-finish-day');
 if(importToastTimer)clearTimeout(importToastTimer);
 const confirmed=quickConfirmed,pending=quickPending;
 const heading=pending?(confirmed?confirmed+' enregistrée(s), '+pending+' à vérifier':pending+' opération(s) à vérifier'):
  confirmed?confirmed+' opération(s) enregistrée(s)':'Aucune nouvelle transaction';
 const detail=pending?'Les opérations incertaines restent dans « À vérifier », sans être comptées dans le budget.':
  confirmed?'Import terminé. Les opérations confirmées figurent dans Transactions.':'Les opérations déjà présentes ne sont pas ajoutées deux fois.';
 toast.innerHTML='<div class="trace-toast-main"><span class="trace-toast-symbol" aria-hidden="true">✓</span>'+
 '<div class="trace-toast-copy"><strong>'+heading+'</strong><small>'+detail+'</small></div>'+
 '<button type="button" class="trace-toast-close" id="closeImportToast" aria-label="Masquer cette confirmation">×</button></div>'+
 '<button type="button" class="trace-toast-action" id="importToastDestination">'+(pending?'Traiter les opérations à vérifier':'Voir mes transactions')+' ›</button>';
 toast.classList.remove('hidden');
 const dismiss=()=>{toast.classList.add('hidden');if(importToastTimer){clearTimeout(importToastTimer);importToastTimer=null;}};
 $('#closeImportToast')?.addEventListener('click',dismiss);
 $('#importToastDestination')?.addEventListener('click',()=>{
  dismiss();const destination=pending?'review':'transactions';
  document.querySelector('#activityTabs [data-tab="'+destination+'"]')?.click();
 });
 importToastTimer=setTimeout(()=>{toast.classList.add('hidden');importToastTimer=null;},pending?13000:7000);
}

function nextCapture(){if(pendingFiles.length){const next=pendingFiles.shift();batchNumber++;void readDocument(next);}else showBatchReady();}
async function readDocument(file){
 if(activeImageUrl){URL.revokeObjectURL(activeImageUrl);activeImageUrl='';}
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
 if(!isPdf&&(String(file.type||'').startsWith('image/')||/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name))){try{activeImageUrl=URL.createObjectURL(file);}catch(e){console.info('Screenshot display unavailable',e);}}
 root.innerHTML='<article class="card trace-smart-import">'+
 '<div class="trace-smart-head"><span class="trace-kicker">'+(batchTotal>1?'CAPTURE '+batchNumber+' SUR '+batchTotal:isPdf?'CONTRÔLE MENSUEL':'IMPORT DE CAPTURE')+'</span>'+
 '<h3>Opérations détectées</h3><p>'+esc(file.name)+'</p></div>'+
 '<label class="label2" for="docAccount">Compte concerné</label>'+
 '<select class="input trace-smart-account" id="docAccount">'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select>'+
 (preferredDate?'<div class="trace-smart-day">Journée du <strong>'+esc(preferredDate)+'</strong> · seules ses transactions seront proposées.</div>':'')+
 '<div id="docRows" aria-live="polite"></div>'+
 (activeImageUrl?'<details class="trace-original-screenshot"><summary><span>Voir la capture complète</span><small>Pour vérifier un détail sans retourner dans Photos</small></summary>'+
 '<div class="trace-original-image-wrap"><img src="'+esc(activeImageUrl)+'" alt="Capture bancaire à l’origine de cet import" loading="lazy"></div></details>':'')+
 '<details class="trace-smart-advanced" id="docAdvanced">'+
 '<summary><span>Une transaction est mal reconnue ?</span><small>Afficher le texte extrait et réanalyser</small></summary>'+
 '<div class="trace-smart-advanced-content"><label class="label2" for="docText">Texte extrait</label>'+
 '<textarea id="docText" class="input" rows="6" style="width:100%;min-height:110px;font-size:16px">'+esc(data.text||'')+'</textarea>'+
 '<label class="label2" for="docFormat">Format de date</label><select id="docFormat" class="input"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select>'+
 '<button type="button" class="secondary full" id="docParse" style="margin-top:9px">Réanalyser le texte corrigé</button></div></details>'+
 '</article>';
 const current=accounts.find(a=>a.id===preferredAccount);
 const card=accounts.find(a=>a.type==='card');
 const chosen=current||card||accounts[0];
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
 const dayCandidates=scoped?parsed.candidates.filter(r=>r.date===preferredDate||(!r.date&&r.needsDateReview)):parsed.candidates;
 const skipped=scoped?parsed.candidates.length-dayCandidates.length:0;
 const otherDates=[...new Set(parsed.candidates.filter(r=>!scoped||r.date!==preferredDate).map(r=>r.date).filter(Boolean))].sort();
 const records=dayCandidates.slice(0,150);
 const statuses=bridge.inspect(records,accountId);
 const alreadyCount=statuses.filter(s=>s.status==='already').length;
 const possibleCount=statuses.filter(s=>s.status==='possible').length;
 const actionable=records.filter((r,i)=>statuses[i].status==='missing'&&r.selected&&Number(r.amount)>0).length;
 const uncertain=records.filter(r=>!(Number(r.amount)>0)||r.needsReview||r.needsDateReview).length;
 const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
 const recipients=bridge.importRecipients();
 const node=$('#docRows');
 node.innerHTML='<div class="trace-smart-results">'+
 '<div class="trace-smart-count"><b>'+records.length+' opération'+(records.length>1?'s':'')+' détectée'+(records.length>1?'s':'')+'</b>'+
 '<small>'+esc(scoped?formatBankDay(preferredDate):isPdf?'Relevé bancaire':'Capture bancaire')+'</small></div>'+
 (skipped?'<p class="trace-smart-omitted">'+skipped+' opération(s) d’autres journées laissée(s) de côté ('+otherDates.map(formatBankDay).join(', ')+').</p>':'')+
 (uncertain?'<p class="trace-smart-warning">'+uncertain+' ligne(s) à vérifier (date ou montant). Les opérations fiables restent présélectionnées.</p>':'')+
 (alreadyCount||possibleCount?'<section class="trace-duplicate-summary" role="status" aria-live="polite">'+
 '<div class="trace-duplicate-title">Doublons détectés</div>'+
 (alreadyCount?'<p><b>'+alreadyCount+' déjà importée(s)</b> · ces transactions sont décochées pour éviter un double comptage.</p>':'')+
 (possibleCount?'<p class="trace-duplicate-attention"><b>'+possibleCount+' à vérifier</b> · le montant, la date ou le commerçant ressemble à une opération existante. Compare avant de sélectionner.</p>':'')+
 '</section>':'')+
 '<div class="trace-smart-rows">'+
 records.map((r,i)=>{
  const status=statuses[i];
  const defaultChecked=status.status==='missing'&&r.selected&&!r.needsReview&&!r.needsDateReview&&Number(r.amount)>0;
  const stateLabel={missing:'À importer',already:'Déjà importée',possible:status.amountConflict?'Montant contradictoire':'Doublon possible',historical:'Hors solde initial'}[status.status]||'À vérifier';
  const amount=Number(r.amount)>0?Number(r.amount):'';
  const needsAmount=amount==='';const needsReview=needsAmount||Boolean(r.needsReview)||Boolean(r.needsDateReview)||Boolean(status.amountConflict);
  const crop=typeof r.priceImageData==='string'&&r.priceImageData.startsWith('data:image/jpeg;base64,')?r.priceImageData:'';
  const originalPrice=crop?(needsReview?'<div class="trace-price-source" aria-label="Montant sur la capture"><span>Montant sur ta capture</span><img src="'+crop+'" alt="Extrait du montant bancaire original" loading="lazy"></div>':
   '<details class="trace-price-source trace-price-source-collapsed"><summary>Vérifier le montant original</summary><img src="'+crop+'" alt="Extrait du montant bancaire original" loading="lazy"></details>'):'';

  const categories=bridge.importCategoryOptions(r.type);
  const guess=bridge.suggestImportCategory({...r,amountCAD:r.amount});
  return '<div class="trace-smart-row'+(status.status==='already'?' trace-smart-duplicate':'')+(status.status==='possible'?' trace-smart-suspected':'')+'" data-record="'+i+'">'+
  '<div class="trace-smart-row-main"><label class="trace-smart-row-check"><input class="docSelected" type="checkbox" '+(defaultChecked?'checked':'')+' aria-label="Sélectionner '+esc(r.name)+'"></label>'+
  '<div class="trace-smart-row-description"><strong>'+esc(r.name)+'</strong>'+
  '<small>'+esc(r.date?formatBankDay(r.date):'Date à confirmer')+' · <span class="trace-smart-status">'+esc(stateLabel)+'</span></small></div>'+
  '<div class="trace-smart-row-money"><input class="input docAmount" type="text" inputmode="decimal" value="'+(amount!==''?esc(Number(amount).toFixed(2).replace('.',',')):'')+'" placeholder="0,00" aria-label="Montant CAD '+esc(r.name)+'"><small>CAD</small></div></div>'+
  (needsReview?'<div class="trace-smart-needs">'+(status.amountConflict?'Montant différent d’une opération existante.':r.needsDateReview?'Date illisible : précise-la dans les détails.':needsAmount?'Montant non reconnu.':'Lectures incertaines du montant.')+' Vérifie uniquement ce point.</div>':'')+
  originalPrice+
  (Array.isArray(r.priceCandidates)&&r.priceCandidates.length>1?'<div class="trace-smart-alternatives"><small>Montants possibles</small>'+r.priceCandidates.slice(0,3).map(n=>'<button type="button" class="trace-price-choice" data-suggest-amount="'+esc(n)+'">'+esc(Number(n).toFixed(2).replace('.',','))+' $</button>').join('')+'</div>':'')+
  (status.status==='possible'?'<p class="trace-suspected-warning">Doublon possible : contrôle l’opération avant de la sélectionner.</p>':'')+
  (status.matchName?'<div class="trace-smart-match">'+(status.status==='already'?'Déjà enregistrée : ':'À comparer avec : ')+esc(status.matchName)+' ('+esc(status.matchDate)+')</div>':'')+
  '<div class="trace-fast-category"><label>Catégorie</label><select class="input docCategory"><option value="">À catégoriser plus tard</option>'+
 categories.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===guess?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'+
 '<details class="trace-smart-row-details"'+(r.needsDateReview?' open':'')+'><summary>Modifier la date, le libellé ou le partage</summary>'+
  '<div class="trace-smart-edit-fields"><label>Date<input class="input docDate" type="date" value="'+esc(r.date)+'"></label>'+
  '<label>Type<select class="input docType"><option value="expense"'+(r.type==='expense'?' selected':'')+'>Dépense</option><option value="income"'+(r.type==='income'?' selected':'')+'>Revenu</option><option value="refund"'+(r.type==='refund'?' selected':'')+'>Remboursement</option></select></label>'+
  '<label class="trace-smart-full">Commerçant<input class="input docName" maxlength="80" value="'+esc(r.name)+'"></label>'+
 '</div></details>'+
 '<div class="trace-fast-sharing"><span class="trace-fast-sharing-label">Pour qui ?</span>'+
 '<select class="docWho trace-native-who" aria-label="Répartition de '+esc(r.name)+'"><option value="">À répartir</option>'+
 recipients.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select>'+
 '<div class="trace-share-choices" role="group" aria-label="Répartition de '+esc(r.name)+'">'+
 recipients.map((p,j)=>'<button type="button" class="trace-share-choice" data-quick-share="'+esc(p.id)+'" aria-pressed="false">'+
 esc(p.id==='custom'?'Amis +':p.id==='couple'?'Nous deux':j===0?'Moi':p.name.split(' ')[0])+'</button>').join('')+'</div></div>'+
 '<div class="trace-custom-row hidden"><div class="trace-custom-row-inner">'+
 '<label>Part des amis ($)<input class="input docFriendsAmount" type="number" inputmode="decimal" min="0" step="0.01" value="0"></label>'+
 '<label>Part de '+esc(recipients.find(p=>p.id!=="couple"&&p.id!=="custom"&&p.id!==recipients[0].id)?.name||"ton partenaire")+' ($)<input class="input docPartnerAmount" type="number" inputmode="decimal" min="0" step="0.01" value="0"></label></div>'+
 '<small class="trace-custom-preview">Le reste sera ta part. Les amis ne sont pas comptés dans le partage du couple.</small></div></div>';
 }).join('')+'</div>'+
 (records.length?'<button type="button" class="primary full trace-smart-confirm" id="docSave">Importer et valider les opérations sélectionnées</button>':
 '<div class="trace-smart-empty">'+(scoped&&otherDates.length?'Aucune opération du '+esc(formatBankDay(preferredDate))+' dans cette capture. Les journées visibles ('+esc(otherDates.map(formatBankDay).join(', '))+') ne seront pas importées.':'Aucune opération'+(scoped?' du '+esc(formatBankDay(preferredDate)):'')+' reconnue. Réessaie avec une capture plus nette ou corrige le texte dans les options avancées.')+'</div>')+
 '<button type="button" class="secondary full trace-smart-skip" id="docSkip">'+(pendingFiles.length?'Passer à la capture suivante':'Fermer cet import')+'</button>'+
 '<div class="trace-feedback" id="docError" role="status"></div></div>';
 node.querySelectorAll('[data-record]').forEach(line=>{
   const who=line.querySelector('.docWho'),fields=line.querySelector('.trace-custom-row');
   const update=()=>{
    const custom=who.value==='custom';
    fields.classList.toggle('hidden',!custom);
    if(!custom)return;
    const total=Number(String(line.querySelector('.docAmount').value).replace(',','.'));
    const friends=Number(line.querySelector('.docFriendsAmount').value),partner=Number(line.querySelector('.docPartnerAmount').value);
    const valid=Number.isFinite(total)&&Number.isFinite(friends)&&Number.isFinite(partner)&&friends>=0&&partner>=0&&total>0&&friends+partner<=total+0.001;
    line.querySelector('.trace-custom-preview').textContent=valid?
     'Ta part : '+(total-friends-partner).toFixed(2).replace('.',',')+' $ · Élise : '+partner.toFixed(2).replace('.',',')+' $ · Amis : '+friends.toFixed(2).replace('.',',')+' $':
     'La somme des parts ne peut pas dépasser le montant total.';
   };
   line.querySelectorAll('[data-quick-share]').forEach(button=>button.onclick=()=>{
      who.value=button.dataset.quickShare;
      line.querySelectorAll('[data-quick-share]').forEach(other=>{
        const active=other===button;other.classList.toggle('is-active',active);other.setAttribute('aria-pressed',String(active));
      });
      update();
   });
   who.addEventListener('change',update);
   line.querySelector('.docFriendsAmount').addEventListener('input',update);
   line.querySelector('.docPartnerAmount').addEventListener('input',update);
   line.querySelector('.docAmount').addEventListener('input',update);
 });
 node.querySelectorAll('.docAmount').forEach(input=>input.addEventListener('input',()=>{
   const line=input.closest('[data-record]');if(!line)return;
   const index=Number(line.dataset.record),status=statuses[index];
   if(status.status!=='missing')return;
   const checkbox=line.querySelector('.docSelected'),value=Number(String(input.value).replace(',','.').replace(/\s/g,''));
   if(checkbox)checkbox.checked=Number.isFinite(value)&&value>0;
 }));
 node.querySelectorAll('[data-suggest-amount]').forEach(button=>button.onclick=()=>{
   const row=button.closest('[data-record]');if(!row)return;
   const amount=Number(button.dataset.suggestAmount);
   if(!(amount>0))return;
   row.querySelector('.docAmount').value=amount.toFixed(2).replace('.',',');
   row.querySelector('.docSelected').checked=true;
   row.querySelectorAll('.trace-price-choice').forEach(x=>x.classList.toggle('is-selected',x===button));
 });
 $('#docSkip').onclick=async()=>{
  const overlooked=records.filter((r,i)=>!['already','historical'].includes(statuses[i].status)).length;
  if(preferredDate&&overlooked){
   const btn=$('#docSkip');btn.disabled=true;
   try{await bridge.flagDayAttention(accountId,preferredDate,overlooked);batchUnresolved+=overlooked;batchAccountIds.add(accountId);}
   catch(error){btn.disabled=false;$('#docError').textContent=String(error.message||error);return;}
  }
  if(pendingFiles.length)nextCapture();else if(batchAccountIds.size)showBatchReady();
  else $('#importResult').innerHTML='<div class="empty-note">Import fermé. Aucune transaction supplémentaire enregistrée.</div>';
 };
 if(!records.length)return;
 $('#docSave').onclick=async()=>{
  const chosen=[...node.querySelectorAll('[data-record]')].filter(el=>el.querySelector('.docSelected').checked);
  if(!chosen.length){$('#docError').textContent='Sélectionne au moins une opération.';return;}
  const rows=chosen.map(el=>{
   const i=Number(el.dataset.record),st=statuses[i];
   return{date:el.querySelector('.docDate').value,name:el.querySelector('.docName').value.trim(),amount:Number(String(el.querySelector('.docAmount').value).replace(',','.').replace(/\s/g,'')),
    type:el.querySelector('.docType').value,categoryId:el.querySelector('.docCategory').value,beneficiary:el.querySelector('.docWho').value,friendsAmount:Number(el.querySelector('.docFriendsAmount').value),partnerAmount:Number(el.querySelector('.docPartnerAmount').value),allowPossibleDuplicate:st.status==='possible'};
  });
  if(rows.some(r=>!r.date||!r.name||!Number.isFinite(r.amount)||!(r.amount>0))){$('#docError').textContent='Une ligne sélectionnée a une date ou un montant invalide. Corrige uniquement cette ligne.';return;}
  const incomplete=rows.findIndex(r=>!r.beneficiary||r.beneficiary==='custom'&&(!Number.isFinite(r.friendsAmount)||!Number.isFinite(r.partnerAmount)||r.friendsAmount<0||r.partnerAmount<0||r.friendsAmount+r.partnerAmount>r.amount+.001));
  if(incomplete>=0){$('#docError').textContent='Précise la répartition de chaque dépense, ou corrige les parts de tes amis.';chosen[incomplete].querySelector('.docWho').focus();chosen[incomplete].scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(preferredDate&&rows.some(r=>r.date!==preferredDate)){$('#docError').textContent='Cet import concerne uniquement le '+preferredDate+'. Décoche les autres dates.';return;}
  const chosenIndexes=new Set(chosen.map(el=>Number(el.dataset.record)));
  const omitted=records.filter((r,i)=>!chosenIndexes.has(i)&&!['already','historical'].includes(statuses[i].status)).length;
  const suspicious=chosen.filter(el=>['possible','already','historical'].includes(statuses[Number(el.dataset.record)].status));
  if(suspicious.length&&!window.confirm(suspicious.length+' opération(s) ressemblantes ou hors période sont sélectionnées. Confirmer l’import en attente de validation ?'))return;
  const btn=$('#docSave');btn.disabled=true;btn.textContent='Enregistrement…';
  try{
   const kind=/\.pdf$/i.test(file.name)||file.type==='application/pdf'?'pdf':'image';
   const result=await bridge.submit(rows,accountId,file.name,kind,preferredDate||null);
   if(preferredDate&&kind==='image'&&omitted){await bridge.flagDayAttention(accountId,preferredDate,omitted);batchUnresolved+=omitted;}
   batchAccountIds.add(accountId);
   const approvals=(result.savedRows||[]).map(pair=>({id:pair.id,categoryId:rows[pair.rowIndex].categoryId,beneficiary:rows[pair.rowIndex].beneficiary,friendsAmount:rows[pair.rowIndex].friendsAmount,partnerAmount:rows[pair.rowIndex].partnerAmount,
    needsManualReview:['possible','already','historical'].includes(statuses[Number(chosen[pair.rowIndex].dataset.record)]?.status)}));
   // Similar, conflicting or historical rows are preserved pending until explicitly checked.
   const safeApprovals=approvals.filter(row=>!row.needsManualReview);
   let outcome={confirmed:0,pending:approvals.length};
   try{
    const checked=await bridge.quickFinalizeApproved(safeApprovals);
    outcome={confirmed:checked.confirmed,pending:approvals.length-checked.confirmed};
   }
   catch(error){console.error('Confirmation partielle',error);}
   quickConfirmed+=outcome.confirmed;
   quickPending+=outcome.pending;
   batchIds.push(...(result.ids||[]));
   if(pendingFiles.length)setTimeout(nextCapture,350);
   else showBatchReady();
  }catch(error){btn.disabled=false;btn.textContent='Réessayer';$('#docError').textContent=esc(error.message);}
 };
}

document.addEventListener('change',e=>{
 if(e.target?.id!=='importFile')return;
 const input=e.target,files=[...(input.files||[])];
 if(files.length&&input.dataset.preferredDate)window.TraceImportCalendar?.closeDayAction?.();
 if(!files.length||files[0].name.toLowerCase().endsWith('.csv')||files[0].type==='text/csv')return;
 e.preventDefault();e.stopImmediatePropagation();
 preferredDate=input.dataset.preferredDate||'';preferredAccount=input.dataset.preferredAccount||'';
 pendingFiles=files.slice(1);batchTotal=files.length;batchNumber=1;batchIds=[];quickConfirmed=0;quickPending=0;batchUnresolved=0;quickWhoChoice='';batchAccountIds=new Set();input.value='';
 void readDocument(files[0]);
},true);
})();