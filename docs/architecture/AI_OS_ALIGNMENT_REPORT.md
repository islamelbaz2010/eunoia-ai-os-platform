AI OS — Knowledge Alignment Report

Executive summary
-----------------
This review inspects the existing `src/lib/knowledge` subsystem and aligns it to the new model where Knowledge Cloud is the single producer and AI OS is the runtime consumer. The repository shows a clear separation between core models (`types.ts`, `knowledge.ts`), search and repository layers, and importer tooling. The current code embeds both producer and consumer responsibilities; migration requires converting producer pieces into Cloud services and leaving a lean consumer and KPM in AI OS.

Architecture Score (0–10)
-------------------------
- Score: 7.0 — solid modular foundations and clear types, but contains significant in-repo ingestion and packaging responsibilities that must be adapterized.

Commercial Readiness
--------------------
- Readiness: 6/10 — the runtime consumer path (search, processAsset, repository read APIs) is usable; production-grade KPM, signing, registry, and marketplace features are missing and must be provided by Knowledge Cloud.

Production Readiness
--------------------
- Readiness: 6/10 — runtime components are present but need hardening for scale (vector indexes, long-term caching, concurrency, enterprise policy enforcement) and integrated signing/verification.

Technical Debt
--------------
- In-repo ingestion and packaging code, tight coupling of processing pipeline and repository in same codebase.
- No explicit pack manifest or signing semantics implemented; no KPM implementation for networked registry.
- Local indexing is simple keyword-based; vector retrieval/embedding adapters are missing.

Required refactors
------------------
1. Adapterize importer modules: convert `importer/*` to adapters with explicit interfaces; mark Cloud implementations as canonical.
2. Convert `KnowledgeRepository` into a KPM installer/consumer: remove crawler/pack builder responsibilities.
3. Implement manifest v1 schema and pin resolver contracts in `types.ts` as stable DTOs.
4. Add signature verification paths and root-of-trust configuration in KPM.
5. Introduce adapter points for embedding providers and vector indexes; do not bundle vendor-specific vector DBs in core.

Migration strategy (high level)
-----------------------------
- Phase 0 — freeze contracts (manifest, resolver) and create adapter interfaces in AI OS.
- Phase 1 — implement KPM skeleton that can fetch manifests and verify signatures.
- Phase 2 — deliver Knowledge Cloud minimal registry and publish test packs.
- Phase 3 — gradually route ingestion and packaging to Cloud; remove deprecated code from AI OS after verification.

Final recommendation
--------------------
KB-3 may proceed under the condition that AI OS is limited to consumer responsibilities and that Knowledge Cloud provides the pack build, signing and registry services. The existing codebase provides a good starting point and requires moderate refactors rather than a full redesign.

Decision
--------
APPROVED FOR KB-3

Conditions
----------
1. Freeze and document `manifest.json` and `resolve()` contract before KB-3 implementation.
2. Implement KPM verification and root-of-trust before enabling auto-install or auto-update.
3. Move connectors, crawlers, taxonomy, validation and pack builders to Knowledge Cloud prior to enabling production publishing from this repo.
4. Add clear adapter interfaces for indexing and embedding providers.
