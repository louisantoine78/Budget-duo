/* TRACE 2.0 – account password recovery; uses the existing Supabase Auth client.
   No financial writes, no privileged keys, no tokens or passwords in logs. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const hash=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
 const query=new URLSearchParams(location.search);
 let recovering=hash.get('type')==='recovery'||query.get('type')==='recovery';
 let client=null,gate=null,wired=false,mode='login',completed=false;
 const info=(text)=>{const node=$('cloudAuthMessage');if(node)node.textContent=text;};
 const views={login:'cloudLoginForm',signup:'cloudSignupForm',request:'traceResetRequestForm',confirm:'traceResetConfirmForm'};
 const titles={login:'Se connecter',signup:'Créer un compte',request:'Réinitialiser le mot de passe',confirm:'Choisir un nouveau mot de passe'};
 function show(next){
  if(!views[next])return;
  mode=next;
  for(const [key,id] of Object.entries(views))$(id)?.classList.toggle('hidden',key!==next);
  const tabs=document.querySelector('#cloudAuthPanel .cloud-tabs');
  tabs?.classList.toggle('hidden',next==='request'||next==='confirm');
  if($('cloudAuthTitle'))$('cloudAuthTitle').textContent=titles[next];
  if(next==='request'&&$('traceResetEmail')&&!$('traceResetEmail').value)
   $('traceResetEmail').value=String($('cloudLoginEmail')?.value||'').trim();
  if(next==='confirm'&&typeof gate==='function')gate('cloudAuthPanel');
  info('');
 }
 function setup(auth,showGate){
  if(!auth||wired)return;
  client=auth;gate=showGate;wired=true;
  $('traceForgotPassword')?.addEventListener('click',()=>show('request'));
  document.querySelectorAll('[data-recovery-back]').forEach(b=>b.addEventListener('click',()=>{
   if(recovering)return;
   show('login');
  }));
  const request=$('traceResetRequestForm');
  if(request)request.addEventListener('submit',async e=>{
   e.preventDefault();
   const btn=request.querySelector('button[type="submit"]');
   const email=String($('traceResetEmail')?.value||'').trim();
   if(!email)return;
   if(btn){btn.disabled=true;btn.textContent='Envoi…';}
   info('');
   try{
    // Matches the exact same redirect path already used by TRACE sign-up.
    const redirectTo=new URL('./index.html',location.href).href;
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    info('Si cette adresse est associée à un compte TRACE, tu recevras un lien. Vérifie aussi les indésirables.');
   }catch(error){
    const message=String(error?.message||'').toLowerCase();
    info(message.includes('rate')||message.includes('limit')?
     'Trop de demandes. Réessaie dans quelques minutes.':
     'Envoi impossible pour le moment. Vérifie ta connexion et réessaie.');
   }finally{
    if(btn){btn.disabled=false;btn.textContent='Recevoir un lien de réinitialisation';}
   }
  });
  const confirm=$('traceResetConfirmForm');
  if(confirm)confirm.addEventListener('submit',async e=>{
   e.preventDefault();
   if(!recovering||completed){info('Ouvre d’abord le lien reçu par courriel.');return;}
   const password=String($('traceNewPassword')?.value||'');
   const again=String($('traceConfirmNewPassword')?.value||'');
   if(password.length<8){info('Utilise au moins 8 caractères.');return;}
   if(password!==again){info('Les deux mots de passe sont différents.');return;}
   const btn=confirm.querySelector('button[type="submit"]');
   if(btn){btn.disabled=true;btn.textContent='Enregistrement…';}
   try{
    const {data,error:sessionError}=await client.auth.getSession();
    if(sessionError||!data?.session?.access_token)throw Error('invalid-recovery-session');
    const {error}=await client.auth.updateUser({password});
    if(error)throw error;
    completed=true;
    $('traceNewPassword').value='';
    $('traceConfirmNewPassword').value='';
    try{history.replaceState(null,'',location.pathname);}catch{}
    // Sign out of the temporary recovery session; the person signs back in.
    await client.auth.signOut();
    recovering=false;
    show('login');
    info('Mot de passe modifié. Connecte-toi maintenant avec ton nouveau mot de passe.');
   }catch(error){
    const message=String(error?.message||'').toLowerCase();
    info(message.includes('expired')||message.includes('invalid')||message.includes('session')?
     'Lien expiré ou invalide. Demande un nouveau lien depuis « Mot de passe oublié ? ».':
     'Modification impossible. Vérifie ta connexion ou demande un nouveau lien.');
   }finally{
    if(btn){btn.disabled=false;btn.textContent='Enregistrer le nouveau mot de passe';}
   }
  });
  if(recovering)show('confirm');
 }
 function onAuthEvent(event,session){
  if(event==='PASSWORD_RECOVERY'){
   recovering=true;
   show('confirm');
   return true;
  }
  if(recovering&&session){
   show('confirm');
   return true;
  }
  return false;
 }
 return window.TracePasswordRecovery=Object.freeze({
  setup,onAuthEvent,holdWorkspace:()=>recovering
 });
})();