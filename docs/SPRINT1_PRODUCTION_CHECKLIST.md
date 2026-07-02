# Sprint 1 — Production Validation Checklist

**Module**: CRM Production Platform  
**Migration**: `supabase/migrations/0010_crm_platform_fixed.sql`  
**Sprint**: 1 (Sessions 13–14)

---

## PRE-FLIGHT CHECKS (complete before touching Supabase)

- [ ] Confirm migration 0009b is applied in production Supabase  
      Verify: Settings → Database → search for `enterprise_schema` or run `SELECT column_name FROM information_schema.columns WHERE table_name='organizations' AND column_name='subscription_tier'`
- [ ] Confirm code is deployed to Vercel (all Sprint 1 commits on `main` are live)
- [ ] Have Supabase SQL Editor open: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
- [ ] Have `.env.local` with `SUPABASE_SERVICE_ROLE_KEY` for `npm run verify-crm`

---

## PHASE 1 — APPLY MIGRATION

> **Use `0010_crm_platform_fixed.sql`, NOT the original `0010_crm_platform.sql`.**  
> The fixed version corrects two bugs: `get_crm_metrics` key names and `search_crm_contacts` archive filter.

### Step 1 — Open Supabase SQL Editor
URL: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new

### Step 2 — Paste and execute migration
1. Open `supabase/migrations/0010_crm_platform_fixed.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click **Run** (or press Cmd+Enter)

### Step 3 — Confirm success
Expected output in SQL Editor:
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TRIGGER
CREATE INDEX    (×14 indexes)
ALTER TABLE     (×4 — enable RLS)
CREATE POLICY   (×13 policies)
CREATE FUNCTION (×3 — search, duplicate, metrics)
GRANT           (×8 lines)
```

If you see any `ERROR:` lines, stop and check the **Troubleshooting** section below.

---

## PHASE 2 — AUTOMATED VERIFICATION

Run immediately after the migration completes:

```bash
npm run verify-crm
```

### Expected output
```
╔════════════════════════════════════════════════════════════╗
║     Eunoia CRM — Sprint 1 Production Verification          ║
╚════════════════════════════════════════════════════════════╝

── Tables ────────────────────────────────────────────────────
  ✅  table: crm_contacts
  ✅  table: crm_tags
  ✅  table: crm_contact_tags
  ✅  table: crm_timeline_events
  ✅  table: crm_activities

── crm_contacts columns ──────────────────────────────────────
  ✅  crm_contacts has all 15 Sprint 1 columns

── RPCs ──────────────────────────────────────────────────────
  ✅  RPC: search_crm_contacts (exists, access control active)
  ✅  RPC: check_crm_duplicate (exists, access control active)
  ✅  RPC: get_crm_metrics (exists, access control active)

── get_crm_metrics JSON keys ─────────────────────────────────
  ✅  get_crm_metrics has correct key names matching TypeScript type

── Indexes ───────────────────────────────────────────────────
  ✅  index: crm_contacts_active_idx
  ... (14 indexes total)

── Triggers ──────────────────────────────────────────────────
  ✅  Trigger: crm_activities_set_updated_at

── RLS Policies ──────────────────────────────────────────────
  ✅  policy: "members view tags"
  ... (13 policies total)

── Sample CRUD ───────────────────────────────────────────────
  ✅  CRUD: INSERT contact
  ✅  CRUD: UPDATE contact (soft delete)
  ✅  CRUD: DELETE contact (cleanup)
  ✅  CRUD: INSERT crm_tag

── Search RPC ────────────────────────────────────────────────
  ✅  search_crm_contacts: returns array
  ✅  search_crm_contacts: row shape has all required columns
  ✅  search_crm_contacts: text search works

── Audit Logging ─────────────────────────────────────────────
  ✅  audit_logs table accessible

── get_crm_metrics output ────────────────────────────────────
  ✅  get_crm_metrics: executes without error
  ✅  get_crm_metrics: all TypeScript CrmMetrics keys present
  ✅  get_crm_metrics: no old/renamed keys present

╔════════════════════════════════════════════════════════════╗
║  Results: X passed, 0 failed                               ║
╚════════════════════════════════════════════════════════════╝
```

**Required**: 0 failures before proceeding.

---

## PHASE 3 — MANUAL PRODUCTION TESTS

Run these manually in the production app: https://eunoia-ai-os-platform.vercel.app

### 3.1 — CRM contact list page
- [ ] Navigate to `/dashboard/crm` → page loads, no errors
- [ ] Search bar appears, typing filters contacts in real-time (300ms debounce)
- [ ] Stage filter chips (lead, qualified, proposal, negotiation, won, lost) appear
- [ ] View tabs (active / archived / deleted) appear and switch correctly
- [ ] "Pipeline" button navigates to `/dashboard/crm/pipeline`
- [ ] "Activities" button navigates to `/dashboard/crm/activities`
- [ ] "Import" button navigates to `/dashboard/crm/import`
- [ ] "Export CSV" link downloads a CSV file

### 3.2 — Create contact
- [ ] Click "Add contact" → form expands
- [ ] Fill in name + email → submit → contact appears in list
- [ ] Submit same email again → duplicate warning appears
- [ ] Click "Add anyway" → contact is created despite duplicate warning
- [ ] Contacts in list show correct pipeline stage badge

### 3.3 — Contact detail page
- [ ] Click contact row → navigates to `/dashboard/crm/[id]`
- [ ] Contact header shows name, stage badge, status badge, avatar initial
- [ ] Contact details section shows email, phone, website, LinkedIn
- [ ] Notes section shows contact notes
- [ ] "Edit" button → modal opens with all fields populated
- [ ] Change a field → save → page refreshes with updated values

### 3.4 — Timeline (Phase 2)
- [ ] Contact detail page shows "Timeline" section
- [ ] Add a note → appears in timeline with time ago label
- [ ] Add a call event → different icon shown
- [ ] Delete a timeline event → disappears from list

### 3.5 — Tags (Phase 3)
- [ ] "Tags" section shows on contact detail
- [ ] Create a new tag with custom color → appears in tag pool
- [ ] Assign tag to contact → shows colored badge
- [ ] Remove tag from contact → badge disappears

### 3.6 — Pipeline board (Phase 4)
- [ ] Navigate to `/dashboard/crm/pipeline`
- [ ] 6 columns shown: Lead, Qualified, Proposal, Negotiation, Won, Lost
- [ ] Contact cards show in correct columns
- [ ] Drag a contact from one column to another → card moves, stage updated in DB
- [ ] Refresh page → contact remains in new column (server confirmed)

### 3.7 — Activities (Phase 7)
- [ ] Contact detail page shows "Activities" section
- [ ] Add a task with due date → appears in pending list
- [ ] Add an overdue activity → shows red border
- [ ] Mark activity complete → moves to completed section
- [ ] Navigate to `/dashboard/crm/activities` → global list shows all org activities

### 3.8 — CSV Import (Phase 6)
- [ ] Navigate to `/dashboard/crm/import`
- [ ] Download template CSV → opens/saves correctly
- [ ] Upload template CSV → preview shows 1 row
- [ ] Click "Import 1 contact" → success message with count
- [ ] Navigate to CRM → new contact appears

### 3.9 — CSV Export (Phase 6)
- [ ] Click "Export CSV" in CRM header → CSV file downloads
- [ ] Open CSV → has correct columns and contact data
- [ ] No `undefined` or empty rows

### 3.10 — AI Insights (Phase 9)
- [ ] Open a contact detail page
- [ ] "AI Insights" panel shows (may show empty scores initially)
- [ ] Click "Refresh AI Insights" → loading state shown
- [ ] After ~3 seconds → scores appear (0–100 bars), summary text, next action
- [ ] Suggested email section shows collapsible content
- [ ] Suggested WhatsApp section shows collapsible content
- [ ] Refresh page → AI data persisted (not re-fetched)

### 3.11 — Dashboard CRM Metrics (Phase 8)
- [ ] Navigate to `/dashboard`
- [ ] "CRM Pipeline" section appears below main KPI cards
- [ ] Shows 6 cards: New (30d), Qualified, In Pipeline, Won, Lost, Conversion
- [ ] Values are numbers (not `undefined` or NaN)
- [ ] "View CRM →" link navigates to `/dashboard/crm`

---

## PHASE 4 — SECURITY VALIDATION

These must all be confirmed in Supabase:

### RLS active on all new tables
Run in SQL Editor:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('crm_tags','crm_contact_tags','crm_timeline_events','crm_activities');
```
Expected: all rows show `rowsecurity = true`

### Cross-tenant isolation test
Run in SQL Editor (replace UUIDs with real values):
```sql
-- Create a test org
INSERT INTO organizations (name, slug) VALUES ('test_isolation', 'test-iso-' || gen_random_uuid()::text) RETURNING id;

-- Attempt to read another org's contacts via search RPC as that test org
-- (RLS should prevent this — result should be empty)
SELECT * FROM public.search_crm_contacts('<test_org_id>', null);
-- Clean up
DELETE FROM organizations WHERE slug LIKE 'test-iso-%';
```

### Pipeline stage constraint
Run in SQL Editor:
```sql
-- Should fail with constraint violation
INSERT INTO crm_contacts (organization_id, full_name, pipeline_stage)
VALUES ((SELECT id FROM organizations LIMIT 1), 'Test', 'invalid_stage');
```
Expected: `ERROR: new row for relation "crm_contacts" violates check constraint "crm_contacts_pipeline_stage_check"`

---

## ROLLBACK PLAN

If the migration fails or causes issues, execute in Supabase SQL Editor:

```sql
-- ── ROLLBACK: Drop all Sprint 1 additions ────────────────────────────────────
-- WARNING: This is destructive — all CRM Sprint 1 data will be lost.

-- Drop RPCs
DROP FUNCTION IF EXISTS public.search_crm_contacts CASCADE;
DROP FUNCTION IF EXISTS public.check_crm_duplicate CASCADE;
DROP FUNCTION IF EXISTS public.get_crm_metrics CASCADE;

-- Drop new tables (CASCADE drops policies, indexes, triggers automatically)
DROP TABLE IF EXISTS public.crm_activities      CASCADE;
DROP TABLE IF EXISTS public.crm_timeline_events CASCADE;
DROP TABLE IF EXISTS public.crm_contact_tags    CASCADE;
DROP TABLE IF EXISTS public.crm_tags            CASCADE;

-- Drop columns added to crm_contacts
ALTER TABLE public.crm_contacts
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS owner_id,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS linkedin_url,
  DROP COLUMN IF EXISTS pipeline_stage,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS ai_next_action,
  DROP COLUMN IF EXISTS ai_lead_score,
  DROP COLUMN IF EXISTS ai_risk_score,
  DROP COLUMN IF EXISTS ai_opportunity_score,
  DROP COLUMN IF EXISTS ai_suggested_email,
  DROP COLUMN IF EXISTS ai_suggested_whatsapp,
  DROP COLUMN IF EXISTS ai_updated_at;

-- Confirm clean state
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'crm_contacts'
ORDER BY ordinal_position;
```

After rollback: redeploy the previous commit (`git revert` or `git checkout <pre-sprint1-commit>` on Vercel).

---

## TROUBLESHOOTING

### Error: `relation "crm_tags" already exists`
The migration was partially applied before. Run the rollback SQL above first, then re-apply.

### Error: `function "set_updated_at" does not exist`
Migration 0001_init.sql was not applied. Apply 0001 first.

### Error: `function "is_org_member" does not exist`
Migration 0001_init.sql was not applied. Apply 0001 first.

### Error: `type "org_role" does not have an entry for "super_admin"`
Migration 0009a was not applied. Apply 0009a first.

### Error: `column "organization_id" of relation "organizations" does not exist` (unlikely but possible)
Migration 0009b was not applied. Apply 0009b first.

### `verify-crm` shows `get_crm_metrics key names FAILED — Missing keys: new_contacts_30d...`
You applied the original `0010_crm_platform.sql` instead of the fixed version. Run the rollback SQL above, then apply `0010_crm_platform_fixed.sql`.

### Dashboard shows `undefined` for CRM metric values
Same root cause: original migration applied. Same fix as above.

### AI Insights: "AI service unavailable"
`OPENAI_API_KEY` not set in Vercel environment. Set it in Vercel Dashboard → Project → Settings → Environment Variables.

---

## APPROVAL GATE

Sprint 1 is approved for production when:

- [ ] Migration applied without errors
- [ ] `npm run verify-crm` → 0 failures
- [ ] All Phase 3 manual tests pass
- [ ] RLS confirmed active via SQL
- [ ] Pipeline stage constraint confirmed active via SQL

**Date approved**: ________________  
**Approved by**: ________________
