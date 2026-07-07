# Knowledge Brain — Architecture

## Purpose

The Knowledge Brain is the single source of truth for all content ingested into Eunoia AI OS. It is a pure, stateless processing layer — no database calls, no external services, no embeddings. Every future AI system (RAG, agents, search, knowledge graph) reads from the normalised output it produces.

## Design Principles

1. **Asset-centric** — every piece of knowledge (document, SOP, email, invoice, video, workflow) is a `KnowledgeAsset`. `KnowledgeDocument` is a backwards-compatible alias.
2. **No external dependencies** — all extraction and scoring is deterministic, rule-based, and offline.
3. **Immutable outputs** — every function returns new values; nothing is mutated in place.
4. **Typed at the boundary** — `RawAssetInput` is the only untrusted entry point. All outputs are fully typed.
5. **Separation of concerns** — extraction, normalisation, scoring, and search are independent modules with no cross-dependencies beyond `types.ts`.
6. **Composable** — each sub-function can be called in isolation for testing or incremental pipeline construction.

## Module Map

```
src/lib/knowledge/
├── types.ts                  Domain models — all types exported here
├── knowledge.ts              Public API: processAsset, chunkAsset, findDuplicateAssets
│
├── extractors/
│   ├── entities.ts           Rule engine orchestrator — imports all rule sets
│   ├── keywords.ts           TF-IDF-inspired keyword extraction with synonym map
│   └── rules/
│       ├── index.ts          ExtractionRule interface + runRules() orchestrator
│       ├── pattern.ts        PatternRules — regex (Email, Phone, URL, Company+suffix)
│       ├── dictionary.ts     DictionaryRules — known companies + technology terms
│       └── heuristic.ts      HeuristicRules — Person two-cap-word heuristic
│
├── normalizers/
│   ├── text.ts               NFC, whitespace collapse, HTML stripping, language detection
│   └── duplicates.ts         Bigram+trigram Jaccard similarity, duplicate detection
│
├── relationships/
│   └── builder.ts            Co-occurrence rules → relationship inference
│
├── scoring/
│   └── scorer.ts             Per-category importance, freshness, verification scores
│
└── search/
    └── index.ts              Keyword-based full-text search with synonym expansion
```

## Data Flow

```
RawAssetInput
        │
        ▼
  normalizeWhitespace + stripHtml     ← text.ts
        │
        ├──► detectLanguage()         ← text.ts
        │
        ├──► nextCanonicalId()        ← knowledge.ts (KB-000001 counter)
        │
        ├──► extractEntities()        ← extractors/entities.ts
        │         │   PatternRules → DictionaryRules → HeuristicRules
        │         └──► buildRelationships()  ← relationships/builder.ts
        │
        ├──► extractKeywords()        ← extractors/keywords.ts
        │
        ├──► scoreDocument()          ← scoring/scorer.ts
        │
        └──► KnowledgeAsset  ◄─────── assembled in knowledge.ts
```

## Dependency Graph

```
knowledge.ts
  ├── extractors/entities.ts
  │     ├── extractors/rules/index.ts
  │     ├── extractors/rules/pattern.ts
  │     ├── extractors/rules/dictionary.ts
  │     └── extractors/rules/heuristic.ts
  ├── extractors/keywords.ts
  ├── relationships/builder.ts
  ├── scoring/scorer.ts
  ├── search/index.ts
  │     ├── normalizers/text.ts
  │     └── extractors/keywords.ts
  └── normalizers/
        ├── text.ts       (no deps)
        └── duplicates.ts → text.ts
```

## Extension Points

| Capability | Where to add |
|-----------|--------------|
| NLP-based NER | Add `MLRules` class in `extractors/rules/` implementing `ExtractionRule` |
| Embedding generation | New `extractors/embeddings.ts`, called after `processAsset` |
| Vector search | New `search/vector.ts`, parallel to `search/index.ts` |
| New entity types | Add to `KnowledgeEntityType` in `types.ts` + extend relevant rule |
| New known companies | Extend `KNOWN_COMPANIES` in `extractors/rules/dictionary.ts` |
| New relationship rules | Add to `CO_OCCURRENCE_RULES` in `relationships/builder.ts` |
| New asset types | Add to `ASSET_TYPE` const in `types.ts` |
| Org-specific taxonomies | Pass org context to `processAsset`; extend `RawAssetInput` |
| Alert integration | Caller responsibility — call `processAsset`, persist, then alert |
| Database persistence | Caller responsibility — `KnowledgeAsset` is a pure value |
