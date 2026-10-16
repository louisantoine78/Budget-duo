/* TRACE separation 1.0 — strict personal-only copy, requiring both members' approvals. */
(()=>{'use strict';
 const $=s=>document.querySelector(s);
 let current=null,busy=false;
 function feedback(message,kind='info'){
  const area=$('#traceSeparationFeedback');
  if(area){area.textContent=message;area.dataset.kind=kind;}
 }
 function setBusy(value){
  busy=value;
  ['#traceSeparationApprove','#traceSeparationCancel','#traceSeparationRefresh']
   .forEach(sel=>{const el=$(sel);if(el)el.disabled=value;});
 }
 function updateFields(){
  if(busy)return;
  const btn=$('#traceSeparationApprove');
  if(btn)btn.disabled=$('#traceSeparationWord')?.value.trim()!=='SÉPARER'||!$('#traceSeparationPassword')?.value;
 }
 function redraw(state){
  if(!$('#traceSeparationFeedback'))return;
  const waiting=state.state==='pending';
  const mine=Boolean(state.my_approved);
  const theirs=Boolean(state.partner_approved);
  $('#traceSeparationApproveWrap')?.classList.toggle('hidden',mine||state.state==='solo'||state.state==='no_space');
  $('#traceSeparationCancel')?.classList.toggle('hidden',!waiting);
  let message='';
  if(state.state==='ready')message='Aucune demande en cours. Chaque membre doit approuver depuis son propre compte.';
  else if(state.state==='pending'&&mine&&!theirs)message='Ton accord est enregistré. En attente de la validation de ton partenaire. Aucune donnée n’a encore été déplacée.';
  else if(state.state==='pending'&&theirs&&!mine)message='Ton partenaire a donné son accord. Tu peux confirmer à ton tour pour créer les deux espaces.';
  else if(state.state==='pending')message='Accords en cours. Actualise le statut si ton partenaire vient de valider.';
  else message='La séparation demande un foyer composé de deux personnes.';
  feedback(message);
  updateFields();
 }
 async function getStatus(){
  if(!current||busy)return;
  setBusy(true);
  try{
   const {data,error}=await current.client.rpc('trace_separation_status');
   if(error)throw error;
   redraw(data||{state:'ready'});
  }catch(error){feedback('Impossible de vérifier la demande. Réessaie.','error');console.error(error);}
  finally{setBusy(false);updateFields();}
 }
 async function approve(){
  if(!current||busy)return;
  const word=$('#traceSeparationWord')?.value.trim(),password=$('#traceSeparationPassword')?.value;
  if(word!=='SÉPARER'||!password){feedback('Saisis SÉPARER et ton mot de passe pour confirmer.','error');return;}
  setBusy(true);feedback('Vérification de ton identité…');
  try{
   const email=current.session?.user?.email;
   if(!email)throw Error('Session expirée.');
   const auth=await current.client.auth.signInWithPassword({email,password});
   if(auth.error||!auth.data?.session)throw Error('Mot de passe incorrect.');
   feedback('Enregistrement de ton accord…');
   const {data,error}=await current.client.rpc('trace_separation_respond',{p_confirm:true});
   if(error)throw error;
   $('#traceSeparationPassword').value='';
   if(data?.state==='completed'){
    feedback('Les deux accords sont validés. Ouverture de ton nouvel espace personnel…','success');
    window.location.replace('./index.html?traceSeparated=1');
    return;
   }
   if(data?.state==='pending'){
    await getStatusWhenFree();
   }else throw Error('Réponse inattendue. Actualise le statut.');
  }catch(error){
   feedback('Aucune séparation effectuée : '+String(error?.message||'erreur inconnue'),'error');
  }finally{setBusy(false);updateFields();}
 }
 async function getStatusWhenFree(){
  const {data,error}=await current.client.rpc('trace_separation_status');
  if(error)throw error;
  redraw(data||{state:'ready'});
 }
 async function cancel(){
  if(!current||busy)return;
  setBusy(true);feedback('Annulation en cours…');
  try{
   const {data,error}=await current.client.rpc('trace_separation_respond',{p_confirm:false});
   if(error)throw error;
   $('#traceSeparationWord').value='';
   $('#traceSeparationPassword').value='';
   redraw({state:'ready'});
   feedback('Demande annulée. Aucun compte ni aucune opération n’a été déplacé.','success');
  }catch(error){feedback('Annulation impossible. Réessaie.','error');}
  finally{setBusy(false);updateFields();}
 }
 function open(context){
  current=context;
  if(context.memberCount!==2){
   context.openSheet('Séparer notre foyer',
    '<div class="empty-note">La séparation concerne uniquement un foyer comprenant deux membres.</div>'+
    context.settingsBack());
   context.bindSettingsBack();return;
  }
  context.openSheet('Séparer notre foyer',
   '<div class="trace-separation-intro"><strong>Deux espaces, chacun ses données</strong>'+
    '<p>Chaque personne conserve uniquement ses comptes, investissements, budgets personnels et opérations dont elle est à la fois le payeur et le bénéficiaire.</p>'+
    '<p><b>Exclus :</b> dépenses de couple, répartitions mixtes, transferts entre partenaires, captures importées et rapprochements bancaires.</p>'+
    '<p>L’ancien historique commun sera archivé sans être copié dans les nouveaux espaces. Il ne sera plus accessible depuis leurs comptes.</p>'+
    '<p><b>Après la séparation :</b> chacun devra renseigner ses soldes bancaires de référence pour obtenir des calculs fiables.</p></div>'+
   '<div class="trace-separation-status" id="traceSeparationFeedback" role="status" aria-live="polite">Vérification du statut…</div>'+
   '<div class="trace-delete-form" id="traceSeparationApproveWrap">'+
    '<label for="traceSeparationWord">Pour donner ton accord, écris SÉPARER</label>'+
    '<input class="input" id="traceSeparationWord" placeholder="SÉPARER" autocomplete="off" spellcheck="false">'+
    '<label for="traceSeparationPassword">Confirme ton mot de passe</label>'+
    '<input class="input" id="traceSeparationPassword" type="password" autocomplete="current-password" placeholder="Mot de passe">'+
    '<button class="primary full" type="button" id="traceSeparationApprove" disabled>J’approuve la séparation de notre foyer</button>'+
   '</div>'+
   '<div class="trace-separation-actions">'+
    '<button class="secondary full" id="traceSeparationRefresh" type="button">Actualiser le statut</button>'+
    '<button class="secondary full hidden" id="traceSeparationCancel" type="button">Annuler la demande</button>'+
   '</div>'+
   context.settingsBack());
  $('#traceSeparationWord')?.addEventListener('input',updateFields);
  $('#traceSeparationPassword')?.addEventListener('input',updateFields);
  $('#traceSeparationApprove')?.addEventListener('click',approve);
  $('#traceSeparationRefresh')?.addEventListener('click',getStatus);
  $('#traceSeparationCancel')?.addEventListener('click',cancel);
  context.bindSettingsBack();
  getStatus();
 }
 window.TraceSeparation={open};
})();