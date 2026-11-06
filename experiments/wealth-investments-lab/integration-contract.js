/* TRACE Patrimoine integration contract — disabled by default.
 * This module NEVER writes user financial data, navigates main tabs or runs itself.
 * The caller must opt in explicitly and supply its own onOpen handler. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthIntegrationContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ACCOUNT_TYPES=new Set(['PEA','CTO','Courtage','REER','CELI','Autre']);
 const LINKED_TYPES=new Set(['Épargne','Livret','Savings']);
 function eligible(account){
  if(!account||typeof account!=='object'||account.archived===true)return false;
  if(account.savingsTracking==='linked'||LINKED_TYPES.has(account.type))return false;
  // TRACE 5.37 currently lists every CELI among savings. Never silently change
  // that legacy placement: only a future explicit opt-in can classify securities.
  if(account.type==='CELI'&&account.investmentTracking!=='securities')return false;
  return ACCOUNT_TYPES.has(account.type);
 }
 function auditAccountMapping(accounts,operations){
  if(!Array.isArray(accounts)||!Array.isArray(operations))throw Error('Compte et journal attendus en tableaux');
  const IDs=new Set(),results=[];
  for(const a of accounts){
   if(!a||typeof a.id!=='string'||!a.id||IDs.has(a.id))throw Error('Identifiant de compte invalide ou répété');
   IDs.add(a.id);
   if(!eligible(a))continue;
   const ops=operations.filter(x=>x&&x.accountId===a.id&&x.status!=='draft');
   const symbols=[...new Set(ops.filter(x=>['buy','sell','quote'].includes(x.type))
    .map(x=>String(x.symbol||'').trim().toUpperCase()).filter(Boolean))];
   const issues=[];
   if(!['EUR','CAD','USD','GBP','CHF'].includes(a.currency))issues.push('Devise de référence à confirmer');
   if(!ops.length)issues.push('Aucune opération : préciser espèces et positions de départ');
   if(symbols.length)issues.push('ISIN et place de cotation à confirmer pour chaque symbole');
   if(ops.some(x=>x.type==='quote'))issues.push('Date et provenance de chaque cotation à compléter');
   if(ops.some(x=>['buy','sell'].includes(x.type)))issues.push('Coût moyen et historique à rapprocher sans recréer des transactions');
   if(ops.some(x=>['deposit','withdrawal'].includes(x.type)&&x.bankAccountId))
    issues.push('Virements bancaires liés : conserver les références existantes, sans double comptage');
   results.push({accountId:a.id,owner:a.owner,type:a.type,currency:a.currency,
    operations:ops.length,knownSymbols:symbols,issues,mode:'read-only-diagnostic'});
  }
  return results;
 }
 function structure(document){
  if(!document||typeof document.getElementById!=='function')throw Error('Document invalide');
  const grid=document.getElementById('wealthInvestmentsGrid');
  const savings=document.getElementById('wealthSavingsGrid');
  const banks=document.getElementById('assetGrid');
  const total=document.getElementById('wealthTotal');
  const trend=document.getElementById('wealthTrend');
  if(!grid||!savings||!banks||!total||!trend)return null;
  const section=grid.closest?.('section.trace-wealth-section');
  if(!section||section.getAttribute('aria-label')!=='Placements')return null;
  const head=section.querySelector('.section-head');
  if(!head)return null;
  return{grid,head,section,unchanged:['wealthTotal','wealthSavingsGrid','wealthInvestmentsGrid','assetGrid','wealthTrend']};
 }
 function mount(document,options={}){
  if(options.enabled!==true)return{mounted:false,reason:'feature-disabled'};
  if(typeof options.onOpen!=='function')throw Error('Action d’ouverture manquante');
  const host=structure(document);
  if(!host)return{mounted:false,reason:'wealth-structure-mismatch'};
  let button=document.getElementById('traceWealthInvestmentDetailEntry');
  if(button)return{mounted:false,reason:'already-mounted',element:button};
  button=document.createElement('button');
  button.id='traceWealthInvestmentDetailEntry';
  button.type='button';
  button.className='linkbtn trace-wealth-investments-link';
  button.textContent='Suivi des titres';
  button.setAttribute('aria-label','Ouvrir le suivi des investissements dans Patrimoine');
  button.addEventListener('click',options.onOpen);
  host.head.appendChild(button);
  return{mounted:true,element:button,unmount(){
   button.removeEventListener('click',options.onOpen);
   if(button.parentNode===host.head)host.head.removeChild(button);
  }};
 }
 return Object.freeze({eligible,auditAccountMapping,structure,mount});
});
