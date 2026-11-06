-- CANDIDATE ONLY. Never applied to a hosted database by the development tools.
-- Keeps household SELECT and all existing permissive rules; restricts writes
-- to private accounts / investments owned by the authenticated slot.
-- Existing owner=household bank accounts remain shared for members.
-- Does NOT secure personal values nested in households.settings, transaction
-- collaboration, optimistic locking, Auth, or Realtime. Those gates stay open.
-- References: PostgreSQL CREATE POLICY (RESTRICTIVE); Supabase RLS guide.
begin;

do $$
begin
 if exists (
  select 1 from public.documents
  where collection in ('accounts','investment_accounts')
   and not coalesce((
     data->>'owner' in ('la','partner')
     or (collection='accounts' and data->>'owner'='household')
   ),false)
 ) then
  raise exception 'Account ownership is incomplete: qualify the export before applying migration 07';
 end if;
end;
$$;

drop policy if exists trace_account_owner_insert on public.documents;
create policy trace_account_owner_insert on public.documents
as restrictive for insert to authenticated
with check (
 collection not in ('accounts','investment_accounts')
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid())
   and (hm.slot = data->>'owner'
     or (collection='accounts' and data->>'owner'='household'
       and hm.slot in ('la','partner')))
 )
);

drop policy if exists trace_account_owner_update on public.documents;
create policy trace_account_owner_update on public.documents
as restrictive for update to authenticated
using (
 collection not in ('accounts','investment_accounts')
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid())
   and (hm.slot = data->>'owner'
     or (collection='accounts' and data->>'owner'='household'
       and hm.slot in ('la','partner')))
 )
)
with check (
 collection not in ('accounts','investment_accounts')
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid())
   and (hm.slot = data->>'owner'
     or (collection='accounts' and data->>'owner'='household'
       and hm.slot in ('la','partner')))
 )
);

drop policy if exists trace_account_owner_delete on public.documents;
create policy trace_account_owner_delete on public.documents
as restrictive for delete to authenticated
using (
 collection not in ('accounts','investment_accounts')
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid())
   and (hm.slot = data->>'owner'
     or (collection='accounts' and data->>'owner'='household'
       and hm.slot in ('la','partner')))
 )
);

-- No private-to-shared or shared-to-private owner transfer through updates
-- (including SECURITY DEFINER RPCs). Dedicated transfer flow required.
create or replace function public.trace_reject_account_owner_transfer()
returns trigger language plpgsql set search_path=public,pg_temp as $owner$
begin
 if (old.collection in ('accounts','investment_accounts')
     or new.collection in ('accounts','investment_accounts'))
    and (old.collection is distinct from new.collection
      or old.data->>'owner' is distinct from new.data->>'owner') then
   raise exception 'TRACE_ACCOUNT_OWNER_IMMUTABLE: reviewed transfer required'
     using errcode='42501';
 end if;
 return new;
end;
$owner$;
drop trigger if exists trace_account_owner_immutable on public.documents;
create trigger trace_account_owner_immutable
before update of collection,data on public.documents
for each row execute function public.trace_reject_account_owner_transfer();

commit;
