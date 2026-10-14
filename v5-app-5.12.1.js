(()=>{'use strict';window.__TRACE_BUILD__='5.12.1';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const now=new Date(),CM=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const money=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(v||0));
const monthLabel=m=>new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric'}).format(new Date(`${m}-01T12:00:00`));
const shortMonth=m=>new Intl.DateTimeFormat('fr-CA',{month:'short'}).format(new Date(`${m}-01T12:00:00`)).replace('.','');
const monthOffset=(m,delta)=>{const [y,mo]=String(m).split('-').map(Number),d=new Date(y,mo-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const localDateISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const txDocId=()=>`t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const investmentDocId=()=>`inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const budgetDocId=()=>`b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const initialBudgetMonth=new URLSearchParams(location.search).get('month');
let client,session,household,workspaceLoadPromise=null,me='la',partner='partner',homeScope='mine',budgetScope='mine',budgetMonth=/^\d{4}-\d{2}$/.test(initialBudgetMonth||'')?initialBudgetMonth:CM,wealthScope='mine',analysisScope='mine',tab='transactions',activityMonth=CM;
let state={household:{},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[],importDays:[]};
function withTimeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'Délai dépassé')),ms))]);}
function loadingStage(text){const el=$('#cloudLoadingText');if(el)el.textContent=text;}
function member(id){return(state.household.members||[]).find(x=>x.id===id)||{id,name:id==='la'?'Louis-Antoine':'Élise',initials:id==='la'?'LA':'É'};}
function cat(id){return state.categories.find(x=>x.id===id)||{name:'À classer',icon:'•',type:'expense'};}
function scope(s){return s==='mine'?me:'couple';}
function showGate(id){$('#cloudGate').classList.remove('hidden');['cloudLoadingPanel','cloudConfigPanel','cloudAuthPanel','cloudWorkspacePanel'].forEach(x=>$('#'+x)?.classList.toggle('hidden',x!==id));$('#app').classList.add('cloud-locked');}
function hideGate(){$('#cloudGate').classList.add('hidden');$('#app').classList.remove('cloud-locked');}
function sync(k,t){$('#syncPill').dataset.status=k;$('#syncLabel').textContent=(t||({synced:'Synchronisé',loading:'Connexion…',error:'Erreur'}[k]||k))+' · v'+window.__TRACE_BUILD__;}
function openSheet(t,h){$('#sheetTitle').textContent=t;$('#sheetBody').innerHTML=h;$('#sheetBackdrop').classList.add('open');document.body.classList.add('sheet-open');}
function closeSheet(){$('#sheetBackdrop').classList.remove('open');document.body.classList.remove('sheet-open');}
function split(t,id){const d=state.household.defaultSplit||{la:50,partner:50};return Number(t.amountCAD||0)*Number(t.split?.[id]??d[id]??50)/100;}
function alloc(t,s){const a=Number(t.amountCAD||0);if(s==='couple')return a;if(t.beneficiary===s)return a;if(t.beneficiary==='couple')return split(t,s);return 0;}
function budgetAmt(b,s){const a=Number(b.amount||0);if(s==='couple'||b.scope===s)return a;if(b.scope==='couple'){const d=state.household.categorySplits?.[b.categoryId]||state.household.defaultSplit||{la:50,partner:50};return a*Number(d[s]||0)/100;}return 0;}

/* Solde à l'ouverture du jour: >= date. Solde à la fermeture du jour: > date. */
function openingBoundary(accountId){
 const d=state.household.accountOpeningBalanceDates?.[accountId]||state.household.referenceDate||'';
 const mode=state.household.accountOpeningBalanceModes?.[accountId]==='end'?'end':'start';
 return{date:d,mode};
}
function afterBoundary(date,boundary){return !boundary?.date||(boundary.mode==='end'?String(date||'')>boundary.date:String(date||'')>=boundary.date);}
function isFinancialPeriod(t){
 const date=String(t.date||''),start=state.household.referenceDate||'';
 if(start&&date<start)return false;
 const acc=t.accountId||t.toAccountId;
 if(!acc||!state.accounts.some(a=>a.id===acc))return true;
 return afterBoundary(date,openingBoundary(acc));
}
function normalizedMerchant(s){
 return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:montreal|montre|quebec|toronto|canada|ontario|vancouver|qc|on|bc|ca|mtl|inc|lt[dée]|visa|mastercard)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function dateGapDays(a,b){
 const da=new Date(String(a||'')+'T12:00:00'),db=new Date(String(b||'')+'T12:00:00');
 return Number.isNaN(+da)||Number.isNaN(+db)?999:Math.abs(Math.round((da-db)/86400000));
}
function sourceMatch(a,b){
 if(a.accountId!==b.accountId||Math.abs(Number(a.amountCAD||a.amount)-Number(b.amountCAD||b.amount))>.009)return null;
 if(!([a.type,b.type].every(x=>x==='expense')||[a.type,b.type].every(x=>x==='refund')||[a.type,b.type].every(x=>x==='income')))return null;
 const days=dateGapDays(a.date,b.date);
 if(days>4)return null;
 const na=normalizedMerchant(a.name),nb=normalizedMerchant(b.name);
 if(!na||!nb)return days===0?'possible':null;
 const partsA=new Set(na.split(' ').filter(x=>x.length>2)),partsB=new Set(nb.split(' ').filter(x=>x.length>2));
 const common=[...partsA].filter(x=>partsB.has(x)).length;
 const similarity=common/Math.max(1,Math.min(partsA.size,partsB.size));
 if(days<=2&&(na===nb||na.includes(nb)||nb.includes(na)||similarity>=.67))return'exact';
 if(days<=4&&(similarity>=.4||na.includes(nb)||nb.includes(na)))return'possible';
 return days===0?'possible':null;
}
function findSimilarTransaction(candidate){
 const matches=state.transactions.map(t=>({t,status:sourceMatch(candidate,t)})).filter(x=>x.status);
 return matches.find(x=>x.status==='exact')||matches[0]||null;
}

function txs(m,s,confirmed=true){return state.transactions.filter(t=>String(t.date||'').startsWith(m)&&isFinancialPeriod(t)&&(!confirmed||t.status==='confirmed')&&(s==='couple'||t.beneficiary===s||t.beneficiary==='couple'||(t.payerId===s&&['income','transfer','external_refund'].includes(t.type))));}
function summary(m,s){let income=0,expense=0,refund=0;txs(m,s,true).forEach(t=>{if(t.type==='income')income+=alloc(t,s);else if(['expense','group_expense','person_payment'].includes(t.type))expense+=alloc(t,s);else if(t.type==='refund')refund+=alloc(t,s);});expense=Math.max(0,expense-refund);const bs=state.budgets.filter(b=>b.month===m),ib=bs.filter(b=>cat(b.categoryId).type==='income').reduce((x,b)=>x+budgetAmt(b,s),0),eb=bs.filter(b=>cat(b.categoryId).type==='expense').reduce((x,b)=>x+budgetAmt(b,s),0);return{income,expense,ib,eb,saving:income-expense};}
function breakdown(m,s){return state.categories.filter(c=>c.type==='expense'&&!c.archived).map(c=>{const budget=state.budgets.filter(b=>b.month===m&&b.categoryId===c.id).reduce((x,b)=>x+budgetAmt(b,s),0),actual=txs(m,s,true).filter(t=>t.categoryId===c.id).reduce((x,t)=>x+(['expense','group_expense','person_payment'].includes(t.type)?alloc(t,s):t.type==='refund'?-alloc(t,s):0),0);return{...c,budget,actual:Math.max(0,actual),ratio:budget?actual/budget:0};}).filter(x=>x.budget||x.actual).sort((a,b)=>b.ratio-a.ratio||b.actual-a.actual);}
function months6(){return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
function chart(node,s,metric='saving'){const ms=months6(),vs=ms.map(m=>summary(m,s)),r=vs.map(v=>metric==='expense'?v.expense:Math.max(0,v.saving)),b=vs.map(v=>metric==='expense'?v.eb:Math.max(0,v.ib-v.eb)),max=Math.max(1,...r,...b);node.innerHTML=ms.map((m,i)=>`<div class="monthbar"><i style="height:${Math.max(3,b[i]/max*100)}%"></i><b style="height:${Math.max(3,r[i]/max*100)}%"></b><em>${shortMonth(m)}</em></div>`).join('');}
function accountType(a){const s=(String(a.id||'')+' '+String(a.name||'')).toLowerCase();if(/card|carte|visa|master/.test(s))return'card';if(/checking|courant|chequ/.test(s))return'checking';if(/saving|épargne|epargne/.test(s))return'saving';return'other';}
function accountEstimate(a){
 const r=state.reconciliations.filter(x=>x.accountId===a.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];
 const b=state.household.accountOpeningBalances||{},d=state.household.accountOpeningBalanceDates||{};
 const base=r?Number(r.actualBalance||0):(b[a.id]===undefined?null:Number(b[a.id]));
 const boundary=r?{date:r.date,mode:'end'}:openingBoundary(a.id);
 if(base===null||!boundary.date)return null;
 const movement=state.transactions.filter(t=>t.status==='confirmed'&&(t.accountId===a.id||t.toAccountId===a.id)&&afterBoundary(t.date,boundary)).reduce((x,t)=>{
  const v=Number(t.amountCAD||0);
  if(t.type==='transfer'&&t.toAccountId===a.id)return x+v;
  if(accountType(a)==='card'){
   if(['expense','group_expense','person_payment'].includes(t.type))return x-v;
   if(['refund','external_refund','transfer'].includes(t.type))return x+v;
  }else{
   if(['income','refund','external_refund'].includes(t.type))return x+v;
   if(['expense','group_expense','person_payment','transfer'].includes(t.type))return x-v;
  }
  return x;
 },0);
 const investMovement=state.investmentOperations.filter(o=>o.bankAccountId===a.id&&afterBoundary(o.date,boundary)).reduce((v,o)=>v+(o.type==='deposit'?-Number(o.bankAmountCAD??o.amount??0):o.type==='withdrawal'?Number(o.bankAmountCAD??o.amount??0):0),0);
 return base+movement+investMovement;
}
function bank(s){const owners=s==='couple'?['la','partner']:[s];let checking=0,card=0,hc=false,hv=false;state.accounts.filter(a=>owners.includes(a.owner)).forEach(a=>{const v=accountEstimate(a);if(v===null)return;if(accountType(a)==='checking'){checking+=v;hc=true;}if(accountType(a)==='card'){card+=v;hv=true;}});return{checking:hc?checking:null,card:hv?card:null,net:hc?checking+(hv?card:0):null};}

/* Share: one settlement = one transfer; the same document drives balances and account movements */
function sharingMovement(t){
 const a=Number(t.amountCAD||0);
 if(['expense','group_expense','refund'].includes(t.type)){
  const sign=t.type==='refund'?-1:1;
  const paid=t.payerId==='la'?a*sign:0;
  const own=t.beneficiary==='couple'?split(t,'la')*sign:t.beneficiary==='la'?a*sign:0;
  return paid-own;
 }
 if(t.type==='transfer'){if(t.payerId==='la'&&t.beneficiary==='partner')return a;if(t.payerId==='partner'&&t.beneficiary==='la')return-a;}
 return 0;
}
function sharingHistory(){
 const date=state.household.referenceDate||'';
 return state.transactions.filter(t=>t.status==='confirmed'&&(!date||afterBoundary(t.date,{date,mode:state.household.sharingOpeningBalanceMode==='end'?'end':'start'}))&&isFinancialPeriod(t)).map(t=>({t,delta:sharingMovement(t)})).filter(x=>Math.abs(x.delta)>.005).sort((a,b)=>String(b.t.date).localeCompare(String(a.t.date)));
}

function editTricountOpening(){
 const current=Number(state.household.sharingOpeningBalance||0);
 openSheet('Reprendre le solde Tricount',
 '<div class="empty-note">Saisis seulement le solde net final de votre ancien Tricount, au '+esc(state.household.referenceDate||'début du suivi')+'. Pas les dépenses historiques : elles ne doivent pas être comptées deux fois.</div>'+
 '<label class="label2">Date et mode de reprise</label><select id="tricountOpeningMode" class="input"><option value="start"'+(state.household.sharingOpeningBalanceMode!=='end'?' selected':'')+'>Solde au début du jour (jour inclus)</option><option value="end"'+(state.household.sharingOpeningBalanceMode==='end'?' selected':'')+'>Solde à la fin du jour (jour exclu)</option></select>'+
 '<label class="label2">Montant restant à rembourser (CAD)</label><input id="tricountAmount" class="input" type="number" min="0" step="0.01" inputmode="decimal" value="'+Math.abs(current).toFixed(2)+'">'+
 '<label class="label2">À qui cet argent est-il dû ?</label><select id="tricountCreditor" class="input"><option value="la">'+esc(member('la').name)+'</option><option value="partner">'+esc(member('partner').name)+'</option></select>'+
 '<div class="empty-note" style="margin-top:12px">Un solde de 0 $ signifie que vous êtes à l’équilibre. Cette valeur s’ajoute aux mouvements Trace effectués depuis le '+esc(state.household.referenceDate||'début')+'.</div>'+
 '<button class="primary full" id="saveTricountOpening" style="margin-top:16px">Enregistrer le solde de départ</button>'+
 '<button class="secondary full" id="cancelTricountOpening" style="margin-top:8px">Retour au Partage</button>'+traceFeedback());
 $('#tricountCreditor').value=current<0?'partner':'la';
 $('#cancelTricountOpening').onclick=openSharing;
 $('#saveTricountOpening').onclick=async()=>{
  const amount=Number($('#tricountAmount').value),owedTo=$('#tricountCreditor').value;
  if(!Number.isFinite(amount)||amount<0||amount>100000000){$('#traceFeedback').textContent='Montant positif ou zéro obligatoire.';return;}
  const opening=amount*(owedTo==='la'?1:-1),before=state.household.sharingOpeningBalance,priorMode=state.household.sharingOpeningBalanceMode;
  $('#saveTricountOpening').disabled=true;state.household.sharingOpeningBalance=opening;state.household.sharingOpeningBalanceMode=$('#tricountOpeningMode').value;
  try{await saveHouseholdSettings();renderAll();openSharing();}
  catch(e){state.household.sharingOpeningBalance=before;state.household.sharingOpeningBalanceMode=priorMode;$('#saveTricountOpening').disabled=false;traceNotice(e);}
 };
}

function openSharing(){
 const b=coupleBalance(),creditor=b>0?'la':'partner',debtor=b>0?'partner':'la',rows=sharingHistory();
 openSheet('Partage du couple',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('heart')+'</span><div><b>'+(Math.abs(b)<.01?'Vous êtes à l’équilibre':esc(member(debtor).name)+' doit '+money(Math.abs(b))+' à '+esc(member(creditor).name))+'</b><small>Solde depuis le '+esc(state.household.referenceDate||'début')+' · répartition réelle de chaque dépense</small></div></div>'+
  '<button type="button" class="primary full" id="addSettlement" style="margin-top:14px">Enregistrer un règlement</button>'+'<button type="button" class="secondary full" id="editTricountOpening" style="margin-top:8px">'+(Number(state.household.sharingOpeningBalance||0)!==0?'Modifier le solde repris de Tricount':'Reprendre le solde de Tricount')+'</button>'+'<div class="empty-note" style="margin-top:9px">Solde initial Tricount : '+(Number(state.household.sharingOpeningBalance||0)>=0?'+':'−')+money(Math.abs(Number(state.household.sharingOpeningBalance||0)))+' (positif = '+esc(member('partner').name)+' doit à '+esc(member('la').name)+')</div>'+
  '<div class="section-head"><h2>Historique partagé</h2></div>'+
  (rows.length?rows.map(({t,delta})=>'<div class="trace-list-btn"><span><b>'+esc(t.name||'Opération')+'</b><small>'+esc(t.date)+' · '+(t.type==='transfer'?'Règlement':esc(member(t.payerId||me).name)+' a payé '+money(t.amountCAD))+'</small></span><strong class="'+(delta<0?'trace-positive':'')+'">'+(delta>0?'+':'−')+money(Math.abs(delta))+'</strong></div>').join(''):'<div class="empty-note">Aucun mouvement commun depuis le début de votre suivi.</div>'));
 $('#addSettlement').onclick=()=>openSettlement(null);$('#editTricountOpening').onclick=editTricountOpening;
}
function openSettlement(original){
 const balance=coupleBalance(),defaultPayer=balance>0?'partner':'la';
 const payer=original?.payerId||defaultPayer;
 const amount=original?.amountCAD??(Math.abs(balance)>.005?Math.abs(balance):0);
 openSheet(original?'Modifier le règlement':'Règlement entre partenaires',
  '<div class="empty-note">Ce mouvement solde une dette entre vous. Il ne crée ni revenu ni dépense dans le budget.</div>'+
  '<label class="label2">Qui rembourse ?</label><select class="input" id="settlePayer"><option value="la">'+esc(member('la').name)+'</option><option value="partner">'+esc(member('partner').name)+'</option></select>'+
  '<div class="formrow"><div><label class="label2">Montant (CAD)</label><input class="input" type="number" id="settleAmount" min="0.01" step="0.01" inputmode="decimal" value="'+Number(amount)+'"></div><div><label class="label2">Date</label><input class="input" type="date" id="settleDate" value="'+esc(original?.date||localDateISO())+'"></div></div>'+
  '<label class="label2">Compte débité</label><select class="input" id="settleFrom"></select>'+
  '<label class="label2">Compte crédité</label><select class="input" id="settleTo"></select>'+
  '<button class="primary full" id="saveSettlement" style="margin-top:18px">Enregistrer le règlement</button>'+
  (original?'<button class="secondary full trace-danger" id="removeSettlement">Supprimer le règlement</button>':'')+
  '<button class="secondary full" id="cancelSettlement" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#settlePayer').value=payer;
 const refresh=()=>{
  const from=$('#settlePayer').value,to=from==='la'?'partner':'la';
  const opts=owner=>visibleBankAccounts(owner).filter(a=>accountType(a)!=='card').map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('');
  $('#settleFrom').innerHTML=opts(from);$('#settleTo').innerHTML=opts(to);
  if(original){if(original.accountId)$('#settleFrom').value=original.accountId;if(original.toAccountId)$('#settleTo').value=original.toAccountId;}
 };
 $('#settlePayer').onchange=refresh;refresh();
 $('#cancelSettlement').onclick=openSharing;
 if(original)$('#removeSettlement').onclick=()=>deleteTransaction(original);
 $('#saveSettlement').onclick=async()=>{
  const amount=Number($('#settleAmount').value),payerId=$('#settlePayer').value,beneficiary=payerId==='la'?'partner':'la',accountId=$('#settleFrom').value,toAccountId=$('#settleTo').value,date=$('#settleDate').value;
  if(!(amount>0)||!Number.isFinite(amount)||!accountId||!toAccountId||accountId===toAccountId||!date){$('#traceFeedback').textContent='Indique un montant, une date et les deux comptes bancaires concernés.';return;}
  const next={...(original||{}),id:original?.id||txDocId(),type:'transfer',status:'confirmed',name:'Règlement '+member(payerId).name+' → '+member(beneficiary).name,
   date,amountCAD:amount,amountOriginal:amount,currency:'CAD',rate:1,categoryId:'',accountId,toAccountId,payerId,beneficiary,...traceSplit(beneficiary,amount)};
  $('#saveSettlement').disabled=true;
  try{await saveDocument('transactions',next);if(original)Object.assign(original,next);else state.transactions.push(next);closeSheet();renderAll();navigate('activity');showTab('transactions');}
  catch(e){$('#saveSettlement').disabled=false;traceNotice(e);}
 };
}

function coupleBalance(){const opening=Number(state.household.sharingOpeningBalance||0);return opening+sharingHistory().reduce((v,x)=>v+x.delta,0);}
function updateSegments(){[['homeScope',homeScope],['budgetScope',budgetScope],['wealthScope',wealthScope]].forEach(([id,v])=>$$('#'+id+' .seg').forEach(b=>b.classList.toggle('active',b.dataset.scope===v)));}
function renderHome(){const sId=scope(homeScope),s=summary(CM,sId),cons=s.eb?s.expense/s.eb*100:0,b=bank(sId);$('#homeMonthLabel').textContent=monthLabel(CM);$('#homeGreeting').textContent=homeScope==='mine'?`Bonjour ${member(me).name}`:'Votre situation';$('#homeBudgetAvailable').textContent=money(s.eb-s.expense);$('#homeBudgetSub').textContent=s.eb?`sur ${money(s.eb)} prévus ce mois`:'Budget du mois à compléter';$('#homeBudgetProgress').style.width=`${Math.min(100,Math.max(0,cons))}%`;$('#homeBudgetPercent').textContent=`${cons.toFixed(0)} % consommé`;$('#homeBudgetSpent').textContent=`${money(s.expense)} dépensés`;$('#homeBalance').textContent=b.net===null?'À configurer':money(b.net);$('#homeChecking').textContent=b.checking===null?'—':money(b.checking);$('#homeCard').textContent=b.card===null?'—':money(b.card);$('#reconcileBadge').textContent=state.reconciliations.length?'✓ Rapproché':'À rapprocher';$('#homeIncome').textContent=money(s.income);$('#homeSpending').textContent=money(s.expense);$('#homeSaving').textContent=money(s.saving);const p=state.transactions.filter(t=>t.status!=='confirmed');$('#pendingCountBadge').textContent=p.length;$('#pendingText').textContent=p.length?`${p.length} à vérifier`:'Tout est à jour';const cs=breakdown(CM,sId).slice(0,4);$('#homeBudgetCategories').innerHTML=cs.length?cs.map(c=>`<div class="budget-row"><div class="name">${esc(c.name)}</div><div class="bar ${c.ratio>=.8?'warn':''}"><i style="width:${Math.min(100,c.ratio*100)}%"></i></div><div class="amount"><strong>${money(c.actual)}</strong> / ${money(c.budget)}</div></div>`).join(''):'<div class="empty-note">Ajoute ton budget pour voir les catégories importantes.</div>';chart($('#homeTrend'),sId);const cb=coupleBalance(),pa=member(partner),la=member('la');$('#partnerAvatar').textContent=pa.initials||initials(pa.name);$('#shareLabel').textContent=`Solde avec ${pa.name}`;$('#shareBalance').textContent=Math.abs(cb)<.01?'Vous êtes à l’équilibre':cb>0?`${member('partner').name} doit ${money(cb)} à ${member('la').name}`:`${member('la').name} doit ${money(Math.abs(cb))} à ${member('partner').name}`;updateSegments();}
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
    ['Dépenses fixes','fixed',b=>cat(b.categoryId).type==='expense'&&categoryKind(cat(b.categoryId))==='fixed'],
    ['Dépenses variables','variable',b=>cat(b.categoryId).type==='expense'&&categoryKind(cat(b.categoryId))!=='fixed']
  ];
  $('#budgetSections').innerHTML='<div class="trace-budget-toolbar"><button class="linkbtn" type="button" id="manageBudgetCategories">Gérer les catégories</button></div>'+sectionDefs.map(([t,kind,f])=>'<div class="section-head"><h2>'+t+'</h2><button class="linkbtn budget-add-link" type="button" data-budget-add="'+kind+'">+ Ajouter</button></div><article class="card budget-section">'+(rows.filter(f).length?rows.filter(f).map(b=>'<button class="budget-card budget-edit-row" type="button" data-budget-edit="'+esc(b.id)+'"><span class="bicon">'+esc(cat(b.categoryId).icon||'•')+'</span><span class="bmain"><strong>'+esc(cat(b.categoryId).name)+'</strong><small>'+(b.scope==='couple'?'Budget commun':'Personnel')+'</small></span><span class="bvalue"><strong>'+money(budgetAmt(b,sId))+'</strong></span></button>').join(''):'<div class="empty-note">Aucun poste.</div>')+'</article>').join('');
  $('#manageBudgetCategories').onclick=manageCategories;
  document.querySelectorAll('[data-budget-add]').forEach(btn=>btn.onclick=()=>openBudgetAdd(btn.dataset.budgetAdd));
  document.querySelectorAll('[data-budget-edit]').forEach(btn=>btn.onclick=()=>openBudgetEdit(btn.dataset.budgetEdit));
  const year=month.slice(0,4),ms=Array.from({length:12},(_,i)=>year+'-'+String(i+1).padStart(2,'0')),vs=ms.map(m=>summary(m,sId)),max=Math.max(1,...vs.flatMap(v=>[v.eb,v.expense]));
  $('#annualBudgetChart').innerHTML=ms.map((m,i)=>'<div class="monthbar '+(m===month?'selected':'')+'"><i style="height:'+Math.max(2,vs[i].eb/max*100)+'%"></i><b style="height:'+Math.max(2,vs[i].expense/max*100)+'%"></b><em>'+shortMonth(m)+'</em></div>').join('');
  updateSegments();
}

/* Account defaults: purchases on card; salary, transfers and refunds received on checking. Never silently delete a real account. */
function visibleBankAccounts(owner=me){
 return state.accounts.filter(a=>a.owner===owner&&a.id!=='cash'&&a.type!=='cash'&&!a.archived);
}
function preferredBankAccount(type='expense',owner=me){
 const list=visibleBankAccounts(owner);
 const requested=type==='expense'?'card':'checking';
 return list.find(a=>accountType(a)===requested)||list.find(a=>accountType(a)===(requested==='card'?'checking':'card'))||list[0]||null;
}

function manualCategories(type){
  const active=state.categories.filter(c=>!c.archived);
  if(type==='income')return active.filter(c=>c.type==='income');
  return active.filter(c=>c.type==='expense');
}
function openManualTransaction(){
  let txType='expense';
  const mineAccounts=visibleBankAccounts(me);
  const accountOptions=mineAccounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('');
  const beneficiaryOptions='<option value="'+esc(me)+'">Moi</option><option value="couple">Nous deux</option>';
  openSheet('Ajouter une opération',
    '<div class="manual-transaction-intro"><div><b>Ajout manuel</b><small>L’opération sera ajoutée directement dans Activité.</small></div></div>'+
    '<div class="manual-type-grid">'+
      '<button class="choice selected" data-manual-type="expense" type="button">Dépense</button>'+
      '<button class="choice" data-manual-type="income" type="button">Revenu</button>'+
      '<button class="choice" data-manual-type="refund" type="button">Remboursement</button>'+
    '</div>'+
    '<label class="label2">Description</label><input class="input" id="manualTxName" type="text" maxlength="80" placeholder="Ex. Épicerie, salaire, remboursement">'+
    '<div class="formrow manual-money-row"><div><label class="label2">Montant</label><div class="budget-amount-field"><input class="input" id="manualTxAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"><span>$</span></div></div>'+
    '<div><label class="label2">Date</label><input class="input" id="manualTxDate" type="date" value="'+localDateISO()+'"></div></div>'+
    '<label class="label2">Catégorie</label><select class="input" id="manualTxCategory"></select>'+
    '<div class="formrow"><div><label class="label2">Compte</label><select class="input" id="manualTxAccount">'+accountOptions+'</select></div>'+
    '<div><label class="label2">Pour qui ?</label><select class="input" id="manualTxBeneficiary">'+beneficiaryOptions+'</select></div></div>'+
    '<div class="manual-transaction-note" id="manualTxNote">Une dépense commune utilise automatiquement votre répartition par défaut.</div>'+
    '<button class="primary full" id="saveManualTx" type="button" style="margin-top:18px">Ajouter à l’activité</button>'+
    '<button class="secondary full" id="cancelManualTx" type="button" style="margin-top:8px">Annuler</button>'
  );
  const category=$('#manualTxCategory');
  const refreshCategories=()=>{
    const cats=manualCategories(txType);
    category.innerHTML=cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    $('#manualTxBeneficiary').disabled=txType==='income';
    if(txType==='income')$('#manualTxBeneficiary').value=me;
    $('#manualTxNote').textContent=txType==='refund'?'Le remboursement réduira la dépense de la catégorie choisie.':txType==='income'?'Le revenu sera rattaché à ton profil.':'Une dépense commune utilise automatiquement votre répartition par défaut.';
  };
  document.querySelectorAll('[data-manual-type]').forEach(btn=>btn.onclick=()=>{
    txType=btn.dataset.manualType;
    document.querySelectorAll('[data-manual-type]').forEach(x=>x.classList.toggle('selected',x===btn));
    refreshCategories();
    const choice=preferredBankAccount(txType);if(choice)$('#manualTxAccount').value=choice.id;
  });
  refreshCategories();
  const defaultPurchase=preferredBankAccount('expense');if(defaultPurchase)$('#manualTxAccount').value=defaultPurchase.id;
  $('#cancelManualTx').onclick=closeSheet;
  $('#saveManualTx').onclick=async()=>{
    const amount=Number($('#manualTxAmount').value||0);
    const name=$('#manualTxName').value.trim()||(txType==='income'?'Revenu':txType==='refund'?'Remboursement':'Dépense');
    const categoryId=$('#manualTxCategory').value;
    const beneficiary=txType==='income'?me:$('#manualTxBeneficiary').value;
    if(!Number.isFinite(amount)||amount<=0||!categoryId)return;
    const defaultSplit=state.household.defaultSplit||{la:50,partner:50};
    const splitValue=beneficiary==='couple'?{la:Number(defaultSplit.la??50),partner:Number(defaultSplit.partner??50)}:(beneficiary==='la'?{la:100,partner:0}:{la:0,partner:100});
    const item={
      id:txDocId(),date:$('#manualTxDate').value||localDateISO(),name,note:'',merchant:'',
      type:txType,status:'confirmed',currency:'CAD',rate:1,
      amountCAD:amount,amountOriginal:amount,bankAmount:null,
      categoryId,accountId:$('#manualTxAccount').value||'cash',
      payerId:me,beneficiary,split:splitValue,splitMode:'percent',
      splitAmounts:beneficiary==='couple'?{la:amount*splitValue.la/100,partner:amount*splitValue.partner/100}:null,
      recurring:false,recurrence:{enabled:false,endDate:null,nextDate:null,frequency:null,autoConfirm:false,needsReview:false},
      counterparty:'',externalAmount:0,externalParticipants:[]
    };
    const btn=$('#saveManualTx');btn.disabled=true;btn.textContent='Enregistrement…';
    try{
      state.transactions.push(item);
      await saveDocument('transactions',item);
      closeSheet();renderAll();navigate('activity');showTab('transactions');
    }catch(err){
      console.error(err);state.transactions=state.transactions.filter(t=>t.id!==item.id);btn.disabled=false;btn.textContent='Réessayer';
    }
  };
}
function openInvestmentAccountAdd(){
  openSheet('Ajouter un compte',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('chart')+'</span><div><b>Nouveau compte de patrimoine</b><small>Ajoute le compte maintenant ; les opérations et la valorisation viendront ensuite.</small></div></div>'+
    '<label class="label2">Nom du compte</label><input class="input" id="investmentAccountName" type="text" maxlength="60" placeholder="Ex. PEA Boursorama, CELI">'+
    '<div class="formrow"><div><label class="label2">Type</label><select class="input" id="investmentAccountType"><option value="PEA">PEA</option><option value="CELI">CELI</option><option value="REER">REER</option><option value="Épargne">Épargne</option><option value="Courtage">Courtage</option><option value="Autre">Autre</option></select></div>'+
    '<div><label class="label2">Devise</label><select class="input" id="investmentAccountCurrency"><option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div></div>'+
    '<button class="primary full" id="saveInvestmentAccount" type="button" style="margin-top:18px">Ajouter le compte</button>'+
    '<button class="secondary full" id="cancelInvestmentAccount" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelInvestmentAccount').onclick=closeSheet;
  $('#saveInvestmentAccount').onclick=async()=>{
    const name=$('#investmentAccountName').value.trim(),type=$('#investmentAccountType').value,currency=$('#investmentAccountCurrency').value;
    if(!name)return;
    const item={id:investmentDocId(),owner:me,name,type,currency,fxCadPerUnit:currency==='CAD'?1:null,fxAutoUpdate:currency!=='CAD',fxRateDate:null,currentValueCad:0,valueCad:0};
    const btn=$('#saveInvestmentAccount');btn.disabled=true;btn.textContent='Enregistrement…';
    try{
      state.investmentAccounts.push(item);await saveDocument('investment_accounts',item);closeSheet();renderWealth();
    }catch(err){console.error(err);state.investmentAccounts=state.investmentAccounts.filter(a=>a.id!==item.id);btn.disabled=false;btn.textContent='Réessayer';}
  };
}

/* Trace 5.6 core: persistence, category and transaction lifecycle */
function traceNotice(e){console.error(e);const x=$('#traceFeedback');if(x)x.textContent='Erreur de synchronisation. Réessaie sans fermer Trace.';}
function traceFeedback(){return '<div class="trace-feedback" id="traceFeedback" role="status"></div>';}
async function removeDocument(collection,id){const {data,error}=await client.from('documents').delete().eq('household_id',household.id).eq('collection',collection).eq('item_id',String(id)).select('item_id');if(error)throw error;if(!data||data.length!==1)throw new Error('Suppression non confirmée');}
function categoryKind(c){return c.budgetKind||(c.type==='income'?'income':['rent','subscriptions','phone','taxes'].includes(c.id)?'fixed':'variable');}
function manageCategories(){
 const active=state.categories.filter(c=>!c.archived).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name,'fr'));
 openSheet('Catégories du budget','<div class="empty-note">Personnalise tes catégories. L’historique est conservé quand une catégorie utilisée est archivée.</div>'+
 '<button class="primary full" id="newCategory" style="margin:14px 0">+ Nouvelle catégorie</button>'+
 active.map(c=>'<button type="button" class="trace-list-btn" data-edit-category="'+esc(c.id)+'"><span>'+esc(c.name)+'</span><small>'+esc(c.type==='income'?'Revenu':categoryKind(c)==='fixed'?'Fixe':'Variable')+' ›</small></button>').join('')+traceFeedback());
 $('#newCategory').onclick=()=>editCategory();
 $$('[data-edit-category]').forEach(x=>x.onclick=()=>editCategory(state.categories.find(c=>c.id===x.dataset.editCategory)));
}
function editCategory(current){
 const original=current||{id:'cat_'+txDocId(),type:'expense',name:'',icon:'◇',group:'variable',custom:true,archived:false};
 const used=state.transactions.some(t=>t.categoryId===original.id)||state.budgets.some(b=>b.categoryId===original.id);
 openSheet(current?'Modifier la catégorie':'Nouvelle catégorie',
 '<label class="label2">Nom</label><input class="input" id="catName" maxlength="60" value="'+esc(original.name)+'" placeholder="Ex. Vacances, animaux">'+
 '<div class="formrow"><div><label class="label2">Type</label><select id="catType" class="input"><option value="expense">Dépense</option><option value="income">Revenu</option></select></div><div><label class="label2">Budget</label><select id="catKind" class="input"><option value="variable">Variable</option><option value="fixed">Fixe</option></select></div></div>'+
 '<button class="primary full" id="catSave" style="margin-top:18px">Enregistrer</button>'+
 (current?'<button class="secondary full trace-danger" id="catRemove" style="margin-top:8px">'+(used?'Archiver':'Supprimer')+'</button>':'')+
 '<button class="secondary full" id="catBack" style="margin-top:8px">Retour</button>'+traceFeedback());
 $('#catType').value=original.type;$('#catKind').value=categoryKind(original)==='fixed'?'fixed':'variable';$('#catKind').disabled=original.type==='income';
 $('#catType').onchange=()=>$('#catKind').disabled=$('#catType').value==='income';
 $('#catBack').onclick=manageCategories;
 $('#catSave').onclick=async()=>{
  const name=$('#catName').value.trim(),type=$('#catType').value,kind=type==='income'?'income':$('#catKind').value;
  if(!name){$('#traceFeedback').textContent='Le nom est obligatoire.';return;}
  if(state.categories.some(c=>c.id!==original.id&&!c.archived&&c.type===type&&c.name.toLowerCase()===name.toLowerCase())){$('#traceFeedback').textContent='Catégorie déjà existante.';return;}
  if(used&&type!==original.type){$('#traceFeedback').textContent='Une catégorie utilisée ne peut pas changer de type.';return;}
  const next={...original,name,type,budgetKind:kind,group:kind,archived:false};
  $('#catSave').disabled=true;
  try{await saveDocument('categories',next);if(current)Object.assign(current,next);else state.categories.push(next);renderAll();manageCategories();}
  catch(e){$('#catSave').disabled=false;traceNotice(e);}
 };
 if(current)$('#catRemove').onclick=()=>{
  openSheet(used?'Archiver':'Supprimer','<div class="empty-note">'+(used?'La catégorie ne sera plus proposée, mais les opérations existantes seront conservées.':'Cette catégorie n’est pas utilisée.')+'</div><button class="primary full" id="catConfirm" style="margin-top:16px">Confirmer</button><button class="secondary full" id="catCancel">Annuler</button>'+traceFeedback());
  $('#catCancel').onclick=()=>editCategory(current);
  $('#catConfirm').onclick=async()=>{
   $('#catConfirm').disabled=true;
   try{if(used){const next={...current,archived:true};await saveDocument('categories',next);Object.assign(current,next);}else{await removeDocument('categories',original.id);state.categories=state.categories.filter(c=>c.id!==original.id);}renderAll();manageCategories();}
   catch(e){$('#catConfirm').disabled=false;traceNotice(e);}
  };
 };
}
function traceSplit(who,a){const d=state.household.defaultSplit||{la:50,partner:50},sp=who==='couple'?{la:Number(d.la??50),partner:Number(d.partner??50)}:who==='la'?{la:100,partner:0}:{la:0,partner:100};return{split:sp,splitMode:'percent',splitAmounts:who==='couple'?{la:a*sp.la/100,partner:a*sp.partner/100}:null};}
function editTransaction(id,validating=false){
 const t=state.transactions.find(x=>x.id===id);if(!t)return;
 if(t.type==='transfer'){openSettlement(t);return;}
 if(!['expense','income','refund'].includes(t.type)){openSheet('Opération','<div class="empty-note">Cette opération spéciale peut être supprimée mais pas transformée automatiquement.</div><button class="secondary full trace-danger" id="specialRemove">Supprimer</button>');$('#specialRemove').onclick=()=>deleteTransaction(t);return;}
 openSheet(validating?'Vérifier l’opération':'Modifier la transaction',
 '<label class="label2">Type</label><select id="txType" class="input"><option value="expense">Dépense</option><option value="income">Revenu</option><option value="refund">Remboursement</option></select>'+
 '<label class="label2">Description</label><input id="txName" class="input" maxlength="80" value="'+esc(t.name||t.merchant||'')+'">'+
 '<div class="formrow"><div><label class="label2">Montant CAD</label><input id="txAmount" type="number" inputmode="decimal" step="0.01" min="0.01" class="input" value="'+Number(t.amountCAD||0)+'"></div><div><label class="label2">Date</label><input id="txDate" type="date" class="input" value="'+esc(t.date||localDateISO())+'"></div></div>'+
 '<label class="label2">Catégorie</label><select id="txCategory" class="input"></select>'+
 '<div class="formrow"><div><label class="label2">Compte</label><select id="txAccount" class="input">'+[...visibleBankAccounts(me),...state.accounts.filter(a=>a.id===t.accountId&&!visibleBankAccounts(me).some(v=>v.id===a.id))].map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select></div>'+
 '<div><label class="label2">Pour qui ?</label><select id="txWho" class="input"><option value="'+esc(me)+'">Moi</option><option value="'+esc(partner)+'">'+esc(member(partner).name)+'</option><option value="couple">Nous deux</option></select></div></div>'+
 '<button class="primary full" id="txSave" style="margin-top:18px">Enregistrer</button>'+
 (validating?'<button class="secondary full" id="txValidate" style="margin-top:8px">Valider cette opération</button>':'')+
 '<button class="secondary full trace-danger" id="txRemove" style="margin-top:8px">Supprimer</button><button class="secondary full" id="txCancel" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#txType').value=t.type;$('#txAccount').value=t.accountId||'';$('#txWho').value=t.beneficiary||me;
 const cats=()=>{const typ=$('#txType').value,ls=manualCategories(typ);const old=state.categories.find(c=>c.id===t.categoryId);if(old&&!ls.includes(old))ls.push(old);$('#txCategory').innerHTML=ls.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');if(ls.some(c=>c.id===t.categoryId))$('#txCategory').value=t.categoryId;$('#txWho').disabled=typ==='income';};
 $('#txType').onchange=cats;cats();
 $('#txCancel').onclick=closeSheet;$('#txRemove').onclick=()=>deleteTransaction(t);
 async function save(confirm){
  const amount=Number($('#txAmount').value),type=$('#txType').value,date=$('#txDate').value,name=$('#txName').value.trim(),categoryId=$('#txCategory').value,accountId=$('#txAccount').value,beneficiary=type==='income'?t.payerId||me:$('#txWho').value;
  if(!(amount>0)||!Number.isFinite(amount)||!date||!name||!categoryId||!accountId){$('#traceFeedback').textContent='Complète tous les champs obligatoires.';return;}
  const next={...t,amountCAD:amount,amountOriginal:amount,date,name,type,categoryId,accountId,beneficiary,...traceSplit(beneficiary,amount),status:confirm?'confirmed':t.status};
  if(next.importFingerprint&&(amount!==t.amountCAD||date!==t.date||name!==t.name))next.importFingerprint=null;
  const btn=$(confirm?'#txValidate':'#txSave');btn.disabled=true;
  try{await saveDocument('transactions',next);Object.assign(t,next);closeSheet();renderAll();navigate('activity');showTab(confirm?'transactions':validating?'review':'transactions');}
  catch(e){btn.disabled=false;traceNotice(e);}
 }
 $('#txSave').onclick=()=>save(false);
 if(validating)$('#txValidate').onclick=()=>save(true);
}
function deleteTransaction(t){
 openSheet('Supprimer l’opération','<div class="empty-note">Supprimer « '+esc(t.name||'Opération')+' » ('+money(t.amountCAD)+') ? Cette action est définitive.</div><button class="primary full" id="txDeleteNow" style="margin-top:16px">Confirmer</button><button class="secondary full" id="txDeleteBack">Annuler</button>'+traceFeedback());
 $('#txDeleteBack').onclick=()=>editTransaction(t.id,t.status!=='confirmed');
 $('#txDeleteNow').onclick=async()=>{
  $('#txDeleteNow').disabled=true;
  try{await removeDocument('transactions',t.id);state.transactions=state.transactions.filter(x=>x.id!==t.id);closeSheet();renderAll();}
  catch(e){$('#txDeleteNow').disabled=false;traceNotice(e);}
 };
}

function budgetCategoriesFor(kind){
  const active=state.categories.filter(c=>!c.archived);
  if(kind==='income')return active.filter(c=>c.type==='income');
  const expenses=active.filter(c=>c.type==='expense');
  if(kind==='fixed')return expenses.filter(c=>categoryKind(c)==='fixed');
  return expenses.filter(c=>categoryKind(c)!=='fixed');
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
    '<button class="secondary full trace-danger" id="deleteBudgetEdit" type="button" style="margin-top:8px">Supprimer ce poste du mois</button>'+
    '<button class="secondary full" id="cancelBudgetEdit" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelBudgetEdit').onclick=closeSheet;
  $('#deleteBudgetEdit').onclick=()=>{
    openSheet('Supprimer ce poste de budget','<div class="empty-note">Supprimer '+esc(cat(item.categoryId).name)+' du budget de '+esc(monthLabel(item.month))+' ? Les transactions réelles ne seront pas supprimées.</div><button class="primary full" id="confirmBudgetDelete" style="margin-top:14px">Confirmer</button><button class="secondary full" id="cancelBudgetDelete">Annuler</button>'+traceFeedback());
    $('#cancelBudgetDelete').onclick=()=>openBudgetEdit(item.id);
    $('#confirmBudgetDelete').onclick=async()=>{
      $('#confirmBudgetDelete').disabled=true;
      try{await removeDocument('budgets',item.id);state.budgets=state.budgets.filter(b=>b.id!==item.id);closeSheet();renderAll();}
      catch(e){$('#confirmBudgetDelete').disabled=false;traceNotice(e);}
    };
  };

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
function txRow(t){const c=cat(t.categoryId),pos=['income','refund','external_refund'].includes(t.type),transfer=t.type==='transfer',outside=!isFinancialPeriod(t);return `<button type="button" class="tx trace-tx-link ${outside?'trace-outside-start':''}" data-tx-open="${esc(t.id)}"><span class="tx-icon">${esc(c.icon||'◇')}</span><span class="tx-main"><b>${esc(t.name||t.merchant||'Transaction')}</b><small>${transfer?'Règlement':esc(c.name)} · ${esc(t.date||'')}${outside?' · Hors solde de départ':''}</small></span><span class="tx-amt ${pos?'positive':''}">${transfer?'':pos?'+':'−'}${money(t.amountCAD)}</span></button>`;}

/* CSV import: cautious preview; pending until explicit validation */
function normalizedCsvKey(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function parseCsv(raw,sep){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<raw.length;i++){const ch=raw[i];
  if(ch==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===sep&&!quoted){row.push(cell.trim());cell='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&raw[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
  else cell+=ch;
 }
 if(quoted)throw new Error('Fichier CSV : guillemets non refermés.');
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
function inferCsvSep(line){const matches=[',',';','\t'].map(sep=>({sep,n:parseCsv(line,sep)[0]?.length||0}));return matches.sort((a,b)=>b.n-a.n)[0].sep;}
function parseCsvMoney(raw){
 let s=String(raw??'').trim().replace(/\b(?:CAD|USD|EUR)\b/gi,'').replace(/[\u00a0\u202f\s$€£]/g,'');
 if(!s)return NaN;
 const negative=/^\(.*\)$/.test(s)||s.includes('-');s=s.replace(/[()\-+]/g,'');
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(s.includes(','))s=/,\d{1,2}$/.test(s)?s.replace(',','.'):s.replace(/,/g,'');
 else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
 const n=Number(s);
 return Number.isFinite(n)?(negative?-n:n):NaN;
}
function parseCsvDate(raw,format){
 const s=String(raw||'').trim().split(/[ T]/)[0];
 let y,m,d,match;
 if((match=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))){y=+match[1];m=+match[2];d=+match[3];}
 else if((match=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))){y=+match[3];m=+(format==='mdy'?match[1]:match[2]);d=+(format==='mdy'?match[2]:match[1]);}
 else return null;
 const date=new Date(y,m-1,d);
 return date.getFullYear()===y&&date.getMonth()+1===m&&date.getDate()===d?String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):null;
}
function csvFingerprint(t){const norm=String(t.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();return[t.date,t.type,Number(t.amountCAD).toFixed(2),norm,t.accountId].join('|');}
function csvImportedDuplicate(t,rows){const key=csvFingerprint(t);return rows.some(x=>(x.importFingerprint||csvFingerprint(x))===key);}
function importFile(file){
 if(!file)return;
 const box=$('#importResult');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(ext!=='csv'&&!['text/csv','application/vnd.ms-excel'].includes(file.type)){box.innerHTML='<article class="card"><b>Import non disponible pour ce format</b><div class="empty-note">La lecture fiable des captures et PDF bancaires n’est pas encore activée. Exporte un fichier CSV depuis ta banque.</div></article>';return;}
 if(file.size>2e6){box.textContent='Fichier trop volumineux (limite 2 Mo).';return;}
 box.textContent='Lecture du CSV…';
 const reader=new FileReader();
 reader.onerror=()=>box.textContent='Impossible de lire le fichier.';
 reader.onload=()=>{
  try{
   const raw=String(reader.result||'').replace(/^\uFEFF/,'');
   const headerLine=raw.split(/\r?\n/,1)[0]||'';
   const rows=parseCsv(raw,inferCsvSep(headerLine));
   if(rows.length<2)throw new Error('Le CSV est vide.');
   if(rows.length>1001)throw new Error('Limite de 1 000 opérations par fichier.');
   const headers=rows.shift().map((v,i)=>({label:v||'Colonne '+(i+1),i,key:normalizedCsvKey(v)}));
   const guess=keys=>headers.find(h=>keys.includes(h.key))?.i??-1;
   const suggested={
    date:guess(['date','dateoperation','transactiondate','postingdate','datedetransaction','datecomptable']),
    name:guess(['description','libelle','libelleoperation','transaction','memo','merchant','nom','details','detail','narration']),
    amount:guess(['amount','montant','montantcad','total','somme','transactionamount']),
    debit:guess(['debit','debiter','withdrawal','retrait','sortie']),
    credit:guess(['credit','crediter','deposit','depot','entree'])
   };
   const options=selected=>'<option value="-1">— Non utilisée —</option>'+headers.map(h=>'<option value="'+h.i+'"'+(selected===h.i?' selected':'')+'>'+esc(h.label)+'</option>').join('');
   const accts=visibleBankAccounts(me);
   box.innerHTML='<article class="card"><b>'+esc(file.name)+'</b><div class="empty-note">Associe les colonnes, puis importe dans « À valider ». Aucune ligne n’est comptabilisée avant validation.</div>'+
    '<div class="trace-csv-fields">'+[['date','Date'],['name','Description'],['amount','Montant signé'],['debit','Débit'],['credit','Crédit']].map(([k,l])=>'<label class="label2">'+l+'<select class="input" id="csvCol_'+k+'">'+options(suggested[k])+'</select></label>').join('')+'</div>'+
    '<div class="formrow"><div><label class="label2">Format de date</label><select class="input" id="csvDateFormat"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select></div><div><label class="label2">Montant positif</label><select class="input" id="csvSign"><option value="income">Revenu</option><option value="expense">Dépense</option></select></div></div>'+
    '<label class="label2">Compte concerné</label><select class="input" id="csvAccount">'+accts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select>'+
    '<div class="empty-note" style="margin:12px 0">'+rows.length+' lignes détectées. Vérifie la correspondance avec les colonnes de ta banque avant d’importer.</div>'+
    '<button class="primary full" id="csvPreview">Prévisualiser</button><div id="csvPreviewResult"></div></article>';
   const preferred=preferredBankAccount('expense');if(preferred&&$('#csvAccount'))$('#csvAccount').value=preferred.id;
   const col=k=>Number($('#csvCol_'+k).value);
   const build=()=>{
    if(col('date')<0||col('name')<0||(col('amount')<0&&(col('debit')<0||col('credit')<0)))throw new Error('Associe les colonnes Date, Description et Montant (ou Débit + Crédit).');
    const all=[],invalid=[];
    rows.forEach((row,index)=>{
     const date=parseCsvDate(row[col('date')],$('#csvDateFormat').value),name=String(row[col('name')]||'').trim();
     let n=col('amount')>=0?parseCsvMoney(row[col('amount')]):NaN;
     let type;
     if(col('amount')>=0){type=n>=0?$('#csvSign').value:($('#csvSign').value==='income'?'expense':'income');}
     else{const debit=col('debit')>=0?parseCsvMoney(row[col('debit')]):NaN,credit=col('credit')>=0?parseCsvMoney(row[col('credit')]):NaN;const cr=Number.isFinite(credit)?Math.abs(credit):0,db=Number.isFinite(debit)?Math.abs(debit):0;n=cr>0?cr:db;type=cr>0?'income':'expense';}
     if(!date||!name||!(Math.abs(n)>0)||!Number.isFinite(n)){invalid.push(index+2);return;}
     const amount=Math.abs(n),accountId=$('#csvAccount').value;
     const t={id:txDocId(),date,name,note:'',merchant:'',type,status:'pending',currency:'CAD',rate:1,amountCAD:amount,amountOriginal:amount,categoryId:'',accountId,payerId:me,beneficiary:me,...traceSplit(me,amount),recurring:false,source:'csv',importFileName:file.name};
     t.importFingerprint=csvFingerprint(t);
     if(!csvImportedDuplicate(t,state.transactions)&&!csvImportedDuplicate(t,all))all.push(t);
    });
    return{all,invalid,duplicates:rows.length-invalid.length-all.length};
   };
   $('#csvPreview').onclick=()=>{
    try{
     const result=build(),preview=$('#csvPreviewResult');
     preview.innerHTML='<div class="empty-note" style="margin-top:14px"><b>'+result.all.length+' nouvelles opérations</b> · '+result.duplicates+' doublon(s) ignoré(s) · '+result.invalid.length+' ligne(s) invalide(s).</div>'+
      result.all.slice(0,5).map(t=>'<div class="trace-list-btn"><span>'+esc(t.date)+' · '+esc(t.name)+'</span><b>'+money(t.amountCAD)+'</b></div>').join('')+
      (result.all.length?'<button class="primary full" id="csvCommit" style="margin-top:14px">Importer '+result.all.length+' opération(s) à valider</button>':'');
     if(!result.all.length)return;
     $('#csvCommit').onclick=async()=>{
      const btn=$('#csvCommit');btn.disabled=true;let saved=0;
      try{
       for(const t of result.all){if(csvImportedDuplicate(t,state.transactions))continue;await saveDocument('transactions',t);state.transactions.push(t);saved++;}
       renderAll();navigate('activity');showTab('review');
       $('#importResult').textContent=saved+' opération(s) placée(s) dans À valider.';
      }catch(e){console.error(e);renderAll();$('#importResult').textContent=saved+' ligne(s) importée(s). Import interrompu : vérifie la connexion puis recommence (les doublons sont reconnus).';}
     };
    }catch(e){$('#csvPreviewResult').textContent=e.message;}
   };
  }catch(e){box.textContent=e.message;}
 };
 reader.readAsText(file,'UTF-8');
}
/* Merchant suggestions never silently validate a budget transaction. */
function suggestImportCategory(t){
 const active=state.categories.filter(c=>c.type===(t.type==='income'?'income':'expense')&&!c.archived);
 const acceptable=id=>active.some(c=>c.id===id);
 if(acceptable(t.categoryId))return{categoryId:t.categoryId,reason:'Catégorie déjà choisie'};
 const norm=normalizedMerchant(t.name);
 if(norm){
  const learned=state.transactions.filter(x=>x.id!==t.id&&x.status==='confirmed'&&x.type===t.type&&acceptable(x.categoryId)&&normalizedMerchant(x.name)===norm)
   .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
  if(learned)return{categoryId:learned.categoryId,reason:'Déjà classé auparavant'};
 }
 // High-specificity merchants/words only. Ambiguous merchants remain unclassified.
 const rules=t.type==='income'?[{re:/\b(salaire|payroll|paie)\b/,id:'salary'}]:
 [
  {re:/\b(gourmet frutti|fruiterie|epicerie|supermarche|provigo|metro|iga|costco|maxi)\b/,id:'groceries'},
  {re:/\b(pizzeria|pizza|sorino|restaurant|rotisserie|sushi)\b/,id:'restaurants'},
  {re:/\b(boutique courir|running room|decathlon|sport experts)\b/,id:'sport'}
 ];
 const match=rules.find(rule=>acceptable(rule.id)&&rule.re.test(norm));
 return match?{categoryId:match.id,reason:'Suggestion · commerçant'}:{categoryId:'',reason:'Catégorie à choisir'};
}
function openImportBatchReview(ids){
 const uniq=[...new Set((ids||[]).map(String))];
 const pending=uniq.map(id=>state.transactions.find(t=>t.id===id&&t.status!=='confirmed')).filter(Boolean);
 if(!pending.length){openSheet('Validation du lot','<div class="empty-note">Aucune opération en attente dans ce lot.</div>');return;}
 const available=t=>manualCategories(t.type);
 const total=pending.reduce((sum,t)=>sum+Number(t.amountCAD||0),0);
 const suggested=pending.map(t=>suggestImportCategory(t));
 const ready=suggested.filter(x=>x.categoryId).length;
 openSheet('Valider le lot',
 '<div class="trace-batch-summary"><b>'+pending.length+' opérations · '+money(total)+'</b><small>'+ready+' catégorie(s) proposées automatiquement. Vérifie les exceptions, puis confirme le lot en une fois.</small></div>'+
 '<label class="label2">Répartition appliquée par défaut au lot</label>'+
 '<select id="batchWhoAll" class="input"><option value="'+esc(me)+'">Mes dépenses</option><option value="couple">Dépenses communes</option></select>'+
 '<div class="trace-batch-list">'+pending.map((t,i)=>{
  const cats=available(t),guess=suggested[i];
  return '<div class="trace-batch-item" data-batch="'+i+'">'+
    '<div class="trace-batch-line"><div><b>'+esc(t.name)+'</b><small>'+esc(t.date)+' · '+esc(guess.reason)+'</small></div><strong>'+money(t.amountCAD)+'</strong></div>'+
    '<div class="trace-batch-fields"><label>Catégorie<select class="input batchCategory">'+
      '<option value="">Choisir la catégorie…</option>'+
      cats.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===guess.categoryId?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>'+
    '<label>Pour qui ?<select class="input batchWho"><option value="'+esc(me)+'">Moi</option><option value="couple">Nous deux</option><option value="'+esc(partner)+'">'+esc(member(partner).name)+'</option></select></label></div></div>';
 }).join('')+'</div>'+
 '<button id="batchSave" class="primary full" style="margin-top:14px">Confirmer les '+pending.length+' opérations</button>'+
 '<button id="batchLater" class="secondary full" style="margin-top:8px">Laisser en attente</button>'+
 '<div class="trace-feedback" id="batchFeedback" role="status"></div>');
 const groups=$$('#sheetBody [data-batch]');
 $('#batchWhoAll').onchange=()=>{
  const value=$('#batchWhoAll').value;
  groups.forEach(el=>{el.querySelector('.batchWho').value=value;});
 };
 $('#batchLater').onclick=()=>{closeSheet();renderAll();navigate('activity');showTab('review');};
 $('#batchSave').onclick=async()=>{
  const selected=groups.map((el,i)=>({t:pending[i],categoryId:el.querySelector('.batchCategory').value,
   beneficiary:el.querySelector('.batchWho').value}));
  const missing=selected.find(x=>!available(x.t).some(c=>c.id===x.categoryId));
  if(missing){
   const i=selected.indexOf(missing),control=groups[i]?.querySelector('.batchCategory');
   $('#batchFeedback').textContent='Choisis la catégorie des opérations sans suggestion avant la validation groupée.';
   control?.focus();control?.scrollIntoView({block:'center',behavior:'smooth'});return;
  }
  if(selected.some(x=>!(Number(x.t.amountCAD)>0)||!x.t.date||!state.accounts.some(a=>a.id===x.t.accountId))){
   $('#batchFeedback').textContent='Une opération n’a pas de montant, date ou compte bancaire valide.';return;
  }
  const button=$('#batchSave');button.disabled=true;let completed=0;
  try{
   for(const x of selected){
    if(x.t.status==='confirmed')continue;
    const beneficiary=x.t.type==='income'?x.t.payerId||me:x.beneficiary;
    const next={...x.t,categoryId:x.categoryId,beneficiary,...traceSplit(beneficiary,Number(x.t.amountCAD)),status:'confirmed'};
    await saveDocument('transactions',next);Object.assign(x.t,next);completed++;
   }
   closeSheet();renderAll();navigate('activity');showTab('transactions');
  }catch(e){
   renderAll();button.disabled=false;
   $('#batchFeedback').textContent=completed+' opération(s) validée(s). Enregistrement interrompu ; les autres sont conservées en attente. Réessaie sans risque de double comptage.';
   console.error('Trace batch validation:',e);
  }
 };
}

async function validatePendingAll(){
 const pending=state.transactions.filter(t=>t.status!=='confirmed');
 const ready=pending.filter(t=>t.date&&Number(t.amountCAD)>0&&state.categories.some(c=>c.id===t.categoryId)&&state.accounts.some(a=>a.id===t.accountId)&&['la','partner','couple'].includes(t.beneficiary));
 if(!ready.length){openSheet('Validation','<div class="empty-note">Aucune opération complète. Ouvre une opération dans « À valider » pour choisir sa catégorie.</div>');return;}
 openSheet('Valider les opérations','<div class="empty-note">'+ready.length+' opération(s) sur '+pending.length+' ont toutes les informations nécessaires. Les autres resteront à vérifier.</div><button class="primary full" id="validateAllConfirm" style="margin-top:14px">Valider '+ready.length+' opération(s)</button>'+traceFeedback());
 $('#validateAllConfirm').onclick=async()=>{
  $('#validateAllConfirm').disabled=true;let done=0;
  try{for(const t of ready){const next={...t,status:'confirmed'};await saveDocument('transactions',next);Object.assign(t,next);done++;}closeSheet();renderAll();navigate('activity');showTab('transactions');}
  catch(e){renderAll();traceNotice(e);$('#traceFeedback').textContent=done+' validée(s) ; une erreur a interrompu la validation. Tu peux réessayer.';}
 };
}


function setActivityMonth(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)))return;
 activityMonth=month;renderActivity();
}
function latestImportDay(accountId){
 return state.importDays.filter(x=>x.accountId===accountId&&x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
}
function importDayKey(accountId,date){return 'day_'+String(accountId).replace(/[^a-zA-Z0-9_-]/g,'_')+'_'+date;}
function importDayInfo(accountId,date){
 const x=state.importDays.find(x=>x.accountId===accountId&&x.date===date);
 const tx=state.transactions.filter(t=>t.accountId===accountId&&t.date===date);
 return{entry:x||null,pending:tx.filter(t=>t.status!=='confirmed').length,confirmed:tx.filter(t=>t.status==='confirmed').length,transactions:tx.length};
}
async function recordDayImport(accountId,date,kind='image'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!visibleBankAccounts(me).some(a=>a.id===accountId))throw Error('Date ou compte invalide.');
 if(kind!=='image')return null; // Le relevé PDF et le CSV servent au contrôle, pas à certifier une journée
 const id=importDayKey(accountId,date),old=state.importDays.find(x=>x.id===id);
 const updated={...(old||{}),id,accountId,date,owner:me,status:'received',lastImportedAt:new Date().toISOString(),captureCount:(Number(old?.captureCount)||0)+1,sourceKind:kind};
 await saveDocument('import_days',updated);
 if(old)Object.assign(old,updated);else state.importDays.push(updated);
 window.TraceImportCalendar?.render?.();
 return updated;
}
async function markDayChecked(accountId,date,empty=false){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw Error('Ce compte n’est pas accessible.');
 const old=state.importDays.find(x=>x.accountId===accountId&&x.date===date);
 const dayTx=state.transactions.filter(t=>t.accountId===accountId&&t.date===date&&t.status!=='confirmed');
 if(!empty&&dayTx.length)throw Error('Il reste '+dayTx.length+' opération(s) à valider pour cette journée.');
 if(empty&&state.transactions.some(t=>t.accountId===accountId&&t.date===date))throw Error('Des transactions existent ce jour : vérifie-les plutôt que de déclarer la journée vide.');
 const next={...(old||{}),id:importDayKey(accountId,date),accountId,date,owner:me,status:empty?'empty':'checked',checkedAt:new Date().toISOString(),captureCount:Number(old?.captureCount)||0,sourceKind:old?.sourceKind||'manual'};
 await saveDocument('import_days',next);
 if(old)Object.assign(old,next);else state.importDays.push(next);
 window.TraceImportCalendar?.render?.();
 return next;
}
function dailyGaps(accountId,month){
 const entries=state.importDays.filter(x=>x.accountId===accountId&&x.date?.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
 if(entries.length<2)return[];
 const set=new Set(entries.map(x=>x.date)),gaps=[];
 let at=new Date(entries[0].date+'T12:00:00'),end=new Date(entries[entries.length-1].date+'T12:00:00');
 for(at.setDate(at.getDate()+1);at<end;at.setDate(at.getDate()+1)){
  const date=at.getFullYear()+'-'+String(at.getMonth()+1).padStart(2,'0')+'-'+String(at.getDate()).padStart(2,'0');
  if(!set.has(date))gaps.push(date);
 }
 return gaps;
}

function renderActivity(){
 const ts=state.transactions.filter(t=>String(t.date||'').startsWith(activityMonth)&&t.status==='confirmed').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const counted=ts.filter(isFinancialPeriod);
 const expenses=counted.filter(t=>['expense','group_expense','person_payment'].includes(t.type)).reduce((v,t)=>v+Number(t.amountCAD||0),0),refunds=counted.filter(t=>t.type==='refund').reduce((v,t)=>v+Number(t.amountCAD||0),0),inc=counted.filter(t=>t.type==='income').reduce((v,t)=>v+Number(t.amountCAD||0),0),exp=Math.max(0,expenses-refunds);
 $('#activityMonthLabel').textContent=monthLabel(activityMonth);$('#activityExpenses').textContent=money(exp);$('#activityIncome').textContent=money(inc);$('#activityNet').textContent=money(inc-exp);
 $('#transactionList').innerHTML=ts.length?ts.map(txRow).join(''):'<div class="empty-note">Aucune opération confirmée ce mois-ci.</div>';
 $$('[data-tx-open]').forEach(btn=>btn.onclick=()=>editTransaction(btn.dataset.txOpen));
 const pending=state.transactions.filter(t=>t.status!=='confirmed');
 $('#reviewTabCount').textContent=pending.length?'('+pending.length+')':'';
 $('#reviewHeading').textContent=pending.length+' opération(s) à valider';
 const importedPending=pending.filter(t=>['image','ocr','pdf','csv'].includes(t.source));
 $('#reviewBulkImports')?.classList.toggle('hidden',!importedPending.length);
 $('#reviewList').innerHTML=pending.length?pending.map(t=>
 '<button class="trace-review-row" type="button" data-review-open="'+esc(t.id)+'"><span><b>'+esc(t.name||'À classer')+'</b><small>'+esc(t.date||'')+' · '+esc(t.categoryId?cat(t.categoryId).name:'Catégorie à choisir')+'</small></span><strong>'+money(t.amountCAD)+'</strong></button>'
 ).join(''):'<div class="empty-note">Tout est à jour.</div>';
 $$('[data-review-open]').forEach(btn=>btn.onclick=()=>editTransaction(btn.dataset.reviewOpen,true));
 const picker=$('#activityMonthPicker');if(picker)picker.value=activityMonth;
 const label=$('#activityMonthDisplay');if(label)label.textContent=monthLabel(activityMonth);
 const current=$('#activityCurrentMonth');if(current)current.classList.toggle('hidden',activityMonth===CM);
 window.TraceImportCalendar?.render?.();
 showTab(tab);
}
function showTab(t){tab=t;$$('#activityTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$('#activityTransactions').classList.toggle('hidden',t!=='transactions');$('#activityReview').classList.toggle('hidden',t!=='review');$('#activityImport').classList.toggle('hidden',t!=='import');}

/* Portfolio ledger: contributions vs investment performance, native currency first */
function portfolioLedger(account,override=null,removeId=null,cutoff=null){
 const ops=state.investmentOperations.filter(o=>o.accountId===account.id&&o.id!==removeId&&(!override||o.id!==override.id));
 if(override)ops.push(override);
 ops.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||a.id).localeCompare(String(b.createdAt||b.id)));
 const pos=new Map();let cash=0,contributions=0,dividends=0,fees=0,realized=0;
 for(const o of ops){
  if(cutoff&&String(o.date)>cutoff)continue;
  const amount=Number(o.amount||0),fee=Number(o.fee||0),q=Number(o.quantity||0),price=Number(o.unitPrice||0);
  const symbol=String(o.symbol||'').trim().toUpperCase();
  if(['buy','sell','quote'].includes(o.type)&&(!symbol||symbol.length>16))throw new Error('Indique un symbole pour chaque position.');
  if(!['deposit','withdrawal','buy','sell','dividend','fee','quote'].includes(o.type))throw new Error('Type de mouvement invalide.');
  if(o.type==='deposit'){cash+=amount;contributions+=amount;}
  if(o.type==='withdrawal'){cash-=amount;contributions-=amount;}
  if(o.type==='dividend'){cash+=amount;dividends+=amount;}
  if(o.type==='fee'){cash-=amount;fees+=amount;}
  if(['buy','sell','quote'].includes(o.type)){
   const p=pos.get(symbol)||{symbol,quantity:0,cost:0,price:0};
   if(o.type==='quote'){if(!(price>=0))throw new Error('Cours invalide.');p.price=price;}
   if(o.type==='buy'){
    if(!(q>0&&price>0))throw new Error('Quantité et cours obligatoires.');
    const paid=q*price+fee;cash-=paid;p.quantity+=q;p.cost+=paid;p.price=price;fees+=fee;
   }
   if(o.type==='sell'){
    if(!(q>0&&price>0)||q>p.quantity+.0000001)throw new Error('Vente supérieure à la quantité détenue.');
    const avg=p.quantity>0?p.cost/p.quantity:0,cost=q*avg,proceeds=q*price-fee;
    cash+=proceeds;p.quantity-=q;p.cost=Math.max(0,p.cost-cost);p.price=price;realized+=proceeds-cost;fees+=fee;
   }
   pos.set(symbol,p);
  }
  if(cash<-.001)throw new Error('Solde espèces insuffisant : enregistre un versement avant cet achat ou retrait.');
 }
 const positions=[...pos.values()].filter(p=>p.quantity>.0000001).map(p=>({...p,value:p.quantity*p.price,unrealized:p.quantity*p.price-p.cost}));
 const securities=positions.reduce((sum,p)=>sum+p.value,0),value=cash+securities;
 const fx=account.currency==='CAD'?1:Number(account.fxCadPerUnit||0);
 return{cash,contributions,dividends,fees,realized,positions,securities,value,performance:value-contributions,fx,hasFx:fx>0,cad:fx>0?value*fx:null};
}
const nativeMoney=(v,currency)=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:['CAD','USD','EUR'].includes(currency)?currency:'CAD',maximumFractionDigits:2}).format(Number(v||0));
function openInvestmentAccount(account){
 if(!account)return;
 let p;try{p=portfolioLedger(account);}catch(e){openSheet('Données de portefeuille incohérentes','<div class="empty-note">'+esc(e.message)+'</div>');return;}
 const currency=account.currency||'CAD';
 const ops=state.investmentOperations.filter(o=>o.accountId===account.id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 openSheet(account.name,
  '<div class="settings-hero"><span class="pico large">'+uiIcon('chart')+'</span><div><b>'+nativeMoney(p.value,currency)+'</b><small>Valorisation saisie · '+esc(currency)+(p.hasFx?' · '+money(p.cad)+' CAD':' · taux CAD à renseigner')+'</small></div></div>'+
  '<div class="trace-stat-grid"><div><small>Versements nets</small><b>'+nativeMoney(p.contributions,currency)+'</b></div><div><small>Performance estimée</small><b class="'+(p.performance>=0?'trace-positive':'')+'">'+nativeMoney(p.performance,currency)+'</b></div><div><small>Espèces</small><b>'+nativeMoney(p.cash,currency)+'</b></div><div><small>Titres</small><b>'+nativeMoney(p.securities,currency)+'</b></div></div>'+
  '<button class="primary full" id="invAddOperation">+ Ajouter une opération</button>'+
  '<button class="secondary full" id="invExchangeRate" style="margin-top:8px">Conversion CAD · '+(p.hasFx?p.fx.toFixed(4):'taux à récupérer')+' · '+(account.fxAutoUpdate===false?'manuel':'auto')+'</button>'+
  '<div class="section-head"><h2>Positions</h2></div>'+
  (p.positions.length?p.positions.map(x=>'<div class="trace-list-btn"><span><b>'+esc(x.symbol)+'</b><small>'+x.quantity+' titres · dernier cours '+nativeMoney(x.price,currency)+'</small></span><b>'+nativeMoney(x.value,currency)+'</b></div>').join(''):'<div class="empty-note">Aucun titre. Commence par enregistrer un versement, puis un achat.</div>')+
  '<div class="section-head"><h2>Mouvements</h2></div>'+
  (ops.length?ops.map(o=>'<button class="trace-list-btn" type="button" data-inv-op="'+esc(o.id)+'"><span><b>'+esc(({deposit:'Versement',withdrawal:'Retrait',buy:'Achat',sell:'Vente',dividend:'Dividende',fee:'Frais',quote:'Cours saisi'})[o.type]||o.type)+' '+esc(o.symbol||'')+'</b><small>'+esc(o.date)+' · Modifier ›</small></span><strong>'+nativeMoney(['buy','sell','quote'].includes(o.type)?Number(o.quantity||0)*Number(o.unitPrice||0)||Number(o.unitPrice||0):o.amount,currency)+'</strong></button>').join(''):'<div class="empty-note">Aucun mouvement.</div>')+traceFeedback());
 $('#invAddOperation').onclick=()=>openInvestmentOperation(account);
 $('#invExchangeRate').onclick=()=>editInvestmentRate(account);
 $$('[data-inv-op]').forEach(btn=>btn.onclick=()=>openInvestmentOperation(account,state.investmentOperations.find(x=>x.id===btn.dataset.invOp)));
}

/* Public FX rate: last banking-day reference, not real-time market execution */
const fxQuoteCache=new Map();
async function fetchPublicCadRate(currency){
 const cur=String(currency||'').toUpperCase();
 if(cur==='CAD')return{rate:1,date:localDateISO(),source:'CAD'};
 if(!['EUR','USD'].includes(cur))throw new Error('Devise non prise en charge.');
 if(fxQuoteCache.has(cur))return fxQuoteCache.get(cur);
 const response=await fetch('https://api.frankfurter.dev/v1/latest?base='+encodeURIComponent(cur)+'&symbols=CAD',{cache:'no-store'});
 if(!response.ok)throw new Error('Service de change momentanément indisponible');
 const data=await response.json(),rate=Number(data?.rates?.CAD),date=String(data?.date||'');
 if(!(rate>.2&&rate<10)||!/^20\d{2}-\d\d-\d\d$/.test(date))throw new Error('Réponse du service de change invalide');
 const quote={rate,date,source:'Frankfurter · taux de référence du dernier jour ouvré'};
 fxQuoteCache.set(cur,quote);
 return quote;
}
let fxSyncPromise=null;
async function refreshPublicPortfolioRates(force=false){
 if(fxSyncPromise&&!force)return fxSyncPromise;
 const task=async()=>{
  const eligible=state.investmentAccounts.filter(a=>['EUR','USD'].includes(a.currency)&&a.fxAutoUpdate!==false);
  const rates={};
  for(const c of [...new Set(eligible.map(a=>a.currency))]){
   try{rates[c]=await fetchPublicCadRate(c);}catch(e){console.info('Trace FX '+c+' : '+e.message);}
  }
  for(const a of eligible){
   const q=rates[a.currency];if(!q||(!force&&a.fxRateDate===q.date&&a.fxCadPerUnit>0))continue;
   const updated={...a,fxCadPerUnit:q.rate,fxRateDate:q.date,fxRateProvider:q.source,fxAutoUpdate:true};
   try{await saveDocument('investment_accounts',updated);Object.assign(a,updated);}catch(e){console.warn('Impossible de conserver le taux de change :',e);}
  }
  renderWealth();
 };
 const promise=task().finally(()=>{if(fxSyncPromise===promise)fxSyncPromise=null;});
 fxSyncPromise=promise;return promise;
}

function editInvestmentRate(account){
 const c=account.currency||'CAD',auto=account.fxAutoUpdate!==false;
 openSheet('Taux de change · '+c+' / CAD',
 '<div class="empty-note">1 '+esc(c)+' = '+(account.fxCadPerUnit?' '+Number(account.fxCadPerUnit).toFixed(5):'—')+' CAD. '+(account.fxRateDate?'Cours daté du '+esc(account.fxRateDate)+'. ':'')+'Les cours publics sont actualisés à chaque jour ouvré, pas en continu. Les opérations historiques conservent leur montant bancaire réel.</div>'+
 '<div class="setting-summary"><span>Mode actuel</span><b>'+(!auto?'Manuel':'Automatique')+'</b></div>'+
 (c!=='CAD'?'<button class="primary full" id="refreshFxPublic" style="margin-top:14px">Actualiser le cours public</button>':'')+
 '<div class="empty-note" style="margin-top:10px">Source : Frankfurter (banques centrales). En cas de panne, le dernier taux enregistré reste utilisé.</div>'+
 '<label class="label2">Taux CAD manuel</label><input class="input" id="manualFxValue" type="number" inputmode="decimal" min="0.000001" step="0.000001" value="'+(account.fxCadPerUnit||'')+'">'+
 '<button class="secondary full" id="saveManualFx" style="margin-top:12px">Utiliser ce taux manuel</button>'+
 '<button class="secondary full" id="cancelFx" style="margin-top:8px">Retour au portefeuille</button>'+traceFeedback());
 if(c==='CAD'){$('#manualFxValue').value='1';$('#manualFxValue').disabled=true;}
 $('#cancelFx').onclick=()=>openInvestmentAccount(account);
 if(c!=='CAD')$('#refreshFxPublic').onclick=async()=>{
  const btn=$('#refreshFxPublic');btn.disabled=true;btn.textContent='Actualisation…';
  try{
   const q=await fetchPublicCadRate(c);const next={...account,fxCadPerUnit:q.rate,fxRateDate:q.date,fxRateProvider:q.source,fxAutoUpdate:true};
   await saveDocument('investment_accounts',next);Object.assign(account,next);renderWealth();editInvestmentRate(account);
  }catch(e){btn.disabled=false;btn.textContent='Réessayer';$('#traceFeedback').textContent='Taux non récupéré : '+esc(e.message)+'. Le taux existant est conservé.';}
 };
 $('#saveManualFx').onclick=async()=>{
  const rate=c==='CAD'?1:Number($('#manualFxValue').value);
  if(!(rate>0)||!Number.isFinite(rate)){$('#traceFeedback').textContent='Taux positif obligatoire.';return;}
  $('#saveManualFx').disabled=true;
  const next={...account,fxCadPerUnit:rate,fxAutoUpdate:false,fxRateProvider:'Saisie manuelle',fxRateDate:localDateISO()};
  try{await saveDocument('investment_accounts',next);Object.assign(account,next);renderWealth();editInvestmentRate(account);}
  catch(e){$('#saveManualFx').disabled=false;traceNotice(e);}
 };
}

function openInvestmentOperation(account,original=null){
 const typ=original?.type||'deposit',currency=account.currency||'CAD';
 openSheet(original?'Modifier le mouvement':'Ajouter au patrimoine',
  '<div class="empty-note">'+esc(account.name)+' · '+esc(currency)+'. Les versements ne sont jamais comptés comme une performance.</div>'+
  '<label class="label2">Type</label><select class="input" id="invType"><option value="deposit">Versement</option><option value="withdrawal">Retrait</option><option value="buy">Achat</option><option value="sell">Vente</option><option value="dividend">Dividende</option><option value="fee">Frais</option><option value="quote">Mise à jour d’un cours</option></select>'+
  '<label class="label2">Date</label><input id="invDate" class="input" type="date" value="'+esc(original?.date||localDateISO())+'">'+
  '<div class="trace-op-symbol"><label class="label2">Titre / symbole</label><input class="input" id="invSymbol" maxlength="16" value="'+esc(original?.symbol||'')+'" placeholder="Ex. DSY, ETF500"></div>'+
  '<div class="formrow trace-op-trade"><div><label class="label2">Quantité</label><input class="input" id="invQty" type="number" inputmode="decimal" min="0.000001" step="any" value="'+Number(original?.quantity||0)+'"></div><div><label class="label2">Prix unitaire ('+esc(currency)+')</label><input class="input" id="invPrice" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.unitPrice||0)+'"></div></div>'+
  '<div class="trace-op-quote"><label class="label2">Dernier cours ('+esc(currency)+')</label><input class="input" id="invQuote" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.unitPrice||0)+'"></div>'+
  '<div class="trace-op-money"><label class="label2">Montant ('+esc(currency)+')</label><input class="input" id="invAmount" type="number" inputmode="decimal" min="0.01" step="any" value="'+Number(original?.amount||0)+'"></div>'+
  '<div class="trace-op-fee"><label class="label2">Frais inclus ('+esc(currency)+')</label><input class="input" id="invFee" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.fee||0)+'"></div>'+'<div class="trace-op-bank"><label class="label2">Compte bancaire lié (facultatif)</label><select class="input" id="invBank"><option value="">Aucun mouvement bancaire associé</option>'+visibleBankAccounts(account.owner).filter(a=>accountType(a)!=='card').map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select><div class="empty-note">Si tu lies un compte, le versement ou retrait y sera calculé automatiquement. Ne l’enregistre pas une seconde fois.</div></div>'+'<div class="trace-op-bank-cad"><label class="label2">Montant réellement débité / crédité en CAD</label><input id="invBankCad" class="input" type="number" min="0.01" step="any" inputmode="decimal" placeholder="Montant en $ CAD" value="'+Number(original?.bankAmountCAD||0||'')+'"><div class="empty-note">Pour une opération en '+esc(currency)+', saisis le montant CAD exact apparaissant sur le compte bancaire.</div></div>'+
  '<button class="primary full" id="saveInvOp" style="margin-top:16px">Enregistrer le mouvement</button>'+
  (original?'<button class="secondary full trace-danger" id="deleteInvOp" style="margin-top:8px">Supprimer ce mouvement</button>':'')+
  '<button class="secondary full" id="cancelInvOp" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#invType').value=typ;if(original?.bankAccountId)$('#invBank').value=original.bankAccountId;
 const refresh=()=>{
  const t=$('#invType').value,trade=['buy','sell'].includes(t);
  $$('.trace-op-trade').forEach(x=>x.classList.toggle('hidden',!trade));
  $$('.trace-op-symbol').forEach(x=>x.classList.toggle('hidden',!['buy','sell','quote'].includes(t)));
  $$('.trace-op-quote').forEach(x=>x.classList.toggle('hidden',t!=='quote'));
  $$('.trace-op-money').forEach(x=>x.classList.toggle('hidden',!['deposit','withdrawal','dividend','fee'].includes(t)));
  $$('.trace-op-fee').forEach(x=>x.classList.toggle('hidden',!trade));
  $$('.trace-op-bank').forEach(x=>x.classList.toggle('hidden',!['deposit','withdrawal'].includes(t)));
  $$('.trace-op-bank-cad').forEach(x=>x.classList.toggle('hidden',account.currency==='CAD'||!['deposit','withdrawal'].includes(t)||!$('#invBank').value));
 };
 $('#invType').onchange=refresh;$('#invBank').onchange=refresh;refresh();
 $('#cancelInvOp').onclick=()=>openInvestmentAccount(account);
 $('#saveInvOp').onclick=async()=>{
  const type=$('#invType').value,date=$('#invDate').value,amount=Number($('#invAmount').value),fee=Number($('#invFee').value),quantity=Number($('#invQty').value),
  unitPrice=Number(type==='quote'?$('#invQuote').value:$('#invPrice').value),symbol=$('#invSymbol').value.trim().toUpperCase();
  if(!date||(['deposit','withdrawal','dividend','fee'].includes(type)&&!(amount>0))||(['buy','sell'].includes(type)&&!(quantity>0&&unitPrice>0))||(type==='quote'&&!(unitPrice>=0))||(['buy','sell','quote'].includes(type)&&!/^[A-Z0-9._-]{1,16}$/.test(symbol))||!(fee>=0)){
   $('#traceFeedback').textContent='Vérifie la date, le montant, les titres et les frais.';return;
  }
  const bankAccountId=['deposit','withdrawal'].includes(type)?$('#invBank').value||null:null,bankAmountCAD=bankAccountId?(account.currency==='CAD'?amount:Number($('#invBankCad').value)):null;
  if(bankAccountId&&(!(bankAmountCAD>0)||!Number.isFinite(bankAmountCAD))){$('#traceFeedback').textContent='Saisis le montant exact en CAD pour ce mouvement bancaire.';return;}
  const next={id:original?.id||'op_'+txDocId(),accountId:account.id,type,date,
   symbol:['buy','sell','quote'].includes(type)?symbol:'',quantity:['buy','sell'].includes(type)?quantity:0,
   unitPrice:['buy','sell','quote'].includes(type)?unitPrice:0,amount:['deposit','withdrawal','dividend','fee'].includes(type)?amount:0,
   fee:['buy','sell'].includes(type)?fee:0,bankAccountId,bankAmountCAD,createdAt:original?.createdAt||new Date().toISOString()};
  try{portfolioLedger(account,next);}catch(e){$('#traceFeedback').textContent=e.message;return;}
  $('#saveInvOp').disabled=true;
  try{await saveDocument('investment_operations',next);if(original)Object.assign(original,next);else state.investmentOperations.push(next);renderWealth();openInvestmentAccount(account);}
  catch(e){$('#saveInvOp').disabled=false;traceNotice(e);}
 };
 if(original)$('#deleteInvOp').onclick=()=>{
  openSheet('Supprimer le mouvement','<div class="empty-note">Cette suppression recalculera les titres, versements et performances du compte.</div><button class="primary full" id="confirmInvDelete" style="margin-top:14px">Confirmer</button><button class="secondary full" id="cancelInvDelete">Annuler</button>'+traceFeedback());
  $('#cancelInvDelete').onclick=()=>openInvestmentOperation(account,original);
  $('#confirmInvDelete').onclick=async()=>{
   try{portfolioLedger(account,null,original.id);}catch(e){$('#traceFeedback').textContent='Impossible de supprimer : '+e.message;return;}
   $('#confirmInvDelete').disabled=true;
   try{await removeDocument('investment_operations',original.id);state.investmentOperations=state.investmentOperations.filter(x=>x.id!==original.id);renderWealth();openInvestmentAccount(account);}
   catch(e){$('#confirmInvDelete').disabled=false;traceNotice(e);}
  };
 };
}
function openPortfolioAnalysis(){
 const owners=wealthScope==='couple'?['la','partner']:[me];const accounts=state.investmentAccounts.filter(a=>owners.includes(a.owner)).map(a=>({a,p:portfolioLedger(a)}));
 openSheet('Analyse du patrimoine','<div class="empty-note">La performance correspond à la valeur estimée des avoirs moins les versements nets. Elle n’est pas confondue avec l’argent apporté. Les conversions sont manuelles.</div>'+
 accounts.map(({a,p})=>'<button class="trace-list-btn" type="button" data-analysis-invest="'+esc(a.id)+'"><span><b>'+esc(a.name)+'</b><small>Versements : '+nativeMoney(p.contributions,a.currency)+' · Performance : '+nativeMoney(p.performance,a.currency)+'</small></span><strong>'+nativeMoney(p.value,a.currency)+'</strong></button>').join('')+
 (!accounts.length?'<div class="empty-note">Ajoute un compte pour suivre ton patrimoine.</div>':''));
 $$('[data-analysis-invest]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.analysisInvest)));
}

function renderWealth(){
 const sId=scope(wealthScope),owners=sId==='couple'?['la','partner']:[sId],bk=bank(sId),accounts=state.investmentAccounts.filter(a=>owners.includes(a.owner));
 const ports=accounts.map(a=>({a,p:portfolioLedger(a)}));
 const missing=ports.filter(x=>!x.p.hasFx);
 const investments=ports.reduce((sum,x)=>sum+(x.p.cad||0),0),total=(bk.net||0)+investments;
 $('#wealthTotal').textContent=money(total);
 $('#wealthSub').textContent=missing.length?'Total partiel · '+missing.length+' compte(s) sans conversion CAD':'Liquidités et placements valorisés avec les cours saisis';
 $('#assetGrid').innerHTML=[
 '<button class="asset-card" type="button" id="wealthLiquidityCard"><span class="a-icon">$</span><span>Liquidités</span><b>'+(bk.net===null?'À configurer':money(bk.net))+'</b><small>Même solde que dans Accueil · Configurer ›</small></button>',
 ...ports.map(({a,p})=>'<button class="asset-card" type="button" data-inv-account="'+esc(a.id)+'"><span class="a-icon">◇</span><span>'+esc(a.name||a.type||'Investissement')+'</span><b>'+nativeMoney(p.value,a.currency)+'</b><small>'+(p.hasFx?money(p.cad)+' CAD':'Conversion CAD à saisir')+' · Détails ›</small></button>'),
 '<button class="asset-card asset-card-add" id="wealthAddCard" type="button"><span class="a-icon">＋</span><span>Ajouter un compte</span><b>Nouveau</b><small>PEA, CELI, REER…</small></button>'
 ].join('');
 $('#wealthAddCard').onclick=openInvestmentAccountAdd;$('#wealthLiquidityCard').onclick=openAccountSettings;
 $$('[data-inv-account]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.invAccount)));
 $('#wealthTrend').innerHTML='<div class="empty-note">Les évolutions seront présentées dès que suffisamment de valorisations datées auront été saisies. Aucun graphique fictif n’est affiché.</div>';
 updateSegments();
}
function renderAll(){renderHome();renderBudget();renderActivity();renderWealth();}
function navigate(p){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===p));location.hash=p==='home'?'':p;window.scrollTo({top:0,behavior:'smooth'});}
function analysis(){analysisScope=homeScope;renderAnalysis();}
function renderAnalysis(){const sId=scope(analysisScope),ms=months6(),vs=ms.map(m=>summary(m,sId)),inc=vs.reduce((x,v)=>x+v.income,0),exp=vs.reduce((x,v)=>x+v.expense,0),sav=inc-exp;openSheet('Analyses',`<div class="segment analysis-scope" id="analysisScope"><button class="seg ${analysisScope==='mine'?'active':''}" data-scope="mine">Moi</button><button class="seg ${analysisScope==='couple'?'active':''}" data-scope="couple">Couple</button></div><div class="metric-strip" style="margin-top:14px"><div class="metric-mini"><span>Dépenses · 6 mois</span><b>${money(exp)}</b></div><div class="metric-mini"><span>Moyenne</span><b>${money(exp/6)}</b></div><div class="metric-mini"><span>Épargne</span><b>${money(sav)}</b></div><div class="metric-mini"><span>Taux</span><b>${inc?(sav/inc*100).toFixed(1):0} %</b></div></div><div class="section-head"><h2>Évolution</h2></div><div class="chart" id="analysisChart"></div>`);chart($('#analysisChart'),sId,'expense');$$('#analysisScope .seg').forEach(b=>b.onclick=()=>{analysisScope=b.dataset.scope;renderAnalysis();});}
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
  const{error}=await client.from('households').update({settings,updated_by:session.user.id}).eq('id',household.id);
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
    '<div class="empty-note" style="text-align:center;margin-top:12px">Trace · version '+esc(window.__TRACE_BUILD__)+'</div>'+
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
  const mine=state.accounts.filter(a=>(wealthScope==='couple'||a.owner===me)&&a.id!=='cash'&&a.type!=='cash'&&!a.archived);
  const balances=state.household.accountOpeningBalances||{};
  const dates=state.household.accountOpeningBalanceDates||{};
  const modes=state.household.accountOpeningBalanceModes||{};
  openSheet('Mes comptes',
    '<div class="empty-note">Indique si le solde est celui du début ou de la fin de la journée sélectionnée. Début du 1er octobre = opérations du 1er incluses ; fin du 3 octobre = opérations dès le 4. Les transactions plus anciennes restent conservées, mais ne sont pas recalculées.</div>'+
    (mine.length?mine.map(a=>'<div class="account-setting-card"><div class="settings-hero compact"><span class="pico">'+uiIcon('bank')+'</span><div><b>'+esc(a.name)+'</b><small>'+esc(accountType(a)==='card'?'Carte de crédit':'Compte bancaire')+'</small></div></div><label class="label2">Solde de référence</label><input class="input account-opening" data-id="'+esc(a.id)+'" type="number" step="0.01" value="'+(balances[a.id]??'')+'"><label class="label2">Date</label><input class="input account-date" data-id="'+esc(a.id)+'" type="date" value="'+esc(dates[a.id]||state.household.referenceDate||'2026-10-01')+'"><label class="label2">Ce solde correspond à…</label><select class="input account-mode" data-id="'+esc(a.id)+'"><option value="start"'+(modes[a.id]!=='end'?' selected':'')+'>Début de cette journée (jour inclus)</option><option value="end"'+(modes[a.id]==='end'?' selected':'')+'>Fin de cette journée (jour exclu)</option></select></div>').join(''):'<div class="empty-note" style="margin-top:12px">Aucun compte bancaire n’est encore configuré.</div>')+
    (mine.length?'<button class="primary full" id="saveAccountSettings" style="margin-top:16px">Enregistrer les soldes</button>':'')+settingsBack()
  );
  if(mine.length)$('#saveAccountSettings').onclick=async()=>{
    const oldBalances={...(state.household.accountOpeningBalances||{})},oldDates={...(state.household.accountOpeningBalanceDates||{})},oldModes={...(state.household.accountOpeningBalanceModes||{})};
    const balancesNext={...oldBalances},datesNext={...oldDates},modesNext={...oldModes};
    for(const i of $$('.account-opening')){if(i.value.trim()!==''&&!Number.isFinite(Number(i.value)))return;if(i.value.trim()==='')delete balancesNext[i.dataset.id];else balancesNext[i.dataset.id]=Number(i.value);}
    for(const i of $$('.account-date')){if(i.value)datesNext[i.dataset.id]=i.value;else delete datesNext[i.dataset.id];}
    for(const i of $$('.account-mode'))modesNext[i.dataset.id]=i.value==='end'?'end':'start';
    state.household.accountOpeningBalances=balancesNext;state.household.accountOpeningBalanceDates=datesNext;state.household.accountOpeningBalanceModes=modesNext;
    $('#saveAccountSettings').disabled=true;
    try{await saveHouseholdSettings();renderAll();closeSheet();navigate('wealth');}
    catch(e){state.household.accountOpeningBalances=oldBalances;state.household.accountOpeningBalanceDates=oldDates;state.household.accountOpeningBalanceModes=oldModes;$('#saveAccountSettings').disabled=false;traceNotice(e);}
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
    '<label class="label2">Le solde Partage correspond à…</label><select id="sharingOpeningModeSetting" class="input"><option value="start"'+(state.household.sharingOpeningBalanceMode!=='end'?' selected':'')+'>Début de la journée (incluse)</option><option value="end"'+(state.household.sharingOpeningBalanceMode==='end'?' selected':'')+'>Fin de la journée (exclue)</option></select>'+
    '<div class="empty-note" style="margin-top:12px">Valeur positive : '+esc(member('partner').name)+' doit à '+esc(member('la').name)+'. Valeur négative : '+esc(member('la').name)+' doit à '+esc(member('partner').name)+'. L’historique antérieur reste conservé.</div>'+
    '<div class="setting-summary" style="margin-top:14px"><span>Sauvegarde de migration V5</span><b>Active</b></div>'+
    '<button class="primary full" id="saveDataSettings" style="margin-top:16px">Enregistrer</button>'+settingsBack()
  );
  $('#saveDataSettings').onclick=async()=>{
    state.household.referenceDate=$('#referenceDateSetting').value;
    state.household.sharingOpeningBalance=Number($('#sharingOpeningSetting').value||0);
    state.household.sharingOpeningBalanceMode=$('#sharingOpeningModeSetting').value==='end'?'end':'start';
    await saveHouseholdSettings();renderAll();profile();
  };
  bindSettingsBack();
}
async function loadWorkspace(){showGate('cloudLoadingPanel');loadingStage('Chargement de votre espace…');const{data:m,error:e}=await withTimeout(client.from('household_members').select('household_id,user_id,slot,display_name').eq('user_id',session.user.id).maybeSingle(),7000,'Chargement du profil trop long.');if(e)throw e;if(!m){showGate('cloudWorkspacePanel');return;}document.documentElement.dataset.traceUserId=session.user.id;me=m.slot;partner=me==='la'?'partner':'la';loadingStage('Synchronisation de vos données…');const[{data:h,error:he},{data:docs,error:de},{data:members,error:mee}]=await withTimeout(Promise.all([client.from('households').select('id,name,settings,schema_version,invite_code,created_by').eq('id',m.household_id).single(),client.from('documents').select('collection,item_id,data').eq('household_id',m.household_id),client.from('household_members').select('slot,display_name,role,user_id').eq('household_id',m.household_id)]),9000,'Synchronisation trop longue.');if(he||de||mee)throw he||de||mee;household=h;state={household:{...(h.settings||{}),name:h.name,inviteCode:h.invite_code||'',createdBy:h.created_by||'',workspaceMembers:members.map(x=>({slot:x.slot,name:x.display_name,role:x.role,userId:x.user_id}))},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[],importDays:[]};if(!Array.isArray(state.household.members)||!state.household.members.length)state.household.members=members.map(x=>({id:x.slot,name:x.display_name,initials:initials(x.display_name)}));members.forEach(x=>{const mm=state.household.members.find(y=>y.id===x.slot);if(mm){mm.name=x.display_name||mm.name;mm.initials=initials(mm.name);}});const map={categories:'categories',accounts:'accounts',budgets:'budgets',transactions:'transactions',investmentAccounts:'investment_accounts',investmentOperations:'investment_operations',reconciliations:'reconciliations',importDays:'import_days'};Object.entries(map).forEach(([k,c])=>state[k]=docs.filter(d=>d.collection===c).map(d=>d.data).filter(Boolean));state.household.referenceDate||='2026-11-01';$('#profileBtn').textContent=member(me).initials||initials(member(me).name);renderAll();navigate((location.hash||'#').slice(1)||'home');hideGate();sync('synced');if(state.investmentAccounts.some(a=>['EUR','USD'].includes(a.currency)&&a.fxAutoUpdate!==false))setTimeout(()=>refreshPublicPortfolioRates().catch(console.error),350);}
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
function bind(){$('#closeSheet').onclick=closeSheet;$('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet();};$$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));$$('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='review'){navigate('activity');showTab('review');}else navigate(b.dataset.go);});$('#quickAdd').onclick=openManualTransaction;$('#profileBtn').onclick=profile;$('#analysisBtn').onclick=analysis;$('#homeTrendCard').onclick=analysis;$('#shareCard').onclick=openSharing;$('#shareOpen').onclick=openSharing;$$('[data-kpi]').forEach(b=>b.onclick=()=>detail(b.dataset.kpi));$$('#homeScope .seg').forEach(b=>b.onclick=()=>{homeScope=b.dataset.scope;renderHome();});document.querySelectorAll('#budgetScope .seg').forEach(b=>b.onclick=()=>{budgetScope=b.dataset.scope;renderBudget();});$('#budgetMonthPicker')?.addEventListener('change',e=>setBudgetMonth(e.target.value));$('#budgetCurrentMonth')?.addEventListener('click',()=>setBudgetMonth(CM));$('#budgetCopyPrevious')?.addEventListener('click',copyPreviousBudget);$$('#wealthScope .seg').forEach(b=>b.onclick=()=>{wealthScope=b.dataset.scope;renderWealth();});$$('#activityTabs .tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$('#activityMonthPicker')?.addEventListener('change',e=>setActivityMonth(e.target.value));$('#activityPrevMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,-1)));$('#activityNextMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,1)));$('#activityCurrentMonth')?.addEventListener('click',()=>setActivityMonth(CM));$('#annualBudgetDetails').onclick=analysis;$('#annualBudgetCard').onclick=analysis;$('#addAsset').onclick=openInvestmentAccountAdd;$('#wealthAnalysis').onclick=openPortfolioAnalysis;$('#wealthChart').onclick=$('#wealthAnalysis').onclick;$('#chooseImport').onclick=()=>{const input=$('#importFile');delete input.dataset.preferredDate;delete input.dataset.preferredAccount;input.value='';input.click();};$('#importFile').onchange=e=>{importFile(e.target.files?.[0]);e.target.value='';};$('#validateComplete').onclick=validatePendingAll;$('#reviewBulkImports').onclick=()=>openImportBatchReview(state.transactions.filter(t=>t.status!=='confirmed'&&['image','ocr','pdf','csv'].includes(t.source)).map(t=>t.id));document.querySelectorAll('[data-password-target]').forEach(btn=>btn.onclick=()=>{const input=$('#'+btn.dataset.passwordTarget);if(!input)return;const reveal=input.type==='password';input.type=reveal?'text':'password';btn.classList.toggle('active',reveal);btn.setAttribute('aria-pressed',String(reveal));btn.setAttribute('aria-label',reveal?'Masquer le mot de passe':'Afficher le mot de passe');});document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.authTab;$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#cloudLoginForm').classList.toggle('hidden',t!=='login');$('#cloudSignupForm').classList.toggle('hidden',t!=='signup');});$('#cloudLoginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');$('#cloudAuthMessage').textContent='Connexion…';if(btn){btn.disabled=true;btn.textContent='Connexion…';}try{const{data,error}=await client.auth.signInWithPassword({email:$('#cloudLoginEmail').value.trim(),password:$('#cloudLoginPassword').value});if(error)throw error;if(!data?.session)throw new Error('Session non créée');session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Se connecter';}}};$('#cloudSignupForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Création…';}try{const{data,error}=await client.auth.signUp({email:$('#cloudSignupEmail').value.trim(),password:$('#cloudSignupPassword').value,options:{data:{display_name:$('#cloudSignupName').value.trim()}}});if(error)throw error;if(data?.session){session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}else{$('#cloudAuthMessage').textContent='Compte créé. Vérifie ton courriel pour confirmer ton adresse.';}}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Créer mon compte';}}};$$('[data-workspace-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.workspaceTab;$('#cloudCreateHouseholdForm').classList.toggle('hidden',t!=='create');$('#cloudJoinHouseholdForm').classList.toggle('hidden',t!=='join');});$('#cloudCreateHouseholdForm').onsubmit=async e=>{e.preventDefault();const{error}=await client.rpc('create_household',{p_name:$('#cloudHouseholdName').value.trim(),p_display_name:$('#cloudCreatorName').value.trim()});if(error)$('#cloudWorkspaceMessage').textContent=error.message;else loadWorkspace();};$('#cloudJoinHouseholdForm').onsubmit=async e=>{e.preventDefault();const{error}=await client.rpc('join_household',{p_invite_code:$('#cloudInviteCode').value.trim().toUpperCase(),p_display_name:$('#cloudJoinName').value.trim()});if(error)$('#cloudWorkspaceMessage').textContent=error.message;else loadWorkspace();};}

let versionCheckBusy=false;
async function checkCurrentBuild(){
 if(versionCheckBusy)return;versionCheckBusy=true;
 try{
  const response=await fetch('./trace-version.json?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)return;
  const latest=await response.json();
  if(latest.build&&latest.build!==window.__TRACE_BUILD__&&/^[0-9]+\.[0-9]+\.[0-9]+$/.test(latest.build)){
   window.location.replace('./trace-launch-v2.html?refresh='+Date.now());
  }
 }catch(e){console.info('Trace: contrôle de version différé');}
 finally{versionCheckBusy=false;}
}


/* Bridge for client-side document recognition; financial writes always go via confirmed preview. */
window.TraceBankBridge={
 accounts:()=>visibleBankAccounts(me).map(a=>({id:a.id,name:a.name,type:accountType(a),opening:openingBoundary(a.id)})),
 referenceDate:()=>state.household.referenceDate||'',
 month:()=>activityMonth,
 dayTransactions:(accountId,date)=>state.transactions.filter(t=>t.accountId===accountId&&t.date===date).sort((a,b)=>String(b.id).localeCompare(String(a.id))).map(t=>({id:t.id,name:t.name||'',date:t.date,amountCAD:t.amountCAD,type:t.type,status:t.status})),
 openTransaction:(id)=>{const tx=state.transactions.find(t=>t.id===id);if(!tx)return;setActivityMonth(tx.date.slice(0,7));navigate('activity');showTab(tx.status==='confirmed'?'transactions':'review');editTransaction(id,tx.status!=='confirmed');},
 goDayTransactions:(date)=>{setActivityMonth(date.slice(0,7));navigate('activity');showTab('transactions');},
 setMonth:setActivityMonth,
 importDays:()=>state.importDays,
 latestImportDay,
 importDayInfo,
 gaps:dailyGaps,
 recordDayImport,
 markDayChecked,
 openBatchReview:openImportBatchReview,
 afterBoundaryFor:(accountId,date)=>afterBoundary(date,openingBoundary(accountId)),
 getBoundary:(accountId)=>openingBoundary(accountId),
 inspect:(candidates,accountId)=>{
  if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw new Error('Compte non reconnu.');
  return candidates.map(row=>{
   const t={...row,amountCAD:Number(row.amount),accountId};
   const found=findSimilarTransaction(t);
   const sameMerchantDifferentPrice=state.transactions.find(x=>
    x.accountId===accountId&&x.date===t.date&&x.type===t.type&&normalizedMerchant(x.name)===normalizedMerchant(t.name)&&
    normalizedMerchant(t.name).length>2&&Math.abs(Number(x.amountCAD)-Number(t.amountCAD))>.009);
   const included=isFinancialPeriod(t);
   const match=found?.t||sameMerchantDifferentPrice;
   return{status:!included?'historical':found?(found.status==='exact'?'already':'possible'):sameMerchantDifferentPrice?'possible':'missing',
     matchName:match?.name||'',matchDate:match?.date||'',matchStatus:match?.status||null,
     amountConflict:Boolean(!found&&sameMerchantDifferentPrice),
     accountingIncluded:included};
  });
 },
 async submit(rows,accountId,fileName,method,scopeDay=null){
  if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw new Error('Compte bancaire invalide');
  // A calendar-day import must never write a transaction from another date,
  // even when the document spans several days or a date was edited in the preview.
  if(scopeDay!==null){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(scopeDay)||Number.isNaN(Date.parse(scopeDay+'T12:00:00')))
    throw new Error('La journée choisie est invalide.');
   if(rows.some(row=>String(row.date||'')!==scopeDay))
    throw new Error('Ce lot contient une opération en dehors du '+scopeDay+'. Réimporte-la depuis sa propre journée.');
  }
  let added=0,duplicates=0;const dates=new Set(),savedIds=[];
  for(const row of rows){
   const amount=Number(row.amount),date=String(row.date||''),name=String(row.name||'').trim().slice(0,80),type=row.type;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name||!(amount>0)||!Number.isFinite(amount)||!['income','expense','refund'].includes(type))throw new Error('Ligne incomplète : date, description ou montant');
   const probe={date,name,type,amountCAD:amount,accountId};
   if(method==='image')dates.add(date);
   const existing=findSimilarTransaction(probe);
   if(existing?.status==='exact'||csvImportedDuplicate(probe,state.transactions)){duplicates++;continue;}
   if(existing?.status==='possible'&&!row.allowPossibleDuplicate)throw new Error('Correspondance possible dans Trace : '+existing.t.name+' du '+existing.t.date+'. Vérifie-la explicitement avant ajout.');
   const tx={id:txDocId(),date,name,type,amountCAD:amount,amountOriginal:amount,currency:'CAD',rate:1,status:'pending',categoryId:'',accountId,payerId:me,beneficiary:me,...traceSplit(me,amount),
    source:method,importFileName:fileName,recurring:false,excludedByOpening:!isFinancialPeriod(probe)};
   tx.importFingerprint=csvFingerprint(tx);
   try{await saveDocument('transactions',tx);state.transactions.push(tx);savedIds.push(tx.id);added++;}
   catch(error){renderAll();throw error;}
  }
  let coverageWarning='';
  if(method==='image')for(const d of dates){try{await recordDayImport(accountId,d,method);}catch(e){coverageWarning='L’opération a été conservée, mais le suivi du jour n’a pas pu être enregistré.';console.warn(e);}}
  renderAll(); // Garder l'écran Importer visible lors d'une série de captures.
  return{added,duplicates,coverageWarning,dates:[...dates],ids:savedIds};
 }
};

function bootTrace(){
  try{
    bind();
    init();
    setTimeout(checkCurrentBuild,1200);
  }catch(err){
    console.error('Trace startup error',err);
    showGate('cloudAuthPanel');
    const msg=$('#cloudAuthMessage');
    if(msg)msg.textContent='Trace n’a pas pu démarrer. Recharge la page.';
  }
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkCurrentBuild();});
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootTrace,{once:true});
}else{
  bootTrace();
}
})();
