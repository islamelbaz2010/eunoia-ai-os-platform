# Secrets Lost — Runbook

**Scenario**: `.env.local` is lost, corrupted, or accidentally committed and rotated.

**Severity**: SEV1 (app will not start without required secrets)

---

## Immediate Action

**Do NOT generate new values without following this guide.** Wrong values = broken app.

---

## Recovery Checklist

### Supabase (REQUIRED)

1. Go to [supabase.com](https://supabase.com) → Sign in → Open your project
2. **Settings → API**
3. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL field
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key (for scripts only)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # local/scripts only
```

### OpenAI (REQUIRED)

1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. If old key is accessible, copy it.
3. If lost: create a new key (old one remains valid until revoked).

```bash
OPENAI_API_KEY=sk-proj-...
```

### App URL (REQUIRED)

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Resend (for invite emails)

1. [resend.com/api-keys](https://resend.com/api-keys)
2. Copy existing key or create new one.

```bash
RESEND_API_KEY=re_...
FROM_EMAIL=Eunoia AI OS <noreply@yourdomain.com>
```

### Sentry (for error tracking)

1. [sentry.io](https://sentry.io) → Project → Settings → Client Keys
2. Copy DSN.

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
```

### Metrics token (for Prometheus)

Generate a new one:
```bash
METRICS_TOKEN=$(openssl rand -base64 32)
echo "METRICS_TOKEN=$METRICS_TOKEN"
```

Update Prometheus scrape config with the new token.

---

## Build the .env.local

```bash
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=<from supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase>
SUPABASE_SERVICE_ROLE_KEY=<from supabase>
OPENAI_API_KEY=<from openai>
NEXT_PUBLIC_APP_URL=<your domain>
RESEND_API_KEY=<from resend>
FROM_EMAIL=Eunoia AI OS <noreply@yourdomain.com>
NEXT_PUBLIC_SENTRY_DSN=<from sentry>
SENTRY_DSN=<from sentry>
METRICS_TOKEN=<generated>
EOF
```

## Validate

```bash
./ops/scripts/validate-env.sh
```

Expected: all PASS, 0 FAIL.

---

## Prevention

Store `.env.local` in:
- 1Password / Bitwarden secure note (update on every key rotation)
- AWS Secrets Manager / Google Secret Manager (for team access)
- **Never** in git — `.gitignore` already excludes `.env.local`
