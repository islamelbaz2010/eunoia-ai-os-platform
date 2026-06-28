# MASTER TODO
## Eunoia AI OS — Complete Task List

**Date**: 2026-06-28  
**Source**: Direct source code audit. Every item verified against actual files.  
**Format**: Priority | Task | File(s) | Hours | Depends On | Risk | Business Value

---

## P0 — Must Complete Before ANY Commercial Use

### P0-1: Implement Password Reset
- **File(s)**: New: `src/app/auth/reset-password/page.tsx`, `src/app/auth/reset-password/actions.ts`
- **Hours**: 8
- **Depends on**: Nothing (Supabase `resetPasswordForEmail()` is built-in)
- **Risk**: Low — standard Supabase auth flow
- **Business value**: CRITICAL — any user who forgets their password is permanently locked out
- **Implementation notes**:
  - Add "Forgot password" link to login page
  - Call `supabase.auth.resetPasswordForEmail(email)` in server action
  - Handle `/auth/callback?next=/auth/update-password` redirect
  - Add update-password form that calls `supabase.auth.updateUser({ password })`

---

### P0-2: Email Delivery for Team Invites
- **File(s)**: `src/app/dashboard/settings/actions.ts` — `createInvite()` function
- **Hours**: 16
- **Depends on**: Resend account (free tier: 100 emails/day), `RESEND_API_KEY` env var in Vercel
- **Risk**: Medium — email deliverability, spam filters
- **Business value**: CRITICAL — team onboarding is the primary growth mechanism
- **Implementation notes**:
  - `npm install resend`
  - After INSERT into `organization_invites`, call Resend to send invite email
  - Email contains: invite URL (`${APP_URL}/invite?token=${invite.token}`), org name, inviter name, role
  - Handle Resend errors gracefully (don't fail the invite creation if email fails — log and continue)
  - Add `RESEND_API_KEY` to `.env.example` and Vercel

---

### P0-3: Error Monitoring (Sentry)
- **File(s)**: New: `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`
- **Hours**: 4
- **Depends on**: Sentry account (free tier available), `SENTRY_DSN` env var
- **Risk**: Low — `npx @sentry/wizard@latest -i nextjs` automates setup
- **Business value**: HIGH — without this, production bugs are invisible
- **Implementation notes**:
  - Run `npx @sentry/wizard@latest -i nextjs`
  - Add `SENTRY_DSN` to Vercel environment variables
  - Add `NEXT_PUBLIC_SENTRY_DSN` for client-side error capture
  - Set `ignoreErrors` to filter noise (Next.js navigation cancellations)

---

### P0-4: Commit Migrations 0003-0006 to Git
- **File(s)**: `supabase/migrations/0003_grants.sql`, `0004_indexes_policies.sql`, `0005_schema_hardening.sql`, `0006_hardening_v2.sql`
- **Hours**: 0.5
- **Depends on**: Nothing
- **Risk**: Zero — just `git add` + `git commit`
- **Business value**: HIGH — currently at risk of losing database schema on machine failure
- **Implementation notes**:
  ```bash
  git add supabase/migrations/
  git commit -m "Add migrations 0003-0006 to version control"
  ```

---

## P1 — Fix Before First Paying Customer

### P1-1: Fix console.error → logger.error (2 locations)
- **File(s)**: `src/app/dashboard/knowledge-base/actions.ts:83`, `src/app/auth/callback/route.ts:18`
- **Hours**: 0.5
- **Depends on**: Nothing
- **Risk**: Zero
- **Business value**: MEDIUM — structured logging; errors appear in Vercel/Sentry with context
- **Implementation notes**:
  - `knowledge-base/actions.ts:83`: `console.error("[ingest] Embedding failed for document", data.id, err)` → `logger.error("[ingest] Embedding failed for document", { documentId: data.id, error: String(err) })`
  - `auth/callback/route.ts:18`: `console.error("[auth/callback] exchangeCodeForSession error:", error)` → `logger.error("[auth/callback] exchangeCodeForSession failed", { error: String(error) })`
  - Add `import { logger } from "@/lib/logger"` to both files

---

### P1-2: Add GitHub Actions CI
- **File(s)**: New: `.github/workflows/ci.yml`
- **Hours**: 4
- **Depends on**: Nothing (tests are unit tests, no external services needed)
- **Risk**: Low
- **Business value**: MEDIUM — prevents broken deployments; required for any co-developer
- **Implementation notes**:
  ```yaml
  on: [push, pull_request]
  jobs:
    ci:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci
        - run: npx tsc --noEmit
        - run: npm run lint
        - run: npm test
  ```

---

### P1-3: Fix O(N) Aggregation — Usage Page
- **File(s)**: `src/app/dashboard/usage/page.tsx`, new migration `supabase/migrations/0007_usage_rpc.sql`
- **Hours**: 3
- **Depends on**: P0-4 (migration commit discipline)
- **Risk**: Low
- **Business value**: MEDIUM — dashboard becomes unusable at scale without this
- **Implementation notes**:
  - Add `get_usage_totals(target_org_id uuid)` RPC that does SQL `GROUP BY event_type`
  - Replace `.limit(10000)` + `.reduce()` with single RPC call
  - See `.claude/PROMPTS.md` for complete SQL + TypeScript implementation

---

### P1-4: Fix O(N) Aggregation — Dashboard Charts
- **File(s)**: `src/app/dashboard/page.tsx` — `getUsageOverTime()` and `getContactStatusBreakdown()`
- **Hours**: 3
- **Depends on**: Nothing
- **Risk**: Low
- **Business value**: MEDIUM — dashboard overview loads slowly as usage grows
- **Implementation notes**:
  - `getUsageOverTime`: Replace `.limit(2000)` + JS Date aggregation with Supabase RPC using `date_trunc('day', created_at)` GROUP BY
  - `getContactStatusBreakdown`: Replace `.limit(5000)` + JS reduce with Supabase RPC using `status` GROUP BY

---

### P1-5: Display RAG Sources in Chat UI
- **File(s)**: `src/app/dashboard/assistant/chat.tsx`
- **Hours**: 2
- **Depends on**: Nothing (sources already returned from `askAssistant()`)
- **Risk**: Low
- **Business value**: MEDIUM — trust and transparency in AI answers
- **Implementation notes**:
  - Add `sources?: { id: string; content: string; similarity: number }[]` to `Message` type
  - Store sources alongside answer in message state
  - Render below assistant messages: small `<details>` / summary showing "N sources"
  - Show similarity score as percentage (e.g., "87% match")

---

### P1-6: Add Rate Limiting on RAG Queries
- **File(s)**: `src/app/dashboard/assistant/actions.ts`
- **Hours**: 8
- **Depends on**: Upstash Redis account (or DB-based counter)
- **Risk**: Low
- **Business value**: HIGH — prevents $1000 OpenAI bills from a single malicious user
- **Implementation notes**:
  - Option A: Upstash `@upstash/ratelimit` with Redis sliding window (50 queries/org/hour)
  - Option B: DB-based counter in `usage_events` table (query last hour's count before answering)
  - Option B is simpler and requires no new infrastructure

---

### P1-7: Verify Migrations 0003-0006 Applied to Production
- **File(s)**: Production Supabase dashboard
- **Hours**: 1
- **Depends on**: P0-4
- **Risk**: Zero (read-only verification)
- **Business value**: HIGH — embedding NOT NULL and FOR UPDATE lock may not be applied
- **Implementation notes**:
  - Check Supabase Dashboard → Table Editor → knowledge_base_chunks → verify `embedding` column shows `NOT NULL`
  - Check Database → Functions → verify `create_organization` function exists
  - Check Database → Indexes → verify `org_members_org_role_idx` exists
  - If any missing: apply missing migration from Supabase Dashboard → SQL Editor

---

## P2 — Fix Before Scale (10+ customers)

### P2-1: Add Organization Switcher
- **File(s)**: `src/lib/auth/dal.ts`, `src/app/dashboard/layout.tsx`
- **Hours**: 8
- **Depends on**: Nothing
- **Risk**: Medium (session/cookie management)
- **Business value**: MEDIUM — multi-property hotel groups need this
- **Implementation notes**:
  - Store selected org ID in a cookie (e.g., `eunoia-active-org`)
  - `getActiveOrganization()` reads from cookie if set, falls back to `memberships[0]`
  - Add org selector dropdown to dashboard sidebar showing all user's orgs
  - On selection, set cookie and `router.refresh()`

---

### P2-2: CRM — Edit Contact
- **File(s)**: `src/app/dashboard/crm/actions.ts`, `src/app/dashboard/crm/page.tsx`
- **Hours**: 6
- **Depends on**: Nothing
- **Risk**: Low
- **Business value**: MEDIUM — basic CRM requirement

---

### P2-3: CRM — Delete Contact
- **File(s)**: `src/app/dashboard/crm/actions.ts`, `src/app/dashboard/crm/page.tsx`
- **Hours**: 3
- **Depends on**: Nothing
- **Risk**: Low (RLS already enforces admin-only delete)

---

### P2-4: KB — Edit Document (with re-ingestion)
- **File(s)**: `src/app/dashboard/knowledge-base/actions.ts`, `src/app/dashboard/knowledge-base/page.tsx`
- **Hours**: 6
- **Depends on**: Nothing
- **Risk**: Low (re-ingestion already handles delete-then-insert)

---

### P2-5: KB — Delete Document
- **File(s)**: `src/app/dashboard/knowledge-base/actions.ts`
- **Hours**: 2
- **Depends on**: Nothing
- **Risk**: Low (cascade deletes chunks via FK)

---

### P2-6: Add PWA Icons
- **File(s)**: `public/icon.png` (192×192), `public/icon-512.png` (512×512)
- **Hours**: 2 (mostly design time)
- **Depends on**: Brand design
- **Risk**: Zero
- **Business value**: LOW — improves mobile home screen experience

---

### P2-7: Fix Default Favicon
- **File(s)**: `src/app/favicon.ico`
- **Hours**: 0.5
- **Depends on**: Brand design

---

### P2-8: Add Stripe Billing
- **File(s)**: New: `src/app/api/webhooks/stripe/route.ts`, `src/app/dashboard/billing/`
- **Hours**: 24
- **Depends on**: Stripe account, pricing strategy finalized
- **Risk**: Medium
- **Business value**: CRITICAL — required to actually collect revenue

---

### P2-9: Add Pagination to All Tables
- **File(s)**: `src/app/dashboard/crm/page.tsx` (limit 200), `src/app/dashboard/knowledge-base/page.tsx` (limit 100), `src/app/dashboard/audit-logs/page.tsx` (limit 50), `src/app/dashboard/settings/page.tsx` (limit 100)
- **Hours**: 8
- **Depends on**: Nothing
- **Risk**: Low

---

### P2-10: Add Welcome / Transactional Emails
- **File(s)**: `src/lib/auth/actions.ts` — signup action
- **Hours**: 4
- **Depends on**: P0-2 (Resend integration already done)
- **Risk**: Low

---

## P3 — Phase 2 Enhancements (Post-Launch)

| # | Task | Hours | Notes |
|---|------|-------|-------|
| P3-1 | Streaming RAG responses | 8 | OpenAI `stream: true`, React streaming |
| P3-2 | Multi-turn conversation | 16 | Message history in state + DB persistence |
| P3-3 | PDF/DOCX ingestion | 24 | `pdf-parse` or `mammoth` library |
| P3-4 | Language-aware retrieval | 8 | Add `language` filter to `match_kb_chunks` RPC |
| P3-5 | Contact notes field in UI | 4 | DB column exists, just needs UI |
| P3-6 | CRM Kanban board | 24 | Drag-and-drop status pipeline |
| P3-7 | Document reranking | 16 | BGE-reranker or Cohere Rerank API |
| P3-8 | E2E tests (Playwright) | 24 | Core user journey automation |
| P3-9 | Data export (contacts + KB) | 8 | CSV download; GDPR compliance |
| P3-10 | Terms of service / Privacy policy | 16 | Legal copy + /legal pages |
| P3-11 | Clean up scaffold SVG assets | 0.5 | Delete public/*.svg (Next.js defaults) |
| P3-12 | Fix package.json name | 0.1 | Change "eunoia-ai-os-app" to "eunoia-ai-os" |
| P3-13 | Remove clsx dependency | 0.5 | `npm uninstall clsx` |
| P3-14 | Delete empty api/status directory | 0.1 | `rm -rf src/app/api/status/` |
| P3-15 | Fix eunoia-ai-os-app git remote | 0.5 | Points to wrong GitHub URL |

---

## Total Effort Summary

| Priority | Items | Est. Hours | Calendar Time (1 dev) |
|----------|-------|-----------|----------------------|
| P0 | 4 | ~29 hrs | ~1 week |
| P1 | 7 | ~21 hrs | ~1 week |
| P2 | 10 | ~60 hrs | ~2 weeks |
| P3 | 15 | ~150 hrs | ~4-6 weeks |
| **Total** | **36** | **~260 hrs** | **~8-10 weeks** |
