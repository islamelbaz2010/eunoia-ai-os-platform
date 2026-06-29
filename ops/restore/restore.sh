#!/usr/bin/env bash
# ops/restore/restore.sh — Eunoia AI OS restore engine
#
# Usage:
#   ./ops/restore/restore.sh --from /path/to/backup [--type full|db|config|env] [--dry-run]
#
# Modes:
#   full       Restore everything from backup
#   db         Restore database only (requires pg_restore and DATABASE_URL)
#   config     Restore configuration files
#   env        Print environment variable checklist
#   build      Restore .next build artifact
#
# ALWAYS test with --dry-run before a real restore.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

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

# ── Args ──────────────────────────────────────────────────────────────────────

FROM_PATH=""
TYPE="full"
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --from)    FROM_PATH="$2"; shift 2 ;;
    --type)    TYPE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --force)   FORCE=true; shift ;;
    -h|--help)
      echo "Usage: $0 --from <backup-dir> [--type full|db|config|env|build] [--dry-run] [--force]"
      exit 0 ;;
    *) error "Unknown: $1"; exit 1 ;;
  esac
done

if [ -z "$FROM_PATH" ]; then
  error "--from <backup-dir> is required"
  echo "List available backups: ls .backups/"
  exit 1
fi

if [ ! -d "$FROM_PATH" ]; then
  error "Backup directory not found: $FROM_PATH"
  exit 1
fi

header "EUNOIA AI OS RESTORE"
log "From:    $FROM_PATH"
log "Type:    $TYPE"
log "DryRun:  $DRY_RUN"

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN — no changes will be made"
fi

# ── Verify backup integrity ────────────────────────────────────────────────────

header "INTEGRITY CHECK"

CHECKSUM_FILE="$FROM_PATH/checksums.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  log "Verifying checksums..."
  if command -v sha256sum &>/dev/null; then
    (cd "$FROM_PATH" && sha256sum --check --quiet "$CHECKSUM_FILE" 2>/dev/null) && success "Checksums verified" || warn "Checksum mismatch — backup may be incomplete"
  elif command -v shasum &>/dev/null; then
    (cd "$FROM_PATH" && shasum -a 256 --check --quiet "$CHECKSUM_FILE" 2>/dev/null) && success "Checksums verified" || warn "Checksum mismatch — backup may be incomplete"
  else
    warn "sha256sum/shasum not available — skipping checksum verification"
  fi
else
  warn "No checksum file found — cannot verify integrity"
fi

MANIFEST="$FROM_PATH/MANIFEST.json"
if [ -f "$MANIFEST" ]; then
  log "Backup manifest:"
  cat "$MANIFEST"
fi

# ── Restore: Database ──────────────────────────────────────────────────────────

restore_database() {
  header "RESTORE — Database"

  DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

  if [ -z "$DB_URL" ]; then
    error "DATABASE_URL not set — cannot restore database"
    warn "For Supabase hosted: use Dashboard → Database → Backups → Restore Point"
    warn "For pg_restore: set DATABASE_URL=postgresql://user:pass@host:5432/db"
    return 1
  fi

  # Find dump file
  DB_FILE="$(find "$FROM_PATH" -name "database-*.sql.gz" | head -1)"
  if [ -z "$DB_FILE" ]; then
    DB_FILE="$(find "$FROM_PATH" -name "database-*.sql" | head -1)"
  fi

  if [ -z "$DB_FILE" ]; then
    error "No database dump found in $FROM_PATH"
    return 1
  fi

  warn "DATABASE RESTORE IS DESTRUCTIVE"
  warn "This will overwrite data in: $DB_URL"
  if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo -n "Type 'yes' to continue: "
    read -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      error "Aborted"
      exit 1
    fi
  fi

  if [ "$DRY_RUN" = true ]; then
    warn "DRY RUN: would restore $DB_FILE → $DB_URL"
    return
  fi

  log "Restoring from $DB_FILE..."
  if [[ "$DB_FILE" == *.gz ]]; then
    gunzip -c "$DB_FILE" | psql "$DB_URL" 2>/dev/null
  else
    psql "$DB_URL" < "$DB_FILE" 2>/dev/null
  fi
  success "Database restored"
}

# ── Restore: Config ────────────────────────────────────────────────────────────

restore_config() {
  header "RESTORE — Configuration"

  CONFIG_DIR="$FROM_PATH/config"
  if [ ! -d "$CONFIG_DIR" ]; then
    warn "No config directory in backup"
    return
  fi

  CONFIG_FILES=(
    "next.config.ts"
    "package.json"
    "tsconfig.json"
    "eslint.config.mjs"
    "ecosystem.config.js"
    ".env.example"
  )

  for f in "${CONFIG_FILES[@]}"; do
    if [ -f "$CONFIG_DIR/$f" ]; then
      if [ "$DRY_RUN" = false ]; then
        cp "$CONFIG_DIR/$f" "$ROOT_DIR/$f"
      fi
      log "  Restored: $f"
    fi
  done

  # Migrations
  if [ -d "$CONFIG_DIR/migrations" ]; then
    if [ "$DRY_RUN" = false ]; then
      mkdir -p "$ROOT_DIR/supabase/migrations"
      cp -r "$CONFIG_DIR/migrations/"* "$ROOT_DIR/supabase/migrations/" 2>/dev/null || true
    fi
    success "Migrations restored"
  fi

  success "Config restore complete"
}

# ── Restore: Environment guidance ─────────────────────────────────────────────

restore_env() {
  header "RESTORE — Environment Variables"

  ENV_META="$FROM_PATH/env-metadata.json"
  if [ -f "$ENV_META" ]; then
    log "Variables that were set in the backed-up environment:"
    cat "$ENV_META"
    echo ""
  fi

  warn "Environment variables (secrets) are NOT stored in backups."
  warn "You must manually re-create them. Checklist:"
  echo ""
  echo "  Required:"
  echo "    [ ] NEXT_PUBLIC_SUPABASE_URL"
  echo "    [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "    [ ] OPENAI_API_KEY"
  echo "    [ ] NEXT_PUBLIC_APP_URL"
  echo ""
  echo "  Important:"
  echo "    [ ] RESEND_API_KEY"
  echo "    [ ] FROM_EMAIL"
  echo "    [ ] NEXT_PUBLIC_SENTRY_DSN"
  echo "    [ ] SENTRY_DSN"
  echo "    [ ] METRICS_TOKEN"
  echo ""
  echo "  Never add to cloud environments:"
  echo "    [ ] SUPABASE_SERVICE_ROLE_KEY (local/scripts only)"
}

# ── Restore: Build ─────────────────────────────────────────────────────────────

restore_build() {
  header "RESTORE — Build Artifact"

  BUILD_ARCHIVE="$(find "$FROM_PATH" -name "build-*.tar.gz" | head -1)"
  if [ -z "$BUILD_ARCHIVE" ]; then
    warn "No build archive found in backup"
    warn "Run 'npm run build' instead"
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    warn "DRY RUN: would extract $BUILD_ARCHIVE → $ROOT_DIR"
    return
  fi

  if [ -d "$ROOT_DIR/.next" ]; then
    CURRENT_BACKUP="$ROOT_DIR/.next-pre-restore-$TIMESTAMP"
    log "Backing up current .next to $CURRENT_BACKUP"
    mv "$ROOT_DIR/.next" "$CURRENT_BACKUP"
  fi

  log "Extracting build archive..."
  tar -xzf "$BUILD_ARCHIVE" -C "$ROOT_DIR"
  success "Build restored from $BUILD_ARCHIVE"
}

# ── Execute ────────────────────────────────────────────────────────────────────

case "$TYPE" in
  full)
    restore_config
    restore_env
    ;;
  db|database)
    restore_database
    ;;
  config)
    restore_config
    ;;
  env|environment)
    restore_env
    ;;
  build)
    restore_build
    ;;
  *)
    error "Unknown type: $TYPE. Use: full|db|config|env|build"
    exit 1
    ;;
esac

# ── Health check (if not dry run) ─────────────────────────────────────────────

if [ "$DRY_RUN" = false ] && [ "$TYPE" != "env" ]; then
  header "POST-RESTORE HEALTH CHECK"

  APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
  APP_URL="${APP_URL%/}"

  log "Checking $APP_URL/api/live..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/api/live" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    success "/api/live → $HTTP_CODE"
  else
    warn "/api/live → $HTTP_CODE (application may not be running yet)"
    warn "Start with: pm2 start ecosystem.config.js --env production"
  fi
fi

header "RESTORE COMPLETE"
if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN — no changes were made. Remove --dry-run to execute."
else
  success "Type: $TYPE"
  success "From: $FROM_PATH"
fi
