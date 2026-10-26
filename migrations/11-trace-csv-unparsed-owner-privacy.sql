-- TRACE 5.37.0 candidate 11: scope imported CSV audit evidence to its owner.
-- Not applied. Existing family-wide document access stays unchanged for
-- every document type other than imports.kind = csv_unparsed.
begin;
drop policy if exists trace_csv_unparsed_private_select on public.documents;
create policy trace_csv_unparsed_private_select
on public.documents as restrictive for select to authenticated
using (
 collection <> 'imports'
 or coalesce(data->>'kind','') <> 'csv_unparsed'
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid())
   and hm.slot = data->>'owner'
 )
);

-- Trigger enforces writes even via SECURITY DEFINER RPC (which bypasses RLS).
-- No delete or reassignment of the original bank evidence is permitted.
create or replace function public.trace_guard_csv_unparsed_evidence()
returns trigger language plpgsql set search_path = '' as $guard$
declare
 actor_slot text;
 before_evidence boolean := false;
 after_evidence boolean := false;
 affected_household uuid;
begin
 if tg_op <> 'INSERT' then
  before_evidence := old.collection = 'imports'
    and old.data->>'kind' = 'csv_unparsed';
 end if;
 if tg_op <> 'DELETE' then
  after_evidence := new.collection = 'imports'
    and new.data->>'kind' = 'csv_unparsed';
 end if;
 if not before_evidence and not after_evidence then
  if tg_op = 'DELETE' then return old; else return new; end if;
 end if;
 -- Restore and explicit maintenance by the database owner must remain
 -- possible without inventing a user JWT. This is NOT an exemption for
 -- authenticated clients or SECURITY DEFINER RPCs carrying a caller JWT.
 if auth.uid() is null then
  if current_user = 'postgres' and session_user = 'postgres' then
   if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: signed-in user required'
   using errcode='42501';
 end if;
 if tg_op = 'DELETE' then
  affected_household := old.household_id;
 else
  affected_household := new.household_id;
 end if;
 select hm.slot into actor_slot from public.household_members hm
 where hm.household_id = affected_household and hm.user_id = auth.uid();
 if actor_slot is null or actor_slot not in ('la','partner') then
  raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: member required'
   using errcode='42501';
 end if;
 if tg_op = 'DELETE' then
  raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: retain bank evidence'
   using errcode='42501';
 end if;
 if not after_evidence or new.data->>'owner' is distinct from actor_slot
  or nullif(new.data->>'accountId','') is null
  or new.data->>'id' is distinct from new.item_id
  or char_length(new.item_id) > 240
  or char_length(coalesce(new.data->>'rawText','')) > 650
  or nullif(new.data->>'sourceFileName','') is null
  or char_length(new.data->>'sourceFileName') > 110
  or case
     when coalesce(new.data->>'sourceIndex','') ~ '^[0-9]{1,6}$'
     then (new.data->>'sourceIndex')::integer not between 2 and 1001
     else true
     end
  or new.data->>'source' is distinct from 'csv'
  or not exists (
   select 1 from public.documents acct
   where acct.household_id = new.household_id
    and acct.collection = 'accounts'
    and acct.item_id = new.data->>'accountId'
    and acct.data->>'owner' = actor_slot
  ) then
  raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: account or source invalid'
   using errcode='42501';
 end if;
 if tg_op = 'INSERT' then
  if new.data->>'status' is distinct from 'pending_review'
    or new.data ? 'reviewedAt' or new.data ? 'reviewedBy' then
   raise exception 'TRACE_CSV_EVIDENCE_INVALID: must begin pending'
    using errcode='22023';
  end if;
 else
  if not before_evidence or old.data->>'owner' is distinct from actor_slot
    or old.household_id is distinct from new.household_id
    or old.item_id is distinct from new.item_id
    or (old.data - 'status' - 'reviewedAt' - 'reviewedBy')
      is distinct from (new.data - 'status' - 'reviewedAt' - 'reviewedBy') then
   raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: immutable source'
    using errcode='42501';
  end if;
  if old.data is distinct from new.data and not (
   old.data->>'status' = 'pending_review'
   and new.data->>'status' = 'reviewed'
   and new.data->>'reviewedBy' = actor_slot
   and nullif(new.data->>'reviewedAt','') is not null
  ) then
   raise exception 'TRACE_CSV_EVIDENCE_FORBIDDEN: only review allowed'
    using errcode='42501';
  end if;
 end if;
 return new;
end;
$guard$;

revoke all on function public.trace_guard_csv_unparsed_evidence()
 from public, anon, authenticated;
drop trigger if exists trace_csv_unparsed_evidence_guard on public.documents;
create trigger trace_csv_unparsed_evidence_guard
before insert or update or delete on public.documents
for each row execute function public.trace_guard_csv_unparsed_evidence();


-- A low-privilege readiness probe. Its presence is a fail-closed cutover
-- marker, not proof of production security or a replacement for PG QA.
create or replace function public.trace_csv_evidence_guard_ready()
returns boolean language sql stable security invoker
set search_path = ''
as $ready$
 select exists (
   select 1 from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='documents'
     and c.relrowsecurity
 ) and exists (
   select 1 from pg_catalog.pg_policies p
   where p.schemaname='public' and p.tablename='documents'
     and p.policyname='trace_csv_unparsed_private_select'
     and p.permissive='RESTRICTIVE' and p.cmd='SELECT'
 ) and exists (
   select 1 from pg_catalog.pg_trigger t
   join pg_catalog.pg_class c on c.oid=t.tgrelid
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='documents'
     and t.tgname='trace_csv_unparsed_evidence_guard'
     and not t.tgisinternal and t.tgenabled in ('O','A')
 );
$ready$;
revoke all on function public.trace_csv_evidence_guard_ready() from public, anon;
grant execute on function public.trace_csv_evidence_guard_ready() to authenticated;

commit;
