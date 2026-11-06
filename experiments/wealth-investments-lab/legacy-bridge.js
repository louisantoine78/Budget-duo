/* TRACE 5.37 investment ledger -> Investments LAB: explicit read-only bridge.
 * NO auth, API, Supabase, storage, network, transaction write or import side effects.
 * This does not certify broker reconciliation or fiscal/tax reporting. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./engine.js'):root.TraceWealthLabEngine,
  typeof module==='object'&&module.exports?
  require('./integration-contract.js'):root.TraceWealthIntegrationContract);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthLegacyBridge=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,Contract){
 'use strict';
 const TYPE_NAMES={PEA:'PEA',CTO:'CTO',Courtage:'CTO',REER:'REER',CELI:'CELI',Autre:'Autre'};
 const TRADES=new Set(['buy','sell']);
 const CASH=new Set(['deposit','withdrawal','dividend','fee']);
 const KNOWN=new Set([...TRADES,...CASH,'quote']);
 const formatted=(o,k,fn)=>{try{return fn(o[k]);}catch(e){throw Error(k+' : '+e.message);}};
 function comparableOrder(o){return String(o.createdAt||o.id||'');}
 function build(account,allOperations){
  if(!Array.isArray(allOperations))throw Error('Un journal en tableau est requis.');
  if(!account||typeof account.id!=='string'||!account.id)throw Error('Compte source introuvable.');
  if(!Contract.eligible(account))return Object.freeze({
   status:'excluded',accountId:account.id,reason:'Épargne ou compte non éligible : aucune conversion automatique',portfolio:null
  });
  const source=allOperations.filter(o=>o&&o.accountId===account.id&&(!o.status||o.status==='confirmed'))
   .slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||
    comparableOrder(a).localeCompare(comparableOrder(b)));
  const issues=[];
  if(!E.SUPPORTED.includes(account.currency))issues.push('Devise du compte absente ou non reconnue');
  if(!['la','partner'].includes(account.owner))issues.push('Titulaire du compte non reconnu');
  if(!source.length)issues.push('Aucun mouvement : un état initial validé par le courtier est nécessaire');
  if(issues.length)return Object.freeze({status:'needs-review',accountId:account.id,
   issues,portfolio:null,operationCount:source.length,quoteCandidates:[]});
  const earliest=source[0].date;
  if(!E.dateValid(earliest))return Object.freeze({status:'needs-review',accountId:account.id,
   issues:['Première date non valide'],portfolio:null,operationCount:source.length,quoteCandidates:[]});
  const catalog=new Map(),operations=[],quoteCandidates=[],seen=new Set();
  for(let i=0;i<source.length;i++){
   const o=source[i],key=String(o.id||'').trim();
   try{
    if(!key||seen.has(key))throw Error('identifiant absent ou répété');
    seen.add(key);
    if(!KNOWN.has(o.type))throw Error('nature de mouvement non reconnue');
    if(!E.dateValid(o.date))throw Error('date invalide');
    const type=o.type;
    const symbol=String(o.symbol||'').trim().toUpperCase();
    if((TRADES.has(type)||type==='quote')&&!/^[A-Z0-9._-]{1,16}$/.test(symbol))
     throw Error('symbole de titre absent ou invalide');
    const secId='legacy-symbol:'+symbol;
    if((TRADES.has(type)||type==='quote')&&!catalog.has(secId))
     catalog.set(secId,{id:secId,name:symbol,symbol,assetType:'Autre',
      quantityMicro:0,costBasisCents:0,isin:'',marketMic:'',sector:'',geography:'',
      metadataStatus:'identity-unverified'});
    if(type==='quote'){
     // TRACE's legacy quote does not reliably carry venue, timestamp or vendor.
     // Store as a review candidate only — never silently use it for market P&L.
     quoteCandidates.push({sourceOperationId:key,securityId:secId,symbol,
      date:o.date,unitPriceUnits:formatted(o,'unitPrice',E.price),
      state:'source-and-timestamp-unverified'});
     continue;
    }
    const normalized={
     id:key,type,date:o.date,order:String(i).padStart(9,'0'),amountCents:0,
     feeCents:0,quantityMicro:0,unitPriceUnits:0,
     sourceOperationId:key,linkedBankAccountId:o.bankAccountId||null,
     linkedTransactionId:o.linkedTransactionId||null
    };
    if(TRADES.has(type)){
     normalized.securityId=secId;
     normalized.quantityMicro=formatted(o,'quantity',E.quantity);
     normalized.unitPriceUnits=formatted(o,'unitPrice',E.price);
     normalized.feeCents=E.cents(o.fee??0);
    }else if(CASH.has(type))normalized.amountCents=formatted(o,'amount',E.cents);
    operations.push(normalized);
   }catch(e){
    issues.push('Opération #'+(i+1)+' ('+key.slice(0,14)+') : '+e.message);
   }
  }
  if(issues.length)return Object.freeze({
   status:'needs-review',accountId:account.id,operationCount:source.length,
   issues,portfolio:null,quoteCandidates
  });
  const portfolio={
   id:account.id,name:String(account.name||account.type||'Portefeuille'),
   type:TYPE_NAMES[account.type]||'Autre',owner:account.owner,currency:account.currency,
   openingDate:earliest,openingCashCents:0,openingCashConfirmed:false,
   positions:[],catalog:[...catalog.values()],
   operations,quotes:{},quoteHistory:{},snapshots:[],
   origin:'TRACE 5.37 journal (lecture seule)',
   reconcilationStatus:'unverified-starting-zero-balance'
  };
  try{
   const outcome=E.evaluate(portfolio);
   const warnings=[
    'Le solde initial nul est une hypothèse de rejeu, non une preuve du solde à l’ouverture',
    'Toutes les quantités, espèces et PRU doivent être rapprochés au relevé de courtage',
    'Aucun ISIN, MIC, secteur ou cours boursier n’a été inféré'
   ];
   if(quoteCandidates.length)warnings.push('Cours existants mis en quarantaine : date/heure, source et place à confirmer');
   if(operations.some(x=>x.linkedBankAccountId||x.linkedTransactionId))
    warnings.push('Virements bancaires liés conservés comme références, aucune transaction dupliquée');
   return Object.freeze({status:'reconciliation-required',accountId:account.id,
    operationCount:source.length,portfolio,quoteCandidates,issues:warnings,
    preflight:{cashCents:outcome.cashCents,realizedCents:outcome.realizedCents,
     positions:outcome.positions.map(s=>({symbol:s.symbol,quantityMicro:s.quantityMicro,
      costBasisCents:s.costBasisCents})),valuationComplete:outcome.priced&&outcome.performanceComplete}});
  }catch(e){
   return Object.freeze({status:'needs-review',accountId:account.id,
    operationCount:source.length,issues:['Rejeu impossible : '+e.message],
    portfolio:null,quoteCandidates});
  }
 }
 // Independent physical-statement reconciliation: no mutation, no inferred prices.
 function reconcile(bridge,statement){
  if(!bridge||bridge.status!=='reconciliation-required'||!bridge.portfolio)
   throw Error('Un portefeuille de prévalidation est requis.');
  if(!statement||!Array.isArray(statement.positions)||!Number.isSafeInteger(statement.cashCents)||
     statement.cashCents<0)throw Error('Relevé de courtage incomplet');
  const expected=bridge.preflight.positions.map(x=>({...x}));
  const observed=new Map(),problems=[];
  for(const item of statement.positions){
   const symbol=String(item.symbol||'').trim().toUpperCase();
   if(!symbol||observed.has(symbol)||!Number.isSafeInteger(item.quantityMicro)||item.quantityMicro<0)
    throw Error('Ligne du relevé invalide ou dupliquée');
   observed.set(symbol,item);
  }
  if(statement.cashCents!==bridge.preflight.cashCents)
   problems.push('Espèces : solde courtier différent du journal TRACE');
  const matching=new Set();
  for(const row of expected){
   const seen=observed.get(row.symbol);
   if(!seen){problems.push('Position absente du relevé : '+row.symbol);continue;}
   matching.add(row.symbol);
   if(seen.quantityMicro!==row.quantityMicro)
    problems.push('Quantité différente : '+row.symbol);
   if(Object.hasOwn(seen,'costBasisCents')){
    if(!Number.isSafeInteger(seen.costBasisCents)||seen.costBasisCents<0)
     throw Error('Coût de revient courtier invalide');
    if(seen.costBasisCents!==row.costBasisCents)
     problems.push('Coût de revient différent : '+row.symbol);
   }else problems.push('PRU courtier manquant : '+row.symbol);
  }
  for(const symbol of observed.keys())if(!matching.has(symbol))
   problems.push('Titre absent du journal : '+symbol);
  return Object.freeze({matched:problems.length===0,problems,
   cashAndPositionsChecked:true,pricesVerified:false,
   fxVerified:false,source:'comparaison hors ligne — aucune sauvegarde'});
 }
 return Object.freeze({build,reconcile});
});
