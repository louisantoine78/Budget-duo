/* TRACE 5.33.0 — Référentiel des natures de mouvements. Sans migration ni écriture réseau. */
(function(root){'use strict';
const families=[
{id:'expenses',label:'Dépenses',icon:'shopping-bag',description:'Paiements à comptabiliser dans le budget des dépenses'},
{id:'incoming',label:'Argent reçu',icon:'arrow-down-left',description:'Revenus, retours de commerçants et remboursements sans revenu'},
{id:'payments',label:'Paiements et virements',icon:'arrow-left-right',description:'Paiement de carte, virements et argent avancé à un proche'},
{id:'savings',label:'Épargne et patrimoine',icon:'piggy-bank',description:'Transferts entre trésorerie et épargne, sans consommation'}];
const kinds=[
{id:'expense',family:'expenses',label:'Dépense (achat, facture, prélèvement)',type:'expense',direction:-1,budget:'expense',help:'Restaurant, loyer, assurance, courses… La catégorie précise pourquoi tu as payé. Le montant est affecté à ton budget.'},
{id:'friend_payment_expense',family:'expenses',label:'Virement pour des frais avancés par un proche',type:'expense',purpose:'friend_payment_expense',direction:-1,budget:'expense',help:'Un proche a payé des frais pour toi. Ton virement constitue ta dépense, à classer dans la catégorie de ton choix, puis à répartir.'},
{id:'refund',family:'incoming',label:'Remboursement d’un commerçant',type:'refund',direction:1,budget:'refund',help:'Un commerçant te rend de l’argent pour une dépense. Le montant réduit les dépenses de la catégorie et des personnes concernées.'},
{id:'income',family:'incoming',label:'Salaire ou autre revenu',type:'income',direction:1,budget:'income',help:'Un revenu réellement gagné ou reçu. À affecter à une catégorie de revenus, comme Salaire ou Autres revenus.'},
{id:'friend_reimbursement',family:'incoming',label:'Virement reçu · remboursement de frais avancés',type:'external_refund',purpose:'friend_reimbursement',direction:1,budget:'none',help:'Tu avais payé une dépense pour des amis. Le remboursement augmente ton solde, sans créer de revenu ni corriger une seconde fois le budget.'},
{id:'friend_advance_return',family:'incoming',label:'Virement reçu · argent prêté rendu',type:'external_refund',purpose:'friend_advance_return',direction:1,budget:'none',help:'Un proche te rend une somme que tu lui avais prêtée. Aucun revenu supplémentaire ni dépense : remboursement de trésorerie.'},
{id:'external_refund',family:'incoming',label:'Autre entrée sans revenu',type:'external_refund',direction:1,budget:'none',help:'Entrée de trésorerie qui n’est ni une recette du budget ni un remboursement de commerçant. À utiliser après vérification.'},
{id:'card_payment_received',family:'payments',label:'Paiement reçu sur ma carte · à rapprocher',type:'card_statement_evidence',purpose:'card_payment_received',direction:1,budget:'none',help:'Ce crédit sur le relevé de carte correspond au paiement déjà sorti de ton compte courant. Associe-le au paiement existant : aucun nouveau revenu ni aucune deuxième écriture.'},
{id:'card_payment',family:'payments',label:'Paiement de ma carte de crédit',type:'transfer',purpose:'card_repayment',direction:-1,budget:'none',help:'Le courant diminue et la dette de carte diminue du même montant. Les achats sur la carte ont déjà été comptés.'},
{id:'transfer',family:'payments',label:'Virement entre mes comptes suivis',type:'transfer',direction:-1,budget:'none',help:'L’argent passe d’un de tes comptes à un autre. Il ne crée ni revenu ni dépense.'},
{id:'friend_advance',family:'payments',label:'Virement envoyé · argent prêté à un proche',type:'external_transfer',purpose:'friend_advance',direction:-1,budget:'none',help:'Tu prêtes une somme qui doit te revenir. Le courant diminue, mais ce n’est pas une dépense personnelle.'},
{id:'external_transfer',family:'payments',label:'Autre sortie sans dépense',type:'external_transfer',direction:-1,budget:'none',help:'L’argent sort du compte sans constituer une dépense du budget. Vérifie qu’il ne s’agit pas d’un achat ou d’un don.'},
{id:'friend_payment_settlement',family:'payments',label:'Ancien règlement déjà comptabilisé',type:'external_transfer',purpose:'friend_payment_settlement',direction:-1,budget:'none',legacyOnly:true,help:'Compatibilité des mouvements anciens seulement. Pour un paiement déjà enregistré, retrouve l’opération existante au lieu d’en créer une seconde.'},
{id:'savings_transfer',family:'savings',label:'Versement vers mon épargne / CELI',type:'external_transfer',purpose:'savings',direction:-1,budget:'none',help:'Le courant diminue et le CELI augmente. Ce versement pourra alimenter un objectif d’épargne distinct des dépenses de consommation.'},
{id:'savings_withdrawal',family:'savings',label:'Retrait de mon épargne / CELI',type:'external_refund',purpose:'savings_withdrawal',direction:1,budget:'none',help:'L’épargne diminue et le compte courant augmente. Ce n’est pas un revenu supplémentaire.'}
];
const get=id=>kinds.find(k=>k.id===id)||null;
const family=id=>get(id)?.family||'';
const choices=id=>kinds.filter(k=>k.family===id);
const fromStored=t=>{
const x=String(t?.type||''),p=String(t?.transferPurpose||'');
if(x==='external_refund'&&p==='friend_reimbursement')return'friend_reimbursement';
if(x==='external_refund'&&p==='friend_advance_return')return'friend_advance_return';
if(x==='external_refund'&&p==='savings_withdrawal')return'savings_withdrawal';
if(x==='external_transfer'&&p==='savings')return'savings_transfer';
if(x==='external_transfer'&&p==='friend_advance')return'friend_advance';
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

// Optional multi-allocation on ONE incoming bank transaction.
// Legacy relatedExpenseId remains readable; no migration or new bank transaction.
const personKey=x=>String(x||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
// Optional multi-debtor split, exclusively metadata of the friends budget share.
const parseFriendShares=text=>String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
 const hit=/^(.+?)\s*:\s*(\d+(?:[.,]\d{1,2})?)\s*$/.exec(line);
 if(!hit)throw Error('Indique un prénom et un montant par ligne : Camille : 25,00.');
 return{name:hit[1].trim(),amountCAD:Number(hit[2].replace(',','.'))};
});
const friendShares=t=>{
 if(Array.isArray(t?.friendDebtorShares)&&t.friendDebtorShares.length)
  return t.friendDebtorShares.map(x=>({name:String(x.name||'').trim(),amountCAD:Number(x.amountCAD)}));
 const name=String(t?.friendDebtorName||'').trim(),amount=Number(t?.splitAmounts?.friends);
 return name&&Number.isFinite(amount)&&amount>0?[{name,amountCAD:amount}]:[];
};
const paidForDebtor=(transactions,expenseId,name,excluding='')=>(transactions||[])
 .filter(t=>t.id!==excluding&&t.status==='confirmed'&&personKey(t.counterparty)===personKey(name))
 .reduce((total,t)=>total+repaymentLines(t).filter(x=>x.expenseId===expenseId)
  .reduce((n,line)=>n+cents(line.amountCAD),0),0);
const validateFriendDebtorShares=(lines,friendsTotal,transactions=[],expenseId='')=>{
 if(!Array.isArray(lines)||!lines.length||lines.length>13)
  throw Error('Indique entre 1 et 13 proches pour cette part.');
 const total=cents(friendsTotal),seen=new Set();let sum=0;
 if(!Number.isSafeInteger(total)||total<=0)throw Error('La part des amis doit être positive.');
 const normalized=lines.map(x=>{
  const name=String(x?.name||'').trim().replace(/\s+/g,' '),key=personKey(name),
   raw=Number(x?.amountCAD),amount=cents(raw);
  if(!key||name.length>45||seen.has(key))throw Error('Prénom manquant, trop long ou en double.');
  if(!Number.isFinite(raw)||!Number.isSafeInteger(amount)||amount<=0||Math.abs(raw*100-amount)>.0001)
   throw Error('Montant de chaque proche invalide au centime.');
  if(expenseId&&paidForDebtor(transactions,expenseId,name)>amount)
   throw Error('Les remboursements confirmés dépassent la part de ce proche.');
  seen.add(key);sum+=amount;return{name,amountCAD:amount/100};
 });
 if(sum!==total)throw Error('La somme des proches doit égaler exactement la part avancée aux amis.');
 if(expenseId)for(const t of transactions||[]){
  if(t.status!=='confirmed'||!repaymentLines(t).some(x=>x.expenseId===expenseId))continue;
  if(!seen.has(personKey(t.counterparty)))
   throw Error('Remboursement lié non attribué à un proche de cette dépense. Vérifie-le avant de modifier la répartition.');
 }
 return normalized;
};
const repaymentLines=t=>{
 if(t?.type!=='external_refund'||t?.transferPurpose!=='friend_reimbursement')return[];
 if(Array.isArray(t.repaymentAllocations)&&t.repaymentAllocations.length)
  return t.repaymentAllocations.map(x=>({expenseId:String(x.expenseId||''),amountCAD:Number(x.amountCAD)}));
 return t.relatedExpenseId?[{expenseId:String(t.relatedExpenseId),amountCAD:Number(t.amountCAD)}]:[];
};
const paidForExpense=(transactions,expenseId,excluding='')=>(transactions||[])
 .filter(t=>t.id!==excluding&&t.status==='confirmed')
 .reduce((total,t)=>{
  const lines=repaymentLines(t).filter(line=>line.expenseId===expenseId);
  if(lines.some(line=>!Number.isSafeInteger(cents(line.amountCAD))||cents(line.amountCAD)<=0))return Infinity;
  return total+lines.reduce((amount,line)=>amount+cents(line.amountCAD),0);
 },0);
const validateRepaymentAllocations=(lines,expenses,transactions,owner,date,bankAmount,excluding='',counterparty='')=>{
 if(!Array.isArray(lines)||!lines.length)throw Error('Choisis au moins une avance à rembourser.');
 // Repayment associations must never silently round fractions of a cent.
 const exactCents=value=>{
  const raw=Number(value),rounded=cents(value);
  return Number.isFinite(raw)&&Number.isSafeInteger(rounded)&&
   Math.abs(raw*100-rounded)<1e-6?rounded:NaN;
 };
 const bankCents=exactCents(bankAmount);
 if(!Number.isSafeInteger(bankCents)||bankCents<=0)throw Error('Montant bancaire du remboursement invalide.');
 const seen=new Set(),normalized=[];
 let allocated=0;
 for(const line of lines){
  const expenseId=String(line?.expenseId||''),amount=exactCents(line?.amountCAD);
  if(!expenseId||seen.has(expenseId))throw Error('Chaque avance ne peut apparaître qu’une fois.');
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Montant affecté à une avance invalide.');
  const source=(expenses||[]).find(t=>t.id===expenseId&&t.status==='confirmed'&&
   ['expense','group_expense'].includes(t.type)&&t.payerId===owner&&t.beneficiary==='custom'&&
   String(t.date||'')<=String(date||'')&&Number(t.splitAmounts?.friends)>0);
  if(!source)throw Error('Dépense avancée introuvable, non confirmée ou postérieure au remboursement.');
  const individual=friendShares(source);
  if(individual.length>1){
   const name=personKey(counterparty),matched=individual.find(x=>personKey(x.name)===name);
   if(!name||!matched)throw Error('Choisis le proche concerné par ce remboursement.');
   if(amount>cents(matched.amountCAD)-paidForDebtor(transactions,expenseId,matched.name,excluding))
    throw Error('Le remboursement dépasse la part encore due par ce proche.');
  }
  const available=cents(source.splitAmounts.friends)-paidForExpense(transactions,expenseId,excluding);
  if(!Number.isSafeInteger(available)||amount>available)throw Error('Le remboursement dépasse la part des amis encore due sur cette avance.');
  seen.add(expenseId);allocated+=amount;
  if(!Number.isSafeInteger(allocated)||allocated>bankCents)throw Error('Les associations dépassent le virement bancaire reçu.');
  normalized.push({expenseId,amountCAD:amount/100});
 }
 if(allocated!==bankCents)throw Error('La somme des avances remboursées doit correspondre exactement au virement bancaire reçu.');
 return normalized;
};

function linkable(expenses,transactions,owner,date,amount,excluding=''){
return (expenses||[]).filter(t=>t.id!==excluding&&t.status==='confirmed'&&['expense','group_expense'].includes(t.type)&&t.payerId===owner&&t.beneficiary==='custom'&&String(t.date||'')<=String(date||'')&&Number(t.splitAmounts?.friends)>0).map(t=>{
const paid=paidForExpense(transactions,t.id,excluding);
const remaining=Math.max(0,cents(t.splitAmounts.friends)-paid);return{id:t.id,label:t.name||'Dépense avancée',date:t.date,remaining:remaining/100,allowed:remaining>=cents(amount)};
}).filter(t=>t.remaining>0);
}
function validateLink(id,expenses,transactions,owner,date,amount,excluding=''){
if(!id)return null;
const match=linkable(expenses,transactions,owner,date,amount,excluding).find(x=>x.id===id);
if(!match||!match.allowed)throw Error('Le remboursement dépasse la part des amis disponible ou la dépense n’est pas admissible.');
return id;
}
// Read-only friend receivables. Never infer a person from the label on a
// bank receipt: historical expenses often have only an aggregate friends share.
const friendReceivables=(transactions,owner)=>{
 const groups=new Map();
 const add=(name,t,advance,received,review=false)=>{
  const key=personKey(name)||'__unassigned__';
  if(!groups.has(key))groups.set(key,{owner,name:name||'À attribuer',unassigned:!name,
   advancedCents:0,receivedCents:0,outstandingCents:0,unattributedCents:0,advances:[]});
  const g=groups.get(key),due=Math.max(0,advance-received);
  g.advancedCents+=advance;g.receivedCents+=received;g.outstandingCents+=due;
  if(review)g.unattributedCents+=received;
  g.advances.push({expenseId:t.id,label:t.name||'Dépense avancée',date:t.date,
   advancedCAD:advance/100,receivedCAD:received/100,outstandingCAD:due/100,
   overpaid:received>advance,reviewRequired:review});
 };
 for(const t of transactions||[]){
  if(t.status!=='confirmed'||!['expense','group_expense'].includes(t.type)||
     t.beneficiary!=='custom'||t.payerId!==owner)continue;
  const advance=cents(t.splitAmounts?.friends);
  if(!Number.isSafeInteger(advance)||advance<=0)continue;
  const paid=paidForExpense(transactions,t.id);
  if(!Number.isSafeInteger(paid)||paid<0)continue;
  const shares=friendShares(t);
  if(shares.length>1){
   let attributable=0;
   for(const x of shares){
    const a=cents(x.amountCAD),repaid=paidForDebtor(transactions,t.id,x.name);
    if(!Number.isSafeInteger(a)||a<=0||!Number.isSafeInteger(repaid))continue;
    add(x.name,t,a,Math.min(a,repaid));attributable+=repaid;
   }
   if(paid>attributable)add('',t,0,Math.min(paid-attributable,advance),true);
  }else add(shares[0]?.name||'',t,advance,Math.min(paid,advance),paid>advance);
 }
 return [...groups.values()].map(g=>({
  owner:g.owner,name:g.name,unassigned:g.unassigned,
  advancedCAD:g.advancedCents/100,receivedCAD:g.receivedCents/100,
  outstandingCAD:g.outstandingCents/100,unattributedCAD:g.unattributedCents/100,
  advances:g.advances
 })).sort((a,b)=>Number(a.unassigned)-Number(b.unassigned)||
   b.outstandingCAD-a.outstandingCAD||a.name.localeCompare(b.name,'fr'));
};

root.TraceMovement=Object.freeze({families,kinds,get,family,choices,fromStored,amounts,impact,repaymentLines,paidForExpense,validateRepaymentAllocations,linkable,validateLink,friendReceivables,friendShares,parseFriendShares,validateFriendDebtorShares,paidForDebtor});
})(typeof window!=='undefined'?window:globalThis);