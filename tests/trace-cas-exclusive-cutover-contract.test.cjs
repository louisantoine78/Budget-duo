'use strict';
// Static fail-closed contracts for the OPT-IN migration 12.
// PostgreSQL authorization must be separately qualified under PGlite.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sql=fs.readFileSync(path.join(root,
 'migrations/12-trace-cas-exclusive-write-cutover.sql'),'utf8');
const pg=fs.readFileSync(path.join(root,
 'tests/trace-cas-exclusive-cutover.integration.cjs'),'utf8');

test('migration 12 is opt-in and modifies no financial JSON or schema data',()=>{
 assert.match(sql,/NOT DEPLOYED/);
 assert.match(sql,/legacy 5\.36\.x direct writes/);
 assert.doesNotMatch(sql,/\b(?:update|delete\s+from|truncate|insert\s+into)\s+public\.documents\b/i);
 assert.doesNotMatch(sql,/\bupdate\s+public\.households\b/i);
 assert.doesNotMatch(sql,/\bcreate\s+trigger\b/i);
});
test('cutover preflight requires CAS RPCs RLS and five active triggers',()=>{
 assert.match(sql,/trace_cas_save_document\(uuid,text,text,jsonb,bigint\)/);
 assert.match(sql,/trace_cas_delete_document\(uuid,text,text,bigint\)/);
 assert.match(sql,/trace_cas_save_household_settings\(uuid,jsonb,bigint\)/);
 assert.match(sql,/trace_csv_evidence_guard_ready\(\)/);
 assert.match(sql,/d\.relrowsecurity/);
 assert.match(sql,/h\.relrowsecurity/);
 for(const trigger of ['trace_documents_revision','trace_deferred_write_quarantine',
  'trace_csv_unparsed_evidence_guard','trace_household_settings_revision',
  'trace_personal_settings_guard'])assert.ok(sql.includes(trigger));
 assert.match(sql,/count\(distinct t\.tgname\)/);
});
test('cutover revokes both table-level and column-level document writes',()=>{
 assert.match(sql,/revoke insert, update, delete on table public\.documents\s+from public, anon, authenticated/);
 assert.ok(sql.includes('do $cutover_document_columns$'));
 assert.ok(sql.includes('pg_catalog.pg_attribute'));
 assert.ok(sql.includes('revoke insert (%I), update (%I) on table public.documents'));
 assert.ok(sql.includes("has_column_privilege(role_name,'public.documents',col_name,'UPDATE')"));
 assert.match(sql,/has_table_privilege\('authenticated','public\.documents','SELECT'\)/);
});
test('household setting direct updates are denied but CAS retains access',()=>{
 assert.ok(sql.includes('do $cutover_household_columns$'));
 assert.equal(sql.includes('grant update (name) on table public.households'),false);
 assert.ok(sql.includes('revoke update (%I) on table public.households'));
 assert.ok(sql.includes("has_column_privilege(role_name,'public.households',col_name,'UPDATE')"));
 assert.match(pg,/update public\.households set settings/);
 assert.match(pg,/direct household rename is blocked/);
 assert.match(pg,/trace_cas_save_household_settings/);
});
test('native PG candidate verifies fail-closed preflight grants roles and legitimate CAS',()=>{
 for(const text of ['cutover refuses incomplete 10/11',
  'both members cannot bypass CAS through legacy documents writes',
  'member CAS still creates, revises and deletes normal transactions',
  'cutover repeat does not mutate financial documents or revisions']){
  assert.ok(pg.includes(text));
 }
 assert.doesNotMatch(pg,/supabase\.co|createClient\s*\(/i);
});
