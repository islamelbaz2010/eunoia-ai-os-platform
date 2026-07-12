#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/launch.sh
# Eunoia AI OS — Full Exhibition Launch Pipeline
#
# Executes the complete launch sequence:
#   1. Bootstrap (env vars → Vercel)
#   2. System verification
#   3. Demo account preparation
#   4. Smoke tests
#   5. Health checks
#   6. Launch report
#   7. Open production URL
#
# Usage:
#   ./scripts/exhibition/launch.sh
#   ./scripts/exhibition/launch.sh --dry-run        (print what would happen)
#   ./scripts/exhibition/launch.sh --skip-bootstrap (skip env var sync)
#   ./scripts/exhibition/launch.sh --skip-seed      (skip demo seeding)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_URL="https://eunoia-ai-os-platform.vercel.app"
REPORT_DIR="$ROOT/docs/exhibition-live"
LAUNCH_REPORT="$REPORT_DIR/LAUNCH_REPORT.md"

DRY_RUN=false
SKIP_BOOTSTRAP=false
SKIP_SEED=false
for arg in "$@"; do
  case $arg in
    --dry-run)        DRY_RUN=true ;;
    --skip-bootstrap) SKIP_BOOTSTRAP=true ;;
    --skip-seed)      SKIP_SEED=true ;;
  esac
done

# ── Colours ─────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R="\033[0;31m" G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  R="" G="" Y="" C="" B="" N=""
fi

ok()   { echo -e "  ${G}✓${N} $1"; }
err()  { echo -e "  ${R}✗${N} $1"; }
warn() { echo -e "  ${Y}⚠${N} $1"; }
inf()  { echo -e "  → $1"; }
hdr()  { echo -e "\n${B}${C}══ $1 ══${N}"; }

LAUNCH_START=$(date +%s)
ERRORS=()
WARNINGS=()
PHASE_STATUS=()

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

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${C}╔══════════════════════════════════════════════════════╗${N}"
echo -e "${B}${C}║   Eunoia AI OS — Exhibition Launch Pipeline          ║${N}"
echo -e "${B}${C}╚══════════════════════════════════════════════════════╝${N}"
echo -e "  ${B}$(date '+%Y-%m-%d %H:%M:%S %Z')${N}"
echo -e "  Production: $PROD_URL"
[[ "$DRY_RUN" == "true" ]] && echo -e "  ${Y}[DRY RUN — no changes will be made]${N}"
echo ""

mkdir -p "$REPORT_DIR"

# Helper: phase runner
run_phase() {
  local name="$1" fn="$2"
  hdr "$name"
  if [[ "$DRY_RUN" == "true" ]]; then
    inf "[DRY RUN] Would run: $fn"
    PHASE_STATUS+=("$name: DRY RUN")
    return
  fi
  if $fn; then
    PHASE_STATUS+=("$name: ✅ PASS")
  else
    PHASE_STATUS+=("$name: ❌ FAIL")
    ERRORS+=("$name failed")
  fi
}

# ── Phase 1: Pre-flight ───────────────────────────────────────────────────────
phase_preflight() {
  cd "$ROOT"
  local missing=()
  [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]   && missing+=("NEXT_PUBLIC_SUPABASE_URL")
  [[ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]] && missing+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  [[ -z "${OPENAI_API_KEY:-}" ]]             && missing+=("OPENAI_API_KEY")

  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required env vars:"
    for v in "${missing[@]}"; do err "  $v"; done
    return 1
  fi
  ok "Required environment variables present"

  [[ -z "${RESEND_API_KEY:-}" ]]    && warn "RESEND_API_KEY not set — invite emails disabled" && WARNINGS+=("Email invites disabled")
  [[ -z "${STRIPE_SECRET_KEY:-}" ]] && warn "STRIPE_SECRET_KEY not set — billing disabled"   && WARNINGS+=("Billing disabled")
  [[ -z "${METRICS_TOKEN:-}" ]]     && warn "METRICS_TOKEN not set — /api/metrics is open"   && WARNINGS+=("Prometheus open")

  inf "Running TypeScript check..."
  if npx tsc --noEmit &>/dev/null; then
    ok "TypeScript: 0 errors"
  else
    err "TypeScript errors"
    return 1
  fi

  inf "Running tests..."
  if npm test &>/dev/null; then
    ok "All tests passing"
  else
    err "Tests failed"
    return 1
  fi
}
run_phase "Phase 1: Pre-flight" phase_preflight

# ── Phase 2: Bootstrap (Vercel env sync) ─────────────────────────────────────
phase_bootstrap() {
  if [[ "$SKIP_BOOTSTRAP" == "true" ]]; then
    inf "Skipped (--skip-bootstrap)"
    return 0
  fi
  if [[ -f "$ROOT/tools/bootstrap/index.ts" ]]; then
    inf "Syncing env vars to Vercel..."
    if npx tsx "$ROOT/tools/bootstrap/index.ts" &>/dev/null; then
      ok "Vercel env vars synced"
    else
      warn "Bootstrap failed — Vercel CLI may not be logged in"
      WARNINGS+=("Vercel env sync skipped")
    fi
  else
    warn "Bootstrap tool not found — skipping"
    WARNINGS+=("Bootstrap tool missing")
  fi
}
run_phase "Phase 2: Bootstrap" phase_bootstrap

# ── Phase 3: Verify Supabase ──────────────────────────────────────────────────
phase_supabase() {
  local url="${NEXT_PUBLIC_SUPABASE_URL:-}"
  local key="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
  local resp
  resp=$(curl -s --max-time 10 \
    -H "apikey: $key" \
    -H "Authorization: Bearer $key" \
    "$url/rest/v1/organizations?select=id&limit=1" 2>/dev/null || echo "")
  if echo "$resp" | grep -q '\[\|{'; then
    ok "Supabase REST API responding"
  else
    err "Supabase REST API unreachable"
    return 1
  fi
}
run_phase "Phase 3: Verify Supabase" phase_supabase

# ── Phase 4: Verify Stripe ────────────────────────────────────────────────────
phase_stripe() {
  if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
    warn "STRIPE_SECRET_KEY not set — skipping Stripe verification"
    WARNINGS+=("Stripe verification skipped")
    return 0
  fi
  local resp
  resp=$(curl -s --max-time 10 \
    -H "Authorization: Bearer ${STRIPE_SECRET_KEY}" \
    "https://api.stripe.com/v1/account" 2>/dev/null | tr -d ' ' || echo "")
  if echo "$resp" | grep -q '"id"'; then
    ok "Stripe account API responding"
  else
    err "Stripe API unreachable or key invalid"
    return 1
  fi
}
run_phase "Phase 4: Verify Stripe" phase_stripe

# ── Phase 5: Verify Resend ────────────────────────────────────────────────────
phase_resend() {
  if [[ -z "${RESEND_API_KEY:-}" ]]; then
    warn "RESEND_API_KEY not set — skipping Resend verification"
    WARNINGS+=("Resend verification skipped")
    return 0
  fi
  local resp
  resp=$(curl -s --max-time 10 \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    "https://api.resend.com/domains" 2>/dev/null || echo "")
  if echo "$resp" | grep -q '"data"\|"object"'; then
    ok "Resend API responding"
  else
    warn "Resend API check inconclusive"
    WARNINGS+=("Resend API check inconclusive")
  fi
}
run_phase "Phase 5: Verify Resend" phase_resend

# ── Phase 6: Demo Preparation ─────────────────────────────────────────────────
phase_demo() {
  if [[ "$SKIP_SEED" == "true" ]]; then
    inf "Skipped (--skip-seed)"
    return 0
  fi
  if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    if "$SCRIPT_DIR/seed-demo.sh" &>/dev/null; then
      ok "Demo account ready: demo@eunoiaos.com"
    else
      err "Demo seeding failed"
      return 1
    fi
  else
    warn "SUPABASE_SERVICE_ROLE_KEY not set — demo not seeded"
    WARNINGS+=("Demo account not seeded")
  fi
}
run_phase "Phase 6: Demo Preparation" phase_demo

# ── Phase 7: Production Health Checks ─────────────────────────────────────────
phase_health() {
  local live health

  live=$(curl -s --max-time 15 "$PROD_URL/api/live" 2>/dev/null || echo "")
  if echo "$live" | grep -q '"status":"ok"'; then
    ok "Liveness: UP"
  else
    err "Liveness: FAIL"
    return 1
  fi

  health=$(curl -s --max-time 30 "$PROD_URL/api/health" 2>/dev/null || echo "")
  if echo "$health" | grep -q '"status":"ready"'; then
    ok "Readiness: READY"
  elif echo "$health" | grep -q '"status":"degraded"'; then
    warn "Readiness: DEGRADED — check /api/admin/system"
    WARNINGS+=("Health degraded at launch")
  else
    err "Readiness: FAIL"
    return 1
  fi
}
run_phase "Phase 7: Health Checks" phase_health

# ── Phase 8: Smoke Tests ──────────────────────────────────────────────────────
phase_smoke() {
  local pass=0 fail=0

  check_page() {
    local desc="$1" expected="$2" path="$3"
    local actual
    actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PROD_URL$path" 2>/dev/null || echo "000")
    if [[ "$actual" == "$expected"* ]]; then
      ok "  $desc → $actual"; ((pass++))
    else
      err "  $desc → $actual (expected $expected)"; ((fail++))
    fi
  }

  check_page "Home page"     "200" "/"
  check_page "Login page"    "200" "/login"
  check_page "Signup page"   "200" "/signup"
  check_page "Dashboard"     "307" "/dashboard"
  check_page "API auth"      "401" "/api/admin/system"

  inf "Smoke: $pass passed, $fail failed"
  [[ $fail -gt 0 ]] && return 1
  return 0
}
run_phase "Phase 8: Smoke Tests" phase_smoke

# ── Generate Launch Report ────────────────────────────────────────────────────
hdr "Generating Launch Report"

LAUNCH_END=$(date +%s)
LAUNCH_DURATION=$((LAUNCH_END - LAUNCH_START))
GIT_SHA=$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(cd "$ROOT" && git branch --show-current 2>/dev/null || echo "unknown")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')

cat > "$LAUNCH_REPORT" <<REPORT
# Exhibition Launch Report
**Generated**: $TIMESTAMP
**Duration**: ${LAUNCH_DURATION}s
**Git SHA**: $GIT_SHA
**Branch**: $GIT_BRANCH
**Production**: $PROD_URL

## Phase Results

$(printf -- "| %s |\n" "${PHASE_STATUS[@]:-No phases run}")

## Errors

$([ ${#ERRORS[@]} -eq 0 ] && echo "None." || printf -- "- %s\n" "${ERRORS[@]}")

## Warnings

$([ ${#WARNINGS[@]} -eq 0 ] && echo "None." || printf -- "- %s\n" "${WARNINGS[@]}")

## Checklist Post-Launch

- [ ] Open $PROD_URL in browser
- [ ] Verify demo login: demo@eunoiaos.com / EunoiaDemo2026!
- [ ] Run one AI query in the Assistant
- [ ] Verify CRM contacts are visible
- [ ] Verify KB documents are listed
- [ ] Open dashboard analytics charts
- [ ] Test mobile view on phone
REPORT

ok "Launch report: $REPORT_DIR/LAUNCH_REPORT.md"

# ── Final Verdict ─────────────────────────────────────────────────────────────
echo ""
echo -e "${B}${C}══════════════════════════════════════════════════════${N}"

if [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo -e "${B}${G}  ✓ LAUNCH COMPLETE — Platform is exhibition-ready${N}"
  echo -e "${B}${C}══════════════════════════════════════════════════════${N}"
  echo ""
  echo -e "  ${B}Production URL:${N}  $PROD_URL"
  echo -e "  ${B}Demo login:${N}      demo@eunoiaos.com / EunoiaDemo2026!"
  echo -e "  ${B}Duration:${N}        ${LAUNCH_DURATION}s"
  [[ ${#WARNINGS[@]} -gt 0 ]] && echo "" && echo -e "  ${Y}Warnings (non-blocking):${N}" && for w in "${WARNINGS[@]}"; do echo -e "    ${Y}⚠${N} $w"; done
  echo ""

  # Open browser on macOS
  if command -v open &>/dev/null && [[ "$DRY_RUN" == "false" ]]; then
    open "$PROD_URL" 2>/dev/null || true
  fi
  exit 0
else
  echo -e "${B}${R}  ✗ LAUNCH BLOCKED — ${#ERRORS[@]} critical issue(s)${N}"
  echo -e "${B}${C}══════════════════════════════════════════════════════${N}"
  echo ""
  for e in "${ERRORS[@]}"; do echo -e "    ${R}→${N} $e"; done
  echo ""
  exit 1
fi
