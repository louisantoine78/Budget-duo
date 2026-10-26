-- TRACE 5.37.0 CANDIDATE 12 — EXCLUSIVE RPC WRITE CUTOVER.
-- NOT DEPLOYED. DO NOT APPLY until an explicitly authorized maintenance
-- window, completed client migration, backups, and native PG/Safari QA.
-- This intentionally breaks legacy 5.36.x direct writes. It never changes,
-- deletes, reconciles, migrates, or rewrites a single financial record.
-- Prerequisites: migrations 05–11 with active CAS, personal-owner and
-- deferred/CSV guards. Read-only SELECT remains available under RLS.
begin;

do $cutover_preflight$
declare
  missing text := '';
begin
  if not exists (
    select 1 from pg_catalog.pg_roles where rolname='authenticated'
  ) then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: authenticated role missing'
      using errcode='42501';
  end if;
  if to_regprocedure('public.trace_cas_save_document(uuid,text,text,jsonb,bigint)') is null
     or to_regprocedure('public.trace_cas_delete_document(uuid,text,text,bigint)') is null
     or to_regprocedure('public.trace_cas_save_household_settings(uuid,jsonb,bigint)') is null
     or to_regprocedure('public.trace_csv_evidence_guard_ready()') is null then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: required RPCs missing'
      using errcode='23514';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class d
    join pg_catalog.pg_namespace n on n.oid=d.relnamespace
    where n.nspname='public' and d.relname='documents' and d.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class h
    join pg_catalog.pg_namespace n on n.oid=h.relnamespace
    where n.nspname='public' and h.relname='households' and h.relrowsecurity
  ) then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: RLS must be enabled'
      using errcode='23514';
  end if;
  -- Migration 08 (personal settings), 09 (revisions), 10 (deferred),
  -- and 11 (private CSV) must all be present and enabled before the grant
  -- cutover. No SECURITY DEFINER function is exposed to anon/PUBLIC.
  if (
    select count(distinct t.tgname)
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid=t.tgrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and ((c.relname='documents' and t.tgname in (
       'trace_documents_revision','trace_deferred_write_quarantine',
       'trace_csv_unparsed_evidence_guard'))
       or (c.relname='households' and t.tgname in (
       'trace_household_settings_revision','trace_personal_settings_guard')))
      and not t.tgisinternal and t.tgenabled in ('O','A')
  ) <> 5 then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: protective triggers missing'
      using errcode='23514';
  end if;
  if not public.trace_csv_evidence_guard_ready() then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: CSV privacy or uniqueness not ready'
      using errcode='23514';
  end if;
  if not has_function_privilege('authenticated',
    'public.trace_cas_save_document(uuid,text,text,jsonb,bigint)', 'EXECUTE')
     or not has_function_privilege('authenticated',
    'public.trace_cas_delete_document(uuid,text,text,bigint)', 'EXECUTE')
     or not has_function_privilege('authenticated',
    'public.trace_cas_save_household_settings(uuid,jsonb,bigint)', 'EXECUTE')
  then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: authenticated RPC grants missing'
      using errcode='42501';
  end if;
end;
$cutover_preflight$;

-- Revoke TABLE rights even if a future default grant has widened them.
-- Column-level grants can independently allow writes, so remove every
-- document column write grant explicitly as well.
revoke insert, update, delete on table public.documents
  from public, anon, authenticated;
do $cutover_document_columns$
declare col_name text;
begin
 for col_name in
  select a.attname from pg_catalog.pg_attribute a
  where a.attrelid='public.documents'::regclass
    and a.attnum>0 and not a.attisdropped
 loop
  execute format(
   'revoke insert (%I), update (%I) on table public.documents from public, anon, authenticated',
   col_name,col_name);
 end loop;
end;
$cutover_document_columns$;

-- ANY direct update on a household (name, settings or audit identity)
-- would bypass a reviewed RPC and may fail partner RLS inconsistently.
-- Keep the entire household read-only at the PostgREST table boundary.
-- A future rename must use a separately qualified authenticated RPC.
revoke update on table public.households
  from public, anon, authenticated;
do $cutover_household_columns$
declare col_name text;
begin
 for col_name in
  select a.attname from pg_catalog.pg_attribute a
  where a.attrelid='public.households'::regclass
    and a.attnum>0 and not a.attisdropped
 loop
  execute format(
   'revoke update (%I) on table public.households from public, anon, authenticated',
   col_name);
 end loop;
end;
$cutover_household_columns$;

-- A postcondition, not an assumption: effective privileges can be inherited.
-- Refuse the entire transaction if any bypass remains through a role grant.
do $cutover_postflight$
declare
 role_name text;
 col_name text;
begin
 -- Validate EFFECTIVE privileges for both client roles, including inherited
 -- grants from unexpected existing roles; cover columns added in the future.
 foreach role_name in array array['authenticated','anon'] loop
  if has_table_privilege(role_name,'public.documents','INSERT')
     or has_table_privilege(role_name,'public.documents','UPDATE')
     or has_table_privilege(role_name,'public.documents','DELETE')
     or has_table_privilege(role_name,'public.households','UPDATE')
  then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: table privileges remain for %',role_name
      using errcode='42501';
  end if;
  for col_name in
   select a.attname from pg_catalog.pg_attribute a
   where a.attrelid='public.documents'::regclass
     and a.attnum>0 and not a.attisdropped
  loop
   if has_column_privilege(role_name,'public.documents',col_name,'INSERT')
     or has_column_privilege(role_name,'public.documents',col_name,'UPDATE')
   then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: document column % writable by %',col_name,role_name
      using errcode='42501';
   end if;
  end loop;
  for col_name in
   select a.attname from pg_catalog.pg_attribute a
   where a.attrelid='public.households'::regclass
     and a.attnum>0 and not a.attisdropped
  loop
   if has_column_privilege(role_name,'public.households',col_name,'UPDATE')
   then
    raise exception 'TRACE_CAS_CUTOVER_BLOCKED: household column % writable by %',col_name,role_name
      using errcode='42501';
   end if;
  end loop;
 end loop;
 if not has_table_privilege('authenticated','public.documents','SELECT')
    or not has_table_privilege('authenticated','public.households','SELECT')
 then
   raise exception 'TRACE_CAS_CUTOVER_BLOCKED: RLS reads unexpectedly revoked'
     using errcode='42501';
 end if;
end;
$cutover_postflight$;

commit;
