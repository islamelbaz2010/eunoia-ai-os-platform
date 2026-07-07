Knowledge Resolver

Purpose
-------
Define how AI OS maps queries and context to installed Knowledge Packs, ranks candidates and decides when to fall back to Knowledge Cloud.

Responsibilities
----------------
- Candidate selection from installed packs (fast pre-filter by manifest capabilities and policy).
- Local retrieval scoring using lexical and vector indexes.
- Pack ranking using trust, recency, telemetry-driven popularity and content relevance.
- Traceable decisions: every resolution must return a trace for explainability.
- Fallback orchestration: when local confidence is low, query Knowledge Cloud resolver endpoints for recommendations or remote retrieval.

Resolver flow
-------------
1. Candidate selection: filter by manifest.capabilities, compatibility, policy allowlist.
2. Local scoring: run index queries and compute per-pack best scores.
3. Pack ranking: combine local scores with manifest trust and metadata signals.
4. Aggregation & de-duplication: merge top hits from packs and normalize scores.
5. Confidence check: if below threshold -> cloud fallback or install suggestion.

API (stable)
------------
- `resolve(query, context) -> { candidates: ResolvedTarget[], confidence: number, trace }`
- `resolveForInstallSuggestion(query) -> { recommendedPacks: PackRef[], reason }`

Traceability
------------
Return scoring factors per candidate: lexicalScore, vectorScore, trustScore, recencyScore, penaltyFlags.

Caching & determinism
---------------------
- Cache query->resolution with TTL and invalidate on pack install/remove.
- Deterministic tie-breakers to keep stable UI and audit trails.
