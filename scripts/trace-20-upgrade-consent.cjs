'use strict';
/*
 * TRACE 2.0 candidate update-consent adapter.
 * Isolated QA only. No DOM integration or production registration yet.
 * All financial write safety signals MUST be supplied by the real app
 * before this is ever connected to a user-facing action.
 */
(function(root,make){
 const api=make();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Trace20UpgradeConsent=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function verifiedIdle(state){
  return state&&state.verified===true&&state.durable===true&&
   ['pendingWrites','pendingSync','pendingImports','unsavedDrafts'].every(k=>
    Number.isSafeInteger(state[k])&&state[k]===0);
 }
 async function requestActivation(options={}){
  const {registration,readSafety,askConsent,cache,MessageChannelCtor,
   timeoutMs=6500,isOnline}=options;
  if(!registration||!registration.waiting)return{status:'no-update'};
  if(typeof cache!=='string'||!/^trace-shell-v5\.37\.0:[a-f0-9]{24}$/.test(cache))
   return{status:'blocked',reason:'unknown-version'};
  if(typeof readSafety!=='function'||typeof askConsent!=='function')
   return{status:'blocked',reason:'safety-or-consent-adapter-missing'};
  if(typeof isOnline!=='function'||isOnline()!==true)
   return{status:'blocked',reason:'offline-or-unknown'};
  if(!verifiedIdle(await readSafety()))
   return{status:'blocked',reason:'writes-or-drafts-pending'};
  const waiting=registration.waiting;
  if(await askConsent()!==true)return{status:'declined'};
  // Re-evaluate immediately after the dialog: saving/sync may have begun.
  if(waiting!==registration.waiting||
     isOnline()!==true||!verifiedIdle(await readSafety()))
   return{status:'blocked',reason:'state-changed-after-consent'};
  if(typeof MessageChannelCtor!=='function')
   return{status:'blocked',reason:'no-response-channel'};
  const channel=new MessageChannelCtor();
  let timer;
  try{
   const response=new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(Error('worker-timeout')),timeoutMs);
    channel.port1.onmessage=e=>resolve(e.data);
    channel.port1.onmessageerror=()=>reject(Error('unreadable-worker-response'));
    if(typeof channel.port1.start==='function')channel.port1.start();
   });
   waiting.postMessage({type:'TRACE_2_0_ACTIVATE',
    cache,userConfirmed:true},[channel.port2]);
   const answer=await response;
   if(answer?.type==='TRACE_2_0_BLOCKED')
    return{status:'blocked',reason:answer.reason||'worker-declined'};
   if(answer?.type!=='TRACE_2_0_ACCEPTED'||answer.cache!==cache)
    return{status:'blocked',reason:'unexpected-worker-response'};
   // Not equal to a completed upgrade: wait for the active SW and reload.
   return{status:'activation-requested'};
  }catch{
   return{status:'blocked',reason:'worker-no-ack'};
  }finally{
   clearTimeout(timer);
   channel.port1.close();
   channel.port2.close();
  }
 }
 return{requestActivation,verifiedIdle};
});
