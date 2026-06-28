# COMMANDS — All Dev/Test/Deploy Commands

---

## Verification (Run Before Every Commit)

```bash
npx tsc --noEmit                    # TypeScript — 0 errors required
npm run lint                        # ESLint — 0 warnings required
npm test                            # Vitest — 29/29 required
```

Run all three in sequence:
```bash
npx tsc --noEmit && npm run lint && npm test
```

---

## Development

```bash
npm run dev                         # Start dev server (Turbopack, http://localhost:3000)
npm run build                       # Production build (catches import errors)
npm run start                       # Start production server locally
```

---

## Testing

```bash
npm test                            # Run 29 unit tests (no network)
npm run test:watch                  # Watch mode
npm run test:coverage               # Coverage report

# Integration tests (require .env.local with real credentials)
node scripts/test-openai.js         # Verify OpenAI API connectivity
node scripts/test-rag.js            # Full RAG pipeline (7 checks, ~10 seconds)

# Health check (requires dev server running)
curl http://localhost:3000/api/health
# → { "status": "ok", "ts": 1234567890, "checks": { "db": "ok" } }

# Production health check
curl https://eunoiaos.com/api/health
```

---

## Database

```bash
# Apply migrations (in Supabase SQL Editor — copy/paste each file content):
supabase/migrations/0001_init.sql
supabase/migrations/0002_rag_invites.sql
supabase/migrations/0003_grants.sql
supabase/migrations/0004_indexes_policies.sql
supabase/migrations/0005_schema_hardening.sql
supabase/migrations/0006_hardening_v2.sql
supabase/migrations/0007_get_usage_totals.sql    ← NEW — must apply

# Verify create_organization exists:
SELECT * FROM pg_proc WHERE proname = 'create_organization';

# Verify embedding column is NOT NULL:
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'knowledge_base_chunks' AND column_name = 'embedding';

# Create super admin (run in Supabase SQL Editor):
UPDATE public.profiles
SET is_super_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'islam.elbaz2010@gmail.com');

# Test rate limiting (check recent RAG queries for a user):
SELECT COUNT(*) FROM usage_events
WHERE actor_id = '[user_id]'
  AND event_type = 'rag_query'
  AND created_at > now() - interval '1 hour';
```

---

## Git

```bash
git status                          # Working tree (never use -uall)
git diff HEAD                       # All uncommitted changes
git log --oneline                   # Recent commits
git add supabase/migrations/        # Stage migration files
git add .github/                    # Stage CI workflow
git add src/ .claude/ CLAUDE.md .env.example  # Stage app files

# Commit everything (do NOT commit .env.local):
git add -A -- ':!.env.local'
git commit -m "Session 2: Phase 2 features + Engineering OS"
git push origin main
```

---

## Environment

```bash
cp .env.example .env.local          # Create local env file
# Edit .env.local with real credentials:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   OPENAI_API_KEY
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
#   RESEND_API_KEY=re_...           ← new
#   FROM_EMAIL=...                  ← new
```

---

## Deployment

**Vercel deploys automatically on push to `main`.**

Vercel dashboard environment variables required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
NEXT_PUBLIC_APP_URL=https://eunoiaos.com
RESEND_API_KEY=re_...              ← must add
FROM_EMAIL=Eunoia AI OS <noreply@eunoiaos.com>  ← must add
# DO NOT ADD: SUPABASE_SERVICE_ROLE_KEY
```

Instant rollback:
```
Vercel Dashboard → Deployments → Click previous deploy → Promote to Production
```

---

## Sentry Setup (Next P0 Task)

```bash
npx @sentry/wizard@latest -i nextjs
# Follow prompts — will modify next.config.ts and create src/instrumentation.ts
# Add SENTRY_DSN to Vercel environment variables after setup
```

---

## Useful One-Liners

```bash
# Find all console.error/log calls (should be 0):
grep -r "console\.\(error\|log\|warn\)" src/ --include="*.ts" --include="*.tsx"

# Find all TODO comments (should be 0 in production code):
grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"

# Check if clsx is truly unused:
grep -r "clsx" src/ --include="*.ts" --include="*.tsx"
# → Should return nothing

# List all untracked migration files:
git ls-files --others --exclude-standard supabase/migrations/

# List all files modified since last commit:
git diff --name-only HEAD
```
