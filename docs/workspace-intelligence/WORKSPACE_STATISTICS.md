# WORKSPACE STATISTICS

**Generated**: 2026-07-13
**Method**: `find` and `wc -l` counts — no source file content read

---

## Repository Counts

| Metric | Value |
|--------|-------|
| Total repositories | 2 |
| Production-live repositories | 1 (Platform) |
| Architecture-complete, implementation-pending repositories | 1 (KC) |

---

## Top-Level Folders

| Repository | Top-Level Folders (excl. hidden + node_modules) |
|-----------|--------------------------------------------------|
| eunoia-knowledge-cloud | 14 (`src`, `core`, `schemas`, `templates`, `prompts`, `connectors`, `datasets`, `industries`, `countries`, `manifests`, `versions`, `docs`, `tests`, `dist`) |
| eunoia-ai-os-platform | 15 (`src`, `supabase`, `tools`, `scripts`, `knowledge`, `ops`, `docs`, `audit`, `public`, `downloads`, `secrets`, `.github`, `.ai`, `sentry configs`, `ecosystem config`) |
| **Total** | **29** |

---

## Documentation

| Category | Count | Location |
|----------|-------|----------|
| KC architecture docs | 15 | `eunoia-knowledge-cloud/docs/architecture/` |
| KC project docs | 9 | `eunoia-knowledge-cloud/docs/project/` |
| KC specification schemas (JSON) | 5 | `eunoia-knowledge-cloud/docs/specifications/` |
| KC ADRs | 4 | `eunoia-knowledge-cloud/docs/architecture/adr/` |
| Platform docs folder | 134 | `eunoia-ai-os-platform/docs/` |
| Platform root-level markdown | 33 | `eunoia-ai-os-platform/*.md` |
| Platform audit docs | 14 | `eunoia-ai-os-platform/audit/` |
| **Total markdown files** | **~220** | |

---

## Scripts

| Category | Count | Location |
|----------|-------|----------|
| KC scripts | 0 | `eunoia-knowledge-cloud/scripts/` (empty) |
| Platform scripts (all) | 31 | `eunoia-ai-os-platform/scripts/` |
| Platform knowledge pipeline scripts | 7 | `scripts/knowledge/` |
| Platform exhibition automation scripts | 9 | `scripts/exhibition/` |
| Platform launch validation scripts | 8 | `scripts/launch/` |
| Platform ops scripts | 15 | `eunoia-ai-os-platform/ops/` |
| **Total scripts** | **46** | |

---

## Tools

| Category | Count | Location |
|----------|-------|----------|
| Bootstrap tool files | 16 | `eunoia-ai-os-platform/tools/bootstrap/` |
| **Total tool files** | **16** | |

---

## Schemas

| Category | Count | Location |
|----------|-------|----------|
| KC canonical JSON schemas | 5 | `eunoia-knowledge-cloud/docs/specifications/` |
| Platform local taxonomy JSONs | 6 | `eunoia-ai-os-platform/knowledge/taxonomy/` |
| Platform knowledge index JSONs | 2 | `eunoia-ai-os-platform/knowledge/index/statistics.json`, `knowledge/graph/*.json` |
| Platform knowledge graph JSONs | 3 | `eunoia-ai-os-platform/knowledge/graph/` |
| Platform knowledge manifests | 1 | `eunoia-ai-os-platform/knowledge/manifests/import-manifest.json` |
| **Total schemas** | **17** | |

---

## Templates

| Category | Count | Location |
|----------|-------|----------|
| KC templates | 0 | `eunoia-knowledge-cloud/templates/` (empty stub) |
| Platform knowledge templates | 0 | `eunoia-ai-os-platform/knowledge/templates/` (stub, README only) |
| **Total templates** | **0** | |

---

## Datasets

| Category | Count | Location |
|----------|-------|----------|
| KC datasets | 0 | `eunoia-knowledge-cloud/datasets/` (empty stub) |
| Platform knowledge dictionaries (CSV) | 10 | `eunoia-ai-os-platform/knowledge/dictionaries/` |
| Platform knowledge index CSVs | 7 | `eunoia-ai-os-platform/knowledge/index/` |
| **Total dataset files** | **17** | |

---

## Prompts

| Category | Count | Location |
|----------|-------|----------|
| KC generator prompts | 0 | `eunoia-knowledge-cloud/prompts/` (empty stub) |
| Platform runtime prompts | 0 | `eunoia-ai-os-platform/knowledge/prompts/` (stub, README only) |
| **Total prompts** | **0** | |

---

## Generators

| Category | Count | Location |
|----------|-------|----------|
| KC generator pipeline modules | 13 | `eunoia-knowledge-cloud/src/core/generator/` |
| Platform knowledge pipeline scripts | 7 | `eunoia-ai-os-platform/scripts/knowledge/` |
| **Total generator modules** | **20** | |

---

## Knowledge Packs

| Category | Count | Location |
|----------|-------|----------|
| KC industry pack stubs | 7 | `eunoia-knowledge-cloud/industries/` |
| KC country context stubs | 4 | `eunoia-knowledge-cloud/countries/` |
| KC core domain stubs | 7 | `eunoia-knowledge-cloud/core/` |
| Packed / signed packs delivered | 0 | KC-1 not started |
| **Total knowledge pack stubs** | **18** | |

---

## Source Code

| Category | Count | Location |
|----------|-------|----------|
| KC TypeScript source files | 13 | `eunoia-knowledge-cloud/src/` |
| KC test files | 10 | `eunoia-knowledge-cloud/tests/` |
| Platform TypeScript/TSX source files | 178 | `eunoia-ai-os-platform/src/` |
| Platform test files | 9 | Spread across `src/` |
| Platform tool files (TypeScript) | 16 | `eunoia-ai-os-platform/tools/bootstrap/` |
| **Total source files** | **226** | |

---

## Database

| Category | Count | Location |
|----------|-------|----------|
| Platform Supabase migrations | 15 files | `eunoia-ai-os-platform/supabase/migrations/` |
| Logical migration versions | 11 (0001–0011, with fix variants) | |

---

## Raw Knowledge Assets

| Category | Count | Location |
|----------|-------|----------|
| Platform raw source documents | 26 | `eunoia-ai-os-platform/knowledge/assets/raw/` |
| Platform reference domain directories | 13 | `eunoia-ai-os-platform/knowledge/assets/reference/` |
| Platform total knowledge directory files | 131 | `eunoia-ai-os-platform/knowledge/` |

---

## Summary Table

| Metric | Count |
|--------|-------|
| Total repositories | **2** |
| Total modules (identifiable) | **~65** |
| Total documentation files | **~220** |
| Total scripts | **46** |
| Total generator modules | **20** |
| Total templates | **0** |
| Total prompts | **0** |
| Total schemas | **17** |
| Total knowledge packs (shipped) | **0** |
| Total knowledge pack stubs | **18** |
| Total raw source documents | **26** |
| Total source files (TS/TSX) | **226** |
| Total database migrations | **15** |
| Total runbooks | **19** |
