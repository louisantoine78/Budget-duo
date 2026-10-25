-- TRACE 5.37.0 CANDIDATE 10 -- reject unreleased deferred postings.
-- NOT DEPLOYED. Blocks CAS RPCs AND legacy direct table writes, including
-- deletions, until a separately reviewed banking release explicitly replaces
-- this quarantine with authenticated, atomic financial posting rules.
-- Depends on 07, 08 and 09. This is not a bank authentication mechanism.
begin;

-- SECURITY DEFINER is deliberate: even a legacy direct writer whose RLS view
-- hides a partner-owned deferred card must not evade this financial guard.
-- This function only reads and returns a boolean; no writes or bank secrets.
create or replace function public.trace_is_unreleased_deferred_doc(
 p_household_id uuid, p_collection text, p_data jsonb
) returns boolean language sql stable security definer
set search_path = ''
as $guard$
 select case
  when p_collection = 'accounts' then
   p_data->>'type' = 'card' and p_data->>'paymentMode' = 'deferred'
  when p_collection in ('transactions','imports','import_days','reconciliations') then
   coalesce(nullif(btrim(p_data->>'deferredKind'),''),'') <> ''
   or p_data->>'type' in ('deferred_purchase','deferred_settlement')
   or p_data->>'transferPurpose' = 'deferred_settlement'
   or p_data ?| array[
    'deferredPurchaseId','deferredPurchaseIds','deferredFeeIds',
    'deferredSettlementMode','deferredDueDate','deferredBankEvidence',
    'deferredBankEvidenceReviewed'
   ]
   or p_data ? 'purchaseIds'
   or p_data ? 'feeIds'
   or p_data->>'settlementMode' in ('partial','full')
   or exists (
    select 1 from public.documents bank
    where bank.household_id = p_household_id
      and bank.collection = 'accounts'
      and bank.data->>'type' = 'card'
      and bank.data->>'paymentMode' = 'deferred'
      and bank.item_id in (
       p_data->>'accountId',p_data->>'cardAccountId',p_data->>'toAccountId',
       p_data->>'linkedCardAccountId',p_data->>'sourceAccountId',
       p_data->>'destinationAccountId'
      )
   )
  else false end;
$guard$;

create or replace function public.trace_reject_unreleased_deferred_document()
returns trigger language plpgsql security definer
set search_path = ''
as $deferred_guard$
begin
 if tg_op = 'DELETE' then
  if public.trace_is_unreleased_deferred_doc(old.household_id,old.collection,old.data) then
   raise exception 'TRACE_DEFERRED_NOT_RELEASED: deferred deletion disabled'
     using errcode='23514';
  end if;
  return old;
 end if;

 if public.trace_is_unreleased_deferred_doc(new.household_id,new.collection,new.data) then
  raise exception 'TRACE_DEFERRED_NOT_RELEASED: deferred write disabled'
    using errcode='23514';
 end if;
 -- Old deferred records cannot be laundered into ordinary documents by a
 -- metadata-free update that drops deferredKind or changes the bank account.
 if tg_op = 'UPDATE' then
  if public.trace_is_unreleased_deferred_doc(old.household_id,old.collection,old.data) then
   raise exception 'TRACE_DEFERRED_NOT_RELEASED: deferred record update disabled'
     using errcode='23514';
  end if;
 end if;
 return new;
end;
$deferred_guard$;

drop trigger if exists trace_deferred_write_quarantine on public.documents;
create trigger trace_deferred_write_quarantine
before insert or update or delete on public.documents
for each row execute function public.trace_reject_unreleased_deferred_document();

revoke all on function public.trace_is_unreleased_deferred_doc(uuid,text,jsonb)
 from public, anon, authenticated;
revoke all on function public.trace_reject_unreleased_deferred_document()
 from public, anon, authenticated;
commit;
