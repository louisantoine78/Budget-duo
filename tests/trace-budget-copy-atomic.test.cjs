'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../v5-app-5.37.0.js'),'utf8');
const begin=app.indexOf('async function copyPreviousBudget(){'),
 end=app.indexOf('\nfunction txRow(t){',begin);
assert.ok(begin>0&&end>begin,'Copy-budget candidate missing');
const factory=new Function('state','me','budgetMonth','budgetScope',
 'monthOffset','monthLabel','openSheet','closeSheet','uiIcon','esc','money','$',
 'saveDocument','budgetDocId','renderBudget','renderHome','traceWritesBlocked','console',
 app.slice(begin,end)+'\nreturn copyPreviousBudget;');
const make=(options={})=>{
 const nodes={},calls=[],backing=new Map(),renders={budget:0,home:0},errors=[];
 let seq=0;
 const state={budgets:(options.rows||[
  {id:'previous-a',month:'2026-09',scope:'la',categoryId:'food',amount:70},
  {id:'previous-b',month:'2026-09',scope:'la',categoryId:'rent',amount:120},
  {id:'previous-couple',month:'2026-09',scope:'couple',categoryId:'food',amount:380},
  {id:'old-target',month:'2026-10',scope:'la',categoryId:'rent',amount:150},
  {id:'partner-target',month:'2026-10',scope:'partner',categoryId:'food',amount:510}
 ]).map(x=>({...x}))};
 const $=selector=>nodes[selector]||(nodes[selector]={disabled:false,textContent:'',onclick:null});
 const saveDocument=async(collection,item)=>{
  const snapshot=JSON.parse(JSON.stringify(item));calls.push(snapshot);
  if(options.onSave)await options.onSave(collection,snapshot);
  backing.set(item.id,snapshot);
 };
 const copy=factory(state,'la','2026-10',options.scope||'mine',
  (s,n)=>n===-1?'2026-09':'2026-10',
  v=>v,
  (title,html)=>{nodes.sheet={title,html}},
  ()=>{nodes.closed=true},
  ()=>'*',s=>String(s),n=>String(n),$,
  saveDocument,()=>`new-${++seq}`,
  ()=>{renders.budget++},()=>{renders.home++},options.blocked||false,
  {error:e=>errors.push(String(e.message||e))});
 return {state,nodes,calls,backing,errors,renders,copy};
};
test('copy leaves prior and target unchanged until CAS persistence succeeds',async()=>{
 let resume;
 const gate=new Promise(resolve=>resume=resolve);
 const x=make({onSave:async()=>gate});
 const old=x.state.budgets.find(b=>b.id==='old-target');
 await x.copy();
 assert.match(x.nodes.sheet.html,/traceBudgetCopyError/);
 const task=x.nodes['#confirmBudgetCopy'].onclick();
 assert.equal(x.state.budgets.find(b=>b.id==='old-target').amount,150);
 assert.equal(x.state.budgets.some(b=>b.id==='new-1'),false);
 resume();await task;
 assert.equal(old.amount,120);
 assert.equal(x.state.budgets.find(b=>b.categoryId==='food'&&b.month==='2026-10'&&b.scope==='la').amount,70);
 assert.equal(x.nodes.closed,true);
});
test('a failed first save leaves memory unchanged and gives an actionable error',async()=>{
 const x=make({onSave:async()=>{throw Error('TRACE_WRITE_CONFLICT test')}}),before=JSON.stringify(x.state.budgets);
 await x.copy();await x.nodes['#confirmBudgetCopy'].onclick();
 assert.equal(JSON.stringify(x.state.budgets),before);
 assert.match(x.nodes['#traceBudgetCopyError'].textContent,/0 sur 2/);
 assert.equal(x.nodes['#confirmBudgetCopy'].disabled,false);
 assert.equal(x.renders.budget,1);
 assert.equal(x.renders.home,1);
});
test('second failed save preserves only confirmed rows and retry never duplicates them',async()=>{
 let fail=true;
 const x=make({onSave:async(_c,_item)=>{
  if(fail&&x.calls.length===2){fail=false;throw Error('network failure')}
 }});
 await x.copy();
 await x.nodes['#confirmBudgetCopy'].onclick();
 assert.equal(x.state.budgets.filter(b=>b.month==='2026-10'&&b.scope==='la').length,2);
 assert.equal(x.state.budgets.find(b=>b.id==='old-target').amount,150);
 assert.equal(x.state.budgets.find(b=>b.categoryId==='food'&&b.month==='2026-10'&&b.scope==='la').amount,70);
 assert.match(x.nodes['#traceBudgetCopyError'].textContent,/1 sur 2/);
 const firstConfirmed=x.calls[0].id;
 await x.nodes['#confirmBudgetCopy'].onclick();
 assert.equal(x.calls[2].id,firstConfirmed);
 assert.equal(x.state.budgets.filter(b=>b.month==='2026-10'&&b.scope==='la').length,2);
 assert.equal(x.state.budgets.find(b=>b.id==='old-target').amount,120);
 assert.equal(x.nodes.closed,true);
 assert.equal(x.backing.get('old-target').amount,120);
});
test('couple budgets do not copy personal or partner rows and block retry on stale conflict',async()=>{
 const x=make({scope:'couple',blocked:true,onSave:async()=>{throw Error('stale revision')}});
 await x.copy();await x.nodes['#confirmBudgetCopy'].onclick();
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].scope,'couple');
 assert.equal(x.state.budgets.some(b=>b.month==='2026-10'&&b.scope==='couple'),false);
 assert.equal(x.state.budgets.find(b=>b.id==='partner-target').amount,510);
 assert.equal(x.nodes['#confirmBudgetCopy'].disabled,true);
 assert.match(x.nodes['#traceBudgetCopyError'].textContent,/Recharge TRACE/);
});


