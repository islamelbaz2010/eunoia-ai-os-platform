# Eunoia AI OS

AI Operating System for hotels, resorts, hospitality groups, and diving centers
across Egypt, the UAE, and Saudi Arabia.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase dashboard
   - `SUPABASE_SERVICE_ROLE_KEY` (secret key, server-side only)
   - `OPENAI_API_KEY`

2. Apply the migrations to your Supabase project via the SQL editor or Supabase CLI:
   - `supabase/migrations/0001_init.sql` — schema, RLS policies, helper functions
   - `supabase/migrations/0002_rag_invites.sql` — vector index, `match_kb_chunks` RPC, org invites
   - `supabase/migrations/0003_grants.sql` — table grants for `service_role` and `authenticated`

3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

Integration scripts are in `scripts/`:

```bash
# Verify OpenAI connectivity and embedding generation
node scripts/test-openai.js

# Verify full RAG pipeline: Supabase, embeddings, chunk insert, vector search, GPT-4o-mini, audit logs
node scripts/test-rag.js
```

Both scripts load `.env.local` automatically — no manual `export` needed.

## Phase 1 scope

- Authentication (Supabase Auth)
- Organizations & RBAC (`owner` / `admin` / `member` / `viewer`)
- Dashboard shell with KPI overview
- CRM
- Knowledge Base with document ingestion
- RAG Assistant (pgvector similarity search + GPT-4o-mini)
- Audit Logs
- Usage Tracking
- Super Admin

## Architecture notes

- Next.js 16 App Router. Route protection lives in `src/lib/supabase/proxy.ts`
  (Next 16 renamed Middleware to Proxy).
- Supabase clients: `src/lib/supabase/client.ts` (browser),
  `src/lib/supabase/server.ts` (server components/actions).
- Auth/session/role lookups are centralized in `src/lib/auth/dal.ts`.
- Authorization is enforced primarily via Postgres Row Level Security
  (see the migration); the proxy/DAL checks are optimistic, not the source of
  truth.
