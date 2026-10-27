/* TRACE Insights 1.0 — read-only presentations of confirmed budget and asset data. */
(function(root){'use strict';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmt=n=>new Intl.NumberFormat('fr-CA',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' $';
const round=n=>Math.round((Number(n)||0)*100)/100;
const pct=(a,b)=>b>0?Math.round(100*Math.max(0,a)/b):0;
const monthName=m=>{const d=/^(\d{4})-(\d\d)$/.exec(String(m||''));return d?new Date(Number(d[1]),Number(d[2])-1,1).toLocaleDateString('fr-CA',{month:'long'}):m;};
function categoryRows(rows,totalExpense){
 const items=(rows||[]).map(c=>({id:String(c.id||''),name:c.name||'Autre',actual:round(c.actual),budget:round(c.budget)}));
 const attributed=items.reduce((n,c)=>n+c.actual,0);
 const leftover=Math.max(0,round(totalExpense-attributed));
 if(leftover>.005)items.push({id:'',name:'Autres dépenses / catégories masquées',actual:leftover,budget:0});
 return items.filter(c=>c.actual>.005||c.budget>.005).sort((a,b)=>b.actual-a.actual||b.budget-a.budget||a.name.localeCompare(b.name));
}
function renderCategories(target,{rows=[],totalExpense=0,budgetTotal=0,month='',onCategory=null,limit=0,showSummary=false}={}){
 if(!target)return;
 const cats=categoryRows(rows,totalExpense),spent=round(totalExpense),planned=round(budgetTotal);
 let output='<div class="trace-insights-head"><div><strong>Où va mon argent ?</strong><small>'+esc(monthName(month))+' · dépenses confirmées par catégorie</small></div><b>'+fmt(spent)+'</b></div>'+
  (showSummary?'<div class="trace-budget-snapshot"><div class="trace-budget-ring" style="--trace-budget-pct:'+Math.min(100,pct(spent,planned))+'%;" role="img" aria-label="'+
   (planned>0?pct(spent,planned)+' % du budget consommé':'Budget non défini')+'"><b>'+(planned>0?pct(spent,planned)+' %':'—')+'</b></div>'+
   '<div><strong>'+(planned>0?'Budget consommé':'Budget à compléter')+'</strong><span>'+fmt(spent)+' dépensés'+(planned>0?' sur '+fmt(planned):'')+'</span><small>'+
   (planned>0?(spent>planned?'Dépassement de '+fmt(spent-planned):'Encore '+fmt(planned-spent)+' sur ton budget'):'Ajoute tes catégories prévues pour suivre la progression')+'</small></div></div>':'')+
  '<p class="trace-insights-explain">La part des dépenses montre leur répartition. Le pourcentage du budget et la barre indiquent la progression de chaque catégorie.</p>';
 if(!cats.length){target.innerHTML=output+'<div class="trace-insights-empty">Aucune dépense confirmée sur ce mois. Importe tes opérations pour voir la répartition réelle.</div>';return;}
 output+='<div class="trace-insight-category-list">'+cats.map((c,i)=>{
   const over=c.budget>0&&c.actual>c.budget+.005,unused=Math.max(0,c.budget-c.actual),used=pct(c.actual,spent),
    consumed=pct(c.actual,c.budget),state=!c.budget?'unbudgeted':over?'over':consumed>=80?'near':'within';
   const status=!c.budget?'Sans budget prévu':over?'Budget dépassé de '+fmt(c.actual-c.budget):'Reste '+fmt(unused);
   return '<button type="button" class="trace-insight-category'+(over?' trace-insight-over':'')+'"'+(limit&&i>=limit?' hidden':'')+' data-budget-state="'+state+'" data-insight-category="'+esc(c.id)+'">'+
    '<span class="trace-insight-category-main"><strong>'+esc(c.name)+'</strong><small>'+(c.budget?consumed+' % du budget · ':'')+esc(status)+
    '</small><small class="trace-insight-spending-share">'+used+' % des dépenses du mois</small></span>'+
    '<span class="trace-insight-category-value">'+fmt(c.actual)+'<small>'+(c.budget?'/ '+fmt(c.budget)+' prévu':'Non budgété')+'</small></span>'+
    '<span class="trace-insight-category-track"><i style="width:'+Math.min(100,c.budget?pct(c.actual,c.budget):0)+'%"></i></span></button>';
 }).join('')+'</div>';
 if(limit&&cats.length>limit)output+='<button class="trace-insight-more" type="button" data-insight-expand>Afficher les '+(cats.length-limit)+' autres catégories <span aria-hidden="true">↓</span></button>';
 output+='<p class="trace-insights-foot">Total du mois : '+fmt(spent)+' dépensés'+(planned?' sur '+fmt(planned)+' prévus.':' · aucun budget global prévu.')+' Les virements internes et paiements de carte ne sont pas des dépenses.</p>';
 target.innerHTML=output;
 target.querySelector('[data-insight-expand]')?.addEventListener('click',e=>{
  target.querySelectorAll('.trace-insight-category[hidden]').forEach(el=>{el.hidden=false;});
  e.currentTarget.remove();
 });
 if(onCategory)target.querySelectorAll('[data-insight-category]').forEach(btn=>btn.addEventListener('click',()=>onCategory(btn.dataset.insightCategory)));
}
function trendRows(months){
 return (months||[]).map(v=>({...v,income:round(v.income),expense:round(v.expense),saving:round(v.saving),budget:round(v.budget||v.eb),hasData:Boolean(v.hasData)}));
}
function renderTrend(target,{months=[],selected='',headline=true,compact=false}={}){
 if(!target)return;
 const data=trendRows(months),valid=data.filter(v=>v.hasData),max=Math.max(1,...valid.map(v=>v.expense));
 const month=valid.find(v=>v.month===selected)||valid[valid.length-1];
 const previous=valid.filter(v=>v.month!==month?.month&&v.month<month?.month).slice(-1)[0];
 const comparison=month&&previous?round(month.expense-previous.expense):null;
 if(compact){
  if(!valid.length){target.innerHTML='<div class="trace-insights-empty">Pas encore de mois renseigné. Ton évolution apparaîtra après tes premiers imports.</div>';return;}
  const scale=Math.max(1,...valid.flatMap(x=>[Math.max(0,x.expense),Math.max(0,x.budget)]));
  target.innerHTML='<div class="trace-trend-compact"><div class="trace-trend-summary"><span>'+
   esc(monthName(month.month))+(month.current?' · en cours':'')+'</span><strong>'+fmt(month.expense)+
   ' <small>de dépenses</small></strong><p>'+(comparison===null?'Premier mois documenté':
   (comparison>0?'+':comparison<0?'−':'')+fmt(Math.abs(comparison))+' par rapport à '+esc(monthName(previous.month)))+
   (month.current?' · provisoire':'')+'</p></div>'+
   '<div class="trace-trend-columns">'+data.map(v=>
    '<div class="trace-trend-col"><div class="trace-trend-bars" role="img" aria-label="'+esc(monthName(v.month))+' : '+
     (v.hasData?fmt(v.expense)+' dépensés'+(v.budget>0?' ; '+fmt(v.budget)+' prévus':''):'non renseigné')+'">'+
     (v.hasData?'<i class="is-planned" style="height:'+Math.max(0,Math.round(v.budget/scale*72))+'px"></i>'+
      '<i class="is-spent" style="height:'+Math.max(0,Math.round(v.expense/scale*72))+'px"></i>':'<span>—</span>')+
     '</div><small>'+esc(monthName(v.month).slice(0,3))+'</small><b>'+(v.hasData?fmt(v.expense):'—')+'</b></div>'
   ).join('')+'</div><p class="trace-insights-foot">« — » = mois non renseigné. Les jours non importés peuvent encore changer ce bilan.</p></div>';
  return;
 }
 let output='';
 if(headline)output='<div class="trace-insights-head"><div><strong>Comment évoluent mes dépenses ?</strong><small>6 mois · dépenses et marge après dépenses</small></div></div>';
 output+='<p class="trace-insights-explain">Dépenses = achats et factures confirmés. Marge = revenus moins dépenses, pas nécessairement de l’argent placé.</p>';
 if(!valid.length){target.innerHTML=output+'<div class="trace-insights-empty">Pas encore de mois avec des dépenses ou des budgets enregistrés. L’évolution apparaîtra après tes premiers imports.</div>';return;}
 if(month)output+='<div class="trace-insights-highlight"><span>'+esc(monthName(month.month))+' · '+(month.current?'mois en cours':'mois renseigné')+'</span><strong>'+fmt(month.expense)+' de dépenses</strong>'+
 (comparison===null?'<small>Pas de mois précédent comparable enregistré.</small>':
 '<small>'+(comparison>0?'+' : comparison<0?'−':'')+fmt(Math.abs(comparison))+' par rapport à '+esc(monthName(previous.month))+(month.current?' · comparaison provisoire':'')+'</small>')+
 '</div>';
 output+='<div class="trace-insights-months">'+data.map(v=>'<div class="trace-insight-month"><span>'+esc(monthName(v.month))+(v.current?' <i>en cours</i>':'')+'</span>'+
 '<div class="trace-insight-month-track"><i style="width:'+(v.hasData?Math.max(3,Math.round(v.expense/max*100)):0)+'%"></i></div>'+
 '<strong>'+(v.hasData?fmt(v.expense):'—')+'</strong></div>').join('')+'</div>';
 if(month)output+='<div class="trace-insight-statpair"><div><small>Revenus de '+esc(monthName(month.month))+'</small><b>'+fmt(month.income)+'</b></div>'+
 '<div><small>Marge du mois</small><b>'+fmt(month.saving)+'</b></div></div>';
 output+='<p class="trace-insights-foot">Les mois non renseignés ne sont pas traités comme des mois à 0 $. Les mois en cours et les jours non importés peuvent changer ce bilan.</p>';
 target.innerHTML=output;
}
function renderAnnual(target,{months=[],year=''}={}){
 if(!target)return;
 const past=(months||[]).filter(m=>m.elapsed&&(m.hasBudget||m.hasTransactions)),shown=(months||[]).filter(m=>m.hasBudget||m.hasTransactions);
 const spent=round(past.reduce((n,m)=>n+(m.expense||0),0)),planned=round(past.reduce((n,m)=>n+(m.budget||0),0));
 let html='<div class="trace-insights-head"><div><strong>Mon année '+esc(year)+'</strong><small>Mois documentés · comparaison au budget prévu</small></div></div>';
 html+='<div class="trace-insight-statpair"><div><small>Achats et factures enregistrés</small><b>'+fmt(spent)+'</b></div><div><small>Budget sur les mois concernés</small><b>'+fmt(planned)+'</b></div></div>';
 html+='<p class="trace-insights-explain">Sélectionne un mois pour ajuster ses catégories. « Non renseigné » ne signifie pas que tu n’as rien dépensé.</p>';
 html+='<div class="trace-insight-yearrows">'+(months||[]).map(m=>{
  const absent=!m.hasBudget&&!m.hasTransactions,future=!m.elapsed,over=m.hasBudget&&m.expense>m.budget+.005,
   balance=round((m.budget||0)-(m.expense||0));
  return '<button type="button" class="trace-insight-yearrow'+(m.selected?' is-selected':'')+'" data-insight-month="'+esc(m.month)+'">'+
   '<span class="trace-insight-yearname">'+esc(monthName(m.month))+'<small>'+(absent?'Non renseigné':future?'Budget futur':!m.hasBudget?'Sans budget prévu':over?'Dépassement de '+fmt(-balance):'Reste '+fmt(balance))+'</small></span>'+
   '<span class="trace-insight-yearfig"><b>'+(absent?'—':fmt(m.expense))+'</b><small>'+(m.hasBudget?'/ '+fmt(m.budget)+' prévu':'Budget non défini')+'</small></span></button>';
 }).join('')+'</div>';
 if(!shown.length)html+='<div class="trace-insights-empty">Aucun mois renseigné pour cette année. Commence par ton budget mensuel.</div>';
 html+='<p class="trace-insights-foot">Totaux calculés uniquement sur les mois écoulés et renseignés. Les périodes sans imports complets peuvent encore évoluer.</p>';
 target.innerHTML=html;
}
function renderWealth(target,{checking=null,cardDebt=null,investments=[],flows=[],hasIncomplete=false}={}){
 if(!target)return;
 const knownMoney=n=>typeof n==='number'&&Number.isFinite(n),
  known=investments.filter(x=>x.ready!==false&&knownMoney(x.cad)),investTotal=round(known.reduce((n,x)=>n+x.cad,0)),
  complete=!hasIncomplete&&knownMoney(checking)&&known.length===investments.length;
 const deposits=round(flows.filter(f=>f.kind==='deposit').reduce((n,f)=>n+f.amount,0));
 const withdrawals=round(flows.filter(f=>f.kind==='withdrawal').reduce((n,f)=>n+f.amount,0));
 const months=[...new Set(flows.map(f=>f.month).filter(Boolean))].sort().reverse().slice(0,5);
 let html='<div class="trace-insights-head"><div><strong>Comprendre mon patrimoine</strong><small>Valeurs actuelles et mouvements réellement enregistrés</small></div></div>'+
 '<div class="trace-insight-statpair">'+
 '<div><small>Comptes et placements suivis</small><b>'+(complete?fmt(checking+investTotal):'Total incomplet')+'</b></div>'+
 '<div><small>Dettes de carte connues</small><b>'+(knownMoney(cardDebt)?fmt(cardDebt):'À vérifier')+'</b></div></div>'+
 '<p class="trace-insights-explain">Un virement vers le CELI déplace ton argent, il ne crée pas un enrichissement. Les rendements ne sont pas déduits des versements.</p>';
 html+='<div class="trace-insight-wealthaccounts">'+known.map(x=>
 '<div class="trace-insight-wealthrow"><span><strong>'+esc(x.name)+'</strong><small>'+(x.linked?'Estimation basée sur tes virements':'Valorisation selon les cours enregistrés')+'</small></span><b>'+fmt(x.cad)+'</b></div>').join('')+'</div>';
 html+='<div class="trace-insight-statpair">'+
 '<div><small>Versements identifiés</small><b>'+fmt(deposits)+'</b></div>'+
 '<div><small>Retraits identifiés</small><b>'+fmt(withdrawals)+'</b></div></div>';
 html+=months.length?'<strong class="trace-insight-smallhead">Mouvements par mois</strong><div class="trace-insight-monthflows">'+months.map(m=>{
  const lines=flows.filter(f=>f.month===m);
  const total=round(lines.reduce((n,f)=>n+(f.kind==='deposit'?f.amount:-f.amount),0));
  return '<div class="trace-insight-flowrow"><span>'+esc(monthName(m))+'</span><b>'+(total>0?'+':total<0?'−':'')+fmt(Math.abs(total))+'</b></div>';
 }).join('')+'</div>':'<div class="trace-insights-empty">Aucun versement ou retrait daté avec montant CAD historique pour documenter une évolution.</div>';
 html+='<p class="trace-insights-foot">Ce tableau montre les flux documentés, pas une courbe de performance historique. Pour mesurer les gains mois par mois, TRACE aura besoin de valorisations datées. '+(hasIncomplete?'Certains comptes n’ont pas de solde initial ou de conversion CAD.':'')+'</p>';
 target.innerHTML=html;
}
root.TraceInsights=Object.freeze({categoryRows,renderCategories,renderTrend,renderAnnual,renderWealth,fmt,pct});
})(typeof window!=='undefined'?window:globalThis);
