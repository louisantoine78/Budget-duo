(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const now=new Date(),CM=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const money=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(v||0));
const monthLabel=m=>new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric'}).format(new Date(`${m}-01T12:00:00`));
const shortMonth=m=>new Intl.DateTimeFormat('fr-CA',{month:'short'}).format(new Date(`${m}-01T12:00:00`)).replace('.','');
const monthOffset=(m,delta)=>{const [y,mo]=String(m).split('-').map(Number),d=new Date(y,mo-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const budgetDocId=()=>`b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const initialBudgetMonth=new URLSearchParams(location.search).get('month');
let client,session,household,workspaceLoadPromise=null,me='la',partner='partner',homeScope='mine',budgetScope='mine',budgetMonth=/^\d{4}-\d{2}$/.test(initialBudgetMonth||'')?initialBudgetMonth:CM,wealthScope='mine',analysisScope='mine',tab='transactions';
let state={household:{},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[]};
function withTimeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'Délai dépassé')),ms))]);}
function loadingStage(text){const el=$('#cloudLoadingText');if(el)el.textContent=text;}
function member(id){return(state.household.members||[]).find(x=>x.id===id)||{id,name:id==='la'?'Louis-Antoine':'Élise',initials:id==='la'?'LA':'É'};}
function cat(id){return state.categories.find(x=>x.id===id)||{name:'À classer',icon:'•',type:'expense'};}
function scope(s){return s==='mine'?me:'couple';}
function showGate(id){$('#cloudGate').classList.remove('hidden');['cloudLoadingPanel','cloudConfigPanel','cloudAuthPanel','cloudWorkspacePanel'].forEach(x=>$('#'+x)?.classList.toggle('hidden',x!==id));$('#app').classList.add('cloud-locked');}
function hideGate(){$('#cloudGate').classList.add('hidden');$('#app').classList.remove('cloud-locked');}
function sync(k,t){$('#syncPill').dataset.status=k;$('#syncLabel').textContent=t||({synced:'Synchronisé',loading:'Connexion…',error:'Erreur'}[k]||k);}
function openSheet(t,h){$('#sheetTitle').textContent=t;$('#sheetBody').innerHTML=h;$('#sheetBackdrop').classList.add('open');}
function closeSheet(){$('#sheetBackdrop').classList.remove('open');}
function split(t,id){const d=state.household.defaultSplit||{la:50,partner:50};return Number(t.amountCAD||0)*Number(t.split?.[id]??d[id]??50)/100;}
function alloc(t,s){const a=Number(t.amountCAD||0);if(s==='couple')return a;if(t.beneficiary===s)return a;if(t.beneficiary==='couple')return split(t,s);return 0;}
function budgetAmt(b,s){const a=Number(b.amount||0);if(s==='couple'||b.scope===s)return a;if(b.scope==='couple'){const d=state.household.categorySplits?.[b.categoryId]||state.household.defaultSplit||{la:50,partner:50};return a*Number(d[s]||0)/100;}return 0;}
function txs(m,s,confirmed=true){return state.transactions.filter(t=>String(t.date||'').startsWith(m)&&(!confirmed||t.status==='confirmed')&&(s==='couple'||t.beneficiary===s||t.beneficiary==='couple'||(t.payerId===s&&['income','transfer','external_refund'].includes(t.type))));}
function summary(m,s){let income=0,expense=0,refund=0;txs(m,s,true).forEach(t=>{if(t.type==='income')income+=alloc(t,s);else if(['expense','group_expense','person_payment'].includes(t.type))expense+=alloc(t,s);else if(t.type==='refund')refund+=alloc(t,s);});expense=Math.max(0,expense-refund);const bs=state.budgets.filter(b=>b.month===m),ib=bs.filter(b=>cat(b.categoryId).type==='income').reduce((x,b)=>x+budgetAmt(b,s),0),eb=bs.filter(b=>cat(b.categoryId).type==='expense').reduce((x,b)=>x+budgetAmt(b,s),0);return{income,expense,ib,eb,saving:income-expense};}
function breakdown(m,s){return state.categories.filter(c=>c.type==='expense'&&!c.archived).map(c=>{const budget=state.budgets.filter(b=>b.month===m&&b.categoryId===c.id).reduce((x,b)=>x+budgetAmt(b,s),0),actual=txs(m,s,true).filter(t=>t.categoryId===c.id).reduce((x,t)=>x+(['expense','group_expense','person_payment'].includes(t.type)?alloc(t,s):t.type==='refund'?-alloc(t,s):0),0);return{...c,budget,actual:Math.max(0,actual),ratio:budget?actual/budget:0};}).filter(x=>x.budget||x.actual).sort((a,b)=>b.ratio-a.ratio||b.actual-a.actual);}
function months6(){return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
function chart(node,s,metric='saving'){const ms=months6(),vs=ms.map(m=>summary(m,s)),r=vs.map(v=>metric==='expense'?v.expense:Math.max(0,v.saving)),b=vs.map(v=>metric==='expense'?v.eb:Math.max(0,v.ib-v.eb)),max=Math.max(1,...r,...b);node.innerHTML=ms.map((m,i)=>`<div class="monthbar"><i style="height:${Math.max(3,b[i]/max*100)}%"></i><b style="height:${Math.max(3,r[i]/max*100)}%"></b><em>${shortMonth(m)}</em></div>`).join('');}
function accountType(a){const s=(String(a.id||'')+' '+String(a.name||'')).toLowerCase();if(/card|carte|visa|master/.test(s))return'card';if(/checking|courant|chequ/.test(s))return'checking';if(/saving|épargne|epargne/.test(s))return'saving';return'other';}
function accountEstimate(a){const r=state.reconciliations.filter(x=>x.accountId===a.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];const b=state.household.accountOpeningBalances||{},d=state.household.accountOpeningBalanceDates||{};const start=r?.date||d[a.id],base=r?Number(r.actualBalance||0):(b[a.id]===undefined?null:Number(b[a.id]));if(base===null||!start)return null;const movement=state.transactions.filter(t=>t.status==='confirmed'&&t.accountId===a.id&&String(t.date||'')>start).reduce((x,t)=>{const v=Number(t.amountCAD||0);if(accountType(a)==='card'){if(['expense','group_expense','person_payment'].includes(t.type))return x-v;if(['refund','external_refund','transfer'].includes(t.type))return x+v;}else{if(['income','refund','external_refund'].includes(t.type))return x+v;if(['expense','group_expense','person_payment','transfer'].includes(t.type))return x-v;}return x;},0);return base+movement;}
function bank(s){const owners=s==='couple'?['la','partner']:[s];let checking=0,card=0,hc=false,hv=false;state.accounts.filter(a=>owners.includes(a.owner)).forEach(a=>{const v=accountEstimate(a);if(v===null)return;if(accountType(a)==='checking'){checking+=v;hc=true;}if(accountType(a)==='card'){card+=v;hv=true;}});return{checking:hc?checking:null,card:hv?card:null,net:hc?checking+(hv?card:0):null};}
function coupleBalance(){let b=Number(state.household.sharingOpeningBalance||0),ref=state.household.referenceDate||'';state.transactions.filter(t=>t.status==='confirmed'&&(!ref||String(t.date||'')>=ref)).forEach(t=>{const a=Number(t.amountCAD||0);if(['expense','group_expense','refund'].includes(t.type)){const sg=t.type==='refund'?-1:1,paid=t.payerId==='la'?a*sg:0,share=t.beneficiary==='couple'?split(t,'la')*sg:t.beneficiary==='la'?a*sg:0;b+=paid-share;}else if(t.type==='transfer'){if(t.payerId==='la'&&t.beneficiary==='partner')b+=a;if(t.payerId==='partner'&&t.beneficiary==='la')b-=a;}});return b;}
function updateSegments(){[['homeScope',homeScope],['budgetScope',budgetScope],['wealthScope',wealthScope]].forEach(([id,v])=>$$('#'+id+' .seg').forEach(b=>b.classList.toggle('active',b.dataset.scope===v)));}
function renderHome(){const sId=scope(homeScope),s=summary(CM,sId),cons=s.eb?s.expense/s.eb*100:0,b=bank(sId);$('#homeMonthLabel').textContent=monthLabel(CM);$('#homeGreeting').textContent=homeScope==='mine'?`Bonjour ${member(me).name}`:'Votre situation';$('#homeBudgetAvailable').textContent=money(s.eb-s.expense);$('#homeBudgetSub').textContent=s.eb?`sur ${money(s.eb)} prévus ce mois`:'Budget du mois à compléter';$('#homeBudgetProgress').style.width=`${Math.min(100,Math.max(0,cons))}%`;$('#homeBudgetPercent').textContent=`${cons.toFixed(0)} % consommé`;$('#homeBudgetSpent').textContent=`${money(s.expense)} dépensés`;$('#homeBalance').textContent=b.net===null?'À configurer':money(b.net);$('#homeChecking').textContent=b.checking===null?'—':money(b.checking);$('#homeCard').textContent=b.card===null?'—':money(b.card);$('#reconcileBadge').textContent=state.reconciliations.length?'✓ Rapproché':'À rapprocher';$('#homeIncome').textContent=money(s.income);$('#homeSpending').textContent=money(s.expense);$('#homeSaving').textContent=money(s.saving);const p=state.transactions.filter(t=>t.status!=='confirmed');$('#pendingCountBadge').textContent=p.length;$('#pendingText').textContent=p.length?`${p.length} à vérifier`:'Tout est à jour';const cs=breakdown(CM,sId).slice(0,4);$('#homeBudgetCategories').innerHTML=cs.length?cs.map(c=>`<div class="budget-row"><div class="name">${esc(c.name)}</div><div class="bar ${c.ratio>=.8?'warn':''}"><i style="width:${Math.min(100,c.ratio*100)}%"></i></div><div class="amount"><strong>${money(c.actual)}</strong> / ${money(c.budget)}</div></div>`).join(''):'<div class="empty-note">Ajoute ton budget pour voir les catégories importantes.</div>';chart($('#homeTrend'),sId);const cb=coupleBalance(),pa=member(partner),la=member('la');$('#partnerAvatar').textContent=pa.initials||initials(pa.name);$('#shareLabel').textContent=`Solde avec ${pa.name}`;$('#shareBalance').textContent=Math.abs(cb)<.01?'Vous êtes à l’équilibre':cb>0?`${pa.name} doit ${money(cb)} à ${la.name}`:`${la.name} doit ${money(Math.abs(cb))} à ${pa.name}`;updateSegments();}
function setBudgetMonth(next){
  if(!/^\d{4}-\d{2}$/.test(String(next||'')))return;
  budgetMonth=String(next);
  renderBudget();
}
function renderBudget(){
  const month=budgetMonth,sId=scope(budgetScope),s=summary(month,sId);
  const monthDisplay=$('#budgetMonthDisplay');if(monthDisplay)monthDisplay.textContent=monthLabel(month);
  const monthPicker=$('#budgetMonthPicker');if(monthPicker)monthPicker.value=month;
  const currentBtn=$('#budgetCurrentMonth');if(currentBtn)currentBtn.classList.toggle('hidden',month===CM);
  const prev=monthOffset(month,-1),next=monthOffset(month,1);
  const prevLink=$('#budgetPrevMonth'),nextLink=$('#budgetNextMonth');
  const monthHref=m=>{const u=new URL(location.href);u.searchParams.set('month',m);u.searchParams.set('fresh',Date.now().toString());u.hash='budget';return u.toString();};
  if(prevLink)prevLink.href=monthHref(prev);if(nextLink)nextLink.href=monthHref(next);
  const copyLabel=$('#budgetCopyPrevious span');if(copyLabel)copyLabel.textContent='Reprendre '+shortMonth(prev)+(prev.slice(0,4)!==month.slice(0,4)?' '+prev.slice(0,4):'');
  $('#budgetHeroTotal').textContent=money(s.eb);
  $('#budgetHeroSub').textContent=money(Math.max(0,s.ib-s.eb))+' de marge prévue · '+money(s.ib)+' de revenus';
  const rows=state.budgets.filter(b=>b.month===month&&budgetAmt(b,sId)>0);
  const sectionDefs=[
    ['Revenus','income',b=>cat(b.categoryId).type==='income'],
    ['Dépenses fixes','fixed',b=>cat(b.categoryId).type==='expense'&&['rent','subscriptions','phone','taxes'].includes(b.categoryId)],
    ['Dépenses variables','variable',b=>cat(b.categoryId).type==='expense'&&!['rent','subscriptions','phone','taxes'].includes(b.categoryId)]
  ];
  $('#budgetSections').innerHTML=sectionDefs.map(([t,kind,f])=>'<div class="section-head"><h2>'+t+'</h2><button class="linkbtn budget-add-link" type="button" data-budget-add="'+kind+'">+ Ajouter</button></div><article class="card budget-section">'+(rows.filter(f).length?rows.filter(f).map(b=>'<button class="budget-card budget-edit-row" type="button" data-budget-edit="'+esc(b.id)+'"><span class="bicon">'+esc(cat(b.categoryId).icon||'•')+'</span><span class="bmain"><strong>'+esc(cat(b.categoryId).name)+'</strong><small>'+(b.scope==='couple'?'Budget commun':'Personnel')+'</small></span><span class="bvalue"><strong>'+money(budgetAmt(b,sId))+'</strong></span></button>').join(''):'<div class="empty-note">Aucun poste.</div>')+'</article>').join('');
  document.querySelectorAll('[data-budget-add]').forEach(btn=>btn.onclick=()=>openBudgetAdd(btn.dataset.budgetAdd));
  document.querySelectorAll('[data-budget-edit]').forEach(btn=>btn.onclick=()=>openBudgetEdit(btn.dataset.budgetEdit));
  const year=month.slice(0,4),ms=Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0')),vs=ms.map(m=>summary(m,sId)),max=Math.max(1,...vs.flatMap(v=>[v.eb,v.expense]));
  $('#annualBudgetChart').innerHTML=ms.map((m,i)=>'<div class="monthbar '+(m===month?'selected':'')+'"><i style="height:'+Math.max(2,vs[i].eb/max*100)+'%"></i><b style="height:'+Math.max(2,vs[i].expense/max*100)+'%"></b><em>'+shortMonth(m)+'</em></div>').join('');
  updateSegments();
}
function budgetCategoriesFor(kind){
  const active=state.categories.filter(c=>!c.archived);
  if(kind==='income')return active.filter(c=>c.type==='income');
  const expenses=active.filter(c=>c.type==='expense');
  if(kind==='fixed')return expenses.filter(c=>['rent','subscriptions','phone','taxes'].includes(c.id));
  return expenses.filter(c=>!['rent','subscriptions','phone','taxes'].includes(c.id));
}
function budgetKindLabel(kind){return kind==='income'?'Revenu':kind==='fixed'?'Dépense fixe':'Dépense variable';}
function openBudgetAdd(kind='variable'){
  const cats=budgetCategoriesFor(kind);
  const owner=budgetScope==='mine'?me:'couple';
  const options=cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  openSheet('Ajouter au budget',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(monthLabel(budgetMonth))+'</b><small>'+esc(budgetKindLabel(kind))+' · '+(owner==='couple'?'Budget Couple':'Budget personnel')+'</small></div></div>'+
    '<label class="label2">Catégorie</label><select class="input" id="budgetAddCategory">'+options+'</select>'+
    '<label class="label2" style="margin-top:12px">Montant prévu</label><div class="budget-amount-field"><input class="input" id="budgetAddAmount" type="number" inputmode="decimal" min="0" step="1" placeholder="0"><span>$</span></div>'+
    '<button class="primary full" id="saveBudgetAdd" type="button" style="margin-top:18px">Ajouter au budget</button>'+
    '<button class="secondary full" id="cancelBudgetAdd" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelBudgetAdd').onclick=closeSheet;
  $('#budgetAddAmount')?.focus();
  $('#saveBudgetAdd').onclick=async()=>{
    const categoryId=$('#budgetAddCategory').value;
    const amount=Number($('#budgetAddAmount').value||0);
    if(!categoryId||!Number.isFinite(amount)||amount<0)return;
    const current=state.budgets.find(b=>b.month===budgetMonth&&b.scope===owner&&b.categoryId===categoryId);
    const item={id:current?.id||budgetDocId(),month:budgetMonth,scope:owner,categoryId,amount};
    const btn=$('#saveBudgetAdd');btn.disabled=true;btn.textContent='Enregistrement…';
    try{
      if(current)Object.assign(current,item);else state.budgets.push(item);
      await saveDocument('budgets',item);
      closeSheet();renderBudget();renderHome();
    }catch(err){
      console.error(err);btn.disabled=false;btn.textContent='Réessayer';
    }
  };
}
function openBudgetEdit(id){
  const item=state.budgets.find(b=>b.id===id);
  if(!item)return;
  const category=cat(item.categoryId);
  openSheet('Modifier le budget',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(category.name)+'</b><small>'+esc(monthLabel(item.month))+' · '+(item.scope==='couple'?'Budget Couple':'Budget personnel')+'</small></div></div>'+
    '<label class="label2">Montant prévu</label><div class="budget-amount-field"><input class="input" id="budgetEditAmount" type="number" inputmode="decimal" min="0" step="1" value="'+Number(item.amount||0)+'"><span>$</span></div>'+
    '<button class="primary full" id="saveBudgetEdit" type="button" style="margin-top:18px">Enregistrer</button>'+
    '<button class="secondary full" id="cancelBudgetEdit" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelBudgetEdit').onclick=closeSheet;
  $('#saveBudgetEdit').onclick=async()=>{
    const amount=Number($('#budgetEditAmount').value||0);
    if(!Number.isFinite(amount)||amount<0)return;
    const next={...item,amount};
    const btn=$('#saveBudgetEdit');btn.disabled=true;btn.textContent='Enregistrement…';
    try{
      Object.assign(item,next);await saveDocument('budgets',next);closeSheet();renderBudget();renderHome();
    }catch(err){console.error(err);btn.disabled=false;btn.textContent='Réessayer';}
  };
}
async function copyPreviousBudget(){
  const target=budgetMonth,prev=monthOffset(target,-1),owner=budgetScope==='mine'?me:'couple';
  const source=state.budgets.filter(b=>b.month===prev&&b.scope===owner);
  if(!source.length){
    openSheet('Copier le budget','<div class="empty-note">Aucun budget '+(budgetScope==='mine'?'personnel':'commun')+' n’est enregistré pour '+esc(monthLabel(prev))+'.</div><button class="primary full" id="budgetCopyClose" type="button" style="margin-top:14px">Compris</button>');
    $('#budgetCopyClose').onclick=closeSheet;
    return;
  }
  const existing=state.budgets.filter(b=>b.month===target&&b.scope===owner);
  const sumSource=source.reduce((n,b)=>n+Number(b.amount||0),0);
  openSheet('Copier le mois précédent',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(monthLabel(prev))+' → '+esc(monthLabel(target))+'</b><small>'+(budgetScope==='mine'?'Budget personnel':'Budget Couple')+' · '+source.length+' postes</small></div></div>'+
    '<div class="setting-summary"><span>Montant prévu à recopier</span><b>'+money(sumSource)+'</b></div>'+
    (existing.length?'<div class="empty-note" style="margin-top:12px">Les catégories déjà présentes sur le mois sélectionné seront mises à jour avec les montants du mois précédent. Les autres postes déjà créés seront conservés.</div>':'<div class="empty-note" style="margin-top:12px">Le budget du mois précédent sera recopié sur le mois sélectionné. Les transactions réelles ne sont jamais modifiées.</div>')+
    '<button class="primary full" id="confirmBudgetCopy" type="button" style="margin-top:16px">Copier le budget</button>'+
    '<button class="secondary full" id="cancelBudgetCopy" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelBudgetCopy').onclick=closeSheet;
  $('#confirmBudgetCopy').onclick=async()=>{
    const btn=$('#confirmBudgetCopy');btn.disabled=true;btn.textContent='Copie en cours…';
    try{
      let count=0;
      for(const src of source){
        const current=state.budgets.find(b=>b.month===target&&b.scope===owner&&b.categoryId===src.categoryId);
        const item={...src,id:current?.id||budgetDocId(),month:target,scope:owner};
        if(current)Object.assign(current,item);else state.budgets.push(item);
        await saveDocument('budgets',item);
        count++;
      }
      closeSheet();renderBudget();
      openSheet('Budget copié','<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(monthLabel(target))+' est prêt</b><small>'+count+' postes copiés depuis '+esc(monthLabel(prev))+'</small></div></div><div class="empty-note">Tu peux ensuite ajuster les montants qui changent d’un mois à l’autre.</div><button class="primary full" id="budgetCopyDone" type="button" style="margin-top:14px">Voir le budget</button>');
      $('#budgetCopyDone').onclick=closeSheet;
    }catch(err){
      console.error(err);btn.disabled=false;btn.textContent='Réessayer';
    }
  };
}
function txRow(t){const c=cat(t.categoryId),pos=['income','refund','external_refund'].includes(t.type);return`<div class="tx"><span class="tx-icon">${esc(c.icon||'•')}</span><span class="tx-main"><b>${esc(t.name||t.merchant||'Transaction')}</b><small>${esc(c.name)} · ${esc(t.date||'')}</small></span><span class="tx-amt ${pos?'positive':''}">${pos?'+':'−'}${money(t.amountCAD)}</span></div>`;}
function renderActivity(){const ts=state.transactions.filter(t=>String(t.date||'').startsWith(CM)&&t.status==='confirmed').sort((a,b)=>String(b.date).localeCompare(String(a.date))),exp=ts.filter(t=>['expense','group_expense','person_payment'].includes(t.type)).reduce((x,t)=>x+Number(t.amountCAD||0),0),inc=ts.filter(t=>t.type==='income').reduce((x,t)=>x+Number(t.amountCAD||0),0);$('#activityMonthLabel').textContent=monthLabel(CM);$('#activityExpenses').textContent=money(exp);$('#activityIncome').textContent=money(inc);$('#activityNet').textContent=money(inc-exp);$('#transactionList').innerHTML=ts.length?ts.map(txRow).join(''):'<div class="empty-note">Aucune transaction validée ce mois-ci.</div>';const p=state.transactions.filter(t=>t.status!=='confirmed');$('#reviewTabCount').textContent=p.length?`(${p.length})`:'';$('#reviewHeading').textContent=`${p.length} transaction${p.length>1?'s':''} à valider`;$('#reviewList').innerHTML=p.length?p.map(t=>`<article class="card review-card" style="margin-bottom:12px"><div class="review-top"><div><div class="merchant">${esc(t.name||t.merchant||'Transaction')}</div><div class="review-date">${esc(t.date||'')}</div></div><div class="review-amount">${money(t.amountCAD)}</div></div><div class="review-fields"><div class="fieldline"><span>Catégorie</span><button>${esc(t.categoryId?cat(t.categoryId).name:'À classer ⚠')}</button></div><div class="fieldline"><span>Pour qui ?</span><button>${t.beneficiary?(t.beneficiary==='couple'?'Nous deux':member(t.beneficiary).name):'À choisir ⚠'}</button></div></div><div class="review-hint">Validation interactive activée dans la prochaine passe</div></article>`).join(''):'<div class="empty-note">Tout est à jour.</div>';showTab(tab);}
function showTab(t){tab=t;$$('#activityTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$('#activityTransactions').classList.toggle('hidden',t!=='transactions');$('#activityReview').classList.toggle('hidden',t!=='review');$('#activityImport').classList.toggle('hidden',t!=='import');}
function renderWealth(){const sId=scope(wealthScope),owners=sId==='couple'?['la','partner']:[sId],bk=bank(sId),inv=state.investmentAccounts.filter(a=>owners.includes(a.owner)),total=(bk.net||0)+inv.reduce((x,a)=>x+Number(a.currentValueCad||a.valueCad||0),0);$('#wealthTotal').textContent=money(total);$('#assetGrid').innerHTML=[`<button class="asset-card"><span class="a-icon">$</span><span>Liquidités</span><b>${bk.net===null?'À configurer':money(bk.net)}</b><small>Compte − carte</small></button>`,...inv.map(a=>`<button class="asset-card"><span class="a-icon">◇</span><span>${esc(a.name||a.type||'Investissement')}</span><b>${money(a.currentValueCad||a.valueCad||0)}</b><small>${esc(a.currency||'CAD')}</small></button>`)].join('');const ms=months6(),max=Math.max(1,total);$('#wealthTrend').innerHTML=ms.map((m,i)=>`<div class="monthbar"><b style="height:${Math.max(12,(.9+i*.02)*total/max*90)}%"></b><em>${shortMonth(m)}</em></div>`).join('');updateSegments();}
function renderAll(){renderHome();renderBudget();renderActivity();renderWealth();}
function navigate(p){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===p));location.hash=p==='home'?'':p;window.scrollTo({top:0,behavior:'smooth'});}
function analysis(){analysisScope=homeScope;renderAnalysis();}
function renderAnalysis(){const sId=scope(analysisScope),ms=months6(),vs=ms.map(m=>summary(m,sId)),inc=vs.reduce((x,v)=>x+v.income,0),exp=vs.reduce((x,v)=>x+v.expense,0),sav=inc-exp;openSheet('Analyses',`<div class="segment" id="analysisScope"><button class="seg ${analysisScope==='mine'?'active':''}" data-scope="mine">Moi</button><button class="seg ${analysisScope==='couple'?'active':''}" data-scope="couple">Couple</button></div><div class="metric-strip" style="margin-top:14px"><div class="metric-mini"><span>Dépenses · 6 mois</span><b>${money(exp)}</b></div><div class="metric-mini"><span>Moyenne</span><b>${money(exp/6)}</b></div><div class="metric-mini"><span>Épargne</span><b>${money(sav)}</b></div><div class="metric-mini"><span>Taux</span><b>${inc?(sav/inc*100).toFixed(1):0} %</b></div></div><div class="section-head"><h2>Évolution</h2></div><div class="chart" id="analysisChart"></div>`);chart($('#analysisChart'),sId,'expense');$$('#analysisScope .seg').forEach(b=>b.onclick=()=>{analysisScope=b.dataset.scope;renderAnalysis();});}
function detail(type){const sId=scope(homeScope),rows=txs(CM,sId,true).filter(t=>type==='income'?t.type==='income':type==='spending'?['expense','group_expense','person_payment','refund'].includes(t.type):false);if(type==='saving'){const s=summary(CM,sId);openSheet('Épargne',`<div class="money2">${money(s.saving)}</div><div class="micro">${s.income?(s.saving/s.income*100).toFixed(1):0} % des revenus</div>`);return;}openSheet(type==='income'?'Revenus':'Dépenses',rows.length?rows.map(txRow).join(''):'<div class="empty-note">Aucune opération.</div>');}

function uiIcon(name){
  const paths={
    user:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>',
    heart:'<path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5C4 5.8 5.9 4 8.3 4c1.6 0 3 .8 3.7 2 .7-1.2 2.1-2 3.7-2C18.1 4 20 5.8 20 8.5Z"/>',
    bank:'<path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"/>',
    refresh:'<path d="M19 8a7 7 0 0 0-12-2L4 9"/><path d="M4 5v4h4"/><path d="M5 16a7 7 0 0 0 12 2l3-3"/><path d="M20 19v-4h-4"/>',
    bell:'<path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 6 2.2 6.5 2.2 6.5H4.3S6.5 15 6.5 9Z"/><path d="M10 19h4"/>',
    chart:'<path d="M4 20V10m5 10V5m5 15v-7m5 7V8"/>',
    shield:'<path d="M12 3 5 6v5c0 4.6 2.8 7.7 7 10 4.2-2.3 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.7-4"/>',
    logout:'<path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M8 12h10"/>',
    calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.user)+'</svg>';
}
async function saveHouseholdSettings(){
  sync('saving');
  const settings={...(household.settings||{}),...state.household,schemaVersion:5};
  const{error}=await client.from('households').update({settings}).eq('id',household.id);
  if(error){sync('error');throw error;}
  household.settings=settings;
  sync('synced');
}
async function saveDocument(collection,item){
  sync('saving');
  const{error}=await client.from('documents').upsert({
    household_id:household.id,
    collection,
    item_id:String(item.id),
    data:item,
    updated_by:session.user.id
  },{onConflict:'household_id,collection,item_id'});
  if(error){sync('error');throw error;}
  sync('synced');
}
function settingsBack(){return '<button class="secondary full settings-back" type="button" style="margin-top:16px">Retour aux paramètres</button>';}
function bindSettingsBack(){$('.settings-back')?.addEventListener('click',profile);}
function profileMenuItem(id,icon,title,sub){
  return '<button class="profile-action settings-row" id="'+id+'"><span class="pico">'+uiIcon(icon)+'</span><span class="pmain"><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></span><span class="profile-chevron">'+uiIcon('chevron')+'</span></button>';
}
function profile(){
  const meObj=member(me),partnerObj=member(partner);
  openSheet('Profil & paramètres',
    '<div class="profile-card profile-card-premium">'+
      '<div class="big-avatar">'+esc(meObj.initials||initials(meObj.name))+'</div>'+
      '<b>'+esc(meObj.name)+'</b>'+
      '<div class="review-date">'+esc(session?.user?.email||'')+'</div>'+
      '<div class="profile-connection"><span class="status-dot"></span> '+((state.household.workspaceMembers||[]).length>1?'Connecté avec '+esc(partnerObj.name):'Espace personnel')+'</div>'+
    '</div>'+
    '<div class="settings-group"><div class="settings-group-title">Compte</div>'+
      profileMenuItem('settingsProfile','user','Mon profil','Nom, courriel et devise')+
      profileMenuItem('settingsCouple','heart','Mon couple','Partage et répartition par défaut')+
    '</div>'+
    '<div class="settings-group"><div class="settings-group-title">Finances</div>'+
      profileMenuItem('settingsAccounts','bank','Mes comptes','Soldes de référence et cartes')+
      profileMenuItem('settingsReconcile','refresh','Rapprochement','Vérifier Trace avec la banque')+
      profileMenuItem('settingsInvest','chart','Investissements','PEA, CELI, REER et autres')+
    '</div>'+
    '<div class="settings-group"><div class="settings-group-title">Préférences</div>'+
      profileMenuItem('settingsGuide','guide','Guide Trace','Revoir la formation complète à tout moment')+
      profileMenuItem('settingsNotifications','bell','Notifications','Validation, import et rapprochement')+
      profileMenuItem('settingsData','shield','Données & confidentialité','Date de référence et données partagées')+
    '</div>'+
    '<button class="profile-action settings-row danger-row" id="logout"><span class="pico">'+uiIcon('logout')+'</span><span class="pmain"><b>Se déconnecter</b><small>Fermer la session sur cet appareil</small></span></button>'
  );
  $('#settingsProfile').onclick=openProfileSettings;
  $('#settingsCouple').onclick=openCoupleSettings;
  $('#settingsAccounts').onclick=openAccountSettings;
  $('#settingsReconcile').onclick=openReconcileSettings;
  $('#settingsInvest').onclick=()=>{closeSheet();wealthScope='mine';renderWealth();navigate('wealth');};
  $('#settingsGuide').onclick=()=>{closeSheet();setTimeout(()=>window.TraceGuide?.start(true),80);};
  $('#settingsNotifications').onclick=openNotificationSettings;
  $('#settingsData').onclick=openDataSettings;
  $('#logout').onclick=async()=>{await client.auth.signOut();location.reload();};
}
function openProfileSettings(){
  openSheet('Mon profil',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('user')+'</span><div><b>'+esc(member(me).name)+'</b><small>'+esc(session?.user?.email||'')+'</small></div></div>'+
    '<label class="label2">Nom affiché</label><input id="settingsDisplayName" class="input" value="'+esc(member(me).name)+'">'+
    '<label class="label2">Courriel</label><input class="input" value="'+esc(session?.user?.email||'')+'" disabled>'+
    '<label class="label2">Devise principale</label><select class="input" disabled><option>CAD — Dollar canadien</option></select>'+
    '<button class="primary full" id="saveProfileSettings" style="margin-top:16px">Enregistrer</button>'+settingsBack()
  );
  $('#saveProfileSettings').onclick=async()=>{
    const name=$('#settingsDisplayName').value.trim();
    if(!name)return;
    sync('saving');
    const{error}=await client.from('household_members').update({display_name:name}).eq('household_id',household.id).eq('user_id',session.user.id);
    if(error){sync('error');return;}
    const m=(state.household.members||[]).find(x=>x.id===me);
    if(m){m.name=name;m.initials=initials(name);}
    await saveHouseholdSettings();
    $('#profileBtn').textContent=initials(name);
    renderAll();profile();
  };
  bindSettingsBack();
}
function openCoupleSettings(){
  const d=state.household.defaultSplit||{la:50,partner:50};
  const ws=Array.isArray(state.household.workspaceMembers)?state.household.workspaceMembers:[];
  const inviteCode=String(state.household.inviteCode||'');
  const full=ws.length>=2;
  const membersHtml=ws.length?ws.map(x=>'<div class="member-row"><span class="member-avatar">'+esc(initials(x.name||''))+'</span><span class="member-main"><b>'+esc(x.name||'Membre')+'</b><small>'+(x.role==='owner'?'Propriétaire du budget':'Membre du budget')+'</small></span><span class="member-status">Connecté</span></div>').join(''):'<div class="empty-note">Aucun membre chargé.</div>';
  const inviteHtml=full
    ? '<div class="workspace-full-note"><b>2/2 membres connectés</b><small>Ce budget est privé et partagé uniquement entre ces deux comptes.</small></div>'
    : '<div class="invite-card"><div><b>Inviter ton partenaire</b><small>La personne crée son compte Trace puis choisit « Rejoindre » avec ce code.</small></div><div class="invite-code-row"><code id="inviteCodeValue">••••••••••</code><button class="secondary" id="revealInviteCode" type="button">Afficher</button><button class="secondary hidden" id="copyInviteCode" type="button">Copier</button></div></div>';

  openSheet('Mon couple',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('heart')+'</span><div><b>'+esc(member(partner).name)+'</b><small>Espace partagé privé</small></div></div>'+
    '<div class="section-head"><h2>Membres du budget</h2></div>'+
    '<div class="members-card">'+membersHtml+'</div>'+
    inviteHtml+
    '<div class="setting-summary"><span>Budget partagé</span><b>Actif</b></div>'+
    '<div class="setting-summary"><span>Solde Partage</span><b>'+money(Math.abs(coupleBalance()))+'</b></div>'+
    '<div class="section-head"><h2>Répartition par défaut</h2></div>'+
    '<div class="formrow"><div><label class="label2">'+esc(member('la').name)+' %</label><input id="splitLaSetting" class="input" type="number" min="0" max="100" value="'+Number(d.la??50)+'"></div>'+
    '<div><label class="label2">'+esc(member('partner').name)+' %</label><input id="splitPartnerSetting" class="input" type="number" min="0" max="100" value="'+Number(d.partner??50)+'"></div></div>'+
    '<button class="primary full" id="saveCoupleSettings" style="margin-top:16px">Enregistrer la répartition</button>'+settingsBack()
  );

  $('#revealInviteCode')?.addEventListener('click',()=>{
    $('#inviteCodeValue').textContent=inviteCode||'Code indisponible';
    $('#revealInviteCode').classList.add('hidden');
    $('#copyInviteCode')?.classList.remove('hidden');
  });
  $('#copyInviteCode')?.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(inviteCode);$('#copyInviteCode').textContent='Copié';}
    catch(_){$('#inviteCodeValue').textContent=inviteCode;}
  });
  $('#splitLaSetting').oninput=()=>{$('#splitPartnerSetting').value=Math.max(0,100-Number($('#splitLaSetting').value||0));};
  $('#saveCoupleSettings').onclick=async()=>{
    const la=Number($('#splitLaSetting').value||0),pa=Number($('#splitPartnerSetting').value||0);
    if(Math.abs(la+pa-100)>.01)return;
    state.household.defaultSplit={la,partner:pa};
    await saveHouseholdSettings();renderAll();profile();
  };
  bindSettingsBack();
}
function openAccountSettings(){
  const mine=state.accounts.filter(a=>a.owner===me);
  const balances=state.household.accountOpeningBalances||{};
  const dates=state.household.accountOpeningBalanceDates||{};
  openSheet('Mes comptes',
    '<div class="empty-note">Renseigne les soldes de référence. Trace utilise ensuite les transactions et les rapprochements pour estimer le solde actuel.</div>'+
    (mine.length?mine.map(a=>'<div class="account-setting-card"><div class="settings-hero compact"><span class="pico">'+uiIcon('bank')+'</span><div><b>'+esc(a.name)+'</b><small>'+esc(accountType(a)==='card'?'Carte de crédit':'Compte bancaire')+'</small></div></div><label class="label2">Solde de référence</label><input class="input account-opening" data-id="'+esc(a.id)+'" type="number" step="0.01" value="'+(balances[a.id]??'')+'"><label class="label2">Date</label><input class="input account-date" data-id="'+esc(a.id)+'" type="date" value="'+esc(dates[a.id]||state.household.referenceDate||'2026-11-01')+'"></div>').join(''):'<div class="empty-note" style="margin-top:12px">Aucun compte bancaire n’est encore configuré.</div>')+
    (mine.length?'<button class="primary full" id="saveAccountSettings" style="margin-top:16px">Enregistrer les soldes</button>':'')+settingsBack()
  );
  if(mine.length)$('#saveAccountSettings').onclick=async()=>{
    state.household.accountOpeningBalances||={};
    state.household.accountOpeningBalanceDates||={};
    $$('.account-opening').forEach(i=>{if(i.value!=='')state.household.accountOpeningBalances[i.dataset.id]=Number(i.value);});
    $$('.account-date').forEach(i=>state.household.accountOpeningBalanceDates[i.dataset.id]=i.value);
    await saveHouseholdSettings();renderAll();profile();
  };
  bindSettingsBack();
}
function openReconcileSettings(){
  const mine=state.accounts.filter(a=>a.owner===me&&['checking','card'].includes(accountType(a)));
  openSheet('Rapprochement',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('refresh')+'</span><div><b>Vérifier les comptes</b><small>Une fois par semaine suffit</small></div></div>'+
    (mine.length?mine.map(a=>{const r=state.reconciliations.filter(x=>x.accountId===a.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];const est=accountEstimate(a);return '<div class="reconcile-card"><div><b>'+esc(a.name)+'</b><small>'+(r?'Dernier rapprochement : '+esc(r.date):'Jamais rapproché')+'</small></div><div class="reconcile-estimate">'+(est===null?'—':money(est))+'</div><button class="secondary reconcile-one" data-id="'+esc(a.id)+'">Rapprocher</button></div>';}).join(''):'<div class="empty-note">Ajoute d’abord tes comptes bancaires.</div>')+settingsBack()
  );
  $$('.reconcile-one').forEach(b=>b.onclick=()=>openSingleReconcile(b.dataset.id));
  bindSettingsBack();
}
function openSingleReconcile(id){
  const a=state.accounts.find(x=>x.id===id);if(!a)return;
  const est=accountEstimate(a)??0;
  openSheet('Rapprocher · '+a.name,
    '<div class="setting-summary"><span>Solde estimé Trace</span><b>'+money(est)+'</b></div>'+
    '<label class="label2">Solde réel dans la banque</label><input id="reconcileActual" class="input" type="number" step="0.01" value="'+Number(est).toFixed(2)+'">'+
    '<label class="label2">Date</label><input id="reconcileDate" class="input" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
    '<button class="primary full" id="saveReconciliation" style="margin-top:16px">Valider le rapprochement</button>'+settingsBack()
  );
  $('#saveReconciliation').onclick=async()=>{
    const actual=Number($('#reconcileActual').value||0);
    const item={id:'rec_'+Date.now().toString(36),accountId:a.id,owner:me,date:$('#reconcileDate').value,estimatedBalance:est,actualBalance:actual,difference:actual-est};
    state.reconciliations.push(item);
    await saveDocument('reconciliations',item);
    renderAll();openReconcileSettings();
  };
  bindSettingsBack();
}
function notificationToggle(key,label,sub,on){
  return '<button class="setting notification-setting" data-key="'+key+'" type="button"><span class="pico">'+uiIcon('bell')+'</span><div><b>'+esc(label)+'</b><small>'+esc(sub)+'</small></div><span class="switch '+(on?'on':'')+'"></span></button>';
}
function openNotificationSettings(){
  const n=state.household.notifications||{review:true,staleImport:true,reconcile:true};
  openSheet('Notifications',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('bell')+'</span><div><b>Notifications utiles</b><small>Pas de spam, uniquement les actions à faire</small></div></div>'+
    notificationToggle('review','Transactions à valider','Quand une action est nécessaire',n.review!==false)+
    notificationToggle('staleImport','Import à faire','Si aucun import depuis 7 jours',n.staleImport!==false)+
    notificationToggle('reconcile','Rapprochement hebdomadaire','Rappel une fois par semaine',n.reconcile!==false)+
    '<div class="empty-note" style="margin-top:14px">Ces préférences sont enregistrées dans Trace. Les notifications push iPhone seront activées quand le moteur de notifications sera branché.</div>'+
    '<button class="primary full" id="saveNotifications" style="margin-top:16px">Enregistrer</button>'+settingsBack()
  );
  $$('.notification-setting').forEach(row=>row.onclick=()=>row.querySelector('.switch').classList.toggle('on'));
  $('#saveNotifications').onclick=async()=>{
    const prefs={};
    $$('.notification-setting').forEach(row=>prefs[row.dataset.key]=row.querySelector('.switch').classList.contains('on'));
    state.household.notifications=prefs;await saveHouseholdSettings();profile();
  };
  bindSettingsBack();
}
function openDataSettings(){
  openSheet('Données & confidentialité',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('shield')+'</span><div><b>Données Trace</b><small>Votre espace couple reste privé à ses membres</small></div></div>'+
    '<label class="label2">Date de référence</label><input id="referenceDateSetting" class="input" type="date" value="'+esc(state.household.referenceDate||'2026-11-01')+'">'+
    '<label class="label2">Solde Partage d’ouverture</label><input id="sharingOpeningSetting" class="input" type="number" step="0.01" value="'+Number(state.household.sharingOpeningBalance||0)+'">'+
    '<div class="empty-note" style="margin-top:12px">Valeur positive : '+esc(member('partner').name)+' doit à '+esc(member('la').name)+'. Valeur négative : '+esc(member('la').name)+' doit à '+esc(member('partner').name)+'. L’historique antérieur reste conservé.</div>'+
    '<div class="setting-summary" style="margin-top:14px"><span>Sauvegarde de migration V5</span><b>Active</b></div>'+
    '<button class="primary full" id="saveDataSettings" style="margin-top:16px">Enregistrer</button>'+settingsBack()
  );
  $('#saveDataSettings').onclick=async()=>{
    state.household.referenceDate=$('#referenceDateSetting').value;
    state.household.sharingOpeningBalance=Number($('#sharingOpeningSetting').value||0);
    await saveHouseholdSettings();renderAll();profile();
  };
  bindSettingsBack();
}
async function loadWorkspace(){showGate('cloudLoadingPanel');loadingStage('Chargement de votre espace…');const{data:m,error:e}=await withTimeout(client.from('household_members').select('household_id,user_id,slot,display_name').eq('user_id',session.user.id).maybeSingle(),7000,'Chargement du profil trop long.');if(e)throw e;if(!m){showGate('cloudWorkspacePanel');return;}document.documentElement.dataset.traceUserId=session.user.id;me=m.slot;partner=me==='la'?'partner':'la';loadingStage('Synchronisation de vos données…');const[{data:h,error:he},{data:docs,error:de},{data:members,error:mee}]=await withTimeout(Promise.all([client.from('households').select('id,name,settings,schema_version,invite_code,created_by').eq('id',m.household_id).single(),client.from('documents').select('collection,item_id,data').eq('household_id',m.household_id),client.from('household_members').select('slot,display_name,role,user_id').eq('household_id',m.household_id)]),9000,'Synchronisation trop longue.');if(he||de||mee)throw he||de||mee;household=h;state={household:{...(h.settings||{}),name:h.name,inviteCode:h.invite_code||'',createdBy:h.created_by||'',workspaceMembers:members.map(x=>({slot:x.slot,name:x.display_name,role:x.role,userId:x.user_id}))},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[]};if(!Array.isArray(state.household.members)||!state.household.members.length)state.household.members=members.map(x=>({id:x.slot,name:x.display_name,initials:initials(x.display_name)}));members.forEach(x=>{const mm=state.household.members.find(y=>y.id===x.slot);if(mm){mm.name=x.display_name||mm.name;mm.initials=initials(mm.name);}});const map={categories:'categories',accounts:'accounts',budgets:'budgets',transactions:'transactions',investmentAccounts:'investment_accounts',investmentOperations:'investment_operations',reconciliations:'reconciliations'};Object.entries(map).forEach(([k,c])=>state[k]=docs.filter(d=>d.collection===c).map(d=>d.data).filter(Boolean));state.household.referenceDate||='2026-11-01';$('#profileBtn').textContent=member(me).initials||initials(member(me).name);renderAll();navigate((location.hash||'#').slice(1)||'home');hideGate();sync('synced');}
async function ensureWorkspace(s){
  if(!s)return;
  session=s;
  if(household)return;
  if(workspaceLoadPromise)return workspaceLoadPromise;
  workspaceLoadPromise=loadWorkspace().finally(()=>{workspaceLoadPromise=null;});
  return workspaceLoadPromise;
}
function authErrorText(err){
  const raw=String(err?.message||'').toLowerCase();
  if(raw.includes('invalid login credentials'))return 'Courriel ou mot de passe incorrect.';
  if(raw.includes('email not confirmed'))return 'Confirme ton adresse courriel avant de te connecter.';
  if(raw.includes('too many requests')||raw.includes('rate limit'))return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if(raw.includes('network')||raw.includes('fetch'))return 'Connexion au serveur impossible. Vérifie ta connexion et réessaie.';
  return 'Connexion impossible. Réessaie.';
}
async function init(){
  const cfg=window.BUDGET_DUO_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey){showGate('cloudConfigPanel');return;}
  if(!window.supabase?.createClient){
    showGate('cloudAuthPanel');
    $('#cloudAuthMessage').textContent='Le service de connexion n’a pas chargé. Recharge Trace.';
    return;
  }

  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      storage:window.localStorage
    }
  });

  client.auth.onAuthStateChange((event,s)=>{
    session=s||null;
    if(event==='SIGNED_OUT'){
      household=null;
      workspaceLoadPromise=null;
      showGate('cloudAuthPanel');
      return;
    }
    if(s&&['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED','USER_UPDATED'].includes(event)&&!household){
      setTimeout(()=>ensureWorkspace(s).catch(fatal),0);
    }
  });

  try{
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    session=data?.session||null;
    if(session)await ensureWorkspace(session);
    else showGate('cloudAuthPanel');
  }catch(err){
    console.error(err);
    session=null;
    household=null;
    showGate('cloudAuthPanel');
    $('#cloudAuthMessage').textContent=authErrorText(err);
  }
}
function fatal(e){
  console.error(e);
  sync('error','Erreur');
  if(!session){
    showGate('cloudAuthPanel');
    $('#cloudAuthMessage').textContent='Trace n’a pas pu charger ton espace. Réessaie.';
    return;
  }
  hideGate();
  openSheet('Trace a rencontré un problème','<div class="empty-note">Une partie de Trace n’a pas pu se charger correctement.</div><button class="primary full" id="traceReloadBtn" type="button" style="margin-top:14px">Recharger Trace</button>');
  $('#traceReloadBtn').onclick=()=>location.reload();
}
function bind(){$('#closeSheet').onclick=closeSheet;$('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet();};$$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));$$('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='review'){navigate('activity');showTab('review');}else navigate(b.dataset.go);});$('#quickAdd').onclick=()=>{const page=$('.page.active')?.dataset.page;if(page==='budget')openBudgetAdd('variable');else openSheet('Ajouter','<div class="empty-note">L’ajout manuel de transaction sera activé dans la prochaine passe.</div>');};$('#profileBtn').onclick=profile;$('#analysisBtn').onclick=analysis;$('#homeTrendCard').onclick=analysis;$('#shareCard').onclick=()=>openSheet('Partage',`<div class="money2">${esc($('#shareBalance').textContent)}</div><div class="empty-note" style="margin-top:12px">Le détail des mouvements sera activé dans la prochaine passe.</div>`);$('#shareOpen').onclick=$('#shareCard').onclick;$$('[data-kpi]').forEach(b=>b.onclick=()=>detail(b.dataset.kpi));$$('#homeScope .seg').forEach(b=>b.onclick=()=>{homeScope=b.dataset.scope;renderHome();});document.querySelectorAll('#budgetScope .seg').forEach(b=>b.onclick=()=>{budgetScope=b.dataset.scope;renderBudget();});$('#budgetMonthPicker')?.addEventListener('change',e=>setBudgetMonth(e.target.value));$('#budgetCurrentMonth')?.addEventListener('click',()=>setBudgetMonth(CM));$('#budgetCopyPrevious')?.addEventListener('click',copyPreviousBudget);$$('#wealthScope .seg').forEach(b=>b.onclick=()=>{wealthScope=b.dataset.scope;renderWealth();});$$('#activityTabs .tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$('#annualBudgetDetails').onclick=analysis;$('#annualBudgetCard').onclick=analysis;$('#wealthAnalysis').onclick=()=>openSheet('Analyse du patrimoine','<div class="empty-note">Analyse patrimoine en préparation.</div>');$('#wealthChart').onclick=$('#wealthAnalysis').onclick;$('#chooseImport').onclick=()=>$('#importFile').click();$('#importFile').onchange=e=>{$('#importResult').innerHTML=`<article class="card"><b>${esc(e.target.files?.[0]?.name||'Fichier')}</b><div class="empty-note" style="margin-top:10px">Fichier reconnu. L’extraction automatique sera branchée dans l’étape suivante.</div></article>`;};document.querySelectorAll('[data-password-target]').forEach(btn=>btn.onclick=()=>{const input=$('#'+btn.dataset.passwordTarget);if(!input)return;const reveal=input.type==='password';input.type=reveal?'text':'password';btn.classList.toggle('active',reveal);btn.setAttribute('aria-pressed',String(reveal));btn.setAttribute('aria-label',reveal?'Masquer le mot de passe':'Afficher le mot de passe');});$('[data-auth-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.authTab;$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#cloudLoginForm').classList.toggle('hidden',t!=='login');$('#cloudSignupForm').classList.toggle('hidden',t!=='signup');});$('#cloudLoginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');$('#cloudAuthMessage').textContent='Connexion…';if(btn){btn.disabled=true;btn.textContent='Connexion…';}try{const{data,error}=await client.auth.signInWithPassword({email:$('#cloudLoginEmail').value.trim(),password:$('#cloudLoginPassword').value});if(error)throw error;if(!data?.session)throw new Error('Session non créée');session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Se connecter';}}};$('#cloudSignupForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Création…';}try{const{data,error}=await client.auth.signUp({email:$('#cloudSignupEmail').value.trim(),password:$('#cloudSignupPassword').value,options:{data:{display_name:$('#cloudSignupName').value.trim()}}});if(error)throw error;if(data?.session){session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}else{$('#cloudAuthMessage').textContent='Compte créé. Vérifie ton courriel pour confirmer ton adresse.';}}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Créer mon compte';}}};$$('[data-workspace-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.workspaceTab;$('#cloudCreateHouseholdForm').classList.toggle('hidden',t!=='create');$('#cloudJoinHouseholdForm').classList.toggle('hidden',t!=='join');});$('#cloudCreateHouseholdForm').onsubmit=async e=>{e.preventDefault();const{error}=await client.rpc('create_household',{p_name:$('#cloudHouseholdName').value.trim(),p_display_name:$('#cloudCreatorName').value.trim()});if(error)$('#cloudWorkspaceMessage').textContent=error.message;else loadWorkspace();};$('#cloudJoinHouseholdForm').onsubmit=async e=>{e.preventDefault();const{error}=await client.rpc('join_household',{p_invite_code:$('#cloudInviteCode').value.trim().toUpperCase(),p_display_name:$('#cloudJoinName').value.trim()});if(error)$('#cloudWorkspaceMessage').textContent=error.message;else loadWorkspace();};}
function bootTrace(){
  try{
    bind();
    init();
  }catch(err){
    console.error('Trace startup error',err);
    showGate('cloudAuthPanel');
    const msg=$('#cloudAuthMessage');
    if(msg)msg.textContent='Trace n’a pas pu démarrer. Recharge la page.';
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootTrace,{once:true});
}else{
  bootTrace();
}
})();
