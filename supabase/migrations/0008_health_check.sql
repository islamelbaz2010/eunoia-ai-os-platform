-- Infrastructure health-check function.
--
-- Returns a JSONB object with DB-level diagnostics, callable by the anon role.
-- Used by GET /api/admin/system to verify PostgREST + live DB query execution
-- without touching any business table.
--
-- Design notes:
--   SECURITY INVOKER (default, no override): runs as the calling role (anon).
--   now() and current_database() require zero table privileges — anon can call
--   them without any GRANT beyond EXECUTE on this function itself.
--
--   SECURITY DEFINER is intentionally absent. There is nothing to escalate to:
--   the function accesses no table, no row, no sequence. Using SECURITY DEFINER
--   on a zero-privilege function is architecturally dishonest and triggers
--   unnecessary scrutiny during security audits.
--
--   The JSONB return type allows future fields to be appended without breaking
--   existing callers — clients parse only the fields they know.

create or replace function public.healthcheck()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'ok',          true,
    'server_time', now(),
    'database',    current_database()
  );
$$;

grant execute on function public.healthcheck() to anon;
grant execute on function public.healthcheck() to authenticated;
grant execute on function public.healthcheck() to service_role;
