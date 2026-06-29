# Storage Down — Runbook

**Trigger**: `health_provider_up{provider="storage"} == 0`

**Severity**: SEV3 (non-critical — file uploads unavailable but core features work)

Storage is a non-critical provider. Its failure does not affect `healthy_system_up`. CRM, RAG Assistant, and Settings continue to work.

---

## Diagnosis

```bash
curl https://yourdomain.com/api/health | jq '.providers.storage'
```

Check Supabase status (Storage runs on Supabase):
- Visit [status.supabase.com](https://status.supabase.com) → look for Storage incidents

---

## Mitigation

### If Supabase Storage is down globally

Wait for Supabase recovery. No action required on the application side.

### If the bucket is misconfigured

Check Supabase Dashboard → Storage:
1. Confirm the bucket exists
2. Confirm RLS policies allow the `anon` role to read (public buckets) or `authenticated` to read/write
3. Check bucket name matches any environment variable referencing it

### Disable Provider (Suppress Noise)

If the outage is known and extended, disable the health check:
```
ENABLE_STORAGE_HEALTH=false
```

Redeploy or restart to pick up the change.

---

## Verification

```bash
curl https://yourdomain.com/api/health | jq '.providers.storage'
# Expected: { "status": "ok", "latency_ms": <n> }
```
