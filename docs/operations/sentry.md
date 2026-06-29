# Sentry Error Tracking — Operations Guide

Eunoia AI OS uses **Sentry** (`@sentry/nextjs` v10) for production error tracking. The integration covers Server Components, Server Actions, API Routes, Client Components, and the Edge Runtime (proxy.ts).

---

## Architecture

| Layer | File | Runtime |
|-------|------|---------|
| Client (browser) | `sentry.client.config.ts` | Browser |
| Server (Node.js) | `sentry.server.config.ts` | Node.js |
| Edge (proxy.ts) | `sentry.edge.config.ts` | Edge |
| Instrumentation hook | `src/instrumentation.ts` | Node.js + Edge |
| Route error boundary | `src/app/error.tsx` | Client |
| Root error boundary | `src/app/global-error.tsx` | Client |
| Next.js config wrapper | `next.config.ts` | Build time |

Sentry events are routed through `/monitoring-tunnel` (same-origin) to bypass ad-blockers and avoid CSP issues. No Sentry domain appears in `connect-src`.

---

## Environment Variables

| Variable | Required | Where | Purpose |
|----------|----------|-------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Vercel + local | Client SDK init (safe to expose — read-only ingest key) |
| `SENTRY_DSN` | Yes | Vercel | Server/Edge SDK init |
| `SENTRY_ORG` | CI only | CI env | Source map upload — Sentry org slug |
| `SENTRY_PROJECT` | CI only | CI env | Source map upload — project slug |
| `SENTRY_AUTH_TOKEN` | CI only | CI secrets | Source map upload auth token |

**Never** add `SENTRY_AUTH_TOKEN` to Vercel environment variables — it is a powerful token that should only exist in CI pipelines.

---

## Installation

Sentry is already installed (`@sentry/nextjs` in `package.json`). Nothing to install for new deployments.

### 1. Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) → Create Project → Next.js
2. Copy the DSN from Project Settings → Client Keys

### 2. Add Environment Variables

**Vercel Dashboard** → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SENTRY_DSN = https://xxx@o0.ingest.sentry.io/0
SENTRY_DSN             = https://xxx@o0.ingest.sentry.io/0
```

**Local development** (`.env.local`):
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
```

### 3. Source Maps (CI/CD)

Source maps enable readable stack traces in Sentry for minified production code.

Add to your CI environment (GitHub Actions, GitLab CI, etc.):
```
SENTRY_AUTH_TOKEN = sntrys_...
SENTRY_ORG        = your-org-slug
SENTRY_PROJECT    = eunoia-ai-os-platform
```

The Sentry webpack plugin in `next.config.ts` uploads maps automatically on `npm run build` when these are set. Source maps are deleted from `.next/` after upload (`deleteSourcemapsAfterUpload: true`).

---

## Configuration Details

### Sampling Rates

| Environment | Traces | Replays |
|-------------|--------|---------|
| Production | 10% | Disabled |
| Development | 100% | Disabled |

Session replays are disabled — they capture DOM content which risks recording PII.

### Sensitive Data Stripping

Both `sentry.client.config.ts` and `sentry.server.config.ts` use `beforeSend` hooks to strip:
- `cookie` header
- `authorization` header
- `x-api-key` header
- `x-supabase-key` header
- `query_string` (may contain auth tokens)

### User Context

To attach user identity to Sentry events from a Server Action:

```typescript
import * as Sentry from "@sentry/nextjs";
import { verifySession } from "@/lib/auth/dal";

const session = await verifySession();
Sentry.setUser({
  id: session.userId,
  // Do NOT include email or PII unless your data retention policy allows it
});
```

### Organization Context

```typescript
Sentry.setTag("organization_id", membership.organization.id);
Sentry.setTag("organization_name", membership.organization.name);
```

---

## Verification Checklist

After configuring Sentry, verify the integration works:

- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in Vercel
- [ ] `SENTRY_DSN` set in Vercel
- [ ] Trigger a test error: visit `/dashboard` and throw in a Server Action
- [ ] Confirm the error appears in Sentry within 30 seconds
- [ ] Check Sentry → Issues — error should have a readable stack trace
- [ ] Confirm no sensitive fields appear in the event (cookie, authorization, query_string)
- [ ] Source maps verified: stack trace shows source file names, not minified names
- [ ] `/monitoring-tunnel` route returns 200 (Sentry events tunnel)
- [ ] `SENTRY_AUTH_TOKEN` confirmed absent from Vercel dashboard

---

## Release Tracking

Sentry `release` is set to `process.env.BUILD_VERSION` (baked in at `next build`).

To tie releases to Git commits, configure your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Build
  env:
    BUILD_VERSION: ${{ github.sha }}
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: eunoia-ai-os-platform
  run: npm run build
```

Sentry will associate errors with the Git commit that introduced them.

---

## Rollback

If Sentry causes a build failure or runtime issue:

1. Remove the Sentry DSN env vars from Vercel → redeploy (Sentry init is a no-op when DSN is absent)
2. To completely remove Sentry from the build:
   - Remove `import { withSentryConfig }` from `next.config.ts`
   - Replace the export with `export default nextConfig`
   - Remove `@sentry/nextjs` from `package.json`
   - Delete `sentry.*.config.ts` and `src/instrumentation.ts`
3. The app functions identically without Sentry — error tracking is additive-only

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No events in Sentry | Missing DSN | Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel |
| `401` on events | Wrong DSN | Re-copy from Sentry project settings |
| Source maps not working | Missing CI token | Add `SENTRY_AUTH_TOKEN` to CI |
| Build error about Sentry | Network timeout | Sentry plugin has `silent: true` — check logs |
| Events blocked by ad-blocker | Not using tunnel | Verify `/monitoring-tunnel` is in PUBLIC_ROUTES in proxy.ts |
