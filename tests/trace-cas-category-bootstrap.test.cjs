'use strict';
// TRACE bootstrap regression: tests actual client functions with in-memory
// fictional documents. No hosted Supabase, bank credentials, or external HTTP.
const fs=require('node:fs'),path=require('node:path'),
 {test}=require('node:test'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'..','v5-app-5.37.0.js'),'utf8');
const begin=app.indexOf('async function seedNewHouseholdCategories(hid){');
const end=app.indexOf('let initialBankSetupShown=',begin);
assert.ok(begin>=0&&end>begin);
const source=app.slice(begin,end);
function fixture({existing=[],failure=null,race=null}={}){
 const rows=new Map(existing.map(row=>[row.item_id,{...row}]));
 const calls=[],revs=new Map(),state={categories:[],budgets:[]};
 const starter=[
  {item_id:'groceries',data:{id:'groceries',name:'Épicerie'}},
  {item_id:'restaurants',data:{id:'restaurants',name:'Restaurants'}},
  {item_id:'transport',data:{id:'transport',name:'Transport'}}];
 const client={
  from(collection){
   assert.equal(collection,'documents');
   const filters={};
   return{select(){return this;},eq(k,v){filters[k]=v;return this;},
    maybeSingle(){const item=rows.get(filters.item_id);return Promise.resolve({
     data:item?{item_id:item.item_id,revision:item.revision}:null,error:null});},
    then(resolve,reject){
     const list=[...rows.values()].filter(x=>!filters.item_id||x.item_id===filters.item_id);
     return Promise.resolve({data:list,error:null}).then(resolve,reject);
    }};
  },
  async rpc(name,p){
   assert.equal(name,'trace_cas_save_document');calls.push(p.p_item_id);
   if(failure&&failure.id===p.p_item_id&&!failure.done){
    failure.done=true;return{data:null,error:{message:failure.message||'Network unavailable'}};
   }
   if(race&&race.id===p.p_item_id&&!race.done){
    race.done=true;if(race.create)rows.set(p.p_item_id,{
     item_id:p.p_item_id,data:{id:p.p_item_id,name:'Another member'},revision:2});
    return{data:null,error:{message:'TRACE_WRITE_CONFLICT: simultaneous create'}};
   }
   if(rows.has(p.p_item_id))return{data:null,error:{message:'TRACE_WRITE_CONFLICT: existing'}};
   rows.set(p.p_item_id,{item_id:p.p_item_id,data:p.p_data,revision:0});
   return{data:0,error:null};
  }
 };
 let renders=0,conflicts=0;
 const build=new Function('session','household','client','state',
  'starterCategoryDocs','traceDocRevisions','traceWriteKey','traceRevision',
  'traceSaveFailure','renderAll',source+
  'return {seedNewHouseholdCategories,restoreStarterCategories};');
 const api=build({user:{id:'fake-member'}},{id:'fake-house'},client,state,
  ()=>starter,revs,(c,id)=>JSON.stringify([c,id]),
  n=>{assert.ok(Number.isSafeInteger(Number(n))&&Number(n)>=0);return Number(n);},
  e=>{conflicts++;return new Error(e.message)},()=>{renders++;});
 return{api,rows,calls,revs,state,get renders(){return renders;},
  get conflicts(){return conflicts;}};
}
const existing={item_id:'groceries',revision:5,
 data:{id:'groceries',name:'Personnalisée'}};
test('bootstrap preserves edited starter categories and creates only missing IDs',async()=>{
 const f=fixture({existing:[existing]});
 await f.api.seedNewHouseholdCategories('fake-house');
 assert.equal(f.rows.get('groceries').data.name,'Personnalisée');
 assert.deepEqual(f.calls,['restaurants','transport']);
 assert.equal(f.revs.get(JSON.stringify(['categories','groceries'])),5);
});
test('network interruption can be retried without re-creating persisted keys',async()=>{
 const f=fixture({existing:[existing],failure:{id:'restaurants'}});
 await assert.rejects(f.api.seedNewHouseholdCategories('fake-house'),/Network unavailable/);
 await f.api.seedNewHouseholdCategories('fake-house');
 assert.equal(f.rows.size,3);
 assert.equal(f.rows.get('groceries').data.name,'Personnalisée');
});
test('simultaneous category creation is observed but never overwritten',async()=>{
 const f=fixture({existing:[existing],race:{id:'restaurants',create:true}});
 await f.api.seedNewHouseholdCategories('fake-house');
 assert.equal(f.rows.get('restaurants').data.name,'Another member');
 assert.equal(f.revs.get(JSON.stringify(['categories','restaurants'])),2);
 assert.equal(f.conflicts,0);
});
test('unexplained create-only conflict is not swallowed',async()=>{
 const f=fixture({race:{id:'restaurants',create:false}});
 await assert.rejects(f.api.seedNewHouseholdCategories('fake-house'),/TRACE_WRITE_CONFLICT/);
 assert.equal(f.conflicts,1);
});
test('restore loads revision indices for subsequent category edits',async()=>{
 const f=fixture({existing:[existing]});
 await f.api.restoreStarterCategories();
 assert.equal(f.state.categories.length,3);
 assert.equal(f.revs.get(JSON.stringify(['categories','transport'])),0);
 assert.equal(f.revs.get(JSON.stringify(['categories','groceries'])),5);
 assert.equal(f.renders,1);
});
test('malformed persisted category does not enter financial client state',async()=>{
 const f=fixture({existing:[{item_id:'groceries',revision:0,data:{id:'wrong'}}]});
 await assert.rejects(f.api.restoreStarterCategories(),/incohérent/);
 assert.equal(f.state.categories.length,0);
});

test('partial category recovery is additive even with existing budgets and archived rows',async()=>{
 const archived={item_id:'transport',revision:3,data:{id:'transport',name:'Transport',archived:true}};
 const f=fixture({existing:[existing,archived]});
 f.state.categories=[existing.data,archived.data];
 f.state.budgets=[{id:'october-budget',categoryId:'groceries',amount:250}];
 await f.api.restoreStarterCategories();
 assert.equal(f.state.categories.length,3);
 assert.equal(f.rows.get('groceries').data.name,'Personnalisée');
 assert.equal(f.rows.get('transport').data.archived,true);
 assert.equal(f.state.budgets[0].amount,250);
 assert.deepEqual(f.calls,['restaurants']);
});
test('manual additive repair is offered on an incomplete starter catalog',()=>{
 assert.match(app,/STARTER_CATEGORIES\.some\(\(\[id\]\)=>!state\.categories\.some/);
 assert.match(app,/Ajouter les catégories de départ manquantes/);
});
