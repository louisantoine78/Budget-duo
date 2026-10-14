-- Applied to TRACE on 2026-10-14: additive check constraint change only.
-- Preserves all previous allowed collections and all rows.
ALTER TABLE public.documents DROP CONSTRAINT documents_collection_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_collection_check CHECK (collection = ANY (ARRAY[
 'categories','accounts','budgets','budget_template','transactions','goals','investment_accounts',
 'investment_operations','reconciliations','imports','savings_allocations','import_days'
]));
