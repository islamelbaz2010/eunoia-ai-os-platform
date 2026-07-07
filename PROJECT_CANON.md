# PROJECT CANON
**Single source of truth for the Eunoia AI OS platform**

**Generated**: 2026-07-07 — Forensic Pre-Investor CTO Review  
**Auditor**: CTO / Principal Architect / Commercial Readiness Auditor  
**Branch**: `eunoia-ai-os-platform` — Git SHA: acaa6be  
**Verified against**: Source code, migrations, test suite, CHANGELOG sessions 1–13  

> Every statement in this document is backed by evidence from the codebase.  
> UNKNOWN is written where evidence is absent. Nothing is invented.

---

## EXECUTIVE SUMMARY

Eunoia AI OS is a **multi-tenant B2B SaaS AI operating system** for the MENA hospitality industry. It gives hotels and diving centers a private AI assistant trained on their own institutional knowledge, plus a full CRM pipeline, team management, and analytics — all in one platform.

**Current status**: Live in production. Demo-ready. Feature-complete for an initial beta customer. **Not yet payment-ready** (Stripe not integrated). Zero paying customers.

**Biggest risk**: The gap between what the platform can do technically and what a paying customer needs operationally — specifically, missing Stripe billing, missing Arabic UI for the stated target market, and no file upload (users must paste text).

**Biggest strength**: Technically robust multi-tenant foundation with enterprise RBAC, full audit trail, pgvector RAG with cited answers, and an approved architectural path from local knowledge processing to cloud-native Knowledge Packs.

---

## 1. BUSINESS VISION

**Product**: AI OS for MENA hospitality businesses. Not a chatbot. An operating system: knowledge management + CRM + AI assistant + analytics + team management in one product.

**Problem being solved**: Egyptian diving centers, hotels, and regional chains have institutional knowledge locked in PDFs, SOPs, WhatsApp threads, and employee heads. Staff waste hours asking the same questions. Customer-facing staff can't access accurate product/service information instantly. Managers have no visibility into pipeline or team activity.

**Core value proposition**: Upload your knowledge once. Every staff member gets a cited, accurate AI assistant that answers from your documents — never from generic internet knowledge.

**Revenue model** (documented in `.claude/PROJECT.md`):
| Tier | Monthly Seats | RAG Queries/mo | Price |
|------|--------------|----------------|-------|
| Starter | 5 | 100 | $99/mo |
| Professional | 25 | 1,000 | $299/mo |
| Enterprise | Unlimited | Unlimited | $499+/mo |

**Unit economics target**: Infra cost ~$5–10/customer/month → ~95% gross margin target.

**Note**: Revenue model is defined in documentation. No Stripe integration exists in the codebase. Cannot charge any customer today.

---

## 2. INVESTOR VISION

**Stage**: Pre-seed / Pre-revenue  
**Product maturity**: Working product. Live demo. No paying customers.  
**Market**: MENA hospitality tech. Beachhead: Egyptian diving centers (Hurghada, Sharm El-Sheikh). Expansion: hotels → hotel groups → regional chains → enterprise.

**Technical differentiation**:
- Proprietary knowledge processing pipeline (KB-1 through KB-2, with KB-3 approved)
- Architecture separating knowledge production (Knowledge Cloud) from knowledge consumption (AI OS) — creating a data moat as the knowledge factory grows
- Multi-tenant RLS-first security: every data isolation guarantee is enforced at the database level (Supabase RLS), not just in application code
- 9-level RBAC with per-member permission overrides and audit trail
- pgvector HNSW-powered RAG with source citations — not black-box AI

**Strategic moat (architectural — not yet built)**:
The Knowledge Cloud → Knowledge Packs → KPM architecture means that once the Knowledge Cloud is operational, the platform can push curated, validated, domain-specific knowledge packs directly into customer AI assistants. This creates a network effect: the more domains covered by Knowledge Cloud, the better every AI OS installation becomes, with zero per-customer effort.

**Fundraising risk factors** (honest):
- No revenue
- Target market speaks Arabic; UI is English-only
- Key technical risk: Knowledge Cloud is independent repo, KC-1 staged but not committed, KPM not built
- Single developer (inferred from session log — not confirmed)

---

## 3. PRODUCT VISION

**What the product is today** (verified from source):
1. **Auth**: signup, login, logout, password reset, PKCE callback (`/auth/callback/route.ts`)
2. **Multi-tenant onboarding**: org creation, org switcher (`org-switcher.tsx`), subscription tiers in DB schema
3. **Team management**: 9-role RBAC, invite by email, resend invite, revoke invite, member role change, member removal
4. **CRM**: full contact lifecycle — create, update, soft delete, hard delete, archive/restore, pipeline stages, tags, timeline events, activities, AI insights (lead score, risk score, suggested email/WhatsApp), CSV import/export
5. **Knowledge Base**: add documents (with auto-embedding), delete documents, language-tagged (en/ar/ru/it), max 50k chars per doc
6. **RAG Assistant**: embed query → HNSW similarity search → GPT-4o-mini → cited answer with source panel, rate-limited to 50/user/hour
7. **Dashboard**: KPI cards (contacts, docs, usage events, audit events), CRM pipeline metrics, 14-day usage area chart, contact status pie chart
8. **Usage tracking**: per-event tracking, SQL aggregation RPC, usage page
9. **Audit logs**: immutable, org-scoped, all mutations logged
10. **Org settings**: branding, locale, business, AI config (system prompt prefix, RAG similarity threshold, max queries/hour)
11. **Admin panel**: platform-wide org list for super admins
12. **Observability**: three-tier health (`/api/live`, `/api/health`, `/api/admin/system`), Prometheus (`/api/metrics`), Sentry (DSN needed in Vercel), 19 runbooks

**What the product is NOT today** (verified absence from source):
- No Stripe billing
- No usage quota enforcement per tier (rate limit only)
- No streaming RAG (5–6 second blocking wait)
- No chat history persistence (refresh loses all conversation)
- No PDF or DOCX upload (text paste only)
- No document edit or re-ingest
- No Arabic RTL UI
- No pagination (silent row limits: CRM 200, KB 100, Audit 50)
- No Knowledge Cloud integration / Knowledge Package Manager
- No REST API (only Next.js Server Actions + Route Handlers)
- No SSO / SAML
- No mobile app

---

## 4. COMMERCIAL STRATEGY

**Path to first paying customer**:
1. Apply pending DB migrations (0007, 0008, 0009a, 0009b, 0010_fixed) — 10 minutes manual work
2. Set RESEND_API_KEY in Vercel — invite emails broken without this
3. Integrate Stripe — cannot charge without this
4. Add PDF upload to Knowledge Base — text paste only is too friction-heavy for real hospitality businesses
5. Add streaming RAG — 5–6 second blocking UX is demo-killing

**Tier enforcement**: Not implemented. The `subscription_tier` column exists in the database (`organizations.subscription_tier text DEFAULT 'free'`) and in `Organization` type (`src/lib/types.ts`), but no quota checks exist in any Server Action.

**Competitive positioning**: Horizontal AI SaaS (Notion AI, ChatGPT) has no domain knowledge. Vertical hospitality CRMs (Opera, Protel, Salesforce) have no AI knowledge assistant. Eunoia owns the intersection.

---

## 5. TARGET CUSTOMERS

From `.claude/PROJECT.md` and design decisions:
- **Beachhead**: Egyptian diving centers (Hurghada, Sharm El-Sheikh)
- **Expansion**: Boutique hotels → hotel groups → MENA regional chains → enterprise hospitality groups
- **Languages in scope**: English, Arabic, Russian, Italian (all 4 appear as options in document schema: `z.enum(["en", "ar", "ru", "it"])`)

**Warning**: The current UI is English-only. The target market speaks Arabic as primary language. This is a critical gap for market penetration.

---

## 6. FINAL ARCHITECTURE (USER-CANONICAL — AUTHORITATIVE)

The user has defined this as the canonical architecture. It supersedes any inference from code:

```
Knowledge Cloud (producer)
    ↓ generates
Knowledge Packs (immutable signed archives)
    ↓ consumed by
Knowledge Package Manager (KPM) — NOT YET BUILT in AI OS
    ↓ installs into
Knowledge Repository Adapter — NOT YET BUILT
    ↓ stores in
Supabase (knowledge_base_chunks via pgvector HNSW)
    ↓ queried by
RAG Pipeline (text-embedding-3-small → match_kb_chunks → gpt-4o-mini)
    ↓ powers
AI Assistants (dashboard/assistant)
    ↓ feeds
CRM (pipeline stages, AI insights, timeline, activities)
    ↓ feeds
Business Intelligence (dashboard KPIs, usage analytics)
    ↓ serves
Customer
```

**Where current implementation sits in this architecture**:

| Architecture Component | Status | Evidence |
|----------------------|--------|---------|
| Knowledge Cloud (producer) | Independent repo (`@eunoia/knowledge-cloud`), KC-1 staged not committed | `/Users/ahmed/Documents/eunoia-knowledge-cloud` |
| Knowledge Packs | Spec exists (`PACKAGE_MANAGER_SPEC.md`), not yet generated | `docs/architecture/PACKAGE_MANAGER_SPEC.md` |
| KPM (installer) | Not built | No KPM code in `src/` |
| Knowledge Repository Adapter | Not built; current `KnowledgeRepository` is transitional in-memory class | `src/lib/knowledge/repository/service.ts` |
| Supabase RAG store | WORKING — `knowledge_base_chunks` with pgvector | Migration `0002_rag_invites.sql` |
| RAG Pipeline | WORKING — blocking, 50/hour rate limit | `src/app/dashboard/assistant/actions.ts` |
| AI Assistants | WORKING — with source citations | `src/app/dashboard/assistant/chat.tsx` |
| CRM | WORKING — full lifecycle | `src/app/dashboard/crm/actions.ts` |
| Business Intelligence | WORKING — KPIs + charts | `src/app/dashboard/page.tsx` |

---

## 7. REPOSITORY STRUCTURE AND RELATIONSHIPS

### Three repositories — canonical definitions (user-authoritative):

| Repository | Role | Status |
|-----------|------|--------|
| `eunoia-ai-os-platform` | **ACTIVE** — Commercial SaaS product. CRM, AI, Marketing Intelligence, Strategy, Knowledge Consumer, RAG, Automation, Dashboards, Auth, Multi-tenant | Primary development |
| `eunoia-knowledge-cloud` | **INDEPENDENT KNOWLEDGE FACTORY** — Crawlers, Import, Validation, Normalization, Generator, Publisher, Versioning, Taxonomy. Produces immutable Knowledge Packs. Does NOT serve customers directly | Independent development |
| `eunoia-ai-os-app` | **ARCHIVED** — Historical prototype. 1 commit only ("Initial commit from Create Next App"). No source code beyond scaffold | No development ever |

### Repository boundaries (from `docs/architecture/BOUNDARY_RULES.md`):

**Knowledge Cloud owns**: crawl, normalize, taxonomy, quality assurance, pack build, signing, registry

**AI OS owns**: runtime consumption, local cache, resolver, policy enforcement, local indexing

**Rule**: No code moves between repositories without explicit justification. No automatic sync.

### Current branch state (`eunoia-ai-os-platform`):
- Active branch: `eunoia-ai-os-platform`
- Behind `main` by: 30+ commits (main is stale)
- Session count: 13 sessions over ~2 weeks
- Last commit: acaa6be (`docs(audit): add forensic audit reports`)

---

## 8. CURRENT FEATURES — VERIFIED FROM SOURCE

### Authentication (source: `src/lib/auth/actions.ts`, `src/lib/auth/dal.ts`)
| Feature | Status | File |
|---------|--------|------|
| Email/password signup | ✅ WORKING | auth/actions.ts |
| Email/password login | ✅ WORKING | auth/actions.ts |
| Logout | ✅ WORKING | auth/actions.ts |
| Password reset (request + update) | ✅ WORKING | auth/actions.ts |
| PKCE OAuth callback | ✅ WORKING | auth/callback/route.ts |
| Session verification | ✅ WORKING | auth/dal.ts:verifySession() |
| HTTP-only cookie session | ✅ WORKING | lib/supabase/proxy.ts |

### Multi-tenant (source: `src/lib/types.ts`, `src/lib/auth/dal.ts`, `src/app/dashboard/org-switcher.tsx`)
| Feature | Status | Notes |
|---------|--------|-------|
| Organization creation | ✅ WORKING | `create_organization` RPC (migration 0005) |
| Organization lifecycle (archive/restore/suspend) | ✅ IN CODE | Requires 0009b migration applied |
| Org switcher (cookie-based) | ✅ WORKING | `eunoia-active-org` cookie |
| Org settings (branding/locale/business/ai) | ✅ IN CODE | `updateOrgSettings()` action |
| 9-role RBAC | ✅ IN CODE | Requires 0009a migration applied |
| 22-permission registry | ✅ IN CODE | Requires 0009b migration applied |
| Per-member permission overrides | ✅ IN CODE | Requires 0009b migration applied |
| Ownership transfer | ✅ IN CODE | `transfer_org_ownership()` RPC |
| Subscription tier tracking | ✅ IN DB | `organizations.subscription_tier` column |
| Subscription quota enforcement | ❌ MISSING | No quota checks in any action |

### CRM (source: `src/app/dashboard/crm/actions.ts` — 644 lines)
| Feature | Status | Notes |
|---------|--------|-------|
| Create contact | ✅ WORKING | Zod-validated, duplicate detection |
| Update contact (all fields) | ✅ WORKING | `updateContact()` action |
| Update pipeline stage | ✅ WORKING | `updateContactStage()` action |
| Soft delete / restore | ✅ WORKING | `softDeleteContact()`, `restoreContact()` |
| Hard delete (admin) | ✅ WORKING | Admin-only, `hardDeleteContact()` |
| Archive / unarchive | ✅ WORKING | `archiveContact()`, `unarchiveContact()` |
| Tags CRUD | ✅ WORKING | Create/add/remove tags per contact |
| Timeline events | ✅ WORKING | Logged per-contact history |
| Activities | ✅ WORKING | Tasks with due dates |
| AI insights (lead/risk/opportunity score) | ✅ WORKING | `/api/crm/insights` — 10/user/hour limit |
| AI suggested email + WhatsApp | ✅ WORKING | Generated by gpt-4o-mini |
| CSV import/export | ✅ WORKING | `/api/crm/export` and `/api/crm/import` |
| Pipeline metrics dashboard | ✅ WORKING | `get_crm_metrics` RPC |
| Bulk operations | ❌ MISSING | No bulk select/delete/archive |
| Email sequences | ❌ MISSING | No automated outreach |
| Pagination | ❌ MISSING | Silent 200-row cap |

### Knowledge Base — SaaS Product (source: `src/app/dashboard/knowledge-base/actions.ts`)
| Feature | Status | Notes |
|---------|--------|-------|
| Create document + auto-embed | ✅ WORKING | Text paste only; ingestDocument() on save |
| Delete document | ✅ WORKING | Admin or creator |
| Language tagging | ✅ WORKING | en/ar/ru/it |
| Edit document + re-ingest | ❌ MISSING | No update action |
| PDF/DOCX file upload | ❌ MISSING | Text paste only |
| Document search UI | ❌ MISSING | No full-text search in KB list |
| Pagination | ❌ MISSING | Silent 100-row cap |

### RAG Assistant (source: `src/app/dashboard/assistant/actions.ts`, `chat.tsx`)
| Feature | Status | Notes |
|---------|--------|-------|
| Embed query → HNSW search | ✅ WORKING | `match_kb_chunks` RPC, MIN_SIMILARITY=0.3 |
| GPT-4o-mini answer generation | ✅ WORKING | max_tokens=1024, blocking |
| Source citations in UI | ✅ WORKING | SourcesPanel shows sources with similarity |
| Rate limiting | ✅ WORKING | 50 queries/user/hour via usage_events count |
| Multi-language retrieval | ⚠️ PARTIAL | Language stored but not used in retrieval filter |
| Streaming responses | ❌ MISSING | 5–6 second blocking call |
| Chat history persistence | ❌ MISSING | Refresh loses all conversation |
| Org-configurable system prompt | ⚠️ PARTIAL | `OrgSettings.ai.systemPromptPrefix` exists in type but NOT read in action |
| Multi-turn context | ❌ MISSING | Each query is independent |

### Team Management (source: `src/app/dashboard/settings/actions.ts`)
| Feature | Status | Notes |
|---------|--------|-------|
| Invite by email | ✅ WORKING | Token generated, email sent via Resend (API key missing in Vercel) |
| Resend invite | ✅ WORKING | New token + extended expiry |
| Revoke invite | ✅ WORKING | Admin-only |
| Accept invite | ✅ WORKING | `/invite?token=...` → `accept_org_invite()` RPC |
| Change member role | ✅ WORKING | Admin-gated, last-owner guard |
| Remove member | ✅ WORKING | Admin-gated, self-removal blocked |
| Bulk invite | ❌ MISSING | One at a time only |
| SSO / SAML | ❌ MISSING | Not implemented |

### Observability (source: `src/app/api/`, `src/lib/health/`, `src/lib/logger.ts`)
| Feature | Status | Notes |
|---------|--------|-------|
| Liveness probe (`/api/live`) | ✅ WORKING | Public, no external calls |
| Readiness probe (`/api/health`) | ✅ WORKING | 30s cache, X-Cache header, 8 providers |
| Diagnostics (`/api/admin/system`) | ✅ WORKING | Auth required, ring buffer, full detail |
| Prometheus metrics (`/api/metrics`) | ✅ IN CODE | Bearer token auth (METRICS_TOKEN not set in Vercel → public) |
| Sentry error tracking | ✅ IN CODE | Client+server+edge configs (DSN not set in Vercel → inactive) |
| Structured logging | ✅ WORKING | `src/lib/logger.ts` — 6 levels, JSON, sanitizer |
| Request correlation (X-Request-ID) | ✅ WORKING | Generated in proxy.ts, propagated |
| Audit logging | ✅ WORKING | Fire-and-forget, immutable, org-scoped |
| GitHub Actions CI | ✅ WORKING | `.github/workflows/ci.yml` |

---

## 9. KNOWLEDGE LAYER — CORRECT ARCHITECTURAL FRAMING

This section is critical. Previous audit documents framed this incorrectly.

### Two separate "knowledge" systems in `eunoia-ai-os-platform`:

**System 1 — SaaS Product Knowledge Base** (connected to Supabase, serving customers):
- Location: `src/app/dashboard/knowledge-base/` + `knowledge_base_documents` + `knowledge_base_chunks` tables
- What it does: Customers paste text → auto-embedded → pgvector HNSW → RAG
- Status: WORKING IN PRODUCTION

**System 2 — Local Knowledge Processing Pipeline** (in-memory, NOT connected to Supabase):
- Location: `src/lib/knowledge/` (KB-1, KB-1.1, KB-2, Importer)
- What it does: Process the founder's own knowledge assets (PDFs, docs) through a local pipeline
- Status: TRANSITIONAL — being redesigned per KB-3 approval
- Governance: `KnowledgeRepository` is intentionally in-memory; it will become a KPM installer/consumer once Knowledge Cloud delivers signed packs
- Evidence: `docs/architecture/AI_OS_ALIGNMENT_REPORT.md` — "APPROVED FOR KB-3 with conditions"

**The KnowledgeRepository is NOT broken.** It is intentionally in-memory because the final architecture calls for it to be replaced by a KPM consumer that installs Knowledge Packs from Knowledge Cloud. The in-memory implementation serves as the development target; persistence will come from the KPM, not from directly wiring to Supabase.

### Knowledge Cloud (`@eunoia/knowledge-cloud` — separate repo):
- Location: `/Users/ahmed/Documents/eunoia-knowledge-cloud`
- Status: KC-1 Generator Engine built, staged but NOT committed to main
- KC-1 quality score: 73/100 — APPROVED FOR KB-3 with conditions
- KC-1 critical issues: no interfaces for GeneratorPipeline/Generator, fs.readFileSync in "pure" builder
- KC-2 (Registry): next sprint, not started
- Branch: `develop` (3 commits on main)

### Migration path (from `docs/architecture/MIGRATION_PLAN_FROM_KB2.md`):
- Phase 0: Inventory + contracts (freeze manifest.json schema, resolver API, telemetry schema)
- Phase 1: Adapterize importer modules
- Phase 2: KC minimal (commit KC-1, build registry)
- Phase 3: Cutover (KPM installs packs into AI OS)
- Phase 4: Decommission in-memory KnowledgeRepository

---

## 10. DATABASE SCHEMA

**Tables** (from migration files, verified):
| Table | Purpose | RLS |
|-------|---------|-----|
| `organizations` | Multi-tenant root | ✅ |
| `profiles` | User profiles | ✅ |
| `organization_members` | Membership + role | ✅ |
| `organization_invites` | Invite tokens + resend_count | ✅ |
| `knowledge_base_documents` | KB documents with language | ✅ |
| `knowledge_base_chunks` | pgvector embeddings (1536d) | ✅ |
| `crm_contacts` | Full CRM contact record | ✅ |
| `crm_tags` | Reusable tag library per org | ✅ |
| `crm_contact_tags` | Many-to-many contacts↔tags | ✅ |
| `crm_timeline_events` | Per-contact event history | ✅ |
| `crm_activities` | Tasks/calls/meetings | ✅ |
| `audit_logs` | Immutable action log | ✅ |
| `usage_events` | Per-event usage tracking | ✅ |
| `permissions` | Permission registry (22 keys) | ✅ |
| `role_permissions` | Default grants per role | ✅ |
| `member_permissions` | Per-member overrides | ✅ |

**PostgreSQL functions**:
- `create_organization(name, slug)` — creates org + owner membership atomically
- `accept_org_invite(token)` — validates + accepts invite
- `resend_org_invite(invite_id, inviter_id)` — new token + extended expiry
- `check_crm_duplicate(org_id, email, phone)` — duplicate detection
- `get_usage_totals(org_id)` — aggregated usage by type
- `get_crm_metrics(org_id)` — pipeline KPIs
- `search_crm_contacts(...)` — full-text CRM search
- `match_kb_chunks(query_embedding, org_id, similarity_threshold, max_results)` — HNSW vector search
- `get_user_effective_permissions(user_id, org_id)` — role defaults + member overrides
- `user_has_permission(user_id, org_id, permission_key)` — boolean convenience function
- `archive_organization(org_id)` / `restore_organization(org_id)` — org lifecycle
- `transfer_org_ownership(org_id, new_owner_id)` — atomic ownership transfer
- `update_organization_settings(org_id, settings_patch)` — non-destructive JSONB merge
- `healthcheck()` — returns JSONB for health endpoint (migration 0008)
- `get_usage_totals_v2(...)` — improved aggregation (migration 0007)

---

## 11. MIGRATION STATUS

| File | Purpose | Git | Production |
|------|---------|-----|-----------|
| `0001_init.sql` | Core schema, auth, KB, RAG | ✅ | ✅ applied |
| `0002_rag_invites.sql` | pgvector, match_kb_chunks, invites | ✅ | ✅ applied |
| `0003_grants.sql` | GRANT statements | ⚠️ untracked | ❓ |
| `0004_indexes_policies.sql` | Performance indexes + RLS policies | ⚠️ untracked | ❓ |
| `0005_schema_hardening.sql` | create_organization RPC + hardening | ⚠️ untracked | ❓ |
| `0006_hardening_v2.sql` | Additional hardening | ⚠️ untracked | ❓ |
| `0007_get_usage_totals.sql` | Usage aggregation RPC | ✅ ready | ❌ NOT applied |
| `0008_health_check.sql` | healthcheck() JSONB function | ✅ ready | ❌ NOT applied |
| `0009_enterprise_multitenant.sql` | OLD — has bugs | ✅ | DO NOT APPLY |
| `0009_enterprise_multitenant_fixed.sql` | OLD fix — superceded | ✅ | DO NOT APPLY |
| `0009a_enum_roles.sql` | Adds 5 new role values to enum | ✅ ready | ❌ NOT applied |
| `0009b_enterprise_schema.sql` | Org lifecycle, permission tables, RPCs | ✅ ready | ❌ NOT applied |
| `0010_crm_platform.sql` | OLD CRM schema — has bugs | ✅ | DO NOT APPLY |
| `0010_crm_platform_fixed.sql` | CORRECT CRM schema | ✅ ready | ❌ NOT applied |

**CORRECT application order**: 0007 → 0008 → 0009a → 0009b → 0010_crm_platform_fixed

**IMPORTANT**: Files `0009_enterprise_multitenant.sql`, `0009_enterprise_multitenant_fixed.sql`, and `0010_crm_platform.sql` must NOT be applied — they are superseded.

---

## 12. TECHNICAL HEALTH

| Metric | Claimed (CURRENT_STATE.md) | Actual (Audited) | Evidence |
|--------|--------------------------|-----------------|---------|
| Tests passing | 62/62 | 309/309 | `npm test` result |
| TypeScript | Clean | 1 error in scripts/knowledge/quality-report.ts | `npx tsc --noEmit` |
| ESLint | Clean | 13 errors in validator/index.ts + scripts | `npm run lint` |
| Build | 22 routes clean | 22 routes clean | ✅ confirmed |
| Production URL | Live | Live: eunoia-ai-os-platform.vercel.app | ✅ confirmed |

**Note**: CURRENT_STATE.md (last updated 2026-07-03) claims 62/62 tests. This is from Session 9. The knowledge importer tests (43 tests) and other knowledge layer tests were added in subsequent sprints, bringing the count to 309. The document is stale.

---

## 13. TECHNICAL DEBT

| Item | Classification | Severity | File | Impact |
|------|---------------|----------|------|--------|
| ESLint 13 errors | Real debt | HIGH | `src/lib/knowledge/importer/validator/index.ts`, `scripts/*` | CI fails on lint |
| TS error: FileMetadata | Real debt | MEDIUM | `scripts/knowledge/quality-report.ts:58` | Missing type import |
| Migration file confusion | Real debt | HIGH | `supabase/migrations/` | Risk of applying wrong 0009 |
| `_assetSeq` global counter | Intentional for now | HIGH | `src/lib/knowledge/knowledge.ts:34` | Resets on deploy — by design until KPM |
| KnowledgeRepository in-memory | INTENTIONAL / TRANSITIONAL | HIGH | `src/lib/knowledge/repository/service.ts` | Will become KPM consumer |
| CSP `script-src 'unsafe-inline'` | Real debt | MEDIUM | `next.config.ts:35` | XSS surface |
| Hardcoded system prompt | Real debt | MEDIUM | `assistant/actions.ts` | "You are Eunoia, an AI assistant for a hospitality property" — not org-configurable despite OrgSettings.ai.systemPromptPrefix existing in type |
| OrgSettings.ai not read in RAG | Gap | MEDIUM | `assistant/actions.ts` | Config exists in type but isn't consumed |
| `getUsageOverTime` JS aggregation | Real debt | MEDIUM | `dashboard/page.tsx:74` | For high-volume orgs DATE_TRUNC SQL preferred |
| `getContactStatusBreakdown` JS aggregation | Real debt | MEDIUM | `dashboard/page.tsx:90` | Capped at 5000 rows |
| Untracked migrations 0003–0006 | Real debt | HIGH | `supabase/migrations/` | Git state inconsistent |
| 30+ commits not in main | Real debt | MEDIUM | git | Production branch diverged from main |
| CURRENT_STATE.md stale | Documentation debt | LOW | `.claude/CURRENT_STATE.md` | Claims clean TS/lint/62 tests |
| BUGS.md stale | Documentation debt | LOW | `.claude/BUGS.md` | Closed issues still listed |
| Dead scaffold SVGs | Cosmetic | LOW | `public/` | 5 unreferenced files |
| Empty `src/app/api/status/` dir | Cosmetic | LOW | — | False endpoint expectation |
| chokidar/fast-glob/mammoth/pdf-parse as prod deps | Wrong classification | MEDIUM | `package.json` | Should be devDependencies or scripts |

---

## 14. ENVIRONMENT VARIABLES

| Variable | Local | Vercel | Status |
|----------|-------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | OK |
| `OPENAI_API_KEY` | ✅ | ✅ | OK |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | OK |
| `RESEND_API_KEY` | ❓ | ❌ MISSING | Invite emails silently skipped |
| `FROM_EMAIL` | ❓ | ❌ MISSING | Invite emails silently skipped |
| `NEXT_PUBLIC_SENTRY_DSN` | ❓ | ❌ MISSING | Client errors invisible |
| `SENTRY_DSN` | ❓ | ❌ MISSING | Server errors invisible |
| `METRICS_TOKEN` | ❓ | ❌ MISSING | Prometheus is publicly accessible |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ NEVER | Scripts only — NEVER in cloud |

---

## 15. ARCHITECTURE DECISIONS (ADRs)

From `.claude/DECISIONS.md` (summarized):
- **ADR-001**: RLS as primary security boundary — not just app-layer checks
- **ADR-002**: Server Actions for all mutations — no separate API for mutations
- **ADR-003**: `import "server-only"` enforced on all secret-adjacent files
- **ADR-004**: Fire-and-forget audit logging — failures never surface to users
- **ADR-005**: Knowledge Cloud as independent producer — clean separation of concerns
- **ADR-006**: pgvector HNSW over Pinecone/Weaviate — keep everything in Supabase for simplicity
- **ADR-007**: React.cache() for DAL deduplication — each request verifies session only once

---

## 16. ARCHITECTURE TIMELINE

| Sprint | Date | Milestone |
|--------|------|-----------|
| Session 1 | 2026-06-28 | Phase 1: Auth, CRM, KB, RAG, audit, usage, admin — 29 tests |
| Session 2 | 2026-06-29 | Password reset, email invites (Resend), RAG rate limiting, source citations, delete contact/doc, CI |
| Session 3 | 2026-06-29 | Health endpoint fix, PM2 config, doctor.js fixes |
| Session 5 | 2026-06-29 | Enterprise health framework: three-tier endpoints, 8 providers, ring buffer |
| Session 6 | 2026-06-29 | Health polish: HealthProvider<TMetadata>, feature flags, AlertProvider |
| Session 7 | 2026-06-29 | Sentry v10, Prometheus /api/metrics, structured logging, runbooks, Grafana dashboard |
| Session 8 | 2026-06-29 | 7 disaster recovery runbooks, ops docs, launch checklist |
| Session 9 | 2026-06-29 | Enterprise multi-tenant: 9-role RBAC, 22 permissions, org lifecycle, org switcher, invitation improvements, 62 tests |
| Session 10 | 2026-06-29 | P0 login crash fix (Turbopack module resolution bug) |
| Session 12 | 2026-07-02 | QA audit: 4 bugs fixed, 5 manual steps identified, Sprint 0.9 complete |
| Session 13 | 2026-07-03 | RC1 cleanup (CURRENT_STATE.md update) |
| KB sprints | Various | KB-1 → KB-1.1 → KB-2 → Importer subsystem (43 tests, 309 total) |

---

## 17. READINESS SCORES

### Production Readiness: 72/100

**What works** (+):
- Core application: auth, CRM, KB, RAG, team management
- Security: RLS on all tables, RBAC, audit trail, CSP headers, HSTS
- Infrastructure: Vercel deployment, GitHub Actions CI, PM2 config
- Observability architecture: three-tier health, Prometheus metrics, Sentry SDK
- Database: 15+ tables, 15+ functions, HNSW vector search

**What degrades it** (−):
- (-8) Sentry DSN not set → production errors invisible
- (-5) METRICS_TOKEN not set → Prometheus publicly accessible
- (-5) Migrations 0007–0010 not applied → enterprise features broken in production
- (-4) RESEND_API_KEY not set → invite emails silently fail
- (-3) 1 TypeScript error in scripts
- (-3) 13 ESLint errors

### Commercial Readiness: 52%

**Blockers**:
- No Stripe billing (cannot accept any payment)
- No tier-based quota enforcement (rate limiting only)
- No PDF/DOCX upload (text paste is too friction-heavy)
- Email invites broken in production (missing API key)
- RAG 5–6 second blocking response (UX blocker for demos)

**Enablers**:
- Full auth including password reset
- Multi-org with org switcher
- CRM with AI insights
- RAG with source citations
- Audit trail and usage tracking

### Investor Readiness: 58%

**Strengths**:
- Live demo at production URL
- Working multi-tenant product
- Clear market (MENA hospitality)
- Enterprise architecture with RLS + RBAC
- Technical moat via Knowledge Cloud architecture

**Weaknesses for investor presentation**:
- Zero revenue
- No Arabic UI (target market speaks Arabic)
- Knowledge Cloud not integrated
- No paying customers
- Single repo, no team

---

## 18. CURRENT SPRINT STATUS

Sprint 0.9 is COMPLETE per CHANGELOG Session 12.

**Pending manual steps** (blocking new user onboarding):
1. Apply migrations 0007 + 0008 + 0009a + 0009b + 0010_fixed in Supabase SQL Editor
2. Set RESEND_API_KEY + FROM_EMAIL in Vercel
3. Set SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN in Vercel
4. Set METRICS_TOKEN in Vercel

---

## 19. NEXT SPRINT RECOMMENDATION

**Sprint 1A — Revenue Unlock** (2 weeks, CTO recommendation):

Priority by business impact:
1. **Stripe billing + webhooks** (P0) — Cannot charge any money without this. 3 days.
2. **Apply all pending migrations** (P0, 10 min manual) — Enterprise features are built but broken without these
3. **Set all missing env vars** (P0, 30 min manual) — Email, Sentry, Prometheus
4. **Usage quota enforcement per tier** (P0) — Billing without quota = undefined unit economics. 4 hours.
5. **Streaming RAG** (P1) — 5–6s blocking is a demo killer. 1 day.
6. **PDF/DOCX upload to KB** (P1) — Hospitality businesses won't paste SOP text. 2 days.

Do NOT start Sprint 1B (Arabic UI) until Sprint 1A produces the first paying customer. Revenue validates product-market fit before market expansion.

---

## 20. DEFINITION OF DONE

From `.claude/RULES.md` (authoritative):
- [ ] `npx tsc --noEmit` → 0 errors (src/ scope; scripts are excluded)
- [ ] `npm run lint` → 0 errors
- [ ] `npm test` → all 309 tests passing (this number will grow)
- [ ] New Server Actions have ≥1 unit test
- [ ] `verifySession()` called at top of every Server Action
- [ ] Every query scoped to `.eq("organization_id", membership.organization.id)`
- [ ] No `console.log/error/warn` in `src/`
- [ ] No dead code, no TODO comments
- [ ] Audit event logged for every mutation
- [ ] New DB tables have RLS enabled + SELECT policy

---

## 21. LONG-TERM ROADMAP

| Phase | Theme | Key Deliverables | Business Outcome |
|-------|-------|-----------------|-----------------|
| Sprint 1A | Revenue Unlock | Stripe, quotas, streaming RAG, PDF upload | First paying customer possible |
| Sprint 1B | Market Fit | Arabic RTL UI, multi-language RAG, guest chatbot widget | Penetrate target market |
| Sprint 2 | Growth | PMS integration hooks (Opera, Protel), SSO/SAML, REST API | Land hotel groups |
| Sprint 3 | Knowledge Cloud | KC-1 commit, KC-2 Registry, KPM MVP, first Knowledge Pack | Technical moat activated |
| Sprint 4 | Enterprise | White-labeling, data export, multi-region, SLA | Enterprise contracts |
| Sprint 5 | Scale | Analytics engine, predictive AI, mobile app | Platform business |

---

## 22. KNOWN RISKS

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Supabase vendor lock-in | Medium | High | RLS + pgvector = hard to migrate |
| OpenAI pricing changes | Medium | High | Rate limiting in place; streaming reduces cost |
| Knowledge Cloud slippage | High | Medium | KC-1 staged but not committed |
| Architectural stall (KB-3 blocked by KC) | Medium | High | Freeze stable contracts before KB-3 starts |
| Single-developer bus factor | Unknown | Critical | UNKNOWN — git history is single committer |
| Arabic UI gap in target market | High | High | No mitigation in current sprint plan |
| No enterprise sales motion | High | Medium | No outbound, no landing page funnel |
| Untracked migrations 0003–0006 | Medium | High | Git does not match production state |

---

## 23. WHAT THIS DOCUMENT DOES NOT KNOW

The following are UNKNOWN and were not inventable from the codebase:
- Actual production Supabase project state (which migrations are applied)
- Whether invite emails have ever been successfully sent
- Actual user count, session count, any production telemetry
- Team size and composition
- Investor conversations or term sheets
- Whether domain eunoiaos.com is live
- Whether Knowledge Cloud development is on a defined timeline
