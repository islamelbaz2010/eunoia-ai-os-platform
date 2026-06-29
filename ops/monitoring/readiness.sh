#!/usr/bin/env bash
# ops/monitoring/readiness.sh — Production readiness scanner
#
# Usage:
#   ./ops/monitoring/readiness.sh [--url https://yourdomain.com] [--json]
#
# Scores 9 domains:
#   Architecture, Infrastructure, Security, Monitoring, Backups,
#   Recovery, Deployment, Secrets, Observability
#
# Output:
#   PASS  — criterion met
#   WARN  — criterion partially met or unverifiable
#   FAIL  — criterion not met

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"
JSON_OUTPUT=false
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --url)  APP_URL="${2%/}"; shift 2 ;;
    --json) JSON_OUTPUT=true; shift ;;
    *) shift ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

TOTAL=0
PASS=0
WARN=0
FAIL=0

check_pass() { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); [ "$JSON_OUTPUT" = false ] && echo -e "  ${GREEN}PASS${RESET}  $1"; }
check_warn() { TOTAL=$((TOTAL+1)); WARN=$((WARN+1)); [ "$JSON_OUTPUT" = false ] && echo -e "  ${YELLOW}WARN${RESET}  $1"; }
check_fail() { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); [ "$JSON_OUTPUT" = false ] && echo -e "  ${RED}FAIL${RESET}  $1"; }
section()    { [ "$JSON_OUTPUT" = false ] && echo -e "\n${BOLD}${BLUE}── $1 ──${RESET}"; }
has_file()   { [ -f "$ROOT_DIR/$1" ]; }
has_dir()    { [ -d "$ROOT_DIR/$1" ]; }
has_var()    { [ -n "${!1:-}" ]; }
has_cmd()    { command -v "$1" &>/dev/null; }

[ "$JSON_OUTPUT" = false ] && echo -e "\n${BOLD}${BLUE}EUNOIA AI OS — PRODUCTION READINESS SCAN${RESET}"
[ "$JSON_OUTPUT" = false ] && echo -e "${BLUE}$(date)${RESET}\n"

# ── 1. Architecture ───────────────────────────────────────────────────────────

section "1. ARCHITECTURE"

has_file "src/lib/supabase/proxy.ts"             && check_pass "proxy.ts (auth middleware) exists" \
                                                 || check_fail "proxy.ts missing"
has_file "src/lib/auth/dal.ts"                   && check_pass "DAL (data access layer) exists" \
                                                 || check_fail "DAL missing"
grep -q "server-only" "$ROOT_DIR/src/lib/auth/dal.ts" 2>/dev/null \
                                                 && check_pass "server-only import in dal.ts" \
                                                 || check_warn "server-only import missing from dal.ts"
has_dir  "supabase/migrations"                   && check_pass "Migration directory exists" \
                                                 || check_fail "Migration directory missing"
has_file "supabase/migrations/0001_init.sql"     && check_pass "Base migration (0001) present" \
                                                 || check_warn "Base migration missing"

# ── 2. Infrastructure ─────────────────────────────────────────────────────────

section "2. INFRASTRUCTURE"

has_file "ecosystem.config.js"                   && check_pass "PM2 ecosystem.config.js present" \
                                                 || check_fail "PM2 config missing"
has_file "Dockerfile"                            && check_pass "Dockerfile present" \
                                                 || check_warn "Dockerfile not found"
has_file "ops/deploy/deploy.sh"                  && check_pass "deploy.sh present" \
                                                 || check_fail "deploy.sh missing"
has_file "ops/deploy/rollback.sh"                && check_pass "rollback.sh present" \
                                                 || check_fail "rollback.sh missing"
has_file ".github/workflows/ci.yml"              && check_pass "GitHub Actions CI present" \
                                                 || check_warn "CI pipeline not found"
has_file "ops/backup/backup.sh"                  && check_pass "backup.sh present" \
                                                 || check_warn "backup.sh missing"

# ── 3. Security ───────────────────────────────────────────────────────────────

section "3. SECURITY"

grep -q "Content-Security-Policy" "$ROOT_DIR/next.config.ts" 2>/dev/null \
                                                 && check_pass "CSP header configured in next.config.ts" \
                                                 || check_fail "CSP header not found"
grep -q "Strict-Transport-Security" "$ROOT_DIR/next.config.ts" 2>/dev/null \
                                                 && check_pass "HSTS configured" \
                                                 || check_fail "HSTS not configured"
grep -q "X-Frame-Options" "$ROOT_DIR/next.config.ts" 2>/dev/null \
                                                 && check_pass "X-Frame-Options set" \
                                                 || check_warn "X-Frame-Options missing"
! grep -rq "SUPABASE_SERVICE_ROLE_KEY" "$ROOT_DIR/src/" 2>/dev/null \
                                                 && check_pass "SERVICE_ROLE_KEY not referenced in src/" \
                                                 || check_fail "SERVICE_ROLE_KEY found in src/ — security risk"
grep -q "verifySession" "$ROOT_DIR/src/lib/auth/dal.ts" 2>/dev/null \
                                                 && check_pass "verifySession() defined in dal.ts" \
                                                 || check_fail "verifySession() not found"
# Check RLS mentioned in migrations
grep -rq "ROW LEVEL SECURITY\|ENABLE ROW" "$ROOT_DIR/supabase/migrations/" 2>/dev/null \
                                                 && check_pass "Row-Level Security enabled in migrations" \
                                                 || check_warn "RLS not found in migrations"

# ── 4. Monitoring ─────────────────────────────────────────────────────────────

section "4. MONITORING"

has_file "src/app/api/live/route.ts"             && check_pass "/api/live endpoint exists" \
                                                 || check_fail "/api/live missing"
has_file "src/app/api/health/route.ts"           && check_pass "/api/health endpoint exists" \
                                                 || check_fail "/api/health missing"
has_file "src/app/api/metrics/route.ts"          && check_pass "/api/metrics (Prometheus) exists" \
                                                 || check_warn "/api/metrics missing"
has_file "src/app/api/admin/system/route.ts"     && check_pass "/api/admin/system exists" \
                                                 || check_warn "/api/admin/system missing"
has_file "sentry.client.config.ts"               && check_pass "Sentry client config present" \
                                                 || check_warn "Sentry not configured"
has_var "NEXT_PUBLIC_SENTRY_DSN"                 && check_pass "SENTRY_DSN set" \
                                                 || check_warn "SENTRY_DSN not set (error tracking disabled)"
has_var "METRICS_TOKEN"                          && check_pass "METRICS_TOKEN set" \
                                                 || check_warn "METRICS_TOKEN not set (/api/metrics is open)"

# Live check
LIVE_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "$APP_URL/api/live" 2>/dev/null || echo "000")
[ "$LIVE_HTTP" = "200" ]                         && check_pass "/api/live → HTTP 200" \
                                                 || check_warn "/api/live → HTTP $LIVE_HTTP (app may not be running)"

# ── 5. Backups ────────────────────────────────────────────────────────────────

section "5. BACKUPS"

has_dir ".backups"                               && check_pass "Backup directory exists (.backups/)" \
                                                 || check_warn "No backups found (.backups/ missing)"
has_file "ops/backup/backup.sh"                  && check_pass "Backup script present" \
                                                 || check_warn "Backup script missing"

# Check if any backup has been taken
BACKUP_COUNT=$(find "$ROOT_DIR/.backups" -name "MANIFEST.json" 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 0 ]; then
  check_pass "At least $BACKUP_COUNT backup(s) found"
else
  check_warn "No backup records found — run ops/backup/backup.sh"
fi

# ── 6. Recovery ───────────────────────────────────────────────────────────────

section "6. RECOVERY"

has_file "ops/deploy/rollback.sh"                && check_pass "Rollback script present" \
                                                 || check_fail "Rollback script missing"
has_file "ops/restore/restore.sh"                && check_pass "Restore script present" \
                                                 || check_warn "Restore script missing"
has_dir "docs/runbooks"                          && check_pass "Runbooks directory present" \
                                                 || check_warn "No runbooks found"

RUNBOOK_COUNT=$(find "$ROOT_DIR/docs/runbooks" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
[ "$RUNBOOK_COUNT" -ge 5 ]                       && check_pass "$RUNBOOK_COUNT runbooks found" \
                                                 || check_warn "Only $RUNBOOK_COUNT runbooks (recommend 10+)"

# ── 7. Deployment ─────────────────────────────────────────────────────────────

section "7. DEPLOYMENT"

has_file "ops/deploy/deploy.sh"                  && check_pass "deploy.sh present" \
                                                 || check_fail "deploy.sh missing"
has_file "ops/deploy/deploy.ps1"                 && check_pass "deploy.ps1 (Windows) present" \
                                                 || check_warn "deploy.ps1 missing (Windows deploy not supported)"
has_file ".github/workflows/ci.yml"              && check_pass "CI/CD pipeline present" \
                                                 || check_warn "No CI/CD pipeline"
has_dir ".deploy-logs"                           && check_pass "Deploy log directory exists" \
                                                 || check_warn "No deploy logs found"

DEPLOY_COUNT=$(find "$ROOT_DIR/.deploy-logs" -name "history.jsonl" 2>/dev/null | wc -l | tr -d ' ')
[ "$DEPLOY_COUNT" -gt 0 ]                        && check_pass "Deploy history present" \
                                                 || check_warn "No deploy history"

# ── 8. Secrets ────────────────────────────────────────────────────────────────

section "8. SECRETS"

has_var "NEXT_PUBLIC_SUPABASE_URL"               && check_pass "SUPABASE_URL set" \
                                                 || check_fail "SUPABASE_URL missing"
has_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"          && check_pass "SUPABASE_ANON_KEY set" \
                                                 || check_fail "SUPABASE_ANON_KEY missing"
has_var "OPENAI_API_KEY"                         && check_pass "OPENAI_API_KEY set" \
                                                 || check_fail "OPENAI_API_KEY missing"
has_var "NEXT_PUBLIC_APP_URL"                    && check_pass "APP_URL set" \
                                                 || check_fail "APP_URL missing"
! has_var "SUPABASE_SERVICE_ROLE_KEY"            && check_pass "SERVICE_ROLE_KEY not in runtime env" \
                                                 || check_warn "SERVICE_ROLE_KEY present in env — ensure this is intentional (scripts only)"
has_file "ops/scripts/rotate-keys.sh"            && check_pass "Key rotation docs present" \
                                                 || check_warn "Key rotation docs missing"

# ── 9. Observability ──────────────────────────────────────────────────────────

section "9. OBSERVABILITY"

has_file "src/lib/logger.ts"                     && check_pass "Structured logger (src/lib/logger.ts) exists" \
                                                 || check_fail "Logger missing"
grep -q "JSON.stringify" "$ROOT_DIR/src/lib/logger.ts" 2>/dev/null \
                                                 && check_pass "JSON output in logger" \
                                                 || check_warn "Logger may not output JSON"
has_file "docs/operations/logging.md"            && check_pass "Logging documentation present" \
                                                 || check_warn "Logging docs missing"
has_file "docs/operations/prometheus.md"         && check_pass "Prometheus docs present" \
                                                 || check_warn "Prometheus docs missing"
has_file "docs/operations/grafana/eunoia-system-health.json" \
                                                 && check_pass "Grafana dashboard present" \
                                                 || check_warn "Grafana dashboard missing"

# ── Score ──────────────────────────────────────────────────────────────────────

SCORE=$(( (PASS * 100) / TOTAL ))

if [ "$JSON_OUTPUT" = false ]; then
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  PRODUCTION READINESS SCORE${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════${RESET}"
  printf "  %-10s %s\n" "PASS"  "$PASS / $TOTAL"
  printf "  %-10s %s\n" "WARN"  "$WARN"
  printf "  %-10s %s\n" "FAIL"  "$FAIL"
  printf "  %-10s %s%%\n" "SCORE" "$SCORE"
  echo ""

  if   [ "$FAIL" -eq 0 ] && [ "$WARN" -le 2 ]; then
    echo -e "${GREEN}${BOLD}  RESULT: PRODUCTION READY${RESET}"
  elif [ "$FAIL" -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}  RESULT: MOSTLY READY — resolve warnings before launch${RESET}"
  elif [ "$FAIL" -le 3 ]; then
    echo -e "${YELLOW}${BOLD}  RESULT: NOT READY — fix $FAIL failures${RESET}"
  else
    echo -e "${RED}${BOLD}  RESULT: CRITICAL — $FAIL required items missing${RESET}"
  fi
  echo ""
else
  cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "app_url": "$APP_URL",
  "score_percent": $SCORE,
  "pass": $PASS,
  "warn": $WARN,
  "fail": $FAIL,
  "total": $TOTAL,
  "result": "$([ "$FAIL" -eq 0 ] && [ "$WARN" -le 2 ] && echo "ready" || [ "$FAIL" -eq 0 ] && echo "mostly_ready" || echo "not_ready")"
}
EOF
fi

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
