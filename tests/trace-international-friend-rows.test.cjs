'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','trace-friend-debtor-ui-1.0.0.js'),'utf8');
const movementSource=fs.readFileSync(path.join(__dirname,'..','trace-movement-5.36.0.js'),'utf8');
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
 vm.runInNewContext(movementSource,{window:root});
 vm.runInNewContext(source,{window:root});
 const mount=initial=>root.TraceFriendDebtorUI.mount({
  fieldId:'field',singleId:'single',totalId:'total',hostId:'host',initial});
 mount([]);
 return{entries,host,mount,root};
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

test('duplicate normalized names never claim completed',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'camille',amountCAD:20}]);
 assert.match(x.host.status.textContent,/même prénom/);
 assert.doesNotMatch(x.host.status.textContent,/Répartition complète/);
});
test('valid 30+20 on friends 50 completes at cent precision',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]);
 assert.match(x.host.status.textContent,/Répartition complète/);
});
test('third person can be added and rebalanced',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20}]);
 x.host.add.onclick();assert.equal(x.host.debtorName.length,3);
 x.host.debtorName[2].value='Sam';x.host.debtorName[2].oninput();
 x.host.debtorAmount[2].value='5';x.host.debtorAmount[2].oninput();
 x.host.debtorAmount[1].value='15';x.host.debtorAmount[1].oninput();
 assert.match(x.host.status.textContent,/Répartition complète/);
 assert.match(x.entries.field.value,/Sam : 5/);
});
test('removing one friend preserves other names and values',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:20},{name:'Sam',amountCAD:5}]);
 x.host.debtorRemove[2].onclick();
 assert.equal(x.host.debtorName.length,2);assert.doesNotMatch(x.entries.field.value,/Sam/);
 assert.match(x.entries.field.value,/Camille/);
});
test('under and over allocations show exact remaining or excess',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:15}]);
 assert.match(x.host.status.textContent,/Reste à attribuer : 5,00/);
 x.mount([{name:'Camille',amountCAD:35},{name:'Alex',amountCAD:20}]);
 assert.match(x.host.status.textContent,/Dépassement : 5,00/);
});
test('incomplete name and three decimals are not valid',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:30},{name:'',amountCAD:20}]);
 assert.match(x.host.status.textContent,/prénom de chaque proche/);
 x.mount([{name:'Camille',amountCAD:30},{name:'Alex',amountCAD:'20.999'}]);
 assert.match(x.host.status.textContent,/deux décimales maximum/);
});
test('comma decimals work on decimal keyboard without rounding',()=>{
 const x=fixture();x.mount([{name:'Camille',amountCAD:'30,50'},{name:'Alex',amountCAD:'19,50'}]);
 assert.match(x.host.status.textContent,/Répartition complète/);
 assert.match(x.entries.field.value,/30,50/);
 assert.match(x.host.innerHTML,/type="text" inputmode="decimal"/);
});
test('single/multiple mode round trip is reversible',()=>{
 const x=fixture();x.entries.single.value='Camille';x.host.add.onclick();
 assert.equal(x.entries.single.value,'');assert.match(x.entries.field.value,/Camille : 50/);
 x.host.debtorRemove[1].onclick();
 assert.equal(x.entries.single.value,'Camille');assert.equal(x.entries.field.value,'');
});
test('maximum friend rows is 13',()=>{
 const x=fixture();x.host.add.onclick();for(let i=0;i<20;i++)x.host.add.onclick();
 assert.equal(x.host.debtorName.length,13);
});
test('preexisting multiline allocation reopens via real parsing engine',()=>{
 const x=fixture();x.entries.field.value='Camille : 30,00\nAlex : 20,00';x.mount([]);
 assert.match(x.host.status.textContent,/Répartition complète/);
 assert.match(x.entries.field.value,/Camille : 30/);
});
test('unreadable old allocation never gets silently erased',()=>{
 const x=fixture();delete x.root.TraceMovement;
 x.entries.field.value='Legacy : not-parsed';
 assert.equal(x.mount([]),false);
 assert.equal(x.entries.field.value,'Legacy : not-parsed');
 assert.match(x.host.innerHTML,/Aucune valeur n’a été remplacée/);
});

console.log(n+' mobile friend debtor UI tests passed');