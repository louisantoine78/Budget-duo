/* TRACE 5.37.19 — explanatory choices are UI only: they never post money.
 * Every choice maps to an existing checked nature; real account rules and
 * manual validation remain in the existing import/edit pipelines. */
(function(root){'use strict';
 const options={
  'checking:in':[
   ['income','Mon salaire ou un revenu','C’est réellement mon argent'],
   ['employer_reimbursement','Mon employeur me rembourse','Frais avancés pour le travail'],
   ['pass_through_reimbursement','Cet argent est pour un proche','Je dois le lui reverser'],
   ['friend_reimbursement','Un proche me rembourse','Je lui avais avancé des frais'],
   ['refund','Un achat m’est remboursé','Retour d’un commerçant'],
   ['external_refund','Autre argent reçu','Hors budget']
  ],
  'checking:out':[
   ['expense','C’est une dépense personnelle','À compter dans mon budget'],
   ['professional_spend','J’avance des frais professionnels','À récupérer auprès de mon employeur'],
   ['card_payment','Je rembourse ma carte suivie','Transfert vers une carte dans TRACE'],
   ['external_card_payment','Je paie une autre carte','Carte non suivie dans TRACE'],
   ['pass_through_payout','Je reverse de l’argent à un proche','Cet argent lui était destiné'],
   ['friend_payment_expense','Je rembourse ma part à quelqu’un','Cette somme est ma dépense'],
   ['external_transfer','Autre virement','Ni dépense ni revenu']
  ],
  'card:out':[
   ['expense','Achat personnel par carte','À inclure dans mon budget'],
   ['professional_spend','Achat pour mon employeur','Avance remboursable, hors budget']
  ],
  'card:in':[
   ['refund','Un commerçant me rembourse','Retour ou annulation d’achat'],
   ['card_payment_received','J’ai payé ma carte','À rapprocher du compte courant']
  ]
 };
 function choices(accountType,direction,allowed){
  const scope=options[String(accountType)+':'+String(direction)]||[];
  const ids=Array.isArray(allowed)?new Set(allowed):null;
  return scope.filter(([id])=>(!ids||ids.has(id))&&
   (!root.TraceImportGuide||root.TraceImportGuide.allowed(id,accountType,direction)))
   .map(([id,label,detail])=>({id,label,detail}));
 }
 function escape(str){return String(str??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
 function mount(host,{accountType,direction,selected='',allowed=[],onChoose}={}){
  if(!host)return;
  const items=choices(accountType,direction,allowed);
  const popular=new Set(items.map(x=>x.id));
  const custom=selected&&!popular.has(selected);
  const already=custom?root.TraceMovement?.get?.(selected)?.label||'Autre nature choisie':'';
  host.innerHTML='<div class="trace-plain-question">Qu’est-ce qui s’est passé ?</div>'+
   '<div class="trace-plain-options" role="group" aria-label="Choisir ce que représente le mouvement">'+
   items.map(x=>'<button type="button" class="trace-plain-choice" data-trace-nature="'+escape(x.id)+'" aria-pressed="'+(selected===x.id?'true':'false')+'">'+
    '<strong>'+escape(x.label)+'</strong><small>'+escape(x.detail)+'</small></button>').join('')+
   '</div>'+(custom?'<p class="trace-plain-other">Nature précise sélectionnée : '+escape(already)+'</p>':'');
  host.querySelectorAll('[data-trace-nature]').forEach(btn=>btn.addEventListener('click',()=>{
   const id=btn.dataset.traceNature;
   if(items.some(x=>x.id===id)&&typeof onChoose==='function')onChoose(id);
  }));
 }
 root.TraceMovementQuestions=Object.freeze({choices,mount});
})(typeof window!=='undefined'?window:globalThis);
