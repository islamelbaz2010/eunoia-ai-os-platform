# Incident Response — Runbook

Use this runbook for any severity-1 (customer-impacting) incident.

---

## Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| SEV1 | System down or data loss | < 15 min |
| SEV2 | Critical feature unavailable | < 1 hour |
| SEV3 | Degraded experience | < 4 hours |
| SEV4 | Minor issue | Next business day |

---

## SEV1 Response Steps

### 1. Detect (0–5 min)

- [ ] Uptime monitor alert fires
- [ ] Check `/api/health` — HTTP status and body
- [ ] Check `/api/live` — confirm process is running
- [ ] Check Sentry → Issues for new error clusters

```bash
curl https://yourdomain.com/api/health | jq .
curl https://yourdomain.com/api/live
```

### 2. Triage (5–15 min)

Identify the failing component from the health report:

```bash
curl https://yourdomain.com/api/health | jq '.providers | to_entries | map(select(.value.status != "ok"))'
```

Route to the appropriate runbook:

| Failing Provider | Runbook |
|-----------------|---------|
| `database` | `database-down.md` |
| `auth` | `database-down.md` (auth uses Supabase) |
| `openai` | `openai-down.md` |
| `storage` | `storage-down.md` |
| `email` | `email-down.md` |
| `cache` | `cache-down.md` |
| `queue` | `queue-down.md` |
| None of the above | `deployment-failure.md` |

### 3. Communicate (within 15 min of SEV1)

- [ ] Post to internal incident channel: "Investigating [symptom] since [time]"
- [ ] Update public status page: "Investigating"
- [ ] If customers are affected: send status page incident update

### 4. Mitigate

Follow the component-specific runbook. Common mitigations:
- **Rollback**: See `rollback.md`
- **Restart process**: `pm2 restart eunoia`
- **Enable maintenance mode**: Block traffic at Vercel/Cloudflare level

### 5. Resolve

- [ ] Confirm `/api/health` returns `"healthy": true`
- [ ] Confirm no new errors in Sentry
- [ ] Update status page: "Resolved"
- [ ] Notify affected customers if applicable

### 6. Post-Incident Review (within 24 hours)

Write a PIR covering:
1. What happened (timeline)
2. Root cause
3. How it was detected
4. How it was fixed
5. What would have prevented it
6. Action items (with owners and due dates)

---

## Contact List

| Role | Contact |
|------|---------|
| On-call engineer | Set in your PagerDuty / Better Stack escalation |
| Engineering lead | Add your contact here |
| Supabase status | https://status.supabase.com |
| OpenAI status | https://status.openai.com |
| Vercel status | https://www.vercel-status.com |
