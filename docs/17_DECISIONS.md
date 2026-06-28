# 17 — Architecture Decision Records

Every major architectural decision, why it was made, and what alternatives were considered.

---

## ADR-001: Next.js 16 App Router

**Decision**: Use Next.js 16 App Router (not Pages Router).  
**Why**: App Router enables React Server Components which reduce client-side JavaScript bundle size and allow data fetching directly in components without useEffect. Server Actions replace traditional API routes for form handling.  
**Consequence**: All forms use `useActionState` (React 19 pattern). Server Components cannot use hooks or browser APIs. Client components are marked `"use client"`.  
**Note**: Next.js 16 uses `proxy.ts` not `middleware.ts`. The `proxy()` export replaces `middleware()`. This is a breaking change from training data.

---

## ADR-002: Supabase for Auth + Database

**Decision**: Use Supabase (managed PostgreSQL + GoTrue auth) instead of a custom auth layer or a separate auth service.  
**Why**:
- Single service for database + auth eliminates the auth–database join problem
- Row Level Security runs in PostgreSQL — data access and auth are co-located
- pgvector extension available natively for vector search
- Generous free tier for early-stage
- PKCE OAuth and magic links available without additional services

**Alternatives considered**: Auth.js (NextAuth) + separate DB, Clerk + Supabase, Firebase — all split auth from data or lacked pgvector.

---

## ADR-003: pgvector for Vector Search

**Decision**: Use pgvector (via Supabase) for embedding storage and similarity search instead of a dedicated vector database.  
**Why**:
- Eliminating a separate vector DB reduces infrastructure complexity
- RLS policies apply to vector search — chunks inherit the same per-org access control as all other data
- HNSW index in pgvector performs comparably to Pinecone/Weaviate at the scale of hospitality knowledge bases (<100K chunks per org)
- No data synchronization needed between vector store and relational store

**Alternatives considered**: Pinecone, Weaviate, Qdrant — all require a separate service + sync logic.

---

## ADR-004: HNSW Index over IVFFlat

**Decision**: Use HNSW (Hierarchical Navigable Small World) index instead of IVFFlat for vector search.  
**Why**:
- HNSW does not require knowing the number of clusters upfront (IVFFlat requires `nlist`)
- Better recall at high-dimensional spaces (1536 dims)
- No need to train the index before use
- Marginally higher memory usage but acceptable for the data volumes expected

---

## ADR-005: text-embedding-3-small for Embeddings

**Decision**: Use `text-embedding-3-small` (1536 dims) for embeddings instead of `text-embedding-3-large` (3072 dims) or `text-embedding-ada-002`.  
**Why**:
- 5x cheaper than `text-embedding-3-large`
- Adequate quality for hospitality FAQ/SOP content (well-structured, domain-specific)
- 1536 dimensions is the sweet spot — `ada-002` produces 1536 dims at higher cost with lower quality
- All benchmarks show `text-embedding-3-small` substantially outperforms `ada-002`

---

## ADR-006: GPT-4o-mini for Chat Completion

**Decision**: Use `gpt-4o-mini` instead of `gpt-4o` or `claude-sonnet-4-6`.  
**Why**:
- 15x cheaper than GPT-4o
- Adequate quality for grounded Q&A (the answer is given in context — model just needs to synthesize and cite)
- Faster response times
- 16K context window is ample for 6 chunks + system prompt

---

## ADR-007: 1000/150 Chunking Strategy

**Decision**: 1000-character chunks with 150-character overlap.  
**Why**:
- Character-based rather than token-based for simplicity (no tokenizer dependency)
- 1000 chars ≈ 200–250 tokens — comfortably fits within model limits
- 150-char overlap preserves sentence boundary context
- Simple sliding window with no semantic parsing — faster, deterministic

**Trade-off**: Misses paragraph-semantic boundaries. May split a policy procedure mid-point.  
**Alternative**: Semantic chunking (split on paragraph breaks + headers). More complex, deferred to Phase 2.

---

## ADR-008: RLS as Security Source of Truth

**Decision**: Row Level Security in PostgreSQL is the authoritative access control layer. Application-layer checks (proxy, DAL) are convenience layers only.  
**Why**:
- RLS cannot be bypassed by application bugs or misconfiguration
- Security policies live in the database, co-located with data
- Impossible to accidentally expose data via a new route that forgets to check permissions
- Supabase's SECURITY DEFINER functions allow controlled elevation for specific operations

**Consequence**: Every new table must have RLS enabled. Every new feature must have appropriate RLS policies. Never rely on app-layer auth alone.

---

## ADR-009: server-only Import Enforcement

**Decision**: Mark all server-only modules with `import "server-only"`.  
**Why**:
- Prevents API keys (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) from appearing in client bundles
- Build fails visibly if a developer accidentally imports a server module in a Client Component
- No runtime surprise — the error is caught at build time

**Modules affected**: `openai.ts`, `ingest.ts`, `audit.ts`, `dal.ts`, `env.ts`, `supabase/server.ts`

---

## ADR-010: React.cache() for DAL Deduplication

**Decision**: Wrap DAL functions in `React.cache()`.  
**Why**:
- A single page render may call `verifySession()` from the layout, from a page component, and from a Server Action simultaneously
- `React.cache()` deduplicates within a single render pass — the Supabase query fires once even if the function is called 5 times
- No manual caching layer needed

**Note**: `React.cache()` is NOT persistent (no Redis, no memory cache) — it is per-request deduplication only.

---

## ADR-011: Fire-and-Forget Audit + Usage Logging

**Decision**: `logAuditEvent()` and `logUsageEvent()` are called with `void` — errors are caught and swallowed (logged to stderr only).  
**Why**:
- A failure in audit logging must never roll back or block a successful user operation
- Audit/usage data is valuable but not mission-critical — a missed event is preferable to a failed CRM contact creation
- Pattern: `void logAuditEvent({...})` — TypeScript ignores the returned Promise

**Alternative**: Transactional audit logging (write in the same transaction as the business operation). More reliable but increases latency.

---

## ADR-012: MIN_SIMILARITY = 0.3 Threshold

**Decision**: Filter out chunks with cosine similarity < 0.3 before sending to GPT.  
**Why**:
- Including low-relevance chunks causes GPT to hallucinate connections between unrelated content
- A hospitality assistant saying "I don't know" is vastly preferable to a confidently wrong answer
- 0.3 is conservative — will miss some relevant chunks at the edge, but won't include noise

**Tuning**: This constant is in `actions.ts` and can be adjusted based on feedback. Could be made per-org configurable in a future phase.

---

## ADR-013: Maximum 3 Owned Organizations per User

**Decision**: Enforce a cap of 3 owned organizations per user in the `create_organization` RPC.  
**Why**:
- Anti-abuse: prevents automated org creation scripts from generating thousands of orgs
- Aligned with business model: a hospitality group might own 2–3 properties, unlikely to need 100+
- Enforced in PostgreSQL (not app layer) so it cannot be bypassed

---

## ADR-014: Zod v4 for Validation

**Decision**: Use Zod v4 for schema validation in Server Actions.  
**Note**: Zod v4 has API changes from v3. The error object format changed — `parsed.error.issues[0]?.message` is used (v4 uses `issues`, v3 used `errors`). The `.email()` method signature also changed in v4 (object argument instead of string).

---

## ADR-015: Slug + Random Suffix for Org Slugs

**Decision**: `slugify(name)` generates `lowercase-hyphenated-name-XXXXX` where XXXXX is a random 5-char alphanumeric suffix.  
**Why**:
- Prevents slug collisions for common hotel names ("Grand Hotel", "Royal Palace", etc.)
- The random suffix means two orgs with the same name get different slugs
- The Postgres UNIQUE constraint on `slug` is a final safety net
- The DB validates the slug format with `^[a-z0-9][a-z0-9-]*[a-z0-9]$` regex
