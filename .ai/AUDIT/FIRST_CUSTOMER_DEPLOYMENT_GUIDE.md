# FIRST CUSTOMER DEPLOYMENT GUIDE
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Environment**: Vercel (production) + Supabase (production)  
**Production URL**: https://eunoia-ai-os-platform.vercel.app  

---

## PRE-DEPLOYMENT CHECKLIST

Run `npx tsc --noEmit && npm run lint && npm test` — all must pass before deploying.

---

## STEP 1: APPLY PENDING DATABASE MIGRATIONS (Supabase)

Do these in order. Log into Supabase Dashboard → SQL Editor.

### 1.1 Migration 0007 — Usage Totals Function

```sql
-- Paste entire contents of supabase/migrations/0007_get_usage_totals.sql
-- Verify: SELECT public.get_usage_totals('00000000-0000-0000-0000-000000000000');
-- Expected: empty array []
```

### 1.2 Migration 0008 — Health Check Function

```sql
-- Paste entire contents of supabase/migrations/0008_health_check.sql
-- Verify: SELECT public.healthcheck();
-- Expected: {"status": "ok", ...}
```

### 1.3 Migration 0009 — Enterprise Multitenant Schema

```sql
-- Paste entire contents of supabase/migrations/0009_enterprise_multitenant_fixed.sql
-- IMPORTANT: ALTER TYPE ADD VALUE is non-transactional — do not wrap in BEGIN/COMMIT
-- Run the entire file in one execution
-- Verify: SELECT unnest(enum_range(NULL::org_role));
```

### 1.4 Verify All Migrations Applied

```sql
-- Run this query to confirm all functions exist:
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_usage_totals', 'healthcheck', 'create_organization', 
                        'accept_org_invite', 'match_kb_chunks', 'get_crm_metrics');
-- Expected: 6 rows
```

---

## STEP 2: SET ENVIRONMENT VARIABLES (Vercel)

Vercel Dashboard → Project → Settings → Environment Variables  
Set these for **Production** environment (and Preview if desired):

| Variable | Value | Required |
|----------|-------|----------|
| `RESEND_API_KEY` | Your Resend API key | YES |
| `FROM_EMAIL` | `Eunoia AI OS <noreply@yourdomain.com>` | YES |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN | YES |
| `SENTRY_DSN` | Your Sentry DSN (same value) | YES |
| `METRICS_TOKEN` | `openssl rand -base64 32` | YES |

**Generate METRICS_TOKEN**:
```bash
openssl rand -base64 32
# Example output: kJ7mN9pQ2rS4tU6vW8xY0zA1bC3dE5f=
```

Redeploy after setting all env vars (Vercel Dashboard → Deployments → Redeploy latest).

---

## STEP 3: VERIFY DOMAIN AND EMAIL

### 3.1 Verify Sending Domain in Resend

1. Go to resend.com → Domains → Add Domain
2. Add `yourdomain.com`
3. Copy the 3 DNS records (MX, TXT for DKIM, TXT for SPF)
4. Add them to your DNS provider
5. Wait for verification (5–60 minutes)
6. Test: Send a test email from Resend dashboard

### 3.2 Custom Domain (Optional but Recommended)

If using a custom domain instead of `eunoia-ai-os-platform.vercel.app`:
1. Vercel Dashboard → Project → Settings → Domains → Add
2. Add DNS records at your registrar
3. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
4. Redeploy

---

## STEP 4: COMMIT UNTRACKED MIGRATIONS TO GIT

```bash
cd /path/to/eunoia-ai-os-platform
git add supabase/migrations/
git status  # verify all migration files are staged
git commit -m "chore: add migrations 0003-0009 to version control"
git push origin main
```

---

## STEP 5: CONFIGURE MONITORING

### 5.1 Sentry Setup

1. Go to sentry.io → Create Project → Next.js
2. Copy DSN
3. Set in Vercel as `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`
4. Test: Navigate to a 404 in production → confirm event in Sentry

For source maps in CI, add to GitHub Secrets:
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### 5.2 Uptime Monitoring (BetterStack)

1. Sign up at betterstack.com → Create monitor
2. URL: `https://eunoia-ai-os-platform.vercel.app/api/live`
3. Check interval: 1 minute
4. Alert: Email/Slack when status changes
5. Expected response: `{"status":"ok"}`

### 5.3 Prometheus + Grafana (Optional)

The Prometheus endpoint is live at `/api/metrics`.  
Import `docs/operations/grafana/eunoia-system-health.json` to Grafana.  
Set `METRICS_TOKEN` in Vercel before configuring Prometheus scrape config.

---

## STEP 6: PRODUCTION SMOKE TESTS

Run these after every deployment:

```bash
# 1. Liveness
curl https://eunoia-ai-os-platform.vercel.app/api/live
# Expected: {"status":"ok"}

# 2. Readiness
curl https://eunoia-ai-os-platform.vercel.app/api/health
# Expected: {"status":"ready","providers":[...]}

# 3. Metrics endpoint blocked without token
curl https://eunoia-ai-os-platform.vercel.app/api/metrics
# Expected: HTTP 401

# 4. Metrics endpoint works with token
curl -H "Authorization: Bearer YOUR_METRICS_TOKEN" \
  https://eunoia-ai-os-platform.vercel.app/api/metrics
# Expected: Prometheus text format

# 5. Login page loads
curl -I https://eunoia-ai-os-platform.vercel.app/login
# Expected: HTTP 200

# 6. Dashboard redirects unauthenticated
curl -I https://eunoia-ai-os-platform.vercel.app/dashboard
# Expected: HTTP 307 → /login
```

---

## STEP 7: CI/CD PIPELINE

GitHub Actions CI is configured at `.github/workflows/ci.yml`.  
It runs lint + TypeScript check + tests on every push to main.

**For automated deployments**:
- Vercel's GitHub integration auto-deploys on push to main
- Preview deployments are created for every PR

**Required GitHub Secrets** (Settings → Secrets → Actions):
```
SENTRY_AUTH_TOKEN=...  (for source maps)
SENTRY_ORG=...
SENTRY_PROJECT=...
```

---

## ROLLBACK PROCEDURE

If a deployment breaks production:

```bash
# Option 1: Vercel Dashboard → Deployments → find last good deployment → Promote to Production
# Option 2: Git revert
git revert HEAD --no-edit
git push origin main
# Vercel auto-deploys on push
```

For database rollbacks, see `docs/runbooks/rollback.md`.

---

## DEPLOYMENT VERIFICATION LOG

| Step | Status | Notes | Completed By |
|------|--------|-------|-------------|
| Migration 0007 applied | ☐ | | |
| Migration 0008 applied | ☐ | | |
| Migration 0009 applied | ☐ | | |
| RESEND_API_KEY set | ☐ | | |
| FROM_EMAIL set | ☐ | | |
| SENTRY_DSN set | ☐ | | |
| METRICS_TOKEN set | ☐ | | |
| Sending domain verified | ☐ | | |
| Migrations committed to git | ☐ | | |
| Uptime monitor configured | ☐ | | |
| Sentry test event received | ☐ | | |
| All smoke tests pass | ☐ | | |
