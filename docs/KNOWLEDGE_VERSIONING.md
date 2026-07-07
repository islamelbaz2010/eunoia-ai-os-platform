# Knowledge Versioning — Immutable History Design

## Principle

Every mutation of a `KnowledgeAsset` creates a new version. The previous version is never overwritten. This gives:

- **Complete audit trail** — who changed what and when
- **Point-in-time recovery** — restore any asset to any prior state
- **Change diffing** — compare hashes to detect content vs metadata changes
- **Compliance readiness** — GDPR right-to-erasure can tombstone versions without data loss for other purposes

---

## Version Identity

Each `AssetVersion` carries three identity fields:

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `hash` | `string` | `a3f9c1…` (64 hex chars) | SHA-256 of cleaned content — stable across metadata-only updates |
| `etag` | `string` | `a3f9c1…:2` | `${hash}:${version}` — unique per version, usable as HTTP ETag |
| `version` | `number` | `3` | Monotonically increasing integer per asset |

### Hash stability rule

The `hash` is computed from the **cleaned content** (`sha256(normalizeWhitespace(stripHtml(content)))`). It changes only when content changes, not when governance metadata (`processingStatus`, `reviewedBy`, etc.) changes.

This means:

- `etag` changes on every update (version increments)
- `hash` changes only when the document body is re-processed

---

## AssetVersion Structure

```typescript
interface AssetVersion {
  version: number;
  assetId: string;
  canonicalId: string;
  hash: string;
  etag: string;
  createdAt: string;           // ISO 8601 — when this version was written
  createdBy: string | null;    // user/system that triggered the change
  changeNote: string | null;   // human-readable reason
  processingStatus: AssetLifecycleStatus;
  validationStatus: "pending" | "valid" | "invalid";
  asset: KnowledgeAsset;       // full immutable snapshot at this version
}
```

The `asset` snapshot is a complete copy of the `KnowledgeAsset` at the time of the version. This means callers can reproduce the exact state of any version without joining other tables.

---

## How Updates Create Versions

```
saveAsset(v1)  →  history: [v1]
updateAsset()  →  history: [v1, v2]   (v2.version = 2, v2.etag = "hash:2")
publishAsset() →  history: [v1, v2, v3]  (v3.processingStatus = "Published")
archiveAsset() →  history: [v1, v2, v3, v4] (v4.processingStatus = "Archived")
```

Version numbers are **per-asset** (not global). Two different assets can both be at version 3.

---

## Content vs Metadata Change Detection

```typescript
const history = repo.getAssetHistory(assetId);
const v1 = history[0]!;
const v3 = history[2]!;

const contentChanged = v1.hash !== v3.hash;
const governanceChanged = v1.processingStatus !== v3.processingStatus;
```

---

## Duplicate Detection via Hash

When `saveAsset(asset)` is called, the repository checks its `hashIndex` (hash → assetId map). If another asset already has the same hash:

- `SaveResult.wasDuplicate = true`
- The new asset is still saved (different ID, different title, different context)
- The caller decides whether to reject, merge, or keep both

This is content-level deduplication, not title-level.

---

## Usage Examples

### Get full history

```typescript
const history = repo.getAssetHistory(assetId);
history.forEach((v) => {
  console.log(`v${v.version} @ ${v.createdAt} — ${v.processingStatus}`);
});
```

### Restore a previous version

```typescript
const history = repo.getAssetHistory(assetId);
const v2 = history[1]!;
// Re-save v2's asset snapshot as a new version (v3 = restored state)
repo.saveAsset(v2.asset, { changeNote: "Restored from v2" });
```

### Compare hashes to detect content regression

```typescript
const [first, ...rest] = repo.getAssetHistory(assetId);
const contentVersions = rest.filter((v) => v.hash !== first!.hash);
console.log(`Content changed ${contentVersions.length} times`);
```

---

## Production Persistence (KB-3)

When backed by Postgres, versions map to a `knowledge_asset_versions` table:

```sql
CREATE TABLE knowledge_asset_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid NOT NULL REFERENCES knowledge_assets(id),
  version      integer NOT NULL,
  hash         char(64) NOT NULL,
  etag         text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  created_by   text,
  change_note  text,
  snapshot     jsonb NOT NULL,
  UNIQUE (asset_id, version)
);
```

The in-memory `KnowledgeRepository` uses `Map<string, AssetVersion[]>` which is structurally equivalent, making the migration to Postgres a drop-in swap of the storage layer.
