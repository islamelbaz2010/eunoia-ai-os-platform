# Launch Automation Scripts

**Purpose**: Reduce manual production launch work to <30 minutes  
**Created**: 2026-07-07  
**Status**: Ready for production launch

---

## Overview

This directory contains automated scripts and checklists to streamline the production launch process. All scripts are designed to be idempotent and safe to run multiple times.

---

## Quick Start

1. **Make scripts executable**
   ```bash
   chmod +x scripts/launch/*.sh
   ```

2. **Run the launch automation checklist**
   ```bash
   # Open the checklist and follow step-by-step
   open scripts/launch/launch_automation_checklist.md
   ```

3. **Estimated total time**: 20-30 minutes

---

## Script Inventory

| Script | Type | Purpose | Time |
|--------|------|---------|------|
| `verify_migrations.sql` | SQL | Check which Supabase migrations are applied | 1 min |
| `apply_missing_migrations.sql` | SQL | Apply only missing migrations safely | 5 min |
| `verify_vercel_env.sh` | Bash | Verify all Vercel environment variables | 1 min |
| `stripe_configuration_checklist.md` | Guide | Step-by-step Stripe setup | 10 min |
| `validate_webhook.sh` | Bash | Validate Stripe webhook endpoint | 2 min |
| `smoke_test.sh` | Bash | Automated production smoke tests | 2 min |
| `launch_automation_checklist.md` | Guide | Complete launch procedure | 20-30 min |
| `ROLLBACK.md` | Guide | Emergency rollback procedures | Reference |

---

## Usage Guide

### Phase 1: Database (5 minutes)

**Step 1**: Verify migration status
```bash
# Open Supabase Dashboard → SQL Editor
# Paste and run: scripts/launch/verify_migrations.sql
```

**Step 2**: Apply missing migrations
```bash
# For each missing migration, open the file in supabase/migrations/
# Paste into Supabase SQL Editor and run
# Or use: scripts/launch/apply_missing_migrations.sql
```

### Phase 2: Environment Variables (5 minutes)

**Step 3**: Verify Vercel environment
```bash
./scripts/launch/verify_vercel_env.sh
```

**Step 4**: Add missing variables (if any)
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add missing variables from the script output

### Phase 3: Stripe Configuration (10 minutes)

**Step 5**: Follow Stripe checklist
```bash
open scripts/launch/stripe_configuration_checklist.md
```

**Step 6**: Validate webhook
```bash
./scripts/launch/validate_webhook.sh
```

### Phase 4: Smoke Tests (5 minutes)

**Step 7**: Run automated tests
```bash
./scripts/launch/smoke_test.sh
```

**Step 8**: Manual tests (browser-based)
- Open production URL
- Test sign up, knowledge base, AI assistant, billing

---

## Detailed Documentation

### Database Migration Scripts

**verify_migrations.sql**
- Checks all 10 migrations (0003-0011)
- Returns boolean result for each migration
- Identifies which migrations are missing
- Run in Supabase SQL Editor

**apply_missing_migrations.sql**
- Wraps each migration in a DO block
- Checks if migration is already applied
- Only applies if missing (idempotent)
- Safe to run multiple times

### Environment Verification

**verify_vercel_env.sh**
- Checks all 18 required environment variables
- Categorizes by type (core, Stripe, email, Sentry, security)
- Flags forbidden variables (SUPABASE_SERVICE_ROLE_KEY)
- Requires vercel CLI installed
- Returns exit code 0 if all OK, 1 if issues found

### Stripe Configuration

**stripe_configuration_checklist.md**
- Complete step-by-step Stripe setup
- Product creation (Starter + Pro, monthly + annual)
- Webhook endpoint registration
- Customer Portal configuration
- API key copying
- Test checkout flow

**validate_webhook.sh**
- Checks webhook endpoint accessibility
- Validates STRIPE_WEBHOOK_SECRET
- Validates STRIPE_SECRET_KEY
- Checks webhook events in Stripe (requires stripe CLI)
- Sends test webhook payload

### Smoke Testing

**smoke_test.sh**
- Tests health endpoints (/api/live, /api/health)
- Tests public pages (landing, signup, login)
- Tests protected page redirects
- Tests API endpoint authentication
- Tests security headers (HSTS, X-Frame-Options)
- Checks environment variables (requires vercel CLI)
- Returns summary of passed/failed tests

### Launch Procedure

**launch_automation_checklist.md**
- Complete 20-step launch procedure
- Pre-launch checks (git status, code quality)
- Database migration steps
- Environment variable steps
- Stripe configuration steps
- Supabase auth configuration
- Resend email configuration
- Sentry configuration
- Smoke tests (automated + manual)
- Final verification
- Post-launch monitoring

### Rollback Procedures

**ROLLBACK.md**
- 5 rollback types with step-by-step instructions
- Vercel deployment rollback (2-5 min)
- Database migration rollback (5-10 min)
- Environment variable rollback (2-3 min)
- Stripe configuration rollback (5-10 min)
- Full system rollback (15-30 min)
- Post-rollback verification
- Prevention checklist

---

## Prerequisites

### Required Tools
- **vercel CLI**: `npm i -g vercel`
- **stripe CLI**: `npm install -g stripe` (optional, for webhook validation)
- **curl**: Pre-installed on most systems
- **bash**: Pre-installed on macOS/Linux

### Required Accounts
- Vercel account (project already connected)
- Supabase account (project already created)
- Stripe account (for billing)
- Resend account (for email, optional)
- Sentry account (for error tracking, optional)

### Required Access
- Vercel project settings (environment variables)
- Supabase SQL Editor access
- Stripe Dashboard access
- Git repository access

---

## Troubleshooting

### Script Permission Errors
```bash
chmod +x scripts/launch/*.sh
```

### Vercel CLI Not Authenticated
```bash
vercel login
```

### Stripe CLI Not Installed
```bash
npm install -g stripe
stripe login
```

### Migration SQL Errors
- Check Supabase SQL Editor for error messages
- Verify migration order (0003 → 0004 → ... → 0011)
- Check for conflicting objects (tables, functions)

### Environment Variable Errors
- Verify variable names match exactly (case-sensitive)
- Check Vercel environment (Production vs Preview vs Development)
- Redeploy after adding variables

### Webhook Validation Errors
- Verify webhook URL is exactly `https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook`
- Check STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
- Ensure webhook is enabled in Stripe (not disabled)

### Smoke Test Failures
- Check Vercel deployment is successful
- Verify environment variables are set
- Check Vercel logs for runtime errors
- Verify database migrations are applied

---

## Success Criteria

Launch is successful when:
- [ ] All 10 database migrations applied
- [ ] All core environment variables set
- [ ] Stripe configured (if billing enabled)
- [ ] Email configured (if invites enabled)
- [ ] All smoke tests pass
- [ ] Manual tests pass
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

---

## Support

For issues with:
- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **Stripe**: https://stripe.com/contact

---

## Summary

**Total Automation Scripts**: 8  
**Estimated Launch Time**: 20-30 minutes  
**Manual Work Reduction**: ~70% (from ~2 hours to ~30 minutes)

**Key Benefits**:
- Automated migration verification
- Automated environment variable checking
- Automated smoke testing
- Step-by-step guides for complex setups
- Emergency rollback procedures
- Idempotent scripts (safe to re-run)

**Next Steps**:
1. Review `launch_automation_checklist.md`
2. Make scripts executable
3. Follow the checklist step-by-step
4. Launch with confidence
