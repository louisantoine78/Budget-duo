'use strict';
// Isolated TRACE 5.37.19 guide tests: fictional accounts, no cloud access.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const ctx={window:{}};
vm.runInNewContext(read('trace-movement-5.36.0.js'),ctx);
vm.runInNewContext(read('trace-import-guide-1.2.1.js'),ctx);
vm.runInNewContext(read('trace-movement-questions-1.0.0.js'),ctx);
const Q=ctx.window.TraceMovementQuestions,G=ctx.window.TraceImportGuide;
const all=(bank,dir)=>G.all(bank,dir);
let tests=0;
function test(name,fn){fn();tests++;console.log('PASS '+name);}
test('concrete examples are visible only for compatible account/direction',()=>{
 const receive=Q.choices('checking','in',all('checking','in')).map(x=>x.id);
 const debit=Q.choices('checking','out',all('checking','out')).map(x=>x.id);
 const card=Q.choices('card','out',all('card','out')).map(x=>x.id);
 for(const id of ['employer_reimbursement','pass_through_reimbursement','friend_reimbursement'])
  assert.ok(receive.includes(id));
 for(const id of ['external_card_payment','card_payment','pass_through_payout','professional_spend'])
  assert.ok(debit.includes(id));
 assert.equal(receive.includes('expense'),false);
 assert.equal(debit.includes('income'),false);
 assert.equal(card.join('|'),'expense|professional_spend');
});
test('a credit-card settlement is a matching flow, never an income',()=>{
 const ids=Q.choices('card','in',all('card','in')).map(x=>x.id);
 assert.equal(ids.join('|'),'refund|card_payment_received');
});
test('the suggested options never override server-approved allowed types',()=>{
 const ids=Q.choices('checking','out',['external_card_payment','expense']).map(x=>x.id);
 assert.equal(ids.join('|'),'expense|external_card_payment');
 assert.equal(Q.choices('other','out',[]).length,0);
});
test('mount is purely presentational, and only an explicit button click selects',()=>{
 const events=new Map(),chosen=[],host={
  innerHTML:'',
  querySelectorAll(){
   return [...host.innerHTML.matchAll(/data-trace-nature="([^"]+)"/g)]
    .map(x=>({dataset:{traceNature:x[1]},addEventListener:(name,fn)=>{
     assert.equal(name,'click');events.set(x[1],fn);
    }}));
  }
 };
 Q.mount(host,{accountType:'checking',direction:'in',selected:'pass_through_reimbursement',
   allowed:all('checking','in'),onChoose:id=>chosen.push(id)});
 assert.equal(chosen.length,0,'render must not persist or recategorize existing transactions');
 assert.match(host.innerHTML,/Qu’est-ce qui s’est passé/);
 assert.match(host.innerHTML,/aria-pressed="true"/);
 assert.ok(events.has('employer_reimbursement'));
 events.get('employer_reimbursement')();
 assert.deepEqual(chosen,['employer_reimbursement']);
});
test('advanced stored nature remains visible without changing selection',()=>{
 const host={innerHTML:'',querySelectorAll(){return[];}};
 Q.mount(host,{accountType:'checking',direction:'out',selected:'savings_transfer',
  allowed:all('checking','out'),onChoose:()=>{throw Error('automatic write');}});
 assert.match(host.innerHTML,/Nature précise sélectionnée/);
 assert.match(host.innerHTML,/épargne/i);
});
test('index loads questions before app and smart imports; both screens use guide',()=>{
 const html=read('index.html'),app=read('v5-app-5.37.0.js'),inbox=read('trace-smart-inbox-3.5.0.js');
 const tag='trace-movement-questions-1.0.0.js?v=5.37.19';
 assert.ok(html.indexOf(tag)>0&&html.indexOf(tag)<html.indexOf('v5-app-5.37.0.js'));
 assert.ok(html.indexOf(tag)<html.indexOf('trace-smart-inbox-3.5.0.js'));
 assert.ok(app.includes("$('#smartMovementQuestions')"));
 assert.ok(inbox.includes("el.querySelector('.smart-nature-guide')"));
 assert.ok(inbox.includes("select.dispatchEvent(new Event('change',{bubbles:true}))"));
});
console.log(tests+' question-guide checks passed');
