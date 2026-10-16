(()=>{'use strict';window.__TRACE_BUILD__='5.31.15';
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
let state={household:{},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[],importDays:[],smartImports:[]};
function withTimeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'Délai dépassé')),ms))]);}
function loadingStage(text){const el=$('#cloudLoadingText');if(el)el.textContent=text;}
function member(id){return(state.household.members||[]).find(x=>x.id===id)||{id,name:id==='la'?'Membre 1':'Partenaire',initials:id==='la'?'M1':'P'};}
function defaultMemberNickname(name){const first=String(name||'').trim().split(/\s+/)[0]||'Membre';if(first.includes('-')){const parts=first.split('-').filter(Boolean);if(parts.length>1)return parts.map(x=>x[0].toLocaleUpperCase('fr')).join('');}return first.slice(0,18);}
function shortMemberName(id){return String(state.household?.memberNicknames?.[id]||'').trim()||defaultMemberNickname(member(id).name);}
function shortAccountLabel(a){const name=String(a?.name||''),owner=String(member(a?.owner).name||'').trim();if(!owner)return name;const idx=name.toLocaleLowerCase('fr').indexOf(owner.toLocaleLowerCase('fr'));if(idx>=0)return name.slice(0,idx)+shortMemberName(a.owner)+name.slice(idx+owner.length);const clean=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const head=name.split(/\s+[—–]\s+/)[0].trim();return head&&clean(head)===clean(owner)?shortMemberName(a.owner)+name.slice(head.length):name;}
function cat(id){return state.categories.find(x=>x.id===id)||{name:'À classer',icon:'•',type:'expense'};}
function scope(s){return s==='mine'?me:'couple';}
function showGate(id){$('#cloudGate').classList.remove('hidden');['cloudLoadingPanel','cloudConfigPanel','cloudAuthPanel','cloudWorkspacePanel'].forEach(x=>$('#'+x)?.classList.toggle('hidden',x!==id));$('#app').classList.add('cloud-locked');}
function hideGate(){$('#cloudGate').classList.add('hidden');$('#app').classList.remove('cloud-locked');}
function sync(k,t){$('#syncPill').dataset.status=k;$('#syncLabel').textContent=(t||({synced:'Synchronisé',loading:'Connexion…',error:'Erreur'}[k]||k))+' · v'+window.__TRACE_BUILD__;}
function openSheet(t,h){$('#sheetTitle').textContent=t;$('#sheetBody').innerHTML=h;$('#sheetBackdrop').classList.add('open');document.body.classList.add('sheet-open');}
function closeSheet(){$('#sheetBackdrop').classList.remove('open');document.body.classList.remove('sheet-open');}
function split(t,id){const d=state.household.defaultSplit||{la:50,partner:50};return Number(t.amountCAD||0)*Number(t.split?.[id]??d[id]??50)/100;}
function alloc(t,s){const a=Number(t.amountCAD||0);
 if(t.beneficiary==='custom'){if(s==='couple')return Math.max(0,a-split(t,'friends'));return split(t,s);}
 if(s==='couple')return a;if(t.beneficiary===s)return a;if(t.beneficiary==='couple')return split(t,s);return 0;}
function budgetAmt(b,s){
 const a=Number(b.amount||0);
 if(s==='couple'||b.scope===s)return a;
 if(b.scope!=='couple')return 0;
 // New posts store an exact cent-accurate personal allocation.
 const allocated=b.shareAmounts;
 if(allocated&&Number.isFinite(Number(allocated.la))&&Number.isFinite(Number(allocated.partner))&&
  Math.abs(Number(allocated.la)+Number(allocated.partner)-a)<.011){
  return Math.max(0,Math.round(Number(allocated[s]||0)*100)/100);
 }
 // Legacy shared budgets retain their prior household/category allocation.
 const d=state.household.categorySplits?.[b.categoryId]||state.household.defaultSplit||{la:50,partner:50};
 return Math.round(a*Number(d[s]||0))/100;
}
function budgetAllocation(total,myAmount){
 const t=Math.round(Number(total)*100),mine=Math.round(Number(myAmount)*100);
 if(!Number.isSafeInteger(t)||t<0||!Number.isSafeInteger(mine)||mine<0||mine>t)
  throw Error('Vérifie les parts : leur somme doit correspondre au total.');
 return {la:mine/100,partner:(t-mine)/100};
}
function defaultBudgetAllocation(item,total){
 const t=Math.round(Number(total||0)*100)/100;
 const previous=item?.shareAmounts;
 if(previous&&Math.abs(Number(previous.la)+Number(previous.partner)-t)<.011)
  return budgetAllocation(t,previous.la);
 const split=state.household.categorySplits?.[item?.categoryId]||
  state.household.defaultSplit||{la:50,partner:50};
 const mine=Math.round(t*Number(split.la??50))/100;
 return budgetAllocation(t,Math.min(t,Math.max(0,mine)));
}
function budgetShareFields(item,scopeValue,amount){
 const isShared=scopeValue==='couple',share=defaultBudgetAllocation(item,amount);
 return '<div class="trace-budget-share'+(isShared?'':' hidden')+'" id="budgetShareFields">'+
  '<div class="trace-budget-share-heading"><strong>Répartir le montant</strong><small>Les deux parts doivent former le total prévu.</small></div>'+
  '<div class="trace-budget-share-grid"><label>Ma part ($)<input class="input" type="number" inputmode="decimal" min="0" step=".01" id="budgetMineAmount" value="'+share.la.toFixed(2)+'"></label>'+
  '<label>Part de '+esc(shortMemberName(partner))+' ($)<input class="input" type="number" inputmode="decimal" min="0" step=".01" id="budgetPartnerAmount" value="'+share.partner.toFixed(2)+'"></label></div>'+
  '<div class="trace-budget-share-total" id="budgetSharePreview">Couple : '+money(amount)+' · Moi : '+money(share.la)+' · '+esc(shortMemberName(partner))+' : '+money(share.partner)+'</div></div>';
}
function bindBudgetShareFields(scopeSelector,amountSelector){
 const mode=$(scopeSelector),amount=$(amountSelector),mine=$('#budgetMineAmount'),other=$('#budgetPartnerAmount'),
       group=$('#budgetShareFields'),preview=$('#budgetSharePreview');
 let active='mine';
 const cents=value=>Math.round(Number(value)*100);
 function sync(from='mine'){
  group.classList.toggle('hidden',mode.value!=='couple');
  const total=cents(amount.value||0),input=from==='partner'?other:mine,value=cents(input.value||0);
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(value)||value<0||value>total){
   preview.textContent='Vérifie la répartition : chaque part doit être comprise entre 0 $ et le total.';
   return;
  }
  // Never replace the value being typed: preserve the iPhone numeric keyboard cursor.
  if(from==='partner')mine.value=((total-value)/100).toFixed(2);
  else other.value=((total-value)/100).toFixed(2);
  preview.textContent='Couple : '+money(total/100)+' · Moi : '+money(Number(mine.value))+
   ' · '+shortMemberName(partner)+' : '+money(Number(other.value));
 }
 function setHalf(){
  const total=cents(amount.value||0);
  if(!Number.isSafeInteger(total)||total<0)return;
  mine.value=(Math.round(total/2)/100).toFixed(2);sync('mine');
 }
 mode.addEventListener('change',()=>{
  if(mode.value==='couple'&&!group.dataset.visited){setHalf();group.dataset.visited='yes';}
  sync(active);
 });
 amount.addEventListener('input',()=>sync(active));
 mine.addEventListener('input',()=>{active='mine';sync('mine');});
 other.addEventListener('input',()=>{active='partner';sync('partner');});
 mine.addEventListener('change',()=>{if(mine.value!==''&&Number.isFinite(Number(mine.value)))mine.value=Number(mine.value).toFixed(2);sync('mine');});
 other.addEventListener('change',()=>{if(other.value!==''&&Number.isFinite(Number(other.value)))other.value=Number(other.value).toFixed(2);sync('partner');});
 sync();
 return ()=>{
  if(mode.value!=='couple')return null;
  const total=Number(amount.value),my=Number(mine.value),partnerPart=Number(other.value);
  const split=budgetAllocation(total,my);
  if(!Number.isFinite(partnerPart)||Math.abs(split.partner-partnerPart)>.009)
   throw Error('La somme des parts doit correspondre au montant total.');
  return split;
 };
}
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
 if(a.accountId&&b.accountId&&a.accountId!==b.accountId)return null;
 const aAmount=Number(a.amountCAD??a.amount),bAmount=Number(b.amountCAD??b.amount);
 if(!(aAmount>0)||!(bAmount>0)||!Number.isFinite(aAmount)||!Number.isFinite(bAmount)||Math.abs(aAmount-bAmount)>.009)return null;
 if(!([a.type,b.type].every(x=>x==='expense')||[a.type,b.type].every(x=>x==='refund')||[a.type,b.type].every(x=>x==='income')))return null;
 const days=dateGapDays(a.date,b.date);
 if(days>4)return null;
 const na=normalizedMerchant(a.name),nb=normalizedMerchant(b.name);
 if(!na||!nb)return days===0?'possible':null;
 const partsA=new Set(na.split(' ').filter(x=>x.length>2)),partsB=new Set(nb.split(' ').filter(x=>x.length>2));
 const common=[...partsA].filter(x=>partsB.has(x)).length;
 const similarity=common/Math.max(1,Math.min(partsA.size,partsB.size));
 if(days===0&&(na===nb||na.includes(nb)||nb.includes(na)||similarity>=.67))return'exact';
 if(days<=2&&(na===nb||na.includes(nb)||nb.includes(na)||similarity>=.67))return'possible';
 if(days<=4&&(similarity>=.4||na.includes(nb)||nb.includes(na)))return'possible';
 return null; // Two unrelated merchants with the same price are not duplicates.
}
function findSimilarTransaction(candidate){
 const matches=state.transactions.map(t=>({t,status:sourceMatch(candidate,t)})).filter(x=>x.status);
 return matches.find(x=>x.status==='exact')||matches[0]||null;
}

function txs(m,s,confirmed=true){return state.transactions.filter(t=>String(t.date||'').startsWith(m)&&isFinancialPeriod(t)&&(!confirmed||t.status==='confirmed')&&(s==='couple'||t.beneficiary===s||t.beneficiary==='couple'||(t.beneficiary==='custom'&&split(t,s)>.005)||(t.payerId===s&&['income','transfer','external_refund'].includes(t.type))));}
function summary(m,s){let income=0,expense=0,refund=0;txs(m,s,true).forEach(t=>{if(t.type==='income')income+=alloc(t,s);else if(['expense','group_expense','person_payment'].includes(t.type))expense+=alloc(t,s);else if(t.type==='refund')refund+=alloc(t,s);});expense=Math.max(0,expense-refund);const bs=state.budgets.filter(b=>b.month===m),ib=bs.filter(b=>cat(b.categoryId).type==='income').reduce((x,b)=>x+budgetAmt(b,s),0),eb=bs.filter(b=>cat(b.categoryId).type==='expense').reduce((x,b)=>x+budgetAmt(b,s),0);return{income,expense,ib,eb,saving:income-expense};}
function breakdown(m,s){return state.categories.filter(c=>c.type==='expense'&&!c.archived).map(c=>{const budget=state.budgets.filter(b=>b.month===m&&b.categoryId===c.id).reduce((x,b)=>x+budgetAmt(b,s),0),actual=txs(m,s,true).filter(t=>t.categoryId===c.id).reduce((x,t)=>x+(['expense','group_expense','person_payment'].includes(t.type)?alloc(t,s):t.type==='refund'?-alloc(t,s):0),0);return{...c,budget,actual:Math.max(0,actual),ratio:budget?actual/budget:0};}).filter(x=>x.budget||x.actual).sort((a,b)=>b.ratio-a.ratio||b.actual-a.actual);}
function months6(){return Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
function chart(node,s,metric='saving'){const ms=months6(),vs=ms.map(m=>summary(m,s)),r=vs.map(v=>metric==='expense'?v.expense:Math.max(0,v.saving)),b=vs.map(v=>metric==='expense'?v.eb:Math.max(0,v.ib-v.eb)),max=Math.max(1,...r,...b);node.innerHTML=ms.map((m,i)=>`<div class="monthbar"><i style="height:${Math.max(3,b[i]/max*100)}%"></i><b style="height:${Math.max(3,r[i]/max*100)}%"></b><em>${shortMonth(m)}</em></div>`).join('');}
function accountType(a){
 // Immutable banking type wins over editable account name.
 if(a?.type==='checking'||a?.type==='card')return a.type;
 const s=(String(a?.id||'')+' '+String(a?.name||'')).toLowerCase();
 if(/card|carte|visa|master/.test(s))return'card';
 if(/checking|courant|chequ/.test(s))return'checking';
 if(/saving|épargne|epargne/.test(s))return'saving';
 return'other';
}
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
   if(['expense','group_expense','person_payment','transfer','external_transfer'].includes(t.type))return x-v;
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
  if(t.beneficiary==='custom'){
   // Friend receivables are external to Tricount: only the partner's share
   // affects the debt between the two household members.
   return t.payerId==='la'?split(t,'partner')*sign:t.payerId==='partner'?-split(t,'la')*sign:0;
  }
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
 '<label class="label2">À qui cet argent est-il dû ?</label><select id="tricountCreditor" class="input"><option value="la">'+esc(shortMemberName('la'))+'</option><option value="partner">'+esc(shortMemberName('partner'))+'</option></select>'+
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
  '<button type="button" class="primary full" id="addSettlement" style="margin-top:14px">Enregistrer un règlement</button>'+'<button type="button" class="secondary full" id="editTricountOpening" style="margin-top:8px">'+(Number(state.household.sharingOpeningBalance||0)!==0?'Modifier le solde repris de Tricount':'Reprendre le solde de Tricount')+'</button>'+'<div class="empty-note" style="margin-top:9px">Solde initial Tricount : '+(Number(state.household.sharingOpeningBalance||0)>=0?'+':'−')+money(Math.abs(Number(state.household.sharingOpeningBalance||0)))+' (positif = '+esc(shortMemberName('partner'))+' doit à '+esc(shortMemberName('la'))+')</div>'+
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
  '<label class="label2">Qui rembourse ?</label><select class="input" id="settlePayer"><option value="la">'+esc(shortMemberName('la'))+'</option><option value="partner">'+esc(shortMemberName('partner'))+'</option></select>'+
  '<div class="formrow"><div><label class="label2">Montant (CAD)</label><input class="input" type="number" id="settleAmount" min="0.01" step="0.01" inputmode="decimal" value="'+Number(amount)+'"></div><div><label class="label2">Date</label><input class="input" type="date" id="settleDate" value="'+esc(original?.date||localDateISO())+'"></div></div>'+
  '<label class="label2">Compte débité</label><select class="input" id="settleFrom"></select>'+
  '<label class="label2">Compte crédité</label><select class="input" id="settleTo"></select>'+
  '<button class="primary full" id="saveSettlement" style="margin-top:18px">Enregistrer le règlement</button>'+
  (original?'<button class="secondary full trace-danger" id="removeSettlement">Supprimer le règlement</button>':'')+
  '<button class="secondary full" id="cancelSettlement" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#settlePayer').value=payer;
 const refresh=()=>{
  const from=$('#settlePayer').value,to=from==='la'?'partner':'la';
  const opts=owner=>visibleBankAccounts(owner).filter(a=>accountType(a)!=='card').map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
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
function renderHome(){const sId=scope(homeScope),s=summary(CM,sId),cons=s.eb?s.expense/s.eb*100:0,b=bank(sId);$('#homeMonthLabel').textContent=monthLabel(CM);$('#homeGreeting').textContent=homeScope==='mine'?`Bonjour ${member(me).name}`:'Votre situation';$('#homeBudgetAvailable').textContent=money(s.eb-s.expense);$('#homeBudgetSub').textContent=s.eb?`sur ${money(s.eb)} prévus ce mois`:'Budget du mois à compléter';$('#homeBudgetProgress').style.width=`${Math.min(100,Math.max(0,cons))}%`;$('#homeBudgetPercent').textContent=`${cons.toFixed(0)} % consommé`;$('#homeBudgetSpent').textContent=`${money(s.expense)} dépensés`;$('#homeBalance').textContent=b.net===null?'À configurer':money(b.net);$('#homeChecking').textContent=b.checking===null?'—':money(b.checking);$('#homeCard').textContent=b.card===null?'—':money(b.card);$('#reconcileBadge').textContent=state.reconciliations.length?'✓ Rapproché':'À rapprocher';$('#homeIncome').textContent=money(s.income);$('#homeSpending').textContent=money(s.expense);$('#homeSaving').textContent=money(s.saving);
 const savedToCeli=state.transactions.filter(t=>t.status==='confirmed'&&t.type==='external_transfer'&&
 t.transferPurpose==='savings'&&String(t.date||'').startsWith(CM)&&isFinancialPeriod(t)&&
 (sId==='couple'||state.accounts.find(a=>a.id===t.accountId)?.owner===sId))
 .reduce((sum,t)=>sum+Number(t.amountCAD||0),0);
 $('#homeCELITransfers').textContent=money(savedToCeli);const p=state.transactions.filter(t=>t.status!=='confirmed');$('#pendingCountBadge').textContent=p.length;$('#pendingText').textContent=p.length?`${p.length} à vérifier`:'Tout est à jour';const cs=breakdown(CM,sId).slice(0,4);$('#homeBudgetCategories').innerHTML=cs.length?cs.map(c=>`<div class="budget-row"><div class="name">${esc(c.name)}</div><div class="bar ${c.ratio>=.8?'warn':''}"><i style="width:${Math.min(100,c.ratio*100)}%"></i></div><div class="amount"><strong>${money(c.actual)}</strong> / ${money(c.budget)}</div></div>`).join(''):'<div class="empty-note">Ajoute ton budget pour voir les catégories importantes.</div>';chart($('#homeTrend'),sId);const cb=coupleBalance(),pa=member(partner),la=member('la');$('#partnerAvatar').textContent=pa.initials||initials(pa.name);$('#shareLabel').textContent=`Solde avec ${pa.name}`;$('#shareBalance').textContent=Math.abs(cb)<.01?'Vous êtes à l’équilibre':cb>0?`${shortMemberName('partner')} doit ${money(cb)} à ${shortMemberName('la')}`:`${shortMemberName('la')} doit ${money(Math.abs(cb))} à ${shortMemberName('partner')}`;if((state.household.workspaceMembers||[]).length<2){
 $('#partnerAvatar').textContent='+';
 $('#shareLabel').textContent='Inviter ton partenaire';
 $('#shareBalance').textContent='À deux, quand tu le souhaites';
 $('#shareSmall').textContent='Ton historique est conservé';
}
updateSegments();}
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
  $('#budgetSections').innerHTML='<div class="trace-budget-toolbar"><button class="linkbtn" type="button" id="manageBudgetCategories">Gérer les catégories</button></div>'+sectionDefs.map(([t,kind,f])=>'<div class="section-head"><h2>'+t+'</h2><button class="linkbtn budget-add-link" type="button" data-budget-add="'+kind+'">+ Ajouter</button></div><article class="card budget-section">'+(rows.filter(f).length?rows.filter(f).map(b=>'<button class="budget-card budget-edit-row" type="button" data-budget-edit="'+esc(b.id)+'"><span class="bicon">'+esc(cat(b.categoryId).icon||'•')+'</span><span class="bmain"><strong>'+esc(cat(b.categoryId).name)+'</strong><small>'+(b.scope==='couple'?(sId==='couple'?'Commun · réparti entre vous deux':'Ma part sur '+money(b.amount)+' au total'):'Personnel')+'</small></span><span class="bvalue"><strong>'+money(budgetAmt(b,sId))+'</strong></span></button>').join(''):'<div class="empty-note">Aucun poste.</div>')+'</article>').join('');
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
  const accountOptions=mineAccounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
  const beneficiaryOptions='<option value="'+esc(me)+'">Moi</option><option value="'+esc(partner)+'">'+esc(shortMemberName(partner))+'</option><option value="couple">Nous deux</option><option value="custom">Avec amis · personnalisé</option>';
  openSheet('Ajouter une opération',
    '<div class="trace-manual-hero"><span class="trace-manual-symbol">'+uiIcon('bank')+'</span><div><span class="trace-kicker">NOUVELLE OPÉRATION</span><b>Simple, clair, à ton rythme.</b><small>Ajout direct à l’activité et au budget après enregistrement.</small></div></div>'+
    '<div class="manual-type-grid trace-manual-types">'+
      '<button class="choice selected" data-manual-type="expense" type="button">Dépense</button>'+
      '<button class="choice" data-manual-type="income" type="button">Revenu</button>'+
      '<button class="choice" data-manual-type="refund" type="button">Remboursement</button>'+
    '</div>'+
    '<div class="trace-manual-fields"><label class="label2">Description</label><input class="input" id="manualTxName" type="text" maxlength="80" placeholder="Ex. Épicerie, salaire, remboursement">'+
    '<div class="formrow manual-money-row"><div><label class="label2">Montant</label><div class="budget-amount-field"><input class="input" id="manualTxAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"><span>$</span></div></div>'+
    '<div><label class="label2">Date</label><input class="input" id="manualTxDate" type="date" value="'+localDateISO()+'"></div></div>'+
    '<label class="label2">Catégorie</label><select class="input" id="manualTxCategory"></select><small class="trace-category-suggestion" id="manualCategorySuggestion" role="status"></small>'+
    '<div class="formrow"><div><label class="label2">Compte</label><select class="input" id="manualTxAccount">'+accountOptions+'</select></div>'+
    '<div><label class="label2">Pour qui ?</label><select class="input" id="manualTxBeneficiary">'+beneficiaryOptions+'</select></div></div>'+
    '<div class="trace-manual-friends hidden" id="manualFriendsGroup"><b>Partage avec des amis</b><small>Le montant total reste débité du compte. Renseigne les parts hors de ta dépense personnelle.</small>'+
    '<div class="formrow"><div><label class="label2">Part des amis ($)</label><input class="input" id="manualFriendsAmount" type="number" inputmode="decimal" min="0" step=".01" placeholder="0,00" value="0"></div>'+
    '<div><label class="label2">Part de '+esc(shortMemberName(partner))+' ($)</label><input class="input" id="manualPartnerAmount" type="number" inputmode="decimal" min="0" step=".01" placeholder="0,00" value="0"></div></div>'+
    '<p id="manualSharesPreview" class="trace-manual-share-summary">Ta part sera calculée automatiquement.</p></div>'+
    '<div class="manual-transaction-note" id="manualTxNote">Les opérations communes respectent votre répartition habituelle.</div></div>'+
    '<button class="primary full trace-manual-save" id="saveManualTx" type="button">Enregistrer l’opération</button>'+
    '<button class="secondary full" id="cancelManualTx" type="button" style="margin-top:8px">Annuler</button>'
  );
  const category=$('#manualTxCategory');let manualCategoryTouched=false;
  function suggestManualCategory(){
   if(manualCategoryTouched)return;
   const name=$('#manualTxName').value.trim();
   const guess=name.length>=3?suggestImportCategory({name,type:txType,amountCAD:Number($('#manualTxAmount').value||0)}):{categoryId:'',reason:'Catégorie à choisir'};
   const option=Array.from(category.options).find(x=>x.value===guess.categoryId);
   category.value=option?guess.categoryId:'';
   $('#manualCategorySuggestion').textContent=option?'✦ '+guess.reason:'';
  }
  category.addEventListener('change',()=>{
   manualCategoryTouched=true;$('#manualCategorySuggestion').textContent='';
  });
  $('#manualTxName').addEventListener('input',suggestManualCategory);
  function syncManualFriends(){
    const custom=$('#manualTxBeneficiary').value==='custom'&&txType==='expense';
    $('#manualFriendsGroup').classList.toggle('hidden',!custom);
    if(custom){
      try{
        const value=traceCustomShares(Number($('#manualTxAmount').value),Number($('#manualFriendsAmount').value),Number($('#manualPartnerAmount').value));
        $('#manualSharesPreview').textContent='Moi : '+money(value.splitAmounts.la)+' · '+esc(shortMemberName(partner))+' : '+money(value.splitAmounts.partner)+' · Amis : '+money(value.splitAmounts.friends);
      }catch(e){$('#manualSharesPreview').textContent='Vérifie que la somme des parts ne dépasse pas le montant total.';}
    }
  }
  $('#manualTxBeneficiary').onchange=syncManualFriends;
  ['#manualTxAmount','#manualFriendsAmount','#manualPartnerAmount'].forEach(id=>$(id).addEventListener('input',syncManualFriends));
  const refreshCategories=()=>{
    const cats=manualCategories(txType);
    category.innerHTML='<option value="">Choisir une catégorie</option>'+
      cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    manualCategoryTouched=false;suggestManualCategory();
    $('#manualTxBeneficiary').disabled=txType==='income';
    $('#manualTxBeneficiary').querySelector('[value="custom"]').disabled=txType!=='expense';
    if((txType!=='expense'&&$('#manualTxBeneficiary').value==='custom')||txType==='income')$('#manualTxBeneficiary').value=me;
    $('#manualTxNote').textContent=txType==='refund'?'Le remboursement réduit les dépenses de sa catégorie.':txType==='income'?'Le revenu est rattaché à ton profil.':'Le compte débite le montant complet, le Budget applique les parts choisies.';
    syncManualFriends();
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
    let sharing;
    try{sharing=beneficiary==='custom'?traceCustomShares(amount,$('#manualFriendsAmount').value,$('#manualPartnerAmount').value):{beneficiary,...traceSplit(beneficiary,amount)};}
    catch(err){$('#manualSharesPreview').textContent=err.message;return;}
    const item={
      id:txDocId(),date:$('#manualTxDate').value||localDateISO(),name,note:'',merchant:'',
      type:txType,status:'confirmed',currency:'CAD',rate:1,
      amountCAD:amount,amountOriginal:amount,bankAmount:null,
      categoryId,accountId:$('#manualTxAccount').value||'cash',
      payerId:me,...sharing,
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
    '<div class="formrow"><div><label class="label2">Type</label><select class="input" id="investmentAccountType"><option value="CELI">CELI</option><option value="Épargne">Épargne</option><option value="PEA">PEA</option><option value="REER">REER</option><option value="Courtage">Courtage</option><option value="Autre">Autre</option></select></div>'+
    '<div><label class="label2">Devise</label><select class="input" id="investmentAccountCurrency"><option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div></div>'+
    '<div id="newSavingsReference" class="trace-savings-reference"><div class="empty-note">Les transferts du compte courant alimenteront ce CELI. Pour commencer à calculer son solde, indique sa référence bancaire.</div>'+
    '<label class="label2">Date du solde initial</label><input id="newSavingsDate" class="input" type="date" value="'+localDateISO()+'">'+
    '<label class="label2">Solde réel à cette date ($ CAD)</label><input id="newSavingsAmount" class="input" type="number" step=".01" min="0" inputmode="decimal" placeholder="Tu peux le compléter plus tard"></div>'+
    '<div id="newSavingsError" class="trace-savings-error" role="status"></div>'+
    '<button class="primary full" id="saveInvestmentAccount" type="button" style="margin-top:18px">Ajouter le compte</button>'+
    '<button class="secondary full" id="cancelInvestmentAccount" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelInvestmentAccount').onclick=closeSheet;
  const refreshSavings=()=>{
   const saving=['CELI','Épargne'].includes($('#investmentAccountType').value)&&$('#investmentAccountCurrency').value==='CAD';
   $('#newSavingsReference').classList.toggle('hidden',!saving);
  };
  $('#investmentAccountType').onchange=refreshSavings;
  $('#investmentAccountCurrency').onchange=refreshSavings;refreshSavings();
  $('#saveInvestmentAccount').onclick=async()=>{
    const name=$('#investmentAccountName').value.trim(),type=$('#investmentAccountType').value,currency=$('#investmentAccountCurrency').value,
      savings=['CELI','Épargne'].includes(type)&&currency==='CAD',
      openingRaw=$('#newSavingsAmount').value.trim(),openingDate=$('#newSavingsDate').value,
      openingAmount=openingRaw!==''?Number(openingRaw):null;
    if(!name||name.length>60||savings&&openingRaw!==''&&
      (!smartStrictDate(openingDate)||!Number.isFinite(openingAmount)||openingAmount<0||openingAmount>1e10)){
     $('#newSavingsError').textContent='Vérifie le nom, la date et le solde de référence.';return;
    }
    if(savings&&state.investmentAccounts.some(a=>a.owner===me&&a.name.trim().toLowerCase()===name.toLowerCase())){
     $('#newSavingsError').textContent='Un compte de patrimoine porte déjà ce nom.';return;
    }
    const item={id:investmentDocId(),owner:me,name,type,currency,fxCadPerUnit:currency==='CAD'?1:null,fxAutoUpdate:currency!=='CAD',fxRateDate:null,
      currentValueCad:0,valueCad:0,
      ...(savings?{savingsTracking:'linked',openingDate:openingRaw?openingDate:null,openingBalance:openingAmount}:{})};
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
 (!state.categories.length?'<button class="secondary full" type="button" id="traceRestoreStarterCats">Installer les catégories de départ</button>':'')+
 active.map(c=>'<button type="button" class="trace-list-btn" data-edit-category="'+esc(c.id)+'"><span>'+esc(c.name)+'</span><small>'+esc(c.type==='income'?'Revenu':categoryKind(c)==='fixed'?'Fixe':'Variable')+' ›</small></button>').join('')+traceFeedback());
 $('#newCategory').onclick=()=>editCategory();
 $('#traceRestoreStarterCats')?.addEventListener('click',async()=>{const b=$('#traceRestoreStarterCats');b.disabled=true;try{await restoreStarterCategories();manageCategories();}catch(err){b.disabled=false;traceNotice(err);}});
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

function traceCustomShares(amount,friends,partnerAmount){
 const total=Math.round(Number(amount)*100),f=Math.round(Number(friends)*100),p=Math.round(Number(partnerAmount)*100);
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(f)||!Number.isSafeInteger(p)||total<=0||f<0||p<0||f+p>total)
  throw Error('Répartition invalide : la part des amis et celle du partenaire ne peuvent dépasser le montant.');
 const mine=total-f-p;
 const split={la:mine/total*100,partner:p/total*100,friends:f/total*100};
 return{beneficiary:'custom',split,splitMode:'percent',splitAmounts:{la:mine/100,partner:p/100,friends:f/100}};
}
function traceImportSplit(row,t){
 if(row.beneficiary!=='custom')return{beneficiary:row.beneficiary,...traceSplit(row.beneficiary,Number(t.amountCAD))};
 return traceCustomShares(Number(t.amountCAD),row.friendsAmount,row.partnerAmount);
}
function traceSplit(who,a){const d=state.household.defaultSplit||{la:50,partner:50},sp=who==='couple'?{la:Number(d.la??50),partner:Number(d.partner??50)}:who==='la'?{la:100,partner:0}:{la:0,partner:100};return{split:sp,splitMode:'percent',splitAmounts:who==='couple'?{la:a*sp.la/100,partner:a*sp.partner/100}:null};}
function editSmartBankMovement(t){
 const own=visibleBankAccounts(me),eligibleSavings=trackedSavingsAccounts(me);
 const types=[['card_payment','Paiement de carte de crédit · hors budget'],['transfer','Autre transfert entre comptes · hors budget'],['savings_transfer','Versement vers CELI'],['savings_withdrawal','Retrait du CELI'],['external_transfer','Virement sortant hors budget'],['external_refund','Entrée hors budget']];
 openSheet('Mouvement bancaire',
  '<div class="empty-note">Ce mouvement modifie le solde bancaire, sans augmenter tes dépenses ni tes revenus budgétaires.</div>'+
  '<label class="label2">Nature du mouvement</label><select id="smartMovementType" class="input">'+types.map(([v,l])=>'<option value="'+v+'"'+(t.type===v?' selected':'')+'>'+l+'</option>').join('')+'</select>'+
  '<label class="label2">Libellé</label><input id="smartMovementName" class="input" maxlength="85" value="'+esc(t.name)+'">'+
  '<div class="formrow"><div><label class="label2">Montant ($)</label><input id="smartMovementAmount" type="number" min=".01" step=".01" class="input" value="'+Number(t.amountCAD)+'"></div>'+
  '<div><label class="label2">Date</label><input id="smartMovementDate" type="date" class="input" value="'+esc(t.date)+'"></div></div>'+
  '<label class="label2">Compte</label><select class="input" id="smartMovementFrom">'+own.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select>'+
  '<div id="smartMovementToWrap"><label class="label2">Vers le compte suivi</label><select class="input" id="smartMovementTo">'+state.accounts.filter(a=>a.id!==t.accountId).map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select></div>'+
  '<p class="trace-card-payment-note hidden" id="smartMovementCardNote">Paiement de carte : ton compte courant baisse, ta dette de carte diminue. Ce transfert n’augmente pas tes dépenses de budget.</p>'+
  '<div id="smartMovementSavingsWrap"><label class="label2">Compte CELI à alimenter</label><select id="smartMovementSavingsTo" class="input"><option value="">Choisir un CELI</option>'+
  eligibleSavings.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+(isReadySavingsAccount(a)?'':' · à configurer')+'</option>').join('')+'</select>'+
  '<div class="empty-note">Ce virement retire réellement de l’argent du compte courant et l’ajoute au CELI sélectionné. Ton budget de dépenses ne change pas. Vérifie le solde initial daté du CELI.</div></div>'+
  '<button id="smartMovementSave" class="primary full" style="margin-top:15px">Enregistrer la correction</button>'+
  '<button id="smartMovementRemove" class="secondary full" style="margin-top:7px">Supprimer ce mouvement</button>'+
  '<button id="smartMovementCancel" class="secondary full" style="margin-top:7px">Fermer</button>'+traceFeedback());
 $('#smartMovementType').value=t.transferPurpose==='savings'?'savings_transfer':t.transferPurpose==='savings_withdrawal'?'savings_withdrawal':
 (t.type==='transfer'&&Boolean(t.toAccountId)&&accountType(state.accounts.find(a=>a.id===t.accountId))==='checking'&&
  accountType(state.accounts.find(a=>a.id===t.toAccountId))==='card'?'card_payment':t.type);
 $('#smartMovementFrom').value=t.accountId;
 if(t.toAccountId)$('#smartMovementTo').value=t.toAccountId;
 if(t.investmentAccountId)$('#smartMovementSavingsTo').value=t.investmentAccountId;
 const sync=()=>{$('#smartMovementToWrap').classList.toggle('hidden',!['transfer','card_payment'].includes($('#smartMovementType').value));$('#smartMovementSavingsWrap').classList.toggle('hidden',!['savings_transfer','savings_withdrawal'].includes($('#smartMovementType').value));$('#smartMovementCardNote').classList.toggle('hidden',$('#smartMovementType').value!=='card_payment');};
 $('#smartMovementType').onchange=sync;sync();
 $('#smartMovementCancel').onclick=closeSheet;
 $('#smartMovementRemove').onclick=()=>deleteTransaction(t);
 $('#smartMovementSave').onclick=async()=>{
  const amount=Number($('#smartMovementAmount').value),date=$('#smartMovementDate').value,
   name=$('#smartMovementName').value.trim(),requestedType=$('#smartMovementType').value,
   type=requestedType==='savings_transfer'?'external_transfer':requestedType==='savings_withdrawal'?'external_refund':requestedType==='card_payment'?'transfer':requestedType,
   accountId=$('#smartMovementFrom').value,toAccountId=type==='transfer'?$('#smartMovementTo').value:null,
   savings=['savings_transfer','savings_withdrawal'].includes(requestedType),
   investmentAccountId=savings?$('#smartMovementSavingsTo').value:null,
   savingsAccount=state.investmentAccounts.find(a=>a.id===investmentAccountId);
  if(!(amount>0)||!Number.isFinite(amount)||amount>1e7||!smartStrictDate(date)||name.length<2||!accountId||
    type==='transfer'&&(!toAccountId||accountId===toAccountId)){
   $('#traceFeedback').textContent='Complète le montant, la date et les comptes concernés.';return;
  }
  if(savings&&(!isReadySavingsAccount(savingsAccount)||savingsAccount.owner!==me||
     accountType(state.accounts.find(a=>a.id===accountId))!=='checking'||date<=savingsAccount.openingDate)){
   $('#traceFeedback').textContent='Sélectionne un CELI configuré et un virement depuis ton compte courant, après sa date initiale.';return;
  }
  if(requestedType==='card_payment'){
   const from=state.accounts.find(a=>a.id===accountId),to=state.accounts.find(a=>a.id===toAccountId);
   if(accountType(from)!=='checking'||accountType(to)!=='card'||from.owner!==to.owner){
    $('#traceFeedback').textContent='Choisis ton compte courant comme origine et ta carte de crédit comme destination.';return;
   }
  }
  const next={...t,type,date,name,amountCAD:Math.round(amount*100)/100,amountOriginal:Math.round(amount*100)/100,accountId,toAccountId,
   categoryId:'',investmentAccountId,transferPurpose:requestedType==='card_payment'?'card_repayment':requestedType==='savings_transfer'?'savings':requestedType==='savings_withdrawal'?'savings_withdrawal':null,importFingerprint:null};
  $('#smartMovementSave').disabled=true;
  try{await saveDocument('transactions',next);Object.assign(t,next);closeSheet();renderAll();}
  catch(e){$('#smartMovementSave').disabled=false;traceNotice(e);}
 };
}
function editTransaction(id,validating=false){
 const t=state.transactions.find(x=>x.id===id);if(!t)return;
 if(t.type==='transfer'&&t.toAccountId){if(String(t.id).startsWith('t_smart_'))editSmartBankMovement(t);else openSettlement(t);return;}
 if(['external_transfer','external_refund'].includes(t.type)||t.type==='transfer'){editSmartBankMovement(t);return;}
 if(!['expense','income','refund'].includes(t.type)){openSheet('Opération','<div class="empty-note">Cette opération spéciale peut être supprimée mais pas transformée automatiquement.</div><button class="secondary full trace-danger" id="specialRemove">Supprimer</button>');$('#specialRemove').onclick=()=>deleteTransaction(t);return;}
 openSheet(validating?'Vérifier l’opération':'Modifier la transaction',
 '<label class="label2">Type</label><select id="txType" class="input"><option value="expense">Dépense</option><option value="income">Revenu</option><option value="refund">Remboursement</option></select>'+
 '<label class="label2">Description</label><input id="txName" class="input" maxlength="80" value="'+esc(t.name||t.merchant||'')+'">'+
 '<div class="formrow"><div><label class="label2">Montant CAD</label><input id="txAmount" type="number" inputmode="decimal" step="0.01" min="0.01" class="input" value="'+Number(t.amountCAD||0)+'"></div><div><label class="label2">Date</label><input id="txDate" type="date" class="input" value="'+esc(t.date||localDateISO())+'"></div></div>'+
 '<label class="label2">Catégorie</label><select id="txCategory" class="input"></select>'+
 '<div class="formrow"><div><label class="label2">Compte</label><select id="txAccount" class="input">'+[...visibleBankAccounts(me),...state.accounts.filter(a=>a.id===t.accountId&&!visibleBankAccounts(me).some(v=>v.id===a.id))].map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select></div>'+
 '<div><label class="label2">Pour qui ?</label><select id="txWho" class="input"><option value="'+esc(me)+'">Moi</option><option value="'+esc(partner)+'">'+esc(shortMemberName(partner))+'</option><option value="couple">Nous deux</option><option value="custom">Avec amis · personnalisé</option></select></div></div>'+
 '<div class="trace-manual-friends hidden" id="txCustomGroup"><b>Répartition avec des amis</b>'+
 '<div class="formrow"><div><label class="label2">Part des amis ($)</label><input class="input" id="txFriendsAmount" type="number" inputmode="decimal" step=".01" min="0" value="'+esc(Number(t.splitAmounts?.friends||0))+'"></div>'+
 '<div><label class="label2">Part de '+esc(shortMemberName(partner))+' ($)</label><input class="input" id="txPartnerAmount" type="number" inputmode="decimal" step=".01" min="0" value="'+esc(Number(t.splitAmounts?.partner||0))+'"></div></div>'+
 '<small>Le reste sera ta part. Les amis ne sont pas comptés dans les dettes du couple.</small></div>'+
 '<button class="primary full" id="txSave" style="margin-top:18px">Enregistrer</button>'+
 (validating?'<button class="secondary full" id="txValidate" style="margin-top:8px">Valider cette opération</button>':'')+
 '<button class="secondary full trace-danger" id="txRemove" style="margin-top:8px">Supprimer</button><button class="secondary full" id="txCancel" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#txType').value=t.type;$('#txAccount').value=t.accountId||'';$('#txWho').value=t.beneficiary||me;
 const syncCustom=()=>{$('#txCustomGroup').classList.toggle('hidden',$('#txWho').value!=='custom'||$('#txType').value!=='expense');};
 $('#txWho').onchange=syncCustom;
 const cats=()=>{const typ=$('#txType').value,ls=manualCategories(typ);const old=state.categories.find(c=>c.id===t.categoryId);if(old&&!ls.includes(old))ls.push(old);$('#txCategory').innerHTML=ls.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');if(ls.some(c=>c.id===t.categoryId))$('#txCategory').value=t.categoryId;$('#txWho').disabled=typ==='income';$('#txWho').querySelector('[value="custom"]').disabled=typ!=='expense';if(typ!=='expense'&&$('#txWho').value==='custom')$('#txWho').value=me;syncCustom();};
 $('#txType').onchange=cats;cats();
 $('#txCancel').onclick=closeSheet;$('#txRemove').onclick=()=>deleteTransaction(t);
 async function save(confirm){
  const amount=Number($('#txAmount').value),type=$('#txType').value,date=$('#txDate').value,name=$('#txName').value.trim(),categoryId=$('#txCategory').value,accountId=$('#txAccount').value,beneficiary=type==='income'?t.payerId||me:$('#txWho').value;
  if(!(amount>0)||!Number.isFinite(amount)||!date||!name||!categoryId||!accountId){$('#traceFeedback').textContent='Complète tous les champs obligatoires.';return;}
  let sharing;
  try{sharing=beneficiary==='custom'?traceCustomShares(amount,$('#txFriendsAmount').value,$('#txPartnerAmount').value):{beneficiary,...traceSplit(beneficiary,amount)};}
  catch(e){$('#traceFeedback').textContent=e.message;return;}
  const next={...t,amountCAD:amount,amountOriginal:amount,date,name,type,categoryId,accountId,...sharing,status:confirm?'confirmed':t.status};
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
function budgetScopeChoices(value){
 return '<label class="label2" style="margin-top:12px">Ce budget concerne</label>'+
  '<select class="input" id="budgetAllocationScope">'+
  '<option value="'+esc(me)+'"'+(value===me?' selected':'')+'>Moi uniquement (100 %)</option>'+
  '<option value="couple"'+(value==='couple'?' selected':'')+'>Nous deux · répartir le total</option></select>';
}
function budgetAmountField(id,amount){
 return '<label class="label2" style="margin-top:12px">Montant total prévu</label>'+
  '<div class="budget-amount-field"><input class="input" id="'+id+'" type="number" inputmode="decimal" min="0" step=".01" value="'+
  (Number.isFinite(Number(amount))?Number(amount):0)+'" placeholder="0,00"><span>$</span></div>';
}
function openBudgetAdd(kind='variable'){
 const cats=budgetCategoriesFor(kind);
 const initialScope=budgetScope==='mine'?me:'couple';
 if(!cats.length){openSheet('Ajouter au budget','<div class="empty-note">Ajoute d’abord une catégorie correspondant à ce poste. Si tu viens de créer ton foyer, initialise les catégories de départ dans Gérer les catégories.</div>'+
 '<button class="secondary full" id="budgetNoCatBack" type="button">Fermer</button>');
 $('#budgetNoCatBack').onclick=closeSheet;return;}
 const options=cats.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
 openSheet('Ajouter au budget',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(monthLabel(budgetMonth))+
  '</b><small>'+esc(budgetKindLabel(kind))+' · montant unique réparti si besoin</small></div></div>'+
  '<label class="label2">Catégorie</label><select class="input" id="budgetAddCategory">'+options+'</select>'+
  budgetScopeChoices(initialScope)+budgetAmountField('budgetAddAmount',0)+budgetShareFields(null,initialScope,0)+
  '<div id="traceBudgetShareError" role="status" class="trace-budget-share-error"></div>'+
  '<button class="primary full" id="saveBudgetAdd" type="button" style="margin-top:18px">Ajouter au budget</button>'+
  '<button class="secondary full" id="cancelBudgetAdd" type="button" style="margin-top:8px">Annuler</button>'
 );
 $('#cancelBudgetAdd').onclick=closeSheet;
 const allocation=bindBudgetShareFields('#budgetAllocationScope','#budgetAddAmount');
 $('#saveBudgetAdd').onclick=async()=>{
  const categoryId=$('#budgetAddCategory').value,amount=Number($('#budgetAddAmount').value),
   owner=$('#budgetAllocationScope').value;
  const error=$('#traceBudgetShareError');
  if(!categoryId||!Number.isFinite(amount)||amount<0||amount>1e9){error.textContent='Vérifie la catégorie et le montant.';return;}
  const rounded=Math.round(amount*100)/100;
  let split;
  try{split=allocation();}
  catch(e){error.textContent=e.message;return;}
  if(owner!==me&&owner!=='couple'){error.textContent='Choisis à qui appartient ce budget.';return;}
  const existing=state.budgets.find(b=>b.month===budgetMonth&&b.scope===owner&&b.categoryId===categoryId);
  const item={...(existing||{}),id:existing?.id||budgetDocId(),month:budgetMonth,scope:owner,categoryId,amount:rounded};
  if(owner==='couple')item.shareAmounts=split;
  else delete item.shareAmounts;
  const btn=$('#saveBudgetAdd');btn.disabled=true;btn.textContent='Enregistrement…';
  try{
   await saveDocument('budgets',item);
   if(existing)Object.assign(existing,item);else state.budgets.push(item);
   closeSheet();renderBudget();renderHome();
  }catch(err){btn.disabled=false;btn.textContent='Réessayer';error.textContent='Impossible de synchroniser. Réessaie.';console.error(err);}
 };
}
function openBudgetEdit(id){
 const item=state.budgets.find(b=>b.id===id);
 if(!item)return;
 const category=cat(item.categoryId);
 openSheet('Modifier le budget',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('calendar')+'</span><div><b>'+esc(category.name)+
  '</b><small>'+esc(monthLabel(item.month))+' · '+(item.scope==='couple'?'Budget commun':'Budget personnel')+'</small></div></div>'+
  budgetScopeChoices(item.scope)+budgetAmountField('budgetEditAmount',item.amount)+
  budgetShareFields(item,item.scope,Number(item.amount||0))+
  '<div id="traceBudgetShareError" role="status" class="trace-budget-share-error"></div>'+
  '<button class="primary full" id="saveBudgetEdit" type="button" style="margin-top:18px">Enregistrer</button>'+
  '<button class="secondary full trace-danger" id="deleteBudgetEdit" type="button" style="margin-top:8px">Supprimer ce poste du mois</button>'+
  '<button class="secondary full" id="cancelBudgetEdit" type="button" style="margin-top:8px">Annuler</button>'
 );
 $('#cancelBudgetEdit').onclick=closeSheet;
 const allocation=bindBudgetShareFields('#budgetAllocationScope','#budgetEditAmount');
 if(item.scope==='couple')$('#budgetShareFields').dataset.visited='yes';
 $('#deleteBudgetEdit').onclick=()=>{
  openSheet('Supprimer ce poste de budget','<div class="empty-note">Supprimer '+esc(cat(item.categoryId).name)+
  ' du budget de '+esc(monthLabel(item.month))+
  ' ? Les transactions réelles ne seront pas supprimées.</div><button class="primary full" id="confirmBudgetDelete" style="margin-top:14px">Confirmer</button>'+
  '<button class="secondary full" id="cancelBudgetDelete">Annuler</button>'+traceFeedback());
  $('#cancelBudgetDelete').onclick=()=>openBudgetEdit(item.id);
  $('#confirmBudgetDelete').onclick=async()=>{
   $('#confirmBudgetDelete').disabled=true;
   try{await removeDocument('budgets',item.id);state.budgets=state.budgets.filter(b=>b.id!==item.id);closeSheet();renderAll();}
   catch(e){$('#confirmBudgetDelete').disabled=false;traceNotice(e);}
  };
 };
 $('#saveBudgetEdit').onclick=async()=>{
  const amount=Number($('#budgetEditAmount').value),owner=$('#budgetAllocationScope').value,
   error=$('#traceBudgetShareError');
  if(!Number.isFinite(amount)||amount<0||amount>1e9||![me,'couple'].includes(owner)){error.textContent='Montant ou attribution invalide.';return;}
  const rounded=Math.round(amount*100)/100;
  if(owner!==item.scope&&state.budgets.some(b=>b.id!==item.id&&b.month===item.month&&b.categoryId===item.categoryId&&b.scope===owner)){
   error.textContent='Un poste existe déjà dans cette catégorie pour cette attribution. Modifie-le directement pour éviter un doublon.';return;
  }
  let split;
  try{split=allocation();}
  catch(e){error.textContent=e.message;return;}
  const next={...item,amount:rounded,scope:owner};
  if(owner==='couple')next.shareAmounts=split;
  else delete next.shareAmounts;
  const btn=$('#saveBudgetEdit');btn.disabled=true;
  try{
   await saveDocument('budgets',next);Object.assign(item,next);
   closeSheet();renderBudget();renderHome();
  }catch(err){console.error(err);btn.disabled=false;error.textContent='Impossible de synchroniser. Réessaie.';}
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
function txRow(t){const c=cat(t.categoryId),pos=['income','refund','external_refund'].includes(t.type),transfer=t.type==='transfer',outside=!isFinancialPeriod(t),label=transfer?(t.toAccountId&&accountType(state.accounts.find(a=>a.id===t.accountId))==='checking'&&
 accountType(state.accounts.find(a=>a.id===t.toAccountId))==='card'?'Paiement de carte de crédit · hors budget':'Transfert entre comptes · hors budget'):t.type==='external_transfer'?(t.transferPurpose==='savings'?(t.investmentAccountId?'Versement vers CELI · '+esc(state.investmentAccounts.find(a=>a.id===t.investmentAccountId)?.name||'CELI')+' · compte courant':'Versement vers CELI · CELI à relier'):t.transferPurpose==='savings_withdrawal'?'Retrait de CELI':'Virement hors budget'):t.type==='external_refund'?'Entrée hors budget':esc(c.name);return `<button type="button" class="tx trace-tx-link ${outside?'trace-outside-start':''}" data-tx-open="${esc(t.id)}"><span class="tx-icon">${esc(c.icon||'◇')}</span><span class="tx-main"><b>${esc(t.name||t.merchant||'Transaction')}</b><small>${label} · ${esc(t.date||'')}${outside?' · Hors solde de départ':''}</small></span><span class="tx-amt ${pos?'positive':''}">${transfer?(t.toAccountId?'↔ ':'−'):pos?'+':'−'}${money(t.amountCAD)}</span></button>`;}

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
   box.innerHTML='<article class="card"><b>'+esc(file.name)+'</b><div class="empty-note">Associe les colonnes, puis importe dans « À vérifier ». Aucune ligne n’est comptabilisée avant validation.</div>'+
    '<div class="trace-csv-fields">'+[['date','Date'],['name','Description'],['amount','Montant signé'],['debit','Débit'],['credit','Crédit']].map(([k,l])=>'<label class="label2">'+l+'<select class="input" id="csvCol_'+k+'">'+options(suggested[k])+'</select></label>').join('')+'</div>'+
    '<div class="formrow"><div><label class="label2">Format de date</label><select class="input" id="csvDateFormat"><option value="dmy">JJ/MM/AAAA</option><option value="mdy">MM/JJ/AAAA</option></select></div><div><label class="label2">Montant positif</label><select class="input" id="csvSign"><option value="income">Revenu</option><option value="expense">Dépense</option></select></div></div>'+
    '<label class="label2">Compte concerné</label><select class="input" id="csvAccount">'+accts.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select>'+
    '<div class="empty-note" style="margin:12px 0">'+rows.length+' lignes détectées. Vérifie la correspondance avec les colonnes de ta banque avant d’importer.</div>'+
    '<button class="primary full" id="csvPreview">Prévisualiser</button><div id="csvPreviewResult"></div></article>';
   const preferred=visibleBankAccounts(me).find(a=>a.id===$('#importFile')?.dataset.preferredAccount);if(preferred&&$('#csvAccount'))$('#csvAccount').value=preferred.id;
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
      (result.all.length?'<button class="primary full" id="csvCommit" style="margin-top:14px">Importer '+result.all.length+' opération(s) à vérifier</button>':'');
     if(!result.all.length)return;
     $('#csvCommit').onclick=async()=>{
      const btn=$('#csvCommit');btn.disabled=true;let saved=0;
      try{
       for(const t of result.all){if(csvImportedDuplicate(t,state.transactions))continue;await saveDocument('transactions',t);state.transactions.push(t);saved++;}
       renderAll();navigate('activity');showTab('review');
       $('#importResult').textContent=saved+' opération(s) placée(s) dans À vérifier.';
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
 const target=t.type==='income'?'income':'expense';
 const active=state.categories.filter(c=>c.type===target&&!c.archived);
 const available=id=>active.some(c=>c.id===id);
 if(available(t.categoryId))return{categoryId:t.categoryId,reason:'Catégorie conservée'};
 const norm=normalizedMerchant(t.name);
 if(!norm)return{categoryId:'',reason:'Catégorie à choisir'};
 // Personal learning: confirmed selections for this merchant take priority.
 const matches=state.transactions.filter(x=>x.id!==t.id&&x.status==='confirmed'&&
   (x.type==='refund'?'expense':x.type==='income'?'income':'expense')===target&&available(x.categoryId)&&
   normalizedMerchant(x.name)===norm);
 if(matches.length){
  const totals=new Map();
  matches.forEach(x=>totals.set(x.categoryId,(totals.get(x.categoryId)||0)+1));
  const best=[...totals].sort((a,b)=>b[1]-a[1])[0];
  return{categoryId:best[0],reason:'Déjà choisi pour ce commerçant'};
 }
 // High precision patterns, limited to active categories. Unknown merchants are not guessed.
 const rules=target==='income'?
  [{re:/\b(salaire|payroll|paie|paycheck|paye)\b/,id:'salary'},
   {re:/\b(prime|bonus employeur)\b/,id:'bonus'}]:
  [
   {re:/\b(gourmet frutti|fruiterie|epicerie|supermarche|provigo|metro|iga|costco|maxi|loblaws|super c|boulangerie|fromagerie|march[eé])\b/,id:'groceries'},
   {re:/\b(resto|restaurant|mcdonald|mc donald|burger|pizzeria|pizza|rotisserie|sushi|subway|a&w|tim hortons|ubereats|uber eats|doordash|skipthe|comptoir de mamie)\b/,id:'restaurants'},
   {re:/\b(boutique courir|courir montre|running room|decathlon|sport experts|sporting life)\b/,id:'sport'},
   {re:/\b(opus|stm|exo|metrobus|chron[o-]?recharge|transport collectif)\b/,id:'transport'},
   {re:/\b(taxi|uber trip|uber rides|lyft)\b/,id:'transport'},
   {re:/\b(apple subscription|spotify|netflix|disney plus|youtube premium|vercel domains?|live tennis api)\b/,id:'subscriptions'},
   {re:/\b(saq|concert|festival|piknic electronik|picnic electronik|cinema|billetterie)\b/,id:'restaurants'},
   {re:/\b(pharmacie|jean coutu|pharmaprix|medecin|clinique)\b/,id:'medical'},
   {re:/\b(loyer|rent payment)\b/,id:'rent'},
   {re:/\b(rogers|videotron|fizz mobile|bell mobilite|forfait cellulaire)\b/,id:'phone'}
  ];
 const found=rules.find(rule=>available(rule.id)&&rule.re.test(norm));
 return found?{categoryId:found.id,reason:'Suggestion à vérifier · commerçant'}:
   {categoryId:'',reason:'Catégorie à choisir'};
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
 '<p class="trace-batch-intro">Chaque dépense conserve sa propre répartition ; corrige uniquement les exceptions.</p>'+
 '<div class="trace-batch-list">'+pending.map((t,i)=>{
  const cats=available(t),guess=suggested[i];
  return '<div class="trace-batch-item" data-batch="'+i+'">'+
    '<div class="trace-batch-line"><div><b>'+esc(t.name)+'</b><small>'+esc(t.date)+' · '+esc(guess.reason)+'</small></div><strong>'+money(t.amountCAD)+'</strong></div>'+
    '<div class="trace-batch-fields"><label>Catégorie<select class="input batchCategory">'+
      '<option value="">Choisir la catégorie…</option>'+
      cats.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===guess.categoryId?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>'+
    '<label>Pour qui ?<select class="input batchWho"><option value="'+esc(me)+'"'+(t.beneficiary===me?' selected':'')+'>Moi</option><option value="couple"'+(t.beneficiary==='couple'?' selected':'')+'>Nous deux</option><option value="'+esc(partner)+'"'+(t.beneficiary===partner?' selected':'')+'>'+esc(shortMemberName(partner))+'</option><option value="custom"'+(t.beneficiary==='custom'?' selected':'')+'>Avec amis / personnalisé</option></select></label></div>'+
 '<div class="trace-batch-custom'+(t.beneficiary==='custom'?'':' hidden')+'"><label>Part des amis ($)<input class="input batchFriends" type="number" min="0" step=".01" value="'+esc(Number(t.splitAmounts?.friends||0))+'"></label>'+
 '<label>Part de '+esc(shortMemberName(partner))+' ($)<input class="input batchPartner" type="number" min="0" step=".01" value="'+esc(Number(t.splitAmounts?.partner||0))+'"></label></div></div>';
 }).join('')+'</div>'+
 '<button id="batchSave" class="primary full" style="margin-top:14px">Confirmer les '+pending.length+' opérations</button>'+
 '<button id="batchLater" class="secondary full" style="margin-top:8px">Laisser en attente</button>'+
 '<div class="trace-feedback" id="batchFeedback" role="status"></div>');
 const groups=$$('#sheetBody [data-batch]');
 groups.forEach(el=>{
  el.querySelector('.batchWho').onchange=()=>el.querySelector('.trace-batch-custom').classList.toggle('hidden',el.querySelector('.batchWho').value!=='custom');
 });
 $('#batchLater').onclick=()=>{closeSheet();renderAll();navigate('activity');showTab('review');};
 $('#batchSave').onclick=async()=>{
  const selected=groups.map((el,i)=>({t:pending[i],categoryId:el.querySelector('.batchCategory').value,
   beneficiary:el.querySelector('.batchWho').value,
   friendsAmount:Number(el.querySelector('.batchFriends').value),partnerAmount:Number(el.querySelector('.batchPartner').value)}));
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
    const share=traceImportSplit({...x,beneficiary},x.t);
    const next={...x.t,categoryId:x.categoryId,...share,status:'confirmed'};
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
 const pending=pendingReviewByAccount();
 if(activityReviewAccount==='all'&&new Set(pending.map(t=>t.accountId)).size>1){openSheet('Choisir un compte','<div class="empty-note">Choisis d’abord un compte pour valider des opérations ensemble.</div>');return;}
 const ready=pending.filter(t=>t.date&&Number(t.amountCAD)>0&&state.categories.some(c=>c.id===t.categoryId)&&state.accounts.some(a=>a.id===t.accountId)&&['la','partner','couple','custom'].includes(t.beneficiary));
 if(!ready.length){openSheet('Vérification','<div class="empty-note">Aucune opération complète. Ouvre une transaction dans « À vérifier » pour préciser sa catégorie ou sa répartition.</div>');return;}
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
 const draftCount=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.accountId===accountId&&d.date===date&&d.status==='pending').length;
 return{entry:x||null,pending:tx.filter(t=>t.status!=='confirmed').length+draftCount,drafts:draftCount,confirmed:tx.filter(t=>t.status==='confirmed').length,unresolved:Math.max(0,Number(x?.unresolvedCount)||0),transactions:tx.length};
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
 if(!empty&&!old&&!state.transactions.some(t=>t.accountId===accountId&&t.date===date&&t.status==='confirmed'))throw Error('Ajoute d’abord une capture ou une opération à cette journée.');
 if(!empty&&dayTx.length)throw Error('Il reste '+dayTx.length+' opération(s) à vérifier pour cette journée.');
 if(state.smartImports.some(d=>d.kind==='smart_draft'&&d.status==='pending'&&d.accountId===accountId&&d.date===date))
  throw Error('Des opérations de cette journée attendent leur vérification.');

 if(Number(old?.unresolvedCount)>0)throw Error('Des lignes de capture sont encore à revérifier pour cette journée.');
 if(state.smartImports.some(d=>d.kind==='smart_draft'&&d.accountId===accountId&&d.status==='pending'&&!d.date))
  throw Error('Des opérations sans date sont encore à renseigner pour ce compte.');
 if(empty&&(state.transactions.some(t=>t.accountId===accountId&&t.date===date)||
  state.smartImports.some(d=>d.kind==='smart_draft'&&d.status==='pending'&&d.accountId===accountId&&d.date===date)))
  throw Error('Des opérations sont présentes ce jour. Ne déclare pas cette journée sans mouvement.');
 const next={...(old||{}),id:importDayKey(accountId,date),accountId,date,owner:me,status:empty?'empty':'checked',checkedAt:new Date().toISOString(),captureCount:Number(old?.captureCount)||0,sourceKind:old?.sourceKind||'manual'};
 await saveDocument('import_days',next);
 if(old)Object.assign(old,next);else state.importDays.push(next);
 window.TraceImportCalendar?.render?.();
 return next;
}
async function flagDayAttention(accountId,date,count){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))throw Error('Compte ou date invalide.');
 if(!Number.isInteger(count)||count<1||count>150)throw Error('Nombre de lignes à revoir invalide.');
 const id=importDayKey(accountId,date),old=state.importDays.find(x=>x.accountId===accountId&&x.date===date);
 const next={...(old||{}),id,accountId,date,owner:me,status:'received',unresolvedCount:Math.min(999,(Number(old?.unresolvedCount)||0)+count),captureCount:Number(old?.captureCount)||0,sourceKind:old?.sourceKind||'image'};
 await saveDocument('import_days',next);
 if(old)Object.assign(old,next);else state.importDays.push(next);
 window.TraceImportCalendar?.render?.();
 return next;
}
async function clearDayAttention(accountId,date){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw Error('Compte bancaire invalide.');
 const old=state.importDays.find(x=>x.accountId===accountId&&x.date===date);
 if(!old||!(Number(old.unresolvedCount)>0))return old||null;
 const next={...old,status:'received',unresolvedCount:0,checkedAt:null};
 await saveDocument('import_days',next);Object.assign(old,next);
 window.TraceImportCalendar?.render?.();return next;
}

function smartStrictDate(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;
 const d=new Date(s+'T12:00:00');
 return !isNaN(+d)&&d.getFullYear()===Number(s.slice(0,4))&&d.getMonth()+1===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8,10));
}
function smartDuplicateMatches(id,values={}){
 const d=state.smartImports.find(x=>x.kind==='smart_draft'&&x.id===id);
 if(!d)return[];
 const day=values.date||d.date,name=normalizedMerchant(values.name||d.name);
 const val=values.amount===undefined?(d.amount??d.suggestedAmount):values.amount;
 const amt=val===null||val===''||!(Number(val)>0)?null:Number(val);
 if(!day||name.length<3)return[];
 const sameName=s=>{const n=normalizedMerchant(s);return n.length>=3&&(n===name||
   n.length>=4&&name.length>=4&&(n.includes(name)||name.includes(n))||
   n.split(' ').some(w=>w.length>=5&&name.split(' ').includes(w)));};
 const sameAmount=(value,suggested)=>{
  const evidence=value!=null&&Number(value)>0?Number(value):
   suggested!=null&&Number(suggested)>0?Number(suggested):null;
  // An unreadable amount cannot establish a matching financial transaction.
   return amt!==null&&evidence!==null&&Math.abs(evidence-amt)<.009;
 };
 const out=[];
 state.smartImports.forEach(x=>{if(x.id!==id&&x.kind==='smart_draft'&&x.accountId===d.accountId&&x.date===day&&
  x.status==='pending'&&sameName(x.name)&&sameAmount(x.amount,x.suggestedAmount))out.push({
   id:x.id,name:x.name,date:x.date,amount:x.amount,status:x.status,
   exact:amt!==null&&Number(x.amount)>0&&Math.abs(Number(x.amount)-amt)<.009});});
 state.transactions.forEach(x=>{if(x.accountId===d.accountId&&x.date===day&&sameName(x.name)&&sameAmount(x.amountCAD,null))
  out.push({id:x.id,name:x.name,date:x.date,amount:x.amountCAD,status:'recorded',
   exact:amt!==null&&Math.abs(Number(x.amountCAD)-amt)<.009});});
 return out.sort((a,b)=>Number(b.exact)-Number(a.exact)).slice(0,5);
}
function smartDrafts(accountId,date=null){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId))return[];
 return state.smartImports.filter(d=>d.kind==='smart_draft'&&d.accountId===accountId&&d.status==='pending'&&(date===null||d.date===date)).map(d=>({...d}));
}
async function smartStageRows(accountId,fileName,rows){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw Error('Compte inaccessible.');
 if(!Array.isArray(rows)||rows.length>100)throw Error('Capture trop longue.');
 let added=0,unknown=0,recovered=0,matched=0,suppressed=0;const dates=new Set(),usedDrafts=new Set();
 for(let i=0;i<rows.length;i++){
  const r=rows[i],name=String(r.name||'').trim().slice(0,85);
  if(name.length<2)continue;
  const date=smartStrictDate(String(r.date||''))?String(r.date):'';
  const amount=Number(r.amount);
  const value=r.amount!==null&&r.amount!==''&&Number.isFinite(amount)&&amount>0&&amount<1e7?Math.round(amount*100)/100:null;
  const proposed=Number(r.suggestedAmount);
  const suggestedAmount=r.suggestedAmount!==null&&r.suggestedAmount!==''&&Number.isFinite(proposed)&&proposed>0&&proposed<1e7?Math.round(proposed*100)/100:null;
  const preview=typeof r.sourcePreview==='string'&&r.sourcePreview.startsWith('data:image/jpeg;base64,')&&
   r.sourcePreview.length<105000?r.sourcePreview:null;
  // Improved recognition must reuse earlier pending drafts, even if the
  // first word of a merchant was previously cropped or OCR row indices shifted.
  const currentName=normalizedMerchant(name);
  const comparableAmount=value??suggestedAmount;
  const fileBase=x=>String(x||'').replace(/\s*\(\d+\)(?=\.[^.]+$)/,'').toLowerCase();
  const resembles=label=>{const n=normalizedMerchant(label);
   return n.length>=4&&currentName.length>=4&&(n.includes(currentName)||currentName.includes(n));};
  const merchantOccurrences=rows.filter(x=>String(x.date||'')===date&&
   (()=>{const n=normalizedMerchant(x.name);return n.length>=4&&(n.includes(currentName)||currentName.includes(n));})()).length;
  const matches=state.smartImports.filter(d=>
   d.kind==='smart_draft'&&d.accountId===accountId&&d.status==='pending'&&
   fileBase(d.sourceFileName)===fileBase(String(fileName).slice(0,110))&&!usedDrafts.has(d.id)&&
   (!d.date||!date||d.date===date)&&resembles(d.name)&&
   (()=>{
     const oldEvidence=Number(d.amount)>0?Number(d.amount):
      Number(d.suggestedAmount)>0?Number(d.suggestedAmount):null;
     if(merchantOccurrences>1||oldEvidence!==null){
       // Two payments at the same bank on the same day must only be
       // reattached when each has an exact amount, even for old OCR drafts.
       return oldEvidence!==null&&comparableAmount!==null&&
         Math.abs(oldEvidence-comparableAmount)<.009;
     }
     return true;
   })()
  ).sort((a,b)=>{
   const score=d=>(d.date&&date&&d.date===date?12:0)+
     (Number(d.sourceIndex)===i?3:0)+Math.min(normalizedMerchant(d.name).length,currentName.length)/100;
   return score(b)-score(a)||Number(a.sourceIndex)-Number(b.sourceIndex);
  });
  const prior=matches[0];
  if(prior){
   usedDrafts.add(prior.id);matched++;
   if(date&&!prior.date){
    const corrected={...prior,date,needsDateReview:false,
      ...(preview&&prior.sourcePreviewVersion!==2?{sourcePreview:preview,sourcePreviewVersion:2}:{}),
      ...(suggestedAmount&&!prior.suggestedAmount?{suggestedAmount}:{}),
      ...(name.length>prior.name.length&&normalizedMerchant(name).includes(normalizedMerchant(prior.name))?{name}:{})};
    await saveDocument('imports',corrected);Object.assign(prior,corrected);
    dates.add(date);recovered++;
   }
   const betterName=name.length>prior.name.length&&normalizedMerchant(name).includes(normalizedMerchant(prior.name));
   const upgrades={...(preview&&prior.sourcePreviewVersion!==2?{sourcePreview:preview,sourcePreviewVersion:2}:{}),
     ...(suggestedAmount&&!prior.suggestedAmount?{suggestedAmount}:{}),
     ...(betterName?{name}:{})};
   if(Object.keys(upgrades).length){
    const updated={...prior,...upgrades};await saveDocument('imports',updated);Object.assign(prior,updated);
   }
   continue;
  }
  const signature=[accountId,fileName,i,date,name.toLowerCase(),value].join('|');
  // Re-import of a previously excluded/confirmed line must not resurrect it.
  const priorHandled=state.smartImports.some(d=>d.kind==='smart_draft'&&d.accountId===accountId&&
   fileBase(d.sourceFileName)===fileBase(String(fileName).slice(0,110))&&['ignored','done'].includes(d.status)&&
   (!d.date||!date||d.date===date)&&
   (Number(d.amount)>0||Number(d.suggestedAmount)>0?
      comparableAmount!==null&&Math.abs(Number(d.amount||d.suggestedAmount)-comparableAmount)<.009:
     Number(d.sourceIndex)===i&&merchantOccurrences===1)&&
   (resembles(d.name)||
    (Number(d.sourceIndex)===i&&comparableAmount!==null&&d.date===date)));
  if(priorHandled){suppressed++;continue;}
  if(state.smartImports.some(d=>d.kind==='smart_draft'&&d.signature===signature&&d.status!=='reset'))continue;
  const item={id:'smart_'+txDocId(),kind:'smart_draft',accountId,date,name,amount:value,type:String(r.type||'unknown'),
   sourceFileName:String(fileName).slice(0,110),sourceIndex:i,signature,status:'pending',
   needsAmountReview:!!r.needsReview||value===null,needsDateReview:!!r.needsDateReview||!date,
   ...(suggestedAmount?{suggestedAmount}:{}),...(preview?{sourcePreview:preview,sourcePreviewVersion:2}:{}),
   raw:String(r.raw||'').slice(0,200),createdAt:new Date().toISOString()};
  await saveDocument('imports',item);state.smartImports.push(item);added++;
  if(date)dates.add(date);else unknown++;
 }
 for(const date of dates){try{await recordDayImport(accountId,date,'image');}catch(e){console.warn('Calendrier non mis à jour',e);}}
 window.TraceImportCalendar?.render?.();return{added,unknown,recovered,matched,suppressed,dates:[...dates]};
}
async function smartSaveDraft(id,patch){
 const old=state.smartImports.find(d=>d.id===id&&d.kind==='smart_draft'&&d.status==='pending');
 if(!old||!visibleBankAccounts(me).some(a=>a.id===old.accountId))throw Error('Ligne indisponible.');
 const date=String(patch.date||''),name=String(patch.name||'').trim().slice(0,85);
 if(!smartStrictDate(date)||name.length<2)throw Error('Vérifie la date et le libellé.');
 const previousDate=old.date;
 const next={...old,date,name,needsDateReview:false};
 await saveDocument('imports',next);Object.assign(old,next);
 // A previously undated line must create its new calendar day without posting financial data.
 if(date!==previousDate||!state.importDays.some(x=>x.accountId===old.accountId&&x.date===date)){
  try{await recordDayImport(old.accountId,date,'image');}
  catch(e){console.warn('Journée à synchroniser',e);}
 }
 window.TraceImportCalendar?.render?.();return {...next};
}
async function smartMoveDraftAccount(id,targetAccountId){
 const old=state.smartImports.find(d=>d.id===id&&d.kind==='smart_draft'&&d.status==='pending');
 const target=visibleBankAccounts(me).find(a=>a.id===targetAccountId);
 if(!old||!visibleBankAccounts(me).some(a=>a.id===old.accountId)||!target)
  throw Error('Compte ou opération inaccessible.');
 if(old.accountId===targetAccountId)return {...old};
 // Change only the origin of the pending import. No existing transaction is edited,
 // confirmed, duplicated, or recorded in the budget.
 const next={...old,accountId:targetAccountId};
 await saveDocument('imports',next);Object.assign(old,next);
 window.TraceImportCalendar?.render?.();
 return {...next};
}

async function smartMoveDayDraftsAccount(accountId,date,targetAccountId,expectedIds){
 const accounts=visibleBankAccounts(me);
 const from=accounts.find(a=>a.id===accountId),to=accounts.find(a=>a.id===targetAccountId);
 if(!from||!to||accountType(from)!=='checking'||accountType(to)!=='card'||!smartStrictDate(date))
  throw Error('Choisis ton compte courant, ta carte et une date valide.');
 if(!Array.isArray(expectedIds)||expectedIds.length<2||expectedIds.length>150||
  new Set(expectedIds).size!==expectedIds.length)throw Error('Sélection de brouillons incorrecte.');
 const pending=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.status==='pending'&&
  d.accountId===accountId&&d.date===date);
 if(pending.length!==expectedIds.length||!pending.every(d=>expectedIds.includes(d.id)))
  throw Error('Les brouillons ont changé. Rouvre la journée et réessaie.');
 let moved=0;
 try{
  for(const d of pending){
   const next={...d,accountId:targetAccountId};
   await saveDocument('imports',next);
   Object.assign(d,next);moved++;
  }
  // The original bank's daily audit entry remains untouched. No transaction is confirmed.
  await recordDayImport(targetAccountId,date,'image');
 }catch(error){
  window.TraceImportCalendar?.render?.();
  throw Error(moved?'Déplacement partiel possible : vérifie les deux comptes dans le calendrier. '+String(error.message||error):
   String(error.message||error));
 }
 window.TraceImportCalendar?.render?.();
 return {moved};
}


async function smartKeepSingleDraft(keepId,duplicateIds){
 const keep=state.smartImports.find(d=>d.id===keepId&&d.kind==='smart_draft'&&d.status==='pending');
 if(!keep||!visibleBankAccounts(me).some(a=>a.id===keep.accountId)||!smartStrictDate(keep.date))
  throw Error('Cette opération n’est plus disponible. Rouvre la journée.');
 if(!Array.isArray(duplicateIds)||duplicateIds.length<1||duplicateIds.length>5||
  new Set(duplicateIds).size!==duplicateIds.length||duplicateIds.includes(keepId))
  throw Error('Sélection de copies incorrecte.');
 // Recompute similarity against the current documents immediately before changing anything.
 const permitted=smartDuplicateMatches(keepId).filter(m=>m.status==='pending');
 const copies=duplicateIds.map(id=>{
  if(!permitted.some(p=>p.id===id))throw Error('Les copies ont changé. Rouvre la journée.');
  const found=state.smartImports.find(d=>d.id===id&&d.kind==='smart_draft'&&d.status==='pending'&&
   d.accountId===keep.accountId&&d.date===keep.date);
  if(!found)throw Error('L’une des copies a déjà été traitée.');
  return found;
 });
 let excluded=0;
 for(const copy of copies){
  const next={...copy,status:'ignored',ignoreReason:'duplicate_copy',
   duplicateOfId:keepId,resolvedAt:new Date().toISOString()};
  try{await saveDocument('imports',next);Object.assign(copy,next);excluded++;}
  catch(e){
   window.TraceImportCalendar?.render?.();
   throw Error(excluded+' copie(s) écartée(s). Vérifie la journée avant de réessayer : '+String(e.message||e));
  }
 }
 // Kept draft is still pending. No transactions or balances have been changed.
 window.TraceImportCalendar?.render?.();
 return{kept:keepId,excluded,transactionsCreated:0};
}

async function smartIgnoreDraft(id){
 const d=state.smartImports.find(x=>x.id===id&&x.kind==='smart_draft'&&x.status==='pending');
 if(!d||!visibleBankAccounts(me).some(a=>a.id===d.accountId))throw Error('Ligne indisponible.');
 const next={...d,status:'ignored',resolvedAt:new Date().toISOString()};
 await saveDocument('imports',next);Object.assign(d,next);
 window.TraceImportCalendar?.render?.();return true;
}
async function smartApproveDraft(id,v){
 const d=state.smartImports.find(x=>x.id===id&&x.kind==='smart_draft'&&x.status==='pending');
 if(!d||!visibleBankAccounts(me).some(a=>a.id===d.accountId))throw Error('Ligne indisponible.');
 if(!v?.verified)throw Error('Vérifie d’abord cette ligne.');
 if(d.needsAmountReview&&!v.amountChecked)throw Error('Le montant OCR est incertain : vérifie-le sur la capture.');
 const date=String(v.date||''),name=String(v.name||'').trim().slice(0,85),
  amount=Math.round(Number(v.amount)*100)/100,requestedType=String(v.type||''),type=requestedType==='savings_transfer'?'external_transfer':requestedType==='card_payment'?'transfer':requestedType,accountId=d.accountId;
 if(!smartStrictDate(date)||name.length<2||!Number.isFinite(amount)||!(amount>0)||amount>1e7)
  throw Error('Vérifie la date, le libellé et le montant.');
 if(!['expense','income','refund','transfer','external_transfer','external_refund'].includes(type))
  throw Error('Choisis la nature de ce mouvement.');
 if(type==='external_transfer'&&accountType(state.accounts.find(a=>a.id===accountId))==='card')
  throw Error('Virement hors budget indisponible sur une carte.');
 const categoryId=String(v.categoryId||''),isBudget=['expense','income','refund'].includes(type);
 const beneficiary=['income','transfer','external_transfer','external_refund'].includes(type)?me:String(v.beneficiary||'');
 if(isBudget&&!manualCategories(type).some(c=>c.id===categoryId))throw Error('Choisis une catégorie.');
 if(isBudget&&![me,partner,'couple','custom'].includes(beneficiary))throw Error('Choisis pour qui est ce mouvement.');
 const toAccountId=type==='transfer'?String(v.toAccountId||''):'';
 const investmentAccountId=requestedType==='savings_transfer'?String(v.investmentAccountId||''):'';
 const targetSaving=state.investmentAccounts.find(a=>a.id===investmentAccountId);
 if(requestedType==='savings_transfer'&&(!isReadySavingsAccount(targetSaving)||targetSaving.owner!==me||
   accountType(state.accounts.find(a=>a.id===accountId))!=='checking'||date<=targetSaving.openingDate))
  throw Error('Crée le CELI dans Patrimoine avec une date et un solde initial, puis sélectionne-le. Le transfert doit venir de ton compte courant.');
 if(type==='transfer'&&(!visibleBankAccounts(me).some(a=>a.id===toAccountId)||toAccountId===accountId))
  throw Error('Choisis le compte destinataire.');
 if(requestedType==='card_payment'){
  const from=state.accounts.find(a=>a.id===accountId),to=state.accounts.find(a=>a.id===toAccountId);
  if(accountType(from)!=='checking'||accountType(to)!=='card'||from.owner!==to.owner)
   throw Error('Un paiement de carte va du compte courant vers la carte de crédit du même titulaire.');
 }
 const transactionId='t_'+d.id;
 if(state.smartImports.some(other=>other.id!==d.id&&other.kind==='smart_draft'&&other.accountId===accountId&&
  other.status==='pending'&&other.date===date&&Number(other.amount)===amount&&
  normalizedMerchant(other.name)===normalizedMerchant(name))&&!v.allowPossibleDuplicate)
  throw Error('Une autre capture contient un mouvement semblable : confirme la ressemblance ou écarte le doublon.');
 if(state.transactions.some(t=>t.id===transactionId)){
  const done={...d,status:'done',transactionId,resolvedAt:new Date().toISOString()};
  await saveDocument('imports',done);Object.assign(d,done);window.TraceImportCalendar?.render?.();
  return {alreadySaved:true};
 }
 const overlaps=smartDuplicateMatches(id,{date,name,amount});
 if(overlaps.some(x=>x.exact&&x.status==='recorded'))throw Error('Opération déjà comptabilisée : rapproche les deux écritures avant de confirmer.');
 if(overlaps.length&&!v.allowPossibleDuplicate)throw Error('Opération ressemblante trouvée. Compare les deux achats et confirme seulement s’ils sont distincts.');
 const probe={date,name,type,amountCAD:amount,accountId};
 const match=findSimilarTransaction(probe);
 if(match?.status==='exact')throw Error('Une opération identique existe déjà. Utilise « Écarter » pour ce doublon.');
 if(match?.status==='possible'&&!v.allowPossibleDuplicate)throw Error('Une opération ressemblante existe : coche la confirmation de doublon.');
 if(['transfer','external_transfer','external_refund'].includes(type)&&state.transactions.some(t=>t.accountId===accountId&&t.date===date&&t.type===type&&
  Math.abs(Number(t.amountCAD)-amount)<.009&&normalizedMerchant(t.name)===normalizedMerchant(name)))
  throw Error('Ce mouvement semble déjà enregistré.');
 const share=['income','transfer','external_transfer','external_refund'].includes(type)?
  {beneficiary:me,...traceSplit(me,amount)}:
  traceImportSplit({beneficiary,friendsAmount:Number(v.friendsAmount||0),partnerAmount:Number(v.partnerAmount||0)},{amountCAD:amount});
 const tx={id:transactionId,date,name,type,amountCAD:amount,amountOriginal:amount,currency:'CAD',
  rate:1,status:'confirmed',categoryId:isBudget?categoryId:'',accountId,payerId:me,
  ...(toAccountId?{toAccountId}:{}),...(requestedType==='card_payment'?{transferPurpose:'card_repayment'}:{}),...(requestedType==='savings_transfer'?{transferPurpose:'savings',investmentAccountId}:{}),...share,source:'image',importFileName:d.sourceFileName,
  recurring:false,excludedByOpening:!isFinancialPeriod(probe)};
 tx.importFingerprint=csvFingerprint(tx);
 await saveDocument('transactions',tx);state.transactions.push(tx);
 if(!state.importDays.some(x=>x.accountId===accountId&&x.date===date)){
  try{await recordDayImport(accountId,date,'image');}catch(e){console.warn('Suivi de journée non enregistré',e);}
 }
 const done={...d,status:'done',transactionId,date,name,amount,type,resolvedAt:new Date().toISOString()};
 try{await saveDocument('imports',done);Object.assign(d,done);}
 catch(e){console.warn('Brouillon encore présent ; transaction déjà sauvegardée',e);}
 renderAll();return{saved:true};
}


async function smartResetDay(accountId,date,expectedIds){
 if(!visibleBankAccounts(me).some(a=>a.id===accountId)||!smartStrictDate(date))
  throw Error('Compte ou journée invalide.');
 if(!Array.isArray(expectedIds)||!expectedIds.length||expectedIds.length>150||
   new Set(expectedIds).size!==expectedIds.length)throw Error('Sélection de journée invalide.');
 const pending=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.accountId===accountId&&
   d.date===date&&d.status==='pending');
 if(pending.length!==expectedIds.length||
    pending.some(d=>!expectedIds.includes(d.id)))
  throw Error('Les opérations ont changé depuis ton ouverture. Rouvre la journée avant de recommencer.');
 let reset=0;
 for(const d of pending){
  const next={...d,status:'reset',resetAt:new Date().toISOString()};
  try{await saveDocument('imports',next);Object.assign(d,next);reset++;}
  catch(e){
   window.TraceImportCalendar?.render?.();
   throw Error(reset+' brouillon(s) mis de côté. Les autres sont conservés : '+(e?.message||'Réessaie.'));
  }
 }
 // All confirmed transactions, balances, categories and opening balances remain untouched.
 window.TraceImportCalendar?.render?.();
 return {reset,financialTransactionsChanged:0};
}
async function smartCreateCategory(name,type,kind='variable'){
 const label=String(name||'').trim().replace(/\s+/g,' ').slice(0,60);
 if(label.length<2||label.length>60)throw Error('Indique un nom de catégorie (2 caractères minimum).');
 if(!['income','expense'].includes(type))throw Error('Type de catégorie invalide.');
 const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const existing=state.categories.find(c=>!c.archived&&c.type===type&&normalized(c.name)===normalized(label));
 if(existing)return {id:existing.id,name:existing.name,type:existing.type,reused:true};
 const budgetKind=type==='income'?'income':kind==='fixed'?'fixed':'variable';
 const category={id:'cat_'+txDocId(),type,name:label,icon:'◇',group:budgetKind,
  budgetKind,custom:true,archived:false};
 await saveDocument('categories',category);state.categories.push(category);
 renderAll();
 return{id:category.id,name:category.name,type:category.type,created:true};
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

let activityReviewAccount='all';
function pendingReviewByAccount(){
 const pending=state.transactions.filter(t=>t.status!=='confirmed');
 return activityReviewAccount==='all'?pending:pending.filter(t=>t.accountId===activityReviewAccount);
}
function reviewAccountLabel(id){
 const a=state.accounts.find(x=>x.id===id);
 return a?shortAccountLabel(a):'Compte non identifié';
}
function renderActivity(){
 const ts=state.transactions.filter(t=>String(t.date||'').startsWith(activityMonth)&&t.status==='confirmed').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const counted=ts.filter(isFinancialPeriod);
 const expenses=counted.filter(t=>['expense','group_expense','person_payment'].includes(t.type)).reduce((v,t)=>v+Number(t.amountCAD||0),0),refunds=counted.filter(t=>t.type==='refund').reduce((v,t)=>v+Number(t.amountCAD||0),0),inc=counted.filter(t=>t.type==='income').reduce((v,t)=>v+Number(t.amountCAD||0),0),exp=Math.max(0,expenses-refunds);
 $('#activityMonthLabel').textContent=monthLabel(activityMonth);$('#activityExpenses').textContent=money(exp);$('#activityIncome').textContent=money(inc);$('#activityNet').textContent=money(inc-exp);
 $('#transactionList').innerHTML=ts.length?ts.map(txRow).join(''):'<div class="empty-note">Aucune opération confirmée ce mois-ci.</div>';
 $$('[data-tx-open]').forEach(btn=>btn.onclick=()=>editTransaction(btn.dataset.txOpen));
 const remaining=state.transactions.filter(t=>t.status!=='confirmed'&&visibleBankAccounts(me).some(a=>a.id===t.accountId));
 const legacy=$('#importPendingTransactions');
 if(legacy){
  legacy.classList.toggle('hidden',!remaining.length);
  legacy.innerHTML=remaining.length?'<div class="trace-unconfirmed-header"><strong>Transactions à compléter</strong><small>'+
   remaining.length+' déjà enregistrée(s), encore à vérifier</small></div>'+
    '<div class="trace-unconfirmed-rows">'+remaining.map(t=>
     '<button type="button" class="trace-unconfirmed-row" data-import-pending="'+esc(t.id)+'">'+
      '<span><strong>'+esc(t.name||'Opération')+'</strong><small>'+esc(shortAccountLabel(state.accounts.find(a=>a.id===t.accountId)))+
      ' · '+esc(t.date||'Date à préciser')+'</small></span><b>'+money(t.amountCAD)+'</b></button>').join('')+'</div>':'';
  legacy.querySelectorAll('[data-import-pending]').forEach(button=>button.onclick=()=>editTransaction(button.dataset.importPending,true));
 }
 const picker=$('#activityMonthPicker');if(picker)picker.value=activityMonth;
 const label=$('#activityMonthDisplay');if(label)label.textContent=monthLabel(activityMonth);
 const current=$('#activityCurrentMonth');if(current)current.classList.toggle('hidden',activityMonth===CM);
 window.TraceImportCalendar?.render?.();
 showTab(tab);
}
function showTab(t){
 if(t==='review')t='import'; // Old deep links now point to the unified import flow.
 tab=t==='transactions'?'transactions':'import';
 $$('#activityTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#activityTransactions').classList.toggle('hidden',tab!=='transactions');
 $('#activityImport').classList.toggle('hidden',tab!=='import');
}

/* Portfolio ledger: contributions vs investment performance, native currency first */
function trackedSavingsAccounts(owner=me){
 return state.investmentAccounts.filter(a=>a.owner===owner&&a.savingsTracking==='linked'&&
   a.currency==='CAD'&&['CELI','Épargne'].includes(a.type));
}
function isReadySavingsAccount(a){
 return Boolean(a&&['la','partner'].includes(a.owner)&&a.savingsTracking==='linked'&&a.currency==='CAD'&&
   smartStrictDate(String(a.openingDate||''))&&
   a.openingBalance!==null&&a.openingBalance!==''&&Number.isFinite(Number(a.openingBalance))&&Number(a.openingBalance)>=0);
}
function linkedSavingsMovements(account){
 if(!isReadySavingsAccount(account))return[];
 return state.transactions.filter(t=>t.status==='confirmed'&&
  t.investmentAccountId===account.id&&t.date>account.openingDate&&
  t.accountId&&(state.accounts.find(a=>a.id===t.accountId)?.owner===account.owner)&&
  accountType(state.accounts.find(a=>a.id===t.accountId))==='checking'&&
  ((t.type==='external_transfer'&&t.transferPurpose==='savings')||
   (t.type==='external_refund'&&t.transferPurpose==='savings_withdrawal')));
}
function savingsLedger(account){
 const configured=isReadySavingsAccount(account);
 const base=configured?Math.round(Number(account.openingBalance)*100)/100:null;
 const movements=linkedSavingsMovements(account);
 const net=movements.reduce((n,t)=>n+(t.type==='external_transfer'?Number(t.amountCAD):-Number(t.amountCAD)),0);
 const value=configured?Math.round((base+net)*100)/100:null;
 return {configured,base,movements,net,value,hasFx:true,fx:1,cad:value,
  contributions:configured?Math.round(net*100)/100:0,
  cash:value,securities:0,positions:[],dividends:0,fees:0,realized:0,
  performance:0,estimated:true};
}
function portfolioLedger(account,override=null,removeId=null,cutoff=null){
 if(account.savingsTracking==='linked')return savingsLedger(account);
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
function openSavingsAccount(account){
 const ledger=savingsLedger(account),ready=ledger.configured,opList=ledger.movements.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 openSheet(esc(account.name),
  '<div class="settings-hero"><span class="pico large">'+uiIcon('chart')+'</span><div><b>'+
   (ready?nativeMoney(ledger.value,'CAD'):'Solde à configurer')+'</b>'+
   '<small>'+esc(account.type)+' · '+(ready?'Estimation depuis '+esc(account.openingDate):'Date et solde de référence nécessaires')+'</small></div></div>'+
  '<div class="empty-note">Le solde estimé évolue uniquement avec les virements confirmés depuis ton compte courant. Les rendements, intérêts et frais éventuels ne sont pas connus automatiquement.</div>'+
  (ready?'<div class="trace-stat-grid"><div><small>Solde initial</small><b>'+nativeMoney(ledger.base,'CAD')+'</b></div>'+
   '<div><small>Virements nets</small><b>'+nativeMoney(ledger.net,'CAD')+'</b></div></div>':'')+
  '<button class="primary full" id="savingsReferenceEdit">'+(ready?'Modifier le solde de référence':'Configurer le solde initial')+'</button>'+
  '<div class="section-head"><h2>Virements liés</h2></div>'+
  (opList.length?opList.map(t=>'<button type="button" class="trace-list-btn" data-savings-link="'+esc(t.id)+'"><span><b>'+
   esc(t.name)+'</b><small>'+esc(t.date)+' · '+esc(shortAccountLabel(state.accounts.find(a=>a.id===t.accountId)))+
   ' · Voir l’opération</small></span><b>'+esc(t.type==='external_transfer'?'+':'−')+money(t.amountCAD)+'</b></button>').join(''):
   '<div class="empty-note">Aucun virement lié après le solde de référence. Pour un virement déjà enregistré, ouvre-le dans Activité et sélectionne ce CELI.</div>')+
  '<button class="secondary full" id="savingsReturn">Fermer</button>'+traceFeedback());
 $('#savingsReferenceEdit').onclick=()=>editSavingsReference(account);
 $('#savingsReturn').onclick=closeSheet;
 $$('[data-savings-link]').forEach(x=>x.onclick=()=>editTransaction(x.dataset.savingsLink));
}
function editSavingsReference(account){
 const ready=isReadySavingsAccount(account);
 openSheet('Solde de référence · '+esc(account.name),
  '<div class="empty-note">Indique le solde réel à la fin d’une date choisie. Les virements des jours suivants viendront s’ajouter ou se soustraire automatiquement.</div>'+
  '<label class="label2">Date du solde</label><input class="input" type="date" id="savingsOpeningDate" value="'+esc(account.openingDate||localDateISO())+'">'+
  '<label class="label2">Solde à cette date (CAD)</label><input class="input" inputmode="decimal" type="number" step=".01" min="0" id="savingsOpeningAmount" value="'+(ready?Number(account.openingBalance).toFixed(2):'')+'" placeholder="0,00">'+
  '<button class="primary full" id="savingsOpeningSave">Enregistrer la référence</button>'+
  '<button class="secondary full" id="savingsOpeningCancel">Annuler</button>'+traceFeedback());
 $('#savingsOpeningCancel').onclick=()=>openSavingsAccount(account);
 $('#savingsOpeningSave').onclick=async()=>{
  const date=$('#savingsOpeningDate').value,raw=$('#savingsOpeningAmount').value,amount=Number(raw);
  if(!smartStrictDate(date)||raw.trim()===''||!Number.isFinite(amount)||amount<0||amount>1e10){
   $('#traceFeedback').textContent='Vérifie le solde et la date.';return;
  }
  const next={...account,openingDate:date,openingBalance:Math.round(amount*100)/100};
  $('#savingsOpeningSave').disabled=true;
  try{await saveDocument('investment_accounts',next);Object.assign(account,next);renderWealth();openSavingsAccount(account);}
  catch(e){$('#savingsOpeningSave').disabled=false;traceNotice(e);}
 };
}
function openInvestmentAccount(account){
 if(account?.savingsTracking==='linked'){openSavingsAccount(account);return;}
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
  '<div class="trace-op-fee"><label class="label2">Frais inclus ('+esc(currency)+')</label><input class="input" id="invFee" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.fee||0)+'"></div>'+'<div class="trace-op-bank"><label class="label2">Compte bancaire lié (facultatif)</label><select class="input" id="invBank"><option value="">Aucun mouvement bancaire associé</option>'+visibleBankAccounts(account.owner).filter(a=>accountType(a)!=='card').map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select><div class="empty-note">Si tu lies un compte, le versement ou retrait y sera calculé automatiquement. Ne l’enregistre pas une seconde fois.</div></div>'+'<div class="trace-op-bank-cad"><label class="label2">Montant réellement débité / crédité en CAD</label><input id="invBankCad" class="input" type="number" min="0.01" step="any" inputmode="decimal" placeholder="Montant en $ CAD" value="'+Number(original?.bankAmountCAD||0||'')+'"><div class="empty-note">Pour une opération en '+esc(currency)+', saisis le montant CAD exact apparaissant sur le compte bancaire.</div></div>'+
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
 accounts.map(({a,p})=>'<button class="trace-list-btn" type="button" data-analysis-invest="'+esc(a.id)+'"><span><b>'+esc(shortAccountLabel(a))+'</b><small>Versements : '+nativeMoney(p.contributions,a.currency)+' · Performance : '+nativeMoney(p.performance,a.currency)+'</small></span><strong>'+nativeMoney(p.value,a.currency)+'</strong></button>').join('')+
 (!accounts.length?'<div class="empty-note">Ajoute un compte pour suivre ton patrimoine.</div>':''));
 $$('[data-analysis-invest]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.analysisInvest)));
}

function renderWealth(){
 const sId=scope(wealthScope),owners=sId==='couple'?['la','partner']:[sId],bk=bank(sId),accounts=state.investmentAccounts.filter(a=>owners.includes(a.owner));
 const ports=accounts.map(a=>({a,p:portfolioLedger(a)}));
 const missing=ports.filter(x=>!x.p.hasFx||x.a.savingsTracking==='linked'&&!x.p.configured);
 const investments=ports.reduce((sum,x)=>sum+(x.p.cad||0),0),total=(bk.net||0)+investments;
 $('#wealthTotal').textContent=money(total);
 $('#wealthSub').textContent=missing.length?'Total partiel · '+missing.length+' compte(s) à configurer ou sans conversion CAD':'Liquidités et placements suivis · les CELI restent estimatifs';
 $('#assetGrid').innerHTML=[
 '<button class="asset-card" type="button" id="wealthLiquidityCard"><span class="a-icon">$</span><span>Liquidités</span><b>'+(bk.net===null?'À configurer':money(bk.net))+'</b><small>Même solde que dans Accueil · Configurer ›</small></button>',
 ...ports.map(({a,p})=>'<button class="asset-card" type="button" data-inv-account="'+esc(a.id)+'"><span class="a-icon">◇</span><span>'+esc(a.name||a.type||'Investissement')+'</span><b>'+(a.savingsTracking==='linked'&&!p.configured?'À configurer':nativeMoney(p.value,a.currency))+'</b><small>'+
 (a.savingsTracking==='linked'?'Solde estimé depuis tes virements':p.hasFx?money(p.cad)+' CAD':'Conversion CAD à saisir')+' · Détails ›</small></button>'),
 '<button class="asset-card asset-card-add" id="wealthAddCard" type="button"><span class="a-icon">＋</span><span>Ajouter un compte</span><b>Nouveau</b><small>PEA, CELI, REER…</small></button>'
 ].join('');
 $('#wealthAddCard').onclick=openInvestmentAccountAdd;$('#wealthLiquidityCard').onclick=openAccountSettings;
 $$('[data-inv-account]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.invAccount)));
 $('#wealthTrend').innerHTML='<div class="empty-note">Les évolutions seront présentées dès que suffisamment de valorisations datées auront été saisies. Aucun graphique fictif n’est affiché.</div>';
 updateSegments();
}
function renderAll(){renderHome();renderBudget();renderActivity();renderWealth();if(session?.user?.id&&household)window.TraceReminders?.refresh?.({userId:session.user.id,createdAt:session.user.created_at,owner:me,accounts:state.accounts,days:state.importDays,imports:state.smartImports});}
function navigate(p){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===p));location.hash=p==='home'?'':p;window.scrollTo({top:0,behavior:document.body.classList.contains('trace-guide-open')?'auto':'smooth'});}
function analysis(){analysisScope=homeScope;renderAnalysis();}
function renderAnalysis(){const sId=scope(analysisScope),ms=months6(),vs=ms.map(m=>summary(m,sId)),inc=vs.reduce((x,v)=>x+v.income,0),exp=vs.reduce((x,v)=>x+v.expense,0),sav=inc-exp;openSheet('Analyses',`<div class="segment analysis-scope" id="analysisScope"><button class="seg ${analysisScope==='mine'?'active':''}" data-scope="mine">Moi</button><button class="seg ${analysisScope==='couple'?'active':''}" data-scope="couple">Couple</button></div><div class="metric-strip" style="margin-top:14px"><div class="metric-mini"><span>Dépenses · 6 mois</span><b>${money(exp)}</b></div><div class="metric-mini"><span>Moyenne</span><b>${money(exp/6)}</b></div><div class="metric-mini"><span>Épargne</span><b>${money(sav)}</b></div><div class="metric-mini"><span>Taux</span><b>${inc?(sav/inc*100).toFixed(1):0} %</b></div></div><div class="section-head"><h2>Évolution</h2></div><div class="chart" id="analysisChart"></div>`);chart($('#analysisChart'),sId,'expense');$$('#analysisScope .seg').forEach(b=>b.onclick=()=>{analysisScope=b.dataset.scope;renderAnalysis();});}
function detail(type){const sId=scope(homeScope),rows=txs(CM,sId,true).filter(t=>type==='income'?t.type==='income':type==='spending'?['expense','group_expense','person_payment','refund'].includes(t.type):false);if(type==='saving'){const s=summary(CM,sId);openSheet('Marge après dépenses',`<div class="money2">${money(s.saving)}</div><div class="micro">Revenus moins dépenses du mois. Les virements vers le CELI font baisser le solde courant sans modifier ce calcul.</div>`);return;}openSheet(type==='income'?'Revenus':'Dépenses',rows.length?rows.map(txRow).join(''):'<div class="empty-note">Aucune opération.</div>');}

function uiIcon(name){
  const paths={
    user:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>',
    heart:'<path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5C4 5.8 5.9 4 8.3 4c1.6 0 3 .8 3.7 2 .7-1.2 2.1-2 3.7-2C18.1 4 20 5.8 20 8.5Z"/>',
    bank:'<path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 20h16"/>',
    refresh:'<path d="M19 8a7 7 0 0 0-12-2L4 9"/><path d="M4 5v4h4"/><path d="M5 16a7 7 0 0 0 12 2l3-3"/><path d="M20 19v-4h-4"/>',
    bell:'<path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 6 2.2 6.5 2.2 6.5H4.3S6.5 15 6.5 9Z"/><path d="M10 19h4"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
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
  const solo=(state.household.workspaceMembers||[]).length<2;
  openSheet('Profil & paramètres',
    '<div class="profile-card profile-card-premium">'+
      '<div class="big-avatar">'+esc(meObj.initials||initials(meObj.name))+'</div>'+
      '<b>'+esc(shortMemberName(me))+'</b><small class="trace-legal-name">'+esc(meObj.name)+'</small>'+
      '<div class="review-date">'+esc(session?.user?.email||'')+'</div>'+
      '<div class="profile-connection"><span class="status-dot"></span> '+(solo?'Espace personnel · partenaire non invité':'Espace partagé avec '+esc(shortMemberName(partner)))+'</div>'+
    '</div>'+
    (solo?'<div class="trace-profile-invite"><div><span class="trace-kicker">VOTRE ESPACE À DEUX</span><strong>Envie de gérer votre budget ensemble ?</strong>'+
    '<small>Invite ton partenaire quand tu veux, même après plusieurs mois en solo.</small></div>'+
    '<button type="button" class="primary full" id="profileInvitePartner">Inviter mon/ma partenaire</button></div>':'')+
    '<div class="settings-group"><div class="settings-group-title">Compte</div>'+
      profileMenuItem('settingsProfile','user','Mon profil','Nom complet, diminutif et courriel')+
      profileMenuItem('settingsCouple','heart',solo?'Inviter mon/ma partenaire':'Mon couple',solo?'Partager mon foyer lorsque je le souhaite':'Partage et répartition par défaut')+
    '</div>'+
    '<div class="settings-group"><div class="settings-group-title">Finances</div>'+
      profileMenuItem('settingsAccounts','bank','Mes comptes','Compte courant, carte et autres comptes')+
      profileMenuItem('settingsReconcile','refresh','Rapprochement','Vérifier Trace avec la banque')+
      profileMenuItem('settingsInvest','chart','Investissements','PEA, CELI, REER et autres')+
    '</div>'+
    '<div class="settings-group"><div class="settings-group-title">Préférences</div>'+
      profileMenuItem('settingsGuide','guide','Guide express','Découvrir TRACE en 8 étapes · à refaire quand tu veux')+
      (window.TraceInstall&&!window.TraceInstall.isInstalled()?profileMenuItem('settingsInstall','download','Installer TRACE','Sur mon écran d’accueil, comme une application'):'')+
      profileMenuItem('settingsNotifications','bell','Rappels d’import','Chaque jour, tous les 2 jours ou désactivés')+
      profileMenuItem('settingsData','shield','Données & confidentialité','Date de référence et données partagées')+
    '</div>'+
    '<div class="empty-note" style="text-align:center;margin-top:12px">Trace · version '+esc(window.__TRACE_BUILD__)+'</div>'+
    profileMenuItem('settingsDelete','shield','Supprimer mes données TRACE','Effacer mon espace personnel · action irréversible')+
    '<button class="profile-action settings-row danger-row" id="logout"><span class="pico">'+uiIcon('logout')+'</span><span class="pmain"><b>Se déconnecter</b><small>Fermer la session sur cet appareil</small></span></button>'
  );
  $('#settingsProfile').onclick=openProfileSettings;
  $('#settingsCouple').onclick=openCoupleSettings;
  $('#profileInvitePartner')?.addEventListener('click',openCoupleSettings);
  $('#settingsAccounts').onclick=openAccountSettings;
  $('#settingsReconcile').onclick=openReconcileSettings;
  $('#settingsInvest').onclick=()=>{closeSheet();wealthScope='mine';renderWealth();navigate('wealth');};
  $('#settingsGuide').onclick=()=>{closeSheet();setTimeout(()=>window.TraceGuide?.start(true),80);};
  $('#settingsInstall')?.addEventListener('click',()=>{closeSheet();window.TraceInstall?.openHelp?.();});
  $('#settingsNotifications').onclick=openNotificationSettings;
  $('#settingsDelete').onclick=openTraceDeletion;
  $('#settingsData').onclick=openDataSettings;
  $('#logout').onclick=async()=>{await client.auth.signOut();location.reload();};
}
function openProfileSettings(){
  openSheet('Mon profil',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('user')+'</span><div><b>'+esc(shortMemberName(me))+'</b><small>'+esc(member(me).name)+' · '+esc(session?.user?.email||'')+'</small></div></div>'+
    '<label class="label2">Nom complet</label><input id="settingsDisplayName" class="input" value="'+esc(member(me).name)+'">'+
    '<div class="trace-nickname-panel"><label class="label2" for="settingsNickname">Diminutif dans Trace</label>'+
    '<input id="settingsNickname" class="input" maxlength="18" autocomplete="nickname" value="'+esc(shortMemberName(me))+'">'+
    '<small>Créé automatiquement à partir du prénom. Le nom complet est conservé.</small></div>'+
    '<label class="label2">Courriel</label><input class="input" value="'+esc(session?.user?.email||'')+'" disabled>'+
    '<label class="label2">Devise principale</label><select class="input" disabled><option>CAD — Dollar canadien</option></select>'+
    '<button class="primary full" id="saveProfileSettings" style="margin-top:16px">Enregistrer</button><p class="trace-feedback" id="settingsProfileError" role="status"></p>'+settingsBack()
  );
  $('#saveProfileSettings').onclick=async()=>{
    const name=$('#settingsDisplayName').value.trim();
    const nickname=$('#settingsNickname').value.trim().replace(/\s+/g,' ').slice(0,18)||defaultMemberNickname(name);
    if(!name)return;
    const btn=$('#saveProfileSettings');btn.disabled=true;btn.textContent='Enregistrement…';
    try{
      if(name!==member(me).name){
        sync('saving');
        const{error}=await client.from('household_members').update({display_name:name}).eq('household_id',household.id).eq('user_id',session.user.id);
        if(error)throw error;
        const m=(state.household.members||[]).find(x=>x.id===me);
        if(m){m.name=name;m.initials=initials(name);}
      }
      const previous=state.household.memberNicknames||{};
      state.household.memberNicknames={...previous,[me]:nickname};
      try{await saveHouseholdSettings();}catch(error){state.household.memberNicknames=previous;throw error;}
      $('#profileBtn').textContent=member(me).initials||initials(name);
      renderAll();profile();
    }catch(error){sync('error');btn.disabled=false;btn.textContent='Réessayer';const el=$('#settingsProfileError');if(el)el.textContent='Enregistrement impossible : '+String(error.message||error);}
  };
  bindSettingsBack();
}
function openCoupleSettings(){
 const d=state.household.defaultSplit||{la:50,partner:50};
 const ws=Array.isArray(state.household.workspaceMembers)?state.household.workspaceMembers:[];
 const full=ws.length>=2,inviteCode=String(state.household.inviteCode||'');
 const owner=ws.some(m=>m.userId===session?.user?.id&&m.role==='owner');
 const membersHtml=ws.length?ws.map(x=>'<div class="member-row"><span class="member-avatar">'+esc(initials(x.name||''))+'</span>'+
  '<span class="member-main"><b>'+esc(x.name||'Membre')+'</b><small>'+(x.role==='owner'?'Créateur du foyer':'Membre du foyer')+
  '</small></span><span class="member-status">Membre</span></div>').join(''):'<div class="empty-note">Aucun membre chargé.</div>';
 const inviteHtml=full?'<div class="workspace-full-note"><b>2/2 membres dans ce foyer</b>'+
  '<small>Chaque membre possède son propre compte de connexion et accède au même espace financier.</small></div>':
  '<div class="trace-invite-explainer"><span class="trace-kicker">INVITATION PRIVÉE</span>'+
  '<strong>Inviter ton partenaire, même après avoir commencé seul</strong>'+
  '<p>Tu conserves ton historique. Attention : lorsque ton partenaire rejoint ce foyer, il peut également consulter les budgets, comptes, transactions et captures bancaires déjà enregistrés. N’invite qu’une personne de confiance.</p>'+
  '<div class="trace-invite-steps"><div><b>1</b><span>Copie le lien de TRACE et transmets-le.</span></div>'+
  '<div><b>2</b><span>Ton partenaire crée son propre compte, puis choisit « Rejoindre un espace ».</span></div>'+
  '<div><b>3</b><span>Il utilise ton code privé ci-dessous pour accéder à votre foyer.</span></div></div>'+
  '<button class="secondary full" id="copyTraceLink" type="button">Copier le lien de TRACE</button>'+
  '<div class="invite-code-row trace-invite-code"><code id="inviteCodeValue">••••••••••</code>'+
  '<button class="secondary" id="revealInviteCode" type="button">Afficher</button>'+
  '<button class="secondary hidden" id="copyInviteCode" type="button">Copier</button></div>'+
  '<small class="trace-invite-safe">Garde ce code privé : toute personne connectée qui le connaît peut rejoindre le foyer tant qu’il reste une place.</small>'+
  (owner?'<button type="button" class="trace-invite-renew" id="rotateInviteCode">Renouveler le code</button>'+
   '<div id="rotateInviteConfirm" class="trace-invite-renew-confirm hidden"><p>Le code précédent sera immédiatement invalidé. Tu devras transmettre le nouveau.</p>'+
   '<button class="secondary full" type="button" id="rotateInviteConfirmButton">Confirmer le renouvellement</button>'+
   '<button class="secondary full" type="button" id="rotateInviteCancel">Annuler</button></div>':'')+
  '<p id="traceInviteFeedback" class="trace-invite-feedback" role="status"></p></div>';
 const budgetHtml=full?
  '<div class="setting-summary"><span>Budget partagé</span><b>Actif</b></div>'+
  '<div class="setting-summary"><span>Solde Partage</span><b>'+money(Math.abs(coupleBalance()))+'</b></div>'+
  '<div class="section-head"><h2>Répartition par défaut</h2></div>'+
  '<div class="formrow"><div><label class="label2">'+esc(shortMemberName('la'))+' %</label><input id="splitLaSetting" class="input" type="number" min="0" max="100" value="'+Number(d.la??50)+'"></div>'+
  '<div><label class="label2">'+esc(shortMemberName('partner'))+' %</label><input id="splitPartnerSetting" class="input" type="number" min="0" max="100" value="'+Number(d.partner??50)+'"></div></div>'+
  '<button class="primary full" id="saveCoupleSettings" style="margin-top:16px">Enregistrer la répartition</button>':
  '<div class="trace-solo-status"><strong>Ton espace reste personnel pour le moment.</strong>'+
  '<small>Les options de répartition apparaîtront une fois ton partenaire connecté.</small></div>';
 openSheet(full?'Mon couple':'Inviter mon/ma partenaire',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('heart')+'</span><div><b>'+
  (full?esc(shortMemberName(partner)):'Espace personnel')+'</b><small>'+
  (full?'Foyer partagé':'Un membre · invitation possible à tout moment')+'</small></div></div>'+
  '<div class="section-head"><h2>Membres du foyer</h2></div><div class="members-card">'+membersHtml+'</div>'+
  inviteHtml+budgetHtml+settingsBack());
 const feedback=s=>{const n=$('#traceInviteFeedback');if(n)n.textContent=s;};
 $('#revealInviteCode')?.addEventListener('click',()=>{
  $('#inviteCodeValue').textContent=inviteCode||'Code indisponible';
  $('#revealInviteCode').classList.add('hidden');
  if(inviteCode)$('#copyInviteCode')?.classList.remove('hidden');
 });
 $('#copyInviteCode')?.addEventListener('click',async()=>{
  if(!inviteCode)return feedback('Code indisponible, recharge TRACE.');
  try{await navigator.clipboard.writeText(inviteCode);$('#copyInviteCode').textContent='Copié';}
  catch(e){feedback('Le code est affiché : sélectionne-le pour le copier.');}
 });
 $('#copyTraceLink')?.addEventListener('click',async()=>{
  const link='https://louisantoine78.github.io/Budget-duo/trace-launch-v2.html';
  try{await navigator.clipboard.writeText(link);$('#copyTraceLink').textContent='Lien copié';}
  catch(e){feedback('Lien de TRACE : '+link);}
 });
 $('#rotateInviteCode')?.addEventListener('click',()=>{
  $('#rotateInviteConfirm').classList.remove('hidden');$('#rotateInviteCode').classList.add('hidden');
 });
 $('#rotateInviteCancel')?.addEventListener('click',()=>{
  $('#rotateInviteConfirm').classList.add('hidden');$('#rotateInviteCode').classList.remove('hidden');
 });
 $('#rotateInviteConfirmButton')?.addEventListener('click',async()=>{
  if(!owner||full||!household?.id)return;
  const btn=$('#rotateInviteConfirmButton');btn.disabled=true;
  try{
   const {data,error}=await client.rpc('rotate_household_invite',{p_household_id:household.id});
   if(error)throw error;
   if(typeof data!=='string'||!data.trim())throw Error('Nouveau code indisponible');
   state.household.inviteCode=data;household.invite_code=data;
   openCoupleSettings();
  }catch(error){btn.disabled=false;feedback('Impossible de renouveler le code. Réessaie plus tard.');}
 });
 if(full){
  $('#splitLaSetting').oninput=()=>{
   $('#splitPartnerSetting').value=Math.max(0,100-Number($('#splitLaSetting').value||0));
  };
  $('#saveCoupleSettings').onclick=async()=>{
   const la=Number($('#splitLaSetting').value||0),pa=Number($('#splitPartnerSetting').value||0);
   if(!Number.isFinite(la)||!Number.isFinite(pa)||Math.abs(la+pa-100)>.01)return;
   state.household.defaultSplit={la,partner:pa};
   await saveHouseholdSettings();renderAll();profile();
  };
 }
 bindSettingsBack();
}
/* Bootstrap only new households; never overwrite an existing household's financial state. */
const STARTER_CATEGORIES=[
 ['groceries','Épicerie','expense','variable','🛒'],['rent','Logement','expense','fixed','⌂'],
 ['restaurants','Restaurants','expense','variable','♧'],['transport','Transport','expense','variable','◈'],
 ['utilities','Électricité et services','expense','fixed','◉'],['subscriptions','Abonnements','expense','fixed','◧'],
 ['phone','Téléphone et Internet','expense','fixed','▤'],['medical','Santé','expense','variable','✚'],
 ['sport','Sport','expense','variable','◇'],['travel','Voyage et vacances','expense','variable','✈'],
 ['leisure','Loisirs','expense','variable','☆'],['insurance','Assurances','expense','fixed','⬡'],
 ['other','Autres dépenses','expense','variable','•'],['salary','Salaire','income','income','↗'],
 ['bonus','Primes','income','income','✦'],['other_income','Autres revenus','income','income','+']
];
function starterCategoryDocs(hid,uid){
 return STARTER_CATEGORIES.map(([id,name,type,budgetKind,icon])=>({
  household_id:hid,collection:'categories',item_id:id,updated_by:uid,
  data:{id,name,type,budgetKind,group:budgetKind,icon,archived:false,custom:false}
 }));
}
async function seedNewHouseholdCategories(hid){
 if(!session?.user?.id||!hid)throw Error('Session nécessaire pour initialiser le budget.');
 const docs=starterCategoryDocs(hid,session.user.id);
 const {error}=await client.from('documents').upsert(docs,{onConflict:'household_id,collection,item_id',ignoreDuplicates:true});
 if(error)throw error;
}
async function restoreStarterCategories(){
 if(state.categories.length||state.budgets.length)throw Error('Catégories existantes : aucune initialisation automatique.');
 await seedNewHouseholdCategories(household.id);
 const {data,error}=await client.from('documents').select('data').eq('household_id',household.id).eq('collection','categories');
 if(error)throw error;
 state.categories=(data||[]).map(d=>d.data).filter(Boolean);
 renderAll();
}
let initialBankSetupShown=false;
let bankSettingsScope='mine';
const bankMoney=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
function offerInitialBankSetup(){
 if(initialBankSetupShown||!session||!household)return;
 const list=visibleBankAccounts(me);
 if(list.some(a=>accountType(a)==='checking')&&list.some(a=>accountType(a)==='card'))return;
 initialBankSetupShown=true;
 openEssentialBankSetup();
}
function openEssentialBankSetup(){
 if(!session||!household)return;
 const mine=visibleBankAccounts(me);
 const essentials=[
  {type:'checking',name:'Compte courant',hint:'Salaire, virements et paiements de ta carte de crédit.',icon:'bank'},
  {type:'card',name:'Carte de crédit',hint:'Achats quotidiens. Le remboursement depuis le courant n’est pas une deuxième dépense.',icon:'chart'}
 ];
 const ready=essentials.filter(x=>mine.some(a=>accountType(a)===x.type)).length;
 openSheet('Configurer mes comptes',
  '<div class="trace-bank-welcome"><span class="trace-kicker">ÉTAPE DE DÉPART · '+ready+' / 2</span>'+
  '<strong>Deux comptes pour bien commencer</strong>'+
  '<p>Dans TRACE, le compte courant reçoit les revenus et paie la carte. La carte rassemble les achats quotidiens. Tu peux choisir leur nom et les soldes de référence.</p></div>'+
  essentials.map(x=>{
   const registered=mine.filter(a=>accountType(a)===x.type);
   return '<div class="trace-bank-setup-option">'+
    '<div class="trace-bank-setup-heading"><span class="pico">'+uiIcon(x.icon)+'</span>'+
    '<div><strong>'+x.name+'</strong><small>'+x.hint+'</small></div>'+
    '<span class="trace-bank-setup-state'+(registered.length?' is-complete':'')+'">'+(registered.length?'✓':'À créer')+'</span></div>'+
    (registered.length?'<div class="trace-bank-setup-existing">'+registered.map(a=>esc(a.name)).join(' · ')+'</div>':
    '<button type="button" class="primary full trace-bank-setup-create" data-setup-bank="'+x.type+'">Créer mon '+x.name.toLowerCase()+'</button>')+
    '</div>';
  }).join('')+
  '<div class="trace-private-note"><strong>Des comptes personnels, pas des connexions bancaires</strong><span>Aucun mot de passe bancaire, NIP, CVV ou numéro complet de carte n’est demandé. Aucune somme ni transaction n’est créée sans ton action.</span></div>'+
  (ready===2?'<button type="button" class="primary full" id="traceBankSetupDone">Mes deux comptes sont prêts</button>':
   '<button type="button" class="secondary full" id="traceBankSetupLater">Continuer plus tard</button>')+
  '<p class="trace-bank-setup-footer">Tu pourras renommer tes comptes et en ajouter d’autres dans Profil → Mes comptes.</p>');
 $$('[data-setup-bank]').forEach(button=>button.onclick=()=>openNewBankAccount(button.dataset.setupBank,'setup'));
 $('#traceBankSetupDone')?.addEventListener('click',closeSheet);
 $('#traceBankSetupLater')?.addEventListener('click',closeSheet);
}
function openNewBankAccount(preset='',returnTo='settings'){
 if(!session||!household)return;
 const kind=['checking','card'].includes(preset)?preset:'checking';
 openSheet('Ajouter un compte bancaire',
  '<p class="empty-note">Un compte courant pour les revenus et les virements, une carte pour les achats. Choisis un nom identifiable, sans renseigner d’informations bancaires confidentielles.</p>'+
  '<label class="label2">Type de compte</label><select class="input" id="traceNewBankType"><option value="checking">Compte courant</option><option value="card">Carte de crédit</option></select>'+
  '<label class="label2">Nom du compte (modifiable plus tard)</label><input class="input" id="traceNewBankName" maxlength="70" autocomplete="off">'+
  '<label class="label2" id="traceNewBankAmountLabel">Solde de référence ($)</label><input class="input" id="traceNewBankAmount" type="number" step=".01" inputmode="decimal" placeholder="À renseigner" autocomplete="off">'+
  '<p class="trace-account-amount-info" id="traceNewBankAmountInfo"></p>'+
  '<label class="label2">Date du solde de référence</label><input class="input" id="traceNewBankDate" type="date" value="'+localDateISO()+'">'+
  '<label class="label2">Ce solde correspond à…</label><select class="input" id="traceNewBankMode"><option value="start">Début de la journée (jour inclus)</option><option value="end">Fin de la journée (jour exclu)</option></select>'+
  '<p class="empty-note">Ce compte appartient à ton profil. Il apparaît aussi dans la vue « Couple » lorsque ton partenaire rejoint ton foyer.</p>'+
  '<p id="traceBankSetupError" class="trace-bank-setup-error" role="alert"></p>'+
  '<button class="primary full" id="traceSaveNewBank" type="button">Créer ce compte</button>'+
  '<button class="secondary full" id="traceCancelNewBank" type="button" style="margin-top:8px">Annuler</button>');
 const type=$('#traceNewBankType'),name=$('#traceNewBankName'),info=$('#traceNewBankAmountInfo');
 const syncType=()=>{
  const card=type.value==='card';
  name.value=card?'Carte de crédit':'Compte courant';
  $('#traceNewBankAmountLabel').textContent=card?'Dette de carte à cette date ($)':'Solde de référence ($)';
  $('#traceNewBankAmount').value='';
  $('#traceNewBankAmount').min=card?'0':'';
  info.textContent=card?'Entre le montant de dette positif. TRACE enregistre ce montant comme une dette (solde négatif).':
   'Tu peux laisser ce montant vide si tu ne connais pas ton solde. TRACE ne l’inventera pas.';
 };
 type.value=kind;syncType();
 if(preset)type.disabled=true;
 else type.onchange=syncType;
 const back=()=>returnTo==='setup'?openEssentialBankSetup():openAccountSettings();
 $('#traceCancelNewBank').onclick=back;
 $('#traceSaveNewBank').onclick=async()=>{
  const label=name.value.trim(),accountKind=type.value,raw=$('#traceNewBankAmount').value.trim(),
   n=raw===''?null:Number(raw),date=$('#traceNewBankDate').value,mode=$('#traceNewBankMode').value;
  if(!label||label.length>70||!['checking','card'].includes(accountKind)||
   !/^\d{4}-\d\d-\d\d$/.test(date)||(n!==null&&(!Number.isFinite(n)||Math.abs(n)>1e9))||
   (accountKind==='card'&&n!==null&&n<0)){
   $('#traceBankSetupError').textContent='Vérifie le nom, la date et le montant. La dette de carte doit être saisie en positif.';
   return;
  }
  if(visibleBankAccounts(me).some(a=>a.name.toLocaleLowerCase('fr')===label.toLocaleLowerCase('fr'))){
   $('#traceBankSetupError').textContent='Tu as déjà un compte de ce nom.';
   return;
  }
  const account={id:accountKind+'_'+txDocId(),owner:me,name:label,type:accountKind};
  const button=$('#traceSaveNewBank');button.disabled=true;button.textContent='Enregistrement…';
  let saved=false;
  try{
   await saveDocument('accounts',account);
   saved=true;
   state.accounts.push(account);
   if(n!==null){
    const prevBalances=state.household.accountOpeningBalances||{},
     prevDates=state.household.accountOpeningBalanceDates||{},
     prevModes=state.household.accountOpeningBalanceModes||{};
    state.household.accountOpeningBalances={...prevBalances,[account.id]:accountKind==='card'?-Math.abs(n):n};
    state.household.accountOpeningBalanceDates={...prevDates,[account.id]:date};
    state.household.accountOpeningBalanceModes={...prevModes,[account.id]:mode};
    try{await saveHouseholdSettings();}
    catch(err){
     state.household.accountOpeningBalances=prevBalances;
     state.household.accountOpeningBalanceDates=prevDates;
     state.household.accountOpeningBalanceModes=prevModes;
     throw new Error('Compte créé, mais son solde initial n’a pas été sauvegardé. Ajoute-le dans Mes comptes. '+String(err.message||err));
    }
   }
   renderAll();
   back();
  }catch(err){
   button.disabled=false;button.textContent='Créer ce compte';
   if(saved){renderAll();back();traceNotice(err);}
   else $('#traceBankSetupError').textContent=String(err.message||err);
  }
 };
}
function openRenameBankAccount(id){
 const original=visibleBankAccounts(me).find(a=>a.id===id);
 if(!original)return;
 const accountKind=accountType(original)==='card'?'Carte de crédit':'Compte courant';
 openSheet('Renommer un compte',
  '<div class="trace-bank-rename-context"><strong>'+esc(accountKind)+'</strong><small>Le nom affiché est personnalisable. Les opérations, soldes et imports déjà associés resteront sur ce même compte.</small></div>'+
  '<label class="label2" for="traceRenameAccountInput">Nom du compte</label>'+
  '<input class="input" id="traceRenameAccountInput" maxlength="70" autocomplete="off" value="'+esc(original.name)+'">'+
  '<p class="trace-bank-setup-error" role="alert" id="traceRenameBankError"></p>'+
  '<button type="button" class="primary full" id="traceConfirmBankRename">Enregistrer le nom</button>'+
  '<button type="button" class="secondary full" id="traceCancelBankRename" style="margin-top:8px">Annuler</button>');
 $('#traceCancelBankRename').onclick=openAccountSettings;
 $('#traceConfirmBankRename').onclick=async()=>{
  const newName=$('#traceRenameAccountInput').value.trim();
  if(!newName||newName.length>70){
   $('#traceRenameBankError').textContent='Entre un nom de 1 à 70 caractères.';return;
  }
  if(visibleBankAccounts(me).some(a=>a.id!==original.id&&a.name.toLocaleLowerCase('fr')===newName.toLocaleLowerCase('fr'))){
   $('#traceRenameBankError').textContent='Un autre de tes comptes porte déjà ce nom.';return;
  }
  if(newName===original.name){openAccountSettings();return;}
  const btn=$('#traceConfirmBankRename');btn.disabled=true;btn.textContent='Enregistrement…';
  try{
   const detected=accountType(original);
   // Legacy account records had no type. Freeze the inferred kind before renaming.
   const changed={...original,name:newName,...(['checking','card'].includes(detected)?{type:detected}:{})};
   await saveDocument('accounts',changed);
   const idx=state.accounts.findIndex(a=>a.id===original.id);
   if(idx>=0)state.accounts[idx]=changed;
   renderAll();
   openAccountSettings();
  }catch(err){
   btn.disabled=false;btn.textContent='Enregistrer le nom';
   $('#traceRenameBankError').textContent='Impossible de sauvegarder le nouveau nom. Réessaie.';
  }
 };
}
function openAccountSettings(){
 const all=state.accounts.filter(a=>a.id!=='cash'&&a.type!=='cash'&&!a.archived&&['la','partner'].includes(a.owner));
 const accounts=bankSettingsScope==='couple'?all:all.filter(a=>a.owner===me);
 const mine=accounts.filter(a=>a.owner===me);
 const balances=state.household.accountOpeningBalances||{};
 const dates=state.household.accountOpeningBalanceDates||{};
 const modes=state.household.accountOpeningBalanceModes||{};
 const accountLabel=a=>accountType(a)==='card'?'Carte de crédit':accountType(a)==='checking'?'Compte courant':'Compte bancaire';
 openSheet('Mes comptes',
  '<div class="trace-bank-scope" role="group" aria-label="Afficher les comptes de"><button type="button" data-bank-scope="mine" class="'+(bankSettingsScope==='mine'?'is-selected':'')+'" aria-pressed="'+(bankSettingsScope==='mine')+'">Moi</button><button type="button" data-bank-scope="couple" class="'+(bankSettingsScope==='couple'?'is-selected':'')+'" aria-pressed="'+(bankSettingsScope==='couple')+'">Couple</button></div>'+
  '<p class="trace-account-settings-help">'+(bankSettingsScope==='couple'?'Vue globale des comptes du foyer. Tu peux modifier tes propres comptes ; ceux du partenaire sont en lecture seule.':
   'Chaque compte a son propre solde, ses imports et ses opérations. Tu peux les renommer sans perdre leur historique.')+'</p>'+
  (accounts.length?accounts.map(a=>{
   const editable=a.owner===me;
   const estimate=accountEstimate(a);
   return '<div class="account-setting-card trace-bank-account">'+
    '<div class="trace-bank-account-head"><div class="settings-hero compact"><span class="pico">'+uiIcon('bank')+'</span><div>'+
    '<b>'+esc(shortAccountLabel(a))+'</b><small>'+esc(accountLabel(a))+' · '+esc(shortMemberName(a.owner))+'</small></div></div>'+
    (editable?'<button type="button" class="trace-bank-rename" data-rename-bank="'+esc(a.id)+'">Renommer</button>':
     '<span class="trace-bank-readonly">Consultation</span>')+'</div>'+
    (editable?
     '<label class="label2">Solde de référence ($)</label><input class="input account-opening" data-id="'+esc(a.id)+'" type="number" step="0.01" value="'+esc(balances[a.id]??'')+'">'+
     '<label class="label2">Date de ce solde</label><input class="input account-date" data-id="'+esc(a.id)+'" type="date" value="'+esc(dates[a.id]||state.household.referenceDate||CM+'-01')+'">'+
     '<label class="label2">Moment du solde</label><select class="input account-mode" data-id="'+esc(a.id)+'">'+
     '<option value="start"'+(modes[a.id]!=='end'?' selected':'')+'>Début de la journée (jour inclus)</option>'+
     '<option value="end"'+(modes[a.id]==='end'?' selected':'')+'>Fin de la journée (jour exclu)</option></select>':
     '<div class="trace-bank-partner-balance"><span>Solde estimé</span><b>'+(estimate===null?'À configurer':bankMoney(estimate))+'</b></div>')+
    '</div>';
  }).join(''):'<div class="empty-note">Aucun compte bancaire n’est encore configuré pour cette vue.</div>')+
  (mine.length?'<button class="primary full" id="saveAccountSettings" style="margin-top:16px">Enregistrer mes soldes</button>':'')+
  '<button class="secondary full" id="traceAddBankAccount" type="button" style="margin-top:9px">+ Ajouter un de mes comptes</button>'+
  '<p class="trace-bank-setup-footer">Compte courant : revenus et virements. Carte de crédit : achats du quotidien ; son paiement depuis le courant n’est pas une deuxième dépense.</p>'+
  settingsBack());
 $$('[data-bank-scope]').forEach(button=>button.onclick=()=>{bankSettingsScope=button.dataset.bankScope==='couple'?'couple':'mine';openAccountSettings();});
 $$('[data-rename-bank]').forEach(button=>button.onclick=()=>openRenameBankAccount(button.dataset.renameBank));
 $('#traceAddBankAccount').onclick=()=>openNewBankAccount();
 if(mine.length)$('#saveAccountSettings').onclick=async()=>{
  const oldBalances={...(state.household.accountOpeningBalances||{})},
   oldDates={...(state.household.accountOpeningBalanceDates||{})},
   oldModes={...(state.household.accountOpeningBalanceModes||{})};
  const newBalances={...oldBalances},newDates={...oldDates},newModes={...oldModes};
  for(const input of $$('.account-opening')){
   if(!visibleBankAccounts(me).some(a=>a.id===input.dataset.id))continue;
   if(input.value.trim()!==''&&!Number.isFinite(Number(input.value)))return;
   if(input.value.trim()==='')delete newBalances[input.dataset.id];
   else newBalances[input.dataset.id]=Number(input.value);
  }
  for(const input of $$('.account-date')){
   if(!visibleBankAccounts(me).some(a=>a.id===input.dataset.id))continue;
   if(input.value)newDates[input.dataset.id]=input.value;
   else delete newDates[input.dataset.id];
  }
  for(const input of $$('.account-mode')){
   if(!visibleBankAccounts(me).some(a=>a.id===input.dataset.id))continue;
   newModes[input.dataset.id]=input.value==='end'?'end':'start';
  }
  state.household.accountOpeningBalances=newBalances;
  state.household.accountOpeningBalanceDates=newDates;
  state.household.accountOpeningBalanceModes=newModes;
  const button=$('#saveAccountSettings');button.disabled=true;
  try{await saveHouseholdSettings();renderAll();openAccountSettings();}
  catch(err){
   state.household.accountOpeningBalances=oldBalances;
   state.household.accountOpeningBalanceDates=oldDates;
   state.household.accountOpeningBalanceModes=oldModes;
   button.disabled=false;traceNotice(err);
  }
 };
 bindSettingsBack();
}
function openReconcileSettings(){
  const mine=state.accounts.filter(a=>a.owner===me&&['checking','card'].includes(accountType(a)));
  openSheet('Rapprochement',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('refresh')+'</span><div><b>Vérifier les comptes</b><small>Une fois par semaine suffit</small></div></div>'+
    (mine.length?mine.map(a=>{const r=state.reconciliations.filter(x=>x.accountId===a.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];const est=accountEstimate(a);return '<div class="reconcile-card"><div><b>'+esc(shortAccountLabel(a))+'</b><small>'+(r?'Dernier rapprochement : '+esc(r.date):'Jamais rapproché')+'</small></div><div class="reconcile-estimate">'+(est===null?'—':money(est))+'</div><button class="secondary reconcile-one" data-id="'+esc(a.id)+'">Rapprocher</button></div>';}).join(''):'<div class="empty-note">Ajoute d’abord tes comptes bancaires.</div>')+settingsBack()
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
 const uid=session?.user?.id;
 const freq=window.TraceReminders?.frequency?.(uid)||'two_days';
 openSheet('Rappels d’import',
   '<div class="settings-hero"><span class="pico large">'+uiIcon('bell')+'</span><div><b>Ton budget à jour</b><small>Un petit rappel adapté à ton rythme</small></div></div>'+
   '<p class="empty-note">TRACE te rappelle d’importer tes opérations si aucun nouvel import n’a été détecté depuis le délai choisi.</p>'+
   '<div class="trace-reminder-choice">'+
    ['daily','two_days','off'].map((id,i)=>'<label><input type="radio" name="traceReminderFrequency" value="'+id+'"'+(freq===id?' checked':'')+'><span>'+['Chaque jour','Tous les 2 jours','Désactivé'][i]+'</span></label>').join('')+
   '</div>'+
   '<div class="empty-note">Pour l’instant, le rappel apparaît à l’ouverture de TRACE ou au retour dans l’application. Il ne s’agit pas encore d’une notification push quand TRACE est fermée. Ce réglage est personnel et enregistré sur cet appareil.</div>'+
   '<button class="primary full" id="traceSaveReminder" type="button">Enregistrer mon choix</button>'+settingsBack()
 );
 $('#traceSaveReminder').onclick=()=>{
  const choice=$('input[name="traceReminderFrequency"]:checked')?.value||'two_days';
  window.TraceReminders?.setFrequency?.(uid,choice);
  profile();
 };
 bindSettingsBack();
}
function openTraceDeletion(){
 const solo=(state.household.workspaceMembers||[]).length<2;
 openSheet('Supprimer mes données TRACE',
  '<div class="trace-delete-warning"><strong>Suppression définitive des données TRACE</strong>'+
   '<p>Pour un foyer personnel, cette action efface les comptes, transactions, budgets, captures importées enregistrées et paramètres du foyer. Ces informations ne pourront pas être restaurées depuis TRACE.</p>'+
   '<p><b>Important :</b> ton identité de connexion Supabase est conservée, car elle peut également servir à PickPoint. C’est une suppression de tes données TRACE, pas de ton compte de connexion commun.</p>'+
   (solo?'':'<p><b>Foyer partagé :</b> la suppression automatique est désactivée pour protéger les données de ton partenaire. Aucune donnée ne sera supprimée.</p>')+
  '</div>'+
  (solo?
    '<div class="trace-delete-form"><label for="traceDeleteWord">Pour confirmer, écris SUPPRIMER</label>'+
    '<input class="input" id="traceDeleteWord" autocomplete="off" spellcheck="false" placeholder="SUPPRIMER">'+
    '<label for="traceDeletePassword">Saisis ton mot de passe TRACE</label>'+
    '<input class="input" id="traceDeletePassword" type="password" autocomplete="current-password" placeholder="Mot de passe"></div>'+
    '<p class="trace-delete-error" id="traceDeleteError" role="alert"></p>'+
    '<button class="primary full trace-delete-danger" id="traceConfirmDeletion" type="button" disabled>Supprimer définitivement mes données TRACE</button>':
    '<p class="empty-note">Cette version ne supprime pas un foyer contenant plusieurs membres. Cela nécessitera un parcours spécifique de départ et de conservation des données partagées.</p>')+
  settingsBack()
 );
 if(solo){
  const word=$('#traceDeleteWord'),password=$('#traceDeletePassword'),button=$('#traceConfirmDeletion');
  const refresh=()=>{button.disabled=word.value.trim()!=='SUPPRIMER'||!password.value;};
  word.addEventListener('input',refresh);password.addEventListener('input',refresh);
  button.onclick=async()=>{
   button.disabled=true;
   $('#traceDeleteError').textContent='Vérification et suppression en cours…';
   try{
    const address=session?.user?.email;
    if(!address)throw Error('Session introuvable.');
    const auth=await client.auth.signInWithPassword({email:address,password:password.value});
    if(auth.error||!auth.data?.session)throw Error('Mot de passe incorrect ou session expirée.');
    // Backend RPC independently verifies auth.uid() and sole membership, in one DB transaction.
    const result=await client.rpc('trace_delete_my_solo_space');
    if(result.error)throw result.error;
    if(result.data?.deleted!==true)throw Error('Aucun espace TRACE n’a été supprimé.');
    household=null;
    try{await client.auth.signOut();}catch(e){console.warn('TRACE: déconnexion après suppression',e);}
    window.location.replace('./trace-launch-v2.html');
   }catch(e){
    console.error('TRACE: suppression non effectuée',e);
    $('#traceDeleteError').textContent=
      String(e.message||'').includes('TRACE_SHARED_SPACE_PROTECTED')?
      'Foyer partagé : suppression bloquée pour protéger ton partenaire.':
      'Suppression non effectuée : '+String(e.message||'Erreur inconnue')+'. Aucune suppression partielle n’est lancée.';
    refresh();
   }
  };
 }
 bindSettingsBack();
}
function openDataSettings(){
  openSheet('Données & confidentialité',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('shield')+'</span><div><b>Données Trace</b><small>Votre espace couple reste privé à ses membres</small></div></div>'+
    '<label class="label2">Date de référence</label><input id="referenceDateSetting" class="input" type="date" value="'+esc(state.household.referenceDate||CM+'-01')+'">'+
    '<label class="label2">Solde Partage d’ouverture</label><input id="sharingOpeningSetting" class="input" type="number" step="0.01" value="'+Number(state.household.sharingOpeningBalance||0)+'">'+
    '<label class="label2">Le solde Partage correspond à…</label><select id="sharingOpeningModeSetting" class="input"><option value="start"'+(state.household.sharingOpeningBalanceMode!=='end'?' selected':'')+'>Début de la journée (incluse)</option><option value="end"'+(state.household.sharingOpeningBalanceMode==='end'?' selected':'')+'>Fin de la journée (exclue)</option></select>'+
    '<div class="empty-note" style="margin-top:12px">Valeur positive : '+esc(shortMemberName('partner'))+' doit à '+esc(shortMemberName('la'))+'. Valeur négative : '+esc(shortMemberName('la'))+' doit à '+esc(shortMemberName('partner'))+'. L’historique antérieur reste conservé.</div>'+
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
async function loadWorkspace(){showGate('cloudLoadingPanel');loadingStage('Chargement de votre espace…');const{data:m,error:e}=await withTimeout(client.from('household_members').select('household_id,user_id,slot,display_name').eq('user_id',session.user.id).maybeSingle(),7000,'Chargement du profil trop long.');if(e)throw e;if(!m){showGate('cloudWorkspacePanel');return;}document.documentElement.dataset.traceUserId=session.user.id;me=m.slot;partner=me==='la'?'partner':'la';loadingStage('Synchronisation de vos données…');const[{data:h,error:he},{data:docs,error:de},{data:members,error:mee}]=await withTimeout(Promise.all([client.from('households').select('id,name,settings,schema_version,invite_code,created_by').eq('id',m.household_id).single(),client.from('documents').select('collection,item_id,data').eq('household_id',m.household_id),client.from('household_members').select('slot,display_name,role,user_id').eq('household_id',m.household_id)]),9000,'Synchronisation trop longue.');if(he||de||mee)throw he||de||mee;household=h;state={household:{...(h.settings||{}),name:h.name,inviteCode:h.invite_code||'',createdBy:h.created_by||'',workspaceMembers:members.map(x=>({slot:x.slot,name:x.display_name,role:x.role,userId:x.user_id}))},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[],importDays:[],smartImports:[]};if(!Array.isArray(state.household.members)||!state.household.members.length)state.household.members=members.map(x=>({id:x.slot,name:x.display_name,initials:initials(x.display_name)}));members.forEach(x=>{const mm=state.household.members.find(y=>y.id===x.slot);if(mm){mm.name=x.display_name||mm.name;mm.initials=initials(mm.name);}});const map={categories:'categories',accounts:'accounts',budgets:'budgets',transactions:'transactions',investmentAccounts:'investment_accounts',investmentOperations:'investment_operations',reconciliations:'reconciliations',importDays:'import_days',smartImports:'imports'};Object.entries(map).forEach(([k,c])=>state[k]=docs.filter(d=>d.collection===c).map(d=>d.data).filter(Boolean));state.household.referenceDate||=CM+'-01';$('#profileBtn').textContent=member(me).initials||initials(member(me).name);renderAll();navigate((location.hash||'#').slice(1)||'home');hideGate();sync('synced');window.TraceReminders?.refresh?.({userId:session.user.id,createdAt:session.user.created_at,owner:me,accounts:state.accounts,days:state.importDays,imports:state.smartImports});document.dispatchEvent(new Event('trace:workspace-ready'));setTimeout(offerInitialBankSetup,260);if(state.investmentAccounts.some(a=>['EUR','USD'].includes(a.currency)&&a.fxAutoUpdate!==false))setTimeout(()=>refreshPublicPortfolioRates().catch(console.error),350);}
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
    window.TraceEmailConfirmation?.handleSession?.(session);
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
    window.TraceEmailConfirmation?.handleSession?.(session);
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
function bind(){$('#closeSheet').onclick=closeSheet;$('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet();};$$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));$$('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='review'){navigate('activity');showTab('import');}else navigate(b.dataset.go);});$('#quickAdd').onclick=openManualTransaction;$('#profileBtn').onclick=profile;$('#analysisBtn').onclick=analysis;$('#homeTrendCard').onclick=analysis;$('#shareCard').onclick=()=>((state.household.workspaceMembers||[]).length<2?openCoupleSettings():openSharing());$('#shareOpen').onclick=()=>((state.household.workspaceMembers||[]).length<2?openCoupleSettings():openSharing());$$('[data-kpi]').forEach(b=>b.onclick=()=>detail(b.dataset.kpi));$$('#homeScope .seg').forEach(b=>b.onclick=()=>{homeScope=b.dataset.scope;renderHome();});document.querySelectorAll('#budgetScope .seg').forEach(b=>b.onclick=()=>{budgetScope=b.dataset.scope;renderBudget();});$('#budgetMonthPicker')?.addEventListener('change',e=>setBudgetMonth(e.target.value));$('#budgetCurrentMonth')?.addEventListener('click',()=>setBudgetMonth(CM));$('#budgetCopyPrevious')?.addEventListener('click',copyPreviousBudget);$$('#wealthScope .seg').forEach(b=>b.onclick=()=>{wealthScope=b.dataset.scope;renderWealth();});$$('#activityTabs .tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$('#activityMonthPicker')?.addEventListener('change',e=>setActivityMonth(e.target.value));$('#activityPrevMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,-1)));$('#activityNextMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,1)));$('#activityCurrentMonth')?.addEventListener('click',()=>setActivityMonth(CM));$('#annualBudgetDetails').onclick=analysis;$('#annualBudgetCard').onclick=analysis;$('#addAsset').onclick=openInvestmentAccountAdd;$('#wealthAnalysis').onclick=openPortfolioAnalysis;$('#wealthChart').onclick=$('#wealthAnalysis').onclick;$('#chooseImport').onclick=()=>{const input=$('#importFile'),accountId=window.TraceImportCalendar?.selectedAccount?.();if(!accountId||!visibleBankAccounts(me).some(a=>a.id===accountId)){traceNotice('Choisis d’abord le compte bancaire dans Importer.');return;}delete input.dataset.preferredDate;input.dataset.preferredAccount=accountId;input.value='';input.click();};$('#importFile').onchange=e=>{importFile(e.target.files?.[0]);e.target.value='';};document.querySelectorAll('[data-password-target]').forEach(btn=>btn.onclick=()=>{const input=$('#'+btn.dataset.passwordTarget);if(!input)return;const reveal=input.type==='password';input.type=reveal?'text':'password';btn.classList.toggle('active',reveal);btn.setAttribute('aria-pressed',String(reveal));btn.setAttribute('aria-label',reveal?'Masquer le mot de passe':'Afficher le mot de passe');});document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.authTab;$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#cloudLoginForm').classList.toggle('hidden',t!=='login');$('#cloudSignupForm').classList.toggle('hidden',t!=='signup');});$('#cloudLoginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');$('#cloudAuthMessage').textContent='Connexion…';if(btn){btn.disabled=true;btn.textContent='Connexion…';}try{const{data,error}=await client.auth.signInWithPassword({email:$('#cloudLoginEmail').value.trim(),password:$('#cloudLoginPassword').value});if(error)throw error;if(!data?.session)throw new Error('Session non créée');session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Se connecter';}}};$('#cloudSignupForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Création…';}try{const{data,error}=await client.auth.signUp({email:$('#cloudSignupEmail').value.trim(),password:$('#cloudSignupPassword').value,options:{emailRedirectTo:new URL('./index.html',window.location.href).href,data:{display_name:$('#cloudSignupName').value.trim()}}});if(error)throw error;if(data?.session){session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}else{$('#cloudAuthMessage').textContent='Compte créé. Vérifie ton courriel pour confirmer ton adresse.';}}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Créer mon compte';}}};$$('[data-workspace-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.workspaceTab;$('#cloudCreateHouseholdForm').classList.toggle('hidden',t!=='create');$('#cloudJoinHouseholdForm').classList.toggle('hidden',t!=='join');});$('#cloudCreateHouseholdForm').onsubmit=async e=>{
 e.preventDefault();
 const button=e.currentTarget.querySelector('button[type="submit"]');
 if(button)button.disabled=true;
 try{
  const {data,error}=await client.rpc('create_household',{p_name:$('#cloudHouseholdName').value.trim(),p_display_name:$('#cloudCreatorName').value.trim()});
  if(error)throw error;
  const created=Array.isArray(data)?data[0]:data;
  if(!created?.household_id)throw Error('Foyer créé, mais identifiant indisponible. Recharge TRACE.');
  try{await seedNewHouseholdCategories(created.household_id);}
  catch(e){console.warn('Starter categories need recovery:',String(e.message||e));}
  await loadWorkspace();
 }catch(err){$('#cloudWorkspaceMessage').textContent=String(err.message||err);}
 finally{if(button)button.disabled=false;}
};$('#cloudJoinHouseholdForm').onsubmit=async e=>{e.preventDefault();const{error}=await client.rpc('join_household',{p_invite_code:$('#cloudInviteCode').value.trim().toUpperCase(),p_display_name:$('#cloudJoinName').value.trim()});if(error)$('#cloudWorkspaceMessage').textContent=error.message;else loadWorkspace();};}

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
 accounts:()=>visibleBankAccounts(me).map(a=>({id:a.id,name:shortAccountLabel(a),type:accountType(a),opening:openingBoundary(a.id)})),
 smartDrafts,smartDuplicateMatches,smartStageRows,smartSaveDraft,smartIgnoreDraft,smartKeepSingleDraft,smartMoveDraftAccount,smartMoveDayDraftsAccount,smartApproveDraft,smartResetDay,smartCreateCategory,
 savingsAccounts:()=>trackedSavingsAccounts(me).map(a=>({id:a.id,name:a.name,ready:isReadySavingsAccount(a),openingDate:a.openingDate})),
 referenceDate:()=>state.household.referenceDate||'',
 month:()=>activityMonth,
 dayTransactions:(accountId,date)=>state.transactions.filter(t=>t.accountId===accountId&&t.date===date).sort((a,b)=>String(b.id).localeCompare(String(a.id))).map(t=>({id:t.id,name:t.name||'',date:t.date,amountCAD:t.amountCAD,type:t.type,status:t.status,
 label:t.type==='transfer'?(t.toAccountId&&accountType(state.accounts.find(a=>a.id===t.toAccountId))==='card'?'Paiement de carte · hors budget':'Transfert · hors budget'):
 t.type==='external_transfer'?(t.transferPurpose==='savings'?'Versement vers CELI · hors dépenses':'Virement hors budget'):t.type==='external_refund'?'Entrée hors budget':t.type==='income'?'Revenu':t.type==='refund'?'Remboursement':'Dépense'})),
 openTransaction:(id)=>{const tx=state.transactions.find(t=>t.id===id);if(!tx)return;setActivityMonth(tx.date.slice(0,7));navigate('activity');showTab(tx.status==='confirmed'?'transactions':'import');editTransaction(id,tx.status!=='confirmed');},
 goDayTransactions:(date)=>{setActivityMonth(date.slice(0,7));navigate('activity');showTab('transactions');},
 setMonth:setActivityMonth,
 importDays:()=>state.importDays,
 latestImportDay,
 importDayInfo,
 gaps:dailyGaps,
 recordDayImport,
 markDayChecked,
 flagDayAttention,
 clearDayAttention,
 openBatchReview:openImportBatchReview,
 importCategoryOptions:(type)=>manualCategories(type).map(c=>({id:c.id,name:c.name})),
 suggestImportCategory:(row)=>suggestImportCategory({...row,amountCAD:row.amountCAD??row.amount}).categoryId,
 importRecipients:()=>[{id:me,name:'Moi'},{id:'couple',name:'Nous deux'},{id:partner,name:shortMemberName(partner)},{id:'custom',name:'Avec amis / personnalisé'}],
 async quickFinalizeApproved(items){
  // This is invoked only by the explicit "Importer et valider" interaction.
  // Unknown categories remain pending rather than silently changing budgets.
  if(!Array.isArray(items)||items.length>150)throw Error('Lot invalide.');
  const safe=items.filter(row=>{
   const t=state.transactions.find(x=>x.id===row.id);
   return t&&t.status!=='confirmed'&&['image','ocr','pdf','csv'].includes(t.source)&&
    Number(t.amountCAD)>0&&/^\d{4}-\d\d-\d\d$/.test(t.date)&&state.accounts.some(a=>a.id===t.accountId)&&
    manualCategories(t.type).some(c=>c.id===row.categoryId)&&
    [me,partner,'couple','custom'].includes(row.beneficiary)&&
    (row.beneficiary!=='custom'||(()=>{try{traceCustomShares(Number(t.amountCAD),row.friendsAmount,row.partnerAmount);return true;}catch(e){return false;}})());
  });
  let confirmed=0;
  for(const row of safe){
   const t=state.transactions.find(x=>x.id===row.id&&x.status!=='confirmed');
   if(!t)continue;
   const who=t.type==='income'?t.payerId||me:row.beneficiary;
   const sharing=traceImportSplit({...row,beneficiary:who},t);
   const next={...t,categoryId:row.categoryId,...sharing,status:'confirmed'};
   try{await saveDocument('transactions',next);Object.assign(t,next);confirmed++;}
   catch(error){renderAll();throw new Error(confirmed+' opération(s) enregistrée(s). Les autres restent à vérifier : '+error.message);}
  }
  renderAll();
  return{confirmed,pending:items.length-confirmed};
 },
 afterBoundaryFor:(accountId,date)=>afterBoundary(date,openingBoundary(accountId)),
 getBoundary:(accountId)=>openingBoundary(accountId),
 inspect:(candidates,accountId)=>{
  if(!visibleBankAccounts(me).some(a=>a.id===accountId))throw new Error('Compte non reconnu.');
  return candidates.map(row=>{
   if(!row.date)return{status:'date',matchName:'',matchDate:'',amountConflict:false,accountingIncluded:false};
   const t={...row,amountCAD:Number(row.amount),accountId};
   const found=findSimilarTransaction(t);
   // A different amount for the same merchant/day is a separate purchase, not a duplicate.
   const included=isFinancialPeriod(t);
   const match=found?.t;
   return{status:!included?'historical':found?(found.status==='exact'?'already':'possible'):'missing',
     matchName:match?.name||'',matchDate:match?.date||'',matchStatus:match?.status||null,
     amountConflict:false,
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
  let added=0,duplicates=0;const dates=new Set(),savedIds=[],savedRows=[];
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
   const row=rows[rowIndex];
   const amount=Number(row.amount),date=String(row.date||''),name=String(row.name||'').trim().slice(0,80),type=row.type;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name||!(amount>0)||!Number.isFinite(amount)||!['income','expense','refund'].includes(type))throw new Error('Ligne incomplète : date, description ou montant');
   const probe={date,name,type,amountCAD:amount,accountId};
   if(method==='image')dates.add(date);
   const existing=findSimilarTransaction(probe);
   if(existing?.status==='exact'||csvImportedDuplicate(probe,state.transactions)){duplicates++;continue;}
   if(existing?.status==='possible'&&!row.allowPossibleDuplicate)throw new Error('Correspondance possible dans Trace : '+existing.t.name+' du '+existing.t.date+'. Vérifie-la explicitement avant ajout.');
   const share=traceImportSplit({...row,beneficiary:type==='income'?me:row.beneficiary||me},{amountCAD:amount});
   const chosenCategory=manualCategories(type).some(c=>c.id===row.categoryId)?row.categoryId:'';
   const tx={id:txDocId(),date,name,type,amountCAD:amount,amountOriginal:amount,currency:'CAD',rate:1,status:'pending',categoryId:chosenCategory,accountId,payerId:me,...share,
    source:method,importFileName:fileName,recurring:false,excludedByOpening:!isFinancialPeriod(probe)};
   tx.importFingerprint=csvFingerprint(tx);
   try{await saveDocument('transactions',tx);state.transactions.push(tx);savedIds.push(tx.id);savedRows.push({rowIndex,id:tx.id});added++;}
   catch(error){renderAll();throw error;}
  }
  let coverageWarning='';
  if(method==='image')for(const d of dates){try{await recordDayImport(accountId,d,method);}catch(e){coverageWarning='L’opération a été conservée, mais le suivi du jour n’a pas pu être enregistré.';console.warn(e);}}
  renderAll(); // Garder l'écran Importer visible lors d'une série de captures.
  return{added,duplicates,coverageWarning,dates:[...dates],ids:savedIds,savedRows};
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
