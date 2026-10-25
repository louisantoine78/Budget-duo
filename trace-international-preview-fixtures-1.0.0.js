/* TRACE 5.37.0 international LAB - fictional fixtures ONLY.
   This module provides no credentials, storage or network APIs. */
(function(root){'use strict';
 const here=String(root.location?.pathname||'').split('/').pop();
 if(here!=='trace-international-preview.html')return;
 root.__TRACE_INTERNATIONAL_PREVIEW__=true;
 const iso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 const create=()=>{
  const month=iso().slice(0,7),day=n=>month+'-'+String(n).padStart(2,'0');
  const accounts=[
   {id:'demo-ca-current',owner:'la',name:'Canada · compte courant (fictif)',type:'checking',country:'CA',currency:'CAD',paymentMode:'immediate'},
   {id:'demo-ca-card',owner:'la',name:'Canada · carte Mastercard (fictive)',type:'card',country:'CA',currency:'CAD',paymentMode:'credit',settlementAccountId:'demo-ca-current'},
   {id:'demo-fr-current',owner:'la',name:'France · compte EUR (fictif)',type:'checking',country:'FR',currency:'EUR',paymentMode:'immediate'},
   {id:'demo-fr-deferred-card',owner:'la',name:'France · carte à débit différé (fictive, labo)',type:'card',country:'FR',currency:'EUR',paymentMode:'deferred',settlementAccountId:'demo-fr-current'},
   {id:'demo-partner-current',owner:'partner',name:'Élise · compte courant (fictif)',type:'checking',country:'CA',currency:'CAD',paymentMode:'immediate'}
  ];
  const transactions=[
   {id:'demo-salary',accountId:'demo-ca-current',date:day(4),type:'income',name:'Salaire — fictif',
    status:'confirmed',bankCurrency:'CAD',currency:'CAD',bankAmount:1800,amountCAD:1800,
    categoryId:'salary',beneficiary:'la',payerId:'la',split:{la:100,partner:0}},
   {id:'demo-groceries',accountId:'demo-ca-card',date:day(6),type:'expense',name:'Épicerie fictive',
    status:'confirmed',bankCurrency:'CAD',currency:'CAD',bankAmount:80,amountCAD:80,
    categoryId:'groceries',beneficiary:'couple',payerId:'la',
    split:{la:50,partner:50},splitAmounts:{la:40,partner:40}},
   {id:'demo-fr-purchase',accountId:'demo-fr-current',date:day(8),type:'expense',name:'Boulangerie — exemple',
    status:'confirmed',bankCurrency:'EUR',currency:'EUR',bankAmount:40,amountOriginal:40,
    amountCAD:64,bankRateCad:1.6,fxRateDate:day(8),fxRateSource:'TAUX FICTIF - TEST',
    categoryId:'groceries',beneficiary:'la',payerId:'la',split:{la:100,partner:0}},
   {id:'demo-fr-usd',accountId:'demo-fr-current',date:day(9),type:'expense',name:'Paiement USD — exemple',
    status:'confirmed',bankCurrency:'EUR',currency:'USD',bankAmount:46.2,amountOriginal:50,
    amountCAD:73.92,bankRateCad:1.6,fxRateDate:day(9),fxRateSource:'TAUX FICTIF - TEST',
    categoryId:'travel',beneficiary:'la',payerId:'la',split:{la:100,partner:0}},
   {id:'demo-ca-eur-transfer',accountId:'demo-ca-current',toAccountId:'demo-fr-current',
    date:day(11),type:'transfer',transferPurpose:'internal',name:'Virement CAD vers EUR — fictif',
    status:'confirmed',bankCurrency:'CAD',currency:'CAD',bankAmount:150,toBankAmount:95,
    amountCAD:150,categoryId:'',payerId:'la',beneficiary:'la'},
   {id:'demo-card-payment',accountId:'demo-ca-current',toAccountId:'demo-ca-card',
    date:day(12),type:'transfer',transferPurpose:'card_repayment',name:'Paiement Mastercard — fictif',
    status:'confirmed',bankCurrency:'CAD',currency:'CAD',bankAmount:50,toBankAmount:50,
    amountCAD:50,categoryId:'',payerId:'la',beneficiary:'la'},
   {id:'demo-partner-salary',accountId:'demo-partner-current',date:day(5),type:'income',
    name:'Revenu fictif partenaire',status:'confirmed',bankCurrency:'CAD',currency:'CAD',
    bankAmount:1500,amountCAD:1500,categoryId:'salary',payerId:'partner',beneficiary:'partner',
    split:{la:0,partner:100}},
   {id:'demo-eur-pending',accountId:'demo-fr-current',date:day(13),type:'expense',
    name:'SEPA à vérifier — exemple',status:'pending',bankCurrency:'EUR',currency:'EUR',
    bankAmount:23.4,amountOriginal:23.4,amountCAD:null,categoryId:'',
    payerId:'la',beneficiary:'la',source:'csv'}
  ];
  return{
   household:{
    schemaVersion:5,referenceDate:day(1),workspaceMembers:['la','partner'],
    members:[{id:'la',name:'Utilisateur démo',initials:'UD'},{id:'partner',name:'Partenaire démo',initials:'PD'}],
    memberNicknames:{la:'Moi',partner:'Élise'},defaultSplit:{la:50,partner:50},
    accountOpeningBalances:{'demo-ca-current':2500,'demo-ca-card':-400,'demo-fr-current':1200,'demo-partner-current':1800},
    accountOpeningBalanceDates:{'demo-ca-current':day(1),'demo-ca-card':day(1),'demo-fr-current':day(1),'demo-partner-current':day(1)},
    accountOpeningBalanceModes:{'demo-ca-current':'start','demo-ca-card':'start','demo-fr-current':'start','demo-partner-current':'start'},
    primaryBankAccountByOwner:{la:'demo-ca-current',partner:'demo-partner-current'},
    notifications:{review:false,staleImport:false,reconcile:false}
   },
   categories:[
    {id:'groceries',name:'Épicerie',type:'expense',icon:'🛒',budgetKind:'variable'},
    {id:'travel',name:'Voyages',type:'expense',icon:'✈',budgetKind:'variable'},
    {id:'salary',name:'Salaire',type:'income',icon:'↗',budgetKind:'income'},
    {id:'rent',name:'Logement',type:'expense',icon:'⌂',budgetKind:'fixed'}
   ],
   budgets:[
    {id:'demo-budget-food',month,categoryId:'groceries',scope:'couple',amount:600},
    {id:'demo-budget-travel',month,categoryId:'travel',scope:'la',amount:300}
   ],
   accounts,transactions,investmentAccounts:[],investmentOperations:[],
   reconciliations:[],importDays:[],smartImports:[]
  };
 };
 const fakeRate=(code,date)=>{
  const daily={EUR:1.6,USD:1.4,GBP:1.82,CHF:1.65};
  const currency=String(code||'').toUpperCase();
  if(!Object.prototype.hasOwnProperty.call(daily,currency)||
     !/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
  return{currency,cadPerUnit:daily[currency],date,requestedDate:date,kind:'fictional_fixture',
   source:'TAUX FICTIF — TEST, NE PAS UTILISER POUR UNE OPÉRATION RÉELLE'};
 };
 root.TraceInternationalPreviewFixtures=Object.freeze({
  create,
  quote:()=>fakeRate('EUR',iso()),
  rateFor:fakeRate
 });
})(window);
