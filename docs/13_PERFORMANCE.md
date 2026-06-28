# 13 — Performance

## Current Performance Profile

### Server Component Data Loading

Dashboard page fetches 3 datasets in parallel:
```typescript
const [kpis, usageOverTime, statusBreakdown] = await Promise.all([
  getKpis(orgId),
  getUsageOverTime(orgId),
  getContactStatusBreakdown(orgId),
])
```

This is correct — parallel async is used wherever possible. No waterfall data fetching.

### Request Deduplication

DAL functions (`verifySession`, `getProfile`, `getMemberships`, `getActiveOrganization`) are wrapped in `React.cache()`. A single render pass that calls `getActiveOrganization()` from both the layout AND the page only issues one Supabase query.

---

## Known Bottlenecks

### 1. Usage Page O(N) Aggregation (HIGH)

**File**: `src/app/dashboard/usage/page.tsx`

```typescript
// Current: loads up to 10,000 rows into JS, reduces in memory
const { data: events } = await supabase
  .from("usage_events")
  .select("event_type, quantity")
  .limit(10000)

const totals = events.reduce<Record<string, number>>((acc, event) => {
  acc[event.event_type] = (acc[event.event_type] ?? 0) + Number(event.quantity)
  return acc
}, {})
```

**Fix**: Use SQL GROUP BY:
```sql
SELECT event_type, SUM(quantity) as total
FROM usage_events
WHERE organization_id = $orgId
GROUP BY event_type
```

### 2. Dashboard Chart O(N) Aggregation (HIGH)

**File**: `src/app/dashboard/page.tsx`

`getUsageOverTime()` loads 2000 rows; `getContactStatusBreakdown()` loads 5000 rows. Both aggregate in JavaScript.

**Fix for usage time series**:
```sql
SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
FROM usage_events
WHERE organization_id = $orgId AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY 1 ORDER BY 1
```

**Fix for status breakdown**:
```sql
SELECT status, COUNT(*) as count
FROM crm_contacts
WHERE organization_id = $orgId
GROUP BY status
```

### 3. RAG Assistant Blocking Request (MEDIUM)

The RAG assistant issues a blocking HTTP call to OpenAI. Typical latency:
- Embedding: 200–500ms
- Supabase RPC: 50–200ms
- GPT-4o-mini completion: 1–5 seconds

Total: 1.5–6 seconds of "Thinking..." state.

**Fix**: Use Next.js streaming responses. The server action would become a streaming Route Handler using `ReadableStream`.

### 4. OpenAI 30-Second Timeout Risk (LOW)

`getOpenAIClient()` sets `timeout: 30_000ms`. Vercel Hobby plan has a 10-second function timeout; Pro plan has 60 seconds.

If running on Hobby plan, OpenAI completions may hit the Vercel function timeout before the OpenAI timeout. The user would see a function timeout error rather than an AI error.

**Fix**: Ensure Vercel Pro plan is active, or implement streaming to avoid blocking on the full completion.

---

## Query Limits

| Route | Table | Limit | Risk at limit |
|-------|-------|-------|--------------|
| `/dashboard/crm` | crm_contacts | 200 | Silent truncation |
| `/dashboard/knowledge-base` | kb_documents | 100 | Silent truncation |
| `/dashboard/assistant` | (RPC) | 6 chunks | By design |
| `/dashboard/audit-logs` | audit_logs | 50 | Silent truncation |
| `/dashboard/usage` | usage_events | 10,000 | Memory risk + truncation |
| `/dashboard` (chart) | usage_events | 2,000 | Inaccurate chart |
| `/dashboard` (chart) | crm_contacts | 5,000 | Inaccurate chart |
| `/dashboard/settings` (members) | org_members | 100 | Silent truncation |
| `/dashboard/settings` (invites) | org_invites | 50 | Silent truncation |

---

## Embedding Batch Performance

For a 50-chunk document (50,000 chars):
- Batch size: 512 (single batch for 50 chunks)
- OpenAI embedding time: ~500ms for 50 inputs
- Total ingestion time (embed + insert): ~1–2 seconds

For a large document at the edge case (if content was just under 50,000 chars ≈ 50 chunks):
- Single OpenAI batch call
- All chunks inserted in one Supabase `INSERT INTO ... VALUES (...)`

---

## Index Coverage

Vector search uses the HNSW index:
```sql
CREATE INDEX knowledge_base_chunks_embedding_idx
  ON public.knowledge_base_chunks
  USING hnsw (embedding vector_cosine_ops);
```

HNSW provides approximate nearest-neighbor with:
- Build time: Fast (milliseconds for <100K vectors)
- Search time: Sub-millisecond for typical knowledge bases
- Memory: ~6 bytes/vector × 1536 dims × N chunks

For a typical hospitality property with 100 documents × 10 chunks = 1000 chunks:
- Memory: ~9 MB
- Search time: <10ms

---

## Vercel Function Cold Starts

Vercel serverless functions have cold starts (~200–500ms on the first request after inactivity). The Next.js App Router minimizes cold start impact by using streaming and React Suspense for incremental page hydration.

The OpenAI client singleton (`let client: OpenAI | null = null`) is module-scoped — it persists across requests in the same function instance but is re-initialized on cold starts. No meaningful cost to re-initialize.
