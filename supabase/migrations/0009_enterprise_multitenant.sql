-- Eunoia AI OS — Sprint 4: Enterprise Multi-Tenant Core
-- Extends role system, adds RBAC permission registry, org lifecycle,
-- org settings, workspace switching support, and invitation improvements.
--
-- IMPORTANT: ALTER TYPE ... ADD VALUE is non-transactional in PostgreSQL.
-- Each ADD VALUE commits immediately and cannot be rolled back.
-- Apply this migration in a single Supabase SQL Editor run.

-- =============================================================================
-- PART 1: EXTENDED ROLE SYSTEM
-- Adds 5 new roles while preserving all existing enum values and data.
-- Order matters: enum values are ordered internally in Postgres 14+.
-- =============================================================================

ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'manager'     AFTER  'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'operator'    AFTER  'manager';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'editor'      AFTER  'operator';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'guest'       AFTER  'viewer';

-- =============================================================================
-- PART 2: ORGANIZATION LIFECYCLE
-- =============================================================================

CREATE TYPE IF NOT EXISTS public.org_status AS ENUM ('active', 'archived', 'suspended');

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status            public.org_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS settings          jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata          jsonb NOT NULL DEFAULT '{}';

-- Timestamp role changes (needed for audit trail and permission history)
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER organization_members_set_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- =============================================================================
-- PART 3: PERMISSION REGISTRY
-- The canonical list of all permissions in the system.
-- Business logic code references these keys as constants — never raw strings.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  key         text PRIMARY KEY,
  description text NOT NULL,
  category    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can view permissions" ON public.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 4: ROLE PERMISSIONS (default grants per role)
-- Maps roles to their default permission set.
-- These are the defaults — member_permissions (Part 5) allow per-user overrides.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role           public.org_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions (key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can view role permissions" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 5: MEMBER PERMISSIONS (per-member overrides)
-- Allows granting individual permissions beyond the role's defaults,
-- or revoking specific permissions from a role (granted = false).
-- This enables future ABAC expansion.
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

CREATE POLICY "admins manage member permissions" ON public.member_permissions
  FOR ALL USING (
    public.org_role(organization_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

CREATE POLICY "members view own permissions" ON public.member_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.org_role(organization_id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

-- =============================================================================
-- PART 6: SEED PERMISSION REGISTRY
-- All permission keys. These are the identifiers used in application code.
-- Add new permissions here via a new migration (0010+), never edit existing keys.
-- =============================================================================

INSERT INTO public.permissions (key, description, category) VALUES
  -- CRM
  ('crm.contacts.read',          'View CRM contacts',              'CRM'),
  ('crm.contacts.write',         'Create and update CRM contacts', 'CRM'),
  ('crm.contacts.delete',        'Delete CRM contacts',            'CRM'),
  ('crm.contacts.export',        'Export CRM contact data',        'CRM'),
  -- Knowledge Base
  ('knowledge.documents.read',   'View Knowledge Base documents',  'Knowledge Base'),
  ('knowledge.documents.write',  'Create and edit documents',      'Knowledge Base'),
  ('knowledge.documents.delete', 'Delete documents',               'Knowledge Base'),
  -- AI Assistant
  ('assistant.query',            'Use the RAG AI Assistant',       'AI Assistant'),
  -- Organization management
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
  -- Billing
  ('billing.read',               'View billing and subscription info',  'Billing'),
  ('billing.manage',             'Manage billing and subscriptions',    'Billing'),
  -- Reporting
  ('audit.read',                 'View audit logs',                    'Reporting'),
  ('usage.read',                 'View usage reports',                 'Reporting')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- PART 7: SEED ROLE → PERMISSION DEFAULTS
-- Each role gets a curated permission set. Owners get everything.
-- Future: additional roles can be seeded via new migrations.
-- =============================================================================

-- Owner: all permissions
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'owner', key FROM public.permissions
ON CONFLICT DO NOTHING;

-- Super Admin (org-level): everything except billing management and destructive org ops
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'super_admin', key FROM public.permissions
  WHERE key NOT IN ('billing.manage', 'org.archive', 'org.transfer')
ON CONFLICT DO NOTHING;

-- Admin: team and content management — no billing or org deletion
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'admin', key FROM public.permissions
  WHERE key NOT IN ('billing.manage', 'billing.read', 'org.archive', 'org.transfer')
ON CONFLICT DO NOTHING;

-- Manager: team-level without org administration or billing
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

-- Operator: CRM write + KB read + assistant
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'operator', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read', 'crm.contacts.write',
    'knowledge.documents.read',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

-- Editor: KB write + assistant
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'editor', key FROM public.permissions
  WHERE key IN (
    'knowledge.documents.read', 'knowledge.documents.write',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

-- Member (legacy — preserved for existing data, equivalent to editor + CRM write)
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'member', key FROM public.permissions
  WHERE key IN (
    'crm.contacts.read', 'crm.contacts.write',
    'knowledge.documents.read', 'knowledge.documents.write',
    'assistant.query',
    'org.members.read'
  )
ON CONFLICT DO NOTHING;

-- Viewer: read-only across CRM, KB, and reports
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

-- Guest: AI assistant access only
INSERT INTO public.role_permissions (role, permission_key)
  SELECT 'guest', key FROM public.permissions
  WHERE key IN ('assistant.query')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 8: EFFECTIVE PERMISSIONS FUNCTION
-- Returns the full permission set for auth.uid() in a given organization,
-- accounting for role defaults and member-level overrides.
-- Called once per request and cached in the application layer.
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
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Platform super admins get every permission in every org
  IF public.is_super_admin() THEN
    RETURN QUERY SELECT key FROM public.permissions;
    RETURN;
  END IF;

  SELECT role INTO member_role
  FROM public.organization_members
  WHERE organization_id = target_org_id AND user_id = auth.uid();

  IF member_role IS NULL THEN
    RETURN;
  END IF;

  -- Role defaults, minus explicit denies, plus explicit individual grants
  RETURN QUERY
  (
    -- Base set: role's default permissions
    SELECT rp.permission_key
    FROM   public.role_permissions rp
    WHERE  rp.role = member_role
    AND NOT EXISTS (
      SELECT 1
      FROM   public.member_permissions mp
      WHERE  mp.organization_id = target_org_id
        AND  mp.user_id         = auth.uid()
        AND  mp.permission_key  = rp.permission_key
        AND  mp.granted         = false
    )
  )
  UNION
  (
    -- Additional grants beyond role defaults
    SELECT mp.permission_key
    FROM   public.member_permissions mp
    WHERE  mp.organization_id = target_org_id
      AND  mp.user_id         = auth.uid()
      AND  mp.granted         = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions TO authenticated;

-- Convenience boolean check for RLS-safe single-permission queries
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
-- All destructive operations are SECURITY DEFINER RPCs to avoid permissive
-- INSERT/UPDATE/DELETE policies on the organizations table.
-- =============================================================================

-- Update name and/or JSONB settings (owners + admins)
CREATE OR REPLACE FUNCTION public.update_organization_settings(
  org_id    uuid,
  new_name  text    DEFAULT NULL,
  p_settings jsonb  DEFAULT NULL,
  p_metadata jsonb  DEFAULT NULL
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

-- Transfer ownership atomically (owner-only)
CREATE OR REPLACE FUNCTION public.transfer_org_ownership(
  org_id        uuid,
  new_owner_id  uuid
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

  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = new_owner_id
  ) THEN
    RAISE EXCEPTION 'The target user must already be a member of this organization';
  END IF;

  -- Prevent no-op transfer to self
  IF new_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;

  -- Promote new owner
  UPDATE public.organization_members
    SET role = 'owner'
  WHERE organization_id = org_id AND user_id = new_owner_id;

  -- Demote current owner to admin (preserves their membership)
  UPDATE public.organization_members
    SET role = 'admin'
  WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'owner';
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_org_ownership TO authenticated;

-- Soft-archive an organization (owner-only)
CREATE OR REPLACE FUNCTION public.archive_organization(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the organization owner can archive it';
  END IF;

  UPDATE public.organizations
    SET status = 'archived', archived_at = now()
  WHERE id = org_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or is already archived';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_organization TO authenticated;

-- Restore an archived organization (owner-only)
CREATE OR REPLACE FUNCTION public.restore_organization(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.org_role(org_id) IS DISTINCT FROM 'owner' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the organization owner can restore it';
  END IF;

  UPDATE public.organizations
    SET status = 'active', archived_at = NULL
  WHERE id = org_id AND status = 'archived';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or is not archived';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_organization TO authenticated;

-- =============================================================================
-- PART 10: UPDATED ORGANIZATION RLS POLICIES
-- Fix: owners and admins could not UPDATE their own organization.
-- Previously only super admins had this via the ALL policy.
-- =============================================================================

DROP POLICY IF EXISTS "owners and admins can update their organization" ON public.organizations;
CREATE POLICY "owners and admins can update their organization" ON public.organizations
  FOR UPDATE USING (
    public.org_role(id) IN ('owner', 'super_admin', 'admin')
    OR public.is_super_admin()
  );

-- =============================================================================
-- PART 11: PROFILE VISIBILITY FIX
-- Members of the same organization need to see each other's display names
-- in the Settings page (currently blocked by the single-user SELECT policy).
-- This policy allows profile reads if the viewer is a member of any org
-- the target is also a member of.
-- =============================================================================

DROP POLICY IF EXISTS "org members can view each other profiles" ON public.profiles;
CREATE POLICY "org members can view each other profiles" ON public.profiles
  FOR SELECT USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR public.is_super_admin()
    -- Members of the same org can see each other's display names
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
-- PART 12: INVITATION SYSTEM IMPROVEMENTS
-- Add resend tracking columns and a safe resend RPC.
-- =============================================================================

ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS resend_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_resent_at  timestamptz;

-- Resend an invite: generates a new token + extends expiry by 14 days
CREATE OR REPLACE FUNCTION public.resend_org_invite(invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite     public.organization_invites;
  new_token  uuid;
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
-- All are IF NOT EXISTS so this migration is idempotent.
-- =============================================================================

-- Composite auth check: user membership + role lookup in one seek
CREATE INDEX IF NOT EXISTS org_members_user_org_role_idx
  ON public.organization_members (user_id, organization_id, role);

-- Active organization filtering (most queries only care about active orgs)
CREATE INDEX IF NOT EXISTS organizations_status_active_idx
  ON public.organizations (status)
  WHERE status = 'active';

-- Permission resolution (hot path for every authenticated action)
CREATE INDEX IF NOT EXISTS role_permissions_role_key_idx
  ON public.role_permissions (role, permission_key);

-- Member override lookup
CREATE INDEX IF NOT EXISTS member_permissions_org_user_key_idx
  ON public.member_permissions (organization_id, user_id, permission_key);

-- Pending invite dedup check
CREATE INDEX IF NOT EXISTS org_invites_pending_email_org_idx
  ON public.organization_invites (email, organization_id, status)
  WHERE status = 'pending';

-- =============================================================================
-- PART 14: GRANTS
-- =============================================================================

GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_permissions TO authenticated;
