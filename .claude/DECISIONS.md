# DECISIONS — Architecture Decision Records

Decisions that are locked in and must not be reversed without compelling evidence.

---

## ADR-001: RLS as Security Source of Truth

**Decision**: Postgres Row Level Security is the primary access control boundary. App-layer checks (DAL, Server Actions) are defense-in-depth only.

**Why**: Application code can have bugs, misconfigurations, or be bypassed via direct API calls. Postgres RLS operates at the database level and cannot be bypassed from application code regardless of bugs in middleware, DAL, or server actions.

**Consequence**: Every new table MUST have RLS enabled. Every access pattern needs a corresponding RLS policy. The compiler won't catch missing policies — they must be manually verified.

**What we rejected**: Application-only authorization (role checks in code without RLS). Rejected because a single misconfiguration could expose all tenant data.

---

## ADR-002: `import "server-only"` on All Secret-Adjacent Files

**Decision**: Files that access secrets or perform server-privileged operations must have `import "server-only"` at the top.

**Affected files**: `dal.ts`, `audit.ts`, `openai.ts`, `ingest.ts`, `env.ts`, `server.ts`, `email.ts`

**Why**: Next.js Client Components are bundled for the browser. Without `import "server-only"`, it's possible to accidentally import a server file into a client component, leaking `OPENAI_API_KEY` or Supabase credentials into the browser bundle. The compiler throws if this happens.

**What we rejected**: Manual discipline without compiler enforcement. Too error-prone at scale.

---

## ADR-003: Fire-and-Forget Audit Logging

**Decision**: All `logAuditEvent()` and `logUsageEvent()` calls are wrapped in `void`. Failures are swallowed.

**Why**: Audit log failures must NEVER block user-facing operations. A hotel manager trying to check in a guest shouldn't get a 500 error because the audit table is temporarily unavailable. The audit trail is valuable but not mission-critical per operation.

**Consequence**: Audit logs may have gaps during DB issues. This is acceptable.

**What we rejected**: Awaiting audit log writes. Rejected because it adds latency to every operation and can cause user-visible errors for non-user-visible events.

---

## ADR-004: Next.js 16 Proxy Pattern (not Middleware)

**Decision**: Route protection lives in `proxy.ts` at the repo root, exporting `proxy()`.

**Why**: Next.js 16 renamed "Middleware" to "Proxy". File must be `proxy.ts`, export must be `proxy()`. Using the old pattern (`middleware.ts`, `middleware()`) would silently break route protection.

**What this is NOT**: The proxy is a convenience layer (UX gate), not a security boundary. RLS enforces security. The proxy only handles redirects for unauthenticated users.

---

## ADR-005: React.cache() on All DAL Functions

**Decision**: `verifySession()`, `getProfile()`, `getMemberships()`, and `getActiveOrganization()` are all wrapped in `React.cache()`.

**Why**: A single page render may invoke multiple Server Components that each call `verifySession()`. Without `cache()`, this would trigger multiple Supabase Auth API calls per page render. `cache()` deduplicates within a single request/render.

**What we rejected**: Passing session/org as props through the component tree. Rejected because it requires prop-drilling through every Server Component.

---

## ADR-006: `text-embedding-3-small` Not `text-embedding-ada-002`

**Decision**: Use `text-embedding-3-small` (1536 dims) for document embedding.

**Why**: 
- 5× cheaper than `ada-002` at similar quality
- 1536 dimensions are sufficient for hospitality KB content (short, domain-specific)
- `text-embedding-3-large` (3072 dims) offers marginal improvement at 13× the cost

**Consequence**: If we ever need to switch models, ALL existing embeddings must be re-generated (different model → different vector space, cosine similarity breaks).

---

## ADR-007: `gpt-4o-mini` Not `gpt-4o`

**Decision**: Use `gpt-4o-mini` for RAG answer generation.

**Why**:
- ~15× cheaper than `gpt-4o`
- For grounded Q&A with provided context, `gpt-4o-mini` performs comparably
- Max 1024 output tokens is sufficient for hospitality FAQ answers
- 30s timeout covers worst-case latency

**When to revisit**: If customers complain about answer quality for complex multi-hop questions. Switch to `gpt-4o` or `claude-sonnet-4-6` at that point.

---

## ADR-008: Supabase Over Self-Hosted Postgres

**Decision**: Use Supabase managed PostgreSQL, not self-hosted.

**Why**:
- Built-in GoTrue Auth eliminates custom auth infrastructure
- pgvector extension available out-of-the-box
- PostgREST auto-generates the REST API layer
- Managed backups, connection pooling, PITR
- RLS policies are first-class Supabase features

**Cost**: ~$25/month for Pro plan. Acceptable for a hospitality SaaS with $99+ ARR per customer.

**What we rejected**: Self-hosted Postgres + custom auth + Pinecone. Rejected because it's 3 managed services vs 1.

---

## ADR-009: Vercel Over Self-Hosted Next.js

**Decision**: Deploy on Vercel.

**Why**:
- Zero-config Next.js deployment (same team, same framework)
- Instant rollback (promote any previous deployment in <30 seconds)
- Edge network (fast for MENA users vs US-only CDN)
- Pro plan required for 60s function timeout (RAG completions)

**Critical**: Must be on **Pro plan** (not Hobby). RAG completions can take 5-8 seconds. Hobby plan has 10s timeout. Pro plan has 60s timeout.

---

## ADR-010: Resend for Email, Not Supabase Email Templates

**Decision**: Use Resend SDK for all transactional email (invite emails, future password reset notifications).

**Why**:
- Resend provides professional deliverability (DKIM, SPF, DMARC)
- HTML template control is full (not limited to Supabase template variables)
- Resend's free tier covers 3,000 emails/month (sufficient for early launch)
- Supabase's built-in email is limited and not branded

**Note**: `RESEND_API_KEY` must be set in Vercel. If missing, `getResendClient()` returns null and email is silently skipped (logged as warning, not error).

---

## ADR-011: Rate Limiting via usage_events Table (Not Redis)

**Decision**: Implement RAG rate limiting by counting `usage_events` rows in the last hour, not via Redis/Upstash.

**Why**:
- No additional infrastructure or billing
- `usage_events` is already written for every RAG query (fire-and-forget)
- A COUNT query with a 1-hour window and org+user+event_type index is fast
- 50 queries/hour/user is generous enough that false positives are unlikely

**When to revisit**: When an org has >500 users making concurrent requests. At that scale, use Redis for atomic counter operations.

**Limit**: `RAG_RATE_LIMIT_PER_HOUR = 50` (constant in `assistant/actions.ts`). Adjust when Stripe tiers are live.
