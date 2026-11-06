'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const F=require('../trace-20-fresh-start-1.0.0.js');
const at='2026-11-06T00:00:00Z';
const old='2026-10-20T10:00:00+00:00',fresh='2026-11-06T00:00:01+00:00';
const entry=(collection,id,created_at,data={id})=>({collection,item_id:id,created_at,data});
test('persisted household cutoff creates a new visible activity and keeps all budget/wealth rows',()=>{
 const docs=[
  entry('transactions','old1',old),entry('transactions','new1',fresh),
  entry('imports','old2',old),entry('import_days','old3',old),
  entry('reconciliations','old4',old),
  entry('accounts','a',old),entry('budgets','b',old),
  entry('categories','c',old),entry('investment_accounts','i',old),
  entry('investment_operations','io',old)
 ];
 const p=F.partition(docs,{trace20FreshStartAt:at});
 assert.equal(p.active,true);
 assert.deepEqual(p.archived.map(x=>x.item_id).sort(),['old1','old2','old3','old4']);
 assert.deepEqual(p.visible.map(x=>x.item_id).sort(),['a','b','c','i','io','new1']);
 assert.equal(docs.length,10);
 assert.equal(docs[0].item_id,'old1');
});
test('same UTC cutoff on both members and no implicit reset without a persisted marker',()=>{
 const docs=[entry('transactions','old1',old),entry('budgets','b',old)];
 assert.deepEqual(F.partition(docs,{}).visible,docs);
 assert.deepEqual(F.partition(docs,{trace20FreshStartAt:at}).visible.map(x=>x.item_id),['b']);
 assert.equal(F.cutoff(at),Date.parse(at));
 assert.throws(()=>F.cutoff('2026-99-06T00:00:00Z'));
 assert.throws(()=>F.cutoff('2026-11-06'),/Invalid/);
});
test('cutover is by immutable document creation, not editable transaction booking day',()=>{
 const p=F.partition([
  entry('transactions','old',old,{id:'old',date:'2027-03-01'}),
  entry('transactions','new',fresh,{id:'new',date:'2026-10-15'})
 ],{trace20FreshStartAt:at});
 assert.equal(p.archived[0].data.id,'old');
 assert.equal(p.visible[0].data.id,'new');
});
test('never interpret missing creation times as proof of a newly created row',()=>{
 assert.throws(()=>F.partition([entry('transactions','x',null)],{trace20FreshStartAt:at}),/Missing/);
 assert.throws(()=>F.partition([null],{trace20FreshStartAt:at}));
});
test('actual real 5.37 client separates archived bank evidence from visible activity',()=>{
 const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
 const beta=fs.readFileSync(path.join(root,'trace-2-0-beta.html'),'utf8');
 assert.ok(app.includes("select('collection,item_id,data,revision,created_at')"));
 assert.ok(app.includes('freshStart.partition(docs,h.settings||{})'));
 assert.ok(app.includes('state[k]=visibleDocs.filter'));
 assert.ok(app.includes("typeof trace20BalanceTransactions==='function'"));
 assert.ok(app.includes('trace20BalanceReconciliations().filter'));
 assert.ok(app.includes('trace20BalanceTransactions().find'));
 assert.ok(app.includes('trace20LegacyBankTransactions=[];trace20LegacyBankReconciliations=[];'));
 const p=beta.indexOf('src="trace-20-fresh-start-1.0.0.js"');
 assert.ok(p>0&&p<beta.indexOf('src="v5-app-5.37.0.js"'));
 assert.ok(!beta.includes('trace20FreshStartAt:'));
});
