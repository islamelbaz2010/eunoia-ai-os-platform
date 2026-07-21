# PROJECT_CONTEXT.md
**Forensic audit generated**: 2026-07-07  
**Auditor**: Founder's CTO — Forensic Pre-Investor Review  
**Branch audited**: `eunoia-ai-os-platform`  
**Git SHA**: acaa6be

---

## 1. Business Vision

**Eunoia AI OS** is a multi-tenant B2B SaaS AI operating system for the MENA hospitality industry.

**Core thesis**: Hotels and diving centers in Egypt, UAE, and Saudi Arabia have unstructured institutional knowledge locked in PDFs, SOPs, and WhatsApp threads. Staff waste hours asking the same questions. Eunoia lets managers upload their knowledge once and gives every staff member a cited, accurate AI assistant that answers from their own documents — never from general internet knowledge.

**Beachhead**: Egyptian diving centers (Hurghada, Sharm El-Sheikh). Low friction, high pain, early adopter profile.  
**Expansion**: Hotels → hotel groups → regional chains → enterprise.

**Revenue model**:
| Tier | Monthly Seats | RAG Queries/mo | Price |
|------|--------------|----------------|-------|
| Starter | 5 | 100 | $99 |
| Professional | 25 | 1,000 | $299 |
| Enterprise | Unlimited | Unlimited | $499+ |

**Unit economics**: Infra cost ~$5–10/customer/month → ~95% gross margin target.

**Domain**: eunoiaos.com (not yet verified as live)  
**Demo URL**: https://eunoia-ai-os-platform.vercel.app  
**Languages in scope**: English, Arabic, Russian, Italian

---

## 2. Current Architecture

```
BROWSER
  └── React 19 Client Components
          │ HTTPS
VERCEL EDGE
  └── proxy.ts (Next.js 16 Proxy — NOT middleware.ts)
      ├── Public: /, /login, /signup, /auth/callback, /api/health, /api/live
      └── Protected: /dashboard/**, /api/admin/**, /api/crm/**
          │
VERCEL FUNCTIONS (Next.js 16 App Router)
  ├── Server Components — SSR pages, read from DAL
  ├── Server Actions — ALL mutations (Zod v4 → verifySession → org-scope → Supabase)
  └── Route Handlers — health, metrics, CRM CSV, AI insights
          │
    SUPABASE (PostgreSQL + GoTrue + pgvector)         OPENAI API
    ├── Tables: organizations, profiles,              ├── text-embedding-3-small
    │   organization_members, crm_contacts,           │   (1536 dims, batch 512)
    │   knowledge_base_documents,                     └── gpt-4o-mini
    │   knowledge_base_chunks (pgvector),                 (max 1024 output tokens)
    │   audit_logs, usage_events,
    │   organization_invites
    │   CRM extension: crm_tags, crm_contact_tags,
    │   crm_timeline_events, crm_activities
    │   Enterprise: permissions, role_permissions, member_permissions
    └── RLS enabled on ALL tables (security boundary)

LOCAL KNOWLEDGE PIPELINE (transitional — separate subsystem)
  └── src/lib/knowledge/ (KB-1, KB-1.1, KB-2, Importer)
      ├── INTENTIONAL in-memory design — will become KPM consumer
      ├── Processes founder's own assets through a local pipeline
      └── NOT connected to Supabase by design (transitional toward KB-3)

KNOWLEDGE CLOUD (independent producer — separate repository)
  └── @eunoia/knowledge-cloud
      ├── KC-1 Generator Engine (staged, not committed to main)
      └── Generates → Knowledge Packs → KPM (not yet built) → Supabase
```

**FINAL ARCHITECTURE** (user-canonical — authoritative):
```
Knowledge Cloud → Knowledge Packs → KPM → Knowledge Repository Adapter
  → Supabase → RAG → AI Assistants → CRM → Business Intelligence → Customer
```

**ARCHITECTURE NOTE**: The `src/lib/knowledge/` subsystem (KB-1, KB-1.1, KB-2, Importer) is an **intentionally in-memory, transitional** knowledge processing library. It is being redesigned per KB-3 approval to become a KPM consumer that installs Knowledge Packs from Knowledge Cloud. The in-memory `KnowledgeRepository` is NOT a bug — it is the current implementation target before the KPM is built. See `docs/architecture/AI_OS_ALIGNMENT_REPORT.md` for the approved KB-3 conditions. The RAG Assistant queries `knowledge_base_chunks` via Supabase — this is the production path that serves customers today.

---

## 3. Tech Stack (Verified from Source)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.9 | Uses `proxy.ts` (not `middleware.ts`) |
| UI | React | 19.2.4 | `useActionState` (not `useFormState`) |
| Language | TypeScript | ^5 | Strict mode |
| CSS | Tailwind | v4 | `@import "tailwindcss"` syntax |
| Database | Supabase | PostgreSQL 15 + pgvector | RLS on all tables |
| Auth | Supabase GoTrue | — | HTTP-only cookies, PKCE |
| Embeddings | OpenAI | text-embedding-3-small | 1536 dims |
| Chat | OpenAI | gpt-4o-mini | Blocking (no streaming) |
| Validation | Zod | v4.4.3 | `.issues[0]?.message` pattern |
| Testing | Vitest | ^4.1.9 | 309 tests, 9 files |
| Email | Resend | ^6.16.0 | Missing API key in Vercel |
| Error tracking | Sentry | ^10.62.0 | Missing DSN in Vercel |
| Charts | Recharts | ^3.8.1 | — |
| Deployment | Vercel | — | Pro plan, Fluid Compute |
| CI | GitHub Actions | — | `.github/workflows/ci.yml` |
| PM2 | ecosystem.config.js | — | Self-hosted fallback |
| Node | 20+ | .nvmrc pins 20 | — |

---

## 4. Investor Summary

**Stage**: Pre-seed / Pre-revenue  
**Status**: Live production URL. Working product. Zero paying customers.  
**Completed**: Auth, multi-tenant RBAC, CRM (full), Knowledge Base (add/delete), RAG Assistant, Audit Logs, Usage Tracking, Health monitoring, Enterprise Knowledge Layer (local only), CSV import/export.  
**Missing**: Stripe billing (no revenue collection possible), streaming AI, PDF upload, Arabic RTL UI, pagination, chat persistence.

**Investor pitch alignment**:
- ✅ Working demo available at vercel URL
- ✅ Multi-tenant architecture with RLS
- ✅ AI-powered RAG with citation
- ✅ Enterprise knowledge governance model (KB-2)
- ❌ Cannot charge money (no Stripe)
- ❌ No paying customers
- ❌ Arabic interface (stated target market speaks Arabic)
- ❌ No mobile app

---

## 5. Current Completion %

| Layer | Completed |
|-------|-----------|
| Authentication | 95% |
| Multi-tenant RBAC | 90% |
| CRM | 80% (missing: bulk ops, email sequences) |
| Knowledge Base (SaaS) | 65% (missing: edit, re-ingest, PDF upload, search UI) |
| RAG Assistant | 70% (missing: streaming, history, multi-turn) |
| Team Management | 85% (missing: SSO, bulk invite) |
| Billing/Monetization | 0% |
| Knowledge Layer (transitional pipeline) | 90% of current scope (INTENTIONAL in-memory; KPM/sync is KB-3, not a gap) |
| Observability | 80% (Sentry DSN missing in prod) |
| Testing | 55% (no Server Action tests, no E2E) |
| **Platform Overall** | **~68%** |

---

## 6. Commercial Readiness

**Score**: 55% (NOT 65% as claimed in CURRENT_STATE.md)

**Blockers for first paid customer**:
1. No Stripe integration — cannot accept payment
2. No usage quota enforcement per tier
3. Invite emails not working in production (RESEND_API_KEY missing)
4. No PDF/DOCX upload (users must paste content)
5. RAG blocks for 5–6 seconds (UX blocker for demos)

**Enablers already working**:
- Full auth flow including password reset
- Multi-org with org switcher (newly implemented)
- CRM with pipeline, timeline, tags, activities, CSV import/export
- RAG with source citations and rate limiting
- Audit logging and usage tracking

---

## 7. Production Readiness

**Score**: 72/100 (NOT 87/100 as claimed in CURRENT_STATE.md)

**Degradations**:
- Sentry DSN not configured in Vercel → errors invisible in production
- METRICS_TOKEN not set → Prometheus endpoint publicly accessible
- Migrations 0007/0008 not applied → usage page RPC fails
- RESEND_API_KEY not set → team invites silently fail
- TypeScript has 1 error (scripts/knowledge/quality-report.ts)
- ESLint has 13 errors in production code

---

## 8. Missing Modules (Critical Gaps)

| Module | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Stripe billing + webhooks | P0 — BLOCKING | 3 days | Revenue |
| Usage quota enforcement | P0 — BLOCKING | 4 hours | Unit economics |
| Streaming RAG (SSE/ReadableStream) | P1 | 1 day | Demo quality |
| PDF/DOCX file upload to KB | P1 | 2 days | Core use case |
| Chat history persistence | P1 | 2 days | UX retention |
| Pagination (all tables) | P1 | 1 day | Scalability |
| KB: edit + re-ingest document | P1 | 6 hours | Content lifecycle |
| Arabic RTL UI | P1 | 2 weeks | Target market |
| KPM (Knowledge Package Manager) | P2 | 2 weeks | KB-3 core component — connects KC to AI OS |
| Knowledge Repository Adapter | P2 | 1 week | Required for KPM → Supabase bridge |
| PWA icons | P3 | 1 hour | Install experience |
| E2E tests (Playwright) | P2 | 3 days | Release confidence |

---

## 9. Technical Debt

| Item | Severity | File | Notes |
|------|----------|------|-------|
| ESLint 13 errors | HIGH | validator/index.ts, scripts/* | CI would fail on lint |
| TS error in quality-report.ts | MEDIUM | scripts/knowledge/quality-report.ts | Missing `FileMetadata` type |
| Migration conflict (0009 × 4 versions) | HIGH | supabase/migrations/ | Risk of applying wrong version |
| KnowledgeRepository in-memory only | INTENTIONAL/TRANSITIONAL | src/lib/knowledge/repository/service.ts | Will become KPM consumer per KB-3 approval — NOT a bug |
| Sequential canonical IDs reset on restart | HIGH | src/lib/knowledge/knowledge.ts:34 | KB-000001 → collisions |
| `_assetSeq` global in-process counter | HIGH | knowledge.ts:34 | Not safe in serverless |
| CSP `script-src 'unsafe-inline'` | MEDIUM | next.config.ts:35 | XSS attack surface |
| Hardcoded hospitality prompt | MEDIUM | assistant/actions.ts:114 | Not org-configurable |
| `getActiveMemberships` used in API routes | MEDIUM | Multiple API routes | Gets ALL memberships, not active org |
| BUGS.md stale (org-switcher, Sentry) | LOW | .claude/BUGS.md | Closed issues still listed as open |
| CURRENT_STATE.md incorrect metrics | LOW | .claude/CURRENT_STATE.md | Claims clean TS/lint/tests |
| Dead scaffold SVGs | LOW | public/ | 5 unreferenced files |
| `src/app/api/status/` empty dir | LOW | — | Creates false endpoint expectation |

---

## 10. Roadmap (Forensic)

### Sprint A — Revenue Unlock (2 weeks)
- Stripe billing (Starter $99/mo, Pro $299/mo, Enterprise $499+)
- Usage quota enforcement per tier
- Fix RESEND_API_KEY in Vercel
- Fix METRICS_TOKEN in Vercel
- Apply migrations 0007 + 0008 to production

### Sprint B — Core UX (2 weeks)
- Streaming RAG responses
- PDF/DOCX upload to Knowledge Base
- KB: edit + re-ingest document
- Chat history persistence
- Cursor-based pagination (CRM, KB, Audit, Settings)

### Sprint C — Market Fit (4 weeks)
- Arabic RTL UI (full interface translation)
- Multi-language RAG retrieval
- Guest-facing chatbot widget (embeddable)
- PMS integration hooks (Opera, Protel)

### Sprint D — Enterprise (6–8 weeks)
- SSO / SAML
- White-labeling
- REST API
- Data export (CSV/Excel per module)
- KnowledgeRepository → Supabase bridge (local KB → cloud search)

---

## 11. Current Active Branch

**Branch**: `eunoia-ai-os-platform`  
**Ahead of main by**: 30+ commits (entire CRM Sprint 1 + knowledge layer + audit)  
**Should be merged to main**: Yes — this is the production branch.  
**sprint-2 branch**: Some CRM UI fixes. Verify if fully merged.  
**feature/knowledge-brain**: Experimental. Merged into current branch.

---

## 12. Development Rules

1. `proxy.ts` at root (not `middleware.ts`) — Next.js 16
2. `verifySession()` FIRST in every Server Action
3. Always `.eq("organization_id", membership.organization.id)` — never trust client-supplied org
4. `hasRole(membership.role, "admin")` before any destructive operation
5. `void logAuditEvent({...})` — fire-and-forget
6. `logger.error/warn/info` — NEVER `console.error/log`
7. Zod v4: `parsed.error.issues[0]?.message` not `.errors[0]`
8. `import "server-only"` on all secret-adjacent server files
9. `SUPABASE_SERVICE_ROLE_KEY` — scripts ONLY, never in cloud env
10. Never edit existing migrations — create a new one

---

## 13. Definition of Done

- [ ] `npx tsc --noEmit` → 0 errors (src/ scope — scripts excluded)
- [ ] `npm run lint` → 0 errors
- [ ] `npm test` → all 309 tests passing
- [ ] New Server Actions have at least 1 unit test
- [ ] `verifySession()` called at top of every Server Action
- [ ] Every query scoped to `organization_id`
- [ ] No `console.log/error/warn` in src/
- [ ] No dead code, no TODO comments
- [ ] Audit event logged for every mutation
- [ ] New DB tables have RLS enabled + SELECT policy
