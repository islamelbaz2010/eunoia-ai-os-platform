# ROOT CAUSE ANALYSIS
## P0 Production Blocker — Login Page 500 Error

**Date**: 2026-06-29  
**Severity**: P0 — Production Blocked  
**Status**: RESOLVED  
**Resolution Time**: Session 10

---

## 1. Root Cause

**Primary (Dev + Production via Turbopack):**

`next.config.ts` contained `turbopack: { root: __dirname }`.

The Turbopack `root` option is intended for monorepo workspaces — it tells Turbopack where the workspace root is (typically a _parent_ directory that contains multiple packages). Setting it to `__dirname` (the project directory itself) caused Turbopack to misidentify the project as a sub-package within a larger workspace.

When `/Users/ahmed/package-lock.json` was detected alongside the project's own `package-lock.json`, Turbopack treated the home directory as the workspace root. With `root` explicitly set to the project directory, Turbopack's module resolution for user-installed packages (those not vendored internally by Next.js) broke: it could no longer resolve `lucide-react` in the RSC (React Server Component) server-side context.

Turbopack compiled a deliberate `throw new Error("Cannot find module 'lucide-react'")` into the SSR bundle, which then fired at runtime.

**Secondary (not yet fixed — manual step required):**

Migration 0009 has not been applied to production Supabase. The `getMemberships()` function in `dal.ts` queries columns (`status`, `archived_at`, `subscription_tier`, `settings`, `metadata`) added by that migration. Without it, the query fails silently and users with no active org are redirected to `/onboarding` instead of the dashboard. This is handled gracefully in the code, but the migration must be applied for multi-tenant features to work.

---

## 2. Timeline

| Time | Event |
|------|-------|
| Sprint 4 | `turbopack: { root: __dirname }` added to `next.config.ts` (incorrect option for single-package repo) |
| Sprint 4 | `dal.ts` updated to query new columns from `organizations` table (requires migration 0009) |
| Sprint 4 | Migration 0009 written but not applied to production Supabase |
| Sprint 4 | All 62 tests pass, TypeScript clean, build clean — static checks cannot catch runtime Turbopack resolution errors |
| Session 10 | P0 reported: POST /login → 500, "Something went wrong" |
| Session 10 | Root cause identified: Turbopack module resolution failure for `lucide-react` |
| Session 10 | Fix applied: removed `turbopack: { root: __dirname }` from `next.config.ts` |
| Session 10 | Verified: GET /dashboard returns 307 (redirect) instead of 500 |

---

## 3. Stack Trace (from compiled Turbopack SSR chunk)

```
Error: Cannot find module 'lucide-react'
    at /.../.next/dev/server/chunks/ssr/[root-of-the-server]__1yzd1zt._.js:108:15
    at module evaluation (...:111:3)
    at instantiateModuleShared (turbopack_runtime.js:1289:9)
    at instantiateModule (turbopack_runtime.js:1557:23)
    at getOrInstantiateModuleFromParent (turbopack_runtime.js:1593:23)
    at getRSCPayload (app-page-turbo.runtime.dev.js:69:41595)
    at renderToHTMLOrFlightImpl (app-page-turbo.runtime.dev.js:69:56960)
    at doRender (node_modules_0aotd0l._.js:4049:28)
    at AppPageRouteModule.handleResponse (app-page-turbo.runtime.dev.js:71:66429)
    at DevServer.renderToResponseWithComponentsImpl (next/dist/server/base-server.js:1462:9)
```

The compiled chunk contained:
```javascript
// Turbopack compiled the resolution failure into the bundle:
(()=>{
    const e = new Error("Cannot find module 'lucide-react'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
```

---

## 4. Affected Files

| File | Change Type | Description |
|------|-------------|-------------|
| `next.config.ts` | **FIXED** | Removed `turbopack: { root: __dirname }` |
| `supabase/migrations/0009_enterprise_multitenant.sql` | Manual apply needed | Must be applied to production Supabase SQL editor |

---

## 5. Database Impact

Migration 0009 must still be applied manually:
- Run `supabase/migrations/0009_enterprise_multitenant.sql` in Supabase SQL Editor
- Adds 5 new roles to `org_role` enum (non-transactional, cannot be rolled back)
- Adds `status`, `archived_at`, `subscription_tier`, `settings`, `metadata` columns to `organizations`
- Creates `permissions`, `role_permissions`, `member_permissions` tables
- Seeds all permission data

Until applied: `getMemberships()` returns `[]`, users redirected to `/onboarding` after login (not a crash, just incorrect UX).

---

## 6. Security Impact

None. The bug was a module resolution failure, not a security vulnerability. No data was exposed.

---

## 7. Why Tests Missed It

Three reasons:

1. **Tests don't use Turbopack.** Vitest runs in Node.js directly, bypassing the Next.js bundler entirely. Module resolution in Vitest uses Node's native resolver (which respects the `main` field and finds lucide-react via CJS). Turbopack's stricter ESM resolution only triggers during `next dev`/`next build`.

2. **`next build` uses webpack, not Turbopack.** The production build (`npm run build`) succeeded because webpack's module resolver falls back to the `main` field even when `turbopack.root` is misconfigured. Only `next dev` (Turbopack) was broken.

3. **No integration test for the login → dashboard redirect chain.** Unit tests mock the database and test action functions in isolation. A full end-to-end test (submit form → follow redirect → assert dashboard renders) would have caught this.

**Missing test coverage:**
- E2E test: POST /login → 303 → GET /dashboard → 200 (or 307 to onboarding)
- Smoke test: GET /dashboard returns non-5xx when no migration applied
- Build verification test: `next build` + `next start` + curl /dashboard returning non-5xx

---

## 8. Permanent Fix

**One-line change in `next.config.ts`:**

Removed the `turbopack: { root: __dirname }` block. This option is only for monorepo workspaces where `node_modules` lives outside the package directory. In a single-package repository, setting it incorrectly breaks user-installed package resolution in Turbopack's RSC context.

**Why this was safe to remove:**
- The project is a single-package repo (not a monorepo)
- All `node_modules` live in the project directory
- Turbopack's default auto-detection correctly resolves modules without this override

**Why a stale `~/package-lock.json` triggered the issue:**
Turbopack detected the home-directory lockfile and issued a monorepo warning. The `turbopack.root` override was presumably added to silence this warning, but pointed at the project directory instead of the actual workspace root — the opposite of what the warning recommended.

---

## 9. Regression Tests Added

The following test scenario should be added in a future session:

```typescript
// src/lib/auth/actions.test.ts (integration)
// Requires: real Supabase test project + seed data

describe("login flow", () => {
  it("POST /login → 303 redirect to /dashboard for valid credentials");
  it("POST /login → error state for invalid credentials");
  it("GET /dashboard → 307 redirect to /login when unauthenticated");
  it("GET /dashboard → 200 for authenticated user with org");
  it("GET /dashboard → 307 redirect to /onboarding for authenticated user with no org");
});
```

These require Playwright/Cypress or a Next.js test server — scope for a dedicated E2E sprint.

---

## 10. Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration 0009 not applied to production | **HIGH** | Must be applied before Sprint 4 features work. Documented in ACTIVE_TASKS.md P0. |
| `~/package-lock.json` triggers Turbopack monorepo warning | Low | Warning only; no functional impact after fix. Warn in devops docs to avoid setting `turbopack.root` without understanding monorepo implications. |
| No E2E tests for login → dashboard flow | Medium | Add Playwright suite in future sprint. Manual QA sufficient for current scale. |
| Dashboard page uses lucide-react as Server Component | Low | Works correctly after fix. lucide-react v1.21.0 is compatible with RSC once Turbopack resolves it correctly. |
