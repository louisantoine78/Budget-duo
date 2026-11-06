# TRACE 5.37.0 — Rehearsal hosted Auth / RLS / CAS

Status: prepared, NOT executed against a hosted database. No isolated Supabase project was found in the connected account inventory on 2026-10-30. Existing projects are forbidden. Production remains NO-GO.

## Before any hosted run
1. Obtain separate explicit approval for any potential hosting cost, then create a brand-new disposable Supabase project strictly for TRACE QA.
2. Review and install baseline supabase-schema.sql followed by candidate migrations 05–12 on that empty QA project ONLY. Never apply these to TRACE production.
3. Provision three distinct, confirmed fictitious email/password accounts A, B and C. None may belong to any household. No real finances or identities.
4. Use a protected runner environment with secrets. Do not paste passwords or publishable keys in chat or commit them into files.
5. Explicitly authorize creation of two fictitious households and two fake category records. The runner deliberately does not perform destructive cleanup.

## Variables required for opt-in invocation
TRACE_537_QA_REF: exact 20-character reference of a brand-new QA project
TRACE_537_QA_CONFIRM_REF: same project reference, confirmed separately
TRACE_537_QA_URL: https://<ref>.supabase.co
TRACE_537_QA_RUN: I_ACCEPT_ISOLATED_TEST_WRITES
TRACE_537_QA_PUBLISHABLE_KEY: public publishable key or legacy anon JWT only; NEVER service_role or secret
TRACE_537_QA_A_EMAIL, TRACE_537_QA_A_PASSWORD
TRACE_537_QA_B_EMAIL, TRACE_537_QA_B_PASSWORD
TRACE_537_QA_C_EMAIL, TRACE_537_QA_C_PASSWORD

Execute node scripts/trace-537-hosted-auth-rls-smoke.cjs only in the isolated QA runner with these protected environment variables.

## Test coverage
- Sign in separately for A, B and C; refuse duplicate identities or accounts already belonging to a household.
- A creates household H1, B joins with invitation, and C creates separate H2.
- A and C create one fake category each through versioned CAS RPC; first revision must be zero.
- A and B see the H1 documents, household and both membership rows. C cannot access H1.
- A and B cannot read H2 documents, household or membership rows. C can see H2.
- All cross-household CAS writes are rejected.
- Duplicate create using null revision is rejected with TRACE_WRITE_CONFLICT.
- Direct document table writes are rejected after candidate migration 12.
- Only status codes and safe QA result counts are logged: no tokens or passwords.

## Limits
The runner uses native HTTPS Auth and PostgREST, not Supabase Realtime or two physical browsers. It is not a production readiness certificate. It leaves fake test households and categories in a disposable QA project.
Node mock qualification: node --test tests/trace-537-hosted-auth-rls-smoke.test.cjs. This test performs no network calls, tests fail-closed configuration, and injects simulated API isolation failures.
The existing PGlite PostgreSQL RLS/CAS tests remain mandatory. A successful mock test does NOT mean the hosted test was performed.
