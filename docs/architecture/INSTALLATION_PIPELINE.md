Installation Pipeline (AI OS)

Purpose
-------
Describe the step-by-step install-time pipeline used by the KPM in AI OS.

Steps
-----
1. Discover: query registry for manifest metadata (id, version, compatibility, capabilities).
2. Authorize: check user/organization policy and install permissions.
3. Fetch Manifest: download manifest and verify signatures metadata.
4. Fetch Artifacts: download pack artifacts (support partial fetch to reduce bandwidth).
5. Verify: verify checksums and signatures and validate declared dependencies.
6. Install: unpack into a staging directory and then atomically move into `installed/`.
7. Index: run declared (local) indexing steps — create local vector/lexical indices from chunks. Prefer precomputed indexes produced by Cloud when available.
8. Activate: update resolver registry and emit activation event.
9. Post-install validation: smoke tests (sample queries) and verification of manifest assets.

Failure & recovery
------------------
- Any verification failure aborts install and leaves cache for diagnostics.
- Partial install rolls back to previous active version.
- Network errors: retry with exponential backoff; for offline mode allow manifest-only installs.

User Interaction
----------------
- Present `capabilities` and `sensitivity_level` before install.
- Allow `install offline-only` (manifest + small metadata) or `install full` (full artifacts + indexes).
