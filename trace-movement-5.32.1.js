/* TRACE 5.32.1: mouvement, allocation et liaison remboursement. Aucun accès réseau. */
(function(root){'use strict';
const families=[
{id:'expenses',label:'Dépenses',icon:'shopping-bag'},
{id:'incoming',label:'Entrées d’argent',icon:'arrow-down-left'},
{id:'payments',label:'Paiements et virements',icon:'arrow-left-right'},
{id:'savings',label:'Épargne et patrimoine',icon:'piggy-bank'}];
const kinds=[
{id:'expense',family:'expenses',label:'Achat ou dépense',type:'expense',direction:-1,budget:'expense'},
{id:'refund',family:'expenses',label:'Retour de commerçant',type:'refund',direction:1,budget:'refund'},
{id:'income',family:'incoming',label:'Salaire ou autre revenu',type:'income',direction:1,budget:'income'},
{id:'friend_reimbursement',family:'incoming',label:'Remboursement d’un proche',type:'external_refund',purpose:'friend_reimbursement',direction:1,budget:'none'},
{id:'external_refund',family:'incoming',label:'Autre entrée hors budget',type:'external_refund',direction:1,budget:'none'},
{id:'card_payment',family:'payments',label:'Paiement de carte de crédit',type:'transfer',purpose:'card_repayment',direction:-1,budget:'none'},
{id:'transfer',family:'payments',label:'Virement entre mes comptes',type:'transfer',direction:-1,budget:'none'},
{id:'friend_payment_expense',family:'payments',label:'Payer ma part à un proche · dépense',type:'expense',purpose:'friend_payment_expense',direction:-1,budget:'expense'},
{id:'friend_payment_settlement',family:'payments',label:'Règlement à un proche · déjà compté',type:'external_transfer',purpose:'friend_payment_settlement',direction:-1,budget:'none'},
{id:'external_transfer',family:'payments',label:'Autre virement sortant hors budget',type:'external_transfer',direction:-1,budget:'none'},
{id:'savings_transfer',family:'savings',label:'Versement vers épargne / CELI',type:'external_transfer',purpose:'savings',direction:-1,budget:'none'},
{id:'savings_withdrawal',family:'savings',label:'Retrait de mon épargne / CELI',type:'external_refund',purpose:'savings_withdrawal',direction:1,budget:'none'}
];
const get=id=>kinds.find(k=>k.id===id)||null;
const family=id=>get(id)?.family||'';
const choices=id=>kinds.filter(k=>k.family===id);
const fromStored=t=>{
const x=String(t?.type||''),p=String(t?.transferPurpose||'');
if(x==='external_refund'&&p==='friend_reimbursement')return'friend_reimbursement';
if(x==='external_refund'&&p==='savings_withdrawal')return'savings_withdrawal';
if(x==='external_transfer'&&p==='savings')return'savings_transfer';
if(x==='external_transfer'&&p==='friend_payment_settlement')return'friend_payment_settlement';
if(x==='expense'&&p==='friend_payment_expense')return'friend_payment_expense';
if(x==='transfer'&&p==='card_repayment')return'card_payment';
return kinds.some(k=>k.id===x)?x:'';
};
const cents=n=>Math.round(Number(n)*100);
const amounts=(amount,who,mine='la',defaultSplit={la:50,partner:50},friend=0,other=0)=>{
const total=cents(amount);if(!Number.isSafeInteger(total)||total<=0)throw Error('Montant invalide.');
const partner=mine==='la'?'partner':'la';let own=0,otherShare=0,friends=0;
if(who==='custom'){friends=cents(friend);otherShare=cents(other);if(!Number.isSafeInteger(friends)||!Number.isSafeInteger(otherShare)||friends<0||otherShare<0||friends+otherShare>total)throw Error('Répartition invalide entre amis et couple.');own=total-friends-otherShare;}
else if(who===mine)own=total;
else if(who===partner)otherShare=total;
else if(who==='couple'){const ratio=Number(defaultSplit[mine]);if(!Number.isFinite(ratio)||ratio<0||ratio>100)throw Error('Répartition du couple invalide.');own=Math.round(total*ratio/100);otherShare=total-own;}
else throw Error('Choisis une répartition.');
const result={la:0,partner:0,friends:friends/100,couple:(total-friends)/100};result[mine]=own/100;result[partner]=otherShare/100;return result;
};
const impact=(kind,amount,who,mine='la',defaultSplit={la:50,partner:50},friend=0,other=0)=>{
const def=get(kind);if(!def)throw Error('Nature de mouvement à choisir.');
const total=cents(amount);if(!Number.isSafeInteger(total)||total<=0)throw Error('Montant invalide.');
const share=def.budget==='none'?{la:0,partner:0,couple:0,friends:0}:amounts(amount,def.budget==='income'?mine:who,mine,defaultSplit,friend,other);
const sign=def.budget==='refund'?-1:1;return{kind,bank:total/100*def.direction,budget:{la:share.la*sign,partner:share.partner*sign,couple:share.couple*sign},friends:share.friends,budgetType:def.budget};
};
function linkable(expenses,transactions,owner,date,amount,excluding=''){
return (expenses||[]).filter(t=>t.id!==excluding&&t.status==='confirmed'&&['expense','group_expense'].includes(t.type)&&t.payerId===owner&&t.beneficiary==='custom'&&String(t.date||'')<=String(date||'')&&Number(t.splitAmounts?.friends)>0).map(t=>{
const paid=(transactions||[]).filter(x=>x.id!==excluding&&x.status==='confirmed'&&x.relatedExpenseId===t.id&&x.type==='external_refund'&&x.transferPurpose==='friend_reimbursement').reduce((n,x)=>n+cents(x.amountCAD),0);
const remaining=Math.max(0,cents(t.splitAmounts.friends)-paid);return{id:t.id,label:t.name||'Dépense avancée',date:t.date,remaining:remaining/100,allowed:remaining>=cents(amount)};
}).filter(t=>t.remaining>0);
}
function validateLink(id,expenses,transactions,owner,date,amount,excluding=''){
if(!id)return null;
const match=linkable(expenses,transactions,owner,date,amount,excluding).find(x=>x.id===id);
if(!match||!match.allowed)throw Error('Le remboursement dépasse la part des amis disponible ou la dépense n’est pas admissible.');
return id;
}
root.TraceMovement=Object.freeze({families,kinds,get,family,choices,fromStored,amounts,impact,linkable,validateLink});
})(typeof window!=='undefined'?window:globalThis);