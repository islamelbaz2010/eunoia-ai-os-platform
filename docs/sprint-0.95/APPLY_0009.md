# How to Apply Migration 0009 — Enterprise Multi-Tenant

**File**: `supabase/migrations/0009_enterprise_multitenant.sql`  
**Size**: 593 lines, 7 functions, 3 tables  
**Criticality**: Must run separately from migrations 0003–0008

---

## Why It Must Run Separately

Migration 0009 contains 5 `ALTER TYPE ... ADD VALUE` statements:

```sql
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'manager'     AFTER  'admin';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'operator'    AFTER  'manager';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'editor'      AFTER  'operator';
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'guest'       AFTER  'viewer';
```

### The PostgreSQL constraint

In PostgreSQL 12 and later, `ALTER TYPE ... ADD VALUE` **cannot be called within a transaction block**. Every transaction in PostgreSQL wraps all statements in an implicit `BEGIN ... COMMIT`. If this migration ran inside a batch (with the 0003–0008 file), PostgreSQL would raise:

```
ERROR: ALTER TYPE ... ADD VALUE cannot run inside a transaction block
```

This means the entire batch would roll back, including all 6 preceding migrations.

### Why `IF NOT EXISTS` doesn't help

`IF NOT EXISTS` prevents errors if the value already exists, but it does not bypass the transaction restriction. Even `ALTER TYPE ... ADD VALUE IF NOT EXISTS` will fail inside a transaction.

---

## How to Apply

**Step 1**: Open a new Supabase SQL Editor tab:  
`https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new`

**Step 2**: Paste the entire contents of `supabase/migrations/0009_enterprise_multitenant.sql`

**Step 3**: Click **"Run"** — do NOT wrap it in BEGIN/COMMIT

**Step 4**: Verify success:

```sql
-- Should return 9 rows: guest, viewer, editor, member, operator, manager, admin, super_admin, owner
SELECT enumlabel FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'org_role'
ORDER BY enumsortorder;

-- Should return: status, archived_at, subscription_tier, settings, metadata
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'organizations' 
  AND column_name IN ('status', 'archived_at', 'subscription_tier', 'settings', 'metadata');

-- Should return 2 rows
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('member_permissions', 'permissions');

-- Should return 7 rows
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'update_organization_settings', 'transfer_org_ownership',
  'archive_organization', 'resend_org_invite',
  'org_role', 'is_org_member', 'is_super_admin'
)
ORDER BY routine_name;
```

---

## What 0009 Creates

| Object | Type | Purpose |
|--------|------|---------|
| `org_role` enum | Extended | Adds: super_admin, manager, operator, editor, guest |
| `org_status` type | New enum | active, archived, suspended |
| `organizations.status` | New column | Lifecycle state (default: active) |
| `organizations.archived_at` | New column | When archived |
| `organizations.subscription_tier` | New column | free/starter/pro/enterprise |
| `organizations.settings` | New column | JSONB: branding, locale, business |
| `organizations.metadata` | New column | JSONB: flexible KV store |
| `permissions` table | New table | Permission key registry |
| `member_permissions` table | New table | Per-member permission overrides |
| `update_organization_settings()` | New RPC | SECURITY DEFINER, updates name+settings |
| `transfer_org_ownership()` | New RPC | SECURITY DEFINER, atomic ownership transfer |
| `archive_organization()` | New RPC | SECURITY DEFINER, sets status=archived |
| `resend_org_invite()` | New RPC | SECURITY DEFINER, rotates token + extends expiry |
| `accept_org_invite()` | Updated | Now handles extended roles |

---

## What Happens If It Fails

If the run shows any error, the `ALTER TYPE` statements that already ran **cannot be rolled back** — they committed immediately. The remaining statements (after the error) did not run.

**Recovery**: Note which line errored. You can safely re-run the entire file — the `IF NOT EXISTS` guards on the `ADD VALUE` statements prevent duplicate errors. The `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` statements are idempotent.

---

## Success Output

When run successfully, the editor shows `Success. No rows returned.` or a count of affected rows for each statement. No `ERROR:` lines.
