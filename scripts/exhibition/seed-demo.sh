#!/usr/bin/env bash
# =============================================================================
# scripts/exhibition/seed-demo.sh
# Eunoia AI OS — Demo account seeder (shell wrapper)
#
# Delegates to seed-demo.ts for the actual seeding.
# This wrapper ensures the correct working directory and provides a clean
# interface for non-technical users.
#
# Usage:
#   ./scripts/exhibition/seed-demo.sh              # seed demo data
#   ./scripts/exhibition/seed-demo.sh --dry-run    # preview without writing
#   ./scripts/exhibition/seed-demo.sh --reset      # delete and re-seed
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check tsx is available
if ! command -v npx &>/dev/null; then
  echo "✗ npx not found. Install Node.js first."
  exit 1
fi

# Check .env.local exists
if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "✗ .env.local not found."
  echo "  Copy .env.example to .env.local and fill in your values."
  exit 1
fi

# Check required env vars
source /dev/stdin <<'EOF'
set +u
source_env() {
  while IFS= read -r line; do
    line="${line%%#*}"; line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" != *=* ]] && continue
    key="${line%%=*}"; val="${line#*=}"
    val="${val%\"}" ; val="${val#\"}"
    val="${val%\'}" ; val="${val#\'}"
    export "$key=$val" 2>/dev/null || true
  done < "$1"
}
EOF

# source manually since POSIX doesn't allow function-based export in subshell
while IFS= read -r line; do
  line="${line%%#*}"; line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" || "$line" != *=* ]] && continue
  key="${line%%=*}"; val="${line#*=}"
  val="${val%\"}" ; val="${val#\"}"
  val="${val%\'}" ; val="${val#\'}"
  export "$key=$val" 2>/dev/null || true
done < "$ROOT/.env.local"

MISSING=()
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && MISSING+=("SUPABASE_SERVICE_ROLE_KEY")
[[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]  && MISSING+=("NEXT_PUBLIC_SUPABASE_URL")
[[ -z "${OPENAI_API_KEY:-}" ]]            && MISSING+=("OPENAI_API_KEY")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "✗ Missing required environment variables in .env.local:"
  for v in "${MISSING[@]}"; do echo "    $v"; done
  echo ""
  echo "  SUPABASE_SERVICE_ROLE_KEY: Get from Supabase Dashboard → Project Settings → API"
  echo "  OPENAI_API_KEY: Get from platform.openai.com"
  exit 1
fi

echo ""
echo "Running exhibition demo seeder..."
echo ""

cd "$ROOT"
npx tsx scripts/exhibition/seed-demo.ts "$@"
