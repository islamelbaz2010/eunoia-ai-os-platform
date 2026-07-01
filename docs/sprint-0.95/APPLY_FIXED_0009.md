# How to Apply 0009 — Fixed Migration

**File**: `supabase/migrations/0009_enterprise_multitenant_fixed.sql`  
**Replaces**: `0009_enterprise_multitenant.sql` — do NOT apply both  
**SQL Editor**: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new

---

## What Was Wrong in the Original

| Line | Bug | Fix |
|------|-----|-----|
| 25 | `CREATE TYPE IF NOT EXISTS public.org_status` — PostgreSQL does not support `IF NOT EXISTS` for enum types. Raises: `syntax error at or near "NOT"` | Replaced with `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` |
| 38–40 | `EXECUTE PROCEDURE public.set_updated_at()` — `set_updated_at()` is not a Supabase built-in and was never defined in any migration | Added `CREATE OR REPLACE FUNCTION public.set_updated_at()` before the trigger |
| 38 | `CREATE OR REPLACE TRIGGER` — deprecated `EXECUTE PROCEDURE` syntax | Changed to `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER ... EXECUTE FUNCTION` |
| 57–58 | `CREATE POLICY "authenticated can view permissions"` — no idempotency guard | Added `DROP POLICY IF EXISTS` before |
| 74–75 | `CREATE POLICY "authenticated can view role permissions"` — no idempotency guard | Added `DROP POLICY IF EXISTS` before |
| 100–104 | `CREATE POLICY "admins manage member permissions"` — no idempotency guard | Added `DROP POLICY IF EXISTS` before |
| 106–111 | `CREATE POLICY "members view own permissions"` — no idempotency guard | Added `DROP POLICY IF EXISTS` before |
| 591–593 | Missing `GRANT ALL ... TO service_role` for the 3 new tables | Added |

---

## Current DB State (After Failed Original Run)

The `ALTER TYPE ADD VALUE` statements (lines 15–19 of the original) auto-commit immediately and ran before the syntax error on line 25 aborted execution. These roles now exist in the database:

- `super_admin` — added before `admin`
- `manager` — added after `admin`
- `operator` — added after `manager`
- `editor` — added after `operator`
- `guest` — added after `viewer`

The fixed migration includes those same `ALTER TYPE ADD VALUE IF NOT EXISTS` statements. They are safe to re-run — `IF NOT EXISTS` makes them a no-op if the value already exists.

Everything from Part 2 onward (org_status type, new columns, tables, functions) was NOT applied and will be created fresh.

---

## How to Apply

**Step 1**: Open the SQL Editor  
`https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new`

**Step 2**: Click "New query" to open a blank editor

**Step 3**: Paste the entire contents of  
`supabase/migrations/0009_enterprise_multitenant_fixed.sql`

**Step 4**: Click **Run**

**Expected output**: No `ERROR:` lines. Each statement shows "Success" or a row count.

---

## Verify After Applying

```bash
npm run verify-migrations
```

Expected output:
```
✅ create_organization RPC exists
✅ get_usage_totals RPC exists
✅ healthcheck() callable by anon
✅ healthcheck() returns server_time and database
✅ member_permissions table exists
✅ permissions table exists
✅ organizations.status column exists
✅ resend_org_invite RPC exists
✅ knowledge_base_chunks accessible to service_role
✅ audit_logs accessible to service_role
✅ /api/live returns ok
✅ /api/health returns ready
✅ /api/metrics requires Bearer token

Results: 13 passed, 0 failed
✅ All migrations verified. RC1 is GO.
```

---

## If It Fails Again

If any error occurs:

1. Note the exact line number from the SQL Editor error panel
2. The fixed migration is fully idempotent — you can re-run it in its entirety after fixing any additional issue
3. All CREATE statements use `IF NOT EXISTS` or `CREATE OR REPLACE`
4. All INSERT seeds use `ON CONFLICT DO NOTHING`
5. All policies use `DROP POLICY IF EXISTS` before recreation

The only statement that is not trivially re-runnable is `ALTER TYPE ADD VALUE` — but these are already guarded with `IF NOT EXISTS`, so re-running is safe.
