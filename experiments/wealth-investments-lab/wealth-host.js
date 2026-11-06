/* TRACE Patrimoine-only mount demonstration.
 * Only this isolated page calls the opt-in integration contract. */
(()=>{'use strict';
 const module=window.TraceWealthIntegrationContract;
 const popup=document.getElementById('wlWealthDetail');
 const frame=document.getElementById('wlPortalFrame');
 const close=document.getElementById('wlPortalClose');
 let origin=null;
 const result=module.mount(document,{
  enabled:true,
  onOpen(){
   origin=document.activeElement;
   if(!frame.getAttribute('src'))frame.setAttribute('src',frame.dataset.src);
   popup.showModal();
   close.focus();
  }
 });
 if(!result.mounted)throw Error('Impossible de préparer cet aperçu : '+result.reason);
 close.addEventListener('click',()=>popup.close());
 popup.addEventListener('click',event=>{if(event.target===popup)popup.close();});
 popup.addEventListener('close',()=>{origin?.focus?.();});
 // A reversible illustration of how existing TRACE documents can be reused.
 // These are made-up records, never user data or a Supabase import.
 const compatibility=document.getElementById('wlLegacyDemoToggle');
 compatibility?.addEventListener('toggle',()=>{
  if(!compatibility.open)return;
  const report=document.getElementById('wlLegacyDemoReport');
  const bridge=window.TraceWealthLegacyBridge;
  if(!bridge){report.textContent='Adaptateur de diagnostic indisponible.';return;}
  const account={id:'simulation-portefeuille',name:'Compte test',type:'PEA',
   currency:'EUR',owner:'la'};
  const operations=[
   {id:'simulation-versement',accountId:account.id,type:'deposit',date:'2026-11-01',
    amount:1000,bankAccountId:'simulation-banque'},
   {id:'simulation-achat',accountId:account.id,type:'buy',date:'2026-11-02',
    symbol:'DEMO',quantity:2,unitPrice:120,fee:2},
   {id:'simulation-cours',accountId:account.id,type:'quote',date:'2026-11-03',
    symbol:'DEMO',unitPrice:130}
  ];
  const result=bridge.build(account,operations);
  if(result.status!=='reconciliation-required'){
   report.textContent='Ce scénario nécessite une vérification complémentaire.';return;
  }
  const matching=bridge.reconcile(result,{
   cashCents:75800,positions:[{symbol:'DEMO',quantityMicro:2000000,costBasisCents:24200}]
  });
  const lines=[
   '1 compte d’investissement existant conservé, sans créer de deuxième enveloppe.',
   result.operationCount+' opérations fictives reliées à leurs identifiants d’origine.',
   'Virement bancaire identifié, sans écriture supplémentaire dans Activité.',
   result.quoteCandidates.length+' cotation mise en attente de vérification de la source.',
   'Exemple de rapprochement : '+(matching.matched?'quantités, PRU et espèces concordants.':'écarts à corriger.')
  ];
  report.replaceChildren();
  const title=document.createElement('strong');
  title.textContent='Contrôle de reprise — exemple fictif';
  report.appendChild(title);
  const list=document.createElement('ul');
  for(const msg of lines){const li=document.createElement('li');li.textContent=msg;list.appendChild(li);}
  report.appendChild(list);
  const foot=document.createElement('p');
  foot.textContent='Ce test local ne consulte aucun compte et ne valide pas encore ton PEA réel. La reprise demandera un relevé Fortuneo et ton accord.';
  report.appendChild(foot);
 });
 const scope=document.getElementById('wealthScope');
 scope.addEventListener('click',event=>{
  const button=event.target.closest('button[data-scope]');
  if(!button)return;
  scope.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===button));
  // UI-only demonstration: no account, total, bank or financial scope is loaded.
  document.getElementById('wealthSub').textContent=
   button.dataset.scope==='couple'?
   'Aperçu du contexte Couple · aucune donnée réelle chargée':
   'Liquidités, épargne, placements et dettes';
 });
})();
