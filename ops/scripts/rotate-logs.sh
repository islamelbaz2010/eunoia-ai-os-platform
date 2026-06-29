#!/usr/bin/env bash
# ops/scripts/rotate-logs.sh — Log rotation for PM2 and application logs
#
# Usage:
#   ./ops/scripts/rotate-logs.sh [--days 30] [--compress] [--dry-run]
#
# Manages:
#   ~/.pm2/logs/       — PM2 stdout/stderr logs
#   .deploy-logs/      — Deployment and rollback logs
#   (future) app logs from structured logger if file transport is added
#
# Recommended cron:
#   0 0 * * *   /path/to/ops/scripts/rotate-logs.sh --compress --days 30

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

log()    { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
ok()     { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${RESET}"; }
warn()   { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${RESET}"; }

DAYS=30
COMPRESS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --days)    DAYS="$2"; shift 2 ;;
    --compress) COMPRESS=true; shift ;;
    --dry-run)  DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--days 30] [--compress] [--dry-run]"
      exit 0 ;;
    *) shift ;;
  esac
done

log "Log rotation — retain last $DAYS days"
log "Compress: $COMPRESS | DryRun: $DRY_RUN"

# ── PM2 log rotation ──────────────────────────────────────────────────────────

PM2_LOG_DIR="${HOME}/.pm2/logs"
if [ -d "$PM2_LOG_DIR" ]; then
  log "PM2 logs: $PM2_LOG_DIR"

  # Use PM2's built-in log rotation if pm2-logrotate is installed
  if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "pm2-logrotate"; then
    log "pm2-logrotate is installed — PM2 handles rotation automatically"
  else
    warn "pm2-logrotate not installed. Recommended: pm2 install pm2-logrotate"
    warn "  pm2 set pm2-logrotate:max_size 100M"
    warn "  pm2 set pm2-logrotate:retain 7"
    warn "  pm2 set pm2-logrotate:compress true"

    # Manual cleanup: delete PM2 logs older than $DAYS days
    if [ "$DRY_RUN" = false ]; then
      find "$PM2_LOG_DIR" -name "*.log" -mtime "+$DAYS" -exec rm -f {} \;
      ok "Deleted PM2 logs older than $DAYS days"
    else
      COUNT=$(find "$PM2_LOG_DIR" -name "*.log" -mtime "+$DAYS" | wc -l)
      warn "DRY RUN: would delete $COUNT PM2 log file(s) older than $DAYS days"
    fi
  fi

  DISK_USED=$(du -sh "$PM2_LOG_DIR" 2>/dev/null | cut -f1)
  log "PM2 logs disk usage: $DISK_USED"
else
  warn "PM2 log directory not found: $PM2_LOG_DIR"
fi

# ── Deploy logs ───────────────────────────────────────────────────────────────

DEPLOY_LOG_DIR="$ROOT_DIR/.deploy-logs"
if [ -d "$DEPLOY_LOG_DIR" ]; then
  log "Deploy logs: $DEPLOY_LOG_DIR"

  if [ "$COMPRESS" = true ]; then
    # Compress deploy logs older than 1 day but not yet compressed
    find "$DEPLOY_LOG_DIR" -name "*.log" -mtime +1 ! -name "*.gz" | while read -r f; do
      if [ "$DRY_RUN" = false ]; then
        gzip "$f"
        ok "Compressed: $f"
      else
        warn "DRY RUN: would compress $f"
      fi
    done
  fi

  # Delete old logs
  if [ "$DRY_RUN" = false ]; then
    find "$DEPLOY_LOG_DIR" -name "*.log" -mtime "+$DAYS" -exec rm -f {} \;
    find "$DEPLOY_LOG_DIR" -name "*.log.gz" -mtime "+$DAYS" -exec rm -f {} \;
    ok "Deleted deploy logs older than $DAYS days"
  else
    COUNT=$(find "$DEPLOY_LOG_DIR" -mtime "+$DAYS" | wc -l)
    warn "DRY RUN: would delete $COUNT deploy log file(s) older than $DAYS days"
  fi

  DISK_USED=$(du -sh "$DEPLOY_LOG_DIR" 2>/dev/null | cut -f1)
  log "Deploy logs disk usage: $DISK_USED"
fi

# ── Old build backups ──────────────────────────────────────────────────────────

log "Checking for old build backups..."
OLD_BACKUPS=$(find "$ROOT_DIR" -maxdepth 1 -name ".next-*" -type d -mtime "+$DAYS" 2>/dev/null)
if [ -n "$OLD_BACKUPS" ]; then
  while IFS= read -r backup; do
    if [ "$DRY_RUN" = false ]; then
      rm -rf "$backup"
      ok "Deleted old backup: $backup"
    else
      warn "DRY RUN: would delete $backup"
    fi
  done <<< "$OLD_BACKUPS"
else
  log "No old build backups to clean"
fi

# ── Disk summary ───────────────────────────────────────────────────────────────

log ""
log "Disk usage summary:"
df -h "$ROOT_DIR" | tail -1 | awk '{print "  Root partition: used=" $3 " avail=" $4 " use%=" $5}'

if [ "$DRY_RUN" = true ]; then
  warn ""
  warn "DRY RUN complete — no changes were made"
else
  ok "Log rotation complete"
fi
