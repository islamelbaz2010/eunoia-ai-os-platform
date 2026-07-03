# Knowledge Asset Lifecycle

## States

```
                  ┌─────────────────────────────────────────┐
                  │              LIFECYCLE                   │
                  │                                          │
  ┌───────┐       │  ┌──────────┐     ┌───────────┐         │
  │ RAW   │──────►│  │  Draft   │────►│ Imported  │         │
  │ INPUT │       │  └──────────┘     └─────┬─────┘         │
  └───────┘       │                         │               │
                  │                         ▼               │
                  │                  ┌────────────┐         │
                  │                  │ Normalized │         │
                  │                  └─────┬──────┘         │
                  │                        │                │
                  │                        ▼                │
                  │                  ┌──────────┐           │
                  │                  │ Extracted│           │
                  │  (processAsset() │          │           │
                  │   sets this      └─────┬────┘           │
                  │   as default)          │                │
                  │                        ▼                │
                  │                  ┌──────────┐           │
                  │                  │Validated │           │
                  │                  └─────┬────┘           │
                  │                        │                │
                  │                        ▼                │
                  │                  ┌──────────┐           │
                  │                  │  Indexed │           │
                  │                  └─────┬────┘           │
                  │                        │                │
                  │              ┌─────────┴──────────┐     │
                  │              ▼                     ▼     │
                  │        ┌──────────┐         ┌──────────┐│
                  │        │Published │         │ Archived ││
                  │        └──────────┘         └──────────┘│
                  │                                          │
                  │  ┌──────────┐                            │
                  │  │ Rejected │◄── from any state          │
                  │  └──────────┘                            │
                  └─────────────────────────────────────────┘
```

## State Definitions

| State | `AssetLifecycleStatus` | Who sets it | Description |
|-------|----------------------|-------------|-------------|
| Draft | `"Draft"` | Caller | Created but not yet ingested |
| Imported | `"Imported"` | Ingestion pipeline | Raw bytes received and stored |
| Normalized | `"Normalized"` | Processing pipeline | Text cleaned and language detected |
| Extracted | `"Extracted"` | Processing pipeline | Entities, keywords, relationships extracted — **default from `processAsset()`** |
| Validated | `"Validated"` | QA step | `validateAsset()` passed |
| Indexed | `"Indexed"` | Index builder | Added to search indexes |
| Published | `"Published"` | `repo.publishAsset()` | Live and searchable |
| Archived | `"Archived"` | `repo.archiveAsset()` | Inactive but preserved |
| Rejected | `"Rejected"` | Manual review | Failed validation or policy check |

---

## Default State from `processAsset()`

```typescript
const asset = processAsset({ title: "...", content: "..." });
asset.processingStatus; // "Extracted" — pipeline completed to extraction
asset.validationStatus; // "pending" — awaiting QA check
```

`processAsset()` runs the full pipeline through entity extraction but does not validate or publish. Callers that immediately trust the output can move the asset forward:

```typescript
const asset = processAsset(raw);
repo.saveAsset(asset);
const validationReport = validateAsset(asset);
if (validationReport.passed) {
  repo.updateAsset(asset.id, {
    processingStatus: "Validated",
    validationStatus: "valid",
  });
}
```

---

## Transition API

### Move to Validated

```typescript
repo.updateAsset(id, {
  processingStatus: "Validated",
  validationStatus: "valid",
  reviewedBy: "user-456",
});
```

### Move to Published

```typescript
repo.publishAsset(id, "admin-user");
// Sets processingStatus: "Published", approvedBy: "admin-user", publishedAt: now
```

### Move to Archived

```typescript
repo.archiveAsset(id, "system");
// Sets processingStatus: "Archived"
```

### Move to Rejected

```typescript
repo.updateAsset(id, {
  processingStatus: "Rejected",
  validationStatus: "invalid",
  changeNote: "Contains inaccurate financial figures — see ticket #821",
});
```

---

## Visibility and Lifecycle

Visibility (`AssetVisibility`) is independent of lifecycle status. An asset can be:

- `Published` + `"Internal"` — visible to authenticated org members
- `Published` + `"Confidential"` — restricted to specific roles
- `Archived` + `"Public"` — still technically public until visibility is changed
- `Draft` + `"Restricted"` — locked down from the start

The application layer is responsible for combining lifecycle status and visibility into an access decision. RLS policies in Postgres (KB-3) will enforce this at the database level.

---

## Validation Status vs Processing Status

These are separate concerns:

| Field | Question | Updated by |
|-------|----------|-----------|
| `processingStatus` | *Where is this asset in the pipeline?* | System and admins |
| `validationStatus` | *Has a human or system verified the quality?* | QA step / `validateAsset()` |

An asset can be `processingStatus: "Published"` and `validationStatus: "pending"` if it was published without formal QA (emergency hotfix pattern).
