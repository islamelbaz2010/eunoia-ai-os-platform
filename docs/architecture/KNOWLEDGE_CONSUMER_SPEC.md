Knowledge Consumer Specification

Purpose
-------
Describe the runtime consumer contract that AI OS must implement to use installed Knowledge Packs safely and deterministically.

Responsibilities
----------------
- Load and mount installed Knowledge Packs (read-only).
- Build or use local indexes (vector and lexical) derived from pack assets.
- Resolve queries: map query + context → candidate packs + entry points using the Resolver component.
- Execute retrievals from packs and return ranked, provenance-rich hits.
- Enforce runtime policy, privacy filters and RLS rules before returning results.
- Emit sanitized telemetry about consumption events.

Public API (contract)
---------------------
- `search(query, opts) -> SearchHit[]` where `SearchHit` contains `packId`, `version`, `assetId`, `score`, `excerpt`, `provenance`.
- `explain(hit) -> {manifest, entryPoint, verification}`
- `listInstalled() -> PackReference[]`
- `getPackManifest(packId, version?) -> Manifest`

Adapter interfaces (must remain stable)
--------------------------------------
- Storage: `readAsset(packRef, path) -> stream|buffer`.
- Embedding: `embed(text) -> vector`.
- Index: `queryVector(vector, k) -> hits` and `indexChunks(chunks)`.

Failure modes & behavior
------------------------
- Offline: serve from local indices and caches.
- Missing pack: surface install suggestion with `resolveForInstallSuggestion`.
- Verification failure: do not use pack; surface diagnostics and optionally quarantine.

Best practices
--------------
- Immutable reads: do not mutate installed pack contents.
- Atomic activation: switch active pack with minimal window of inconsistent state.
- Audit trails: keep an audit record of pack usage, installs, activations, and removals.
