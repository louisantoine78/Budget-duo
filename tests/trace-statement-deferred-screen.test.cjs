'use strict';
/* Candidate monthly PDF screen + actual Evidence / Bridge / deferred review UI.
 * Full on-screen flow using fake DOM and fictional PDF bytes only.
 * No real browser, database, real PDF parsing or production activation. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const scripts=['trace-statement-evidence-1.0.0.js',
 'trace-statement-reconcile-1.0.0.js',
 'trace-deferred-statement-bridge-1.0.0.js',
 'trace-deferred-statement-review-ui-1.0.0.js',
 'trace-statement-monthly-ui-1.0.0.js'];
function fixture(){
 const bytes=new Uint8Array([37,80,68,70,45,10]),nodes=new Map(),
  rows=[],deferred=[],approvals=new Map(),listeners={};
 const getNode=id=>{
  if(!nodes.has(id)){
   const n={id,value:'',checked:false,disabled:false,textContent:'',
    dataset:{},style:{},onclick:null,files:[],listeners:{},markup:'',
    addEventListener(name,fn){this.listeners[name]=fn;},
    querySelector(selector){
     if(id==='traceStatementReview'&&approvals.has(selector))
      return approvals.get(selector);
     if(id==='traceStatementDeferredControl'){
      if(selector==='[data-deferred-prepare]')return getNode('deferredPrepare');
      if(selector==='[data-deferred-result]')return getNode('deferredResult');
      if(selector==='[data-deferred-complete]')return getNode('deferredComplete');
     }
     return null;
    },
    querySelectorAll(selector){
     if(id==='traceStatementRows'&&
        (selector==='[data-statement-row]'||selector==='.trace-statement-row'))
      return rows;
     if(id==='traceStatementDeferredControl'&&
        selector==='[data-deferred-classify]')return deferred;
     return [];
    },
    insertAdjacentHTML(where,html){
     if(id!=='traceStatementRows')return;
     const number=rows.length+1;
     const values={page:'1',line:String(number),date:'',direction:'',
      amount:'',name:'',rawText:''};
     const row={values,
      querySelector(selector){
       if(selector==='.trace-statement-row-title strong')return{set textContent(v){}};
       const m=/^\[data-field="([^"]+)"\]$/.exec(selector);
       return m?{get value(){return values[m[1]];},
        set value(v){values[m[1]]=v;}}:null;
      },
      remove(){rows.splice(rows.indexOf(row),1)}
     };rows.push(row);
    },
    set innerHTML(s){
     this.markup=s;
     if(id==='traceStatementRows'&&s==='')rows.length=0;
     if(id==='traceStatementReview'){
      approvals.clear();
      for(const m of s.matchAll(/data-statement-approve="(\\d+)"/g))
       approvals.set('[data-statement-approve="'+m[1]+'"]',{checked:false});
      getNode('traceStatementAttest').checked=false;
     }
     if(id==='traceStatementDeferredControl'){
      deferred.length=0;
      for(const m of s.matchAll(/data-deferred-classify="(\\d+)"/g))
       deferred.push({value:''});
      getNode('deferredComplete').checked=false;
      getNode('deferredPrepare').disabled=false;
     }
    },
    get innerHTML(){return this.markup;}
   };nodes.set(id,n);
  }
  return nodes.get(id);
 };
 const host={dataset:{},listeners:{},
  set innerHTML(value){
   for(const m of value.matchAll(/id="([^"]+)"/g))getNode(m[1]);
  },
  querySelector(s){return s.startsWith('#')?getNode(s.slice(1)):null;},
  addEventListener(n,fn){this.listeners[n]=fn;},
  dispatch(name,closestSelector){
   this.listeners[name]?.({target:{closest:s=>s===closestSelector}});
  }
 };
 const root={
  __TRACE_INTERNATIONAL_PREVIEW__:true,
  location:{pathname:'/trace-international-preview.html'},
  crypto:{subtle:{digest:async()=>new Uint8Array(32).fill(8).buffer}}
 };
 for(const script of scripts)vm.runInNewContext(fs.readFileSync(
  path.join(__dirname,'..',script),'utf8'),{window:root});
 const account={id:'fr-deferred-card',name:'Carte française fictive',
  owner:'la',type:'card',currency:'EUR',country:'FR',paymentMode:'deferred'};
 const ui=root.TraceMonthlyStatementUI.mount({host,accounts:()=>[account],
  transactions:()=>[],amountOnAccount:()=>null,currentMonth:'2026-10'});
 const file={name:'fiction.pdf',type:'application/pdf',size:bytes.length,
  slice:(a,b)=>({arrayBuffer:async()=>bytes.slice(a,b).buffer}),
  arrayBuffer:async()=>bytes.buffer};
 const begin=async()=>{
  const fileNode=getNode('traceStatementFile');fileNode.files=[file];
  await fileNode.onchange();
  getNode('traceStatementAccount').value=account.id;
  getNode('traceStatementFrom').value='2026-10-01';
  getNode('traceStatementTo').value='2026-10-31';
  getNode('traceStatementCount').value='1';
  Object.assign(rows[0].values,{page:'1',line:'4',date:'2026-10-12',
   direction:'out',amount:'40,00',name:'Courses fictives',rawText:'Fictive 40,00'});
  getNode('traceStatementPrepare').onclick();
  approvals.get('[data-statement-approve="0"]').checked=true;
  getNode('traceStatementAttest').checked=true;
  getNode('traceStatementCompare').onclick();
 };
 const classify=async()=>{
  deferred[0].value='card_purchase';
  getNode('deferredComplete').checked=true;
  await getNode('deferredPrepare').onclick();
 };
 return{host,root,ui,getNode,begin,classify,deferred,rows};
}
test('monthly PDF UI proceeds from reviewed row to candidate deferred classification',async()=>{
 const f=fixture();await f.begin();
 assert.ok(f.ui.getReport());
 assert.ok(f.getNode('traceStatementDeferredControl').innerHTML.includes(
  'Préparer un justificatif pour débit différé'));
 assert.equal(f.ui.getDeferredStatement(),null);
 await f.classify();
 const doc=f.ui.getDeferredStatement();
 assert.ok(doc);assert.equal(doc.rows.length,1);
 assert.equal(doc.rows[0].type,'card_purchase');
 assert.equal(doc.rows[0].amount,40);
 assert.match(doc.sourceId,/^sha256:/);
});
test('changing deferred classification cannot discard the verified monthly report',async()=>{
 const f=fixture();await f.begin();await f.classify();
 assert.ok(f.ui.getReport());assert.ok(f.ui.getDeferredStatement());
 f.deferred[0].value='card_fee';
 f.host.dispatch('change','#traceStatementDeferredControl');
 assert.ok(f.ui.getReport());
 assert.equal(f.ui.getDeferredStatement(),null);
});
test('editing original amount requires a new monthly review and removes proof',async()=>{
 const f=fixture();await f.begin();await f.classify();
 f.rows[0].values.amount='41,00';
 f.host.dispatch('input','#traceStatementRows');
 assert.equal(f.ui.getReport(),null);
 assert.equal(f.ui.getDeferredStatement(),null);
});
test('changing statement bank account invalidates the report and local evidence',async()=>{
 const f=fixture();await f.begin();await f.classify();
 f.getNode('traceStatementAccount').value='someone-else';
 f.host.dispatch('change','#traceStatementAccount');
 assert.equal(f.ui.getReport(),null);
 assert.equal(f.ui.getDeferredStatement(),null);
});
test('all temporary proof state is discarded when UI is disposed',async()=>{
 const f=fixture();await f.begin();await f.classify();
 f.ui.dispose();
 assert.equal(f.ui.getDeferredStatement(),null);
 assert.equal(f.ui.getReport(),null);
});
