# Recovery Checklist — Runbook

Use this checklist after resolving any SEV1 or SEV2 incident to confirm full system recovery before declaring "all clear".

---

## Immediate Verification (< 5 minutes)

- [ ] `/api/live` → HTTP 200 with `{"status":"live"}`
- [ ] `/api/health` → HTTP 200 with `"healthy": true`
- [ ] All critical providers report `status: ok`:
  - [ ] `environment`
  - [ ] `database`
  - [ ] `auth`

```bash
curl https://yourdomain.com/api/health | jq '{healthy, providers: (.providers | to_entries | map({(.key): .value.status}) | add)}'
```

---

## Feature Verification (< 15 minutes)

Test the golden path for each feature:

- [ ] **Auth**: Log in with a test account → redirects to `/dashboard`
- [ ] **Dashboard**: Loads KPI cards and charts with data
- [ ] **CRM**: Contact list loads; create a test contact; delete it
- [ ] **Knowledge Base**: Document list loads
- [ ] **RAG Assistant**: Send "What is Eunoia?" → receives a response
- [ ] **Settings**: Settings page loads; team member list visible
- [ ] **Audit Logs**: Audit log page loads with events

---

## Observability Verification (< 30 minutes)

- [ ] Sentry: No new errors in the last 10 minutes (Issues → Last seen: within 10 min)
- [ ] Grafana: `health_system_up` = 1; all provider gauges green
- [ ] Prometheus: Scrape interval normal (no gaps in metrics)
- [ ] PM2 / Vercel: No unexpected restarts in the last 30 minutes

---

## Communication

- [ ] Status page updated: "Resolved — [brief description]"
- [ ] Internal incident channel: "Incident resolved at [time]"
- [ ] Customer communication sent (if SLA breach occurred)

---

## Post-Incident Actions (< 24 hours)

- [ ] Post-incident review (PIR) scheduled or written
- [ ] Root cause documented
- [ ] Action items created with owners and due dates
- [ ] Runbook updated if steps were missing or incorrect
- [ ] Alert thresholds reviewed (was this detected fast enough?)

---

## All-Clear Declaration

Only declare all-clear when ALL of the following are true:
1. `/api/health` has been `healthy: true` for at least 10 consecutive minutes
2. No new Sentry errors related to the incident
3. Feature verification checklist above is complete
4. Status page is updated
