# ARCHITECTURE REVIEW
**Date**: 2026-07-12  
**Perspective**: Principal Architect / CTO

---

## Stack Summary

| Layer | Technology | Version | Assessment |
|-------|-----------|---------|-----------|
| Framework | Next.js | 16.2.9 | Modern App Router; SSR + RSC + Server Actions |
| Runtime | React | 19.2.4 | useActionState (correct — not deprecated useFormState) |
| Language | TypeScript | 5.x | Strict mode; 0 errors |
| Styling | Tailwind CSS | v4 | @import syntax (correct — not v3 @tailwind) |
| Validation | Zod | v4.4.3 | issues[0] not errors[0] (correct) |
| Auth | Supabase GoTrue | — | JWT + HTTP-only cookies + PKCE |
| Database | Supabase Postgres | — | pgvector extension, Row-Level Security |
| Vector search | pgvector HNSW | — | Cosine similarity; no separate vector DB dependency |
| AI generation | OpenAI GPT-4o-mini | — | Streaming via openai SDK |
| AI embedding | OpenAI text-embedding-3-small | — | 1536-dim vectors |
| Email | Resend | — | Invite emails + demo requests |
| Payments | Stripe | ^22.3.0 | Checkout + Portal + Webhooks |
| Error tracking | Sentry | v10.62.0 | Client + server + edge configs |
| Metrics | Prometheus | — | `/api/metrics` with Bearer auth |
| Deployment | Vercel | — | Fluid Compute (serverless) |
| CI | GitHub Actions | — | lint + tsc + test |

---

## Architecture Strengths

### 1. Multi-Tenancy Done Right

The multi-tenant isolation model is the strongest part of this architecture. Every database table has an `organization_id` column. PostgreSQL Row-Level Security policies enforce that reads and writes are scoped to the authenticated user's org. The app layer adds `getActiveOrganization()` as a second layer of defense.

The result: a bug in the app layer (forgetting to filter by org_id) is caught by RLS at the database level. Data cannot leak between organizations even if the app code is wrong.

This is the correct model for SaaS. Many products get this wrong by trusting app-layer filtering alone.

### 2. Server Actions as the Security Boundary

All mutations go through Server Actions (Next.js 16). Every action calls `verifySession()` at the top, which calls Supabase's `auth.getUser()` and wraps in `cache()` for deduplication. This prevents unauthenticated mutations from a client that bypasses form submissions.

The pattern is consistent: action → verifySession() → getActiveOrganization() → Zod validate → DB query with org_id → audit log.

### 3. RAG Pipeline Quality

The RAG implementation is production-quality:
- Chunking with configurable overlap (not whole-document embedding)
- text-embedding-3-small (better multilingual than ada-002, cheaper than text-embedding-3-large)
- HNSW index for sub-10ms vector retrieval at millions of vectors
- 0.3 similarity threshold (prevents hallucionation from low-confidence retrievals)
- Citation markers `[SOURCE N]` in the prompt, extracted in response
- Streaming SSE: sources arrive before the first token

### 4. Proxy vs Middleware

The code correctly uses `proxy.ts` at the project root, exporting `proxy()` — consistent with Next.js 16 conventions. The public routes list is comprehensive and correct, including Stripe webhook and Sentry tunnel.

### 5. Request Correlation

Every response (page, API, SSE) includes `X-Request-ID`. The ID is either forwarded from an upstream header or generated fresh. This enables end-to-end tracing across logs.

---

## Architecture Concerns

### 1. Migration State Fragmentation

Four migration files for "0009" exist in the repo:
- `0009_enterprise_multitenant.sql` — original (deprecated)
- `0009_enterprise_multitenant_fixed.sql` — revision (deprecated)
- `0009a_enum_roles.sql` — current (correct)
- `0009b_enterprise_schema.sql` — current (correct)

And two for "0010":
- `0010_crm_platform.sql` — original (deprecated)
- `0010_crm_platform_fixed.sql` — current (correct)

This creates production deployment risk. An operator could apply the wrong file. The deprecated files should be moved to `supabase/migrations/deprecated/` with a README explaining why.

**Risk level**: Medium — could cause production DB state issues.

### 2. Dashboard Aggregation (Known, Acknowledged)

`getUsageOverTime()` fetches up to 2000 `usage_events` rows and aggregates in JavaScript. `getContactStatusBreakdown()` fetches up to 5000 `crm_contacts` rows and counts in JavaScript.

The code comments acknowledge this and note it's safe at early-stage traffic. For scale:
- `getUsageOverTime()` should use `SELECT DATE_TRUNC('day', created_at), COUNT(*) GROUP BY 1`
- `getContactStatusBreakdown()` should use `SELECT status, COUNT(*) GROUP BY 1`

Both are migrations + minor action file changes. ~2 hours of work. Not exhibition-blocking.

### 3. No Analytics/Tracking Layer

There is no Posthog, Amplitude, or GA4 installed. After Tuesday's exhibition, you'll want to know:
- How many people visited the landing page?
- What's the signup conversion rate?
- Where do users drop off in onboarding?
- Which Knowledge Base documents are queried most?

Adding Posthog (`@posthog/js`) is a 30-minute task. Do it before the exhibition ends.

### 4. Heavy Production Dependencies

In `package.json` production dependencies include: `mammoth` (Word doc parsing), `pdf-parse` (PDF parsing), `natural` (NLP), `chokidar` (file watching), `fast-glob`.

None of these are used in the current feature set (text-paste-only KB, no file watching in production). They're either imported but unused or leftover from planned features. This adds unnecessary bundle weight and attack surface.

**Recommendation**: `npm uninstall mammoth pdf-parse natural chokidar fast-glob` — unless file upload is on the immediate roadmap.

### 5. Org Switcher Cookie Security

The active org cookie `eunoia-active-org` is validated against the user's memberships in `getActiveOrganization()`. If the cookie contains an invalid org ID, it falls back to the first membership. This is correct.

However, the cookie is not `HttpOnly` (it's read by client-side code in `org-switcher.tsx`). This is intentional (the switcher needs to read it) but means XSS could manipulate which org is active. The real defense is that RLS doesn't care which org the cookie says — the database enforces the actual membership.

---

## Scalability Path

| Component | Current Limit | Path to Scale |
|-----------|-------------|--------------|
| Supabase DB | Supabase managed (~2M rows easily) | Move to Supabase Pro or custom RDS |
| pgvector HNSW | Sub-10ms at 1M vectors | Partitioned by org_id if needed |
| Vercel compute | 300s max execution (Fluid Compute) | No change needed |
| OpenAI | Rate limits per key | Multiple keys, request queuing |
| RAG query rate limit | 50/hr per user | Adjustable per plan |

The architecture scales to ~10,000 organizations without code changes. Above that, consider partitioning the vector table by organization.

---

## What I Would Change (If Starting Over)

1. **Analytics from Day 1**: Posthog or Mixpanel installed in the codebase before the first user
2. **Background job system**: Long-running embeddings should be queued (Vercel Queues or Inngest), not inline with the Server Action
3. **pgvector partitioning**: Partition `knowledge_base_chunks` by `organization_id` from the start
4. **Migration discipline**: One `_fixed` file per sequence, never two variants for the same migration

Everything else is solid. The architecture is better than 80% of Series A companies.
