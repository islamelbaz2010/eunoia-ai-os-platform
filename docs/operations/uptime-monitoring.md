# Uptime Monitoring — Operations Guide

Eunoia AI OS exposes three health endpoints with distinct purposes. Configure your uptime monitor against the appropriate endpoint based on what you want to detect.

---

## Endpoint Summary

| Endpoint | Caching | Auth | What it detects |
|----------|---------|------|----------------|
| `/api/live` | None | None | Process is running |
| `/api/health` | 30s | None | All critical providers up |
| `/api/admin/system` | None | Bearer token | Full diagnostics |

**Recommendation**: Monitor `/api/health` for most use cases. It checks all critical providers (database, auth, environment) and returns `healthy: false` if any are down. The 30s cache means two consecutive monitor polls may return a cached response — this is expected.

**Liveness only**: Monitor `/api/live` if you just want to confirm the process hasn't crashed.

---

## Expected Responses

### `/api/live` (Liveness)

```
HTTP 200 OK
Content-Type: application/json

{"status":"live","ts":"2026-06-29T10:00:00.000Z"}
```

### `/api/health` (Readiness) — Healthy

```
HTTP 200 OK
X-Cache: MISS (or HIT)

{"healthy":true,"providers":{...},"checked_at":"..."}
```

### `/api/health` (Readiness) — Degraded

```
HTTP 503 Service Unavailable

{"healthy":false,"providers":{...},"checked_at":"..."}
```

---

## Better Stack (Recommended)

[Better Stack](https://betterstack.com/uptime) offers generous free tier, on-call escalation, and status pages.

### Configuration

1. **New Monitor** → **URL** → Paste your app URL

| Setting | Value |
|---------|-------|
| URL | `https://yourdomain.com/api/health` |
| Check frequency | Every 1 minute |
| HTTP method | GET |
| Check type | HTTP Status + Response body |
| Expected status | 200 |
| Response body must contain | `"healthy":true` |
| Timeout | 10 seconds |
| Regions | At least 2 (US + EU) |

2. **Notifications** → Enable email + Slack (or PagerDuty for critical systems)

3. **Status Page** → Create a public status page. Use "Check URL" = `/api/health` with "Expected string" = `"healthy":true`.

### Liveness Check (Secondary)

Add a second monitor for liveness:

| Setting | Value |
|---------|-------|
| URL | `https://yourdomain.com/api/live` |
| Expected status | 200 |
| Response body must contain | `"status":"live"` |
| Alert delay | 2 failures before alerting |

---

## UptimeRobot (Free Alternative)

[UptimeRobot](https://uptimerobot.com) — free tier supports 50 monitors at 5-minute intervals.

### Configuration

1. **Add New Monitor** → **Monitor Type**: HTTP(s)
2. Fill in:

| Setting | Value |
|---------|-------|
| Friendly Name | Eunoia AI OS — Health |
| URL | `https://yourdomain.com/api/health` |
| Monitoring Interval | Every 5 minutes |
| Monitor Timeout | 30 seconds |
| HTTP Method | GET (default) |

3. **Advanced Settings**:
   - Alert Contacts: Your email or Slack webhook
   - Keyword: Enable → Must contain → `"healthy":true`

---

## Cronitor (Status Page Focused)

[Cronitor](https://cronitor.io) is good when you want combined uptime + cron job monitoring.

```bash
# Install Cronitor CLI (optional, for local testing)
npm install -g cronitor

# Test your endpoint
cronitor ping "YOUR_MONITOR_KEY"
```

---

## Incident Detection Logic

Eunoia AI OS's `/api/health` returns `HTTP 503` when any **critical** provider fails. Non-critical providers (storage, email, cache, queue) are noted in the response but do not affect the HTTP status code.

| Provider | Critical | Failure HTTP Status |
|----------|----------|---------------------|
| `environment` | ✅ | 503 |
| `database` | ✅ | 503 |
| `auth` | ✅ | 503 |
| `storage` | ❌ | 200 (degraded in body) |
| `openai` | ❌ | 200 (degraded in body) |
| `email` | ❌ | 200 (degraded in body) |
| `cache` | ❌ | 200 (degraded in body) |
| `queue` | ❌ | 200 (degraded in body) |

Configure your monitor to alert on:
1. **HTTP status ≠ 200** → Critical system failure
2. **Response body does NOT contain `"healthy":true`** → Degraded critical provider

---

## Alert Escalation Policy (Recommended)

| Delay after first failure | Action |
|--------------------------|--------|
| 0 minutes | Email on-call engineer |
| 5 minutes | SMS / phone call |
| 15 minutes | Page team lead |
| 30 minutes | Page VP Engineering |

---

## Multi-Region Testing

Configure monitors from at least two geographic regions (US + EU). A single-region monitor risks false positives from regional network issues.

Better Stack monitors from: Virginia, Frankfurt, Singapore, São Paulo, Sydney (on paid plans).

---

## SLA Calculation

To calculate uptime percentage:

```
uptime% = (total_minutes - downtime_minutes) / total_minutes × 100
```

| SLA | Max downtime / month |
|-----|---------------------|
| 99.9% ("three nines") | 43.8 minutes |
| 99.95% | 21.9 minutes |
| 99.99% ("four nines") | 4.4 minutes |

For Starter plan targeting 99.9%, a maximum of one ~40-minute outage per month is acceptable.

---

## Post-Incident Verification

After resolving an incident, confirm health is fully restored:

```bash
curl https://yourdomain.com/api/health | jq .

# Expected: { "healthy": true, "providers": { ... all ok } }
```

Check the admin endpoint for provider-level detail:

```bash
curl -H "Authorization: Bearer $ADMIN_SESSION_TOKEN" \
     https://yourdomain.com/api/admin/system | jq .
```
