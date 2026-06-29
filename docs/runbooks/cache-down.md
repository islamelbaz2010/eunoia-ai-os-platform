# Cache Down — Runbook

**Trigger**: `health_provider_up{provider="cache"} == 0`

**Severity**: SEV4 (cache is not yet implemented — provider is disabled by default)

The cache provider checks for a Redis connection via `REDIS_URL`. If `REDIS_URL` is not set, the provider returns `status: disabled` and is not flagged as an error.

---

## Current Status

The cache provider is a **future extension point**. Redis/cache is not currently used by any feature. The provider exists to make the framework ready for:
- Session cache
- RAG query result cache
- Rate limit counters

---

## If REDIS_URL Is Set and Cache Is Down

```bash
# Test Redis connectivity
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

Check Redis provider logs:
```bash
curl https://yourdomain.com/api/health | jq '.providers.cache'
```

### Common Causes

| Cause | Fix |
|-------|-----|
| Redis server down | Restart Redis / check provider |
| Wrong connection string | Verify `REDIS_URL` format: `redis://user:pass@host:6379` |
| TLS required but not configured | Use `rediss://` scheme for TLS connections |
| Authentication error | Check Redis `requirepass` config vs. URL password |

---

## Disable Provider

If Redis is not being used, suppress the health check:
```
ENABLE_CACHE_HEALTH=false
```

This is the recommended default until cache is actively used.

---

## Verification

```bash
curl https://yourdomain.com/api/health | jq '.providers.cache'
# With REDIS_URL set and working: { "status": "ok" }
# Without REDIS_URL (or disabled): { "status": "disabled" }
```
