-- Lecture seule : vérification après migration et après première ouverture de Trace V4.
select
  h.id,
  h.name,
  h.schema_version,
  h.updated_at,
  count(distinct hm.user_id) as membres,
  count(d.item_id) filter (where d.collection = 'transactions') as transactions,
  count(d.item_id) filter (where d.collection = 'budgets') as budgets,
  count(d.item_id) filter (where d.collection = 'categories') as categories
from public.households h
left join public.household_members hm on hm.household_id = h.id
left join public.documents d on d.household_id = h.id
group by h.id, h.name, h.schema_version, h.updated_at
order by h.created_at;
