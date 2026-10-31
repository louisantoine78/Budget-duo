'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {config,run,isDenied}=require('../scripts/trace-537-hosted-auth-rls-smoke.cjs');
const ref='abcdefghijklmnopqrst';
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function env(){
 return{TRACE_537_QA_REF:ref,TRACE_537_QA_CONFIRM_REF:ref,
  TRACE_537_QA_URL:'https://'+ref+'.supabase.co',
  TRACE_537_QA_RUN:'I_ACCEPT_ISOLATED_TEST_WRITES',
  TRACE_537_QA_PUBLISHABLE_KEY:'sb_publishable_qa_mock_public',
  ...Object.fromEntries(['A','B','C'].flatMap(u=>[
   ['TRACE_537_QA_'+u+'_EMAIL','fictional-'+u+'@invalid.example'],
   ['TRACE_537_QA_'+u+'_PASSWORD','fictional-test-pass-'+u]]))};
}
function mockBackend({leakRead=false,acceptForeignWrite=false,acceptDirectWrite=false,preExisting=false}={}){
 const households={},member={A:null,B:null,C:null},documents=[];
 let counter=0;
 const nextHouse=()=>uid(100+ ++counter);
 const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,
  headers:{'Content-Type':'application/json'}});
 async function fetchMock(url,request){
  const req=new URL(url),body=request.body?JSON.parse(request.body):{},
    token=request.headers.Authorization||'',user=token.replace('Bearer session-','');
  if(req.pathname==='/auth/v1/token'){
   const slot=/fictional-([ABC])@invalid/.exec(body.email)?.[1];
   if(!slot)return respond({message:'Invalid credentials'},400);
   return respond({access_token:'session-'+slot,user:{id:uid(slot.charCodeAt(0)-64)}});
  }
  if(!['A','B','C'].includes(user))return respond({message:'no token'},401);
  if(req.pathname==='/rest/v1/household_members'){
   if(req.searchParams.has('user_id'))
    return respond(preExisting&&user==='B'?[{household_id:uid(900)}]:[]);
   const id=(req.searchParams.get('household_id')||'').replace(/^eq\./,'');
   return respond(!leakRead&&id!==member[user]?[]:
    Object.keys(member).filter(m=>member[m]===id&&member[m])
     .map(m=>({user_id:uid(m.charCodeAt(0)-64)})));
  }
  if(req.pathname==='/rest/v1/households'){
   const id=(req.searchParams.get('id')||'').replace(/^eq\./,'');
   return respond(households[id]&&(leakRead||id===member[user])?[{id}]:[]);
  }
  if(req.pathname==='/rest/v1/rpc/create_household'){
   const hid=nextHouse();
   households[hid]={owner:user,code:'INVITE-'+user};
   member[user]=hid;
   return respond({household_id:hid,invite_code:households[hid].code,slot:'la'});
  }
  if(req.pathname==='/rest/v1/rpc/join_household'){
   const hid=Object.keys(households).find(h=>households[h].code===body.p_invite_code);
   if(!hid)return respond({message:'bad invite'},400);
   member[user]=hid;return respond({household_id:hid,invite_code:households[hid].code,slot:'partner'});
  }
  if(req.pathname==='/rest/v1/rpc/trace_cas_save_document'){
   if(member[user]!==body.p_household_id&&!acceptForeignWrite)
    return respond({message:'TRACE_WRITE_FORBIDDEN'},400);
   const existing=documents.find(d=>d.household_id===body.p_household_id&&d.item_id===body.p_item_id);
   if(existing)return respond({message:'TRACE_WRITE_CONFLICT'},409);
   documents.push({household_id:body.p_household_id,item_id:body.p_item_id});
   return respond(0);
  }
  if(req.pathname==='/rest/v1/documents'&&request.method==='GET'){
   const h=(req.searchParams.get('household_id')||'').replace(/^eq\./,'');
   return respond(documents.filter(d=>d.household_id===h&&(leakRead||member[user]===h))
    .map(d=>({item_id:d.item_id})));
  }
  if(req.pathname==='/rest/v1/documents'&&request.method==='POST'){
   if(acceptDirectWrite)return respond({ok:true},201);
   return respond({message:'permission denied for table documents'},403);
  }
  return respond({message:'unknown route'},404);
 }
 return{fetchMock,documents,member};
}
test('refuses production, project mismatch, secrets, old users, missing consent before I/O',async()=>{
 assert.throws(()=>config({}),/ISOLATED_QA_REQUIRED/);
 for(const field of [
  ['TRACE_537_QA_REF','eiqvabddtgfonouyeavi'],
  ['TRACE_537_QA_REF','rawugpdmtgumokeljefj'],
  ['TRACE_537_QA_REF','humynutiulcwmcktzyuu'],
  ['TRACE_537_QA_CONFIRM_REF','differentrefabcdefgh'],
  ['TRACE_537_QA_URL','https://evil.example.com'],
  ['TRACE_537_QA_PUBLISHABLE_KEY','sb_secret_fake'],
  ['TRACE_537_QA_RUN',''],
  ['TRACE_537_QA_B_EMAIL','fictional-A@invalid.example']]){
  const e=env();e[field[0]]=field[1];
  assert.throws(()=>config(e),/ISOLATED_QA_REQUIRED/);
 }
 let called=0;
 await assert.rejects(run({env:{},fetchImpl:()=>{called++;}}),/ISOLATED_QA_REQUIRED/);
 assert.equal(called,0);
 const m=mockBackend({preExisting:true});
 await assert.rejects(run({env:env(),fetchImpl:m.fetchMock}),/ISOLATED_QA_REFUSED/);
 assert.equal(m.documents.length,0);
});
test('isolated fake HTTP: A and B share data, C sees nothing, CAS and direct writes denied',async()=>{
 const m=mockBackend(),r=await run({env:env(),fetchImpl:m.fetchMock});
 assert.equal(r.passed,true);assert.equal(r.checks,14);
 assert.equal(m.documents.length,2);
 assert.notEqual(m.member.A,m.member.C);
 assert.equal(m.member.A,m.member.B);
 assert.equal(r.productionTouched,false);
});
test('fail closed if cross-household reads, unauthorized writes or direct-table writes are allowed',async()=>{
 for(const opts of [{leakRead:true},{acceptForeignWrite:true},{acceptDirectWrite:true}]){
  const m=mockBackend(opts);
  await assert.rejects(run({env:env(),fetchImpl:m.fetchMock}),/ISOLATED_QA_LEAK/);
 }
 assert.equal(isDenied({ok:false,status:400,data:{message:'TRACE_WRITE_FORBIDDEN'}}),true);
 assert.equal(isDenied({ok:true,status:200,data:{}}),false);
});

