#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/verify.sh
# Eunoia AI OS — Comprehensive pre-exhibition verification
#
# Tests every subsystem. Outputs PASS or FAIL per check.
# Exit 0 = all required checks passed. Exit 1 = one or more failures.
#
# Usage:
#   ./scripts/exhibition/verify.sh              # full check
#   ./scripts/exhibition/verify.sh --local-only  # skip live production tests
#   ./scripts/exhibition/verify.sh --fast        # skip slow checks (OpenAI ping)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT/.env.local"
PROD_URL="https://eunoia-ai-os-platform.vercel.app"

LOCAL_ONLY=false
FAST=false
for arg in "$@"; do
  case $arg in
    --local-only) LOCAL_ONLY=true ;;
    --fast)       FAST=true ;;
  esac
done

# ── Colour helpers ─────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R="\033[0;31m" G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  R="" G="" Y="" C="" B="" N=""
fi

PASS_COUNT=0; FAIL_COUNT=0; WARN_COUNT=0

pass() { echo -e "  ${G}✓ PASS${N}  $1"; ((PASS_COUNT++)) || true; }
fail() { echo -e "  ${R}✗ FAIL${N}  $1"; ((FAIL_COUNT++)) || true; }
warn() { echo -e "  ${Y}⚠ WARN${N}  $1"; ((WARN_COUNT++)) || true; }
hdr()  { echo -e "\n${B}${C}── $1 ──${N}"; }

# ── Load .env.local ────────────────────────────────────────────────────────────
load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    while IFS= read -r line; do
      line="${line%%#*}"           # strip comments
      line="${line%"${line##*[![:space:]]}"}"  # trim trailing space
      [[ -z "$line" || "$line" != *=* ]] && continue
      key="${line%%=*}"
      val="${line#*=}"
      val="${val%\"}" ; val="${val#\"}"   # strip surrounding quotes
      val="${val%\'}" ; val="${val#\'}"
      export "$key=$val" 2>/dev/null || true
    done < "$ENV_FILE"
  fi
}
load_env

# ── Helpers ────────────────────────────────────────────────────────────────────
env_set() {
  local v="${!1:-}"
  [[ -n "$v" && "$v" != "YOUR_"* && "$v" != "change-me"* ]]
}

http_code() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1" 2>/dev/null || echo "000"
}

http_body() {
  curl -s --max-time 10 "$1" 2>/dev/null || echo ""
}

http_header() {
  curl -s -I --max-time 10 "$1" 2>/dev/null || echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${B}${C}══════════════════════════════════════════════════${N}"
echo -e "${B}${C}  Eunoia AI OS — Exhibition Verification Suite     ${N}"
echo -e "${B}${C}══════════════════════════════════════════════════${N}"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  Target: $PROD_URL"

# ── 1. ENVIRONMENT ─────────────────────────────────────────────────────────────
hdr "1. Environment Variables"

for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY OPENAI_API_KEY NEXT_PUBLIC_APP_URL; do
  if env_set "$var"; then pass "$var"; else fail "$var (missing or placeholder)"; fi
done

for var in SUPABASE_SERVICE_ROLE_KEY; do
  if env_set "$var"; then pass "$var (local/scripts only)"; else warn "$var not in .env.local — seed-demo.sh will not work"; fi
done

for var in RESEND_API_KEY STRIPE_SECRET_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET METRICS_TOKEN; do
  if env_set "$var"; then pass "$var"; else warn "$var not set — limited functionality"; fi
done

# SUPABASE_SERVICE_ROLE_KEY must NOT be in Vercel (enforced in code, warn here)
echo "  (SUPABASE_SERVICE_ROLE_KEY must only be in .env.local, never in Vercel)"

# ── 2. DATABASE ────────────────────────────────────────────────────────────────
hdr "2. Database (Supabase REST)"

SB_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SB_ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

if [[ -n "$SB_URL" && -n "$SB_ANON" ]]; then
  # Health check via PostgREST
  DB_RESP=$(curl -s --max-time 10 \
    -H "apikey: $SB_ANON" \
    -H "Authorization: Bearer $SB_ANON" \
    "$SB_URL/rest/v1/" 2>/dev/null || echo "ERROR")
  # 200/206 = success; 401/403 = table exists but RLS-protected (anon role has no access, correct)
  # 404 or 000 = table missing or Supabase unreachable
  table_exists() {
    local code="$1"
    [[ "$code" == "200" || "$code" == "206" || "$code" == "401" || "$code" == "403" ]]
  }

  if echo "$DB_RESP" | grep -q "paths\|swagger\|openapi\|200\|42501\|permission denied"; then
    pass "Supabase REST API reachable"
  else
    # Try a simple table check
    TBL=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
      -H "apikey: $SB_ANON" \
      -H "Authorization: Bearer $SB_ANON" \
      "$SB_URL/rest/v1/organizations?limit=0" 2>/dev/null || echo "000")
    if table_exists "$TBL"; then
      pass "Supabase REST API reachable (RLS-protected as expected)"
    else
      fail "Supabase REST API unreachable (HTTP $TBL)"
    fi
  fi

  # Check key tables exist via REST (401/403 = RLS blocking anon = table exists)
  for table in organizations organization_members crm_contacts knowledge_base_documents audit_logs usage_events; do
    CODE=$(curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
      -H "apikey: $SB_ANON" \
      -H "Authorization: Bearer $SB_ANON" \
      "$SB_URL/rest/v1/$table?limit=0" 2>/dev/null || echo "000")
    if table_exists "$CODE"; then
      pass "Table: $table"
    else
      fail "Table: $table (HTTP $CODE) — migration may be missing"
    fi
  done

  # Check billing table (migration 0011)
  BILLING_CODE=$(curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
    -H "apikey: $SB_ANON" \
    -H "Authorization: Bearer $SB_ANON" \
    "$SB_URL/rest/v1/billing_subscriptions?limit=0" 2>/dev/null || echo "000")
  if table_exists "$BILLING_CODE"; then
    pass "Table: billing_subscriptions (migration 0011 applied)"
  else
    warn "Table: billing_subscriptions missing — apply migration 0011 for billing to work"
  fi

  # Check CRM contacts table (migration 0010)
  CRM_CODE=$(curl -s --max-time 8 -o /dev/null -w "%{http_code}" \
    -H "apikey: $SB_ANON" \
    -H "Authorization: Bearer $SB_ANON" \
    "$SB_URL/rest/v1/crm_contacts?limit=0&select=pipeline_stage" 2>/dev/null || echo "000")
  if table_exists "$CRM_CODE"; then
    pass "CRM contacts schema (migration 0010 applied)"
  else
    warn "CRM contacts missing pipeline_stage column — apply migration 0010_crm_platform_fixed.sql"
  fi
else
  fail "Cannot check database — SUPABASE env vars missing"
fi

# ── 3. AUTHENTICATION ──────────────────────────────────────────────────────────
hdr "3. Authentication (Supabase Auth)"

if [[ -n "$SB_URL" && -n "$SB_ANON" ]]; then
  AUTH_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
    -H "apikey: $SB_ANON" \
    "${SB_URL}/auth/v1/settings" 2>/dev/null || echo "000")
  if [[ "$AUTH_CODE" == "200" ]]; then
    pass "Supabase Auth service reachable"
  else
    fail "Supabase Auth service unreachable (HTTP $AUTH_CODE)"
  fi
else
  fail "Cannot check auth — SUPABASE env vars missing"
fi

# ── 4. OPENAI ──────────────────────────────────────────────────────────────────
hdr "4. OpenAI"

OAI_KEY="${OPENAI_API_KEY:-}"
if [[ -n "$OAI_KEY" && "$OAI_KEY" != "YOUR_"* ]]; then
  if [[ "$FAST" == "true" ]]; then
    warn "Skipping OpenAI API ping (--fast mode)"
  else
    OAI_CODE=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $OAI_KEY" \
      "https://api.openai.com/v1/models/gpt-4o-mini" 2>/dev/null || echo "000")
    if [[ "$OAI_CODE" == "200" ]]; then
      pass "OpenAI API key valid (gpt-4o-mini accessible)"
    else
      fail "OpenAI API key invalid or rate-limited (HTTP $OAI_CODE)"
    fi
  fi
else
  fail "OPENAI_API_KEY not set"
fi

# ── 5. RESEND ──────────────────────────────────────────────────────────────────
hdr "5. Resend (Email Delivery)"

RESEND_KEY="${RESEND_API_KEY:-}"
if [[ -n "$RESEND_KEY" && "$RESEND_KEY" != "re_YOUR"* ]]; then
  if [[ "$FAST" == "true" ]]; then
    pass "RESEND_API_KEY is set (skipping API ping)"
  else
    RESEND_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $RESEND_KEY" \
      "https://api.resend.com/domains" 2>/dev/null || echo "000")
    if [[ "$RESEND_CODE" == "200" ]]; then
      pass "Resend API key valid"
    elif [[ "$RESEND_CODE" == "401" ]]; then
      fail "Resend API key invalid (401)"
    else
      warn "Resend API returned HTTP $RESEND_CODE — check key"
    fi
  fi
else
  warn "RESEND_API_KEY not set — invite emails will be skipped (non-critical for exhibition)"
fi

# ── 6. STRIPE ──────────────────────────────────────────────────────────────────
hdr "6. Stripe (Billing)"

STRIPE_KEY="${STRIPE_SECRET_KEY:-}"
if [[ -n "$STRIPE_KEY" && "$STRIPE_KEY" != "sk_live_YOUR"* && "$STRIPE_KEY" != "sk_test_YOUR"* ]]; then
  if [[ "$FAST" == "true" ]]; then
    pass "STRIPE_SECRET_KEY is set (skipping API ping)"
  else
    STRIPE_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" \
      -u "$STRIPE_KEY:" \
      "https://api.stripe.com/v1/account" 2>/dev/null || echo "000")
    if [[ "$STRIPE_CODE" == "200" ]]; then
      # Check if price IDs are configured
      STRIPE_RESP=$(curl -s --max-time 10 \
        -u "$STRIPE_KEY:" \
        "https://api.stripe.com/v1/account" 2>/dev/null || echo "{}")
      STRIPE_ENV="live"
      echo "$STRIPE_KEY" | grep -q "test" && STRIPE_ENV="test"
      pass "Stripe API key valid ($STRIPE_ENV mode)"
    else
      fail "Stripe API key invalid (HTTP $STRIPE_CODE)"
    fi
  fi

  for var in STRIPE_STARTER_MONTHLY_PRICE_ID STRIPE_STARTER_ANNUAL_PRICE_ID STRIPE_PRO_MONTHLY_PRICE_ID STRIPE_PRO_ANNUAL_PRICE_ID STRIPE_WEBHOOK_SECRET; do
    if env_set "$var"; then pass "$var"; else warn "$var not set — billing plan will show as unavailable"; fi
  done
else
  warn "STRIPE_SECRET_KEY not set — billing upgrade buttons will be disabled"
fi

# ── 7. HEALTH ENDPOINTS (production) ─────────────────────────────────────────
if [[ "$LOCAL_ONLY" == "false" ]]; then
  hdr "7. Production Health Endpoints"

  LIVE_BODY=$(http_body "$PROD_URL/api/live")
  if echo "$LIVE_BODY" | grep -q '"status":"ok"'; then
    pass "/api/live → {\"status\":\"ok\"}"
  else
    fail "/api/live did not return expected status (got: $LIVE_BODY)"
  fi

  HEALTH_BODY=$(http_body "$PROD_URL/api/health")
  if echo "$HEALTH_BODY" | grep -q '"status":"ready"'; then
    pass "/api/health → {\"status\":\"ready\"}"
  elif echo "$HEALTH_BODY" | grep -q '"status":"degraded"'; then
    warn "/api/health → degraded (some providers failing)"
  else
    fail "/api/health did not return ready (got: ${HEALTH_BODY:0:100})"
  fi

  # ── 8. SECURITY HEADERS ──────────────────────────────────────────────────────
  hdr "8. Security Headers (Production)"

  HEADERS=$(http_header "$PROD_URL/")

  if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    pass "HSTS header present"
  else fail "HSTS header missing"; fi

  if echo "$HEADERS" | grep -qi "x-frame-options: deny"; then
    pass "X-Frame-Options: DENY"
  else fail "X-Frame-Options header missing or incorrect"; fi

  if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    pass "X-Content-Type-Options present"
  else warn "X-Content-Type-Options header missing"; fi

  if echo "$HEADERS" | grep -qi "content-security-policy"; then
    pass "Content-Security-Policy present"
  else fail "CSP header missing"; fi

  if echo "$HEADERS" | grep -qi "permissions-policy"; then
    pass "Permissions-Policy present"
  else warn "Permissions-Policy header missing"; fi

  # ── 9. PUBLIC PAGES ───────────────────────────────────────────────────────────
  hdr "9. Public Pages (Production)"

  for path_name in "/" "/login" "/signup" "/privacy" "/terms"; do
    code=$(http_code "$PROD_URL$path_name")
    if [[ "$code" == "200" ]]; then
      pass "GET $path_name → 200"
    else
      fail "GET $path_name → $code (expected 200)"
    fi
  done

  # ── 10. PROTECTED ROUTES ──────────────────────────────────────────────────────
  hdr "10. Auth Guards (Protected Routes)"

  for path_name in "/dashboard" "/dashboard/assistant" "/onboarding"; do
    code=$(http_code "$PROD_URL$path_name")
    if [[ "$code" == "307" || "$code" == "302" ]]; then
      pass "GET $path_name → $code (auth redirect ✓)"
    elif [[ "$code" == "200" ]]; then
      fail "GET $path_name → 200 (should redirect unauthenticated users!)"
    else
      warn "GET $path_name → $code (unexpected response)"
    fi
  done

  # ── 11. API AUTHENTICATION ────────────────────────────────────────────────────
  hdr "11. API Authentication"

  for api_path in "/api/admin/system" "/api/crm/export"; do
    code=$(http_code "$PROD_URL$api_path")
    if [[ "$code" == "401" || "$code" == "403" || "$code" == "307" ]]; then
      pass "GET $api_path → $code (auth protected ✓)"
    else
      fail "GET $api_path → $code (expected 401/403 without token)"
    fi
  done

  # Metrics should require token
  METRICS_CODE=$(http_code "$PROD_URL/api/metrics")
  if [[ "$METRICS_CODE" == "401" || "$METRICS_CODE" == "403" ]]; then
    pass "GET /api/metrics → $METRICS_CODE (requires token ✓)"
  else
    warn "GET /api/metrics → $METRICS_CODE (may be open — set METRICS_TOKEN)"
  fi

  # Webhook should reject non-POST
  WH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X GET "$PROD_URL/api/stripe/webhook" 2>/dev/null || echo "000")
  if [[ "$WH_CODE" == "405" || "$WH_CODE" == "400" || "$WH_CODE" == "401" ]]; then
    pass "GET /api/stripe/webhook → $WH_CODE (rejects non-POST ✓)"
  else
    warn "GET /api/stripe/webhook → $WH_CODE"
  fi

  # ── 12. STREAMING ENDPOINT ───────────────────────────────────────────────────
  hdr "12. Streaming Endpoint"

  STREAM_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$PROD_URL/api/assistant/stream" \
    -H "Content-Type: application/json" \
    -d '{"question":"test"}' 2>/dev/null || echo "000")
  if [[ "$STREAM_CODE" == "401" || "$STREAM_CODE" == "403" || "$STREAM_CODE" == "307" ]]; then
    pass "/api/assistant/stream → $STREAM_CODE (auth protected ✓)"
  elif [[ "$STREAM_CODE" == "200" ]]; then
    warn "/api/assistant/stream → 200 without auth (verify session guard)"
  else
    warn "/api/assistant/stream → $STREAM_CODE"
  fi

  # ── 13. LANDING PAGE ──────────────────────────────────────────────────────────
  hdr "13. Landing Page Content"

  LANDING=$(curl -s --max-time 15 "$PROD_URL/" 2>/dev/null || echo "")
  if echo "$LANDING" | grep -qi "eunoia"; then
    pass "Landing page contains 'Eunoia' branding"
  else
    fail "Landing page missing expected content"
  fi
  if echo "$LANDING" | grep -qi "knowledge base\|AI assistant\|hospitality"; then
    pass "Landing page contains product keywords"
  else
    warn "Landing page may be missing key product terms"
  fi

  # ── 14. KNOWLEDGE BASE (Production) ──────────────────────────────────────────
  hdr "14. Knowledge Base API"

  KB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "$PROD_URL/dashboard/knowledge-base" 2>/dev/null || echo "000")
  if [[ "$KB_CODE" == "307" || "$KB_CODE" == "302" ]]; then
    pass "/dashboard/knowledge-base → $KB_CODE (auth guard ✓)"
  else
    warn "/dashboard/knowledge-base → $KB_CODE"
  fi

  # ── 15. CRM (Production) ──────────────────────────────────────────────────────
  hdr "15. CRM API"

  CRM_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "$PROD_URL/dashboard/crm" 2>/dev/null || echo "000")
  if [[ "$CRM_CODE" == "307" || "$CRM_CODE" == "302" ]]; then
    pass "/dashboard/crm → $CRM_CODE (auth guard ✓)"
  else
    warn "/dashboard/crm → $CRM_CODE"
  fi

  # ── 16. BILLING (Production) ─────────────────────────────────────────────────
  hdr "16. Billing Page"

  BILLING_PAGE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    "$PROD_URL/dashboard/billing" 2>/dev/null || echo "000")
  if [[ "$BILLING_PAGE" == "307" || "$BILLING_PAGE" == "302" ]]; then
    pass "/dashboard/billing → $BILLING_PAGE (auth guard ✓)"
  else
    warn "/dashboard/billing → $BILLING_PAGE"
  fi

fi  # end if !LOCAL_ONLY

# ── LOCAL CODE QUALITY ─────────────────────────────────────────────────────────
hdr "Code Quality (Local)"

cd "$ROOT"
TSC=$(npx tsc --noEmit 2>&1)
if [[ $? -eq 0 ]]; then
  pass "TypeScript: 0 errors"
else
  fail "TypeScript errors found"
  echo "$TSC" | head -5 | sed 's/^/    /'
fi

LINT=$(npm run lint 2>&1)
if [[ $? -eq 0 ]]; then
  pass "ESLint: clean"
else
  fail "ESLint errors found"
fi

TEST=$(npm test 2>&1 | tail -4)
if echo "$TEST" | grep -q "passed"; then
  PASS_LINE=$(echo "$TEST" | grep "Tests")
  pass "Tests: $PASS_LINE"
else
  fail "Tests failed"
  echo "$TEST" | sed 's/^/    /'
fi

# ── SUMMARY ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${C}══════════════════════════════════════════════════${N}"
echo -e "${B}  VERIFICATION SUMMARY${N}"
echo -e "${B}${C}══════════════════════════════════════════════════${N}"
echo -e "  ${G}PASS${N}: $PASS_COUNT"
echo -e "  ${Y}WARN${N}: $WARN_COUNT"
echo -e "  ${R}FAIL${N}: $FAIL_COUNT"
echo ""

if [[ $FAIL_COUNT -eq 0 && $WARN_COUNT -eq 0 ]]; then
  echo -e "  ${G}${B}✓ ALL CHECKS PASSED — READY FOR EXHIBITION${N}"
  echo ""
  exit 0
elif [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "  ${Y}${B}⚠ $WARN_COUNT WARNINGS — Review before exhibition${N}"
  echo "  Warnings are non-critical but should be resolved if possible."
  echo ""
  exit 0
else
  echo -e "  ${R}${B}✗ $FAIL_COUNT FAILURES — Must fix before exhibition${N}"
  echo ""
  exit 1
fi
