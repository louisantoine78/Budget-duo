/* TRACE 5.37 — fictional-lab-friendly touch editor for allocated friend shares.
 * Presentation only: bank documents change exclusively via the existing Save validator. */
(function(root){'use strict';
 const money=cents=>(cents/100).toFixed(2).replace('.',',')+' CAD';
 const pennies=n=>{
  const raw=String(n??'').trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return NaN;
  const value=Math.round(Number(raw)*100);
  return Number.isSafeInteger(value)?value:NaN;
 };
 const html=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 function mount({fieldId,singleId,totalId,hostId,initial=[]}){
  const doc=root.document;
  if(!doc)return false;
  const field=doc.getElementById(fieldId),single=doc.getElementById(singleId),
   total=doc.getElementById(totalId),host=doc.getElementById(hostId);
  if(!field||!single||!total||!host)return false;
  let rows=Array.isArray(initial)?initial.map(x=>({name:String(x.name||''),
   amount:String(x.amountCAD??'')})):[];
  if(!rows.length&&String(field.value||'').trim()){
   try{rows=root.TraceMovement.parseFriendShares(field.value)
    .map(x=>({name:x.name,amount:String(x.amountCAD)}));}catch(_){}
  }
  function update(){
   field.value=rows.map(x=>x.name+' : '+x.amount).join('\n');
   const status=host.querySelector('[data-debtor-balance]');
   if(!status)return;
   if(!rows.length){
    status.textContent='';
    status.classList.toggle('trace-debtor-complete',false);
    status.classList.toggle('trace-debtor-warning',false);
    return;
   }
   const expected=pennies(total.value);
   const values=rows.map(x=>pennies(x.amount));
   const validAmounts=values.every(x=>Number.isSafeInteger(x)&&x>0);
   const spent=validAmounts?values.reduce((sum,x)=>sum+x,0):NaN;
   const names=rows.map(x=>String(x.name||'').trim().replace(/\s+/g,' '));
   const keys=names.map(x=>x.toLocaleLowerCase('fr'));
   const missingName=names.some(x=>!x||x.length>45);
   const duplicateName=new Set(keys).size!==keys.length;
   const singleConflict=Boolean(String(single.value||'').trim());
   const complete=rows.length>=2&&!singleConflict&&!missingName&&!duplicateName&&
    validAmounts&&Number.isSafeInteger(expected)&&Number.isSafeInteger(spent)&&
    expected>0&&expected===spent;
   const delta=expected-spent;
   const detail=singleConflict?'Choisis soit un prénom, soit plusieurs proches.':
    duplicateName?'Un même prénom apparaît plusieurs fois.':
    missingName?'Indique le prénom de chaque proche.':
    !validAmounts?'Indique des montants positifs, avec deux décimales maximum.':
    rows.length<2?'Pour une seule personne, utilise le champ prénom.':
    complete?'Répartition complète':
    delta<0?'Dépassement : '+money(-delta):
    'Reste à attribuer : '+money(delta);
   status.textContent=!Number.isSafeInteger(expected)||expected<=0||!Number.isSafeInteger(spent)?
    'Indique la part totale des amis et des montants valides. · '+detail:
    'Réparti : '+money(spent)+' sur '+money(expected)+' · '+detail;
   status.classList.toggle('trace-debtor-complete',complete);
   status.classList.toggle('trace-debtor-warning',!complete&&
    (singleConflict||missingName||duplicateName||!validAmounts||delta<0));
  }
  function render(){
   host.innerHTML='<div class="trace-debtor-heading"><strong>Plusieurs proches</strong>'+
    '<button type="button" class="secondary trace-debtor-add" data-debtor-add>'+
    (rows.length?'+ Ajouter un proche':'Répartir entre plusieurs proches')+'</button></div>'+
    (rows.length?'<div class="trace-debtor-list">'+rows.map((x,i)=>
     '<div class="trace-debtor-row">'+
      '<label>Prénom<input class="input" type="text" maxlength="45" autocomplete="off"'+
       ' data-debtor-name="'+i+'" placeholder="Camille" value="'+html(x.name)+'"></label>'+
      '<label>Montant (CAD)<input class="input" type="text" inputmode="decimal" maxlength="16" autocomplete="off"'+
       ' data-debtor-amount="'+i+'" placeholder="0,00" value="'+html(x.amount)+'"></label>'+
      '<button type="button" class="secondary trace-debtor-remove" data-debtor-remove="'+i+'"'+
       ' aria-label="Retirer '+html(x.name||'ce proche')+'">Retirer</button></div>').join('')+'</div>':
     '<p class="trace-debtor-hint">Une seule personne ? Saisis son prénom au-dessus. Sinon, répartis le montant entre plusieurs personnes.</p>')+
    '<p class="trace-debtor-balance" data-debtor-balance role="status" aria-live="polite"></p>';
   host.querySelector('[data-debtor-add]').onclick=()=>{
    if(rows.length>=13)return;
    if(!rows.length){
     const old=single.value.trim();
     rows=old?[{name:old,amount:total.value||''},{name:'',amount:''}]:
      [{name:'',amount:''},{name:'',amount:''}];
     if(old)single.value='';
    }else rows.push({name:'',amount:''});
    render();
   };
   host.querySelectorAll('[data-debtor-name]').forEach(el=>{
    el.oninput=()=>{rows[Number(el.dataset.debtorName)].name=el.value;update();};
   });
   host.querySelectorAll('[data-debtor-amount]').forEach(el=>{
    el.oninput=()=>{rows[Number(el.dataset.debtorAmount)].amount=el.value;update();};
   });
   host.querySelectorAll('[data-debtor-remove]').forEach(el=>{
    el.onclick=()=>{
     rows.splice(Number(el.dataset.debtorRemove),1);
     if(rows.length===1&&rows[0].name.trim()&&
        pennies(rows[0].amount)===pennies(total.value)){
      single.value=rows[0].name.trim();rows=[];
     }
     render();
    };
   });
   update();
  }
  total.addEventListener('input',update);
  single.addEventListener('input',update);
  render();
  return true;
 }
 root.TraceFriendDebtorUI=Object.freeze({mount});
})(typeof window!=='undefined'?window:globalThis);
