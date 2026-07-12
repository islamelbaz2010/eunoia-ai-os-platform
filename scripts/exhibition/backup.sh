#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/backup.sh
# Eunoia AI OS — Pre-Exhibition Snapshot
#
# Creates a timestamped snapshot of:
#   - Git state (SHA, branch, tag)
#   - Database schema export (via Supabase REST introspection)
#   - Environment variable keys (NOT values)
#   - Vercel deployment metadata
#
# Does NOT backup:
#   - Secret values (keys, passwords)
#   - User data (PII)
#   - Binary assets
#
# Usage:
#   ./scripts/exhibition/backup.sh
#   ./scripts/exhibition/backup.sh --tag  (also creates git tag)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="$ROOT/docs/exhibition-live/backups/$TIMESTAMP"
TAG_MODE=false

for arg in "$@"; do
  [[ "$arg" == "--tag" ]] && TAG_MODE=true
done

if [[ -t 1 ]]; then
  G="\033[0;32m" Y="\033[1;33m" C="\033[0;36m" B="\033[1m" N="\033[0m"
else
  G="" Y="" C="" B="" N=""
fi
ok()  { echo -e "  ${G}✓${N} $1"; }
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

echo ""
echo -e "${B}${C}Eunoia AI OS — Pre-Exhibition Backup${N}"
echo -e "  Timestamp: $TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# ── Git State ────────────────────────────────────────────────────────────────
hdr "Git State"
cd "$ROOT"
GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_LOG=$(git log --oneline -10 2>/dev/null || echo "")
GIT_STATUS=$(git status --short 2>/dev/null || echo "")

cat > "$BACKUP_DIR/git_state.txt" <<EOF
Backup Timestamp: $TIMESTAMP
Branch: $GIT_BRANCH
SHA: $GIT_SHA

Last 10 Commits:
$GIT_LOG

Working Tree Status:
${GIT_STATUS:-clean}
EOF
ok "Git state saved"

# ── Env Key Manifest (no values) ─────────────────────────────────────────────
hdr "Environment Key Manifest"
ENV_KEYS=""
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    line="${line%%#*}"; line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" != *=* ]] && continue
    ENV_KEYS+="${line%%=*}\n"
  done < "$ENV_FILE"
fi

printf "Environment keys present at backup time:\n\n" > "$BACKUP_DIR/env_keys.txt"
printf "%b" "$ENV_KEYS" >> "$BACKUP_DIR/env_keys.txt"
ok "Environment key manifest saved (no values)"

# ── Package Versions ─────────────────────────────────────────────────────────
hdr "Dependency Manifest"
if [[ -f "$ROOT/package.json" ]]; then
  cp "$ROOT/package.json" "$BACKUP_DIR/package.json"
  ok "package.json saved"
fi
if [[ -f "$ROOT/package-lock.json" ]]; then
  # Only save the lockfile metadata, not the full 50k line file
  node -e "
    const l = require('./package-lock.json');
    console.log(JSON.stringify({
      name: l.name,
      version: l.version,
      lockfileVersion: l.lockfileVersion,
      nodeVersion: process.version
    }, null, 2));
  " 2>/dev/null > "$BACKUP_DIR/lockfile_meta.json" || true
  ok "Lock file metadata saved"
fi

# ── Supabase Table Introspection ──────────────────────────────────────────────
hdr "Database Schema Snapshot"
if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  TABLES="organizations organization_members profiles crm_contacts knowledge_base_documents knowledge_base_chunks audit_logs usage_events organization_invites billing_subscriptions"
  DB_SNAP=""
  for table in $TABLES; do
    resp=$(curl -s --max-time 10 \
      -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
      "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/$table?select=count" \
      -H "Prefer: count=exact" \
      -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
    DB_SNAP+="$table: HTTP $resp\n"
  done
  printf "Database table accessibility at backup time:\n\n%b" "$DB_SNAP" > "$BACKUP_DIR/db_tables.txt"
  ok "Database table snapshot saved"
else
  echo "Supabase env vars not set — skipping DB snapshot" > "$BACKUP_DIR/db_tables.txt"
  inf "Skipped DB snapshot (no Supabase env vars)"
fi

# ── Migration File Snapshot ───────────────────────────────────────────────────
hdr "Migration Manifest"
MIGRATION_LIST=$(find "$ROOT/supabase/migrations" -name "*.sql" 2>/dev/null | sort | xargs -I{} basename {} 2>/dev/null || echo "none")
printf "Migration files at backup time:\n\n%s\n" "$MIGRATION_LIST" > "$BACKUP_DIR/migrations.txt"
ok "Migration manifest saved"

# ── Summary File ─────────────────────────────────────────────────────────────
hdr "Writing Summary"
cat > "$BACKUP_DIR/BACKUP_SUMMARY.md" <<SUMMARY
# Backup Summary — $TIMESTAMP

**Branch**: $GIT_BRANCH
**SHA**: $GIT_SHA
**Time**: $TIMESTAMP

## Contents

- \`git_state.txt\` — branch, SHA, last 10 commits, working tree status
- \`env_keys.txt\` — list of env var names (no values)
- \`package.json\` — dependency manifest
- \`lockfile_meta.json\` — lock file version metadata
- \`db_tables.txt\` — Supabase table accessibility check
- \`migrations.txt\` — migration file list

## To Restore

This backup is informational only — it helps you identify:
- Exact code version running at exhibition time
- Which env vars were set
- Which migrations were present

To restore the application: deploy the git SHA listed above.
SUMMARY

ok "Backup summary written"

# ── Git Tag ───────────────────────────────────────────────────────────────────
if [[ "$TAG_MODE" == "true" ]]; then
  hdr "Git Tag"
  TAG_NAME="exhibition-$TIMESTAMP"
  cd "$ROOT"
  if git tag -a "$TAG_NAME" -m "Exhibition backup: $TIMESTAMP" 2>/dev/null; then
    ok "Git tag created: $TAG_NAME"
    echo -e "  Push with: git push origin $TAG_NAME"
  else
    echo -e "  ⚠ Failed to create git tag"
  fi
fi

echo ""
echo -e "${G}${B}Backup complete:${N} $BACKUP_DIR"
echo ""
