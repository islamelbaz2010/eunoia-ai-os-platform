# Server Lost — Runbook

**Scenario**: The application server is completely unresponsive or destroyed. All in-memory state is lost.

**Severity**: SEV1

**RTO Target**: 2 hours  
**RPO Target**: Last backup (daily backups = max 24h data loss for server state; Supabase data is unaffected)

---

## What Is NOT Lost

| Data | Status |
|------|--------|
| Database (Supabase) | ✅ Safe — hosted, independent of your server |
| Auth users | ✅ Safe — Supabase Auth |
| Uploaded files | ✅ Safe — Supabase Storage |
| Embeddings | ✅ Safe — stored in Supabase pgvector |

## What Is Lost

| Data | Impact |
|------|--------|
| In-memory ring buffer (health history) | Low — repopulates within minutes |
| PM2 log files | Low — logs in .backups/ or external aggregator |
| In-flight requests | Low — stateless Next.js |
| Build artifacts (.next/) | Medium — must rebuild |
| Configuration files | Medium — restored from backup or git |

---

## Recovery Steps

### 1. Provision new server (0–30 min)

- [ ] Provision new VPS (same specs or higher)
- [ ] Install Node.js 20: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install git: `sudo apt install -y git`
- [ ] Install nginx: `sudo apt install -y nginx`

### 2. Restore codebase (30–45 min)

```bash
git clone https://github.com/your-org/eunoia-ai-os-platform.git /opt/eunoia
cd /opt/eunoia
git checkout main
```

### 3. Restore environment variables (45–60 min)

- [ ] Copy `.env.local` from your password manager / secrets vault
- [ ] Verify: `./ops/scripts/validate-env.sh`

If `.env.local` is lost, follow `docs/runbooks/secrets-lost.md`.

### 4. Install dependencies and build (60–90 min)

```bash
npm ci
npm run build
```

### 5. Start PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -1 | bash  # auto-start on boot
```

### 6. Configure Nginx

```bash
sudo cp ops/docs/nginx.conf /etc/nginx/sites-available/eunoia
# Edit to replace yourdomain.com with actual domain
sudo ln -s /etc/nginx/sites-available/eunoia /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

### 7. Restore SSL certificates

See `docs/runbooks/ssl-failure.md` for Let's Encrypt setup.

### 8. Update DNS

Point your domain's A record to the new server IP.

### 9. Verify

```bash
./ops/monitoring/healthcheck.sh
./ops/monitoring/readiness.sh
```

---

## Prevention

- Keep `.env.local` backed up in a secrets vault (1Password, Bitwarden, AWS Secrets Manager)
- Run daily backups: `cron: 0 3 * * * /opt/eunoia/ops/backup/backup.sh`
- Use Vercel for stateless deployments — server recovery becomes irrelevant
