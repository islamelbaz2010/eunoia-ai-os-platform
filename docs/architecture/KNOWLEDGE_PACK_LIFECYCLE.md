Knowledge Pack Lifecycle

Overview
--------
Defines the stages a Knowledge Pack traverses from authoring in Knowledge Cloud to retirement and local archival in AI OS.

Stages
------
1. Authoring (Cloud): content creation, metadata authoring, tests and unit checks.
2. Validation (Cloud): schema, quality, taxonomy alignment, lineage tagging.
3. Signing (Cloud): artifact signing, provenance metadata and builder attestation.
4. Publishing (Cloud): push to registry and make discoverable.
5. Discovery (AI OS): KPM finds manifest metadata and evaluates compatibility.
6. Fetch & Verify (AI OS): download artifact (or partial), verify checksum and signature.
7. Install (AI OS): atomic unpack, declarative index population, activation.
8. Runtime (AI OS): consumption, telemetry, updates.
9. Deprecation (Cloud): registry marks deprecated; AI OS warns or uninstalls per policy.
10. Retirement (Cloud + AI OS): removal from registry; AI OS may uninstall and archive caches.

Operational rules
-----------------
- No remote code executed during install.
- Packs are immutable; updates are new versions.
- Keep last N versions for rollback.
- Respect declared dependencies; KPM resolves and installs dependencies before activation.

Metadata obligations
--------------------
- `built_by`, `build_job_id`, `commit`, `provenance`, `sensitivity_level`, `allowed_orgs`.
