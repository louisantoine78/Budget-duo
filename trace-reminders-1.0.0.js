/* TRACE contextual reminders: in-app only, never web push or background alarms. */
(()=>{'use strict';
 const $=s=>document.querySelector(s);
 const DAY=86400000,PERIODS={daily:1,two_days:2,off:0};
 let lastContext=null;
 const read=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,value)}catch(e){}};
 const frequencyKey=id=>'trace:reminders:freq:'+id;
 const shownKey=id=>'trace:reminders:last-shown:'+id;
 const frequency=id=>{
  const value=read(frequencyKey(id));
  return Object.hasOwn(PERIODS,value)?value:'two_days';
 };
 function latestActivity(ctx){
  const ownIds=new Set((ctx.accounts||[]).filter(a=>a.owner===ctx.owner).map(a=>a.id));
  const moments=[
   Date.parse(ctx.createdAt||'')||Date.now(),
   ...(ctx.days||[]).filter(d=>d.owner===ctx.owner&&ownIds.has(d.accountId)).map(d=>Date.parse(d.lastImportedAt||'')||0),
   ...(ctx.imports||[]).filter(d=>ownIds.has(d.accountId)).map(d=>Date.parse(d.createdAt||'')||0)
  ];
  return Math.max(...moments);
 }
 function close(){
  $('#traceReminderCard')?.remove();
 }
 function refresh(ctx){
  if(ctx)lastContext=ctx;
  ctx=lastContext;
  const home=$('[data-page="home"]');
  if(!ctx?.userId||!home){close();return;}
  const days=PERIODS[frequency(ctx.userId)];
  const now=Date.now();
  const recent=latestActivity(ctx);
  const lastShown=Number(read(shownKey(ctx.userId))||0);
  if(!days||now-recent<days*DAY||now-lastShown<days*DAY){close();return;}
  let card=$('#traceReminderCard');
  if(card)return;
  card=document.createElement('section');
  card.id='traceReminderCard';
  card.className='trace-reminder-card';
  card.setAttribute('role','status');
  card.innerHTML=
   '<div class="trace-reminder-icon" aria-hidden="true">↻</div>'+
   '<div class="trace-reminder-copy"><strong>Ton budget est-il à jour ?</strong>'+
   '<p>As-tu importé tes dernières opérations ? Quelques instants suffisent pour garder TRACE à jour.</p>'+
   '<div class="trace-reminder-actions"><button class="primary" type="button" id="traceReminderImport">Importer</button>'+
   '<button class="secondary" type="button" id="traceReminderDismiss">Plus tard</button></div></div>';
  home.insertBefore(card,home.firstChild);
  write(shownKey(ctx.userId),String(now));
  $('#traceReminderImport').addEventListener('click',()=>{
   close();
   $('[data-nav="activity"]')?.click();
   $('[data-tab="import"]')?.click();
  });
  $('#traceReminderDismiss').addEventListener('click',close);
 }
 function setFrequency(userId,choice){
  if(!userId||!Object.hasOwn(PERIODS,choice))return false;
  write(frequencyKey(userId),choice);
  close();
  refresh();
  return true;
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.TraceReminders={refresh,frequency,setFrequency,latestActivity};
})();