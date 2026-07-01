# Production Checklist — Sprint 0.95

**Purpose**: Step-by-step verification for RC1 approval  
**Target environment**: https://eunoia-ai-os-platform.vercel.app

---

## Section 1: Database (MANUAL — Required Before RC1)

### 1.1 Apply migrations 0003–0008 (batch, transactional)

- [ ] Open Supabase SQL Editor: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
- [ ] Paste the entire contents of `docs/sprint-0.95/APPLY_MIGRATIONS_0003_to_0008.sql`
- [ ] Click "Run" — expect no errors
- [ ] Verify with:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name IN ('create_organization','get_usage_totals','healthcheck');
  ```
  Expected: 3 rows

### 1.2 Apply migration 0009 (separate, non-transactional)

- [ ] Open a **new** SQL Editor tab: https://supabase.com/dashboard/project/rrhaklgvpjsdrpvylrcl/sql/new
- [ ] Paste the entire contents of `supabase/migrations/0009_enterprise_multitenant.sql`
- [ ] Click "Run" — expect no errors
  - Note: `ALTER TYPE ADD VALUE` commits immediately and cannot be rolled back
- [ ] Verify with:
  ```sql
  SELECT enumlabel FROM pg_enum e 
  JOIN pg_type t ON e.enumtypid = t.oid 
  WHERE t.typname = 'org_role'
  ORDER BY enumsortorder;
  ```
  Expected: owner, super_admin, admin, manager, operator, editor, member, viewer, guest (9 values)

### 1.3 Post-migration verification

- [ ] Test onboarding: sign up as a new user → `/onboarding` → create workspace → should succeed
- [ ] Test usage page: navigate to `/dashboard/usage` → should show real counts (not "No usage recorded yet")
- [ ] Test health: `curl https://eunoia-ai-os-platform.vercel.app/api/health` → status should still be "ready"
  - After 0008: database provider will confirm actual query execution (stronger check)

---

## Section 2: Secrets (MANUAL — Required Before RC1)

### 2.1 Required for invite email delivery

- [ ] Get RESEND_API_KEY from https://resend.com/api-keys
- [ ] Set in Vercel: Dashboard → Project → Settings → Environment Variables
  - Name: `RESEND_API_KEY`, Value: `re_...`
  - Environments: Production, Preview, Development
- [ ] Set `FROM_EMAIL` to a verified Resend sender (e.g., `noreply@yourdomain.com`)
- [ ] Trigger a redeploy: Vercel → Deployments → Redeploy (or push a commit)
- [ ] Test: invite a team member → check the email arrives

### 2.2 Required to secure Prometheus endpoint

- [ ] Generate token: `openssl rand -base64 32` (run locally)
- [ ] Set in Vercel: `METRICS_TOKEN` = the generated token
- [ ] Trigger a redeploy
- [ ] Test: `curl https://eunoia-ai-os-platform.vercel.app/api/metrics` → should return 401
- [ ] Test: `curl -H "Authorization: Bearer <token>" https://eunoia-ai-os-platform.vercel.app/api/metrics` → should return metrics

### 2.3 Required for production error tracking

- [ ] Get DSN from https://sentry.io → your project → Settings → Client Keys
- [ ] Set in Vercel:
  - `NEXT_PUBLIC_SENTRY_DSN` = `https://xxxxx@o0.ingest.sentry.io/0`
  - `SENTRY_DSN` = same value
- [ ] Trigger a redeploy
- [ ] Verify in Sentry: navigate to `/dashboard` → check Issues tab for any new events

### 2.4 For CI source maps (optional but recommended)

- [ ] Set in GitHub Actions secrets (Settings → Secrets → Actions):
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`

---

## Section 3: Deployment (Automated — Verify Only)

- [x] Vercel project linked: `eunoia-ai-os-platform`
- [x] Branch: `main` → auto-deploys on push
- [x] Build command: `next build`
- [x] Framework: Next.js
- [ ] After secrets added: trigger a clean redeploy and verify build succeeds
- [ ] Verify: no 500 errors in Vercel Function Logs for 5 minutes after redeploy

---

## Section 4: Monitoring

- [ ] `/api/live` returns `{"status":"ok"}` — liveness probe ✅
- [ ] `/api/health` returns `{"status":"ready"}` with all providers green
  - After migration 0008: database provider shows actual query time, not PGRST202 fallback
- [ ] Set up uptime monitoring (Better Stack / UptimeRobot) on:
  - `https://eunoia-ai-os-platform.vercel.app/api/live` → alert if down 1 min
  - `https://eunoia-ai-os-platform.vercel.app/api/health` → alert if not "ready" for 5 min
- [ ] If Prometheus configured: import `docs/operations/grafana/eunoia-system-health.json` into Grafana

---

## Section 5: Recovery & Rollback

### Rollback procedure (code)
```bash
# Revert to last known good commit
git revert HEAD
git push
# Vercel auto-deploys the revert
```

### Rollback procedure (database)
- Migrations 0003–0008: All use `CREATE OR REPLACE` / `CREATE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — idempotent and safe; no rollback needed
- Migration 0009: `ALTER TYPE ADD VALUE` is irreversible — enum values cannot be removed. Safe: the new values don't affect existing data.
- If a migration causes issues: check Vercel function logs, run the verification SQL above, contact Supabase support

### Emergency contacts
- Vercel status: https://www.vercel-status.com
- Supabase status: https://status.supabase.com

---

## Section 6: RC1 Sign-off Checklist

All must be ✅ before RC1 is approved:

- [ ] Migrations 0003–0009 applied and verified
- [ ] New user can sign up → create workspace → use all features
- [ ] `/api/health` → `{"status":"ready"}` with database showing actual query time
- [ ] `/api/live` → `{"status":"ok"}`
- [ ] Invite email received when inviting a team member
- [ ] Usage page shows real data
- [ ] Org settings update works (name change succeeds)
- [ ] METRICS_TOKEN set → `/api/metrics` returns 401 without auth
- [ ] Sentry DSN set → errors are captured in Sentry
- [ ] No P0 issues
- [ ] No P1 issues
- [ ] 62/62 tests passing
- [ ] TypeScript clean
- [ ] Lint clean
