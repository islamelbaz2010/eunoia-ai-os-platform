Migration Plan — KB2 → Knowledge Cloud + AI OS Consumer

Goal
----
Safely migrate existing KB-2 code and data into a split architecture: Knowledge Cloud (producer) and AI OS (consumer), with minimal runtime disruption.

Phases
------
Phase 0 — Inventory & Contracts (1–2 weeks)
- Catalog current `src/lib/knowledge` functionality and public runtime types (`types.ts`, `knowledge.ts`, `search/index.ts`).
- Freeze manifest and resolver contracts (v1).

Phase 1 — Adapterization (2–4 weeks)
- Convert importer, scanner, registry, validator and pack builder to adapter interfaces in AI OS. Keep implementations as compatibility shims.
- Implement KPM skeleton (manifest fetch, verify, install) that uses local compatibility types.

Phase 2 — Knowledge Cloud Minimal (4–8 weeks)
- Implement Cloud registry, pack builder, signing service and validation pipelines. Publish test packs.

Phase 3 — Cutover & Dual-Write (2–4 weeks)
- For a transition period, support both local ingest into AI OS (deprecated path) and Cloud-published packs (preferred).
- Use adapter shims to route requests to Cloud.

Phase 4 — Decommission (2–6 weeks)
- Remove deprecated in-repo ingestion code once Cloud is fully operational and tests pass.

Key requirements
----------------
- Maintain runtime API compatibility for resolvers and search during migration.
- Provide test packs and integration tests to validate KPM and resolver behavior.

Rollback & safety
-----------------
- Keep last-known-good packs locally and enable fast rollback.
- Use feature flags to disable new Cloud-only flows during incident response.
