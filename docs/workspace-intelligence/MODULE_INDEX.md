# MODULE INDEX

**Generated**: 2026-07-13
**Scope**: All identifiable modules across both repositories

---

## Repository A — eunoia-knowledge-cloud

### Core Generator Pipeline (`src/core/generator/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Generator | `generator.ts` | Top-level orchestrator — coordinates all pipeline stages | KC-0 spec complete; KC-1 not started |
| Pipeline | `pipeline.ts` | Stage sequencer — runs stages in order with error isolation | KC-0 spec complete |
| Builder | `builder.ts` | Assembles Knowledge Pack output structure from processed stages | KC-0 spec complete |
| Validator | `validator.ts` | Schema + quality validation against canonical rules | KC-0 spec complete |
| Normalizer | `normalizer.ts` | Canonicalises field values, whitespace, encoding | KC-0 spec complete |
| Taxonomy | `taxonomy.ts` | Applies and verifies taxonomy classification to pack content | KC-0 spec complete |
| Manifest | `manifest.ts` | Reads/writes `manifest.json`; enforces manifest contract | KC-0 spec complete |
| Metadata | `metadata.ts` | Extracts and enriches pack-level metadata | KC-0 spec complete |
| Checksum | `checksum.ts` | SHA-256 checksum generation and verification | KC-0 spec complete |
| Writer | `writer.ts` | Writes validated pack artefacts to filesystem | KC-0 spec complete |
| Types | `types.ts` | Shared TypeScript type definitions for entire pipeline | KC-0 spec complete |
| Errors | `errors.ts` | Custom error classes with error codes (`ERR_MISSING_MANIFEST`, etc.) | KC-0 spec complete |
| Entry | `src/index.ts` | Public API export surface | KC-0 spec complete |

**Dependencies**: `zod` (validation), `uuid` (pack IDs), `semver` (version compat), `fast-xml-parser`, `cheerio`

---

## Repository B — eunoia-ai-os-platform

### AI Layer (`src/lib/ai/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| OpenAI Client | `openai.ts` | Embeddings (`text-embedding-3-small`) + GPT-4o-mini chat | Production ✅ |
| Ingest Pipeline | `ingest.ts` | Document → chunk → embed → upsert to `document_chunks` | Production ✅ |
| Chunker | `chunk.ts` | Text splitting with overlap for embedding quality | Production ✅ |

**Dependencies**: `openai` SDK · `server-only` guard

---

### Auth Layer (`src/lib/auth/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| DAL | `dal.ts` | `verifySession()`, `getActiveOrganization()`, session cookie | Production ✅ |
| Actions | `actions.ts` | `signIn`, `signUp`, `signOut`, `requestPasswordReset`, `updatePassword` | Production ✅ |
| Audit | `audit.ts` | `logAuditEvent()` — fire-and-forget, writes to `audit_logs` | Production ✅ |
| Authorization | `authorization.ts` | `hasRole()`, RBAC checks for admin/owner/member | Production ✅ |
| Authorization Utils | `authorization-utils.ts` | Helper utilities for role checks | Production ✅ |
| Permissions | `permissions.ts` | Permission constants and role hierarchy | Production ✅ |

---

### Health Framework (`src/lib/health/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Manager | `manager.ts` | `runHealthCheck()` — Promise.allSettled over all providers | Production ✅ |
| Types | `types.ts` | `HealthProvider<TMetadata>` generic interface | Production ✅ |
| Utils | `utils.ts` | `safeCheck()` isolation wrapper | Production ✅ |
| Readiness Cache | `readiness-cache.ts` | 30s TTL cache for `/api/health` with `X-Cache` header | Production ✅ |
| Report History | `report-history.ts` | In-memory ring buffer (100 entries) for `/api/admin/system` | Production ✅ |
| Alert Provider | `alert-provider.ts` | `AlertProvider` interface for Slack/Discord/PagerDuty | Interface defined ✅ |
| Provider: Auth | `providers/auth.ts` | Supabase Auth health | Production ✅ |
| Provider: Database | `providers/database.ts` | Supabase DB connectivity | Production ✅ |
| Provider: OpenAI | `providers/openai.ts` | OpenAI API reachability | Production ✅ |
| Provider: Email | `providers/email.ts` | Resend connectivity | Production ✅ |
| Provider: Storage | `providers/storage.ts` | Supabase Storage | Production ✅ |
| Provider: Cache | `providers/cache.ts` | Cache layer check | Production ✅ |
| Provider: Queue | `providers/queue.ts` | Queue layer check | Production ✅ |
| Provider: Environment | `providers/environment.ts` | Required env var presence | Production ✅ |

---

### Knowledge Layer — Platform (`src/lib/knowledge/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Knowledge API | `knowledge.ts` | Top-level query API for installed knowledge | Active (bridge) |
| Types | `types.ts` | Shared knowledge type definitions | Active |
| Repository | `repository/index.ts` | Local knowledge pack store + installer | Active (bridge) |
| Repository Service | `repository/service.ts` | CRUD over local knowledge objects | Active (bridge) |
| Repository Manifest | `repository/manifest.ts` | Reads/writes local import manifest | Active |
| Repository Checksum | `repository/checksum.ts` | Local checksum verification | Active |
| Repository Queue | `repository/queue.ts` | Async ingestion queue | Active |
| Repository Validation | `repository/validation.ts` | Local validation rules | Active |
| Importer | `importer/` | 8-module import pipeline (scanner, parser, classifier, validator, registry, filesystem, reporter) | Active (bridge — will become adapter) |
| Extractors | `extractors/entities.ts` + `keywords.ts` | Named entity and keyword extraction | Active |
| Extraction Rules | `extractors/rules/` | Dictionary, heuristic, and pattern rules | Active |
| Normalizers | `normalizers/duplicates.ts` + `text.ts` | Dedup and text normalisation | Active |
| Relationships | `relationships/builder.ts` | Entity relationship graph builder | Active |
| Scoring | `scoring/scorer.ts` | Asset quality scoring | Active |
| Search | `search/index.ts` | Local knowledge search index | Active |
| Utils | `utils/` | Shared utility functions | Active |

**Note**: Per `AI_OS_KNOWLEDGE_ALIGNMENT.md`, this layer is designated for conversion to read-only adapters once KC-1 ships.

---

### Stripe / Billing (`src/lib/stripe/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Client | `client.ts` | Stripe SDK initialisation | Production ✅ |
| Plans | `plans.ts` | Tier definitions (Starter $99, Pro $299, Enterprise $499/mo) | Production ✅ |
| Quota | `quota.ts` | Usage quota enforcement per tier | Production ✅ |

---

### Supabase Layer (`src/lib/supabase/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Server Client | `server.ts` | Supabase SSR client (cookie-based) | Production ✅ |
| Browser Client | `client.ts` | Supabase browser client | Production ✅ |
| Proxy | `proxy.ts` | Route guard (`src/proxy.ts` at root) — Next.js 16 renamed from middleware | Production ✅ |

---

### Logger (`src/lib/logger/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Logger | `logger.ts` | 6-level JSON structured logger with 25-key sanitiser | Production ✅ |
| Types | `logger/types.ts` | `LogLevel`, `LogContext` types | Production ✅ |
| Context | `logger/context.ts` | `AsyncLocalStorage` request correlation context | Production ✅ |

---

### Supporting Lib Modules

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Email | `email.ts` | Resend SDK wrapper — invite + transactional email | Production ✅ |
| Env | `env.ts` | `server-only` env validation with Zod | Production ✅ |
| Types | `types.ts` | Global shared TypeScript types | Production ✅ |
| Utils | `utils.ts` | Shared utility helpers | Production ✅ |

---

### App Dashboard Modules (`src/app/dashboard/`)

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| Dashboard Home | `page.tsx` | KPI cards + Recharts AreaChart/PieChart | Production ✅ |
| CRM | `crm/` | Contact list, create, delete, edit, search, import CSV, pipeline board, activities, detail page, AI insights | Production ✅ |
| Knowledge Base | `knowledge-base/` | Document list, upload form, auto-ingest, delete | Production ✅ |
| RAG Assistant | `assistant/` | SSE streaming chat with source citations and rate limiting | Production ✅ |
| Billing | `billing/` | Subscription status, upgrade button | Production ✅ |
| Audit Logs | `audit-logs/` | Immutable event log viewer | Production ✅ |
| Usage | `usage/` | Per-event usage chart via SQL RPC | Production ✅ |
| Settings | `settings/` | Member management, invite form/row | Production ✅ |
| Admin | `admin/` | Super-admin org list (platform-wide) | Production ✅ |
| Org Switcher | `org-switcher.tsx` | Multi-org context switcher | Production ✅ |

---

### API Route Modules (`src/app/api/`)

| Module | Route | Purpose | Status |
|--------|-------|---------|--------|
| Liveness | `/api/live` | K8s liveness probe — no external calls | Production ✅ |
| Readiness | `/api/health` | K8s readiness probe — 8 providers, 30s cache, public | Production ✅ |
| Admin Diagnostics | `/api/admin/system` | Full diagnostics — auth required, never cached | Production ✅ |
| Metrics | `/api/metrics` | Prometheus text format, Bearer token auth | Production ✅ |
| RAG Stream | `/api/assistant/stream` | SSE streaming RAG — sources first, tokens live | Production ✅ |
| CRM Export | `/api/crm/export` | CSV export of contacts | Production ✅ |
| CRM Import | `/api/crm/import` | CSV bulk import of contacts | Production ✅ |
| CRM Insights | `/api/crm/insights` | AI-generated contact insights | Production ✅ |
| Stripe Checkout | `/api/stripe/checkout` | Checkout session creation | Production ✅ |
| Stripe Portal | `/api/stripe/portal` | Customer billing portal | Production ✅ |
| Stripe Webhook | `/api/stripe/webhook` | Stripe event handler | Production ✅ |

---

### Tools (`tools/bootstrap/`)

| Module | File | Purpose | Status |
|--------|------|---------|--------|
| Bootstrap Entry | `index.ts` | CLI entry — reads Excel, syncs Vercel env vars idempotently | Production ✅ |
| Excel Reader | `excel.ts` | Parses `.xlsx` env-var definition sheets | Production ✅ |
| Vercel Sync | `vercel.ts` | Calls Vercel API to upsert environment variables | Production ✅ |
| Metrics | `metrics.ts` | Tracks sync counts and results | Production ✅ |
| Report | `report.ts` | Generates bootstrap run report | Production ✅ |
| Utils | `utils.ts` | Shared helpers | Production ✅ |
| Types | `types.ts` | Bootstrap type definitions | Production ✅ |
