-- ============================================================
-- BATCH MIGRATION: 0003 through 0008
-- Paste this entire file into Supabase SQL Editor and run.
-- Safe to run in a single transaction.
-- URL: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
-- ============================================================


-- ============================================================
-- 0003_grants.sql
-- ============================================================
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


-- ============================================================
-- 0004_indexes_policies.sql
-- ============================================================
-- Eunoia AI OS — missing indexes and RLS policies

-- Indexes -----------------------------------------------------------------

-- Re-ingestion deletes by document_id; without this index it's a full table scan
create index if not exists kb_chunks_document_id_idx
  on public.knowledge_base_chunks (document_id);

-- KB document list sorted by updated_at desc
create index if not exists kb_documents_updated_at_idx
  on public.knowledge_base_documents (organization_id, updated_at desc);

-- Audit log time-range queries
create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

-- Usage event aggregation
create index if not exists usage_events_org_type_idx
  on public.usage_events (organization_id, event_type);

-- RLS policies -------------------------------------------------------------

-- Members can delete their own org's chunks (required for re-ingestion)
drop policy if exists "members can delete kb chunks" on public.knowledge_base_chunks;
create policy "members can delete kb chunks" on public.knowledge_base_chunks
  for delete using (public.is_org_member(organization_id) or public.is_super_admin());

-- Members can update kb documents (status changes, edits)
drop policy if exists "members can update kb documents" on public.knowledge_base_documents;
create policy "members can update kb documents" on public.knowledge_base_documents
  for update using (public.is_org_member(organization_id));


-- ============================================================
-- 0005_schema_hardening.sql
-- ============================================================
-- Eunoia AI OS — Schema hardening
-- Fixes user-deletion FK blockade, adds atomic org creation, and tightens policies.

-- 1. FK ON DELETE SET NULL for nullable profile references -------------------------
-- Without this, deleting a user from auth.users cascades to profiles but then
-- hits RESTRICT on every table below, blocking the delete entirely.

ALTER TABLE public.crm_contacts
  DROP CONSTRAINT IF EXISTS crm_contacts_created_by_fkey,
  ADD  CONSTRAINT crm_contacts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.knowledge_base_documents
  DROP CONSTRAINT IF EXISTS knowledge_base_documents_created_by_fkey,
  ADD  CONSTRAINT knowledge_base_documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey,
  ADD  CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_actor_id_fkey,
  ADD  CONSTRAINT usage_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_invited_by_fkey,
  ADD  CONSTRAINT organization_invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- 2. Allow document creators to delete their own documents -------------------------
-- Needed so the server action can clean up an orphaned document row when
-- embedding generation fails after the INSERT has already committed.

DROP POLICY IF EXISTS "creator can delete own kb documents" ON public.knowledge_base_documents;
CREATE POLICY "creator can delete own kb documents" ON public.knowledge_base_documents
  FOR DELETE USING (created_by = auth.uid());

-- 3. Atomic organization creation + owner membership --------------------------------
-- SECURITY DEFINER so any authenticated user can create an org without a
-- permissive INSERT policy on the organizations table.
-- Anti-abuse: cap at 3 owned organizations per user.

CREATE OR REPLACE FUNCTION public.create_organization(
  org_name text,
  org_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF length(trim(org_name)) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;

  -- Slug must be lowercase alphanumeric + hyphens, starts/ends with alphanumeric
  IF org_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid organization slug format';
  END IF;

  -- Anti-abuse: max 3 owned orgs per user
  IF (
    SELECT COUNT(*)
    FROM public.organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 owned organizations per account';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (trim(org_name), org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner');

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization TO authenticated;


-- ============================================================
-- 0006_hardening_v2.sql
-- ============================================================
-- Eunoia AI OS — Hardening v2
-- Race condition fix, data integrity, and performance indexes.

-- 1. Index for last-owner queries (organization_id, role) ----------------------
-- updateMemberRole and removeMember both query WHERE organization_id = X AND role = 'owner'.
-- Without this index, those checks are sequential scans on large orgs.

CREATE INDEX IF NOT EXISTS org_members_org_role_idx
  ON public.organization_members (organization_id, role);

-- 2. NOT NULL on embedding column ----------------------------------------------
-- A chunk row with a NULL embedding is corrupt — it will never appear in
-- vector search results but wastes space and causes confusion.
-- The USING clause handles any pre-existing NULL rows by deleting them first.

DELETE FROM public.knowledge_base_chunks WHERE embedding IS NULL;

ALTER TABLE public.knowledge_base_chunks
  ALTER COLUMN embedding SET NOT NULL;

-- 3. Fix accept_org_invite race condition ---------------------------------------
-- Two concurrent calls with the same token both read status='pending' before
-- either write. Adding FOR UPDATE locks the row so only one can proceed.

CREATE OR REPLACE FUNCTION public.accept_org_invite(invite_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite public.organization_invites;
  current_email text;
  new_org_id uuid;
BEGIN
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();

  -- Lock the row so concurrent calls with the same token serialize here.
  SELECT * INTO invite
  FROM public.organization_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1
  FOR UPDATE;

  IF invite IS NULL OR invite.email IS DISTINCT FROM current_email THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invite.organization_id, auth.uid(), invite.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = excluded.role;

  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE id = invite.id;

  new_org_id := invite.organization_id;
  RETURN new_org_id;
END;
$$;


-- ============================================================
-- 0007_get_usage_totals.sql
-- ============================================================
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

grant execute on function public.get_usage_totals(uuid) to authenticated;
grant execute on function public.get_usage_totals(uuid) to service_role;


-- ============================================================
-- 0008_health_check.sql
-- ============================================================
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

