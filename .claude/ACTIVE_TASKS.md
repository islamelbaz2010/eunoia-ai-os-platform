# ACTIVE TASKS

**Updated**: 2026-07-02 (Session 12 — Sprint 0.9 Production Hardening COMPLETE)  
**Next session should start here.**

---

## IN PROGRESS

Nothing actively in flight. Sprint 0.9 is DONE.  
⚠️ Waiting for user to apply DB migrations before new user onboarding works.  
⚠️ Waiting for explicit approval before beginning Sprint 1.

---

## RECENTLY COMPLETED (Session 10 — 2026-06-29, P0 Login Crash Fix)

- [x] **Root cause identified**: `turbopack: { root: __dirname }` in `next.config.ts` broke Turbopack's module resolution for `lucide-react` in RSC context
- [x] **Fix applied**: Removed `turbopack: { root: __dirname }` from `next.config.ts`
- [x] **Verified**: GET /dashboard returns 307 (not 500), GET /login returns 200
- [x] **Build verified**: `next build` clean, 22 routes
- [x] **All checks pass**: 62/62 tests, TypeScript 0 errors, Lint clean
- [x] **ROOT_CAUSE_ANALYSIS.md** written with full timeline, stack trace, and regression notes

---

## P0 — MANUAL: Apply migration 0009 to Supabase

```
-- Run in Supabase SQL Editor in this order:
supabase/migrations/0009_enterprise_multitenant.sql
```

This migration MUST be run before any Sprint 4 features work in production.
Note: ALTER TYPE ADD VALUE commits non-transactionally — run in a single editor session.

---

## P0 — MANUAL DEPLOYMENT STEPS (not code — do in Vercel/Supabase)

- [ ] **Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN in Vercel**  
  From sentry.io → Project Settings → Client Keys → copy DSN.  
  Vercel Dashboard → Project → Settings → Environment Variables.  
  Effort: 5 min manual.

- [ ] **Set METRICS_TOKEN in Vercel**  
  Generate: `openssl rand -base64 32`. Add as `METRICS_TOKEN`.  
  Without this, `/api/metrics` is open to the internet.  
  Effort: 5 min manual.

- [ ] **Apply migration 0007 + 0008 to production Supabase**  
  Paste each file into Supabase SQL Editor → Run in order.  
  `supabase/migrations/0007_get_usage_totals.sql`  
  `supabase/migrations/0008_health_check.sql`  
  Effort: 10 min manual.

- [ ] **Set RESEND_API_KEY and FROM_EMAIL in Vercel dashboard**  
  Without this, invite emails are silently skipped.  
  Effort: 5 min manual.

- [ ] **Add SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT to GitHub Actions secrets**  
  Required for source maps in CI builds (makes Sentry stack traces readable).  
  Settings → Secrets → Actions → New repository secret.  
  Effort: 5 min manual.

## P0 — NEXT CODE TASK

- [ ] **CRM: edit contact** — inline status dropdown + edit modal  
  Add `updateContact(id, data)` to `crm/actions.ts`. Update `ContactRow` to support status change.  
  Files: `src/app/dashboard/crm/actions.ts`, `src/app/dashboard/crm/contact-row.tsx`  
  Effort: 4 hours

---

## P1 — HIGH PRIORITY

- [ ] **CRM: edit contact** — inline status dropdown + edit modal  
  Add `updateContact(id, data)` to `crm/actions.ts`. Update `ContactRow` to support status change.  
  Files: `src/app/dashboard/crm/actions.ts`, `src/app/dashboard/crm/contact-row.tsx`  
  Effort: 4 hours

- [ ] **KB: edit document + re-ingest** — allow title/content changes with re-embedding  
  Add `updateDocument(id, data)` to `knowledge-base/actions.ts`. Re-run ingest pipeline.  
  Files: `src/app/dashboard/knowledge-base/actions.ts`, new `document-edit-form.tsx`  
  Effort: 6 hours

- [ ] **Org switcher** — allow users with multiple orgs to switch  
  Store active org ID in a cookie. Update `getActiveOrganization()` to read from cookie.  
  Files: `src/lib/auth/dal.ts`, `src/app/dashboard/layout.tsx`  
  New: `src/app/dashboard/org-switcher.tsx` (client component)  
  Effort: 1 day

- [ ] **Streaming RAG responses** — replace blocking call with streaming  
  Use `openai.chat.completions.stream()`. Stream text tokens to client via ReadableStream.  
  Files: `src/app/dashboard/assistant/actions.ts`, `src/app/dashboard/assistant/chat.tsx`  
  New: `src/app/api/assistant/stream/route.ts` (route handler for streaming)  
  Effort: 1 day

- [ ] **Delete empty `src/app/api/status/` directory**  
  `rm -rf src/app/api/status/`  
  Effort: 2 min

- [ ] **Fix package.json name**  
  Change `"name": "eunoia-ai-os-app"` → `"name": "eunoia-ai-os-platform"` in `package.json`  
  Effort: 2 min

---

## P2 — COMMERCIAL FEATURES

- [ ] **Stripe billing** — subscription tiers (Starter $99, Pro $299, Enterprise $499/mo)  
  New: `src/app/dashboard/billing/` page. Stripe webhooks at `src/app/api/stripe/webhook/route.ts`.  
  Effort: 3 days

- [ ] **Usage quota enforcement** — block `askAssistant()` when monthly RAG quota exceeded  
  Add quota check before rate-limit check. Track monthly usage vs tier limit.  
  Files: `src/app/dashboard/assistant/actions.ts`  
  Effort: 4 hours (after Stripe is in place)

- [ ] **Pagination** — cursor-based pagination for all tables  
  CRM (200 contacts), KB (100 docs), Audit Logs (50), Settings (100 members).  
  Files: All 4 page components + their Server Actions  
  Effort: 1 day

- [ ] **Chat history persistence** — save conversations per user per org  
  New table: `chat_messages`. New migration. Update `chat.tsx` to load/save.  
  Effort: 2 days

---

## P3 — POLISH

- [ ] **PWA icons** — `public/icon.png` (192px) + `public/icon-512.png` (512px)  
  Required by `src/app/manifest.ts`. Without them, PWA install is broken.  
  Effort: 1 hour

- [ ] **Branded favicon** — replace Next.js default `src/app/favicon.ico`  
  Effort: 30 min

- [ ] **Delete scaffold SVGs** — `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`  
  All unreferenced. `rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg`  
  Effort: 2 min

- [ ] **Remove unused clsx** — `npm uninstall clsx` (verify: `grep -r "clsx" src/` → no results)  
  Effort: 2 min

---

## RECENTLY COMPLETED (Session 7 — 2026-06-29, Production Infrastructure Phase 2)

- [x] Sentry v10.62.0 installed — client, server, edge configs + instrumentation hook
- [x] `withSentryConfig` wrapping `next.config.ts` — sourcemaps, tunnel, no-logger
- [x] `src/app/global-error.tsx` — root error boundary with Sentry capture + inline styles
- [x] `src/app/error.tsx` — updated with `Sentry.captureException` in useEffect
- [x] `src/lib/logger.ts` — rewritten: 6 levels, LOG_LEVEL, 25-key sanitizer, JSON output
- [x] `src/lib/logger/types.ts` + `context.ts` — LogLevel, LogContext, AsyncLocalStorage context
- [x] `src/lib/supabase/proxy.ts` — X-Request-ID correlation, propagated to all response types
- [x] `/api/metrics` route — Prometheus text format, Bearer auth, 15 metrics
- [x] `src/lib/health/report-history.ts` — check counters (total, healthy) for Prometheus
- [x] `.env.example` — SENTRY_*, METRICS_TOKEN added
- [x] `docs/operations/sentry.md` — setup guide, rollback, troubleshooting
- [x] `docs/operations/logging.md` — levels, format, usage examples, aggregation
- [x] `docs/operations/prometheus.md` — metrics reference, config, Docker Compose, alert rules
- [x] `docs/operations/grafana/eunoia-system-health.json` — 10-panel importable dashboard
- [x] `docs/operations/grafana.md` — import guide, alert config
- [x] `docs/operations/uptime-monitoring.md` — Better Stack, UptimeRobot, SLA calculation
- [x] 12 runbooks: incident-response, database-down, openai-down, storage-down, email-down, cache-down, queue-down, high-cpu, high-memory, deployment-failure, rollback, recovery-checklist
- [x] `PRODUCTION_READINESS_REPORT.md` — 97/100 score, all gates, 8-phase delivery summary
- [x] All gates: 29/29 tests ✅, TypeScript 0 errors ✅, Lint clean ✅, Build 22 routes ✅

## RECENTLY COMPLETED (Session 6 — 2026-06-29, Health Framework Polish)

- [x] `HealthProvider<TMetadata>` generic with typed metadata per provider
- [x] `safeCheck()` wrapper — explicit Promise.allSettled isolation layer
- [x] Feature flags: `isEnabled()` util + 5 provider flags in `.env.example`
- [x] Ring buffer: `report-history.ts` (100 entries, O(1) push, in-memory only)
- [x] `recordReport()` wired into `/api/health` (cache MISS) and `/api/admin/system`
- [x] `history` field added to `/api/admin/system` response
- [x] `AlertProvider` interface + integration guide for future Slack/Discord/PagerDuty
- [x] Extension point docs added to `providers/index.ts` and `manager.ts`
- [x] Commented-out TODO blocks removed from `cache.ts` and `queue.ts` (RULES compliance)
- [x] Production build verified clean (21 routes)

## RECENTLY COMPLETED (Session 5 — 2026-06-29, Enterprise Health Framework)

- [x] Three-tier endpoints: `/api/live`, `/api/health`, `/api/admin/system`
- [x] `runHealthCheck()` pure function — Promise.allSettled, shared AbortController
- [x] 30s readiness cache with `X-Cache: HIT/MISS` headers
- [x] `BUILD_VERSION` injected at build time via `next.config.ts`
- [x] 8 health providers registered in `providers/index.ts`
- [x] `PROCESS_STARTED_AT` and memory metrics in admin endpoint
- [x] 401 JSON for unauthenticated `/api/*` requests (proxy.ts)
- [x] `ecosystem.config.js` PM2 config versioned
- [x] ESLint `argsIgnorePattern: '^_'` registered globally
- [x] `scripts/doctor.js` check 9 updated for three-tier design

## RECENTLY COMPLETED (Session 3 — 2026-06-29, Production Fix)

- [x] Health endpoint root cause fixed — `public.ping()` migration + full rewrite of `route.ts`
- [x] `ecosystem.config.js` — PM2 config added to version control
- [x] `scripts/doctor.js` — check 6 (Supabase) + check 9 (status value) bugs fixed
- [x] `npm run doctor` scripts added to `package.json`

---

## RECENTLY COMPLETED (Session 2 — 2026-06-29)

- [x] Password reset flow (`requestPasswordReset`, `updatePassword` actions + 2 pages)
- [x] Email invite delivery (Resend SDK, `src/lib/email.ts`, called in `settings/actions.ts`)
- [x] RAG rate limiting (50 queries/user/hour via `usage_events` count)
- [x] RAG source citations UI (`SourcesPanel` in `chat.tsx`)
- [x] CRM: delete contact (`deleteContact` action + `ContactRow` client component)
- [x] KB: delete document (`deleteDocument` action + `DocumentRow` client component)
- [x] Usage page O(N) fix (migration `0007_get_usage_totals.sql` + RPC call)
- [x] `/api/health` made public in proxy (unauthenticated uptime monitors now work)
- [x] `.env.example` updated with `RESEND_API_KEY` + `FROM_EMAIL`
- [x] GitHub Actions CI (`.github/workflows/ci.yml` — lint + tsc + test)

## RECENTLY COMPLETED (Session 1 — 2026-06-28)

- [x] All Phase 1 features (auth, onboarding, CRM, KB, RAG, audit, usage, settings, admin)
- [x] Full documentation suite (`docs/` — 25 files)
- [x] Security hardening (RLS, migrations 0001–0006, CSP headers)
- [x] Test suite (29 unit tests, 100% passing)
- [x] Health check API (`/api/health`)
- [x] Structured JSON logger
- [x] Audit logging (fire-and-forget pattern)
