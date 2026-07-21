# Blocker Report
**Generated**: 2026-07-07  
**Severity levels**: P0 = app-breaking, P1 = feature-breaking, P2 = degraded UX, P3 = polish

---

## P0 — CRITICAL BLOCKERS (app broken)

### B-01: Database migrations 0003–0010 status unknown in production
**Impact**: Potentially none of the app-layer features work (org creation, invites, CRM, usage)  
**Root cause**: Migrations 0003–0006 and 0009–0010 are not tracked in git commit history, so their production status is unknown. They may or may not be applied.  
**Verification**: Run in Supabase SQL Editor:
```sql
SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_organization');
SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'accept_org_invite');
SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_usage_totals');
SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'check_crm_duplicate');
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_subscriptions');
```
**Fix**: Apply all 10 migrations in order (see PRODUCTION_GO_LIVE_CHECKLIST.md Phase 1)  
**Effort**: 15 minutes manual

### B-02: `create_organization` RPC missing if migration 0005 not applied
**Impact**: ALL new users cannot create an organization → onboarding page shows "Failed to create workspace" → zero new customers can get past signup  
**Root cause**: `create_organization` PostgreSQL function is defined in `0005_schema_hardening.sql` which is untracked in production  
**Fix**: Apply `0005_schema_hardening.sql` via Supabase SQL Editor  
**Effort**: 2 minutes

### B-03: `billing_subscriptions` table missing (migration 0011 not applied)
**Impact**: Stripe billing completely non-functional; billing page may throw DB errors; quota checks fall back to free-tier limits for all users  
**Root cause**: `0011_billing.sql` is confirmed not applied in production  
**Fix**: Apply `0011_billing.sql` via Supabase SQL Editor **before deploying billing code** (code is already deployed)  
**Effort**: 2 minutes

### B-04: Stripe not configured — 7 missing environment variables
**Impact**: Clicking "Upgrade" shows "Billing is not configured on this instance." — no revenue can be collected  
**Root cause**: Stripe products not created, price IDs unknown, API keys not added to Vercel  
**Missing vars**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`  
**Fix**: See PRODUCTION_GO_LIVE_CHECKLIST.md Phase 2–3  
**Effort**: 30 minutes (create products, copy IDs, add to Vercel)

### B-05: Stripe webhook endpoint not registered
**Impact**: Even if Stripe is configured, subscriptions will never sync back. Users complete checkout but remain on free plan. `process_stripe_event` never called.  
**Root cause**: Webhook endpoint at `/api/stripe/webhook` not registered in Stripe Dashboard  
**Fix**: Stripe Dashboard → Developers → Webhooks → Add Endpoint → URL: `https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook`  
**Effort**: 5 minutes

---

## P1 — FEATURE BLOCKERS (feature broken, app still usable)

### B-06: `get_usage_totals` RPC missing (migration 0007 not applied)
**Impact**: Usage page shows empty state — no usage data visible  
**Root cause**: `0007_get_usage_totals.sql` not applied in production  
**Fix**: Apply via Supabase SQL Editor  
**Effort**: 1 minute

### B-07: Full CRM features missing (migration 0010 not applied)
**Impact**: CRM page may lack pipeline_stage, owner_id, soft-delete, archive, activities, timeline, tags. `check_crm_duplicate` and `get_crm_metrics` RPCs missing. Dashboard shows no CRM metrics.  
**Root cause**: `0010_crm_platform_fixed.sql` not applied in production  
**Fix**: Apply `0010_crm_platform_fixed.sql` via Supabase SQL Editor (use the `_fixed` version)  
**Effort**: 5 minutes

### B-08: RBAC + org switcher schema missing (migrations 0009a + 0009b not applied)
**Impact**: Extended roles (super_admin, manager, operator, editor, guest) not recognized by DB. Org switcher may fail. Settings schema missing.  
**Root cause**: `0009a_enum_roles.sql` and `0009b_enterprise_schema.sql` not confirmed applied  
**Fix**: Apply both via Supabase SQL Editor (run `0009a` before `0009b`)  
**Effort**: 3 minutes

### B-09: Invite emails not delivered (`RESEND_API_KEY` missing)
**Impact**: Team invites are created in DB but emails are never sent. Admins must share invite tokens manually. Blocks team growth for Customer #1.  
**Root cause**: `RESEND_API_KEY` and `FROM_EMAIL` not set in Vercel  
**Fix**: Sign up at resend.com, verify domain, create API key, add to Vercel  
**Effort**: 20 minutes (domain verification takes time)  
**Note**: Code gracefully skips email and logs a warning — DB invite record is still created ✅

### B-10: Sentry error tracking not configured
**Impact**: Production errors are invisible — no alerting, no stack traces, no user impact data  
**Root cause**: `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` not set in Vercel  
**Fix**: Create Sentry project (platform: Next.js) → copy DSN → add to Vercel  
**Effort**: 10 minutes

### B-11: Prometheus metrics endpoint is open (no `METRICS_TOKEN`)
**Impact**: Anyone can scrape `GET /api/metrics` and see memory usage, request counts, health status. Low severity for early-stage but bad practice.  
**Root cause**: `METRICS_TOKEN` not set — route is public without it  
**Fix**: `openssl rand -base64 32` → add as `METRICS_TOKEN` in Vercel  
**Effort**: 2 minutes

---

## P2 — DEGRADED UX (works but confusing)

### B-12: No "check your email" message after signup (if Supabase email confirmation enabled)
**Impact**: If email confirmation is on, users sign up and are redirected to dashboard but have no session → immediately redirected to login → confusing loop  
**Root cause**: `signup()` action always redirects to `/dashboard` without checking if email confirmation is pending  
**Fix**: Either disable email confirmation in Supabase (recommended for B2B), or check the session state after signUp() and show "Check your email" message  
**Effort**: 5 minutes (disable in Supabase) or 2 hours (add to signup UI)  
**Recommendation**: Disable email confirmation for B2B SaaS

### B-13: Stripe checkout success not acknowledged
**Impact**: After completing Stripe checkout, user is redirected to `/dashboard/billing?success=1` but sees no success message. The query param is silently ignored.  
**Root cause**: Billing page doesn't read `success=1` or `canceled=1` query params  
**Fix**: Add a `useSearchParams()` check in an "upgrade-success-toast.tsx" client component that shows a toast on `?success=1`  
**Effort**: 1 hour

### B-14: Demo request email goes to hardcoded fallback `hello@eunoiaos.com` if `DEMO_REQUEST_EMAIL` not set
**Impact**: Demo requests may never be received if `DEMO_REQUEST_EMAIL` is not configured and `eunoiaos.com` email is not monitored  
**Root cause**: `DEMO_REQUEST_EMAIL` is not in `.env.example` (now fixed) and not set in Vercel  
**Fix**: Add `DEMO_REQUEST_EMAIL=hello@yourdomain.com` to Vercel  
**Effort**: 2 minutes

### B-15: `NEXT_PUBLIC_APP_URL` not set in `.env.local` (local dev only)
**Impact**: In local dev, Stripe checkout success/cancel URLs default to `http://localhost:3000`, password reset emails point to `http://localhost:3000`. This is actually correct for local dev but wasn't documented.  
**Root cause**: `.env.local` doesn't include `NEXT_PUBLIC_APP_URL`  
**Fix**: Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`  
**Effort**: 1 minute (local only, not a production issue)

---

## P3 — POLISH (non-blocking)

### B-16: Missing PWA icons
**Impact**: PWA install broken; `manifest.webmanifest` references `/icon.png` and `/icon-512.png` which don't exist → 404 on manifest icons  
**Root cause**: Icons never created  
**Fix**: Create 192×192 and 512×512 PNG icons at `public/icon.png` and `public/icon-512.png`  
**Effort**: 1 hour (design + export)

### B-17: Default Next.js favicon
**Impact**: Browser tab shows Next.js triangle logo instead of Eunoia branding  
**Root cause**: `src/app/favicon.ico` is the Next.js default  
**Fix**: Replace with branded favicon  
**Effort**: 30 minutes

### B-18: Duplicate migration files in repo
**Impact**: Confusing — which file to apply? `0009_enterprise_multitenant.sql` vs `0009_enterprise_multitenant_fixed.sql` vs `0009a` + `0009b`  
**Root cause**: Multiple attempts at the 0009 migration due to enum transaction issues  
**Fix**: Delete the unused files after confirming which are applied. Keep: `0009a_enum_roles.sql`, `0009b_enterprise_schema.sql`, `0010_crm_platform_fixed.sql`. Delete: `0009_enterprise_multitenant.sql`, `0009_enterprise_multitenant_fixed.sql`, `0010_crm_platform.sql`  
**Effort**: 5 minutes (after confirming what's applied)

---

## Code Fixes Applied This Session

| Fix | File | Description |
|-----|------|-------------|
| ✅ `searchParams` async | `crm/page.tsx` | Typed as `Promise<{...}>` and awaited (Next.js 15+) |
| ✅ `searchParams` async | `invite/page.tsx` | Typed as `Promise<{...}>` and awaited (Next.js 15+) |
| ✅ `.env.example` complete | `.env.example` | Added Stripe vars, DEMO_REQUEST_EMAIL, comments |

---

## Blockers by Priority Matrix

```
P0 (CRITICAL) — Fix NOW before Customer #1:
  B-01  Apply all migrations (unknown status)
  B-02  create_organization RPC (onboarding crash)
  B-03  billing_subscriptions table (billing broken)
  B-04  Stripe env vars (no revenue)
  B-05  Stripe webhook (subscriptions don't sync)

P1 (HIGH) — Fix before Customer #1 demo:
  B-06  get_usage_totals (usage page empty)
  B-07  CRM advanced schema (CRM missing features)
  B-08  RBAC schema (roles broken)
  B-09  Resend (invite emails silent)
  B-10  Sentry (blind to production errors)
  B-11  Metrics token (security)

P2 (MEDIUM) — Fix before public launch:
  B-12  Email confirmation UX
  B-13  Stripe success acknowledgment
  B-14  DEMO_REQUEST_EMAIL
  B-15  Local .env.local

P3 (LOW) — Polish sprint:
  B-16  PWA icons
  B-17  Favicon
  B-18  Duplicate migration files
```

**Total estimated time to fix P0+P1**: ~2 hours (mostly Supabase SQL Editor + Vercel Dashboard clicks)  
**Code changes needed**: None for P0–P1 (all configuration/deployment)
