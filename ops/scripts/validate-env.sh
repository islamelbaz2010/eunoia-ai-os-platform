#!/usr/bin/env bash
# ops/scripts/validate-env.sh — Environment variable validator
#
# Usage:
#   ./ops/scripts/validate-env.sh [--quiet] [--strict]
#
# Validates:
#   • Required variables exist and are non-empty
#   • URL format for applicable variables
#   • Key length and format (without printing values)
#   • Pattern matching for known formats
#
# Returns:
#   0 — all required variables pass
#   1 — one or more required variables fail
#
# Secrets validation follows Phase 7 rules:
#   NEVER print secret values — only validate existence, length, pattern.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

QUIET=false
STRICT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --quiet)  QUIET=true; shift ;;
    --strict) STRICT=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--quiet] [--strict]"
      echo "  --quiet   Suppress INFO messages, show only PASS/WARN/ERROR"
      echo "  --strict  Treat warnings as errors (non-zero exit on any warn)"
      exit 0 ;;
    *) ;;
  esac
  shift 2>/dev/null || shift
done

PASS=0
WARN=0
FAIL=0

pass()  { PASS=$((PASS+1));  [ "$QUIET" = false ] && echo -e "${GREEN}  PASS${RESET}  $1"; }
warn()  { WARN=$((WARN+1));  echo -e "${YELLOW}  WARN${RESET}  $1"; }
fail()  { FAIL=$((FAIL+1));  echo -e "${RED}  FAIL${RESET}  $1"; }
info()  { [ "$QUIET" = false ] && echo -e "${BLUE}  INFO${RESET}  $1" || true; }
header(){ echo -e "\n${BOLD}${BLUE}── $1 ──${RESET}"; }

# ── Load .env.local if present ────────────────────────────────────────────────

if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  # Safe-load: skip comment lines and blank lines
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Only export if not already set in environment
    if [ -z "${!key:-}" ]; then
      export "$key"="$value"
    fi
  done < .env.local
  set +o allexport
  info "Loaded .env.local"
fi

# ── Helper: check URL format ─────────────────────────────────────────────────

check_url() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then return 1; fi
  if [[ "$value" =~ ^https?:// ]]; then return 0; fi
  return 1
}

# ── Helper: check min length (without printing value) ────────────────────────

check_length() {
  local name="$1"
  local min_len="$2"
  local value="${!name:-}"
  if [ ${#value} -ge "$min_len" ]; then return 0; fi
  return 1
}

# ── Helper: check pattern ─────────────────────────────────────────────────────

check_pattern() {
  local name="$1"
  local pattern="$2"
  local value="${!name:-}"
  if [[ "$value" =~ $pattern ]]; then return 0; fi
  return 1
}

# ── SECTION 1: Supabase ───────────────────────────────────────────────────────

header "SUPABASE"

VAR="NEXT_PUBLIC_SUPABASE_URL"
if [ -z "${!VAR:-}" ]; then
  fail "$VAR — missing (REQUIRED)"
elif ! check_url "$VAR"; then
  fail "$VAR — invalid URL format (must start with https://)"
elif ! check_pattern "$VAR" "supabase.co|localhost"; then
  warn "$VAR — unexpected domain (expected *.supabase.co)"
else
  pass "$VAR — valid URL"
fi

VAR="NEXT_PUBLIC_SUPABASE_ANON_KEY"
if [ -z "${!VAR:-}" ]; then
  fail "$VAR — missing (REQUIRED)"
elif ! check_length "$VAR" 100; then
  fail "$VAR — suspiciously short (expected JWT, 100+ chars)"
elif ! check_pattern "$VAR" "^eyJ"; then
  warn "$VAR — does not look like a JWT (expected eyJ...)"
else
  pass "$VAR — valid JWT format (length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY:-0})"
fi

VAR="SUPABASE_SERVICE_ROLE_KEY"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (OK for Vercel; required for local scripts)"
elif check_pattern "$VAR" "^eyJ"; then
  info "$VAR — present (${#SUPABASE_SERVICE_ROLE_KEY:-0} chars)"
  warn "$VAR — NEVER set this in cloud environments (Vercel, Render, Railway)"
fi

# ── SECTION 2: OpenAI ──────────────────────────────────────────────────────────

header "OPENAI"

VAR="OPENAI_API_KEY"
if [ -z "${!VAR:-}" ]; then
  fail "$VAR — missing (REQUIRED for RAG assistant)"
elif ! check_pattern "$VAR" "^sk-"; then
  warn "$VAR — unexpected format (expected sk-...)"
elif ! check_length "$VAR" 40; then
  warn "$VAR — suspiciously short"
else
  pass "$VAR — valid format (length: ${#OPENAI_API_KEY:-0})"
fi

# ── SECTION 3: Application URL ────────────────────────────────────────────────

header "APPLICATION"

VAR="NEXT_PUBLIC_APP_URL"
if [ -z "${!VAR:-}" ]; then
  fail "$VAR — missing (REQUIRED)"
elif ! check_url "$VAR"; then
  fail "$VAR — invalid URL format"
else
  pass "$VAR — ${!VAR}"
fi

# ── SECTION 4: Email (Resend) ─────────────────────────────────────────────────

header "EMAIL (RESEND)"

VAR="RESEND_API_KEY"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (invite emails will be skipped)"
elif ! check_pattern "$VAR" "^re_"; then
  warn "$VAR — unexpected format (expected re_...)"
elif ! check_length "$VAR" 20; then
  warn "$VAR — suspiciously short"
else
  pass "$VAR — valid format"
fi

VAR="FROM_EMAIL"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (will use default if RESEND_API_KEY is set)"
elif ! check_pattern "$VAR" "<.*@.*>"; then
  warn "$VAR — unexpected format (expected: Name <email@domain.com>)"
else
  pass "$VAR — ${!VAR}"
fi

# ── SECTION 5: Sentry ─────────────────────────────────────────────────────────

header "SENTRY"

VAR="NEXT_PUBLIC_SENTRY_DSN"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (Sentry client error tracking disabled)"
elif ! check_url "$VAR"; then
  fail "$VAR — invalid URL format"
elif ! check_pattern "$VAR" "sentry.io"; then
  warn "$VAR — unexpected domain (expected *.sentry.io)"
else
  pass "$VAR — valid Sentry DSN"
fi

VAR="SENTRY_DSN"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (Sentry server error tracking disabled)"
elif check_url "$VAR"; then
  pass "$VAR — valid URL"
fi

VAR="SENTRY_AUTH_TOKEN"
if [ -z "${!VAR:-}" ]; then
  info "$VAR — not set (OK for runtime; required only for CI source map upload)"
elif check_length "$VAR" 30; then
  info "$VAR — present (length: ${#SENTRY_AUTH_TOKEN:-0})"
  warn "$VAR — should only be in CI, not in Vercel/production runtime env"
fi

# ── SECTION 6: Metrics ────────────────────────────────────────────────────────

header "METRICS"

VAR="METRICS_TOKEN"
if [ -z "${!VAR:-}" ]; then
  warn "$VAR — not set (/api/metrics endpoint is open to the internet)"
elif ! check_length "$VAR" 20; then
  warn "$VAR — too short (use at least 32 chars: openssl rand -base64 32)"
else
  pass "$VAR — present (length: ${#METRICS_TOKEN:-0})"
fi

# ── SECTION 7: Build version ──────────────────────────────────────────────────

header "BUILD"

VAR="BUILD_VERSION"
if [ -z "${!VAR:-}" ]; then
  info "$VAR — not set (will default to package.json version at build time)"
else
  pass "$VAR — ${!VAR}"
fi

VAR="LOG_LEVEL"
if [ -z "${!VAR:-}" ]; then
  info "$VAR — not set (defaults: info in production, debug in development)"
elif check_pattern "$VAR" "^(trace|debug|info|warn|error|fatal)$"; then
  pass "$VAR — ${!VAR}"
else
  fail "$VAR — invalid value '${!VAR}'. Valid: trace|debug|info|warn|error|fatal"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  ENVIRONMENT VALIDATION SUMMARY${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASS${RESET}  $PASS"
echo -e "  ${YELLOW}WARN${RESET}  $WARN"
echo -e "  ${RED}FAIL${RESET}  $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}  RESULT: FAIL — $FAIL required variable(s) missing or invalid${RESET}"
  echo ""
  exit 1
elif [ "$WARN" -gt 0 ] && [ "$STRICT" = true ]; then
  echo -e "${YELLOW}${BOLD}  RESULT: FAIL (strict mode) — $WARN warning(s)${RESET}"
  echo ""
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}  RESULT: PASS with $WARN warning(s)${RESET}"
  echo ""
  exit 0
else
  echo -e "${GREEN}${BOLD}  RESULT: PASS — all variables validated${RESET}"
  echo ""
  exit 0
fi
