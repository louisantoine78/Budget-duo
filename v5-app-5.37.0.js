(()=>{'use strict';window.__TRACE_BUILD__='5.37.0';
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
let internationalQuotes={},internationalQuoteAttempt=new Set(),internationalFxBusy=false;
// 5.37 candidate: revisions are server-owned; never fall back to unchecked writes.
const traceDocRevisions=new Map(),traceWriteQueues=new Map();
let traceSettingsRevision=null,traceWritesBlocked=false;
const traceWriteKey=(collection,id)=>JSON.stringify([String(collection),String(id)]);
// Safety quarantine until deferred postings, allocations and server-side CAS/RLS
// are qualified on fictitious PostgreSQL. This is defense-in-depth on the
// candidate client, NOT a substitute for a PostgreSQL constraint or bank proof.
function traceRefuseUnqualifiedDeferredWrite(collection,item){
 const accounts=Array.isArray(state?.accounts)?state.accounts:[];
 // Legacy card rows may have no 'type'; accountType() infers card by name.
 // Any reserved deferred payment mode must remain non-persistable, fail closed.
 const deferred=a=>a?.paymentMode==='deferred';
 const stored=accounts.find(a=>String(a?.id||'')===String(item?.id||''));
 if(collection==='accounts'){
  if(deferred(item)||deferred(stored))
   throw Error('TRACE_DEFERRED_NOT_RELEASED : modification de carte différée non activée.');
  return;
 }
 if(!['transactions','imports','import_days','reconciliations','investment_operations'].includes(collection)||
    !item||typeof item!=='object')return;
 const fields=['accountId','cardAccountId','toAccountId',
  'linkedCardAccountId','sourceAccountId','destinationAccountId','bankAccountId'];
 const mentionsDeferred=fields.some(field=>accounts.some(a=>
  deferred(a)&&item[field]!==undefined&&item[field]!==null&&
  String(item[field])===String(a.id)));
 const explicitDeferred=item.deferredKind!==null&&
  item.deferredKind!==undefined&&String(item.deferredKind).trim()!==''||
  ['deferred_settlement','deferred_purchase'].includes(item.type)||
  item.transferPurpose==='deferred_settlement'||
  ['partial','full'].includes(item.settlementMode)||
  item.purchaseIds!==undefined||item.feeIds!==undefined||
  ['deferredPurchaseId','deferredPurchaseIds','deferredFeeIds',
   'deferredSettlementMode','deferredDueDate','deferredBankEvidence',
   'deferredBankEvidenceReviewed'].some(field=>Object.prototype.hasOwnProperty.call(item,field));
 if(mentionsDeferred||explicitDeferred)
  throw Error('TRACE_DEFERRED_NOT_RELEASED : écriture différée en attente de qualification bancaire/serveur.');
}
function traceRevision(value){
 const n=Number(value);
 if(value===null||value===undefined||value===''||!Number.isSafeInteger(n)||n<0)
  throw Error('Révision serveur absente : TRACE refuse une écriture sans protection.');
 return n;
}
async function traceSerialWrite(key,task){
 const prior=traceWriteQueues.get(key)||Promise.resolve();
 const next=prior.catch(()=>{}).then(task);
 traceWriteQueues.set(key,next);
 try{return await next;}finally{if(traceWriteQueues.get(key)===next)traceWriteQueues.delete(key);}
}
function traceConflictNotice(){
 traceWritesBlocked=true;
 const host=document.querySelector('#app')||document.body;
 let node=document.querySelector('#traceWriteConflict');
 if(!node){
  node=document.createElement('section');node.id='traceWriteConflict';
  node.className='trace-conflict-alert card';node.setAttribute('role','alert');
  const title=document.createElement('strong');
  title.textContent='Un autre appareil a modifié ces données.';
  const detail=document.createElement('p');
  detail.textContent='La sauvegarde a été refusée pour protéger les dernières écritures. Copie toute saisie importante avant de recharger TRACE.';
  const button=document.createElement('button');button.type='button';
  button.className='primary';button.textContent='Recharger les données récentes';
  button.onclick=()=>{if(window.confirm('Les changements non enregistrés sur cet appareil seront perdus. Recharger TRACE ?'))location.reload();};
  node.append(title,detail,button);host.prepend(node);
 }
 sync('error','Conflit de données — rechargement nécessaire');
}
function traceSaveFailure(error){
 if(/TRACE_WRITE_CONFLICT/.test(String(error?.message||'')))traceConflictNotice();
 else sync('error');
 return error;
}
let activityAccountFilter='all';
let activityFilters={category:'all',nature:'all',currency:'all',status:'confirmed'};
function internationalPreviewMode(){
 return window.__TRACE_INTERNATIONAL_PREVIEW__===true&&
  String(location.pathname||'').split('/').pop()==='trace-international-preview.html'&&
  typeof window.TraceInternationalPreviewFixtures?.create==='function';
}
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
function sync(k,t){if(traceWritesBlocked&&k==='synced'){k='error';t='Conflit de données — rechargement nécessaire';}$('#syncPill').dataset.status=k;$('#syncLabel').textContent=(t||({synced:'Synchronisé',loading:'Connexion…',error:'Erreur'}[k]||k))+' · v'+window.__TRACE_BUILD__;}
function openSheet(t,h){$('#sheetBackdrop').classList.remove('trace-premium-edit','trace-premium-movement','trace-premium-settlement','trace-premium-manual');$('#sheetTitle').textContent=t;$('#sheetBody').innerHTML=h;$('#sheetBackdrop').classList.add('open');document.body.classList.add('sheet-open');}
function closeSheet(){$('#sheetBackdrop').classList.remove('open');document.body.classList.remove('sheet-open');}
function split(t,id){const n=t.splitAmounts?.[id];if(n!==undefined&&n!==null&&Number.isFinite(Number(n))&&Number(n)>=0)return Number(n);const d=state.household.defaultSplit||{la:50,partner:50};return Math.round(Number(t.amountCAD||0)*Number(t.split?.[id]??d[id]??50))/100;}
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
 return me==='la'?{la:mine/100,partner:(t-mine)/100}:{la:(t-mine)/100,partner:mine/100};
}
function defaultBudgetAllocation(item,total){
 const t=Math.round(Number(total||0)*100)/100;
 const previous=item?.shareAmounts;
 if(previous&&Math.abs(Number(previous.la)+Number(previous.partner)-t)<.011)
  return budgetAllocation(t,previous[me]);
 const split=state.household.categorySplits?.[item?.categoryId]||
  state.household.defaultSplit||{la:50,partner:50};
 const mine=Math.round(t*Number(split[me]??50))/100;
 return budgetAllocation(t,Math.min(t,Math.max(0,mine)));
}
function budgetShareFields(item,scopeValue,amount){
 const isShared=scopeValue==='couple',share=defaultBudgetAllocation(item,amount);
 return '<div class="trace-budget-share'+(isShared?'':' hidden')+'" id="budgetShareFields">'+
  '<div class="trace-budget-share-heading"><strong>Répartir le montant</strong><small>Les deux parts doivent former le total prévu.</small></div>'+
  '<div class="trace-budget-share-grid"><label>Ma part ($)<input class="input" type="number" inputmode="decimal" min="0" step=".01" id="budgetMineAmount" value="'+share[me].toFixed(2)+'"></label>'+
  '<label>Part de '+esc(shortMemberName(partner))+' ($)<input class="input" type="number" inputmode="decimal" min="0" step=".01" id="budgetPartnerAmount" value="'+share[partner].toFixed(2)+'"></label></div>'+
  '<div class="trace-budget-share-total" id="budgetSharePreview">Couple : '+money(amount)+' · Moi : '+money(share[me])+' · '+esc(shortMemberName(partner))+' : '+money(share[partner])+'</div></div>';
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
 const acc=t.accountId||t.toAccountId;
 if(start&&date<start&&window.TraceInternational.currency(state.accounts.find(a=>a.id===acc))==='CAD')return false;
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
 const aAmount=Number(a.bankAmount??a.amountCAD??a.amount),bAmount=Number(b.bankAmount??b.amountCAD??b.amount);
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

/* Deferred purchase, budget and bank dates are separate by design.
 * Only explicitly tagged deferred records can override budget-period selection.
 * Unreviewable tagged dates are excluded rather than silently posted in the
 * purchase or debit month. The bank ledger still uses t.date unchanged. */
function traceBudgetPostingMonth(t){
 if((t.type==='expense'&&t.deferredKind==='purchase')||
    (t.type==='refund'&&t.deferredKind==='merchant_refund')){
  return window.TraceInternational?.calendarDate?.(t.budgetDate)?
   t.budgetDate.slice(0,7):null;
 }
 return String(t.date||'').slice(0,7);
}
function txs(m,s,confirmed=true){
 return state.transactions.filter(t=>traceBudgetPostingMonth(t)===m&&
  isFinancialPeriod(t)&&(!confirmed||t.status==='confirmed')&&
  (s==='couple'||t.beneficiary===s||t.beneficiary==='couple'||
   (t.beneficiary==='custom'&&split(t,s)>.005)||
   (t.payerId===s&&['income','transfer','external_refund'].includes(t.type))));
}
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
 const I=window.TraceInternational,code=I.currency(a);
 const r=state.reconciliations.filter(x=>x.accountId===a.id&&
   (!x.status||['confirmed','complete','matched'].includes(x.status))&&x.confirmed!==false&&
   I.calendarDate(x.date)&&String(x.currency||'CAD').toUpperCase()===code&&
   I.exactMoney(x.actualBalance)!==null).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];
 const b=state.household.accountOpeningBalances||{},d=state.household.accountOpeningBalanceDates||{};
 const rawBase=I.exactMoney(r?r.actualBalance:b[a.id]);
 // Card statements normally show a positive DEBT. TRACE stores a negative
 // financial balance; older settings/reconciliations sometimes stored debt as positive.
 // Interpret those historical amounts without rewriting the user's stored records.
 const base=rawBase===null?null:accountType(a)==='card'&&r?.cardBalanceKind!=='credit'?-Math.abs(rawBase):rawBase;
 const boundary=r?{date:r.date,mode:'end'}:openingBoundary(a.id);
 if(base===null||!I.calendarDate(boundary.date))return null;
 const movement=state.transactions.filter(t=>t.status==='confirmed'&&(t.accountId===a.id||t.toAccountId===a.id)&&afterBoundary(t.date,boundary)).reduce((x,t)=>{
  if(t.type==='card_statement_evidence')return x;
  const v=window.TraceInternational.amountOnAccount(t,a,t.toAccountId===a.id?'destination':'source');
  if(v===null||!Number.isFinite(v))return NaN;
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
 const investMovement=state.investmentOperations.filter(o=>o.bankAccountId===a.id&&
   (!o.status||o.status==='confirmed')&&afterBoundary(o.date,boundary)).reduce((v,o)=>{
    if(!['deposit','withdrawal'].includes(o.type))return v;
    if(o.linkedTransactionId&&state.transactions.some(t=>t.id===o.linkedTransactionId&&
     t.status==='confirmed'&&(t.accountId===a.id||t.toAccountId===a.id)))return v;
    const native=window.TraceInternational.investmentBankAmount(o,a);
    return native===null?NaN:v+(o.type==='deposit'?-native:native);
   },0);
 const total=base+movement+investMovement;return Number.isFinite(total)?total:null;
}
function bank(s){
 const owners=s==='couple'?['la','partner']:[s];
 let checking=0,card=0,cardDebt=0,cardCredit=0,hc=false,hv=false,missingChecking=false,missingCard=false;
 state.accounts.filter(a=>owners.includes(a.owner)&&!a.archived&&window.TraceInternational.currency(a)==='CAD').forEach(a=>{
  const v=accountEstimate(a);if(v===null){
   if(accountType(a)==='checking')missingChecking=true;
   if(accountType(a)==='card')missingCard=true;
   return;
  }
  if(accountType(a)==='checking'){checking+=v;hc=true;}
  if(accountType(a)==='card'){
   card+=v;cardDebt+=Math.max(0,-v);cardCredit+=Math.max(0,v);hv=true;
  }
 });
 // The card balance is signed internally: negative = debt, positive = credit.
 // Never add an unverified apparent card credit to current-account liquidity.
 return {checking:hc&&!missingChecking?checking:null,card:hv&&!missingCard?card:null,
  cardDebt:hv&&!missingCard?cardDebt:null,cardCredit:hv&&!missingCard?cardCredit:null,
  needsCardReview:hv&&cardCredit>.005,
  net:hc&&!missingChecking&&!missingCard?checking-cardDebt:null};
}

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
 const b=coupleBalance(),creditor=b>0?'la':'partner',debtor=b>0?'partner':'la',rows=sharingHistory(),
   friends=['la','partner'].flatMap(owner=>window.TraceMovement.friendReceivables(state.transactions,owner)),
   friendDue=friends.reduce((sum,entry)=>sum+entry.outstandingCAD,0),
   fmtFriends=value=>window.TraceInternational.money(value,'CAD');
 openSheet('Partage du couple',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('heart')+'</span><div><b>'+(Math.abs(b)<.01?'Vous êtes à l’équilibre':esc(member(debtor).name)+' doit '+money(Math.abs(b))+' à '+esc(member(creditor).name))+'</b><small>Solde depuis le '+esc(state.household.referenceDate||'début')+' · répartition réelle de chaque dépense</small></div></div>'+
  '<button type="button" class="primary full" id="addSettlement" style="margin-top:14px">Enregistrer un règlement</button>'+'<button type="button" class="secondary full" id="editTricountOpening" style="margin-top:8px">'+(Number(state.household.sharingOpeningBalance||0)!==0?'Modifier le solde repris de Tricount':'Reprendre le solde de Tricount')+'</button>'+'<div class="empty-note" style="margin-top:9px">Solde initial Tricount : '+(Number(state.household.sharingOpeningBalance||0)>=0?'+':'−')+money(Math.abs(Number(state.household.sharingOpeningBalance||0)))+' (positif = '+esc(shortMemberName('partner'))+' doit à '+esc(shortMemberName('la'))+')</div>'+
  '<div class="section-head"><h2>Avances aux proches</h2></div>'+
   '<div class="empty-note">Créances restantes : '+fmtFriends(friendDue)+'. Ces montants sont distincts du solde du couple et ne sont pas des revenus. Les anciennes parts Amis sans prénom restent à attribuer.</div>'+
   (friends.length?friends.map(friend=>'<details class="trace-list-btn">'+
    '<summary><span><b>'+esc(friend.name)+'</b><small>Avancées par '+esc(shortMemberName(friend.owner))+
    ' · '+friend.advances.length+' dépense(s) · remboursé : '+fmtFriends(friend.receivedCAD)+'</small></span>'+
    '<strong>'+fmtFriends(friend.outstandingCAD)+' restant</strong></summary>'+
    friend.advances.map(advance=>'<div class="empty-note">'+esc(advance.label)+
      ' · '+esc(advance.date)+' · avancé : '+fmtFriends(advance.advancedCAD)+
      ' · remboursé : '+fmtFriends(advance.receivedCAD)+
      ' · reste : '+fmtFriends(advance.outstandingCAD)+
      (advance.overpaid?' · écart à vérifier':'')+'</div>').join('')+
    '</details>').join(''):'<div class="empty-note">Aucune avance aux proches confirmée pour le moment.</div>')+
   '<div class="section-head"><h2>Historique partagé</h2></div>'+
  (rows.length?rows.map(({t,delta})=>'<div class="trace-list-btn"><span><b>'+esc(t.name||'Opération')+'</b><small>'+esc(t.date)+' · '+(t.type==='transfer'?'Règlement':esc(member(t.payerId||me).name)+' a payé '+money(t.amountCAD))+'</small></span><strong class="'+(delta<0?'trace-positive':'')+'">'+(delta>0?'+':'−')+money(Math.abs(delta))+'</strong></div>').join(''):'<div class="empty-note">Aucun mouvement commun depuis le début de votre suivi.</div>'));
 $('#addSettlement').onclick=()=>openSettlement(null);$('#editTricountOpening').onclick=editTricountOpening;
}
function openSettlement(original){
 const balance=coupleBalance(),defaultPayer=balance>0?'partner':'la';
 const payer=original?.payerId||defaultPayer;
 const amount=original?.amountCAD??(Math.abs(balance)>.005?Math.abs(balance):0);
 openSheet(original?'Modifier le règlement':'Règlement entre partenaires',
  '<div class="trace-edit-layout trace-settlement-edit-layout">'+
   '<p class="trace-edit-lead">Un règlement entre vous deux déplace de l’argent, mais n’ajoute aucune dépense ou revenu dans votre budget.</p>'+
   '<section class="trace-edit-card" aria-labelledby="traceSettlePeople">'+
     '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">01</span><div><h3 id="traceSettlePeople">Qui rembourse ?</h3><p>Le règlement entre partenaires</p></div></div>'+
     '<label class="label2" for="settlePayer">Compte de la personne qui rembourse</label>'+
     '<div class="trace-edit-control trace-edit-select-control"><select class="input" id="settlePayer"><option value="la">'+esc(shortMemberName('la'))+'</option><option value="partner">'+esc(shortMemberName('partner'))+'</option></select></div>'+
   '</section>'+
   '<section class="trace-edit-card" aria-labelledby="traceSettleDetails">'+
     '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">02</span><div><h3 id="traceSettleDetails">Détails du règlement</h3><p>Montant et date</p></div></div>'+
     '<label class="label2" for="settleAmount">Montant</label>'+
     '<div class="trace-edit-control trace-edit-money-control"><input class="input" type="number" id="settleAmount" min="0.01" step="0.01" inputmode="decimal" value="'+Number(amount)+'"><span class="trace-edit-currency" aria-hidden="true">CAD</span></div>'+
     '<label class="label2" for="settleDate">Date</label>'+
     '<div class="trace-edit-control trace-edit-date-control"><span class="trace-edit-date-display" id="settleDateDisplay" aria-hidden="true">'+esc(traceEditorDateLabel(original?.date||localDateISO()))+'</span><span class="trace-edit-date-icon" aria-hidden="true"></span><input class="input" type="date" id="settleDate" value="'+esc(original?.date||localDateISO())+'"></div>'+
   '</section>'+
   '<section class="trace-edit-card" aria-labelledby="traceSettleAccounts">'+
     '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">03</span><div><h3 id="traceSettleAccounts">Comptes concernés</h3><p>D’où part l’argent et où arrive-t-il ?</p></div></div>'+
     '<label class="label2" for="settleFrom">Compte débité</label><div class="trace-edit-control trace-edit-select-control"><select class="input" id="settleFrom"></select></div>'+
     '<label class="label2" for="settleTo">Compte crédité</label><div class="trace-edit-control trace-edit-select-control"><select class="input" id="settleTo"></select></div>'+
   '</section>'+
   '<section class="trace-edit-impact trace-bank-impact"><div class="trace-edit-impact-head"><span class="trace-edit-impact-symbol" aria-hidden="true">↗</span><div><h3>Aperçu de l’impact</h3></div></div><div class="trace-bank-impact-summary" id="settlePreview" aria-live="polite">Aucun revenu ni nouvelle dépense budgétaire.</div></section>'+
   '<div class="trace-edit-actions-secondary">'+
    '<button type="button" id="cancelSettlement">Annuler</button>'+
    (original?'<button type="button" class="trace-edit-delete" id="removeSettlement">Supprimer ce règlement</button>':'')+
   '</div>'+
   '<div class="trace-edit-actions"><button class="primary full trace-edit-save" id="saveSettlement" type="button">Enregistrer le règlement</button></div>'+traceFeedback()+
  '</div>');
 $('#sheetBackdrop').classList.add('trace-premium-edit','trace-premium-settlement');
 $('#settlePayer').value=payer;
 const settleDate=$('#settleDate'),settleDateDisplay=$('#settleDateDisplay');
 const refreshSettleDate=()=>{settleDateDisplay.textContent=traceEditorDateLabel(settleDate.value);};
 settleDate.addEventListener('change',refreshSettleDate);
 settleDate.addEventListener('input',refreshSettleDate);refreshSettleDate();
 const refreshSettlePreview=()=>{
  const from=$('#settlePayer').value==='la'?'la':'partner';
  const to=from==='la'?'partner':'la';
  const val=Number($('#settleAmount').value);
  $('#settlePreview').textContent=Number.isFinite(val)&&val>0?
   shortMemberName(from)+' : −'+money(val)+' · '+shortMemberName(to)+' : +'+money(val)+' · Aucun revenu ni dépense budgétaire':
   'Choisis un montant valide pour voir l’impact.';
 };
 $('#settleAmount').addEventListener('input',refreshSettlePreview);
 $('#settlePayer').addEventListener('change',refreshSettlePreview);refreshSettlePreview();
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

/* TRACE Home — actionable bank review from both pipelines, excluding double-counted drafts. */
function homeReviewAccounts(){
 const accounts=visibleBankAccounts(me),notConfirmed=state.transactions.filter(t=>t.status!=='confirmed');
 const existingIds=new Set(state.transactions.map(t=>t.id));
 return accounts.map(a=>{
  const existing=notConfirmed.filter(t=>t.accountId===a.id).length;
  const drafts=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.status==='pending'&&d.accountId===a.id&&!existingIds.has('t_'+d.id)).length;
  const unresolved=state.importDays.filter(d=>d.accountId===a.id).reduce((n,d)=>n+Math.max(0,Number(d.unresolvedCount)||0),0);
  return{id:a.id,name:shortAccountLabel(a),type:accountType(a),drafts,existing,unresolved,total:drafts+existing};
 });
}
function openHomeReviewAccount(id){
 const row=homeReviewAccounts().find(x=>x.id===id);if(!row)return;
 navigate('activity');
 if(row.drafts){
  showTab('import');
  window.TraceImportCalendar?.selectAccount?.(id);
  window.TraceSmartInbox?.overview?.(id);
  return;
 }
 if(row.existing){
  showTab('transactions');
  const list=state.transactions.filter(t=>t.accountId===id&&t.status!=='confirmed');
  openSheet('À vérifier · '+esc(row.name),'<p class="empty-note">Opérations enregistrées mais non confirmées sur ce compte.</p>'+
   list.map(t=>'<button type="button" class="trace-list-btn" data-home-review-tx="'+esc(t.id)+'"><span><b>'+esc(t.name||'Opération')+'</b><small>'+esc(t.date||'Date à renseigner')+'</small></span><strong>'+money(t.amountCAD||0)+' ›</strong></button>').join(''));
  $$('[data-home-review-tx]').forEach(b=>b.onclick=()=>editTransaction(b.dataset.homeReviewTx,true));
  return;
 }
 showTab('import');window.TraceImportCalendar?.selectAccount?.(id);
}
function renderHomeReview(){
 const rows=homeReviewAccounts(),total=rows.reduce((n,r)=>n+r.total,0);
 const badge=$('#pendingCountBadge'),summary=$('#pendingText'),root=$('#homeReviewAccounts');
 if(badge)badge.textContent=String(total);
 if(summary)summary.textContent=total?total+' opération'+(total>1?'s':'')+' à vérifier · '+rows.filter(x=>x.total).length+' compte'+(rows.filter(x=>x.total).length>1?'s':''):'Tout est à jour';
 if(!root)return;
 if(!rows.length){
  root.innerHTML='<p class="empty-note">Ajoute un compte courant ou une carte depuis Profil → Mes comptes.</p>';return;
 }
 root.innerHTML=rows.map(a=>{
  const title=a.type==='checking'?'Compte courant':a.type==='card'?'Carte de crédit':a.name;
  const sub=a.total?[a.drafts?a.drafts+' import(s) à confirmer':'',a.existing?a.existing+' transaction(s) à compléter':''].filter(Boolean).join(' · '):'Aucune opération en attente';
  const add=a.unresolved?' · '+a.unresolved+' ligne(s) OCR à revérifier':'';
  return '<button type="button" class="trace-home-review-account'+(a.total?' has-pending':'')+'" data-home-review-account="'+esc(a.id)+'">'+
   '<span class="trace-home-review-info"><strong>'+esc(title)+'</strong><small>'+esc(a.name)+'</small><small>'+esc(sub+add)+'</small></span>'+
   '<span class="trace-home-review-count" aria-label="'+a.total+' opération(s) à vérifier">'+a.total+'</span>'+
   '<span class="trace-home-review-chevron" aria-hidden="true">›</span></button>';
 }).join('')+
  '<div class="trace-home-next-actions" role="group" aria-label="Actions pour tenir les comptes à jour">'+
  '<button type="button" class="trace-home-next-action" data-home-next-action="imports">'+
  '<span aria-hidden="true">↓</span><span><strong>Importer</strong><small>Relevés et captures</small></span></button>'+
  '<button type="button" class="trace-home-next-action" data-home-next-action="reconcile">'+
  '<span aria-hidden="true">✓</span><span><strong>Rapprocher</strong><small>Vérifier les soldes</small></span></button>'+
  '<button type="button" class="trace-home-next-action" data-home-next-action="reminders">'+
  '<span aria-hidden="true">◷</span><span><strong>Rappels</strong><small>Gérer mes alertes</small></span></button></div>';
 root.querySelectorAll('[data-home-review-account]').forEach(btn=>btn.onclick=()=>openHomeReviewAccount(btn.dataset.homeReviewAccount));
 root.querySelectorAll('[data-home-next-action]').forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.homeNextAction==='imports'){navigate('activity');showTab('import');}
  else if(btn.dataset.homeNextAction==='reconcile')openReconcileSettings();
  else if(btn.dataset.homeNextAction==='reminders')openNotificationSettings();
 });
}
window.TraceHomeReview={refresh:renderHomeReview};

// Insights are derived from confirmed entries; no fabricated history is stored.
function insightMonths(scopeValue){
 return months6().map(m=>{
  const val=summary(m,scopeValue),hasData=txs(m,scopeValue,true).length>0||
   state.budgets.some(b=>b.month===m&&budgetAmt(b,scopeValue)>0);
  return{month:m,...val,budget:val.eb,hasData,current:m===CM};
 });
}
function insightYear(year,scopeValue,selected){
 return Array.from({length:12},(_,i)=>{
  const m=year+'-'+String(i+1).padStart(2,'0'),v=summary(m,scopeValue);
  return{month:m,budget:v.eb,expense:v.expense,income:v.income,elapsed:m<=CM,
   current:m===CM,selected:m===selected,
   hasBudget:state.budgets.some(b=>b.month===m&&budgetAmt(b,scopeValue)>0),
   hasTransactions:txs(m,scopeValue,true).length>0};
 });
}
function insightCategoryDrilldown(month,scopeValue,categoryId){
 const category=state.categories.find(c=>c.id===categoryId),
  listed=txs(month,scopeValue,true).filter(t=>categoryId?t.categoryId===categoryId:
   !state.categories.some(c=>c.type==='expense'&&!c.archived&&c.id===t.categoryId));
 const expenses=listed.filter(t=>['expense','group_expense','person_payment','refund'].includes(t.type));
 const amount=expenses.reduce((n,t)=>n+(t.type==='refund'?-alloc(t,scopeValue):alloc(t,scopeValue)),0);
 openSheet('Dépenses · '+esc(category?.name||'Autres'),
  '<div class="trace-insight-sheet-intro"><strong>'+money(Math.max(0,amount))+'</strong><small>'+esc(monthLabel(month))+' · ta part selon le filtre sélectionné</small></div>'+
  (expenses.length?expenses.map(txRow).join(''):'<div class="empty-note">Aucune opération confirmée dans cette catégorie.</div>')+
  '<div class="trace-insights-foot">Les virements et paiements de carte sont exclus des dépenses de consommation.</div>'+  '<button type="button" class="primary full" id="traceBudgetToActivity" style="margin-top:12px">Voir dans Activité ›</button>');
 $$('[data-tx-open]').forEach(el=>el.onclick=()=>editTransaction(el.dataset.txOpen));
 $('#traceBudgetToActivity').onclick=()=>openActivityCategory(month,categoryId);
}
function insightWealthData(scopeValue,bankResult,ports,missing){
 const owners=scopeValue==='couple'?['la','partner']:[scopeValue],accounts=state.investmentAccounts.filter(a=>owners.includes(a.owner));
 const included=ports.map(({a,p})=>({name:a.name||a.type||'Compte',cad:p.cad,ready:p.hasFx&&
  (a.savingsTracking!=='linked'||p.configured),linked:a.savingsTracking==='linked'}));
 const flows=[];
 accounts.forEach(a=>{
  if(a.savingsTracking==='linked'){
   linkedSavingsMovements(a).forEach(t=>{
    const deposit=t.type==='external_transfer',amount=Number(t.amountCAD);
    if(Number.isFinite(amount)&&amount>0)flows.push({month:String(t.date||'').slice(0,7),kind:deposit?'deposit':'withdrawal',amount});
   });
  }else{
   state.investmentOperations.filter(o=>o.accountId===a.id&&['deposit','withdrawal'].includes(o.type)).forEach(o=>{
    // Historical contribution flows must not be revalued at today's FX rate.
    const amount=window.TraceInternational.exactMoney(a.currency==='CAD'?o.amount:o.bankAmountCAD);
    if(amount!==null&&amount>0)flows.push({month:String(o.date||'').slice(0,7),kind:o.type,amount});
   });
  }
 });
 return{checking:bankResult.checking,cardDebt:bankResult.cardDebt,investments:included,flows,
  hasIncomplete:missing.length>0||bankResult.net===null||bankResult.needsCardReview};
}
function openAnnualBudgetAnalysis(){
 const month=budgetMonth,sId=scope(budgetScope),year=month.slice(0,4);
 openSheet('Mon année '+year,'<div id="traceAnnualDetail"></div>');
 window.TraceInsights.renderAnnual($('#traceAnnualDetail'),{year,months:insightYear(year,sId,month)});
 $$('#traceAnnualDetail [data-insight-month]').forEach(b=>b.onclick=()=>{
  setBudgetMonth(b.dataset.insightMonth);closeSheet();navigate('budget');
 });
}

/* TRACE 5.37 UX — read-only account overview and detail, no fabricated FX. */
function traceAccountTitle(a){
 return accountType(a)==='card'?(a.paymentMode==='deferred'?'Carte à débit différé':'Carte de crédit'):
  a.country==='FR'?'Compte à débit immédiat':'Compte courant';
}
function traceAccountNative(a){
 const value=accountEstimate(a);
 return value===null||!Number.isFinite(value)?'Solde à vérifier':
  accountType(a)==='card'?
    (value<0?window.TraceInternational.money(Math.abs(value),window.TraceInternational.currency(a))+' de dette':
     value>0?'Avoir estimé '+window.TraceInternational.money(value,window.TraceInternational.currency(a)):
      window.TraceInternational.money(0,window.TraceInternational.currency(a))):
  window.TraceInternational.money(value,window.TraceInternational.currency(a));
}
function traceAccountCAD(a){
 const value=accountEstimate(a),currency=window.TraceInternational.currency(a);
 if(value===null||!Number.isFinite(value))return'Conversion indisponible · solde à vérifier';
 if(currency==='CAD')return'Montant natif CAD';
 const quote=internationalQuotes[currency];
 if(!quote)return'Conversion indisponible · taux '+currency+' manquant';
 const converted=window.TraceInternational.fxValue(value,currency,quote);
 return converted===null||!Number.isFinite(converted)?'Conversion indisponible · taux à vérifier':
  'Équivalent indicatif : '+window.TraceInternational.money(converted,'CAD')+
   (quote.date?' · taux du '+esc(quote.date):'');
}
function traceAccountOperations(id){
 return state.transactions.filter(t=>t.accountId===id||t.toAccountId===id)
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||
   String(b.id||'').localeCompare(String(a.id||'')));
}
function openAccountsOverview(){
 const accounts=state.accounts.filter(a=>!a.archived&&['la','partner'].includes(a.owner)&&
  ['checking','card'].includes(accountType(a))&&
  (homeScope==='couple'||a.owner===me));
 openSheet('Comptes et trésorerie',
  '<p class="trace-intl-help">Soldes en devise native. Les contre-valeurs CAD restent indicatives et peuvent être indisponibles.</p>'+
  '<div class="trace-account-overview">'+(accounts.length?accounts.map(a=>
   '<button type="button" class="trace-account-overview-row" data-trace-account-open="'+esc(a.id)+'">'+
   '<span><b>'+esc(shortAccountLabel(a))+
   (a.owner===me&&state.household.primaryBankAccountByOwner?.[me]===a.id?' <span aria-label="Compte principal">★</span>':'')+
   '</b><small>'+esc(traceAccountTitle(a))+' · '+esc(shortMemberName(a.owner))+
   ' · '+esc(window.TraceInternational.currency(a))+'</small></span>'+
   '<span class="trace-account-overview-values"><strong>'+esc(traceAccountNative(a))+
   '</strong><small>'+traceAccountCAD(a)+'</small></span></button>').join(''):
   '<p class="empty-note">Aucun compte disponible.</p>')+'</div>'+
  '<button type="button" class="secondary full" id="traceAccountManage" style="margin-top:12px">Gérer mes comptes</button>'+
  '<button type="button" class="secondary full" id="traceAccountsClose" style="margin-top:8px">Fermer</button>');
 $$('[data-trace-account-open]').forEach(btn=>btn.onclick=()=>openTraceAccountDetail(btn.dataset.traceAccountOpen));
 $('#traceAccountManage').onclick=openAccountSettings;
 $('#traceAccountsClose').onclick=closeSheet;
}
function traceDeferredAccountReview(card){
 // Read-only bridge from existing TRACE ledger documents to the deferred lab.
 // NEVER save, mutate, infer maturity dates or create a second budget expense.
 if(accountType(card)!=='card'||card.paymentMode!=='deferred')return'';
 const warn=(label,detail)=>'<section class="trace-deferred-account" aria-live="polite">'+
  '<h3>Débit différé · contrôle</h3><p><strong>'+esc(label)+'</strong></p>'+
  '<p>'+esc(detail)+'</p><small>Aucune écriture créée, aucun débit ni dépense ajouté.</small></section>';
 const simulate=window.TraceDeferredDebit?.simulate,I=window.TraceInternational;
 if(typeof simulate!=='function')return warn('Analyse indisponible',
  'Le module de contrôle du différé n’est pas chargé. Aucune estimation automatique.');
 const checking=state.accounts.find(a=>a.id===card.settlementAccountId&&
  !a.archived&&accountType(a)==='checking'&&a.owner===card.owner);
 if(!checking)return warn('Compte de règlement à définir',
  'Lie la carte à un compte courant du même titulaire avant toute projection.');
 const rows=state.transactions.filter(t=>t&&
  ['confirmed','pending'].includes(t.status)&&
  t.type!=='card_statement_evidence'&&
  (t.accountId===card.id||t.toAccountId===card.id||t.cardAccountId===card.id));
 if(!rows.length)return warn('Aucune échéance complète',
  'Les dates d’achat, de budget et de débit doivent être renseignées explicitement.');
 const purchases=[],refunds=[],fees=[],settlements=[];
 let incomplete=0;
 for(const t of rows){
  const transfer=t.type==='transfer'&&t.toAccountId===card.id;
  const native=transfer?
   I.amountOnAccount(t,card,'destination'):I.amountOnAccount(t,card);
  if(native===null||!Number.isFinite(native)||native<=0||
     !I.calendarDate(t.date)){incomplete++;continue;}
  const common={id:t.id,currency:I.currency(card),amount:native,status:t.status};
  if(t.type==='expense'&&t.accountId===card.id&&t.deferredKind==='card_fee'){
   if(!I.calendarDate(t.budgetDate)||!I.calendarDate(t.dueDate)||
      t.status!=='confirmed'){incomplete++;continue;}
   fees.push({...common,type:'card_fee',cardAccountId:card.id,
    chargeDate:t.date,budgetDate:t.budgetDate,dueDate:t.dueDate});
  }else if(t.type==='expense'&&t.accountId===card.id&&
     (!t.deferredKind||t.deferredKind==='purchase')){
   if(!I.calendarDate(t.budgetDate)||!I.calendarDate(t.dueDate)||
      t.status!=='confirmed'){incomplete++;continue;}
   purchases.push({...common,type:'deferred_purchase',cardAccountId:card.id,
    purchaseDate:t.date,budgetDate:t.budgetDate,dueDate:t.dueDate});
  }else if(t.type==='refund'&&t.accountId===card.id&&
     t.deferredPurchaseId){
   if(!I.calendarDate(t.budgetDate)){incomplete++;continue;}
   refunds.push({...common,type:'merchant_refund',cardAccountId:card.id,
    purchaseId:t.deferredPurchaseId,refundDate:t.date,budgetDate:t.budgetDate});
  }else if(transfer&&t.accountId===checking.id&&
     Array.isArray(t.deferredPurchaseIds)&&Array.isArray(t.deferredFeeIds)&&
     t.toBankAmount!==null&&t.toBankAmount!==undefined){
   settlements.push({...common,type:'deferred_settlement',
    cardAccountId:card.id,checkingAccountId:checking.id,debitDate:t.date,
    purchaseIds:t.deferredPurchaseIds,feeIds:t.deferredFeeIds,
    settlementMode:t.deferredSettlementMode||'full',
    ...(t.deferredSettlementMode==='partial'?{
     allocationDueDate:t.deferredDueDate,bankEvidence:t.deferredBankEvidence}: {})});
  }else incomplete++;
 }
 // Never display a partial projection when a single bank movement is missing.
 if(incomplete)return warn('Informations bancaires incomplètes',
  incomplete+' mouvement(s) nécessitent une date de budget, une échéance, un montant natif ou un rapprochement explicite. Aucun solde projeté.');
 try{
  const r=simulate({card,checking,purchases,refunds,fees,settlements,asOfDate:localDateISO()});
  if(!r.batches.length)return warn('Aucune échéance validable',
   'Aucun lot complet à rapprocher de cette carte.');
  const fmt=n=>I.money(n,I.currency(card)),labels={
   scheduled:'À venir',overdue:'Échéance dépassée',
   settled:'Réglé',cleared_by_refund:'Soldé par remboursement',
   pending_review:'Paiement à vérifier',
   partially_settled:'Partiellement réglé',
   partially_settled_pending_review:'Règlement partiel à vérifier'};
  return '<section class="trace-deferred-account">'+
   '<h3>Débit différé · échéances</h3>'+
   '<p>Lecture seule · montants natifs '+esc(I.currency(card))+
    '. Cette simulation ne modifie ni les budgets CAD historiques ni les soldes bancaires.</p>'+
   '<div class="trace-deferred-summary"><span>Dette différée théorique</span><b>'+
    esc(fmt(r.liability))+'</b></div>'+
   '<div class="trace-deferred-summary"><span>Échéances dépassées</span><b>'+
    esc(fmt(r.overdue))+'</b></div>'+
   '<div class="trace-deferred-batches">'+r.batches.map(batch=>
    '<div><strong>'+esc(batch.dueDate)+'</strong><span>'+
     esc(labels[batch.status]||'À revoir')+'</span><b>'+
     esc(fmt(batch.remainingAmount))+' restant · '+esc(fmt(batch.paidAmount))+
     ' réglé</b></div>').join('')+'</div>'+
   '<small>Règlement de carte = transfert interne, jamais une seconde dépense. Vérifie les relevés avant toute activation des écritures.</small>'+
   '</section>';
 }catch(error){return warn('Rapprochement différé à vérifier',
  String(error?.message||'Règles financières non vérifiées.'));}
}
function traceDeferredPurchaseProjection(card,fields){
 // One hypothetical purchase only. Never include or modify the real ledger.
 const I=window.TraceInternational,simulate=window.TraceDeferredDebit?.simulate;
 if(accountType(card)!=='card'||card.paymentMode!=='deferred'||
    !card.id||!card.owner||card.archived)
  throw Error('Ce compte n’est pas une carte différée active.');
 if(typeof simulate!=='function'||!I)
  throw Error('Moteur du débit différé indisponible : simulation impossible.');
 const checking=state.accounts.find(a=>a.id===card.settlementAccountId&&
   a.owner===card.owner&&!a.archived&&accountType(a)==='checking');
 if(!checking)throw Error('Compte courant lié indisponible ou non autorisé.');
 const raw=String(fields?.amount??'').trim().replace(',','.');
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw))
  throw Error('Montant incorrect : deux décimales maximum, en devise bancaire.');
 const amount=I.exactMoney(raw);
 if(amount===null||amount<=0||amount>1e7)
  throw Error('Montant bancaire positif et exact au centime requis.');
 const purchaseDate=String(fields?.purchaseDate||''),
  budgetDate=String(fields?.budgetDate||''),
  dueDate=String(fields?.dueDate||'');
 if(![purchaseDate,budgetDate,dueDate].every(I.calendarDate))
  throw Error('Renseigne trois dates calendaires valides : achat, budget et prélèvement.');
 if(purchaseDate>dueDate||budgetDate>dueDate)
  throw Error('Le prélèvement prévu ne peut précéder l’achat ou la date budgétaire.');
 const currency=I.currency(card),asOfDate=localDateISO(),
  forecastDate=purchaseDate>asOfDate?purchaseDate:asOfDate;
 const scenario=simulate({card,checking,asOfDate:forecastDate,
  purchases:[{id:'hypothetical-deferred-purchase',type:'deferred_purchase',
   cardAccountId:card.id,currency,amount,
   purchaseDate,budgetDate,dueDate,status:'confirmed'}],
  refunds:[],fees:[],settlements:[]});
 if(scenario.batches.length!==1||scenario.bankTransfers.length!==0||
    scenario.checkingBalanceChange!==0||scenario.writes!==0||scenario.financialChanges!==0)
  throw Error('Simulation non neutre sur le compte courant : projection refusée.');
 const monthBudget=scenario.monthlyBudget[budgetDate.slice(0,7)];
 if(!Number.isFinite(monthBudget)||monthBudget!==amount)
  throw Error('Impact budgétaire du scénario incohérent : vérification nécessaire.');
 return{currency,amount,purchaseDate,budgetDate,dueDate,
  asOfDate:forecastDate,month:budgetDate.slice(0,7),monthBudget,
  liability:scenario.liability,checkingMovement:0,
  status:scenario.batches[0].status};
}
function traceDeferredPurchaseForm(card){
 if(accountType(card)!=='card'||card.paymentMode!=='deferred'||
    card.archived||card.owner!==me)return'';
 return '<section class="trace-deferred-forecast" aria-label="Simulation d’achat différé">'+
  '<h3>Simuler un achat différé</h3>'+
  '<p>Simulation isolée, non enregistrée : renseigne les trois dates du relevé. '+
   'Le prélèvement indiqué est <strong>prévu</strong>, pas constaté en banque.</p>'+
  '<div class="trace-deferred-forecast-grid">'+
   '<label>Montant '+esc(window.TraceInternational.currency(card))+
    '<input id="traceDeferredForecastAmount" type="text" inputmode="decimal" '+
     'autocomplete="off" placeholder="40,00"></label>'+
   '<label>Date d’achat<input id="traceDeferredForecastPurchase" type="date"></label>'+
   '<label>Date d’impact sur le budget<input id="traceDeferredForecastBudget" type="date"></label>'+
   '<label>Date prévue de prélèvement<input id="traceDeferredForecastDue" type="date"></label>'+
  '</div>'+
  '<button type="button" class="secondary full" id="traceDeferredForecastRun">'+
   'Vérifier les conséquences, sans enregistrer</button>'+
  '<div id="traceDeferredForecastResult" class="trace-deferred-forecast-result" role="status" aria-live="polite">'+
   'Aucune simulation effectuée. Aucun solde modifié.</div>'+
  '<small>Montants en devise native seulement. La conversion CAD nécessite un taux historique daté. '+
   'Aucune dépense, dette ni écriture bancaire n’est créée ici.</small></section>';
}
function bindTraceDeferredPurchaseForm(card){
 // Ordinary accounts never have this form. Do not bind synthetic/missing
 // DOM nodes or callbacks when a normal card/checking detail is shown.
 if(accountType(card)!=='card'||card.paymentMode!=='deferred'||
    card.archived||card.owner!==me)return;
 const action=$('#traceDeferredForecastRun'),target=$('#traceDeferredForecastResult');
 if(!action||!target)return;
 const ids=['#traceDeferredForecastAmount','#traceDeferredForecastPurchase',
  '#traceDeferredForecastBudget','#traceDeferredForecastDue'];
 const inputs=ids.map(id=>$(id));
 if(inputs.some(x=>!x)){action.disabled=true;return;}
 const invalidate=()=>{target.textContent='Paramètres modifiés : relance une simulation. Rien n’a été enregistré.';};
 inputs.forEach(input=>{input.addEventListener('input',invalidate);
  input.addEventListener('change',invalidate);});
 action.onclick=()=>{
  target.textContent='Vérification des trois dates et du montant…';
  try{
   const outcome=traceDeferredPurchaseProjection(card,{
    amount:inputs[0].value,purchaseDate:inputs[1].value,
    budgetDate:inputs[2].value,dueDate:inputs[3].value});
   const fmt=n=>esc(window.TraceInternational.money(n,outcome.currency));
   target.innerHTML='<strong>Simulation hypothétique au '+esc(outcome.asOfDate)+
    ' · achat isolé</strong>'+
    '<p>Budget de '+esc(outcome.month)+' : '+fmt(outcome.monthBudget)+
    ' de dépense prévue.</p>'+
    '<p>Dette de cet achat à cette date : '+fmt(outcome.liability)+'.</p>'+
    '<p>Prélèvement prévu le '+esc(outcome.dueDate)+
    '. Compte courant : <strong>aucun débit effectué</strong>.</p>'+
    '<p>Ce résultat ne représente pas la dette totale de cette carte.</p>'+
    '<small>Aucune donnée enregistrée. La contre-valeur CAD n’est pas calculée sans taux vérifié.</small>';
  }catch(error){
   target.textContent='Simulation non validée : '+String(error?.message||'vérifications manquantes');
  }
 };
}
function openTraceAccountDetail(id,{householdView=false,onBack=null}={}){
 const a=state.accounts.find(x=>x.id===id&&['la','partner'].includes(x.owner)&&
  ['checking','card'].includes(accountType(x))&&
  (householdView||homeScope==='couple'||x.owner===me));
 if(!a){openAccountsOverview();return;}
 const currency=window.TraceInternational.currency(a);
 const related=state.accounts.filter(x=>x.id!==a.id&&!x.archived&&
  x.owner===a.owner&&(x.settlementAccountId===a.id||a.settlementAccountId===x.id));
 const reconcile=state.reconciliations.filter(x=>x.accountId===a.id&&
  x.confirmed!==false&&(!x.status||['confirmed','complete','matched'].includes(x.status))&&
  /^\d{4}-\d\d-\d\d$/.test(String(x.date||'')))
  .sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];
 const latest=traceAccountOperations(a.id).slice(0,2);
 const txLine=t=>{
  const direction=t.toAccountId===a.id?'destination':'source';
  const native=window.TraceInternational.amountOnAccount(t,a,direction);
  const display=native===null||!Number.isFinite(Number(native))?'Montant à vérifier':
   window.TraceInternational.money(Math.abs(native),currency);
  return '<div class="trace-account-last-line"><span><b>'+esc(t.name||'Opération')+
   '</b><small>'+esc(t.date||'Date à préciser')+' · '+
   (t.status==='confirmed'?'Confirmée':'À vérifier')+'</small></span><strong>'+
   esc(display)+'</strong></div>';
 };
 openSheet(shortAccountLabel(a),
  '<div class="trace-account-detail-hero"><span class="trace-account-detail-kicker">'+
  esc(traceAccountTitle(a))+' · '+esc(currency)+' · '+esc(a.country||'Pays à définir')+(a.archived?' · Archivé':'')+'</span>'+
  '<strong>'+esc(traceAccountNative(a))+'</strong><small>'+traceAccountCAD(a)+'</small></div>'+
  '<div class="trace-account-detail-info">'+
  '<div><span>Compte</span><b>'+esc(shortAccountLabel(a))+'</b></div>'+
  '<div><span>Titulaire</span><b>'+esc(shortMemberName(a.owner))+'</b></div>'+
  '<div><span>Compte principal</span><b>'+
    (state.household.primaryBankAccountByOwner?.[a.owner]===a.id?'★ Principal':'Secondaire')+'</b></div>'+
  '<div><span>Carte / compte lié</span><b>'+esc(related.length?
    related.map(x=>shortAccountLabel(x)).join(', '):'Aucun lien indiqué')+'</b></div>'+
  '<div><span>Dernier rapprochement</span><b>'+esc(reconcile?.date||'À effectuer')+'</b></div>'+
  '</div>'+
  traceDeferredAccountReview(a)+
  traceDeferredPurchaseForm(a)+
  (a.owner===me&&!a.archived&&accountType(a)==='checking'?
  '<button type="button" class="trace-intl-set-primary" id="traceAccountSelectPrimary">'+
  (state.household.primaryBankAccountByOwner?.[me]===a.id?'★ Compte principal':'☆ Définir comme principal')+'</button>':'')+
  '<div class="section-head"><h2>Deux dernières opérations</h2></div>'+
  '<div class="trace-account-last">'+(latest.length?latest.map(txLine).join(''):
    '<p class="empty-note">Aucune opération enregistrée sur ce compte.</p>')+'</div>'+
  '<button type="button" class="primary full" id="traceAccountAllTx" style="margin-top:12px">Voir toutes les opérations</button>'+
  '<button type="button" class="secondary full" id="traceAccountDetailBack" style="margin-top:8px">Retour aux comptes</button>');
 bindTraceDeferredPurchaseForm(a);
 $('#traceAccountDetailBack').onclick=typeof onBack==='function'?onBack:openAccountsOverview;
 $('#traceAccountAllTx').onclick=()=>openTraceAccountActivity(a.id);
 const primary=$('#traceAccountSelectPrimary');
 if(primary)primary.onclick=()=>confirmTracePrimaryAccount(a.id,()=>openTraceAccountDetail(a.id,{householdView,onBack}));
}
function openTraceAccountActivity(id){
 const account=state.accounts.find(a=>a.id===id&&
  ['la','partner'].includes(a.owner)&&['checking','card'].includes(accountType(a)));
 if(!account)return;
 const latest=traceAccountOperations(id).find(t=>/^\d{4}-\d\d-\d\d$/.test(String(t.date||'')));
 activityAccountFilter=id;
 activityFilters={category:'all',nature:'all',currency:'all',status:'all'};
 if(latest)activityMonth=latest.date.slice(0,7);
 closeSheet();navigate('activity');renderActivity();showTab('transactions');
}
function confirmTracePrimaryAccount(id,after){
 const account=state.accounts.find(a=>a.id===id&&!a.archived&&a.owner===me&&
  accountType(a)==='checking'),oldId=state.household.primaryBankAccountByOwner?.[me];
 if(!account){traceNotice(Error('Compte principal non autorisé.'));return;}
 if(oldId===id){if(typeof after==='function')after();else renderHome();return;}
 const oldAccount=state.accounts.find(a=>a.id===oldId);
 openSheet('Changer le compte principal',
  '<p class="trace-account-primary-intro">Choisir <b>'+esc(shortAccountLabel(account))+
  '</b> comme compte principal ?</p>'+
  '<p class="trace-intl-help">Ancien compte : '+esc(oldAccount?shortAccountLabel(oldAccount):'aucun')+
  ' · Nouveau : '+esc(shortAccountLabel(account))+' ('+
  window.TraceInternational.currency(account)+'). Le compte principal influence la devise de référence personnelle. La devise Couple et les budgets historiques ne sont pas modifiés.</p>'+
  '<p id="tracePrimaryConfirmError" role="alert" class="trace-bank-setup-error"></p>'+
  '<button type="button" class="primary full" id="tracePrimaryConfirm">Confirmer le changement</button>'+
  '<button type="button" class="secondary full" id="tracePrimaryCancel" style="margin-top:8px">Annuler</button>');
 $('#tracePrimaryCancel').onclick=()=>{if(typeof after==='function')after();else{closeSheet();renderHome();}};
 $('#tracePrimaryConfirm').onclick=async()=>{
  const button=$('#tracePrimaryConfirm');button.disabled=true;
  if(state.accounts.find(x=>x.id===id)!==account||
   state.household.primaryBankAccountByOwner?.[me]!==oldId){
   $('#tracePrimaryConfirmError').textContent='Les comptes ont changé. Ouvre à nouveau la sélection.';
   button.disabled=false;return;
  }
  const previous={...(state.household.primaryBankAccountByOwner||{})};
  state.household.primaryBankAccountByOwner={...previous,[me]:id};
  try{
   await saveHouseholdSettings();renderAll();
   if(typeof after==='function')after();else closeSheet();
  }catch(e){
   state.household.primaryBankAccountByOwner=previous;button.disabled=false;
   $('#tracePrimaryConfirmError').textContent='Enregistrement impossible : compte principal inchangé.';
  }
 };
}

function internationalHome(){
 const I=window.TraceInternational;
 if(homeScope==='couple'){
  const all=state.accounts.filter(a=>['la','partner'].includes(a.owner)&&!a.archived&&
   ['checking','card'].includes(accountType(a))).map(a=>({...a,type:accountType(a)}));
  const accounts=[...new Map(all.map(a=>[a.id,a])).values()];
  // Couple is a collective dashboard even when all accounts use CAD.
  // Never present the personal primary-account selector for this scope.
  if(!accounts.some(a=>I.currency(a)!=='CAD')){
   const host=$('#traceIntlHome');
   host.onclick=event=>event.stopPropagation();
   host.innerHTML='<details class="trace-intl-details"><summary>Voir les comptes du foyer · '+
    accounts.length+' compte(s)</summary><div class="trace-intl-accounts">'+
    accounts.map(a=>{
     const native=accountEstimate(a);
     return '<div class="trace-intl-row"><span>'+esc(shortAccountLabel(a))+
      ' <small>'+esc(I.currency(a))+'</small></span><b>'+
      (native===null||!Number.isFinite(Number(native))?'Solde inconnu':
       esc(I.money(native,I.currency(a))))+'</b></div>';
    }).join('')+'</div>'+
    '<p class="trace-intl-foot">Vue du foyer en CAD · épargne et placements dans Patrimoine.</p></details>';
   return;
  }
  if(accounts.some(a=>I.currency(a)!=='CAD')){
   const estimates=Object.fromEntries(accounts.map(a=>[a.id,accountEstimate(a)]));
   const snap=I.snapshot({accounts,estimates,fxRates:internationalQuotes});
   const missingCurrency=[...new Set(accounts.filter(a=>I.currency(a)!=='CAD').map(a=>I.currency(a)))];
   requestInternationalRates(missingCurrency);
   const host=$('#traceIntlHome');
   host.onclick=event=>event.stopPropagation();
   const checking=snap.balances.filter(x=>accounts.find(a=>a.id===x.id)?.type==='checking');
   const cards=snap.balances.filter(x=>accounts.find(a=>a.id===x.id)?.type==='card');
   const checkComplete=checking.length>0&&checking.every(x=>x.cad!==null);
   const cardsComplete=cards.every(x=>x.cad!==null)&&!snap.cardsToReview.length;
   const checkingCAD=checkComplete?Math.round(checking.reduce((n,x)=>n+x.cad,0)*100)/100:null;
   const cardDebt=cardsComplete?Math.round(cards.reduce((n,x)=>n+Math.max(0,-x.cad),0)*100)/100:null;
   $('#homeBalance').textContent=snap.complete?I.money(snap.globalCAD,'CAD'):'Situation à vérifier';
   $('#homeChecking').textContent=checkingCAD===null?'—':I.money(checkingCAD,'CAD');
   $('#homeCard').textContent=cardDebt===null?'À vérifier':I.money(cardDebt,'CAD')+' de dette';
   $('#reconcileBadge').textContent=snap.complete?'Couple · toutes devises':'Conversion / soldes à vérifier';
   const warning=$('#homeCardWarning');
   if(warning&&snap.cardsToReview.length){
    warning.hidden=false;
    warning.textContent='Un avoir de carte apparent doit être vérifié avant de calculer la trésorerie du couple.';
   }
   host.innerHTML='<details class="trace-intl-details"><summary>Voir les comptes du foyer · '+accounts.length+' compte(s)</summary>'+
    '<div class="trace-intl-accounts">'+snap.balances.map(x=>
    '<div class="trace-intl-row"><span>'+esc(x.name)+' <small>'+x.nativeCurrency+'</small></span><b>'+
    (x.balance===null?'Solde inconnu':I.money(x.balance,x.nativeCurrency))+'</b></div>').join('')+'</div>'+
    '<p class="trace-intl-grand">'+(snap.complete?'Situation nette · '+I.money(snap.globalCAD,'CAD'):
     'Situation incomplète · solde, taux ou carte à contrôler')+'</p>'+
    '<p class="trace-intl-foot">Conversion indicative en CAD · taux : '+
    (missingCurrency.map(c=>internationalQuotes[c]?.date?c+' '+internationalQuotes[c].date:c+' manquant').join(' · '))+
    ' · Épargne et placements dans Patrimoine.</p></details>';
   return;
  }
 }

 const accounts=visibleBankAccounts(me).map(a=>({...a,type:accountType(a)}));
 const estimates=Object.fromEntries(accounts.map(a=>[a.id,accountEstimate(a)]));
 window.TraceInternationalUI?.render?.({
  host:$('#traceIntlHome'),accounts,owner:me,
  mainId:state.household.primaryBankAccountByOwner?.[me],estimates,rates:internationalQuotes,
  // A personal main account must not overwrite the Couple dashboard values.
  balanceNode:homeScope==='mine'?$('#homeBalance'):null,
  checkingNode:homeScope==='mine'?$('#homeChecking'):null,
  cardNode:homeScope==='mine'?$('#homeCard'):null,
  warningNode:homeScope==='mine'?$('#homeCardWarning'):null,
  badgeNode:homeScope==='mine'?$('#reconcileBadge'):null,
  onSelect:id=>{
   if(!accounts.some(a=>a.id===id&&a.type==='checking'))return;
   confirmTracePrimaryAccount(id,()=>{closeSheet();renderHome();});
  },
  requestRate:requestInternationalRates });
}

function requestInternationalRates(currencies){
 if(internationalPreviewMode())return; // The laboratory never requests public or private APIs.
 const date=localDateISO();
 const wanted=[...new Set(currencies)].filter(c=>c!=='CAD'&&
  (!internationalQuotes[c]||internationalQuotes[c].requestedDate!==date)&&
  !internationalQuoteAttempt.has(date+'|'+c));
 if(internationalFxBusy||!wanted.length)return;
 internationalFxBusy=true;
 wanted.forEach(c=>internationalQuoteAttempt.add(date+'|'+c));
 Promise.allSettled(wanted.map(c=>window.TraceInternational.getRate(c,date))).then(results=>{
  results.forEach((result,i)=>{if(result.status==='fulfilled')internationalQuotes[wanted[i]]=result.value;});
  internationalFxBusy=false;
  if($('#traceIntlHome'))renderHome();
  if($('#wealthTotal'))renderWealth();
 });
}

function renderHome(){const sId=scope(homeScope),s=summary(CM,sId),cons=s.eb?s.expense/s.eb*100:0,b=bank(sId);$('#homeMonthLabel').textContent=monthLabel(CM);$('#homeGreeting').textContent=homeScope==='mine'?`Bonjour ${member(me).name}`:'Votre situation';$('#homeBudgetAvailable').textContent=money(s.eb-s.expense);$('#homeBudgetSub').textContent=s.eb?`sur ${money(s.eb)} prévus ce mois`:'Budget du mois à compléter';$('#homeBudgetProgress').style.width=`${Math.min(100,Math.max(0,cons))}%`;$('#homeBudgetPercent').textContent=`${cons.toFixed(0)} % consommé`;$('#homeBudgetSpent').textContent=`${money(s.expense)} dépensés`;$('#homeBalance').textContent=b.net===null?'À configurer':b.needsCardReview?'À vérifier':money(b.net);
 $('#homeChecking').textContent=b.checking===null?'—':money(b.checking);
 $('#homeCard').textContent=b.card===null?'—':b.needsCardReview?
  'Avoir estimé '+money(b.cardCredit):money(b.cardDebt)+' de dette';
 $('#reconcileBadge').textContent=b.needsCardReview?'Carte à vérifier':state.reconciliations.length?'✓ Rapproché':'À rapprocher';
 const cardWarning=$('#homeCardWarning');
 if(cardWarning){
  cardWarning.hidden=!b.needsCardReview;
  cardWarning.textContent=b.needsCardReview?
   'Les paiements dépassent les achats de carte enregistrés. Vérifie les achats manquants et les paiements avant de te fier au solde. Cet avoir estimé n’est pas ajouté au disponible.':'';
 }$('#homeIncome').textContent=money(s.income);$('#homeSpending').textContent=money(s.expense);$('#homeSaving').textContent=money(s.saving);
 const savedToCeli=state.transactions.filter(t=>t.status==='confirmed'&&t.type==='external_transfer'&&
 t.transferPurpose==='savings'&&String(t.date||'').startsWith(CM)&&isFinancialPeriod(t)&&
 (sId==='couple'||state.accounts.find(a=>a.id===t.accountId)?.owner===sId))
 .reduce((sum,t)=>sum+Number(t.amountCAD||0),0);
 $('#homeCELITransfers').textContent=money(savedToCeli);renderHomeReview();
 window.TraceInsights.renderCategories($('#homeBudgetCategories'),{rows:breakdown(CM,sId),totalExpense:s.expense,
  budgetTotal:s.eb,month:CM,limit:8,showSummary:true,onCategory:id=>insightCategoryDrilldown(CM,sId,id)});
 window.TraceInsights.renderTrend($('#homeTrend'),{months:insightMonths(sId),selected:CM,compact:true});const cb=coupleBalance(),pa=member(partner),la=member('la');$('#partnerAvatar').textContent=pa.initials||initials(pa.name);$('#shareLabel').textContent=`Solde avec ${pa.name}`;$('#shareBalance').textContent=Math.abs(cb)<.01?'Vous êtes à l’équilibre':cb>0?`${shortMemberName('partner')} doit ${money(cb)} à ${shortMemberName('la')}`:`${shortMemberName('la')} doit ${money(Math.abs(cb))} à ${shortMemberName('partner')}`;if((state.household.workspaceMembers||[]).length<2){
 $('#partnerAvatar').textContent='+';
 $('#shareLabel').textContent='Inviter ton partenaire';
 $('#shareBalance').textContent='À deux, quand tu le souhaites';
 $('#shareSmall').textContent='Ton historique est conservé';
}
updateSegments();internationalHome();}
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
  const year=month.slice(0,4);
  window.TraceInsights.renderCategories($('#budgetCategoryImpact'),{rows:breakdown(month,sId),totalExpense:s.expense,
   budgetTotal:s.eb,month,onCategory:id=>insightCategoryDrilldown(month,sId,id)});
  window.TraceInsights.renderAnnual($('#annualBudgetChart'),{year,months:insightYear(year,sId,month)});
  $$('#annualBudgetChart [data-insight-month]').forEach(btn=>btn.onclick=e=>{
   e.stopPropagation();setBudgetMonth(btn.dataset.insightMonth);
  });
  updateSegments();
}

/* Account defaults: purchases on card; salary, transfers and refunds received on checking. Never silently delete a real account. */
function visibleBankAccounts(owner=me){
 return state.accounts.filter(a=>a.owner===owner&&a.id!=='cash'&&a.type!=='cash'&&!a.archived);
}
function preferredBankAccount(type='expense',owner=me){
 const list=visibleBankAccounts(owner);
 const picked=list.find(a=>a.id===state.household.primaryBankAccountByOwner?.[owner]);
 if(picked&&window.TraceInternational.currency(picked)!=='CAD')return picked;
 const requested=type==='expense'?'card':'checking';
 return list.find(a=>accountType(a)===requested)||list.find(a=>accountType(a)===(requested==='card'?'checking':'card'))||list[0]||null;
}

function manualCategories(type){
  const active=state.categories.filter(c=>!c.archived);
  if(type==='income')return active.filter(c=>c.type==='income');
  return active.filter(c=>c.type==='expense');
}

function openManualTransaction(preferredKind='expense'){
 const M=window.TraceMovement,Guide=window.TraceImportGuide,U=window.TraceOperationUI;
 let kind='expense',categoryTouched=false,previewToken=0;
 const bankAccounts=visibleBankAccounts(me);
 const validCardTarget=(from,to)=>{
  if(!from||!to||accountType(from)!=='checking'||accountType(to)!=='card'||from.owner!==to.owner||
   window.TraceInternational.currency(from)!==window.TraceInternational.currency(to)||
   window.TraceInternational.country(from)!==window.TraceInternational.country(to))return false;
  if(to.settlementAccountId)return to.settlementAccountId===from.id;
  // Preserve a historical unlinked card only when there is one unambiguous
  // same-currency/country current account. Never guess between two accounts.
  const possible=bankAccounts.filter(a=>accountType(a)==='checking'&&
   window.TraceInternational.currency(a)===window.TraceInternational.currency(to)&&
   window.TraceInternational.country(a)===window.TraceInternational.country(to));
  return possible.length===1&&possible[0].id===from.id;
 };
 if(!bankAccounts.length){
  openSheet('Ajouter une opération','<p class="empty-note">Configure d’abord un compte bancaire dans Profil → Mes comptes.</p>');return;
 }
 const opts=bankAccounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
 const who='<option value="'+esc(me)+'">Moi</option><option value="'+esc(partner)+'">'+esc(shortMemberName(partner))+'</option><option value="couple">Nous deux</option><option value="custom">Avec des amis</option>';
 openSheet('Ajouter une opération',
  '<div class="trace-manual-hero"><span class="trace-manual-symbol">'+uiIcon('bank')+'</span><div><span class="trace-kicker">NOUVELLE OPÉRATION</span><b>Que s’est-il passé ?</b><small>TRACE adapte les choix au mouvement et calcule son impact avant de l’enregistrer.</small></div></div>'+
  '<label class="label2" for="manualTxAccount">Compte bancaire concerné</label><select class="input" id="manualTxAccount">'+opts+'</select>'+
  '<div class="trace-movement-families" id="manualFamilies">'+M.families.map(f=>'<button type="button" class="trace-movement-family" data-manual-family="'+f.id+'">'+esc(f.label)+'</button>').join('')+'</div>'+
  '<label class="label2" for="manualKind">Nature précise</label><select class="input" id="manualKind"></select>'+ 
  '<p class="trace-movement-help" id="manualKindHelp" aria-live="polite"></p>'+
  '<div class="trace-manual-fields"><label class="label2">Description</label><input class="input" id="manualTxName" maxlength="80" type="text" placeholder="Ex. Restaurant, remboursement Mathilde">'+
  '<div class="formrow manual-money-row"><div><label class="label2">Montant</label><input class="input" id="manualTxAmount" type="number" inputmode="decimal" min=".01" step=".01" placeholder="0,00"></div>'+
  '<div><label class="label2">Date</label><input class="input" id="manualTxDate" type="date" value="'+localDateISO()+'"></div></div>'+
  '<div class="trace-intl-transaction"><small id="manualBankCurrencyNote">Montant dans la devise du compte</small>'+
  '<div class="formrow"><div><label class="label2">Devise d’achat</label><select class="input" id="manualPurchaseCurrency">'+window.TraceInternational.currencies().map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></div>'+
  '<div><label class="label2">Prix d’achat d’origine (facultatif)</label><input class="input" id="manualPurchaseAmount" type="number" min=".01" step=".01" inputmode="decimal"></div></div>'+
  '<label class="label2" id="manualFxRateLabel">Taux · 1 unité bancaire en CAD (facultatif)</label><input id="manualFxRate" class="input" type="number" min="0" step="any" inputmode="decimal" placeholder="Recherche automatique">'+
  '<p class="trace-intl-help">Le montant ci-dessus est celui réellement débité par la banque. En l’absence de taux de référence disponible, entre un taux vérifié.</p>'+
  '<div id="manualDestAmountWrap" hidden><label class="label2" id="manualDestAmountLabel">Montant réellement reçu sur le compte destinataire</label><input class="input" id="manualDestAmount" type="number" min=".01" step=".01" inputmode="decimal"></div></div>'+
  '<div id="manualTransferFeeWrap" class="trace-intl-transaction" hidden><label class="label2">Frais déjà inclus dans le débit bancaire (facultatif)</label><input class="input" id="manualTransferFee" type="number" min="0" step=".01" inputmode="decimal" placeholder="Montant dans la devise du compte de départ"><small>Le montant du virement est le débit total de la banque, frais compris. Les frais documentés ici ne créent pas un deuxième débit ni une dépense supplémentaire.</small></div>'+
  '<div id="manualCategoryWrap"><label class="label2">Catégorie budgétaire</label><select class="input" id="manualTxCategory"></select><small id="manualCategorySuggestion"></small></div>'+
  ''+
  '<div id="manualWhoWrap"><label class="label2">Cette dépense concerne</label><select class="input" id="manualTxBeneficiary">'+who+'</select></div>'+
  '<div id="manualFriendsGroup" class="trace-manual-friends hidden"><b>Répartition réelle de la dépense</b>'+
  '<div class="formrow"><div><label class="label2">Part avancée aux amis ($)</label><input class="input" id="manualFriendsAmount" type="number" min="0" step=".01" value="0"></div>'+
  '<div><label class="label2">Part de '+esc(shortMemberName(partner))+' ($)</label><input class="input" id="manualPartnerAmount" type="number" min="0" step=".01" value="0"></div></div>'+ 
  '<label class="label2" for="manualFriendDebtorName">Un seul proche (facultatif)</label><input class="input" id="manualFriendDebtorName" maxlength="45" placeholder="Ex. Camille">'+
   '<textarea id="manualFriendDebtorShares" hidden aria-hidden="true" tabindex="-1"></textarea>'+
  '<div id="manualFriendDebtorRows" class="trace-friend-debtors"></div></div>'+
  '<div id="manualTargetWrap" class="hidden"><label class="label2">Compte destinataire</label><select class="input" id="manualTarget"></select></div>'+
  '<div id="manualSavingsWrap" class="hidden"><label class="label2">Compte épargne / CELI</label><select class="input" id="manualSavings"></select></div>'+
  '<div id="manualFriendLink" class="hidden"><label class="label2">Prénom de la personne (facultatif)</label><input class="input" id="manualFriendName" maxlength="45" placeholder="Ex. Camille">'+
  '<label class="label2">Première avance remboursée (facultatif)</label><select class="input" id="manualRelatedExpense"></select>'+
  '<label class="label2">Montant attribué (CAD de référence)</label><input class="input" id="manualRelatedAmount" type="number" min=".01" step=".01" inputmode="decimal" placeholder="Montant total si une seule avance">'+
  '<div id="manualFriendAllocationRows"></div><button type="button" class="secondary" id="manualAddFriendLink">+ Ajouter une autre avance</button>'+
  '<small>Un même virement rembourse plusieurs avances sans deuxième transaction ni nouveau revenu. Les montants attribués sont en CAD budgétaire, et leur somme doit égaler le remboursement converti.</small></div>'+
  '<div id="manualMovementImpact" class="trace-movement-preview" role="status" aria-live="polite"></div>'+
  '<div id="manualMovementError" class="trace-movement-error" role="alert"></div></div>'+
  '<button class="primary full trace-manual-save" id="saveManualTx" type="button">Enregistrer l’opération</button>'+
  '<button class="secondary full" id="cancelManualTx" type="button">Annuler</button>');
 window.TraceOperationUI.enhanceManual();
 window.TraceFriendDebtorUI?.mount({fieldId:'manualFriendDebtorShares',
  singleId:'manualFriendDebtorName',totalId:'manualFriendsAmount',hostId:'manualFriendDebtorRows'});
 const $m=id=>$('#'+id),other=partner;
 const supportedKinds=()=>{const account=bankAccounts.find(x=>x.id===$m('manualTxAccount').value);
  if(!account)return M.kinds.filter(x=>!x.legacyOnly);
  return M.kinds.filter(x=>!x.legacyOnly&&Guide.allowed(x.id,accountType(account),x.direction===1?'in':'out'));
 };
 const error=$m('manualMovementError');
 const selectAccountForKind=()=>{
  const def=M.get(kind),want=def.direction===1?'income':'expense';
  const bank=preferredBankAccount(want);
  if(bank)$m('manualTxAccount').value=bank.id;
 };
 const extraFriendLines=[];
 const linkOptions=()=>{
  const sel=$m('manualRelatedExpense'),old=sel.value,date=$m('manualTxDate').value;
  const rows=friendLinkOptions(date,.01);
  const options='<option value="">Aucun lien pour le moment</option>'+
   rows.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.label)+' · '+esc(r.date)+' · '+money(r.remaining)+' disponibles</option>').join('');
  sel.innerHTML=options;
  if(rows.some(r=>r.id===old))sel.value=old;
  const wrap=$m('manualFriendAllocationRows');
  wrap.innerHTML=extraFriendLines.map((entry,i)=>'<div class="formrow trace-edit-friends-grid">'+
   '<div><label class="label2">Autre avance</label><select class="input" data-friend-link="'+i+'">'+options+'</select></div>'+
   '<div><label class="label2">Montant (CAD)</label><input class="input" type="number" min=".01" step=".01" inputmode="decimal" data-friend-amount="'+i+'" value="'+esc(entry.amountCAD)+'"></div>'+
   '<button type="button" class="secondary" data-friend-remove="'+i+'">Retirer</button></div>').join('');
  wrap.querySelectorAll('[data-friend-link]').forEach(el=>{
   const i=Number(el.dataset.friendLink);el.value=extraFriendLines[i].expenseId;
   el.onchange=()=>{extraFriendLines[i].expenseId=el.value;};
  });
  wrap.querySelectorAll('[data-friend-amount]').forEach(el=>{
   el.oninput=()=>{extraFriendLines[Number(el.dataset.friendAmount)].amountCAD=el.value;};
  });
  wrap.querySelectorAll('[data-friend-remove]').forEach(el=>{
   el.onclick=()=>{extraFriendLines.splice(Number(el.dataset.friendRemove),1);linkOptions();};
  });
 };
 $m('manualAddFriendLink').onclick=()=>{
  if(extraFriendLines.length>=12){error.textContent='Maximum de 13 avances par remboursement.';return;}
  extraFriendLines.push({expenseId:'',amountCAD:''});linkOptions();
 };
 
 function sync(){
  const def=M.get(kind);if(!def)return;
  const from=bankAccounts.find(a=>a.id===$m('manualTxAccount').value),
   fromCurrency=window.TraceInternational.currency(from);
  $m('manualBankCurrencyNote').textContent='Montant réellement prélevé / crédité · '+fromCurrency;
  $m('manualTransferFeeWrap').hidden=kind!=='transfer';
  const currencyBadge=$m('manualTxAmount').closest?.('.trace-edit-money-control')?.querySelector?.('.trace-edit-currency');
  if(currencyBadge)currencyBadge.textContent=fromCurrency;
  $m('manualFxRateLabel').hidden=fromCurrency==='CAD';
  $m('manualFxRate').hidden=fromCurrency==='CAD';
  const budget=def.budget!=='none',expense=def.budget==='expense'||def.budget==='refund';
  $m('manualCategoryWrap').classList.toggle('hidden',!budget);
  $m('manualExtraSection').classList.toggle('hidden',!budget&&!['transfer','card_payment','savings_transfer','savings_withdrawal','friend_reimbursement'].includes(kind));
  $m('manualExtraSection').querySelector('h3').textContent=budget?U.steps.allocation:U.steps.additional;
  $m('manualWhoWrap').classList.toggle('hidden',!expense);
  $m('manualFriendsGroup').classList.toggle('hidden',!expense||$m('manualTxBeneficiary').value!=='custom');
  $m('manualTargetWrap').classList.toggle('hidden',!['transfer','card_payment'].includes(kind));
  $m('manualSavingsWrap').classList.toggle('hidden',!['savings_transfer','savings_withdrawal'].includes(kind));
  $m('manualFriendLink').classList.toggle('hidden',kind!=='friend_reimbursement');
  const previousTarget=$m('manualTarget').value,previousSavings=$m('manualSavings').value;
  $m('manualTarget').innerHTML=bankAccounts.filter(a=>a.id!==$m('manualTxAccount').value&&
   (kind!=='card_payment'||validCardTarget(from,a))).map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
  if([...$m('manualTarget').options].some(o=>o.value===previousTarget))$m('manualTarget').value=previousTarget;
  const eligible=trackedSavingsAccounts(me).filter(x=>isReadySavingsAccount(x));
  $m('manualSavings').innerHTML='<option value="">Choisir un compte d’épargne</option>'+
   eligible.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('');
  if([...$m('manualSavings').options].some(o=>o.value===previousSavings))$m('manualSavings').value=previousSavings;
  const savingsMovement=['savings_transfer','savings_withdrawal'].includes(kind),
   destination=savingsMovement?eligible.find(a=>a.id===$m('manualSavings').value):bankAccounts.find(a=>a.id===$m('manualTarget').value),
   distinct=destination&&window.TraceInternational.currency(destination)!==fromCurrency;
  $m('manualDestAmountWrap').hidden=!distinct||!['card_payment','transfer','savings_transfer','savings_withdrawal'].includes(kind);
  if(distinct)$m('manualDestAmountLabel').textContent=(kind==='savings_withdrawal'?'Montant réellement sorti du compte d’épargne (':'Montant réellement reçu sur le compte destinataire (')+
   window.TraceInternational.currency(destination)+') · obligatoire';
  if(kind==='friend_reimbursement')linkOptions();
  const amount=window.TraceInternational.exactMoney($m('manualTxAmount').value),
   preview=$m('manualMovementImpact'),token=++previewToken,
   who=budget&&expense?$m('manualTxBeneficiary').value:me,
   friends=Number($m('manualFriendsAmount').value||0),otherPart=Number($m('manualPartnerAmount').value||0),
   selectedKind=kind;
  if(fromCurrency==='CAD'){
   preview.textContent=movementImpactText(kind,amount||0,who,friends,otherPart);
  }else if(amount===null||!(amount>0)){
   preview.textContent='Montant bancaire au centime à compléter · '+fromCurrency;
  }else{
   const I=window.TraceInternational,date=$m('manualTxDate').value,manual=$m('manualFxRate').value.trim();
   const nativeLabel='Montant bancaire réel : '+I.money(amount,fromCurrency)+'. ';
   preview.textContent=nativeLabel+'Contre-valeur CAD en cours de vérification…';
   const pending=manual?Promise.resolve({currency:fromCurrency,cadPerUnit:Number(manual),date,source:'Taux saisi manuellement'}):I.getRate(fromCurrency,date);
   Promise.resolve(pending).then(quote=>{
    if(token!==previewToken||preview.isConnected===false)return;
    const booking=I.resolveBooking({account:from,bankAmount:amount,date,quote});
    preview.textContent=nativeLabel+'Référence historique : '+I.money(booking.amountCAD,'CAD')+
     ' · taux du '+quote.date+'. '+movementImpactText(selectedKind,booking.amountCAD,who,friends,otherPart);
   }).catch(()=>{
    if(token!==previewToken||preview.isConnected===false)return;
    preview.textContent=nativeLabel+'Conversion CAD indisponible. Un taux daté et sourcé est nécessaire avant enregistrement.';
   });
  }
 }
 function choose(value,keepBank=false){
  if(!M.get(value))return;
  kind=value;error.textContent='';
  if(!keepBank)selectAccountForKind();
  const supported=supportedKinds();
  if(!supported.some(k=>k.id===kind))kind=supported.find(k=>k.family===M.family(kind))?.id||supported[0]?.id||'expense';
  $m('manualKind').innerHTML=U.options(supported,kind);
  $m('manualKind').value=kind;
  $m('manualKindHelp').textContent=M.get(kind)?.help||'';
  const def=M.get(kind),type=def.budget==='income'?'income':'expense',budget=def.budget!=='none';
  const categories=budget?manualCategories(type):[];
  $m('manualTxCategory').innerHTML='<option value="">Choisir une catégorie</option>'+categories.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  categoryTouched=false;
  sync();
 }
 $m('manualFamilies').querySelectorAll('[data-manual-family]').forEach(b=>b.onclick=()=>{
  const first=supportedKinds().find(k=>k.family===b.dataset.manualFamily);
  if(first)choose(first.id,true);
 });
 $m('manualKind').onchange=()=>choose($m('manualKind').value,true);
 $m('manualTxBeneficiary').onchange=sync;
 $m('manualTxAccount').onchange=()=>{
  const a=bankAccounts.find(a=>a.id===$m('manualTxAccount').value);
  $m('manualPurchaseCurrency').value=window.TraceInternational.currency(a);
  choose(kind,true);
 };
 $m('manualTxDate').onchange=sync;
 $m('manualTarget').onchange=sync;
 $m('manualSavings').onchange=sync;
 $m('manualTxAmount').oninput=sync;
 $m('manualFxRate').oninput=sync;
 $m('manualDestAmount').oninput=sync;
 $m('manualFriendsAmount').oninput=sync;
 $m('manualPartnerAmount').oninput=sync;
 $m('manualTxCategory').onchange=()=>{categoryTouched=true;};
 $m('manualTxName').oninput=()=>{
  if(!categoryTouched&&M.get(kind)?.budget!=='none'){
   const def=M.get(kind),catGuess=suggestImportCategory({name:$m('manualTxName').value,type:def.budget==='income'?'income':'expense',amountCAD:Number($m('manualTxAmount').value||0)});
   if([...$m('manualTxCategory').options].some(o=>o.value===catGuess.categoryId))$m('manualTxCategory').value=catGuess.categoryId;
  }
 };
 $m('cancelManualTx').onclick=closeSheet;
 choose(typeof preferredKind==='string'&&M.get(preferredKind)?preferredKind:'expense');
 $m('manualPurchaseCurrency').value=window.TraceInternational.currency(bankAccounts.find(a=>a.id===$m('manualTxAccount').value));
 sync();
 $m('saveManualTx').onclick=async()=>{
  error.textContent='';
  const def=M.get(kind),amount=window.TraceInternational.exactMoney($m('manualTxAmount').value),
   date=$m('manualTxDate').value,name=$m('manualTxName').value.trim()||def.label,
   accountId=$m('manualTxAccount').value,bankAccount=bankAccounts.find(a=>a.id===accountId),
   targetId=$m('manualTarget').value,investmentId=$m('manualSavings').value,
   budget=def.budget!=='none',categoryId=budget?$m('manualTxCategory').value:'',
   beneficiary=budget&&def.budget!=='income'?$m('manualTxBeneficiary').value:me;
  if(!(amount>0)||!Number.isFinite(amount)||!date||!accountId||!bankAccount||budget&&!categoryId){error.textContent='Vérifie le montant au centime, le compte et la catégorie éventuelle.';return;}
  if(def.legacyOnly||!Guide.allowed(kind,accountType(bankAccount),def.direction===1?'in':'out')){
   error.textContent='Cette nature ne correspond pas au compte bancaire choisi.';return;
  }
  if(['friend_reimbursement','friend_advance_return','income','external_refund','savings_withdrawal'].includes(kind)&&accountType(bankAccount)!=='checking'){
   error.textContent='Pour cette entrée, choisis ton compte courant.';return;
  }
  if(['card_payment','transfer'].includes(kind)&&
   (!targetId||targetId===accountId||accountType(bankAccount)!=='checking'||bankAccount.owner!==bankAccounts.find(a=>a.id===targetId)?.owner||(kind==='card_payment'&&accountType(bankAccounts.find(a=>a.id===targetId))!=='card'))){
   error.textContent='Choisis ton compte courant et un compte destinataire distinct, ou ta carte pour le paiement de crédit.';return;
  }
  if(['savings_transfer','savings_withdrawal'].includes(kind)&&
    (!investmentId||accountType(bankAccount)!=='checking'||!trackedSavingsAccounts(me).some(a=>a.id===investmentId&&isReadySavingsAccount(a)&&date>a.openingDate))){
    error.textContent='Configure ton CELI et son solde initial, puis choisis un mouvement à une date ultérieure.';return;
  }
  let shares,related,repaymentAllocations=null,booking,destinationBankAmount,friendDebtors,transferFees={},savingsLeg={};
  try{
   const currency=window.TraceInternational.currency(bankAccount),
    input=$m('manualFxRate').value.trim(),userRate=Number(input);
   if(input!==''&&(!Number.isFinite(userRate)||!(userRate>0)))
    throw Error('Le taux de change saisi doit être supérieur à zéro.');
   const quote=currency==='CAD'?null:input!==''?
    {currency,cadPerUnit:userRate,date,source:'Taux saisi manuellement'}:
    await window.TraceInternational.getRate(currency,date);
   booking=window.TraceInternational.resolveBooking({
    account:bankAccount,bankAmount:amount,date,quote,
    originalCurrency:$m('manualPurchaseCurrency').value,
    originalAmount:$m('manualPurchaseAmount').value||null});
   const destination=bankAccounts.find(a=>a.id===targetId);
   if(['savings_transfer','savings_withdrawal'].includes(kind)){
    const investment=trackedSavingsAccounts(me).find(a=>a.id===investmentId),
     investmentCurrency=window.TraceInternational.currency(investment),
     native=investmentCurrency===currency?amount:window.TraceInternational.exactMoney($m('manualDestAmount').value);
    if(native===null||!(native>0))throw Error('Indique le montant réel au centime dans la devise du compte d’épargne.');
    savingsLeg={investmentAmount:native,investmentCurrency};
   }
   if(kind==='transfer'&&$m('manualTransferFee').value.trim()!==''){
    const fee=window.TraceInternational.exactMoney($m('manualTransferFee').value);
    if(fee===null||fee<0||fee>amount)throw Error('Les frais doivent être au centime et compris dans le débit total.');
    transferFees={transferFeeAmount:fee,transferFeeCurrency:currency,transferFeeIncludedInDebit:true};
   }
   if(['transfer','card_payment'].includes(kind)){
    if(accountType(destination)==='card'&&!validCardTarget(bankAccount,destination))
     throw Error('Cette carte doit être réglée depuis son compte courant lié, dans sa devise.');
    const targetCurrency=window.TraceInternational.currency(destination),v=$m('manualDestAmount').value.trim();
    if(targetCurrency!==currency){
     destinationBankAmount=window.TraceInternational.exactMoney(v);
     if(destinationBankAmount===null||!(destinationBankAmount>0))
      throw Error('Renseigne le montant effectivement reçu au centime sur le compte destinataire.');
    }else destinationBankAmount=amount;
   }
   shares=beneficiary==='custom'?
    traceCustomShares(booking.amountCAD,$m('manualFriendsAmount').value,$m('manualPartnerAmount').value):
    {beneficiary,...traceSplit(beneficiary,booking.amountCAD)};
   friendDebtors=friendDebtorFields(shares.splitAmounts?.friends,
    $m('manualFriendDebtorName').value,$m('manualFriendDebtorShares').value);
   if(kind==='friend_reimbursement'){
    const first=$m('manualRelatedExpense').value,
     extra=extraFriendLines.filter(x=>x.expenseId||String(x.amountCAD).trim()!=='');
    if(first||extra.length){
     if(!first)throw Error('Choisis la première avance remboursée.');
     const firstRaw=$m('manualRelatedAmount').value.trim();
     const firstAmount=firstRaw!==''?Number(firstRaw):extra.length?NaN:booking.amountCAD;
     repaymentAllocations=M.validateRepaymentAllocations(
      [{expenseId:first,amountCAD:firstAmount},...extra],
      state.transactions,state.transactions,me,date,booking.amountCAD,'',$m('manualFriendName').value);
     related=repaymentAllocations.length===1?first:null;
    }
   }else related=validateFriendLink(kind,$m('manualRelatedExpense').value,date,booking.amountCAD);
  }catch(e){error.textContent=String(e.message||e);return;}
  const item={id:txDocId(),date,name,note:'',merchant:'',type:def.type,transferPurpose:def.purpose||null,
   status:'confirmed',...booking,...transferFees,...savingsLeg,
   ...(['transfer','card_payment'].includes(kind)?{toBankAmount:destinationBankAmount,
    toBankCurrency:window.TraceInternational.currency(bankAccounts.find(a=>a.id===targetId))}:{}),
   categoryId,accountId,payerId:me,...shares,...friendDebtors,
   ...(related?{relatedExpenseId:related}:{}),...(repaymentAllocations?{repaymentAllocations}:{}),
   ...(['transfer','card_payment'].includes(kind)?{toAccountId:targetId}:{}),
   ...(['savings_transfer','savings_withdrawal'].includes(kind)?{investmentAccountId:investmentId}:{}),
   recurring:false,recurrence:{enabled:false,endDate:null,nextDate:null,frequency:null,autoConfirm:false,needsReview:false},
   counterparty:kind==='friend_reimbursement'?$m('manualFriendName').value.trim():'',
   externalAmount:0,externalParticipants:[]};
  const btn=$m('saveManualTx');btn.disabled=true;btn.textContent='Enregistrement…';
  try{await saveDocument('transactions',item);state.transactions.push(item);closeSheet();renderAll();navigate('activity');showTab('transactions');}
  catch(e){btn.disabled=false;btn.textContent='Réessayer';error.textContent='Enregistrement impossible : '+String(e.message||e);}
 };
}
function openInvestmentAccountAdd(){
  openSheet('Ajouter un compte',
    '<div class="settings-hero"><span class="pico large">'+uiIcon('chart')+'</span><div><b>Nouveau compte de patrimoine</b><small>Ajoute le compte maintenant ; les opérations et la valorisation viendront ensuite.</small></div></div>'+
    '<label class="label2">Nom du compte</label><input class="input" id="investmentAccountName" type="text" maxlength="60" placeholder="Ex. PEA Boursorama, CELI">'+
    '<div class="formrow"><div><label class="label2">Type</label><select class="input" id="investmentAccountType"><option value="CELI">CELI</option><option value="Épargne">Épargne</option><option value="Livret">Livret</option><option value="PEA">PEA</option><option value="REER">REER</option><option value="Courtage">Courtage</option><option value="Autre">Autre</option></select></div>'+
    '<div><label class="label2">Devise</label><select class="input" id="investmentAccountCurrency"><option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="CHF">CHF</option></select></div></div>'+
    '<div id="newSavingsReference" class="trace-savings-reference"><div class="empty-note">Les transferts confirmés alimenteront ce compte d’épargne. Pour commencer à calculer son solde, indique sa référence bancaire.</div>'+
    '<label class="label2">Date du solde initial</label><input id="newSavingsDate" class="input" type="date" value="'+localDateISO()+'">'+
    '<label class="label2" id="newSavingsAmountLabel">Solde réel à cette date (CAD)</label><input id="newSavingsAmount" class="input" type="number" step=".01" min="0" inputmode="decimal" placeholder="Tu peux le compléter plus tard"></div>'+
    '<div id="newSavingsError" class="trace-savings-error" role="status"></div>'+
    '<button class="primary full" id="saveInvestmentAccount" type="button" style="margin-top:18px">Ajouter le compte</button>'+
    '<button class="secondary full" id="cancelInvestmentAccount" type="button" style="margin-top:8px">Annuler</button>'
  );
  $('#cancelInvestmentAccount').onclick=closeSheet;
  const refreshSavings=()=>{
   const saving=['CELI','Épargne','Livret'].includes($('#investmentAccountType').value);
   $('#newSavingsReference').classList.toggle('hidden',!saving);
   $('#newSavingsAmountLabel').textContent='Solde réel à cette date ('+$('#investmentAccountCurrency').value+')';
  };
  $('#investmentAccountType').onchange=refreshSavings;
  $('#investmentAccountCurrency').onchange=refreshSavings;refreshSavings();
  $('#saveInvestmentAccount').onclick=async()=>{
    const name=$('#investmentAccountName').value.trim(),type=$('#investmentAccountType').value,currency=$('#investmentAccountCurrency').value,
      savings=['CELI','Épargne','Livret'].includes(type),
      openingRaw=$('#newSavingsAmount').value.trim(),openingDate=$('#newSavingsDate').value,
      openingAmount=openingRaw!==''?window.TraceInternational.exactMoney(openingRaw):null;
    if(!name||name.length>60||savings&&openingRaw!==''&&
      (!smartStrictDate(openingDate)||openingAmount===null||openingAmount<0||openingAmount>1e10)){
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
async function removeDocument(collection,id){if(internationalPreviewMode())return;
 if(traceWritesBlocked)throw Error('Conflit de données : recharge TRACE avant toute nouvelle écriture.');
 const key=traceWriteKey(collection,id);
 return traceSerialWrite(key,async()=>{
  const old=collection==='accounts'?state.accounts?.find(a=>String(a.id)===String(id)):
   collection==='transactions'?state.transactions?.find(t=>String(t.id)===String(id)):
   collection==='imports'?state.smartImports?.find(t=>String(t.id)===String(id)):
   collection==='import_days'?state.importDays?.find(t=>String(t.id)===String(id)):
   collection==='reconciliations'?state.reconciliations?.find(t=>String(t.id)===String(id)):null;
  if(old)traceRefuseUnqualifiedDeferredWrite(collection,old);
  if(!traceDocRevisions.has(key))throw Error('Document non chargé : suppression refusée.');
  const {data,error}=await client.rpc('trace_cas_delete_document',{
   p_household_id:household.id,p_collection:collection,p_item_id:String(id),
   p_expected_revision:traceRevision(traceDocRevisions.get(key))});
  if(error)throw traceSaveFailure(error);
  if(data!==true)throw traceSaveFailure(new Error('Suppression non confirmée'));
  traceDocRevisions.delete(key);sync('synced');
 });}
function categoryKind(c){return c.budgetKind||(c.type==='income'?'income':['rent','subscriptions','phone','taxes'].includes(c.id)?'fixed':'variable');}
function manageCategories(){
 const active=state.categories.filter(c=>!c.archived).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name,'fr'));
 openSheet('Catégories du budget','<div class="empty-note">Personnalise tes catégories. L’historique est conservé quand une catégorie utilisée est archivée.</div>'+
 '<button class="primary full" id="newCategory" style="margin:14px 0">+ Nouvelle catégorie</button>'+ 
 (STARTER_CATEGORIES.some(([id])=>!state.categories.some(c=>c.id===id))?'<button class="secondary full" type="button" id="traceRestoreStarterCats">Ajouter les catégories de départ manquantes</button>':'')+
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

function friendDebtorFields(friendAmount,oneName='',linesText='',editingExpenseId=''){
 const M=window.TraceMovement,name=String(oneName||'').trim(),
  text=String(linesText||'').trim(),amount=Number(friendAmount);
 if(!(amount>0)||!Number.isFinite(amount))return{friendDebtorName:null,friendDebtorShares:null};
 if(name&&text)throw Error('Choisis soit un seul prénom, soit plusieurs proches.');
 if(text){
  const raw=M.parseFriendShares(text);
  if(raw.length<2)throw Error('Pour une seule personne, utilise le champ prénom.');
  return{friendDebtorName:null,friendDebtorShares:M.validateFriendDebtorShares(
   raw,amount,state.transactions,editingExpenseId)};
 }
 if(name){
  const [person]=M.validateFriendDebtorShares([{name,amountCAD:amount}],
   amount,state.transactions,editingExpenseId);
  return{friendDebtorName:person.name,friendDebtorShares:null};
 }
 const previous=editingExpenseId?state.transactions.find(x=>x.id===editingExpenseId):null;
 if(previous?.friendDebtorShares?.length&&M.paidForExpense(state.transactions,editingExpenseId)>0)
  throw Error('Cette répartition possède des remboursements liés. Vérifie-les avant de retirer les noms.');
 return{friendDebtorName:null,friendDebtorShares:null};
}

function traceCustomShares(amount,friends,partnerAmount){
 const p=window.TraceMovement.amounts(amount,'custom',me,state.household.defaultSplit||{la:50,partner:50},friends,partnerAmount);
 return{beneficiary:'custom',split:{la:p.la/amount*100,partner:p.partner/amount*100,friends:p.friends/amount*100},splitMode:'percent',splitAmounts:{la:p.la,partner:p.partner,friends:p.friends}};
}
function traceImportSplit(row,t){
 if(row.beneficiary!=='custom')return{beneficiary:row.beneficiary,...traceSplit(row.beneficiary,Number(t.amountCAD))};
 return traceCustomShares(Number(t.amountCAD),row.friendsAmount,row.partnerAmount);
}
function traceSplit(who,a){const p=window.TraceMovement.amounts(a,who,me,state.household.defaultSplit||{la:50,partner:50});return{split:{la:p.la/a*100,partner:p.partner/a*100},splitMode:'percent',splitAmounts:who==='couple'?{la:p.la,partner:p.partner}:null};}

function movementImpact(kind,amount,who,friends=0,other=0){return window.TraceMovement.impact(kind,amount,who,me,state.household.defaultSplit||{la:50,partner:50},friends,other);}
function movementFamilyOptions(selected=''){return window.TraceMovement.families.map(f=>'<option value="'+f.id+'"'+(f.id===selected?' selected':'')+'>'+esc(f.label)+'</option>').join('');}
function movementNatureOptions(family,selected=''){return '<option value="">Choisir la nature</option>'+window.TraceMovement.choices(family).map(k=>'<option value="'+k.id+'"'+(k.id===selected?' selected':'')+'>'+esc(k.label)+'</option>').join('');}
function friendLinkOptions(date,amount,except=''){return window.TraceMovement.linkable(state.transactions,state.transactions,me,date,amount,except);}
function validateFriendLink(kind,id,date,amount,except=''){return kind==='friend_reimbursement'?window.TraceMovement.validateLink(id,state.transactions,state.transactions,me,date,amount,except):null;}
function movementImpactText(kind,amount,who,friends=0,other=0){
 try{
  const v=movementImpact(kind,amount,who,friends,other);
  const k=window.TraceMovement.get(kind);
  const b=(v.bank>=0?'+':'-')+money(Math.abs(v.bank));
  const r=['Solde bancaire : '+b];
  if(k.budget==='none')r.push('Aucun revenu ni aucune dépense budgétaire');
  else if(k.budget==='income')r.push('Revenus : '+money(v.budget[me]));
  else r.push('Budget : moi '+money(Math.abs(v.budget[me]))+', '+shortMemberName(partner)+' '+money(Math.abs(v.budget[partner]))+', couple '+money(Math.abs(v.budget.couple)));
  if(kind==='card_payment')r.push('Dette de carte réduite de '+money(Math.abs(v.bank)));
   if(kind==='transfer')r.push('Compte destinataire : +'+money(Math.abs(v.bank)));
   if(kind==='savings_transfer')r.push('Épargne / CELI : +'+money(Math.abs(v.bank)));
   if(kind==='savings_withdrawal')r.push('Épargne / CELI : -'+money(Math.abs(v.bank)));
   if(v.friends)r.push('Amis hors budget : '+money(v.friends));
  return r.join(' · ');
 }catch(e){return 'Impact à préciser : '+String(e.message||e);}
}

function traceEditorDateLabel(iso){
 const hit=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
 if(!hit)return 'Choisir une date';
 const months=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
 return Number(hit[3])+' '+(months[Number(hit[2])-1]||'')+' '+hit[1];
}
/* A single transfer document backs both international account movements.
   Its accounts and statement date stay locked; only real amounts and FX change. */
function editInternationalTransfer(t){
 const I=window.TraceInternational,from=state.accounts.find(a=>a.id===t.accountId),
  to=state.accounts.find(a=>a.id===t.toAccountId);
 if(!from||!to||from.owner!==me||to.owner!==me||accountType(from)!=='checking'||
    !['checking','card'].includes(accountType(to))||t.status!=='confirmed'){
  openSheet('Virement à contrôler','<p class="empty-note">Ce virement ne peut pas être modifié sans contrôle de ses comptes. Aucune donnée modifiée.</p>'+
   '<button class="secondary full" id="fxBack">Fermer</button>');
  $('#fxBack').onclick=closeSheet;return;
 }
 const source=I.currency(from),destination=I.currency(to),
  outgoing=I.amountOnAccount(t,from),incoming=I.amountOnAccount(t,to,'destination'),
  original=I.valid(t.currency)?t.currency:source;
 openSheet('Modifier un virement international',
  '<div class="trace-edit-layout trace-bank-edit-layout">'+
  '<p class="trace-edit-lead">Un seul mouvement relie ces deux comptes. Modifie uniquement les montants indiqués sur les relevés.</p>'+
  '<section class="trace-edit-card"><div class="trace-edit-fields">'+
  '<b>'+esc(shortAccountLabel(from))+' · '+source+' → '+esc(shortAccountLabel(to))+' · '+destination+'</b>'+
  '<small>Transaction du '+esc(t.date)+' · comptes et date conservés pour protéger les rapprochements.</small>'+
  '<label class="label2" for="fxName">Libellé</label><input id="fxName" class="input" maxlength="85" value="'+esc(t.name||'Virement')+'">'+
  '<label class="label2" for="fxSent">Montant réellement débité ('+source+')</label>'+
  '<input id="fxSent" class="input" type="number" inputmode="decimal" min=".01" step=".01" value="'+esc(outgoing??'')+'">'+
  '<label class="label2" for="fxReceived">Montant réellement reçu ('+destination+')</label>'+
  '<input id="fxReceived" class="input" type="number" inputmode="decimal" min=".01" step=".01" value="'+esc(incoming??'')+'">'+
  '<label class="label2" for="fxFee">Frais inclus dans le montant débité ('+source+')</label>'+
   '<input id="fxFee" class="input" type="number" inputmode="decimal" min="0" step=".01" value="'+esc(t.transferFeeAmount??0)+'">'+
   '<p class="trace-intl-help">Frais déjà inclus dans le débit. Aucune dépense budgétaire ni second débit.</p>'+
  '<div class="trace-intl-transaction"><div class="formrow"><div>'+
  '<label class="label2" for="fxOriginalCurrency">Devise du montant d’origine</label>'+
  '<select class="input" id="fxOriginalCurrency">'+I.currencies().map(c=>'<option value="'+c+'"'+(c===original?' selected':'')+'>'+c+'</option>').join('')+'</select></div><div>'+
  '<label class="label2" for="fxOriginalAmount">Montant d’origine (si différent)</label>'+
  '<input id="fxOriginalAmount" class="input" type="number" step=".01" min=".01" inputmode="decimal" value="'+esc(original!==source?t.amountOriginal??'':'')+'"></div></div>'+
  '<label class="label2" for="fxRate">Taux de référence · 1 '+source+' en CAD</label>'+
  '<input id="fxRate" class="input" type="number" min=".000001" step="any" inputmode="decimal" '+
  (source==='CAD'?'disabled ':'')+'placeholder="Taux daté ou taux manuel vérifié">'+
  '<p class="trace-intl-help">'+(source==='CAD'?'CAD : aucune conversion.':
   Number(t.bankRateCad)>0?'Taux historique : '+esc(t.bankRateCad)+' CAD · '+esc(t.fxRateDate||t.date||'')+' · '+esc(t.fxRateSource||'Enregistré'):
   'En l’absence de taux enregistré, TRACE cherchera un taux de référence daté.')+'</p></div>'+
  '</div></section><section class="trace-edit-impact"><h3>Effet sur tes comptes</h3>'+
  '<div id="fxPreview" class="trace-bank-impact-summary" aria-live="polite"></div></section>'+
  '<p id="fxError" class="trace-bank-setup-error" role="alert"></p>'+
  '<div class="trace-edit-actions-secondary"><button id="fxCancel" type="button">Annuler</button></div>'+
  '<div class="trace-edit-actions"><button class="primary full" id="fxSave" type="button">Enregistrer les modifications</button></div></div>');
 $('#sheetBackdrop').classList.add('trace-premium-edit','trace-premium-movement');
 const value=id=>$('#'+id).value.trim(),oldRate=Number(t.bankRateCad);
 const preview=()=>{
  const out=value('fxSent')===''?null:Number(value('fxSent')),
   received=value('fxReceived')===''?null:Number(value('fxReceived')),
   rate=value('fxRate')!==''?Number(value('fxRate')):oldRate,
   cad=out!==null&&out>0?I.fxValue(out,source,rate>0?{currency:source,cadPerUnit:rate}:null):null;
  $('#fxPreview').textContent=out===null||received===null||!(out>0)||!(received>0)?
   'Renseigne les deux montants exacts des relevés. Un montant inconnu ne vaut pas zéro.':
   'Départ : −'+I.money(out,source)+' · Arrivée : +'+I.money(received,destination)+
   ' · Frais inclus : '+(value('fxFee')===''?'0':value('fxFee'))+' '+source+
    ' · Budget : 0 CAD · '+(cad===null?'Conversion CAD à vérifier':'Équivalent historique : '+I.money(cad,'CAD'));
 };
 ['fxSent','fxReceived','fxFee','fxRate','fxOriginalCurrency','fxOriginalAmount'].forEach(id=>$('#'+id).addEventListener('input',preview));
 $('#fxCancel').onclick=closeSheet;preview();
 $('#fxSave').onclick=async()=>{
  $('#fxError').textContent='';const btn=$('#fxSave');btn.disabled=true;
  try{
   const raw=value('fxRate'),rate=Number(raw),oldDate=String(t.fxRateDate||t.date||'');
   if(raw!==''&&(!Number.isFinite(rate)||!(rate>0)))throw Error('Taux de change invalide');
   const quote=source==='CAD'?null:raw!==''?
    {currency:source,cadPerUnit:rate,date:t.date,source:'Taux saisi manuellement'}:
    oldRate>0&&/^\d{4}-\d{2}-\d{2}$/.test(oldDate)&&oldDate<=t.date?
    {currency:source,cadPerUnit:oldRate,date:oldDate,source:t.fxRateSource||'Taux historique enregistré'}:
    await I.getRate(source,t.date);
   const next=I.resolveTransferEdit({transaction:t,from:{...from,type:accountType(from)},
    to:{...to,type:accountType(to)},bankAmount:value('fxSent'),receivedAmount:value('fxReceived'),
    quote,originalCurrency:value('fxOriginalCurrency'),originalAmount:value('fxOriginalAmount'),name:value('fxName'),feeAmount:value('fxFee')});
   await saveDocument('transactions',next);Object.assign(t,next);
   closeSheet();renderAll();navigate('activity');showTab('transactions');
  }catch(error){btn.disabled=false;$('#fxError').textContent=String(error.message||error);}
 };
}

function editForeignFriendRepayment(t){
 const I=window.TraceInternational,M=window.TraceMovement,
  bank=state.accounts.find(a=>a.id===t.accountId);
 if(!bank||bank.owner!==me){
  openSheet('Remboursement étranger à vérifier',
   '<p class="empty-note">Compte source introuvable ou non autorisé. Aucun changement.</p>'+
   '<button type="button" id="foreignFriendClose" class="secondary full">Fermer</button>');
  $('#foreignFriendClose').onclick=closeSheet;return;
 }
 let verified;
 try{verified=I.verifiedForeignFriendRefund(t,{...bank,type:accountType(bank)});}
 catch(error){
  openSheet('Taux du remboursement à vérifier',
   '<p class="empty-note">'+esc(error.message||error)+
   ' Le montant bancaire et le budget historique restent inchangés. Corrige d’abord la preuve de change.</p>'+
   '<button type="button" id="foreignFriendClose" class="secondary full">Fermer</button>');
  $('#foreignFriendClose').onclick=closeSheet;return;
 }
 const existing=M.repaymentLines(t),extras=existing.slice(1).map(x=>({
   expenseId:x.expenseId,amountCAD:String(x.amountCAD)}));
 openSheet('Associer le remboursement international',
  '<p class="trace-edit-lead">Le virement bancaire reste inchangé. Seuls les liens vers les dépenses avancées sont modifiables.</p>'+
  '<div class="empty-note">'+esc(shortAccountLabel(bank))+' · '+esc(t.date)+' · '+
   I.money(verified.bankAmount,verified.bankCurrency)+' réellement reçu · '+
   I.money(verified.amountCAD,'CAD')+' comptabilisés au taux du '+esc(verified.fxRateDate)+
   ' ('+esc(verified.fxRateSource)+')</div>'+
  '<label class="label2" for="foreignFriendName">Proche (facultatif)</label>'+
   '<input class="input" id="foreignFriendName" maxlength="45" value="'+esc(t.counterparty||'')+'" placeholder="Ex. Camille">'+
  '<label class="label2" for="foreignFriendFirst">Première avance</label>'+
   '<select class="input" id="foreignFriendFirst"></select>'+
  '<label class="label2" for="foreignFriendFirstAmount">Montant attribué (CAD de référence)</label>'+
   '<input class="input" id="foreignFriendFirstAmount" type="number" min=".01" step=".01" inputmode="decimal" value="'+esc(existing[0]?.amountCAD??'')+'">'+
  '<div id="foreignFriendOther"></div>'+
  '<button type="button" class="secondary" id="foreignFriendAdd">+ Ajouter une autre avance</button>'+
  '<p class="empty-note">Répartis exactement '+I.money(verified.amountCAD,'CAD')+
   '. Aucun revenu et aucun deuxième mouvement bancaire ne seront créés.</p>'+
  '<p id="foreignFriendError" role="alert"></p>'+
  '<button type="button" class="primary full" id="foreignFriendSave">Enregistrer les associations</button>'+
  '<button type="button" class="secondary full" id="foreignFriendCancel">Annuler</button>');
 let initialized=false;
 const choices=()=>friendLinkOptions(t.date,.01,t.id),
  render=()=>{
   const sel=$('#foreignFriendFirst'),old=initialized?sel.value:(sel.value||existing[0]?.expenseId||''),
    candidates=choices(),
    opts='<option value="">Aucune avance liée</option>'+candidates.map(x=>
     '<option value="'+esc(x.id)+'">'+esc(x.label)+' · '+I.money(x.remaining,'CAD')+' disponibles</option>').join('');
   sel.innerHTML=opts;if(candidates.some(x=>x.id===old))sel.value=old;
   initialized=true;
   const host=$('#foreignFriendOther');
   host.innerHTML=extras.map((x,i)=>'<div class="formrow">'+
    '<div><label class="label2">Autre avance</label><select class="input" data-foreign-expense="'+i+'">'+opts+'</select></div>'+
    '<div><label class="label2">Montant (CAD)</label><input class="input" type="number" min=".01" step=".01" inputmode="decimal" data-foreign-amount="'+i+'" value="'+esc(x.amountCAD)+'"></div>'+
    '<button type="button" class="secondary" data-foreign-remove="'+i+'">Retirer</button></div>').join('');
   host.querySelectorAll('[data-foreign-expense]').forEach(el=>{
    const i=Number(el.dataset.foreignExpense);el.value=extras[i].expenseId;
    el.onchange=()=>{extras[i].expenseId=el.value;};
   });
   host.querySelectorAll('[data-foreign-amount]').forEach(el=>{
    el.oninput=()=>{extras[Number(el.dataset.foreignAmount)].amountCAD=el.value;};
   });
   host.querySelectorAll('[data-foreign-remove]').forEach(el=>{
    el.onclick=()=>{extras.splice(Number(el.dataset.foreignRemove),1);render();};
   });
  };
 $('#foreignFriendAdd').onclick=()=>{
  if(extras.length>=12){$('#foreignFriendError').textContent='Maximum de 13 avances.';return;}
  extras.push({expenseId:'',amountCAD:''});render();
 };
 $('#foreignFriendCancel').onclick=closeSheet;
 $('#foreignFriendSave').onclick=async()=>{
  $('#foreignFriendError').textContent='';
  try{
   // Re-verify the imported FX evidence at save time; do not mutate its legs.
   const reference=I.verifiedForeignFriendRefund(t,{...bank,type:accountType(bank)}),
    first=$('#foreignFriendFirst').value,
    extra=extras.filter(x=>x.expenseId||String(x.amountCAD).trim()!=='');
   let allocations=null,related=null;
   if(first||extra.length){
    if(!first)throw Error('Choisis la première avance.');
    const raw=$('#foreignFriendFirstAmount').value.trim();
    const amount=raw!==''?Number(raw):extra.length?NaN:reference.amountCAD;
    allocations=M.validateRepaymentAllocations(
     [{expenseId:first,amountCAD:amount},...extra],
     state.transactions,state.transactions,me,t.date,reference.amountCAD,t.id,$('#foreignFriendName').value);
    related=allocations.length===1?first:null;
   }
   const next={...t,relatedExpenseId:related,repaymentAllocations:allocations,
    counterparty:$('#foreignFriendName').value.trim()};
   $('#foreignFriendSave').disabled=true;
   await saveDocument('transactions',next);
   Object.assign(t,next);closeSheet();renderAll();navigate('activity');showTab('transactions');
  }catch(error){$('#foreignFriendSave').disabled=false;
   $('#foreignFriendError').textContent=String(error.message||error);}
 };
 render();
}


/* Safe first foreign CSV route: simple expenses only, never special movements. */
function reviewForeignPendingCsvExpense(t){
 const I=window.TraceInternational,bank=state.accounts.find(a=>a.id===t?.accountId);
 const currency=bank?I.currency(bank):null,amount=bank?I.amountOnAccount(t,bank):null;
 const eligible=t&&bank&&bank.owner===me&&visibleBankAccounts(me).some(a=>a.id===bank.id)&&
  currency!=='CAD'&&t.source==='csv'&&t.type==='expense'&&t.status==='pending'&&
  // The simple CSV editor is native-only. Never reinterpret pre-valued FX
  // or a different purchase currency as if it were the bank's native amount.
  String(t.bankCurrency||'').toUpperCase()===currency&&
  String(t.currency||currency).toUpperCase()===currency&&
  I.exactMoney(t.amountOriginal??amount)===amount&&t.amountCAD==null&&
  (t.bankRateCad==null||t.bankRateCad==='')&&
  !t.toAccountId&&!t.transferPurpose&&!t.relatedExpenseId&&!t.linkedTransactionId&&
  I.calendarDate(t.date)&&I.exactMoney(amount)!==null&&amount>0&&
  window.TraceImportGuide.safeForQuickApproval(accountType(bank),'expense',t.name||'')&&
  !window.TraceImportGuide.cardStatementSettlementLabel(t.name||'');
 if(!eligible){
  openSheet('Nature bancaire à vérifier','<p class="empty-note">Ce mouvement exige une vérification spécifique. Aucun montant n’a été modifié.</p><button id="foreignCsvClose" class="secondary full">Fermer</button>');
  $('#foreignCsvClose').onclick=closeSheet;return;
 }
 const before=JSON.stringify(t),bankBefore=JSON.stringify(bank),cats=manualCategories('expense'),
  similar=csvBankEvidenceMatches(t,state.transactions),
  // Recheck financial matches after awaited FX resolution: even the status
  // of an already displayed matching row may change in another tab.
  evidenceSignature=matches=>JSON.stringify(matches.map(x=>[x.id,x.status,x.type,x.date,
   x.accountId,x.toAccountId,x.bankAmount,x.toBankAmount,x.amountCAD,x.name])),
  initiallyCompared=evidenceSignature(similar),
  confirmed=similar.filter(x=>x.status==='confirmed'),
  people=[{id:me,name:'Moi'},{id:partner,name:shortMemberName(partner)},{id:'couple',name:'Nous deux'}];
 openSheet('Valider une dépense étrangère',
  '<p class="trace-edit-lead">Le montant du relevé, la date et le compte restent inchangés. La dépense n’est comptabilisée qu’après confirmation explicite.</p>'+
  '<div class="empty-note"><b>'+esc(t.name||'Dépense')+'</b> · '+esc(t.date)+' · '+esc(shortAccountLabel(bank))+' · '+esc(I.money(amount,currency))+'</div>'+
  '<label class="label2">Catégorie</label><select class="input" id="foreignCsvCategory"><option value="">Choisir…</option>'+
   cats.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===t.categoryId?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select>'+
  '<label class="label2">Pour qui ?</label><select class="input" id="foreignCsvWho">'+
   people.map(p=>'<option value="'+esc(p.id)+'"'+(p.id===t.beneficiary?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>'+
  '<label class="label2">Taux CAD par '+esc(currency)+' (facultatif si Banque du Canada disponible)</label>'+
  '<input id="foreignCsvRate" class="input" type="number" min=".000001" step="any" inputmode="decimal" placeholder="Taux historique daté">'+
  '<p class="trace-intl-help">Un taux manuel conserve sa source et la date de l’opération. Le taux ne devient jamais 1 par défaut. Les avances à des proches et mouvements spéciaux restent à vérifier séparément.</p>'+
  (similar.length?'<div class="empty-note"><b>'+similar.length+' mouvement(s) semblable(s) à comparer</b>'+
   similar.map(x=>'<div>'+esc(x.name||'Opération')+' · '+esc(x.date)+' · '+esc(x.status==='confirmed'?'Confirmée':'À vérifier')+'</div>').join('')+'</div>':'')+
  '<label class="label2"><input id="foreignCsvNature" type="checkbox"> Je confirme qu’il s’agit d’un achat et non d’un paiement de carte ou d’un virement.</label>'+
  (confirmed.length?'<label class="label2"><input id="foreignCsvDistinct" type="checkbox"> J’ai comparé les mouvements confirmés : cet achat est distinct.</label>':'')+
  '<p id="foreignCsvError" class="trace-bank-setup-error" role="alert"></p>'+
  '<button class="primary full" id="foreignCsvSave">Valider cette dépense</button>'+
  '<button class="secondary full" id="foreignCsvCancel">Laisser en attente</button>');
 $('#foreignCsvCancel').onclick=closeSheet;
 $('#foreignCsvSave').onclick=async()=>{
  const feedback=$('#foreignCsvError'),button=$('#foreignCsvSave');
  feedback.textContent='';
  try{
   if(!$('#foreignCsvNature').checked)throw Error('Confirme la nature bancaire de cet achat.');
   if(confirmed.length&&!$('#foreignCsvDistinct').checked)throw Error('Compare les opérations déjà confirmées.');
   if(state.transactions.find(x=>x.id===t.id)!==t||JSON.stringify(t)!==before||
      state.accounts.find(a=>a.id===bank.id)!==bank||JSON.stringify(bank)!==bankBefore)
    throw Error('Les données ont changé. Ferme et rouvre la fiche.');
   if(csvBankEvidenceMatches(t,state.transactions).some(x=>x.status==='confirmed'&&!confirmed.some(y=>y.id===x.id)))
    throw Error('Nouvelle ressemblance bancaire : réouvre la fiche pour comparer.');
   const categoryId=$('#foreignCsvCategory').value,beneficiary=$('#foreignCsvWho').value,
    rateText=$('#foreignCsvRate').value.trim(),rate=Number(rateText);
   if(!cats.some(c=>c.id===categoryId))throw Error('Choisis une catégorie valide.');
   if(!people.some(p=>p.id===beneficiary))throw Error('Choisis la répartition.');
   if(rateText!==''&&(!Number.isFinite(rate)||rate<=0||rate>1e4))
    throw Error('Taux CAD invalide.');
   button.disabled=true;
   const quote=rateText!==''?
    {currency,cadPerUnit:rate,date:t.date,source:'Taux saisi manuellement par le membre'}:
    await I.getRate(currency,t.date);
   if(JSON.stringify(t)!==before||JSON.stringify(bank)!==bankBefore)
    throw Error('Les données ont changé pendant la recherche du taux. Ferme et rouvre la fiche.');
   if(evidenceSignature(csvBankEvidenceMatches(t,state.transactions))!==initiallyCompared)
    throw Error('Un mouvement bancaire semblable a changé pendant la recherche du taux. Compare à nouveau avant de valider.');
   const booked=I.resolveBooking({account:bank,bankAmount:amount,date:t.date,quote,
    originalCurrency:t.currency||currency,originalAmount:t.amountOriginal??amount});
   const sharing=traceImportSplit({beneficiary},{amountCAD:booked.amountCAD});
   const next={...t,...booked,categoryId,beneficiary,...sharing,natureReviewed:true,status:'confirmed'};
   if(!legacyImportNatureReady(next))throw Error('Nature bancaire encore ambiguë.');
   await saveDocument('transactions',next);
   Object.assign(t,next);closeSheet();renderAll();navigate('activity');showTab('transactions');
  }catch(err){button.disabled=false;feedback.textContent=String(err.message||err);}
 };
}

/* Edit native-currency expense metadata without rewriting bank amounts or FX. */
function editForeignExpenseMetadata(t){
 const account=state.accounts.find(a=>a.id===t?.accountId),I=window.TraceInternational;
 if(!t||!account||account.owner!==me||I.currency(account)==='CAD'||
    t.type!=='expense'||t.status!=='confirmed'||t.toAccountId){
  openSheet('Dépense étrangère à vérifier',
   '<p class="empty-note">Cette opération ne peut pas être éditée par le formulaire simplifié. Aucun changement financier effectué.</p>'+
   '<button class="secondary full" id="traceForeignMetaCancel">Fermer</button>');
  $('#traceForeignMetaCancel').onclick=closeSheet;return;
 }
 const before=JSON.stringify(t),native=I.amountOnAccount(t,account),
  categories=state.categories.filter(c=>c.type==='expense'&&!c.archived),
  currency=I.currency(account);
 if(native===null||!Number.isFinite(Number(native))||Number(native)<=0){
  openSheet('Montant natif à vérifier',
   '<p class="empty-note">Le montant bancaire de cette dépense est incomplet. Vérifie son import avant de modifier ses informations.</p>'+
   '<button class="secondary full" id="traceForeignMetaCancel">Fermer</button>');
  $('#traceForeignMetaCancel').onclick=closeSheet;return;
 }
 openSheet('Modifier une dépense internationale',
  '<p class="trace-edit-lead">Modifie seulement la description et la catégorie. Montant, compte, date, devise et taux historique restent strictement inchangés.</p>'+
  '<div class="empty-note">'+esc(shortAccountLabel(account))+' · '+esc(t.date)+
   ' · '+esc(I.money(native,currency))+' · CAD historique conservé</div>'+
  '<label class="label2" for="traceForeignMetaName">Description</label>'+
  '<input id="traceForeignMetaName" class="input" maxlength="85" value="'+esc(t.name||'')+'">'+
  '<label class="label2" for="traceForeignMetaCategory">Catégorie</label>'+
  '<select id="traceForeignMetaCategory" class="input">'+
   '<option value="">Choisir une catégorie</option>'+
   categories.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===t.categoryId?' selected':'')+'>'+esc(c.name)+'</option>').join('')+
  '</select>'+
  '<p class="trace-intl-help">La répartition Moi/Couple/Proches et la valorisation CAD enregistrées ne sont pas modifiées.</p>'+
  '<p id="traceForeignMetaError" class="trace-bank-setup-error" role="alert"></p>'+
  '<button type="button" class="primary full" id="traceForeignMetaSave">Enregistrer les informations</button>'+
  '<button type="button" class="secondary full" id="traceForeignMetaCancel">Annuler</button>');
 $('#traceForeignMetaCancel').onclick=closeSheet;
 $('#traceForeignMetaSave').onclick=async()=>{
  const name=String($('#traceForeignMetaName').value||'').trim(),
   categoryId=String($('#traceForeignMetaCategory').value||''),
   error=$('#traceForeignMetaError'),button=$('#traceForeignMetaSave');
  if(name.length<2||name.length>85||
     !state.categories.some(c=>c.id===categoryId&&c.type==='expense'&&!c.archived)){
   error.textContent='Renseigne une description et une catégorie de dépense valides.';return;
  }
  if(state.transactions.find(x=>x.id===t.id)!==t||JSON.stringify(t)!==before||
     state.accounts.find(a=>a.id===account.id)!==account||
     account.owner!==me||I.currency(account)!==currency){
   error.textContent='La dépense ou le compte a changé : ferme puis rouvre la fiche.';return;
  }
  if(t.name===name&&t.categoryId===categoryId){closeSheet();return;}
  const next={...t,name,categoryId};
  button.disabled=true;
  try{
   await saveDocument('transactions',next);
   Object.assign(t,next);
   closeSheet();renderAll();navigate('activity');showTab('transactions');
  }catch(e){
   button.disabled=false;
   error.textContent='Enregistrement impossible. Aucune modification locale appliquée.';
  }
 };
}

function editSmartBankMovement(t,requestedKind='',initialDraft=null){
 const originalAccount=state.accounts.find(a=>a.id===t.accountId);
 const oldDestination=state.accounts.find(a=>a.id===t.toAccountId);
 // A verified foreign friend refund can update its links without touching the
 // bank's native credit, CAD budget snapshot, historical rate or import proof.
 if(originalAccount&&window.TraceInternational.currency(originalAccount)!=='CAD'&&
    t.type==='external_refund'&&t.transferPurpose==='friend_reimbursement'&&t.status==='confirmed'){
  editForeignFriendRepayment(t);return;
 }
 // The legacy bank-movement editor is CAD-only. Its saved amount represents
 // CAD and cannot safely rewrite native foreign balances or transfer legs.
 // International movements are read-only here until the FX editor is audited.
 if(window.TraceInternational.currency(originalAccount)!=='CAD'||
    (oldDestination&&window.TraceInternational.currency(oldDestination)!=='CAD')){
  if(t.type==='transfer'&&t.toAccountId&&t.status==='confirmed'){
   editInternationalTransfer(t);return;
  }
  if(originalAccount&&originalAccount.owner===me&&
     t.type==='expense'&&t.status==='confirmed'&&!t.toAccountId){
   editForeignExpenseMetadata(t);return;
  }
  openSheet('Mouvement international à préserver',
   '<p class="empty-note">Cette opération est enregistrée dans sa devise native. Sa modification n’est pas encore ouverte car un changement de montant pourrait fausser les soldes ou le taux historique.</p>'+
   '<p class="empty-note">Aucune donnée n’a été modifiée. Cette édition sera activée après les tests de la version internationale.</p>'+
   '<button type="button" class="secondary full" id="traceFxEditClose">Fermer</button>');
  $('#traceFxEditClose').onclick=closeSheet;
  return;
 }
 const own=visibleBankAccounts(me),eligibleSavings=trackedSavingsAccounts(me);
 const M=window.TraceMovement,U=window.TraceOperationUI,
   bank=state.accounts.find(a=>a.id===t.accountId),
   direction=['external_refund','refund','income','card_statement_evidence'].includes(t.type)?'in':'out',
   types=U.kindsFor(accountType(bank),direction);
 openSheet('Modifier le mouvement',
  '<div class="trace-edit-layout trace-bank-edit-layout">'+
   '<p class="trace-edit-lead" id="smartMovementIntro">Précise à quoi correspond ce mouvement. TRACE conserve sa ligne bancaire et adapte uniquement sa qualification.</p>'+
   '<section class="trace-edit-card" aria-labelledby="traceBankNatureTitle">'+
    '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">01</span><div><h3 id="traceBankNatureTitle">Nature du mouvement</h3><p>Ce que représente l’opération</p></div></div>'+
    '<div class="trace-edit-fields">'+
     '<label class="label2" for="smartMovementFamily">Famille</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementFamily" class="input">'+M.families.filter(f=>types.some(k=>k.family===f.id)).map(f=>'<option value="'+f.id+'">'+esc(f.label)+'</option>').join('')+'</select></div>'+
     '<label class="label2" for="smartMovementType">Nature précise</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementType" class="input"></select></div>'+
     '<p class="trace-movement-help trace-bank-context-note" id="smartMovementHelp" aria-live="polite"></p>'+
    '</div></section>'+
   '<section class="trace-edit-card" aria-labelledby="traceBankDetailsTitle">'+
    '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">02</span><div><h3 id="traceBankDetailsTitle">Détails bancaires</h3><p>Compte, montant et date</p></div></div>'+
    '<div class="trace-edit-fields">'+
     '<label class="label2" for="smartMovementName">Description</label><div class="trace-edit-control trace-edit-text-control"><input id="smartMovementName" class="input" maxlength="85" value="'+esc(t.name)+'"></div>'+
     '<label class="label2" for="smartMovementAmount">Montant</label><div class="trace-edit-control trace-edit-money-control"><input id="smartMovementAmount" type="number" inputmode="decimal" min=".01" step=".01" class="input" value="'+Number(t.amountCAD)+'"><span class="trace-edit-currency" aria-hidden="true">CAD</span></div>'+
     '<label class="label2" for="smartMovementDate">Date de l’opération</label><div class="trace-edit-control trace-edit-date-control"><span class="trace-edit-date-display" id="smartMovementDateDisplay" aria-hidden="true">'+esc(traceEditorDateLabel(t.date))+'</span><span class="trace-edit-date-icon" aria-hidden="true"></span><input id="smartMovementDate" type="date" class="input" value="'+esc(t.date)+'"></div>'+
     '<label class="label2" for="smartMovementFrom">Compte concerné</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementFrom" class="input">'+own.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select></div>'+
    '</div></section>'+
   '<section class="trace-edit-card trace-bank-additional" id="smartMovementAdditional" aria-labelledby="traceBankExtraTitle">'+
    '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">03</span><div><h3 id="traceBankExtraTitle">Informations complémentaires</h3><p>Seulement ce qui est nécessaire</p></div></div>'+
    '<div class="trace-edit-fields">'+
     '<div id="smartMovementToWrap"><label class="label2" for="smartMovementTo">Compte destinataire</label><div class="trace-edit-control trace-edit-select-control"><select class="input" id="smartMovementTo">'+state.accounts.filter(a=>a.id!==t.accountId&&a.owner===me).map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select></div><p class="trace-bank-inline-tip hidden" id="smartMovementCardNote">Paiement de carte : le compte courant diminue et la dette de carte baisse, sans nouvelle dépense.</p></div>'+
     '<div class="trace-bank-extra-box hidden" id="smartMovementExpenseWrap">'+
      '<label class="label2" for="smartMovementCategory">Catégorie de dépenses</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementCategory" class="input"></select></div>'+
      '<label class="label2" for="smartMovementWho">Pour qui ?</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementWho" class="input"><option value="'+esc(me)+'">Moi</option><option value="'+esc(partner)+'">'+esc(shortMemberName(partner))+'</option><option value="couple">Nous deux</option><option value="custom">Avec des amis · personnalisé</option></select></div>'+
      '<div class="trace-edit-friends hidden" id="smartMovementCustom"><strong>Répartition avec des amis</strong><div class="trace-edit-friends-grid"><div><label class="label2" for="smartMovementFriends">Part des amis ($)</label><input id="smartMovementFriends" class="input" type="number" inputmode="decimal" min="0" step=".01" value="0"></div><div><label class="label2" for="smartMovementPartner">Part de '+esc(shortMemberName(partner))+' ($)</label><input id="smartMovementPartner" class="input" type="number" inputmode="decimal" min="0" step=".01" value="0"></div></div>'+
       '<label class="label2" for="smartMovementDebtorName">Un seul proche (facultatif)</label><input id="smartMovementDebtorName" class="input" maxlength="45" value="'+esc(t.friendDebtorName||'')+'" placeholder="Ex. Camille">'+
       '<textarea id="smartMovementDebtorShares" hidden aria-hidden="true" tabindex="-1">'+
       esc((t.friendDebtorShares||[]).map(x=>x.name+' : '+Number(x.amountCAD).toFixed(2).replace('.',',')).join('\n'))+'</textarea>'+
       '<div id="smartMovementDebtorRows" class="trace-friend-debtors"></div></div>'+
       '<p class="trace-bank-inline-tip" id="smartMovementBudgetNote"></p>'+
     '</div>'+
     '<div id="smartMovementCardReceiveWrap" class="trace-bank-extra-box hidden">'+
     '<label class="label2" for="smartMovementCardMatch">Paiement correspondant sur le compte courant</label>'+
     '<div class="trace-edit-control trace-edit-select-control"><select id="smartMovementCardMatch" class="input"><option value="">Choisir le paiement à rapprocher</option></select></div>'+
     '<p class="trace-bank-inline-tip" id="smartMovementCardMatchHint">Choisis un règlement du même montant déjà débité sur ton compte courant. Aucun deuxième paiement ou revenu ne sera créé.</p></div>'+
     '<div id="smartMovementSavingsWrap" class="trace-bank-extra-box hidden"><label class="label2" for="smartMovementSavingsTo">Compte épargne / CELI</label><div class="trace-edit-control trace-edit-select-control"><select id="smartMovementSavingsTo" class="input"><option value="">Choisir un compte d’épargne</option>'+eligibleSavings.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+(isReadySavingsAccount(a)?'':' · à configurer')+'</option>').join('')+'</select></div><p class="trace-bank-inline-tip">Le versement change tes soldes bancaires et ton épargne, mais ne crée pas de dépense de consommation.</p></div>'+
     '<div id="smartMovementLinkWrap" class="trace-bank-extra-box hidden"><label class="label2" for="smartMovementFriendName">Prénom du proche (facultatif)</label><input id="smartMovementFriendName" class="input" maxlength="45" value="'+esc(t.counterparty||'')+'" placeholder="Ex. Camille">'+
      '<label class="label2" for="smartMovementLink">Première avance remboursée</label><select id="smartMovementLink" class="input"></select>'+
      '<label class="label2" for="smartMovementFirstAmount">Montant attribué (CAD)</label><input id="smartMovementFirstAmount" class="input" type="number" min=".01" step=".01" inputmode="decimal" value="'+esc(window.TraceMovement.repaymentLines(t)[0]?.amountCAD??'')+'">'+
      '<div id="smartMovementMoreLinks"></div><button type="button" class="secondary" id="smartMovementAddLink">+ Ajouter une autre avance</button>'+
      '<p class="trace-bank-inline-tip">Rattacher les avances au même virement déjà importé n’ajoute ni transaction ni revenu.</p></div>'+
      '<p class="trace-bank-inline-tip hidden" id="smartMovementFriendNote">Ce remboursement augmente le compte courant, mais ne crée pas de revenu.</p>'+
    '</div></section>'+
   '<section class="trace-edit-impact trace-bank-impact" aria-labelledby="traceBankImpactTitle"><div class="trace-edit-impact-head"><span class="trace-edit-impact-symbol" aria-hidden="true">↗</span><div><h3 id="traceBankImpactTitle">Aperçu de l’impact</h3><p>Avant d’enregistrer la correction</p></div></div><div class="trace-bank-impact-summary" id="smartMovementPreview" aria-live="polite"></div></section>'+
   '<div class="trace-edit-actions-secondary"><button type="button" id="smartMovementCancel">Annuler</button><button type="button" class="trace-edit-delete" id="smartMovementRemove">Supprimer ce mouvement</button></div>'+
   '<div class="trace-edit-actions"><button id="smartMovementSave" class="primary full trace-edit-save" type="button">Enregistrer les modifications</button></div>'+
   traceFeedback()+
  '</div>');
 $('#sheetBackdrop').classList.add('trace-premium-edit','trace-premium-movement');
 U.enhanceBankMovement();
 window.TraceFriendDebtorUI?.mount({fieldId:'smartMovementDebtorShares',
  singleId:'smartMovementDebtorName',totalId:'smartMovementFriends',
  hostId:'smartMovementDebtorRows',initial:t.friendDebtorShares||[]});
 const stored=M.fromStored(t)==='transfer'&&t.toAccountId&&accountType(state.accounts.find(x=>x.id===t.toAccountId))==='card'?'card_payment':M.fromStored(t),
  guessed=requestedKind||stored,
  initial=types.some(k=>k.id===guessed)?guessed:(types.some(k=>k.id===stored)?stored:'');
 const selectKind=(family,chosen='')=>{
  $('#smartMovementFamily').value=family;
  $('#smartMovementType').innerHTML=U.options(types,chosen);
  $('#smartMovementType').value=chosen;
 };
 selectKind(M.family(initial)||'payments',initial);
 $('#smartMovementFrom').value=initialDraft?.accountId||t.accountId;
 if(initialDraft){
  if(initialDraft.name)$('#smartMovementName').value=initialDraft.name;
  if(Number(initialDraft.amountCAD)>0)$('#smartMovementAmount').value=initialDraft.amountCAD;
  if(initialDraft.date)$('#smartMovementDate').value=initialDraft.date;
  if(initialDraft.categoryId)$('#smartMovementCategory').dataset.preferred=initialDraft.categoryId;
  if(initialDraft.beneficiary)$('#smartMovementWho').value=initialDraft.beneficiary;
  if(initialDraft.friendsAmount!==undefined)$('#smartMovementFriends').value=initialDraft.friendsAmount;
  if(initialDraft.partnerAmount!==undefined)$('#smartMovementPartner').value=initialDraft.partnerAmount;
 }
 const bankDate=$('#smartMovementDate'),bankDateDisplay=$('#smartMovementDateDisplay');
 const refreshBankDate=()=>{bankDateDisplay.textContent=traceEditorDateLabel(bankDate.value);};
 bankDate.addEventListener('input',refreshBankDate);
 bankDate.addEventListener('change',refreshBankDate);
 refreshBankDate();
 if(t.toAccountId)$('#smartMovementTo').value=t.toAccountId;
 if(t.investmentAccountId)$('#smartMovementSavingsTo').value=t.investmentAccountId;
 const friendLines=M.repaymentLines(t),extraFriendLines=friendLines.slice(1).map(x=>({expenseId:x.expenseId,amountCAD:String(x.amountCAD)}));
  let linkInitialized=false;
  const renderFriendLinks=()=>{
   const link=$('#smartMovementLink'),old=linkInitialized?link.value:(link.value||friendLines[0]?.expenseId||''),
    rows=friendLinkOptions($('#smartMovementDate').value,.01,t.id),
    options='<option value="">Aucune avance liée</option>'+rows.map(r=>
     '<option value="'+esc(r.id)+'">'+esc(r.label)+' · '+esc(r.date)+' · '+money(r.remaining)+' disponibles</option>').join('');
   link.innerHTML=options;
   if(rows.some(r=>r.id===old))link.value=old;
   linkInitialized=true;
   const host=$('#smartMovementMoreLinks');
   host.innerHTML=extraFriendLines.map((row,i)=>'<div class="formrow trace-edit-friends-grid">'+
    '<div><label class="label2">Autre avance</label><select class="input" data-repay-expense="'+i+'">'+options+'</select></div>'+
    '<div><label class="label2">Montant (CAD)</label><input class="input" type="number" min=".01" step=".01" value="'+esc(row.amountCAD)+'" data-repay-amount="'+i+'"></div>'+
    '<button type="button" class="secondary" data-repay-remove="'+i+'">Retirer</button></div>').join('');
   host.querySelectorAll('[data-repay-expense]').forEach(el=>{
    const i=Number(el.dataset.repayExpense);el.value=extraFriendLines[i].expenseId;
    el.onchange=()=>{extraFriendLines[i].expenseId=el.value;};
   });
   host.querySelectorAll('[data-repay-amount]').forEach(el=>{
    el.oninput=()=>{extraFriendLines[Number(el.dataset.repayAmount)].amountCAD=el.value;};
   });
   host.querySelectorAll('[data-repay-remove]').forEach(el=>{
    el.onclick=()=>{extraFriendLines.splice(Number(el.dataset.repayRemove),1);renderFriendLinks();};
   });
  };
  $('#smartMovementAddLink').onclick=()=>{
   if(extraFriendLines.length>=12){$('#traceFeedback').textContent='Maximum de 13 avances par remboursement.';return;}
   extraFriendLines.push({expenseId:'',amountCAD:''});renderFriendLinks();
  };
  const sync=()=>{
  const id=$('#smartMovementType').value,def=M.get(id),
   budget=Boolean(def&&def.budget!=='none'),
   expense=def?.budget==='expense'||def?.budget==='refund';
  $('#smartMovementHelp').textContent=M.get(id)?.help||'';
  const cardReceived=id==='card_payment_received';
  const hasTarget=['transfer','card_payment'].includes(id);
  const hasExpense=budget,hasSavings=['savings_transfer','savings_withdrawal'].includes(id),hasFriend=id==='friend_reimbursement';
  $('#smartMovementToWrap').classList.toggle('hidden',!hasTarget);
  $('#smartMovementExpenseWrap').classList.toggle('hidden',!budget);
  const who=$('#smartMovementWho'),whoLabel=who.closest('.trace-bank-extra-box').querySelector('label[for="smartMovementWho"]');
  who.classList.toggle('hidden',!expense);
  whoLabel.classList.toggle('hidden',!expense);
  const catLabel=$('#smartMovementCategory').closest('.trace-bank-extra-box').querySelector('label[for="smartMovementCategory"]');
  catLabel.textContent=def?.budget==='income'?'Catégorie de revenus':'Catégorie budgétaire';
  $('#smartMovementBudgetNote').textContent=id==='friend_payment_expense'?
   'Un proche a avancé les frais : ce virement est ta dépense, à classer et répartir.':
   def?.budget==='income'?'Ce revenu doit être affecté à sa catégorie de revenus.':
   def?.budget==='refund'?'Ce retour de commerçant corrige la dépense concernée.':
   'Choisis la catégorie et la répartition de cette dépense.';
  const categories=budget?manualCategories(def.budget==='income'?'income':'expense'):[];
  const category=$('#smartMovementCategory'),chosen=category.dataset.preferred||category.value||t.categoryId||'';
  category.innerHTML='<option value="">Choisir une catégorie</option>'+categories.map(c=>
   '<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  category.value=categories.some(c=>c.id===chosen)?chosen:'';
  category.dataset.preferred='';
  $('#smartMovementCustom').classList.toggle('hidden',!expense||$('#smartMovementWho').value!=='custom');
  $('#smartMovementIntro').textContent=cardReceived?
   'Cette ligne est le crédit sur ton relevé de carte. Elle doit être liée au paiement déjà enregistré depuis ton compte courant, sans seconde écriture.':
   def?.budget==='expense'?
   'Cette ligne compte comme une dépense, répartie selon tes choix. Le solde bancaire n’est modifié qu’une fois.':
   def?.budget==='income'?'Ce mouvement compte comme un revenu dans le budget.':
   def?.budget==='refund'?'Ce remboursement de commerçant corrige une dépense existante.':
   'Ce mouvement change le solde bancaire, sans créer de nouvelle dépense ni revenu.';
  $('#smartMovementCardReceiveWrap').classList.toggle('hidden',!cardReceived);
  if(cardReceived){
   const source=state.accounts.find(a=>a.id===$('#smartMovementFrom').value);
   const candidates=source&&accountType(source)==='card'?
    smartCardPaymentMatches(source.id,$('#smartMovementDate').value,Number($('#smartMovementAmount').value)):[];
   const dest=$('#smartMovementCardMatch'),prev=dest.value;
   dest.innerHTML='<option value="">Choisir un paiement du compte courant</option>'+candidates.map(x=>
    '<option value="'+esc(x.id)+'">'+esc(x.date)+' · '+esc(x.sourceAccount)+' · '+money(x.amount)+'</option>').join('');
   if(candidates.some(x=>x.id===prev))dest.value=prev;
   $('#smartMovementCardMatchHint').textContent=candidates.length?
    'Vérifie le montant, la date et le compte. L’association n’ajoutera aucune nouvelle transaction.':
    'Aucun paiement compatible trouvé : enregistre d’abord le transfert depuis ton compte courant vers cette carte.';
  }
  $('#smartMovementSavingsWrap').classList.toggle('hidden',!hasSavings);
  $('#smartMovementAdditional').classList.toggle('hidden',!(hasTarget||hasExpense||hasSavings||hasFriend||cardReceived));
  $('#smartMovementCardNote').classList.toggle('hidden',id!=='card_payment');
  $('#smartMovementFriendNote').classList.toggle('hidden',!hasFriend);
  $('#smartMovementLinkWrap').classList.toggle('hidden',id!=='friend_reimbursement');
   if(id==='friend_reimbursement')renderFriendLinks();
   $('#smartMovementPreview').textContent=cardReceived?
    'Compte courant : déjà débité lors du transfert · Dette de carte : déjà réduite · Budget : 0 $ · Aucun mouvement supplémentaire.':
    id?movementImpactText(id,Number($('#smartMovementAmount').value),
   expense?$('#smartMovementWho').value:(state.accounts.find(a=>a.id===$('#smartMovementFrom').value)?.owner||me),Number($('#smartMovementFriends').value||0),
   Number($('#smartMovementPartner').value||0)):
   'Choisis la nature du mouvement pour connaître son impact.';
 };
 const initialCategories=manualCategories('expense');
 $('#smartMovementCategory').innerHTML='<option value="">Choisir la catégorie</option>'+
  initialCategories.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
 if(initialCategories.some(c=>c.id===t.categoryId))$('#smartMovementCategory').value=t.categoryId;
 if(['la','partner','couple','custom'].includes(t.beneficiary))$('#smartMovementWho').value=t.beneficiary;
 $('#smartMovementFamily').onchange=()=>{selectKind($('#smartMovementFamily').value);sync();};
 $('#smartMovementType').onchange=()=>refreshAllowed();
 const refreshAllowed=()=>{
  const acc=state.accounts.find(a=>a.id===$('#smartMovementFrom').value),
   valid=acc?U.kindsFor(accountType(acc),direction):[],
   current=$('#smartMovementType').value;
  $('#smartMovementType').innerHTML=U.options(valid,current);
  $('#smartMovementType').value=valid.some(k=>k.id===current)?current:'';
  $('#smartMovementFamily').value=M.family($('#smartMovementType').value);
  const target=$('#smartMovementTo'),oldTarget=target.value;
  const destinations=state.accounts.filter(a=>a.id!==acc?.id&&a.owner===acc?.owner&&
   (current!=='card_payment'||accountType(a)==='card'));
  target.innerHTML='<option value="">Choisir le compte</option>'+destinations.map(a=>
   '<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
  if(destinations.some(a=>a.id===oldTarget))target.value=oldTarget;
  sync();
 };
 ['#smartMovementAmount','#smartMovementDate','#smartMovementFriends','#smartMovementPartner']
   .forEach(id=>$(id).addEventListener('input',sync));
 $('#smartMovementFrom').addEventListener('change',refreshAllowed);
 $('#smartMovementCategory').addEventListener('change',sync);
 $('#smartMovementWho').addEventListener('change',sync);
 refreshAllowed();
 $('#smartMovementCancel').onclick=closeSheet;
 $('#smartMovementRemove').onclick=()=>deleteTransaction(t);
 $('#smartMovementSave').textContent=t.status==='confirmed'?'Enregistrer les modifications':'Valider cette opération';
 $('#smartMovementSave').onclick=async()=>{
  const amount=Number($('#smartMovementAmount').value),date=$('#smartMovementDate').value,
   name=$('#smartMovementName').value.trim(),requestedType=$('#smartMovementType').value,
   movement=M.get(requestedType),type=movement?.type||'',
   accountId=$('#smartMovementFrom').value,toAccountId=type==='transfer'?$('#smartMovementTo').value:null,
   savings=['savings_transfer','savings_withdrawal'].includes(requestedType),
   investmentAccountId=savings?$('#smartMovementSavingsTo').value:null,
   savingsAccount=state.investmentAccounts.find(a=>a.id===investmentAccountId);
  const account=state.accounts.find(a=>a.id===accountId);
  const targetAccount=state.accounts.find(a=>a.id===toAccountId);
  if(window.TraceInternational.currency(account)!=='CAD'||
     (targetAccount&&window.TraceInternational.currency(targetAccount)!=='CAD')){
   $('#traceFeedback').textContent='Pour préserver les montants réels et le taux historique, termine la modification dans le futur éditeur international. Aucun changement enregistré.';return;
  }
  if(!movement||movement.legacyOnly||movement.direction!==(direction==='in'?1:-1)||
     !account||!U.kindsFor(accountType(account),direction).some(k=>k.id===requestedType)||
     !(amount>0)||!Number.isFinite(amount)||amount>1e7||!smartStrictDate(date)||name.length<2||!accountId||
    type==='transfer'&&(!toAccountId||accountId===toAccountId||accountType(account)!=='checking'||
      state.accounts.find(a=>a.id===toAccountId)?.owner!==account.owner)){
   
   $('#traceFeedback').textContent='Complète le montant, la date et les comptes concernés.';return;
  }
  if(savings&&(!isReadySavingsAccount(savingsAccount)||savingsAccount.owner!==me||
     accountType(state.accounts.find(a=>a.id===accountId))!=='checking'||date<=savingsAccount.openingDate)){
   $('#traceFeedback').textContent='Sélectionne un CELI configuré et un virement depuis ton compte courant, après sa date initiale.';return;
  }
  if(requestedType==='card_payment_received'){
   const target=$('#smartMovementCardMatch').value;
   if(t.status==='confirmed'){
    $('#traceFeedback').textContent='Pour éviter de modifier une opération déjà confirmée, vérifie d’abord son historique et son rapprochement.';return;
   }
   if(accountType(account)!=='card'||!target||
     !smartCardPaymentMatches(accountId,date,amount).some(x=>x.id===target)){
    $('#traceFeedback').textContent='Sélectionne un paiement de ton compte courant, du même montant, déjà enregistré vers cette carte.';return;
   }
   const next={...t,type:'card_statement_evidence',transferPurpose:'card_payment_received',
    status:'confirmed',linkedTransactionId:target,natureReviewed:true,
    date,name,amountCAD:Math.round(amount*100)/100,amountOriginal:Math.round(amount*100)/100,
    accountId,categoryId:'',toAccountId:null};
   $('#smartMovementSave').disabled=true;
   try{await saveDocument('transactions',next);Object.assign(t,next);closeSheet();renderAll();}
   catch(e){$('#smartMovementSave').disabled=false;traceNotice(e);}
   return;
  }
  if(requestedType==='card_payment'){
   const from=state.accounts.find(a=>a.id===accountId),to=state.accounts.find(a=>a.id===toAccountId);
   if(accountType(from)!=='checking'||accountType(to)!=='card'||from.owner!==to.owner){
    $('#traceFeedback').textContent='Choisis ton compte courant comme origine et ta carte de crédit comme destination.';return;
   }
  }
  if(requestedType==='friend_payment_expense'&&accountType(state.accounts.find(a=>a.id===accountId))!=='checking'){
    $('#traceFeedback').textContent='Choisis le compte courant utilisé pour le paiement à ton amie.';return;
   }
   if(['friend_reimbursement','friend_advance_return','external_refund','savings_withdrawal'].includes(requestedType)&&accountType(state.accounts.find(a=>a.id===accountId))!=='checking'){
    $('#traceFeedback').textContent='Choisis le compte courant pour recevoir ce remboursement.';return;
   }
   let related,repaymentAllocations=null,categoryId='',shares,friendDebtors;
   try{
    if(requestedType==='friend_reimbursement'){
      const first=$('#smartMovementLink').value,
       extra=extraFriendLines.filter(x=>x.expenseId||String(x.amountCAD).trim()!=='');
      if(first||extra.length){
       if(!first)throw Error('Choisis la première avance remboursée.');
       const raw=$('#smartMovementFirstAmount').value.trim();
       const firstAmount=raw!==''?Number(raw):extra.length?NaN:amount;
       repaymentAllocations=M.validateRepaymentAllocations(
        [{expenseId:first,amountCAD:firstAmount},...extra],
        state.transactions,state.transactions,me,date,amount,t.id,$('#smartMovementFriendName').value);
       related=repaymentAllocations.length===1?first:null;
      }
     }else related=validateFriendLink(requestedType,$('#smartMovementLink').value,date,amount,t.id);
    if(movement.budget!=='none'){
     categoryId=$('#smartMovementCategory').value;
     if(!manualCategories(movement.budget==='income'?'income':'expense').some(c=>c.id===categoryId))
      throw Error('Choisis une catégorie budgétaire valide.');
     const who=movement.budget==='income'?(account.owner||t.payerId||me):$('#smartMovementWho').value;
     shares=who==='custom'?traceCustomShares(amount,$('#smartMovementFriends').value,$('#smartMovementPartner').value):
      {beneficiary:who,...traceSplit(who,amount)};
    }else shares={beneficiary:me,...traceSplit(me,amount)};
    friendDebtors=friendDebtorFields(shares.splitAmounts?.friends,
     $('#smartMovementDebtorName').value,$('#smartMovementDebtorShares').value,t.id);
    const received=window.TraceMovement.paidForExpense(state.transactions,t.id);
    if(received>0&&Math.round(Number(shares.splitAmounts?.friends||0)*100)<received){
     throw Error('Cette dépense possède des remboursements liés. Tu dois conserver au moins la part des amis déjà remboursée.');
    }
   }catch(e){$('#traceFeedback').textContent=String(e.message||e);return;}
   const next={...t,type,date,name,status:'confirmed',natureReviewed:t.status!=='confirmed'?true:t.natureReviewed,amountCAD:Math.round(amount*100)/100,amountOriginal:Math.round(amount*100)/100,
    accountId,toAccountId,categoryId,investmentAccountId,
    transferPurpose:movement.purpose||null,relatedExpenseId:related,repaymentAllocations,
     counterparty:requestedType==='friend_reimbursement'?$('#smartMovementFriendName').value.trim():(t.counterparty||''),
     importFingerprint:accountId===t.accountId&&date===t.date&&name===t.name&&
      Math.abs(Number(t.bankAmount??t.amountCAD)-amount)<.009?
      (t.importFingerprint??null):null,
      payerId:account.owner||t.payerId||me,...shares,...friendDebtors};
  $('#smartMovementSave').disabled=true;
  try{await saveDocument('transactions',next);Object.assign(t,next);closeSheet();renderAll();}
  catch(e){$('#smartMovementSave').disabled=false;traceNotice(e);}
 };
}
function cardPaymentEvidenceFor(transferId){
 return [
  ...state.smartImports.filter(d=>d.kind==='smart_draft'&&d.status==='matched_card_payment'&&d.linkedTransactionId===transferId),
  ...state.transactions.filter(t=>t.type==='card_statement_evidence'&&t.status==='confirmed'&&t.linkedTransactionId===transferId)
 ];
}
function requireCardEvidenceUnlink(t){
 const related=cardPaymentEvidenceFor(t.id);if(!related.length)return false;
 const source=state.accounts.find(a=>a.id===t.accountId),destination=state.accounts.find(a=>a.id===t.toAccountId);
 const description=window.TraceCardPaymentDetail.render({
  transfer:t,evidence:related,
  fromName:source?shortAccountLabel(source):'Compte courant',
  toName:destination?shortAccountLabel(destination):'Carte de crédit'
 });
 openSheet('Paiement de carte rapproché',description+traceFeedback());
 $('#keepCardEvidence').onclick=closeSheet;
 $('#unlinkCardEvidence').onclick=()=>{
  $('#traceUnlinkConfirm').hidden=false;
  $('#unlinkCardEvidence').hidden=true;
 };
 $('#traceUnlinkCancel').onclick=()=>{
  $('#traceUnlinkConfirm').hidden=true;
  $('#unlinkCardEvidence').hidden=false;
 };
 $('#traceUnlinkNow').onclick=async()=>{
  const btn=$('#traceUnlinkNow');btn.disabled=true;
  try{
   for(const d of related){
    const isBankLine=d.type==='card_statement_evidence';
    const next={...d,status:'pending',linkedTransactionId:null,matchedAt:null,resolvedAt:null,
     ...(isBankLine?{type:'refund',transferPurpose:null,natureReviewed:false}:{} )};
    await saveDocument(isBankLine?'transactions':'imports',next);Object.assign(d,next);
   }
   renderAll();editTransaction(t.id);
  }catch(e){btn.disabled=false;traceNotice(e);}
 };
 return true;
}
function editTransaction(id,validating=false){
 const t=state.transactions.find(x=>x.id===id);if(!t)return;
 const csvReview=t.source==='csv'&&t.status!=='confirmed'?
  csvBankEvidenceMatches(t,state.transactions):[];
 // Snapshot exactly what was compared. The checkbox is not transferable to a
 // new amount/date/account, nor to an edited or newly confirmed bank movement.
 const csvReviewIdentity=(row,matches)=>JSON.stringify({
  row:[row.accountId,row.date,Number(row.bankAmount??row.amountCAD),
   row.type,String(row.name||'').trim()],
  matches:matches.map(x=>[x.id,x.status,x.type,x.date,x.accountId,
   x.toAccountId,x.bankAmount,x.toBankAmount,x.amountCAD,x.name])
 });
 const csvInitiallyReviewed=csvReviewIdentity(t,csvReview);
 // The card-side statement line is proof, never an editable second payment.
 if(t.type==='card_statement_evidence'){
  const linked=state.transactions.find(x=>x.id===t.linkedTransactionId&&x.type==='transfer');
  if(linked&&requireCardEvidenceUnlink(linked))return;
  openSheet('Ligne de carte à vérifier',
   '<div class="empty-note">Cette ligne du relevé est marquée comme rapprochée, mais le paiement correspondant est introuvable. Vérifie ton activité avant toute correction.</div>'+
   '<button type="button" class="primary full" id="traceUnmatchedEvidenceClose">Fermer</button>');
  $('#traceUnmatchedEvidenceClose').onclick=closeSheet;
  return;
 }
 if(requireCardEvidenceUnlink(t))return;
 const M=window.TraceMovement,U=window.TraceOperationUI,
  initialKind=M.fromStored(t)||t.type,
  initialDirection=['income','refund'].includes(t.type)?'in':'out';
 if(t.type==='transfer'&&t.toAccountId){
  const from=state.accounts.find(a=>a.id===t.accountId),to=state.accounts.find(a=>a.id===t.toAccountId);
  if(from?.owner&&to?.owner&&from.owner!==to.owner)openSettlement(t);
  else editSmartBankMovement(t);
  return;
 }
 if(['external_transfer','external_refund'].includes(t.type)||t.type==='transfer'){editSmartBankMovement(t);return;}
 if(!['expense','income','refund'].includes(t.type)){openSheet('Opération','<div class="empty-note">Cette opération spéciale peut être supprimée mais pas transformée automatiquement.</div><button class="secondary full trace-danger" id="specialRemove">Supprimer</button>');$('#specialRemove').onclick=()=>deleteTransaction(t);return;}

 const foreignAccount=state.accounts.find(a=>a.id===t.accountId);
 if(foreignAccount&&window.TraceInternational.currency(foreignAccount)!=='CAD'&&
    ['expense','income','refund'].includes(t.type)){
  if(t.type==='expense'&&t.source==='csv'&&t.status==='pending'&&foreignAccount.owner===me){
   reviewForeignPendingCsvExpense(t);return;
  }
  if(t.type==='expense'&&t.status==='confirmed'&&
     foreignAccount.owner===me&&!t.toAccountId)
   editForeignExpenseMetadata(t);
  else{
   openSheet('Opération internationale à vérifier',
    '<p class="empty-note">Cette écriture requiert une validation dans sa devise native. Aucun montant ni taux historique n’a été modifié.</p>'+
    '<button class="secondary full" id="traceForeignEditClose">Fermer</button>');
   $('#traceForeignEditClose').onclick=closeSheet;
  }
  return;
 }

 const accounts=[...visibleBankAccounts(me),...state.accounts.filter(a=>a.id===t.accountId&&!visibleBankAccounts(me).some(v=>v.id===a.id))];
 const displayEditDate=value=>{
  const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!parts)return 'Choisir une date';
  const months=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  const month=months[Number(parts[2])-1];if(!month)return 'Choisir une date';
  return Number(parts[3])+' '+month+' '+parts[1];
 };
 openSheet(validating?'Vérifier l’opération':'Modifier la transaction',
 '<div class="trace-edit-layout">'+
 '<p class="trace-edit-lead">Corrige les informations utiles, puis vérifie l’impact avant d’enregistrer.</p>'+
 '<section class="trace-edit-card" aria-labelledby="traceEditNatureTitle">'+
  '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">01</span>'+
   '<div><h3 id="traceEditNatureTitle">L’opération</h3><p>Identifier le mouvement</p></div></div>'+
  '<div class="trace-edit-fields"><label class="label2" for="txType">Type d’opération</label>'+
   '<div class="trace-edit-control trace-edit-select-control"><select id="txType" class="input"><option value="expense">Dépense</option><option value="income">Revenu</option><option value="refund">Retour de commerçant</option></select></div>'+
  '<label class="label2" for="txName">Description</label>'+
   '<div class="trace-edit-control trace-edit-text-control"><input id="txName" class="input" maxlength="80" value="'+esc(t.name||t.merchant||'')+'" placeholder="Ex. Week-end, restaurant, salaire"></div>'+
   '</div>'+
 '</section>'+
 '<section class="trace-edit-card" aria-labelledby="traceEditDetailsTitle">'+
  '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">02</span>'+
   '<div><h3 id="traceEditDetailsTitle">Détails de l’opération</h3><p>Montant, date et catégorie</p></div></div>'+
  '<div class="trace-edit-fields">'+
   '<div class="formrow trace-edit-details-grid"><div><label class="label2" for="txAmount">Montant</label>'+
    '<div class="trace-edit-control trace-edit-money-control"><input id="txAmount" type="number" inputmode="decimal" step="0.01" min="0.01" class="input" value="'+Number(t.bankAmount??t.amountCAD??0)+'"><span class="trace-edit-currency" aria-hidden="true">'+window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId))+'</span></div></div>'+
   '<div><label class="label2" for="txDate">Date de l’opération</label>'+
    '<div class="trace-edit-control trace-edit-date-control">'+
     '<span class="trace-edit-date-display" id="txDateDisplay" aria-hidden="true">'+esc(displayEditDate(t.date||localDateISO()))+'</span>'+
     '<span class="trace-edit-date-icon" aria-hidden="true"></span>'+
     '<input id="txDate" type="date" class="input" value="'+esc(t.date||localDateISO())+'"></div></div></div>'+
   '<div class="trace-intl-transaction"><div class="formrow"><div><label class="label2">Devise d’achat</label><select id="txOriginalCurrency" class="input">'+window.TraceInternational.currencies().map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></div>'+
    '<div><label class="label2">Prix original (facultatif)</label><input id="txOriginalAmount" class="input" type="number" step=".01" min=".01" value="'+Number(t.amountOriginal||t.bankAmount||t.amountCAD||0)+'"></div></div>'+
    '<label class="label2">Taux bancaire → CAD (facultatif)</label><input id="txFxOverride" class="input" type="number" step="any" min=".000001" placeholder="Référence de la Banque du Canada">'+
    '<p class="trace-intl-help">Solde bancaire dans sa devise ; budget converti en CAD avec un taux vérifié à la date choisie.</p></div>'+
   '<label class="label2" for="txCategory">Catégorie budgétaire</label>'+
   '<div class="trace-edit-control trace-edit-select-control"><select id="txCategory" class="input"></select></div></div>'+
 '</section>'+
 '<section class="trace-edit-card" aria-labelledby="traceEditAffectationTitle">'+
  '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">03</span>'+
   '<div><h3 id="traceEditAffectationTitle">Compte et répartition</h3><p>Où et pour qui cette opération compte</p></div></div>'+
  '<div class="trace-edit-fields">'+
   '<label class="label2" for="txAccount">Compte bancaire</label>'+
    '<div class="trace-edit-control trace-edit-select-control"><select id="txAccount" class="input">'+accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select></div>'+
   '<label class="label2" for="txWho">Pour qui ?</label>'+
    '<div class="trace-edit-control trace-edit-select-control"><select id="txWho" class="input"><option value="'+esc(me)+'">Moi</option>'+
    '<option value="'+esc(partner)+'">'+esc(shortMemberName(partner))+'</option>'+
    '<option value="couple">Nous deux</option>'+
    '<option value="custom">Avec amis · personnalisé</option></select></div>'+
   '<div class="trace-edit-friends hidden" id="txCustomGroup"><strong>Répartition avec des amis</strong>'+
    '<div class="formrow trace-edit-friends-grid"><div><label class="label2" for="txFriendsAmount">Part des amis ($)</label>'+
    '<input id="txFriendsAmount" class="input" type="number" inputmode="decimal" step=".01" min="0" value="'+esc(Number(t.splitAmounts?.friends||0))+'"></div>'+
    '<div><label class="label2" for="txPartnerAmount">Part de '+esc(shortMemberName(partner))+' ($)</label>'+
    '<input id="txPartnerAmount" class="input" type="number" inputmode="decimal" step=".01" min="0" value="'+esc(Number(t.splitAmounts?.partner||0))+'"></div></div>'+
    '<label class="label2" for="txFriendDebtorName">Un seul proche (facultatif)</label><input id="txFriendDebtorName" class="input" maxlength="45" placeholder="Ex. Camille" value="'+esc(t.friendDebtorName||'')+'">'+
    '<textarea id="txFriendDebtorShares" hidden aria-hidden="true" tabindex="-1">'+
       esc((t.friendDebtorShares||[]).map(x=>x.name+' : '+Number(x.amountCAD).toFixed(2).replace('.',',')).join('\n'))+'</textarea>'+
       '<div id="txFriendDebtorRows" class="trace-friend-debtors"></div>'+
       '<small>Le reste correspond à ta part. La part des amis n’entre pas dans le budget du couple.</small></div>'+
  '</div></section>'+
 '<section class="trace-edit-impact" aria-labelledby="traceEditImpactTitle">'+
  '<div class="trace-edit-impact-head"><span class="trace-edit-impact-symbol" aria-hidden="true">↗</span>'+
   '<div><h3 id="traceEditImpactTitle">Aperçu de l’impact</h3></div></div>'+
  '<div class="trace-edit-impact-bank"><span id="txImpactBankLabel">Mouvement bancaire</span><strong id="txImpactBank">—</strong></div>'+
  '<div class="trace-edit-impact-mini-label">RÉPARTITION DANS LE BUDGET</div>'+ 
  '<div class="trace-edit-impact-mini" aria-live="polite" aria-atomic="true">'+
    '<div class="trace-edit-impact-stat"><span id="txImpactMineLabel">Moi</span><strong id="txImpactMine">—</strong></div>'+
    '<div class="trace-edit-impact-stat"><span id="txImpactPartnerLabel">'+esc(shortMemberName(partner))+'</span><strong id="txImpactPartner">—</strong></div>'+
    '<div class="trace-edit-impact-stat is-total"><span id="txImpactCoupleLabel">Couple</span><strong id="txImpactCouple">—</strong></div>'+
  '</div>'+
  '<div class="trace-edit-impact-friends hidden" id="txImpactFriendsRow"><span>Part des amis · hors budget</span><strong id="txImpactFriends">—</strong></div>'+
  '<p class="trace-edit-impact-message hidden" id="txImpactMessage" role="status"></p>'+
 '</section>'+
 '<button type="button" class="trace-edit-reclass" id="txOtherMovement">'+
  '<span class="trace-edit-reclass-icon" aria-hidden="true">⇄</span>'+
  '<span>Autre nature : paiement, virement, épargne</span><span aria-hidden="true">›</span></button>'+
 '<div class="trace-edit-actions-secondary">'+
   '<button type="button" id="txCancel">Annuler</button>'+
   '<button type="button" class="trace-edit-delete" id="txRemove">Supprimer la transaction</button>'+
 '</div>'+
 (csvReview.length?'<div class="empty-note" role="group" aria-label="Rapprochement bancaire potentiel">'+
   '<strong>Une opération bancaire semblable existe déjà.</strong><p>Compte, montant natif et sens compatibles, à deux jours près. Vérifie les lignes avant toute validation :</p>'+
   csvReview.map(x=>'<div>'+esc(x.date)+' · '+esc(x.name||'Opération')+' · '+esc(x.type)+'</div>').join('')+
   '<label class="label2"><input type="checkbox" id="txCsvDistinctVerified"> J’ai comparé ces opérations et je confirme que cette ligne bancaire est distincte.</label>'+
   '<small>Sinon, ne valide pas cette ligne comme une nouvelle transaction. Aucune fusion ou suppression automatique.</small></div>':'')+
 '<div class="trace-edit-actions">'+
  '<button class="primary full trace-edit-save" id="txSave" type="button">Enregistrer les modifications</button>'+
  (validating?'<button class="secondary full trace-edit-validate" id="txValidate" type="button">Valider cette opération</button>':'')+
 '</div>'+
  traceFeedback()+
 '</div>');
 $('#sheetBackdrop').classList.add('trace-premium-edit');
 window.TraceOperationUI.enhanceTransaction();
 window.TraceFriendDebtorUI?.mount({fieldId:'txFriendDebtorShares',
  singleId:'txFriendDebtorName',totalId:'txFriendsAmount',
  hostId:'txFriendDebtorRows',initial:t.friendDebtorShares||[]});
 $('#txAccount').value=t.accountId||'';$('#txWho').value=t.beneficiary||me;
 $('#txOriginalCurrency').value=t.currency||window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId));
 if($('#txOriginalCurrency').value===window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId))&&
    Math.abs(Number(t.amountOriginal??0)-Number(t.bankAmount??t.amountCAD??0))<.01)
  $('#txOriginalAmount').value=''; // Blank means the purchase is in the account's native currency.
 const standardKinds=new Set(['expense','friend_payment_expense','income','refund']);
 const natureChoices=(preferred='')=>{
  const account=state.accounts.find(a=>a.id===$('#txAccount').value);
  const allowed=account?U.kindsFor(accountType(account),initialDirection):[];
  const requested=preferred||$('#txType').value||initialKind;
  const picked=allowed.some(k=>k.id===requested)?requested:
   (allowed.some(k=>k.id===initialKind)?initialKind:allowed[0]?.id||'');
  $('#txType').innerHTML=U.options(allowed,picked);
  $('#txType').value=picked;
  return picked;
 };
 natureChoices(initialKind);
 const updateNatureHelp=()=>{$('#txNatureHelp').textContent=M.get($('#txType').value)?.help||'';};
 updateNatureHelp();
 const syncCustom=()=>{$('#txCustomGroup').classList.toggle('hidden',$('#txWho').value!=='custom'||M.get($('#txType').value)?.budget!=='expense');};
 $('#txWho').onchange=()=>{syncCustom();refreshEditPreview();};
 const cats=()=>{const def=M.get($('#txType').value),typ=def?.budget==='income'?'income':'expense',ls=manualCategories(typ);
  const old=state.categories.find(c=>c.id===t.categoryId);
  if(old&&old.type===typ&&!ls.some(c=>c.id===old.id))ls.push(old);
  const previously=$('#txCategory').value;
  $('#txCategory').innerHTML='<option value="">Choisir la catégorie</option>'+ls.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  $('#txCategory').value=ls.some(c=>c.id===previously)?previously:ls.some(c=>c.id===t.categoryId)?t.categoryId:'';$('#txWho').disabled=typ==='income';$('#txWho').querySelector('[value="custom"]').disabled=def?.budget!=='expense';if(def?.budget!=='expense'&&$('#txWho').value==='custom')$('#txWho').value=me;syncCustom();};
 $('#txType').onchange=()=>{
  const kind=$('#txType').value;
  if(kind&&!standardKinds.has(kind)){
   editSmartBankMovement(t,kind,{
    accountId:$('#txAccount').value,name:$('#txName').value.trim(),
    amountCAD:Number($('#txAmount').value),date:$('#txDate').value,
    categoryId:$('#txCategory').value,beneficiary:$('#txWho').value,
    friendsAmount:$('#txFriendsAmount').value,
    partnerAmount:$('#txPartnerAmount').value
   });
   return;
  }
  cats();updateNatureHelp();refreshEditPreview();
 };
 cats();
 function refreshEditPreview(){
  const I=window.TraceInternational,
   selected=$('#txType').value,def=M.get(selected),
   amount=Number($('#txAmount').value),
   who=def?.budget==='income'?me:$('#txWho').value,
   friend=Number($('#txFriendsAmount').value||0),
   partnerAmount=Number($('#txPartnerAmount').value||0),
   account=state.accounts.find(a=>a.id===$('#txAccount').value),
   currency=I.currency(account),
   sameSource=account?.id===t.accountId&&$('#txDate').value===t.date,
   historicalDate=String(t.fxRateDate||t.date||''),
   historical=sameSource&&Number(t.bankRateCad)>0&&
    /^\d{4}-\d{2}-\d{2}$/.test(historicalDate)&&historicalDate<=$('#txDate').value,
   manual=$('#txFxOverride').value.trim(),
   manualRate=Number(manual),
   quote=currency==='CAD'?null:manual!==''?
    {currency,cadPerUnit:manualRate,date:$('#txDate').value}:historical?
    {currency,cadPerUnit:Number(t.bankRateCad),date:historicalDate}:null;
  $('#txImpactBankLabel').textContent=(accountType(account)==='card'?'Sur la carte':'Sur le compte courant')+' · '+currency;
  $('#txImpactMineLabel').textContent='Moi';
  $('#txImpactPartnerLabel').textContent=shortMemberName(partner);
  $('#txImpactCoupleLabel').textContent='Couple';
  const format=n=>(n<0?'−':'')+money(Math.abs(n)),message=$('#txImpactMessage');
  try{
   if(!(amount>0)||!Number.isFinite(amount))throw Error('Saisis un montant bancaire positif.');
   if(manual!==''&&(!Number.isFinite(manualRate)||manualRate<=0))
    throw Error('Le taux de change doit être positif.');
   const cad=I.fxValue(amount,currency,quote);
   if(cad===null){
    $('#txImpactBank').textContent=I.money(amount,currency);
    ['#txImpactMine','#txImpactPartner','#txImpactCouple','#txImpactFriends'].forEach(k=>$(k).textContent='—');
    $('#txImpactFriendsRow').classList.add('hidden');
    message.textContent='Aucun taux vérifié pour cette date : la répartition CAD sera calculée avant enregistrement. Aucun montant fictif.';
    message.classList.remove('hidden');return;
   }
   const impact=movementImpact(selected,cad,who,friend,partnerAmount);
   const all=[impact.bank,impact.budget[me],impact.budget[partner],impact.budget.couple];
   if(!all.every(Number.isFinite))throw Error('Montant ou répartition invalide.');
   $('#txImpactBank').textContent=(impact.bank<0?'−':'+')+I.money(amount,currency);
   $('#txImpactMine').textContent=format(impact.budget[me]);
   $('#txImpactPartner').textContent=format(impact.budget[partner]);
   $('#txImpactCouple').textContent=format(impact.budget.couple);
   $('#txImpactFriendsRow').classList.toggle('hidden',!(impact.friends>0));
   $('#txImpactFriends').textContent=money(impact.friends);
   message.textContent=currency==='CAD'?'Montants en CAD.':
    'Répartition en CAD au '+(manual!==''?'taux manuel saisi':'taux historique du '+historicalDate)+
    ' : '+I.money(cad,'CAD')+'.';
   message.classList.toggle('hidden',currency==='CAD');
  }catch(error){
   ['#txImpactBank','#txImpactMine','#txImpactPartner','#txImpactCouple','#txImpactFriends'].forEach(key=>$(key).textContent='—');
   $('#txImpactFriendsRow').classList.add('hidden');
   message.textContent=String(error.message||'Vérifie le montant et la répartition.');
   message.classList.remove('hidden');
  }
 }
 ['#txAmount','#txFriendsAmount','#txPartnerAmount','#txFxOverride','#txOriginalCurrency','#txOriginalAmount'].forEach(selector=>$(selector).addEventListener('input',refreshEditPreview));
 $('#txAccount').addEventListener('change',()=>{natureChoices();cats();updateNatureHelp();refreshEditPreview();});
 const dateInput=$('#txDate'),dateDisplay=$('#txDateDisplay');
 const updateDateDisplay=()=>{dateDisplay.textContent=displayEditDate(dateInput.value);};
 dateInput.addEventListener('input',updateDateDisplay);
 dateInput.addEventListener('change',updateDateDisplay);
 dateInput.addEventListener('change',refreshEditPreview);
 updateDateDisplay();
 $('#txOtherMovement').onclick=()=>editSmartBankMovement(t);
 refreshEditPreview();
 $('#txCancel').onclick=closeSheet;$('#txRemove').onclick=()=>deleteTransaction(t);
 async function save(confirm){
  const amount=Number($('#txAmount').value),kind=$('#txType').value,def=M.get(kind),type=def?.type||'',
   date=$('#txDate').value,name=$('#txName').value.trim(),categoryId=$('#txCategory').value,
   accountId=$('#txAccount').value,beneficiary=def?.budget==='income'?t.payerId||me:$('#txWho').value;
  const account=state.accounts.find(a=>a.id===accountId);
  // Cross-nature CSV imports need an explicit human decision before posting.
  // Re-evaluate after edits: bank account, date or amount may have changed.
  const csvProposed={...t,accountId,date,name,bankAmount:amount,type};
  const csvConflicts=confirm&&t.source==='csv'?
   csvBankEvidenceMatches(csvProposed,state.transactions):[];
  const csvReviewUnchanged=csvReviewIdentity(csvProposed,csvConflicts)===csvInitiallyReviewed;
  if(csvConflicts.length&&(!$('#txCsvDistinctVerified')?.checked||!csvReviewUnchanged)){
   $('#traceFeedback').textContent=csvReviewUnchanged?
    'Un paiement, remboursement ou mouvement bancaire ressemble à cette ligne. Compare les opérations existantes, puis confirme qu’il s’agit d’une opération distincte.':
    'Les éléments du rapprochement bancaire ont changé. Rouvre cette fiche pour comparer les opérations actuelles avant de confirmer.';
   return;
  }
  if(accountType(account)==='card'&&window.TraceImportGuide.cardStatementSettlementLabel(name)){
   $('#traceFeedback').textContent='Ce paiement reçu sur la carte doit être rapproché de la sortie du compte courant, pas comptabilisé comme un remboursement. Écarte cette ligne et utilise l’import intelligent pour la rapprocher.';
   return;
  }
  if(!def||def.budget==='none'||!account||!U.kindsFor(accountType(account),initialDirection).some(k=>k.id===kind)){
   $('#traceFeedback').textContent='Choisis une nature compatible avec ce compte.';return;
  }
  if(!(amount>0)||!Number.isFinite(amount)||!date||!name||!categoryId||!accountId){$('#traceFeedback').textContent='Complète tous les champs obligatoires.';return;}
  let sharing,booking,friendDebtors;
  try{
   const currency=window.TraceInternational.currency(account),
    raw=$('#txFxOverride').value.trim(),fx=Number(raw);
   if(raw&&(!Number.isFinite(fx)||fx<=0))throw Error('Taux de change invalide.');
   const quote=currency==='CAD'?null:raw?
    {currency,cadPerUnit:fx,date,source:'Taux saisi manuellement'}:
    (date===t.date&&accountId===t.accountId&&t.bankRateCad>0?
     {currency,cadPerUnit:Number(t.bankRateCad),date:t.fxRateDate||date,source:t.fxRateSource||'Taux historique enregistré'}:
     await window.TraceInternational.getRate(currency,date));
   booking=window.TraceInternational.resolveBooking({account,bankAmount:amount,date,quote,
    originalCurrency:$('#txOriginalCurrency').value,originalAmount:$('#txOriginalAmount').value||null});
   sharing=beneficiary==='custom'?traceCustomShares(booking.amountCAD,$('#txFriendsAmount').value,$('#txPartnerAmount').value):
    {beneficiary,...traceSplit(beneficiary,booking.amountCAD)};
   friendDebtors=friendDebtorFields(sharing.splitAmounts?.friends,
    $('#txFriendDebtorName').value,$('#txFriendDebtorShares').value,t.id);
  }catch(e){$('#traceFeedback').textContent=e.message;return;}
  const received=window.TraceMovement.paidForExpense(state.transactions,t.id);
   if(received>0&&Math.round(Number(sharing.splitAmounts?.friends||0)*100)<received){
     $('#traceFeedback').textContent='Cette dépense possède déjà des remboursements liés. La part des amis ne peut pas devenir inférieure aux remboursements reçus.';return;
   }
   const next={...t,...booking,date,name,type,categoryId,accountId,...sharing,...friendDebtors,
    natureReviewed:t.status!=='confirmed'?true:t.natureReviewed,status:confirm?'confirmed':t.status,transferPurpose:def.purpose||null,relatedExpenseId:null,
    ...(confirm&&csvConflicts.length?{csvReviewMatchIds:csvConflicts.map(x=>x.id),csvDistinctReviewedAt:new Date().toISOString()}:{} )};
  if(next.importFingerprint&&(amount!==(t.bankAmount??t.amountCAD)||date!==t.date||name!==t.name))next.importFingerprint=null;
  // A rate lookup or delayed user action may have changed the bank history
  // after the first check. Recheck just before writing (UI-level safeguard).
  if(confirm&&t.source==='csv'){
   const freshMatches=csvBankEvidenceMatches(csvProposed,state.transactions);
   if(freshMatches.length&&(!$('#txCsvDistinctVerified')?.checked||
      csvReviewIdentity(csvProposed,freshMatches)!==csvInitiallyReviewed)){
    $('#traceFeedback').textContent='Le rapprochement bancaire a changé depuis ton ouverture. Rouvre cette fiche et vérifie les opérations actuelles.';
    return;
   }
  }
  const btn=$(confirm?'#txValidate':'#txSave');btn.disabled=true;
  try{await saveDocument('transactions',next);Object.assign(t,next);closeSheet();renderAll();navigate('activity');showTab(confirm?'transactions':validating?'review':'transactions');}
  catch(e){btn.disabled=false;traceNotice(e);}
 }
 $('#txSave').onclick=()=>save(false);
 if(validating)$('#txValidate').onclick=()=>save(true);
}
function deleteTransaction(t){
 if(requireCardEvidenceUnlink(t))return;
 if(state.transactions.some(x=>x.status==='confirmed'&&window.TraceMovement.repaymentLines(x).some(line=>line.expenseId===t.id))){
  openSheet('Remboursements encore liés','<p class="empty-note">Cette dépense est liée à un ou plusieurs remboursements confirmés. Modifie d’abord ces remboursements pour retirer leur lien avant de supprimer la dépense d’origine.</p><button class="secondary full" id="linkedExpenseBack">Retour</button>');
  $('#linkedExpenseBack').onclick=closeSheet;return;
 }
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
function txRow(t){const c=cat(t.categoryId),pos=['income','refund','external_refund'].includes(t.type),transfer=t.type==='transfer',outside=!isFinancialPeriod(t),label=t.type==='card_statement_evidence'?'Paiement de carte rapproché · sans nouveau mouvement':transfer?(t.toAccountId&&accountType(state.accounts.find(a=>a.id===t.accountId))==='checking'&&
 accountType(state.accounts.find(a=>a.id===t.toAccountId))==='card'?'Paiement de carte de crédit · hors budget':'Transfert entre comptes · hors budget'):t.type==='external_transfer'?(t.transferPurpose==='savings'?(t.investmentAccountId?'Versement vers CELI · '+esc(state.investmentAccounts.find(a=>a.id===t.investmentAccountId)?.name||'CELI')+' · compte courant':'Versement vers CELI · CELI à relier'):t.transferPurpose==='friend_payment_settlement'?'Règlement à un proche · déjà compté':'Virement hors budget'):t.type==='external_refund'?(t.transferPurpose==='friend_reimbursement'?'Remboursement d’un proche · hors budget':t.transferPurpose==='savings_withdrawal'?'Retrait de CELI · hors budget':'Entrée hors budget'):esc(c.name);return `<button type="button" class="tx trace-tx-link ${outside?'trace-outside-start':''}" data-tx-open="${esc(t.id)}"><span class="tx-icon">${esc(c.icon||'◇')}</span><span class="tx-main"><b>${esc(t.name||t.merchant||'Transaction')}</b><small>${label} · ${esc(t.date||'')}${outside?' · Hors solde de départ':''}${t.bankAmount!=null&&window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId))!=='CAD'?' · Env. '+money(t.amountCAD)+' CAD':''}</small></span><span class="tx-amt ${pos?'positive':''}">${t.type==='card_statement_evidence'?'↔ ':transfer?(t.toAccountId?'↔ ':'−'):pos?'+':'−'}${window.TraceInternational.money(t.bankAmount??t.amountCAD,window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId)),0)}</span></button>`;}

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
 let s=String(raw??'').trim().replace(/\b(?:CAD|USD|EUR|GBP|CHF)\b/gi,'').replace(/[\u00a0\u202f\s$€£]/g,'');
 if(!s||!/\d/.test(s)||(s.match(/[+-]/g)||[]).length>1||/\d[+-]\d/.test(s))return NaN;
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
function csvFingerprint(t){const norm=String(t.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();return[t.date,t.type,Number(t.bankAmount??t.amountCAD).toFixed(2),norm,t.accountId].join('|');}
function csvImportedDuplicate(t,rows){const key=csvFingerprint(t);return rows.some(x=>(x.importFingerprint||csvFingerprint(x))===key);}

// Only identical rows of the SAME statement file, account and physical row
// are idempotent. Equal prices/merchant/date can be separate real purchases.
function csvAlreadyImportedSourceRow(t,rows){
 const index=Number(t?.csvSourceRowIndex);
 if(!Number.isSafeInteger(index)||index<2||!t.importFileName)return false;
 const fingerprint=csvFingerprint(t);
 return(rows||[]).some(x=>x.source==='csv'&&x.accountId===t.accountId&&
  x.importFileName===t.importFileName&&Number(x.csvSourceRowIndex)===index&&
  (x.importFingerprint||csvFingerprint(x))===fingerprint);
}


// Read-only review of a statement row against bank movements already in TRACE.
// A match is a warning, never authority to delete, merge or book a transaction.
function csvBankEvidenceMatches(row,existing=state.transactions){
 const account=state.accounts.find(a=>a.id===row?.accountId);
 if(!account||!/^\d{4}-\d{2}-\d{2}$/.test(String(row?.date||'')))return[];
 const amount=smartExactBankAmount(row.bankAmount??row.amountCAD);
 if(amount===null)return[];
 const wanted=['income','refund','external_refund'].includes(row.type)?'in':
  ['expense','group_expense','person_payment','external_transfer'].includes(row.type)?'out':null;
 if(!wanted)return[];
 const I=window.TraceInternational;
 return(existing||[]).filter(x=>{
  if(!x||x.id===row.id||!['confirmed','pending'].includes(x.status)||
     dateGapDays(row.date,x.date)>2||x.type==='card_statement_evidence')return false;
  const source=x.accountId===row.accountId,destination=x.type==='transfer'&&x.toAccountId===row.accountId;
  const direction=destination?'in':!source?null:
   x.type==='transfer'?'out':
   ['income','refund','external_refund'].includes(x.type)?'in':
   ['expense','group_expense','person_payment','external_transfer'].includes(x.type)?'out':null;
  if(direction!==wanted)return false;
  const bank=I.amountOnAccount(x,account,destination?'destination':'source');
  return bank!==null&&smartExactBankAmount(bank)===amount;
 }).sort((a,b)=>Number(b.status==='confirmed')-Number(a.status==='confirmed')||
  dateGapDays(row.date,a.date)-dateGapDays(row.date,b.date)).slice(0,5);
}

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
     else{
      const rawDebit=col('debit')>=0?row[col('debit')]:'',
       rawCredit=col('credit')>=0?row[col('credit')]:'',
       debit=parseCsvMoney(rawDebit),credit=parseCsvMoney(rawCredit);
      // A non-empty but unreadable bank cell cannot be interpreted as zero.
      if((String(rawDebit??'').trim()&&!Number.isFinite(debit))||
         (String(rawCredit??'').trim()&&!Number.isFinite(credit))){
       invalid.push(index+2);return;
      }
      const cr=Number.isFinite(credit)?Math.abs(credit):0,
       db=Number.isFinite(debit)?Math.abs(debit):0;
      // A bank statement line may not simultaneously debit and credit money.
      // Never silently take the credit when both columns are populated.
      if((cr>0&&db>0)||(!(cr>0)&&!(db>0))){invalid.push(index+2);return;}
      n=cr>0?cr:db;type=cr>0?'income':'expense';
     }
     if(!date||!name||smartExactBankAmount(Math.abs(n))===null){invalid.push(index+2);return;}
     const amount=Math.abs(n),accountId=$('#csvAccount').value;
     const bankAccount=accts.find(a=>a.id===accountId),ccy=window.TraceInternational.currency(bankAccount);
      const t={id:txDocId(),date,name,note:'',merchant:'',type,status:'pending',currency:ccy,bankCurrency:ccy,
       bankAmount:amount,rate:ccy==='CAD'?1:null,amountCAD:ccy==='CAD'?amount:null,
       amountOriginal:amount,categoryId:'',accountId,payerId:me,beneficiary:me,
       // A foreign import has no CAD allocation until a verified dated rate.
       ...(ccy==='CAD'?traceSplit(me,amount):{}),
       recurring:false,source:'csv',importFileName:file.name,
       csvSourceRowIndex:index+2};
     t.importFingerprint=csvFingerprint(t);
     // Different accounting natures (income vs friend refund, expense vs card
     // settlement) can represent the same bank movement. Keep it pending.
     const candidates=csvBankEvidenceMatches(t,[...state.transactions,...all]);
     if(candidates.length)t.csvReviewMatchIds=candidates.map(x=>x.id);
     // Preserve even identical-looking transactions in the same statement.
     // Reimporting the very same source row is the only silent no-op.
     if(!csvAlreadyImportedSourceRow(t,state.transactions))all.push(t);
    });
    return{all,invalid,duplicates:rows.length-invalid.length-all.length};
   };
   $('#csvPreview').onclick=()=>{
    try{
     const result=build(),preview=$('#csvPreviewResult');
     const flagged=result.all.filter(t=>t.csvReviewMatchIds?.length);
     const account=accts.find(a=>a.id===$('#csvAccount').value),I=window.TraceInternational,
      ccy=I.currency(account),existing=[...state.transactions,...result.all];
     const comparison=t=>(t.csvReviewMatchIds||[]).map(id=>{
      const matched=existing.find(x=>x.id===id);if(!matched)return'';
      const destination=matched.type==='transfer'&&matched.toAccountId===t.accountId,
       bank=I.amountOnAccount(matched,account,destination?'destination':'source'),
       M=window.TraceMovement,kind=M?.fromStored?.(matched),nature=M?.get?.(kind)?.label||
        ({expense:'Dépense',income:'Revenu',transfer:'Virement interne',refund:'Retour de commerçant'})[matched.type]||'Mouvement bancaire';
      return '<article class="trace-csv-comparison" data-csv-compare-id="'+esc(id)+'"><b>'+esc(matched.name||'Opération bancaire')+'</b>'+
       '<span>'+esc(matched.date)+' · '+I.money(bank,ccy)+'</span><small>'+esc(shortAccountLabel(account))+' · '+
       esc(nature)+' · '+(matched.status==='confirmed'?'Confirmée':'À vérifier')+'</small></article>';
     }).join('');
     preview.innerHTML='<div class="empty-note" style="margin-top:14px"><b>'+result.all.length+' lignes à vérifier</b> · '+result.duplicates+' doublon(s) déjà présents non réimportés · '+result.invalid.length+' ligne(s) invalide(s) · '+flagged.length+' rapprochement(s) possible(s).</div>'+
      (flagged.length?'<div class="empty-note" role="status"><b>Vérification bancaire nécessaire</b> : certaines lignes ressemblent à des paiements de carte, remboursements ou autres mouvements déjà saisis. Rien n’est fusionné ni supprimé automatiquement.</div>'+
       '<p class="empty-note">Déplie chaque ligne signalée pour comparer les opérations. Au plus cinq ressemblances par ligne ; ce contrôle ne certifie pas l’absence de doublon.</p>':'')+
      result.all.map(t=>'<details class="trace-csv-preview-row" data-csv-preview-row="'+t.csvSourceRowIndex+'"'+(t.csvReviewMatchIds?.length?' data-has-match="true"':'')+'><summary><span>'+esc(t.date)+' · '+esc(t.name)+
       '<small>Ligne '+t.csvSourceRowIndex+' · '+(t.csvReviewMatchIds?.length?'Rapprochement à vérifier':'À vérifier')+'</small></span><b>'+I.money(t.bankAmount,ccy)+'</b></summary>'+
       '<p class="empty-note">Compte : '+esc(shortAccountLabel(account))+' · devise native '+esc(ccy)+' · '+(t.type==='income'?'Entrée':'Sortie')+'. Cette proposition n’est pas confirmée.</p>'+
       comparison(t)+'</details>').join('')+
      (result.invalid.length?'<details class="trace-csv-invalid"><summary>'+result.invalid.length+' ligne(s) non interprétée(s)</summary>'+result.invalid.map(n=>
       '<p class="empty-note">Ligne '+n+' : '+esc((rows[n-2]||[]).join(' | '))+'</p>').join('')+'</details>':'')+
      (result.all.length?'<button class="primary full" id="csvCommit" style="margin-top:14px">Importer '+result.all.length+' opération(s) à vérifier</button>':'');
     if(!result.all.length)return;
     $('#csvCommit').onclick=async()=>{
      const btn=$('#csvCommit');btn.disabled=true;let saved=0;
      try{
       const newEntries=result.all.filter(t=>!csvAlreadyImportedSourceRow(t,state.transactions));
       // Unquoted foreign rows remain pending in their real bank currency.
       // CAD is assigned only during explicit validation at a dated FX rate.
       for(const t of newEntries){
        const account=accts.find(a=>a.id===t.accountId);
        const booked=t.bankCurrency==='CAD'?
         window.TraceInternational.resolveBooking({account,bankAmount:t.bankAmount,date:t.date}):null;
        const item=booked?{...t,...booked,...traceSplit(me,booked.amountCAD)}:{...t};
        // Re-evaluate as imports can happen after the preview was opened.
        const bankMatches=csvBankEvidenceMatches(item,state.transactions);
        item.csvReviewMatchIds=bankMatches.map(x=>x.id);
        if(csvAlreadyImportedSourceRow(item,state.transactions))continue;
        await saveDocument('transactions',item);state.transactions.push(item);saved++;
       }
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
 const unresolved=uniq.map(id=>state.transactions.find(t=>t.id===id&&t.status==='pending')).filter(Boolean);
 const pending=unresolved.filter(t=>window.TraceMovement.get(window.TraceMovement.fromStored(t))?.budget!=='none');
 const specialCount=unresolved.length-pending.length;
 if(!pending.length){
  openSheet('Validation du lot','<div class="empty-note">Les mouvements hors budget du lot nécessitent une vérification de leur compte destinataire ou de leur CELI dans « À vérifier ». Aucune dépense ni revenu nouveau n’est créé avant confirmation.</div>');
  return;
 }
 const available=t=>manualCategories(t.type);
 const total=pending.reduce((sum,t)=>sum+Number(t.amountCAD||0),0);
 const suggested=pending.map(t=>suggestImportCategory(t));
 const ready=suggested.filter(x=>x.categoryId).length;
 openSheet('Valider le lot',
 '<div class="trace-batch-summary"><b>'+pending.length+' opérations · '+money(total)+'</b><small>'+ready+' catégorie(s) proposées automatiquement. Vérifie les exceptions, puis confirme le lot en une fois.</small></div>'+
 '<p class="trace-batch-intro">Chaque dépense conserve sa propre répartition ; corrige uniquement les exceptions.</p>'+(specialCount?'<p class="trace-batch-intro">'+specialCount+' virement(s) ou mouvement(s) hors budget restent dans « À vérifier » pour compléter le compte destinataire, sans seconde dépense.</p>':'')+
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
  if(selected.some(x=>!legacyImportNatureReady(x.t))){
   $('#batchFeedback').textContent='Un virement, un paiement de carte ou un autre mouvement doit d’abord être classé dans Nature du mouvement depuis À vérifier.';
   return;
  }
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

// Central gate: legacy OCR/PDF/CSV drafts cannot be batch-confirmed before their
// banking nature has been reviewed. A card payment credit must be reconciled, never
// turned into a refund or new income through the legacy review path.
function legacyImportNatureReady(t){
 const bank=state.accounts.find(a=>a.id===t.accountId);
 const nature=window.TraceMovement.get(window.TraceMovement.fromStored(t));
 if(!bank||!nature||!window.TraceImportGuide.allowed(nature.id,accountType(bank),nature.direction===1?'in':'out'))return false;
 // A selected nature is not enough: internal movements need their corresponding account.
 if(nature.id==='card_payment_received')return false;
 if(nature.id==='card_payment'||nature.id==='transfer'){
  const target=state.accounts.find(a=>a.id===t.toAccountId);
  if(!target||target.id===bank.id||accountType(bank)!=='checking'||target.owner!==bank.owner||
    (nature.id==='card_payment'&&accountType(target)!=='card')||
    (nature.id==='transfer'&&accountType(target)==='card'))return false;
 }
 if(nature.id==='savings_transfer'||nature.id==='savings_withdrawal'){
  const target=state.investmentAccounts.find(a=>a.id===t.investmentAccountId);
  if(!target||!isReadySavingsAccount(target)||target.owner!==bank.owner||accountType(bank)!=='checking'||
    String(t.date||'')<=target.openingDate)return false;
 }
 if(!['image','ocr','pdf','csv'].includes(t.source))return true;
 // A bank import in a foreign currency requires individual review, never bulk booking.
 // Individually reviewed and confirmed entries retain compatibility.
 if(window.TraceInternational.currency(bank)!=='CAD'&&t.status==='pending')return false;
 if(accountType(bank)==='card'&&window.TraceImportGuide.cardStatementSettlementLabel(t.name))return false;
 return t.natureReviewed===true||window.TraceImportGuide.safeForQuickApproval(accountType(bank),t.type,t.name);
}

async function validatePendingAll(){
 const pending=pendingReviewByAccount();
 if(activityReviewAccount==='all'&&new Set(pending.map(t=>t.accountId)).size>1){openSheet('Choisir un compte','<div class="empty-note">Choisis d’abord un compte pour valider des opérations ensemble.</div>');return;}
 const ready=pending.filter(t=>{
  const nature=window.TraceMovement.get(window.TraceMovement.fromStored(t));
  const categoryOK=nature?.budget==='none'||manualCategories(nature?.budget==='income'?'income':'expense').some(c=>c.id===t.categoryId);
  return legacyImportNatureReady(t)&&t.date&&Number(t.amountCAD)>0&&categoryOK&&
   state.accounts.some(a=>a.id===t.accountId)&&['la','partner','couple','custom'].includes(t.beneficiary);
 });
 if(!ready.length){openSheet('Vérification','<div class="empty-note">Aucune opération complète. Ouvre une transaction dans « À vérifier » pour préciser sa nature, sa catégorie, sa répartition ou le compte destinataire / CELI.</div>');return;}
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
 const matchedCard=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.accountId===accountId&&d.date===date&&d.status==='matched_card_payment').length;
 const draftCount=state.smartImports.filter(d=>d.kind==='smart_draft'&&d.accountId===accountId&&d.date===date&&d.status==='pending').length;
 return{entry:x||null,pending:tx.filter(t=>t.status!=='confirmed').length+draftCount,drafts:draftCount,confirmed:tx.filter(t=>t.status==='confirmed').length+matchedCard,matchedCard,unresolved:Math.max(0,Number(x?.unresolvedCount)||0),transactions:tx.length};
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

// An imported bank amount is evidence, never a value to silently round.
function smartExactBankAmount(value){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const n=Number(value),cents=Math.round(n*100);
 return Number.isFinite(n)&&n>0&&n<=1e7&&Number.isSafeInteger(cents)&&
  Math.abs(n*100-cents)<1e-6?cents/100:null;
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
   accountName:shortAccountLabel(state.accounts.find(a=>a.id===x.accountId)),
   categoryName:state.categories.find(c=>c.id===x.categoryId)?.name||'',
   source:'Capture bancaire en attente',
   exact:amt!==null&&Number(x.amount)>0&&Math.abs(Number(x.amount)-amt)<.009});});
 state.transactions.forEach(x=>{if(x.accountId===d.accountId&&x.date===day&&sameName(x.name)&&sameAmount(x.bankAmount??x.amountCAD,null))
  out.push({id:x.id,name:x.name,date:x.date,amount:x.bankAmount??x.amountCAD,
   status:x.status==='confirmed'?'recorded':'unconfirmed',
   accountName:shortAccountLabel(state.accounts.find(a=>a.id===x.accountId)),
   categoryName:state.categories.find(c=>c.id===x.categoryId)?.name||'Non catégorisée',
   source:x.status==='confirmed'?'Activité · opération confirmée':'Activité · à vérifier',
   exact:amt!==null&&Math.abs(Number(x.bankAmount??x.amountCAD)-amt)<.009});});
 return out.sort((a,b)=>Number(b.status==='recorded')-Number(a.status==='recorded')||
  Number(b.exact)-Number(a.exact)).slice(0,5);
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
  // OCR may return fractional cents. Keep the draft for explicit review;
  // never invent a bank debit or credit by rounding the source.
  const value=smartExactBankAmount(r.amount);
  const suggestedAmount=smartExactBankAmount(r.suggestedAmount);
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
     ...(betterName?{name}:{}),
     ...(!prior.bankDirection&&['in','out'].includes(r.bankDirection)?{bankDirection:r.bankDirection}:{})};
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
   bankDirection:['in','out'].includes(r.bankDirection)?r.bankDirection:'',
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

/* Reconcile the card's statement evidence with a transfer already recorded
   from a personal checking account. Never write a second financial transaction. */
function smartCardPaymentMatches(accountId,date,amount){
 const target=visibleBankAccounts(me).find(a=>a.id===accountId);
 if(!target||accountType(target)!=='card'||window.TraceInternational.currency(target)!=='CAD')return[];
 // Foreign-card evidence is not eligible for amount-only matching. Actual
 // destination and source bank amounts must be reconciled independently.
 const accounts=visibleBankAccounts(me).map(a=>({id:a.id,name:shortAccountLabel(a),type:accountType(a),owner:a.owner}));
 const priorMatches=state.transactions.filter(t=>t.type==='card_statement_evidence'&&t.status==='confirmed'&&t.linkedTransactionId)
  .map(t=>({kind:'smart_draft',status:'matched_card_payment',linkedTransactionId:t.linkedTransactionId}));
 return window.TraceImportGuide.eligibleCardPayments(state.transactions,[...state.smartImports,...priorMatches],accountId,date,amount,accounts);
}
async function smartMatchCardPaymentDraft(id,values,transferId){
 const d=state.smartImports.find(x=>x.id===id&&x.kind==='smart_draft'&&x.status==='pending');
 if(!d||!visibleBankAccounts(me).some(a=>a.id===d.accountId&&accountType(a)==='card'))
  throw Error('Capture de carte inaccessible.');
 if(window.TraceInternational.currency(state.accounts.find(a=>a.id===d.accountId))!=='CAD')
  throw Error('Rapprochement de carte étrangère en préparation. Ne crée pas de deuxième paiement.');
 const date=String(values?.date||''),amount=smartExactBankAmount(values?.amount),name=String(values?.name||'').trim().slice(0,85);
 if(!values?.verified||d.needsAmountReview&&!values.amountChecked)
  throw Error('Vérifie le montant et la date sur la capture.');
 if(!smartStrictDate(date)||!Number.isFinite(amount)||!(amount>0)||name.length<2)
  throw Error('Date, libellé ou montant à vérifier.');
 if(values?.type!=='card_payment_received'&&!window.TraceImportGuide.cardStatementSettlementLabel(name))
  throw Error('Sélectionne « Paiement reçu sur ma carte » ou vérifie le libellé sur le relevé.');
 if(window.TraceImportGuide.genericCardPaymentLabel(name)&&
   d.bankDirection!=='in'&&!values?.creditChecked)
  throw Error('Vérifie que le relevé indique bien un crédit (+), puis coche la confirmation.');
 if(!smartCardPaymentMatches(d.accountId,date,amount).some(x=>x.id===transferId))
  throw Error('Ce paiement de carte n’est plus disponible. Rouvre la journée.');
 const next={...d,status:'matched_card_payment',linkedTransactionId:transferId,date,name,
  amount,matchedAt:new Date().toISOString(),
  resolvedAt:new Date().toISOString()};
 await saveDocument('imports',next);Object.assign(d,next);renderAll();
 return{linked:true,additionalTransactions:0,budgetChange:0};
}

async function smartApproveDraft(id,v){
 const d=state.smartImports.find(x=>x.id===id&&x.kind==='smart_draft'&&x.status==='pending');
 if(!d||!visibleBankAccounts(me).some(a=>a.id===d.accountId))throw Error('Ligne indisponible.');
 if(!v?.verified)throw Error('Vérifie d’abord cette ligne.');
 if(d.needsAmountReview&&!v.amountChecked)throw Error('Le montant OCR est incertain : vérifie-le sur la capture.');
 const date=String(v.date||''),name=String(v.name||'').trim().slice(0,85),
  amount=smartExactBankAmount(v.amount),requestedType=String(v.type||''),movement=window.TraceMovement.get(requestedType),type=movement?.type||'',accountId=d.accountId;
 if(!smartStrictDate(date)||name.length<2||!Number.isFinite(amount)||!(amount>0)||amount>1e7)
  throw Error('Vérifie la date, le libellé et le montant.');
 if(requestedType==='card_payment_received')throw Error('Ce paiement reçu doit être rapproché du virement du compte courant : choisis le paiement correspondant.');
 if(!['expense','income','refund','transfer','external_transfer','external_refund'].includes(type))
  throw Error('Choisis la nature de ce mouvement.');
 const bankAccount=state.accounts.find(a=>a.id===accountId);
 const foreignCurrency=window.TraceInternational.currency(bankAccount),foreignCapture=foreignCurrency!=='CAD';
 // Foreign captures can book only individually reviewed, ordinary purchases.
 // All special movement types and ambiguous bank descriptions remain pending.
 if(foreignCapture&&(bankAccount.owner!==me||requestedType!=='expense'||type!=='expense'||
     // OCR evidence that identifies a bank credit must not be booked as a debit.
     // An unknown direction still requires the explicit screenshot attestation.
     d.bankDirection==='in'||v.foreignNatureConfirmed!==true||
     !window.TraceImportGuide.safeForQuickApproval(accountType(bankAccount),'expense',name)))
  throw Error('Capture en devise étrangère : seuls les achats explicitement vérifiés peuvent être confirmés. Cette ligne reste en attente.');
 const accountKind=accountType(bankAccount);
 const expectedDirection=window.TraceImportGuide.direction(requestedType,accountKind,name);
 // Source bank debit/credit is immutable evidence, never editable classification.
 if(['in','out'].includes(d.bankDirection)&&d.bankDirection!==expectedDirection)
  throw Error('Sens bancaire incohérent avec la capture : vérifie débit/crédit avant confirmation.');
 if(!window.TraceImportGuide.allowed(requestedType,accountKind,expectedDirection))
  throw Error('La nature ne correspond pas au compte bancaire. Vérifie le compte et le sens du mouvement.');
 if(accountKind==='card'&&window.TraceImportGuide.cardStatementSettlementLabel(name))
  throw Error('Ce libellé correspond à un paiement de carte. Rapproche-le du compte courant au lieu de créer une deuxième opération.');
 if(type==='external_transfer'&&accountType(state.accounts.find(a=>a.id===accountId))==='card')
  throw Error('Virement hors budget indisponible sur une carte.');
  if(['friend_reimbursement','friend_advance_return','income','external_refund','savings_withdrawal'].includes(requestedType)&&accountType(state.accounts.find(a=>a.id===accountId))!=='checking')throw Error('Cette entrée doit être créditée au compte courant.');
 const categoryId=String(v.categoryId||''),isBudget=movement?.budget!=='none';
 const beneficiary=movement?.budget==='none'||movement?.budget==='income'?me:String(v.beneficiary||'');
 if(isBudget&&!manualCategories(type).some(c=>c.id===categoryId))throw Error('Choisis une catégorie.');
 if(isBudget&&![me,partner,'couple','custom'].includes(beneficiary))throw Error('Choisis pour qui est ce mouvement.');
 const toAccountId=type==='transfer'?String(v.toAccountId||''):'';
 const investmentAccountId=['savings_transfer','savings_withdrawal'].includes(requestedType)?String(v.investmentAccountId||''):'';
 const targetSaving=state.investmentAccounts.find(a=>a.id===investmentAccountId);
 if(['savings_transfer','savings_withdrawal'].includes(requestedType)&&(!isReadySavingsAccount(targetSaving)||targetSaving.owner!==me||
   accountType(state.accounts.find(a=>a.id===accountId))!=='checking'||date<=targetSaving.openingDate))
  throw Error('Crée le CELI dans Patrimoine avec une date et un solde initial, puis sélectionne-le. Le transfert doit venir de ton compte courant.');
 if(type==='transfer'&&(!visibleBankAccounts(me).some(a=>a.id===toAccountId)||toAccountId===accountId||accountType(state.accounts.find(a=>a.id===accountId))!=='checking'||state.accounts.find(a=>a.id===accountId)?.owner!==state.accounts.find(a=>a.id===toAccountId)?.owner))
  throw Error('Choisis le compte destinataire.');
 if(requestedType==='card_payment'){
  const from=state.accounts.find(a=>a.id===accountId),to=state.accounts.find(a=>a.id===toAccountId);
  if(accountType(from)!=='checking'||accountType(to)!=='card'||from.owner!==to.owner)
   throw Error('Un paiement de carte va du compte courant vers la carte de crédit du même titulaire.');
  // A credit-card settlement must not silently use an unrelated account or
  // a guessed FX destination. For a legacy unlinked card, only a unique
  // same-currency checking account is unambiguous.
  const I=window.TraceInternational;
  const matching=state.accounts.filter(a=>a.owner===from.owner&&!a.archived&&
   accountType(a)==='checking'&&I.currency(a)===I.currency(to)&&I.country(a)===I.country(to));
  if(I.currency(from)!==I.currency(to)||I.country(from)!==I.country(to)||
     (to.settlementAccountId?to.settlementAccountId!==from.id:
      matching.length!==1||matching[0].id!==from.id))
   throw Error('Le paiement doit correspondre au compte courant lié à cette carte, dans la même devise. Vérifie les comptes avant validation.');
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
 const probe={date,name,type,bankAmount:amount,amountCAD:amount,accountId};
 const match=findSimilarTransaction(probe);
 if(match?.status==='exact')throw Error('Une opération identique existe déjà. Utilise « Écarter » pour ce doublon.');
 if(match?.status==='possible'&&!v.allowPossibleDuplicate)throw Error('Une opération ressemblante existe : coche la confirmation de doublon.');
 if(['transfer','external_transfer','external_refund'].includes(type)&&state.transactions.some(t=>t.accountId===accountId&&t.date===date&&t.type===type&&
  Math.abs(Number(t.bankAmount??t.amountCAD)-amount)<.009&&normalizedMerchant(t.name)===normalizedMerchant(name)))
  throw Error('Ce mouvement semble déjà enregistré.');
 // The historical quote can be asynchronous. Never approve against evidence
 // that changed while waiting for an FX rate.
 const foreignEvidenceSignature=()=>JSON.stringify({
  // Re-read the LIVE state rather than captured object references: a sync may
  // replace a bank or draft object during the awaited historical FX quote.
  bank:state.accounts.find(a=>a.id===accountId),
  draft:state.smartImports.find(x=>x.id===id&&x.kind==='smart_draft'),
  transactions:state.transactions.map(t=>[t.id,t.status,t.accountId,t.date,t.name,t.type,
   t.bankAmount,t.bankCurrency,t.amountCAD,t.toAccountId,t.toBankAmount]),
  drafts:state.smartImports.filter(x=>x.kind==='smart_draft')
   .map(x=>[x.id,x.status,x.accountId,x.date,x.name,x.amount])
 });
 const beforeForeignFx=foreignCapture?foreignEvidenceSignature():null;
 const currency=foreignCurrency,rateValue=String(v.manualFxRate||'').trim();
 const rate=Number(rateValue);
 if(rateValue!==''&&(!Number.isFinite(rate)||rate<=0))throw Error('Taux de change invalide.');
 const quote=currency==='CAD'?null:rateValue?
  {currency,cadPerUnit:rate,date,source:'Taux saisi manuellement'}:
  await window.TraceInternational.getRate(currency,date);
 if(foreignCapture&&foreignEvidenceSignature()!==beforeForeignFx)
  throw Error('Une opération ou un compte a changé pendant la recherche du taux. Rouvre la capture.');
 const booking=window.TraceInternational.resolveBooking({
  account:bankAccount,bankAmount:amount,quote,date,originalCurrency:v.purchaseCurrency,
  originalAmount:v.purchaseAmount||null});
 let destinationBankAmount,destinationBankCurrency;
 if(type==='transfer'){
  const toAccount=state.accounts.find(a=>a.id===toAccountId);
  destinationBankCurrency=window.TraceInternational.currency(toAccount);
  if(destinationBankCurrency!==currency){
   // The destination is a real bank amount, not the source FX budget valuation.
   // Sub-cent amounts must not create a confirmed transaction with an unreadable bank leg.
   destinationBankAmount=window.TraceInternational.exactMoney(v.destinationBankAmount);
   if(destinationBankAmount===null||!(destinationBankAmount>0))
    throw Error('Saisis le montant exact crédité sur le compte destinataire en '+destinationBankCurrency+' (centimes requis).');
  }else destinationBankAmount=amount;
 }
 const share=movement.budget==='none'||movement.budget==='income'?
  {beneficiary:me,...traceSplit(me,booking.amountCAD)}:
  traceImportSplit({beneficiary,friendsAmount:Number(v.friendsAmount||0),partnerAmount:Number(v.partnerAmount||0)},
   {amountCAD:booking.amountCAD});
 const related=validateFriendLink(requestedType,String(v.relatedExpenseId||''),date,booking.amountCAD);
 const tx={id:transactionId,date,name,type,...booking,
  ...(type==='transfer'?{toBankAmount:destinationBankAmount,toBankCurrency:destinationBankCurrency}:{}),
  status:'confirmed',categoryId:isBudget?categoryId:'',accountId,payerId:me,
  ...(toAccountId?{toAccountId}:{}),...(movement.purpose?{transferPurpose:movement.purpose}:{}),...(investmentAccountId?{investmentAccountId}:{}),...(related?{relatedExpenseId:related}:{}),...share,source:'image',importFileName:d.sourceFileName,
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
/* TRACE 5.37 — filter and journal display are read-only views, not financial bookings. */
function traceActivityNatureLabel(kind){
 return ({expense:'Dépense',group_expense:'Dépense partagée',person_payment:'Avance',
  income:'Revenu',refund:'Remboursement commerçant',transfer:'Virement interne',
  external_transfer:'Virement sortant',external_refund:'Virement entrant',
  card_statement_evidence:'Justificatif de carte'})[kind]||String(kind||'Autre');
}
function traceActivityRows(){
 return state.transactions.filter(t=>{
  if(!String(t.date||'').startsWith(activityMonth))return false;
  if(activityAccountFilter!=='all'&&t.accountId!==activityAccountFilter&&
     t.toAccountId!==activityAccountFilter)return false;
  if(activityFilters.category!=='all'&&t.categoryId!==activityFilters.category)return false;
  if(activityFilters.nature!=='all'&&t.type!==activityFilters.nature)return false;
  if(activityFilters.status==='confirmed'&&t.status!=='confirmed')return false;
  if(activityFilters.status==='pending'&&t.status==='confirmed')return false;
  if(activityFilters.currency!=='all'){
   const account=state.accounts.find(a=>a.id===t.accountId);
   if(!account||window.TraceInternational.currency(account)!==activityFilters.currency)return false;
  }
  return true;
 }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||
  String(b.id||'').localeCompare(String(a.id||'')));
}
function traceActivityPendingRow(t){
 const a=state.accounts.find(x=>x.id===t.accountId),
  cur=a?window.TraceInternational.currency(a):null;
 const amount=a?window.TraceInternational.amountOnAccount(t,a,'source'):null;
 const amountLabel=amount===null||!Number.isFinite(Number(amount))?
  'Montant bancaire à vérifier':window.TraceInternational.money(Math.abs(Number(amount)),cur);
 return '<button type="button" class="tx trace-tx-link trace-activity-pending" data-tx-open="'+esc(t.id)+'">'+
 '<span class="tx-icon">!</span><span class="tx-main"><b>'+esc(t.name||'Opération à vérifier')+
 '</b><small>'+esc(traceActivityNatureLabel(t.type))+' · '+esc(t.date||'Date à vérifier')+
 ' · À valider</small></span><span class="tx-amt">'+esc(amountLabel)+'</span></button>';
}
function traceActivityDayLabel(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return'Date à vérifier';
 const value=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==date)
  return'Date à vérifier';
 return new Intl.DateTimeFormat('fr-CA',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(value);
}
function traceActivityGroupHTML(rows){
 if(!rows.length)return '<div class="empty-note">Aucune opération pour ces filtres. Modifie la sélection ou réinitialise les filtres.</div>';
 const days=new Map();
 rows.forEach(t=>{const key=String(t.date||'');if(!days.has(key))days.set(key,[]);days.get(key).push(t);});
 return [...days].map(([date,list])=>
  '<section class="trace-activity-day" aria-label="'+esc(traceActivityDayLabel(date))+'">'+
  '<div class="trace-activity-day-heading"><h3>'+esc(traceActivityDayLabel(date))+
  '</h3><small>'+list.length+' opération'+(list.length>1?'s':'')+'</small></div>'+
  list.map(t=>t.status==='confirmed'?txRow(t):traceActivityPendingRow(t)).join('')+
  '</section>').join('');
}
function traceActivitySelect(id,items,value,onChange){
 const node=$('#'+id);if(!node)return;
 node.innerHTML=items.map(([v,label])=>'<option value="'+esc(v)+'">'+esc(label)+'</option>').join('');
 node.value=value;
 node.onchange=()=>{onChange(node.value);renderActivity();};
}
function traceActivityControls(){
 const accounts=state.accounts.filter(a=>['la','partner'].includes(a.owner)&&
  ['checking','card'].includes(accountType(a)));
 if(activityAccountFilter!=='all'&&!accounts.some(a=>a.id===activityAccountFilter))
  activityAccountFilter='all';
 traceActivitySelect('activityAccountFilter',[['all','Tous les comptes'],
  ...accounts.map(a=>[a.id,shortAccountLabel(a)+' · '+window.TraceInternational.currency(a)+(a.archived?' · Archivé':'')])],
  activityAccountFilter,v=>{activityAccountFilter=v;});
 const categories=state.categories.filter(c=>!c.archived||
  state.transactions.some(t=>t.categoryId===c.id)).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 traceActivitySelect('activityCategoryFilter',[['all','Toutes les catégories'],
  ...categories.map(c=>[c.id,c.name])],
  activityFilters.category,v=>{activityFilters.category=v;});
 const natures=[...new Set(state.transactions.map(t=>t.type).filter(Boolean))].sort((a,b)=>
  traceActivityNatureLabel(a).localeCompare(traceActivityNatureLabel(b),'fr'));
 traceActivitySelect('activityNatureFilter',[['all','Toutes les natures'],
  ...natures.map(k=>[k,traceActivityNatureLabel(k)])],
  activityFilters.nature,v=>{activityFilters.nature=v;});
 const currencies=[...new Set(accounts.map(a=>window.TraceInternational.currency(a)))].sort();
 traceActivitySelect('activityCurrencyFilter',[['all','Toutes les devises'],
  ...currencies.map(c=>[c,c])],
  activityFilters.currency,v=>{activityFilters.currency=v;});
 traceActivitySelect('activityStatusFilter',[['confirmed','Confirmées'],
  ['pending','À valider'],['all','Tous les statuts']],
  activityFilters.status,v=>{activityFilters.status=v;});
 const reset=$('#activityResetFilters');
 if(reset)reset.onclick=()=>{
  activityAccountFilter='all';activityFilters={category:'all',nature:'all',currency:'all',status:'confirmed'};
  renderActivity();
 };
 const pendingBtn=$('#activityShowPending');
 if(pendingBtn){
  const total=state.transactions.filter(t=>t.status!=='confirmed'&&
   String(t.date||'').startsWith(activityMonth)).length;
  pendingBtn.textContent='À valider · '+total;
  pendingBtn.onclick=()=>{activityFilters.status='pending';renderActivity();};
 }
}
function openActivityCategory(month,categoryId){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||'')))return;
 if(categoryId&&!state.categories.some(c=>c.id===categoryId))return;
 activityMonth=month;activityAccountFilter='all';
 activityFilters={category:categoryId||'all',nature:'all',currency:'all',status:'confirmed'};
 closeSheet();navigate('activity');renderActivity();showTab('transactions');
}

function renderActivity(){
 traceActivityControls();
 const ts=traceActivityRows();
 const confirmed=ts.filter(t=>t.status==='confirmed');
 const counted=confirmed.filter(isFinancialPeriod);
 const expenses=counted.filter(t=>['expense','group_expense','person_payment'].includes(t.type)).reduce((v,t)=>v+Number(t.amountCAD||0),0),refunds=counted.filter(t=>t.type==='refund').reduce((v,t)=>v+Number(t.amountCAD||0),0),inc=counted.filter(t=>t.type==='income').reduce((v,t)=>v+Number(t.amountCAD||0),0),exp=Math.max(0,expenses-refunds);
 $('#activityMonthLabel').textContent=monthLabel(activityMonth);$('#activityExpenses').textContent=money(exp);$('#activityIncome').textContent=money(inc);$('#activityNet').textContent=money(inc-exp);
 $('#transactionList').innerHTML=traceActivityGroupHTML(ts);
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
      ' · '+esc(t.date||'Date à préciser')+'</small></span><b>'+
       (t.amountCAD===null||t.amountCAD===undefined?
         window.TraceInternational.money(t.bankAmount,window.TraceInternational.currency(state.accounts.find(a=>a.id===t.accountId)))+' · CAD à valider':
         money(t.amountCAD))+'</b></button>').join('')+'</div>':'';
  legacy.querySelectorAll('[data-import-pending]').forEach(button=>button.onclick=()=>editTransaction(button.dataset.importPending,true));
 }
 const picker=$('#activityMonthPicker');if(picker)picker.value=activityMonth;
 const label=$('#activityMonthDisplay');if(label)label.textContent=monthLabel(activityMonth);
 const current=$('#activityCurrentMonth');if(current)current.classList.toggle('hidden',activityMonth===CM);
 window.TraceImportCalendar?.render?.();
 showTab(tab);
}

/* TRACE 5.37 — native Activity/Partage. All balances come from the existing
   immutable household/friend ledger: no additional financial movement. */
function openActivitySharing(){
 if((state.household.workspaceMembers||[]).length<2){openCoupleSettings();return;}
 navigate('activity');showTab('sharing');
}
function renderActivitySharing(){
 const root=$('#activitySharing');if(!root)return;
 const ready=(state.household.workspaceMembers||[]).length>=2,
  balance=ready?coupleBalance():0,
  partnerName=shortMemberName('partner'),
  myName=shortMemberName('la'),
  history=ready?sharingHistory():[],
  friends=['la','partner'].flatMap(owner=>
   window.TraceMovement?.friendReceivables?.(state.transactions,owner)||[]),
  due=friends.reduce((sum,entry)=>sum+Number(entry.outstandingCAD||0),0),
  fmt=value=>Number.isFinite(Number(value))?
   window.TraceInternational.money(Number(value),'CAD'):'Montant à vérifier',
  party=ready?(Math.abs(balance)<.005?'Vous êtes à l’équilibre':
   (balance>0?partnerName+' doit '+fmt(Math.abs(balance))+' à '+myName:
    myName+' doit '+fmt(Math.abs(balance))+' à '+partnerName)):'Inviter votre partenaire',
  opening=Number(state.household.sharingOpeningBalance||0);
 root.innerHTML=
 '<section class="trace-share-group" aria-label="Partage du couple">'+
 '<div class="section-head"><h2>Couple</h2><small>Votre équilibre commun</small></div>'+
 '<article class="card trace-share-hero"><div class="eyebrow">Solde entre vous deux</div>'+
 '<strong id="traceShareBalance">'+esc(party)+'</strong>'+
 '<p>Depuis '+esc(state.household.referenceDate||'le début du suivi')+
 ' · répartition et règlements confirmés uniquement</p>'+
 (ready?
  '<div class="trace-share-actions"><button type="button" class="primary" id="traceShareSettle">Enregistrer un règlement</button>'+
  '<button type="button" class="secondary" id="traceShareOpening">Solde initial Tricount</button></div>'+
  '<div class="trace-share-opening">Solde repris : '+(opening<0?'−':'+')+
   fmt(Math.abs(opening))+' · hors nouvelles dépenses</div>':
  '<button type="button" class="primary" id="traceShareInvite">Configurer le partage</button>')+
 '</article>'+
 '<div class="section-head"><h3>Historique du couple</h3><small>'+
 history.length+' mouvement'+(history.length>1?'s':'')+'</small></div>'+
 (history.length?history.map(({t,delta})=>
  '<div class="trace-share-history-row"><span><b>'+esc(t.name||'Mouvement partagé')+
  '</b><small>'+esc(t.date||'Date à vérifier')+' · '+
  (t.type==='transfer'?'Règlement hors budget':'Partage de dépense ou de remboursement')+
  '</small></span><strong>'+ (delta>0?'+':'−')+
  fmt(Math.abs(delta))+'</strong></div>').join(''):
  '<div class="trace-share-empty">Aucun mouvement partagé confirmé pour le moment.</div>')+
 '</section>'+
 '<section class="trace-share-group" aria-label="Avances aux proches">'+
 '<div class="section-head"><h2>Proches</h2><small>Avances et remboursements</small></div>'+
 '<article class="card trace-share-hero trace-share-friends-hero"><div class="eyebrow">Encore à recevoir</div>'+
 '<strong id="traceShareFriendDue">'+fmt(due)+'</strong>'+
 '<p>Suivi distinct du solde du couple. Un remboursement ne crée ni nouveau revenu ni nouvelle dépense.</p>'+
 '<div class="trace-share-actions">'+
 '<button type="button" class="primary" id="traceShareFriendRepay">Enregistrer un remboursement</button>'+
 '<button type="button" class="secondary" id="traceShareFriendAdvance">Ajouter une avance</button></div></article>'+
 (friends.length?friends.map(friend=>
  '<details class="trace-share-friend" '+(friend.unassigned?'data-unassigned="true"':'')+'><summary>'+
  '<span><b>'+esc(friend.name)+'</b><small>Avancé par '+esc(shortMemberName(friend.owner))+
  ' · '+friend.advances.length+' avance'+(friend.advances.length>1?'s':'')+
  '</small></span><strong>'+fmt(friend.outstandingCAD)+' restant</strong></summary>'+
  '<div class="trace-share-friend-detail">'+
  '<p>Avancé : '+fmt(friend.advancedCAD)+' · Reçu : '+fmt(friend.receivedCAD)+
  (friend.unattributedCAD>0?' · Remboursement à attribuer : '+fmt(friend.unattributedCAD):'')+'</p>'+
  friend.advances.map(advance=>
   '<div class="trace-share-advance-row"><span><b>'+esc(advance.label)+'</b><small>'+
   esc(advance.date||'Date à vérifier')+
   (advance.reviewRequired||advance.overpaid?' · À vérifier':'')+'</small></span>'+
   '<small>Avancé '+fmt(advance.advancedCAD)+' · Remboursé '+
   fmt(advance.receivedCAD)+' · Reste '+fmt(advance.outstandingCAD)+'</small></div>'
  ).join('')+'</div></details>').join(''):
  '<div class="trace-share-empty">Aucune avance à un proche confirmée pour le moment.</div>')+
 '<p class="trace-share-disclaimer">Les anciennes avances « Amis » sans prénom restent à attribuer. Les remboursements partiels et multiples sont gérés par l’éditeur d’opérations existant, avec association aux avances.</p>'+
 '</section>';
 const settle=$('#traceShareSettle'),openingBtn=$('#traceShareOpening'),
  invite=$('#traceShareInvite'),repay=$('#traceShareFriendRepay'),advance=$('#traceShareFriendAdvance');
 if(settle)settle.onclick=()=>openSettlement(null);
 if(openingBtn)openingBtn.onclick=editTricountOpening;
 if(invite)invite.onclick=openCoupleSettings;
 if(repay)repay.onclick=()=>openManualTransaction('friend_reimbursement');
 if(advance)advance.onclick=()=>openManualTransaction('expense');
}

function showTab(t){
 if(t==='review')t='import'; // Old deep links now point to the unified import flow.
 tab=['transactions','import','sharing'].includes(t)?t:'import';
 $$('#activityTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#activityTransactions').classList.toggle('hidden',tab!=='transactions');
 $('#activityImport').classList.toggle('hidden',tab!=='import');
 const sharing=$('#activitySharing');if(sharing)sharing.classList.toggle('hidden',tab!=='sharing');
 const period=$('#activityPeriodControl');if(period)period.classList.toggle('hidden',tab==='sharing');
 const label=$('#activityMonthLabel');if(label&&tab==='sharing')label.textContent='Partage · depuis le début';
 if(tab==='sharing')renderActivitySharing();
}

/* Portfolio ledger: contributions vs investment performance, native currency first */
function trackedSavingsAccounts(owner=me){
 return state.investmentAccounts.filter(a=>a.owner===owner&&a.savingsTracking==='linked'&&
   !a.archived&&window.TraceInternational.valid(a.currency||'CAD')&&['CELI','Épargne','Livret','Savings'].includes(a.type));
}
function isReadySavingsAccount(a){
 return Boolean(a&&['la','partner'].includes(a.owner)&&a.savingsTracking==='linked'&&
   window.TraceInternational.valid(a.currency||'CAD')&&
   smartStrictDate(String(a.openingDate||''))&&
   window.TraceInternational.exactMoney(a.openingBalance)!==null&&Number(a.openingBalance)>=0);
}
function linkedSavingsMovements(account){
 if(!isReadySavingsAccount(account))return[];
 return state.transactions.filter(t=>t.status==='confirmed'&&
  t.investmentAccountId===account.id&&t.date>account.openingDate&&
  ((t.type==='external_transfer'&&t.transferPurpose==='savings')||
   (t.type==='external_refund'&&t.transferPurpose==='savings_withdrawal')));
}
function savingsLedger(account){
 const I=window.TraceInternational,code=I.currency(account),configured=isReadySavingsAccount(account);
 const base=configured?I.exactMoney(account.openingBalance):null;
 const movements=linkedSavingsMovements(account);
 const native=movements.map(t=>I.amountOnInvestment(t,account,state.accounts.find(a=>a.id===t.accountId)));
 const complete=configured&&native.every(n=>n!==null),
  net=complete?movements.reduce((n,t,i)=>n+(t.type==='external_transfer'?1:-1)*Math.round(native[i]*100),0)/100:null,
  value=complete?(Math.round(base*100)+Math.round(net*100))/100:null,
  quote=I.valuationQuote(account,typeof internationalQuotes==='undefined'?{}:internationalQuotes),
  cad=value===null?null:I.fxValue(value,code,quote);
 return {configured,base,movements,net,value,hasFx:cad!==null,fx:code==='CAD'?1:quote?.cadPerUnit??null,cad,
  fxDate:quote?.date||null,fxSource:quote?.source||null,reviewRequired:configured&&!complete,
  contributions:net,
  cash:value,securities:0,positions:[],dividends:0,fees:0,realized:0,
  performance:0,estimated:true};
}
function portfolioLedger(account,override=null,removeId=null,cutoff=null){
 if(account.savingsTracking==='linked')return savingsLedger(account);
 const ops=state.investmentOperations.filter(o=>o.accountId===account.id&&
  (!o.status||o.status==='confirmed')&&o.id!==removeId&&(!override||o.id!==override.id));
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
 const I=window.TraceInternational,code=I.currency(account),
  quote=I.valuationQuote(account,typeof internationalQuotes==='undefined'?{}:internationalQuotes),
  cad=I.fxValue(value,code,quote),fx=code==='CAD'?1:quote?.cadPerUnit??null;
 return{cash,contributions,dividends,fees,realized,positions,securities,value,performance:value-contributions,fx,hasFx:cad!==null,cad,
  fxDate:quote?.date||null,fxSource:quote?.source||null};
}
const nativeMoney=(v,currency)=>window.TraceInternational.money(v,currency);
function openSavingsAccount(account){
 const ledger=savingsLedger(account),ready=ledger.configured,currency=window.TraceInternational.currency(account),
  editable=account.owner===me,opList=ledger.movements.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 openSheet(esc(account.name),
  '<div class="settings-hero"><span class="pico large">'+uiIcon('chart')+'</span><div><b>'+
   (ledger.reviewRequired?'Mouvement à vérifier':ready?nativeMoney(ledger.value,currency):'Solde à configurer')+'</b>'+
   '<small>'+esc(account.type)+' · '+(ready?'Estimation depuis '+esc(account.openingDate):'Date et solde de référence nécessaires')+'</small></div></div>'+
  '<div class="empty-note">Le solde estimé évolue uniquement avec les virements confirmés depuis ton compte courant. Les rendements, intérêts et frais éventuels ne sont pas connus automatiquement.</div>'+
  (ready?'<div class="trace-stat-grid"><div><small>Solde initial</small><b>'+nativeMoney(ledger.base,currency)+'</b></div>'+
   '<div><small>Virements nets</small><b>'+nativeMoney(ledger.net,currency)+'</b></div></div>':'')+
  (currency!=='CAD'?'<p class="trace-intl-help">'+(ledger.hasFx?
   'Équivalent indicatif '+nativeMoney(ledger.cad,'CAD')+' · taux du '+esc(ledger.fxDate||''):
   'Conversion CAD indisponible : aucun taux daté et sourcé utilisable.')+'</p>':'')+
  (editable?'<button class="primary full" id="savingsReferenceEdit">'+(ready?'Modifier le solde de référence':'Configurer le solde initial')+'</button>':
   '<p class="trace-intl-help">Compte du partenaire · consultation seule</p>')+
  (editable&&currency!=='CAD'?'<button class="secondary full" id="savingsExchangeRate" style="margin-top:8px">Taux indicatif · '+currency+' / CAD</button>':'')+
  '<div class="section-head"><h2>Virements liés</h2></div>'+
  (opList.length?opList.map(t=>'<button type="button" class="trace-list-btn" '+(!editable?'disabled ':'')+'data-savings-link="'+esc(t.id)+'"><span><b>'+
   esc(t.name)+'</b><small>'+esc(t.date)+' · '+esc(shortAccountLabel(state.accounts.find(a=>a.id===t.accountId)))+
   ' · Voir l’opération</small></span><b>'+esc(t.type==='external_transfer'?'+':'−')+
   nativeMoney(window.TraceInternational.amountOnInvestment(t,account,state.accounts.find(a=>a.id===t.accountId)),currency)+'</b></button>').join(''):
   '<div class="empty-note">Aucun virement lié après le solde de référence. Pour un virement déjà enregistré, ouvre-le dans Activité et sélectionne ce compte d’épargne.</div>')+
  '<button class="secondary full" id="savingsReturn">Fermer</button>'+traceFeedback());
 if(editable)$('#savingsReferenceEdit').onclick=()=>editSavingsReference(account);
 if(editable&&currency!=='CAD')$('#savingsExchangeRate').onclick=()=>editInvestmentRate(account);
 $('#savingsReturn').onclick=closeSheet;
 if(editable)$$('[data-savings-link]').forEach(x=>x.onclick=()=>editTransaction(x.dataset.savingsLink));
}
function editSavingsReference(account){
 if(account.owner!==me)return;
 const ready=isReadySavingsAccount(account);
 openSheet('Solde de référence · '+esc(account.name),
  '<div class="empty-note">Indique le solde réel à la fin d’une date choisie. Les virements des jours suivants viendront s’ajouter ou se soustraire automatiquement.</div>'+
  '<label class="label2">Date du solde</label><input class="input" type="date" id="savingsOpeningDate" value="'+esc(account.openingDate||localDateISO())+'">'+
  '<label class="label2">Solde à cette date ('+window.TraceInternational.currency(account)+')</label><input class="input" inputmode="decimal" type="number" step=".01" min="0" id="savingsOpeningAmount" value="'+(ready?Number(account.openingBalance).toFixed(2):'')+'" placeholder="0,00">'+
  '<button class="primary full" id="savingsOpeningSave">Enregistrer la référence</button>'+
  '<button class="secondary full" id="savingsOpeningCancel">Annuler</button>'+traceFeedback());
 $('#savingsOpeningCancel').onclick=()=>openSavingsAccount(account);
 $('#savingsOpeningSave').onclick=async()=>{
  const date=$('#savingsOpeningDate').value,raw=$('#savingsOpeningAmount').value,amount=window.TraceInternational.exactMoney(raw);
  if(!smartStrictDate(date)||amount===null||amount<0||amount>1e10){
   $('#traceFeedback').textContent='Vérifie le solde et la date.';return;
  }
  const next={...account,openingDate:date,openingBalance:amount};
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
async function fetchPublicCadRate(currency){
 const q=await window.TraceInternational.getRate(String(currency||'').toUpperCase(),localDateISO());
 return{rate:q.cadPerUnit,date:q.date,source:q.source};
}
let fxSyncPromise=null;
async function refreshPublicPortfolioRates(force=false){
 if(fxSyncPromise&&!force)return fxSyncPromise;
 const task=async()=>{
  const eligible=state.investmentAccounts.filter(a=>a.owner===me&&!a.archived&&window.TraceInternational.valid(a.currency)&&a.currency!=='CAD'&&a.fxAutoUpdate!==false);
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
 '<div class="empty-note" style="margin-top:10px">Référence publique : Banque du Canada · Valet. En cas de panne, seul un taux enregistré avec sa date et sa source reste utilisable.</div>'+
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
 const typ=original?.type||'deposit',currency=account.currency||'CAD',
  I=window.TraceInternational,previousBank=state.accounts.find(b=>b.id===original?.bankAccountId),
  previousCurrency=previousBank?I.currency(previousBank):null,
  previousNative=original?.bankAmount??(previousCurrency==='CAD'?original?.bankAmountCAD:null);
 openSheet(original?'Modifier le mouvement':'Ajouter au patrimoine',
  '<div class="empty-note">'+esc(account.name)+' · '+esc(currency)+'. Les versements ne sont jamais comptés comme une performance.</div>'+
  '<label class="label2">Type</label><select class="input" id="invType"><option value="deposit">Versement</option><option value="withdrawal">Retrait</option><option value="buy">Achat</option><option value="sell">Vente</option><option value="dividend">Dividende</option><option value="fee">Frais</option><option value="quote">Mise à jour d’un cours</option></select>'+
  '<label class="label2">Date</label><input id="invDate" class="input" type="date" value="'+esc(original?.date||localDateISO())+'">'+
  '<div class="trace-op-symbol"><label class="label2">Titre / symbole</label><input class="input" id="invSymbol" maxlength="16" value="'+esc(original?.symbol||'')+'" placeholder="Ex. DSY, ETF500"></div>'+
  '<div class="formrow trace-op-trade"><div><label class="label2">Quantité</label><input class="input" id="invQty" type="number" inputmode="decimal" min="0.000001" step="any" value="'+Number(original?.quantity||0)+'"></div><div><label class="label2">Prix unitaire ('+esc(currency)+')</label><input class="input" id="invPrice" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.unitPrice||0)+'"></div></div>'+
  '<div class="trace-op-quote"><label class="label2">Dernier cours ('+esc(currency)+')</label><input class="input" id="invQuote" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.unitPrice||0)+'"></div>'+
  '<div class="trace-op-money"><label class="label2">Montant ('+esc(currency)+')</label><input class="input" id="invAmount" type="number" inputmode="decimal" min="0.01" step="any" value="'+Number(original?.amount||0)+'"></div>'+
  '<div class="trace-op-fee"><label class="label2">Frais inclus ('+esc(currency)+')</label><input class="input" id="invFee" type="number" inputmode="decimal" min="0" step="any" value="'+Number(original?.fee||0)+'"></div>'+'<div class="trace-op-bank"><label class="label2">Compte bancaire lié (facultatif)</label><select class="input" id="invBank"><option value="">Aucun mouvement bancaire associé</option>'+visibleBankAccounts(account.owner).filter(a=>accountType(a)!=='card').map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('')+'</select><div class="empty-note">Si tu lies un compte, le versement ou retrait y sera calculé automatiquement. Ne l’enregistre pas une seconde fois.</div></div>'+'<div class="trace-op-bank-cad"><label class="label2" id="invBankNativeLabel">Montant bancaire réel</label><input id="invBankCad" class="input" type="number" min=".01" step="any" inputmode="decimal" placeholder="Montant exact du relevé" value="'+esc(previousNative??'')+'"><div class="empty-note">Saisis le montant réellement débité ou crédité en devise du compte bancaire. Ne pas inventer de taux.</div><div class="trace-intl-help" id="invNativeImpact" aria-live="polite"></div></div>'+
   '<button class="primary full" id="saveInvOp" style="margin-top:16px">Enregistrer le mouvement</button>'+
  (original?'<button class="secondary full trace-danger" id="deleteInvOp" style="margin-top:8px">Supprimer ce mouvement</button>':'')+
  '<button class="secondary full" id="cancelInvOp" style="margin-top:8px">Annuler</button>'+traceFeedback());
 $('#invType').value=typ;if(original?.bankAccountId)$('#invBank').value=original.bankAccountId;
 let lastBankId=original?.bankAccountId||'';
 const refresh=()=>{
  const t=$('#invType').value,trade=['buy','sell'].includes(t),
    bankId=$('#invBank').value,
    selectedBank=visibleBankAccounts(account.owner).find(b=>b.id===bankId),
    nativeCode=selectedBank?I.currency(selectedBank):'';
  if(bankId!==lastBankId){
   const historical=bankId&&bankId===original?.bankAccountId?previousNative:null;
   $('#invBankCad').value=historical??(selectedBank&&nativeCode===currency?$('#invAmount').value:'');
   lastBankId=bankId;
  }
  $('#invBankNativeLabel').textContent='Montant réellement débité / crédité ('+(nativeCode||'devise du compte')+')';
  $('#invBankCad').placeholder=nativeCode?'Montant exact en '+nativeCode:'Choisir un compte bancaire';
  const entered=$('#invBankCad').value.trim(),validAmount=entered!==''&&Number(entered)>0&&Number.isFinite(Number(entered));
  $('#invNativeImpact').textContent=selectedBank&&validAmount?
   'Compte bancaire : '+(t==='withdrawal'?'+':'−')+I.money(Number(entered),nativeCode)+' · Aucun revenu ni dépense budgétaire':
   'Vérifie le montant natif sur le relevé bancaire.';
  $$('.trace-op-trade').forEach(x=>x.classList.toggle('hidden',!trade));
  $$('.trace-op-symbol').forEach(x=>x.classList.toggle('hidden',!['buy','sell','quote'].includes(t)));
  $$('.trace-op-quote').forEach(x=>x.classList.toggle('hidden',t!=='quote'));
  $$('.trace-op-money').forEach(x=>x.classList.toggle('hidden',!['deposit','withdrawal','dividend','fee'].includes(t)));
  $$('.trace-op-fee').forEach(x=>x.classList.toggle('hidden',!trade));
  $$('.trace-op-bank').forEach(x=>x.classList.toggle('hidden',!['deposit','withdrawal'].includes(t)));
  $$('.trace-op-bank-cad').forEach(x=>x.classList.toggle('hidden',!['deposit','withdrawal'].includes(t)||!selectedBank));
 };
 $('#invType').onchange=refresh;$('#invBank').onchange=refresh;$('#invBankCad').oninput=refresh;refresh();
 $('#cancelInvOp').onclick=()=>openInvestmentAccount(account);
 $('#saveInvOp').onclick=async()=>{
  const type=$('#invType').value,date=$('#invDate').value,amount=Number($('#invAmount').value),fee=Number($('#invFee').value),quantity=Number($('#invQty').value),
  unitPrice=Number(type==='quote'?$('#invQuote').value:$('#invPrice').value),symbol=$('#invSymbol').value.trim().toUpperCase();
  if(!date||(['deposit','withdrawal','dividend','fee'].includes(type)&&!(amount>0))||(['buy','sell'].includes(type)&&!(quantity>0&&unitPrice>0))||(type==='quote'&&!(unitPrice>=0))||(['buy','sell','quote'].includes(type)&&!/^[A-Z0-9._-]{1,16}$/.test(symbol))||!(fee>=0)){
   $('#traceFeedback').textContent='Vérifie la date, le montant, les titres et les frais.';return;
  }
  const bankAccountId=['deposit','withdrawal'].includes(type)?$('#invBank').value||null:null,
    bankAccount=bankAccountId?visibleBankAccounts(account.owner).find(b=>b.id===bankAccountId):null,
    bankCurrency=bankAccount?I.currency(bankAccount):null,
    bankRaw=$('#invBankCad').value.trim(),bankAmount=bankAccountId&&bankRaw!==''?Number(bankRaw):null;
  if(bankAccountId&&(!bankAccount||!(bankAmount>0)||!Number.isFinite(bankAmount))){
   $('#traceFeedback').textContent='Saisis le montant bancaire natif réellement débité ou crédité.';return;
  }
  const bankAmountCAD=bankCurrency==='CAD'?Math.round(bankAmount*100)/100:null;
  const booked=original?.linkedTransactionId?
   state.transactions.find(t=>t.id===original.linkedTransactionId&&t.status==='confirmed'):null;
  if(booked&&(original.bankAccountId!==bankAccountId||original.type!==type)){
   $('#traceFeedback').textContent='Ce versement est lié à une opération confirmée. Vérifie son compte et sa nature dans Activité avant de le déplacer.';return;
  }
  const linked=original?.linkedTransactionId&&original.bankAccountId===bankAccountId&&original.type===type?
   state.transactions.find(t=>t.id===original.linkedTransactionId&&t.status==='confirmed'):null;
  if(linked){
   const recorded=I.amountOnAccount(linked,bankAccount,linked.toAccountId===bankAccountId?'destination':'source');
   if(recorded===null||Math.abs(recorded-bankAmount)>.009){
    $('#traceFeedback').textContent='Montant différent du mouvement bancaire lié. Vérifie d’abord ce virement dans Activité.';return;
   }
  }
  const next={id:original?.id||'op_'+txDocId(),accountId:account.id,type,date,
   symbol:['buy','sell','quote'].includes(type)?symbol:'',quantity:['buy','sell'].includes(type)?quantity:0,
   unitPrice:['buy','sell','quote'].includes(type)?unitPrice:0,amount:['deposit','withdrawal','dividend','fee'].includes(type)?amount:0,
   fee:['buy','sell'].includes(type)?fee:0,bankAccountId,bankCurrency,bankAmount,bankAmountCAD,
   linkedTransactionId:linked?.id||null,createdAt:original?.createdAt||new Date().toISOString()};
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
 openSheet('Comprendre mon patrimoine',
 '<div class="trace-insight-modal" id="traceWealthDetail"></div>'+
 '<div class="section-head"><h2>Comptes suivis</h2></div>'+
 accounts.map(({a,p})=>'<button class="trace-list-btn" type="button" data-analysis-invest="'+esc(a.id)+'"><span><b>'+esc(shortAccountLabel(a))+'</b><small>Versements nets : '+nativeMoney(p.contributions,a.currency)+' · Performance : '+(a.savingsTracking==='linked'?'non mesurée':nativeMoney(p.performance,a.currency))+'</small></span><strong>'+nativeMoney(p.value,a.currency)+'</strong></button>').join('')+
 (!accounts.length?'<div class="empty-note">Ajoute un compte pour suivre ton patrimoine.</div>':''));
 const scopeValue=scope(wealthScope),bk=bank(scopeValue);
 const missing=accounts.filter(({a,p})=>!p.hasFx||(a.savingsTracking==='linked'&&!p.configured));
 window.TraceInsights.renderWealth($('#traceWealthDetail'),insightWealthData(scopeValue,bk,accounts,missing));
 $$('[data-analysis-invest]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.analysisInvest)));
}

function renderWealth(){
 const sId=scope(wealthScope),owners=sId==='couple'?['la','partner']:[sId],bk=bank(sId),accounts=state.investmentAccounts.filter(a=>owners.includes(a.owner));
 requestInternationalRates(accounts.map(a=>window.TraceInternational.currency(a)));
 const ports=accounts.map(a=>({a,p:portfolioLedger(a)}));
 const missing=ports.filter(x=>!x.p.hasFx||x.a.savingsTracking==='linked'&&!x.p.configured);
 const investments=ports.reduce((sum,x)=>sum+(x.p.cad||0),0),
  banks=state.accounts.filter(a=>owners.includes(a.owner)&&!a.archived&&['checking','card'].includes(accountType(a))),
  bankValues=banks.map(a=>{const native=accountEstimate(a),currency=window.TraceInternational.currency(a);
   return{a,native,currency,cad:native===null?null:window.TraceInternational.fxValue(native,currency,internationalQuotes[currency])};}),
  bankMissing=bankValues.filter(x=>x.native===null||x.cad===null||
    accountType(x.a)==='card'&&Number(x.native)>0),
  bankCAD=bankValues.reduce((n,x)=>n+(x.cad??0),0),
  total=bankCAD+investments,complete=!bankMissing.length&&!missing.length;
 $('#wealthTotal').textContent=complete&&!bk.needsCardReview?money(total):'Total incomplet';
 $('#wealthSub').textContent=bk.needsCardReview?'La carte présente un avoir non vérifié : vérifie ton relevé.':
  !complete?'Total incomplet · '+(missing.length+bankMissing.length)+' compte(s) sans solde ou taux fiable':
  'Comptes bancaires et placements suivis · conversion indicative CAD';
 const savings=ports.filter(({a})=>a.savingsTracking==='linked'||
  ['CELI','Épargne','Livret','Savings'].includes(a.type));
 const placements=ports.filter(({a})=>!savings.some(({a:shown})=>shown.id===a.id));
 const tile=({a,p})=>'<button class="asset-card" type="button" data-inv-account="'+esc(a.id)+'"><span class="a-icon">◇</span><span>'+esc(a.name||a.type||'Investissement')+'</span><b>'+
  (p.reviewRequired?'Mouvement à vérifier':a.savingsTracking==='linked'&&!p.configured?'À configurer':nativeMoney(p.value,a.currency))+'</b><small>'+
  (p.hasFx?(a.savingsTracking==='linked'?'Solde estimé · ':'')+money(p.cad)+' CAD'+(p.fxDate?' · '+esc(p.fxDate):''):
    'Conversion CAD indisponible')+' · Détails ›</small></button>';
 const savingsNode=$('#wealthSavingsGrid'),placementsNode=$('#wealthInvestmentsGrid');
 if(savingsNode)savingsNode.innerHTML=savings.length?savings.map(tile).join(''):
  '<div class="trace-wealth-empty">Ajoute un livret, un CELI ou un autre compte d’épargne pour le suivre ici.</div>';
 if(placementsNode)placementsNode.innerHTML=[
  ...(placements.length?placements.map(tile):
   ['<div class="trace-wealth-empty">Tes placements suivis apparaîtront ici, sans modifier tes données existantes.</div>']),
  '<button class="asset-card asset-card-add" id="wealthAddCard" type="button"><span class="a-icon">＋</span><span>Ajouter un compte</span><b>Nouveau</b><small>PEA, CELI, REER…</small></button>'
 ].join('');
 $('#assetGrid').innerHTML=[
 '<button class="asset-card" type="button" id="wealthLiquidityCard"><span class="a-icon">$</span><span>Comptes bancaires</span><b>'+
  (bankMissing.length?'Solde incomplet':money(bankCAD))+'</b><small>Toutes devises, dettes déduites · Configurer ›</small></button>',
 ...bankValues.filter(x=>x.currency!=='CAD').map(({a,native,currency,cad})=>
  '<button class="asset-card" type="button" data-foreign-bank="'+esc(a.id)+'"><span class="a-icon">◇</span>'+
  '<span>'+esc(shortAccountLabel(a))+' · '+currency+'</span><b>'+
  (native===null?'Solde à configurer':window.TraceInternational.money(native,currency))+'</b>'+
  '<small>'+(cad!==null?'Équiv. '+money(cad)+' CAD':'Conversion indisponible')+'</small></button>')
 ].join('');
 $('#wealthAddCard').onclick=openInvestmentAccountAdd;$('#wealthLiquidityCard').onclick=openAccountSettings;
 $$('[data-foreign-bank]').forEach(b=>b.onclick=openAccountSettings);
 $$('[data-inv-account]').forEach(btn=>btn.onclick=()=>openInvestmentAccount(state.investmentAccounts.find(a=>a.id===btn.dataset.invAccount)));
 const cashValues=bankValues.filter(x=>accountType(x.a)==='checking'),
  cardValues=bankValues.filter(x=>accountType(x.a)==='card'),
  bankSummary={checking:cashValues.length&&cashValues.every(x=>x.cad!==null)?cashValues.reduce((n,x)=>n+x.cad,0):null,
   cardDebt:cardValues.every(x=>x.cad!==null&&Number(x.native)<=0)?cardValues.reduce((n,x)=>n+Math.max(0,-x.cad),0):null,
   net:bankMissing.length?null:bankCAD,needsCardReview:cardValues.some(x=>Number(x.native)>0)};
 window.TraceInsights.renderWealth($('#wealthTrend'),insightWealthData(sId,bankSummary,ports,missing));
 updateSegments();
}
function renderAll(){renderHome();renderBudget();renderActivity();renderWealth();if(!internationalPreviewMode()&&session?.user?.id&&household)window.TraceReminders?.refresh?.({userId:session.user.id,createdAt:session.user.created_at,owner:me,accounts:state.accounts,days:state.importDays,imports:state.smartImports});}
function navigate(p){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===p));location.hash=p==='home'?'':p;window.scrollTo({top:0,behavior:document.body.classList.contains('trace-guide-open')?'auto':'smooth'});}
function analysis(){analysisScope=homeScope;renderAnalysis();}
function renderAnalysis(){
 const sId=scope(analysisScope),month=CM,monthly=insightMonths(sId),known=monthly.filter(m=>m.hasData);
 const exp=known.reduce((n,m)=>n+m.expense,0),inc=known.reduce((n,m)=>n+m.income,0);
 openSheet('Comprendre mon budget',
  '<div class="segment analysis-scope" id="analysisScope"><button class="seg '+(analysisScope==='mine'?'active':'')+'" data-scope="mine">Moi</button><button class="seg '+(analysisScope==='couple'?'active':'')+'" data-scope="couple">Couple</button></div>'+
  '<p class="trace-insights-explain">Seulement '+known.length+' mois renseigné(s) sur les six derniers. Un mois sans données n’est pas un mois à 0 $.</p>'+
  '<div class="trace-insight-statpair"><div><small>Dépenses des mois renseignés</small><b>'+money(exp)+'</b></div>'+
  '<div><small>Revenus enregistrés</small><b>'+money(inc)+'</b></div></div>'+
  '<div id="traceAnalysisTrend" class="trace-insight-modal"></div>'+
  '<div id="traceAnalysisCategories" class="trace-insight-modal"></div>');
 window.TraceInsights.renderTrend($('#traceAnalysisTrend'),{months:monthly,selected:month});
 const s=summary(month,sId);
 window.TraceInsights.renderCategories($('#traceAnalysisCategories'),{rows:breakdown(month,sId),totalExpense:s.expense,
  budgetTotal:s.eb,month,onCategory:id=>insightCategoryDrilldown(month,sId,id)});
 $$('#analysisScope .seg').forEach(b=>b.onclick=()=>{analysisScope=b.dataset.scope;renderAnalysis();});
}
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
  if(internationalPreviewMode()){household.settings=settings;sync('synced','Démo locale');return;}
  if(traceWritesBlocked)throw Error('Conflit de données : recharge TRACE avant toute nouvelle écriture.');
  return traceSerialWrite('settings:'+household.id,async()=>{
   if(traceWritesBlocked)throw Error('Conflit de données : recharge TRACE avant toute nouvelle écriture.');
   // Rebuild after earlier queued writes: a stale local snapshot must not
   // overwrite newer edits made in the same browser session.
   const queuedSettings={...(household.settings||{}),...state.household,schemaVersion:5};
   const {data,error}=await client.rpc('trace_cas_save_household_settings',{
    p_household_id:household.id,p_settings:queuedSettings,
    p_expected_revision:traceRevision(traceSettingsRevision)});
   if(error)throw traceSaveFailure(error);
   traceSettingsRevision=traceRevision(data);
   household.settings=queuedSettings;sync('synced');
  });
}
async function saveDocument(collection,item){
  sync('saving');
  if(internationalPreviewMode()){sync('synced','Démo locale');return;}
  if(traceWritesBlocked)throw Error('Conflit de données : recharge TRACE avant toute nouvelle écriture.');
  if(!item||item.id===undefined||item.id===null||String(item.id)==='')
   throw Error('Identifiant du document manquant.');
  traceRefuseUnqualifiedDeferredWrite(collection,item);
  const id=String(item.id),key=traceWriteKey(collection,id);
  return traceSerialWrite(key,async()=>{
   if(traceWritesBlocked)throw Error('Conflit de données : recharge TRACE avant toute nouvelle écriture.');
   traceRefuseUnqualifiedDeferredWrite(collection,item);
   const expected=traceDocRevisions.has(key)?traceRevision(traceDocRevisions.get(key)):null;
   const {data,error}=await client.rpc('trace_cas_save_document',{
    p_household_id:household.id,p_collection:collection,p_item_id:id,
    p_data:item,p_expected_revision:expected});
   if(error)throw traceSaveFailure(error);
   traceDocRevisions.set(key,traceRevision(data));sync('synced');
  });
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
      profileMenuItem('settingsNotifications','bell','Notifications','Alertes et rappels d’import personnalisés')+
      profileMenuItem('settingsData','shield','Données & confidentialité','Date de référence et données partagées')+
    '</div>'+
    '<div class="empty-note" style="text-align:center;margin-top:12px">Trace · version '+esc(window.__TRACE_BUILD__)+'</div>'+
    profileMenuItem('settingsDelete','shield','Gérer mon espace TRACE','Séparer un foyer, conserver ou effacer mes données')+
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
  $('#settingsDelete').onclick=internationalPreviewMode()?()=>{
   openSheet('Mode démonstration','<p class="empty-note">La suppression et la séparation d’un foyer sont désactivées dans le laboratoire. Aucun compte réel n’est connecté.</p>'+
     '<button class="secondary full" id="demoSettingsBack">Retour</button>');
   $('#demoSettingsBack').onclick=profile;
 }:openTraceDeletion;
  $('#settingsData').onclick=openDataSettings;
  $('#logout').onclick=internationalPreviewMode()?()=>{
   closeSheet();$('#syncLabel').textContent='Démo locale · aucune connexion réelle';
 }:async()=>{await client.auth.signOut();location.reload();};
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
 // Retrying after a partial bootstrap is safe: a present category is NEVER
 // overwritten. CAS create-only protects concurrent new members as well.
 const {data:existing,error:readError}=await client.from('documents')
  .select('item_id,revision').eq('household_id',hid).eq('collection','categories');
 if(readError)throw readError;
 const seen=new Set();
 for(const row of existing||[]){
  if(!row||typeof row.item_id!=='string')throw Error('Référentiel des catégories incomplet.');
  seen.add(row.item_id);
  traceDocRevisions.set(traceWriteKey('categories',row.item_id),traceRevision(row.revision));
 }
 for(const doc of starterCategoryDocs(hid,session.user.id)){
  if(seen.has(doc.item_id))continue;
  const {data:revision,error}=await client.rpc('trace_cas_save_document',{
   p_household_id:hid,p_collection:'categories',p_item_id:doc.item_id,
   p_data:doc.data,p_expected_revision:null});
  if(error){
   if(!/TRACE_WRITE_CONFLICT/.test(String(error.message||'')))throw traceSaveFailure(error);
   // Another member may have created the same starter key concurrently.
   // Verify a real row exists; never swallow an unrelated CAS failure.
   const {data:already, error:lookupError}=await client.from('documents')
    .select('item_id,revision').eq('household_id',hid)
    .eq('collection','categories').eq('item_id',doc.item_id).maybeSingle();
   if(lookupError)throw lookupError;
   if(!already||already.item_id!==doc.item_id)
    throw traceSaveFailure(error);
   traceDocRevisions.set(traceWriteKey('categories',doc.item_id),traceRevision(already.revision));
   continue;
  }
  traceDocRevisions.set(traceWriteKey('categories',doc.item_id),traceRevision(revision));
 }
}
async function restoreStarterCategories(){
 // Explicit repair is additive even when some categories or budgets exist.
 // Never reset an edited category, an archived category, or budget history.
 await seedNewHouseholdCategories(household.id);
 const {data,error}=await client.from('documents')
  .select('item_id,data,revision').eq('household_id',household.id).eq('collection','categories');
 if(error)throw error;
 const fresh=[];
 for(const doc of data||[]){
  if(!doc?.data||doc.data.id!==doc.item_id)
   throw Error('Référentiel des catégories incohérent : recharge TRACE.');
  traceDocRevisions.set(traceWriteKey('categories',doc.item_id),traceRevision(doc.revision));
  fresh.push(doc.data);
 }
 state.categories=fresh;
 renderAll();
}
let initialBankSetupShown=false;
let bankSettingsScope='mine';
const bankMoney=n=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(n||0));
function offerInitialBankSetup(){
 if(initialBankSetupShown||!session||!household)return;
 const list=visibleBankAccounts(me);
 if(list.some(a=>accountType(a)==='checking'&&a.country==='FR')||
  list.some(a=>accountType(a)==='checking')&&list.some(a=>accountType(a)==='card'))return;
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
  '<strong>Choisis ton fonctionnement bancaire</strong>'+
  '<p>Canada : un compte et une carte de crédit. France : un compte avec carte à débit immédiat, ou une carte différée séparée si tu en utilises une.</p></div>'+
  '<button type="button" class="secondary full" id="traceSetupFrenchDebit">J’utilise un compte avec débit direct · France / Europe</button>'+
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
 $('#traceSetupFrenchDebit').onclick=()=>openNewBankAccount('checking','setup','FR');
 $('#traceBankSetupDone')?.addEventListener('click',closeSheet);
 $('#traceBankSetupLater')?.addEventListener('click',closeSheet);
}
function openNewBankAccount(preset='',returnTo='settings',presetCountry='CA'){
 if(!session||!household)return;
 const kind=['checking','card'].includes(preset)?preset:'checking';
 openSheet('Ajouter un compte bancaire',
  '<p class="empty-note">Un compte courant pour les revenus et les virements, une carte pour les achats. Choisis un nom identifiable, sans renseigner d’informations bancaires confidentielles.</p>'+
  '<label class="label2">Type de compte</label><select class="input" id="traceNewBankType"><option value="checking">Compte courant</option><option value="card">Carte de crédit</option></select>'+
  '<div class="formrow"><div><label class="label2">Pays du compte</label><select id="traceNewBankCountry" class="input"><option value="CA">Canada</option><option value="FR">France</option><option value="OTHER">Autre</option></select></div>'+
  '<div><label class="label2">Devise du compte</label><select id="traceNewBankCurrency" class="input">'+window.TraceInternational.currencies().map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></div></div>'+
  '<label class="label2" id="traceNewBankPaymentLabel">Fonctionnement de la carte</label><select id="traceNewBankPayment" class="input"><option value="credit">Carte de crédit</option><option value="deferred" disabled>Carte à débit différé · en préparation</option></select>'+
  '<div id="traceNewBankLinkedWrap" hidden><label class="label2" for="traceNewBankLinked">Compte courant de remboursement</label><select id="traceNewBankLinked" class="input"></select><p class="trace-intl-help">Une carte est associée à un seul compte courant pour calculer le solde principal sans double compter la dette.</p></div>'+
  '<label class="label2">Nom du compte (modifiable plus tard)</label><input class="input" id="traceNewBankName" maxlength="70" autocomplete="off">'+
  '<label class="label2" id="traceNewBankAmountLabel">Solde de référence ($)</label><input class="input" id="traceNewBankAmount" type="number" step=".01" inputmode="decimal" placeholder="À renseigner" autocomplete="off">'+
  '<p class="trace-account-amount-info" id="traceNewBankAmountInfo"></p>'+
  '<label class="label2">Date du solde de référence</label><input class="input" id="traceNewBankDate" type="date" value="'+localDateISO()+'">'+
  '<label class="label2">Ce solde correspond à…</label><select class="input" id="traceNewBankMode"><option value="start">Début de la journée (jour inclus)</option><option value="end">Fin de la journée (jour exclu)</option></select>'+
  '<p class="empty-note">Ce compte appartient à ton profil. Il apparaît aussi dans la vue « Couple » lorsque ton partenaire rejoint ton foyer.</p>'+
  '<p id="traceBankSetupError" class="trace-bank-setup-error" role="alert"></p>'+
  '<button class="primary full" id="traceSaveNewBank" type="button">Créer ce compte</button>'+
  '<button class="secondary full" id="traceCancelNewBank" type="button" style="margin-top:8px">Annuler</button>');
 const type=$('#traceNewBankType'),name=$('#traceNewBankName'),info=$('#traceNewBankAmountInfo'),country=$('#traceNewBankCountry'),currency=$('#traceNewBankCurrency'),payment=$('#traceNewBankPayment');
 country.onchange=()=>{currency.value=country.value==='FR'?'EUR':'CAD';syncType(false);};
 currency.onchange=()=>syncType(false);
 const syncType=(resetName=true)=>{
  const card=type.value==='card';
  if(resetName)name.value=card?'Carte de crédit':country.value==='FR'?'Compte bancaire français':'Compte courant';
  payment.hidden=!card;$('#traceNewBankPaymentLabel').hidden=!card;
  $('#traceNewBankLinkedWrap').hidden=!card;
  const linkedAccounts=visibleBankAccounts(me).filter(a=>accountType(a)==='checking'&&
   window.TraceInternational.currency(a)===currency.value&&window.TraceInternational.country(a)===country.value);
  $('#traceNewBankLinked').innerHTML='<option value="">'+(linkedAccounts.length?'Choisir le compte courant':'Crée d’abord un compte courant dans cette devise')+'</option>'+
   linkedAccounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
  if(linkedAccounts.length===1)$('#traceNewBankLinked').value=linkedAccounts[0].id;
  $('#traceNewBankAmountLabel').textContent=(card?'Dette de carte':'Solde de référence')+' à cette date ('+currency.value+')';
  $('#traceNewBankAmount').value='';
  $('#traceNewBankAmount').min=card?'0':'';
  info.textContent=card?'Entre le montant de dette positif. TRACE enregistre ce montant comme une dette (solde négatif).':
   'Tu peux laisser ce montant vide si tu ne connais pas ton solde. TRACE ne l’inventera pas.';
 };
 country.value=presetCountry;currency.value=presetCountry==='FR'?'EUR':'CAD';
 type.value=kind;syncType();
 if(preset)type.disabled=true;
 else type.onchange=syncType;
 const back=()=>returnTo==='setup'?openEssentialBankSetup():openAccountSettings();
 $('#traceCancelNewBank').onclick=back;
 $('#traceSaveNewBank').onclick=async()=>{
  const label=name.value.trim(),accountKind=type.value,raw=$('#traceNewBankAmount').value.trim(),
   n=raw===''?null:window.TraceInternational.exactMoney(raw),date=$('#traceNewBankDate').value,mode=$('#traceNewBankMode').value,
   currencyCode=currency.value,countryCode=country.value,
   linkedId=accountKind==='card'?$('#traceNewBankLinked').value:null,
   linkedAccount=visibleBankAccounts(me).find(a=>a.id===linkedId&&accountType(a)==='checking'&&
    window.TraceInternational.currency(a)===currencyCode&&window.TraceInternational.country(a)===countryCode);
  if(!label||label.length>70||!['checking','card'].includes(accountKind)||
   !window.TraceInternational.valid(currencyCode)||!['CA','FR','OTHER'].includes(countryCode)||
    (accountKind==='card'&&(payment.value!=='credit'||!linkedAccount))||
   !window.TraceInternational.calendarDate(date)||(raw!==''&&(n===null||Math.abs(n)>1e9))||
   (accountKind==='card'&&n!==null&&n<0)){
   $('#traceBankSetupError').textContent='Vérifie le nom, la date et le montant. La dette de carte doit être saisie en positif.';
   return;
  }
  if(visibleBankAccounts(me).some(a=>a.name.toLocaleLowerCase('fr')===label.toLocaleLowerCase('fr'))){
   $('#traceBankSetupError').textContent='Tu as déjà un compte de ce nom.';
   return;
  }
  const account={id:accountKind+'_'+txDocId(),owner:me,name:label,type:accountKind,
   currency:currencyCode,country:countryCode,paymentMode:accountKind==='card'?payment.value:'immediate',
    ...(accountKind==='card'?{settlementAccountId:linkedId}:{})};
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
   if(returnTo==='setup'&&accountKind==='checking'&&countryCode==='FR')closeSheet();
   else back();
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
function openBankMetadata(id){
 const account=state.accounts.find(a=>a.id===id&&a.owner===me&&!a.archived);
 if(!account)return;
 const I=window.TraceInternational,before=JSON.stringify(account),
  history=state.transactions.some(t=>t.accountId===id||t.toAccountId===id)||
   state.reconciliations.some(r=>r.accountId===id)||state.investmentOperations.some(o=>o.bankAccountId===id)||
   I.exactMoney(state.household.accountOpeningBalances?.[id])!==null;
 openSheet('Paramètres du compte',
  '<p class="trace-intl-help">Les modifications de nom ou de rattachement ne recalculent aucune opération passée. Les montants natifs et les budgets historiques sont conservés.</p>'+
  '<label class="label2">Nom du compte<input class="input" id="traceBankMetaName" maxlength="70" value="'+esc(account.name||'')+'"></label>'+
  '<div class="formrow"><label class="label2">Pays<select class="input" id="traceBankMetaCountry"><option value="CA">Canada</option><option value="FR">France</option><option value="OTHER">Autre pays</option></select></label>'+
  '<label class="label2">Devise native<select class="input" id="traceBankMetaCurrency"'+(history?' disabled':'')+'>'+I.currencies().map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></label></div>'+
  (history?'<p class="trace-intl-help">La devise est verrouillée car ce compte possède un solde ou un historique. Pour une autre devise, ajoute un autre compte.</p>':'')+
  '<div class="setting-summary"><span>Modèle bancaire</span><b>'+esc(accountType(account)==='card'?(account.paymentMode==='deferred'?'Débit différé · activation bloquée':'Carte de crédit'):'Débit immédiat')+'</b></div>'+
  (accountType(account)==='card'?'<label class="label2">Compte de règlement<select class="input" id="traceBankMetaSettlement"></select></label>':'')+
  '<p id="traceBankMetaError" class="trace-bank-setup-error" role="alert"></p>'+
  '<button type="button" class="primary full" id="traceBankMetaSave">Confirmer les modifications</button>'+
  '<button type="button" class="secondary full" id="traceBankMetaArchive" style="margin-top:8px">Archiver ce compte</button>'+
  '<button type="button" class="secondary full" id="traceBankMetaBack" style="margin-top:8px">Retour à mes comptes</button>');
 $('#traceBankMetaCountry').value=I.country(account);$('#traceBankMetaCurrency').value=I.currency(account);
 const links=()=>{
  const node=$('#traceBankMetaSettlement');if(!node)return;
  const old=node.value||account.settlementAccountId;
  const possible=visibleBankAccounts(me).filter(a=>accountType(a)==='checking'&&
   I.currency(a)===$('#traceBankMetaCurrency').value&&I.country(a)===$('#traceBankMetaCountry').value);
  node.innerHTML='<option value="">À associer</option>'+possible.map(a=>'<option value="'+esc(a.id)+'">'+esc(shortAccountLabel(a))+'</option>').join('');
  if(possible.some(a=>a.id===old))node.value=old;
 };
 $('#traceBankMetaCountry').onchange=links;$('#traceBankMetaCurrency').onchange=links;links();
 $('#traceBankMetaBack').onclick=openAccountSettings;
 $('#traceBankMetaArchive').onclick=()=>confirmBankArchive(id,true);
 $('#traceBankMetaSave').onclick=async()=>{
  const button=$('#traceBankMetaSave');button.disabled=true;
  try{
   if(state.accounts.find(a=>a.id===id)!==account||JSON.stringify(account)!==before)
    throw Error('Le compte a changé. Rouvre ses paramètres avant de continuer.');
   const next=I.resolveAccountEdit({account,owner:me,accounts:state.accounts,transactions:state.transactions,
    reconciliations:state.reconciliations,investmentOperations:state.investmentOperations,
    openingBalances:state.household.accountOpeningBalances||{},input:{
     name:$('#traceBankMetaName').value,country:$('#traceBankMetaCountry').value,currency:$('#traceBankMetaCurrency').value,
     ...(accountType(account)==='card'?{settlementAccountId:$('#traceBankMetaSettlement').value}:{} )}});
   await saveDocument('accounts',next);Object.assign(account,next);renderAll();openAccountSettings();
  }catch(error){button.disabled=false;$('#traceBankMetaError').textContent=error.message||'Modification impossible.';}
 };
}
function confirmBankArchive(id,archived=true){
 const account=state.accounts.find(a=>a.id===id&&a.owner===me);if(!account)return;
 const I=window.TraceInternational,before=JSON.stringify(account);
 const prepare=()=>I.resolveAccountArchive({account,owner:me,accounts:state.accounts,
  primaryId:state.household.primaryBankAccountByOwner?.[me],archived,date:localDateISO()});
 try{prepare();}catch(error){
  openSheet('Compte à conserver actif','<p class="trace-intl-help">'+esc(error.message)+'</p><button type="button" class="primary full" id="traceArchiveBack">Retour à mes comptes</button>');
  $('#traceArchiveBack').onclick=openAccountSettings;return;
 }
 openSheet(archived?'Archiver le compte':'Réactiver le compte',
  '<p>Confirmer '+(archived?'l’archivage':'la réactivation')+' de <b>'+esc(account.name)+'</b> ?</p>'+
  '<p class="trace-intl-help">'+(archived?'Il sera retiré de la trésorerie active et des nouveaux imports.':'Il sera à nouveau proposé pour les imports et la trésorerie.')+
  ' Ses opérations, ses soldes de référence et ses budgets historiques sont conservés. Aucun mouvement financier n’est créé.</p>'+
  '<p id="traceArchiveError" role="alert" class="trace-bank-setup-error"></p>'+
  '<button type="button" class="primary full" id="traceArchiveConfirm">Confirmer</button>'+
  '<button type="button" class="secondary full" id="traceArchiveCancel" style="margin-top:8px">Annuler</button>');
 $('#traceArchiveCancel').onclick=openAccountSettings;
 $('#traceArchiveConfirm').onclick=async()=>{
  const button=$('#traceArchiveConfirm');button.disabled=true;
  try{
   if(state.accounts.find(a=>a.id===id)!==account||JSON.stringify(account)!==before)
    throw Error('Le compte a changé. Recommence depuis Mes comptes.');
   const next=prepare();await saveDocument('accounts',next);Object.assign(account,next);renderAll();openAccountSettings();
  }catch(error){button.disabled=false;$('#traceArchiveError').textContent=error.message||'Action impossible.';}
 };
}
function openAccountSettings(){
 const all=state.accounts.filter(a=>a.id!=='cash'&&a.type!=='cash'&&!a.archived&&['la','partner'].includes(a.owner));
 const accounts=bankSettingsScope==='couple'?all:all.filter(a=>a.owner===me);
 const mine=accounts.filter(a=>a.owner===me);
 const archived=state.accounts.filter(a=>a.archived&&['la','partner'].includes(a.owner)&&
  (bankSettingsScope==='couple'||a.owner===me)&&['checking','card'].includes(accountType(a)));
 const balances=state.household.accountOpeningBalances||{};
 const dates=state.household.accountOpeningBalanceDates||{};
 const modes=state.household.accountOpeningBalanceModes||{};
 const accountLabel=a=>accountType(a)==='card'?(a.paymentMode==='deferred'?'Carte à débit différé':'Carte de crédit'):
  a.country==='FR'?'Compte à débit direct':'Compte courant';
 openSheet('Mes comptes',
  '<div class="trace-bank-scope" role="group" aria-label="Afficher les comptes de"><button type="button" data-bank-scope="mine" class="'+(bankSettingsScope==='mine'?'is-selected':'')+'" aria-pressed="'+(bankSettingsScope==='mine')+'">Moi</button><button type="button" data-bank-scope="couple" class="'+(bankSettingsScope==='couple'?'is-selected':'')+'" aria-pressed="'+(bankSettingsScope==='couple')+'">Couple</button></div>'+
  '<p class="trace-account-settings-help">'+(bankSettingsScope==='couple'?'Vue globale des comptes du foyer. Tu peux modifier tes propres comptes ; ceux du partenaire sont en lecture seule.':
   'Chaque compte a son propre solde, ses imports et ses opérations. Tu peux les renommer sans perdre leur historique.')+'</p>'+
  (accounts.length?accounts.map(a=>{
   const editable=a.owner===me;
   const estimate=accountEstimate(a);
   return '<div class="account-setting-card trace-bank-account">'+
    '<div class="trace-bank-account-head"><div class="settings-hero compact"><span class="pico">'+uiIcon('bank')+'</span><div>'+
    '<b>'+esc(shortAccountLabel(a))+'</b><small>'+esc(accountLabel(a))+' · '+esc(shortMemberName(a.owner))+' · '+window.TraceInternational.currency(a)+' · '+esc(a.country||'CA')+'</small></div></div>'+
    (editable?'<button type="button" class="trace-bank-rename" data-rename-bank="'+esc(a.id)+'">Renommer</button>':
     '<span class="trace-bank-readonly">Consultation</span>')+'</div>'+
    (editable?
     (accountType(a)==='checking'?'<button type="button" class="trace-intl-set-primary" data-primary-bank="'+esc(a.id)+'">'+
       (state.household.primaryBankAccountByOwner?.[me]===a.id?'★ Compte principal':'☆ Définir comme principal')+'</button>':'')+
     '<label class="label2">'+(accountType(a)==='card'?'Dette de carte':'Solde de référence')+' à cette date ('+
      window.TraceInternational.currency(a)+')</label>'+
     '<input class="input account-opening" data-id="'+esc(a.id)+'" type="number" '+(accountType(a)==='card'?'min="0" ':'')+'step="0.01" value="'+esc(accountType(a)==='card'&&balances[a.id]!=null?Math.abs(Number(balances[a.id])):(balances[a.id]??''))+'">'+
     (accountType(a)==='card'?'<small class="trace-account-amount-info">Entre la dette en positif (ex. 595,90). TRACE la soustrait du compte courant. Aucun paiement ni achat n’est créé.</small>':'')+
     '<label class="label2">Date de ce solde</label><input class="input account-date" data-id="'+esc(a.id)+'" type="date" value="'+esc(dates[a.id]||state.household.referenceDate||CM+'-01')+'">'+
     '<label class="label2">Moment du solde</label><select class="input account-mode" data-id="'+esc(a.id)+'">'+
     '<option value="start"'+(modes[a.id]!=='end'?' selected':'')+'>Début de la journée (jour inclus)</option>'+
     '<option value="end"'+(modes[a.id]==='end'?' selected':'')+'>Fin de la journée (jour exclu)</option></select>':
     '<div class="trace-bank-partner-balance"><span>Solde estimé</span><b>'+esc(traceAccountNative(a))+
      '</b></div>')+
    '<div class="trace-account-settings-actions"><button type="button" class="secondary" data-details-bank="'+esc(a.id)+'">Détails et opérations</button>'+
    (editable?'<button type="button" class="secondary" data-config-bank="'+esc(a.id)+'">Paramètres</button>':'')+'</div></div>';
  }).join(''):'<div class="empty-note">Aucun compte bancaire n’est encore configuré pour cette vue.</div>')+
  (mine.length?'<button class="primary full" id="saveAccountSettings" style="margin-top:16px">Enregistrer mes soldes</button>':'')+
  '<button class="secondary full" id="traceAddBankAccount" type="button" style="margin-top:9px">+ Ajouter un de mes comptes</button>'+
  (archived.length?'<details class="trace-archived-accounts"><summary>Comptes archivés · '+archived.length+'</summary>'+
   archived.map(a=>'<div class="trace-archived-account"><span><b>'+esc(shortAccountLabel(a))+'</b><small>'+window.TraceInternational.currency(a)+' · Historique conservé</small></span>'+
    '<button type="button" class="secondary" data-archive-history="'+esc(a.id)+'">Historique</button>'+
    (a.owner===me?'<button type="button" class="secondary" data-restore-bank="'+esc(a.id)+'">Réactiver</button>':'')+'</div>').join('')+'</details>':'')+
  '<p class="trace-bank-setup-footer">Compte courant : revenus et virements. Carte de crédit : achats du quotidien ; son paiement depuis le courant n’est pas une deuxième dépense.</p>'+
  settingsBack());
 $$('[data-bank-scope]').forEach(button=>button.onclick=()=>{bankSettingsScope=button.dataset.bankScope==='couple'?'couple':'mine';openAccountSettings();});
 $$('[data-rename-bank]').forEach(button=>button.onclick=()=>openRenameBankAccount(button.dataset.renameBank));
 $$('[data-config-bank]').forEach(button=>button.onclick=()=>openBankMetadata(button.dataset.configBank));
 $$('[data-details-bank]').forEach(button=>button.onclick=()=>openTraceAccountDetail(button.dataset.detailsBank,
  {householdView:bankSettingsScope==='couple',onBack:openAccountSettings}));
 $$('[data-archive-history]').forEach(button=>button.onclick=()=>openTraceAccountActivity(button.dataset.archiveHistory));
 $$('[data-restore-bank]').forEach(button=>button.onclick=()=>confirmBankArchive(button.dataset.restoreBank,false));
 $$('[data-primary-bank]').forEach(button=>button.onclick=()=>{
  confirmTracePrimaryAccount(button.dataset.primaryBank,openAccountSettings);
 });
 $('#traceAddBankAccount').onclick=()=>openNewBankAccount();
 if(mine.length)$('#saveAccountSettings').onclick=async()=>{
  const oldBalances={...(state.household.accountOpeningBalances||{})},
   oldDates={...(state.household.accountOpeningBalanceDates||{})},
   oldModes={...(state.household.accountOpeningBalanceModes||{})};
  const newBalances={...oldBalances},newDates={...oldDates},newModes={...oldModes};
  for(const input of $$('.account-opening')){
   if(!visibleBankAccounts(me).some(a=>a.id===input.dataset.id))continue;
   if(input.value.trim()!==''&&window.TraceInternational.exactMoney(input.value)===null){
    traceNotice(Error('Vérifie les soldes de référence : montants au centime requis.'));return;
   }
   if(input.value.trim()==='')delete newBalances[input.dataset.id];
   else{
    const account=state.accounts.find(a=>a.id===input.dataset.id);
    const amount=Number(input.value);
    if(accountType(account)==='card'&&amount<0){
     traceNotice(Error('Pour une carte, saisis la dette en positif. TRACE la soustrait automatiquement.'));
     return;
    }
    newBalances[input.dataset.id]=accountType(account)==='card'?-Math.abs(amount):amount;
   }
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
    (mine.length?mine.map(a=>{const r=state.reconciliations.filter(x=>x.accountId===a.id).sort((x,y)=>String(y.date).localeCompare(String(x.date)))[0];const est=accountEstimate(a);return '<div class="reconcile-card"><div><b>'+esc(shortAccountLabel(a))+'</b><small>'+(r?'Dernier rapprochement : '+esc(r.date):'Jamais rapproché')+'</small></div><div class="reconcile-estimate">'+(est===null?'Solde inconnu':window.TraceInternational.money(est,window.TraceInternational.currency(a)))+'</div><button class="secondary reconcile-one" data-id="'+esc(a.id)+'">Rapprocher</button></div>';}).join(''):'<div class="empty-note">Ajoute d’abord tes comptes bancaires.</div>')+settingsBack()
  );
  $$('.reconcile-one').forEach(b=>b.onclick=()=>openSingleReconcile(b.dataset.id));
  bindSettingsBack();
}
function openSingleReconcile(id){
  const a=state.accounts.find(x=>x.id===id);if(!a)return;
  const est=accountEstimate(a),isCard=accountType(a)==='card',
    nativeCurrency=window.TraceInternational.currency(a);
  openSheet('Rapprocher · '+a.name,
    '<div class="setting-summary"><span>Solde estimé Trace</span><b>'+(est===null?'Solde inconnu':window.TraceInternational.money(est,nativeCurrency))+'</b></div>'+
    '<label class="label2">'+(isCard?'Montant sur le relevé de carte ('+nativeCurrency+')':'Solde réel dans la banque ('+nativeCurrency+')')+'</label>'+
    '<input id="reconcileActual" class="input" type="number" '+(isCard?'min="0" ':'')+'step="0.01" value="'+(est===null?'':(isCard?Math.abs(est):est).toFixed(2))+'">'+
    (isCard?'<label class="label2">Ce montant correspond à</label><select id="reconcileCardKind" class="input"><option value="debt"'+(est<=0?' selected':'')+'>Une dette à rembourser</option><option value="credit"'+(est>0?' selected':'')+'>Un avoir réel sur la carte (solde créditeur)</option></select>'+
     '<small>Une dette diminue ta liquidité nette. Un avoir est suivi séparément sans gonfler le disponible.</small>':'')+
    '<label class="label2">Date</label><input id="reconcileDate" class="input" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
    '<button class="primary full" id="saveReconciliation" style="margin-top:16px">Valider le rapprochement</button>'+settingsBack()
  );
  $('#saveReconciliation').onclick=async()=>{
    const input=$('#reconcileActual').value;
    const raw=Number(input),cardKind=isCard?$('#reconcileCardKind').value:null;
    if(window.TraceInternational.exactMoney(input)===null||(isCard&&raw<0)||
     !window.TraceInternational.calendarDate($('#reconcileDate').value)){
     traceNotice(Error('Vérifie le montant et la date du relevé.'));return;
    }
    const actual=isCard?(cardKind==='credit'?Math.abs(raw):-Math.abs(raw)):raw;
    const item={id:'rec_'+Date.now().toString(36),accountId:a.id,owner:me,date:$('#reconcileDate').value,
     status:'confirmed',source:'manual_balance',
     ...(isCard?{cardBalanceKind:cardKind}:{}),
     currency:nativeCurrency,estimatedBalance:est,actualBalance:actual,
     difference:est===null?null:Math.round((actual-est)*100)/100};
    $('#saveReconciliation').disabled=true;
    try{
     await saveDocument('reconciliations',item);
     state.reconciliations.push(item);
     renderAll();openReconcileSettings();
    }catch(e){$('#saveReconciliation').disabled=false;traceNotice(e);}
  };
  bindSettingsBack();
}
function notificationToggle(key,label,sub,on){
  return '<button class="setting notification-setting" data-key="'+key+'" type="button"><span class="pico">'+uiIcon('bell')+'</span><div><b>'+esc(label)+'</b><small>'+esc(sub)+'</small></div><span class="switch '+(on?'on':'')+'"></span></button>';
}
function openNotificationSettings(){
 const n=state.household.notifications||{review:true,staleImport:true,reconcile:true};
 const uid=session?.user?.id;
 const freq=window.TraceReminders?.frequency?.(uid)||'two_days';
 openSheet('Notifications',
   '<div class="settings-hero"><span class="pico large">'+uiIcon('bell')+'</span><div><b>Notifications & rappels</b><small>Personnalise les alertes utiles à ton budget</small></div></div>'+
   '<div class="settings-group-title trace-notify-section">Alertes à suivre</div>'+
   notificationToggle('review','Transactions à vérifier','Quand une opération demande ton attention',n.review!==false)+
   notificationToggle('staleImport','Import à faire','Si aucun import depuis 7 jours',n.staleImport!==false)+
   notificationToggle('reconcile','Rapprochement hebdomadaire','Vérifier les soldes une fois par semaine',n.reconcile!==false)+
   '<div class="settings-group-title trace-notify-section">Nouveau · Rappel d’import</div>'+
   '<p class="trace-notify-explain">Un rappel personnel lorsque tu n’as pas importé de nouvelles opérations depuis le délai choisi.</p>'+
   '<div class="trace-reminder-choice">'+
    ['daily','two_days','off'].map((id,i)=>'<label><input type="radio" name="traceReminderFrequency" value="'+id+'"'+(freq===id?' checked':'')+'><span>'+['Chaque jour','Tous les 2 jours','Désactivé'][i]+'</span></label>').join('')+
   '</div>'+
   '<div class="empty-note">Les trois préférences ci-dessus sont conservées pour les futures alertes, mais elles n’envoient pas encore de push. Le rappel d’import fonctionne à l’ouverture de TRACE ou à son retour au premier plan, pas quand l’application est fermée.</div>'+
   '<p class="trace-notify-error" id="traceNotifyError" role="status"></p>'+
   '<button class="primary full" id="saveNotifications" type="button">Enregistrer mes préférences</button>'+settingsBack()
 );
 $$('.notification-setting').forEach(row=>row.onclick=()=>row.querySelector('.switch').classList.toggle('on'));
 $('#saveNotifications').onclick=async()=>{
  const btn=$('#saveNotifications');
  const oldPrefs=state.household.notifications;
  const prefs={...(oldPrefs||{})};
  $$('.notification-setting').forEach(row=>prefs[row.dataset.key]=row.querySelector('.switch').classList.contains('on'));
  const choice=$('input[name="traceReminderFrequency"]:checked')?.value||'two_days';
  btn.disabled=true;
  $('#traceNotifyError').textContent='Enregistrement…';
  try{
   state.household.notifications=prefs;
   await saveHouseholdSettings();
   window.TraceReminders?.setFrequency?.(uid,choice);
   profile();
  }catch(err){
   state.household.notifications=oldPrefs;
   $('#traceNotifyError').textContent='Les préférences n’ont pas été enregistrées. Réessaie.';
   btn.disabled=false;
   console.error('TRACE: notification settings save failed',err);
  }
 };
 bindSettingsBack();
}
function openTraceDeletion(){
 const solo=(state.household.workspaceMembers||[]).length<2;
 openSheet('Gérer mon espace TRACE',
  '<div class="settings-hero"><span class="pico large">'+uiIcon('shield')+'</span><div><b>Ton espace, tes choix</b><small>Les décisions sensibles restent sous ton contrôle</small></div></div>'+
  '<div class="trace-space-options">'+
   '<div class="trace-space-option"><strong>1 · Séparer notre foyer</strong>'+
   '<p>Chacun conserve ses comptes et ses opérations personnelles. Aucun historique commun n’est recopié. Les deux partenaires doivent approuver.</p>'+
   (solo?'<span>Ton foyer est déjà personnel.</span>':'<button class="secondary full" type="button" id="traceStartSeparation">Demander notre séparation</button>')+'</div>'+
   '<div class="trace-space-option"><strong>2 · Supprimer mes données TRACE</strong>'+
   '<p>'+(solo?'Tu es seul dans cet espace : tu peux effacer ses données après une double confirmation.':
   'Dans un foyer partagé, cette demande nécessite les deux accords. Ton partenaire conserve ses données personnelles et l’historique commun reste archivé, sans être recopié.')+'</p>'+
   (solo?'<button class="secondary full" id="traceStartSoloDeletion" type="button">Supprimer mon espace personnel</button>':
    '<button class="secondary full" id="traceStartSharedExit" type="button">Demander mon départ de TRACE</button>')+'</div>'+
   '<div class="trace-space-option"><strong>3 · Supprimer l’ensemble du foyer</strong>'+
   '<p>'+(solo?'Même conséquence que la suppression de ton espace personnel.':
    'Il faudra confirmer l’accord des deux membres avant d’effacer toutes les données partagées.')+'</p>'+
   (solo?'<span>Confirmation et mot de passe obligatoires</span>':
     '<button class="secondary full trace-danger" id="traceStartSharedDeletion" type="button">Demander la suppression du foyer</button>')+'</div>'+
  '</div>'+
  '<p class="empty-note">Ton accès Supabase peut également servir à PickPoint : TRACE n’efface pas cette identité de connexion lors de la suppression de ses données.</p>'+
  settingsBack()
 );
 $('#traceStartSoloDeletion')?.addEventListener('click',openTraceSoloDeletion);
 $('#traceStartSharedExit')?.addEventListener('click',()=>window.TraceHouseholdChange?.open?.({client,session,memberCount:(state.household.workspaceMembers||[]).length,openSheet,settingsBack,bindSettingsBack},'exit'));
 $('#traceStartSharedDeletion')?.addEventListener('click',()=>window.TraceHouseholdChange?.open?.({client,session,memberCount:(state.household.workspaceMembers||[]).length,openSheet,settingsBack,bindSettingsBack},'delete_household'));
 $('#traceStartSeparation')?.addEventListener('click',()=>window.TraceSeparation?.open?.({client,session,memberCount:(state.household.workspaceMembers||[]).length,openSheet,settingsBack,bindSettingsBack}));
 bindSettingsBack();
}
function openTraceSoloDeletion(){
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
async function loadWorkspace(){showGate('cloudLoadingPanel');loadingStage('Chargement de votre espace…');const{data:m,error:e}=await withTimeout(client.from('household_members').select('household_id,user_id,slot,display_name').eq('user_id',session.user.id).maybeSingle(),7000,'Chargement du profil trop long.');if(e)throw e;if(!m){showGate('cloudWorkspacePanel');return;}document.documentElement.dataset.traceUserId=session.user.id;me=m.slot;partner=me==='la'?'partner':'la';loadingStage('Synchronisation de vos données…');const[{data:h,error:he},{data:docs,error:de},{data:members,error:mee}]=await withTimeout(Promise.all([client.from('households').select('id,name,settings,settings_revision,schema_version,invite_code,created_by').eq('id',m.household_id).single(),client.from('documents').select('collection,item_id,data,revision').eq('household_id',m.household_id),client.from('household_members').select('slot,display_name,role,user_id').eq('household_id',m.household_id)]),9000,'Synchronisation trop longue.');if(he||de||mee)throw he||de||mee;
 // Deny missing/malformed revision data rather than silently reopening blind writes.
 const incomingRevision=internationalPreviewMode()?null:traceRevision(h.settings_revision);
 const loadedRevisions=new Map();
 if(!internationalPreviewMode())for(const d of docs){
  if(!d.collection||d.item_id===undefined||d.item_id===null)
   throw Error('Document cloud incomplet : identifiant absent.');
  loadedRevisions.set(traceWriteKey(d.collection,d.item_id),traceRevision(d.revision));
 }
 traceDocRevisions.clear();
 for(const [key,rev] of loadedRevisions)traceDocRevisions.set(key,rev);
 traceSettingsRevision=incomingRevision;traceWriteQueues.clear();traceWritesBlocked=false;
 document.querySelector('#traceWriteConflict')?.remove();
 household=h;state={household:{...(h.settings||{}),name:h.name,inviteCode:h.invite_code||'',createdBy:h.created_by||'',workspaceMembers:members.map(x=>({slot:x.slot,name:x.display_name,role:x.role,userId:x.user_id}))},categories:[],accounts:[],budgets:[],transactions:[],investmentAccounts:[],investmentOperations:[],reconciliations:[],importDays:[],smartImports:[]};if(!Array.isArray(state.household.members)||!state.household.members.length)state.household.members=members.map(x=>({id:x.slot,name:x.display_name,initials:initials(x.display_name)}));members.forEach(x=>{const mm=state.household.members.find(y=>y.id===x.slot);if(mm){mm.name=x.display_name||mm.name;mm.initials=initials(mm.name);}});const map={categories:'categories',accounts:'accounts',budgets:'budgets',transactions:'transactions',investmentAccounts:'investment_accounts',investmentOperations:'investment_operations',reconciliations:'reconciliations',importDays:'import_days',smartImports:'imports'};Object.entries(map).forEach(([k,c])=>state[k]=docs.filter(d=>d.collection===c).map(d=>d.data).filter(Boolean));state.household.referenceDate||=CM+'-01';$('#profileBtn').textContent=member(me).initials||initials(member(me).name);renderAll();navigate((location.hash||'#').slice(1)||'home');hideGate();sync('synced');window.TraceReminders?.refresh?.({userId:session.user.id,createdAt:session.user.created_at,owner:me,accounts:state.accounts,days:state.importDays,imports:state.smartImports});document.dispatchEvent(new Event('trace:workspace-ready'));setTimeout(offerInitialBankSetup,260);
 if(state.household.traceSeparatedAt){
  let greeted=false;
  const localKey='trace:separation:greeting:'+session.user.id;
  try{greeted=localStorage.getItem(localKey)==='done';}catch(e){}
  if(!greeted){
   const welcome=()=>{
    if(!session||!household)return;
    if(document.body.classList.contains('sheet-open')||
       document.body.classList.contains('trace-guide-open')){
      const observer=new MutationObserver(()=>{
       if(!document.body.classList.contains('sheet-open')&&
          !document.body.classList.contains('trace-guide-open')){
        observer.disconnect();
        setTimeout(welcome,250);
       }
      });
      observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      return;
    }
    try{localStorage.setItem(localKey,'done');}catch(e){}
    openSheet('Ton nouvel espace personnel',
    '<div class="trace-separation-intro"><strong>Votre séparation est terminée</strong>'+
    '<p>Tu disposes maintenant de ton propre foyer TRACE avec tes opérations personnelles. L’ancien historique commun n’a pas été recopié.</p>'+
    '<p><b>À faire :</b> mets à jour le solde actuel de ton compte courant et de ta carte dans Profil → Mes comptes. Les anciens soldes et rapprochements n’ont volontairement pas été transférés.</p></div>'+
    '<button class="primary full" id="traceReviewBankBalances" type="button">Vérifier mes comptes</button>'+
    '<button class="secondary full" id="traceCloseSplitWelcome" type="button" style="margin-top:8px">Plus tard</button>');
   $('#traceReviewBankBalances').onclick=openAccountSettings;
    $('#traceCloseSplitWelcome').onclick=closeSheet;
   };
   setTimeout(welcome,1350);
  }
 }
 if(state.investmentAccounts.some(a=>a.owner===me&&window.TraceInternational.valid(a.currency)&&a.currency!=='CAD'&&a.fxAutoUpdate!==false))setTimeout(()=>refreshPublicPortfolioRates().catch(console.error),350);}
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
function bind(){$('#closeSheet').onclick=closeSheet;$('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet();};$$('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));$$('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='review'){navigate('activity');showTab('import');}else navigate(b.dataset.go);});$('#homeAccountsBtn').onclick=event=>{event.stopPropagation();openAccountsOverview();};$('#quickAdd').onclick=openManualTransaction;$('#profileBtn').onclick=profile;$('#analysisBtn').onclick=analysis;$('#homeTrendCard').onclick=analysis;$('#shareCard').onclick=openActivitySharing;$('#shareOpen').onclick=openActivitySharing;$$('[data-kpi]').forEach(b=>b.onclick=()=>detail(b.dataset.kpi));$$('#homeScope .seg').forEach(b=>b.onclick=()=>{homeScope=b.dataset.scope;renderHome();});document.querySelectorAll('#budgetScope .seg').forEach(b=>b.onclick=()=>{budgetScope=b.dataset.scope;renderBudget();});$('#budgetMonthPicker')?.addEventListener('change',e=>setBudgetMonth(e.target.value));$('#budgetCurrentMonth')?.addEventListener('click',()=>setBudgetMonth(CM));$('#budgetCopyPrevious')?.addEventListener('click',copyPreviousBudget);$$('#wealthScope .seg').forEach(b=>b.onclick=()=>{wealthScope=b.dataset.scope;renderWealth();});$$('#activityTabs .tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$('#activityMonthPicker')?.addEventListener('change',e=>setActivityMonth(e.target.value));$('#activityPrevMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,-1)));$('#activityNextMonth')?.addEventListener('click',()=>setActivityMonth(monthOffset(activityMonth,1)));$('#activityCurrentMonth')?.addEventListener('click',()=>setActivityMonth(CM));$('#annualBudgetDetails').onclick=openAnnualBudgetAnalysis;$('#annualBudgetCard').onclick=openAnnualBudgetAnalysis;$('#addAsset').onclick=openInvestmentAccountAdd;$('#wealthAnalysis').onclick=openPortfolioAnalysis;$('#wealthChart').onclick=$('#wealthAnalysis').onclick;$('#chooseImport').onclick=()=>{const input=$('#importFile'),accountId=window.TraceImportCalendar?.selectedAccount?.();if(!accountId||!visibleBankAccounts(me).some(a=>a.id===accountId)){traceNotice('Choisis d’abord le compte bancaire dans Importer.');return;}delete input.dataset.preferredDate;input.dataset.preferredAccount=accountId;input.value='';input.click();};$('#importFile').onchange=e=>{importFile(e.target.files?.[0]);e.target.value='';};if(internationalPreviewMode())window.TraceMonthlyStatementUI?.mount?.({
 host:$('#traceStatementControl'),
 accounts:()=>visibleBankAccounts(me).map(a=>({...a,type:accountType(a),
   currency:window.TraceInternational.currency(a)})),
 transactions:()=>state.transactions,
 amountOnAccount:window.TraceInternational.amountOnAccount,
 currentMonth:()=>activityMonth,
 onOpenActivity:(id,month)=>{
  if(!visibleBankAccounts(me).some(a=>a.id===id))return;
  activityAccountFilter=id;
  activityFilters={category:'all',nature:'all',currency:'all',status:'confirmed'};
  if(/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||'')))activityMonth=month;
  navigate('activity');renderActivity();showTab('transactions');
 }
});document.querySelectorAll('[data-password-target]').forEach(btn=>btn.onclick=()=>{const input=$('#'+btn.dataset.passwordTarget);if(!input)return;const reveal=input.type==='password';input.type=reveal?'text':'password';btn.classList.toggle('active',reveal);btn.setAttribute('aria-pressed',String(reveal));btn.setAttribute('aria-label',reveal?'Masquer le mot de passe':'Afficher le mot de passe');});document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.authTab;$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#cloudLoginForm').classList.toggle('hidden',t!=='login');$('#cloudSignupForm').classList.toggle('hidden',t!=='signup');});$('#cloudLoginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');$('#cloudAuthMessage').textContent='Connexion…';if(btn){btn.disabled=true;btn.textContent='Connexion…';}try{const{data,error}=await client.auth.signInWithPassword({email:$('#cloudLoginEmail').value.trim(),password:$('#cloudLoginPassword').value});if(error)throw error;if(!data?.session)throw new Error('Session non créée');session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Se connecter';}}};$('#cloudSignupForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Création…';}try{const{data,error}=await client.auth.signUp({email:$('#cloudSignupEmail').value.trim(),password:$('#cloudSignupPassword').value,options:{emailRedirectTo:new URL('./index.html',window.location.href).href,data:{display_name:$('#cloudSignupName').value.trim()}}});if(error)throw error;if(data?.session){session=data.session;household=null;await ensureWorkspace(data.session);$('#cloudAuthMessage').textContent='';}else{$('#cloudAuthMessage').textContent='Compte créé. Vérifie ton courriel pour confirmer ton adresse.';}}catch(err){console.error(err);$('#cloudAuthMessage').textContent=authErrorText(err);}finally{if(btn){btn.disabled=false;btn.textContent='Créer mon compte';}}};$$('[data-workspace-tab]').forEach(b=>b.onclick=()=>{const t=b.dataset.workspaceTab;$('#cloudCreateHouseholdForm').classList.toggle('hidden',t!=='create');$('#cloudJoinHouseholdForm').classList.toggle('hidden',t!=='join');});$('#cloudCreateHouseholdForm').onsubmit=async e=>{
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
let checkingHousehold=false;
async function verifyActiveHousehold(){
 if(internationalPreviewMode()||checkingHousehold||!session?.user?.id||!household)return;
 checkingHousehold=true;
 try{
  const {data,error}=await client.from('household_members')
   .select('household_id').eq('user_id',session.user.id).maybeSingle();
  if(!error&&data?.household_id&&data.household_id!==household.id){
   window.location.reload();
  }
 }catch(error){console.info('TRACE: vérification différée de l’espace');}
 finally{checkingHousehold=false;}
}
async function checkCurrentBuild(){
 if(internationalPreviewMode()||versionCheckBusy)return;versionCheckBusy=true;
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
 accounts:()=>visibleBankAccounts(me).map(a=>({id:a.id,name:shortAccountLabel(a),type:accountType(a),currency:window.TraceInternational.currency(a),country:a.country||'CA',opening:openingBoundary(a.id)})),
 movementPreview:movementImpactText,friendLinkCandidates:friendLinkOptions,currentOwner:()=>me,
 smartCardPaymentMatches,smartMatchCardPaymentDraft,
 smartDrafts,smartDuplicateMatches,smartStageRows,smartSaveDraft,smartIgnoreDraft,smartKeepSingleDraft,smartMoveDraftAccount,smartMoveDayDraftsAccount,smartApproveDraft,smartResetDay,smartCreateCategory,
 savingsAccounts:()=>trackedSavingsAccounts(me).map(a=>({id:a.id,name:a.name,ready:isReadySavingsAccount(a),openingDate:a.openingDate})),
 referenceDate:()=>state.household.referenceDate||'',
 month:()=>activityMonth,
 dayTransactions:(accountId,date)=>state.transactions.filter(t=>t.accountId===accountId&&t.date===date).sort((a,b)=>String(b.id).localeCompare(String(a.id))).map(t=>({id:t.id,name:t.name||'',date:t.date,amountCAD:t.amountCAD,type:t.type,status:t.status,
 label:t.type==='transfer'?(t.toAccountId&&accountType(state.accounts.find(a=>a.id===t.toAccountId))==='card'?'Paiement de carte · hors budget':'Transfert · hors budget'):
 t.type==='external_transfer'?(t.transferPurpose==='savings'?'Versement vers CELI · hors dépenses':t.transferPurpose==='friend_payment_settlement'?'Règlement à un proche · déjà compté':'Virement hors budget'):t.type==='external_refund'?(t.transferPurpose==='friend_reimbursement'?'Remboursement d’un proche':t.transferPurpose==='savings_withdrawal'?'Retrait du CELI':'Entrée hors budget'):t.type==='income'?'Revenu':t.type==='refund'?'Remboursement':'Dépense'})),
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
   return t&&t.status==='pending'&&['image','ocr','pdf','csv'].includes(t.source)&&
    Number(t.amountCAD)>0&&/^\d{4}-\d\d-\d\d$/.test(t.date)&&state.accounts.some(a=>a.id===t.accountId)&&
    legacyImportNatureReady(t)&&
    manualCategories(t.type).some(c=>c.id===row.categoryId)&&
    [me,partner,'couple','custom'].includes(row.beneficiary)&&
    (row.beneficiary!=='custom'||(()=>{try{traceCustomShares(Number(t.amountCAD),row.friendsAmount,row.partnerAmount);return true;}catch(e){return false;}})());
  });
  let confirmed=0;
  for(const row of safe){
   const t=state.transactions.find(x=>x.id===row.id&&x.status==='pending');
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
   const matchRecorded=match?.status==='confirmed';
   return{status:!included?'historical':found?(matchRecorded&&found.status==='exact'?'already':'possible'):'missing',
     matchId:match?.id||'',
     matchName:match?.name||'',matchDate:match?.date||'',matchAmount:match?.amountCAD??null,
     matchAccount:match?.accountId?shortAccountLabel(state.accounts.find(a=>a.id===match.accountId)):'',
     matchCategory:state.categories.find(c=>c.id===match?.categoryId)?.name||'Non catégorisée',
     matchSource:match?(matchRecorded?'Activité · opération confirmée':'Activité · à vérifier'):'',
     matchRecorded,matchStatus:found?.status||null,
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
  const bankAccount=state.accounts.find(a=>a.id===accountId);
  const nativeCurrency=window.TraceInternational.currency(bankAccount),quotes=new Map();
  if(nativeCurrency!=='CAD'){
   const toLookup=[...new Set(rows.map(r=>String(r.date||'')).filter(smartStrictDate))];
   for(const day of toLookup)quotes.set(day,await window.TraceInternational.getRate(nativeCurrency,day));
  }
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
   const row=rows[rowIndex];
   const amount=Number(row.amount),date=String(row.date||''),name=String(row.name||'').trim().slice(0,80);
   const kind=String(row.nature||''),nature=window.TraceMovement.get(kind),type=nature?.type||'';
   const bank=state.accounts.find(a=>a.id===accountId),direction=String(row.direction||'');
   if(!smartStrictDate(date)||name.length<2||!(amount>0)||!Number.isFinite(amount)||amount>1e7)
    throw new Error('Ligne incomplète : date, description ou montant');
   if(!nature||nature.legacyOnly||!window.TraceImportGuide.allowed(kind,accountType(bank),direction)||
     nature.direction!==(direction==='in'?1:-1))
    throw new Error('Choisis une Nature du mouvement compatible avec ce compte et le sens bancaire.');
   if(accountType(bank)==='card'&&window.TraceImportGuide.cardStatementSettlementLabel(name))
    throw new Error('Ce paiement de carte doit être rapproché avec le compte courant, sans nouvelle transaction.');
   const probe={date,name,type,bankAmount:amount,amountCAD:amount,accountId};
   if(method==='image')dates.add(date);
   const existing=findSimilarTransaction(probe);
   if(existing?.status==='exact'||csvImportedDuplicate(probe,state.transactions)){duplicates++;continue;}
   if(existing?.status==='possible'&&!row.allowPossibleDuplicate)throw new Error('Correspondance possible dans Trace : '+existing.t.name+' du '+existing.t.date+'. Vérifie-la explicitement avant ajout.');
   const booking=window.TraceInternational.resolveBooking({
    account:bank,bankAmount:amount,date,quote:nativeCurrency==='CAD'?null:quotes.get(date),
    originalCurrency:row.purchaseCurrency||nativeCurrency,
    originalAmount:row.purchaseAmount||null});
   const share=nature.budget==='none'||nature.budget==='income'?
    {beneficiary:me,...traceSplit(me,booking.amountCAD)}:
    traceImportSplit({...row,beneficiary:row.beneficiary||me},{amountCAD:booking.amountCAD});
   const chosenCategory=nature.budget==='none'?'':manualCategories(nature.budget==='income'?'income':'expense').some(c=>c.id===row.categoryId)?row.categoryId:'';
   const tx={id:txDocId(),date,name,type,transferPurpose:nature.purpose||null,
    natureReviewed:row.natureReviewed===true,...booking,
    status:'pending',categoryId:chosenCategory,accountId,payerId:me,...share,
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
    if(internationalPreviewMode()){
     // No Supabase credentials, session, storage or financial database. Values
     // are fictional and reset when the browser reloads this isolated page.
     const fixture=window.TraceInternationalPreviewFixtures;
     state=fixture.create();
     household={id:'trace-demo-only',settings:{...state.household}};
     session={user:{id:'trace-laboratory-fixture',email:'demo@trace.invalid',
      created_at:'2026-10-01T00:00:00Z'}};
     me='la';partner='partner';client=null;
     internationalQuotes={EUR:fixture.quote()};
     bind();
     hideGate();
     renderAll();
     $('#syncLabel').textContent='Démo fictive · aucune sauvegarde';
     $('#brandSubtitle').textContent='5.37.0 · LABORATOIRE';
     window.__TRACE_PREVIEW_STATUS__={boot:'ok',build:window.__TRACE_BUILD__,
      noSupabase:true,fixtureCount:state.transactions.length};
     return;
    }
    bind();
    init();
    setTimeout(checkCurrentBuild,1200);
  }catch(err){
    console.error('Trace startup error',err);
    if(internationalPreviewMode()){
     window.__TRACE_PREVIEW_STATUS__={boot:'error',message:String(err.message||err),noSupabase:true};
     const msg=$('#tracePreviewStatus');
     if(msg)msg.textContent='Erreur de chargement : '+String(err.message||err);
     return;
    }
    showGate('cloudAuthPanel');
    const msg=$('#cloudAuthMessage');
    if(msg)msg.textContent='Trace n’a pas pu démarrer. Recharge la page.';
  }
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkCurrentBuild();verifyActiveHousehold();}});
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootTrace,{once:true});
}else{
  bootTrace();
}
})();
