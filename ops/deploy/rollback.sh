#!/usr/bin/env bash
# ops/deploy/rollback.sh — Manual rollback to a previous deployment
#
# Usage:
#   ./ops/deploy/rollback.sh [--to <timestamp>] [--list] [--dry-run]
#
# What it does:
#   1. Lists available build backups (or restores a specific one)
#   2. Stops PM2
#   3. Replaces .next with the backup
#   4. Restarts PM2
#   5. Verifies health
#   6. Generates rollback report

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_LOG_DIR="$ROOT_DIR/.deploy-logs"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ROLLBACK_LOG="$DEPLOY_LOG_DIR/rollback-$TIMESTAMP.log"

PM2_APP_NAME="eunoia"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*" | tee -a "$ROLLBACK_LOG"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${RESET}" | tee -a "$ROLLBACK_LOG"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${RESET}" | tee -a "$ROLLBACK_LOG"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${RESET}" | tee -a "$ROLLBACK_LOG"; }
header()  { echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}" | tee -a "$ROLLBACK_LOG"
            echo -e "${BOLD}${BLUE}  $*${RESET}" | tee -a "$ROLLBACK_LOG"
            echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${RESET}\n" | tee -a "$ROLLBACK_LOG"; }

# ── Parse args ────────────────────────────────────────────────────────────────

TO_TIMESTAMP=""
LIST_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --to)      TO_TIMESTAMP="$2"; shift 2 ;;
    --list)    LIST_ONLY=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--to <timestamp>] [--list] [--dry-run]"
      echo "  --to <ts>   Roll back to a specific backup (e.g. 20260629_143000)"
      echo "  --list      List available backups and exit"
      echo "  --dry-run   Show what would happen without making changes"
      exit 0
      ;;
    *) error "Unknown argument: $1"; exit 1 ;;
  esac
done

mkdir -p "$DEPLOY_LOG_DIR"
cd "$ROOT_DIR"

# ── List available backups ────────────────────────────────────────────────────

header "AVAILABLE BUILD BACKUPS"

BACKUPS=()
while IFS= read -r -d '' dir; do
  BACKUPS+=("$dir")
done < <(find "$ROOT_DIR" -maxdepth 1 -name ".next-backup-*" -type d -print0 2>/dev/null | sort -z)

if [ ${#BACKUPS[@]} -eq 0 ]; then
  warn "No build backups found in $ROOT_DIR"
  warn "Build backups are created automatically by deploy.sh"
  exit 0
fi

for backup in "${BACKUPS[@]}"; do
  ts="$(basename "$backup" | sed 's/.next-backup-//')"
  size="$(du -sh "$backup" 2>/dev/null | cut -f1)"
  log "  $ts   [$size]   $backup"
done

if [ "$LIST_ONLY" = true ]; then
  exit 0
fi

# ── Select backup ─────────────────────────────────────────────────────────────

if [ -z "$TO_TIMESTAMP" ]; then
  # Default: most recent backup
  BACKUP_PATH="${BACKUPS[-1]}"
  TO_TIMESTAMP="$(basename "$BACKUP_PATH" | sed 's/.next-backup-//')"
  log "No --to specified. Using most recent backup: $TO_TIMESTAMP"
else
  BACKUP_PATH="$ROOT_DIR/.next-backup-$TO_TIMESTAMP"
  if [ ! -d "$BACKUP_PATH" ]; then
    error "Backup not found: $BACKUP_PATH"
    exit 1
  fi
fi

header "ROLLBACK TO $TO_TIMESTAMP"
log "Backup:  $BACKUP_PATH"
log "DryRun:  $DRY_RUN"

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN — no changes will be made"
  warn "Would restore: $BACKUP_PATH → $ROOT_DIR/.next"
  warn "Would restart PM2: $PM2_APP_NAME"
  exit 0
fi

# ── Stop PM2 ──────────────────────────────────────────────────────────────────

header "STEP 1 — Stop PM2"

if command -v pm2 &>/dev/null && pm2 describe "$PM2_APP_NAME" &>/dev/null; then
  log "Stopping $PM2_APP_NAME..."
  pm2 stop "$PM2_APP_NAME" 2>&1 | tee -a "$ROLLBACK_LOG"
  success "PM2 stopped"
else
  warn "PM2 not running or not installed"
fi

# ── Restore .next ─────────────────────────────────────────────────────────────

header "STEP 2 — Restore Build"

# Backup the current (broken) build so we can diagnose it
BROKEN_BACKUP="$ROOT_DIR/.next-failed-$TIMESTAMP"
if [ -d "$ROOT_DIR/.next" ]; then
  log "Moving failed build to $BROKEN_BACKUP"
  mv "$ROOT_DIR/.next" "$BROKEN_BACKUP"
fi

log "Restoring backup..."
cp -r "$BACKUP_PATH" "$ROOT_DIR/.next"
success "Build restored from $TO_TIMESTAMP"

# ── Restart PM2 ───────────────────────────────────────────────────────────────

header "STEP 3 — Restart PM2"

if command -v pm2 &>/dev/null; then
  log "Starting PM2..."
  pm2 start "$PM2_APP_NAME" 2>&1 | tee -a "$ROLLBACK_LOG"
  pm2 save 2>&1 | tee -a "$ROLLBACK_LOG"
  sleep 5
  success "PM2 started"
else
  warn "PM2 not found — start manually: pm2 start ecosystem.config.js --env production"
fi

# ── Health verification ───────────────────────────────────────────────────────

header "STEP 4 — Health Verification"

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"

log "Checking /api/live..."
LIVE_OK=false
for i in $(seq 1 10); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/api/live" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    LIVE_OK=true
    success "/api/live → $HTTP_CODE"
    break
  fi
  log "Attempt $i/10 → $HTTP_CODE (waiting...)"
  sleep 5
done

log "Checking /api/health..."
HEALTH_OK=false
for i in $(seq 1 10); do
  RESPONSE=$(curl -s --max-time 15 "$APP_URL/api/health" 2>/dev/null || echo '{"healthy":false}')
  HEALTHY=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('healthy',False)).lower())" 2>/dev/null || echo "false")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$APP_URL/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] && [ "$HEALTHY" = "true" ]; then
    HEALTH_OK=true
    success "/api/health → healthy=true"
    break
  fi
  log "Attempt $i/10 → $HTTP_CODE, healthy=$HEALTHY (waiting...)"
  sleep 5
done

# ── Rollback report ───────────────────────────────────────────────────────────

header "ROLLBACK REPORT"

echo "" >> "$ROLLBACK_LOG"
echo "=== ROLLBACK REPORT ===" >> "$ROLLBACK_LOG"
echo "Timestamp:       $TIMESTAMP" >> "$ROLLBACK_LOG"
echo "Rolled back to:  $TO_TIMESTAMP" >> "$ROLLBACK_LOG"
echo "Failed build:    $BROKEN_BACKUP" >> "$ROLLBACK_LOG"
echo "Liveness:        $( [ "$LIVE_OK" = true ] && echo PASS || echo FAIL )" >> "$ROLLBACK_LOG"
echo "Health:          $( [ "$HEALTH_OK" = true ] && echo PASS || echo FAIL )" >> "$ROLLBACK_LOG"

if [ "$LIVE_OK" = true ] && [ "$HEALTH_OK" = true ]; then
  success "Rollback SUCCESSFUL"
  success "App URL:         $APP_URL"
  success "Log:             $ROLLBACK_LOG"
  success "Failed build at: $BROKEN_BACKUP (safe to delete after investigation)"
else
  error "Rollback completed but health checks FAILED"
  error "Manual intervention required"
  error "Check: $ROLLBACK_LOG"
  exit 1
fi
