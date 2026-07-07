AI OS — Knowledge Alignment

Purpose
-------
This document defines which responsibilities remain in Eunoia AI OS (runtime consumer) and which must be moved to the external Knowledge Cloud (producer). It is written to support the KB-3 transition where Knowledge Cloud is the only producer of canonical knowledge.

Summary
-------
- Move all ingestion, crawling, connector orchestration, canonical taxonomy, dataset generation, validation pipelines, packaging and publishing to Knowledge Cloud.
- Retain runtime responsibilities in AI OS: local installation, verification, safe indexing, resolution, query-time policies, UI integration, and telemetry.

Responsibilities that MUST move to Knowledge Cloud
------------------------------------------------
- Crawlers and connector orchestration (source credentials and connector secrets remain in Cloud or enterprise vaults).
- Taxonomy, canonical ontology, dataset synthesis and global knowledge graphs.
- Validation pipelines, QA, lineage, provenance and policy gating for published knowledge.
- Knowledge Pack build pipelines: packaging, signing, artifact hosting and registry.
- Global registry/catalog and marketplace. Mirrors and distribution services.

Responsibilities that MUST remain in AI OS
-----------------------------------------
- Runtime consumption: loading installed packs and serving queries to agents and assistants.
- Local cache and offline mode: operating from installed packs and cached indices when Cloud unavailable.
- Resolver: local query-to-pack mapping, ranking and fallback decisions.
- Policy enforcement at runtime (RLS, sensitivity filters, enterprise policy decisions).
- Local indexing and retrieval (vector/lexical indexes) optimized for low-latency queries.
- Telemetry collection (sanitized consumption events) and UI for installed packs.

Candidate modules for conversion to adapters in AI OS
----------------------------------------------------
- Importer/scanner/registry: convert to read-only adapters that can consume Cloud-provided manifests and local file-scan results when explicitly enabled.
- `repository/service.ts` (KnowledgeRepository): become a thin local store + installer that only manages installed packs and local derived indices.
- `importer/*` parser/classifier/validator: move authoritative implementations to Cloud; keep lightweight adapters for offline/manual ingestion.

Modules that should be package consumers (not producers)
-------------------------------------------------------
- `KnowledgeRepository` (installer + local index builder)
- `search/index.ts` and `knowledge.ts` runtime APIs — consume installed pack assets and local indices
- UI components that list, enable, disable and update packs

Stable contracts (must be preserved)
-----------------------------------
- Pack manifest schema (manifest.json) — canonical fields for id, version, compatibility, checksums, signatures, capabilities.
- Resolver request/response contract — inputs (query, context) and outputs (pack candidates, trace) used by runtime.
- Telemetry event schema used for consumption reporting.
- Signature verification and checksum semantics used by installer.

Risks and mitigations
---------------------
- Risk: Breaking runtime behavior if manifest or resolver contracts change. Mitigation: freeze v1 manifest and resolver API; extend additively.
- Risk: Performance regressions from remote lookups. Mitigation: local cache, async prefetch, offline-first defaults.

Conclusions
-----------
AI OS should be converted to a pure consumer: the current ingestion and packaging code in `src/lib/knowledge` must be refactored into adapters, with the canonical implementation moved to Knowledge Cloud. Preserve stable contracts (manifest, resolver, telemetry) and implement a secure installer that verifies signed packs.
