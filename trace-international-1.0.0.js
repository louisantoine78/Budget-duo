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
  const balances=active.map(a=>({id:a.id,name:a.name||'',nativeCurrency:currency(a),balance:estimates[a.id]??null,
   cad:estimates[a.id]===null||estimates[a.id]===undefined?null:fxValue(estimates[a.id],currency(a),fxRates[currency(a)])}));
  const complete=balances.length>0&&balances.every(a=>a.balance!==null&&a.cad!==null);
  const totalCAD=complete?round(balances.reduce((n,a)=>n+a.cad,0)):null;
  return{main,currency:currency(main),checking:missing.length?null:check,
   card:missing.length||ambiguousCards.length?null:debt,
   net:missing.length||ambiguousCards.length?null:round(check+debt),
   ambiguousCards,balances,globalCAD:totalCAD,complete,missing:balances.filter(b=>b.balance===null||b.cad===null)};
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
  if(bankCurrency!=='CAD'&&quote&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(quote.date||''))||
     (date&&quote.date>date)))
   throw Error('Date du taux de change invalide');
  const cad=fxValue(native,bankCurrency,quote);
  if(cad===null)throw Error('Taux CAD requis pour la date de cette opération');
  return{currency:purchaseCurrency,amountOriginal:round(origin),bankCurrency,bankAmount:round(native),
   amountCAD:cad,rate:purchaseCurrency===bankCurrency?quote?.cadPerUnit||1:null,
   bankRateCad:bankCurrency==='CAD'?1:Number(quote.cadPerUnit),fxRateDate:quote?.date||date||'',
   fxRateSource:bankCurrency==='CAD'?'identité':quote?.source||'saisi manuellement'};
 };
 root.TraceInternational=Object.freeze({valid,currency,currencies,country,mode,money,amountOnAccount,primary,snapshot,
  fetchDailyRate,getRate,resolveBooking,fxValue});
})(typeof window!=='undefined'?window:globalThis);
