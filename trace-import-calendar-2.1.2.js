/* Trace 5.20 – premium calendar: multi-day inbox plus retained daily import */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dateLabel=date=>new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
const amount=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
const stamp=s=>{if(!s)return'';const d=new Date(s);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);};
let selectedAccount=null,selectedDay=null,dayActionsOpen=false,dayOperationsOpen=false,renderedMonth=null,noticeTimer=null;
function showDayNotice(text){
 const node=$('#traceDayNotice');if(!node)return;
 clearTimeout(noticeTimer);node.textContent='✓  '+text;node.classList.add('show');
 noticeTimer=setTimeout(()=>node.classList.remove('show'),4500);
}
function dayTone(info){
 if(info.pending||info.unresolved)return'inprogress';
 if(info.entry?.status==='checked'||info.entry?.status==='empty')return'validated';
 return info.entry||info.confirmed?'inprogress':'missing';
}

function render(){
 const root=$('#importCalendar'),bridge=window.TraceBankBridge;
 if(!root||!bridge)return;
 window.TraceHomeReview?.refresh?.();
 const accounts=bridge.accounts();
 if(!accounts.length){root.innerHTML='<div class="empty-note">Configure ton compte courant et ta carte dans Profil → Mes comptes.</div>';return;}

 const accountQueue=accounts.map(a=>({...a,pending:(bridge.smartDrafts?.(a.id)||[]).length}));
 if(!accounts.some(a=>a.id===selectedAccount))selectedAccount=null;
 const accountChoices=accountQueue.map(a=>
   '<button type="button" data-calendar-account="'+esc(a.id)+'" class="trace-premium-account-option'+
   (a.id===selectedAccount?' is-selected':'')+'" aria-pressed="'+(a.id===selectedAccount)+'">'+
   '<span class="trace-premium-account-name"><strong>'+esc(a.type==='card'?'Carte de crédit':a.type==='checking'?'Compte courant':a.name)+'</strong>'+
   '<small>'+esc(a.name)+'</small></span>'+
   '<span class="trace-premium-account-pending">'+(a.pending?'<b>'+a.pending+'</b><small>à vérifier</small>':'<small>Aucun import en attente</small>')+'</span></button>').join('');
 $('#importDrop')?.classList.toggle('hidden',!selectedAccount);
 if(!selectedAccount){
  root.innerHTML='<section class="trace-daily-panel">'+
   '<div class="trace-daily-top"><div><span class="trace-kicker">IMPORTER · ÉTAPE 1</span>'+
   '<h2>Choisis ton compte</h2></div></div>'+
   '<p class="trace-daily-sub">Choisis le compte d’origine, puis ajoute ses captures. Tu vérifieras ses transactions sans mélanger les deux comptes.</p>'+
   '<div class="trace-premium-account-options" role="group" aria-label="Choisir le compte à importer">'+accountChoices+'</div>'+
   '<p class="trace-cal-legend-help">Les captures de la carte vont sur la carte. Celles du compte courant vont sur le compte courant.</p></section>';
  root.querySelectorAll('[data-calendar-account]').forEach(button=>button.addEventListener('click',()=>{
   selectedAccount=button.dataset.calendarAccount;selectedDay=null;dayActionsOpen=false;dayOperationsOpen=false;render();
  }));
  return;
 }

 const month=bridge.month(),year=Number(month.slice(0,4)),m=Number(month.slice(5))-1,
  daysInMonth=new Date(year,m+1,0).getDate(),today=localToday();
 if(!selectedDay||!selectedDay.startsWith(month))selectedDay=month+'-'+String(Math.min(daysInMonth,Number(today.startsWith(month)?today.slice(8):1))).padStart(2,'0');
 if(renderedMonth!==month){dayActionsOpen=false;dayOperationsOpen=false;renderedMonth=month;}
 const activeAccount=accounts.find(a=>a.id===selectedAccount),smartPending=bridge.smartDrafts?.(selectedAccount)||[],smartUnknown=smartPending.filter(x=>!x.date).length,entries=bridge.importDays().filter(x=>x.accountId===selectedAccount),
  last=entries.filter(x=>x.lastImportedAt).sort((a,b)=>String(b.lastImportedAt).localeCompare(String(a.lastImportedAt)))[0],
  gaps=bridge.gaps(selectedAccount,month),weekOffset=(new Date(year,m,1).getDay()+6)%7;
 let completed=0,pending=0,available=0;const tiles=[];
 for(let p=0;p<weekOffset;p++)tiles.push('<span class="trace-cal-spacer" aria-hidden="true"></span>');
 for(let n=1;n<=daysInMonth;n++){
  const date=month+'-'+String(n).padStart(2,'0'),future=date>today,earlier=!bridge.afterBoundaryFor(selectedAccount,date),blocked=future||earlier,
   info=bridge.importDayInfo(selectedAccount,date),tone=blocked?'inactive':dayTone(info);
  if(!blocked){available++;if(tone==='validated')completed++;if(info.pending)pending++;}
  const markers={missing:'',inprogress:'•',validated:'✓',inactive:''};
  const accessibleState={missing:'À renseigner',inprogress:'En cours',validated:'Validée',inactive:'Hors période'};
  const selected=date===selectedDay;
  tiles.push('<button type="button" class="trace-cal-date trace-cal-'+tone+(selected?' is-selected':'')+'" data-select-day="'+date+'" aria-label="'+esc(date+' : '+(blocked?(future?'à venir':'hors période'):accessibleState[tone]))+'" aria-pressed="'+selected+'"'+(blocked?' disabled':'')+'><strong>'+n+'</strong><small>'+markers[tone]+'</small></button>');
 }
 if(selectedDay>today||!bridge.afterBoundaryFor(selectedAccount,selectedDay)){const candidate=month+'-01';selectedDay=bridge.afterBoundaryFor(selectedAccount,candidate)&&candidate<=today?candidate:null;}
 const day=selectedDay,dayInfo=day?bridge.importDayInfo(selectedAccount,day):null,dayRows=day?bridge.dayTransactions(selectedAccount,day):[],
  tone=day?dayTone(dayInfo):'missing';
 const toneLabels={missing:'À renseigner',inprogress:'En cours',validated:'Validée'};
 const accountTypeLabel=activeAccount.type==='card'?'Carte de crédit':activeAccount.type==='checking'?'Compte courant':'Compte bancaire';
 const outstanding=accountQueue.reduce((n,a)=>n+a.pending,0);
 const accountIcon=activeAccount.type==='card'
  ?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>'
  :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-6 9 6M4 20h16M6 10v10M10 10v10M14 10v10M18 10v10"/></svg>';


 root.innerHTML='<section class="trace-daily-panel">'+
  '<div class="trace-daily-top"><div><span class="trace-kicker">JOURNAL BANCAIRE</span><h2>Chaque jour, au clair.</h2></div><span class="trace-daily-progress">'+completed+' / '+available+' jours validés</span></div>'+
  '<p class="trace-daily-sub">Étape 2 · Importe les captures du compte choisi, puis vérifie et valide ses opérations.</p>'+
  '<div class="trace-premium-account-header"><strong>Compte sélectionné</strong><small>Tu peux changer de compte ici</small></div>'+
  '<div class="trace-premium-account-options" role="group" aria-label="Changer le compte à importer">'+accountChoices+'</div>'+
  '<div class="trace-premium-import-area">'+
   '<div class="trace-premium-import-heading"><span class="trace-kicker">CAPTURES DE CE COMPTE UNIQUEMENT</span>'+
    '<strong>'+esc(activeAccount.name)+'</strong></div>'+
   '<p class="trace-premium-account-purpose">'+(activeAccount.type==='card'?
     'Achats par carte de crédit. Le remboursement de cette carte depuis le courant ne crée pas de deuxième dépense.':
     activeAccount.type==='checking'?
     'Revenus, virements, achats par débit et remboursements de carte de crédit (hors budget).':
     'Une capture reste associée à ce compte jusqu’à sa validation.')+'</p>'+
   '<div class="trace-premium-import-actions"><button type="button" class="primary full" id="smartBatchStart">+ Importer sur '+esc(activeAccount.name)+'</button>'+
    (smartPending.length?'<button type="button" class="secondary full" id="smartBatchOverview">Reprendre la vérification <span aria-hidden="true">›</span></button>':'')+
   '</div></div>'+
  (smartUnknown?'<button type="button" class="trace-batch-undated" id="smartBatchUndated">⚠ '+smartUnknown+' ligne(s) sans date · Attribuer une journée ›</button>':'')+
  '<div class="trace-daily-legend" aria-label="États des journées">'+
    '<span><i class="cal-dot missing"></i> À renseigner</span>'+
    '<span><i class="cal-dot inprogress"></i> En cours</span>'+
    '<span><i class="cal-dot validated"></i> Validée</span></div>'+
  '<p class="trace-cal-legend-help">Une journée est validée seulement après ta confirmation, même sans mouvement.</p>'+
  '<p class="trace-day-hint">Touche une date pour importer ou consulter ses opérations.</p>'+
  '<div class="trace-cal-grid"><div class="trace-cal-week">L</div><div class="trace-cal-week">M</div><div class="trace-cal-week">M</div><div class="trace-cal-week">J</div><div class="trace-cal-week">V</div><div class="trace-cal-week">S</div><div class="trace-cal-week">D</div>'+tiles.join('')+'</div>'+
  (gaps.length?'<div class="trace-gap-warning"><b>'+gaps.length+' jour'+(gaps.length>1?'s':'')+' à vérifier</b> entre les imports : '+gaps.map(x=>x.slice(8)+'/'+x.slice(5,7)).join(', ')+'. Tu peux continuer les autres imports normalement.</div>':'')+
  (last?'<div class="trace-last-import">Dernier import : '+esc(stamp(last.lastImportedAt))+' · opérations du '+esc(last.date)+'</div>':'<div class="trace-last-import">Aucun import enregistré pour ce compte.</div>')+
  (day&&dayActionsOpen?'<div class="trace-day-modal" id="traceDayModal">'+
   '<button type="button" tabindex="-1" class="trace-day-scrim" id="dayActionDismiss" aria-label="Fermer le menu de la journée"></button>'+
   '<section class="trace-day-drawer" id="traceDayAction" role="dialog" aria-modal="true" aria-labelledby="traceDayHeading">'+
    '<div class="trace-drawer-handle" aria-hidden="true"></div>'+
    '<div class="trace-day-action-heading"><div><span class="trace-kicker">IMPORT DU JOUR</span><h3 id="traceDayHeading">'+esc(dateLabel(day))+'</h3>'+
    '<small>'+esc(activeAccount.name)+'</small></div>'+
    '<button type="button" class="trace-day-drawer-close" id="dayActionClose" aria-label="Fermer">×</button></div>'+
    '<div class="trace-drawer-summary"><span class="trace-detail-pill trace-pill-'+tone+'">'+esc(toneLabels[tone])+'</span>'+
    '<span>'+(dayInfo.entry?.captureCount?Number(dayInfo.entry.captureCount)+' capture(s) · ':'')+dayInfo.confirmed+' validée(s) · '+dayInfo.pending+' en attente</span></div>'+ 
    (dayInfo.unresolved?'<p class="trace-day-unresolved">'+dayInfo.unresolved+' ligne(s) de capture écartée(s) ou incertaine(s). Vérifie-les avant de terminer la journée.</p>':'')+
    (dayInfo.drafts?'<button type="button" id="smartDayReview" class="primary full trace-day-primary">Vérifier '+dayInfo.drafts+' opération(s) importée(s)</button>'+
     '<button type="button" id="importSelectedDay" class="secondary full trace-day-import-alt">+ Ajouter des captures de ce jour</button>':
     '<button type="button" id="importSelectedDay" class="primary full trace-day-primary">+ Importer des captures de ce jour</button>')+
    '<p class="trace-day-drawer-caption">Plusieurs captures possibles · détection des doublons avant validation</p>'+
    '<div class="trace-day-secondary">'+
     '<button type="button" id="dayActionView" class="secondary">'+(dayOperationsOpen?'Masquer les opérations':'Voir les opérations')+'</button>'+ 
     (dayInfo.unresolved?'<button type="button" id="clearDayAttention" class="secondary">J’ai revérifié les lignes</button>':'')+
     (!dayRows.length&&!dayInfo.entry?'<button type="button" id="markDayEmpty" class="secondary">Valider sans mouvement</button>':'')+
     ((dayInfo.confirmed>0||dayInfo.entry?.status==='received')&&!dayInfo.pending&&!dayInfo.unresolved&&tone!=='validated'?'<button type="button" id="markDayChecked" class="secondary">Valider la journée</button>':'')+
    '</div>'+
    (dayOperationsOpen?'<div class="trace-day-operations">'+
       (dayRows.length?dayRows.slice(0,8).map(t=>'<button type="button" class="trace-day-operation" data-open-day-tx="'+esc(t.id)+'"><span><strong>'+esc(t.name||'Opération')+'</strong><small>'+(t.status==='confirmed'?'Validée':'À vérifier')+' · '+esc(t.label||'Opération bancaire')+'</small></span><b>'+amount(t.amountCAD)+' ›</b></button>').join(''):'<p class="trace-day-no-operations">Aucune opération enregistrée pour cette journée.</p>')+
       (dayRows.length>8?'<button type="button" class="trace-text-action" id="showAllDay">Voir toutes les opérations dans Activité ›</button>':'')+
    '</div>':'')+
   '</section></div>':'')+
  '<div id="calendarStatus" class="trace-feedback" role="status"></div></section>';
 root.querySelectorAll('[data-calendar-account]').forEach(button=>button.addEventListener('click',()=>{
  if(selectedAccount===button.dataset.calendarAccount)return;
  selectedAccount=button.dataset.calendarAccount;selectedDay=null;dayActionsOpen=false;dayOperationsOpen=false;render();
 }));
 $('#smartBatchStart')?.addEventListener('click',()=>window.TraceSmartInbox?.start?.(selectedAccount));
 $('#smartBatchOverview')?.addEventListener('click',()=>window.TraceSmartInbox?.overview?.(selectedAccount));
 $('#smartBatchUndated')?.addEventListener('click',()=>window.TraceSmartInbox?.openUnknown?.(selectedAccount));
 root.querySelectorAll('[data-select-day]').forEach(b=>b.onclick=()=>{
  selectedDay=b.dataset.selectDay;dayActionsOpen=true;dayOperationsOpen=false;render();
  $('#importSelectedDay')?.focus?.({preventScroll:true});
 });
 const openPicker=()=>{const input=$('#importFile');if(!day||!input)return;
  input.dataset.preferredDate=day;input.dataset.preferredAccount=selectedAccount;input.value='';input.click();
 };
 $('#importSelectedDay')?.addEventListener('click',openPicker);
 $('#smartDayReview')?.addEventListener('click',()=>window.TraceSmartInbox?.openDay?.(selectedAccount,day));
 $('#dayActionView')?.addEventListener('click',()=>{dayOperationsOpen=!dayOperationsOpen;render();$('#dayActionView')?.focus?.({preventScroll:true});});
 const closeDayDialog=()=>{dayActionsOpen=false;dayOperationsOpen=false;render();root.querySelector('[data-select-day="'+day+'"]')?.focus?.({preventScroll:true});};
 $('#dayActionClose')?.addEventListener('click',closeDayDialog);
 $('#dayActionDismiss')?.addEventListener('click',closeDayDialog);
 $('#markDayEmpty')?.addEventListener('click',()=>markDay(day,true));
 $('#markDayChecked')?.addEventListener('click',()=>markDay(day,false));
 $('#clearDayAttention')?.addEventListener('click',()=>{
  const trigger=$('#clearDayAttention');if(!trigger||$('#traceDayClearPrompt'))return;
  const row=trigger.closest('.trace-day-secondary');if(!row)return;
  const panel=document.createElement('div');panel.id='traceDayClearPrompt';panel.className='trace-day-clear-prompt';
  panel.innerHTML='<strong>Vérification terminée ?</strong><p>Confirme seulement si tu as revu les lignes incertaines sur tes captures.</p><div class="trace-day-clear-buttons"><button type="button" class="primary" id="traceConfirmClear">Oui, j’ai vérifié</button><button type="button" class="secondary" id="traceCancelClear">Annuler</button></div><small id="traceClearError" role="status"></small>';
  row.insertAdjacentElement('afterend',panel);
  $('#traceCancelClear').onclick=()=>{panel.remove();trigger.focus({preventScroll:true});};
  $('#traceConfirmClear').onclick=async()=>{
   const button=$('#traceConfirmClear');button.disabled=true;
   try{await bridge.clearDayAttention(selectedAccount,day);render();showDayNotice('Lignes vérifiées');}
   catch(error){button.disabled=false;$('#traceClearError').textContent=error.message;}
  };
  $('#traceConfirmClear').focus({preventScroll:true});
 });
 $('#showAllDay')?.addEventListener('click',()=>bridge.goDayTransactions(day));
 root.querySelectorAll('[data-open-day-tx]').forEach(b=>b.onclick=()=>bridge.openTransaction(b.dataset.openDayTx));
}
async function markDay(day,empty){
 // The clearly labelled button already confirms the complete day; no native modal.
 const node=$('#markDay'+(empty?'Empty':'Checked'));if(node)node.disabled=true;
 try{await window.TraceBankBridge.markDayChecked(selectedAccount,day,empty);dayActionsOpen=false;dayOperationsOpen=false;render();showDayNotice(empty?'Journée validée sans mouvement':'Journée validée');}
 catch(error){if(node)node.disabled=false;const el=$('#calendarStatus');if(el)el.textContent=error.message;}
}
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||!dayActionsOpen)return;
 event.preventDefault();dayActionsOpen=false;dayOperationsOpen=false;render();
 const day=selectedDay;$('#importCalendar')?.querySelector?.('[data-select-day="'+day+'"]')?.focus?.({preventScroll:true});
});
window.TraceImportCalendar={render,selectedAccount:()=>selectedAccount,closeDayAction(){if(dayActionsOpen){dayActionsOpen=false;dayOperationsOpen=false;render();}},selectAccount(id){selectedAccount=id;selectedDay=null;dayActionsOpen=false;dayOperationsOpen=false;render();},openDayAction(accountId,date){selectedAccount=accountId;selectedDay=date;dayActionsOpen=true;dayOperationsOpen=false;render();}};
})();