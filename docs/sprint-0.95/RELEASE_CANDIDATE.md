# Release Candidate Assessment — Sprint 0.95

**Date**: 2026-07-02  
**Target**: RC1  
**Status**: ❌ NOT APPROVED — Infrastructure incomplete

---

## Scores (Current State, Pre-Migration)

| Category | Score | Notes |
|----------|-------|-------|
| **Production Readiness** | **72/100** | Deployment stable; DB not aligned |
| **Commercial Readiness** | **55%** | Existing users: GO; new users: blocked |
| **Reliability** | **7.5/10** | Health endpoints active; fallbacks in place |
| **Security** | **8.0/10** | RLS + RBAC + CSP; Prometheus open, Sentry missing |
| **Maintainability** | **7.0/10** | Temporary workarounds inflate complexity |
| **Database Alignment** | **40%** | 2/9 migrations confirmed; 4 missing |

---

## Scores (Post-Migration, Expected)

| Category | Score | Notes |
|----------|-------|-------|
| **Production Readiness** | **92/100** | All infrastructure complete |
| **Commercial Readiness** | **90%** | Full onboarding; invite emails if RESEND set |
| **Reliability** | **9.0/10** | Health checks fully functional; no fallbacks needed |
| **Security** | **9.0/10** | +Sentry DSN; +METRICS_TOKEN; Prometheus secured |
| **Maintainability** | **9.0/10** | Workarounds removed; schema fully aligned |
| **Database Alignment** | **100%** | All 9 migrations applied |

---

## RC1 Gate Checks

| Gate | Status | Blocker |
|------|--------|---------|
| No P0 issues | ❌ | `create_organization` RPC missing → onboarding broken |
| No P1 issues | ❌ | 5 RPCs missing; healthcheck weakened; Prometheus open |
| Stable deployment | ✅ | Vercel live, CI passing |
| Database fully aligned | ❌ | 4 migrations unapplied |
| Required secrets | ❌ | RESEND_API_KEY, METRICS_TOKEN, SENTRY_DSN missing |
| `/api/health` READY | ✅ | With PGRST202 fallback (weakened but operational) |
| `/api/live` OK | ✅ | |
| Auth stable | ✅ | Login, signup, password reset all working |
| Org flows working | ❌ | Onboarding blocked; settings update blocked |
| Invite flow | ⚠️ | Invite created and resent OK; email silently skipped (no RESEND_API_KEY) |
| Usage working | ⚠️ | Shows data via JS fallback; not via intended RPC |
| Audit working | ✅ | Fire-and-forget, confirmed in DB |
| 62/62 tests | ✅ | |
| TypeScript clean | ✅ | |
| Lint clean | ✅ | |

**Current RC1 gates passed: 7/15**

---

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Onboarding blocked for new users | **Critical** | Apply migration 0005 |
| `accept_org_invite` may have race condition (0002 vs 0006 version) | High | Apply migration 0006 to ensure FOR UPDATE version |
| Prometheus metrics open to internet | High | Set METRICS_TOKEN in Vercel |
| No production error visibility | Medium | Set SENTRY_DSN in Vercel |
| Org settings/transfer/archive broken | Medium | Apply migration 0009 |
| Invite emails silently dropped | Medium | Set RESEND_API_KEY in Vercel |
| `healthcheck()` RPC missing — DB check is weaker | Low | Apply migration 0008 |
| No pagination (data cap at 200/100/50 rows) | Low | P2 Sprint 1 feature |
| No chat history persistence | Low | P2 Sprint 1 feature |

---

## GO / NO-GO Recommendation

### Current state: ❌ NO-GO

**Reason**: P0 blocker — new user onboarding is broken. Any new customer who signs up cannot proceed past workspace creation. This is incompatible with commercial launch.

### Path to GO

Complete these steps (estimated 30 minutes total):

1. **Apply migrations 0003–0008** (15 min) — paste `docs/sprint-0.95/APPLY_MIGRATIONS_0003_to_0008.sql` into Supabase SQL Editor
2. **Apply migration 0009** (5 min) — paste `supabase/migrations/0009_enterprise_multitenant.sql` into a separate SQL Editor tab
3. **Set RESEND_API_KEY + FROM_EMAIL** in Vercel (5 min)
4. **Set METRICS_TOKEN** in Vercel (2 min)
5. **Set SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN** in Vercel (3 min)
6. Trigger a Vercel redeploy

**After those steps**, RC1 gates become:
- No P0: ✅ (onboarding works)
- No P1: ✅ (all RPCs present, Prometheus secured, errors tracked)
- All infrastructure: ✅

### Once Migrations Are Confirmed

The following code cleanup must be performed **after** migrations are confirmed applied:
1. Remove JS aggregation fallback in `usage/page.tsx` — use RPC directly
2. Remove error guard in `authorization.ts` — query `member_permissions` directly
3. Remove optional markers from `Organization` type in `types.ts`
4. Update `dal.ts` `getMemberships()` to include all org columns
5. Update `dal.ts` `getActiveOrganization()` to use `.status === "active"` (no `=== undefined` fallback)
6. Update `dal.ts` `getActiveMemberships()` to always filter by active status
7. Replace inline `resendInvite` logic with RPC call
8. Update database health provider — remove PGRST202 "ok" fallback
9. Remove friendly "temporarily unavailable" message from `onboarding/actions.ts` — restore normal error handling

These are estimated at ~2 hours of implementation once migrations are confirmed.
