# Knowledge Repository — Architecture & API Reference

## Purpose

The Knowledge Repository is the persistence and lifecycle layer for the Eunoia AI OS Knowledge Brain. It sits between the processing pipeline (`processAsset`) and downstream consumers (search, RAG, agents) and provides:

- **CRUD with immutable versioning** — every update creates a new version, never overwrites
- **SHA-256 content fingerprinting** — deterministic duplicate detection
- **Lifecycle governance** — Draft → Published → Archived state machine
- **Multi-dimensional indexing** — Asset, Entity, Relationship, Source, Category, Department, Industry
- **Batch import manifests** — audit trail for bulk ingestion operations

> **No Supabase in this layer.** The `KnowledgeRepository` class is an in-memory reference implementation. The same interface is ready to be backed by Postgres/Supabase when KB-3 is implemented.

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — SourceRecord                                     │
│  Where knowledge came from: PDF, DOCX, Slack, CRM, API…    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 — KnowledgeAsset                                   │
│  Canonical processed unit: normalised, extracted, scored    │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 — KnowledgeObject                                  │
│  Derived facts: Entity, Fact, Summary, FAQ, SOP, Chunk…     │
└─────────────────────────────────────────────────────────────┘
```

---

## File Map

```
src/lib/knowledge/repository/
├── types.ts          All repository-specific types
├── checksum.ts       sha256() + makeEtag() utilities
├── service.ts        KnowledgeRepository class (in-memory)
├── validation.ts     validateAsset() → ValidationReport
├── manifest.ts       ImportManifestBuilder class
├── queue.ts          KnowledgeJob/KnowledgeQueue types + helpers
└── index.ts          Barrel export
```

---

## Layer 1 — SourceRecord

Represents the origin file or system that produced a KnowledgeAsset.

```typescript
interface SourceRecord {
  id: string;              // UUID
  type: SourceType;        // "pdf" | "docx" | "slack" | "crm" | ... (16 types)
  provider: string;        // "google" | "microsoft" | "manual" | …
  originalPath: string;    // file path or URL
  mimeType: string | null;
  checksum: string;        // SHA-256 of original file bytes
  size: number;            // bytes
  createdAt: string;       // ISO 8601
  modifiedAt: string;      // ISO 8601
  owner: string | null;
  organizationId: string | null;
  status: SourceStatus;    // "pending" | "processing" | "active" | "failed" | "archived"
}
```

### Source Types (16)

| Type | Description |
|------|-------------|
| `pdf` | PDF document |
| `docx` | Word document |
| `pptx` | PowerPoint presentation |
| `markdown` | Markdown file |
| `website` | Scraped web page |
| `crm` | CRM record (contact, company, lead) |
| `database` | Direct database query |
| `email` | Email message |
| `whatsapp` | WhatsApp conversation export |
| `slack` | Slack channel/thread export |
| `github` | GitHub issue, PR, or README |
| `notion` | Notion page or database |
| `google_drive` | Google Doc, Sheet, or Slide |
| `manual` | Hand-typed content |
| `api` | API response payload |
| `future` | Placeholder for future connectors |

---

## Layer 2 — KnowledgeAsset (KB-2 extensions)

The existing `KnowledgeAsset` (from KB-1) gains 12 enterprise governance fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sourceId` | `string \| null` | `null` | FK → SourceRecord |
| `assetVersion` | `number` | `1` | Increments on each update |
| `processingStatus` | `AssetLifecycleStatus` | `"Extracted"` | Lifecycle stage |
| `validationStatus` | `"pending" \| "valid" \| "invalid"` | `"pending"` | QA status |
| `visibility` | `AssetVisibility` | `"Internal"` | Enterprise access control |
| `classification` | `AssetClassification` | `"Business"` | Content classification |
| `securityLevel` | `SecurityLevel` | `"Low"` | Data sensitivity |
| `reviewedBy` | `string \| null` | `null` | User ID of last reviewer |
| `approvedBy` | `string \| null` | `null` | User ID of approver |
| `publishedAt` | `string \| null` | `null` | ISO 8601 publish timestamp |
| `hash` | `string` | `sha256(content)` | SHA-256 of cleaned content |
| `etag` | `string` | `"${hash}:1"` | Content fingerprint |

### AssetVisibility

| Value | Meaning |
|-------|---------|
| `"Public"` | Visible to all users and anonymous visitors |
| `"Internal"` | Visible to all authenticated org members |
| `"Confidential"` | Role-restricted — specific teams only |
| `"Restricted"` | Admin-gated — explicit allowlist required |

### AssetClassification (12 values)

`Business` | `Marketing` | `Sales` | `Operations` | `Finance` | `HR` | `Legal` | `Technology` | `Client` | `Vendor` | `Project` | `Company`

### SecurityLevel

`Low` | `Medium` | `High` | `Critical`

---

## Layer 3 — KnowledgeObject

Extracted facts derived from a `KnowledgeAsset`. Stored separately to allow independent querying.

```typescript
interface KnowledgeObject {
  id: string;
  assetId: string;
  type: KnowledgeObjectType;    // 13 types
  content: string;
  confidence: number;           // 0–1
  importance: number;           // 0–1
  createdAt: string;            // ISO 8601
  references: string[];         // other object IDs
  relationships: string[];      // relationship descriptions
}
```

### KnowledgeObjectType (13 values)

| Type | Description |
|------|-------------|
| `Entity` | Named entity (company, person, product…) |
| `Relationship` | Typed edge between two entities |
| `Fact` | Atomic factual claim |
| `Summary` | Abstractive summary of the asset |
| `Keyword` | Important term or phrase |
| `FAQ` | Question-answer pair |
| `SOP` | Standard operating procedure |
| `Definition` | Term definition or glossary entry |
| `Metric` | Quantitative measurement |
| `Procedure` | Step-by-step instructions |
| `Insight` | AI-inferred business insight |
| `Reference` | Cross-asset citation |
| `Chunk` | Raw content segment (for future embeddings) |

---

## Repository API

All methods are available on `KnowledgeRepository` instances.

### `saveAsset(asset, options?): SaveResult`

Persists an asset. If the asset's `hash` already exists under a different ID, `wasDuplicate` is set to `true` in the result.

```typescript
const repo = new KnowledgeRepository();
const asset = processAsset({ title: "...", content: "..." });
const { asset: saved, version, isNew, wasDuplicate } = repo.saveAsset(asset);
```

### `updateAsset(id, patch, options?): UpdateResult`

Creates a new version with the patched fields. Content and hash are immutable — only lifecycle/governance metadata can be patched.

```typescript
const { asset, previousVersion, newVersion } = repo.updateAsset(assetId, {
  processingStatus: "Validated",
  reviewedBy: "user-123",
  validationStatus: "valid",
});
```

### `deleteAsset(id): boolean`

Removes the asset and clears its version history. Returns `false` if the ID does not exist.

### `archiveAsset(id, archivedBy?): KnowledgeAsset`

Sets `processingStatus` to `"Archived"`. Convenience wrapper around `updateAsset`.

### `publishAsset(id, publishedBy?): KnowledgeAsset`

Sets `processingStatus` to `"Published"`, `approvedBy`, and `publishedAt`. Convenience wrapper around `updateAsset`.

### `listAssets(filter?): KnowledgeAsset[]`

Returns all assets matching the provided filter. All filter fields are optional AND conditions.

### `getAsset(id): KnowledgeAsset | null`

Retrieves by UUID.

### `getAssetByCanonicalId(canonicalId): KnowledgeAsset | null`

Retrieves by `KB-000001` style canonical ID.

### `getAssetHistory(id): AssetVersion[]`

Returns all versions in chronological order (oldest first).

### `buildIndexes()`

Builds seven in-memory indexes from current state. Suitable for caching and read-path acceleration.

```typescript
const { assets, entities, relationships, sources, categories, departments, industries } = repo.buildIndexes();
```

---

## Validation

```typescript
import { validateAsset } from "@/lib/knowledge/repository";

const report = validateAsset(asset, { duplicateScore: 0 });
// report.passed         — true/false
// report.qualityScore   — 0–1
// report.missingMetadata — ["author", "owner", ...]
// report.warnings       — non-fatal issues
// report.errors         — fatal issues
```

### Quality Score Formula

```
qualityScore = (
  metadataCompleteness * 0.30 +  // 4 key fields: author, owner, reviewer, lastVerifiedAt
  contentQuality       * 0.30 +  // min(contentLength / 500, 1)
  entityRichness       * 0.20 +  // min(entityCount / 5, 1)
  scores.confidence    * 0.20    // from existing pipeline
)
```

Asset passes validation when `errors.length === 0 AND qualityScore >= 0.3`.

---

## Import Manifest

```typescript
import { ImportManifestBuilder } from "@/lib/knowledge/repository";

const builder = new ImportManifestBuilder();
for (const file of files) {
  try {
    const asset = processAsset({ title: file.name, content: file.text });
    repo.saveAsset(asset);
    builder.recordCreated(asset.id);
  } catch (e) {
    builder.recordError(file.name, String(e));
  }
}
const manifest = builder.build(repo.listAssets());
// manifest.filesProcessed, .duplicatesFound, .statistics.byCategory, ...
```

---

## Indexes

| Index | Key | Aggregates |
|-------|-----|-----------|
| `AssetIndex` | assetId | All filterable fields |
| `EntityIndex` | type::normalized | assetIds, occurrenceCount |
| `RelationshipIndex` | type::subject::object | assetIds, count |
| `SourceIndex` | sourceId | assetIds, checksum |
| `CategoryIndex` | category | assetIds, assetCount |
| `DepartmentIndex` | department | assetIds, assetCount |
| `IndustryIndex` | industry | assetIds, assetCount |

---

## Queue Architecture (KB-2 only — no workers)

`KnowledgeJob` and `KnowledgeQueue` define the contract for future async processing. Workers are out of scope for KB-2.

```typescript
import { makeJob, summariseQueue } from "@/lib/knowledge/repository";

const job = makeJob({
  type: "import",
  status: "queued",
  assetId: null,
  sourceId: "src-001",
  payload: { file: "guide.pdf" },
  priority: 1,
});

const queue = summariseQueue([job]);
// queue.pending: 1, queue.running: 0, ...
```
