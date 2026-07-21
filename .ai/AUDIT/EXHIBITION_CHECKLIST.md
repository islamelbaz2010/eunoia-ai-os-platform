# Exhibition Checklist — Manual Actions Only

This checklist contains **only actions that cannot be automated**.
Everything else is handled by `./scripts/exhibition/launch.sh`.

---

## P0 — Required Before Exhibition (≈ 25 minutes total)

### 1. Set RESEND_API_KEY in Vercel (5 min)
Without this, team invite emails are silently skipped.

```
Vercel Dashboard → Project → Settings → Environment Variables → Add
  Key:   RESEND_API_KEY
  Value: re_... (from resend.com → API Keys)
  Env:   Production
```
Also add: `FROM_EMAIL=noreply@yourdomain.com`

**Why it can't be automated:** Requires a human to log into resend.com, create an API key, and paste it into Vercel. The Vercel CLI can only set values for vars you already know — it can't create Resend keys.

---

### 2. Set Sentry DSN in Vercel (5 min)
Without this, client-side crashes are invisible in production.

```
Vercel Dashboard → Project → Settings → Environment Variables → Add
  NEXT_PUBLIC_SENTRY_DSN = https://xxx@xxx.ingest.sentry.io/xxx
  SENTRY_DSN             = https://xxx@xxx.ingest.sentry.io/xxx
  (both from sentry.io → Project → Settings → Client Keys)
```

**Why it can't be automated:** DSN requires a human to log into sentry.io and copy the project-specific key.

---

### 3. Set METRICS_TOKEN in Vercel (2 min)
Without this, `/api/metrics` (Prometheus) is open to anyone on the internet.

```bash
# Generate locally:
openssl rand -base64 32

# Then set in Vercel Dashboard → Environment Variables:
  METRICS_TOKEN = <generated value>
```

**Why it can't be automated:** Token generation can be automated, but uploading to Vercel requires Vercel CLI auth which may not be present on all machines.

---

### 4. Apply Migration 0007 + 0008 to Supabase (10 min)
Without 0007: usage totals RPC missing → usage page falls back to slow query.
Without 0008: `public.healthcheck()` function missing → health endpoint may error.

```
Supabase Dashboard → SQL Editor → New Query
  Paste: supabase/migrations/0007_get_usage_totals.sql → Run
  Paste: supabase/migrations/0008_health_check.sql → Run
```

**Why it can't be automated:** Supabase SQL migrations require human authentication to the Supabase Dashboard or a configured `supabase` CLI with project linked.

---

### 5. Apply Migration 0009 (Enterprise Multitenant) (3 min)
Required if Sprint 4 / billing features are enabled.

```
Supabase Dashboard → SQL Editor → New Query
  Paste: supabase/migrations/0009_enterprise_multitenant.sql → Run
```

**Note:** `ALTER TYPE ADD VALUE` is non-transactional — run in a single editor session.

**Why it can't be automated:** Same as above — Supabase auth required.

---

## P1 — Physical / Logistics (Cannot Be Scripted)

### 6. Charge laptop to 100%
Run the exhibition on power, not battery. Bring charger.

### 7. Prepare mobile hotspot as WiFi backup
Exhibition venue WiFi is unreliable. Configure phone as hotspot before arrival.

### 8. Test demo login on the exhibition device
Different browser profiles / incognito modes can have unexpected behavior.
```
Open: https://eunoia-ai-os-platform.vercel.app/login
Login: demo@eunoiaos.com / EunoiaDemo2026!
```

### 9. Pre-warm the AI assistant
Cold starts on Vercel serverless can take 2-3 seconds.
Send one test message before the exhibition starts:
"What is the check-in procedure for VIP guests?"

---

## What Is Fully Automated

Everything below is handled by `./scripts/exhibition/launch.sh`:

- ✅ TypeScript compilation check
- ✅ All 375 tests
- ✅ ESLint
- ✅ Vercel environment variable sync (from `.env.local`)
- ✅ Supabase connectivity verification
- ✅ OpenAI API verification
- ✅ Stripe API verification
- ✅ Demo account creation (org + user + CRM + KB + usage)
- ✅ Production smoke tests (7 endpoints)
- ✅ Health endpoint checks (`/api/live` + `/api/health`)
- ✅ Security header verification
- ✅ Launch report generation
- ✅ Browser opens automatically

---

## Time Budget

| Action | Who | Time |
|--------|-----|------|
| `./scripts/exhibition/launch.sh` | Script | ~8 min |
| Set RESEND_API_KEY in Vercel | Manual | 5 min |
| Set Sentry DSN in Vercel | Manual | 5 min |
| Set METRICS_TOKEN in Vercel | Manual | 2 min |
| Apply migrations 0007+0008 | Manual | 10 min |
| Apply migration 0009 | Manual | 3 min |
| Physical setup (laptop/hotspot/test) | Manual | 10 min |
| **Total manual** | | **~25 min** |
