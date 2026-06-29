# High CPU — Runbook

**Trigger**: CPU usage sustained above 80% for 5+ minutes  
OR `process_uptime_seconds` resets frequently (crash-restart loop)

**Severity**: SEV2 (response latency > 2s) / SEV3 (latency elevated but functional)

---

## Diagnosis

### 1. Identify CPU Usage

**PM2**:
```bash
pm2 describe eunoia | grep cpu
pm2 monit  # real-time view
```

**System-wide**:
```bash
top -p $(pm2 pid eunoia)
# Or if using systemd:
systemctl status eunoia
```

### 2. Check for Crash-Restart Loop

```bash
pm2 describe eunoia | grep restarts
pm2 logs eunoia --err --lines 50
```

A crash-restart loop (restarts > 5 in an hour) is SEV1 — treat as a deployment failure. See `deployment-failure.md`.

### 3. Check Recent Traffic

**Vercel**:
- Dashboard → Analytics → look for unusual request spike

**PM2 / VPS**:
```bash
# Count requests in the last 100 log lines
pm2 logs eunoia --lines 100 | grep '"route"' | wc -l
```

---

## Common Causes

| Cause | How to Identify | Fix |
|-------|----------------|-----|
| RAG embedding spike | High concurrent `/dashboard/assistant` requests | Rate limit is already in place (50/hr/user) |
| Crypto operations | Many concurrent auth requests | Typically brief — wait or restart |
| Tight loop / infinite recursion | CPU at 100%, one core pegged | Check Sentry for stack overflows |
| Large document ingestion | Manual trigger in KB | Ingest is async — wait for completion |
| DDoS / abuse | Many requests from one IP | Block at Cloudflare/Vercel WAF |

---

## Mitigation

### Option A — Wait

Brief CPU spikes (< 5 minutes) from legitimate traffic are normal. Monitor and wait.

### Option B — Restart

If a runaway process is pinning CPU:
```bash
pm2 restart eunoia
```

### Option C — Scale Up

If traffic is legitimately high and CPU is consistently > 70%:
- Vercel: Automatic — scales on demand
- VPS: Upgrade instance tier or add a second instance behind a load balancer

### Option D — Block Abusive Traffic

If a single IP is flooding requests:

**Cloudflare** (if behind CF):
1. Dashboard → Security → Firewall Rules
2. Add rule: `ip.src eq <abusive-ip>` → Action: Block

**Nginx** (if reverse proxying):
```nginx
limit_req_zone $binary_remote_addr zone=app:10m rate=30r/m;
server {
  location / {
    limit_req zone=app burst=20 nodelay;
  }
}
```

---

## Verification

```bash
# CPU should be back to baseline (< 20% idle)
pm2 describe eunoia | grep cpu

# Health should be green
curl https://yourdomain.com/api/health | jq .healthy
```
