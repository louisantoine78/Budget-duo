-- TRACE 5.37.0 candidate 08 — protect member-owned settings.
-- PREVIEW ONLY: do not apply to live Supabase before isolated Auth/RLS QA.
-- Supplements 07; does not solve stale writes, shared-key conflicts or
-- permissions of individual transaction records.
-- Additive: no backfill, no rewrite of stored settings or bank data.
begin;

create or replace function public.trace_guard_personal_settings()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $trace$
declare
  caller_slot text;
  field_name text;
  entry_key text;
  before_map jsonb;
  after_map jsonb;
  account_owner text;
begin
  -- SQL maintenance without an authenticated JWT may bypass this trigger,
  -- but a SECURITY DEFINER RPC still carries auth.uid() and MUST be checked.
  -- A direct authenticated request without a JWT fails closed.
  if auth.uid() is null and current_user <> 'authenticated' then
    return new;
  end if;

  select hm.slot into caller_slot
  from public.household_members hm
  where hm.household_id = old.id
    and hm.user_id = auth.uid();
  if caller_slot not in ('la', 'partner') or caller_slot is null then
    raise exception 'TRACE_SETTINGS_FORBIDDEN: household membership required'
      using errcode = '42501';
  end if;

  -- Legacy personal opening balances are keyed by account ID; ownership is
  -- verified against the account document rather than guessing from its ID.
  foreach field_name in array array[
    'accountOpeningBalances', 'accountOpeningBalanceDates',
    'accountOpeningBalanceModes'
  ] loop
    before_map := coalesce(old.settings->field_name, '{}'::jsonb);
    after_map := coalesce(new.settings->field_name, '{}'::jsonb);
    if jsonb_typeof(before_map) <> 'object'
       or jsonb_typeof(after_map) <> 'object' then
      raise exception 'TRACE_SETTINGS_INVALID: % must be an object', field_name
        using errcode = '22023';
    end if;
    for entry_key in
      select distinct key from (
        select jsonb_object_keys(before_map) as key
        union all
        select jsonb_object_keys(after_map) as key
      ) account_ids
    loop
      if (before_map->entry_key) is distinct from (after_map->entry_key) then
        select d.data->>'owner' into account_owner
        from public.documents d
        where d.household_id = old.id and d.collection = 'accounts'
          and d.item_id = entry_key;
        if account_owner is distinct from caller_slot then
          raise exception 'TRACE_SETTINGS_FORBIDDEN: account setting is not owned by caller'
            using errcode = '42501';
        end if;
      end if;
    end loop;
  end loop;

  -- Settings keyed by the household member slot must likewise be writable
  -- only by that member; changing the entire map cannot erase the other slot.
  foreach field_name in array array[
    'primaryBankAccountByOwner', 'memberNicknames'
  ] loop
    before_map := coalesce(old.settings->field_name, '{}'::jsonb);
    after_map := coalesce(new.settings->field_name, '{}'::jsonb);
    if jsonb_typeof(before_map) <> 'object'
       or jsonb_typeof(after_map) <> 'object' then
      raise exception 'TRACE_SETTINGS_INVALID: % must be an object', field_name
        using errcode = '22023';
    end if;
    for entry_key in
      select distinct key from (
        select jsonb_object_keys(before_map) as key
        union all
        select jsonb_object_keys(after_map) as key
      ) slots
    loop
      if (before_map->entry_key) is distinct from (after_map->entry_key)
         and entry_key <> caller_slot then
        raise exception 'TRACE_SETTINGS_FORBIDDEN: personal setting belongs to another member'
          using errcode = '42501';
      end if;
    end loop;
  end loop;

  return new;
end;
$trace$;

revoke all on function public.trace_guard_personal_settings() from public, anon, authenticated;
drop trigger if exists trace_personal_settings_guard on public.households;
create trigger trace_personal_settings_guard
before update of settings on public.households
for each row execute function public.trace_guard_personal_settings();

commit;
