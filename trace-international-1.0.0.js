/* TRACE International 1.0 — account-native bank balances and audited FX references.
   Currency conversion is never silently invented. All existing accounts default to CAD.
   Bank of Canada indicative reference rates are not actual card processor rates. */
(function(root){'use strict';
 const codes=Object.freeze(['CAD','EUR','USD','GBP','CHF']);
 const locales={CAD:'fr-CA',EUR:'fr-FR',USD:'en-US',GBP:'en-GB',CHF:'fr-CH'};
 const valid=c=>codes.includes(String(c||'').toUpperCase());
 const currency=a=>valid(a?.currency)?String(a.currency).toUpperCase():'CAD';
 const money=(value,code,decimals=2)=>{
  const c=valid(code)?code:'CAD';
  if(!Number.isFinite(Number(value)))return '—';
  return new Intl.NumberFormat(locales[c],{style:'currency',currency:c,minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(Number(value));
 };
 const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 const currencies=()=>codes.slice();
 const country=a=>String(a?.country||'CA').toUpperCase()==='FR'?'FR':String(a?.country||'CA').toUpperCase()==='CA'?'CA':'OTHER';
 const mode=a=>a?.type==='card'?(a?.paymentMode==='deferred'?'deferred':'credit'):'immediate';
 const amountOnAccount=(t,a,leg='source')=>{
  if(!a)return null;
  const code=currency(a);
  if(leg==='destination'){
   if(t.toBankAmount!==null&&t.toBankAmount!==undefined&&Number.isFinite(Number(t.toBankAmount)))return Number(t.toBankAmount);
   // Legacy CAD -> CAD documents only. CAD as destination of EUR/USD/etc
   // must never inherit the CAD budget valuation as a bank receipt.
   if(code==='CAD'&&(!t.bankCurrency||String(t.bankCurrency).toUpperCase()==='CAD'))
    return Number(t.amountCAD||0);
   // All international destination legs need an explicit booked amount.
   return null;
  }
  if(t.bankAmount!==null&&t.bankAmount!==undefined&&Number.isFinite(Number(t.bankAmount)))return Number(t.bankAmount);
  return code==='CAD'?Number(t.amountCAD||0):null;
 };
 const fxValue=(native,code,quote)=>code==='CAD'?round(native):
  quote&&quote.currency===code&&Number.isFinite(Number(quote.cadPerUnit))&&Number(quote.cadPerUnit)>0?
   round(native*Number(quote.cadPerUnit)):null;
 const primary=(accounts,owner,primaryId)=>{
  const list=(accounts||[]).filter(a=>(!owner||a.owner===owner)&&!a.archived&&['checking','card'].includes(a.type));
  return list.find(a=>a.id===primaryId&&a.type==='checking')||
   list.find(a=>a.type==='checking'&&currency(a)==='CAD')||
   list.find(a=>a.type==='checking')||list[0]||null;
 };
 const snapshot=({accounts=[],owner,estimates={},mainId,fxRates={}}={})=>{
  const active=accounts.filter(a=>(!owner||a.owner===owner)&&!a.archived&&['checking','card'].includes(a.type));
  const main=primary(active,owner,mainId);
  // A legacy unlinked card may be attributed automatically only where
  // there is exactly one plausible current account for its currency/country.
  const candidates=main?active.filter(a=>a.type==='checking'&&currency(a)===currency(main)&&country(a)===country(main)):[];
  const ambiguousCards=active.filter(a=>a.type==='card'&&!a.settlementAccountId&&main&&
   currency(a)===currency(main)&&country(a)===country(main)&&candidates.length>1);
  const included=active.filter(a=>a.id===main?.id||(a.type==='card'&&main&&
   (a.settlementAccountId?a.settlementAccountId===main.id:
    candidates.length===1&&candidates[0].id===main.id&&currency(a)===currency(main)&&country(a)===country(main))));
  const check=included.filter(a=>a.type==='checking').reduce((v,a)=>v+Number(estimates[a.id]||0),0);
  const debt=included.filter(a=>a.type==='card').reduce((v,a)=>v+Math.min(0,Number(estimates[a.id]||0)),0);
  const missing=included.filter(a=>estimates[a.id]===null||estimates[a.id]===undefined);
  // A card linked to the primary account can have another currency: never
  // subtract USD/EUR debt directly from a CAD/EUR current-account balance.
  const mixedLinkedCurrencies=included.filter(a=>a.type==='card'&&currency(a)!==currency(main));
  const invalidPrimary=!main||main.type!=='checking';
  // A positive card estimate may reflect missing purchases rather than a
  // verified surplus. Never promote it to available cash or global wealth.
  const cardsToReview=active.filter(a=>a.type==='card'&&Number(estimates[a.id])>0);
  const balances=active.map(a=>({id:a.id,name:a.name||'',nativeCurrency:currency(a),balance:estimates[a.id]??null,
   cad:estimates[a.id]===null||estimates[a.id]===undefined?null:fxValue(estimates[a.id],currency(a),fxRates[currency(a)])}));
  const complete=balances.length>0&&balances.every(a=>a.balance!==null&&a.cad!==null)&&
   !cardsToReview.length;
  const totalCAD=complete?round(balances.reduce((n,a)=>n+a.cad,0)):null;
  const incompletePrimary=invalidPrimary||missing.length||ambiguousCards.length||
   mixedLinkedCurrencies.length||cardsToReview.some(a=>included.includes(a));
  return{main,currency:currency(main),checking:missing.length||invalidPrimary?null:check,
   card:incompletePrimary?null:debt,
   net:incompletePrimary?null:round(check+debt),
   ambiguousCards,mixedLinkedCurrencies,cardsToReview,balances,globalCAD:totalCAD,complete,
   missing:balances.filter(b=>b.balance===null||b.cad===null||cardsToReview.some(a=>a.id===b.id))};
 };
 const fetchDailyRate=async(code,date,transport)=>{
  const c=String(code||'').toUpperCase();
  if(!valid(c))throw Error('Devise non prise en charge');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))throw Error('Date du taux invalide');
  if(c==='CAD')return{currency:c,cadPerUnit:1,date,source:'identité',kind:'exact'};
  const end=new Date(date+'T12:00:00Z'),start=new Date(end);start.setUTCDate(start.getUTCDate()-8);
  const iso=x=>x.toISOString().slice(0,10),series='FX'+c+'CAD';
  const url='https://www.bankofcanada.ca/valet/observations/'+series+'?start_date='+iso(start)+'&end_date='+date;
  const get=transport||(typeof fetch==='function'?fetch:null);
  if(!get)throw Error('Service de taux inaccessible');
  const response=await get(url);
  if(!response?.ok)throw Error('Taux de référence indisponible');
  const raw=await response.json();
  const obs=(raw?.observations||[]).filter(o=>String(o.d||'')<=date&&Number.isFinite(Number(o?.[series]?.v))&&Number(o[series].v)>0);
  if(!obs.length)throw Error('Aucun taux de référence disponible avant cette date');
  obs.sort((a,b)=>String(b.d).localeCompare(String(a.d)));
  return{currency:c,cadPerUnit:Number(obs[0][series].v),date:obs[0].d,requestedDate:date,
   kind:obs[0].d===date?'exact':'previous_business_day',source:'Banque du Canada · Valet',url};
 };
 const fxCache=new Map();
 const getRate=async(code,date,transport)=>{
  const key=code+'-'+date;if(fxCache.has(key))return fxCache.get(key);
  const promise=fetchDailyRate(code,date,transport).catch(error=>{fxCache.delete(key);throw error;});
  fxCache.set(key,promise);return promise;
 };
 const resolveBooking=({account,bankAmount,originalAmount=null,originalCurrency=null,quote=null,date}={})=>{
  const bankCurrency=currency(account),native=Number(bankAmount),purchaseCurrency=valid(originalCurrency)?originalCurrency:bankCurrency;
  if(!Number.isFinite(native)||native<=0)throw Error('Montant bancaire invalide');
  const originProvided=originalAmount!==null&&originalAmount!==undefined&&originalAmount!=='';
  if(purchaseCurrency!==bankCurrency&&!originProvided)
   throw Error('Prix d’achat d’origine requis lorsque sa devise diffère du compte');
  const origin=originProvided?Number(originalAmount):native;
  if(!Number.isFinite(origin)||origin<=0)throw Error('Montant d’achat invalide');
  const cad=fxValue(native,bankCurrency,quote);
  if(cad===null)throw Error('Taux CAD requis pour la date de cette opération');
  if(bankCurrency!=='CAD'&&quote&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(quote.date||''))||
     (date&&quote.date>date)))
   throw Error('Date du taux de change invalide');
  return{currency:purchaseCurrency,amountOriginal:round(origin),bankCurrency,bankAmount:round(native),
   amountCAD:cad,rate:purchaseCurrency===bankCurrency?quote?.cadPerUnit||1:null,
   bankRateCad:bankCurrency==='CAD'?1:Number(quote.cadPerUnit),fxRateDate:quote?.date||date||'',
   fxRateSource:bankCurrency==='CAD'?'identité':quote?.source||'saisi manuellement'};
 };
 // Prepare an edit of ONE already-recorded international transfer. The one
 // ledger document remains the sole source of both bank legs; budget is neutral.
 // Dates and bank account IDs deliberately cannot change in this first editor.
 const resolveTransferEdit=({transaction,from,to,bankAmount,receivedAmount,quote=null,
  originalCurrency=null,originalAmount=null,name=null}={})=>{
  if(!transaction||transaction.type!=='transfer'||transaction.status!=='confirmed')
   throw Error('Seul un transfert confirmé peut être modifié ici');
  if(!from||!to||from.id!==transaction.accountId||to.id!==transaction.toAccountId||
     from.id===to.id||!from.owner||from.owner!==to.owner||from.type!=='checking'||
     !['checking','card'].includes(to.type))
   throw Error('Origine ou destination bancaire incohérente');
  if(to.type==='card'&&to.settlementAccountId&&to.settlementAccountId!==from.id)
   throw Error('Cette carte doit être remboursée depuis son compte courant lié');
  if(String(bankAmount??'').trim()===''||String(receivedAmount??'').trim()==='')
   throw Error('Les deux montants bancaires réels sont obligatoires');
  const received=Number(receivedAmount);
  if(!Number.isFinite(received)||received<=0)throw Error('Montant reçu invalide');
  const bankCode=currency(from),originalCode=originalCurrency||transaction.currency||bankCode;
  const original=originalAmount===null||originalAmount===undefined||originalAmount===''?
   (originalCode===bankCode?bankAmount:null):originalAmount;
  const booking=resolveBooking({account:from,bankAmount,originalCurrency:originalCode,
   originalAmount:original,quote,date:transaction.date});
  const nextName=name===null?String(transaction.name||''):String(name||'').trim();
  if(nextName.length<2||nextName.length>85)throw Error('Libellé bancaire invalide');
  const next={...transaction,...booking,name:nextName,toBankAmount:round(received)};
  // The same transfer is never a new expense or income. Preserve historical
  // link IDs and all user allocations; only change native legs and FX metadata.
  if(Number(transaction.bankAmount??transaction.amountCAD)!==next.bankAmount||
     Number(transaction.toBankAmount??transaction.amountCAD)!==next.toBankAmount||
     transaction.name!==nextName)next.importFingerprint=null;
  return next;
 };
 root.TraceInternational=Object.freeze({valid,currency,currencies,country,mode,money,amountOnAccount,primary,snapshot,
  fetchDailyRate,getRate,resolveBooking,resolveTransferEdit,fxValue});
})(typeof window!=='undefined'?window:globalThis);
