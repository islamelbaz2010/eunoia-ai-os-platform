# FIRST CUSTOMER GO-LIVE PLAN
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Decision**: NO GO — resolve 6 P0 blockers, then proceed  
**Estimated ready date**: 2026-07-09 (2 days)

---

## GO / NO-GO DECISION MATRIX

| Gate | Requirement | Current Status | Required For GO |
|------|-------------|----------------|-----------------|
| G1 | Customer can pay | ❌ No Stripe | YES |
| G2 | Customer can sign up + onboard | ⚠️ Migrations missing | YES |
| G3 | Invite emails delivered | ❌ RESEND_API_KEY missing | YES |
| G4 | Legal pages exist | ❌ No /terms /privacy | YES |
| G5 | Error visibility in production | ❌ Sentry DSN missing | YES |
| G6 | Metrics endpoint secured | ❌ METRICS_TOKEN missing | YES |
| G7 | All migrations in git | ❌ 0003-0006 untracked | YES |
| G8 | Health endpoints responding | ✅ /api/live + /api/health | YES |
| G9 | Core product loop works | ✅ Signup→KB→AI→Invite | YES |
| G10 | Build + tests pass | ✅ 62/62 tests, 0 TS errors | YES |

**Current gates passed**: 3/10  
**Gates required for GO**: 10/10  
**Decision**: NO GO

---

## TIMELINE TO GO-LIVE

### Day 1 — Morning (2 hours: Manual Ops)

| Time | Action | Owner |
|------|--------|-------|
| 09:00 | Apply migration 0007 in Supabase SQL Editor | Ops |
| 09:10 | Apply migration 0008 in Supabase SQL Editor | Ops |
| 09:20 | Apply migration 0009 in Supabase SQL Editor | Ops |
| 09:30 | Set RESEND_API_KEY in Vercel | Ops |
| 09:35 | Set FROM_EMAIL in Vercel | Ops |
| 09:40 | Set METRICS_TOKEN in Vercel | Ops |
| 09:45 | Set NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN in Vercel | Ops |
| 09:50 | Commit migrations 0003-0006 to git | Engineering |
| 10:00 | Trigger Vercel redeploy | Ops |
| 10:30 | Verify all smoke tests pass | Ops |

### Day 1 — Remainder (Engineering Sprint Day 1)

| Time | Action | Files | Owner |
|------|--------|-------|-------|
| 11:00–13:00 | Terms of Service page | `src/app/terms/page.tsx` | Eng |
| 13:00–14:00 | Privacy Policy page | `src/app/privacy/page.tsx` | Eng |
| 14:00–17:00 | Landing page rewrite (MVP) | `src/app/page.tsx` | Eng |
| 17:00 | Deploy + smoke test | | Eng |

### Day 2 — Engineering Sprint Day 2

| Time | Action | Files | Owner |
|------|--------|-------|-------|
| 09:00–13:00 | Stripe billing (checkout + webhook) | `dashboard/billing/`, `api/stripe/` | Eng |
| 13:00–14:00 | Configure uptime monitor | BetterStack | Ops |
| 14:00–15:00 | Verify sending domain in Resend | DNS | Ops |
| 15:00–17:00 | End-to-end test: signup → pay → use | | Eng + Ops |
| 17:00 | Final smoke test battery | | Eng |

### Day 3 — GO-LIVE

| Time | Action | Owner |
|------|--------|-------|
| 09:00 | Final verification of all 10 GO gates | CTO |
| 09:30 | Deploy final build to production | Eng |
| 10:00 | Run full smoke test suite | Ops |
| 11:00 | First customer outreach | Commercial |

---

## GO-LIVE CRITERIA (ALL must be true)

- [ ] Stripe billing checkout completes successfully (test mode → live mode)
- [ ] Stripe webhook received and subscription tier updated in DB
- [ ] `/terms` and `/privacy` routes return 200 with content
- [ ] Landing page shows value proposition + pricing
- [ ] `GET /api/live` → `{"status":"ok"}`
- [ ] `GET /api/health` → `{"status":"ready"}`
- [ ] `GET /api/metrics` without token → 401
- [ ] New user: signup → onboarding → dashboard (under 2 minutes)
- [ ] Team invite: send → email delivered → accept → user in org
- [ ] RAG: upload KB doc → ask question → cited answer returned
- [ ] Sentry: test error appears in Sentry dashboard
- [ ] CI: GitHub Actions green on main branch
- [ ] 62/62 unit tests passing
- [ ] TypeScript: 0 errors
- [ ] Uptime monitor configured and showing green

---

## POST GO-LIVE MONITORING (First 48 Hours)

**Every 2 hours**:
- Check `/api/health` response
- Check Sentry for new errors
- Check Vercel function logs for 5xx responses
- Check uptime monitor status

**After first customer signs up**:
- Verify invite email received
- Verify onboarding completes
- Verify KB upload + AI query works end-to-end
- Check audit logs for expected entries

**After first payment**:
- Verify Stripe webhook received
- Verify `subscription_tier` updated in DB
- Verify customer has access to their tier features

---

## ROLLBACK TRIGGERS

Immediately rollback if:
- `/api/live` returns anything other than 200
- Error rate in Sentry exceeds 10 errors/minute
- Database connection pool exhausted
- Any customer reports cannot log in
- Payment webhook failing silently

Rollback procedure: `docs/runbooks/rollback.md`
