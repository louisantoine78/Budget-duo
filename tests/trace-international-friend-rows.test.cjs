'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','trace-friend-debtor-ui-1.0.0.js'),'utf8');
let n=0;function test(label,fn){fn();n++;console.log('PASS '+label);}
function fixture(){
 const entries={single:{value:'',addEventListener(){}},total:{value:'50',addEventListener(){}},field:{value:''}};
 const host={};
 Object.defineProperty(host,'innerHTML',{get(){return this.html},set(v){
  this.html=v;
  const names=['data-debtor-name','data-debtor-amount','data-debtor-remove'];
  const fields=['debtorName','debtorAmount','debtorRemove'];
  for(let i=0;i<3;i++){
   const count=Array.from(v.matchAll(new RegExp(names[i]+'="[0-9]+"','g'))).length;
   this[fields[i]]=Array.from({length:count},(_,j)=>({dataset:{[fields[i]]:String(j)},value:''}));
  }
  this.add={onclick:null};this.status={textContent:'',classList:{toggle(){}}};
 }});
 host.querySelector=s=>s==='[data-debtor-add]'?host.add:host.status;
 host.querySelectorAll=s=>s==='[data-debtor-name]'?host.debtorName:
  s==='[data-debtor-amount]'?host.debtorAmount:host.debtorRemove;
 entries.host=host;
 const root={document:{getElementById:id=>entries[id]}};
 vm.runInNewContext(source,{window:root});
 const mount=initial=>root.TraceFriendDebtorUI.mount({
  fieldId:'field',singleId:'single',totalId:'total',hostId:'host',initial});
 mount([]);
 return{entries,host,mount};
}
test('a touch-friendly editor mounts with an add button',()=>{
 const x=fixture();assert.match(x.host.innerHTML,/Répartir entre plusieurs proches/);
});
test('adding people creates two rows',()=>{
 const x=fixture();x.host.add.onclick();assert.equal(x.host.debtorName.length,2);
});
test('typing updates compatibility value without rerender',()=>{
 const x=fixture();x.host.add.onclick();
 const a=x.host.debtorName[0],b=x.host.debtorAmount[0];
 a.value='Camille';a.oninput();b.value='30';b.oninput();
 assert.equal(x.host.debtorAmount[0],b);
 assert.match(x.entries.field.value,/Camille : 30/);
});
test('known allocations are restored on reopening',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]);
 assert.equal(x.entries.field.value,'Camille : 30\nAlex : 20');
});
console.log(n+' mobile friend debtor UI tests passed');