/* TRACE International home account selector / read-only global liquidity. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render({host,accounts=[],owner,mainId,estimates={},rates={},balanceNode,checkingNode,cardNode,onSelect,requestRate}={}){
 if(!host||!root.TraceInternational)return;
 // The summary is inside a clickable balance card; changing the account must not open settings.
 host.onclick=event=>event.stopPropagation();
 const I=root.TraceInternational,checking=accounts.filter(a=>a.owner===owner&&a.type==='checking'&&!a.archived);
 if(!checking.length){host.innerHTML='';return;}
 const snap=I.snapshot({accounts,owner,mainId,estimates,fxRates:rates}),cur=snap.currency,multi=snap.balances.length>1||cur!=='CAD';
 host.innerHTML='<div class="trace-intl-top"><label for="traceIntlPrimary">Compte principal</label>'+
 '<select class="input" id="traceIntlPrimary">'+checking.map(a=>
  '<option value="'+esc(a.id)+'"'+(a.id===snap.main?.id?' selected':'')+'>'+
  esc(a.name)+' · '+I.currency(a)+'</option>').join('')+'</select></div>'+
 '<p class="trace-intl-primary-explain">Solde du compte principal et de ses cartes liées, en '+cur+'.</p>'+
 (multi?'<details class="trace-intl-details"><summary>Voir tous mes comptes et ma trésorerie globale</summary>'+
  '<div class="trace-intl-accounts">'+snap.balances.map(a=>
   '<div class="trace-intl-row"><span>'+esc(a.name)+' <small>'+a.nativeCurrency+'</small></span><b>'+
   (a.balance===null?'Solde inconnu':I.money(a.balance,a.nativeCurrency))+'</b></div>').join('')+'</div>'+
  '<p class="trace-intl-grand">'+(snap.complete?
   'Situation nette estimée · '+I.money(snap.globalCAD,'CAD'):
   'Situation globale à compléter · soldes, taux ou cartes à vérifier')+'</p>'+
  '<p class="trace-intl-foot">'+[...new Set(snap.balances.filter(a=>rates[a.nativeCurrency]).map(a=>rates[a.nativeCurrency].date))].map(esc).join(' · ')+
   ' · Taux indicatifs de la Banque du Canada, non contractuels. L’épargne et les placements sont dans Patrimoine.</p>'+
 '</details>':'');
 if(snap.main){
  if(balanceNode)balanceNode.textContent=snap.net===null?(snap.cardsToReview.length||snap.ambiguousCards.length?'À vérifier':'À configurer'):I.money(snap.net,cur);
  if(checkingNode)checkingNode.textContent=snap.checking===null?'—':I.money(snap.checking,cur);
  if(cardNode)cardNode.textContent=snap.card===null?(snap.cardsToReview.length?'Avoir de carte à vérifier':'—'):snap.card<0?
   I.money(Math.abs(snap.card),cur)+' de dette':snap.card>0?'Avoir estimé '+I.money(snap.card,cur):I.money(0,cur);
 }
 const sel=host.querySelector('#traceIntlPrimary');
 sel.onchange=()=>{if(typeof onSelect==='function')onSelect(sel.value);};
 const missingCurrencies=[...new Set(snap.balances.filter(a=>a.nativeCurrency!=='CAD'&&!rates[a.nativeCurrency]).map(a=>a.nativeCurrency))];
 if(missingCurrencies.length&&typeof requestRate==='function')requestRate(missingCurrencies);
}
root.TraceInternationalUI=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
