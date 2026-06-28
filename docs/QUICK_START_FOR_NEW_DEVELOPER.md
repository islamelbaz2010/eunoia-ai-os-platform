# Quick Start for New Developer
## Eunoia AI OS — Productive in 60 Minutes

---

## What You're Working On

A multi-tenant SaaS platform for MENA hospitality (hotels, diving centers). Core features: AI Knowledge Base with RAG assistant, CRM, team management, audit logs. Built with Next.js 16, Supabase, and OpenAI.

---

## Step 1 — Environment Setup (15 min)

**Prerequisites**: Node 20+, npm, Supabase account, OpenAI API key

```bash
# Clone and install
git clone https://github.com/islamelbaz2010/eunoia-ai-os-platform.git
cd eunoia-ai-os-platform
npm install

# Set up environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY
```

**Your `.env.local` needs:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. It is for local scripts only.**

---

## Step 2 — Set Up Supabase (15 min)

1. Create a new Supabase project at supabase.com
2. Enable the `vector` extension: **Database → Extensions → vector → Enable**
3. Apply all 6 migrations in order via **Database → SQL Editor**:
   - Paste and run `supabase/migrations/0001_init.sql`
   - Paste and run `supabase/migrations/0002_rag_invites.sql`
   - Paste and run `supabase/migrations/0003_grants.sql`
   - Paste and run `supabase/migrations/0004_indexes_policies.sql`
   - Paste and run `supabase/migrations/0005_schema_hardening.sql`
   - Paste and run `supabase/migrations/0006_hardening_v2.sql`
4. Set Auth **Site URL** to `http://localhost:3000`
5. Add `http://localhost:3000/auth/callback` to Auth **Redirect URLs**

---

## Step 3 — Run and Verify (10 min)

```bash
npm run dev          # Start dev server → http://localhost:3000
npm test             # Should show: 3 test files | 29 tests | all pass
```

**Test the core flow:**
1. Sign up at `localhost:3000/signup`
2. Create your organization in onboarding
3. Go to `/dashboard/knowledge-base` → add a document (paste any text)
4. Go to `/dashboard/assistant` → ask a question about the text

If the assistant answers with a citation ([1], [2]...), the entire stack is working.

---

## Critical Things to Know Before Writing Any Code

### 1. This is NOT standard Next.js

Next.js 16 has breaking changes:

| Old (Next.js 15 and earlier) | New (Next.js 16) |
|-----------------------------|-----------------|
| `middleware.ts` | `proxy.ts` |
| `export function middleware()` | `export function proxy()` |
| `useFormState` (React 18) | `useActionState` (React 19) |
| `import "tailwindcss/..."` (v3) | `@import "tailwindcss"` (v4) |
| `parsed.errors[0]?.message` (Zod 3) | `parsed.error.issues[0]?.message` (Zod v4) |

**Read `node_modules/next/dist/docs/` before using any Next.js API you're unsure about.**

### 2. Never bypass RLS

RLS (Row Level Security) is the security source of truth. The app has no meaningful auth checks beyond it. If you add a new table:
- Enable RLS on it immediately
- Add policies before any data goes in
- Test with a real user, not the service_role key

### 3. Server-only files have `import "server-only"` at the top

Files: `openai.ts`, `ingest.ts`, `audit.ts`, `dal.ts`, `env.ts`, `server.ts`

If you accidentally import any of these from a Client Component, the build will throw. This is intentional — it prevents API keys leaking to the browser.

### 4. All forms use `useActionState`, not `useFormState`

```typescript
// Client Component pattern
"use client"
const [state, action, pending] = useActionState(serverAction, undefined)
return <form action={action}>
  <button disabled={pending}>{pending ? "Loading..." : "Submit"}</button>
  {state?.error && <p className="text-red-500">{state.error}</p>}
</form>
```

### 5. Audit logging is fire-and-forget

```typescript
// Always use void — failures must never block the user
void logAuditEvent({ organization_id, actor_id, action, target_type, target_id })
void logUsageEvent({ organization_id, actor_id, event_type, quantity: 1 })
```

### 6. Error messages never expose internals

- `error.tsx` shows `error.digest` (a hash) not `error.message`
- Server Actions return generic strings: `"Failed to create contact"`, not Postgres constraint text
- `/invite` shows `"Invite invalid or expired"` regardless of the specific DB error

---

## Adding a New Feature — Checklist

```markdown
Before writing code:
[ ] Read the existing file you'll modify
[ ] Understand which Supabase client to use (server.ts vs client.ts)

Server Action:
[ ] Call verifySession() first
[ ] Call getActiveOrganization() if org-scoped
[ ] Validate all inputs with Zod (v4 API)
[ ] Check hasRole() for admin-only operations
[ ] Use void logAuditEvent() after success
[ ] Use void logUsageEvent() for user-facing actions
[ ] Call revalidatePath() after mutations

Database:
[ ] New tables must have RLS enabled
[ ] New columns: run a migration (0007_*, 0008_*, etc.)
[ ] Test policies with a non-owner user before committing

Files with import "server-only":
[ ] Cannot be imported in Client Components
[ ] Add it to any new file that touches secrets or Supabase server client

Before committing:
[ ] npx tsc --noEmit (must pass)
[ ] npm run lint (must pass)
[ ] npm test (must show 29/29 passing)
```

---

## Key Files to Know

| File | What it does |
|------|-------------|
| `proxy.ts` | Runs on every request — session refresh + route protection |
| `src/lib/auth/dal.ts` | Get current user/org — always call this, don't query Supabase directly |
| `src/lib/auth/audit.ts` | `logAuditEvent` + `logUsageEvent` — fire-and-forget |
| `src/lib/ai/openai.ts` | OpenAI singleton — use `embedText()` and `embedTexts()` |
| `src/lib/ai/ingest.ts` | `ingestDocument()` — chunks + embeds + stores |
| `src/lib/types.ts` | `hasRole()`, `ROLE_RANK`, `OrgRole` — RBAC logic |
| `src/lib/logger.ts` | Structured logger — use instead of `console.error` |
| `src/lib/env.ts` | Server-only env validation — `env.OPENAI_API_KEY` |

---

## Common Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm test             # Run 29 unit tests
npm run build        # Production build (catches TS + import errors)
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check only

# Local integration tests (needs .env.local with SUPABASE_SERVICE_ROLE_KEY)
node scripts/test-openai.js    # Verify OpenAI connectivity
node scripts/test-rag.js       # Full RAG pipeline integration test

# Apply migrations (Supabase Dashboard SQL Editor only — no CLI configured)
# See supabase/migrations/000N_*.sql — paste in order
```

---

## Current Known Issues (don't be surprised by these)

| Issue | File | Status |
|-------|------|--------|
| No password reset | — | P0 — to be implemented |
| No email delivery for invites | `settings/actions.ts` | P0 — to be implemented |
| RAG sources not shown in UI | `assistant/chat.tsx` | P1 bug |
| `console.error` instead of `logger` | `knowledge-base/actions.ts:83`, `auth/callback/route.ts:18` | P1 bug |
| Usage page loads 10K rows | `usage/page.tsx` | P1 performance |
| Empty directory | `src/app/api/status/` | Delete when you see it |

See `docs/MASTER_TODO.md` for the complete prioritized task list.

---

## Get Help

- Full architecture: `docs/MASTER_CTO_HANDBOOK.md`
- Database details: `docs/06_DATABASE.md`
- AI pipeline: `docs/07_AI.md`
- Security model: `docs/08_SECURITY.md`
- API reference: `docs/19_API_REFERENCE.md`
- All known bugs + tasks: `docs/MASTER_TODO.md`
- Claude Code prompts for common tasks: `.claude/PROMPTS.md`
