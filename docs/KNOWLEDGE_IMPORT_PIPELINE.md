# Knowledge Import Pipeline

## Overview

The Import Pipeline ingests raw content from heterogeneous sources (PDFs, CRM records, Slack exports, web pages…) into `KnowledgeAsset` objects and persists them in the `KnowledgeRepository`. Each import run produces an `ImportManifest` — an immutable audit record of what was processed, created, skipped, and failed.

---

## Pipeline Stages

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Source     │────►│  processAsset│────►│  Repository   │
│  Connector  │     │  (pipeline)  │     │  saveAsset()  │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                                         ┌────────▼────────┐
                                         │ ImportManifest  │
                                         │ (audit record)  │
                                         └─────────────────┘
```

### Stage 1 — Source Connector

Reads raw content from a source system and produces `RawAssetInput`. Source connectors are external to the knowledge library:

```typescript
// Example connector (not in knowledge lib)
async function importFromNotion(pageId: string): Promise<RawAssetInput> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return {
    title: page.properties.title.title[0]?.plain_text ?? "",
    content: await getPlainTextContent(pageId),
    assetType: "DOCUMENT",
    sourceId: `notion:${pageId}`,
    metadata: { sourceUrl: `https://notion.so/${pageId}` },
  };
}
```

### Stage 2 — processAsset()

The processing pipeline is pure and stateless. It produces a fully-annotated `KnowledgeAsset` in memory:

```
normaliseText → detectLanguage → extractEntities → extractKeywords
→ buildRelationships → scoreDocument → sha256(content) → KnowledgeAsset
```

See `KNOWLEDGE_PIPELINE.md` for the step-by-step breakdown.

### Stage 3 — Repository Persistence

`repo.saveAsset(asset)` persists to the in-memory store and returns a `SaveResult`:

- `isNew: true` — first time this asset ID has been seen
- `wasDuplicate: true` — content hash matches another asset (potential duplicate)
- `version` — the `AssetVersion` record created for this save

### Stage 4 — Manifest Recording

`ImportManifestBuilder` tracks the outcome of every file attempted:

- `recordCreated(id)` — asset was new and saved
- `recordUpdated(id)` — asset existed and was updated
- `recordDuplicate()` — content hash collision detected; skipped
- `recordError(file, error)` — exception during processing
- `recordSkipped()` — deliberately skipped (e.g. size limit exceeded)
- `recordWarning(text)` — non-fatal issue worth logging

---

## Complete Import Loop

```typescript
import {
  KnowledgeRepository,
  ImportManifestBuilder,
  validateAsset,
} from "@/lib/knowledge";
import { processAsset } from "@/lib/knowledge";

const repo = new KnowledgeRepository();
const builder = new ImportManifestBuilder();

for (const rawInput of rawInputs) {
  try {
    const asset = processAsset(rawInput);

    // Optional: validate before saving
    const report = validateAsset(asset);
    if (!report.passed) {
      builder.recordError(rawInput.title, report.errors.join("; "));
      continue;
    }

    const { isNew, wasDuplicate } = repo.saveAsset(asset, {
      createdBy: "import-job-2026-07",
      changeNote: "Batch import from Notion workspace",
    });

    if (wasDuplicate) {
      builder.recordDuplicate();
    } else if (isNew) {
      builder.recordCreated(asset.id);
    } else {
      builder.recordUpdated(asset.id);
    }

  } catch (err) {
    builder.recordError(rawInput.title, String(err));
  }
}

const manifest = builder.build(repo.listAssets());
console.log(`Import complete in ${manifest.durationMs}ms`);
console.log(`Created: ${manifest.filesProcessed}, Errors: ${manifest.errorsEncountered}`);
```

---

## ImportManifest Fields

```typescript
interface ImportManifest {
  importId: string;           // UUID for this import run
  startedAt: string;          // ISO 8601
  completedAt: string;        // ISO 8601
  durationMs: number;
  filesProcessed: number;     // created + updated + errored
  filesSkipped: number;       // duplicates + manual skips
  duplicatesFound: number;    // hash collision count
  errorsEncountered: number;
  warningsEncountered: number;
  assetsCreated: string[];    // asset IDs of new saves
  assetsUpdated: string[];    // asset IDs of re-saves
  errors: ImportError[];      // { file, error } pairs
  warnings: string[];
  statistics: ImportStatistics;
}

interface ImportStatistics {
  totalAssets: number;
  byAssetType: Record<string, number>;    // e.g. { "DOCUMENT": 42, "SOP": 3 }
  byCategory: Record<string, number>;     // e.g. { "Technology": 18, "Sales": 12 }
  byLanguage: Record<string, number>;     // e.g. { "en": 35, "ar": 7 }
  avgQualityScore: number;
  avgEntityCount: number;
}
```

---

## Source Types and Connectors

| Source | Connector Location | Status |
|--------|-------------------|--------|
| PDF, DOCX, PPTX | External (caller reads file, passes text) | KB-3 |
| Markdown | External string reader | Available now |
| Website | External web scraper | KB-3 |
| CRM (Supabase contacts/companies) | `src/app/dashboard/crm/` | KB-3 bridge |
| Database | Custom query → `RawAssetInput` | KB-3 |
| Email | Resend webhooks → parse → ingest | KB-3 |
| WhatsApp | Export file parse | Future |
| Slack | Slack export JSON parse | Future |
| GitHub | GitHub API → issue/PR content | Future |
| Notion | Notion SDK → block content | Future |
| Google Drive | Drive API → document export | Future |
| Manual Upload | Dashboard KB upload form | Available now |
| API | Webhook payload → `RawAssetInput` | KB-3 |

---

## ProcessingReport

`processAssetWithReport()` wraps `processAsset()` and returns timing data:

```typescript
const { asset, report } = processAssetWithReport(rawInput);

console.log(`Processed in ${report.totalDurationMs}ms`);
// report.normalizationDurationMs, .extractionDurationMs, .keywordDurationMs, .relationshipDurationMs
// report.stepsCompleted: ["Imported", "Normalized", "Extracted"]
```

> **Note**: Individual phase durations are estimated proportions of total time. For precise per-phase timing, pass the raw pipeline functions individually (see `knowledge.ts` extension points).

---

## Duplicate Handling Strategy

| Strategy | When to use |
|----------|------------|
| **Skip** (default) | Same content from same source — silent dedup |
| **Keep both** | Same content, different context or department |
| **Merge** | Manually merge metadata, keep latest hash |
| **Quarantine** | Flag for human review before persisting |

The default `repo.saveAsset()` always persists (never silently discards). Callers choose the strategy based on `SaveResult.wasDuplicate`.
