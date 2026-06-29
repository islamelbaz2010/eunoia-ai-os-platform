# Rollback — Runbook

Use this runbook to revert a broken production deployment.

---

## Decision: When to Rollback

Rollback immediately (do not investigate first) when:
- `/api/health` returns `healthy: false` after a deploy
- Login is broken
- Dashboard fails to load for all users
- Sentry shows a sharp spike in new errors after a deploy

Fix-forward instead when:
- The issue is isolated to a non-critical feature
- A fix is ready and tested within 15 minutes
- The issue predates the most recent deploy

---

## Option A — Vercel Rollback (Recommended)

Vercel keeps all previous production deployments and allows instant rollback with zero downtime.

### Steps

1. Open [vercel.com](https://vercel.com) → Select your project
2. Go to **Deployments** tab
3. Find the last **green** deployment (before the broken one)
4. Click the `...` menu → **Promote to Production**
5. Confirm — the previous deployment becomes the active production build immediately

### Verification

```bash
curl https://yourdomain.com/api/health | jq '{healthy, checked_at}'
# Expected: { "healthy": true, "checked_at": "..." }
```

---

## Option B — Git Revert (PM2 / VPS)

If you're self-hosting with PM2:

### Steps

```bash
# Find the last known-good commit
git log --oneline -10

# Revert to the good commit
git revert HEAD --no-edit        # creates a revert commit
# OR if this was a multi-commit deploy:
git revert HEAD~3..HEAD --no-edit

# Build and restart
npm ci --prefer-offline
npm run build

# Restart PM2
pm2 restart eunoia
```

**Important**: Do NOT use `git reset --hard` on `main`. It rewrites shared history. Always use `git revert`.

### Verification

```bash
pm2 status
curl https://yourdomain.com/api/health | jq .
pm2 logs eunoia --lines 20
```

---

## Option C — Vercel Environment Variable Rollback

If the broken deploy was caused by a changed environment variable (not a code change):

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Revert the variable to its previous value
3. Vercel → Deployments → find last good deploy → **Redeploy** (this picks up the updated env)

---

## Database Rollback

**Never rollback the database without careful review.**

If a migration is causing issues:
1. Identify the migration: `supabase/migrations/` — check the newest file
2. Write a compensating migration (`0009_rollback_<name>.sql`) that reverses the change
3. Apply it in Supabase Dashboard → SQL Editor
4. Do NOT roll back the code until the compensating migration is in place — data may have been written in the new schema

See `database-down.md` for more detail.

---

## Post-Rollback Checklist

- [ ] `/api/health` returns `healthy: true`
- [ ] Login works
- [ ] Dashboard loads with data
- [ ] No new errors in Sentry (last 10 minutes)
- [ ] Status page updated: "Resolved"
- [ ] Internal incident channel updated with resolution
- [ ] Broken deploy flagged in Vercel (add a comment to the deployment)
- [ ] Post-incident review scheduled within 24 hours
