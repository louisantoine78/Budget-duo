/* Trace 5.14 – import premium: day-first and visible quick action */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dateLabel=date=>new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
const amount=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
const stamp=s=>{if(!s)return'';const d=new Date(s);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);};
let selectedAccount=null,selectedDay=null,dayActionsOpen=false;
function dayTone(info){
 if(info.pending)return'pending';
 if(!info.entry)return'missing';
 if(info.entry.status==='empty')return'empty';
 if(info.entry.status==='checked')return'checked';
 return'received';
}
function render(){
 const root=$('#importCalendar'),bridge=window.TraceBankBridge;
 if(!root||!bridge)return;
 const accounts=bridge.accounts();
 if(!accounts.length){root.innerHTML='<div class="empty-note">Configure ton compte courant ou ta carte dans Patrimoine → Liquidités.</div>';return;}
 if(!accounts.some(a=>a.id===selectedAccount))selectedAccount=accounts[0].id;
 const month=bridge.month(),year=Number(month.slice(0,4)),m=Number(month.slice(5))-1,
  daysInMonth=new Date(year,m+1,0).getDate(),today=localToday();
 if(!selectedDay||!selectedDay.startsWith(month))selectedDay=month+'-'+String(Math.min(daysInMonth,Number(today.startsWith(month)?today.slice(8):1))).padStart(2,'0');
 const activeAccount=accounts.find(a=>a.id===selectedAccount),entries=bridge.importDays().filter(x=>x.accountId===selectedAccount),
  last=entries.filter(x=>x.lastImportedAt).sort((a,b)=>String(b.lastImportedAt).localeCompare(String(a.lastImportedAt)))[0],
  gaps=bridge.gaps(selectedAccount,month),weekOffset=(new Date(year,m,1).getDay()+6)%7;
 let completed=0,pending=0,available=0;const tiles=[];
 for(let p=0;p<weekOffset;p++)tiles.push('<span class="trace-cal-spacer" aria-hidden="true"></span>');
 for(let n=1;n<=daysInMonth;n++){
  const date=month+'-'+String(n).padStart(2,'0'),future=date>today,earlier=!bridge.afterBoundaryFor(selectedAccount,date),blocked=future||earlier,
   info=bridge.importDayInfo(selectedAccount,date),tone=blocked?'inactive':dayTone(info);
  if(!blocked){available++;if(info.entry&&['empty','checked','received','pending'].includes(tone))completed++;if(tone==='pending')pending++;}
  const markers={missing:'',empty:'✓',checked:'✓',received:'●',pending:'•',inactive:''};
  const selected=date===selectedDay;
  tiles.push('<button type="button" class="trace-cal-date trace-cal-'+tone+(selected?' is-selected':'')+'" data-select-day="'+date+'" aria-label="'+esc(date+' : '+(blocked?(future?'à venir':'hors période'):tone))+'" aria-pressed="'+selected+'"'+(blocked?' disabled':'')+'><strong>'+n+'</strong><small>'+markers[tone]+'</small></button>');
 }
 if(selectedDay>today||!bridge.afterBoundaryFor(selectedAccount,selectedDay)){const candidate=month+'-01';selectedDay=bridge.afterBoundaryFor(selectedAccount,candidate)&&candidate<=today?candidate:null;}
 const day=selectedDay,dayInfo=day?bridge.importDayInfo(selectedAccount,day):null,dayRows=day?bridge.dayTransactions(selectedAccount,day):[],
  tone=day?dayTone(dayInfo):'missing';
 const toneLabels={missing:'Non renseignée',empty:'Aucun mouvement confirmé',checked:'Journée contrôlée',received:'Captures reçues',pending:'Transactions à valider'};
 const accountTypeLabel=activeAccount.type==='card'?'Carte de crédit':activeAccount.type==='checking'?'Compte courant':'Compte bancaire';
 const accountIcon=activeAccount.type==='card'
  ?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>'
  :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-6 9 6M4 20h16M6 10v10M10 10v10M14 10v10M18 10v10"/></svg>';


 root.innerHTML='<div class="trace-cal-sticky" role="group" aria-label="Importer une journée sélectionnée">'+
 '<div class="trace-cal-sticky-copy"><small>JOURNÉE CHOISIE</small><strong id="calendarQuickDate">'+(day?esc(dateLabel(day)):'Sélectionne un jour')+'</strong></div>'+
 '<button class="primary trace-cal-quick-button" type="button" id="calendarQuickAdd"'+(!day?' disabled':'')+'>+ Ajouter des captures</button></div>'+
 (day&&dayActionsOpen?'<div class="trace-day-quick-menu" id="dayActionPanel" role="region" aria-label="Actions pour '+esc(dateLabel(day))+'" tabindex="-1">'+
 '<div class="trace-day-menu-heading"><div><span class="trace-kicker">JOURNÉE SÉLECTIONNÉE</span><b>'+esc(dateLabel(day))+'</b><small>'+esc(toneLabels[tone])+' · '+Number(dayRows.length)+' opération(s)</small></div>'+
 '<button class="trace-day-menu-close" type="button" id="dayActionClose" aria-label="Fermer le menu">×</button></div>'+
 '<button class="primary full trace-day-menu-import" id="dayActionImport" type="button">+ Ajouter des captures</button>'+
 '<div class="trace-day-menu-secondary"><button type="button" class="secondary" id="dayActionView">Voir cette journée</button>'+
 (!dayRows.length&&!dayInfo.entry?'<button type="button" class="secondary" id="dayActionEmpty">Aucun mouvement</button>':'')+'</div></div>':'')+
 '<section class="trace-daily-panel">'+
  '<div class="trace-daily-top"><div><span class="trace-kicker">JOURNAL BANCAIRE</span><h2>Chaque jour, au clair.</h2></div><span class="trace-daily-progress">'+completed+' / '+available+' jours renseignés</span></div>'+
  '<p class="trace-daily-sub">Sélectionne le compte et le jour, puis ajoute tes captures avec le bouton toujours accessible en haut. Tu peux aussi simplement consulter une journée.</p>'+
  '<div class="trace-account-field-label">COMPTE À SUIVRE</div>'+  '<div class="trace-account-picker"><span class="trace-account-picker-icon">'+accountIcon+'</span><span class="trace-account-picker-copy"><strong>'+esc(activeAccount.name)+'</strong><small>'+esc(accountTypeLabel)+'</small></span><svg class="trace-account-picker-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>'+  '<select id="calendarAccount" class="trace-account-native" aria-label="Changer de compte bancaire">'+accounts.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===selectedAccount?' selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></div>'+
  '<p class="trace-account-purpose">'+(activeAccount.type==='card'?'Compte carte : suis ici les achats et remboursements par carte.':activeAccount.type==='checking'?'Compte courant : importe surtout les revenus, virements et remboursements reçus.':'Chaque compte est suivi séparément. Les mêmes opérations ne doivent pas être importées sur deux comptes.')+'</p>'+
  '<div class="trace-daily-legend"><span><i class="cal-dot received"></i> Capture reçue</span><span><i class="cal-dot pending"></i> À valider</span><span><i class="cal-dot checked"></i> Contrôlé</span></div>'+
  '<p class="trace-cal-legend-help">Les symboles apparaissent <b>sur les dates ci-dessous</b> pour ce compte : point = capture reçue, point accentué = transactions en attente, coche = journée contrôlée. Une date sans symbole n’a pas encore été renseignée.</p>'+
  '<div class="trace-cal-grid"><div class="trace-cal-week">L</div><div class="trace-cal-week">M</div><div class="trace-cal-week">M</div><div class="trace-cal-week">J</div><div class="trace-cal-week">V</div><div class="trace-cal-week">S</div><div class="trace-cal-week">D</div>'+tiles.join('')+'</div>'+
  (gaps.length?'<div class="trace-gap-warning"><b>'+gaps.length+' jour'+(gaps.length>1?'s':'')+' à vérifier</b> entre les imports : '+gaps.map(x=>x.slice(8)+'/'+x.slice(5,7)).join(', ')+'. Tu peux continuer les autres imports normalement.</div>':'')+
  (last?'<div class="trace-last-import">Dernier import : '+esc(stamp(last.lastImportedAt))+' · opérations du '+esc(last.date)+'</div>':'<div class="trace-last-import">Aucun import enregistré pour ce compte.</div>')+
  (day?'<div class="trace-day-detail" id="traceDayDetail"><div class="trace-detail-head"><div><span class="trace-kicker">JOURNÉE SÉLECTIONNÉE</span><h3>'+esc(dateLabel(day))+'</h3></div><span class="trace-detail-pill trace-pill-'+tone+'">'+esc(toneLabels[tone])+'</span></div>'+
    '<p class="trace-day-desc">'+(dayInfo.entry?.captureCount?'Captures enregistrées : '+Number(dayInfo.entry.captureCount)+' · ':'')+dayInfo.confirmed+' validée(s), '+dayInfo.pending+' à valider'+(dayInfo.entry?.lastImportedAt?' · import '+esc(stamp(dayInfo.entry.lastImportedAt)):'')+'</p>'+
    (dayRows.length?'<div class="trace-day-operations">'+dayRows.slice(0,5).map(t=>'<button type="button" class="trace-day-operation" data-open-day-tx="'+esc(t.id)+'"><span><strong>'+esc(t.name||'Opération')+'</strong><small>'+(t.status==='confirmed'?'Validée':'À valider')+' · '+esc(t.type==='income'?'Revenu':t.type==='refund'?'Remboursement':'Dépense')+'</small></span><b>'+amount(t.amountCAD)+' ›</b></button>').join('')+'</div>':'<div class="trace-detail-empty">Aucune opération enregistrée pour cette journée.</div>')+
    (dayRows.length>5?'<button type="button" class="trace-text-action" id="showAllDay">Voir toutes les opérations dans Activité ›</button>':'')+
    '<div class="trace-day-actions"><button type="button" id="importSelectedDay" class="primary">+ Autres captures pour ce jour</button>'+
    (!dayInfo.entry&&!dayRows.length?'<button type="button" id="markDayEmpty" class="secondary">Aucun mouvement</button>':'')+
    (dayInfo.entry&&dayInfo.entry.status!=='checked'&&dayInfo.entry.status!=='empty'&&!dayInfo.pending?'<button type="button" id="markDayChecked" class="secondary">Marquer contrôlée</button>':'')+
    '</div><p class="trace-day-tip">Plusieurs captures sont acceptées le même jour. Les achats classés sont validés dès la confirmation de l’import ; seules les exceptions restent dans « À valider ».</p></div>':'<div class="trace-detail-empty">Sélectionne une journée ouverte dans ce mois.</div>')+
  '<div id="calendarStatus" class="trace-feedback" role="status"></div></section>';
 $('#calendarAccount').onchange=e=>{selectedAccount=e.target.value;selectedDay=null;dayActionsOpen=false;render();};
 root.querySelectorAll('[data-select-day]').forEach(b=>b.onclick=()=>{
  selectedDay=b.dataset.selectDay;dayActionsOpen=true;render();
  $('#dayActionPanel')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 });
 const openPicker=()=>{const input=$('#importFile');if(!day||!input)return;input.dataset.preferredDate=day;input.dataset.preferredAccount=selectedAccount;input.value='';input.click();};
 $('#dayActionImport')?.addEventListener('click',openPicker);
 $('#dayActionView')?.addEventListener('click',()=>{
  dayActionsOpen=false;render();
  $('#traceDayDetail')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 });
 $('#dayActionClose')?.addEventListener('click',()=>{dayActionsOpen=false;render();});
 $('#dayActionEmpty')?.addEventListener('click',()=>markDay(day,true));
 $('#calendarQuickAdd')?.addEventListener('click',openPicker);
 $('#importSelectedDay')?.addEventListener('click',openPicker);
 $('#markDayEmpty')?.addEventListener('click',()=>markDay(day,true));
 $('#markDayChecked')?.addEventListener('click',()=>markDay(day,false));
 $('#showAllDay')?.addEventListener('click',()=>bridge.goDayTransactions(day));
 root.querySelectorAll('[data-open-day-tx]').forEach(b=>b.onclick=()=>bridge.openTransaction(b.dataset.openDayTx));
}
async function markDay(day,empty){
 if(!window.confirm(empty?'Confirmer : aucun mouvement le '+day+' ?':'Toutes les opérations du '+day+' ont été vérifiées ?'))return;
 const node=$('#markDay'+(empty?'Empty':'Checked'));if(node)node.disabled=true;
 try{await window.TraceBankBridge.markDayChecked(selectedAccount,day,empty);dayActionsOpen=false;render();}
 catch(error){if(node)node.disabled=false;const el=$('#calendarStatus');if(el)el.textContent=error.message;}
}
window.TraceImportCalendar={render,selectAccount(id){selectedAccount=id;selectedDay=null;dayActionsOpen=false;render();}};
})();