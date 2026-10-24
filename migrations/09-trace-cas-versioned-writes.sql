-- TRACE 5.37.0 candidate 09 — atomic compare-and-swap primitives.
-- NOT DEPLOYED. Requires a coordinated client cutover: legacy direct writes
-- remain allowed until all clients use these RPCs and their grants are closed.
-- Migration 08 is a prerequisite. All rows start with revision 0; no reset.
begin;

alter table public.documents
  add column if not exists revision bigint not null default 0;
alter table public.households
  add column if not exists settings_revision bigint not null default 0;

-- The server, never the request payload, owns revision increments. Legacy
-- writes also increase revisions until direct access is removed at cutover.
create or replace function public.trace_bump_document_revision()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;
drop trigger if exists trace_documents_revision on public.documents;
create trigger trace_documents_revision
before update on public.documents
for each row execute function public.trace_bump_document_revision();

create or replace function public.trace_bump_settings_revision()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.settings_revision := old.settings_revision + 1;
  return new;
end;
$$;
drop trigger if exists trace_household_settings_revision on public.households;
create trigger trace_household_settings_revision
before update of settings on public.households
for each row execute function public.trace_bump_settings_revision();

-- Null expected revision means *create only*. For existing documents the
-- caller must supply the exact last-read revision, including zero for legacy.
-- Postgres holds the updated row lock and checks revision atomically.
create or replace function public.trace_cas_save_document(
  p_household_id uuid, p_collection text, p_item_id text,
  p_data jsonb, p_expected_revision bigint default null
)
returns bigint
language plpgsql security definer
set search_path = ''
as $cas$
declare actor_slot text; current_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'TRACE_WRITE_FORBIDDEN: authentication required'
      using errcode = '42501';
  end if;
  select slot into actor_slot from public.household_members
  where household_id = p_household_id and user_id = auth.uid();
  if actor_slot not in ('la','partner') or actor_slot is null then
    raise exception 'TRACE_WRITE_FORBIDDEN: not a member'
      using errcode = '42501';
  end if;
  if p_collection is null or p_item_id is null or p_item_id = ''
    or p_data is null or jsonb_typeof(p_data) <> 'object'
    or p_data->>'id' is distinct from p_item_id then
    raise exception 'TRACE_WRITE_INVALID: document ID or JSON payload'
      using errcode = '22023';
  end if;
  if p_collection in ('accounts','investment_accounts')
    and p_data->>'owner' is distinct from actor_slot then
    raise exception 'TRACE_WRITE_FORBIDDEN: account owner mismatch'
      using errcode = '42501';
  end if;

  if p_expected_revision is null then
    insert into public.documents(household_id,collection,item_id,data,updated_by)
    values(p_household_id,p_collection,p_item_id,p_data,auth.uid())
    on conflict (household_id,collection,item_id) do nothing
    returning revision into current_revision;
  else
    if p_expected_revision < 0 then
      raise exception 'TRACE_WRITE_INVALID: revision must be nonnegative'
        using errcode = '22023';
    end if;
    update public.documents d
    set data = p_data, updated_by = auth.uid()
    where d.household_id = p_household_id
      and d.collection = p_collection and d.item_id = p_item_id
      and d.revision = p_expected_revision
      and (p_collection not in ('accounts','investment_accounts')
           or d.data->>'owner' = actor_slot)
    returning revision into current_revision;
  end if;

  if current_revision is null then
    raise exception 'TRACE_WRITE_CONFLICT: document changed or already exists'
      using errcode = 'P0001';
  end if;
  return current_revision;
end;
$cas$;

create or replace function public.trace_cas_delete_document(
  p_household_id uuid, p_collection text, p_item_id text,
  p_expected_revision bigint
)
returns boolean
language plpgsql security definer
set search_path = ''
as $cas$
declare actor_slot text; deleted_id text;
begin
  if auth.uid() is null then
    raise exception 'TRACE_WRITE_FORBIDDEN: authentication required'
      using errcode = '42501';
  end if;
  select slot into actor_slot from public.household_members
  where household_id = p_household_id and user_id = auth.uid();
  if actor_slot not in ('la','partner') or actor_slot is null then
    raise exception 'TRACE_WRITE_FORBIDDEN: not a member'
      using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'TRACE_WRITE_INVALID: deletion requires a revision'
      using errcode = '22023';
  end if;

  delete from public.documents d
  where d.household_id = p_household_id and d.collection = p_collection
    and d.item_id = p_item_id and d.revision = p_expected_revision
    and (p_collection not in ('accounts','investment_accounts')
         or d.data->>'owner' = actor_slot)
  returning item_id into deleted_id;
  if deleted_id is null then
    raise exception 'TRACE_WRITE_CONFLICT: document missing or modified'
      using errcode = 'P0001';
  end if;
  return true;
end;
$cas$;

create or replace function public.trace_cas_save_household_settings(
  p_household_id uuid, p_settings jsonb, p_expected_revision bigint
)
returns bigint
language plpgsql security definer
set search_path = ''
as $cas$
declare current_revision bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid()
  ) then
    raise exception 'TRACE_WRITE_FORBIDDEN: household membership required'
      using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0
    or p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'TRACE_WRITE_INVALID: settings and expected revision required'
      using errcode = '22023';
  end if;
  -- Migration 08's trigger checks personal keys using auth.uid(), including
  -- SECURITY DEFINER invocations; shared budget settings remain editable.
  update public.households h
  set settings = p_settings, updated_by = auth.uid()
  where h.id = p_household_id and h.settings_revision = p_expected_revision
  returning settings_revision into current_revision;
  if current_revision is null then
    raise exception 'TRACE_WRITE_CONFLICT: household settings changed'
      using errcode = 'P0001';
  end if;
  return current_revision;
end;
$cas$;

revoke all on function public.trace_bump_document_revision() from public, anon, authenticated;
revoke all on function public.trace_bump_settings_revision() from public, anon, authenticated;
revoke all on function public.trace_cas_save_document(uuid,text,text,jsonb,bigint) from public, anon;
revoke all on function public.trace_cas_delete_document(uuid,text,text,bigint) from public, anon;
revoke all on function public.trace_cas_save_household_settings(uuid,jsonb,bigint) from public, anon;
grant execute on function public.trace_cas_save_document(uuid,text,text,jsonb,bigint) to authenticated;
grant execute on function public.trace_cas_delete_document(uuid,text,text,bigint) to authenticated;
grant execute on function public.trace_cas_save_household_settings(uuid,jsonb,bigint) to authenticated;

-- Deliberately DO NOT revoke direct table writes here: a cutover must first
-- update the candidate UI, bootstrap/recovery tools, and other 5.36.5 clients.
-- Until those grants are closed, CAS is an opt-in API, NOT enforcement.
commit;
