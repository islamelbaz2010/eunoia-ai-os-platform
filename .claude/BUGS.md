# BUGS

**Updated**: 2026-06-29  
**Format**: ID | Severity | File:Line | Status | Fix

---

## OPEN — Must Fix Before Launch

### BUG-001: Migrations 0003-0007 not committed to git
- **Severity**: CRITICAL
- **File**: `supabase/migrations/` (0003-0007 are untracked)
- **Impact**: Migration files exist on disk but not in GitHub. Disk failure = unrecoverable schema loss.
- **Fix**: `git add supabase/migrations/ && git commit -m "Add migrations 0003-0007"`
- **Effort**: 30 min

### BUG-002: Migration 0007 not applied to production Supabase
- **Severity**: HIGH
- **File**: `supabase/migrations/0007_get_usage_totals.sql`
- **Impact**: Usage page calls `get_usage_totals` RPC that doesn't exist → shows no data
- **Fix**: Apply migration in Supabase SQL Editor
- **Effort**: 5 min manual

### BUG-003: RESEND_API_KEY not set in Vercel
- **Severity**: HIGH
- **File**: `src/lib/email.ts:8`
- **Impact**: `getResendClient()` returns null → invite emails silently skipped, warning logged
- **Fix**: Add `RESEND_API_KEY` to Vercel environment variables
- **Effort**: 5 min manual

---

## OPEN — High Priority

### BUG-004: Empty `src/app/api/status/` directory
- **Severity**: MEDIUM
- **File**: `src/app/api/status/` (empty)
- **Impact**: Creates false expectation of a `/api/status` endpoint
- **Fix**: `rm -rf src/app/api/status/`
- **Effort**: 2 min

### BUG-005: Wrong `package.json` name
- **Severity**: LOW
- **File**: `package.json:2`
- **Impact**: Shows `"eunoia-ai-os-app"` (inherited from Create Next App scaffold)
- **Fix**: Change to `"eunoia-ai-os-platform"`
- **Effort**: 2 min

### BUG-006: Unused `clsx` dependency
- **Severity**: LOW
- **File**: `package.json`
- **Impact**: Dead dependency. Zero imports anywhere in source.
- **Fix**: `npm uninstall clsx` (verify with `grep -r "clsx" src/` first)
- **Effort**: 2 min

### BUG-007: PWA icons missing
- **Severity**: MEDIUM
- **File**: `src/app/manifest.ts` references `public/icon.png` and `public/icon-512.png` (neither exists)
- **Impact**: PWA installation broken, browser shows broken icon
- **Fix**: Create `public/icon.png` (192×192) + `public/icon-512.png` (512×512)
- **Effort**: 1 hour

### BUG-008: Default Next.js favicon
- **Severity**: LOW
- **File**: `src/app/favicon.ico`
- **Impact**: Browser tab shows Next.js default "N" icon instead of Eunoia brand
- **Fix**: Replace with branded favicon
- **Effort**: 30 min

### BUG-009: Dead scaffold SVGs in `public/`
- **Severity**: LOW
- **Files**: `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
- **Impact**: Dead files, not referenced by any source
- **Fix**: `rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg`
- **Effort**: 2 min

---

## OPEN — Product Gaps (Not bugs, missing features)

### BUG-010: No Sentry error monitoring
- **Severity**: HIGH (production risk)
- **Impact**: Errors in production are invisible. Only Vercel logs are available.
- **Fix**: `npx @sentry/wizard@latest -i nextjs` + add DSN to Vercel
- **Effort**: 4 hours

### BUG-011: Org switcher missing
- **Severity**: MEDIUM
- **File**: `src/lib/auth/dal.ts:54` — `return memberships[0] ?? null`
- **Impact**: Users with 2+ org memberships always operate in their first org
- **Fix**: Store active org in cookie; add switcher UI to dashboard header
- **Effort**: 1 day

### BUG-012: No chat persistence
- **Severity**: MEDIUM
- **File**: `src/app/dashboard/assistant/chat.tsx` — `useState<Message[]>([])`
- **Impact**: Refreshing loses all conversation history
- **Fix**: New `chat_messages` table + server-side storage
- **Effort**: 2 days

### BUG-013: No pagination on tables
- **Severity**: MEDIUM
- **Impact**: CRM silently truncates at 200 contacts, KB at 100 docs, Audit Logs at 50
- **Fix**: Cursor-based pagination on all 4 tables
- **Effort**: 1 day

---

## CLOSED — Fixed

| ID | Bug | Fixed In | Session |
|----|-----|---------|---------|
| B-F1 | `console.error` in `knowledge-base/actions.ts:83` | Already using `logger.error` | Pre-existing |
| B-F2 | `console.error` in `auth/callback/route.ts:18` | Already using `logger.error` | Pre-existing |
| B-F3 | RAG sources not displayed in chat UI | `SourcesPanel` in `chat.tsx` | Session 2 |
| B-F4 | Usage page O(N) JS aggregation (10K rows) | Migration 0007 + RPC call | Session 2 |
| B-F5 | `/api/health` required auth (broke uptime monitors) | Added to `PUBLIC_ROUTES` | Session 2 |
| B-F6 | No password reset | `requestPasswordReset` + `updatePassword` actions | Session 2 |
| B-F7 | Invite emails never sent | Resend SDK in `src/lib/email.ts` | Session 2 |
| B-F8 | No rate limiting on RAG queries (cost abuse risk) | 50/user/hour check | Session 2 |
| B-F9 | No delete on CRM contacts | `deleteContact` + `ContactRow` | Session 2 |
| B-F10 | No delete on KB documents | `deleteDocument` + `DocumentRow` | Session 2 |
| B-F11 | `RESEND_API_KEY`/`FROM_EMAIL` not in `.env.example` | Added to `.env.example` | Session 2 |
