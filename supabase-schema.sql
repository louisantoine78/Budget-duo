-- Trace V4 — schéma Supabase pour une nouvelle installation
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Le modèle utilise des documents JSON par entité afin de conserver la structure actuelle de l’application
-- tout en synchronisant les transactions, budgets, catégories, comptes et objectifs séparément.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  schema_version integer not null default 4
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('la', 'partner')),
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id),
  unique (household_id, slot)
);

create table if not exists public.documents (
  household_id uuid not null references public.households(id) on delete cascade,
  collection text not null check (collection in ('categories', 'accounts', 'budgets', 'budget_template', 'transactions', 'goals')),
  item_id text not null,
  data jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, collection, item_id)
);

create index if not exists documents_household_collection_idx
  on public.documents (household_id, collection);

create index if not exists household_members_user_idx
  on public.household_members (user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists households_touch_updated_at on public.households;
create trigger households_touch_updated_at
before update on public.households
for each row execute function public.touch_updated_at();

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
before update on public.documents
for each row execute function public.touch_updated_at();

-- Fonction privée utilisée par les politiques RLS pour éviter les récursions sur household_members.
create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household
      and hm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

create or replace function public.generate_budget_duo_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (
      select 1
      from public.households
      where invite_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

revoke all on function public.generate_budget_duo_invite_code() from public, anon, authenticated;

create or replace function public.create_household(
  p_name text,
  p_display_name text
)
returns table (household_id uuid, invite_code text, slot text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'User already belongs to a household';
  end if;

  insert into public.households (name, invite_code, created_by, updated_by)
  values (
    coalesce(nullif(trim(p_name), ''), 'Notre budget'),
    public.generate_budget_duo_invite_code(),
    auth.uid(),
    auth.uid()
  )
  returning * into new_household;

  insert into public.household_members (household_id, user_id, slot, role, display_name)
  values (
    new_household.id,
    auth.uid(),
    'la',
    'owner',
    coalesce(nullif(trim(p_display_name), ''), 'Membre 1')
  );

  return query
  select new_household.id, new_household.invite_code, 'la'::text;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

create or replace function public.join_household(
  p_invite_code text,
  p_display_name text
)
returns table (household_id uuid, invite_code text, slot text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household public.households%rowtype;
  assigned_slot text;
  existing_household uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select hm.household_id
  into existing_household
  from public.household_members as hm
  where hm.user_id = auth.uid();

  if existing_household is not null then
    if exists (
      select 1
      from public.households as h
      where h.id = existing_household
        and h.invite_code = upper(trim(p_invite_code))
    ) then
      return query
      select
        existing_household,
        (
          select h.invite_code
          from public.households as h
          where h.id = existing_household
        ),
        (
          select hm.slot
          from public.household_members as hm
          where hm.user_id = auth.uid()
        );
      return;
    end if;

    raise exception 'User already belongs to a household';
  end if;

  select h.*
  into target_household
  from public.households as h
  where h.invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'Invitation code not found';
  end if;

  if (
    select count(*)
    from public.household_members as hm_count
    where hm_count.household_id = target_household.id
  ) >= 2 then
    raise exception 'Household is full';
  end if;

  assigned_slot := case
    when exists (
      select 1
      from public.household_members as hm_slot
      where hm_slot.household_id = target_household.id
        and hm_slot.slot = 'la'
    ) then 'partner'
    else 'la'
  end;

  insert into public.household_members (
    household_id,
    user_id,
    slot,
    role,
    display_name
  )
  values (
    target_household.id,
    auth.uid(),
    assigned_slot,
    'member',
    coalesce(nullif(trim(p_display_name), ''), 'Partenaire')
  );

  return query
  select
    target_household.id,
    target_household.invite_code,
    assigned_slot;
end;
$$;


revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.join_household(text, text) to authenticated;

create or replace function public.rotate_household_invite(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can rotate the invitation code';
  end if;

  new_code := public.generate_budget_duo_invite_code();
  update public.households
  set invite_code = new_code,
      updated_by = auth.uid()
  where id = p_household_id;

  return new_code;
end;
$$;

revoke all on function public.rotate_household_invite(uuid) from public, anon;
grant execute on function public.rotate_household_invite(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.documents enable row level security;

drop policy if exists households_select_members on public.households;
create policy households_select_members
on public.households
for select
to authenticated
using (public.is_household_member(id));

drop policy if exists households_update_members on public.households;
create policy households_update_members
on public.households
for update
to authenticated
using (public.is_household_member(id))
with check (public.is_household_member(id) and updated_by = auth.uid());

drop policy if exists household_members_select_same_household on public.household_members;
create policy household_members_select_same_household
on public.household_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_household_member(household_id)
);

drop policy if exists documents_select_members on public.documents;
create policy documents_select_members
on public.documents
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists documents_insert_members on public.documents;
create policy documents_insert_members
on public.documents
for insert
to authenticated
with check (
  public.is_household_member(household_id)
  and updated_by = auth.uid()
);

drop policy if exists documents_update_members on public.documents;
create policy documents_update_members
on public.documents
for update
to authenticated
using (public.is_household_member(household_id))
with check (
  public.is_household_member(household_id)
  and updated_by = auth.uid()
);

drop policy if exists documents_delete_members on public.documents;
create policy documents_delete_members
on public.documents
for delete
to authenticated
using (public.is_household_member(household_id));

revoke all on public.households, public.household_members, public.documents from anon;
revoke all on public.households, public.household_members, public.documents from authenticated;

grant select on public.households to authenticated;
grant update (name, settings, updated_by) on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

-- Permet à Realtime de fournir les anciennes clés lors des suppressions.
alter table public.documents replica identity full;
alter table public.households replica identity full;

-- Active les changements Postgres en temps réel pour les deux tables synchronisées.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'households'
  ) then
    alter publication supabase_realtime add table public.households;
  end if;
end;
$$;
