# Knowledge Brain — Architecture

## Purpose

The Knowledge Brain is the single source of truth for all content ingested into Eunoia AI OS. It is a pure, stateless processing layer — no database calls, no external services, no embeddings. Every future AI system (RAG, agents, search, knowledge graph) reads from the normalised output it produces.

## Design Principles

1. **No external dependencies** — all extraction and scoring is deterministic, rule-based, and offline.
2. **Immutable outputs** — every function returns new values; nothing is mutated in place.
3. **Typed at the boundary** — `RawKnowledgeInput` is the only untrusted entry point. All outputs are fully typed.
4. **Separation of concerns** — extraction, normalisation, scoring, and search are independent modules with no cross-dependencies beyond `types.ts`.
5. **Composable** — each sub-function can be called in isolation for testing or incremental pipeline construction.

## Module Map

```
src/lib/knowledge/
├── types.ts                  Domain models — all types exported here
├── knowledge.ts              Public API: processDocument, chunkDocument, findDuplicates
│
├── extractors/
│   ├── entities.ts           Pattern + dictionary entity extraction (no NLP)
│   └── keywords.ts           TF-IDF-inspired keyword extraction with synonym map
│
├── normalizers/
│   ├── text.ts               Unicode NFC, whitespace collapse, HTML stripping, truncation
│   └── duplicates.ts         Bigram+trigram Jaccard similarity, duplicate detection
│
├── relationships/
│   └── builder.ts            Co-occurrence rules → relationship inference
│
├── scoring/
│   └── scorer.ts             Per-category importance, freshness, confidence, value scores
│
└── search/
    └── index.ts              Keyword-based full-text search with synonym expansion
```

## Data Flow

```
RawKnowledgeInput
        │
        ▼
  normalizeWhitespace + stripHtml        ← text.ts
        │
        ├──► extractEntities()           ← extractors/entities.ts
        │         │
        │         └──► buildRelationships()   ← relationships/builder.ts
        │
        ├──► extractKeywords()           ← extractors/keywords.ts
        │
        ├──► scoreDocument()             ← scoring/scorer.ts
        │
        └──► KnowledgeDocument  ◄────── assembled in knowledge.ts
```

## Dependency Graph

```
knowledge.ts
  ├── extractors/entities.ts
  │     └── normalizers/text.ts
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
| NLP-based NER | Replace or augment `extractors/entities.ts` |
| Embedding generation | New `extractors/embeddings.ts`, called after `processDocument` |
| Vector search | New `search/vector.ts`, parallel to `search/index.ts` |
| Language detection | Replace `inferLanguage()` stub in `knowledge.ts` |
| New relationship rules | Add to `CO_OCCURRENCE_RULES` in `relationships/builder.ts` |
| New entity types | Add to `KnowledgeEntityType` in `types.ts` + extend extractor |
| Database persistence | Caller responsibility — `KnowledgeDocument` is a pure value |
