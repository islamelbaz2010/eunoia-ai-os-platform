# Deployment Audit — Eunoia AI OS

---

## Current Deployment State

**Platform**: Vercel (linked project `prj_NWX9WFHwFH9RbX6TuLuSmaTr0h3E`)  
**Production URL**: https://eunoia-ai-os-platform.vercel.app  
**Node version**: `.nvmrc` specifies `20`  
**Branch**: `eunoia-ai-os-platform` (not `main`)

---

## Build Status: ❌ BROKEN

### Root Cause
`scripts/knowledge/quality-report.ts:58` uses `FileMetadata` without importing it.

`FileMetadata` is defined in `src/lib/knowledge/importer/types.ts` as:
```ts
export interface FileMetadata { ... }
```

Fix (1 line):
```ts
import type { FileMetadata } from "../../src/lib/knowledge/importer/types";
```

### Impact
- Every `git push` to any branch triggers a CI check that calls `npx tsc --noEmit`
- Every Vercel deployment runs `npm run build` which fails at TypeScript check
- **The current production deployment was made BEFORE this file was committed** (knowledge layer commits are the most recent)

---

## CI/CD Pipeline Analysis

### `.github/workflows/ci.yml` — 5 jobs

| Job | Depends On | Behavior | Issue |
|-----|------------|----------|-------|
| `quality` (lint+tsc+test) | — | Runs on every push/PR | ❌ Fails (lint + tsc) |
| `security` | — | Dependency audit + secret scan | ✅ Would pass |
| `build` | `quality` | `continue-on-error: true` | ⚠️ Masks build failure |
| `readiness` | `quality` | Checks ops scripts exist | ✅ Would pass |
| `release` | quality+build+readiness | Only on main push | ❌ Never runs (quality fails) |

### CI Issues
1. `continue-on-error: true` on build job hides failures — should be removed
2. Release summary hardcodes "Tests: ✅ 29/29" (actual: 309)
3. No deployment step in CI — Vercel deploys via webhook integration separately
4. No E2E tests in CI (Playwright not installed)

---

## Vercel Configuration

### ✅ Project Linked
`.vercel/repo.json` correctly identifies project ID and org.

### ⚠️ No `vercel.json` or `vercel.ts`
Vercel uses framework auto-detection (Next.js). This works but provides no explicit configuration for:
- Function timeouts (default 300s is fine)
- Region configuration
- Environment variable management

### Missing Environment Variables in Vercel (CRITICAL)
| Variable | Status | Impact |
|----------|--------|--------|
| `RESEND_API_KEY` | ❌ Missing | Invite emails silently fail |
| `FROM_EMAIL` | ❌ Missing | Email from address fallback |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Missing | No client error tracking |
| `SENTRY_DSN` | ❌ Missing | No server error tracking |
| `METRICS_TOKEN` | ❌ Missing | /api/metrics is open |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Present | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Present | — |
| `OPENAI_API_KEY` | ✅ Present | — |
| `NEXT_PUBLIC_APP_URL` | ✅ Present | — |

---

## Docker Deployment Analysis: ❌ BROKEN (2 issues)

### Issue 1: Standalone Output Not Configured
`Dockerfile` copies `.next/standalone/` but `next.config.ts` does not set `output: "standalone"`. The `standalone/` directory will not exist after build. Container will fail to start.

**Fix**: Add to `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  // ... rest of config
};
```

### Issue 2: Healthcheck String Mismatch
`Dockerfile` line 84:
```bash
grep -q '"status":"live"' || exit 1
```
But `/api/live` route returns:
```json
{"status":"ok","timestamp":"..."}
```
Healthcheck will **always fail**. Container will be marked unhealthy.

**Fix**: Change to:
```bash
grep -q '"status":"ok"' || exit 1
```

### Issue 3: devDeps installed in production
`Dockerfile` Stage 1 runs `npm ci --only=production` correctly.  
Stage 2 runs `npm ci` (all deps including devDeps) for building — correct.  
Stage 3 copies from builder, not deps — correct pattern.

---

## PM2 / VPS Deployment

### `ecosystem.config.js` (Verified)
```js
// Configuration for PM2 process manager
```
Present and versioned. Enables restart on crash, log rotation.

### `ops/deploy/deploy.sh`
Shell deployment script for VPS. Pulls latest, installs, builds, restarts PM2.

### ⚠️ Ops Scripts Target Non-Vercel
Most `ops/` scripts assume VPS + nginx + PM2. Since the app is actually deployed on Vercel, these scripts are currently unused but maintained as fallback.

---

## Deployment Readiness Score: 60 / 100

Deductions:
- -20: Build broken (TypeScript error)
- -10: Docker completely broken (2 critical issues)
- -8: Missing Vercel env vars (Resend, Sentry, Metrics)
- -2: CI continue-on-error masks failures
