'use strict';
// Static candidate SQL contract only. Run integration in PGlite separately.
// This suite proves presence of defensive SQL, never PostgreSQL correctness.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'..','migrations','09-trace-cas-versioned-writes.sql'),'utf8');
const suite=fs.readFileSync(path.join(__dirname,'trace-cas-writes.integration.cjs'),'utf8');
const save=sql.slice(sql.indexOf('create or replace function public.trace_cas_save_document('),
 sql.indexOf('create or replace function public.trace_cas_delete_document('));
const deletion=sql.slice(sql.indexOf('create or replace function public.trace_cas_delete_document('),
 sql.indexOf('create or replace function public.trace_cas_save_household_settings('));
test('SECURITY DEFINER investment creation cannot target unowned portfolios',()=>{
 assert.match(save,/if p_collection = 'investment_operations' then/);
 assert.match(save,/investment\.collection = 'investment_accounts'/);
 assert.match(save,/investment\.data->>'owner' = actor_slot/);
});
test('investment operation bank legs require a checking account of same member',()=>{
 assert.match(save,/bank\.collection = 'accounts'/);
 assert.match(save,/bank\.data->>'owner' = actor_slot/);
 assert.match(save,/bank\.data->>'type' = 'checking'/);
});
test('CAS update checks the original investment operation owner, not just edited payload',()=>{
 assert.match(save,/original_portfolio\.item_id = d\.data->>'accountId'/);
 assert.match(save,/original_portfolio\.data->>'owner' = actor_slot/);
});
test('CAS deletion checks native investment ownership instead of a permissive collection check',()=>{
 assert.match(deletion,/p_collection <> 'investment_operations' or exists/);
 assert.match(deletion,/original_portfolio\.item_id = d\.data->>'accountId'/);
});
test('fictional integration scenarios cover cross-member mutation and deletion',()=>{
 assert.match(suite,/investment operations require native portfolio and banking ownership/);
 assert.match(suite,/bankAccountId:'partner'/);
 assert.match(suite,/rpcDelete\(2,'investment_operations','op-la',0\)/);
});
