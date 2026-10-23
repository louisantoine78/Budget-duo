/* TRACE 5.37.0 — Monthly statement comparison laboratory (READ ONLY).
 * No PDF/OCR extraction, database access, write actions or budget recalculation.
 * A normalized statement row is a bank fact: {date, direction:'in'|'out',
 * amount, name?, currency?}. All amounts are native to the selected account.
 * This module is deliberately NOT loaded by index.html or the active candidate.
 */
(function(root){'use strict';
 function day(value){
  const s=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const d=new Date(s+'T12:00:00Z');
  return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?d:null;
 }
 function cents(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value),i=Math.round(n*100);
  return Number.isFinite(n)&&n>0&&n<=1e7&&Number.isSafeInteger(i)&&
   Math.abs(n*100-i)<1e-6?i:null;
 }
 const days=(a,b)=>Math.abs(Math.round((a-b)/86400000));
 function leg(t,account,amountOnAccount){
  if(!t||!['confirmed','pending'].includes(t.status)||
     t.type==='card_statement_evidence'||!day(t.date))return null;
  const source=t.accountId===account.id,
   destination=t.type==='transfer'&&t.toAccountId===account.id;
  if(source===destination)return null; // Neither leg or same-account transfer.
  if(source&&t.bankCurrency&&
     String(t.bankCurrency).toUpperCase()!==account.currency)return null;
  const direction=destination?'in':t.type==='transfer'?'out':
   ['income','refund','external_refund'].includes(t.type)?'in':
   ['expense','group_expense','person_payment','external_transfer'].includes(t.type)?'out':null;
  if(!direction)return null;
  const amount=amountOnAccount(t,account,destination?'destination':'source');
  const value=cents(amount);
  if(value===null)return null;
  return{transactionId:String(t.id||''),date:String(t.date),direction,cents:value,
   status:t.status,name:String(t.name||''),kind:t.type,
   leg:destination?'destination':'source'};
 }
 function compare({account,fromDate,toDate,statementRows=[],transactions=[],
  amountOnAccount,dateTolerance=2}={}){
  if(!account||!String(account.id||'')||!String(account.currency||'')||
     !day(fromDate)||!day(toDate)||fromDate>toDate)
   throw Error('Compte et période de relevé invalides.');
  if(typeof amountOnAccount!=='function')
   throw Error('Moteur de montants natifs requis.');
  if(!Array.isArray(statementRows)||!Array.isArray(transactions)||
     statementRows.length>2000||transactions.length>10000)
   throw Error('Quantité de lignes invalide.');
  if(!Number.isInteger(dateTolerance)||dateTolerance<0||dateTolerance>4)
   throw Error('Tolérance de dates invalide.');
  const selected={id:String(account.id),currency:String(account.currency).toUpperCase()};
  const parsed=[],invalid=[],outOfPeriod=[];
  statementRows.forEach((row,index)=>{
   const date=day(row?.date),amount=cents(row?.amount),
    direction=row?.direction;
   const reason=!date?'Date bancaire invalide':
    !['in','out'].includes(direction)?'Sens bancaire invalide':
    amount===null?'Montant natif invalide':
    row?.currency&&String(row.currency).toUpperCase()!==selected.currency?
     'Devise du relevé différente du compte':null;
   const entry={index,id:String(row?.id||('statement-row-'+(index+1))),
    date:row?.date||'',direction,amount:row?.amount??null,
    name:String(row?.name||'')};
   if(reason){invalid.push({...entry,reason});return;}
   if(row.date<fromDate||row.date>toDate){outOfPeriod.push(entry);return;}
   parsed.push({...entry,stamp:date,cents:amount});
  });
  const bank=[];
  transactions.forEach((tx,index)=>{
   const v=leg(tx,selected,amountOnAccount);
   if(v)bank.push({...v,index,stamp:day(v.date)});
  });
  const refs=parsed.map(row=>bank.filter(v=>row.direction===v.direction&&
   row.cents===v.cents&&days(row.stamp,v.stamp)<=dateTolerance));
  const counts=new Map();
  refs.forEach(list=>list.forEach(v=>counts.set(v.index,(counts.get(v.index)||0)+1)));
  const lines=parsed.map((row,i)=>{
   const candidates=refs[i],confirmed=candidates.filter(x=>x.status==='confirmed'),
    pending=candidates.filter(x=>x.status==='pending');
   let status=candidates.length===0?'missing':
    candidates.length===1&&confirmed.length===1&&counts.get(confirmed[0].index)===1?
     'matched':
    candidates.length===1&&pending.length===1&&counts.get(pending[0].index)===1?
     'pending':'ambiguous';
   return{index:row.index,id:row.id,date:row.date,name:row.name,
    direction:row.direction,amount:row.cents/100,
    currency:selected.currency,status,
    candidates:candidates.map(x=>({id:x.transactionId,status:x.status,
     date:x.date,name:x.name,leg:x.leg,kind:x.kind}))};
  });
  const referenced=new Set(refs.flat().map(x=>x.index));
  const notOnStatement=bank.filter(x=>x.status==='confirmed'&&
   x.date>=fromDate&&x.date<=toDate&&!referenced.has(x.index))
   .map(x=>({id:x.transactionId,date:x.date,name:x.name,kind:x.kind,
    direction:x.direction,amount:x.cents/100,currency:selected.currency}));
  const totals={rows:parsed.length,matched:0,pending:0,ambiguous:0,missing:0,
   invalid:invalid.length,outOfPeriod:outOfPeriod.length,
   notOnStatement:notOnStatement.length};
  lines.forEach(line=>totals[line.status]++);
  return{accountId:selected.id,currency:selected.currency,fromDate,toDate,
   dateTolerance,totals,lines,invalid,outOfPeriod,notOnStatement,
   writes:0,financialChanges:0};
 }
 root.TraceStatementReconcile=Object.freeze({compare});
})(typeof window!=='undefined'?window:globalThis);
