Knowledge Package Manager (KPM) — Spec

Goal
----
Define the local package manager used by AI OS to discover, fetch, verify, install, update and remove Knowledge Packs produced by Knowledge Cloud.

Core concepts
-------------
- Knowledge Pack (KPack): immutable archive containing `manifest.json`, `assets/`, `index/` (optional), `metadata/`, and `signatures/`.
- Manifest v1 (stable): fields include `id`, `namespace`, `version` (semver), `compatibility` (ai-os version range), `checksums` (sha256 per asset), `signatures` (key id + signature), `capabilities`, `declaredDependencies`.
- Store layout: `~/.eunoia/knowledge/cache/` for downloaded artifacts; `~/.eunoia/knowledge/installed/{id}@{version}/` for active installs.

Operations
----------
- discover(metadata-only): query registry for metadata and compatibility.
- fetch(manifest or full kpack): support partial manifest fetch and full artifact download.
- verify: checksum + signature verification against pinned root-of-trust.
- install: atomic unpack into installed root; apply post-install declarative indexing (no remote code execution).
- activate: register pack with local resolver atomically (symlink or manifest pointer).
- update/rollback: support transactional switch and keep N previous versions.
- remove: safe uninstall with dependency checks.

Security
--------
- All packs must be signed by Knowledge Cloud. KPM verifies signature chain pinned to enterprise/trusted keys.
- No pack may embed secrets or remote-executable code; packs are declarative data only.
- KPM enforces policy: block installs that fail compatibility, signatures, policy allowlists.

APIs
----
- Programmatic: `install(id, version?)`, `listInstalled()`, `getManifest(id,version)`, `verify(file)`, `remove(id,version)`.
- Events: `onInstall`, `onActivate`, `onVerifyFailure`, `onRemove`.

Extensibility
-------------
- Adapter points: storage backends, signature providers, index hook implementations (for local vector stores).

Offline & mirrors
-----------------
- Support mirrors and local artifact proxies for air-gapped environments. Allow manifest-only installs for offline use.
