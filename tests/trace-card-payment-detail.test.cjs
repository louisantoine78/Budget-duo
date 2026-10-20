'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.36.5.js'),'utf8');
const moduleSource=fs.readFileSync(path.join(__dirname,'..','trace-card-payment-detail-1.0.0.js'),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(moduleSource,ctx,{filename:'trace-card-payment-detail-1.0.0.js'});
const detail=ctx.window.TraceCardPaymentDetail;
let tests=0;
function test(label,fn){tests++;Promise.resolve().then(fn).then(()=>console.log('PASS '+label),err=>{console.error('FAIL '+label,err);process.exitCode=1;});}
const transfer={id:'payment750',type:'transfer',status:'confirmed',accountId:'checking',
 toAccountId:'card',amountCAD:750,date:'2026-10-07',name:'Paiement facture AccèsD'};
const evidence={id:'capture750',kind:'smart_draft',status:'matched_card_payment',
 linkedTransactionId:'payment750',accountId:'card',amount:750,name:'Paiement',date:'2026-10-07'};
const result=detail.render({transfer,evidence:[evidence],fromName:'LA — Courant',toName:'LA — Carte'});
test('premium detail shows amount and matched status',()=>{
 assert.ok(result.includes('750,00'));assert.ok(result.includes('Rapproché'));});
test('shows both real accounts',()=>{
 assert.ok(result.includes('LA — Courant'));assert.ok(result.includes('LA — Carte'));});
test('checking debit and card debt reduction clearly explained',()=>{
 assert.ok(result.includes('Argent sorti du compte'));assert.ok(result.includes('Dette de carte réduite'));});
test('no budget revenue or net-wealth impact',()=>{
 assert.ok(result.includes('Nouvelle dépense dans ton budget'));
 assert.ok(result.includes('Nouveau revenu'));assert.ok(result.includes('Variation du patrimoine net'));
 assert.ok(result.includes('0,00'));});
test('statement evidence includes its original date and merchant',()=>{
 assert.ok(result.includes('Paiement'));assert.ok(result.includes('7 octobre 2026'));});
test('receipt can be closed without unlinking',()=>{
 assert.ok(result.includes('id="keepCardEvidence"'));assert.ok(result.includes('>Fermer</button>'));});
test('dangerous unlink option is secondary and requires confirmation',()=>{
 assert.ok(result.indexOf('id="keepCardEvidence"')<result.indexOf('id="unlinkCardEvidence"'));
 assert.ok(result.includes('<details class="trace-card-payment-correction">'));
 assert.ok(result.includes('id="traceUnlinkConfirm" hidden'));});
test('the receipt never claims a new card credit as available cash',()=>{
 assert.ok(!result.includes('nouveau revenu de 750'));assert.ok(result.includes('n’ajoute aucun mouvement bancaire'));});
test('malicious statement names are escaped',()=>{
 const html=detail.render({transfer,evidence:[{...evidence,name:'<img src=x onerror=alert(1)>'}]});
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));});
test('multiple statement lines are listed and mismatch is flagged',()=>{
 const html=detail.render({transfer,evidence:[evidence,{...evidence,id:'e2',amount:100}]});
 assert.ok(html.includes('2 lignes du relevé'));assert.ok(html.includes('ne correspond pas exactement'));});
test('empty evidence is not presented as reconciled',()=>{
 assert.equal(detail.render({transfer,evidence:[]}), '');
});
function extract(name,end){
 const begin=app.indexOf('function '+name+'('),last=app.indexOf(end,begin+10);
 assert.ok(begin>=0&&last>begin,'Cannot find '+name);
 return app.slice(begin,last).trim();
}
function factory(name,end,bindings){
 const fn=extract(name,end);
 return new Function(...Object.keys(bindings),'return ('+fn+')')(...Object.values(bindings));
}
test('opening payment receipt is read-only, unlink is an explicit two-step action',async()=>{
 const state={accounts:[{id:'checking',owner:'la',name:'LA — Courant'},{id:'card',owner:'la',name:'LA — Carte'}],
   transactions:[transfer],smartImports:[{...evidence}]};
 const nodes=new Map(),writes=[];
 const $=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{hidden:false,disabled:false,onclick:null});
  return nodes.get(selector);
 };
 const cardPaymentEvidenceFor=factory('cardPaymentEvidenceFor','\nfunction requireCardEvidenceUnlink(',{state});
 let markup='',title='',closed=false,rendered=false,edited=false;
 const requireCardEvidenceUnlink=factory('requireCardEvidenceUnlink','\nfunction editTransaction(',{
  state,cardPaymentEvidenceFor,
  $,
  shortAccountLabel:a=>a.name,
  window:{TraceCardPaymentDetail:detail},
  openSheet:(t,h)=>{title=t;markup=h;},
  traceFeedback:()=>'<div id="traceFeedback"></div>',
  closeSheet:()=>{closed=true;},
  renderAll:()=>{rendered=true;},
  editTransaction:()=>{edited=true;},
  saveDocument:async(collection,value)=>{writes.push({collection,value});},
  traceNotice:e=>{throw e;}
 });
 assert.equal(requireCardEvidenceUnlink(transfer),true);
 assert.equal(title,'Paiement de carte rapproché');
 assert.ok(markup.includes('750,00'));
 assert.equal(writes.length,0);
 $('#keepCardEvidence').onclick();assert.equal(closed,true);assert.equal(writes.length,0);
 $('#unlinkCardEvidence').onclick();
 assert.equal($('#traceUnlinkConfirm').hidden,false);
 assert.equal(writes.length,0);
 $('#traceUnlinkCancel').onclick();
 assert.equal($('#traceUnlinkConfirm').hidden,true);
 assert.equal(writes.length,0);
 $('#unlinkCardEvidence').onclick();
 await $('#traceUnlinkNow').onclick();
 assert.equal(writes.length,1);
 assert.equal(writes[0].collection,'imports');
 assert.equal(writes[0].value.status,'pending');
 assert.equal(writes[0].value.linkedTransactionId,null);
 assert.equal(state.transactions[0].status,'confirmed');
 assert.equal(rendered,true);assert.equal(edited,true);
});
test('clicking the card-side matched statement opens same transfer receipt',()=>{
 const statement={id:'statement750',type:'card_statement_evidence',status:'confirmed',
  linkedTransactionId:'payment750',accountId:'card',amountCAD:750,date:'2026-10-07'};
 const state={transactions:[transfer,statement]};let opened=false,captured=null;
 const editTransaction=factory('editTransaction','\nfunction deleteTransaction(',{
  state,requireCardEvidenceUnlink:t=>{captured=t;opened=true;return true;}
 });
 editTransaction('statement750');
 assert.equal(opened,true);assert.equal(captured.id,'payment750');
});
test('orphan card-side evidence does not offer deletion',()=>{
 const orphan={id:'orphan',type:'card_statement_evidence',status:'confirmed',
  linkedTransactionId:'missing',accountId:'card',amountCAD:750};
 const state={transactions:[orphan]};
 let title='',html='';
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{onclick:null});return nodes.get(id);};
 const editTransaction=factory('editTransaction','\nfunction deleteTransaction(',{
  state,$,openSheet:(t,h)=>{title=t;html=h;},closeSheet(){},
  requireCardEvidenceUnlink:()=>false
 });
 editTransaction('orphan');
 assert.equal(title,'Ligne de carte à vérifier');
 assert.ok(html.includes('introuvable'));
 assert.ok(!html.includes('Supprimer'));
});
process.on('beforeExit',()=>{console.log(tests+' card reconciliation detail scenarios checked');});
