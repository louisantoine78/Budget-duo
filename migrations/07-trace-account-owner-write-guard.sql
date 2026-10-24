-- CANDIDATE ONLY. Never applied to a hosted database by the development tools.
-- Keeps household SELECT and all existing permissive rules; restricts writes
-- only to accounts / investment_accounts owned by the authenticated slot.
-- Does NOT secure personal values nested in households.settings, transaction
-- collaboration, optimistic locking, Auth, or Realtime. Those gates stay open.
-- References: PostgreSQL CREATE POLICY (RESTRICTIVE); Supabase RLS guide.
begin;

do $$
begin
 if exists (
  select 1 from public.documents
  where collection in ('accounts','investment_accounts')
   and (data->>'owner' is null or data->>'owner' not in ('la','partner'))
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
   and hm.user_id = (select auth.uid()) and hm.slot = data->>'owner'
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
   and hm.user_id = (select auth.uid()) and hm.slot = data->>'owner'
 )
)
with check (
 collection not in ('accounts','investment_accounts')
 or exists (
  select 1 from public.household_members hm
  where hm.household_id = documents.household_id
   and hm.user_id = (select auth.uid()) and hm.slot = data->>'owner'
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
   and hm.user_id = (select auth.uid()) and hm.slot = data->>'owner'
 )
);

commit;
