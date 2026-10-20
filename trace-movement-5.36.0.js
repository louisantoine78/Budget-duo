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