#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/rollback.sh
# Eunoia AI OS — Emergency Rollback
#
# Triggers a Vercel rollback to the previous deployment.
# Use only if the current production build is broken.
#
# Strategy options:
#   --vercel   (default) Rollback via Vercel CLI to previous deployment
#   --git SHA  Redeploy a specific git commit SHA
#   --list     List recent Vercel deployments (no rollback)
#
# Usage:
#   ./scripts/exhibition/rollback.sh              # rollback to previous deploy
#   ./scripts/exhibition/rollback.sh --list       # list recent deployments
#   ./scripts/exhibition/rollback.sh --git abc123 # redeploy specific SHA
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_URL="https://eunoia-ai-os-platform.vercel.app"

MODE="vercel"
GIT_SHA=""
for arg in "$@"; do
  case $arg in
    --list) MODE="list" ;;
    --git)  MODE="git" ;;
    *)      [[ "$MODE" == "git" && -z "$GIT_SHA" ]] && GIT_SHA="$arg" ;;
  esac
done

if [[ -t 1 ]]; then
  R="\033[0;31m" G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  R="" G="" Y="" C="" B="" N=""
fi
ok()   { echo -e "  ${G}✓${N} $1"; }
err()  { echo -e "  ${R}✗${N} $1"; }
warn() { echo -e "  ${Y}⚠${N} $1"; }
inf()  { echo -e "  → $1"; }

echo ""
echo -e "${B}${R}╔══════════════════════════════════════════╗${N}"
echo -e "${B}${R}║   Eunoia AI OS — Emergency Rollback      ║${N}"
echo -e "${B}${R}╚══════════════════════════════════════════╝${N}"
echo ""

# ── Check Vercel CLI ──────────────────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  err "Vercel CLI not found."
  echo "  Install: npm install -g vercel"
  echo ""
  echo "  Manual alternative:"
  echo "  1. Open https://vercel.com/islamelbaz2010/eunoia-ai-os-platform"
  echo "  2. Click Deployments tab"
  echo "  3. Find the previous working deployment"
  echo "  4. Click ⋯ → Promote to Production"
  exit 1
fi

cd "$ROOT"

# ── List Mode ────────────────────────────────────────────────────────────────
if [[ "$MODE" == "list" ]]; then
  inf "Recent Vercel deployments:"
  echo ""
  vercel ls --prod 2>/dev/null || vercel ls 2>/dev/null || {
    err "Failed to list deployments. Run: vercel login"
    exit 1
  }
  echo ""
  inf "To rollback to a specific deployment, run:"
  echo "  vercel rollback <deployment-url> --yes"
  exit 0
fi

# ── Git SHA Redeploy ──────────────────────────────────────────────────────────
if [[ "$MODE" == "git" ]]; then
  if [[ -z "$GIT_SHA" ]]; then
    err "No SHA provided. Usage: ./rollback.sh --git <sha>"
    exit 1
  fi
  warn "Redeploying git SHA: $GIT_SHA"
  echo ""
  inf "Checking out $GIT_SHA..."
  git checkout "$GIT_SHA" -- . 2>/dev/null || {
    err "Failed to checkout SHA: $GIT_SHA"
    exit 1
  }
  inf "Deploying to production..."
  vercel deploy --prod --yes 2>&1
  ok "Redeploy triggered for SHA $GIT_SHA"
  git checkout - -- . 2>/dev/null || true
  exit 0
fi

# ── Standard Rollback ─────────────────────────────────────────────────────────
warn "Rolling back production to previous deployment..."
echo ""
warn "This will replace the current live deployment."
read -r -p "  Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "  Aborted."; exit 0; }
echo ""

inf "Triggering Vercel rollback..."
if vercel rollback --yes 2>&1; then
  ok "Rollback triggered"
  echo ""
  inf "Waiting 30s for deployment to propagate..."
  sleep 30

  LIVE=$(curl -s --max-time 15 "$PROD_URL/api/live" 2>/dev/null || echo "")
  if echo "$LIVE" | grep -q '"status":"ok"'; then
    ok "Production is live after rollback"
  else
    warn "Health check inconclusive — check $PROD_URL manually"
  fi
else
  err "Vercel rollback failed."
  echo ""
  echo "  Manual steps:"
  echo "  1. Run: vercel ls"
  echo "  2. Find previous deployment URL"
  echo "  3. Run: vercel rollback <url> --yes"
  echo ""
  echo "  Or use the Vercel Dashboard:"
  echo "  https://vercel.com/islamelbaz2010/eunoia-ai-os-platform/deployments"
  exit 1
fi

echo ""
echo -e "  ${B}Post-rollback checklist:${N}"
echo "  1. Verify $PROD_URL loads"
echo "  2. Test login with demo@eunoiaos.com"
echo "  3. Run one AI query"
echo "  4. Check /api/health"
echo ""
