/* TRACE 5.36.4 — Read-only detail for one reconciled checking→card transfer.
   The statement line is evidence only, never a second ledger movement. */
(function(root){'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
 const amount=v=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
 const when=v=>{
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));
  if(!match)return v?esc(v):'Date non renseignée';
  const d=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);
  if(d.getFullYear()!==Number(match[1])||d.getMonth()!==Number(match[2])-1||d.getDate()!==Number(match[3]))
   return esc(v);
  return esc(d.toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric'}));
 };
 function render({transfer,evidence=[],fromName='',toName=''}={}){
  if(!transfer||!Array.isArray(evidence)||!evidence.length)return'';
  const sum=Number(transfer.amountCAD)||0,matchTotal=evidence.reduce((n,e)=>n+(Number(e.amountCAD??e.amount)||0),0),
   hasMismatch=Math.abs(Math.round(matchTotal*100)-Math.round(sum*100))>1,
   count=evidence.length,
   title=esc(transfer.name||'Règlement de carte');
  return '<div class="trace-card-payment-detail">'+
   '<div class="trace-card-payment-hero">'+
    '<span class="trace-card-payment-status">✓ Rapproché · '+count+' ligne'+(count>1?'s':'')+' du relevé</span>'+
    '<strong>'+amount(sum)+'</strong>'+
    '<span class="trace-card-payment-subtitle">'+title+' · '+when(transfer.date)+'</span>'+
   '</div>'+
   '<section class="trace-card-payment-section" aria-label="Parcours du paiement">'+
    '<h3>Le parcours de ton paiement</h3>'+
    '<div class="trace-card-payment-flow">'+
     '<div class="trace-card-payment-account"><span class="trace-card-payment-icon" aria-hidden="true">↗</span>'+
      '<div><strong>'+esc(fromName||'Compte courant')+'</strong><small>Argent sorti du compte</small></div>'+
      '<b>−'+amount(sum)+'</b></div>'+
     '<div class="trace-card-payment-flowline" aria-hidden="true"><span>↓</span></div>'+
     '<div class="trace-card-payment-account"><span class="trace-card-payment-icon" aria-hidden="true">✓</span>'+
      '<div><strong>'+esc(toName||'Carte de crédit')+'</strong><small>Dette de carte réduite</small></div>'+
      '<b>−'+amount(sum)+'</b></div>'+
    '</div>'+
    '<p class="trace-card-payment-explain">Il s’agit d’un transfert entre tes comptes, pas d’un nouvel achat. La réduction de dette est déjà prise en compte lors du paiement initial.</p>'+
   '</section>'+
   '<section class="trace-card-payment-section" aria-label="Impact sur les finances">'+
    '<h3>Impact sur tes finances</h3>'+
    '<div class="trace-card-payment-impact">'+
     '<div><span>Nouvelle dépense dans ton budget</span><b>0,00 $</b></div>'+
     '<div><span>Nouveau revenu</span><b>0,00 $</b></div>'+
     '<div><span>Variation du patrimoine net</span><b>0,00 $</b></div>'+
    '</div>'+
    '<p class="trace-card-payment-explain">Le rapprochement lui-même n’ajoute aucun mouvement bancaire : il confirme que la ligne du relevé de carte correspond au paiement du compte courant.</p>'+
   '</section>'+
   '<section class="trace-card-payment-section" aria-label="Justificatif du rapprochement">'+
    '<h3>Preuve du rapprochement</h3>'+
    evidence.map(e=>'<div class="trace-card-payment-evidence">'+
      '<div><strong>'+esc(e.name||'Paiement reçu sur la carte')+'</strong>'+
      '<small>'+when(e.date)+' · '+esc(toName||'Carte de crédit')+'</small></div>'+
      '<b>+'+amount(e.amountCAD??e.amount)+'</b></div>').join('')+
    (hasMismatch?'<p class="trace-card-payment-warning" role="status">Attention : le total des lignes rapprochées ne correspond pas exactement au montant du transfert. Vérifie les relevés.</p>':'')+
   '</section>'+
   '<button type="button" class="primary full" id="keepCardEvidence">Fermer</button>'+
   '<details class="trace-card-payment-correction">'+
    '<summary>Corriger ce rapprochement</summary>'+
    '<p>Si la mauvaise ligne a été associée, tu peux retirer le lien. Le paiement de carte restera enregistré et les lignes du relevé redeviendront à vérifier, sans recalculer ton budget.</p>'+
    '<button type="button" class="secondary full" id="unlinkCardEvidence">Retirer le rapprochement</button>'+
    '<div class="trace-card-payment-confirm" id="traceUnlinkConfirm" hidden>'+
     '<p>Confirmer le retrait du lien entre les deux relevés ? Le paiement lui-même ne sera pas supprimé.</p>'+
     '<button type="button" class="secondary full" id="traceUnlinkNow">Confirmer le retrait</button>'+
     '<button type="button" class="secondary full" id="traceUnlinkCancel">Annuler</button>'+
    '</div>'+
   '</details>'+
  '</div>';
 }
 root.TraceCardPaymentDetail=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
