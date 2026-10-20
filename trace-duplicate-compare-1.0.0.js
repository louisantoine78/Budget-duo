/* TRACE 5.36.5 — Show precisely which real transaction an OCR draft resembles.
   Read-only UI: matching and approval safeguards remain in the application. */
(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const amount=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))?new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)):'Montant à vérifier';
const status=x=>x==='recorded'?'Déjà comptabilisée':x==='pending'?'Autre capture en attente':'Opération enregistrée à vérifier';
function candidates(matches=[],inspected=null){
 const normalized=(matches||[]).map(m=>({
  id:m.id||'',name:m.name||'Libellé à vérifier',date:m.date||'',amount:m.amount,
  accountName:m.accountName||'',categoryName:m.categoryName||'',status:m.status||'',
  source:m.source||'',exact:!!m.exact
 }));
 if(inspected&&['already','possible'].includes(inspected.status)&&inspected.matchName){
  if(!normalized.some(c=>inspected.matchId&&c.id===inspected.matchId)){
   normalized.push({id:inspected.matchId||'',name:inspected.matchName,date:inspected.matchDate||'',
    amount:inspected.matchAmount,accountName:inspected.matchAccount||'',
    categoryName:inspected.matchCategory||'',status:inspected.matchRecorded?'recorded':'unconfirmed',
    source:inspected.matchSource||'',exact:inspected.matchStatus==='exact'});
  }
 }
 return normalized.sort((a,b)=>{
  const pr=x=>x.status==='recorded'?2:x.status==='unconfirmed'?1:0;
  return pr(b)-pr(a)||Number(b.exact)-Number(a.exact);
 }).slice(0,6);
}
function facts({name,date,amount:sum,accountName,categoryName,status:state,source}={}){
 return '<strong class="trace-dupe-name">'+esc(name||'Libellé à vérifier')+'</strong>'+
 '<span class="trace-dupe-amount">'+amount(sum)+'</span>'+
 '<div class="trace-dupe-meta">'+
 '<span>Date : <b>'+esc(date||'À vérifier')+'</b></span>'+
 '<span>Compte : <b>'+esc(accountName||'Non précisé')+'</b></span>'+
 (categoryName?'<span>Catégorie : <b>'+esc(categoryName)+'</b></span>':'')+
 (source?'<span>Origine : <b>'+esc(source)+'</b></span>':'')+
 (state?'<span>État : <b>'+esc(status(state))+'</b></span>':'')+
 '</div>';
}
function render({draft={},matches=[],inspected=null,accountName=''}={}){
 const list=candidates(matches,inspected);if(!list.length)return'';
 let html='<div class="trace-dupe-compare" aria-label="Comparaison avec les opérations existantes">'+
  '<div class="trace-dupe-heading"><strong>Compare les deux opérations</strong>'+
  '<span>Voici précisément ce que TRACE a trouvé.</span></div>'+
  '<div class="trace-dupe-record trace-dupe-current"><span class="trace-dupe-tag">Ta ligne à importer</span>'+
   facts({...draft,accountName:accountName||draft.accountName,status:''})+'</div>';
 html+=list.map((m,i)=>'<div class="trace-dupe-record trace-dupe-existing">'+
  '<span class="trace-dupe-tag">'+(m.status==='recorded'?'Transaction déjà comptabilisée':
    m.status==='pending'?'Autre capture en attente':'Transaction ressemblante n°'+(i+1))+'</span>'+
  facts(m)+'</div>').join('');
 html+='<p class="trace-dupe-help">Vérifie surtout le compte, la date, le montant et le commerçant. Deux achats du même montant peuvent être différents. Écarte uniquement la ligne à importer si elle correspond vraiment à une transaction déjà enregistrée.</p></div>';
 return html;
}
root.TraceDuplicateCompare=Object.freeze({candidates,render});
})(typeof window!=='undefined'?window:globalThis);
