# Launch Automation Checklist

**Purpose**: Step-by-step automated launch procedure to reduce manual work to <30 minutes  
**Estimated Time**: 20-30 minutes (with automation scripts)  
**Prerequisites**: All scripts in `scripts/launch/` directory

---

## Pre-Launch Checks (5 minutes)

### 1. Verify Git Status
```bash
cd /Users/ahmed/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform
git status
```
- [ ] Working tree clean
- [ ] On `main` branch
- [ ] No uncommitted changes

### 2. Verify GitHub Sync
```bash
git log origin/main..main
```
- [ ] No commits ahead of origin (or intentional commits)
- [ ] GitHub synchronized

### 3. Run Code Quality Checks
```bash
npm run lint
npm test
npx tsc --noEmit
```
- [ ] Lint passes (0 errors)
- [ ] Tests pass (309/309)
- [ ] TypeScript passes (0 errors)

---

## Phase 1: Database Migrations (5 minutes)

### 4. Verify Migration Status
Open Supabase Dashboard → SQL Editor → New Query  
Paste and run `scripts/launch/verify_migrations.sql`

- [ ] Review results for each migration
- [ ] Note which migrations are missing

### 5. Apply Missing Migrations
For each missing migration (in order):
- [ ] Open the migration file in `supabase/migrations/`
- [ ] Paste into Supabase SQL Editor
- [ ] Run and verify success

**Critical order**: 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → 0009a → 0009b → 0010 → 0011

**Alternative**: Use `scripts/launch/apply_missing_migrations.sql` (paste each migration file into the appropriate section)

- [ ] All 10 migrations applied successfully

---

## Phase 2: Vercel Environment Variables (5 minutes)

### 6. Run Environment Verification
```bash
chmod +x scripts/launch/verify_vercel_env.sh
./scripts/launch/verify_vercel_env.sh
```

- [ ] All required core variables set
- [ ] All Stripe variables set
- [ ] All email variables set (or intentionally skipped)
- [ ] All Sentry variables set (or intentionally skipped)
- [ ] METRICS_TOKEN set
- [ ] No forbidden variables present

### 7. Add Missing Variables (if any)
For each missing variable from the verification:
- [ ] Go to Vercel Dashboard → Project → Settings → Environment Variables
- [ ] Add the missing variable
- [ ] Select "Production" environment
- [ ] Save
- [ ] Redeploy (Vercel will prompt)

---

## Phase 3: Stripe Configuration (10 minutes)

### 8. Follow Stripe Configuration Checklist
Open `scripts/launch/stripe_configuration_checklist.md`

- [ ] Step 1: Create Products and Prices (Starter + Pro, monthly + annual)
- [ ] Step 2: Configure Webhook Endpoint
- [ ] Step 3: Enable Customer Portal
- [ ] Step 4: Copy API Keys
- [ ] Step 5: Verify Environment Variables in Vercel
- [ ] Step 6: Test Webhook Delivery
- [ ] Step 7: Test Checkout Flow (optional but recommended)

### 9. Validate Webhook
```bash
chmod +x scripts/launch/validate_webhook.sh
./scripts/launch/validate_webhook.sh
```

- [ ] Webhook endpoint accessible
- [ ] STRIPE_WEBHOOK_SECRET set
- [ ] STRIPE_SECRET_KEY set
- [ ] Webhook events registered in Stripe
- [ ] Test webhook sent successfully

---

## Phase 4: Supabase Auth Configuration (2 minutes)

### 10. Configure Supabase Auth
Open Supabase Dashboard → Authentication → URL Configuration

- [ ] Site URL set to `https://eunoia-ai-os-platform.vercel.app`
- [ ] Redirect URLs added:
  - [ ] `https://eunoia-ai-os-platform.vercel.app/auth/callback`
  - [ ] `http://localhost:3000/auth/callback`
- [ ] Email confirmation disabled (recommended for B2B)

---

## Phase 5: Resend Email Configuration (3 minutes)

### 11. Configure Resend (if using email)
- [ ] Verify domain in Resend Dashboard
- [ ] Add DNS records (SPF, DKIM, DMARC)
- [ ] Create API key with "Sending access"
- [ ] Add `RESEND_API_KEY` to Vercel
- [ ] Set `FROM_EMAIL` to verified domain
- [ ] Set `DEMO_REQUEST_EMAIL` to target email

---

## Phase 6: Sentry Configuration (2 minutes)

### 12. Configure Sentry (if using error tracking)
- [ ] Create Sentry project (Next.js platform)
- [ ] Copy DSN
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel
- [ ] Add `SENTRY_DSN` to Vercel
- [ ] Add GitHub Actions secrets:
  - [ ] `SENTRY_AUTH_TOKEN`
  - [ ] `SENTRY_ORG`
  - [ ] `SENTRY_PROJECT`

---

## Phase 7: Production Smoke Tests (5 minutes)

### 13. Run Automated Smoke Tests
```bash
chmod +x scripts/launch/smoke_test.sh
./scripts/launch/smoke_test.sh
```

- [ ] All automated tests pass
- [ ] Health endpoints responding
- [ ] Public pages loading
- [ ] Protected pages redirecting correctly
- [ ] Security headers present

### 14. Manual Smoke Tests
Open `https://eunoia-ai-os-platform.vercel.app` in browser

- [ ] Landing page loads
- [ ] Sign up flow works (create account → onboarding → dashboard)
- [ ] Add Knowledge Base document
- [ ] Ask AI assistant → streaming response with sources
- [ ] Billing page shows plan card
- [ ] Upgrade button redirects to Stripe (if configured)
- [ ] Invite team member (if email configured)
- [ ] CRM: add contact
- [ ] Usage page shows activity
- [ ] Audit Logs show actions

---

## Phase 8: Final Verification (2 minutes)

### 15. Verify Deployment
- [ ] Vercel deployment successful
- [ ] No errors in build logs
- [ ] No runtime errors in Vercel logs

### 16. Verify Database
- [ ] Run `verify_migrations.sql` again
- [ ] All migrations show as applied

### 17. Verify Environment
- [ ] Run `verify_vercel_env.sh` again
- [ ] All variables show as set

---

## Launch Decision

### Go-Live Criteria
- [ ] All 10 database migrations applied
- [ ] All core environment variables set
- [ ] Stripe configured (if billing enabled)
- [ ] Email configured (if invites enabled)
- [ ] All smoke tests pass
- [ ] Manual tests pass

### Rollback Criteria
If any of the following occur:
- [ ] Critical errors in production logs
- [ ] Database migration failures
- [ ] Payment processing errors
- [ ] Authentication failures

**Proceed to rollback instructions in `ROLLBACK.md`**

---

## Post-Launch Monitoring (First Hour)

### 18. Monitor Vercel Logs
- [ ] Check for runtime errors
- [ ] Check for timeout errors
- [ ] Check for rate limit errors

### 19. Monitor Supabase Logs
- [ ] Check for RLS policy violations
- [ ] Check for RPC function errors
- [ ] Check for connection pool issues

### 20. Monitor Stripe Dashboard
- [ ] Check webhook delivery status
- [ ] Check for failed payments
- [ ] Check for subscription sync errors

---

## Summary

**Total Estimated Time**: 20-30 minutes  
**Automation Scripts Used**:
- `verify_migrations.sql` - Database migration status
- `apply_missing_migrations.sql` - Safe migration application
- `verify_vercel_env.sh` - Environment variable verification
- `stripe_configuration_checklist.md` - Stripe setup guide
- `validate_webhook.sh` - Webhook validation
- `smoke_test.sh` - Automated smoke tests

**Manual Steps Required**:
- Applying migrations (copy-paste into Supabase SQL Editor)
- Adding environment variables in Vercel Dashboard
- Stripe product creation (manual in Stripe Dashboard)
- Resend domain verification (manual in Resend Dashboard)
- Manual smoke tests (browser-based)

**Goal**: Reduce manual launch work to <30 minutes ✅
