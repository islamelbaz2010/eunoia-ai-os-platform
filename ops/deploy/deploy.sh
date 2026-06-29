#!/usr/bin/env bash
# ops/deploy/deploy.sh — Production deployment script for Eunoia AI OS
#
# Usage:
#   ./ops/deploy/deploy.sh [--env production|staging] [--skip-tests] [--force]
#
# Requirements:
#   - Node.js 20+, npm 9+
#   - PM2 installed globally: npm install -g pm2
#   - .env.local (or .env.production) present with all required variables
#   - App URL reachable after deploy (for health checks)
#
# What it does:
#   1. Verifies branch and clean git state
#   2. Validates environment variables
#   3. Installs dependencies (npm ci)
#   4. Runs lint, TypeScript, and all 29 tests
#   5. Builds Next.js production bundle
#   6. Backs up previous build
#   7. Restarts PM2 with new build
#   8. Verifies /api/live and /api/health
#   9. Rolls back automatically if health fails

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPS_DIR="$ROOT_DIR/ops"
DEPLOY_LOG_DIR="$ROOT_DIR/.deploy-logs"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEPLOY_LOG="$DEPLOY_LOG_DIR/deploy-$TIMESTAMP.log"
PREV_BUILD_BACKUP="$ROOT_DIR/.next-backup-$TIMESTAMP"

REQUIRED_BRANCH="main"
PM2_APP_NAME="eunoia"
HEALTH_TIMEOUT=60
HEALTH_RETRIES=12
HEALTH_INTERVAL=5

# ── Color output ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*" | tee -a "$DEPLOY_LOG"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${RESET}" | tee -a "$DEPLOY_LOG"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${RESET}" | tee -a "$DEPLOY_LOG"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${RESET}" | tee -a "$DEPLOY_LOG"; }
header()  { echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}" | tee -a "$DEPLOY_LOG"
            echo -e "${BOLD}${BLUE}  $*${RESET}" | tee -a "$DEPLOY_LOG"
            echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${RESET}\n" | tee -a "$DEPLOY_LOG"; }

# ── Argument parsing ─────────────────────────────────────────────────────────

ENV="production"
SKIP_TESTS=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)         ENV="$2";       shift 2 ;;
    --skip-tests)  SKIP_TESTS=true; shift ;;
    --force)       FORCE=true;     shift ;;
    -h|--help)
      echo "Usage: $0 [--env production|staging] [--skip-tests] [--force]"
      echo "  --env          Target environment (default: production)"
      echo "  --skip-tests   Skip test suite (NOT recommended for production)"
      echo "  --force        Skip branch and git state checks"
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# ── Rollback function ────────────────────────────────────────────────────────

ROLLBACK_NEEDED=false

rollback() {
  if [ "$ROLLBACK_NEEDED" = false ]; then
    return
  fi
  header "AUTOMATIC ROLLBACK TRIGGERED"
  error "Deployment failed — restoring previous build"

  if [ -d "$PREV_BUILD_BACKUP" ]; then
    log "Restoring previous .next build from $PREV_BUILD_BACKUP"
    rm -rf "$ROOT_DIR/.next"
    mv "$PREV_BUILD_BACKUP" "$ROOT_DIR/.next"
    success "Previous build restored"
  else
    warn "No backup found — cannot restore previous .next"
  fi

  if command -v pm2 &>/dev/null; then
    log "Restarting PM2 with restored build..."
    pm2 reload "$PM2_APP_NAME" --update-env 2>/dev/null || pm2 restart "$PM2_APP_NAME" 2>/dev/null || true
    sleep 5
    if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
      success "PM2 restarted with previous build"
    else
      error "PM2 restart failed — manual intervention required"
    fi
  fi

  echo "" | tee -a "$DEPLOY_LOG"
  error "DEPLOYMENT FAILED — ROLLBACK COMPLETE"
  error "Log: $DEPLOY_LOG"
  error "Check the log for root cause before re-deploying"
  exit 1
}

trap rollback EXIT

# ── Setup ────────────────────────────────────────────────────────────────────

mkdir -p "$DEPLOY_LOG_DIR"
cd "$ROOT_DIR"

header "EUNOIA AI OS — PRODUCTION DEPLOY"
log "Timestamp:   $TIMESTAMP"
log "Environment: $ENV"
log "Root:        $ROOT_DIR"
log "Log:         $DEPLOY_LOG"

# ── Step 1: Branch verification ───────────────────────────────────────────────

header "STEP 1 — Branch Verification"

if [ "$FORCE" = false ]; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$CURRENT_BRANCH" != "$REQUIRED_BRANCH" ]; then
    error "Must deploy from '$REQUIRED_BRANCH'. Currently on '$CURRENT_BRANCH'."
    error "Use --force to override (not recommended)."
    exit 1
  fi
  success "Branch: $CURRENT_BRANCH"

  # Verify no uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    error "Uncommitted changes detected. Commit or stash before deploying."
    git status --short | tee -a "$DEPLOY_LOG"
    exit 1
  fi
  success "Working tree clean"

  # Verify up to date with remote (if remote exists)
  if git remote get-url origin &>/dev/null; then
    git fetch origin --quiet
    LOCAL="$(git rev-parse HEAD)"
    REMOTE="$(git rev-parse origin/$REQUIRED_BRANCH 2>/dev/null || echo '')"
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
      warn "Local branch is behind origin/$REQUIRED_BRANCH"
      warn "Run: git pull origin $REQUIRED_BRANCH"
      if [ "$FORCE" = false ]; then
        error "Aborting. Use --force to deploy anyway."
        exit 1
      fi
    fi
    success "Up to date with remote"
  fi
else
  warn "Branch/git checks skipped (--force)"
fi

COMMIT_SHA="$(git rev-parse --short HEAD)"
log "Deploying commit: $COMMIT_SHA"

# ── Step 2: Environment validation ───────────────────────────────────────────

header "STEP 2 — Environment Validation"

if [ -f "$OPS_DIR/scripts/validate-env.sh" ]; then
  bash "$OPS_DIR/scripts/validate-env.sh" --quiet 2>&1 | tee -a "$DEPLOY_LOG"
  if [ "${PIPESTATUS[0]}" -ne 0 ]; then
    error "Environment validation failed"
    exit 1
  fi
  success "Environment validated"
else
  warn "validate-env.sh not found — skipping env check"
fi

# ── Step 3: Install dependencies ─────────────────────────────────────────────

header "STEP 3 — Dependencies"

log "Running npm ci..."
npm ci --prefer-offline 2>&1 | tee -a "$DEPLOY_LOG"
success "Dependencies installed"

# ── Step 4: Lint ─────────────────────────────────────────────────────────────

header "STEP 4 — Lint"

log "Running ESLint..."
npm run lint 2>&1 | tee -a "$DEPLOY_LOG"
success "Lint passed"

# ── Step 5: TypeScript ────────────────────────────────────────────────────────

header "STEP 5 — TypeScript"

log "Running tsc --noEmit..."
npx tsc --noEmit 2>&1 | tee -a "$DEPLOY_LOG"
success "TypeScript: 0 errors"

# ── Step 6: Tests ─────────────────────────────────────────────────────────────

header "STEP 6 — Tests"

if [ "$SKIP_TESTS" = true ]; then
  warn "Tests SKIPPED (--skip-tests). This is unsafe for production."
else
  log "Running test suite..."
  npm test 2>&1 | tee -a "$DEPLOY_LOG"
  success "All tests passed"
fi

# ── Step 7: Build ─────────────────────────────────────────────────────────────

header "STEP 7 — Build"

# Back up previous build before overwriting
if [ -d "$ROOT_DIR/.next" ]; then
  log "Backing up previous build to $PREV_BUILD_BACKUP"
  cp -r "$ROOT_DIR/.next" "$PREV_BUILD_BACKUP"
  success "Previous build backed up"
  ROLLBACK_NEEDED=true
fi

log "Running next build..."
BUILD_VERSION="$COMMIT_SHA" npm run build 2>&1 | tee -a "$DEPLOY_LOG"
success "Build complete"

# ── Step 8: Deploy log entry ──────────────────────────────────────────────────

header "STEP 8 — Deploy Log"

DEPLOY_RECORD="$DEPLOY_LOG_DIR/history.jsonl"
cat >> "$DEPLOY_RECORD" <<EOF
{"ts":"$TIMESTAMP","commit":"$COMMIT_SHA","env":"$ENV","status":"deploying","log":"$DEPLOY_LOG"}
EOF
success "Deploy record written to $DEPLOY_RECORD"

# ── Step 9: Restart PM2 ───────────────────────────────────────────────────────

header "STEP 9 — PM2 Restart"

if ! command -v pm2 &>/dev/null; then
  warn "PM2 not found — skipping process restart"
  warn "Start manually: pm2 start ecosystem.config.js --env $ENV"
else
  log "Checking PM2 process state..."
  if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
    log "Reloading PM2 (zero-downtime)..."
    pm2 reload "$PM2_APP_NAME" --update-env 2>&1 | tee -a "$DEPLOY_LOG"
    success "PM2 reloaded"
  else
    log "Starting PM2 process for the first time..."
    pm2 start "$ROOT_DIR/ecosystem.config.js" --env "$ENV" 2>&1 | tee -a "$DEPLOY_LOG"
    success "PM2 started"
  fi

  pm2 save 2>&1 | tee -a "$DEPLOY_LOG"
  success "PM2 state saved"
fi

# ── Step 10: Health verification ──────────────────────────────────────────────

header "STEP 10 — Health Verification"

# Determine base URL
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
APP_URL="${APP_URL%/}"  # strip trailing slash

log "Waiting for application to come up..."
sleep 5

# Liveness check
log "Checking /api/live..."
LIVE_OK=false
for i in $(seq 1 $HEALTH_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/api/live" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    LIVE_OK=true
    success "/api/live → HTTP $HTTP_CODE ✓"
    break
  fi
  log "Attempt $i/$HEALTH_RETRIES: /api/live → HTTP $HTTP_CODE (waiting...)"
  sleep $HEALTH_INTERVAL
done

if [ "$LIVE_OK" = false ]; then
  error "/api/live did not return 200 after $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
  exit 1
fi

# Readiness check
log "Checking /api/health..."
HEALTH_OK=false
for i in $(seq 1 $HEALTH_RETRIES); do
  RESPONSE=$(curl -s --max-time 15 "$APP_URL/api/health" 2>/dev/null || echo '{"healthy":false}')
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$APP_URL/api/health" 2>/dev/null || echo "000")
  HEALTHY=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('healthy',False)).lower())" 2>/dev/null || echo "false")

  if [ "$HTTP_CODE" = "200" ] && [ "$HEALTHY" = "true" ]; then
    HEALTH_OK=true
    success "/api/health → HTTP $HTTP_CODE, healthy=true ✓"
    break
  fi
  log "Attempt $i/$HEALTH_RETRIES: /api/health → HTTP $HTTP_CODE, healthy=$HEALTHY (waiting...)"
  sleep $HEALTH_INTERVAL
done

if [ "$HEALTH_OK" = false ]; then
  error "/api/health did not return healthy=true after $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
  error "Last response: $RESPONSE"
  exit 1
fi

# ── Step 11: Finalize ─────────────────────────────────────────────────────────

header "DEPLOYMENT SUCCESSFUL"

# Update deploy history record
sed -i.bak "s/\"status\":\"deploying\"/\"status\":\"success\"/" "$DEPLOY_RECORD" 2>/dev/null || true

# Clean up old backup (deploy succeeded)
if [ -d "$PREV_BUILD_BACKUP" ]; then
  rm -rf "$PREV_BUILD_BACKUP"
  log "Previous build backup cleaned up"
fi

ROLLBACK_NEEDED=false  # Disable rollback trap — deploy succeeded

success "Commit:      $COMMIT_SHA"
success "Environment: $ENV"
success "App URL:     $APP_URL"
success "Log:         $DEPLOY_LOG"

echo ""
echo -e "${GREEN}${BOLD}  Eunoia AI OS is live.${RESET}"
echo ""
