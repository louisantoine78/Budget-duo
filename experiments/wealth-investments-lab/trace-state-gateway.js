/* TRACE 5.37 Patrimoine → Investments: pure, fail-closed data projection.
 * The host MUST supply already-authorized data; this module cannot authenticate.
 * No network, browser storage, database, transactions or FX estimation.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./legacy-bridge.js'):root.TraceWealthLegacyBridge
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthStateGateway=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Bridge){
 'use strict';
 const VALID_OWNERS=new Set(['la','partner']);
 const SAVINGS=new Set(['CELI','Épargne','Livret','Savings']);
 function select(snapshot,options){
  if(!snapshot||!Array.isArray(snapshot.investmentAccounts)||
    !Array.isArray(snapshot.investmentOperations))
   throw Error('Source TRACE invalide : comptes et opérations nécessaires.');
  if(!options||!VALID_OWNERS.has(options.viewerOwner)||
    !['mine','couple'].includes(options.scope))
   throw Error('Titulaire ou périmètre de visibilité invalide.');
  if(options.scope==='couple'&&options.coupleAuthorized!==true)
   throw Error('Partage Couple non autorisé : refus par défaut.');
  // Verify all supplied identities before exposing ANY account preview.
  const accountsSeen=new Set(),operationIds=new Set();
  for(const a of snapshot.investmentAccounts){
   if(!a||typeof a.id!=='string'||!a.id||accountsSeen.has(a.id))
    throw Error('Identifiant de compte absent ou dupliqué.');
   accountsSeen.add(a.id);
  }
  for(const o of snapshot.investmentOperations){
   if(!o||typeof o.id!=='string'||!o.id||operationIds.has(o.id))
    throw Error('Opération absente, anonyme ou en doublon.');
   operationIds.add(o.id);
  }
  const owners=options.scope==='couple'?new Set(['la','partner']):new Set([options.viewerOwner]);
  const portfolios=[],review=[],excluded=[],summary=[];
  const selected=snapshot.investmentAccounts.filter(a=>!a.archived&&owners.has(a.owner));
  for(const account of selected){
   // Match production renderWealth savings classification exactly.
   if(account.savingsTracking==='linked'||SAVINGS.has(account.type)){
    excluded.push({accountId:account.id,name:String(account.name||account.type),
     owner:account.owner,reason:'Compte maintenu dans Épargne (classification TRACE existante)'});
    continue;
   }
   const result=Bridge.build(account,snapshot.investmentOperations);
   if(result.status==='reconciliation-required'){
    // The ledger was replayed but is NOT verified against the user's broker.
    const copy=JSON.parse(JSON.stringify(result.portfolio));
    copy.readOnly=true;
    copy.reconciliationStatus='broker-evidence-required';
    portfolios.push(copy);
    summary.push({accountId:account.id,name:String(account.name||account.type),
     owner:account.owner,status:'broker-reconciliation-required',
     operationCount:result.operationCount,
     quoteCandidates:result.quoteCandidates.length,bankLinks:copy.operations.filter(o=>
      Boolean(o.linkedTransactionId||o.linkedBankAccountId)).length});
   }else{
    review.push({accountId:account.id,name:String(account.name||account.type),
     owner:account.owner,status:'blocked',
     reasons:result.issues||[result.reason||'Contrôle comptable impossible']});
   }
  }
  const currencies=[...new Set(portfolios.map(p=>p.currency))];
  return {
   kind:'TRACE-5.37-DIAGNOSTIC-ONLY',readOnly:true,scope:options.scope,
   viewerOwner:options.viewerOwner,coupleAuthorized:options.coupleAuthorized===true,
   selectedAccounts:selected.length,portfolios,review,excluded,summary,
   currencies,crossCurrencyTotalAllowed:currencies.length<=1,
   selectedId:portfolios[0]?.id||null,
   note:'Lecture seule ; aucune valorisation sans cours vérifiables ; aucun doublon en Patrimoine.'
  };
 }
 return Object.freeze({select});
});
