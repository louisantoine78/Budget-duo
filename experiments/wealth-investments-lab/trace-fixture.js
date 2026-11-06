/* Completely fictitious, deliberately simple schema-aligned TRACE 5.37 records.
 * These records NEVER come from Supabase, the user or a bank. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TraceWealthSchemaFixture=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create(){
  return {
   investmentAccounts:[
    {id:'sample-pea',name:'PEA fictif',type:'PEA',owner:'la',currency:'EUR'},
    {id:'sample-reer',name:'REER fictif',type:'REER',owner:'partner',currency:'CAD'},
    {id:'sample-celi',name:'CELI épargne fictif',type:'CELI',owner:'partner',currency:'CAD'},
    {id:'sample-savings',name:'Livret fictif',type:'Épargne',owner:'la',currency:'EUR',savingsTracking:'linked'},
    {id:'sample-cto',name:'CTO à initialiser',type:'CTO',owner:'la',currency:'EUR'}
   ],
   investmentOperations:[
    {id:'pea-cash',accountId:'sample-pea',type:'deposit',amount:1000,
     date:'2026-10-28',status:'confirmed',bankAccountId:'sample-bank',
     linkedTransactionId:'sample-bank-transfer',createdAt:'2026-10-28T10:00:00Z'},
    {id:'pea-buy1',accountId:'sample-pea',type:'buy',symbol:'EXMP',quantity:2,
     unitPrice:120,fee:2,date:'2026-10-29',status:'confirmed',createdAt:'2026-10-29T11:00:00Z'},
    {id:'pea-dividend',accountId:'sample-pea',type:'dividend',amount:3,
     date:'2026-11-01',status:'confirmed',createdAt:'2026-11-01T10:00:00Z'},
    {id:'pea-quote',accountId:'sample-pea',type:'quote',symbol:'EXMP',
     unitPrice:125,date:'2026-11-02',status:'confirmed',createdAt:'2026-11-02T17:00:00Z'},
    {id:'reer-cash',accountId:'sample-reer',type:'deposit',amount:800,
     date:'2026-10-25',status:'confirmed',createdAt:'2026-10-25T10:00:00Z'},
    {id:'reer-buy1',accountId:'sample-reer',type:'buy',symbol:'REERX',quantity:2,
     unitPrice:125,fee:2,date:'2026-10-28',status:'confirmed',createdAt:'2026-10-28T12:00:00Z'},
    {id:'reer-draft',accountId:'sample-reer',type:'buy',symbol:'REERX',quantity:50,
     unitPrice:200,fee:0,date:'2026-11-03',status:'draft'}
   ]
  };
 }
 return Object.freeze({create});
});
