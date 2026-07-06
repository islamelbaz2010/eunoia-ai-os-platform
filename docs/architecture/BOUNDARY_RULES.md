Boundary Rules — AI OS ↔ Knowledge Cloud

Purpose
-------
Explicit rules that define the responsibilities, data flow and security boundaries between AI OS (consumer) and Knowledge Cloud (producer).

Core rules
----------
1. Ownership: any operation that creates or curates canonical knowledge (crawl, normalize, taxonomy assignment, dataset synthesis, QA) is owned by Knowledge Cloud.
2. Distribution: Knowledge Cloud is the single source of truth for published Knowledge Packs. AI OS may cache but not author canonical packs.
3. Execution: AI OS must not execute publisher-provided arbitrary code. Packs are declarative data only.
4. Signing & Verification: Knowledge Cloud signs packs. AI OS verifies signatures and enforces root-of-trust.
5. Secrets: connector credentials stay in Cloud or enterprise vaults; packs may include pointers (not secrets).
6. Schema contracts: `manifest.json`, `resolver` API, and `telemetry` schemas are stable and backwards-compatible.
7. Policy: Governance decisions are enforced at both publish-time (Cloud) and run-time (AI OS). AI OS can further restrict packs per org policy.
8. Telemetry: AI OS sends sanitized consumption events only; raw source content is not uploaded without consent.
9. Emergency revocation: Knowledge Cloud exposes a revoke list; AI OS consults and disables revoked packs on startup/periodically.

Enforcement mechanisms
----------------------
- Registry rejects unsigned or invalid packs.
- AI OS refuses incompatible or unsigned packs.
- Audit logs exported by both sides for reconciliation.
