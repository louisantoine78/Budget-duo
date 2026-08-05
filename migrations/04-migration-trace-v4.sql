-- Trace V4 — migration additive et sauvegarde avant mise à jour
-- À exécuter avec le rôle postgres AVANT de publier les fichiers V4 sur GitHub.
-- Ce script ne supprime aucune table, aucun document, aucune transaction et aucun budget.

begin;

-- 1) Version de structure. La V3 ignore cette colonne; la V4 l'utilise pour tracer la migration.
alter table public.households
  add column if not exists schema_version integer not null default 3;

-- 2) Sauvegarde privée, inaccessible aux clés publiques de l'application.
create table if not exists public.trace_v4_backups (
  household_id uuid primary key,
  household_snapshot jsonb not null,
  members_snapshot jsonb not null,
  documents_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.trace_v4_backups enable row level security;
revoke all on table public.trace_v4_backups from anon, authenticated;

insert into public.trace_v4_backups (
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

-- 3) La structure PostgreSQL est compatible V4. La conversion fine des objets JSON
--    est effectuée par l'application avec lecture rétrocompatible V3/V4.
update public.households
set schema_version = 4
where schema_version < 4;

commit;

-- Vérification facultative :
-- select id, name, schema_version from public.households order by created_at;
-- select household_id, created_at from public.trace_v4_backups order by created_at;
