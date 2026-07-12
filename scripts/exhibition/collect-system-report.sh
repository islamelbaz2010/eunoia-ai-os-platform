#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/collect-system-report.sh
# Eunoia AI OS — System Report Generator
#
# Generates docs/exhibition-live/SYSTEM_REPORT.md with:
#   - Git state (SHA, branch, last commit, clean/dirty)
#   - Test results
#   - TypeScript status
#   - Lint status
#   - Build route inventory
#   - Environment variable matrix
#   - Production service health
#   - Migration status
#   - Dependency versions
#   - Warnings and action items
#
# Usage:
#   ./scripts/exhibition/collect-system-report.sh
#   ./scripts/exhibition/collect-system-report.sh --offline  (skip HTTP checks)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_URL="https://eunoia-ai-os-platform.vercel.app"
REPORT_DIR="$ROOT/docs/exhibition-live"
REPORT_FILE="$REPORT_DIR/SYSTEM_REPORT.md"

OFFLINE=false
for arg in "$@"; do
  [[ "$arg" == "--offline" ]] && OFFLINE=true
done

# ── Colours ──────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R="\033[0;31m" G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  R="" G="" Y="" C="" B="" N=""
fi
ok()  { echo -e "  ${G}✓${N} $1"; }
err() { echo -e "  ${R}✗${N} $1"; }
inf() { echo -e "  → $1"; }
hdr() { echo -e "\n${B}${C}── $1 ──${N}"; }

# ── Load env ─────────────────────────────────────────────────────────────────
ENV_FILE="$ROOT/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    line="${line%%#*}"; line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" != *=* ]] && continue
    key="${line%%=*}"; val="${line#*=}"
    val="${val%\"}" ; val="${val#\"}"
    val="${val%\'}" ; val="${val#\'}"
    export "$key=$val" 2>/dev/null || true
  done < "$ENV_FILE"
fi

mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')
echo "Collecting system report..."

# ── Git State ────────────────────────────────────────────────────────────────
hdr "Git"
GIT_SHA=$(cd "$ROOT" && git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_SHA_SHORT=$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(cd "$ROOT" && git branch --show-current 2>/dev/null || echo "unknown")
GIT_LAST_COMMIT=$(cd "$ROOT" && git log -1 --format="%s (%ar)" 2>/dev/null || echo "unknown")
GIT_DIRTY=$(cd "$ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
GIT_AHEAD=$(cd "$ROOT" && git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
ok "Git collected: $GIT_SHA_SHORT on $GIT_BRANCH"

# ── Tests ────────────────────────────────────────────────────────────────────
hdr "Tests"
cd "$ROOT"
TEST_OUTPUT=$(npm test 2>&1 || true)
TEST_PASS=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | tail -1 || echo "?")
TEST_FAIL=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")
TEST_STATUS="$TEST_PASS passed, $TEST_FAIL failed"
ok "Tests: $TEST_STATUS"

# ── TypeScript ───────────────────────────────────────────────────────────────
hdr "TypeScript"
TS_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || echo "0")
if [[ "$TS_ERRORS" -eq 0 ]]; then
  TS_STATUS="✅ 0 errors"
  ok "TypeScript: clean"
else
  TS_STATUS="❌ $TS_ERRORS errors"
  err "TypeScript: $TS_ERRORS errors"
fi

# ── Lint ─────────────────────────────────────────────────────────────────────
hdr "Lint"
LINT_OUTPUT=$(npm run lint 2>&1 || true)
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -c "warning" || echo "0")
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
if [[ "$LINT_ERRORS" -eq 0 ]]; then
  LINT_STATUS="✅ clean ($LINT_WARNINGS warnings)"
  ok "ESLint: clean"
else
  LINT_STATUS="❌ $LINT_ERRORS errors"
  err "ESLint: $LINT_ERRORS errors"
fi

# ── Routes ───────────────────────────────────────────────────────────────────
hdr "Routes"
ROUTE_COUNT=$(find "$ROOT/src/app" -name "page.tsx" -o -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
ok "Routes: $ROUTE_COUNT files"

# ── Environment Variables ─────────────────────────────────────────────────────
hdr "Environment"
env_status() {
  local var="$1" val="${!1:-}"
  if [[ -n "$val" ]]; then echo "✅ set"; else echo "❌ missing"; fi
}
SUPABASE_URL_ST=$(env_status NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_KEY_ST=$(env_status NEXT_PUBLIC_SUPABASE_ANON_KEY)
OPENAI_ST=$(env_status OPENAI_API_KEY)
APP_URL_ST=$(env_status NEXT_PUBLIC_APP_URL)
RESEND_ST=$(env_status RESEND_API_KEY)
FROM_EMAIL_ST=$(env_status FROM_EMAIL)
SENTRY_PUB_ST=$(env_status NEXT_PUBLIC_SENTRY_DSN)
SENTRY_SRV_ST=$(env_status SENTRY_DSN)
METRICS_ST=$(env_status METRICS_TOKEN)
SRK_ST=$(env_status SUPABASE_SERVICE_ROLE_KEY)
STRIPE_SECRET_ST=$(env_status STRIPE_SECRET_KEY)
STRIPE_PUB_ST=$(env_status NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
ok "Environment matrix collected"

# ── Production Health ─────────────────────────────────────────────────────────
hdr "Production Health"
LIVE_STATUS="⏭ skipped (--offline)"
HEALTH_STATUS="⏭ skipped (--offline)"
LANDING_STATUS="⏭ skipped (--offline)"
LOGIN_STATUS="⏭ skipped (--offline)"
DASHBOARD_STATUS="⏭ skipped (--offline)"

if [[ "$OFFLINE" == "false" ]]; then
  http_code() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$1" 2>/dev/null || echo "000"; }
  http_body() { curl -s --max-time 20 "$1" 2>/dev/null || echo ""; }

  LIVE_BODY=$(http_body "$PROD_URL/api/live")
  LIVE_STATUS=$(echo "$LIVE_BODY" | grep -q '"status":"ok"' && echo '✅ {"status":"ok"}' || echo "❌ $LIVE_BODY")

  HEALTH_BODY=$(http_body "$PROD_URL/api/health")
  if echo "$HEALTH_BODY" | grep -q '"status":"ready"'; then
    HEALTH_STATUS="✅ ready"
  elif echo "$HEALTH_BODY" | grep -q '"status":"degraded"'; then
    HEALTH_STATUS="⚠️ degraded"
  else
    HEALTH_STATUS="❌ unreachable"
  fi

  LANDING_CODE=$(http_code "$PROD_URL/")
  LANDING_STATUS="$([[ "$LANDING_CODE" == "200" ]] && echo "✅ 200" || echo "❌ $LANDING_CODE")"

  LOGIN_CODE=$(http_code "$PROD_URL/login")
  LOGIN_STATUS="$([[ "$LOGIN_CODE" == "200" ]] && echo "✅ 200" || echo "❌ $LOGIN_CODE")"

  DASH_CODE=$(http_code "$PROD_URL/dashboard")
  DASHBOARD_STATUS="$([[ "$DASH_CODE" == "307" ]] && echo "✅ 307 (auth redirect)" || echo "❌ $DASH_CODE")"

  ok "Production health collected"
fi

# ── Dependency Versions ───────────────────────────────────────────────────────
hdr "Dependencies"
NEXT_VER=$(node -e "console.log(require('./package.json').dependencies?.next || 'unknown')" 2>/dev/null || echo "unknown")
REACT_VER=$(node -e "console.log(require('./package.json').dependencies?.react || 'unknown')" 2>/dev/null || echo "unknown")
ZOD_VER=$(node -e "console.log(require('./package.json').dependencies?.zod || 'unknown')" 2>/dev/null || echo "unknown")
NODE_VER=$(node --version 2>/dev/null || echo "unknown")
ok "Dependency versions collected"

# ── Migration Status ──────────────────────────────────────────────────────────
hdr "Migrations"
MIGRATION_FILES=$(find "$ROOT/supabase/migrations" -name "*.sql" 2>/dev/null | sort | xargs -I{} basename {} | tr '\n' ', ' | sed 's/,$//' || echo "none found")
ok "Migrations: $MIGRATION_FILES"

# ── Write Report ──────────────────────────────────────────────────────────────
hdr "Writing Report"

cat > "$REPORT_FILE" <<REPORT
# System Report — Eunoia AI OS
**Generated**: $TIMESTAMP
**Platform**: Darwin $(uname -r) — Node $NODE_VER

---

## Git State

| Field | Value |
|-------|-------|
| Branch | \`$GIT_BRANCH\` |
| SHA | \`$GIT_SHA\` |
| Last Commit | $GIT_LAST_COMMIT |
| Dirty Files | $GIT_DIRTY untracked/modified |
| Commits Ahead of Origin | $GIT_AHEAD |

---

## Code Quality

| Check | Result |
|-------|--------|
| Tests | $TEST_STATUS |
| TypeScript | $TS_STATUS |
| ESLint | $LINT_STATUS |
| Route count | $ROUTE_COUNT pages/routes |

---

## Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| NEXT_PUBLIC_SUPABASE_URL | $SUPABASE_URL_ST | Required |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | $SUPABASE_KEY_ST | Required |
| OPENAI_API_KEY | $OPENAI_ST | Required — AI features |
| NEXT_PUBLIC_APP_URL | $APP_URL_ST | Required — links in emails |
| RESEND_API_KEY | $RESEND_ST | Invite emails |
| FROM_EMAIL | $FROM_EMAIL_ST | Invite emails |
| NEXT_PUBLIC_SENTRY_DSN | $SENTRY_PUB_ST | Client error tracking |
| SENTRY_DSN | $SENTRY_SRV_ST | Server error tracking |
| METRICS_TOKEN | $METRICS_ST | Prometheus auth |
| SUPABASE_SERVICE_ROLE_KEY | $SRK_ST | Local scripts only — NEVER Vercel |
| STRIPE_SECRET_KEY | $STRIPE_SECRET_ST | Billing (optional for demo) |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | $STRIPE_PUB_ST | Billing (optional for demo) |

---

## Production Health

| Endpoint | Status |
|----------|--------|
| /api/live | $LIVE_STATUS |
| /api/health | $HEALTH_STATUS |
| / (landing) | $LANDING_STATUS |
| /login | $LOGIN_STATUS |
| /dashboard (auth guard) | $DASHBOARD_STATUS |

---

## Dependency Versions

| Package | Version |
|---------|---------|
| next | $NEXT_VER |
| react | $REACT_VER |
| zod | $ZOD_VER |
| Node.js | $NODE_VER |

---

## Migrations

Files in \`supabase/migrations/\`:
$MIGRATION_FILES

---

## Action Items

$(
  ITEMS=()
  [[ "$RESEND_ST" == *"missing"* ]] && ITEMS+=("Set RESEND_API_KEY in Vercel — invite emails not sent")
  [[ "$SENTRY_PUB_ST" == *"missing"* ]] && ITEMS+=("Set NEXT_PUBLIC_SENTRY_DSN in Vercel — no client error tracking")
  [[ "$SENTRY_SRV_ST" == *"missing"* ]] && ITEMS+=("Set SENTRY_DSN in Vercel — no server error tracking")
  [[ "$METRICS_ST" == *"missing"* ]] && ITEMS+=("Set METRICS_TOKEN in Vercel — /api/metrics is open")
  [[ "$TS_ERRORS" -gt 0 ]] && ITEMS+=("Fix $TS_ERRORS TypeScript errors before shipping")
  [[ "$LINT_ERRORS" -gt 0 ]] && ITEMS+=("Fix $LINT_ERRORS ESLint errors")
  [[ "${TEST_FAIL:-0}" -gt 0 ]] && ITEMS+=("Fix $TEST_FAIL failing tests")
  if [[ ${#ITEMS[@]} -eq 0 ]]; then
    echo "None."
  else
    printf -- "- %s\n" "${ITEMS[@]}"
  fi
)
REPORT

echo ""
ok "System report written: $REPORT_FILE"
echo ""
echo -e "  ${B}View:${N} cat docs/exhibition-live/SYSTEM_REPORT.md"
echo ""
