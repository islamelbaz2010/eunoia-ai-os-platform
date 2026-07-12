#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/prepare-demo.sh
# Eunoia AI OS — Full exhibition preparation pipeline
#
# Runs the complete preparation sequence:
#   1. Code quality gates (tests, TypeScript, lint)
#   2. System verification (env, services, production)
#   3. Demo account seeding (KB docs + CRM + usage data)
#   4. Post-seed smoke tests
#   5. Demo report generation
#
# Usage:
#   ./scripts/exhibition/prepare-demo.sh
#   ./scripts/exhibition/prepare-demo.sh --skip-seed   (if already seeded)
#   ./scripts/exhibition/prepare-demo.sh --skip-tests  (faster iteration)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_URL="https://eunoia-ai-os-platform.vercel.app"
REPORT_DIR="$ROOT/docs/exhibition-live"
REPORT_FILE="$REPORT_DIR/PREPARE_REPORT.md"

SKIP_SEED=false
SKIP_TESTS=false
for arg in "$@"; do
  case $arg in
    --skip-seed)  SKIP_SEED=true ;;
    --skip-tests) SKIP_TESTS=true ;;
  esac
done

# ── Colours ────────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R="\033[0;31m" G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  R="" G="" Y="" C="" B="" N=""
fi

ok()  { echo -e "  ${G}✓${N} $1"; }
err() { echo -e "  ${R}✗${N} $1"; }
inf() { echo -e "  → $1"; }
hdr() { echo -e "\n${B}${C}══ $1 ══${N}"; }

START_TIME=$(date +%s)
ERRORS=()
WARNINGS=()

# ── Load env ──────────────────────────────────────────────────────────────────
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

echo ""
echo -e "${B}${C}╔══════════════════════════════════════════════════╗${N}"
echo -e "${B}${C}║  Eunoia AI OS — Exhibition Preparation Pipeline  ║${N}"
echo -e "${B}${C}╚══════════════════════════════════════════════════╝${N}"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

mkdir -p "$REPORT_DIR"

# ── Phase 1: Code Quality ─────────────────────────────────────────────────────
hdr "Phase 1: Code Quality Gates"

if [[ "$SKIP_TESTS" == "true" ]]; then
  inf "Skipping tests (--skip-tests)"
else
  cd "$ROOT"
  inf "Running TypeScript check..."
  if npx tsc --noEmit &>/dev/null; then
    ok "TypeScript: 0 errors"
  else
    err "TypeScript errors found"
    ERRORS+=("TypeScript compilation errors")
  fi

  inf "Running lint..."
  if npm run lint &>/dev/null; then
    ok "ESLint: clean"
  else
    err "ESLint errors found"
    ERRORS+=("ESLint errors")
  fi

  inf "Running tests..."
  TEST_OUTPUT=$(npm test 2>&1)
  if echo "$TEST_OUTPUT" | grep -q "Tests.*passed"; then
    PASS_LINE=$(echo "$TEST_OUTPUT" | grep "Tests " | tail -1)
    ok "Tests: $PASS_LINE"
  else
    err "Tests failed"
    ERRORS+=("Test failures")
  fi
fi

# ── Phase 2: System Verification ─────────────────────────────────────────────
hdr "Phase 2: System Verification"

inf "Running verify.sh (fast mode)..."
if "$SCRIPT_DIR/verify.sh" --fast 2>&1 | tail -5; then
  VERIFY_EXIT=$?
else
  VERIFY_EXIT=$?
fi

if [[ $VERIFY_EXIT -eq 0 ]]; then
  ok "Verification passed"
else
  err "Verification has failures — check output above"
  ERRORS+=("Verification failures")
fi

# ── Phase 3: Demo Seeding ─────────────────────────────────────────────────────
hdr "Phase 3: Demo Account Seeding"

if [[ "$SKIP_SEED" == "true" ]]; then
  inf "Skipping seed (--skip-seed)"
else
  if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    inf "Seeding demo account..."
    if "$SCRIPT_DIR/seed-demo.sh" 2>&1; then
      ok "Demo account seeded successfully"
    else
      err "Demo seeding failed"
      ERRORS+=("Demo seeding failed")
    fi
  else
    err "SUPABASE_SERVICE_ROLE_KEY not set — demo seeding skipped"
    WARNINGS+=("Demo account not seeded (missing SUPABASE_SERVICE_ROLE_KEY)")
  fi
fi

# ── Phase 4: Post-Seed Smoke Tests ────────────────────────────────────────────
hdr "Phase 4: Production Smoke Tests"

http_code() { curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1" 2>/dev/null || echo "000"; }
http_body() { curl -s --max-time 10 "$1" 2>/dev/null || echo ""; }

SMOKE_PASS=0; SMOKE_FAIL=0

check() {
  local desc="$1" code_pattern actual
  code_pattern="$2"
  actual=$(http_code "$PROD_URL$3")
  # code_pattern supports pipe-separated values: "200|201" or single code "307"
  if echo "$actual" | grep -qE "^(${code_pattern//\\/})$"; then
    ok "SMOKE: $desc → $actual"; ((SMOKE_PASS++)) || true
  else
    err "SMOKE: $desc → $actual (expected $code_pattern)"; ((SMOKE_FAIL++)) || true
  fi
}

LIVE=$(http_body "$PROD_URL/api/live")
if echo "$LIVE" | grep -q '"status":"ok"'; then
  ok "SMOKE: /api/live → {\"status\":\"ok\"}"; ((SMOKE_PASS++))
else
  err "SMOKE: /api/live failed"; ((SMOKE_FAIL++))
fi

HEALTH=$(http_body "$PROD_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"ready"\|"status":"degraded"'; then
  ok "SMOKE: /api/health responding"; ((SMOKE_PASS++))
else
  err "SMOKE: /api/health failed"; ((SMOKE_FAIL++))
fi

check "Landing page"   "200" "/"
check "Login page"     "200" "/login"
check "Signup page"    "200" "/signup"
check "Dashboard auth" "307" "/dashboard"
check "Admin auth"     "401\|403\|307" "/api/admin/system"

inf "Smoke: $SMOKE_PASS passed, $SMOKE_FAIL failed"
[[ $SMOKE_FAIL -gt 0 ]] && ERRORS+=("$SMOKE_FAIL smoke tests failed")

# ── Phase 5: Generate Report ──────────────────────────────────────────────────
hdr "Phase 5: Generating Report"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
GIT_SHA=$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(cd "$ROOT" && git branch --show-current 2>/dev/null || echo "unknown")

cat > "$REPORT_FILE" <<REPORT
# Exhibition Preparation Report
**Generated**: $(date '+%Y-%m-%d %H:%M:%S %Z')
**Duration**: ${DURATION}s
**Git SHA**: $GIT_SHA
**Branch**: $GIT_BRANCH
**Production**: $PROD_URL

## Phases Completed

| Phase | Status |
|-------|--------|
| Code Quality | $([ "$SKIP_TESTS" == "true" ] && echo "Skipped" || echo "${#ERRORS[@]} errors") |
| Verification | $([ $VERIFY_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Demo Seeding | $([ "$SKIP_SEED" == "true" ] && echo "Skipped" || echo "Completed") |
| Smoke Tests  | $SMOKE_PASS passed, $SMOKE_FAIL failed |

## Errors

$([ ${#ERRORS[@]} -eq 0 ] && echo "None." || printf -- "- %s\n" "${ERRORS[@]}")

## Warnings

$([ ${#WARNINGS[@]} -eq 0 ] && echo "None." || printf -- "- %s\n" "${WARNINGS[@]}")

## Demo Account

- **URL**: https://eunoia-ai-os-platform.vercel.app/login
- **Email**: demo@eunoiaos.com
- **Password**: EunoiaDemo2026!
- **Organization**: Grand Nile Tower Hotel

## What Was Seeded

- 5 Knowledge Base documents (VIP Protocol, F&B Menu, Check-in/out, Emergency Procedures, Staff Grooming)
- 6 CRM contacts at different pipeline stages
- 14 days of usage events (for dashboard chart)
- Audit log entries

## Pre-Exhibition Checklist

- [ ] Test login with demo credentials
- [ ] Test AI chat with: "What is the VIP late checkout policy?"
- [ ] Test AI chat with: "Does the sea bass contain dairy?"
- [ ] Test CRM pipeline board
- [ ] Charge exhibition laptop to 100%
- [ ] Prepare mobile hotspot as backup WiFi
REPORT

ok "Report saved: $REPORT_FILE"

# ── Final Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${C}══════════════════════════════════════════════════${N}"
echo -e "${B}  PREPARATION COMPLETE${N}"
echo -e "${B}${C}══════════════════════════════════════════════════${N}"
echo "  Duration: ${DURATION}s"
echo "  Errors:   ${#ERRORS[@]}"
echo "  Warnings: ${#WARNINGS[@]}"
echo ""

if [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo -e "  ${G}${B}✓ READY FOR EXHIBITION${N}"
  echo ""
  echo -e "  ${B}Demo login:${N}"
  echo -e "    URL:      $PROD_URL/login"
  echo -e "    Email:    demo@eunoiaos.com"
  echo -e "    Password: EunoiaDemo2026!"
  echo ""
  exit 0
else
  echo -e "  ${R}${B}✗ ${#ERRORS[@]} issue(s) to resolve:${N}"
  for e in "${ERRORS[@]}"; do echo -e "    ${R}→${N} $e"; done
  echo ""
  exit 1
fi
