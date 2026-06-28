-- Eunoia AI OS — Schema hardening
-- Fixes user-deletion FK blockade, adds atomic org creation, and tightens policies.

-- 1. FK ON DELETE SET NULL for nullable profile references -------------------------
-- Without this, deleting a user from auth.users cascades to profiles but then
-- hits RESTRICT on every table below, blocking the delete entirely.

ALTER TABLE public.crm_contacts
  DROP CONSTRAINT crm_contacts_created_by_fkey,
  ADD  CONSTRAINT crm_contacts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.knowledge_base_documents
  DROP CONSTRAINT knowledge_base_documents_created_by_fkey,
  ADD  CONSTRAINT knowledge_base_documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
  DROP CONSTRAINT audit_logs_actor_id_fkey,
  ADD  CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.usage_events
  DROP CONSTRAINT usage_events_actor_id_fkey,
  ADD  CONSTRAINT usage_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.organization_invites
  DROP CONSTRAINT organization_invites_invited_by_fkey,
  ADD  CONSTRAINT organization_invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- 2. Allow document creators to delete their own documents -------------------------
-- Needed so the server action can clean up an orphaned document row when
-- embedding generation fails after the INSERT has already committed.

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
