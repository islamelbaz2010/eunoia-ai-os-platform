# ACTIVE TASKS

**Updated**: 2026-06-29 (Session 2)  
**Next session should start here.**

---

## IN PROGRESS

Nothing actively in flight. Pick the top P0 task.

---

## P0 — NEXT UP (Launch Blockers)

- [ ] **Sentry error monitoring** — `npx @sentry/wizard@latest -i nextjs`  
  Add DSN to Vercel env vars. Instrument error boundary in `src/app/error.tsx`.  
  Effort: 4 hours. Files: `next.config.ts`, `src/app/layout.tsx`, `src/app/error.tsx`

- [ ] **Commit all untracked files to git**  
  `git add -A && git commit -m "Add Phase 1+2 source files, migrations, CI, and engineering OS"`  
  Effort: 30 min. Risk: Zero.

- [ ] **Apply migration 0007 to production Supabase**  
  Paste `supabase/migrations/0007_get_usage_totals.sql` into Supabase SQL Editor → Run.  
  Effort: 5 min manual.

- [ ] **Set RESEND_API_KEY and FROM_EMAIL in Vercel dashboard**  
  Without this, invite emails are silently skipped.  
  Effort: 5 min manual.

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
