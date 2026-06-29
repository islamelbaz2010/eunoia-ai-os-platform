#!/usr/bin/env bash
# ops/monitoring/healthcheck.sh — Health verification against all endpoints
#
# Usage:
#   ./ops/monitoring/healthcheck.sh [--url https://yourdomain.com] [--report] [--json]
#
# Checks:
#   /api/live         — liveness (process up)
#   /api/health       — readiness (all critical providers)
#   /api/admin/system — full diagnostics (requires session token)
#   /api/metrics      — Prometheus scrape (requires METRICS_TOKEN)
#
# Outputs:
#   Human-readable report (default)
#   JSON report (--json)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Config ────────────────────────────────────────────────────────────────────

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"
METRICS_TOKEN="${METRICS_TOKEN:-}"
TIMEOUT=15
JSON_OUTPUT=false
SAVE_REPORT=false
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --url)    APP_URL="${2%/}"; shift 2 ;;
    --json)   JSON_OUTPUT=true; shift ;;
    --report) SAVE_REPORT=true; shift ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--url <url>] [--json] [--report] [--timeout <sec>]"
      exit 0 ;;
    *) shift ;;
  esac
done

log()     { [ "$JSON_OUTPUT" = false ] && echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
success() { [ "$JSON_OUTPUT" = false ] && echo -e "${GREEN}  ✓ $*${RESET}"; }
warn()    { [ "$JSON_OUTPUT" = false ] && echo -e "${YELLOW}  ⚠ $*${RESET}"; }
error()   { [ "$JSON_OUTPUT" = false ] && echo -e "${RED}  ✗ $*${RESET}"; }
header()  { [ "$JSON_OUTPUT" = false ] && echo -e "\n${BOLD}${BLUE}── $1 ──${RESET}"; }

# ── Checks ────────────────────────────────────────────────────────────────────

LIVE_STATUS="unknown"
LIVE_MS=0
HEALTH_STATUS="unknown"
HEALTH_MS=0
HEALTH_BODY=""
METRICS_STATUS="unknown"
METRICS_MS=0

# /api/live
header "/api/live — Liveness"
START="$(date +%s%3N)"
HTTP_CODE=$(curl -sf --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$APP_URL/api/live" 2>/dev/null || echo "000")
END="$(date +%s%3N)"
LIVE_MS=$((END - START))

if [ "$HTTP_CODE" = "200" ]; then
  LIVE_STATUS="ok"
  success "HTTP $HTTP_CODE in ${LIVE_MS}ms"
else
  LIVE_STATUS="error"
  error "HTTP $HTTP_CODE in ${LIVE_MS}ms"
fi

# /api/health
header "/api/health — Readiness"
START="$(date +%s%3N)"
HEALTH_BODY=$(curl -sf --max-time "$TIMEOUT" "$APP_URL/api/health" 2>/dev/null || echo '{"healthy":false,"providers":{}}')
HTTP_CODE=$(curl -sf --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$APP_URL/api/health" 2>/dev/null || echo "000")
END="$(date +%s%3N)"
HEALTH_MS=$((END - START))

HEALTH_OVERALL=$(echo "$HEALTH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('healthy',False)).lower())" 2>/dev/null || echo "false")

if [ "$HTTP_CODE" = "200" ] && [ "$HEALTH_OVERALL" = "true" ]; then
  HEALTH_STATUS="ok"
  success "HTTP $HTTP_CODE in ${HEALTH_MS}ms — healthy=true"
elif [ "$HTTP_CODE" = "200" ]; then
  HEALTH_STATUS="degraded"
  warn "HTTP $HTTP_CODE in ${HEALTH_MS}ms — healthy=false"
else
  HEALTH_STATUS="error"
  error "HTTP $HTTP_CODE in ${HEALTH_MS}ms"
fi

# Provider breakdown
if [ "$JSON_OUTPUT" = false ] && [ -n "$HEALTH_BODY" ]; then
  PROVIDERS=$(echo "$HEALTH_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for name, p in d.get('providers', {}).items():
    status = p.get('status', '?')
    latency = p.get('latency_ms', '?')
    critical = p.get('critical', False)
    tag = '[critical]' if critical else '[optional]'
    print(f'  {tag:12} {name:20} {status:15} {latency}ms')
" 2>/dev/null || echo "  (could not parse providers)")
  echo "$PROVIDERS"
fi

# /api/metrics
header "/api/metrics — Prometheus"
START="$(date +%s%3N)"
METRICS_ARGS=()
if [ -n "$METRICS_TOKEN" ]; then
  METRICS_ARGS+=(-H "Authorization: Bearer $METRICS_TOKEN")
fi
HTTP_CODE=$(curl -sf --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "${METRICS_ARGS[@]}" "$APP_URL/api/metrics" 2>/dev/null || echo "000")
END="$(date +%s%3N)"
METRICS_MS=$((END - START))

case "$HTTP_CODE" in
  200) METRICS_STATUS="ok";           success "HTTP $HTTP_CODE in ${METRICS_MS}ms" ;;
  401) METRICS_STATUS="auth_required"; warn "HTTP 401 — set METRICS_TOKEN env var" ;;
  000) METRICS_STATUS="unreachable";   error "Connection failed in ${METRICS_MS}ms" ;;
  *)   METRICS_STATUS="error";         error "HTTP $HTTP_CODE in ${METRICS_MS}ms" ;;
esac

# /api/admin/system (informational only — requires authenticated session)
header "/api/admin/system — Diagnostics"
ADMIN_HTTP=$(curl -sf --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$APP_URL/api/admin/system" 2>/dev/null || echo "000")
if [ "$ADMIN_HTTP" = "401" ]; then
  warn "HTTP 401 (expected — requires authenticated session)"
  warn "To test: authenticate in browser and copy session cookie"
elif [ "$ADMIN_HTTP" = "200" ]; then
  success "HTTP 200 (unexpectedly accessible without auth — check proxy.ts)"
elif [ "$ADMIN_HTTP" = "000" ]; then
  error "Connection failed"
fi

# ── Report ────────────────────────────────────────────────────────────────────

OVERALL="ok"
[ "$LIVE_STATUS"    != "ok" ] && OVERALL="fail"
[ "$HEALTH_STATUS"  = "error" ] && OVERALL="fail"
[ "$HEALTH_STATUS"  = "degraded" ] && [ "$OVERALL" != "fail" ] && OVERALL="warn"

header "HEALTH REPORT"

REPORT=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "app_url": "$APP_URL",
  "overall": "$OVERALL",
  "endpoints": {
    "live":    { "status": "$LIVE_STATUS",    "latency_ms": $LIVE_MS },
    "health":  { "status": "$HEALTH_STATUS",  "latency_ms": $HEALTH_MS },
    "metrics": { "status": "$METRICS_STATUS", "latency_ms": $METRICS_MS }
  },
  "providers": $(echo "$HEALTH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('providers',{})))" 2>/dev/null || echo '{}')
}
EOF
)

if [ "$JSON_OUTPUT" = true ]; then
  echo "$REPORT"
else
  case "$OVERALL" in
    ok)   echo -e "${GREEN}${BOLD}  OVERALL: HEALTHY${RESET}" ;;
    warn) echo -e "${YELLOW}${BOLD}  OVERALL: DEGRADED (non-critical providers)${RESET}" ;;
    fail) echo -e "${RED}${BOLD}  OVERALL: UNHEALTHY${RESET}" ;;
  esac
fi

if [ "$SAVE_REPORT" = true ]; then
  REPORT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.deploy-logs" && pwd)"
  mkdir -p "$REPORT_DIR"
  REPORT_FILE="$REPORT_DIR/healthcheck-$TIMESTAMP.json"
  echo "$REPORT" > "$REPORT_FILE"
  [ "$JSON_OUTPUT" = false ] && log "Report saved: $REPORT_FILE"
fi

# Exit with non-zero if unhealthy
[ "$OVERALL" = "fail" ] && exit 1 || exit 0
