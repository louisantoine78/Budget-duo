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
commit;
