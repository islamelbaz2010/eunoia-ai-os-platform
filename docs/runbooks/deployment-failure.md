# Deployment Failure — Runbook

**Trigger**: Deploy completes but health checks fail, or users report a broken feature after a deploy.

**Severity**: SEV1 (if core features broken) / SEV2 (if isolated to a single feature)

---

## Diagnosis

### 1. Confirm the Deploy Was the Cause

```bash
# Check when the issue started vs. last deploy time
# Vercel: Dashboard → Deployments → check deploy timestamps
# PM2: pm2 describe eunoia → look at "created at"
```

### 2. Check Health

```bash
curl https://yourdomain.com/api/health | jq .
curl https://yourdomain.com/api/live | jq .
```

### 3. Check Application Logs

**Vercel**:
- Dashboard → Logs (real-time log streaming)
- Filter by `level: error` or `level: fatal`

**PM2 (VPS)**:
```bash
pm2 logs eunoia --lines 100 --err
```

### 4. Check Sentry

- Sentry → Issues → sort by "First seen"
- Look for errors introduced in the last 30 minutes

### 5. Check TypeScript / Build Errors

If the deploy itself failed silently:
```bash
npm run build 2>&1 | tail -30
npx tsc --noEmit
```

---

## Mitigation: Rollback

If the current deploy is broken, roll back immediately. See `rollback.md` for step-by-step instructions.

**Rule**: Always rollback first, investigate after. Customers should not be impacted while you debug.

---

## Mitigation: Fix-Forward

Only fix-forward (deploy a patch) if:
1. The issue is minor and a fix is trivially obvious
2. You have a fix ready and tested within 15 minutes

To fix-forward:
```bash
# Fix the issue
npm run build     # Must pass
npm test          # Must pass (all 29 tests)
npx tsc --noEmit  # Must be 0 errors

# Deploy
git add <changed files>
git commit -m "Fix: <what was broken>"
git push origin main
# Vercel deploys automatically on push to main
```

---

## Mitigation: Database Migration Failure

If the failure is related to a new migration:

1. Check if the migration was applied: Supabase Dashboard → SQL Editor
2. If the migration ran but introduced a regression:
   - Do NOT run `DROP TABLE` or destructive commands on production
   - Write a new `0009_rollback_<name>.sql` that reverses the change safely
   - Apply the rollback migration in Supabase SQL Editor
3. Roll back the code deploy (see `rollback.md`)

---

## Post-Deploy Verification Checklist

Run this checklist after every deploy before declaring "all clear":

- [ ] `/api/live` → HTTP 200
- [ ] `/api/health` → HTTP 200, `healthy: true`
- [ ] Login flow: sign in with a test account
- [ ] Dashboard: loads with data
- [ ] CRM: create a test contact
- [ ] Knowledge Base: verify document list loads
- [ ] Assistant: send a test query
- [ ] Settings: load the settings page
- [ ] Sentry: no new errors in last 5 minutes

---

## Escalation

If you cannot identify the root cause within 30 minutes:
1. Keep the rollback in place
2. Pull in a second engineer for review
3. Write up findings and share with the team before attempting another deploy
