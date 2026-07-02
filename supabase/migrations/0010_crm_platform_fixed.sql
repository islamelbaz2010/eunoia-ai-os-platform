-- 0010 — CRM Production Platform (Sprint 1) — FIXED
--
-- Fixes vs original 0010_crm_platform.sql:
--
-- FIX 1: get_crm_metrics — renamed keys to match TypeScript CrmMetrics type:
--   new_leads       → new_contacts_30d  (also changed window from 7d to 30d)
--   qualified       → qualified_count
--   won             → won_count
--   lost            → lost_count
--   added pipeline_count (proposal + negotiation contacts)
--   added pipeline_value (null — deal amounts not tracked yet)
--
-- FIX 2: search_crm_contacts — corrected include_archived/include_deleted
--   logic so that archived-but-not-deleted contacts do not bleed into
--   the "deleted" view (was: include_deleted=true caused archived rows
--   to pass the archived filter, bloating results before client re-filter).
--
-- Everything else verified clean:
--   ✓ set_updated_at()    — defined in 0001_init.sql
--   ✓ is_org_member()     — defined in 0001_init.sql
--   ✓ is_super_admin()    — defined in 0001_init.sql
--   ✓ org_role()          — defined in 0001_init.sql
--   ✓ org_role enum       — 'super_admin'/'manager' added in 0009a
--   ✓ status::text cast   — crm_lead_status enum → text is valid in PG
--   ✓ trigger syntax      — EXECUTE FUNCTION valid in PG 11+
--   ✓ Constraint pattern  — DROP IF EXISTS then ADD is idempotent
--   ✓ All GRANTs present  — authenticated + service_role
--   ✓ RLS ENABLE          — idempotent (safe to re-run)
--   ✓ DROP/CREATE POLICY  — all idempotent
--   ✓ CREATE INDEX IF NOT EXISTS — all idempotent
--   ✓ CREATE TABLE IF NOT EXISTS — all idempotent
--
-- Apply: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
-- Run AFTER 0009b has been applied.

-- =============================================================================
-- PART 1: EXTEND crm_contacts
-- =============================================================================

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS deleted_at              timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at             timestamptz,
  ADD COLUMN IF NOT EXISTS owner_id                uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source                  text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS website                 text,
  ADD COLUMN IF NOT EXISTS linkedin_url            text,
  ADD COLUMN IF NOT EXISTS pipeline_stage          text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS ai_summary              text,
  ADD COLUMN IF NOT EXISTS ai_next_action          text,
  ADD COLUMN IF NOT EXISTS ai_lead_score           smallint,
  ADD COLUMN IF NOT EXISTS ai_risk_score           smallint,
  ADD COLUMN IF NOT EXISTS ai_opportunity_score    smallint,
  ADD COLUMN IF NOT EXISTS ai_suggested_email      text,
  ADD COLUMN IF NOT EXISTS ai_suggested_whatsapp   text,
  ADD COLUMN IF NOT EXISTS ai_updated_at           timestamptz;

-- Pipeline stage constraint — idempotent (DROP IF EXISTS then ADD)
ALTER TABLE public.crm_contacts
  DROP CONSTRAINT IF EXISTS crm_contacts_pipeline_stage_check;
ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_pipeline_stage_check
    CHECK (pipeline_stage IN ('lead','qualified','proposal','negotiation','won','lost'));

-- =============================================================================
-- PART 2: TAGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name            text        NOT NULL,
  color           text        NOT NULL DEFAULT '#6366f1',
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.crm_contact_tags (
  contact_id  uuid        NOT NULL REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  tag_id      uuid        NOT NULL REFERENCES public.crm_tags (id)     ON DELETE CASCADE,
  assigned_by uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

-- =============================================================================
-- PART 3: TIMELINE EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_timeline_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  contact_id      uuid        NOT NULL REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  title           text        NOT NULL,
  body            text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_timeline_events_type_check
    CHECK (event_type IN ('note','call','meeting','email','whatsapp','system'))
);

-- =============================================================================
-- PART 4: ACTIVITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  contact_id      uuid        REFERENCES public.crm_contacts (id)    ON DELETE SET NULL,
  type            text        NOT NULL,
  title           text        NOT NULL,
  due_at          timestamptz,
  completed_at    timestamptz,
  owner_id        uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by      uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_activities_type_check
    CHECK (type IN ('task','follow_up','call','meeting','email'))
);

-- Trigger: auto-update updated_at on crm_activities
-- public.set_updated_at() is defined in 0001_init.sql
DROP TRIGGER IF EXISTS crm_activities_set_updated_at ON public.crm_activities;
CREATE TRIGGER crm_activities_set_updated_at
  BEFORE UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- PART 5: INDEXES
-- =============================================================================

-- crm_contacts: partial indexes (WHERE deleted_at IS NULL) are small and fast
CREATE INDEX IF NOT EXISTS crm_contacts_active_idx
  ON public.crm_contacts (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_pipeline_idx
  ON public.crm_contacts (organization_id, pipeline_stage)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_status_idx
  ON public.crm_contacts (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_owner_idx
  ON public.crm_contacts (owner_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_deleted_idx
  ON public.crm_contacts (organization_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_archived_idx
  ON public.crm_contacts (organization_id, archived_at)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;

-- Full-text search index (GIN on concatenated searchable fields)
CREATE INDEX IF NOT EXISTS crm_contacts_search_idx
  ON public.crm_contacts
  USING gin ((
    to_tsvector('simple',
      coalesce(full_name, '') || ' ' ||
      coalesce(email,     '') || ' ' ||
      coalesce(company,   '') || ' ' ||
      coalesce(phone,     '')
    )
  ));

-- crm_tags
CREATE INDEX IF NOT EXISTS crm_tags_org_idx
  ON public.crm_tags (organization_id);

-- crm_timeline_events
CREATE INDEX IF NOT EXISTS crm_timeline_contact_idx
  ON public.crm_timeline_events (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_timeline_org_idx
  ON public.crm_timeline_events (organization_id);

-- crm_activities
CREATE INDEX IF NOT EXISTS crm_activities_contact_idx
  ON public.crm_activities (contact_id, due_at);

CREATE INDEX IF NOT EXISTS crm_activities_org_idx
  ON public.crm_activities (organization_id);

CREATE INDEX IF NOT EXISTS crm_activities_owner_idx
  ON public.crm_activities (owner_id);

-- Partial index for pending activities only (WHERE completed_at IS NULL)
CREATE INDEX IF NOT EXISTS crm_activities_pending_idx
  ON public.crm_activities (organization_id, due_at)
  WHERE completed_at IS NULL;

-- =============================================================================
-- PART 6: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.crm_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities      ENABLE ROW LEVEL SECURITY;

-- ── crm_tags ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members view tags"   ON public.crm_tags;
CREATE POLICY "members view tags" ON public.crm_tags
  FOR SELECT USING (public.is_org_member(organization_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "members write tags"  ON public.crm_tags;
CREATE POLICY "members write tags" ON public.crm_tags
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "admins manage tags"  ON public.crm_tags;
CREATE POLICY "admins manage tags" ON public.crm_tags
  FOR ALL USING (
    public.org_role(organization_id) IN ('owner','super_admin','admin','manager')
    OR public.is_super_admin()
  );

-- ── crm_contact_tags (join table — no UPDATE policy needed) ──────────────────

DROP POLICY IF EXISTS "members view contact tags"   ON public.crm_contact_tags;
CREATE POLICY "members view contact tags" ON public.crm_contact_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = contact_id AND public.is_org_member(c.organization_id)
    )
  );

DROP POLICY IF EXISTS "members assign tags"         ON public.crm_contact_tags;
CREATE POLICY "members assign tags" ON public.crm_contact_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = contact_id AND public.is_org_member(c.organization_id)
    )
  );

DROP POLICY IF EXISTS "members remove tags"         ON public.crm_contact_tags;
CREATE POLICY "members remove tags" ON public.crm_contact_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.crm_contacts c
      WHERE c.id = contact_id AND public.is_org_member(c.organization_id)
    )
  );

-- ── crm_timeline_events ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members view timeline"           ON public.crm_timeline_events;
CREATE POLICY "members view timeline" ON public.crm_timeline_events
  FOR SELECT USING (public.is_org_member(organization_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "members write timeline"          ON public.crm_timeline_events;
CREATE POLICY "members write timeline" ON public.crm_timeline_events
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "creators delete own timeline events" ON public.crm_timeline_events;
CREATE POLICY "creators delete own timeline events" ON public.crm_timeline_events
  FOR DELETE USING (
    created_by = auth.uid()
    OR public.org_role(organization_id) IN ('owner','super_admin','admin')
    OR public.is_super_admin()
  );

-- ── crm_activities ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members view activities"   ON public.crm_activities;
CREATE POLICY "members view activities" ON public.crm_activities
  FOR SELECT USING (public.is_org_member(organization_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "members write activities"  ON public.crm_activities;
CREATE POLICY "members write activities" ON public.crm_activities
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "members update activities" ON public.crm_activities;
CREATE POLICY "members update activities" ON public.crm_activities
  FOR UPDATE USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "admins delete activities"  ON public.crm_activities;
CREATE POLICY "admins delete activities" ON public.crm_activities
  FOR DELETE USING (
    created_by = auth.uid()
    OR public.org_role(organization_id) IN ('owner','super_admin','admin')
    OR public.is_super_admin()
  );

-- =============================================================================
-- PART 7: SEARCH RPC
-- FIX 2: Corrected include_archived/include_deleted filter logic.
-- Previously: (include_archived OR c.archived_at IS NULL OR include_deleted)
--   caused archived-but-not-deleted contacts to appear in the deleted view
--   because include_deleted=true made the whole OR expression true.
-- Fixed: archived and deleted are independent axes.
--   include_deleted controls the deleted_at filter only.
--   include_archived controls the archived_at filter only.
--   When viewing deleted contacts, archived status is irrelevant — a deleted
--   contact that was also archived should still appear (deleted wins).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_crm_contacts(
  org_id           uuid,
  q                text    DEFAULT NULL,
  p_status         text    DEFAULT NULL,
  p_stage          text    DEFAULT NULL,
  p_tag_id         uuid    DEFAULT NULL,
  p_owner_id       uuid    DEFAULT NULL,
  include_archived boolean DEFAULT false,
  include_deleted  boolean DEFAULT false,
  p_limit          integer DEFAULT 50,
  p_offset         integer DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  full_name        text,
  email            text,
  phone            text,
  company          text,
  status           text,
  pipeline_stage   text,
  owner_id         uuid,
  source           text,
  website          text,
  linkedin_url     text,
  notes            text,
  deleted_at       timestamptz,
  archived_at      timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz,
  created_by       uuid,
  total_count      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT (public.is_org_member(org_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id, c.full_name, c.email, c.phone, c.company,
      c.status::text, c.pipeline_stage, c.owner_id, c.source,
      c.website, c.linkedin_url, c.notes, c.deleted_at,
      c.archived_at, c.created_at, c.updated_at, c.created_by,
      COUNT(*) OVER() AS total_count
    FROM public.crm_contacts c
    WHERE c.organization_id = org_id
      -- FIX: deleted and archived are independent axes
      AND (include_deleted  OR c.deleted_at  IS NULL)
      AND (include_archived OR c.archived_at IS NULL OR c.deleted_at IS NOT NULL)
      AND (p_status   IS NULL OR c.status::text = p_status)
      AND (p_stage    IS NULL OR c.pipeline_stage = p_stage)
      AND (p_owner_id IS NULL OR c.owner_id = p_owner_id)
      AND (p_tag_id   IS NULL OR EXISTS (
        SELECT 1 FROM public.crm_contact_tags ct
        WHERE ct.contact_id = c.id AND ct.tag_id = p_tag_id
      ))
      AND (
        q IS NULL OR q = ''
        OR to_tsvector('simple',
             coalesce(c.full_name,'') || ' ' ||
             coalesce(c.email,   '') || ' ' ||
             coalesce(c.company, '') || ' ' ||
             coalesce(c.phone,   '')
           ) @@ plainto_tsquery('simple', q)
        OR c.full_name ILIKE '%' || q || '%'
        OR c.email     ILIKE '%' || q || '%'
        OR c.company   ILIKE '%' || q || '%'
        OR c.phone     ILIKE '%' || q || '%'
      )
    ORDER BY
      CASE WHEN c.deleted_at  IS NOT NULL THEN 2
           WHEN c.archived_at IS NOT NULL THEN 1
           ELSE 0
      END,
      c.updated_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT * FROM base;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_crm_contacts TO authenticated;

-- =============================================================================
-- PART 8: DUPLICATE DETECTION RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_crm_duplicate(
  org_id     uuid,
  p_email    text DEFAULT NULL,
  p_name     text DEFAULT NULL,
  exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, full_name text, email text, company text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT (public.is_org_member(org_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT c.id, c.full_name, c.email, c.company
  FROM public.crm_contacts c
  WHERE c.organization_id = org_id
    AND c.deleted_at IS NULL
    AND (exclude_id IS NULL OR c.id <> exclude_id)
    AND (
      (p_email IS NOT NULL AND p_email <> '' AND c.email ILIKE p_email)
      OR (p_name IS NOT NULL AND p_name <> '' AND c.full_name ILIKE p_name)
    )
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_crm_duplicate TO authenticated;

-- =============================================================================
-- PART 9: CRM DASHBOARD METRICS RPC
-- FIX 1: Return keys now match the TypeScript CrmMetrics type exactly:
--   new_contacts_30d  (was: new_leads/added_this_week, was 7 days not 30)
--   qualified_count   (was: qualified)
--   won_count         (was: won)
--   lost_count        (was: lost)
--   pipeline_count    (NEW: proposal + negotiation count)
--   pipeline_value    (NEW: null — deal amounts not tracked in Sprint 1)
-- Existing keys kept: total_contacts, conversion_rate
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_crm_metrics(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_org_member(org_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_contacts',     COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL),
    'new_contacts_30d',   COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days'),
    'qualified_count',    COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL AND pipeline_stage = 'qualified'),
    'won_count',          COUNT(*) FILTER (WHERE deleted_at IS NULL AND pipeline_stage = 'won'),
    'lost_count',         COUNT(*) FILTER (WHERE deleted_at IS NULL AND pipeline_stage = 'lost'),
    'pipeline_count',     COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL AND pipeline_stage IN ('proposal','negotiation')),
    'pipeline_value',     NULL::numeric,
    'archived_count',     COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NOT NULL),
    'new_leads',          COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL AND pipeline_stage = 'lead'),
    'proposal_count',     COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL AND pipeline_stage = 'proposal'),
    'negotiation_count',  COUNT(*) FILTER (WHERE deleted_at IS NULL AND archived_at IS NULL AND pipeline_stage = 'negotiation'),
    'conversion_rate',    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE deleted_at IS NULL AND pipeline_stage IN ('won','lost')) = 0
        THEN 0
        ELSE (
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND pipeline_stage = 'won')::numeric /
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND pipeline_stage IN ('won','lost'))::numeric
        ) * 100
      END, 1
    )
  )
  INTO result
  FROM public.crm_contacts
  WHERE organization_id = org_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_metrics TO authenticated;

-- =============================================================================
-- PART 10: GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tags             TO authenticated;
GRANT SELECT, INSERT,         DELETE ON public.crm_contact_tags     TO authenticated;
GRANT SELECT, INSERT,         DELETE ON public.crm_timeline_events  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities       TO authenticated;

GRANT ALL ON public.crm_tags            TO service_role;
GRANT ALL ON public.crm_contact_tags    TO service_role;
GRANT ALL ON public.crm_timeline_events TO service_role;
GRANT ALL ON public.crm_activities      TO service_role;
