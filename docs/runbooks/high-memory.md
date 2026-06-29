# High Memory — Runbook

**Trigger**: `process_memory_heap_used_bytes / process_memory_heap_total_bytes > 0.85` for 5+ minutes  
OR PM2 reports `ENOMEM` / process restarts with exit code 137

**Severity**: SEV2 (imminent crash risk) / SEV3 (sustained high usage)

---

## Diagnosis

### 1. Current Memory Snapshot

```bash
curl https://yourdomain.com/api/metrics | grep process_memory
```

Or via PM2:
```bash
pm2 describe eunoia | grep memory
pm2 monit  # real-time monitoring
```

### 2. Admin Diagnostics

```bash
curl -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
     https://yourdomain.com/api/admin/system | jq '.memory'
```

### 3. Identify Recent Changes

Check the last deploy — was a new feature released that could hold large objects in memory (e.g., file uploads, large RAG embeddings, in-memory caches)?

```bash
git log --oneline -5
```

### 4. Check Node.js Heap Limit

```bash
node --max-heap-size  # default: ~1.5 GB on 64-bit
pm2 describe eunoia | grep "node args"
```

---

## Immediate Mitigation

### Option A — Restart (Clears Memory)

```bash
pm2 restart eunoia
```

PM2 performs a graceful restart. In-flight requests complete before the old process exits. Memory is released.

**Caution**: Restarting clears the in-memory ring buffer (health check history) and any in-memory session state. The ring buffer repopulates within minutes.

### Option B — Increase Node Heap Limit

If the application legitimately needs more heap (e.g., processing larger documents):

Edit `ecosystem.config.js`:
```javascript
node_args: "--max-old-space-size=2048"  // Increase from default ~1.5GB to 2GB
```

Then restart:
```bash
pm2 restart eunoia
```

**Note**: Only increase heap if the server has sufficient RAM. Node.js heap + OS overhead should stay below 80% of total server RAM.

---

## Deeper Investigation

If memory grows continuously (memory leak):

### 1. Enable Heap Snapshots

```bash
# Install heapdump (dev dependency)
npm install -D heapdump

# Take a snapshot
node -e "require('heapdump').writeSnapshot('./heap-$(date +%s).heapsnapshot')"
```

### 2. Analyse in Chrome DevTools

1. Open Chrome → DevTools → Memory tab
2. Load Heap Snapshot → select the `.heapsnapshot` file
3. Sort by "Retained size" — find objects that shouldn't accumulate

### 3. Common Causes in this Codebase

| Cause | Location | Fix |
|-------|----------|-----|
| Large embeddings cached in-memory | `src/lib/ai/openai.ts` | Don't cache embedding results |
| Growing ring buffer contents | `src/lib/health/report-history.ts` | Buffer is capped at 100 — unlikely |
| Unreleased Supabase client references | Server Actions | Verify clients are not stored in module scope |
| Unclosed `ReadableStream` | RAG streaming (future) | Close streams on client disconnect |

---

## Preventive Measures

- Set PM2 max memory restart: `max_memory_restart: "512M"` in `ecosystem.config.js`
- Configure memory alert at 70% in Grafana (triggers before 85% critical threshold)
- Monitor `process_memory_heap_used_bytes` trend — gradual growth over hours is a leak signal
