'use strict';
// Static security contract only. NOT PostgreSQL/RLS execution.
// Native: node --test tests/trace-csv-evidence-server-contract.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'migrations/11-trace-csv-unparsed-owner-privacy.sql'),'utf8');
const app=fs.readFileSync(path.join(root,'v5-app-5.37.0.js'),'utf8');
const pg=fs.readFileSync(path.join(root,'tests/trace-cas-writes.integration.cjs'),'utf8');
test('privacy SELECT policy is restrictive and scoped only to csv_unparsed evidence',()=>{
 assert.match(sql,/as restrictive for select to authenticated/);
 assert.match(sql,/collection <> 'imports'/);
 assert.match(sql,/coalesce\(data->>'kind',''\) <> 'csv_unparsed'/);
 assert.match(sql,/hm\.slot = data->>'owner'/);
});
test('server trigger applies to direct and CAS inserts updates and deletes',()=>{
 assert.match(sql,/before insert or update or delete on public\.documents/);
 assert.match(sql,/auth\.uid\(\) is null/);
 assert.match(sql,/select hm\.slot into actor_slot/);
 assert.match(sql,/TRACE_CSV_EVIDENCE_FORBIDDEN: retain bank evidence/);
 assert.match(sql,/old\.data - 'status' - 'reviewedAt' - 'reviewedBy'/);
});
test('server validates source, bank owner and review transitions without allowing a role forged in JSON',()=>{
 assert.match(sql,/acct\.data->>'owner' = actor_slot/);
 assert.match(sql,/new\.data->>'owner' is distinct from actor_slot/);
 assert.match(sql,/new\.data->>'id' is distinct from new\.item_id/);
 assert.match(sql,/new\.data->>'source' is distinct from 'csv'/);
 assert.match(sql,/new\.data->>'status' is distinct from 'pending_review'/);
 assert.match(sql,/old\.data->>'status' = 'pending_review'/);
 assert.match(sql,/new\.data->>'status' = 'reviewed'/);
 assert.match(sql,/new\.data->>'reviewedBy' = actor_slot/);
});
test('new migration is repeatable and not wired to any live database deployment',()=>{
 assert.match(sql,/drop policy if exists trace_csv_unparsed_private_select/);
 assert.match(sql,/drop trigger if exists trace_csv_unparsed_evidence_guard/);
 assert.match(sql,/create or replace function public\.trace_guard_csv_unparsed_evidence/);
 assert.doesNotMatch(sql,/service_role|create extension|alter publication/i);
});
test('fictional PostgreSQL tests include both member slots and legacy shared import behavior',()=>{
 assert.match(pg,/migrations\/11-trace-csv-unparsed-owner-privacy\.sql/);
 assert.match(pg,/owner CSV evidence is private/);
 assert.match(pg,/acting\(2,tx=>tx\.query/);
 assert.match(pg,/partner cannot forge owner/);
 assert.match(pg,/private CSV original cannot be changed/);
 assert.match(pg,/manual review is the only permitted state change/);
 assert.match(pg,/old-shared-draft/);
});
test('application never creates a bank transaction merely to retain CSV evidence',()=>{
 const evidence=app.slice(app.indexOf('function csvUnparsedRecord('),
  app.indexOf('// Read-only review of a statement row'));
 assert.match(evidence,/kind:'csv_unparsed'/);
 assert.match(evidence,/status:'pending_review'/);
 assert.doesNotMatch(evidence,/saveDocument\('transactions'/);
 assert.match(app,/await saveDocument\('imports',entry\)/);
 assert.match(app,/const CSV_UNPARSED_REVIEW_LIMIT=100/);
});
