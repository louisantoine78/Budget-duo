/* TRACE 2.0.1 Patrimoine / Investissements — pure financial accounting model.
   No Supabase, auth, localStorage, production modules, or bank transaction writes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealth201Engine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const Q_SCALE=1000000, PRICE_SCALE=10000;
 const SUPPORTED=['EUR','CAD','USD','GBP','CHF'];
 function exact(input,places,label){
  const s=String(input??'').trim().replace(',','.');
  if(!/^[0-9]{1,10}(?:\.[0-9]+)?$/.test(s))throw Error((label||'Nombre')+' : valeur positive ou nulle attendue.');
  const [whole,frac='']=s.split('.');
  if(frac.length>places)throw Error((label||'Nombre')+' : '+places+' décimales maximum.');
  const v=BigInt(whole)*10n**BigInt(places)+BigInt((frac+'0'.repeat(places)).slice(0,places)||'0');
  if(v>BigInt(Number.MAX_SAFE_INTEGER))throw Error((label||'Nombre')+' : valeur trop importante.');
  return Number(v);
 }
 const cents=s=>exact(s,2,'Montant');
 const quantity=s=>exact(s,6,'Quantité');
 const price=s=>exact(s,4,'Cours');
 const safeInt=(n,label)=>{if(!Number.isSafeInteger(n)||n<0)throw Error((label||'Entier')+' invalide');return n};
 function roundRatio(n,d){
  const a=BigInt(n),b=BigInt(d);
  if(b<=0n)throw Error('Diviseur invalide');
  const value=(a+b/2n)/b;
  if(value>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Montant trop important');
  return Number(value);
 }
 // Integer arithmetic throughout; qty in micro-shares and quote in 1/10000.
 function tradeCents(qty,unitPrice){
  safeInt(qty,'Quantité');safeInt(unitPrice,'Cours');
  return roundRatio(BigInt(qty)*BigInt(unitPrice),100000000n);
 }
 const dateValid=s=>typeof s==='string'&&/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function assertDate(s){if(!dateValid(s))throw Error('Date au format AAAA-MM-JJ requise.')}
 // ISO 6166: validate the 12-character ISIN and its Luhn check digit.
 function isinValid(input){
  const v=String(input??'').trim().toUpperCase();
  if(!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(v))return false;
  let digits='';
  for(const ch of v)digits+=ch>='0'&&ch<='9'?ch:String(ch.charCodeAt(0)-55);
  let sum=0,twice=false;
  for(let i=digits.length-1;i>=0;i--){
   let n=Number(digits[i]);
   if(twice){n*=2;if(n>9)n-=9;}
   sum+=n;twice=!twice;
  }
  return sum%10===0;
 }
 const micValid=input=>/^[A-Z0-9]{4}$/.test(String(input??'').trim().toUpperCase());
 function portfolioValid(p){
  if(!p||!SUPPORTED.includes(p.currency)||!['la','partner'].includes(p.owner)||!Array.isArray(p.positions)||!Array.isArray(p.operations))throw Error('Portefeuille invalide');
  assertDate(p.openingDate);
  safeInt(p.openingCashCents,'Liquidités initiales');
  const ids=new Set(),securityPairs=new Set();
  for(const s of p.positions){
   if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id))throw Error('Position initiale dupliquée ou absente');
   ids.add(s.id);
   if(s.isin&&!isinValid(s.isin))throw Error('ISIN invalide : vérifier les 12 caractères et la clé.');
   if(s.marketMic&&!micValid(s.marketMic))throw Error('Place de cotation MIC invalide.');
   if(s.isin){
    const pair=String(s.isin).toUpperCase()+'|'+String(s.marketMic||'').toUpperCase();
    if(securityPairs.has(pair))throw Error('Même ISIN et place déjà enregistrés.');
    securityPairs.add(pair);
   }
   safeInt(s.quantityMicro,'Quantité initiale');
   if(!s.quantityMicro)throw Error('Quantité initiale nulle');
   if(s.costBasisCents!==null)safeInt(s.costBasisCents,'PRU initial');
  }
  return true;
 }
 function evaluate(p){
  portfolioValid(p);
  const map=new Map(p.positions.map(s=>[s.id,{...s,quantityMicro:s.quantityMicro,costBasisCents:s.costBasisCents}]));
  let cash=p.openingCashCents,realized=0,dividends=0,directFees=0,netFlow=0;
  const ops=p.operations.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.order||a.id).localeCompare(String(b.order||b.id)));
  const ids=new Set();
  for(const o of ops){
   if(!o||!o.id||ids.has(o.id))throw Error('Opération en doublon : ID non unique.');
   ids.add(o.id);
   assertDate(o.date);
   if(o.date<p.openingDate)throw Error('Opération antérieure à la position initiale.');
   const amt=safeInt(o.amountCents||0,'Montant'),fee=safeInt(o.feeCents||0,'Frais');
   let pos=o.securityId?map.get(o.securityId):null;
   if(o.type==='deposit'){if(!amt||fee)throw Error('Versement invalide');cash+=amt;netFlow+=amt;}
   else if(o.type==='withdrawal'){
    if(!amt||fee||amt>cash)throw Error('Retrait supérieur aux liquidités disponibles');
    cash-=amt;netFlow-=amt;
   }else if(o.type==='fee'){
    if(!amt||fee||amt>cash)throw Error('Frais supérieurs aux liquidités disponibles');
    cash-=amt;directFees+=amt;
   }else if(o.type==='dividend'){
    if(!amt||fee)throw Error('Dividende invalide');
    cash+=amt;dividends+=amt;
   }else if(o.type==='buy'||o.type==='sell'){
    const q=safeInt(o.quantityMicro,'Quantité'),u=safeInt(o.unitPriceUnits,'Prix');
    if(!q||!u||!o.securityId||fee<0)throw Error('Quantité, titre et prix requis');
    const gross=tradeCents(q,u);
    if(!gross)throw Error('Montant de transaction trop faible');
    if(o.type==='buy'){
     const total=gross+fee;
     if(total>cash)throw Error('Liquidités insuffisantes pour cet achat et ses frais');
     cash-=total;
     if(!pos){
      const catalog=(p.catalog||[]).find(x=>x.id===o.securityId);
      if(!catalog)throw Error('Titre absent du catalogue de démonstration');
      pos={...catalog,quantityMicro:0,costBasisCents:0};
      map.set(pos.id,pos);
     }
     pos.costBasisCents=pos.costBasisCents===null?null:pos.costBasisCents+total;
     pos.quantityMicro+=q;
    }else{
     if(!pos||pos.quantityMicro<q)throw Error('Vente supérieure à la quantité détenue');
     if(pos.costBasisCents===null)throw Error('PRU initial manquant : renseigne-le avant une vente');
     if(gross<fee)throw Error('Frais supérieurs au produit de la vente');
     const cost=q===pos.quantityMicro?pos.costBasisCents:
      roundRatio(BigInt(pos.costBasisCents)*BigInt(q),BigInt(pos.quantityMicro));
     realized+=gross-fee-cost;
     pos.costBasisCents-=cost;
     pos.quantityMicro-=q;
     cash+=gross-fee;
    }
   }else throw Error('Nature d’opération inconnue');
   if(!Number.isSafeInteger(cash)||cash<0)throw Error('Solde espèces incohérent');
  }
  const positions=[...map.values()].filter(s=>s.quantityMicro>0);
  let securities=0,missingQuote=[],missingCost=[];
  const rows=positions.map(s=>{
   const q=p.quotes?.[s.id]||null;
   const validQuote=q&&Number.isSafeInteger(q.priceUnits)&&q.priceUnits>0&&dateValid(q.date)&&typeof q.source==='string'&&q.source;
   const marketValueCents=validQuote?tradeCents(s.quantityMicro,q.priceUnits):null;
   if(marketValueCents===null)missingQuote.push(s.id);else securities+=marketValueCents;
   if(s.costBasisCents===null)missingCost.push(s.id);
   const unrealizedCents=marketValueCents===null||s.costBasisCents===null?null:marketValueCents-s.costBasisCents;
   return{...s,quote:validQuote?q:null,marketValueCents,unrealizedCents,
    averageCostUnits:s.costBasisCents===null?null:roundRatio(BigInt(s.costBasisCents)*100000000n,BigInt(s.quantityMicro)),
    weight:0};
  });
  const priced=missingQuote.length===0,valued=priced?cash+securities:null;
  const performanceComplete=priced&&missingCost.length===0;
  const unrealized=performanceComplete?rows.reduce((n,s)=>n+s.unrealizedCents,0):null;
  const profit=performanceComplete?realized+unrealized+dividends-directFees:null;
  for(const s of rows)s.weight=priced&&securities>0?(s.marketValueCents/securities):null;
  return{cashCents:cash,netFlowCents:netFlow,securitiesCents:priced?securities:null,
   valueCents:valued,realizedCents:realized,unrealizedCents:unrealized,
   dividendsCents:dividends,directFeesCents:directFees,profitCents:profit,
   priced,performanceComplete,missingQuote,missingCost,positions:rows,operations:ops};
 }
 function appendOperation(p,o,replaceId=null){
  const next={...p,operations:p.operations.filter(x=>x.id!==replaceId).map(x=>({...x}))};
  if(!replaceId&&next.operations.some(x=>x.id===o.id))throw Error('Opération déjà enregistrée');
  if(replaceId&&!p.operations.some(x=>x.id===replaceId))throw Error('Opération à corriger introuvable');
  if(next.operations.some(x=>x.id===o.id))throw Error('ID déjà utilisé');
  next.operations.push({...o});
  evaluate(next); // validate all historical legs before committing any local update
  return next;
 }
 // Pure preflight: same replay rules as saving, without mutating the portfolio.
 function previewOperation(p,operation,replaceId=null){
  const before=evaluate(p);
  const candidate=appendOperation(p,operation,replaceId);
  const after=evaluate(candidate);
  const deltaCash=after.cashCents-before.cashCents;
  const deltaFlow=after.netFlowCents-before.netFlowCents;
  const deltaRealized=after.realizedCents-before.realizedCents;
  const related=operation.securityId?
   after.positions.find(s=>s.id===operation.securityId):null;
  return Object.freeze({cashBeforeCents:before.cashCents,cashAfterCents:after.cashCents,
   deltaCashCents:deltaCash,deltaFlowCents:deltaFlow,
   deltaRealizedCents:deltaRealized,
   quantityAfterMicro:related?.quantityMicro??0,
   valueBeforeCents:before.valueCents,valueAfterCents:after.valueCents,
   candidate});
 }
 function setQuote(p,securityId,quote){
  if(![...p.positions,...(p.catalog||[])].some(s=>s.id===securityId))throw Error('Titre inconnu');
  if(!quote||!Number.isSafeInteger(quote.priceUnits)||quote.priceUnits<=0||!dateValid(quote.date)||!String(quote.source||'').trim())throw Error('Cours, date et source obligatoires');
  if(quote.kind&&!['manuel','clôture','différé','direct'].includes(quote.kind))throw Error('Type de cotation inconnu');
  const saved={...quote,source:String(quote.source).trim()};
  // Keep manual quote evidence by date, not just the latest display price.
  const prior=p.quoteHistory?.[securityId]||
   (p.quotes?.[securityId]?[p.quotes[securityId]]:[]);
  const byDate=new Map(prior.map(item=>[item.date,item]));
  byDate.set(saved.date,saved); // an explicit same-day correction replaces one observation
  const series=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const next={...p,quoteHistory:{...(p.quoteHistory||{}),[securityId]:series},
   quotes:{...(p.quotes||{}),[securityId]:series.at(-1)}};
  evaluate(next);return next;
 }
 function setOpeningPosition(p,securityId,costBasisCents,meta={}){
  if(p.operations.some(o=>o.securityId===securityId&&['buy','sell'].includes(o.type)))throw Error('Position initiale liée à des opérations : corrige les opérations avant de changer le PRU');
  const next={...p,positions:p.positions.map(s=>s.id===securityId?{...s,...meta,costBasisCents}:s)};
  if(next.positions.every((s,i)=>s===p.positions[i]))throw Error('Position introuvable');
  evaluate(next);return next;
 }
 // Replay the historical journal and only use quotes known on or before the snapshot day.
 // This is a simulated snapshot based on last available manual quotations, never a
 // claim that each quote was observed on the snapshot date.
 function snapshotAt(p,onDate){
  assertDate(onDate);
  if(onDate<p.openingDate)throw Error('Valorisation antérieure à la reprise du portefeuille.');
  const history=p.quoteHistory||{},asOf={};
  const ids=new Set([...p.positions.map(x=>x.id),...(p.catalog||[]).map(x=>x.id)]);
  for(const id of ids){
   const series=history[id]||
    (p.quotes?.[id]?[p.quotes[id]]:[]);
   const eligible=series.filter(q=>dateValid(q.date)&&q.date<=onDate)
    .slice().sort((a,b)=>a.date.localeCompare(b.date));
   if(eligible.length)asOf[id]=eligible.at(-1);
  }
  const pastOperations=p.operations.filter(o=>o.date<=onDate);
  const result=evaluate({...p,operations:pastOperations,quotes:asOf});
  if(result.valueCents===null)
   throw Error('Cours datés manquants pour une ou plusieurs positions à cette date.');
  const evidence=result.positions.map(s=>({securityId:s.id,quoteDate:s.quote.date,source:s.quote.source,
   kind:s.quote.kind||'manuel'}));
  return{date:onDate,valueCents:result.valueCents,
   source:'Calcul basé sur les derniers cours connus à cette date',
   estimated:evidence.some(x=>x.quoteDate!==onDate),evidence};
 }
 // Historical chart uses ONLY dated ledger snapshots, not synthesized market prices.
 // Values adjusted for net external flows are an absolute-value comparison, NOT TWR.
 function chartSeries(p,months='all'){
  if(months!=='all'&&(!Number.isInteger(Number(months))||Number(months)<1||Number(months)>120))
   throw Error('Période de graphique invalide.');
  const all=(p.snapshots||[]).filter(x=>dateValid(x.date)&&Number.isSafeInteger(x.valueCents)&&x.valueCents>=0)
   .slice().sort((a,b)=>a.date.localeCompare(b.date));
  for(let i=1;i<all.length;i++)if(all[i].date===all[i-1].date)
   throw Error('Deux valorisations portent la même date.');
  const last=all.at(-1);
  if(!last)return{points:[],ready:false,from:null,to:null,method:'points vérifiés seulement'};
  let cutoff=null;
  if(months!=='all'){
   const [year,month,day]=last.date.split('-').map(Number);
   const origin=new Date(Date.UTC(year,month-1,1));
   origin.setUTCMonth(origin.getUTCMonth()-Number(months));
   const lastDay=new Date(Date.UTC(origin.getUTCFullYear(),origin.getUTCMonth()+1,0)).getUTCDate();
   origin.setUTCDate(Math.min(day,lastDay));
   cutoff=origin.toISOString().slice(0,10);
  }
  const points=all.filter(x=>!cutoff||x.date>=cutoff);
  if(!points.length)return{points:[],ready:false,from:null,to:null,method:'points vérifiés seulement'};
  const from=points[0].date,to=points.at(-1).date;
  const flows=p.operations.filter(o=>['deposit','withdrawal'].includes(o.type)&&o.date>from&&o.date<=to);
  const rows=points.map(snap=>{
   const netExternalCents=flows.filter(o=>o.date<=snap.date)
    .reduce((sum,o)=>sum+(o.type==='deposit'?o.amountCents:-o.amountCents),0);
   const flowAdjustedCents=snap.valueCents-netExternalCents;
   if(!Number.isSafeInteger(flowAdjustedCents))throw Error('Graphique : flux hors limites.');
   return{date:snap.date,valueCents:snap.valueCents,flowAdjustedCents,
    netExternalCents,source:snap.source||'Source non renseignée',
    estimated:Boolean(snap.estimated),reference:!Array.isArray(snap.evidence)};
  });
  return{points:rows,ready:rows.length>=2,from,to,
   method:'valeur hors flux externes depuis le premier relevé, en montants absolus — pas de TWR'};
 }
 function periodPerformance(p,months){
  // Share the exact selection window with the graph (including end-of-month clipping).
  const series=chartSeries(p,months);
  if(!series.ready)return null;
  const first=series.points[0],last=series.points.at(-1);
  const span=(Date.parse(last.date)-Date.parse(first.date))/86400000;
  if(span<=0)return null;
  let net=0,weighted=0;
  for(const op of p.operations){
   if(!['deposit','withdrawal'].includes(op.type)||op.date<=first.date||op.date>last.date)continue;
   const signed=op.type==='deposit'?op.amountCents:-op.amountCents;
   net+=signed;weighted+=signed*(Date.parse(last.date)-Date.parse(op.date))/(span*86400000);
  }
  const gain=last.valueCents-first.valueCents-net;
  const denominator=first.valueCents+weighted;
  return{gainCents:gain,percent:denominator>0?gain/denominator*100:null,
   method:'Dietz modifiée, approximation',from:first.date,to:last.date,points:series.points.length};
 }
 // Conversion read-only of a verified native-currency value to CAD.
 // Quoted rates are CAD per 1 currency unit, never an intraday execution rate.
 // Integer cents and 8-decimal fixed-point rate avoid floating-point rounding.
 function cadValue(nativeCents,code,quote,asOf){
  safeInt(nativeCents,'Valeur en devise du compte');
  if(!dateValid(asOf))throw Error('Date de synthèse invalide');
  if(!SUPPORTED.includes(code))return{ready:false,reason:'Devise de portefeuille inconnue'};
  if(code==='CAD')return{ready:true,valueCents:nativeCents,
   currency:'CAD',rate:'1',date:null,source:'Devise de référence',stale:false};
  if(!quote||!dateValid(quote.date)||quote.date>asOf||
     !String(quote.source||'').trim())
   return{ready:false,reason:'Taux CAD daté et sourcé requis'};
  const raw=String(quote.cadPerUnit??'').trim(),scale=100000000n;
  if(!/^[0-9]{1,5}(?:\\.[0-9]{1,8})?$/.test(raw))
   return{ready:false,reason:'Taux CAD invalide'};
  const [whole,frac='']=raw.split('.');
  const rate=BigInt(whole)*scale+BigInt((frac+'0'.repeat(8)).slice(0,8));
  if(rate<=0n)return{ready:false,reason:'Taux CAD invalide'};
  const age=(Date.parse(asOf+'T12:00:00Z')-Date.parse(quote.date+'T12:00:00Z'))/86400000;
  if(!Number.isInteger(age)||age<0||age>7)return{ready:false,
   reason:'Taux de change trop ancien pour une synthèse actuelle'};
  try{
   const valueCents=roundRatio(BigInt(nativeCents)*rate,scale);
   return{ready:true,valueCents,currency:'CAD',rate:raw,date:quote.date,
    source:String(quote.source).trim(),stale:age>2};
  }catch{return{ready:false,reason:'Conversion hors limites financières'};}
 }
 // Valuation-only breakdown: withhold all weights when an active line lacks a quote.
 // Never infer historical prices, merge currencies or count bank transfers.
 function allocationBreakdown(p){
  const values=evaluate(p);
  const active=values.positions.filter(x=>x.quantityMicro>0);
  const missing=active.filter(x=>x.marketValueCents===null);
  if(!active.length)return{ready:false,reason:'Aucune position détenue',missing:0};
  if(missing.length)return{ready:false,reason:'Cours manquants pour '+missing.length+' position(s)',missing:missing.length};
  const total=active.reduce((sum,x)=>sum+x.marketValueCents,0);
  if(!Number.isSafeInteger(total)||total<=0)
   return{ready:false,reason:'Valorisation non disponible',missing:0};
  const group=selector=>{
   const totals=new Map();
   for(const x of active){
    const label=String(selector(x)||'Non renseigné').trim()||'Non renseigné';
    totals.set(label,(totals.get(label)||0)+x.marketValueCents);
   }
   return[...totals].map(([label,valueCents])=>({
    label,valueCents,percentage:valueCents/total*100
   })).sort((a,b)=>b.valueCents-a.valueCents||a.label.localeCompare(b.label));
  };
  return{ready:true,missing:0,currency:p.currency,totalCents:total,
   positions:group(s=>s.symbol||s.name||s.id),
   types:group(s=>s.assetType||'Autre'),
   sectors:group(s=>s.sector||'Non renseigné'),
   geographies:group(s=>s.geography||'Non renseigné')};
 }
 function demo(){
  const raw=[
   ['dsy','Dassault Systèmes',40,'Action'],
   ['tui','TUI AG',92,'Action'],
   ['air','Air Liquide',3,'Action'],
   ['sp500','Amundi PEA S&P 500',8,'ETF'],
   ['cda','Compagnie des Alpes',15,'Action'],
   ['saf','SAF-Holland',11,'Action'],
   ['stoxx','BNP STOXX Europe 600',10,'ETF'],
   ['sanofi','Sanofi',2,'Action']
  ];
  const positions=raw.map(([id,name,q,assetType])=>({id,name,assetType,
   quantityMicro:quantity(q),costBasisCents:null,symbol:'',isin:'',sector:'',geography:'',thesis:''}));
  return{portfolios:[{id:'pea-demo',name:'PEA · exemple de portefeuille',type:'PEA',owner:'la',currency:'EUR',
   openingDate:'2026-11-04',openingCashCents:13829,openingCashConfirmed:false,
   referenceValueCents:378869,referenceDate:'2026-11-04',
   positions,catalog:positions.map(x=>({...x})),operations:[],quotes:{},
   snapshots:[{date:'2026-11-04',valueCents:378869,source:'Valeur totale fournie'}]}],
   selectedId:'pea-demo'};
 }
 return Object.freeze({SUPPORTED,cents,quantity,price,tradeCents,dateValid,isinValid,micValid,evaluate,appendOperation,previewOperation,setQuote,
  setOpeningPosition,snapshotAt,chartSeries,periodPerformance,allocationBreakdown,cadValue,demo,Q_SCALE,PRICE_SCALE});
});
