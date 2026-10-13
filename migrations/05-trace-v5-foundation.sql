-- Trace V5 foundation (additive / non-destructive)
-- Prepared for the trace-v5-integration branch.
-- This migration preserves all existing V4 data.

begin;

create table if not exists public.trace_v5_backups (
  household_id uuid primary key references public.households(id) on delete cascade,
  household_snapshot jsonb not null,
  members_snapshot jsonb not null,
  documents_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.trace_v5_backups enable row level security;

drop policy if exists trace_v5_backups_select_members on public.trace_v5_backups;
create policy trace_v5_backups_select_members
on public.trace_v5_backups
for select
using (public.is_household_member(household_id));

insert into public.trace_v5_backups (
  household_id,
  household_snapshot,
  members_snapshot,
  documents_snapshot
)
select
  h.id,
  to_jsonb(h),
  coalesce((
    select jsonb_agg(to_jsonb(hm) order by hm.joined_at)
    from public.household_members hm
    where hm.household_id = h.id
  ), '[]'::jsonb),
  coalesce((
    select jsonb_agg(to_jsonb(d) order by d.collection, d.item_id)
    from public.documents d
    where d.household_id = h.id
  ), '[]'::jsonb)
from public.households h
on conflict (household_id) do nothing;

alter table public.documents
  drop constraint if exists documents_collection_check;

alter table public.documents
  add constraint documents_collection_check
  check (
    collection = any (
      array[
        'categories'::text,
        'accounts'::text,
        'budgets'::text,
        'budget_template'::text,
        'transactions'::text,
        'goals'::text,
        'investment_accounts'::text,
        'investment_operations'::text,
        'reconciliations'::text,
        'imports'::text,
        'savings_allocations'::text
      ]
    )
  );

commit;
