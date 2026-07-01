# Database Alignment Report — Sprint 0.95

**Date**: 2026-07-02  
**Verification method**: Live REST API probes against production Supabase (rrhaklgvpjsdrpvylrcl)  
**Status**: ❌ NOT ALIGNED — 3-4 migrations not applied

---

## Migration Status (Verified)

| Migration | Applied | Method | Notes |
|-----------|---------|--------|-------|
| 0001_init.sql | ✅ Yes | Table existence probe | All 9 core tables, RLS active, base functions, 4-value org_role enum |
| 0002_rag_invites.sql | ✅ Yes | Function probe | `accept_org_invite` (HTTP 400 = exists), `match_kb_chunks` (HTTP 200) |
| 0003_grants.sql | ❓ Unverifiable | — | GRANT state not accessible via REST API; tables are readable so grants likely effective |
| 0004_indexes_policies.sql | ❓ Unverifiable | — | Indexes not introspectable via REST API; RLS policies untestable without pg_catalog |
| 0005_schema_hardening.sql | ❌ No | RPC probe | `create_organization` → PGRST202. FK constraint changes unverifiable |
| 0006_hardening_v2.sql | ❓ Uncertain | — | `accept_org_invite` exists (0002 or 0006 version; can't distinguish). Index unverifiable |
| 0007_get_usage_totals.sql | ❌ No | RPC probe | `get_usage_totals` → PGRST202 |
| 0008_health_check.sql | ❌ No | RPC probe | `healthcheck` → PGRST202 |
| 0009_enterprise_multitenant.sql | ❌ No | Enum + column probe | `org_role` enum has only 4 values; `organizations.status` → column 42703; `member_permissions` → HTTP 404 |

---

## Impact of Missing Migrations

### 0005 — create_organization missing
- **Blocked**: New user signup. Users can create an auth account but cannot create a workspace.
- **Workaround**: Friendly error shown ("Workspace creation is temporarily unavailable")
- **Risk**: `creator can delete own kb documents` RLS policy may be missing — deleting an orphaned document when embedding fails could leave zombie rows

### 0006 — Version uncertain
- **Risk**: If 0002 version of `accept_org_invite` is running, it has a race condition — two concurrent calls with the same token could both succeed
- **Mitigation**: Unlikely in practice at current scale; only one user per invite

### 0007 — get_usage_totals missing
- **Blocked**: Efficient usage aggregation
- **Workaround**: Code falls back to direct `usage_events` query with JS aggregation (10K row cap)
- **Risk**: Degraded performance at scale; silent truncation above 10K events

### 0008 — healthcheck missing
- **Blocked**: `/api/health` database provider cannot confirm live DB query execution
- **Workaround**: Code treats PGRST202 as "ok" (PostgREST is alive, function just not deployed)
- **Risk**: `/api/health` database check is weaker than designed — proves connectivity but not query execution

### 0009 — Enterprise schema missing
- **Blocked**: `updateOrgSettings`, `transferOwnership`, `archiveOrganization` (all show safe error)
- **Blocked**: `resendInvite` via RPC (code falls back to direct UPDATE — this works)
- **Blocked**: Member-level permission overrides (code falls back to role defaults — this is safe)
- **Risk**: `inviteSchema` accepts 9 roles but production enum only has 4. UI only shows 4, so no user-facing bug, but the Zod schema is overly permissive.

---

## What 0001 Already Contains (No Migration Needed)

These were in the initial schema — they do NOT require any migration:
- `crm_contacts.created_by` column
- `knowledge_base_documents.created_by` column
- All 9 tables
- RLS on all tables
- `is_org_member()`, `org_role()`, `is_super_admin()` helper functions

---

## Migration Execution Order (Required)

```
0003 → 0004 → 0005 → 0006 → 0007 → 0008   ← batch, transactional, safe
0009                                          ← separate, non-transactional (ALTER TYPE)
```

### Why this order matters

- **0005 before 0009**: 0005 creates `create_organization` which inserts into `organizations` with only 4 enum values. 0009 extends the enum but doesn't break existing data.
- **0003 before 0005**: 0003 grants `EXECUTE` on functions created in 0005.
- **0006 after 0005**: 0006 updates `accept_org_invite` which depends on `organization_members` structure finalized by 0004.
- **0009 alone**: `ALTER TYPE ADD VALUE` cannot run inside a transaction. Must run in a single editor session.

---

## Verification Commands (After Apply)

Run these to confirm each migration is applied:

```sql
-- 0005: create_organization exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'create_organization';

-- 0007: get_usage_totals exists  
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_usage_totals';

-- 0008: healthcheck exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'healthcheck';

-- 0009: org_role has extended values
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'org_role';

-- 0009: organizations.status column exists
SELECT column_name FROM information_schema.columns WHERE table_name='organizations' AND column_name='status';

-- 0009: member_permissions table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'member_permissions';
```
