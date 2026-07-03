# Knowledge Brain — Processing Pipeline

## Overview

Every document that enters the Eunoia AI OS is processed through a deterministic pipeline that produces a fully-annotated `KnowledgeDocument`. The pipeline is pure (no side effects, no I/O) and stateless (same input always produces equivalent output).

## Pipeline Steps

### Step 1 — Ingest Raw Input

```typescript
const raw: RawKnowledgeInput = {
  title: "...",
  content: "...",
  category: "Services",     // optional — defaults to "General"
  metadata: { author: "..." },
  source: { type: "upload", identifier: "file-123" },
};
```

### Step 2 — Text Normalisation

`normalizeWhitespace(stripHtml(raw.content))`

- Strip HTML tags and decode entities (`&amp;`, `&nbsp;`, etc.)
- Normalise to Unicode NFC
- Convert all whitespace variants to plain ASCII space
- Collapse multiple consecutive spaces to one
- Trim leading and trailing whitespace

Title receives the same treatment without HTML stripping.

### Step 3 — Entity Extraction

`extractEntities(title + " " + content)`

Runs two extractors in sequence:

**Pattern extractor** (regex-based, ordered by confidence):
1. Email — confidence 0.99
2. Website — confidence 0.99
3. Company (requires legal suffix: Ltd, LLC, Inc, Corp…) — confidence 0.85
4. Phone — confidence 0.90
5. Person (two consecutive Title-Case words) — confidence 0.55

**Dictionary extractor** (keyword lookup):
- ~60 known Technology, Platform, and Tool names
- Word-boundary matched against lowercased content
- Confidence 0.90–0.95

Deduplication: entities with the same type + normalized value are merged; `occurrences` is incremented.

### Step 4 — Keyword Extraction

`extractKeywords(content, title)`

- Tokenise into lowercase words (length > 2, stop words removed)
- Title tokens weighted 2.5× for scoring
- Scored by: frequency × (1 + length bonus) × title multiplier
- Top 10 → `primary`; next 15 → `secondary`
- Synonym lookup against 17 business domain groups → `synonyms`

### Step 5 — Relationship Inference

`buildRelationships(entities, documentId)`

- **Co-occurrence rules**: if Company + Service entities both appear → `company_owns_service`
- **Co-occurrence rules**: if Company + Client → `company_worked_with_client`
- **Co-occurrence rules**: if Person + Company → `person_works_at_company`
- **Document reference rules**: if Service entity found → `document_references_service`
- **Document reference rules**: if Client entity found → `document_references_client`
- Confidence = min(subject.confidence, object.confidence) × rule base weight

### Step 6 — Scoring

`scoreDocument(category, metadata, entities, contentLength, keywordCount)`

Returns `KnowledgeScores` with five dimensions, all 0–1:

| Dimension | Inputs |
|-----------|--------|
| importance | Category weight + document type bonus + entity count |
| freshness | Age in days (1.0 ≤7d, 0.9 ≤30d, 0.75 ≤90d, 0.6 ≤180d, 0.4 ≤365d, 0.2 older) |
| confidence | Entity count (up to 0.35) + content length (up to 0.35) + base 0.3 |
| businessValue | Per-category lookup table |
| aiUsefulness | Per-category base + (entity + keyword count) × 0.015 |

### Step 7 — Assemble KnowledgeDocument

All outputs are assembled into a single immutable `KnowledgeDocument`:
- `tags` derived from first 8 primary keywords with descending weights
- `references` starts empty — populated by callers that link documents
- `id` is a new UUID; `metadata.created/modified` default to now

## Chunking (Optional)

`chunkDocument(doc, chunkSize = 500)`

Splits document content into sequential word-count chunks. Each chunk is independently entity- and keyword-annotated. Intended as pre-processing for future embedding pipelines — not invoked in the current sprint.

## Duplicate Detection

`findDuplicates(documents, threshold = 0.8)`

1. Compare all pairs of titles by normalised Jaccard bigram+trigram similarity
2. Compare all pairs of content bodies by same method
3. Return pairs where similarity ≥ threshold as `{ aIndex, bIndex, similarity, type }`
4. Type is `"exact"` if normalised strings match exactly, `"near"` otherwise

O(n²) — suitable for batch processing of ≤10,000 documents in a single call.

## Usage Example

```typescript
import { processDocument, searchDocuments, findDuplicates } from "@/lib/knowledge/knowledge";

// Process
const doc = processDocument({
  title: "Luxury Event Package",
  content: "Our premium event management service covers...",
  category: "Services",
  source: { type: "upload", identifier: "kb-doc-456" },
});

// Search
const results = searchDocuments([doc, ...otherDocs], "event planning");

// Deduplicate
const dupes = findDuplicates([doc, ...otherDocs]);
```
