/* TRACE 1.1 — responsive horizontal navigation, preserving native swipe-back and editing. */
(()=>{'use strict';
 const order=['home','budget','activity','wealth'];
 const $=s=>document.querySelector(s);
 let tracking=null,ignoreClickUntil=0;
 function modalOpen(){
  const cls=document.body.classList;
  return ['sheet-open','trace-guide-open','trace-install-dialog-open',
   'trace-email-verified-open'].some(c=>cls.contains(c))||
   Boolean(document.querySelector('.sheet-backdrop.open'));
 }
 function excluded(target){
  if(!target?.closest)return true;
  if(target.closest('input,textarea,select,label,[contenteditable],[role="slider"],'+
   '#importCalendar,.trace-daily-calendar,.trace-import-calendar,.trace-smart-inbox,'+
   '.trace-smart-overlay,.trace-guide,.sheet,.tabs,.seg,.segmented-control,'+
   'canvas,.carousel,[data-no-swipe],[data-swipe-lock]'))return true;
  // Keep horizontal galleries, tables and other manually scrolling elements independent.
  let ancestor=target;
  while(ancestor&&ancestor!==document.body){
   if(ancestor.scrollWidth>ancestor.clientWidth+24){
    const overflow=window.getComputedStyle?.(ancestor)?.overflowX||'';
    if(/auto|scroll/.test(overflow))return true;
   }
   ancestor=ancestor.parentElement;
  }
  return false;
 }
 document.addEventListener('touchstart',e=>{
  tracking=null;
  if(e.touches.length!==1||modalOpen()||$('#app')?.classList.contains('cloud-locked'))return;
  const target=e.target,t=e.touches[0];
  if(!target?.closest?.('#app .page.active')||excluded(target))return;
  const width=window.innerWidth;
  // iOS system back/forward gestures have priority at the edges.
  if(t.clientX<26||t.clientX>width-26)return;
  tracking={id:t.identifier,x:t.clientX,y:t.clientY,time:Date.now(),axis:null};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!tracking)return;
  if(e.touches.length!==1){tracking=null;return}
  const t=e.touches[0];
  if(t.identifier!==tracking.id){tracking=null;return}
  const dx=t.clientX-tracking.x,dy=t.clientY-tracking.y;
  if(!tracking.axis&&(Math.abs(dx)>10||Math.abs(dy)>10)){
   tracking.axis=Math.abs(dx)>Math.abs(dy)*1.15?'horizontal':'vertical';
  }
  if(tracking.axis==='vertical'||Math.abs(dy)>Math.abs(dx)*1.35)tracking=null;
 },{passive:true});
 document.addEventListener('touchend',e=>{
  const start=tracking;tracking=null;
  if(!start||modalOpen()||e.changedTouches.length!==1)return;
  const t=e.changedTouches[0];
  if(t.identifier!==start.id)return;
  const dx=t.clientX-start.x,dy=t.clientY-start.y;
  const required=Math.max(65,Math.min(92,window.innerWidth*.17));
  if(Math.abs(dx)<required||Math.abs(dx)<Math.abs(dy)*1.25||
   Math.abs(dy)>100||Date.now()-start.time>1300)return;
  const index=order.indexOf($('.page.active')?.dataset.page);
  if(index<0)return;
  const targetPage=order[index+(dx<0?1:-1)];
  const button=targetPage&&$('[data-nav="'+targetPage+'"]');
  if(!button)return;
  // Cancel the synthetic tap on a card/button after a genuine swipe.
  if(e.cancelable)e.preventDefault();
  ignoreClickUntil=Date.now()+350;
  button.click();
 },{passive:false});
 document.addEventListener('click',e=>{
  if(Date.now()<=ignoreClickUntil&&e.isTrusted&&e.target.closest?.('#app .page.active')){
   e.preventDefault();e.stopImmediatePropagation();
  }
 },true);
 document.addEventListener('touchcancel',()=>{tracking=null;},{passive:true});
})();