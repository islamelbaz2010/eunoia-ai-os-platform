# Launch Checklist

Run this checklist before going live with Eunoia AI OS.

---

## Infrastructure

- [ ] Domain registered and DNS configured
- [ ] SSL certificate installed and auto-renewing
- [ ] Nginx configured and serving HTTPS
- [ ] PM2 (or Docker) running with auto-restart on boot
- [ ] PM2 startup command run (`pm2 startup | tail -1 | bash && pm2 save`)

## Environment Variables (Vercel or .env.local)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set
- [ ] `OPENAI_API_KEY` — set
- [ ] `NEXT_PUBLIC_APP_URL` — set to production domain (https://...)
- [ ] `RESEND_API_KEY` — set (required for invite emails)
- [ ] `FROM_EMAIL` — set to verified Resend domain
- [ ] `NEXT_PUBLIC_SENTRY_DSN` — set
- [ ] `SENTRY_DSN` — set
- [ ] `METRICS_TOKEN` — set (generated with `openssl rand -base64 32`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — NOT set in cloud env (local/scripts only)

Verify: `./ops/scripts/validate-env.sh`

## Database

- [ ] Migrations 0001–0008 applied to production Supabase
- [ ] RLS enabled on all tables
- [ ] `supabase/migrations/` committed to git

## Monitoring

- [ ] Uptime monitor configured for `/api/health` (Better Stack or UptimeRobot)
- [ ] Sentry DSN set in Vercel
- [ ] First error visible in Sentry (trigger a test error)
- [ ] Grafana dashboard imported
- [ ] Prometheus scraping `/api/metrics` with Bearer token
- [ ] Alert escalation policy configured

## Security

- [ ] CSP headers verified: `curl -I https://yourdomain.com | grep -i content-security`
- [ ] HSTS header verified: `curl -I https://yourdomain.com | grep -i strict`
- [ ] No secrets in git history: `git log --all --grep="sk-\|eyJ\|re_" --oneline`
- [ ] Nginx rate limiting enabled
- [ ] Supabase RLS tested: verify unauthorized requests are rejected

## Operations

- [ ] `./ops/monitoring/readiness.sh` → PASS (or <3 warnings)
- [ ] `./ops/monitoring/healthcheck.sh` → all providers up
- [ ] `./ops/deploy/deploy.sh` tested in staging
- [ ] `./ops/deploy/rollback.sh` tested (rollback and re-deploy)
- [ ] First backup taken: `./ops/backup/backup.sh`
- [ ] Backup cron configured
- [ ] Log rotation cron configured

## CI/CD

- [ ] GitHub Actions CI passing on main branch
- [ ] `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in GitHub Actions secrets

## Functional Testing

- [ ] Sign up flow works end-to-end
- [ ] Login and logout work
- [ ] Invite email received within 60 seconds
- [ ] CRM: create and delete contact
- [ ] Knowledge Base: add document, trigger embedding
- [ ] RAG Assistant: query returns a cited answer
- [ ] Settings: team member management works
- [ ] Audit logs: actions are recorded

## Performance

- [ ] Lighthouse score > 80 on dashboard
- [ ] `/api/health` responds in < 2s
- [ ] RAG query responds in < 10s

---

## Sign-off

- [ ] Engineering lead reviewed
- [ ] All P0 items resolved
- [ ] Status page live and public
- [ ] On-call rotation set up

**Launch approved by**: _______________  
**Date**: _______________
