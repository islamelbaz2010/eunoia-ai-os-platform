#!/usr/bin/env bash
# ops/scripts/rotate-keys.sh — Secret key rotation guide
#
# Usage:
#   ./ops/scripts/rotate-keys.sh [--service openai|supabase|resend|sentry|metrics|all]
#
# IMPORTANT:
#   This script provides DOCUMENTED PROCEDURES for key rotation.
#   It does NOT automatically rotate keys (no API can do that safely for all services).
#   Follow each section's steps manually.
#
# Security rules:
#   - Generate new key BEFORE revoking old one
#   - Test new key in staging BEFORE updating production
#   - Update Vercel env first, then redeploy
#   - Revoke old key only after confirming new key works
#   - Never commit keys to git

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { echo -e "${BLUE}$*${RESET}"; }
warn()   { echo -e "${YELLOW}⚠ $*${RESET}"; }
ok()     { echo -e "${GREEN}✓ $*${RESET}"; }
step()   { echo -e "\n${BOLD}$*${RESET}"; }
header() { echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}"
           echo -e "${BOLD}${BLUE}  $*${RESET}"
           echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${RESET}"; }

SERVICE="${1:---service}"
shift 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --service) SERVICE="$2"; shift 2 ;;
    *) shift ;;
  esac
done
SERVICE="${SERVICE:-all}"

rotate_openai() {
  header "OPENAI API KEY ROTATION"
  log "Variable: OPENAI_API_KEY"
  log "Used by: RAG Assistant (src/lib/ai/openai.ts)"
  echo ""

  step "STEP 1 — Generate new key"
  log "  1. Visit: https://platform.openai.com/api-keys"
  log "  2. Click 'Create new secret key'"
  log "  3. Copy the key — it is shown ONCE"
  log "  4. Store temporarily in a password manager"

  step "STEP 2 — Test in staging"
  warn "  Never rotate production keys without testing in staging first."
  log "  Set OPENAI_API_KEY=<new_key> in staging environment"
  log "  Verify: ./ops/monitoring/healthcheck.sh --url https://staging.yourdomain.com"

  step "STEP 3 — Update production"
  log "  Vercel: Dashboard → Project → Settings → Environment Variables"
  log "  Update OPENAI_API_KEY with new value"
  log "  Trigger redeploy: Vercel → Deployments → Redeploy"

  step "STEP 4 — Verify"
  log "  ./ops/monitoring/healthcheck.sh | grep openai"
  log "  Expected: openai → ok"

  step "STEP 5 — Revoke old key"
  log "  1. Return to: https://platform.openai.com/api-keys"
  log "  2. Find the OLD key in the list"
  log "  3. Click the trash icon to revoke it"
  warn "  Only revoke AFTER confirming new key is working in production."
}

rotate_supabase() {
  header "SUPABASE KEY ROTATION"
  log "Variables: NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
  log "Note: Supabase URL does NOT change — only the JWT secret signing key changes"
  echo ""

  warn "SUPABASE KEY ROTATION AFFECTS ALL ACTIVE SESSIONS."
  warn "All logged-in users will be signed out. Plan for a maintenance window."
  echo ""

  step "STEP 1 — Plan maintenance window"
  log "  1. Enable maintenance mode: ./ops/maintenance/maintenance.sh enable --reason 'Key rotation'"
  log "  2. Notify users via status page"

  step "STEP 2 — Rotate JWT secret in Supabase"
  log "  1. Visit: Supabase Dashboard → Project → Settings → API"
  log "  2. Under 'JWT Settings' → 'Generate new JWT secret'"
  log "  3. New ANON_KEY and SERVICE_ROLE_KEY will be shown"
  log "  4. Copy both keys"

  step "STEP 3 — Update environment variables"
  log "  Vercel: Update NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY"
  log "  Local: Update .env.local"
  log "  GitHub Actions: Update repository secrets"

  step "STEP 4 — Redeploy"
  log "  ./ops/deploy/deploy.sh --env production"

  step "STEP 5 — Verify and disable maintenance mode"
  log "  ./ops/monitoring/healthcheck.sh"
  log "  ./ops/maintenance/maintenance.sh disable"

  ok "All users will need to re-authenticate after this rotation."
}

rotate_resend() {
  header "RESEND API KEY ROTATION"
  log "Variable: RESEND_API_KEY"
  log "Used by: Team invite emails (src/lib/email.ts)"
  echo ""

  step "STEP 1 — Generate new key"
  log "  1. Visit: https://resend.com/api-keys"
  log "  2. Click 'Create API Key'"
  log "  3. Grant 'Sending access' for your domain"
  log "  4. Copy the key (shown once)"

  step "STEP 2 — Update and redeploy"
  log "  Vercel: Update RESEND_API_KEY"
  log "  Trigger redeploy or wait for next deploy"

  step "STEP 3 — Test"
  log "  Send a test invite from Settings → Team → Invite"
  log "  Confirm email arrives within 60 seconds"

  step "STEP 4 — Revoke old key"
  log "  Resend Dashboard → API Keys → revoke the old key"
}

rotate_sentry() {
  header "SENTRY KEY ROTATION"
  log "Variables: NEXT_PUBLIC_SENTRY_DSN, SENTRY_DSN, SENTRY_AUTH_TOKEN"
  echo ""

  step "STEP 1 — DSN rotation (rarely needed)"
  log "  DSNs are per-project and long-lived. Rotate only if compromised."
  log "  1. Sentry → Project Settings → Client Keys → Revoke existing"
  log "  2. Create new key in same location"
  log "  3. Update NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN in Vercel"
  log "  4. Redeploy"

  step "STEP 2 — Auth token rotation (for source maps)"
  log "  Auth tokens are for CI source map upload — NOT in Vercel."
  log "  1. Sentry → User Settings → Auth Tokens → Revoke old token"
  log "  2. Create new token with 'project:releases' scope"
  log "  3. Update SENTRY_AUTH_TOKEN in GitHub Actions secrets"
  warn "  NEVER put SENTRY_AUTH_TOKEN in Vercel environment variables."
}

rotate_metrics() {
  header "METRICS TOKEN ROTATION"
  log "Variable: METRICS_TOKEN"
  log "Used by: /api/metrics Prometheus endpoint"
  echo ""

  step "STEP 1 — Generate new token"
  NEW_TOKEN=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  log "  Generated token: $NEW_TOKEN"
  log "  (Copy this — it won't be shown again)"
  echo ""

  step "STEP 2 — Update Prometheus scrape config"
  log "  prometheus.yml:"
  log "    bearer_token: <new_token>"

  step "STEP 3 — Update Vercel"
  log "  Vercel: Update METRICS_TOKEN with the generated value"
  log "  Redeploy to pick up new token"

  step "STEP 4 — Verify"
  log "  curl -H 'Authorization: Bearer <new_token>' https://yourdomain.com/api/metrics"
  log "  Expected: HTTP 200 with Prometheus text"
}

case "$SERVICE" in
  openai)   rotate_openai ;;
  supabase) rotate_supabase ;;
  resend)   rotate_resend ;;
  sentry)   rotate_sentry ;;
  metrics)  rotate_metrics ;;
  all)
    rotate_openai
    echo ""
    rotate_resend
    echo ""
    rotate_sentry
    echo ""
    rotate_metrics
    echo ""
    warn "Supabase key rotation requires a maintenance window — run with --service supabase when ready."
    ;;
  *)
    echo "Usage: $0 --service openai|supabase|resend|sentry|metrics|all"
    exit 1 ;;
esac

echo ""
ok "Key rotation documentation complete."
log "Always test in staging before rotating production keys."
