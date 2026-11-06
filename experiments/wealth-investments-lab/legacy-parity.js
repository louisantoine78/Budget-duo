/* Independent, read-only parity check against the ledger math currently used
 * by TRACE 5.37.0. No network, user state, imports, writing or quote promotion.
 * Quoted market values are intentionally excluded from this comparison.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./engine.js'):root.TraceWealthLabEngine
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthLedgerParity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
 'use strict';
 const supported=new Set(['deposit','withdrawal','buy','sell','dividend','fee','quote']);
 const cents=v=>Math.round(v*100);
 const micro=v=>Math.round(v*1000000);
 function legacyMath(account,sourceOperations){
  if(!account||!Array.isArray(sourceOperations))throw Error('Source de comparaison invalide');
  const ops=sourceOperations.filter(o=>o&&o.accountId===account.id&&
   (!o.status||o.status==='confirmed')).slice().sort((a,b)=>
    String(a.date||'').localeCompare(String(b.date||''))||
    String(a.createdAt||a.id).localeCompare(String(b.createdAt||b.id)));
  const positions=new Map();
  let cash=0,contributions=0,dividends=0,fees=0,realized=0;
  for(const o of ops){
   const amount=Number(o.amount||0),fee=Number(o.fee||0),
    qty=Number(o.quantity||0),price=Number(o.unitPrice||0),
    symbol=String(o.symbol||'').trim().toUpperCase();
   if(!supported.has(o.type)||[amount,fee,qty,price].some(v=>!Number.isFinite(v)))
    throw Error('Mouvement TRACE invalide');
   if(['buy','sell','quote'].includes(o.type)&&(!symbol||symbol.length>16))
    throw Error('Symbole de titre invalide');
   if(o.type==='deposit'){cash+=amount;contributions+=amount;}
   if(o.type==='withdrawal'){cash-=amount;contributions-=amount;}
   if(o.type==='dividend'){cash+=amount;dividends+=amount;}
   if(o.type==='fee'){cash-=amount;fees+=amount;}
   if(['buy','sell','quote'].includes(o.type)){
    const p=positions.get(symbol)||{symbol,quantity:0,cost:0,price:0};
    if(o.type==='quote'){if(!(price>=0))throw Error('Cours TRACE invalide');p.price=price;}
    if(o.type==='buy'){
     if(!(qty>0&&price>0))throw Error('Achat TRACE invalide');
     const paid=qty*price+fee;
     cash-=paid;p.quantity+=qty;p.cost+=paid;p.price=price;fees+=fee;
    }
    if(o.type==='sell'){
     if(!(qty>0&&price>0)||qty>p.quantity+0.0000001)
      throw Error('Vente supérieure aux titres');
     const avg=p.quantity>0?p.cost/p.quantity:0,cost=qty*avg,proceeds=qty*price-fee;
     cash+=proceeds;p.quantity-=qty;p.cost=Math.max(0,p.cost-cost);
     p.price=price;realized+=proceeds-cost;fees+=fee;
    }
    positions.set(symbol,p);
   }
   if(cash<-.001)throw Error('Liquidités TRACE insuffisantes');
  }
  return {cashCents:cents(cash),netFlowCents:cents(contributions),
   dividendsCents:cents(dividends),feesCents:cents(fees),
   realizedCents:cents(realized),positions:[...positions.values()]
    .filter(p=>p.quantity>0.0000001).map(p=>({
     symbol:p.symbol,quantityMicro:micro(p.quantity),costBasisCents:cents(p.cost)
    })).sort((a,b)=>a.symbol.localeCompare(b.symbol))};
 }
 function compare(account,sourceOperations,portfolio){
  if(!portfolio||portfolio.id!==account?.id)return{
   matched:false,status:'unavailable',problems:['Identifiant de compte à rapprocher']};
  let old,next;
  try{old=legacyMath(account,sourceOperations);next=E.evaluate(portfolio);}
  catch(error){return{matched:false,status:'unavailable',
   problems:['Rejeu impossible : '+String(error.message||error)]};}
  const problems=[],newPositions=next.positions.map(p=>({
   symbol:String(p.symbol||'').toUpperCase(),quantityMicro:p.quantityMicro,
   costBasisCents:p.costBasisCents
  })).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  const equal=(field,oldValue,newValue,label)=>{
   if(oldValue!==newValue)problems.push(label+' : écart '+String(newValue-oldValue));
  };
  equal('cash',old.cashCents,next.cashCents,'Espèces (centimes)');
  equal('contributions',old.netFlowCents,next.netFlowCents,'Apports nets (centimes)');
  equal('dividends',old.dividendsCents,next.dividendsCents,'Dividendes (centimes)');
  equal('realized',old.realizedCents,next.realizedCents,'Gains réalisés (centimes)');
  const directFeesCents=next.directFeesCents||0;
  const tradeFeesCents=portfolio.operations.filter(o=>['buy','sell'].includes(o.type))
   .reduce((n,o)=>n+(o.feeCents||0),0);
  equal('fees',old.feesCents,directFeesCents+tradeFeesCents,'Frais (centimes)');
  if(old.positions.length!==newPositions.length)
   problems.push('Nombre de lignes différent');
  const map=new Map(newPositions.map(p=>[p.symbol,p]));
  for(const o of old.positions){
   const actual=map.get(o.symbol);
   if(!actual){problems.push('Titre absent : '+o.symbol);continue;}
   if(o.quantityMicro!==actual.quantityMicro)problems.push('Quantité divergente : '+o.symbol);
   if(o.costBasisCents!==actual.costBasisCents)problems.push('Coût de revient divergent : '+o.symbol);
   map.delete(o.symbol);
  }
  for(const symbol of map.keys())problems.push('Titre supplémentaire : '+symbol);
  return Object.freeze({matched:problems.length===0,status:problems.length?'mismatch':'matched',
   problems,checked:['cash','contributions','dividends','fees','realized','positions'],
   legacy:old,modern:{
    cashCents:next.cashCents,netFlowCents:next.netFlowCents,
    dividendsCents:next.dividendsCents,realizedCents:next.realizedCents,
    positions:newPositions
   },scope:'source-account-only',marketPricesReconciled:false});
 }
 return Object.freeze({legacyMath,compare});
});
