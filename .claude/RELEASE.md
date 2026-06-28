# RELEASE — Deployment Procedure

---

## Pre-Deploy Checklist (Every Deploy)

```bash
# 1. Verification
npx tsc --noEmit          # Must be clean
npm run lint              # Must be clean  
npm test                  # Must be 29/29

# 2. Check for regressions
git diff HEAD --stat      # Review what's changing

# 3. Verify no secrets committed
git diff HEAD | grep -E "SUPABASE_SERVICE_ROLE_KEY|sk-|re_"
# Must return nothing
```

---

## Pre-Deploy Checklist (When Adding a Migration)

- [ ] Migration tested in development Supabase project (not production)
- [ ] Migration uses `CREATE OR REPLACE` / `IF NOT EXISTS` (idempotent)
- [ ] Migration applied to **production Supabase** BEFORE pushing code that depends on it
- [ ] Migration committed to git: `git add supabase/migrations/NNNN_*.sql`
- [ ] Verified in Supabase Table Editor that schema change is correct

**CRITICAL ORDER**: Apply migration to Supabase → then push code → never the other way.

---

## Pre-Deploy Checklist (When Adding a New Environment Variable)

- [ ] Variable added to `.env.example` with description
- [ ] Variable added to Vercel dashboard (all environments)
- [ ] Variable added to `src/lib/env.ts` if it needs validation
- [ ] Code gracefully handles missing variable (null check, warn, degrade gracefully)

---

## Deployment (Automatic)

Every push to `main` deploys automatically via Vercel.

```bash
git push origin main
# → Vercel build triggers automatically
# → Monitor at: https://vercel.com/islamelbaz2010/eunoia-ai-os-platform
```

---

## Post-Deploy Verification

```bash
# 1. Health check
curl https://eunoiaos.com/api/health
# Expected: {"status":"ok","ts":...,"checks":{"db":"ok"}}

# 2. Verify auth works
# Open https://eunoiaos.com/login in browser
# Sign in → should reach /dashboard

# 3. Verify RAG works (if changed)
# Add a KB document → ask a question in assistant → verify answer with citations

# 4. Check Vercel function logs for any errors
# Vercel Dashboard → Logs → Filter by "error"
```

---

## Rollback Procedure

If something is broken in production:

**Option 1 — Instant UI rollback (recommended)**:
```
Vercel Dashboard
  → Deployments tab
  → Find last known-good deployment
  → Click "..." → "Promote to Production"
  → Done in <30 seconds
```

**Option 2 — Git revert**:
```bash
git revert HEAD
git push origin main
# Deploys automatically
```

**If migration caused the issue**:
- Rollback Vercel deployment immediately (app first)
- Then fix the migration (add compensating migration)
- Apply compensating migration to production
- Re-deploy fixed code

---

## Beta Launch Checklist (Free Invite-Only)

- [ ] Sentry installed and DSN configured in Vercel
- [ ] Migration 0007 applied to production Supabase
- [ ] RESEND_API_KEY set in Vercel
- [ ] FROM_EMAIL set in Vercel (must be a verified Resend domain)
- [ ] All files committed to git
- [ ] Post-deploy health check passes
- [ ] Manual test: sign up → create org → add KB doc → ask question → get cited answer
- [ ] Manual test: invite a team member → email received → accept invite → can access org

---

## Paid Launch Checklist (Commercial)

All Beta items above PLUS:

- [ ] Stripe billing integrated
- [ ] Subscription tiers configured (Starter $99, Pro $299, Enterprise $499)
- [ ] Usage quota enforcement working
- [ ] Terms of Service page exists
- [ ] Privacy Policy page exists
- [ ] Supabase region confirmed (data residency for KSA customers if needed)
- [ ] Vercel Pro plan active (60s function timeout for RAG)
- [ ] Custom domain `eunoiaos.com` with SSL (verify HSTS)
- [ ] Uptime monitoring configured (Uptime Robot or Better Uptime using `/api/health`)
- [ ] Sentry alerts configured (email/Slack for new errors)

---

## Environment: Production

| Service | URL | Notes |
|---------|-----|-------|
| App | https://eunoiaos.com | Vercel |
| Supabase | Dashboard | Apply migrations manually |
| Vercel | Dashboard | Environment variables, deployment logs |
| Resend | Dashboard | Email delivery logs |
| Sentry | Dashboard | Error monitoring (TBD) |
