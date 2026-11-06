/* TRACE Patrimoine Quotes LAB: pure ingestion contract, no transport, no API keys.
   This file does not fetch, schedule, persist or display any real market quote. */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./engine.js'):root.TraceWealthLabEngine
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthLabQuotePolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
 'use strict';
 const CATEGORIES=Object.freeze({realtime:'direct',delayed:'différé',eod:'clôture',manual:'manuel'});
 const requireText=(v,label)=>{
  if(typeof v!=='string'||!v.trim())throw Error(label+' manquant.');
  return v.trim();
 };
 // Reject suspicious instruments and venue/currency mismatches rather than
 // accidentally showing an unrelated class of shares or ETF listing.
 function acceptQuote(record,instrument,nowISO){
  if(!record||!instrument)throw Error('Cours ou titre absent');
  const isin=requireText(instrument.isin,'ISIN').toUpperCase();
  const mic=requireText(instrument.marketMic,'MIC').toUpperCase();
  if(!E.isinValid(isin)||!E.micValid(mic))throw Error('Titre non identifié avec ISIN et MIC fiables');
  if(!E.SUPPORTED.includes(instrument.currency))throw Error('Devise du titre non prise en charge');
  if(requireText(record.isin,'ISIN coté').toUpperCase()!==isin||
     requireText(record.marketMic,'MIC coté').toUpperCase()!==mic)
   throw Error('ISIN ou place de cotation sans correspondance');
  if(requireText(record.currency,'Devise du cours').toUpperCase()!==instrument.currency)
   throw Error('Devise incompatible : conversion FX datée nécessaire');
  if(record.redistributionAllowed!==true)
   throw Error('Licence de diffusion des cours non confirmée');
  const vendor=requireText(record.vendor,'Fournisseur');
  if(!CATEGORIES[record.feed])throw Error('Statut de cotation inconnu');
  if(!E.dateValid(record.tradingDate))throw Error('Date de marché invalide');
  const stamp=requireText(record.timestampUTC,'Heure du cours');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(stamp)||
     !Number.isFinite(Date.parse(stamp)))throw Error('Horodatage UTC obligatoire');
  const instant=Date.parse(stamp),ceiling=nowISO?Date.parse(nowISO):null;
  if(nowISO&&!Number.isFinite(ceiling))throw Error('Horloge invalide');
  if(instant>ceiling+300000&&nowISO)throw Error('Cours daté dans le futur');
  if(stamp.slice(0,10)<record.tradingDate)throw Error('Date de marché après l’horodatage du cours');
  // An end-of-day quote can be received the following day, but no accidental
  // future trading date is allowed.
  if(nowISO&&record.tradingDate>nowISO.slice(0,10))throw Error('Séance future interdite');
  const priceUnits=E.price(record.price);
  if(!priceUnits)throw Error('Cours positif obligatoire');
  return Object.freeze({
   priceUnits,date:record.tradingDate,source:vendor,kind:CATEGORIES[record.feed],
   observedAt:stamp,isin,marketMic:mic,currency:instrument.currency,
   delayedMinutes:Number.isSafeInteger(record.delayMinutes)&&record.delayMinutes>=0?record.delayMinutes:null,
   marketState:record.marketState==='closed'?'fermé':record.marketState==='open'?'ouvert':'inconnu',
   displayRights:'confirmed'
  });
 }
 return Object.freeze({acceptQuote,CATEGORIES});
});
