'use strict';
/*
 * TRACE 5.37 — opt-in, isolated hosted Supabase Auth + RLS + CAS rehearsal.
 * NEVER use on TRACE production; creates fictional households/documents.
 * No service role, no actual account/financial data, no automatic run.
 */
const {randomUUID}=require('node:crypto');
// Deny all existing projects from the account inventory.
const EXISTING_PROJECT_REFS=new Set([
 'eiqvabddtgfonouyeavi','rawugpdmtgumokeljefj','humynutiulcwmcktzyuu'
]);
const runToken='I_ACCEPT_ISOLATED_TEST_WRITES';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function config(env){
 const ref=String(env.TRACE_537_QA_REF||'').trim().toLowerCase();
 if(!/^[a-z]{20}$/.test(ref)||EXISTING_PROJECT_REFS.has(ref))
  throw Error('ISOLATED_QA_REQUIRED: isolated, non-production project ref missing');
 if(String(env.TRACE_537_QA_CONFIRM_REF||'').trim()!==ref ||
    env.TRACE_537_QA_RUN!==runToken)
  throw Error('ISOLATED_QA_REQUIRED: explicit project confirmation and write opt-in required');
 const url=String(env.TRACE_537_QA_URL||'');
 if(url!=='https://'+ref+'.supabase.co')
  throw Error('ISOLATED_QA_REQUIRED: URL/ref mismatch; only project subdomain over HTTPS');
 const key=String(env.TRACE_537_QA_PUBLISHABLE_KEY||'');
 if(!key||/secret|service.role/i.test(key))
  throw Error('ISOLATED_QA_REQUIRED: public/anon key only; secret/service_role forbidden');
 if(key.startsWith('eyJ')){
  let claim;
  try{claim=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString());}
  catch{throw Error('ISOLATED_QA_REQUIRED: malformed legacy JWT key');}
  if(claim.role!=='anon')throw Error('ISOLATED_QA_REQUIRED: legacy key must have anon role');
 }else if(!key.startsWith('sb_publishable_'))
  throw Error('ISOLATED_QA_REQUIRED: expected Supabase publishable or legacy anon key');
 const users=['A','B','C'].map(slot=>{
  const email=String(env['TRACE_537_QA_'+slot+'_EMAIL']||'').trim();
  const password=String(env['TRACE_537_QA_'+slot+'_PASSWORD']||'');
  if(!email.includes('@')||!password||password.length<8)
   throw Error('ISOLATED_QA_REQUIRED: three pre-created fictional test logins required');
  return{slot,email,password};
 });
 if(new Set(users.map(u=>u.email.toLowerCase())).size!==3)
  throw Error('ISOLATED_QA_REQUIRED: distinct test users required');
 return{ref,url,key,users};
}
function client(cfg,token,fetcher){
 async function req(verb,route,body=null){
  const headers={'apikey':cfg.key,'Authorization':'Bearer '+(token||cfg.key),
   'Accept':'application/json'};
  if(body!==null)headers['Content-Type']='application/json';
  const res=await fetcher(cfg.url+route,{method:verb,headers,
   ...(body!==null?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  let data;
  try{data=await res.json();}catch{data=null;}
  return{ok:res.ok,status:res.status,data};
 }
 async function must(verb,route,body){
  const r=await req(verb,route,body);
  if(!r.ok)throw Error('ISOLATED_QA_API_FAILED: '+verb+' '+route.split('?')[0]+': HTTP '+r.status);
  return r.data;
 }
 return{req,must};
}
const isDenied=r=>!r.ok&&r.status>=400&&r.status<500&&
 (/TRACE_WRITE_FORBIDDEN|permission denied|insufficient privilege/i.test(String(r.data?.message||''))||
  [401,403].includes(r.status));
function oneRow(x,context){const r=Array.isArray(x)?x[0]:x;if(!r||typeof r!=='object')throw Error('ISOLATED_QA_SHAPE: '+context);return r;}
async function run({env=process.env,fetchImpl=globalThis.fetch,idFactory=randomUUID}={}){
 const cfg=config(env);
 if(typeof fetchImpl!=='function')throw Error('ISOLATED_QA_REQUIRED: fetch implementation');
 let steps=0;
 const pass=()=>steps++;
 const signed=[];
 for(const user of cfg.users){
  const anonymous=client(cfg,null,fetchImpl);
  const token=await anonymous.must('POST','/auth/v1/token?grant_type=password',
   {email:user.email,password:user.password});
  if(!uuid.test(token?.user?.id)||!token?.access_token)
   throw Error('ISOLATED_QA_AUTH: login returned no authenticated user');
  signed.push({slot:user.slot,id:token.user.id,api:client(cfg,token.access_token,fetchImpl)});
  pass();
 }
 if(new Set(signed.map(u=>u.id)).size!==3)throw Error('ISOLATED_QA_AUTH: same identity reused');
 // Refuse to touch existing workspaces. Test identities must be new and disposable.
 for(const u of signed){
  const rows=await u.api.must('GET','/rest/v1/household_members?select=household_id&user_id=eq.'+u.id+'&limit=1');
  if(!Array.isArray(rows)||rows.length)throw Error('ISOLATED_QA_REFUSED: test user already in a household');
  pass();
 }
 const [a,b,c]=signed;
 const hA=oneRow(await a.api.must('POST','/rest/v1/rpc/create_household',
  {p_name:'TRACE QA '+idFactory().slice(0,8),p_display_name:'QA A'}),'create household');
 if(!uuid.test(hA.household_id)||!hA.invite_code)throw Error('ISOLATED_QA_SHAPE: household');
 const hB=oneRow(await b.api.must('POST','/rest/v1/rpc/join_household',
  {p_invite_code:hA.invite_code,p_display_name:'QA B'}),'join household');
 if(hB.household_id!==hA.household_id)throw Error('ISOLATED_QA_LEAK: joining wrong household');
 const hC=oneRow(await c.api.must('POST','/rest/v1/rpc/create_household',
  {p_name:'TRACE QA OTHER '+idFactory().slice(0,8),p_display_name:'QA C'}),'outsider household');
 if(hC.household_id===hA.household_id)throw Error('ISOLATED_QA_LEAK: outsider joined test household');
 pass();
 const category=idFactory(),otherCategory=idFactory();
 const make=(id)=>({id,type:'expense',name:'Fictional QA only'});
 const write=async(u,h,id)=>{
  const revision=await u.api.must('POST','/rest/v1/rpc/trace_cas_save_document',
   {p_household_id:h,p_collection:'categories',p_item_id:id,
    p_data:make(id),p_expected_revision:null});
  if(Number(revision)!==0)throw Error('ISOLATED_QA_CAS: expected creation revision zero');
 };
 await write(a,hA.household_id,category);
 await write(c,hC.household_id,otherCategory);
 pass();
 const read=async(u,h)=>u.api.must('GET','/rest/v1/documents?select=item_id&household_id=eq.'+
  h+'&collection=eq.categories');
 const seenA=await read(a,hA.household_id),seenB=await read(b,hA.household_id),
  unseenC=await read(c,hA.household_id);
 if(!seenA.some(r=>r.item_id===category)||!seenB.some(r=>r.item_id===category)||
  unseenC.length!==0)throw Error('ISOLATED_QA_LEAK: shared/outsider RLS read failed');
 pass();
 // RLS must also protect household names, members and membership metadata.
 const household=async(u,id)=>u.api.must('GET',
  '/rest/v1/households?select=id&id=eq.'+id);
 const members=async(u,id)=>u.api.must('GET',
  '/rest/v1/household_members?select=user_id&household_id=eq.'+id);
 for(const u of [a,b]){
  const sharedHouse=await household(u,hA.household_id),
   sharedMembers=await members(u,hA.household_id);
  if(sharedHouse.length!==1||sharedMembers.length!==2)
   throw Error('ISOLATED_QA_LEAK: shared household/membership read failed');
  if((await household(u,hC.household_id)).length||
     (await members(u,hC.household_id)).length)
   throw Error('ISOLATED_QA_LEAK: foreign household/membership visible');
 }
 if((await household(c,hA.household_id)).length||
    (await members(c,hA.household_id)).length||
    (await household(c,hC.household_id)).length!==1)
  throw Error('ISOLATED_QA_LEAK: outsider household visibility failed');
 pass();
 const hiddenA=await read(a,hC.household_id),hiddenB=await read(b,hC.household_id),
  ownC=await read(c,hC.household_id);
 if(hiddenA.length||hiddenB.length||!ownC.some(r=>r.item_id===otherCategory))
  throw Error('ISOLATED_QA_LEAK: reverse RLS read failed');
 pass();
 for(const [user,h] of [[c,hA.household_id],[a,hC.household_id],[b,hC.household_id]]){
  const denied=await user.api.req('POST','/rest/v1/rpc/trace_cas_save_document',
   {p_household_id:h,p_collection:'categories',p_item_id:idFactory(),
    p_data:make(idFactory()),p_expected_revision:null});
  if(!isDenied(denied))throw Error('ISOLATED_QA_LEAK: foreign CAS write was not denied');
 }
 pass();
 // A missing CAS version must not overwrite a document already created by A.
 const conflict=await b.api.req('POST','/rest/v1/rpc/trace_cas_save_document',
  {p_household_id:hA.household_id,p_collection:'categories',p_item_id:category,
   p_data:make(category),p_expected_revision:null});
 if(conflict.ok||!String(conflict.data?.message||'').includes('TRACE_WRITE_CONFLICT'))
  throw Error('ISOLATED_QA_CAS: stale duplicate document was accepted');
 pass();
 // Migration 12 must remove all authenticated direct table writes.
 const direct=await a.api.req('POST','/rest/v1/documents',
  {household_id:hA.household_id,collection:'categories',item_id:idFactory(),
   data:make(idFactory()),updated_by:a.id});
 if(!isDenied(direct))throw Error('ISOLATED_QA_LEAK: bypass of exclusive CAS allowed');
 pass();
 return{passed:true,checks:steps,projectRef:cfg.ref,fictional:true,
  productionTouched:false,createdHouseholds:2,createdCategories:2};
}
module.exports={config,run,client,isDenied};
if(require.main===module)run().then(report=>{
 console.log(JSON.stringify(report));
}).catch(error=>{
 console.error('TRACE 5.37 hosted isolated QA NO-GO:',error.message);
 process.exitCode=1;
});

