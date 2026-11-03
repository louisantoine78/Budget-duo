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
function renderCategories(target,{rows=[],totalExpense=0,budgetTotal=0,month='',onCategory=null,limit=0,showSummary=false,showAllCategories=false}={}){
 if(!target)return;
 const cats=categoryRows(rows,totalExpense),inactive=showAllCategories?
   (rows||[]).filter(c=>!c.archived&&round(c.actual)<=.005&&round(c.budget)<=.005).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''), 'fr')):[],
  spent=round(totalExpense),planned=round(budgetTotal);
 let output='<div class="trace-insights-head"><div><strong>Où va mon argent ?</strong><small>'+esc(monthName(month))+' · dépenses confirmées par catégorie</small></div><b>'+fmt(spent)+'</b></div>'+
  (showSummary?'<div class="trace-budget-snapshot"><div class="trace-budget-ring" style="--trace-budget-pct:'+Math.min(100,pct(spent,planned))+'%;" role="img" aria-label="'+
   (planned>0?pct(spent,planned)+' % du budget consommé':'Budget non défini')+'"><b>'+(planned>0?pct(spent,planned)+' %':'—')+'</b></div>'+
   '<div><strong>'+(planned>0?'Budget consommé':'Budget à compléter')+'</strong><span>'+fmt(spent)+' dépensés'+(planned>0?' sur '+fmt(planned):'')+'</span><small>'+
   (planned>0?(spent>planned?'Dépassement de '+fmt(spent-planned):'Encore '+fmt(planned-spent)+' sur ton budget'):'Ajoute tes catégories prévues pour suivre la progression')+'</small></div></div>':'')+
  '<p class="trace-insights-explain">Répartition des dépenses confirmées · progression par rapport au budget prévu.</p>';
 if(!cats.length&&!inactive.length){target.innerHTML=output+'<div class="trace-insights-empty">Aucune dépense confirmée sur ce mois. Importe tes opérations pour voir la répartition réelle.</div>';return;}
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
 if(inactive.length)output+='<div class="trace-insight-inactive"><div class="trace-insight-inactive-title">Autres catégories <small>Aucune dépense ni prévision ce mois</small></div>'+
  inactive.map(c=>'<button type="button" class="trace-insight-inactive-row" data-insight-category="'+esc(String(c.id||''))+'" aria-label="Consulter '+esc(c.name)+' · aucune dépense ni prévision"><span>'+esc(c.name)+'</span><small>0 $ · non budgété</small></button>').join('')+'</div>';
 output+='<p class="trace-insights-foot"><strong>'+fmt(spent)+' dépensés</strong>'+
  (planned?' sur '+fmt(planned)+' prévus':' · aucun budget global prévu')+
  ' · virements internes et paiements de carte exclus.</p>';
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
   '<div class="trace-trend-columns" tabindex="0" role="region" aria-label="Évolution des dépenses par mois · faire défiler horizontalement">'+data.map(v=>
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
function renderAnnual(target,{months=[],year='',topCategory=null}={}){
 if(!target)return;
 const elapsed=(months||[]).filter(m=>m.elapsed);
 // A statement-import gap is not evidence of zero spending. No projection,
 // annualized estimate, or savings claim is made from partial statements.
 const recorded=elapsed.filter(m=>m.hasTransactions);
 const budgeted=elapsed.filter(m=>m.hasBudget);
 // Income-only or transfer-only months cannot establish zero expenses.
 const comparable=elapsed.filter(m=>m.hasBudget&&
  (m.hasExpenseTransactions??m.hasTransactions));
 const income=round(recorded.reduce((n,m)=>n+(m.income||0),0));
 const spent=round(recorded.reduce((n,m)=>n+(m.expense||0),0));
 const result=round(income-spent);
 const planned=round(comparable.reduce((n,m)=>n+(m.budget||0),0));
 const comparableSpent=round(comparable.reduce((n,m)=>n+(m.expense||0),0));
 const difference=round(planned-comparableSpent);
 const overMonths=comparable.filter(m=>Number(m.expense||0)>Number(m.budget||0)+.005).length;
 const missing=elapsed.length-recorded.length,hasActual=recorded.length>0,
  peak=recorded.length>1?[...recorded].filter(m=>m.expense>.005).sort((a,b)=>b.expense-a.expense)[0]:null,
  spendingShare=hasActual&&income>.005?Math.round(spent/income*100):null,
  shown=n=>hasActual?fmt(n):'—';
 const chosen=(months||[]).find(m=>m.selected)||(months||[]).find(m=>m.current)||(months||[])[0];
 const maxValue=Math.max(1,...(months||[]).map(m=>Math.max(Number(m.budget)||0,Number(m.expense)||0)));
 const widths=m=>({budget:Math.min(100,Math.max(0,Number(m.budget||0)/maxValue*100)),
  spent:Math.min(100,Math.max(0,Number(m.expense||0)/maxValue*100))});
 const comparableLabel=comparable.length+' mois comparable'+(comparable.length>1?'s':'');
 let html='<div class="trace-year-header"><div><strong>Bilan '+esc(year)+'</strong>'+
  '<small>Opérations confirmées, sans estimation des mois manquants</small></div>'+
  '<span class="trace-year-coverage">'+recorded.length+' / '+elapsed.length+' mois avec mouvements</span></div>';
 html+='<section class="trace-year-result" aria-label="Bilan des opérations confirmées">'+
  '<div class="trace-year-result-main"><small>Différence revenus − dépenses</small>'+
  '<strong class="'+(result<-.005?'trace-year-result-negative':'')+'">'+shown(result)+'</strong>'+
  '<span>'+(hasActual?(recorded.length===1?'Sur 1 mois avec des mouvements confirmés':
   'Sur '+recorded.length+' mois avec des mouvements confirmés')+' · hors virements internes':
   'Aucune opération confirmée : bilan non calculable')+'</span></div>'+
  '<div class="trace-year-totals" aria-label="Revenus, dépenses et différence confirmés">'+
   '<div><small>Revenus</small><strong>'+shown(income)+'</strong></div>'+
   '<div><small>Dépenses</small><strong>'+shown(spent)+'</strong></div>'+
   '<div class="'+(spendingShare!==null&&spendingShare>100?'trace-year-negative':'')+
    '"><small>Dépenses / revenus</small><strong>'+(spendingShare===null?'—':spendingShare+' %')+'</strong></div></div>'+
   (spendingShare!==null?'<p class="trace-year-ratio-note">Part des revenus confirmés représentée par les dépenses confirmées, pas un taux d’épargne.</p>':'')+
   '</section>';
 if(comparable.length){
  html+='<section class="trace-year-budget-check" aria-label="Respect du budget sur les mois comparables">'+
   '<div class="trace-year-budget-top"><div><strong>Budget vs dépenses</strong><small>'+
    comparableLabel+' avec prévision et mouvements</small></div>'+
   '<b class="'+(difference<-.005?'trace-year-negative':'')+'">'+
    (difference>=0?'+':'−')+fmt(Math.abs(difference))+'</b></div>'+
   '<div class="trace-year-budget-meter" role="img" aria-label="'+
    esc('Dépenses '+fmt(comparableSpent)+' sur budget '+fmt(planned))+'">'+
    '<i style="width:'+Math.min(100,pct(comparableSpent,planned))+'%"></i></div>'+
   '<div class="trace-year-budget-values"><span>'+fmt(comparableSpent)+' dépensés</span>'+
    '<span>'+fmt(planned)+' prévus</span></div></section>';
 }else{
  html+='<div class="trace-year-budget-empty">Comparaison au budget indisponible : aucun mois avec prévision et mouvements confirmés.</div>';
 }
 const messages=[];
 if(topCategory&&Number(topCategory.amount)>.005&&recorded.length)
  messages.push('Principal poste classé : '+String(topCategory.name||'Autre')+
   ' ('+fmt(topCategory.amount)+')');
 if(overMonths)messages.push(overMonths+' mois '+(overMonths>1?'ont dépassé':'a dépassé')+' le budget prévu');
 else if(comparable.length)messages.push('Aucun dépassement sur les '+comparableLabel);
 if(peak)messages.push('Mois le plus dépensier parmi les mois renseignés : '+
  monthName(peak.month)+' ('+fmt(peak.expense)+')');
 if(missing)messages.push(missing+' mois sans mouvement confirmé : données à vérifier');
 if(budgeted.length>comparable.length){
  const n=budgeted.length-comparable.length;
  messages.push(n+' mois budgété'+(n>1?'s':'')+' sans dépense confirmée');
 }
 if(!messages.length)messages.push('Tous les mois écoulés comportent des mouvements confirmés');
 const diagnosis='<div class="trace-year-diagnosis" aria-label="Lecture rapide">'+
  '<strong>À retenir</strong>'+messages.map(msg=>'<p>'+esc(msg)+'</p>').join('')+'</div>';
 html+='<div class="trace-year-month-head"><strong>Évolution mois par mois</strong>'+
  '<small>Touche un mois pour examiner ses chiffres</small></div>';
 html+='<div class="trace-year-legend"><span><i class="trace-year-key budget"></i>Prévu</span>'+
  '<span><i class="trace-year-key real"></i>Enregistré</span></div>';
 html+='<div class="trace-year-grid" role="group" aria-label="Choisir un mois du budget">'+(months||[]).map(m=>{
  const absent=!m.hasBudget&&!m.hasTransactions,b=widths(m),
   over=m.hasBudget&&(m.hasExpenseTransactions??m.hasTransactions)&&m.expense>m.budget+.005,
   month=monthName(m.month),caption=absent?'Non renseigné':over?'Dépassement':
    m.hasTransactions?((m.hasExpenseTransactions??m.hasTransactions)?
     (m.hasBudget?'Avec budget':'Sans budget'):'Flux seuls'):'Prévu seul',
   displayMonth=month.slice(0,3),selected=m.month===chosen?.month;
  return '<button type="button" class="trace-year-month'+(selected?' is-selected':'')+(absent?' is-empty':'')+
   (over?' is-over':'')+'" data-insight-month="'+esc(m.month)+'" aria-pressed="'+selected+
   '" aria-label="'+esc(month+' : '+(absent?'non renseigné':
    'budget '+(m.hasBudget?fmt(m.budget):'non défini')+' ; '+
    (m.hasTransactions?'dépenses confirmées '+fmt(m.expense):'aucun mouvement confirmé')))+'">'+
   '<strong>'+esc(displayMonth)+'</strong>'+
   '<span class="trace-year-bars" aria-hidden="true"><i class="trace-year-bar budget" style="width:'+b.budget.toFixed(1)+'%"></i>'+
   '<i class="trace-year-bar real" style="width:'+b.spent.toFixed(1)+'%"></i></span>'+
   '<small>'+caption+'</small></button>';
 }).join('')+'</div>';
 if(chosen){
  const hasPlan=Boolean(chosen.hasBudget),hasActivity=Boolean(chosen.hasTransactions),
   hasExpense=Boolean(chosen.hasExpenseTransactions??chosen.hasTransactions),
   differenceMonth=round((chosen.budget||0)-(chosen.expense||0));
  html+='<div class="trace-year-selected" aria-label="Détail du mois sélectionné">'+
   '<strong>'+esc(monthName(chosen.month))+'</strong>'+
   '<div><span>Revenus confirmés <b>'+(hasActivity?fmt(chosen.income):'À vérifier')+'</b></span>'+
   '<span>Dépenses confirmées <b>'+(hasExpense?fmt(chosen.expense):'À vérifier')+'</b></span>'+
   '<span>Budget prévu <b>'+(hasPlan?fmt(chosen.budget):'Non défini')+'</b></span>'+
   '<span>Écart au budget <b>'+(hasPlan&&hasExpense?fmt(differenceMonth):'—')+'</b></span></div></div>';
 }
 html+=diagnosis;
 html+='<p class="trace-insights-foot">Lecture partielle : un mois sans mouvement importé ne signifie pas zéro dépense. Les prévisions et les opérations sont présentées séparément. Aucun montant futur n’est extrapolé.</p>';
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
