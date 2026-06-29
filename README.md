# Eunoia AI OS

AI Operating System for hotels, resorts, hospitality groups, and diving centers
across Egypt, the UAE, and Saudi Arabia.

**Stack**: Next.js 16 · React 19 · TypeScript · Supabase (PostgreSQL + pgvector) · OpenAI · Tailwind CSS v4 · Resend

## Setup

1. Copy `.env.example` to `.env.local` and fill in credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=          # From Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # From Supabase project settings
OPENAI_API_KEY=                    # From platform.openai.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=                    # From resend.com (optional — invite emails)
FROM_EMAIL=                        # Verified Resend sender address
```

> `SUPABASE_SERVICE_ROLE_KEY` is for local scripts only — never add it to Vercel.

2. Apply all migrations to Supabase (SQL Editor, in order):

```
supabase/migrations/0001_init.sql             — tables, enums, RLS, triggers, helper functions
supabase/migrations/0002_rag_invites.sql      — HNSW index, match_kb_chunks RPC, invites
supabase/migrations/0003_grants.sql           — GRANT statements for authenticated role
supabase/migrations/0004_indexes_policies.sql — performance indexes, KB UPDATE/DELETE policies
supabase/migrations/0005_schema_hardening.sql — FK fixes, create_organization RPC
supabase/migrations/0006_hardening_v2.sql     — race condition fix, embedding NOT NULL, role index
supabase/migrations/0007_get_usage_totals.sql — SQL GROUP BY RPC for usage page
```

3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npx tsc --noEmit     # TypeScript check
npm run lint         # ESLint
npm test             # 29 unit tests
npm run build        # Production build
```

Integration scripts (require `.env.local`):

```bash
node scripts/test-openai.js   # Verify OpenAI API connectivity
node scripts/test-rag.js      # Full RAG pipeline end-to-end
```

## Features

- **Auth** — sign up, login, logout, password reset, PKCE callback
- **Organizations & RBAC** — `owner` / `admin` / `member` / `viewer` with team invites via email
- **Dashboard** — KPI overview with usage charts and CRM status breakdown
- **CRM** — create, view, and delete contacts; status tracking
- **Knowledge Base** — add and delete documents; auto-indexed with OpenAI embeddings
- **RAG Assistant** — vector search (HNSW cosine) → GPT-4o-mini → cited answers; rate-limited at 50 queries/user/hour
- **Audit Logs** — immutable per-org event trail
- **Usage Tracking** — per-event usage with SQL aggregation
- **Super Admin** — platform-wide organization view

## Architecture

- **Route protection**: `proxy.ts` at repo root (Next.js 16 renamed Middleware to Proxy)
- **Security**: Postgres Row Level Security is the primary access control boundary — all 9 tables have RLS enabled
- **Server-only**: `dal.ts`, `audit.ts`, `openai.ts`, `ingest.ts`, `env.ts`, `server.ts`, `email.ts` all use `import "server-only"`
- **Forms**: all mutations use Server Actions with `useActionState` (React 19)
- **Validation**: Zod v4 on all Server Action inputs (use `.issues[0]?.message`, not `.errors`)
- **Logging**: structured JSON via `src/lib/logger.ts`

## Deployment

Deploys automatically to Vercel on push to `main`. Requires Vercel Pro plan for the 60-second function timeout (RAG completions).

Required Vercel environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `FROM_EMAIL`.
