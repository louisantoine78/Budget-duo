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
 let added=0,recovered=0,failed=0;
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
   added+=result.added;recovered+=Number(result.recovered)||0;
   log.innerHTML+='<p class="trace-smart-log-ok">✓ '+esc(file.name)+' · '+result.added+' nouvelle(s), '+(result.recovered||0)+' date(s) retrouvée(s)</p>';
  }catch(error){failed++;log.innerHTML+='<p class="trace-smart-log-error">'+esc(file.name)+' : '+esc(error?.message||'Lecture impossible')+'</p>';}
 }
 busy=false;outcome(added+' nouvelle(s) opération(s) préparée(s)'+(recovered?' · '+recovered+' ancienne(s) date(s) retrouvée(s)':'')+(failed?' · '+failed+' capture(s) à reprendre':'')+'.');
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
function typeName(t){
 return {expense:'Dépense',income:'Revenu',refund:'Remboursement',transfer:'Transfert',
 external_transfer:'Virement hors budget',external_refund:'Entrée hors budget'}[t]||'À qualifier';
}
function rowForm(d,bank,accounts,known,expanded=false){
 const title=esc(d.name),amount=d.amount===null?'À vérifier':money(d.amount),
  flag=d.needsAmountReview?'Montant incertain':known?'À confirmer':'Date à préciser';
 if(!known){
  return '<article class="trace-smart-draft trace-smart-undated" data-smart-id="'+esc(d.id)+'">'+
   '<div class="trace-smart-item-top"><span class="trace-kicker">'+flag+'</span><strong>'+esc(amount)+'</strong></div>'+
   '<strong class="trace-smart-item-name">'+title+'</strong>'+
   '<div class="trace-smart-assign"><label>Jour de cette opération<input class="input smart-date" type="date" value=""></label>'+
   '<button class="primary smart-approve" type="button">Attribuer la date</button></div>'+
   '<button class="trace-smart-ignore-link smart-ignore" type="button">Écarter cette ligne</button>'+
   '<div class="trace-smart-feedback" role="status"></div></article>';
 }
 const t=d.type||'unknown',types=[
  ['','Nature à choisir'],['expense','Dépense'],['income','Revenu'],['refund','Remboursement de dépense'],
  ['external_refund','Entrée hors budget'],['transfer','Transfert entre comptes / carte'],
  ['external_transfer','Virement sortant hors budget']];
 const recipients=bridge().importRecipients(),dest=accounts.filter(a=>a.id!==account),
  preferred=dest.find(a=>a.type==='card')||dest[0];
 const inspect=d.date&&d.amount?bridge().inspect([{date:d.date,name:d.name,amount:d.amount,type:t}],account)[0]:null;
 const match=inspect?.status==='already'?'Opération identique déjà présente':
  inspect?.status==='possible'?'Opération ressemblante déjà présente':null;
 return '<article class="trace-smart-draft trace-smart-fold'+(expanded?' is-expanded':'')+'" data-smart-id="'+esc(d.id)+'">'+
  '<button class="trace-smart-toggle" type="button" aria-expanded="'+String(expanded)+'">'+
  '<span class="trace-smart-title-col"><span class="trace-kicker">'+flag+'</span>'+
  '<strong class="trace-smart-item-name">'+title+'</strong><small>'+esc(typeName(t))+'</small></span>'+
  '<span class="trace-smart-title-right"><strong>'+esc(amount)+'</strong><i class="trace-smart-chevron">'+(expanded?'−':'+')+'</i></span></button>'+
  '<div class="trace-smart-editor"'+(expanded?'':' hidden')+'>'+
  (match?'<div class="trace-smart-alert">'+esc(match)+'</div>':'')+
  '<div class="trace-smart-grid"><label>Date<input class="input smart-date" type="date" value="'+esc(d.date)+'"></label>'+
  '<label>Montant ($)<input class="input smart-amount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+esc(d.amount??'')+'"></label></div>'+
  '<label class="trace-smart-field">Description<input class="input smart-name" maxlength="85" value="'+title+'"></label>'+
  '<label class="trace-smart-field">Type de mouvement<select class="input smart-type">'+types.map(([v,label])=>'<option value="'+v+'"'+(v===t?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
  '<div class="smart-budget-fields"><label class="trace-smart-field">Catégorie<select class="input smart-category"></select></label>'+
  '<label class="trace-smart-field">Pour qui ?<select class="input smart-who">'+options(recipients,recipients[0]?.id)+'</select></label>'+
  '<div class="trace-smart-grid smart-custom hidden"><label>Part amis ($)<input type="number" class="input smart-friends" min="0" step=".01" value="0"></label>'+
  '<label>Part partenaire ($)<input type="number" class="input smart-partner" min="0" step=".01" value="0"></label></div></div>'+
  '<div class="smart-transfer-fields hidden"><label class="trace-smart-field">Compte destinataire<select class="input smart-target">'+options(dest,preferred?.id||'','Choisir le compte')+'</select></label></div>'+
  (d.needsAmountReview?'<label class="trace-smart-confirm"><input type="checkbox" class="smart-amount-confirm"> Montant relu sur la capture bancaire</label>':'')+
  (inspect?.status==='possible'?'<label class="trace-smart-confirm"><input type="checkbox" class="smart-duplicate-confirm"> Opération similaire comparée</label>':'')+
  '<div class="trace-smart-actions"><button class="primary smart-approve" type="button">Confirmer</button><button class="secondary smart-ignore" type="button">Écarter</button></div>'+
  '<div class="trace-smart-feedback" role="status"></div></div></article>';
}
function synchronizeRow(el){
 const type=el.querySelector('.smart-type').value,budget=['expense','income','refund'].includes(type);
 el.querySelector('.smart-budget-fields').classList.toggle('hidden',!budget);
 el.querySelector('.smart-transfer-fields').classList.toggle('hidden',type!=='transfer');
 const categories=budget?bridge().importCategoryOptions(type):[],
  previous=el.querySelector('.smart-category').value;
 const proposed=categories.some(x=>x.id===previous)?previous:bridge().suggestImportCategory({
  name:el.querySelector('.smart-name').value,amountCAD:Number(el.querySelector('.smart-amount').value),type
 });
 el.querySelector('.smart-category').innerHTML=options(categories,proposed,'Choisir une catégorie');
 el.querySelector('.smart-who').disabled=type==='income';
 el.querySelector('.smart-custom').classList.toggle('hidden',type==='income'||el.querySelector('.smart-who').value!=='custom');
}
function readRow(el){
 const q=x=>el.querySelector(x),d=bridge().smartDrafts(account).find(x=>x.id===el.dataset.smartId);
 return{id:el.dataset.smartId,date:q('.smart-date').value,name:q('.smart-name').value.trim(),
  amount:q('.smart-amount').value,type:q('.smart-type').value,
  categoryId:q('.smart-category').value,beneficiary:q('.smart-who').value,
  toAccountId:q('.smart-target')?.value||'',friendsAmount:q('.smart-friends').value,
  partnerAmount:q('.smart-partner').value,allowPossibleDuplicate:!!q('.smart-duplicate-confirm')?.checked,
  amountChecked:!d?.needsAmountReview||!!q('.smart-amount-confirm')?.checked,verified:true};
}
function openUnknown(accountId){openDay(accountId,'');}
function openDay(accountId,date){
 account=accountId;const bank=bridge().accounts().find(a=>a.id===account);if(!bank)return;
 const drafts=bridge().smartDrafts(account,date),known=Boolean(date),
  info=known?bridge().importDayInfo(account,date):null,
  unknown=known?bridge().smartDrafts(account,'').length:0,
  canFinish=known&&!drafts.length&&!info?.pending&&!info?.unresolved&&!unknown;
 show(known?dayLabel(date):'Dates à compléter',
  '<div class="trace-smart-day-header"><strong>'+esc(bank.name)+'</strong><small>'+
  esc(known?drafts.length+' opération(s) à vérifier · ouvre une carte pour la compléter':
   drafts.length+' date(s) à attribuer avant leur vérification')+'</small></div>'+
  (drafts.length?'<div class="trace-smart-draft-list">'+drafts.map((d,i)=>rowForm(d,bank,bridge().accounts(),known,known&&i===0)).join('')+'</div>':
   '<div class="trace-smart-empty">Aucune opération en attente pour cette journée.</div>')+
  (known?'<div class="trace-smart-finish"><strong>La journée est complète ?</strong><p>Confirme seulement lorsque toutes les captures ont été ajoutées.</p>'+
   '<button class="primary full" id="smartFinishDay" type="button"'+(canFinish?'':' disabled')+'>Valider la journée</button>'+
   (canFinish?'':'<p class="trace-smart-waiting">'+(drafts.length?drafts.length+' opération(s) à confirmer. ':'')+
    (unknown?unknown+' date(s) encore à identifier. ':'')+
    (info?.unresolved?'Lignes OCR à revérifier.':'')+'</p>')+
   '<div id="smartFinishMessage" class="trace-smart-feedback" role="status"></div></div>':'')+
  '<button class="secondary full trace-smart-return" id="smartBack" type="button">Toutes les journées</button>');
 $('#smartBack').onclick=()=>outcome('Opérations en attente sur ce compte');
 const content=$('#smartContent');
 content.querySelectorAll('[data-smart-id]').forEach(el=>{
  if(known){
   const toggle=el.querySelector('.trace-smart-toggle');
   toggle.onclick=()=>{
    const editor=el.querySelector('.trace-smart-editor'),expand=editor.hidden;
    content.querySelectorAll('.trace-smart-fold').forEach(other=>{
     const block=other.querySelector('.trace-smart-editor'),button=other.querySelector('.trace-smart-toggle');
     if(block)block.hidden=true;
     if(button){button.setAttribute('aria-expanded','false');button.querySelector('.trace-smart-chevron').textContent='+';}
     other.classList.remove('is-expanded');
    });
    editor.hidden=!expand;toggle.setAttribute('aria-expanded',String(expand));
    toggle.querySelector('.trace-smart-chevron').textContent=expand?'−':'+';
    el.classList.toggle('is-expanded',expand);
   };
   el.querySelector('.smart-type').onchange=()=>synchronizeRow(el);
   el.querySelector('.smart-who').onchange=()=>synchronizeRow(el);
   synchronizeRow(el);
   el.querySelector('.smart-approve').onclick=async()=>{
    if(busy)return;
    const v=readRow(el),button=el.querySelector('.smart-approve');
    if(!v.amountChecked){el.querySelector('.trace-smart-feedback').textContent='Vérifie le montant sur ta capture bancaire.';return;}
    busy=true;button.disabled=true;button.textContent='Enregistrement…';
    try{await bridge().smartApproveDraft(v.id,v);busy=false;openDay(account,date);}
    catch(e){busy=false;button.disabled=false;button.textContent='Confirmer';el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }else{
   el.querySelector('.smart-approve').onclick=async()=>{
    if(busy)return;const btn=el.querySelector('.smart-approve'),dateValue=el.querySelector('.smart-date').value;
    busy=true;btn.disabled=true;
    try{
     const draft=drafts.find(x=>x.id===el.dataset.smartId);
     await bridge().smartSaveDraft(el.dataset.smartId,{date:dateValue,name:draft?.name});
     busy=false;openDay(account,'');
    }catch(e){busy=false;btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;}
   };
  }
  el.querySelector('.smart-ignore').onclick=()=>{
   const btn=el.querySelector('.smart-ignore');
   if(btn.dataset.sure!=='yes'){btn.dataset.sure='yes';btn.textContent='Confirmer l’exclusion';return;}
   btn.disabled=true;
   bridge().smartIgnoreDraft(el.dataset.smartId).then(()=>openDay(account,date))
    .catch(e=>{btn.disabled=false;el.querySelector('.trace-smart-feedback').textContent=e.message;});
  };
 });
 $('#smartFinishDay')?.addEventListener('click',async()=>{
  const btn=$('#smartFinishDay');btn.disabled=true;
  try{await bridge().markDayChecked(account,date,false);close();
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