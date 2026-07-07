# PRODUCTION ACTION PLAN
**Prioritized by business impact. No speculation. Every task backed by evidence.**

**Generated**: 2026-07-07 — CTO Forensic Review  
**Branch**: `eunoia-ai-os-platform` — Git SHA: acaa6be  
**Principle**: Work that enables the first paying customer comes first. Everything else comes second.

---

## TOP 20 PRIORITIES

### TIER 1: DO THESE TODAY (Manual, 1 hour total)

These are not code changes. They are configuration steps. They unlock features that are already built and working in the codebase. Every minute of delay is a minute the product is degraded in production.

---

**PRIORITY 1 — Apply database migrations**
- **Business impact**: CRITICAL. Without these, CRM extended features (AI insights, pipeline stages, soft delete), enterprise RBAC (9 roles, permissions), org lifecycle, and org settings are broken in production — they exist in TypeScript but the DB columns don't exist.
- **Technical risk**: LOW. All migrations are idempotent. Run in order: 0009a → 0009b → 0010_crm_platform_fixed. Also apply 0007 + 0008 for usage RPC + health DB function.
- **Estimated time**: 30 minutes (manual, in Supabase SQL Editor)
- **Dependencies**: None
- **Expected ROI**: Unlocks ~$40k worth of already-built features
- **File**: `supabase/migrations/` — apply in order: 0007 → 0008 → 0009a → 0009b → 0010_crm_platform_fixed
- **Do NOT apply**: 0009_enterprise_multitenant.sql, 0009_enterprise_multitenant_fixed.sql, 0010_crm_platform.sql (all superseded)

---

**PRIORITY 2 — Set RESEND_API_KEY and FROM_EMAIL in Vercel**
- **Business impact**: CRITICAL. Team invite emails are silently skipped in production. Inviting a colleague does nothing. This breaks onboarding for every new customer.
- **Technical risk**: ZERO. Code already exists. `src/lib/email.ts` is working. `sendInviteEmail()` is called correctly in `settings/actions.ts`. Only the API key is missing.
- **Estimated time**: 5 minutes
- **Dependencies**: Resend.com account (get API key from dashboard)
- **Expected ROI**: Unblocks team onboarding for first customer

---

**PRIORITY 3 — Set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN in Vercel**
- **Business impact**: HIGH. Without this, production errors are invisible. When the first customer hits a bug, you won't know until they complain. Sentry SDK is fully installed and configured (v10.62.0, client + server + edge configs).
- **Technical risk**: ZERO. SDK already installed. Two env vars to add.
- **Estimated time**: 5 minutes
- **Dependencies**: Sentry.io project (free tier sufficient)
- **Expected ROI**: Operational visibility; essential before any customer usage

---

**PRIORITY 4 — Set METRICS_TOKEN in Vercel**
- **Business impact**: MEDIUM. Without this, `/api/metrics` (Prometheus) is publicly accessible without authentication. Low security risk (read-only system metrics), but a compliance issue.
- **Technical risk**: ZERO. Code handles auth correctly when token is present.
- **Estimated time**: 5 minutes (run `openssl rand -base64 32`, add to Vercel)
- **Dependencies**: None
- **Expected ROI**: Closes Prometheus auth gap

---

### TIER 2: SPRINT 1A — REVENUE UNLOCK (6 developer-days)

**These 4 tasks make the first paying customer possible. Do them before anything else.**

---

**PRIORITY 5 — Stripe billing + webhooks + tier enforcement**
- **Business impact**: CRITICAL. Cannot generate any revenue without this. Revenue model is defined ($99/$299/$499+). The `subscription_tier` column is in the DB. The quota check logic is defined. Only Stripe is missing.
- **Technical risk**: MEDIUM. Stripe webhooks require idempotency handling (use Stripe's `event.id` as idempotency key). Webhook signature verification is mandatory.
- **Estimated time**: 3 developer-days
- **Dependencies**: Stripe account; Priorities 1–4 complete
- **Expected ROI**: Enables first dollar of revenue
- **Files to create/modify**:
  - `src/app/dashboard/billing/page.tsx` — billing portal page
  - `src/app/api/stripe/webhook/route.ts` — webhook handler
  - `src/app/api/stripe/checkout/route.ts` — checkout session creator
  - `src/lib/stripe.ts` — Stripe client (server-only)
  - `src/app/dashboard/settings/actions.ts` — `createBillingPortalSession()`
- **Schema**: Add `stripe_customer_id` to `organizations` table (new migration `0011_stripe.sql`)

---

**PRIORITY 6 — Usage quota enforcement per subscription tier**
- **Business impact**: CRITICAL. Without this, billing tiers have no meaning. A free user can make unlimited RAG queries. Unit economics are undefined.
- **Technical risk**: LOW. Rate limiting already exists as a pattern (`50/hour` check in `askAssistant()`). Tier-based quota is the same pattern with different thresholds.
- **Estimated time**: 4 hours (after Stripe is in place)
- **Dependencies**: Priority 5 (Stripe must set `subscription_tier` via webhook)
- **Expected ROI**: Validates unit economics; makes billing tiers real
- **File**: `src/app/dashboard/assistant/actions.ts` — add tier check before rate-limit check
- **Logic**: Read `membership.organization.subscription_tier` → look up monthly quota → compare to usage_events count for current month → block if exceeded

---

**PRIORITY 7 — Streaming RAG responses**
- **Business impact**: HIGH. A 5–6 second blank wait before getting an answer is a demo killer. Every investor demo, every customer trial will hit this. Streaming makes the AI feel instant and alive.
- **Technical risk**: MEDIUM. Requires converting a Server Action to a Route Handler (ReadableStream). The `openai.chat.completions.stream()` API is well-documented.
- **Estimated time**: 1 developer-day
- **Dependencies**: None
- **Expected ROI**: Demo quality improvement; reduces customer drop-off
- **Files to create/modify**:
  - `src/app/api/assistant/stream/route.ts` — new streaming route handler
  - `src/app/dashboard/assistant/chat.tsx` — consume ReadableStream token-by-token
  - Keep `askAssistant()` Server Action as fallback or deprecate after migration

---

**PRIORITY 8 — PDF and DOCX file upload to Knowledge Base**
- **Business impact**: HIGH. Real hospitality businesses store their SOPs, menus, and pricing in PDF and Word files. Asking them to paste text content is too high-friction for adoption. This is the #1 adoption blocker after billing.
- **Technical risk**: LOW. `pdf-parse` and `mammoth` are already production dependencies in `package.json`. The `ingestDocument()` pipeline already exists. Just need a file upload endpoint that extracts text and feeds it in.
- **Estimated time**: 2 developer-days
- **Dependencies**: None (libraries already installed)
- **Expected ROI**: Removes the biggest adoption friction point
- **Files to create/modify**:
  - `src/app/api/knowledge/upload/route.ts` — multipart form file upload handler
  - `src/app/dashboard/knowledge-base/actions.ts` — `createDocumentFromFile()` action
  - `src/app/dashboard/knowledge-base/page.tsx` — add file upload UI

---

### TIER 3: SPRINT 1B — UX AND RETENTION (4 developer-days)

**These tasks make customers stay. Do them after first customer acquisition.**

---

**PRIORITY 9 — Chat history persistence**
- **Business impact**: MEDIUM. Refresh loses all conversation. Staff who use the assistant daily re-type context repeatedly. Persistence drives retention.
- **Technical risk**: LOW. Pattern follows existing KB document storage. Create `chat_messages` table, load on mount, save on each exchange.
- **Estimated time**: 2 developer-days
- **Dependencies**: Priority 1 (migration infrastructure ready)
- **Expected ROI**: Retention improvement; professional product feel
- **Files**: New `0011_chat_messages.sql` migration + `src/app/dashboard/assistant/chat.tsx`

---

**PRIORITY 10 — Cursor-based pagination on all tables**
- **Business impact**: MEDIUM. After 200 CRM contacts, 100 KB documents, 50 audit log entries — rows are silently truncated. Users don't know data is missing. This is a trust issue.
- **Technical risk**: LOW. Supabase supports cursor-based pagination natively with `.range()`.
- **Estimated time**: 1 developer-day
- **Dependencies**: None
- **Files**: CRM, KB, audit log, and settings page components + their Server Actions

---

**PRIORITY 11 — KB: edit document + re-ingest**
- **Business impact**: MEDIUM. Documents can be created and deleted but not edited. Staff who make a mistake must delete and re-create. Basic content management gap.
- **Technical risk**: LOW. Follow `createDocument()` pattern. Delete existing chunks, re-embed updated content, update document record.
- **Estimated time**: 6 hours
- **Dependencies**: None
- **Files**: `src/app/dashboard/knowledge-base/actions.ts:updateDocument()` + UI form

---

**PRIORITY 12 — Read OrgSettings.ai in askAssistant()**
- **Business impact**: MEDIUM. `OrgSettings.ai.systemPromptPrefix` is in the TypeScript type definition and configurable via `updateOrgSettings()` — but `askAssistant()` never reads it. The hardcoded English system prompt is used for all customers.
- **Technical risk**: ZERO. One-line fix to read from org settings.
- **Estimated time**: 2 hours
- **Dependencies**: Priority 1 (org settings in DB)
- **Files**: `src/app/dashboard/assistant/actions.ts` — read `membership.organization.settings.ai.systemPromptPrefix`

---

**PRIORITY 13 — Commit Knowledge Cloud KC-1 to main**
- **Business impact**: MEDIUM (strategic). KC-1 Generator Engine is built and staged. Not committing it is a risk — staged code can be lost; it doesn't appear in git history; contributors can't see it.
- **Technical risk**: LOW. Fix the 3 critical issues first: add GeneratorPipeline interface, fix IMetadataExtractor incompleteness, remove fs.readFileSync from pure builder.
- **Estimated time**: 1 day (fix issues + commit)
- **Dependencies**: Work happens in `eunoia-knowledge-cloud` repo
- **Expected ROI**: Locks in progress; enables KC-2 Registry sprint

---

**PRIORITY 14 — Fix ESLint 13 errors**
- **Business impact**: LOW-MEDIUM. CI would fail on strict lint. Code quality signal for any future hire or investor technical review.
- **Technical risk**: ZERO. All 13 errors are `@typescript-eslint/no-explicit-any` and unused variables.
- **Estimated time**: 2 hours
- **Files**: `src/lib/knowledge/importer/validator/index.ts` (2 `no-explicit-any`, 2 unused vars) + `scripts/*`

---

**PRIORITY 15 — Fix TypeScript error in quality-report.ts**
- **Business impact**: LOW. Scripts-only error. Doesn't affect the application. Does affect `npx tsc --noEmit` output and developer confidence.
- **Technical risk**: ZERO. Missing type import (`FileMetadata`).
- **Estimated time**: 30 minutes
- **File**: `scripts/knowledge/quality-report.ts:58` — import `FileMetadata` from correct location

---

### TIER 4: SPRINT 2 — MARKET FIT (3 weeks)

**These tasks are required to penetrate the actual target market. Do them after Sprint 1 produces revenue.**

---

**PRIORITY 16 — Arabic RTL UI**
- **Business impact**: HIGH (strategic). Egyptian diving centers and MENA hotels operate in Arabic. The UI is entirely English. This is the biggest market fit gap.
- **Technical risk**: HIGH. Full i18n requires: i18n library (next-intl recommended), RTL CSS layout changes, Arabic translation of all UI strings, Arabic-first user testing.
- **Estimated time**: 2–3 weeks
- **Dependencies**: Product-market fit confirmed in English first
- **Expected ROI**: Opens the actual target market

---

**PRIORITY 17 — Knowledge Package Manager (KPM) — MVP**
- **Business impact**: HIGH (strategic). The KPM is the core of the Knowledge Cloud moat. Without it, the Knowledge Cloud is just a standalone tool with no connection to the AI OS.
- **Technical risk**: HIGH. New architectural component; requires stable contracts (manifest.json schema, resolver API) frozen before starting.
- **Estimated time**: 2 weeks
- **Dependencies**: KC-1 committed to KC main; KC-2 Registry built; stable manifest schema frozen
- **Expected ROI**: Activates the knowledge platform moat

---

**PRIORITY 18 — Guest-facing chatbot widget**
- **Business impact**: HIGH. A diving center can embed an AI chatbot on their booking website that answers questions from their knowledge base. This is the virality mechanism — their customers see "Powered by Eunoia" → discovery.
- **Technical risk**: MEDIUM. New embeddable widget (iframe or Web Component) with public API key auth.
- **Estimated time**: 1 week
- **Expected ROI**: Viral distribution; enterprise upsell argument

---

**PRIORITY 19 — Commit untracked migrations 0003–0006 to git**
- **Business impact**: MEDIUM (operational risk). Migrations 0003–0006 exist in the project but are not tracked in git. If these files are lost, reproducing the production DB schema from scratch is impossible.
- **Technical risk**: LOW. Run `git add supabase/migrations/0003_* 0004_* 0005_* 0006_*` and commit.
- **Estimated time**: 10 minutes
- **Dependencies**: None
- **Expected ROI**: Eliminates operational risk; makes migrations reproducible

---

**PRIORITY 20 — Merge production branch to main**
- **Business impact**: MEDIUM (technical hygiene). `eunoia-ai-os-platform` branch is 30+ commits ahead of `main`. The GitHub default branch (`main`) is stale. Any new developer or contributor cloning the repo gets the wrong code.
- **Technical risk**: LOW. No merge conflicts expected — main has no divergent changes.
- **Estimated time**: 30 minutes (create PR, review, merge)
- **Dependencies**: None
- **Expected ROI**: Correct git history; enables clean contributor onboarding

---

## SUMMARY TABLE — TOP 20

| # | Task | Category | Effort | Business Impact | Risk |
|---|------|----------|--------|----------------|------|
| 1 | Apply migrations 0007–0010 | Config | 30 min | CRITICAL | LOW |
| 2 | Set RESEND_API_KEY in Vercel | Config | 5 min | CRITICAL | ZERO |
| 3 | Set SENTRY_DSN in Vercel | Config | 5 min | HIGH | ZERO |
| 4 | Set METRICS_TOKEN in Vercel | Config | 5 min | MEDIUM | ZERO |
| 5 | Stripe billing + webhooks | Code | 3 days | CRITICAL | MEDIUM |
| 6 | Usage quota enforcement | Code | 4 hrs | CRITICAL | LOW |
| 7 | Streaming RAG | Code | 1 day | HIGH | MEDIUM |
| 8 | PDF/DOCX file upload | Code | 2 days | HIGH | LOW |
| 9 | Chat history persistence | Code | 2 days | MEDIUM | LOW |
| 10 | Pagination (all tables) | Code | 1 day | MEDIUM | LOW |
| 11 | KB document edit + re-ingest | Code | 6 hrs | MEDIUM | LOW |
| 12 | Read OrgSettings.ai in RAG | Code | 2 hrs | MEDIUM | ZERO |
| 13 | Commit KC-1 to KC main | KC Repo | 1 day | MEDIUM | LOW |
| 14 | Fix ESLint 13 errors | Code | 2 hrs | LOW | ZERO |
| 15 | Fix TS error quality-report.ts | Code | 30 min | LOW | ZERO |
| 16 | Arabic RTL UI | Code | 3 weeks | HIGH | HIGH |
| 17 | KPM MVP | Code | 2 weeks | HIGH | HIGH |
| 18 | Guest chatbot widget | Code | 1 week | HIGH | MEDIUM |
| 19 | Commit migrations 0003–0006 | Git | 10 min | MEDIUM | ZERO |
| 20 | Merge branch to main | Git | 30 min | MEDIUM | LOW |

---

## RECOMMENDED NEXT SPRINT

**Sprint 1A — Revenue Unlock (target: 10 developer-days)**

```
Day 1 (morning): Apply all migrations, set all Vercel env vars [Priorities 1–4]
Day 1–3: Stripe billing + checkout + webhook + tier update [Priority 5]
Day 4 (half day): Usage quota enforcement in askAssistant() [Priority 6]
Day 5: Streaming RAG (route handler + chat UI update) [Priority 7]
Day 6–7: PDF/DOCX file upload [Priority 8]
Day 8: KB document edit + re-ingest + ESLint + TS fix [Priorities 11, 14, 15]
Day 9: Read OrgSettings.ai in RAG + chat history [Priorities 12, partial 9]
Day 10: Pagination [Priority 10]
```

**Definition of "Sprint 1A DONE"**:
- A real company can sign up, invite their team (emails arrive), upload PDFs, get AI answers (streaming), manage their CRM, and pay by credit card.
- Stripe webhook correctly updates `subscription_tier`.
- Quota enforcement blocks free users after 100 RAG queries/month.
- All 4 Vercel env vars set.
- All 5 migrations applied to production.
- ESLint: 0 errors. TypeScript: 0 errors (src/). Tests: ≥309 passing.

**After Sprint 1A**: Get the first paying customer. Then decide whether Sprint 1B (Arabic UI) or Sprint 2 (KPM) is higher ROI based on that customer's feedback.
