# MEMORY — Cross-Session Persistent Knowledge

Things that aren't obvious from the code but matter for every session.

---

## User

- **Name**: Ahmed (islam.elbaz2010@gmail.com)
- **Role**: Founder + primary engineer
- **Preference**: Direct, no fluff. Ship code, not documents. "Continue" should be enough to resume.
- **Environment**: macOS Darwin 22.6.0, bash, Node 20+
- **Working directory**: `/Users/ahmed/Documents/eunoia-ai-os-platform`
- **GitHub user**: `islamelbaz2010`

---

## Project-Specific Knowledge

### The Two Repos
- `eunoia-ai-os-platform` — the REAL codebase. Everything lives here.
- `eunoia-ai-os-app` — empty Create Next App scaffold at `/Users/ahmed/Documents/eunoia-ai-os-app`. Ignore it.

### Production Details
- **Domain**: eunoiaos.com (live, deployed via Vercel)
- **GitHub**: `https://github.com/islamelbaz2010/eunoia-ai-os-platform`
- **Supabase**: Managed instance (credentials in .env.local, never committed)

### Critical Code Facts
- `getActiveOrganization()` returns `memberships[0]` — single active org per session
- Rate limit: 50 RAG queries/user/hour (constant in `assistant/actions.ts`)
- Embeddings are NOT NULL (enforced in migration 0006)
- `accept_org_invite` uses `FOR UPDATE` lock (race condition fix in migration 0006)
- `create_organization` caps at 3 orgs per user (anti-abuse, enforced in RPC)
- Match chunk threshold: MIN_SIMILARITY = 0.3 (cosine)
- `query_embedding` must be `JSON.stringify(vector)` when calling `match_kb_chunks`

### What Has Been Tried and Rejected
- **Separate vector database (Pinecone)**: Rejected. pgvector + HNSW is sufficient.
- **Redis for rate limiting**: Rejected. usage_events table count is sufficient for MVP.
- **useFormState**: Wrong — this is React 19. Use `useActionState`.
- **middleware.ts**: Wrong — this is Next.js 16. Use `proxy.ts` exporting `proxy()`.
- **Streaming in Server Actions**: Not supported by Next.js. Use Route Handler for streaming.

---

## Workflow Preferences

- **"Continue"** means: boot → pick top P0 task → implement → no questions
- Always run `npx tsc --noEmit && npm run lint && npm test` before reporting done
- Output EXECUTION REPORT at end of every session
- Update CURRENT_STATE.md and ACTIVE_TASKS.md before ending session
- No markdown-only sessions — every session must produce working code

---

## Known Gotchas

### Zod v4 API Differences
```typescript
// WRONG (v3 syntax):
z.string().email("Enter valid email")
z.string().email().refine(...)
parsed.error.errors[0]?.message

// CORRECT (v4 syntax):
z.email({ error: "Enter valid email" })
z.string().min(1, { error: "Required" })
parsed.error.issues[0]?.message
```

### Supabase RPC Call for Vector Search
```typescript
// The embedding MUST be JSON.stringify'd:
await supabase.rpc("match_kb_chunks", {
  query_embedding: JSON.stringify(queryEmbedding),  // ← must be string
  target_org_id: orgId,
  match_count: 6,
})
```

### React.cache() and Server Actions
`React.cache()` only deduplicates within a single render/request. In Server Actions, each action invocation is a separate request — `cache()` won't deduplicate across multiple action calls in the same browser session.

### Tailwind v4 Syntax
```css
/* WRONG (v3): */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* CORRECT (v4): */
@import "tailwindcss";
```

### cookies() in Next.js 16
In Next.js 16, `cookies()` from `next/headers` is async — must be awaited in Server Components and Route Handlers. In Server Actions it can still be used synchronously in some cases, but safest to await it.

### Public Routes in proxy.ts
The `PUBLIC_ROUTES` array uses **exact path matching** (`includes(path)`), not prefix matching. Adding `/auth` does NOT make `/auth/callback` public. Each route must be added explicitly.

Current public routes (as of Session 2):
```typescript
const PUBLIC_ROUTES = [
  "/login", "/signup", "/auth/callback", 
  "/auth/forgot-password", "/api/health", "/"
]
```

### Vercel Function Timeout
- Hobby plan: **10 seconds** — RAG completions WILL timeout
- Pro plan: **60 seconds** — required for production
- Current plan: must verify (assume Pro needed)

---

## Session History Summary

| Session | Date | Key Work | Score Before → After |
|---------|------|----------|----------------------|
| 1 | 2026-06-28 | Full Phase 1 + docs + security | ~60% → 78% |
| 2 | 2026-06-29 | Password reset, email, rate limit, delete ops, SQL fix, CI | 78% → 84% |

---

## Next Steps Memory

After Session 2, the highest-value next steps are:
1. **Sentry** — 4 hours. Production monitoring is blind without it.
2. **Commit everything** — 30 min. 60+ files untracked, risk of loss.
3. **Manual steps** — 10 min. Apply migration 0007 + set RESEND_API_KEY in Vercel.
4. **CRM edit** + **KB edit** — 1 day total. Completes CRUD for both resources.
5. **Org switcher** — 1 day. Unlocks multi-property hotel groups.
6. **Stripe** — 3 days. Required for revenue.
