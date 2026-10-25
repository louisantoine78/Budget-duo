-- TRACE 5.37.0 CANDIDATE 10 -- quarantine of unqualified deferred writes.
-- NOT DEPLOYED. This migration does not enable deferred transactions.
-- Defense in depth against both legacy direct table writes and CAS RPC writes.
-- No actual bank document is authenticated by a client review or SHA-256.
-- Release later REQUIRES a separately qualified replacement of this guard,
-- real PG/RLS/CAS tests, client cutover, backup/restore and explicit GO.
begin;

create or replace function public.trace_reject_unreleased_deferred_document()
returns trigger language plpgsql
set search_path = ''
as $deferred_guard$
declare
 prior jsonb := '{}'::jsonb;
begin
 if tg_op = 'UPDATE' then prior := old.data; end if;

 -- A disabled banking model must not be enabled by legacy clients or RPC.
 -- Updating an existing deferred card to conceal its original type is also
 -- refused until a deliberate, audited migration has reconciled the account.
 if new.collection = 'accounts' and (
    (new.data->>'type' = 'card' and new.data->>'paymentMode' = 'deferred')
    or (prior->>'type' = 'card' and prior->>'paymentMode' = 'deferred')
 ) then
   raise exception 'TRACE_DEFERRED_NOT_RELEASED: deferred card is disabled'
     using errcode='23514';
 end if;

 if new.collection in ('transactions','imports','import_days','reconciliations') then
   -- Recognized deferred financial shapes cannot be relabeled or silently
   -- converted from pending to confirmed by an older client.
   if nullif(btrim(coalesce(new.data->>'deferredKind','')),'') is not null
      or nullif(btrim(coalesce(prior->>'deferredKind','')),'') is not null
      or new.data->>'type' in ('deferred_purchase','deferred_settlement')
      or prior->>'type' in ('deferred_purchase','deferred_settlement')
      or new.data->>'transferPurpose' = 'deferred_settlement'
      or prior->>'transferPurpose' = 'deferred_settlement'
      or new.data ? 'deferredBankEvidenceReviewed'
      or prior ? 'deferredBankEvidenceReviewed'
      or new.data ? 'purchaseIds'
      or prior ? 'purchaseIds'
      or new.data ? 'feeIds'
      or prior ? 'feeIds'
      or new.data->>'settlementMode' in ('partial','full')
      or prior->>'settlementMode' in ('partial','full')
   then
     raise exception 'TRACE_DEFERRED_NOT_RELEASED: deferred transaction disabled'
       using errcode='23514';
   end if;

   -- Existing deferred accounts may have been created before quarantine:
   -- never allow transactions/imports to affect them through a linked leg.
   if exists (
     select 1 from public.documents bank
      where bank.household_id = new.household_id
        and bank.collection = 'accounts'
        and bank.data->>'type' = 'card'
        and bank.data->>'paymentMode' = 'deferred'
        and bank.item_id in (
         new.data->>'accountId',new.data->>'cardAccountId',
         new.data->>'toAccountId',new.data->>'linkedCardAccountId',
         new.data->>'sourceAccountId',new.data->>'destinationAccountId',
         prior->>'accountId',prior->>'cardAccountId',
         prior->>'toAccountId',prior->>'linkedCardAccountId',
         prior->>'sourceAccountId',prior->>'destinationAccountId'
        )
   ) then
     raise exception 'TRACE_DEFERRED_NOT_RELEASED: linked deferred card disabled'
       using errcode='23514';
   end if;
 end if;

 return new;
end;
$deferred_guard$;

drop trigger if exists trace_deferred_write_quarantine on public.documents;
create trigger trace_deferred_write_quarantine
before insert or update of data on public.documents
for each row execute function public.trace_reject_unreleased_deferred_document();

revoke all on function public.trace_reject_unreleased_deferred_document()
 from public, anon, authenticated;
commit;
