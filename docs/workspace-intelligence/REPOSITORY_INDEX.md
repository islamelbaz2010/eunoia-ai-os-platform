# REPOSITORY INDEX

**Generated**: 2026-07-13
**Scope**: Both repositories treated as one workspace

---

## Repository A — eunoia-knowledge-cloud

**Path**: `~/Documents/eunoia-knowledge-cloud`
**Package**: `@eunoia/knowledge-cloud` v0.1.0
**Runtime**: Node ≥ 18 · TypeScript 5 · Jest
**Status**: KC-0 Architecture COMPLETE · KC-1 Implementation NOT STARTED

### Top Folders

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `src/` | TypeScript source — generator pipeline only | `src/index.ts`, `src/core/generator/*.ts` (13 files) |
| `core/` | Domain knowledge stubs (no code yet) | `ai/`, `business/`, `crm/`, `finance/`, `hr/`, `legal/`, `marketing/` |
| `schemas/` | Schema definitions (empty — specs in docs/) | — |
| `templates/` | Knowledge pack templates (empty stub) | — |
| `prompts/` | Generator prompts (empty stub) | — |
| `connectors/` | Source connectors (empty stub) | — |
| `datasets/` | Dataset definitions (empty stub) | — |
| `industries/` | Industry knowledge stubs | `hotels/`, `manufacturing/`, `medical/`, `real-estate/`, `restaurants/`, `retail/`, `tourism/` |
| `countries/` | Country context stubs | `egypt/`, `global/`, `saudi/`, `uae/` |
| `manifests/` | Pack manifest (empty stub) | `manifest.json` |
| `versions/` | Version index | `index.json` |
| `docs/` | Architecture + project documentation | 29 `.md` files + 5 JSON schemas |
| `tests/` | Unit tests — mirrors `src/core/generator/` | 10 test files in `tests/unit/core/generator/` |
| `dist/` | Build output (compiled JS) | — |

### Important Files

| File | Purpose |
|------|---------|
| `package.json` | Package metadata, scripts (`build`, `test`, `pipeline`) |
| `tsconfig.json` / `tsconfig.build.json` | TypeScript config (strict) |
| `jest.config.js` | Jest test runner config |
| `docs/architecture/11-ai-os-contract.md` | Formal consumption contract with AI OS |
| `docs/architecture/12-roadmap.md` | KC-0 through KC-4 phase plan |
| `docs/project/IMPLEMENTATION_STATUS.md` | Per-component status (KC-0 DONE, KC-1–4 pending) |
| `docs/specifications/knowledge-pack.schema.json` | Canonical pack schema |
| `docs/specifications/manifest.schema.json` | Manifest validation schema |
| `docs/specifications/taxonomy.schema.json` | Taxonomy schema |
| `docs/specifications/dataset.schema.json` | Dataset schema |
| `docs/specifications/registry.schema.json` | Registry schema |
| `docs/architecture/adr/ADR-0001` through `ADR-0004` | Architecture Decision Records |

---

## Repository B — eunoia-ai-os-platform

**Path**: `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform`
**Package**: `eunoia-ai-os-platform` v0.1.0
**Runtime**: Node ≥ 20 · Next.js 16.2.9 · React 19.2.4 · TypeScript 5 · Vitest
**Status**: PRODUCTION LIVE — `eunoia-ai-os-platform.vercel.app`

### Top Folders

| Folder | Purpose | Approx Size |
|--------|---------|-------------|
| `src/` | All application source code | 178 TS/TSX files |
| `src/app/` | Next.js App Router pages and API routes | ~120 files |
| `src/lib/` | Server-side library modules | ~58 files |
| `supabase/` | Database migrations (PostgreSQL + pgvector + RLS) | 11 migration files (0001–0011) |
| `tools/bootstrap/` | Vercel env-sync tool (reads Excel, writes env vars) | 16 files |
| `scripts/` | Operational, knowledge, and exhibition scripts | 31 files |
| `scripts/knowledge/` | Local knowledge pipeline scripts (pre-KC bridge) | 7 TypeScript files |
| `scripts/exhibition/` | Exhibition demo automation | 9 files |
| `scripts/launch/` | Production launch validation | 8 files |
| `knowledge/` | Local knowledge working store | 131 files total |
| `knowledge/assets/raw/` | Unprocessed source documents (PDF, DOCX, PNG) | 26 files |
| `knowledge/assets/reference/` | Reference knowledge by domain | 13 domain directories |
| `knowledge/taxonomy/` | Local runtime taxonomy JSONs | 7 files |
| `knowledge/dictionaries/` | Named-entity lookup CSVs | 10 CSV files |
| `knowledge/index/` | Built asset + entity + relationship indexes | 9 CSV/JSON files |
| `knowledge/graph/` | Relationship graph (nodes, edges) | 3 JSON files |
| `ops/` | Operational scripts (deploy, backup, monitoring) | 15 files |
| `docs/` | Project documentation | 134 markdown files |
| `docs/runbooks/` | Incident response runbooks | 19 files |
| `docs/architecture/` | Alignment and boundary docs | 9 files |
| `docs/operations/` | Grafana, Prometheus, Sentry, logging guides | 5 files |
| `docs/exhibition-final/` | Exhibition readiness package | 17 files |
| `audit/` | Full platform audit reports | 14 files |
| `public/` | Static assets | — |
| `.github/` | GitHub Actions CI | `workflows/ci.yml` |

### Important Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: Next.js, OpenAI, Supabase, Stripe, Sentry, Zod v4, Recharts |
| `next.config.ts` | Next.js 16 config, Sentry wrapper, security headers |
| `src/proxy.ts` | Route protection (renamed from middleware.ts in Next.js 16) |
| `src/lib/auth/dal.ts` | Session + org data access layer |
| `src/lib/auth/audit.ts` | Immutable audit event logger |
| `src/lib/ai/openai.ts` | Embeddings + chat completion (server-only) |
| `src/lib/ai/ingest.ts` | Document ingestion + chunking pipeline (server-only) |
| `src/lib/env.ts` | Environment variable validation (server-only) |
| `src/lib/email.ts` | Resend email delivery |
| `src/lib/health/manager.ts` | Health check orchestrator (8 providers) |
| `src/lib/stripe/plans.ts` | Subscription tier definitions |
| `supabase/migrations/0001_init.sql` | Initial schema (orgs, members, contacts, docs, embeddings) |
| `supabase/migrations/0011_billing.sql` | Stripe billing schema |
| `docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md` | KC↔Platform boundary definition |
| `CLAUDE.md` | AI engineering session rules and key file map |
| `ecosystem.config.js` | PM2 process config |
| `Dockerfile` + `docker-compose.production.yml` | Container deployment |
| `.vercel/` | Vercel project link |
