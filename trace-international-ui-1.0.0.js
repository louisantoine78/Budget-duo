/* TRACE International 5.37 premium one-tap account viewing (read-only). */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Read-only display selection. Never stored in household settings.
let viewState=null;
function render({host,accounts=[],owner,mainId,estimates={},rates={},balanceNode,checkingNode,cardNode,
 warningNode,badgeNode,onSelect,requestRate}={}){
 if(!host||!root.TraceInternational)return;
 // The summary is inside a clickable balance card; changing the account must not open settings.
 host.onclick=event=>event.stopPropagation();
 const I=root.TraceInternational,checking=accounts.filter(a=>a.owner===owner&&a.type==='checking'&&!a.archived);
 if(!checking.length){
  // No active checking account can safely back this cash summary. On
  // archive/account removal reset every previously rendered financial
  // figure instead of leaving a misleading cached balance on the home card.
  host.innerHTML='';
  if(balanceNode)balanceNode.textContent='À configurer';
  if(checkingNode)checkingNode.textContent='—';
  if(cardNode)cardNode.textContent='—';
  if(warningNode){warningNode.hidden=true;warningNode.textContent='';}
  if(badgeNode&&viewState?.owner===owner&&
     badgeNode.textContent==='Consultation · compte secondaire')
   badgeNode.textContent=viewState.primaryBadge||'';
  viewState=null;return;
 }
 const primarySnap=I.snapshot({accounts,owner,mainId,estimates,fxRates:rates});
 const primaryId=primarySnap.main?.id;
 if(!viewState||viewState.owner!==owner||viewState.primaryId!==primaryId||
    !checking.some(a=>a.id===viewState.accountId))
  viewState={owner,primaryId,accountId:primaryId,primaryBadge:badgeNode?.textContent||''};
 const selectedId=viewState.accountId;
 const snap=I.snapshot({accounts,owner,mainId:selectedId,estimates,fxRates:rates});
 const cur=snap.currency,multi=snap.balances.length>1||cur!=='CAD';
 host.innerHTML=(checking.length>1?
  '<div class="trace-intl-view-group"><span class="trace-intl-view-label">Consulter un solde</span>'+
  '<div class="trace-intl-switch" role="group" aria-label="Consulter les soldes par compte">'+
  checking.map(a=>'<button type="button" class="trace-intl-chip'+(a.id===selectedId?' is-active':'')+
   '" data-trace-view-account="'+esc(a.id)+'" aria-pressed="'+(a.id===selectedId?'true':'false')+'">'+
   esc(a.name||'Compte')+'</button>').join('')+'</div>'+
  '<p class="trace-intl-view-note">Consultation uniquement · aucun changement de compte principal</p></div>':'')+
 '<details class="trace-intl-primary-control"><summary><span>★ Compte principal</span><small>Modifier</small></summary>'+
 '<div class="trace-intl-top"><label for="traceIntlPrimary">Choisir avec confirmation</label>'+
 '<select class="input" id="traceIntlPrimary">'+checking.map(a=>
  '<option value="'+esc(a.id)+'"'+(a.id===primaryId?' selected':'')+'>'+
  esc(a.name)+' · '+I.currency(a)+'</option>').join('')+'</select></div></details>'+
 '<p class="trace-intl-primary-explain">'+(selectedId===primaryId?'Solde du compte principal':'Solde du compte consulté')+' et de ses cartes liées, en '+esc(cur)+'.</p>'+
 (multi?'<details class="trace-intl-details"><summary>Voir tous mes comptes et ma trésorerie globale</summary>'+
  '<div class="trace-intl-accounts">'+snap.balances.map(a=>{
   const quote=rates[a.nativeCurrency];
   const conversion=a.nativeCurrency==='CAD'?'':a.cad===null?
    'Conversion CAD à vérifier · taux manquant ou montant non valorisable':
    '≈ '+esc(I.money(a.cad,'CAD'))+' · '+
    (quote?.date?'taux du '+esc(quote.date):'date du taux inconnue')+
    (quote?.source?' · '+esc(quote.source):'');
   return '<div class="trace-intl-row"><span class="trace-intl-account-label">'+esc(a.name)+
    ' <small>'+esc(a.nativeCurrency)+'</small>'+
    (conversion?'<small class="trace-intl-account-conversion">'+conversion+'</small>':'')+
    '</span><b>'+(a.balance===null?'Solde inconnu':esc(I.money(a.balance,a.nativeCurrency)))+
    '</b></div>';
  }).join('')+'</div>'+
  '<p class="trace-intl-grand">'+(snap.complete?
   'Situation nette estimée · '+I.money(snap.globalCAD,'CAD'):
   'Situation globale à compléter · soldes, taux ou cartes à vérifier')+'</p>'+
  '<p class="trace-intl-foot">'+[...new Set(snap.balances.filter(a=>rates[a.nativeCurrency]).map(a=>rates[a.nativeCurrency].date))].map(esc).join(' · ')+
   ' · Taux indicatifs (Banque du Canada ou saisie manuelle), non contractuels. L’épargne et les placements sont dans Patrimoine.</p>'+
 '</details>':'');
 if(snap.main){
  if(balanceNode)balanceNode.textContent=snap.net===null?(snap.cardsToReview.length||snap.ambiguousCards.length||snap.mixedLinkedCurrencies.length?'À vérifier':'À configurer'):I.money(snap.net,cur);
  if(checkingNode)checkingNode.textContent=snap.checking===null?'—':I.money(snap.checking,cur);
  if(cardNode)cardNode.textContent=snap.card===null?(snap.cardsToReview.length?'Avoir de carte à vérifier':'—'):snap.card<0?
   I.money(Math.abs(snap.card),cur)+' de dette':snap.card>0?'Avoir estimé '+I.money(snap.card,cur):I.money(0,cur);
 }
 const linkedReview=snap.cardsToReview.some(a=>a.settlementAccountId===selectedId||
   (!a.settlementAccountId&&snap.balances.length===2&&a.owner===owner));
 if(warningNode){
  warningNode.hidden=!linkedReview;
  warningNode.textContent=linkedReview?
   'Avoir de carte à vérifier : cet avoir n’est pas ajouté au solde disponible.':'';
 }
 if(badgeNode){
  if(selectedId!==primaryId){
   if(badgeNode.textContent!=='Consultation · compte secondaire')
    viewState.primaryBadge=badgeNode.textContent;
   badgeNode.textContent='Consultation · compte secondaire';
  }else badgeNode.textContent=viewState.primaryBadge||badgeNode.textContent;
 }
 const sel=host.querySelector('#traceIntlPrimary');
 if(sel)sel.onchange=()=>{
  if(typeof onSelect==='function'&&checking.some(a=>a.id===sel.value))onSelect(sel.value);
 };
 host.querySelectorAll('[data-trace-view-account]').forEach(button=>{
  button.onclick=event=>{
   event.stopPropagation();
   const id=button.dataset.traceViewAccount;
   if(!checking.some(a=>a.id===id)||id===viewState?.accountId)return;
   viewState={...viewState,owner,primaryId,accountId:id};
   render({host,accounts,owner,mainId,estimates,rates,balanceNode,checkingNode,cardNode,
    warningNode,badgeNode,onSelect,requestRate});
   const selected=[...host.querySelectorAll('[data-trace-view-account]')].find(x=>x.dataset.traceViewAccount===id);
   selected?.focus?.({preventScroll:true});
   selected?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
  };
 });
 // A malformed or unusable cached quote must not suppress a request for
 // a usable CAD valuation. Unknown bank balances do not trigger FX fetches.
 const missingCurrencies=[...new Set(snap.balances.filter(a=>
  a.nativeCurrency!=='CAD'&&a.balance!==null&&a.cad===null).map(a=>a.nativeCurrency))];
 if(missingCurrencies.length&&typeof requestRate==='function')requestRate(missingCurrencies);
}
root.TraceInternationalUI=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
