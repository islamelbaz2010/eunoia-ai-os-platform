# Performance Audit — Eunoia AI OS

**Performance Score: 68 / 100**

---

## Server-Side Performance

### ✅ Strengths
- All data fetching in Server Components (no client-side fetch waterfalls)
- `Promise.all` for parallel queries on dashboard (4 queries → 1 round-trip)
- `Promise.all` for parallel queries on contact detail (5 queries → 1 round-trip)
- `get_crm_metrics` RPC handles aggregation in Postgres (not in-app)
- `get_usage_totals` RPC replaces O(N) iteration
- `match_kb_chunks` RPC uses HNSW index for sub-ms ANN search

### ⚠️ Performance Issues

#### 1. Usage Over Time — Client-Side Aggregation
```ts
const { data } = await supabase
  .from("usage_events")
  .select("created_at")
  .limit(2000);
// Then aggregates in JS
```
Fetches up to 2000 rows and groups by date in JavaScript. Should be:
```sql
SELECT date_trunc('day', created_at), count(*) 
FROM usage_events 
GROUP BY 1 ORDER BY 1
```

#### 2. Contact Status Breakdown — Client-Side Aggregation
```ts
const { data } = await supabase
  .from("crm_contacts")
  .select("status")
  .limit(5000);
// Aggregates in JS
```
Same pattern. Should be a SQL GROUP BY query.

#### 3. RAG Assistant — Blocking (5–15 second wait)
No streaming. User waits silently while embedding → vector search → GPT completion runs. Severely impacts perceived performance.

#### 4. No Pagination
- CRM list: `search_crm_contacts` RPC returns `limit` rows (likely 50 default)
- Knowledge Base: Supabase default page size
- Audit logs: No explicit limit documented — risk of large fetches
- Team members: No limit

#### 5. Health Check on Every Readiness Request (MISS path)
Health check runs 8 providers in parallel with 5s timeout. 30s cache mitigates this — but first request after cache expiry takes up to 5s. Acceptable.

---

## Client-Side Performance

### ⚠️ Bundle Size Concerns
- `recharts` is loaded for all dashboard visitors
- `sonner` (toast) is globally loaded in layout
- No lazy loading of dashboard sub-sections
- No bundle analysis report available

### ✅ No Client-Side Data Fetching
No `useEffect` + fetch calls found. All data is server-rendered. Client components only handle interactivity.

### ⚠️ CRM Pipeline Board
Drag-and-drop using native HTML5 `dragstart`/`drop` — no third-party library. Performs server mutation on every drop. No debouncing.

---

## Database Query Performance

### Hot Query Paths (estimated)
| Query | Expected Latency | Notes |
|-------|-----------------|-------|
| `verifySession()` | ~5ms | Cookie read + Supabase auth |
| `getActiveOrganization()` | ~10ms | Memberships join |
| `match_kb_chunks` | ~20ms | HNSW index |
| `search_crm_contacts` | ~15ms | Full-text search |
| `get_crm_metrics` | ~25ms | Aggregation RPC |
| `getKpis()` | ~40ms | 4 parallel count queries |

### Missing Indexes
```sql
-- Rate limit query (runs on every RAG/insights request)
-- Missing: composite index
CREATE INDEX usage_events_rate_limit_idx 
  ON usage_events(organization_id, actor_id, event_type, created_at);

-- Dashboard status breakdown
CREATE INDEX crm_contacts_status_idx
  ON crm_contacts(organization_id, status) 
  WHERE deleted_at IS NULL;
```

---

## Caching Strategy

### ✅ Readiness Cache
30-second in-memory cache for `/api/health`. Prevents health check spam.

### ❌ No Application-Level Cache
- No Redis/Upstash integration
- No `unstable_cache` or Next.js cache() usage
- All pages are `dynamic = "force-dynamic"` by default (via Supabase SSR)
- Dashboard re-fetches all data on every page load

### ❌ No CDN/ISR
All pages are fully dynamic SSR. Static pages (landing, login) could benefit from ISR or static generation.

---

## Image Performance
- No user-uploaded images in the app
- No `next/image` usage (no images to optimize)
- Favicon is minimal
- Missing PWA icons (not loaded at all)

---

## Estimated Load Capacity

With current architecture on Vercel (Fluid Compute):
- **Concurrent users**: 50–200 (limited by Supabase connection pool, not Vercel)
- **RAG queries**: ~2 req/sec sustained (OpenAI rate limits)
- **CRM operations**: ~100 req/sec (Supabase limit)
- **Bottleneck**: OpenAI API rate limits for AI features

---

## Performance Score Breakdown

| Area | Score |
|------|-------|
| Server-side rendering | 80/100 |
| Database queries | 70/100 |
| Client bundle | 65/100 |
| Caching | 40/100 |
| Streaming/progressive loading | 30/100 |
| **Total** | **68/100** |
