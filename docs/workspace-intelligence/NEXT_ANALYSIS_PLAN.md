# NEXT ANALYSIS PLAN

**Generated**: 2026-07-13
**Audience**: Gemini (or any subsequent AI agent) continuing this workspace audit
**Prerequisite**: Read all 8 other files in `docs/workspace-intelligence/` before proceeding

---

## Context Summary for Incoming Agent

You are auditing a two-repository enterprise workspace:

- **eunoia-knowledge-cloud** (`~/Documents/eunoia-knowledge-cloud`) — Knowledge Factory. Architecture phase complete (KC-0). Implementation not started (KC-1 at 0%).
- **eunoia-ai-os-platform** (`~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform`) — AI Runtime Platform. Production-live on Vercel. Next.js 16, React 19, Supabase, OpenAI, Stripe, Sentry.

The current sprint produced 9 index files (this directory). It was READ-ONLY — no code was modified. The indexes describe structure only.

The files you should read before starting any analysis:
1. `WORKSPACE_MAP.md` — architectural relationship between the two repos
2. `REPOSITORY_INDEX.md` — folder-by-folder map of both repos
3. `MODULE_INDEX.md` — every identifiable module with purpose and status
4. `KNOWLEDGE_INDEX.md` — all schemas, taxonomies, datasets, packs, raw assets
5. `AI_OS_INDEX.md` — all functional domains of the Platform (CRM, RAG, billing, etc.)
6. `WORKSPACE_STATISTICS.md` — numeric counts of all artefact types
7. `SOURCE_OF_TRUTH_MAP.md` — which repo owns which area
8. `MIGRATION_MAP.md` — what has moved, what is pending, what stays

---

## Recommended Analysis Sequence

### Phase 1 — Contract Verification (Read KC + Platform boundary files)

**Goal**: Confirm that Platform's actual code matches the consumption contract defined in KC.

Files to read:
- `~/Documents/eunoia-knowledge-cloud/docs/architecture/11-ai-os-contract.md`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/knowledge/types.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/knowledge/repository/manifest.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/knowledge/repository/checksum.ts`

Questions to answer:
- Does Platform's local manifest schema match KC's canonical `manifest.schema.json`?
- Does Platform's checksum implementation match KC's error codes (`ERR_MISSING_MANIFEST`, `ERR_CHECKSUM_MISMATCH`, `ERR_INCOMPATIBLE_CONTRACT`)?
- Are there fields in Platform's types that conflict with KC's canonical schema?

---

### Phase 2 — KC Generator Depth Audit (Read KC source files)

**Goal**: Understand what KC-1 must deliver and what already exists in Platform that overlaps.

Files to read:
- `~/Documents/eunoia-knowledge-cloud/src/core/generator/pipeline.ts`
- `~/Documents/eunoia-knowledge-cloud/src/core/generator/generator.ts`
- `~/Documents/eunoia-knowledge-cloud/src/core/generator/types.ts`
- `~/Documents/eunoia-knowledge-cloud/docs/architecture/06-generator-specification.md`
- `~/Documents/eunoia-knowledge-cloud/docs/architecture/12-roadmap.md`
- `~/Documents/eunoia-knowledge-cloud/docs/project/MASTER_BACKLOG.md`

Questions to answer:
- What is the KC-1 delivery scope per `MASTER_BACKLOG.md` and `12-roadmap.md`?
- Which of the 13 generator modules have passing tests vs stubs?
- What inputs does the generator pipeline expect (file formats, metadata)?

---

### Phase 3 — Platform Knowledge Pipeline Audit (Read Platform bridge scripts)

**Goal**: Characterise what the Platform bridge implementation does today so KC-1 can be spec'd to replace it.

Files to read:
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/scripts/knowledge/extract-assets.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/scripts/knowledge/classify-assets.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/scripts/knowledge/build-index.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/scripts/knowledge/import-assets.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/knowledge/importer/types.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/knowledge/index/statistics.json`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/knowledge/reports/quality/report.json`

Questions to answer:
- What file formats does the Platform importer currently handle?
- What entity types does it extract?
- What is the current import statistics state (how many assets processed)?
- What quality issues does the quality report surface?

---

### Phase 4 — Platform Database Schema Audit (Read migrations sequentially)

**Goal**: Produce a complete entity-relationship map of the Platform database.

Files to read in order:
- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_rag_invites.sql`
- `supabase/migrations/0003_grants.sql`
- `supabase/migrations/0004_indexes_policies.sql`
- `supabase/migrations/0005_schema_hardening.sql`
- `supabase/migrations/0006_hardening_v2.sql`
- `supabase/migrations/0007_get_usage_totals.sql`
- `supabase/migrations/0008_health_check.sql`
- `supabase/migrations/0009b_enterprise_schema.sql`
- `supabase/migrations/0010_crm_platform_fixed.sql`
- `supabase/migrations/0011_billing.sql`

Questions to answer:
- What are all tables, their columns, foreign keys, and RLS policies?
- Which migrations have been applied to production vs which are pending?
- Are there any RLS policy gaps visible in the SQL?

---

### Phase 5 — Platform AI / RAG Depth Audit

**Goal**: Map the complete data flow from document upload to RAG response.

Files to read:
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/ai/ingest.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/ai/openai.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/lib/ai/chunk.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/app/dashboard/assistant/actions.ts`
- `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform/src/app/api/assistant/stream/route.ts`

Questions to answer:
- What is the chunk size and overlap strategy?
- What is the HNSW match threshold?
- How many source chunks are retrieved per query?
- What is the system prompt for the assistant?

---

### Phase 6 — KC Architecture Document Deep Read

**Goal**: Verify architecture coherence and identify any specification gaps before KC-1 starts.

Files to read:
- All 10 files under `~/Documents/eunoia-knowledge-cloud/docs/architecture/`
- All 4 ADRs under `~/Documents/eunoia-knowledge-cloud/docs/architecture/adr/`
- `~/Documents/eunoia-knowledge-cloud/docs/project/OPEN_ITEMS.md`
- `~/Documents/eunoia-knowledge-cloud/docs/project/RISKS.md`

Questions to answer:
- Are there unresolved open items that block KC-1?
- Are there risks in `RISKS.md` that have worsened since the last update?
- Does the generator specification fully cover the industry and country pack structures?

---

## Specific Things This Index Did NOT Inspect

The following were intentionally excluded from this sprint (READ-ONLY, structure-only). They should be the first targets for the next audit:

| Area Not Inspected | Why It Matters |
|-------------------|---------------|
| Content of all migration SQL files | Needed for full schema map and RLS audit |
| Content of `src/lib/knowledge/*.ts` modules | Needed to characterise current Platform importer before KC-1 |
| Content of KC generator TypeScript files | Needed to verify KC-1 readiness and test coverage |
| Content of `knowledge/index/statistics.json` | Needed to understand actual knowledge import state |
| Content of `knowledge/reports/quality/report.json` | Needed to understand current data quality baseline |
| Content of KC `OPEN_ITEMS.md` and `RISKS.md` | Needed for KC-1 planning |
| Content of KC `MASTER_BACKLOG.md` | Needed to understand KC-1 scope and prioritisation |
| Content of Platform `src/app/dashboard/crm/actions.ts` | CRM action surface for completeness check |
| Content of Platform `src/lib/stripe/plans.ts` | Billing tier verification |
| Content of Platform `docs/architecture/BOUNDARY_RULES.md` | May contain additional constraints not captured here |

---

## Critical Context Notes for Incoming Agent

1. **KC-1 has NOT started.** All KC content folders (`industries/`, `countries/`, `core/`, `templates/`, `prompts/`, `datasets/`, `connectors/`) are empty stubs. Do not assume any KC content has been generated.

2. **Platform knowledge scripts are a bridge.** `scripts/knowledge/*.ts` and `src/lib/knowledge/importer/` are explicitly designated for replacement by KC in the alignment document. Do not treat them as permanent Platform components.

3. **Versions index and manifest in KC are empty.** `versions/index.json` and `manifests/manifest.json` were found to be 1-line files (stubs). No packs have been published.

4. **15 migration files exist, not 11.** There are duplicate/fix variants for migration 0009 and 0010. Read all files; use only the `_fixed` variants if both exist for the same version number.

5. **Production is live.** The Platform is deployed. Any analysis that leads to recommendations involving database changes must account for production impact.

6. **The KC CLI entry point is referenced in `package.json` but the file does not exist.** `src/cli/pipeline.cli.ts` is listed as the `pipeline` script target but was not found in the scanned file tree. Verify before assuming any CLI capability.
