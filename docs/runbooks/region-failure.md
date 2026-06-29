# Region Failure — Runbook

**Scenario**: Cloud provider region (AWS, GCP, Vercel edge region) is experiencing a partial or full outage affecting the application.

**Severity**: SEV1 (if primary region is down) / SEV2 (if only edge region affected)

---

## Identify the Failure

### Is it your server or the cloud provider?

```bash
# Check from multiple locations using DNS lookup tools
curl "https://api.ipify.org?format=json"  # Your server's IP

# Check provider status
# Vercel:     https://www.vercel-status.com
# Supabase:   https://status.supabase.com
# OpenAI:     https://status.openai.com
# Cloudflare: https://www.cloudflarestatus.com
```

If the cloud provider's status page shows an incident: **wait for recovery**. No manual action required for the application.

---

## Vercel Region Failure

Vercel serves from a global edge network (100+ locations). A single region failure typically does not affect the app.

If Vercel's PRIMARY region (where serverless functions run) is down:
1. Check: [vercel-status.com](https://www.vercel-status.com)
2. Subscribe to the incident for updates
3. Vercel automatically routes to backup regions when possible
4. **No manual intervention needed** — Vercel handles regional failover

---

## VPS Server Region Failure

If your VPS server's region (e.g., AWS us-east-1) is fully down:

**Option A — Wait** (for partial outages expected to resolve < 4 hours)
- Monitor cloud provider status
- Update your status page: "We are aware of connectivity issues in our region"

**Option B — Failover to a new region** (for extended outages > 4 hours)

1. Provision a new server in a different region
2. Follow `docs/runbooks/server-lost.md` for setup
3. Update DNS A record to point to new server
4. Enable maintenance mode: `./ops/maintenance/maintenance.sh enable`
5. Verify new server is healthy: `./ops/monitoring/healthcheck.sh`
6. Disable maintenance mode: `./ops/maintenance/maintenance.sh disable`
7. Monitor for DNS propagation (TTL-dependent, typically 5–60 min)

---

## Supabase Region Failure

Supabase runs in a single region per project (e.g., `ap-southeast-1`). A region failure means the database is inaccessible.

- Check: [status.supabase.com](https://status.supabase.com)
- Supabase Pro/Enterprise includes automatic failover (read replica)
- For Starter plan: wait for Supabase recovery
- **Application will serve HTTP 503** from `/api/health` during database outage

---

## Communication Template

> **[Status page update]**
> We are aware of infrastructure issues in [region] affecting [service]. Our team is monitoring the situation. All data is safe. We will update this message every 30 minutes.

---

## Prevention

- Use Vercel (global edge) instead of single VPS to eliminate single-region risk
- Enable Supabase Pro for read replicas
- Configure uptime monitors from multiple geographic regions (Better Stack, UptimeRobot)
