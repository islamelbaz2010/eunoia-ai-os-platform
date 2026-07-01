# RC Infrastructure Report — Sprint 0.95

**Date**: 2026-07-02  
**Target**: Release Candidate 1 (RC1)  
**Status**: ❌ BLOCKED — Manual migration steps required

---

## Deployment Status

| Item | Status | Notes |
|------|--------|-------|
| Vercel deployment | ✅ Live | https://eunoia-ai-os-platform.vercel.app |
| `/api/live` | ✅ `{"status":"ok"}` | No external calls |
| `/api/health` | ✅ `{"status":"ready"}` | DB check uses PGRST202 fallback |
| Build | ✅ Clean | 22 routes |
| CI | ✅ Passing | GitHub Actions: lint + tsc + test |
| Tests | ✅ 62/62 | All unit tests pass |
| TypeScript | ✅ Clean | 0 errors |
| Lint | ✅ Clean | 0 warnings |

---

## Database Status

| Item | Status | Notes |
|------|--------|-------|
| Core tables (9) | ✅ Applied | All exist, RLS active |
| Base functions | ✅ Applied | is_org_member, org_role, is_super_admin, match_kb_chunks, accept_org_invite |
| create_organization RPC | ❌ Missing | Migration 0005 not applied |
| get_usage_totals RPC | ❌ Missing | Migration 0007 not applied |
| healthcheck RPC | ❌ Missing | Migration 0008 not applied |
| Extended org_role enum | ❌ Missing | Migration 0009 not applied |
| Enterprise RPCs | ❌ Missing | Migration 0009: update_org_settings, transfer_ownership, archive_org |
| member_permissions table | ❌ Missing | Migration 0009 not applied |
| Organizations.status column | ❌ Missing | Migration 0009 not applied |
| Indexes (0004, 0006) | ❓ Unverifiable | Cannot inspect via REST API |
| Grants (0003) | ❓ Unverifiable | Tables accessible → likely effective |

**Blockers**: Migrations 0005, 0007, 0008, 0009 confirmed not applied. Migrations 0003, 0004, 0006 unverified.

---

## Secrets Status

| Variable | Local | Vercel | Required | Impact If Missing |
|----------|-------|--------|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Required | App doesn't start |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Required | App doesn't start |
| `OPENAI_API_KEY` | ✅ | ✅ | Required | RAG broken |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | Required | Invite URLs use fallback domain |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ NEVER | Scripts only | N/A (never in cloud) |
| `RESEND_API_KEY` | ❓ Unknown | ❌ Not set | For invites | Invite emails silently skipped |
| `FROM_EMAIL` | ❓ Unknown | ❌ Not set | For invites | Invite emails silently skipped |
| `NEXT_PUBLIC_SENTRY_DSN` | ❓ Unknown | ❌ Not set | For error tracking | No client error capture |
| `SENTRY_DSN` | ❓ Unknown | ❌ Not set | For error tracking | No server error capture |
| `SENTRY_AUTH_TOKEN` | CI only | ❌ Not in Vercel | For source maps in CI | Stack traces unreadable in Sentry |
| `METRICS_TOKEN` | ❓ Unknown | ❌ Not set | Prometheus auth | `/api/metrics` open to internet |

---

## Remaining Blockers Before RC1

### Blocker 1 (P0): New user onboarding broken
- **Cause**: `create_organization` RPC missing (migration 0005)
- **Fix**: Apply migration 0005
- **Manual action required**: Yes

### Blocker 2 (P0): Usage aggregation is fallback-only
- **Cause**: `get_usage_totals` RPC missing (migration 0007)
- **Fix**: Apply migration 0007
- **Manual action required**: Yes

### Blocker 3 (P1): Health endpoint database check is weakened
- **Cause**: `healthcheck()` RPC missing (migration 0008); PGRST202 treated as "ok"
- **Fix**: Apply migration 0008
- **Manual action required**: Yes

### Blocker 4 (P1): Enterprise org management broken
- **Cause**: 5 RPCs missing (migration 0009)
- **Fix**: Apply migration 0009 (separately, non-transactional)
- **Manual action required**: Yes

### Blocker 5 (P1): Invite emails not sent
- **Cause**: RESEND_API_KEY + FROM_EMAIL not set in Vercel
- **Fix**: Add to Vercel dashboard → Project → Settings → Environment Variables
- **Manual action required**: Yes

### Blocker 6 (P2): Prometheus endpoint open to internet
- **Cause**: METRICS_TOKEN not set in Vercel
- **Fix**: Generate with `openssl rand -base64 32`, add to Vercel
- **Manual action required**: Yes

### Blocker 7 (P2): No error tracking in production
- **Cause**: SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN not set in Vercel
- **Fix**: Get DSN from sentry.io → Project Settings → Client Keys
- **Manual action required**: Yes

---

## Compatibility Code — Pending Removal After Migrations

The following code was added as temporary workarounds and must be removed after migrations are applied:

| File | Workaround | Remove After |
|------|------------|--------------|
| `src/app/dashboard/usage/page.tsx` | Fallback JS aggregation when RPC unavailable | Migration 0007 applied |
| `src/lib/auth/authorization.ts` | Error guard on `member_permissions` query | Migration 0009 applied |
| `src/lib/types.ts` | Optional Organization fields (status, settings, etc.) | Migration 0009 applied |
| `src/lib/auth/dal.ts` | Status-undefined fallback in getActiveOrganization | Migration 0009 applied |
| `src/lib/auth/dal.ts` | Org column selection excludes 0009 columns | Migration 0009 applied |
| `src/app/dashboard/settings/actions.ts` | Inline resendInvite without RPC | Migration 0009 applied |
| `src/lib/health/providers/database.ts` | PGRST202 treated as "ok" | Migration 0008 applied |
