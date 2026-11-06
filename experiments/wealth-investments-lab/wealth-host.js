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
