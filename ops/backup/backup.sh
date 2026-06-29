#!/usr/bin/env bash
# ops/backup/backup.sh — Eunoia AI OS backup engine
#
# Usage:
#   ./ops/backup/backup.sh [--type full|db|storage|config|logs] [--dest /path/to/backups]
#
# Backs up:
#   • Database    — Supabase schema + data export via pg_dump or Supabase API
#   • Config      — Non-secret configuration files
#   • Environment — Encrypted .env snapshot (no plaintext secrets stored)
#   • Logs        — PM2 and application logs
#   • Build       — Current .next build artifact
#
# Retention:
#   • Daily backups kept for 7 days
#   • Weekly backups kept for 4 weeks (run with --weekly)
#   • Monthly backups kept for 12 months (run with --monthly)
#
# Note on Supabase backups:
#   Supabase manages its own daily point-in-time recovery (PITR) for hosted plans.
#   This script provides an ADDITIONAL application-level backup for portability
#   and off-platform storage. It uses pg_dump if DATABASE_URL is set.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DATE="$(date +%Y-%m-%d)"
WEEK="$(date +%Y-W%V)"
MONTH="$(date +%Y-%m)"

# ── Config ────────────────────────────────────────────────────────────────────

BACKUP_DEST="${BACKUP_DEST:-$ROOT_DIR/.backups}"
BACKUP_TYPE="${1:-full}"
RETENTION_DAILY=7     # days
RETENTION_WEEKLY=28   # days
RETENTION_MONTHLY=365 # days

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${RESET}"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${RESET}"; }
header()  { echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}"
            echo -e "${BOLD}${BLUE}  $*${RESET}"
            echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${RESET}\n"; }

# ── Parse args ────────────────────────────────────────────────────────────────

TYPE="full"
SCHEDULE="daily"

while [[ $# -gt 0 ]]; do
  case $1 in
    --type)    TYPE="$2"; shift 2 ;;
    --dest)    BACKUP_DEST="$2"; shift 2 ;;
    --weekly)  SCHEDULE="weekly"; shift ;;
    --monthly) SCHEDULE="monthly"; shift ;;
    -h|--help)
      echo "Usage: $0 [--type full|db|config|logs|build] [--dest /path] [--weekly|--monthly]"
      exit 0 ;;
    *) error "Unknown: $1"; exit 1 ;;
  esac
done

BACKUP_DIR="$BACKUP_DEST/$SCHEDULE/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

header "EUNOIA AI OS BACKUP — $TYPE ($SCHEDULE)"
log "Timestamp:  $TIMESTAMP"
log "Type:       $TYPE"
log "Schedule:   $SCHEDULE"
log "Destination: $BACKUP_DIR"

# ── Manifest ──────────────────────────────────────────────────────────────────

MANIFEST="$BACKUP_DIR/MANIFEST.json"
cat > "$MANIFEST" <<EOF
{
  "created_at": "$TIMESTAMP",
  "type": "$TYPE",
  "schedule": "$SCHEDULE",
  "host": "$(hostname)",
  "git_commit": "$(cd "$ROOT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(cd "$ROOT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

# ── Database backup ────────────────────────────────────────────────────────────

backup_database() {
  header "BACKUP — Database"

  # Supabase does not expose a direct DATABASE_URL in all plans.
  # If set (usually via SUPABASE_DB_URL or DATABASE_URL), use pg_dump.
  DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

  if [ -z "$DB_URL" ]; then
    warn "DATABASE_URL not set — skipping pg_dump backup"
    warn "Supabase manages its own PITR backups on Pro/Enterprise plans."
    warn "For manual export: Supabase Dashboard → Database → Backups"

    # Export Supabase schema via REST (anon-safe, no data)
    if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
      log "Exporting Supabase schema info via REST API..."
      DB_INFO_FILE="$BACKUP_DIR/supabase-info.json"
      curl -sf \
        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
        -o "$DB_INFO_FILE" 2>/dev/null && success "Supabase REST info saved" || warn "Could not fetch Supabase info"
    fi
    return
  fi

  if ! command -v pg_dump &>/dev/null; then
    warn "pg_dump not found — install postgresql-client"
    warn "brew install postgresql (macOS) or apt install postgresql-client (Ubuntu)"
    return
  fi

  DB_FILE="$BACKUP_DIR/database-$TIMESTAMP.sql"
  log "Running pg_dump..."
  pg_dump "$DB_URL" \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$DB_FILE" 2>/dev/null
  success "Database dumped: $DB_FILE"

  gzip "$DB_FILE"
  success "Compressed: ${DB_FILE}.gz"
}

# ── Config backup ──────────────────────────────────────────────────────────────

backup_config() {
  header "BACKUP — Configuration"

  CONFIG_DIR="$BACKUP_DIR/config"
  mkdir -p "$CONFIG_DIR"

  # Non-secret config files
  CONFIG_FILES=(
    "next.config.ts"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "eslint.config.mjs"
    "vitest.config.ts"
    "ecosystem.config.js"
    ".env.example"
    "proxy.ts"
  )

  for f in "${CONFIG_FILES[@]}"; do
    if [ -f "$ROOT_DIR/$f" ]; then
      cp "$ROOT_DIR/$f" "$CONFIG_DIR/"
      log "  Backed up: $f"
    fi
  done

  # supabase migrations
  if [ -d "$ROOT_DIR/supabase/migrations" ]; then
    cp -r "$ROOT_DIR/supabase/migrations" "$CONFIG_DIR/migrations"
    success "Migrations backed up"
  fi

  success "Config backup complete"
}

# ── Environment backup (metadata only — no secret values) ─────────────────────

backup_env() {
  header "BACKUP — Environment Metadata"

  ENV_META="$BACKUP_DIR/env-metadata.json"

  # List which vars are SET (true/false) without capturing values
  VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "OPENAI_API_KEY"
    "NEXT_PUBLIC_APP_URL"
    "RESEND_API_KEY"
    "FROM_EMAIL"
    "NEXT_PUBLIC_SENTRY_DSN"
    "SENTRY_DSN"
    "METRICS_TOKEN"
    "DATABASE_URL"
    "REDIS_URL"
    "QUEUE_REDIS_URL"
    "LOG_LEVEL"
    "BUILD_VERSION"
  )

  echo "{" > "$ENV_META"
  for var in "${VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
      echo "  \"$var\": true," >> "$ENV_META"
    else
      echo "  \"$var\": false," >> "$ENV_META"
    fi
  done
  echo "  \"_note\": \"Values are NOT stored. This shows only which variables are set.\"" >> "$ENV_META"
  echo "}" >> "$ENV_META"

  success "Environment metadata saved (no secret values stored)"
}

# ── Logs backup ────────────────────────────────────────────────────────────────

backup_logs() {
  header "BACKUP — Logs"

  LOGS_DIR="$BACKUP_DIR/logs"
  mkdir -p "$LOGS_DIR"

  # PM2 logs
  PM2_LOG_DIR="${HOME}/.pm2/logs"
  if [ -d "$PM2_LOG_DIR" ]; then
    cp "$PM2_LOG_DIR"/*.log "$LOGS_DIR/" 2>/dev/null && success "PM2 logs backed up" || warn "No PM2 logs found"
  fi

  # Deploy logs
  if [ -d "$ROOT_DIR/.deploy-logs" ]; then
    cp -r "$ROOT_DIR/.deploy-logs" "$LOGS_DIR/deploy-logs"
    success "Deploy logs backed up"
  fi

  # Compress
  cd "$BACKUP_DIR"
  tar -czf "logs-$TIMESTAMP.tar.gz" "logs/" 2>/dev/null
  rm -rf "logs/"
  success "Logs archive: logs-$TIMESTAMP.tar.gz"
}

# ── Build backup ───────────────────────────────────────────────────────────────

backup_build() {
  header "BACKUP — Build Artifact"

  if [ ! -d "$ROOT_DIR/.next" ]; then
    warn ".next directory not found — run 'npm run build' first"
    return
  fi

  BUILD_ARCHIVE="$BACKUP_DIR/build-$TIMESTAMP.tar.gz"
  tar -czf "$BUILD_ARCHIVE" -C "$ROOT_DIR" ".next" 2>/dev/null
  success "Build archived: $BUILD_ARCHIVE"
}

# ── Run backup type ────────────────────────────────────────────────────────────

case "$TYPE" in
  full)
    backup_database
    backup_config
    backup_env
    backup_logs
    ;;
  db|database)
    backup_database
    ;;
  config)
    backup_config
    backup_env
    ;;
  logs)
    backup_logs
    ;;
  build)
    backup_build
    ;;
  *)
    error "Unknown type: $TYPE. Use: full|db|config|logs|build"
    exit 1
    ;;
esac

# ── Checksum ───────────────────────────────────────────────────────────────────

header "CHECKSUM"

CHECKSUM_FILE="$BACKUP_DIR/checksums.sha256"
if command -v sha256sum &>/dev/null; then
  (cd "$BACKUP_DIR" && find . -type f ! -name "checksums.sha256" -exec sha256sum {} \; > "$CHECKSUM_FILE")
elif command -v shasum &>/dev/null; then
  (cd "$BACKUP_DIR" && find . -type f ! -name "checksums.sha256" -exec shasum -a 256 {} \; > "$CHECKSUM_FILE")
fi
success "Checksums: $CHECKSUM_FILE"

# ── Retention cleanup ──────────────────────────────────────────────────────────

header "RETENTION CLEANUP"

case "$SCHEDULE" in
  daily)
    log "Removing daily backups older than $RETENTION_DAILY days..."
    find "$BACKUP_DEST/daily" -maxdepth 1 -type d -mtime +$RETENTION_DAILY -exec rm -rf {} + 2>/dev/null || true
    ;;
  weekly)
    log "Removing weekly backups older than $RETENTION_WEEKLY days..."
    find "$BACKUP_DEST/weekly" -maxdepth 1 -type d -mtime +$RETENTION_WEEKLY -exec rm -rf {} + 2>/dev/null || true
    ;;
  monthly)
    log "Removing monthly backups older than $RETENTION_MONTHLY days..."
    find "$BACKUP_DEST/monthly" -maxdepth 1 -type d -mtime +$RETENTION_MONTHLY -exec rm -rf {} + 2>/dev/null || true
    ;;
esac
success "Retention policy applied"

# ── Summary ────────────────────────────────────────────────────────────────────

header "BACKUP COMPLETE"

BACKUP_SIZE="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
success "Location: $BACKUP_DIR"
success "Size:     $BACKUP_SIZE"
success "Schedule: $SCHEDULE"

# To automate with cron:
# Daily:   0 3 * * *   /path/to/ops/backup/backup.sh
# Weekly:  0 4 * * 0   /path/to/ops/backup/backup.sh --weekly
# Monthly: 0 5 1 * *   /path/to/ops/backup/backup.sh --monthly
