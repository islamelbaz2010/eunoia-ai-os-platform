# Database Audit — Eunoia AI OS

---

## Migration Status

### CRITICAL: Duplicate/Orphan Migration Files

The `supabase/migrations/` directory contains 14 files where there should be ~11:

| File | Status | Notes |
|------|--------|-------|
| `0001_init.sql` | ✅ CANONICAL — Applied | Core schema |
| `0002_rag_invites.sql` | ✅ CANONICAL — Applied | RAG + invites |
| `0003_grants.sql` | ⚠️ Apply status unknown | Grants |
| `0004_indexes_policies.sql` | ⚠️ Apply status unknown | Indexes |
| `0005_schema_hardening.sql` | ⚠️ Apply status unknown | Hardening |
| `0006_hardening_v2.sql` | ⚠️ Apply status unknown | Hardening v2 |
| `0007_get_usage_totals.sql` | ❌ Not applied | Usage RPC |
| `0008_health_check.sql` | ❌ Not applied | Health RPC |
| `0009_enterprise_multitenant.sql` | ❌ ORPHAN — Has bugs (see 0009_fixed) | DO NOT APPLY |
| `0009_enterprise_multitenant_fixed.sql` | ✅ CANONICAL | Fixed version |
| `0009a_enum_roles.sql` | ❌ ORPHAN — Part of old split strategy | DO NOT APPLY |
| `0009b_enterprise_schema.sql` | ❌ ORPHAN — Part of old split strategy | DO NOT APPLY |
| `0010_crm_platform.sql` | ❌ ORPHAN — Has bugs (see 0010_fixed) | DO NOT APPLY |
| `0010_crm_platform_fixed.sql` | ✅ CANONICAL | Fixed version |

**Risk**: A developer or DBA who applies migrations in alphabetical order would apply both the broken and fixed versions. This would cause errors or, worse, apply the broken version first (which may partially succeed).

**Action Required**: Rename orphan files to `ORPHAN_DO_NOT_APPLY_*` or move to `supabase/migrations/archive/`.

---

## Schema Design

### Organizations
- UUID PK, slug (unique), status enum, subscription_tier, settings JSONB, metadata JSONB
- RLS enabled ✅
- `set_updated_at()` trigger ✅
- Missing: `domain` field for SSO (future)

### Profiles (1:1 with auth.users)
- `is_super_admin` boolean — super admin flag, not role
- No email column (auth.users is source of truth) ✅

### Organization Members
- Composite unique (organization_id, user_id) ✅
- Indexed on user_id AND organization_id ✅
- Role uses `org_role` enum — extended in 0009

### CRM Contacts
- Soft delete (`deleted_at`) ✅
- Archive (`archived_at`) ✅
- Owner (`owner_id`) — nullable FK to profiles ✅
- Pipeline stage — text with CHECK constraint ✅
- AI insight columns (summary, scores, suggested messages) ✅
- Full-text search index (from migration 0010) ✅
- Missing: `deal_value` for pipeline value tracking (currently null in get_crm_metrics)

### Knowledge Base
- `knowledge_base_documents`: title, content, language, status, created_by
- `knowledge_base_chunks`: document_id, organization_id, content, embedding (vector)
- HNSW index on embedding for ANN search ✅
- `match_kb_chunks` RPC for cosine similarity search ✅

### Audit Logs
- Immutable (INSERT-only via RLS policy) — ✅ assumed, needs verification of INSERT-only RLS
- `organization_id`, `actor_id`, `action`, `target_type`, `target_id`, `metadata`

### Usage Events
- Used for rate limiting (count queries) + analytics
- No partitioning — could become performance bottleneck at scale

---

## RPC Functions

| Function | Status | Used By |
|----------|--------|---------|
| `create_organization` | ✅ Defined in 0005 | onboarding/actions.ts |
| `accept_org_invite` | ✅ Defined in 0002 | invite/page.tsx |
| `match_kb_chunks` | ✅ Defined in 0002 | assistant/actions.ts |
| `get_usage_totals` | ❌ Defined in 0007 (NOT applied) | usage/page.tsx |
| `healthcheck` | ❌ Defined in 0008 (NOT applied) | health/providers/database.ts |
| `check_crm_duplicate` | ✅ Defined in 0010_fixed | crm/actions.ts |
| `search_crm_contacts` | ✅ Defined in 0010_fixed | crm/page.tsx |
| `get_crm_metrics` | ✅ Defined in 0010_fixed | dashboard/page.tsx |

---

## Performance

### Current State
- 4 parallel queries on dashboard home (`Promise.all`) ✅
- CRM contact list: `search_crm_contacts` RPC (full-text search, not N+1) ✅
- Usage page: `get_usage_totals` RPC (aggregate, not O(N)) ✅
- Contact detail: `Promise.all` for 5 queries ✅

### Risks
- `getUsageOverTime()` fetches up to 2000 rows then aggregates in JS — acceptable short-term but should become a SQL DATE_TRUNC query
- No pagination implemented — `crm_contacts` capped at default Supabase page size, `knowledge_base_documents` similar
- `usage_events` table has no partition — will slow down as data grows

### Missing Indexes
- `usage_events(actor_id, event_type, created_at)` — used in rate-limit queries
- `audit_logs(organization_id, created_at)` — if audit log pagination is added
- `crm_contacts(organization_id, deleted_at, archived_at)` — soft-delete filter

---

## Connection Handling
- All DB access via `createClient()` from `@supabase/ssr` ✅
- Supabase manages connection pooling internally ✅
- No raw pg connections, no connection pool leaks ✅
- `createClient()` is called inside each request — no shared singleton (correct for serverless) ✅

---

## Database Score: 74 / 100

Deductions:
- -10: Orphan migration files (dangerous)
- -8: Migrations 0007/0008 not applied in prod (functional gaps)
- -5: No table partitioning for append-only tables
- -3: Missing compound indexes on hot query paths
