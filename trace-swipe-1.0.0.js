/* TRACE tab swipes: only deliberate horizontal gestures in primary page content. */
(()=>{'use strict';
 const order=['home','budget','activity','wealth'];
 let touch=null;
 const $=s=>document.querySelector(s);
 const disallowTarget=el=>Boolean(el?.closest(
  'button,a,input,textarea,select,label,[contenteditable="true"],'+
  '.tabs,.segmented,.seg,.scroll-x,.scrollable,.carousel,canvas,svg,'+
  '#importCalendar,.trace-smart-inbox,.trace-daily-calendar,.trace-guide,.sheet,'+
  '.trace-bank-settings,.trace-import-preview,[data-no-swipe]'
 ));
 function locked(){
  const b=document.body.classList;
  return b.contains('sheet-open')||b.contains('trace-guide-open')||
   b.contains('trace-install-dialog-open')||b.contains('trace-email-verified-open');
 }
 document.addEventListener('touchstart',e=>{
  touch=null;
  if(e.touches.length!==1||locked()||$('#app')?.classList.contains('cloud-locked'))return;
  const t=e.touches[0],el=e.target;
  if(!el?.closest?.('#app .page.active')||disallowTarget(el))return;
  // Reserve iOS/Android system back gestures at the screen edges.
  if(t.clientX<32||t.clientX>window.innerWidth-32)return;
  touch={x:t.clientX,y:t.clientY,time:Date.now(),id:t.identifier,canceled:false};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!touch||e.touches.length!==1){touch=null;return;}
  const t=e.touches[0];
  if(Math.abs(t.clientY-touch.y)>40&&Math.abs(t.clientY-touch.y)>Math.abs(t.clientX-touch.x)*0.7){
   touch=null;
  }
 },{passive:true});
 document.addEventListener('touchend',e=>{
  const first=touch;touch=null;
  if(!first||locked()||e.changedTouches.length!==1)return;
  const t=e.changedTouches[0];
  if(t.identifier!==first.id)return;
  const dx=t.clientX-first.x,dy=t.clientY-first.y;
  if(Math.abs(dx)<95||Math.abs(dx)<Math.abs(dy)*1.55||Math.abs(dy)>65||Date.now()-first.time>1000)return;
  const page=$('.page.active')?.dataset.page;
  const index=order.indexOf(page);
  if(index<0)return;
  const target=order[index+(dx<0?1:-1)];
  if(target)$('[data-nav="'+target+'"]')?.click();
 },{passive:true});
 document.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
})();