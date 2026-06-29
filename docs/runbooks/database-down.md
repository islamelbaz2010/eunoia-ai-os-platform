# Database Down — Runbook

**Trigger**: `health_provider_up{provider="database"} == 0` or `health_provider_up{provider="auth"} == 0`

**Severity**: SEV1 (database) / SEV1 (auth)

Both the database and auth providers use Supabase. A failure of either indicates a Supabase connectivity problem.

---

## Diagnosis

### 1. Check Supabase Status

Visit [status.supabase.com](https://status.supabase.com) — check for active incidents in your region.

### 2. Check Connectivity

```bash
# From the application server
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
     -o /dev/null -w "%{http_code}\n"
# Expected: 200
```

### 3. Check Admin Diagnostics

```bash
curl -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
     https://yourdomain.com/api/admin/system | jq '.providers.database'
```

### 4. Check DNS Resolution

```bash
nslookup your-project-ref.supabase.co
# Should resolve to Supabase IPs
```

### 5. Check Environment Variables

```bash
# On the server (PM2 or Vercel)
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY | head -c 20
```

---

## Mitigation Options

### Option A — Wait for Supabase Recovery

If this is a Supabase-side incident (confirmed on status.supabase.com):
- Subscribe to the incident on the status page
- Monitor `/api/health` — recovery is automatic when Supabase recovers
- No action required on the application side

### Option B — Restart the Application

If Supabase is healthy but the app can't connect (possible connection pool exhaustion):

```bash
pm2 restart eunoia
pm2 logs eunoia --lines 50
```

### Option C — Reduce Connection Load

If Supabase reports connection limits reached:
1. Check `max_connections` in Supabase Dashboard → Database → Settings
2. Consider enabling **PgBouncer** (Supabase built-in connection pooler)
3. In Supabase Dashboard → Database → Connection Pooling → Enable PgBouncer
4. Update `NEXT_PUBLIC_SUPABASE_URL` to use the pooler URL

---

## Verification

```bash
curl https://yourdomain.com/api/health | jq '.providers.database'
# Expected: { "status": "ok", "latency_ms": <n> }
```

---

## Escalation

If the issue persists more than 30 minutes and Supabase status page shows no incident:
1. Open a Supabase support ticket (Dashboard → Support)
2. Include your project reference and the error from `/api/admin/system`
