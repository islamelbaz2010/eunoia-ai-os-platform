# 14 — Technical Debt

All known technical debt verified against current source code (2026-06-28). Categorized by risk and effort.

---

## Critical

### TD-001: No Email Delivery for Invites
**What**: `organization_invites` stores a token but there is no email-sending code. The admin must manually copy and share the invite URL (`/invite?token=...`).  
**Risk**: Renders the invite feature unusable in production without manual workaround.  
**Impact**: Customer onboarding is blocked; cannot invite teammates without out-of-band coordination.  
**Effort**: Medium — add Resend/SendGrid integration, send email in `createInvite()` server action.  
**Files**: `src/app/dashboard/settings/actions.ts:createInvite()`

### TD-002: No Password Reset
**What**: No "Forgot password" link on the login page. No route handles password reset.  
**Risk**: Users who forget their password have no self-service path and must contact support.  
**Impact**: Customer support burden; churn risk.  
**Effort**: Low — Supabase supports password reset with `supabase.auth.resetPasswordForEmail()`. Add a link + route.  
**Files**: `src/app/login/page.tsx`, `src/lib/auth/actions.ts`

---

## High

### TD-003: No Organization Switcher
**What**: `getActiveOrganization()` always returns `memberships[0]`. Users can belong to multiple orgs (and own up to 3) but have no way to switch context in the UI.  
**Risk**: Users with multiple org memberships can only see their first org's data.  
**Impact**: Enterprise customers with multiple properties cannot use the product correctly.  
**Effort**: Medium — add org switcher to sidebar, store active org in cookie/session.  
**Files**: `src/lib/auth/dal.ts:getActiveOrganization()`, `src/app/dashboard/layout.tsx`

### TD-004: Usage Page O(N) JavaScript Aggregation
**What**: `usage/page.tsx` loads up to 10,000 events into the server's JavaScript and aggregates by `event_type` in a `reduce()`. Should use SQL `GROUP BY`.  
**Risk**: Slow and memory-inefficient for orgs with high usage. Will break for >10,000 events (hard limit).  
**Impact**: Performance degradation for high-volume customers; inaccurate data at scale.  
**Effort**: Low — replace with `SELECT event_type, SUM(quantity) FROM usage_events GROUP BY event_type WHERE org_id = ...`.  
**Files**: `src/app/dashboard/usage/page.tsx`

### TD-005: Dashboard KPI Charts O(N) JavaScript Aggregation
**What**: `dashboard/page.tsx` loads up to 2000 usage events and 5000 contacts in JavaScript for chart aggregation.  
**Risk**: Memory pressure on serverless functions; slow response times.  
**Impact**: Dashboard performance degradation.  
**Effort**: Low — use Postgres `DATE_TRUNC('day', created_at)` for time series, SQL COUNT+GROUP for status breakdown.  
**Files**: `src/app/dashboard/page.tsx:getUsageOverTime()`, `src/app/dashboard/page.tsx:getContactStatusBreakdown()`

### TD-006: Missing PWA Icons
**What**: `public/icon.png` (192×192) and `public/icon-512.png` (512×512) are referenced in `manifest.ts` but not present in the `public/` directory.  
**Risk**: PWA "Add to Home Screen" feature is broken; browser console shows 404 errors.  
**Impact**: Broken manifest reduces SEO trust score; PWA install fails.  
**Effort**: Trivial — design and upload the icon files.  
**Files**: `src/app/manifest.ts`, `public/`

### TD-007: No RAG Streaming
**What**: `askAssistant()` makes a blocking call to GPT-4o-mini with `stream: false`. User sees "Thinking..." for the full duration.  
**Risk**: Poor UX for long answers (3–10+ seconds of blank waiting).  
**Impact**: Perceived performance; user abandonment.  
**Effort**: Medium — use Next.js streaming + `readableStream` with OpenAI streaming API.  
**Files**: `src/app/dashboard/assistant/actions.ts`, `src/app/dashboard/assistant/chat.tsx`

---

## Medium

### TD-008: No CRM Edit / Delete
**What**: Contacts can be created but not edited or deleted from the UI.  
**Risk**: Data quality degrades over time (cannot fix typos, remove duplicates).  
**Impact**: CRM becomes cluttered; reduces product value.  
**Effort**: Medium — add edit modal + delete button with RLS-appropriate delete action.  
**Files**: `src/app/dashboard/crm/page.tsx`, `src/app/dashboard/crm/actions.ts`

### TD-009: No KB Document Edit / Delete / Re-ingest
**What**: Documents can be added but not edited, deleted, or re-ingested from the UI.  
**Risk**: Stale or incorrect documents cannot be updated.  
**Impact**: Knowledge base accuracy degrades over time.  
**Effort**: Medium — add edit form + delete button. Re-ingest triggers `ingestDocument()` again (it already deletes old chunks first).  
**Files**: `src/app/dashboard/knowledge-base/page.tsx`, `src/app/dashboard/knowledge-base/actions.ts`

### TD-010: No Conversation Persistence
**What**: RAG chat history is stored in React local state only — refreshing the page loses all messages.  
**Risk**: Poor UX; users must repeat questions.  
**Impact**: Product feels primitive compared to competitors.  
**Effort**: Medium — add a `conversations` table + persist messages.  
**Files**: `src/app/dashboard/assistant/chat.tsx`

### TD-011: Sources Not Displayed
**What**: `askAssistant()` returns `{ answer, sources }` but `chat.tsx` only renders `answer`. Sources (with similarity scores and content) are discarded.  
**Risk**: Users cannot verify where answers came from.  
**Impact**: Trust and transparency; enterprise customers expect auditability.  
**Effort**: Low — render the `sources` array below each assistant message.  
**Files**: `src/app/dashboard/assistant/chat.tsx`, `src/app/dashboard/assistant/actions.ts`

### TD-012: No File Upload for KB
**What**: Knowledge base only accepts text paste. No PDF, DOCX, or URL ingestion.  
**Risk**: Hospitality businesses have existing SOPs in PDF format.  
**Impact**: Friction in onboarding; users must manually convert documents to text.  
**Effort**: High — requires file parsing library (pdf-parse, mammoth for DOCX) + Supabase Storage for file storage.

### TD-013: No Pagination
**What**: CRM (limit 200), KB (limit 100), audit logs (limit 50), usage (limit 10,000). No pagination UI exists.  
**Risk**: Data is silently truncated for organizations with many records.  
**Impact**: Invisible data loss for power users.  
**Effort**: Low–Medium — add cursor-based pagination.  
**Files**: `crm/page.tsx`, `knowledge-base/page.tsx`, `audit-logs/page.tsx`, `usage/page.tsx`

### TD-014: `eunoia-ai-os-app` Repo is Unused
**What**: The `eunoia-ai-os-app` repository contains only a default Next.js scaffold and one Excel file. It has never been developed.  
**Risk**: Cognitive overhead; confusion about which repo is the real app.  
**Impact**: Developer onboarding confusion.  
**Effort**: Trivial — either delete it or define its purpose (mobile app? marketing site?).

### TD-015: No Rate Limiting on RAG
**What**: `askAssistant()` has no rate limiting. A single user could spam queries causing significant OpenAI costs.  
**Risk**: Cost runaway from abuse or runaway loops.  
**Impact**: Unexpected OpenAI API bill.  
**Effort**: Low–Medium — add Vercel KV or Upstash Redis for per-org rate limiting.  
**Files**: `src/app/dashboard/assistant/actions.ts`

---

## Low

### TD-016: Empty Loading Skeletons
**What**: `loading.tsx` files exist in all dashboard routes but contain minimal placeholder content (not proper skeleton screens).  
**Risk**: Poor perceived performance during server component data fetching.  
**Impact**: UX polish.  
**Effort**: Low — add Tailwind CSS skeleton shimmer components.

### TD-017: No Email Verification Enforcement
**What**: After signup, users are immediately redirected to `/dashboard`. If Supabase requires email verification, this creates an odd state. If it doesn't, unverified users gain access.  
**Risk**: Spam accounts; data quality.  
**Effort**: Low — handle the "email not confirmed" state in the signup action or add a verification pending page.

### TD-018: `api/status` Directory Exists but is Empty
**What**: `src/app/api/status/` directory exists in the file system but contains no files.  
**Risk**: None — it's an empty directory.  
**Effort**: Trivial — either add a status route or delete the directory.  
**Files**: `src/app/api/status/` (empty)

### TD-019: `console.error` in KB Actions
**What**: `src/app/dashboard/knowledge-base/actions.ts` line 83 uses `console.error` instead of the structured `logger`.  
**Risk**: Inconsistent log format; may not parse correctly in Vercel logs.  
**Effort**: Trivial — replace with `logger.error(...)`.  
**Files**: `src/app/dashboard/knowledge-base/actions.ts:83`

### TD-020: `auth/callback/route.ts` Uses `console.error`
**What**: `src/app/auth/callback/route.ts` uses `console.error` instead of `logger`.  
**Effort**: Trivial.  
**Files**: `src/app/auth/callback/route.ts:15`

### TD-021: No Sentry Integration
**What**: The memory notes reference Sentry as pending. No Sentry SDK is installed.  
**Risk**: Errors in production are not monitored.  
**Effort**: Low — `npm install @sentry/nextjs`, add DSN to env.

### TD-022: Multi-Language Retrieval Not Language-Aware
**What**: Documents are tagged with a language (`en`, `ar`, `ru`, `it`) but `match_kb_chunks` does not filter by language. An Arabic question will search all chunks regardless of language.  
**Risk**: Suboptimal retrieval quality when mixing languages.  
**Impact**: Product quality for Arabic/Russian/Italian content.  
**Effort**: Low — add optional `target_language text DEFAULT NULL` parameter to `match_kb_chunks` RPC.
