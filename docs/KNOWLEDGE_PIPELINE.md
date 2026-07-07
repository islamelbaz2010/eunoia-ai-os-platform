# Knowledge Brain — Processing Pipeline

## Overview

Every asset that enters the Eunoia AI OS is processed through a deterministic pipeline that produces a fully-annotated `KnowledgeAsset`. The pipeline is pure (no side effects, no I/O) and stateless (same input always produces equivalent output).

## Pipeline Steps

### Step 1 — Ingest Raw Input

```typescript
const raw: RawAssetInput = {
  title: "...",
  content: "...",
  assetType: "SOP",          // optional — defaults to "DOCUMENT"
  category: "Services",     // optional — defaults to "General"
  metadata: {
    department: "Operations",
    industry: "Hotels",
    author: "Jane Smith",
  },
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

### Step 3 — Canonical ID + Language Detection

`nextCanonicalId()` → `KB-000001`

- Sequential in-process counter padded to 6 digits
- Callers persisting assets to a database must record the returned `canonicalId`

`detectLanguage(cleanContent)` → `"en" | "ar" | "mixed" | "unknown"`

- Counts Arabic-script and Latin characters
- `arabicFraction = arabicChars / (arabicChars + latinChars)`
- `>= 0.8` → `"ar"`, `<= 0.2` → `"en"`, in between → `"mixed"`
- Fewer than 5 meaningful chars → `"unknown"`

### Step 4 — Entity Extraction (Three-Tier Rule Engine)

`extractEntities(title + " " + content)`

Runs three rule tiers in priority order:

**PatternRules** (regex, priority 1–3):
1. Email — confidence 0.99
2. Website — confidence 0.99
3. Phone — confidence 0.90
4. Company (requires legal suffix: Ltd, LLC, Inc, Corp…) — confidence 0.85

**DictionaryRules** (keyword lookup, priority 2):
- ~19 known company brands (no suffix required: Google, Microsoft, Eunoia, Meta…) — confidence 0.90
- ~65 Technology / Platform / Tool keywords — confidence 0.95

**HeuristicRules** (context-based, priority 5):
- Person (two consecutive Title-Case words, deny-listed false positives) — confidence 0.55

Deduplication: entities with the same (type, normalized) key are merged; `occurrences` is summed.

### Step 5 — Keyword Extraction

`extractKeywords(content, title)`

- Tokenise into lowercase words (length > 2, stop words removed)
- Title tokens weighted 2.5× for scoring
- Scored by: frequency × (1 + length bonus) × title multiplier
- Top 10 → `primary`; next 15 → `secondary`
- Synonym lookup against 17 business domain groups → `synonyms`

### Step 6 — Relationship Inference

`buildRelationships(entities, assetId)`

- **Co-occurrence rules**: Company + Service → `company_owns_service`
- **Co-occurrence rules**: Company + Client → `company_worked_with_client`
- **Co-occurrence rules**: Person + Company → `person_works_at_company`
- **Document reference rules**: Service entity → `document_references_service`
- **Document reference rules**: Client entity → `document_references_client`

### Step 7 — Scoring

`scoreDocument(category, metadata, entities, contentLength, keywordCount)`

Returns `KnowledgeScores` with seven dimensions, all 0–1:

| Dimension | Inputs |
|-----------|--------|
| importance | Category weight + document type bonus + entity count |
| freshness | Age since `modified` (1.0 ≤7d → 0.2 >365d) |
| confidence | Entity count (≤0.35) + content length (≤0.35) + base 0.3 |
| businessValue | Per-category lookup table |
| aiUsefulness | Per-category base + richness bonus |
| knowledgeFreshness | Age since `lastVerifiedAt` (0 = never verified) |
| verificationScore | `reviewStatus` (approved=1.0, pending=0.7, draft=0.3, rejected=0.1) |

### Step 8 — Assemble KnowledgeAsset

All outputs are assembled into a single immutable `KnowledgeAsset`:
- `id` is a new UUID
- `canonicalId` is KB-XXXXXX (sequential counter)
- `assetType` defaults to `"DOCUMENT"` if not supplied
- `tags` derived from first 8 primary keywords with descending weights
- `references` starts empty — populated by callers that link assets
- `referenceCount` starts at 0 — incremented by callers
- `metadata.created/modified` default to now
- `metadata.department` defaults to `"General"`
- `metadata.industry` defaults to `"Other"`
- `metadata.reviewStatus` defaults to `"draft"`

## Chunking (Optional)

`chunkAsset(asset, chunkSize = 500)`

Splits asset content into sequential word-count chunks. Each chunk is independently entity- and keyword-annotated. Intended as pre-processing for future embedding pipelines.

## Duplicate Detection

`findDuplicateAssets(assets, threshold = 0.8)`

1. Compare all pairs of titles by normalised Jaccard bigram+trigram similarity
2. Compare all pairs of content bodies by same method
3. Return pairs where similarity ≥ threshold as `{ aIndex, bIndex, similarity, type }`
4. Type is `"exact"` if normalised strings match exactly, `"near"` otherwise

O(n²) — suitable for batch processing of ≤10,000 assets in a single call.

## Usage Example

```typescript
import { processAsset, searchAssets, findDuplicateAssets } from "@/lib/knowledge/knowledge";

// Process
const asset = processAsset({
  title: "Luxury Event Package",
  content: "Our premium event management service covers...",
  assetType: "SERVICE",
  category: "Services",
  metadata: { department: "Sales", industry: "Hotels" },
  source: { type: "upload", identifier: "kb-doc-456" },
});

// Inspect
console.log(asset.canonicalId);        // "KB-000001"
console.log(asset.metadata.language);  // "en"
console.log(asset.scores.verificationScore); // 0.3 (draft)

// Search
const results = searchAssets([asset, ...otherAssets], "event planning");
results.forEach(r => console.log(r.asset.canonicalId, r.relevance));

// Deduplicate
const dupes = findDuplicateAssets([asset, ...otherAssets]);
```
