/* Trace 5.9 – suivi mensuel des captures et journées couvertes */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
let selectedAccount=null;
function statusText(info){
 if(!info.entry)return{label:'À importer',tone:'missing'};
 if(info.entry.status==='empty')return{label:'✓ Aucun mouvement',tone:'checked'};
 if(info.pending)return{label:'✓ Capture reçue · '+info.pending+' à valider',tone:'pending'};
 if(info.entry.status==='checked')return{label:'✓ Journée contrôlée',tone:'checked'};
 return{label:'✓ Capture reçue',tone:'received'};
}
function formatStamp(value){
 if(!value)return'—';
 const d=new Date(value);return Number.isNaN(+d)?'—':new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
}
function render(){
 const root=$('#importCalendar'),bridge=window.TraceBankBridge;
 if(!root||!bridge)return;
 const accounts=bridge.accounts();
 if(!accounts.length){root.innerHTML='<div class="empty-note">Configure d’abord ton compte dans Patrimoine → Liquidités.</div>';return;}
 if(!accounts.some(a=>a.id===selectedAccount))selectedAccount=accounts[0].id;
 const month=bridge.month(),year=Number(month.slice(0,4)),mon=Number(month.slice(5))-1,
  max=new Date(year,mon+1,0).getDate(),today=localToday(),account=accounts.find(a=>a.id===selectedAccount);
 const entries=bridge.importDays().filter(d=>d.accountId===selectedAccount);
 const latest=entries.filter(d=>d.lastImportedAt).sort((a,b)=>String(b.lastImportedAt).localeCompare(String(a.lastImportedAt)))[0];
 const gaps=bridge.gaps(selectedAccount,month);
 const statusCount={received:0,pending:0,checked:0,missing:0};
 const days=[];
 for(let i=1;i<=max;i++){
  const date=month+'-'+String(i).padStart(2,'0'),pastBoundary=!bridge.afterBoundaryFor(selectedAccount,date),future=date>today,
   info=bridge.importDayInfo(selectedAccount,date),status=statusText(info),weekday=new Intl.DateTimeFormat('fr-CA',{weekday:'short'}).format(new Date(year,mon,i,12)).replace('.','');
  if(!future&&!pastBoundary)statusCount[status.tone]=(statusCount[status.tone]||0)+1;
  const disabled=future||pastBoundary?' disabled':'';
  days.push('<div class="trace-day '+(future||pastBoundary?'trace-day-future':'')+'" data-day="'+date+'">'+
   '<div class="trace-day-meta"><span class="trace-day-num">'+i+'</span><span class="trace-day-week">'+esc(weekday)+'</span></div>'+
   '<div class="trace-day-status"><strong class="trace-status-'+status.tone+'">'+esc(future?'À venir':pastBoundary?'Avant le solde initial':status.label)+'</strong>'+
   (info.entry?.lastImportedAt?'<small>Dernier import : '+esc(formatStamp(info.entry.lastImportedAt))+'</small>':'')+'</div>'+
   '<button type="button" class="trace-day-action" data-day-import="'+date+'" aria-label="Importer le '+date+'"'+disabled+'>Importer</button>'+
   (!future&&!pastBoundary&&!info.entry?'<button type="button" class="trace-day-empty" data-day-empty="'+date+'">Aucun mouvement</button>':'')+
   (!future&&!pastBoundary&&info.entry&&info.entry.status!=='checked'&&info.entry.status!=='empty'&&!info.pending?'<button type="button" class="trace-day-check" data-day-check="'+date+'">Contrôlé</button>':'')+
   '</div>');
 }
 root.innerHTML='<div class="trace-import-daily-head"><b>Suivi quotidien des captures</b><small>Une journée peut contenir plusieurs captures. La coche « capture reçue » ne remplace pas la validation finale des transactions.</small></div>'+
 '<label class="label2" for="calendarAccount">Compte à suivre</label><select id="calendarAccount" class="input">'+accounts.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===selectedAccount?' selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select>'+
 '<div class="trace-import-overview"><span>Captures reçues : <b>'+((statusCount.received||0)+(statusCount.pending||0)+(statusCount.checked||0))+'</b></span>'+
 '<span>Jours non renseignés : <b>'+(statusCount.missing||0)+'</b></span></div>'+
 (latest?'<div class="trace-last-import">Dernier import : <b>'+esc(formatStamp(latest.lastImportedAt))+'</b> · transactions du '+esc(latest.date)+'</div>':'<div class="trace-last-import">Aucune capture importée sur ce compte.</div>')+
 (gaps.length?'<div class="trace-gap-warning" role="status">Journée'+(gaps.length>1?'s':'')+' à vérifier entre deux imports : <b>'+gaps.map(d=>d.slice(8)+'/'+d.slice(5,7)).join(', ')+'</b>. Tu peux importer les captures manquantes ou indiquer « Aucun mouvement ».</div>':'')+
 '<div class="trace-day-list">'+days.join('')+'</div>'+
 '<div class="trace-pdf-note">En fin de mois, importe ton relevé PDF avec « Choisir un fichier » ci-dessous. Il servira au rapprochement des transactions et ne cochera pas automatiquement toutes les journées.</div>'+
 '<div id="calendarStatus" class="trace-feedback" role="status"></div>';
 $('#calendarAccount').onchange=e=>{selectedAccount=e.target.value;render();};
 root.querySelectorAll('[data-day-import]').forEach(b=>b.onclick=()=>{
  const input=$('#importFile');if(!input)return;
  input.dataset.preferredDate=b.dataset.dayImport;
  input.dataset.preferredAccount=selectedAccount;
  input.value='';
  input.click();
 });
 root.querySelectorAll('[data-day-empty]').forEach(b=>b.onclick=()=>submitEmpty(b.dataset.dayEmpty,true));
 root.querySelectorAll('[data-day-check]').forEach(b=>b.onclick=()=>submitEmpty(b.dataset.dayCheck,false));
}
async function submitEmpty(date,empty){
 const bridge=window.TraceBankBridge,accountId=selectedAccount;
 const label=empty?'Confirmer qu’il n’y a eu aucune transaction le '+date+' ?':'Confirmer que toutes les transactions du '+date+' ont été vérifiées ?';
 if(!window.confirm(label))return;
 const btn=$('[data-day-'+(empty?'empty':'check')+'="'+date+'"]');if(btn)btn.disabled=true;
 try{await bridge.markDayChecked(accountId,date,empty);render();}
 catch(error){if(btn)btn.disabled=false;const err=$('#calendarStatus');if(err)err.textContent=error.message;}
}
window.TraceImportCalendar={render,selectAccount(id){selectedAccount=id;render();}};
})();