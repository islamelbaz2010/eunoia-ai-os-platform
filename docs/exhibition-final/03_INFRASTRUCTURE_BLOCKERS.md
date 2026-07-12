# INFRASTRUCTURE BLOCKERS
**Priority-ordered list of non-code actions that must be completed before Tuesday**

---

## P0 — MUST FIX BEFORE EXHIBITION OPENS

These are not code problems. They are Vercel and Supabase configuration actions. Each takes under 10 minutes.

---

### BLOCKER 1: RESEND_API_KEY — Lead Capture Is Broken

**Impact**: The "Book a Demo" form on the landing page returns an error when submitted. This is the primary lead capture mechanism. Without it, you lose every lead at the booth.

**Root cause**: `src/lib/email.ts` — `sendDemoRequestEmail()` calls `getResendClient()`. When `RESEND_API_KEY` is missing, the client is null. Unlike `sendInviteEmail()` which silently skips, `sendDemoRequestEmail()` throws — and the catch block returns `{ error: "Failed to send your request..." }`.

**Fix**:
1. Go to resend.com → Create an API key
2. Vercel Dashboard → Project → Settings → Environment Variables
3. Add: `RESEND_API_KEY=re_xxxx` (all environments)
4. Add: `FROM_EMAIL=Eunoia AI OS <noreply@yourdomain.com>` (optional; defaults exist)
5. Add: `DEMO_REQUEST_EMAIL=your-email@domain.com` (where demo requests go)
6. Redeploy (Vercel auto-redeploys on env var change if you trigger a new deploy)

**Test**: Submit the demo request form on the landing page. You should receive an email.

**Time**: 5 minutes

---

### BLOCKER 2: Stripe Environment Variables — No Revenue Path

**Impact**: The billing page shows "This plan is not yet available" for all upgrade buttons. Visitors who want to sign up and pay cannot do so.

**Root cause**: `src/lib/stripe/plans.ts` — `monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? null`. When null, `src/app/dashboard/billing/upgrade-button.tsx` renders a disabled button.

**Fix**:
1. Go to dashboard.stripe.com → Create products: Starter ($99/mo), Pro ($299/mo)
2. Copy each Price ID (starts with `price_`)
3. Vercel Dashboard → Environment Variables → Add:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for demo)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx (from Stripe webhook dashboard)
   STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
   STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
   STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
   ```
4. Redeploy

**IMPORTANT**: For the exhibition, use `sk_test_*` keys with Stripe test mode. Real customers won't be charged. But you can demonstrate the checkout flow working with test card `4242 4242 4242 4242`.

**Time**: 20 minutes

---

### BLOCKER 3: Migration 0011 — Billing Tables Missing

**Impact**: If Stripe is activated (Blocker 2 fixed), the webhook handler will fail when trying to write to `billing_subscriptions` table. The table doesn't exist until migration 0011 is applied.

**Fix**:
1. Open Supabase Dashboard → SQL Editor
2. Paste and run: `supabase/migrations/0011_billing.sql`
3. Run it BEFORE deploying with Stripe vars active

**Time**: 5 minutes

---

## P1 — HIGH IMPACT (Fix Before Exhibition If Possible)

---

### BLOCKER 4: METRICS_TOKEN — Prometheus Endpoint Open

**Impact**: Anyone who knows the URL `/api/metrics` can read your infrastructure metrics. Not a demo-blocking issue, but a security gap that will concern a technical investor.

**Fix**:
```bash
openssl rand -base64 32  # generates token
```
Add `METRICS_TOKEN=<generated>` in Vercel environment variables. The route already checks for `Authorization: Bearer <token>`.

**Time**: 3 minutes

---

### BLOCKER 5: SENTRY DSN — No Error Tracking

**Impact**: If the production app crashes during the demo, you'll have no error context. You'll see a generic error page with no details. Sentry is installed and instrumented — it just needs the DSN.

**Fix**:
1. sentry.io → Project Settings → Client Keys → copy DSN
2. Vercel Dashboard → Add:
   - `NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx`
   - `SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx`
3. Redeploy

**Time**: 5 minutes

---

### BLOCKER 6: Apply Migrations 0007 + 0008 to Production

**Impact**: Usage page SQL RPC (`get_usage_totals`) and health check DB function (`healthcheck()`) fail in production. The usage page has a fallback query, but it's less accurate.

**Fix**:
1. Open Supabase → SQL Editor
2. Run `supabase/migrations/0007_get_usage_totals.sql`
3. Run `supabase/migrations/0008_health_check.sql`
4. Run `supabase/migrations/0009a_enum_roles.sql` + `0009b_enterprise_schema.sql` (in that order)
5. Run `supabase/migrations/0010_crm_platform_fixed.sql`

**IMPORTANT**: The files `0009_enterprise_multitenant.sql` and `0009_enterprise_multitenant_fixed.sql` and `0010_crm_platform.sql` are superseded. Use only `0009a`, `0009b`, and `0010_crm_platform_fixed.sql`.

**Time**: 20 minutes (including verification)

---

## P2 — NICE TO HAVE

### BLOCKER 7: SENTRY_AUTH_TOKEN in GitHub Actions (for source maps)

Add to GitHub → Settings → Secrets → Actions:
- `SENTRY_AUTH_TOKEN` (from sentry.io → Account → API → Auth Tokens → create token with `project:releases` scope)
- `SENTRY_ORG` (your org slug)
- `SENTRY_PROJECT` (your project slug)

Without this, Sentry captures errors but shows minified stack traces.

**Time**: 5 minutes

---

## Exhibition-Specific Checklist (Day-Of)

```
□ Seed demo account with 5+ KB documents
□ Seed demo account with 6+ CRM contacts at different stages
□ Test: ask 3 questions and verify streaming responses
□ Test: demo request form submits and email received
□ Test: billing page shows upgrade buttons (if Stripe activated)
□ Open dashboard on exhibition laptop — verify no auth issues
□ Charge laptop to 100%
□ Have mobile hotspot ready (venue WiFi is unreliable)
□ Print QR code to landing page for visitors to self-navigate
□ Have a business card or printed 1-pager ready
□ Do NOT refresh the page mid-demo (chat history will reset)
□ Do NOT demo from a phone (no mobile navigation)
```
