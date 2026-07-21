# MIGRATION MAP

**Generated**: 2026-07-13
**Method**: Evidence-based only — derived from directory structure, naming patterns, architecture documents, and the alignment doc at `docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md`

No assumptions made. Every entry below cites the evidence.

---

## How to Read This Index

**Likely migrated**: A module or capability exists in Platform but shows structural or naming overlap with KC — suggesting it may have originated in or been designed to move to KC.

**Likely pending**: A module in Platform is explicitly identified in architecture documents as a candidate for KC ownership, or KC has a stub in the same domain that has no corresponding implementation.

---

## Likely Migrated (Platform → KC direction already acknowledged)

| Module / Capability | Platform Location | KC Location | Evidence |
|---------------------|------------------|-------------|----------|
| Generator pipeline | `src/core/generator/` (KC) | `scripts/knowledge/` (Platform) | KC has a full 13-module TypeScript generator pipeline. Platform has 7 parallel knowledge pipeline scripts (`build-index.ts`, `classify-assets.ts`, `extract-assets.ts`, `import-assets.ts`, `quality-report.ts`, `scan-assets.ts`, `watch-assets.ts`). Naming overlap is high. KC generator is the canonical implementation; Platform scripts appear to be the precursor or bridge. |
| Pack validation | `src/core/generator/validator.ts` (KC) | `src/lib/knowledge/importer/validator/index.ts` (Platform) | Both implement validation logic. The alignment doc states: "move authoritative implementations to Cloud; keep lightweight adapters for offline/manual ingestion." |
| Checksum verification | `src/core/generator/checksum.ts` (KC) | `src/lib/knowledge/repository/checksum.ts` (Platform) | Identical capability in both repos. KC is the canonical implementation per the AI OS contract document. |
| Pack manifest handling | `src/core/generator/manifest.ts` (KC) | `src/lib/knowledge/repository/manifest.ts` (Platform) | Both handle manifest read/write. KC's `manifest.ts` is the canonical pack producer; Platform's is the local consumer adapter. |
| Taxonomy classification | `src/core/generator/taxonomy.ts` (KC) | `knowledge/taxonomy/*.json` (Platform) | KC has a taxonomy classification module in the generator. Platform has static taxonomy JSON files. KC is the canonical taxonomy authority per architecture docs. |
| Industry knowledge labels | `industries/` stubs (KC) | `knowledge/taxonomy/industries.json` (Platform) | KC industry stubs are the canonical source. Platform's `industries.json` is a local runtime copy of the same data. |
| Country context | `countries/` stubs (KC) | `knowledge/dictionaries/countries.csv` (Platform) | KC country stubs are the intended canonical source. Platform's CSV is a local extraction. |
| Normaliser | `src/core/generator/normalizer.ts` (KC) | `src/lib/knowledge/normalizers/text.ts` + `duplicates.ts` (Platform) | Both normalise knowledge content. KC normalizer is canonical; Platform normalizers are bridge implementations. |

---

## Likely Pending (KC should own; not yet implemented in KC)

| Capability | Current Platform Location | Intended KC Location | Evidence |
|------------|--------------------------|---------------------|----------|
| Document ingestion pipeline | `src/lib/ai/ingest.ts` + `src/lib/knowledge/importer/` | KC `connectors/` + `core/` pipeline | Alignment doc: "Move all ingestion, crawling, connector orchestration… to Knowledge Cloud." KC `connectors/` folder is an empty stub. |
| Source connector orchestration | `src/lib/knowledge/importer/filesystem/` + `scanner/` | KC `connectors/` | Alignment doc explicitly names crawler/connector migration. KC connectors folder is empty. |
| Canonical taxonomy and ontology | Platform `knowledge/taxonomy/` (local runtime) | KC `core/` + `schemas/taxonomy.schema.json` | Alignment doc: "Taxonomy, canonical ontology… to Knowledge Cloud." KC `core/` domain folders are all stubs. |
| Dataset synthesis | Platform `knowledge/dictionaries/*.csv` (working data) | KC `datasets/` | KC `datasets/` is an empty stub. Platform CSVs are manually maintained working data filling this gap. |
| Knowledge Pack build pipeline | Platform `scripts/knowledge/` (7 scripts) | KC `src/core/generator/` (13-module pipeline) | KC has the architecture and code; KC-1 implementation status is 0%. Platform scripts are the bridge. |
| Pack publisher and signing | No implementation in either repo | KC `docs/architecture/10-publisher-specification.md` | KC has a full publisher spec (signing, channels, distribution, rollback) but KC-1 is not started. No signing code exists in Platform. |
| Pack registry / catalog | No implementation in either repo | KC `docs/specifications/registry.schema.json` + `docs/architecture/05-registry-design.md` | KC has registry schema and design but no implementation. Platform has no registry client either. |
| Knowledge graph (canonical) | Platform `knowledge/graph/` (local, 3 JSON files) | KC (unspecified) | KC has no graph module. Platform graph files are local-only. No formal graph production pipeline exists. |
| Template-based knowledge generation | Platform `knowledge/templates/` (stub, README only) | KC `templates/` (empty stub) | Neither repo has template content or implementation. Both have placeholder stubs. |
| Generator CLI | Platform `scripts/knowledge/` | KC `package.json` `"pipeline"` script → `src/cli/pipeline.cli.ts` | KC `package.json` references a CLI entry (`src/cli/pipeline.cli.ts`) that does not yet exist in the scanned file tree. Evidence: CLI is planned but not implemented. |
| Multi-region knowledge distribution | No implementation in either repo | KC `docs/architecture/10-publisher-specification.md` (distribution channels) | Specified in KC architecture; not implemented anywhere. |

---

## Modules That Are Platform-Only (No KC Migration Intended)

Based on the alignment document's explicit designation of Platform as the canonical runtime consumer for these areas:

| Module | Platform Location | Notes |
|--------|------------------|-------|
| Auth, sessions, RLS | `src/lib/auth/` + Supabase | Runtime responsibility — stays in Platform |
| RAG query + streaming | `src/lib/ai/` + `/api/assistant/stream/` | Runtime responsibility — stays in Platform |
| CRM runtime | `src/app/dashboard/crm/` | Runtime responsibility — stays in Platform |
| Billing / Stripe | `src/lib/stripe/` + Supabase | Commercial runtime — stays in Platform |
| Health framework | `src/lib/health/` | Operational runtime — stays in Platform |
| Observability | Sentry, Prometheus, logger | Operational runtime — stays in Platform |
| Org management | DAL + settings | Multi-tenancy runtime — stays in Platform |
| Local knowledge search | `src/lib/knowledge/search/` | Runtime query — stays in Platform per alignment doc |
| Local pack installer | `src/lib/knowledge/repository/` | Runtime installer — stays in Platform per alignment doc |

---

## Boundary Freeze (Per Alignment Doc)

The following contracts must be preserved across any migration:

| Contract | Location | Must Not Change |
|----------|----------|----------------|
| Pack manifest schema | KC `docs/specifications/manifest.schema.json` | `packId`, `version`, `components`, `compatibility`, `checksums` |
| Resolver request/response | KC `docs/architecture/11-ai-os-contract.md` | Query inputs + pack candidate outputs |
| Telemetry event schema | KC `docs/architecture/11-ai-os-contract.md` | `packId`, `version`, `consumeTimestamp`, `validationStatus` |
| Signature + checksum semantics | KC `docs/architecture/11-ai-os-contract.md` | Verification procedure used by Platform installer |
