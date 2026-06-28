-- Usage totals aggregation RPC
-- Replaces the O(N) JavaScript aggregation in usage/page.tsx with a SQL GROUP BY.
-- Uses the same security definer + is_org_member pattern as match_kb_chunks.

create or replace function public.get_usage_totals(org_id uuid)
returns table (event_type text, total numeric)
language sql
security definer
set search_path = public
stable
as $$
  select event_type, sum(quantity) as total
  from public.usage_events
  where organization_id = org_id
    and (public.is_org_member(org_id) or public.is_super_admin())
  group by event_type
  order by total desc;
$$;
