# OpenAI Down — Runbook

**Trigger**: `health_provider_up{provider="openai"} == 0` OR users report "Assistant is unavailable"

**Severity**: SEV2 (RAG Assistant unavailable; all other features continue working)

OpenAI is a non-critical provider — its failure does not affect the system's `healthy` status. However, the RAG Assistant becomes non-functional.

---

## Diagnosis

### 1. Check OpenAI Status

Visit [status.openai.com](https://status.openai.com) — check for active API incidents.

### 2. Check Health Provider

```bash
curl https://yourdomain.com/api/health | jq '.providers.openai'
# Status will be "degraded" or "timeout" if OpenAI is unreachable
```

### 3. Test Directly (from server)

```bash
curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -o /dev/null -w "%{http_code}\n"
# Expected: 200
```

### 4. Check API Key Validity

```bash
curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.error'
# Should be null if key is valid
```

---

## Mitigation Options

### Option A — Wait for OpenAI Recovery

If this is an OpenAI-side incident (confirmed on status.openai.com):
- Disable the OpenAI health check to suppress noise: `ENABLE_OPENAI_HEALTH=false`
- The RAG Assistant returns a user-facing error — this is expected
- Monitor the status page and re-enable when OpenAI recovers

### Option B — Rotate API Key

If the API key is invalid (403 response):

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new key
3. Update `OPENAI_API_KEY` in Vercel: Dashboard → Project → Settings → Environment Variables
4. Redeploy (Vercel → Deployments → Redeploy last deployment)

### Option C — Check Rate Limits / Quota

If getting 429 responses:

```bash
curl https://api.openai.com/v1/usage \
     -H "Authorization: Bearer $OPENAI_API_KEY" | jq .
```

1. Check [platform.openai.com/usage](https://platform.openai.com/usage) for quota
2. Increase spending limit if on a capped plan
3. Consider implementing retry-with-backoff in `src/lib/ai/openai.ts`

---

## User Communication

The RAG Assistant shows a user-facing error message when OpenAI is unavailable. No additional communication is needed for brief outages (<1 hour).

For extended outages (>1 hour):
- Update your status page: "AI Assistant temporarily unavailable"
- Confirm all other features (CRM, Knowledge Base, Settings) work normally

---

## Verification

```bash
# Wait for provider to recover
curl https://yourdomain.com/api/health | jq '.providers.openai'
# Expected: { "status": "ok", "latency_ms": <n> }
```

Test the Assistant in the dashboard after recovery.
