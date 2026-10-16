/* TRACE - Verified email onboarding. No tokens are stored or logged. */
(()=>{'use strict';
 const $=selector=>document.querySelector(selector);
 const query=new URLSearchParams(window.location.search);
 const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
 // Capture Supabase verification callback before the auth SDK consumes its URL parameters.
 const fromSignup=(hash.get('type')==='signup'&&hash.has('access_token'))||
   (query.has('code')&&(!query.has('type')||query.get('type')==='signup'))||
   (query.get('type')==='signup'&&(query.has('token_hash')||query.has('code')));
 let shown=false,previousFocus=null;
 function close(){
  const dialog=$('#traceEmailVerified');
  if(!dialog)return;
  dialog.classList.add('hidden');
  document.body.classList.remove('trace-email-verified-open');
  if(previousFocus?.isConnected)previousFocus.focus();
 }
 function show(){
  if(shown)return;
  const dialog=$('#traceEmailVerified');
  if(!dialog)return;
  shown=true;
  previousFocus=document.activeElement;
  dialog.classList.remove('hidden');
  document.body.classList.add('trace-email-verified-open');
  $('#traceEmailVerifiedContinue')?.focus();
 }
 function handleSession(authSession){
  if(!fromSignup||shown||!authSession?.user?.email_confirmed_at||!authSession?.access_token)return false;
  show();return true;
 }
 $('#traceEmailVerifiedContinue')?.addEventListener('click',close);
 $('#traceEmailVerified')?.addEventListener('click',e=>{if(e.target.id==='traceEmailVerified')close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#traceEmailVerified')?.classList.contains('hidden'))close();});
 window.TraceEmailConfirmation={handleSession};
})();