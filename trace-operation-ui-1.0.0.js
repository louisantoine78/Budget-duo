/* TRACE 5.34.0 — Single presentation vocabulary shared by manual entry, import and editors.
   Presentation only: accounting engine, category allocation and persistence stay with existing modules. */
(function(root){
 'use strict';
 const names=Object.freeze({
  account:'Compte bancaire',
  nature:'Nature du mouvement',
  description:'Description',
  amount:'Montant',
  date:'Date de l’opération',
  category:'Catégorie budgétaire',
  allocation:'Pour qui ?',
  target:'Compte destinataire',
  impact:'Aperçu de l’impact'
 });
 const steps=Object.freeze({
  account:'Compte et nature',
  details:'Détails de l’opération',
  allocation:'Catégorie et répartition',
  additional:'Informations complémentaires',
  impact:'Aperçu de l’impact'
 });
 function escape(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
   .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 }
 function kindsFor(accountType,direction){
  const M=root.TraceMovement,G=root.TraceImportGuide;
  return M.kinds.filter(k=>!k.legacyOnly&&G.allowed(k.id,accountType,direction|| (k.direction===1?'in':'out')));
 }
 function options(kinds,selected='',opts={}){
  const M=root.TraceMovement;
  const list=(kinds||[]).filter(k=>k&&!k.legacyOnly);
  const placeholder=opts.placeholder===false?'':'<option value="">'+escape(opts.placeholder||'Choisir la nature du mouvement')+'</option>';
  return placeholder+M.families.map(f=>{
   const values=list.filter(k=>k.family===f.id);
   if(!values.length)return '';
   return '<optgroup label="'+escape(f.label)+'">'+values.map(k=>'<option value="'+escape(k.id)+'"'+(k.id===selected?' selected':'')+'>'+escape(k.label)+'</option>').join('')+'</optgroup>';
  }).join('');
 }
 function heading(index,title,subtitle,id){
  return '<div class="trace-edit-card-head"><span class="trace-edit-card-index" aria-hidden="true">'+escape(index)+'</span>'+
   '<div><h3'+(id?' id="'+escape(id)+'"':'')+'>'+escape(title)+'</h3>'+(subtitle?'<p>'+escape(subtitle)+'</p>':'')+'</div></div>';
 }
 function describe(kind){return root.TraceMovement.get(kind)?.help||'Choisis la nature qui représente ce mouvement.';}

 function labelFor(id,title){
  const target=root.document.getElementById(id);
  if(!target)return null;
  const label=[...target.closest('.sheet')?.querySelectorAll('label')||[]].find(x=>x.htmlFor===id)||
   (target.previousElementSibling?.matches('label')?target.previousElementSibling:null);
  if(label&&title)label.textContent=title;
  return label;
 }
 function section(num,title,subtitle){
  const el=root.document.createElement('section');
  el.className='trace-edit-card';
  el.innerHTML=heading(num,title,subtitle)+'<div class="trace-edit-fields"></div>';
  return el;
 }
 function fieldPair(id,content,title){
  const input=root.document.getElementById(id);
  if(!input)return;
  const label=labelFor(id,title);
  const wrap=input.closest('.trace-edit-control')||input;
  if(label&&label!==wrap)content.appendChild(label);
  content.appendChild(wrap);
 }
 function enhanceTransaction(){
  const doc=root.document,rootForm=doc.querySelector('#sheetBackdrop .trace-edit-layout');
  if(!rootForm||!doc.getElementById('txType')||rootForm.dataset.unified==='yes')return;
  rootForm.dataset.unified='yes';
  const panels=[...rootForm.querySelectorAll(':scope > .trace-edit-card')];
  if(panels.length<3)return;
  const [first,second,third]=panels;
  const firstFields=first.querySelector('.trace-edit-fields'),
   secondFields=second.querySelector('.trace-edit-fields'),
   thirdFields=third.querySelector('.trace-edit-fields');
  const accountLabel=labelFor('txAccount',names.account);
  const accountControl=doc.getElementById('txAccount').closest('.trace-edit-control');
  if(accountLabel&&accountControl)firstFields.prepend(accountLabel,accountControl);
  const nameLabel=labelFor('txName',names.description);
  const nameControl=doc.getElementById('txName').closest('.trace-edit-control');
  if(nameLabel&&nameControl)secondFields.prepend(nameLabel,nameControl);
  const catLabel=labelFor('txCategory',names.category),catCtrl=doc.getElementById('txCategory')?.closest('.trace-edit-control');
  if(catLabel&&catCtrl)thirdFields.prepend(catLabel,catCtrl);
  first.querySelector('h3').textContent=steps.account;
  second.querySelector('h3').textContent=steps.details;
  third.querySelector('h3').textContent=steps.allocation;
  labelFor('txType',names.nature);
  labelFor('txDate',names.date);
  const type=doc.getElementById('txType'),current=type.value;
  // The transaction editor refreshes this list after setting its bank account and original direction.
  // Do not replace it here with the former three-item menu.
  type.value=current;
  const typeControl=type.closest('.trace-edit-control');
  if(typeControl&&!doc.getElementById('txNatureHelp')){
   const tip=doc.createElement('p');
   tip.id='txNatureHelp';tip.className='trace-movement-help trace-edit-context-note';
   tip.setAttribute('aria-live','polite');
   typeControl.after(tip);
  }
  const link=doc.getElementById('txOtherMovement');
  if(link){
   // The complete nature selector now includes transfers, payments and savings.
   // Keep the legacy element for its existing event binding, but hide the duplicate route.
   link.hidden=true;
   link.setAttribute('aria-hidden','true');
   link.tabIndex=-1;
   link.style.display='none';
  }
 }
 function enhanceBankMovement(){
  const doc=root.document,form=doc.querySelector('#sheetBackdrop .trace-bank-edit-layout');
  if(!form||form.dataset.unified==='yes')return;
  form.dataset.unified='yes';
  const panels=[...form.querySelectorAll(':scope > .trace-edit-card')];
  if(panels.length<2)return;
  const first=panels[0],second=panels[1];
  const firstFields=first.querySelector('.trace-edit-fields');
  const accLabel=labelFor('smartMovementFrom',names.account);
  const accCtrl=doc.getElementById('smartMovementFrom')?.closest('.trace-edit-control');
  if(accLabel&&accCtrl)firstFields.prepend(accLabel,accCtrl);
  const family=doc.getElementById('smartMovementFamily');
  if(family){
   const ctrl=family.closest('.trace-edit-control'),lab=labelFor('smartMovementFamily');
   if(ctrl)ctrl.hidden=true;
   if(lab)lab.hidden=true;
   family.tabIndex=-1;family.setAttribute('aria-hidden','true');
  }
  labelFor('smartMovementType',names.nature);
  first.querySelector('h3').textContent=steps.account;
  second.querySelector('h3').textContent=steps.details;
  labelFor('smartMovementDate',names.date);
 }
 function enhanceManual(){
  const doc=root.document,back=doc.getElementById('sheetBackdrop');
  const account=doc.getElementById('manualTxAccount');
  if(!back||!account||back.classList.contains('trace-premium-manual'))return;
  const hero=back.querySelector('.trace-manual-hero'),fields=back.querySelector('.trace-manual-fields');
  if(!hero||!fields)return;
  const parent=hero.parentElement;
  const layout=doc.createElement('div');layout.className='trace-edit-layout trace-manual-unified';
  hero.replaceWith(layout);
  const lead=doc.createElement('p');lead.className='trace-edit-lead';
  lead.textContent='Choisis le compte et la nature du mouvement, puis vérifie l’impact avant d’enregistrer.';
  layout.appendChild(lead);
  const one=section('01',steps.account,'Quel compte et quel mouvement ?');
  const two=section('02',steps.details,'Description, montant et date');
  const three=section('03',steps.allocation,'Selon la nature choisie');
  three.id='manualExtraSection';
  const oneBody=one.querySelector('.trace-edit-fields'),twoBody=two.querySelector('.trace-edit-fields'),
   threeBody=three.querySelector('.trace-edit-fields');
  fieldPair('manualTxAccount',oneBody,names.account);
  fieldPair('manualKind',oneBody,names.nature);
  const help=doc.getElementById('manualKindHelp');if(help)oneBody.appendChild(help);
  fieldPair('manualTxName',twoBody,names.description);
  const moneyRow=fields.querySelector('.manual-money-row');if(moneyRow)twoBody.appendChild(moneyRow);
  const named=[['manualCategoryWrap'],['manualWhoWrap'],['manualFriendsGroup'],['manualTargetWrap'],['manualSavingsWrap'],['manualFriendLink']];
  named.forEach(([id])=>{const el=doc.getElementById(id);if(el)threeBody.appendChild(el)});
  const whoLabel=doc.querySelector('#manualWhoWrap label');if(whoLabel)whoLabel.textContent=names.allocation;
  const impact=doc.createElement('section');impact.className='trace-edit-impact trace-bank-impact';
  impact.innerHTML='<div class="trace-edit-impact-head"><span class="trace-edit-impact-symbol" aria-hidden="true">↗</span><div><h3>'+names.impact+'</h3></div></div>';
  const preview=doc.getElementById('manualMovementImpact');if(preview){preview.classList.add('trace-bank-impact-summary');impact.appendChild(preview)}
  layout.append(one,two,three,impact);
  const error=doc.getElementById('manualMovementError');if(error)layout.appendChild(error);
  const footer=doc.createElement('div');footer.className='trace-edit-actions';
  const save=doc.getElementById('saveManualTx');if(save){save.classList.add('trace-edit-save');footer.appendChild(save)}
  const secondary=doc.createElement('div');secondary.className='trace-edit-actions-secondary';
  const cancel=doc.getElementById('cancelManualTx');if(cancel)secondary.appendChild(cancel);
  layout.append(secondary,footer);
  const families=doc.getElementById('manualFamilies');if(families){families.hidden=true;families.setAttribute('aria-hidden','true')}
  fields.remove();
  const controls=[
   ['manualTxAccount','select'],['manualKind','select'],['manualTxName','text'],
   ['manualTxAmount','money'],['manualTxDate','date'],
   ['manualTxCategory','select'],['manualTxBeneficiary','select'],
   ['manualTarget','select'],['manualSavings','select'],['manualRelatedExpense','select']
  ];
  controls.forEach(([id,kind])=>{
   const input=doc.getElementById(id);if(!input||input.closest('.trace-edit-control'))return;
   const wrap=doc.createElement('div');wrap.className='trace-edit-control trace-edit-'+kind+'-control';
   input.replaceWith(wrap);wrap.appendChild(input);
   if(kind==='money'){
    const currency=doc.createElement('span');currency.className='trace-edit-currency';
    currency.textContent='CAD';currency.setAttribute('aria-hidden','true');wrap.appendChild(currency);
   }
   if(kind==='date'){
    const display=doc.createElement('span');display.className='trace-edit-date-display';
    display.setAttribute('aria-hidden','true');
    const icon=doc.createElement('span');icon.className='trace-edit-date-icon';icon.setAttribute('aria-hidden','true');
    wrap.prepend(display,icon);
    const months=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    const refresh=()=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value||'');
      display.textContent=match?Number(match[3])+' '+months[Number(match[2])-1]+' '+match[1]:'Choisir une date';};
    input.addEventListener('input',refresh);input.addEventListener('change',refresh);refresh();
   }
  });
  labelFor('manualTxDate',names.date);
  labelFor('manualTxAmount',names.amount);
  back.classList.add('trace-premium-edit','trace-premium-manual');
 }

 root.TraceOperationUI=Object.freeze({names,steps,escape,kindsFor,options,heading,describe,enhanceTransaction,enhanceBankMovement,enhanceManual});
})(window);
