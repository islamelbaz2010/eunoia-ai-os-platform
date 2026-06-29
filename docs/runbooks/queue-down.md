# Queue Down — Runbook

**Trigger**: `health_provider_up{provider="queue"} == 0`

**Severity**: SEV4 (queue is not yet implemented — provider is disabled by default)

The queue provider checks for a separate Redis connection via `QUEUE_REDIS_URL`. If not set, the provider returns `status: disabled`.

---

## Current Status

The queue provider is a **future extension point**. Background job processing is not currently implemented. The provider is a placeholder for:
- Document re-ingestion jobs
- Email notification queues
- Webhook delivery
- Scheduled reporting

---

## If QUEUE_REDIS_URL Is Set and Queue Is Down

```bash
# Test Redis connectivity
redis-cli -u $QUEUE_REDIS_URL ping
# Expected: PONG
```

```bash
curl https://yourdomain.com/api/health | jq '.providers.queue'
```

Follow the same diagnosis and mitigation steps as `cache-down.md`.

---

## Disable Provider

```
ENABLE_QUEUE_HEALTH=false
```

Recommended default until a queue is actively in use.

---

## Verification

```bash
curl https://yourdomain.com/api/health | jq '.providers.queue'
# Disabled: { "status": "disabled" }
# Working: { "status": "ok" }
```
