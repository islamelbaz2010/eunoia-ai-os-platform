# Required Environment Variables — Sprint 0.95

**Verified**: 2026-07-02 via `vercel env ls` against production project `eunoia-ai-os-platform`

---

## Status Matrix

| Variable | Production | Development | Preview | Source in Code | Classification |
|----------|-----------|-------------|---------|----------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | ✅ Set | ❓ | `src/lib/supabase/server.ts`, `client.ts`, `proxy.ts`, health providers | **Required — Critical** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | ✅ Set | ❓ | Same as above | **Required — Critical** |
| `OPENAI_API_KEY` | ✅ Set | ✅ Set | ❓ | `src/lib/ai/openai.ts` | **Required — Critical** |
| `NEXT_PUBLIC_APP_URL` | ✅ **Just added** | ✅ **Just added** | ❓ | `src/app/dashboard/settings/actions.ts`, `src/lib/auth/actions.ts` | **Required — High** |
| `METRICS_TOKEN` | ✅ **Just added** | ❌ Not set | ❓ | `src/app/api/metrics/route.ts` | **Required — Security** |
| `LOG_LEVEL` | ✅ **Just added** | ✅ **Just added** | ❓ | `src/lib/logger.ts` | Optional (defaults to info) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set (Dev only) | ✅ Set | N/A | `scripts/` only — NEVER in app code | **Scripts only — Never in Vercel cloud** |
| `RESEND_API_KEY` | ❌ **Missing** | ❌ Missing | ❌ | `src/lib/email.ts` | **Required — High (invite emails)** |
| `FROM_EMAIL` | ❌ **Missing** | ❌ Missing | ❌ | `src/lib/email.ts` | **Required — High (invite emails)** |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ **Missing** | ❌ Missing | ❌ | `src/instrumentation-client.ts`, Sentry init | Optional (error tracking) |
| `SENTRY_DSN` | ❌ **Missing** | ❌ Missing | ❌ | `src/instrumentation.ts` | Optional (error tracking) |
| `SENTRY_AUTH_TOKEN` | ❌ Missing | ❌ Missing | ❌ | `next.config.ts` → `withSentryConfig` | CI only — GitHub Actions secret |
| `ENABLE_SLACK_ALERTS` | ❌ Missing | ❌ Missing | ❌ | `src/lib/health/providers/alerts.ts` | Optional (defaults to false) |
| `SLACK_WEBHOOK_URL` | ❌ Missing | ❌ Missing | ❌ | `src/lib/health/providers/alerts.ts` | Optional (only if ENABLE_SLACK_ALERTS=true) |
| `QUEUE_REDIS_URL` | ❌ Missing | ❌ Missing | ❌ | `src/lib/health/providers/queue.ts` | Optional (queue health check, skipped if absent) |
| `REDIS_URL` | ❌ Missing | ❌ Missing | ❌ | `src/lib/health/providers/cache.ts` | Optional (cache health check, skipped if absent) |
| `BUILD_VERSION` | ❌ Missing | ❌ Missing | ❌ | `next.config.ts` injects at build time | Optional (injected automatically at build) |
| `NODE_ENV` | Auto | Auto | Auto | Platform-injected by Vercel/Node | Platform-injected — do not set |
| `NEXT_RUNTIME` | Auto | Auto | Auto | `src/lib/health/providers/memory.ts` | Platform-injected — do not set |

---

## Variables Added This Sprint (Automated)

| Variable | Value | Environments Added |
|----------|-------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://eunoia-ai-os-platform.vercel.app` | Production, Development |
| `METRICS_TOKEN` | Generated (32-byte random) | Production |
| `LOG_LEVEL` | `info` (production), `debug` (development) | Production, Development |

---

## Variables Requiring Manual Action

### RESEND_API_KEY + FROM_EMAIL

**Why cannot automate**: Requires a Resend.com account with a verified sender domain. The API key is unique to the account.

**Impact**: Without these, `sendInviteEmail()` in `src/lib/email.ts` executes the Resend SDK call which fails silently. No invite email is delivered. The invite record IS created and the token IS valid — the user just never receives it.

**Steps**:
1. Go to https://resend.com/api-keys
2. Create a new API key
3. `vercel env add RESEND_API_KEY production --value "re_xxx"`
4. `vercel env add FROM_EMAIL production --value "noreply@yourdomain.com"` (must be verified in Resend)

### NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN

**Why cannot automate**: Requires a Sentry.io project. The DSN is project-specific.

**Impact**: Without this, client and server errors are not captured. The Sentry SDK is initialized but sends no events.

**Steps**:
1. Go to https://sentry.io → your project → Settings → Client Keys (DSN)
2. Copy the DSN (format: `https://xxx@o0.ingest.sentry.io/0`)
3. `vercel env add NEXT_PUBLIC_SENTRY_DSN production --value "https://xxx@..."`
4. `vercel env add SENTRY_DSN production --value "https://xxx@..."`

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` **must never be added to Vercel Production or Preview** — it is present only in Development to support local admin scripts.
- `METRICS_TOKEN` is now set in Production — `/api/metrics` returns 401 without `Authorization: Bearer <token>`.
- `NEXT_PUBLIC_*` variables are embedded in the client bundle and visible to all users. Only non-sensitive values belong here.
