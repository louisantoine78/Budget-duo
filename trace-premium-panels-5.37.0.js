/* TRACE 5.37.0 — consistent premium treatment for creation/editing sheets.
 * Pure presentation: never alters field values, finance state or callbacks.
 */
(function(){
 'use strict';
 const TYPES=[
  {key:'quick-add',selector:'#traceAddManual',eyebrow:'AJOUTER DANS TRACE',
   description:'Choisis une saisie manuelle ou un document à importer.'},
  {key:'import-choices',selector:'#traceAddDaily',eyebrow:'DOCUMENTS BANCAIRES',
   description:'Choisis comment rapprocher tes opérations.'},
  {key:'budget-setup',selector:'#budgetNoCatManage',eyebrow:'BUDGET · PREMIERS PAS',
   description:'Prépare tes catégories avant la première planification.'},
  {key:'manual',selector:'#saveManualTx',eyebrow:'MOUVEMENT FINANCIER',
   description:'Saisie manuelle.'},
  {key:'transaction-validate',selector:'#txValidate',eyebrow:'VÉRIFICATION BANCAIRE',
   description:'Contrôle avant validation.'},
  {key:'transaction',selector:'#txSave',eyebrow:'VÉRIFICATION BANCAIRE',
   description:'Détails de l’opération.'},
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
   {key:'standard',eyebrow:'TRACE · ESPACE DE GESTION',description:''};
  backdrop.classList.add('trace-intl-premium-dialog');
  backdrop.dataset.tracePanel=spec.key;
  body.dataset.tracePanel=spec.key;
  body.classList.add('trace-intl-premium-body');
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
 window.TraceSheetPremium=Object.freeze({decorate,types:TYPES.map(({key,selector})=>({key,selector}))});
})();
