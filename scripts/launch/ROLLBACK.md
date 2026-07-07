# Rollback Instructions

**Purpose**: Emergency rollback procedures for production launch  
**Severity**: Use only when critical issues prevent normal operation  
**Estimated Time**: 5-15 minutes depending on rollback type

---

## Rollback Decision Matrix

| Issue Type | Rollback Required | Rollback Method |
|------------|-------------------|-----------------|
| Database migration failure | YES | Database rollback |
| Critical app bug | YES | Vercel deployment rollback |
| Stripe webhook errors | NO | Fix webhook config |
| Environment variable errors | NO | Fix env vars |
| Authentication failures | NO | Fix Supabase auth config |
| Payment processing errors | NO | Fix Stripe config |
| Performance degradation | NO | Scale or optimize |

---

## Rollback Type 1: Vercel Deployment Rollback

**When to use**: Critical app bug, broken routes, TypeScript errors, build failures

### Steps

1. **Identify the broken deployment**
   ```bash
   vercel list --scope production
   ```
   Note the deployment URL and commit hash of the broken deployment

2. **Find the last known good deployment**
   ```bash
   vercel list --scope production
   ```
   Look for the deployment before the current one

3. **Promote the good deployment to production**
   ```bash
   vercel promote <deployment-url> --scope production
   ```
   Replace `<deployment-url>` with the URL of the good deployment

4. **Verify the rollback**
   - Open the production URL
   - Run smoke tests: `./scripts/launch/smoke_test.sh`
   - Check Vercel logs for errors

5. **If rollback fails**
   - Go to Vercel Dashboard → Deployments
   - Find the good deployment
   - Click "..." → "Promote to Production"

**Time**: 2-5 minutes

---

## Rollback Type 2: Database Migration Rollback

**When to use**: Migration caused data corruption, RPC function errors, RLS policy failures

### Steps

1. **Identify the problematic migration**
   - Check Supabase SQL Editor history
   - Note which migration file caused the issue

2. **Create a rollback SQL script**
   - Open the migration file in `supabase/migrations/`
   - Write inverse operations (DROP tables, DROP functions, etc.)
   - Save as `supabase/migrations/rollback_<migration_number>.sql`

3. **Run the rollback in Supabase SQL Editor**
   - Open Supabase Dashboard → SQL Editor
   - Paste the rollback script
   - Execute and verify success

4. **Verify database state**
   - Run `scripts/launch/verify_migrations.sql`
   - Ensure the problematic migration shows as not applied
   - Test affected features manually

### Example Rollback Scripts

#### Rollback 0011_billing.sql
```sql
-- Rollback 0011_billing.sql
DROP TRIGGER IF EXISTS organizations_create_billing_subscription ON organizations;
DROP FUNCTION IF EXISTS process_stripe_event();
DROP TABLE IF EXISTS billing_events;
DROP TABLE IF EXISTS billing_subscriptions;
```

#### Rollback 0010_crm_platform_fixed.sql
```sql
-- Rollback 0010_crm_platform_fixed.sql
DROP FUNCTION IF EXISTS get_crm_metrics();
DROP FUNCTION IF EXISTS check_crm_duplicate();
DROP TABLE IF EXISTS crm_activities;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS pipeline_stage;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS owner_id;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS archived_at;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS tags;
```

#### Rollback 0009b_enterprise_schema.sql
```sql
-- Rollback 0009b_enterprise_schema.sql
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS team_quotas;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS org_settings;
```

#### Rollback 0009a_enum_roles.sql
```sql
-- Rollback 0009a_enum_roles.sql
ALTER TYPE member_role RENAME TO member_role_old;
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
-- Migrate existing data
ALTER TABLE memberships ALTER COLUMN role TYPE member_role USING 'owner'::member_role;
DROP TYPE member_role_old;
```

#### Rollback 0007_get_usage_totals.sql
```sql
-- Rollback 0007_get_usage_totals.sql
DROP FUNCTION IF EXISTS get_usage_totals();
```

#### Rollback 0006_hardening_v2.sql
```sql
-- Rollback 0006_hardening_v2.sql
DROP FUNCTION IF EXISTS accept_org_invite();
```

#### Rollback 0005_schema_hardening.sql
```sql
-- Rollback 0005_schema_hardening.sql
DROP FUNCTION IF EXISTS create_organization();
```

**Time**: 5-10 minutes

---

## Rollback Type 3: Environment Variable Rollback

**When to use**: Wrong environment values caused issues, sensitive keys exposed

### Steps

1. **Identify the problematic variable**
   - Check Vercel Dashboard → Settings → Environment Variables
   - Note which variable is causing issues

2. **Update or remove the variable**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Find the variable
   - Either update to correct value or delete
   - Select "Production" environment
   - Save

3. **Redeploy**
   - Vercel will prompt to redeploy
   - Click "Redeploy"
   - Wait for deployment to complete

4. **Verify the fix**
   - Run `./scripts/launch/verify_vercel_env.sh`
   - Run smoke tests: `./scripts/launch/smoke_test.sh`

**Time**: 2-3 minutes

---

## Rollback Type 4: Stripe Configuration Rollback

**When to use**: Webhook errors, payment processing failures, subscription sync issues

### Steps

1. **Disable Stripe temporarily**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Remove or comment out Stripe variables:
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - Price ID variables
   - Redeploy

2. **Disable webhook in Stripe**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Find the webhook endpoint
   - Click "Disable" or delete the endpoint

3. **Verify app works without Stripe**
   - Billing page should show "Billing not configured" message
   - App should continue to work with free tier limits
   - Run smoke tests

4. **Fix the Stripe configuration**
   - Review `scripts/launch/stripe_configuration_checklist.md`
   - Fix the configuration issue
   - Re-enable Stripe variables
   - Re-enable webhook
   - Test with `./scripts/launch/validate_webhook.sh`

**Time**: 5-10 minutes

---

## Rollback Type 5: Full System Rollback (Emergency)

**When to use**: Catastrophic failure, data corruption, security breach

### Steps

1. **Immediately take down the site**
   - Go to Vercel Dashboard → Settings → General
   - Click "Pause Deployment" or "Delete Project" (extreme case)

2. **Rollback database to backup**
   - Go to Supabase Dashboard → Database → Backups
   - Find the backup before the launch
   - Click "Restore"
   - Wait for restoration to complete

3. **Rollback code to previous commit**
   ```bash
   git log --oneline
   # Find the commit before launch
   git checkout <commit-hash>
   git push origin main --force
   ```
   - Vercel will auto-deploy the rollback

4. **Verify system state**
   - Run all verification scripts
   - Test all critical features
   - Monitor logs for errors

5. **Investigate the root cause**
   - Review what caused the failure
   - Fix the issue in a separate branch
   - Test thoroughly
   - Plan a new launch

**Time**: 15-30 minutes

---

## Post-Rollback Verification

After any rollback, run these checks:

1. **Database verification**
   - Run `scripts/launch/verify_migrations.sql`
   - Ensure database is in expected state

2. **Environment verification**
   - Run `./scripts/launch/verify_vercel_env.sh`
   - Ensure environment variables are correct

3. **Smoke tests**
   - Run `./scripts/launch/smoke_test.sh`
   - Ensure all automated tests pass

4. **Manual verification**
   - Test sign up flow
   - Test core features
   - Check for data integrity

5. **Log monitoring**
   - Check Vercel logs for errors
   - Check Supabase logs for errors
   - Monitor for 30 minutes after rollback

---

## Rollback Communication

If a rollback occurs:

1. **Internal team notification**
   - Notify all team members of the rollback
   - Explain what went wrong
   - Share the timeline for fix

2. **Customer communication (if users affected)**
   - Be transparent about the issue
   - Explain what happened
   - Share the fix timeline
   - Apologize for the inconvenience

3. **Documentation**
   - Document the rollback in this file
   - Add lessons learned
   - Update launch checklist to prevent recurrence

---

## Prevention Checklist

To minimize need for rollbacks:

- [ ] Always run smoke tests before launch
- [ ] Always verify migrations in staging first
- [ ] Always backup database before production migrations
- [ ] Always test environment variable changes in preview
- [ ] Always have a rollback plan before making changes
- [ ] Always monitor logs for 1 hour after launch
- [ ] Always have team on standby during launch

---

## Emergency Contacts

- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Stripe Support**: https://stripe.com/contact

---

## Summary

**Rollback Types**:
1. Vercel deployment rollback (2-5 min)
2. Database migration rollback (5-10 min)
3. Environment variable rollback (2-3 min)
4. Stripe configuration rollback (5-10 min)
5. Full system rollback (15-30 min)

**Key Principle**: Rollback quickly, fix slowly. It's better to have a working system with missing features than a broken system with all features.
