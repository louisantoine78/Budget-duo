/* TRACE 5.20 — multi-day capture inbox. Drafts never affect balances until approved. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
const dayLabel=s=>new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(s+'T12:00:00'));
let account='',busy=false;
const bridge=()=>window.TraceBankBridge;
function node(){return $('#traceSmartOverlay');}
function show(title,content){
 const root=node();if(!root)return;
 root.classList.remove('hidden');root.innerHTML='<div class="trace-smart-scrim" data-smart-close></div>'+
 '<section class="trace-smart-sheet" role="dialog" aria-modal="true" aria-labelledby="smartTitle">'+
 '<div class="trace-smart-bar"></div><div class="trace-smart-top"><div><span class="trace-kicker">TRACE · IMPORT INTELLIGENT</span><h2 id="smartTitle">'+esc(title)+'</h2></div>'+
 '<button class="trace-smart-close" id="smartClose" type="button" aria-label="Fermer">×</button></div>'+
 '<div class="trace-smart-content" id="smartContent">'+content+'</div></section>';
 $('#smartClose').onclick=()=>{if(!busy)close();};
 root.querySelector('[data-smart-close]').onclick=()=>{if(!busy)close();};
}
function close(){node()?.classList.add('hidden');node().innerHTML='';window.TraceImportCalendar?.render?.();}
function proposedType(row){
 const a=bridge().accounts().find(z=>z.id===account);
 const name=String(row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(a?.type==='card')return /paiement.{0,100}(?:carte|mastercard|visa|received|recu|caisse)/.test(name)?'unknown':row.type==='refund'?'refund':'expense';
 if(/paiement.{0,100}(?:mastercard|visa|carte de credit|odyssee|world elite)|(?:mastercard|visa).{0,80}paiement/.test(name))return'transfer';
 if(/virement|interac|transfert|remboursement|versement/.test(name))return'unknown';
 if(/salaire|payroll|paie\s|depot direct/.test(name))return'income';
 return row.type==='income'?'income':'expense';
}
function pending(){return bridge()?.smartDrafts?.(account)||[];}
function dateBuckets(){
 const result={};
 for(const d of pending()){const key=d.date||'';(result[key]??=[]).push(d);}
 return result;
}
function outcome(summary){
 const buckets=dateBuckets(),keys=Object.keys(buckets).sort((a,b)=>a.localeCompare(b)),unknown=buckets['']?.length||0;
 show('Captures organisées','<div class="trace-smart-intro"><b>'+esc(summary)+'</b><p>Aucune opération ne modifie ton budget avant sa confirmation. Retrouve les lignes par journée ci-dessous.</p></div>'+
 '<div class="trace-smart-buckets">'+keys.map(key=>
 '<button type="button" class="trace-smart-bucket" data-smart-day="'+esc(key)+'">'+
 '<span><strong>'+esc(key?dayLabel(key):'Date à identifier')+'</strong><small>'+buckets[key].length+' opération(s) à vérifier</small></span><span class="trace-smart-bucket-arrow">›</span></button>').join('')+
 (keys.length?'':'<p class="trace-smart-empty">Aucune nouvelle opération en attente sur ce compte.</p>')+'</div>'+
 (unknown?'<div class="trace-smart-alert">'+unknown+' ligne(s) sans date : attribue leur journée avant validation.</div>':'')+
 '<button type="button" class="secondary full" id="smartDone">Revenir au calendrier</button>');
 $('#smartDone').onclick=close;
 node().querySelectorAll('[data-smart-day]').forEach(b=>b.onclick=()=>openDay(account,b.dataset.smartDay));
}
async function loadFiles(files){
 if(busy)return;busy=true;
 const bank=bridge().accounts().find(a=>a.id===account);
 show('Lecture des captures','<div class="trace-smart-intro"><b>'+esc(bank?.name||'Compte')+'</b><p>Reconnaissance sur ton appareil. TRACE conserve les journées trouvées et signale les dates ou montants incertains.</p></div>'+
 '<div class="trace-smart-progress" id="smartProgress">Préparation…</div><div id="smartLog"></div>');
 let added=0,failed=0;
 for(let i=0;i<files.length;i++){
  const file=files[i];const progress=$('#smartProgress'),log=$('#smartLog');
  progress.textContent='Capture '+(i+1)+' sur '+files.length+' · '+file.name;
  try{
   const data=await window.TraceBankDocuments.extract(file,msg=>{if($('#smartProgress'))$('#smartProgress').textContent='Capture '+(i+1)+'/'+files.length+' · '+msg;},{hintDate:bridge().month()+'-01'});
   const parsed=Array.isArray(data.structuredCandidates)&&data.structuredCandidates.length?data.structuredCandidates:window.TraceBankDocuments.extractCandidates(data.text||'').candidates;
   const records=parsed.map(row=>({date:row.date||'',name:row.name||'',amount:row.needsReview||row.needsDateReview&&!(Number(row.amount)>0)?null:row.amount,
     needsReview:Boolean(row.needsReview||row.ambiguous),needsDateReview:Boolean(row.needsDateReview),type:proposedType(row),raw:row.raw||''}));
   if(!records.length)throw Error('Aucune opération identifiée. Utilise une capture plus lisible.');
   const result=await bridge().smartStageRows(account,file.name,records);
   added+=result.added;
   log.innerHTML+='<p class="trace-smart-log-ok">✓ '+esc(file.name)+' · '+result.added+' ligne(s) préparée(s)</p>';
  }catch(error){failed++;log.innerHTML+='<p class="trace-smart-log-error">'+esc(file.name)+' : '+esc(error?.message||'Lecture impossible')+'</p>';}
 }
 busy=false;outcome(added+' opération(s) préparée(s)'+(failed?' · '+failed+' capture(s) à reprendre':'')+'.');
}
function start(id){
 if(busy)return;
 account=id;
 if(!bridge()?.accounts().some(a=>a.id===account))return;
 window.TraceImportCalendar?.closeDayAction?.();
 const input=$('#traceSmartFiles');if(!input)return;
 input.value='';input.click();
}
function options(items,value,placeholder){
 return (placeholder?'<option value="">'+esc(placeholder)+'</option>':'')+
 items.map(i=>'<option value="'+esc(i.id)+'"'+(i.id===value?' selected':'')+'>'+esc(i.name)+'</option>').join('');
}
function rowForm(d,bank,accounts){
 const t=d.type||'unknown';const date=d.date||'',inspect=d.date&&d.amount?bridge().inspect([{date:d.date,name:d.name,amount:d.amount,type:t}],account)[0]:null;
 const match=inspect?.status==='already'?'Identique déjà enregistrée':inspect?.status==='possible'?'Transaction ressemblante':null;
 const types=[
 ['','Nature du mouvement…'],['expense','Dépense (débit)'],['income','Revenu'],['refund','Remboursement de dépense'],
 ['external_refund','Entrée hors budget / remboursement externe'],['transfer','Transfert entre mes comptes / paiement carte'],
 ['external_transfer','Virement sortant hors budget']
 ];
 const recipients=bridge().importRecipients(),target=accounts.filter(a=>a.id!==account),preferred=target.find(a=>a.type==='card')||target[0];
 return '<article class="trace-smart-draft" data-smart-id="'+esc(d.id)+'">'+
 '<div class="trace-smart-draft-head"><div><span class="trace-kicker">'+(d.needsAmountReview?'MONTANT À VÉRIFIER':'OPÉRATION À CONFIRMER')+'</span><h3>'+esc(d.name)+'</h3></div><strong>'+esc(d.amount===null?'—':money(d.amount))+'</strong></div>'+
 (match?'<div class="trace-smart-alert">'+esc(match)+'</div>':'')+
 '<div class="trace-smart-grid"><label>Date<input class="input smart-date" type="date" value="'+esc(date)+'"></label>'+
 '<label>Montant ($)<input class="input smart-amount" inputmode="decimal" type="number" min="0.01" step="0.01" value="'+esc(d.amount??'')+'"></label></div>'+
 '<label class="trace-smart-field">Description<input class="input smart-name" maxlength="85" value="'+esc(d.name)+'"></label>'+
 '<label class="trace-smart-field">Type de mouvement<select class="input smart-type">'+types.map(([v,label])=>'<option value="'+v+'"'+(v===t?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
 '<div class="smart-budget-fields"><label class="trace-smart-field">Catégorie<select class="input smart-category"></select></label>'+
 '<label class="trace-smart-field">Pour qui ?<select class="input smart-who">'+options(recipients,recipients[0]?.id)+'</select></label>'+
 '<div class="trace-smart-grid smart-custom hidden"><label>Part amis ($)<input type="number" class="input smart-friends" min="0" step=".01" value="0"></label>'+
 '<label>Part partenaire ($)<input type="number" class="input smart-partner" min="0" step=".01" value="0"></label></div></div>'+
 '<div class="smart-transfer-fields hidden"><label class="trace-smart-field">Compte destinataire<select class="input smart-target">'+options(target,preferred?.id||'','Choisir le compte')+'</select></label></div>'+
 (d.needsAmountReview?'<label class="trace-smart-confirm"><input type="checkbox" class="smart-amount-confirm"> J’ai relu le montant sur la capture d’origine.</label>':'')+
 '<label class="trace-smart-confirm trace-smart-rare"><input type="checkbox" class="smart-duplicate-confirm"> J’ai comparé les éventuelles opérations semblables.</label>'+
 '<div class="trace-smart-actions"><button class="primary smart-approve" type="button">Confirmer l’opération</button><button class="secondary smart-ignore" type="button">Écarter</button></div>'+
 '<div class="trace-smart-feedback" role="status"></div></article>';
}
function synchronizeRow(el){
 const t=el.querySelector('.smart-type').value;
 const budget=['expense','income','refund'].includes(t);
 el.querySelector('.smart-budget-fields').classList.toggle('hidden',!budget);
 el.querySelector('.smart-transfer-fields').classList.toggle('hidden',t!=='transfer');
 const cats=budget?bridge().importCategoryOptions(t):[];
 const old=el.querySelector('.smart-category').value;
 el.querySelector('.smart-category').innerHTML=options(cats,cats.some(x=>x.id===old)?old:(bridge().suggestImportCategory({
   name:el.querySelector('.smart-name').value,amountCAD:Number(el.querySelector('.smart-amount').value),type:t
 })||''),'Choisir une catégorie');
 el.querySelector('.smart-who').disabled=t==='income';
 el.querySelector('.smart-custom').classList.toggle('hidden',el.querySelector('.smart-who').value!=='custom'||t==='income');
}
function readRow(el){
 const q=s=>el.querySelector(s),d=bridge().smartDrafts(account).find(x=>x.id===el.dataset.smartId);
 return{id:el.dataset.smartId,date:q('.smart-date').value,name:q('.smart-name').value.trim(),amount:q('.smart-amount').value,
 type:q('.smart-type').value,categoryId:q('.smart-category').value,beneficiary:q('.smart-who').value,
 toAccountId:q('.smart-target')?.value||'',friendsAmount:q('.smart-friends').value,partnerAmount:q('.smart-partner').value,
 allowPossibleDuplicate:!!q('.smart-duplicate-confirm')?.checked,
 amountChecked:!d?.needsAmountReview||!!q('.smart-amount-confirm')?.checked,verified:true};
}
function openUnknown(accountId){openDay(accountId,'');}
function openDay(accountId,date){
 account=accountId;
 const bank=bridge().accounts().find(a=>a.id===account);if(!bank)return;
 const drafts=bridge().smartDrafts(account,date);
 const label=date?dayLabel(date):'Dates à préciser';
 const known=!!date,info=known?bridge().importDayInfo(account,date):null,unknown=known?bridge().smartDrafts(account,'').length:0,canFinish=known&&!drafts.length&&!info?.pending&&!info?.unresolved&&!unknown;
 show(label,'<div class="trace-smart-intro"><b>'+esc(bank.name)+'</b><p>'+
 (known?'Vérifie le montant, la catégorie et pour qui est chaque mouvement. Rien n’est comptabilisé sans confirmation.':
  'Ajoute la date réelle à chaque ligne avant de la retrouver dans son jour.')+'</p></div>'+
 (drafts.length?drafts.map(d=>rowForm(d,bank,bridge().accounts())).join(''):
 '<div class="trace-smart-empty">Aucun brouillon en attente pour cette journée.</div>')+
 (known?'<div class="trace-smart-finish"><strong>Journée complète ?</strong><p>Une fois les opérations traitées, confirme seulement si toutes les captures ont été ajoutées.</p>'+
 '<button class="primary full" id="smartFinishDay" type="button"'+(canFinish?'':' disabled')+'>Valider et terminer la journée</button>'+
 (canFinish?'':'<p class="trace-smart-waiting">'+(drafts.length?drafts.length+' opération(s) à confirmer. ': '')+(unknown?unknown+' ligne(s) sans date à traiter. ': '')+(info?.unresolved?'D’autres lignes OCR restent à revérifier.':'')+'</p>')+
 '<div id="smartFinishMessage" class="trace-smart-feedback" role="status"></div></div>':'')+
 '<button class="secondary full" id="smartBack" type="button">Retour aux journées</button>');
 $('#smartBack').onclick=()=>outcome('Opérations du compte');
 const content=$('#smartContent');
 content.querySelectorAll('[data-smart-id]').forEach(el=>{
  el.querySelector('.smart-type').onchange=()=>synchronizeRow(el);
  el.querySelector('.smart-who').onchange=()=>synchronizeRow(el);
  synchronizeRow(el);
  if(!known){
   el.querySelector('.smart-approve').textContent='Attribuer cette date';
   el.querySelector('.smart-approve').onclick=async()=>{
    const values=readRow(el),btn=el.querySelector('.smart-approve');
    btn.disabled=true;
    try{await bridge().smartSaveDraft(values.id,values);openUnknown(account);}
    catch(e){btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }else{
   el.querySelector('.smart-approve').onclick=async()=>{
    if(busy)return;
    const v=readRow(el),btn=el.querySelector('.smart-approve');
    if(el.querySelector('.smart-amount-confirm')&&!v.amountChecked){el.querySelector('.trace-smart-feedback').textContent='Relis le montant original avant de confirmer.';return;}
    busy=true;btn.disabled=true;btn.textContent='Enregistrement…';
    try{await bridge().smartApproveDraft(v.id,v);busy=false;openDay(account,date);}
    catch(e){busy=false;btn.disabled=false;btn.textContent='Confirmer l’opération';el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }
  el.querySelector('.smart-ignore').onclick=()=>{
   if(el.querySelector('.smart-ignore').dataset.sure!=='yes'){
    el.querySelector('.smart-ignore').dataset.sure='yes';el.querySelector('.smart-ignore').textContent='Confirmer l’exclusion';return;
   }
   const btn=el.querySelector('.smart-ignore');btn.disabled=true;
   bridge().smartIgnoreDraft(el.dataset.smartId).then(()=>openDay(account,date)).catch(e=>{btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;});
  };
 });
 $('#smartFinishDay')?.addEventListener('click',async()=>{
  const btn=$('#smartFinishDay');btn.disabled=true;
  try{
   await bridge().markDayChecked(account,date,false);
   close();
   const toast=$('#traceDayNotice');if(toast){toast.textContent='✓ Journée validée';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),4500);}
  }catch(e){btn.disabled=false;$('#smartFinishMessage').textContent=e.message;}
 });
}
$('#traceSmartFiles')?.addEventListener('change',e=>{
 const files=[...(e.target.files||[])];e.target.value='';
 if(files.length)void loadFiles(files);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy&&!node()?.classList.contains('hidden'))close();});
window.TraceSmartInbox={start,openDay,openUnknown,overview:(accountId)=>{account=accountId;outcome('Opérations en attente');},close};
})();