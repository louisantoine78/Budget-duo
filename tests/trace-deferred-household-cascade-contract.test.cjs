'use strict';
// Static regression contracts for candidate migration 10 and fictional PG
// integration cases. NOT an execution of any PostgreSQL migration.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const sql=fs.readFileSync(path.join(root,
 'migrations/10-trace-deferred-write-quarantine.sql'),'utf8');
const pg=fs.readFileSync(path.join(root,
 'tests/trace-cas-writes.integration.cjs'),'utf8');

test('deferred quarantine retains security definer with empty search path',()=>{
 assert.match(sql,/trace_reject_unreleased_deferred_document\(\)[\s\S]+?returns trigger language plpgsql security definer/);
 assert.match(sql,/set search_path = ''\s+as \$deferred_guard\$/);
 assert.match(sql,/before insert or update or delete on public\.documents/);
 assert.match(sql,/revoke all on function public\.trace_reject_unreleased_deferred_document/);
});
test('admin cascade escape requires JWT-free postgres login and absent parent',()=>{
 assert.match(sql,/if tg_op = 'DELETE' then[\s\S]*?if auth\.uid\(\) is null/);
 assert.match(sql,/current_user = 'postgres' and session_user = 'postgres'/);
 assert.match(sql,/and not exists \(\s*select 1 from public\.households h\s*where h\.id = old\.household_id\s*\) then/);
 assert.doesNotMatch(sql,/pg_trigger_depth\s*\(/i);
});
test('ordinary deferred deletion and original metadata-laundering remain denied',()=>{
 assert.match(sql,/TRACE_DEFERRED_NOT_RELEASED: deferred deletion disabled/);
 assert.match(sql,/trace_is_unreleased_deferred_doc\(old\.household_id,old\.collection,old\.data\)/);
 assert.match(sql,/TRACE_DEFERRED_NOT_RELEASED: deferred record update disabled/);
 assert.match(sql,/TRACE_DEFERRED_NOT_RELEASED: deferred write disabled/);
});
test('PG fixture covers direct-denial, multi-document cascade and all dependent tables',()=>{
 assert.match(pg,/deferred card cannot be directly deleted by administrator/);
 assert.match(pg,/household member cannot delete the entire deferred household/);
 assert.match(pg,/administrative household erasure cascades through historical deferred records/);
 assert.match(pg,/archive-csv-source/);
 assert.match(pg,/historical-deferred/);
 assert.match(pg,/for\(const table of \['households','household_members','documents','trace_v5_backups'\]\)/);
});
test('candidates are not wired to a hosted migration or live Supabase connection',()=>{
 assert.doesNotMatch(sql,/https?:\/\/|service_role|apikey/i);
 assert.doesNotMatch(pg,/supabase\.co\/rest\/v1|createClient\s*\(/);
});

test('deferred calendar keys stay quarantined even with forged payment mode',()=>{
 const begin=sql.indexOf("when p_collection = 'accounts' then");
 const end=sql.indexOf("when p_collection in ('transactions'",begin);
 const block=sql.slice(begin,end);
 assert.ok(begin>=0&&end>begin);
 for(const key of ['deferredDebitDay','deferredClosingDay','deferredScheduleVersions'])
  assert.match(block,new RegExp("'"+key+"'"));
 assert.match(sql,/'scheduledDueDate','allocationDueDate'/);
});
