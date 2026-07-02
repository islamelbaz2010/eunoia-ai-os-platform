-- 0009b — PART 2 OF 2: Enterprise schema, tables, functions, policies
--
-- Run this AFTER 0009a has committed successfully.
-- Open a NEW SQL Editor tab — do not run in the same tab as 0009a.
--
-- Apply: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
-- Then verify: npm run verify-migrations

-- =============================================================================
-- PART 2: ORGANIZATION LIFECYCLE
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.org_status AS ENUM ('active', 'archived', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status            public.org_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS settings          jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata          jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_set_updated_at ON public.organization_members;
CREATE TRIGGER organization_members_set_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- PART 3: PERMISSION REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  key         text PRIMARY KEY,
  description text NOT NULL,
  category    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can view permissions" ON public.permissions;
CREATE POLICY "authenticated can view permissions" ON public.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 4: ROLE PERMISSIONS (default grants per role)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role           public.org_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions (key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can view role permissions" ON public.role_permissions;
CREATE POLICY "authenticated can view role permissions" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 5: MEMBER PERMISSIONS (per-member overrides)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.member_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  permission_key  text NOT NULL REFERENCES public.permissions (key) ON DELETE CASCADE,
  granted         boolean NOT NULL DEFAULT true,
  granted_by      uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS member_permissions_lookup_idx
  ON public.member_permissions (organization_id, user_id, permission_key);

ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage member permissions" ON public.member_permissions;
CREATE POLICY "admins manage member permissions" ON public.member_permissions
  FOR ALL USING (
    public.org_role(organization_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "members view own permissions" ON public.member_permissions;
CREATE POLICY "members view own permissions" ON public.member_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.org_role(organization_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

-- =============================================================================
-- PART 6: SEED PERMISSION REGISTRY
-- =============================================================================

INSERT INTO public.permissions (key, description, category) VALUES
  ('crm.contacts.read',          'View CRM contacts',              'CRM'),
  ('crm.contacts.write',         'Create and update CRM contacts', 'CRM'),
  ('crm.contacts.delete',        'Delete CRM contacts',            'CRM'),
  ('crm.contacts.export',        'Export CRM contact data',        'CRM'),
  ('knowledge.documents.read',   'View Knowledge Base documents',  'Knowledge Base'),
  ('knowledge.documents.write',  'Create and edit documents',      'Knowledge Base'),
  ('knowledge.documents.delete', 'Delete documents',               'Knowledge Base'),
  ('assistant.query',            'Use the RAG AI Assistant',       'AI Assistant'),
  ('org.settings.read',          'View organization settings',          'Organization'),
  ('org.settings.write',         'Update organization settings',        'Organization'),
  ('org.members.read',           'View organization members',           'Organization'),
  ('org.members.invite',         'Invite new members',                  'Organization'),
  ('org.members.remove',         'Remove members from organization',    'Organization'),
  ('org.members.roles',          'Change member roles',                 'Organization'),
  ('org.invites.read',           'View pending invitations',            'Organization'),
  ('org.invites.revoke',         'Revoke pending invitations',          'Organization'),
  ('org.archive',                'Archive the organization',            'Organization'),
  ('org.transfer',               'Transfer organization ownership',     'Organization'),
  ('billing.read',               'View billing and subscription info',  'Billing'),
  ('billing.manage',             'Manage billing and subscriptions',    'Billing'),
  ('audit.read',                 'View audit logs',                    'Reporting'),
  ('usage.read',                 'View usage reports',                 'Reporting')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PART 7: SEED ROLE PERMISSION DEFAULTS
-- =============================================================================

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'owner', key FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'super_admin', key FROM public.permissions
  WHERE key NOT IN ('billing.manage', 'org.archive', 'org.transfer')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'admin', key FROM public.permissions
  WHERE key NOT IN ('billing.manage', 'billing.read', 'org.archive', 'org.transfer')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'manager', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read', 'crm.contacts.write', 'crm.contacts.delete', 'crm.contacts.export',
    'knowledge.documents.read', 'knowledge.documents.write', 'knowledge.documents.delete',
    'assistant.query',
    'org.settings.read', 'org.members.read', 'org.members.invite',
    'org.invites.read', 'org.invites.revoke',
    'audit.read', 'usage.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'operator', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read', 'crm.contacts.write',
    'knowledge.documents.read',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'editor', key FROM public.permissions
  WHERE key IN (
    'knowledge.documents.read', 'knowledge.documents.write',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'member', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read', 'crm.contacts.write',
    'knowledge.documents.read', 'knowledge.documents.write',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'viewer', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read',
    'knowledge.documents.read',
    'assistant.query',
    'org.members.read',
    'audit.read',
    'usage.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'guest', key FROM public.permissions
  WHERE key IN ('assistant.query')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 8: EFFECTIVE PERMISSIONS FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(target_org_id uuid)
RETURNS TABLE (permission_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  member_role public.org_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF public.is_super_admin() THEN
    RETURN QUERY SELECT key FROM public.permissions;
    RETURN;
  END IF;

  SELECT role INTO member_role
  FROM public.organization_members
  WHERE organization_id = target_org_id AND user_id = auth.uid();

  IF member_role IS NULL THEN RETURN; END IF;

  RETURN QUERY
  (
    SELECT rp.permission_key
    FROM   public.role_permissions rp
    WHERE  rp.role = member_role
    AND NOT EXISTS (
      SELECT 1 FROM public.member_permissions mp
      WHERE  mp.organization_id = target_org_id
        AND  mp.user_id         = auth.uid()
        AND  mp.permission_key  = rp.permission_key
        AND  mp.granted         = false
    )
  )
  UNION
  (
    SELECT mp.permission_key
    FROM   public.member_permissions mp
    WHERE  mp.organization_id = target_org_id
      AND  mp.user_id         = auth.uid()
      AND  mp.granted         = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_permission(
  target_org_id  uuid,
  permission_key text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.get_user_effective_permissions(target_org_id) p
    WHERE  p.permission_key = $2
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission TO authenticated;

-- =============================================================================
-- PART 9: ORGANIZATION LIFECYCLE RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_organization_settings(
  org_id     uuid,
  new_name   text  DEFAULT NULL,
  p_settings jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (
    public.org_role(org_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to update organization settings';
  END IF;
  IF new_name IS NOT NULL AND length(trim(new_name)) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;
  UPDATE public.organizations SET
    name     = COALESCE(NULLIF(trim(new_name), ''), name),
    settings = CASE WHEN p_settings IS NOT NULL THEN p_settings ELSE settings END,
    metadata = CASE WHEN p_metadata IS NOT NULL THEN p_metadata ELSE metadata END
  WHERE id = org_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or is not active';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_organization_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_org_ownership(
  org_id       uuid,
  new_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = new_owner_id
  ) THEN
    RAISE EXCEPTION 'The target user must already be a member of this organization';
  END IF;
  IF new_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;
  UPDATE public.organization_members SET role = 'owner'
  WHERE organization_id = org_id AND user_id = new_owner_id;
  UPDATE public.organization_members SET role = 'admin'
  WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'owner';
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_org_ownership TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_organization(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the organization owner can archive it';
  END IF;
  UPDATE public.organizations SET status = 'archived', archived_at = now()
  WHERE id = org_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or is already archived';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_organization TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_organization(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the organization owner can restore it';
  END IF;
  UPDATE public.organizations SET status = 'active', archived_at = NULL
  WHERE id = org_id AND status = 'archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or is not archived';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_organization TO authenticated;

-- =============================================================================
-- PART 10: ORGANIZATION RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "owners and admins can update their organization" ON public.organizations;
CREATE POLICY "owners and admins can update their organization" ON public.organizations
  FOR UPDATE USING (
    public.org_role(id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

-- =============================================================================
-- PART 11: PROFILE VISIBILITY
-- =============================================================================

DROP POLICY IF EXISTS "org members can view each other profiles" ON public.profiles;
CREATE POLICY "org members can view each other profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.organization_members viewer_m
      JOIN   public.organization_members target_m
        ON   viewer_m.organization_id = target_m.organization_id
      WHERE  viewer_m.user_id = auth.uid()
        AND  target_m.user_id = profiles.id
    )
  );

-- =============================================================================
-- PART 12: INVITATION IMPROVEMENTS
-- =============================================================================

ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS resend_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_resent_at timestamptz;

CREATE OR REPLACE FUNCTION public.resend_org_invite(invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite    public.organization_invites;
  new_token uuid;
BEGIN
  SELECT * INTO invite
  FROM   public.organization_invites
  WHERE  id = invite_id AND status = 'pending'
  FOR UPDATE;

  IF invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or is no longer pending';
  END IF;

  IF NOT (
    public.org_role(invite.organization_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to resend invites';
  END IF;

  new_token := gen_random_uuid();

  UPDATE public.organization_invites SET
    token          = new_token,
    expires_at     = now() + interval '14 days',
    resend_count   = resend_count + 1,
    last_resent_at = now()
  WHERE id = invite_id;

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resend_org_invite TO authenticated;

-- =============================================================================
-- PART 13: PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS org_members_user_org_role_idx
  ON public.organization_members (user_id, organization_id, role);

CREATE INDEX IF NOT EXISTS organizations_status_active_idx
  ON public.organizations (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS role_permissions_role_key_idx
  ON public.role_permissions (role, permission_key);

CREATE INDEX IF NOT EXISTS org_invites_pending_email_org_idx
  ON public.organization_invites (email, organization_id, status)
  WHERE status = 'pending';

-- =============================================================================
-- PART 14: GRANTS
-- =============================================================================

GRANT SELECT                         ON public.permissions       TO authenticated;
GRANT SELECT                         ON public.role_permissions   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_permissions TO authenticated;
GRANT ALL                            ON public.permissions        TO service_role;
GRANT ALL                            ON public.role_permissions   TO service_role;
GRANT ALL                            ON public.member_permissions TO service_role;
