/* TRACE — secure shared-space departure and household erasure v1.0.0.
   Both members confirm with their own password; server validates both identities atomically. */
(()=>{'use strict';
let client=null, session=null, action=null, busy=false, opened=false;
const $=s=>document.querySelector(s);
const config={
 exit:{
  title:'Quitter TRACE et supprimer mon espace',
  word:'QUITTER',
  button:'Je confirme mon départ de TRACE',
  consent:'Je confirme le départ de mon partenaire',
  intro:'Cette demande met fin à votre foyer commun. Ton partenaire récupère uniquement ses comptes et opérations personnelles dans un nouvel espace. Tes données personnelles ne sont pas reprises dans un nouvel espace TRACE.',
  warning:'L’ancien historique partagé est conservé dans une archive inaccessible depuis vos comptes. Il n’est pas intégralement effacé : des informations relatives à vos anciennes opérations communes peuvent y rester. Ton identité de connexion Supabase est conservée.'
 },
 delete_household:{
  title:'Supprimer notre foyer TRACE',
  word:'SUPPRIMER',
  button:'J’approuve la suppression du foyer',
  consent:'J’approuve la suppression de notre foyer',
  intro:'Cette action supprime définitivement les budgets, comptes, transactions, imports et réglages du foyer partagé. Vous devrez chacun créer un nouvel espace TRACE pour utiliser à nouveau l’application.',
  warning:'Aucun historique du foyer ne sera conservé dans TRACE. Cette suppression est irréversible après le second accord. Les identités de connexion Supabase sont préservées, notamment pour PickPoint.'
 }
};
function say(message,error=false){
 const node=$('#traceChangeFeedback');if(node){node.textContent=message;node.dataset.kind=error?'error':'info';}
}
function lock(value){
 busy=value;
 for(const name of ['#traceChangeApprove','#traceChangeRefresh','#traceChangeCancel']){
  const node=$(name);if(node)node.disabled=value;
 }
}
function textUpdate(){
 const btn=$('#traceChangeApprove');
 if(btn&&!busy)btn.disabled=$('#traceChangeWord')?.value.trim()!==config[action].word||!$('#traceChangePassword')?.value;
}
function draw(state){
 if(!opened||!$('#traceChangeFeedback'))return;
 const request=state?.state==='pending';
 if(request&&state.action!==action){
  say('Une autre demande de gestion du foyer est déjà en attente. Annule-la depuis le parcours concerné avant de continuer.',true);
  $('#traceChangeApproveWrap')?.classList.add('hidden');
  $('#traceChangeCancel')?.classList.add('hidden');
  return;
 }
 const mine=Boolean(state?.my_approved),other=Boolean(state?.partner_approved);
 $('#traceChangeApproveWrap')?.classList.toggle('hidden',mine||!['ready','pending'].includes(state?.state));
 $('#traceChangeCancel')?.classList.toggle('hidden',!request);
 if(action==='exit'&&request&&!state.requester_is_me){
  $('#traceChangeSubmitText').textContent=config.exit.consent;
  $('#traceChangeWarningAdditional').textContent='Attention : c’est ton partenaire qui quittera TRACE. Tu conserveras tes propres données personnelles dans un nouvel espace.';
 }else{
  $('#traceChangeSubmitText').textContent=config[action].button;
  $('#traceChangeWarningAdditional').textContent='';
 }
 if(state?.state==='ready')say('Aucune demande en cours. Chaque membre doit confirmer depuis son compte.');
 else if(request&&mine&&!other)say('Ton accord est enregistré. En attente du second membre. Aucune donnée n’a encore été effacée ni déplacée.');
 else if(request&&other&&!mine)say('Ton partenaire a déjà approuvé. Ta confirmation déclenchera immédiatement cette opération.');
 else if(request)say('La demande attend la confirmation des deux personnes.');
 else say('Cette opération nécessite un foyer composé de deux membres.',true);
 textUpdate();
}
async function status(){
 if(!client||busy)return;
 lock(true);
 try{
  const {data,error}=await client.rpc('trace_household_change_status');
  if(error)throw error;
  draw(data||{state:'ready'});
 }catch(e){say('Impossible de vérifier le statut : '+String(e.message||e),true);}
 finally{lock(false);textUpdate();}
}
async function respond(confirm){
 if(!client||busy)return;
 if(confirm&&($('#traceChangeWord')?.value.trim()!==config[action].word||!$('#traceChangePassword')?.value)){
  say('Saisis le mot demandé et ton mot de passe.',true);return;
 }
 lock(true);
 try{
  if(confirm){
   say('Vérification de ton mot de passe…');
   const email=session?.user?.email;
   if(!email)throw Error('Session expirée. Reconnecte-toi.');
   const {error}=await client.auth.signInWithPassword({email,password:$('#traceChangePassword').value});
   if(error)throw Error('Mot de passe incorrect ou session expirée.');
  }
  say(confirm?'Confirmation en cours…':'Annulation en cours…');
  const {data,error}=await client.rpc('trace_household_change_respond',{p_action:action,p_confirm:confirm});
  if(error)throw error;
  if($('#traceChangePassword'))$('#traceChangePassword').value='';
  if(data?.state==='completed'){
   say('Action confirmée par les deux membres. Actualisation de ton espace…');
   window.location.replace('./index.html?traceSpaceChanged=1');
   return;
  }
  if(data?.state==='cancelled'){
   if($('#traceChangeWord'))$('#traceChangeWord').value='';
   draw({state:'ready'});say('La demande est annulée. Aucune donnée n’a été supprimée.');
   return;
  }
  if(data?.state==='pending'){
   const res=await client.rpc('trace_household_change_status');
   if(res.error)throw res.error;
   draw(res.data||{state:'ready'});
   return;
  }
  throw Error('Réponse inattendue. Actualise le statut avant de recommencer.');
 }catch(e){say('Opération non confirmée : '+String(e.message||e),true);}
 finally{lock(false);textUpdate();}
}
function open(ctx,selected){
 if(!config[selected])return;
 action=selected;client=ctx.client;session=ctx.session;opened=true;
 if(ctx.memberCount!==2){
  ctx.openSheet(config[action].title,'<p class="empty-note">Ce parcours est réservé aux foyers comptant deux membres.</p>'+ctx.settingsBack());
  ctx.bindSettingsBack();return;
 }
 const c=config[action];
 ctx.openSheet(c.title,
  '<div class="trace-separation-intro"><strong>Deux validations obligatoires</strong>'+
  '<p>'+c.intro+'</p>'+
  '<p><b>Important :</b> '+c.warning+'</p>'+
  '<p id="traceChangeWarningAdditional"></p></div>'+
  '<div class="trace-separation-status" id="traceChangeFeedback" role="status" aria-live="polite">Vérification du statut…</div>'+
  '<div class="trace-delete-form" id="traceChangeApproveWrap">'+
   '<label for="traceChangeWord">Pour confirmer, écris '+c.word+'</label>'+
   '<input id="traceChangeWord" class="input" placeholder="'+c.word+'" autocomplete="off" spellcheck="false">'+
   '<label for="traceChangePassword">Ton mot de passe TRACE</label>'+
   '<input id="traceChangePassword" class="input" type="password" autocomplete="current-password" placeholder="Mot de passe">'+
   '<button type="button" class="primary full trace-delete-danger" id="traceChangeApprove" disabled><span id="traceChangeSubmitText">'+c.button+'</span></button>'+
  '</div>'+
  '<div class="trace-separation-actions">'+
   '<button type="button" class="secondary full" id="traceChangeRefresh">Actualiser le statut</button>'+
   '<button type="button" class="secondary full hidden" id="traceChangeCancel">Annuler la demande</button>'+
  '</div>'+ctx.settingsBack());
 $('#traceChangeWord')?.addEventListener('input',textUpdate);
 $('#traceChangePassword')?.addEventListener('input',textUpdate);
 $('#traceChangeApprove')?.addEventListener('click',()=>respond(true));
 $('#traceChangeCancel')?.addEventListener('click',()=>respond(false));
 $('#traceChangeRefresh')?.addEventListener('click',status);
 ctx.bindSettingsBack();
 status();
}
window.TraceHouseholdChange={open};
})();