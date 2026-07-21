# SOURCE OF TRUTH MAP

**Generated**: 2026-07-13
**Method**: Evidence-based from directory structure, package configs, and architecture documents only

---

## How to Read This Index

Each row identifies a major area, where the canonical definition lives, where it is consumed or mirrored, and its current status.

---

## Core Contracts and Schemas

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Knowledge Pack schema | KC — `docs/specifications/knowledge-pack.schema.json` | Platform — `src/lib/knowledge/types.ts` (local type system) | KC is canonical; Platform types are independent parallel definitions |
| Manifest schema | KC — `docs/specifications/manifest.schema.json` | Platform — `knowledge/manifests/import-manifest.json` | KC is canonical; Platform local manifest is a working-store artefact |
| Taxonomy schema | KC — `docs/specifications/taxonomy.schema.json` | Platform — `knowledge/taxonomy/*.json` (runtime copy) | KC is canonical; Platform files are a local runtime mirror |
| Dataset schema | KC — `docs/specifications/dataset.schema.json` | None yet | KC only; no Platform consumer yet |
| Registry schema | KC — `docs/specifications/registry.schema.json` | None yet | KC only; no Platform consumer yet |
| AI OS Consumption Contract | KC — `docs/architecture/11-ai-os-contract.md` | Platform — `docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md` | Both exist; Platform doc describes how it will implement the contract |

---

## Industry and Country Knowledge

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Industry taxonomy (canonical) | KC — `industries/` (7 stubs) | Platform — `knowledge/taxonomy/industries.json` | KC stubs are canonical labels; Platform JSON is local runtime copy |
| Country context (canonical) | KC — `countries/` (4 stubs) | Platform — `knowledge/dictionaries/countries.csv` | KC stubs are canonical; Platform CSV is local lookup table |
| Domain knowledge (AI, CRM, Finance…) | KC — `core/` (7 domain stubs) | Platform — `knowledge/assets/reference/` (13 domain dirs) | KC domain stubs are canonical; Platform reference assets are pre-KC bridge content |

---

## Generator / Pipeline

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Pack generation pipeline | KC — `src/core/generator/` (13 modules) | Platform — `scripts/knowledge/` (7 scripts) | KC is the intended canonical generator; Platform scripts are a local bridge implementation predating KC-1 |
| Pack validation | KC — `src/core/generator/validator.ts` | Platform — `src/lib/knowledge/importer/validator/` | Parallel implementations; KC is canonical per alignment doc |
| Pack manifests | KC — `manifests/manifest.json` | Platform — `knowledge/manifests/import-manifest.json` | Separate concerns: KC = producer manifest; Platform = local import record |
| Checksum verification | KC — `src/core/generator/checksum.ts` | Platform — `src/lib/knowledge/repository/checksum.ts` | Both present; KC is canonical; Platform adapts for local verification |

---

## AI / RAG

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Embedding logic | Platform only — `src/lib/ai/openai.ts` | N/A | Platform is canonical; KC has no AI code |
| Document ingestion | Platform only — `src/lib/ai/ingest.ts` | N/A | Platform is canonical |
| RAG query + streaming | Platform only — `src/app/dashboard/assistant/actions.ts` + `/api/assistant/stream` | N/A | Platform is canonical |
| Vector store | Platform only — Supabase `document_chunks` table (pgvector HNSW) | N/A | Platform is canonical |

---

## Authentication and Authorization

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Session management | Platform only — `src/lib/auth/dal.ts` | N/A | Platform is canonical; backed by Supabase GoTrue |
| Role-based access control | Platform only — `src/lib/auth/authorization.ts` + `permissions.ts` | N/A | Platform is canonical |
| Audit logging | Platform only — `src/lib/auth/audit.ts` | N/A | Platform is canonical |
| RLS policies | Platform only — `supabase/migrations/0004–0006` | N/A | Postgres RLS is the security boundary |

---

## Database

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Schema and migrations | Platform only — `supabase/migrations/` | N/A | Platform is canonical; 15 migration files |
| Multi-tenancy schema | Platform only — `supabase/migrations/0009b_enterprise_schema.sql` | N/A | Platform is canonical |
| Billing schema | Platform only — `supabase/migrations/0011_billing.sql` | N/A | Platform is canonical |

---

## CRM

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| CRM domain knowledge (concepts) | KC — `core/crm/` (stub) | Platform — `src/app/dashboard/crm/` (runtime) | KC stub is the intended canonical domain model; Platform is the live implementation |
| CRM runtime (CRUD, pipeline, import/export) | Platform only — `src/app/dashboard/crm/` | N/A | Platform is canonical |
| CRM dictionary | Platform only — `knowledge/dictionaries/crm/` | N/A | Platform is canonical |

---

## Billing and Subscriptions

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Subscription tiers | Platform only — `src/lib/stripe/plans.ts` | N/A | Platform is canonical |
| Billing schema | Platform only — `supabase/migrations/0011_billing.sql` | N/A | Platform is canonical |
| Stripe integration | Platform only — `src/lib/stripe/` + `/api/stripe/` | N/A | Platform is canonical |

---

## Observability and Operations

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Health framework | Platform only — `src/lib/health/` | N/A | Platform is canonical |
| Prometheus metrics | Platform only — `src/app/api/metrics/route.ts` | N/A | Platform is canonical |
| Grafana dashboard | Platform only — `docs/operations/grafana/eunoia-system-health.json` | N/A | Platform is canonical |
| Runbooks | Platform only — `docs/runbooks/` (19 files) | N/A | Platform is canonical |
| Structured logging | Platform only — `src/lib/logger.ts` | N/A | Platform is canonical |
| Sentry error tracking | Platform only — `sentry.*.config.ts` | N/A | Platform is canonical |

---

## Local Knowledge Working Store

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Raw source documents | Platform only — `knowledge/assets/raw/` | N/A (future: KC ingest pipeline) | Platform is current source; intended to become KC input |
| Extracted knowledge | Platform only — `knowledge/extracted/` | N/A | Platform is current source; KC pipeline to replace this |
| Knowledge graph | Platform only — `knowledge/graph/` | N/A | Platform only; no KC equivalent yet |
| Entity index | Platform only — `knowledge/index/` | N/A | Platform only; no KC equivalent yet |

---

## Deployment Infrastructure

| Area | Source Repository | Destination Repository | Current Status |
|------|-----------------|----------------------|----------------|
| Vercel deployment | Platform only — `.vercel/`, `next.config.ts` | N/A | Platform is canonical |
| CI/CD pipeline | Platform only — `.github/workflows/ci.yml` | N/A | Platform is canonical |
| Container config | Platform only — `Dockerfile`, `docker-compose.*.yml` | N/A | Platform is canonical |
| Env var bootstrap | Platform only — `tools/bootstrap/` | N/A | Platform is canonical |
| Ops scripts | Platform only — `ops/` | N/A | Platform is canonical |
