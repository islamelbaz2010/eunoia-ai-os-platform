# Production Go-Live Checklist
**Generated**: 2026-07-07  
**Current deploy**: https://eunoia-ai-os-platform.vercel.app  
**Status**: 🔴 NOT READY — 8 critical blockers outstanding

---

## Legend
- 🔴 BLOCKER — app broken without this
- 🟡 IMPORTANT — feature broken, app still partially works
- 🟢 OPTIONAL — polish / non-essential

---

## PHASE 1 — Database (Supabase SQL Editor)

> Apply in this exact order. Each migration is idempotent on re-run.

| # | File | Status | Impact if missing |
|---|------|--------|-------------------|
| 1 | `0003_grants.sql` | ❓ unknown | RLS grants may be incomplete |
| 2 | `0004_indexes_policies.sql` | ❓ unknown | Missing performance indexes |
| 3 | `0005_schema_hardening.sql` | ❓ unknown | 🔴 `create_organization` RPC missing → onboarding crashes |
| 4 | `0006_hardening_v2.sql` | ❓ unknown | 🔴 `accept_org_invite` RPC missing → invite accept broken |
| 5 | `0007_get_usage_totals.sql` | ❌ not applied | 🔴 Usage page errors (RPC not found) |
| 6 | `0008_health_check.sql` | ❌ not applied | 🟡 Health check DB provider fails |
| 7 | `0009a_enum_roles.sql` | ❓ unknown | 🔴 Extended roles (super_admin, manager, etc.) not recognized |
| 8 | `0009b_enterprise_schema.sql` | ❓ unknown | 🔴 Org switcher, RBAC, settings schema missing |
| 9 | `0010_crm_platform_fixed.sql` | ❓ unknown | 🔴 Full CRM (soft delete, pipeline, activities, AI fields) missing |
| 10 | `0011_billing.sql` | ❌ not applied | 🔴 Stripe billing broken — billing_subscriptions table missing |

**Note on 0009**: Use `0009a_enum_roles.sql` + `0009b_enterprise_schema.sql` (NOT the monolithic `0009_enterprise_multitenant.sql`). The `_fixed` versions resolve enum transaction issues.  
**Note on 0010**: Use `0010_crm_platform_fixed.sql` (NOT `0010_crm_platform.sql`).

### Action
Open Supabase Dashboard → SQL Editor → New Query → paste and run each file in order.

---

## PHASE 2 — Vercel Environment Variables

### Required (app broken without these)

| Variable | Where to get it | Status |
|----------|----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ SET |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ SET |
| `OPENAI_API_KEY` | platform.openai.com → API Keys | ✅ SET |
| `NEXT_PUBLIC_APP_URL` | Must be `https://eunoia-ai-os-platform.vercel.app` | ✅ SET |

### Required for Stripe (billing broken without these)

| Variable | Where to get it | Status |
|----------|----------------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key | ❌ MISSING |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → (your endpoint) → Signing secret | ❌ MISSING |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys → Publishable key | ❌ MISSING |
| `STRIPE_STARTER_MONTHLY_PRICE_ID` | Stripe Dashboard → Products → Starter → Monthly price ID | ❌ MISSING |
| `STRIPE_STARTER_ANNUAL_PRICE_ID` | Stripe Dashboard → Products → Starter → Annual price ID | ❌ MISSING |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe Dashboard → Products → Pro → Monthly price ID | ❌ MISSING |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe Dashboard → Products → Pro → Annual price ID | ❌ MISSING |

### Required for email (invite emails broken without these)

| Variable | Where to get it | Status |
|----------|----------------|--------|
| `RESEND_API_KEY` | resend.com → API Keys | ❌ MISSING |
| `FROM_EMAIL` | e.g. `Eunoia AI OS <noreply@yourdomain.com>` | ❌ MISSING |
| `DEMO_REQUEST_EMAIL` | e.g. `hello@yourdomain.com` | ❌ MISSING |

### Required for error tracking

| Variable | Where to get it | Status |
|----------|----------------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | sentry.io → Project Settings → Client Keys | ❌ MISSING |
| `SENTRY_DSN` | Same as above | ❌ MISSING |

### Required for security

| Variable | Value | Status |
|----------|-------|--------|
| `METRICS_TOKEN` | `openssl rand -base64 32` | ❌ MISSING |

### CI only (GitHub Actions Secrets — not Vercel)

| Secret | Purpose |
|--------|---------|
| `SENTRY_AUTH_TOKEN` | Source map upload at build |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project slug |

### NEVER add to Vercel

| Variable | Reason |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS; scripts only |

---

## PHASE 3 — Stripe Account Setup

> Must be done before adding Stripe env vars.

- [ ] Create **Starter** product in Stripe
  - Monthly price: $99/month (recurring, monthly interval)
  - Annual price: $990/year (recurring, annual interval)
  - Copy both Price IDs → `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`

- [ ] Create **Pro** product in Stripe
  - Monthly price: $299/month
  - Annual price: $2,990/year
  - Copy both Price IDs → `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`

- [ ] Register webhook endpoint
  - URL: `https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
    - `customer.subscription.trial_will_end`
  - Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

- [ ] Enable Customer Portal in Stripe
  - Stripe Dashboard → Settings → Customer Portal
  - Enable: Update subscription, Cancel subscription, Update payment method, View invoice history

---

## PHASE 4 — Resend Email Setup

- [ ] Verify your domain in Resend (resend.com → Domains → Add Domain)
  - Add DNS records as instructed: SPF, DKIM, DMARC
  - Without domain verification, Resend will only send to your own email (test mode)
- [ ] Create Resend API key with `Sending access`
- [ ] Set `FROM_EMAIL` to use your verified domain (e.g. `noreply@yourdomain.com`)
- [ ] Set `DEMO_REQUEST_EMAIL` to where you want demo requests sent

---

## PHASE 5 — Supabase Auth Configuration

- [ ] Confirm `Site URL` is set to `https://eunoia-ai-os-platform.vercel.app`
  - Supabase Dashboard → Authentication → URL Configuration → Site URL
- [ ] Add redirect URLs:
  - `https://eunoia-ai-os-platform.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)
- [ ] Decide on email confirmation policy:
  - If **enabled**: signup flow redirects to /dashboard but shows no "check email" message → UX issue. Consider disabling for B2B SaaS.
  - If **disabled**: signup creates session immediately → current code is correct.
  - Recommendation: **Disable** for B2B (owners invite members; no need for public signups to confirm).

---

## PHASE 6 — Sentry Setup

- [ ] Create Sentry project at sentry.io (platform: Next.js)
- [ ] Copy DSN → `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` in Vercel
- [ ] Add GitHub Actions secrets: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- [ ] Verify: trigger an error in production → check Sentry receives it

---

## PHASE 7 — Production Smoke Test

Run after all phases above are complete.

- [ ] `GET https://eunoia-ai-os-platform.vercel.app/api/live` → `{"status":"ok"}`
- [ ] `GET https://eunoia-ai-os-platform.vercel.app/api/health` → `{"status":"ready"}`
- [ ] Landing page loads at `/`
- [ ] Sign up flow: create account → onboarding → dashboard
- [ ] Add a Knowledge Base document
- [ ] Ask the AI assistant → streaming response with sources
- [ ] Go to Billing → plan card shown, Upgrade button visible
- [ ] Click Upgrade → redirects to Stripe Checkout ✅
- [ ] Complete test purchase → webhook fires → subscription active
- [ ] Customer Portal accessible via "Manage Billing"
- [ ] Invite a team member → email received ✅
- [ ] Accept invite → joins organization ✅
- [ ] CRM: add a contact ✅
- [ ] Usage page shows activity ✅
- [ ] Audit Logs show all actions ✅

---

## Summary Scorecard

| Category | Ready? | Blockers |
|----------|--------|---------|
| Database migrations | ❌ | 0011 confirmed missing; 0005–0010 status unknown |
| Core app (auth, dashboard, KB, AI) | 🟡 | Depends on migrations |
| Stripe billing | ❌ | 7 env vars + 3 Stripe setup steps |
| Email invites | ❌ | 2 env vars + domain verification |
| Error tracking | ❌ | 2 env vars |
| Security (metrics auth) | ❌ | 1 env var |
| Code quality | ✅ | 309/309 tests, 0 TS errors, lint clean |
| **Overall** | **🔴** | **~17 action items before go-live** |
