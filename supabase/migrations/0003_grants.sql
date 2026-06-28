-- Eunoia AI OS - explicit role grants
-- Supabase (2024+) requires explicit GRANT for PostgREST to access tables.
-- service_role bypasses RLS but still needs table-level grants.
-- authenticated role is what logged-in app users run as.

-- service_role: full access (bypasses RLS, used by server-side code)
grant all on public.organizations            to service_role;
grant all on public.profiles                 to service_role;
grant all on public.organization_members     to service_role;
grant all on public.crm_contacts             to service_role;
grant all on public.knowledge_base_documents to service_role;
grant all on public.knowledge_base_chunks    to service_role;
grant all on public.audit_logs               to service_role;
grant all on public.usage_events             to service_role;
grant all on public.organization_invites     to service_role;

-- authenticated: app users (RLS policies still apply on top of these grants)
grant select, insert, update, delete on public.organizations            to authenticated;
grant select, insert, update         on public.profiles                 to authenticated;
grant select, insert, update, delete on public.organization_members     to authenticated;
grant select, insert, update, delete on public.crm_contacts             to authenticated;
grant select, insert, update, delete on public.knowledge_base_documents to authenticated;
grant select, insert, update, delete on public.knowledge_base_chunks    to authenticated;
grant select, insert                 on public.audit_logs               to authenticated;
grant select, insert                 on public.usage_events             to authenticated;
grant select, insert, update         on public.organization_invites     to authenticated;

-- function execute grants
grant execute on function public.match_kb_chunks    to authenticated, service_role;
grant execute on function public.accept_org_invite  to authenticated;
grant execute on function public.is_org_member      to authenticated, service_role;
grant execute on function public.org_role           to authenticated, service_role;
grant execute on function public.is_super_admin     to authenticated, service_role;
