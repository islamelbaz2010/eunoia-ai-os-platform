#!/usr/bin/env bash
# ops/maintenance/maintenance.sh — Maintenance mode controller
#
# Usage:
#   ./ops/maintenance/maintenance.sh enable  [--reason "Scheduled maintenance"]
#   ./ops/maintenance/maintenance.sh disable
#   ./ops/maintenance/maintenance.sh status
#
# How it works:
#   Creates/removes a .maintenance flag file at the project root.
#   The Next.js proxy.ts middleware reads this file and serves a 503
#   response with a Retry-After header for all non-admin requests.
#
# Note:
#   The current proxy.ts does NOT check for .maintenance by default.
#   See docs below for the integration code to add to proxy.ts.
#
# For Vercel deployments:
#   Maintenance mode is best handled at the Vercel edge (Vercel Dashboard →
#   Project → Settings → Maintenance Mode), or via Cloudflare Page Rules.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAINTENANCE_FLAG="$ROOT_DIR/.maintenance"
MAINTENANCE_PAGE="$ROOT_DIR/ops/maintenance/maintenance-page.html"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
ok()     { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${RESET}"; }
warn()   { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${RESET}"; }
error()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${RESET}"; }

ACTION="${1:-status}"
REASON="${2:---reason}"
shift 2>/dev/null || true

while [[ $# -gt 0 ]]; do
  case $1 in
    --reason) REASON="$2"; shift 2 ;;
    *) shift ;;
  esac
done

case "$ACTION" in

enable)
  if [ -f "$MAINTENANCE_FLAG" ]; then
    warn "Maintenance mode is already enabled"
    cat "$MAINTENANCE_FLAG"
    exit 0
  fi

  TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  ENABLED_BY="${USER:-unknown}"

  cat > "$MAINTENANCE_FLAG" <<EOF
{
  "enabled_at": "$TIMESTAMP",
  "enabled_by": "$ENABLED_BY",
  "reason": "$REASON",
  "retry_after_seconds": 3600
}
EOF

  ok "Maintenance mode ENABLED"
  log "Flag: $MAINTENANCE_FLAG"
  log "Reason: $REASON"
  echo ""
  warn "IMPORTANT: If using Vercel, also enable maintenance mode in:"
  warn "  Vercel Dashboard → Project → Settings → Maintenance Mode"
  warn ""
  warn "To add maintenance mode to proxy.ts, add this check:"
  warn "  import { existsSync } from 'fs';"
  warn "  const inMaintenance = existsSync('.maintenance');"
  warn "  if (inMaintenance && !path.startsWith('/api/admin')) {"
  warn "    return new NextResponse('Maintenance', { status: 503, headers: { 'Retry-After': '3600' } });"
  warn "  }"
  ;;

disable)
  if [ ! -f "$MAINTENANCE_FLAG" ]; then
    warn "Maintenance mode is not enabled"
    exit 0
  fi

  cat "$MAINTENANCE_FLAG"
  rm "$MAINTENANCE_FLAG"
  ok "Maintenance mode DISABLED"
  log "Application is accepting requests again"
  ;;

status)
  if [ -f "$MAINTENANCE_FLAG" ]; then
    echo -e "${YELLOW}${BOLD}  STATUS: MAINTENANCE MODE ACTIVE${RESET}"
    cat "$MAINTENANCE_FLAG"
  else
    echo -e "${GREEN}${BOLD}  STATUS: NORMAL OPERATION${RESET}"
    log "No maintenance flag found"
  fi
  ;;

*)
  error "Unknown action: $ACTION. Use: enable|disable|status"
  exit 1
  ;;
esac
