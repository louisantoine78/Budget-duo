/* TRACE 5.37 — fictional-lab-friendly touch editor for allocated friend shares.
 * Presentation only: bank documents change exclusively via the existing Save validator. */
(function(root){'use strict';
 const money=cents=>(cents/100).toFixed(2).replace('.',',')+' CAD';
 const pennies=n=>Math.round(Number(n)*100);
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
   if(!rows.length){status.textContent='';return;}
   const expected=String(total.value).trim()===''?NaN:pennies(total.value);
   const spent=rows.reduce((sum,x)=>sum+pennies(x.amount||0),0);
   const complete=rows.length>=2&&rows.every(x=>x.name.trim()&&x.amount!==''&&
    Number(x.amount)>0)&&Number.isSafeInteger(expected)&&Number.isSafeInteger(spent)&&expected===spent;
   const delta=expected-spent;
   status.textContent=!Number.isSafeInteger(expected)||!Number.isSafeInteger(spent)?
    'Indique la part totale des amis et les montants des proches.':
    'Réparti : '+money(spent)+' sur '+money(expected)+' · '+
     (complete?'Répartition complète':delta<0?'Dépassement : '+money(-delta):
      'Reste à attribuer : '+money(delta));
   if(String(single.value||'').trim())status.textContent='Choisis soit un prénom, soit plusieurs proches.';
   status.classList.toggle('trace-debtor-complete',complete&&!single.value.trim());
   status.classList.toggle('trace-debtor-warning',delta<0||Boolean(single.value.trim()));
  }
  function render(){
   host.innerHTML='<div class="trace-debtor-heading"><strong>Plusieurs proches</strong>'+
    '<button type="button" class="secondary trace-debtor-add" data-debtor-add>'+
    (rows.length?'+ Ajouter un proche':'Répartir entre plusieurs proches')+'</button></div>'+
    (rows.length?'<div class="trace-debtor-list">'+rows.map((x,i)=>
     '<div class="trace-debtor-row">'+
      '<label>Prénom<input class="input" type="text" maxlength="45" autocomplete="off"'+
       ' data-debtor-name="'+i+'" placeholder="Camille" value="'+html(x.name)+'"></label>'+
      '<label>Montant (CAD)<input class="input" type="number" inputmode="decimal" step=".01"'+
       ' min=".01" data-debtor-amount="'+i+'" placeholder="0,00" value="'+html(x.amount)+'"></label>'+
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
