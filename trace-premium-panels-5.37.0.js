/* TRACE 5.37.0 — consistent premium treatment for creation/editing sheets.
 * Pure presentation: never alters field values, finance state or callbacks.
 */
(function(){
 'use strict';
 const TYPES=[
  {key:'quick-add',selector:'#traceAddManual',eyebrow:'NOUVELLE ACTION',
   description:''},
  {key:'import-choices',selector:'#traceAddDaily',eyebrow:'IMPORT BANCAIRE',
   description:''},
  {key:'budget-setup',selector:'#budgetNoCatManage',eyebrow:'BUDGET · PREMIERS PAS',
   description:'Prépare tes catégories avant la première planification.'},
  {key:'manual',selector:'#saveManualTx',eyebrow:'MOUVEMENT FINANCIER',
   description:'Saisie manuelle.'},
  {key:'bank-movement',selector:'#smartMovementSave',eyebrow:'OPÉRATION BANCAIRE',
   description:''},
  {key:'international-transfer',selector:'#fxSave',eyebrow:'VIREMENT INTERNATIONAL',
   description:''},
  {key:'foreign-expense',selector:'#traceForeignMetaSave',eyebrow:'DÉPENSE INTERNATIONALE',
   description:''},
  {key:'settlement',selector:'#saveSettlement',eyebrow:'RÈGLEMENT ENTRE PARTENAIRES',
   description:''},
  {key:'transaction-validate',selector:'#txValidate',eyebrow:'VÉRIFICATION BANCAIRE',
   description:'Contrôle avant validation.'},
  {key:'transaction',selector:'#txSave',eyebrow:'VÉRIFICATION BANCAIRE',
   description:'Détails de l’opération.'},
  {key:'account-detail',selector:'#traceAccountAllTx',eyebrow:'DÉTAIL DU COMPTE',
   description:''},
  {key:'budget-category-detail',selector:'#traceBudgetToActivity',eyebrow:'DÉTAIL DU BUDGET',
   description:''},
  {key:'budget-add',selector:'#saveBudgetAdd',eyebrow:'PLANIFICATION MENSUELLE',
   description:'Prévision du mois.'},
  {key:'budget-edit',selector:'#saveBudgetEdit',eyebrow:'PLANIFICATION MENSUELLE',
   description:'Poste du budget mensuel.'},
  {key:'budget-copy',selector:'#confirmBudgetCopy',eyebrow:'BUDGET · COPIE',
   description:'Les postes sont sauvegardés un à un et vérifiés.'},
  {key:'account',selector:'#traceSaveNewBank',eyebrow:'GESTION DES COMPTES',
   description:'Ajoute un compte avec sa devise et sa date de référence.'},
  {key:'investment',selector:'#saveInvestmentAccount',eyebrow:'PATRIMOINE',
   description:'Des informations claires pour ton suivi patrimonial.'},
  {key:'reconciliation',selector:'#saveReconciliation',eyebrow:'CONTRÔLE BANCAIRE',
   description:'Compare le solde enregistré avec celui du relevé.'}
 ];
 const create=(tag,cls,value)=>{
  const n=document.createElement(tag);n.className=cls;n.textContent=value;return n;
 };
 const FORM_PANELS=new Set(['manual','transaction','transaction-validate',
  'budget-add','budget-edit','bank-movement','international-transfer',
  'foreign-expense','settlement']);
 // Arrow keys and Home/End use the SAME choice buttons and click callbacks
 // as touch. No mirror state, duplicate financial select or new save path.
 function enhanceChoices(body){
  const ids=['manualTxAccountChips','manualTxCategoryChips',
   'manualTxBeneficiaryChips','manualPurchaseCurrencyChips'];
  for(const id of ids){
   const group=body.querySelector('#'+id);
   if(!group||group.dataset.traceKeyboard==='yes')continue;
   group.dataset.traceKeyboard='yes';
   group.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const current=event.target.closest?.('[data-trace-choice]');
    if(!current||!group.contains(current))return;
    const enabled=Array.from(group.querySelectorAll('[data-trace-choice]'))
     .filter(button=>!button.hidden&&!button.disabled&&
      button.getAttribute('aria-hidden')!=='true');
    if(!enabled.length)return;
    const position=enabled.indexOf(current);
    if(position<0)return;
    event.preventDefault();
    const last=enabled.length-1;
    const nextIndex=event.key==='Home'?0:event.key==='End'?last:
     (position+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+enabled.length)%enabled.length;
    const next=enabled[nextIndex],value=next.dataset.traceChoice;
    next.click();
    // Some category pickers redraw the buttons after selection.
    const after=Array.from(group.querySelectorAll('[data-trace-choice]'))
     .find(button=>button.dataset.traceChoice===value&&!button.hidden&&!button.disabled);
    (after||next).focus({preventScroll:false});
   });
  }
 }
 // A calendar day is an action button, not an editable financial input.
 // Arrow keys move focus only; Enter/Space still invoke the existing day action.
 function onCalendarDayKeydown(event){
  const key=event.key;
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||
   !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(key))return;
  const current=event.target?.closest?.('.trace-cal-date[data-select-day]');
  if(!current||current.disabled)return;
  const grid=current.closest('.trace-cal-grid');
  if(!grid||!grid.closest('#importCalendar'))return;
  const enabled=Array.from(grid.querySelectorAll('.trace-cal-date[data-select-day]'))
   .filter(button=>!button.disabled&&!button.hidden);
  const pos=enabled.indexOf(current);
  if(pos<0)return;
  const date=current.dataset.selectDay;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  const day=Number(date.slice(8));
  let next=null;
  if(key==='ArrowLeft'&&pos>0)next=enabled[pos-1];
  if(key==='ArrowRight'&&pos<enabled.length-1)next=enabled[pos+1];
  if(key==='ArrowUp'||key==='ArrowDown'){
   const wanted=day+(key==='ArrowUp'?-7:7);
   next=enabled.find(button=>Number(button.dataset.selectDay.slice(8))===wanted);
  }
  if(key==='Home'||key==='End'){
   const weekDay=(new Date(date+'T12:00:00').getDay()+6)%7;
   const first=day-weekDay,last=first+6;
   const week=enabled.filter(button=>{
    const n=Number(button.dataset.selectDay.slice(8));
    return n>=first&&n<=last;
   });
   if(week.length)next=key==='Home'?week[0]:week[week.length-1];
  }
  if(!next||next===current)return;
  event.preventDefault();
  next.focus({preventScroll:false});
 }
 if(typeof document!=='undefined'&&document.addEventListener)
  document.addEventListener('keydown',onCalendarDayKeydown);
 function refineFormFeedback(body,key){
  if(!FORM_PANELS.has(key))return;
  body.closest('.sheet-backdrop')?.classList.add('trace-premium-form-pass');
  if(key==='manual')enhanceChoices(body);
  // Existing save/validation callbacks remain authoritative. Only make their
  // original feedback readable to assistive technologies.
  body.querySelectorAll('#manualMovementError,#traceBudgetShareError,'+
   '#traceBudgetCopyError,#traceFeedback,#txFeedback,.trace-movement-error,'+
   '.trace-budget-share-error').forEach(message=>{
    const error=message.matches?.('#manualMovementError,#traceBudgetShareError,'+
     '#traceBudgetCopyError,.trace-movement-error,.trace-budget-share-error');
    // Explicit errors must not be downgraded from an alert to polite status.
    if(error)message.setAttribute('role','alert');
    else if(!message.hasAttribute('role'))message.setAttribute('role','status');
    message.setAttribute('aria-live',error?'assertive':'polite');
    message.setAttribute('aria-atomic','true');
  });
 }
 function decorate(backdrop,title,html){
  if(!backdrop||typeof html!=='string')return;
  const head=backdrop.querySelector('.sheet-head'),body=backdrop.querySelector('#sheetBody'),
   heading=backdrop.querySelector('#sheetTitle'),dialog=backdrop.querySelector('.sheet');
  if(!head||!body||!heading||!dialog)return;
  // Reset on EVERY opening: a form must never inherit the last form's theme.
  head.querySelectorAll('.trace-panel-eyebrow,.trace-panel-caption').forEach(n=>n.remove());
  backdrop.classList.remove('trace-intl-premium-dialog');
  backdrop.removeAttribute('data-trace-panel');
  body.classList.remove('trace-intl-premium-body');
  body.removeAttribute('data-trace-panel');
  const spec=TYPES.find(type=>body.querySelector(type.selector))||
   {key:'standard',eyebrow:'INFORMATIONS',description:''};
  backdrop.classList.add('trace-intl-premium-dialog');
  backdrop.dataset.tracePanel=spec.key;
  body.dataset.tracePanel=spec.key;
  body.classList.add('trace-intl-premium-body');
  backdrop.classList.remove('trace-premium-form-pass');
  refineFormFeedback(body,spec.key);
  const eyebrow=create('span','trace-panel-eyebrow',spec.eyebrow);
  head.insertBefore(eyebrow,heading);
  if(spec.description){
   const caption=create('p','trace-panel-caption',spec.description);
   heading.insertAdjacentElement('afterend',caption);
  }
  dialog.setAttribute('aria-labelledby','sheetTitle');
  const close=backdrop.querySelector('#closeSheet');
  if(close){close.setAttribute('aria-label','Fermer '+String(title||'ce panneau'));close.setAttribute('type','button');}
 }
 window.TraceSheetPremium=Object.freeze({decorate,enhanceChoices,onCalendarDayKeydown,types:TYPES.map(({key,selector})=>({key,selector}))});
})();
