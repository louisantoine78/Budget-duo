/* TRACE International 1.0 — account-native bank balances and audited FX references.
   Currency conversion is never silently invented. All existing accounts default to CAD.
   Bank of Canada indicative reference rates are not actual card processor rates. */
(function(root){'use strict';
 const codes=Object.freeze(['CAD','EUR','USD','GBP','CHF']);
 const locales={CAD:'fr-CA',EUR:'fr-FR',USD:'en-US',GBP:'en-GB',CHF:'fr-CH'};
 const valid=c=>codes.includes(String(c||'').toUpperCase());
 const numeric=value=>(typeof value==='number'||typeof value==='string'&&
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))&&Number.isFinite(Number(value));
 const exactMoney=value=>numeric(value)&&
  Number.isSafeInteger(Math.round(Number(value)*100))&&
  Math.abs(Number(value)*100-Math.round(Number(value)*100))<1e-5?Number(value):null;
 const calendarDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&
  Number.isFinite(+new Date(value+'T12:00:00Z'))&&
  new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 const verifiedQuote=(quote,code)=>quote&&quote.currency===code&&
  numeric(quote.cadPerUnit)&&Number(quote.cadPerUnit)>0&&calendarDate(quote.date)&&
  typeof quote.source==='string'&&quote.source.trim().length>0;
 const currency=a=>{
  const declared=a?.currency;
  if(declared===undefined||declared===null||String(declared).trim()==='')return 'CAD'; // Historical accounts.
  const code=String(declared).toUpperCase();
  if(!valid(code))throw Error('Devise bancaire non prise en charge : '+code);
  return code;
 };
 const money=(value,code,decimals=2)=>{
  const requested=code===undefined||code===null||code===''?'CAD':String(code).toUpperCase();
   if(!valid(requested))return '—';
   const c=requested;
  if(!numeric(value))return '—';
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
   const destinationCurrency=String(t.toBankCurrency||'').trim().toUpperCase();
   const sourceCurrency=String(t.bankCurrency||'CAD').trim().toUpperCase();
   if(destinationCurrency&&destinationCurrency!==code)return null;
   // A foreign receipt has its own native currency and cannot be inferred
   // from a bare destination number. Only historical CAD -> CAD transfers
   // can safely omit destination currency metadata.
   if(!destinationCurrency&&(code!=='CAD'||sourceCurrency!=='CAD'))return null;
   if(t.toBankAmount!==null&&t.toBankAmount!==undefined&&t.toBankAmount!=='')return exactMoney(t.toBankAmount);
   // Legacy CAD -> CAD documents only. CAD as destination of EUR/USD/etc
   // must never inherit the CAD budget valuation as a bank receipt.
   if(code==='CAD'&&sourceCurrency==='CAD'){
    const legacy=t.amountCAD;
    return exactMoney(legacy);
   }
   // All international destination legs need an explicit booked amount.
   return null;
  }
  const sourceCurrency=String(t.bankCurrency||'').trim().toUpperCase();
  if(sourceCurrency&&sourceCurrency!==code)return null;
  // Pre-5.37 documents without denomination were CAD only. A bankAmount
  // on a EUR/USD/etc account cannot prove that the amount was in its currency.
  if(!sourceCurrency&&code!=='CAD')return null;
  if(t.bankAmount!==null&&t.bankAmount!==undefined&&t.bankAmount!=='')return exactMoney(t.bankAmount);
  return code==='CAD'?exactMoney(t.amountCAD):null;
 };
 const fxValue=(native,code,quote)=>{
  // Callers may use fxValue outside the account snapshot: never turn a
  // fractional-cent or unsafe source amount into a rounded real balance.
  if(exactMoney(native)===null||!valid(code))return null;
  const value=code==='CAD'?Number(native):
   verifiedQuote(quote,code)?Number(native)*Number(quote.cadPerUnit):null;
  // A finite quote can still overflow when multiplied by an account balance.
  // An unsafe number of cents must be unknown, never displayed as real wealth.
  if(value===null||!Number.isFinite(value)||
     !Number.isSafeInteger(Math.round(value*100)))return null;
  return round(value);
 };
 const primary=(accounts,owner,primaryId)=>{
  const list=(accounts||[]).filter(a=>(!owner||a.owner===owner)&&!a.archived&&['checking','card'].includes(a.type));
  return list.find(a=>a.id===primaryId&&a.type==='checking')||
   list.find(a=>a.type==='checking'&&currency(a)==='CAD')||
   list.find(a=>a.type==='checking')||list[0]||null;
 };
 const snapshot=({accounts=[],owner,estimates={},mainId,fxRates={}}={})=>{
  const active=accounts.filter(a=>(!owner||a.owner===owner)&&!a.archived&&['checking','card'].includes(a.type));
  // Missing, nonfinite and sub-cent estimates are unknown; none become zero.
  estimates=Object.fromEntries(active.map(a=>[a.id,exactMoney(estimates[a.id])]));
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
  // An accumulation can overflow safe cent precision even if every native
  // account individually passed validation. Never publish rounded fictitious
  // wealth or budget cash as a known value when this occurs.
  const safeChecking=exactMoney(check)===null?null:round(check),
   safeDebt=exactMoney(debt)===null?null:round(debt);
  const missing=included.filter(a=>estimates[a.id]===null||estimates[a.id]===undefined);
  // A card linked to the primary account can have another currency: never
  // subtract USD/EUR debt directly from a CAD/EUR current-account balance.
  const mixedLinkedCurrencies=included.filter(a=>a.type==='card'&&currency(a)!==currency(main));
  const invalidPrimary=!main||main.type!=='checking';
  // A positive card estimate may reflect missing purchases rather than a
  // verified surplus. Never promote it to available cash or global wealth.
  const cardsToReview=active.filter(a=>a.type==='card'&&Number(estimates[a.id])>0);
  const balances=active.map(a=>{
   const native=estimates[a.id],code=currency(a),
    converted=native===null||native===undefined?null:fxValue(native,code,fxRates[code]);
   // A nonzero foreign balance rounding to zero CAD is unresolved, not
   // confirmed zero cash. A truly zero native balance remains a known zero.
   const cad=converted===0&&native!==0?null:converted;
   return{id:a.id,name:a.name||'',nativeCurrency:code,balance:native??null,cad};
  });
  const componentComplete=balances.length>0&&balances.every(a=>a.balance!==null&&a.cad!==null)&&
   !cardsToReview.length;
  // The CAD wealth sum must remain exact at *every* step. Otherwise large
  // checking assets and card liabilities could cancel to a deceptively
  // precise zero despite unsafe intermediate cent totals.
  const safeCadSum=rows=>{
   let cents=0;
   for(const b of rows){
    const value=exactMoney(b.cad);
    if(value===null)return null;
    const candidate=exactMoney((cents+Math.round(value*100))/100);
    if(candidate===null)return null;
    cents=Math.round(candidate*100);
   }
   return cents/100;
  };
  const bankRows=balances.filter(b=>active.some(a=>a.id===b.id&&a.type==='checking'));
  const cardRows=balances.filter(b=>active.some(a=>a.id===b.id&&a.type==='card'));
  const checkingCAD=componentComplete?safeCadSum(bankRows):null;
  const cardsCAD=componentComplete?safeCadSum(cardRows):null;
  const totalCAD=checkingCAD===null||cardsCAD===null?null:
   safeCadSum([{cad:checkingCAD},{cad:cardsCAD}]);
  const complete=componentComplete&&totalCAD!==null;
  const incompletePrimary=invalidPrimary||missing.length||ambiguousCards.length||
   mixedLinkedCurrencies.length||cardsToReview.some(a=>included.includes(a));
  const netSum=check+debt;
  const safeNet=safeChecking===null||safeDebt===null||exactMoney(netSum)===null?
   null:round(netSum);
  return{main,currency:currency(main),checking:missing.length||invalidPrimary?null:safeChecking,
   card:incompletePrimary?null:safeDebt,
   net:incompletePrimary?null:safeNet,
   ambiguousCards,mixedLinkedCurrencies,cardsToReview,balances,globalCAD:totalCAD,complete,
   missing:balances.filter(b=>b.balance===null||b.cad===null||cardsToReview.some(a=>a.id===b.id))};
 };
 const investmentBankAmount=(op,bank)=>{
  if(!op||!bank)return null;
  const currencyNative=currency(bank);
  const bookedCurrency=String(op.bankCurrency||'').trim().toUpperCase();
  if(bookedCurrency&&bookedCurrency!==currencyNative)return null;
  if(!bookedCurrency&&currencyNative!=='CAD')return null;
  let amount=op.bankAmount;
  if(amount===null||amount===undefined||amount===''){
    if(currencyNative!=='CAD')return null;
    amount=op.bankAmountCAD??op.amount;
  }
  if(amount===null||amount===undefined||amount==='')return null;
  const n=exactMoney(amount);
  return n!==null&&n>0?n:null;
 };
 const amountOnInvestment=(movement,investment,bank)=>{
  if(!movement||!investment||!bank||bank.type!=='checking'||bank.owner!==investment.owner)return null;
  const code=currency(investment);
  const bookedInvestmentCurrency=String(movement.investmentCurrency||'').trim().toUpperCase();
  if(bookedInvestmentCurrency&&bookedInvestmentCurrency!==code)return null;
  // Foreign investment deposits need their own native denomination, even
  // if an unrelated bank leg happens to use the same currency.
  if(!bookedInvestmentCurrency&&code!=='CAD'&&
     movement.investmentAmount!==null&&movement.investmentAmount!==undefined&&
     movement.investmentAmount!=='')return null;
  if(movement.investmentAmount!==null&&movement.investmentAmount!==undefined&&movement.investmentAmount!==''){
   const amount=exactMoney(movement.investmentAmount);return amount!==null&&amount>0?amount:null;
  }
  // The same-currency bank amount is an actual booked savings leg. An FX
  // budget valuation can never stand in for an unknown foreign receipt.
  if(currency(bank)!==code)return null;
  const amount=amountOnAccount(movement,bank);
  return amount!==null&&amount>0?amount:null;
 };
 const valuationQuote=(account,liveQuotes={})=>{
  const code=currency(account);
  if(code==='CAD')return null;
  const stored={currency:code,cadPerUnit:account.fxCadPerUnit,
   date:account.fxRateDate,source:account.fxRateProvider};
  const selected=account.fxAutoUpdate===false?stored:liveQuotes[code]||stored;
  return verifiedQuote(selected,code)?selected:null;
 };
 const resolveAccountEdit=({account,owner,accounts=[],transactions=[],reconciliations=[],investmentOperations=[],openingBalances={},input={}}={})=>{
  if(!account||account.owner!==owner||!['checking','card'].includes(account.type)||account.archived)
   throw Error('Seuls tes comptes actifs peuvent être modifiés.');
  const name=String(input.name??account.name??'').trim(),code=String(input.currency??currency(account)).toUpperCase(),
   bankCountry=String(input.country??country(account)).toUpperCase();
  if(name.length<2||name.length>70||!valid(code)||!['CA','FR','OTHER'].includes(bankCountry))
   throw Error('Vérifie le nom, le pays et la devise du compte.');
  if(accounts.some(a=>a.id!==account.id&&a.owner===owner&&!a.archived&&
   String(a.name||'').trim().toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')))
   throw Error('Un compte actif porte déjà ce nom.');
  const hasHistory=transactions.some(t=>t.accountId===account.id||t.toAccountId===account.id)||
   reconciliations.some(r=>r.accountId===account.id)||investmentOperations.some(o=>o.bankAccountId===account.id)||
   exactMoney(openingBalances[account.id])!==null;
  if(code!==currency(account)&&hasHistory)
   throw Error('La devise est verrouillée pour préserver les montants natifs et l’historique. Crée un autre compte.');
  const next={...account,name,currency:code,country:bankCountry};
  if(account.type==='card'){
   const linked=input.settlementAccountId===undefined?account.settlementAccountId:input.settlementAccountId;
   const bank=accounts.find(a=>a.id===linked&&!a.archived&&a.owner===owner&&a.type==='checking'&&
    currency(a)===code&&country(a)===bankCountry);
   if(!bank&&!( !linked&&!account.settlementAccountId&&code===currency(account)&&bankCountry===country(account)))
    throw Error('La carte doit être associée à ton compte courant actif de même pays et même devise.');
   next.settlementAccountId=bank?.id||null;
  }else if(accounts.some(a=>a.type==='card'&&!a.archived&&a.settlementAccountId===account.id&&
   (currency(a)!==code||country(a)!==bankCountry)))
   throw Error('Réassocie les cartes liées avant de changer le pays ou la devise de ce compte.');
  return next;
 };
 const resolveAccountArchive=({account,accounts=[],owner,primaryId,archived=true,date}={})=>{
  if(!account||account.owner!==owner||!['checking','card'].includes(account.type)||!calendarDate(date))
   throw Error('Action non autorisée sur ce compte.');
  if(archived){
   const main=primary(accounts,owner,primaryId);
   if(main?.type==='checking'&&main.id===account.id)
    throw Error('Choisis et confirme un autre compte principal avant cet archivage.');
   if(accounts.some(a=>a.type==='card'&&!a.archived&&a.settlementAccountId===account.id))
    throw Error('Réassocie ou archive d’abord les cartes liées à ce compte.');
  }else if(account.type==='card'&&account.settlementAccountId&&
   !accounts.some(a=>a.id===account.settlementAccountId&&!a.archived&&a.owner===owner&&a.type==='checking'&&
    currency(a)===currency(account)&&country(a)===country(account)))
   throw Error('Réactive d’abord le compte courant de règlement de cette carte.');
  return{...account,archived:Boolean(archived),archivedAt:archived?date:null};
 };
 const fetchDailyRate=async(code,date,transport)=>{
  const c=String(code||'').toUpperCase();
  if(!valid(c))throw Error('Devise non prise en charge');
  if(!calendarDate(date))throw Error('Date du taux invalide');
  if(c==='CAD')return{currency:c,cadPerUnit:1,date,source:'identité',kind:'exact'};
  const end=new Date(date+'T12:00:00Z'),start=new Date(end);start.setUTCDate(start.getUTCDate()-8);
  const iso=x=>x.toISOString().slice(0,10),series='FX'+c+'CAD';
  const url='https://www.bankofcanada.ca/valet/observations/'+series+'?start_date='+iso(start)+'&end_date='+date;
  const get=transport||(typeof fetch==='function'?fetch:null);
  if(!get)throw Error('Service de taux inaccessible');
  const response=await get(url);
  if(!response?.ok)throw Error('Taux de référence indisponible');
  const raw=await response.json();
  const obs=(raw?.observations||[]).filter(o=>calendarDate(o.d)&&o.d>=iso(start)&&o.d<=date&&
   numeric(o?.[series]?.v)&&Number(o[series].v)>0);
  if(!obs.length)throw Error('Aucun taux de référence disponible avant cette date');
  obs.sort((a,b)=>String(b.d).localeCompare(String(a.d)));
  return{currency:c,cadPerUnit:Number(obs[0][series].v),date:obs[0].d,requestedDate:date,
   kind:obs[0].d===date?'exact':'previous_business_day',source:'Banque du Canada · Valet',url};
 };
 const fxCache=new Map();
 const getRate=async(code,date,transport)=>{
  // Only the isolated demo page may use fictional quotes. Real TRACE always
  // uses a dated Bank of Canada quote or an explicitly verified manual rate.
  if(root.__TRACE_INTERNATIONAL_PREVIEW__===true&&
     String(root.location?.pathname||'').split('/').pop()==='trace-international-preview.html'){
   const fixture=root.TraceInternationalPreviewFixtures?.rateFor?.(code,date);
   if(!fixture)throw Error('Taux de démonstration non disponible pour cette devise ou cette date');
   return fixture;
  }
  const key=code+'-'+date;if(fxCache.has(key))return fxCache.get(key);
  const promise=fetchDailyRate(code,date,transport).catch(error=>{fxCache.delete(key);throw error;});
  fxCache.set(key,promise);return promise;
 };
 // Read-only verification before attaching advances to a confirmed foreign
 // bank receipt. Association edits NEVER recalculate its historical CAD amount.
 const verifiedForeignFriendRefund=(t,account)=>{
  if(!t||t.status!=='confirmed'||t.type!=='external_refund'||
     t.transferPurpose!=='friend_reimbursement'||!account||
     t.accountId!==account.id||account.type!=='checking')
    throw Error('Seul un remboursement bancaire confirmé est admissible.');
  const code=currency(account);
  if(code==='CAD')throw Error('Utilise le parcours CAD pour ce compte.');
  if(String(t.bankCurrency||'').toUpperCase()!==code)
    throw Error('Devise du relevé différente du compte bancaire.');
  if(t.bankAmount===null||t.bankAmount===undefined||t.bankAmount===''||
     t.amountCAD===null||t.amountCAD===undefined||t.amountCAD==='')
    throw Error('Montant natif et contre-valeur CAD historiques obligatoires.');
  const native=exactMoney(t.bankAmount),cad=exactMoney(t.amountCAD),rate=Number(t.bankRateCad);
  if(native===null||cad===null||!numeric(t.bankRateCad)||
     !(native>0)||!(cad>0)||!(rate>0))
    throw Error('Montant natif, contre-valeur CAD et taux vérifié obligatoires.');
  const day=String(t.date||''),rated=String(t.fxRateDate||''),origin=String(t.fxRateSource||'').trim();
  if(!calendarDate(day)||!calendarDate(rated)||rated>day||!origin)
    throw Error('Date et source du taux historique vérifié obligatoires.');
  if(Math.abs(round(native*rate)-cad)>.011)
    throw Error('Contre-valeur CAD incohérente avec le taux bancaire historisé.');
  return{bankCurrency:code,bankAmount:round(native),amountCAD:round(cad),
   bankRateCad:rate,fxRateDate:rated,fxRateSource:origin};
 };
 const resolveBooking=({account,bankAmount,originalAmount=null,originalCurrency=null,quote=null,date}={})=>{
  const bankCurrency=currency(account),native=exactMoney(bankAmount);
  if(originalCurrency!==null&&originalCurrency!==undefined&&String(originalCurrency).trim()!==''&&!valid(originalCurrency))
   throw Error('Devise d’achat d’origine non prise en charge');
  const purchaseCurrency=valid(originalCurrency)?String(originalCurrency).toUpperCase():bankCurrency;
  if(native===null||native<=0)throw Error('Montant bancaire invalide : centimes exacts requis');
  const originProvided=originalAmount!==null&&originalAmount!==undefined&&originalAmount!=='';
  if(purchaseCurrency!==bankCurrency&&!originProvided)
   throw Error('Prix d’achat d’origine requis lorsque sa devise diffère du compte');
  const origin=originProvided?exactMoney(originalAmount):native;
  if(origin===null||origin<=0)throw Error('Montant d’achat invalide : centimes exacts requis');
  if(!calendarDate(date))throw Error('Date de l’opération invalide');
  if(bankCurrency!=='CAD'&&quote&&numeric(quote.cadPerUnit)&&Number(quote.cadPerUnit)>0&&
     (!calendarDate(quote.date)||quote.date>date))throw Error('Date du taux de change invalide');
  const cad=fxValue(native,bankCurrency,quote);
  if(cad===null)throw Error('Taux CAD requis avec date et source pour cette opération');
  // A verified but tiny rate may round a non-zero native debit to 0.00 CAD.
  // Refuse to erase that expense from the CAD reference budget; require an
  // explicit reconciliation rather than inventing a minimum cent or FX rate.
  if(!(cad>0))throw Error('Contre-valeur CAD nulle après arrondi : taux à vérifier avant comptabilisation');
  return{currency:purchaseCurrency,amountOriginal:round(origin),bankCurrency,bankAmount:round(native),
   amountCAD:cad,rate:purchaseCurrency===bankCurrency?(bankCurrency==='CAD'?1:Number(quote.cadPerUnit)):null,
   bankRateCad:bankCurrency==='CAD'?1:Number(quote.cadPerUnit),fxRateDate:quote?.date||date||'',
   fxRateSource:bankCurrency==='CAD'?'identité':quote.source.trim()};
 };
 // Prepare an edit of ONE already-recorded international transfer. The one
 // ledger document remains the sole source of both bank legs; budget is neutral.
 // Dates and bank account IDs deliberately cannot change in this first editor.
 const resolveTransferEdit=({transaction,from,to,bankAmount,receivedAmount,quote=null,
  originalCurrency=null,originalAmount=null,name=null,feeAmount=null}={})=>{
  if(!transaction||transaction.type!=='transfer'||transaction.status!=='confirmed')
   throw Error('Seul un transfert confirmé peut être modifié ici');
  if(!from||!to||from.id!==transaction.accountId||to.id!==transaction.toAccountId||
     from.id===to.id||!from.owner||from.owner!==to.owner||from.type!=='checking'||
     !['checking','card'].includes(to.type))
   throw Error('Origine ou destination bancaire incohérente');
  if(to.type==='card'&&(to.settlementAccountId!==from.id||currency(to)!==currency(from)||country(to)!==country(from)))
   throw Error('Cette carte doit être remboursée depuis son compte courant lié');
  if(String(bankAmount??'').trim()===''||String(receivedAmount??'').trim()==='')
   throw Error('Les deux montants bancaires réels sont obligatoires');
  const received=exactMoney(receivedAmount);
  if(received===null||received<=0)throw Error('Montant reçu invalide : centimes exacts requis');
  const bankCode=currency(from),originalCode=originalCurrency||transaction.currency||bankCode;
  const original=originalAmount===null||originalAmount===undefined||originalAmount===''?
   (originalCode===bankCode?bankAmount:null):originalAmount;
  const booking=resolveBooking({account:from,bankAmount,originalCurrency:originalCode,
   originalAmount:original,quote,date:transaction.date});
  // Optional documented bank fee is INCLUDED in the actual amount debited,
   // never a second bank movement or a consumption-budget expense.
   const feeInput=feeAmount===null?(transaction.transferFeeAmount??0):feeAmount;
   const fee=feeInput===''?0:exactMoney(feeInput);
   if(fee===null||fee<0||fee>booking.bankAmount)
    throw Error('Frais de virement invalides : ils sont inclus dans le montant débité');
   const nextName=name===null?String(transaction.name||''):String(name||'').trim();
  if(nextName.length<2||nextName.length>85)throw Error('Libellé bancaire invalide');
  const next={...transaction,...booking,name:nextName,toBankAmount:received,toBankCurrency:currency(to),
    transferFeeAmount:round(fee),transferFeeCurrency:bankCode,transferFeeIncludedInDebit:true};
  // The same transfer is never a new expense or income. Preserve historical
  // link IDs and all user allocations; only change native legs and FX metadata.
  if(Number(transaction.bankAmount??transaction.amountCAD)!==next.bankAmount||
     Number(transaction.toBankAmount??transaction.amountCAD)!==next.toBankAmount||
     transaction.name!==nextName)next.importFingerprint=null;
  return next;
 };
 root.TraceInternational=Object.freeze({valid,currency,currencies,country,mode,money,exactMoney,calendarDate,amountOnAccount,primary,snapshot,
  fetchDailyRate,getRate,resolveBooking,resolveTransferEdit,investmentBankAmount,amountOnInvestment,valuationQuote,
  resolveAccountEdit,resolveAccountArchive,verifiedForeignFriendRefund,fxValue});
})(typeof window!=='undefined'?window:globalThis);
