# Operations Manual — Eunoia AI OS

## System Overview

Eunoia AI OS is a Next.js 16 SaaS platform serving AI-powered CRM, Knowledge Base, and RAG Assistant capabilities.

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend + API | Next.js 16 App Router | Server Components, Server Actions |
| Database + Auth | Supabase (PostgreSQL + GoTrue) | RLS enforced at DB level |
| AI/Embeddings | OpenAI GPT-4o-mini + text-embedding-3-small | 50 queries/user/hour |
| Email | Resend | Invite emails only |
| Error tracking | Sentry v10 | All runtimes |
| Metrics | Prometheus (/api/metrics) | Bearer token auth |
| Process manager | PM2 | VPS deployments |
| Web server | Nginx | Reverse proxy + SSL termination |

---

## Daily Operations

### Morning Check (5 min)

1. Check `/api/health`: `curl https://yourdomain.com/api/health | jq .healthy`
2. Check Sentry: no new alerts in last 24 hours
3. Check uptime monitor: 100% uptime in last 24 hours
4. Check Grafana: memory and heap metrics in normal range

### Weekly Operations

1. Run readiness scan: `./ops/monitoring/readiness.sh`
2. Review Sentry error trends
3. Check for dependency updates: `npm outdated`
4. Verify backup integrity: `ls -lh .backups/daily/ | head -10`

### Monthly Operations

1. Run monthly backup: `./ops/backup/backup.sh --monthly`
2. Review and rotate keys if needed: `./ops/scripts/rotate-keys.sh --service all`
3. Run log rotation: `./ops/scripts/rotate-logs.sh --compress --days 30`
4. Review production readiness score: `./ops/monitoring/readiness.sh`
5. Update dependencies: `npm update` (test after each update)

---

## Alerting

### Alert Channels

| Severity | Channel |
|----------|---------|
| SEV1 (system down) | SMS + phone call |
| SEV2 (feature broken) | Email + Slack |
| SEV3 (degraded) | Slack only |
| SEV4 (minor) | Slack notification |

### Alert Rules (Prometheus/Grafana)

See `docs/operations/prometheus.md` for recommended alert rules.

### Uptime Monitoring

See `docs/operations/uptime-monitoring.md` for Better Stack configuration.

---

## Incident Response

1. **Detect** → uptime monitor fires OR Sentry spike OR user report
2. **Triage** → identify component from `/api/health` response
3. **Route** → follow component-specific runbook
4. **Communicate** → update status page within 15 min of SEV1
5. **Resolve** → use `rollback.sh` or fix-forward
6. **Post-mortem** → within 24 hours of resolution

Full procedure: `docs/runbooks/incident-response.md`

---

## PM2 Cheatsheet

```bash
pm2 status                    # Process status
pm2 logs eunoia               # Tail logs
pm2 logs eunoia --lines 200   # Last 200 lines
pm2 logs eunoia --err         # Errors only
pm2 restart eunoia            # Hard restart
pm2 reload eunoia --update-env # Zero-downtime reload (use this after deploy)
pm2 describe eunoia           # Full process info
pm2 monit                     # Real-time dashboard
pm2 flush                     # Clear PM2 log files
pm2 save                      # Save process list (survives reboot)
pm2 startup                   # Generate startup command
```

---

## Nginx Cheatsheet

```bash
sudo nginx -t                 # Test config syntax
sudo nginx -s reload          # Reload config (zero-downtime)
sudo nginx -s stop            # Stop nginx
sudo systemctl restart nginx  # Full restart
sudo tail -f /var/log/nginx/eunoia-error.log  # Error log
sudo tail -f /var/log/nginx/eunoia-access.log  # Access log
```

---

## Database Operations

### Emergency read-only mode

Enable RLS read-only by creating a policy that blocks writes:
```sql
-- In Supabase SQL Editor (temporary — undo after maintenance)
ALTER TABLE contacts DISABLE TRIGGER ALL;
```

**Never** disable RLS entirely in production.

### View active connections

```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

### Kill long-running queries

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE duration > interval '60 seconds'
AND state = 'active';
```

---

## Key File Locations

| File | Purpose |
|------|---------|
| `/opt/eunoia/.env.local` | All secrets and environment variables |
| `/opt/eunoia/ecosystem.config.js` | PM2 configuration |
| `/etc/nginx/sites-available/eunoia` | Nginx configuration |
| `/etc/letsencrypt/live/domain/` | SSL certificates |
| `~/.pm2/logs/` | PM2 log files |
| `/opt/eunoia/.backups/` | Application backups |
| `/opt/eunoia/.deploy-logs/` | Deployment history |
