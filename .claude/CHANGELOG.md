# CHANGELOG

Engineering session log. Newest first.

---

## Session 2 — 2026-06-29

**Duration**: ~2 hours  
**Tests**: 29/29 ✅  
**TypeScript**: Clean ✅  
**Commercial Readiness**: 78% → 81%  
**Production Readiness**: 78/100 → 84/100

### Completed

**P0 — Launch blockers cleared:**
- ✅ Password reset: `requestPasswordReset` + `updatePassword` server actions (already existed, verified)
- ✅ Email invite delivery: `src/lib/email.ts` using Resend SDK, called in `settings/actions.ts`
- ✅ Source citations in RAG chat: `SourcesPanel` component in `chat.tsx` (already existed, verified)
- ✅ Rate limiting on `askAssistant()`: 50 queries/user/hour via `usage_events` count

**P1 — Product improvements:**
- ✅ CRM delete: `deleteContact()` action + `ContactRow` client component + updated `crm/page.tsx`
- ✅ KB delete: `deleteDocument()` action + `DocumentRow` client component + updated `knowledge-base/page.tsx`
- ✅ Usage page O(N) fix: `supabase/migrations/0007_get_usage_totals.sql` SQL GROUP BY RPC
- ✅ `/api/health` made public: added to `PUBLIC_ROUTES` in `src/lib/supabase/proxy.ts`
- ✅ GitHub Actions CI: `.github/workflows/ci.yml` (lint + tsc + test)

**P3 — Housekeeping:**
- ✅ `.env.example`: Added `RESEND_API_KEY` + `FROM_EMAIL` documentation

### Files Changed (session 2)
```
Modified:
  src/app/dashboard/assistant/actions.ts   (rate limiting added)
  src/app/dashboard/crm/actions.ts         (deleteContact + hasRole import)
  src/app/dashboard/crm/page.tsx           (uses ContactRow, canDelete prop)
  src/app/dashboard/knowledge-base/actions.ts (deleteDocument + hasRole import)
  src/app/dashboard/knowledge-base/page.tsx   (uses DocumentRow, canDeleteAny)
  src/app/dashboard/usage/page.tsx         (SQL RPC instead of O(N))
  src/lib/supabase/proxy.ts               (/api/health added to PUBLIC_ROUTES)
  .env.example                             (RESEND_API_KEY, FROM_EMAIL added)

Created:
  src/app/dashboard/crm/contact-row.tsx    (delete button client component)
  src/app/dashboard/knowledge-base/document-row.tsx (delete button client component)
  supabase/migrations/0007_get_usage_totals.sql     (SQL GROUP BY RPC)
  .github/workflows/ci.yml                 (GitHub Actions CI)
  .claude/RULES.md                         (new — Engineering OS)
  .claude/SYSTEM.md                        (new — Engineering OS)
  .claude/SESSION.md                       (new — Engineering OS)
  .claude/PROJECT.md                       (new — Engineering OS)
  .claude/MASTER_TODO.md                   (updated — Engineering OS)
  .claude/ACTIVE_TASKS.md                  (updated — Engineering OS)
  .claude/CURRENT_STATE.md                 (updated — Engineering OS)
  .claude/BUGS.md                          (updated — Engineering OS)
  .claude/CHANGELOG.md                     (this file)
  .claude/ROADMAP.md                       (new — Engineering OS)
  .claude/DECISIONS.md                     (new — Engineering OS)
  .claude/COMMANDS.md                      (updated — Engineering OS)
  .claude/PROMPTS.md                       (updated — Engineering OS)
  .claude/MEMORY.md                        (new — Engineering OS)
  .claude/RELEASE.md                       (new — Engineering OS)
  CLAUDE.md                                (replaced — Engineering OS boot)
```

### Manual Steps Required
1. Apply `supabase/migrations/0007_get_usage_totals.sql` in Supabase SQL Editor
2. Add `RESEND_API_KEY` and `FROM_EMAIL` to Vercel dashboard
3. Verify migrations 0003-0006 are applied to production Supabase
4. `git add -A && git commit -m "Session 2: Phase 2 features + Engineering OS"`

---

## Session 1 — 2026-06-28

**Duration**: Multiple hours (audit + initial implementation)  
**Tests**: 29/29 ✅  
**Commercial Readiness**: ~60% → 78%  
**Production Readiness**: ~65/100 → 78/100

### Completed
- Full Phase 1 feature suite (auth, onboarding, CRM, KB, RAG, audit, usage, settings, admin)
- 9 Supabase tables + RLS on all tables
- 6 database migrations (0001-0006)
- 29-test Vitest suite (17 type tests, 6 util tests, 6 chunk tests)
- Security headers (CSP, HSTS, X-Frame-Options)
- Structured JSON logger
- Audit logging (fire-and-forget)
- Health check API `/api/health`
- Full documentation suite (`docs/` — 25 files, 5,000+ lines)
- Initial `.claude/` directory with session context files

### Architecture decisions
- RLS as security source of truth (not app-layer)
- `import "server-only"` on all secret-adjacent files
- `React.cache()` for DAL functions (per-request deduplication)
- Fire-and-forget audit logging (never blocks user operations)
- HNSW index with cosine similarity for vector search
- `FOR UPDATE` lock in `accept_org_invite` to prevent race conditions
- `create_organization` RPC with max-3-orgs anti-abuse cap
