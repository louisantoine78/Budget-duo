/* TRACE 5.32.2 — conservative account-aware movement guide. Pure and read-only. */
(function(root){'use strict';
const checkingOut=['expense','friend_payment_expense','friend_payment_settlement','card_payment','transfer','external_transfer','savings_transfer'];
const checkingIn=['income','refund','friend_reimbursement','external_refund','savings_withdrawal'];
const cardOut=['expense'];
const cardIn=['refund'];
const all=(kind,dir)=>kind==='card'?(dir==='in'?cardIn:dir==='out'?cardOut:[...cardOut,...cardIn]):
(dir==='in'?checkingIn:dir==='out'?checkingOut:[...checkingOut,...checkingIn]);
function clean(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function cardPaymentLabel(text){
 const s=clean(text);
 return /(?:paiement|payment|versement|reglement).{0,65}(?:carte|mastercard|visa|world elite|odyssee)|(?:mastercard|visa|carte de credit).{0,65}(?:paiement|payment|versement)/.test(s);
}
function direction(type,accountType,name){
 const s=clean(name),t=String(type||'');
 if(accountType==='card'&&cardPaymentLabel(s))return'in';
 if(t==='income'||t==='refund'||t==='external_refund'||t==='friend_reimbursement'||t==='savings_withdrawal')return'in';
 if(t==='expense'||t==='transfer'||t==='external_transfer'||t==='card_payment'||t==='savings_transfer'||t==='friend_payment_expense'||t==='friend_payment_settlement')return'out';
 if(accountType==='checking'){
  if(/\b(salaire|paie|payroll|depot direct|virement recu|interac recu|credit recu|reimbursement received)\b/.test(s))return'in';
  if(/\b(virement emis|virement envoye|interac envoye|prelevement|loyer|assurance)\b/.test(s))return'out';
 }
 return'';
}
function suggest(accountType,type,name){
 if(accountType==='card'&&cardPaymentLabel(name))return'';
 const dir=direction(type,accountType,name),allowed=all(accountType,dir);
 const base=String(type||'');
 if(base==='transfer'&&cardPaymentLabel(name)&&accountType==='checking')return'card_payment';
 if(allowed.includes(base))return base;
 if(accountType==='checking'&&dir==='out'&&/\b(loyer|assurance|prelevement|facture|electricite|hydro)\b/.test(clean(name)))return'expense';
 if(accountType==='checking'&&dir==='in'&&/\b(salaire|paie|payroll|depot direct)\b/.test(clean(name)))return'income';
 if(accountType==='card'&&dir==='out')return'expense';
 if(accountType==='card'&&dir==='in'&&!cardPaymentLabel(name))return'refund';
 return'';
}
function allowed(type,accountType,dir){return all(accountType,dir).includes(type);}
function eligibleCardPayments(transactions,imports,accountId,date,amount,accounts){
 const target=(accounts||[]).find(a=>a.id===accountId);
 if(!target||target.type!=='card'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!(Number(amount)>0))return[];
 const day=s=>Date.parse(s+'T12:00:00');
 const amountCents=Math.round(Number(amount)*100);
 return (transactions||[]).filter(t=>{
  const from=accounts.find(a=>a.id===t.accountId);
  if(t.status!=='confirmed'||t.type!=='transfer'||t.toAccountId!==accountId||
   !from||from.type!=='checking'||target.owner!==undefined&&from.owner!==undefined&&from.owner!==target.owner||
   Math.round(Number(t.amountCAD)*100)!==amountCents||
   !/^\d{4}-\d{2}-\d{2}$/.test(t.date)||Math.abs(day(date)-day(t.date))>5*86400000)return false;
  if((imports||[]).some(d=>d.kind==='smart_draft'&&d.status==='matched_card_payment'&&d.linkedTransactionId===t.id))return false;
  return true;
 }).map(t=>({id:t.id,date:t.date,amount:Number(t.amountCAD),name:t.name||'Paiement de carte',sourceAccount:accounts.find(a=>a.id===t.accountId)?.name||'Compte courant'}));
}
root.TraceImportGuide=Object.freeze({allowed,direction,suggest,all,cardPaymentLabel,eligibleCardPayments});
})(typeof window!=='undefined'?window:globalThis);