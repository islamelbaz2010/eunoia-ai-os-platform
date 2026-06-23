# Eunoia AI OS

AI Operating System for hotels, resorts, hospitality groups, and diving centers
across Egypt, the UAE, and Saudi Arabia.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase project credentials.
2. Run the migration in `supabase/migrations/0001_init.sql` against your Supabase
   project (via the SQL editor or the Supabase CLI) to create the organizations,
   RBAC, CRM, Knowledge Base, audit log, and usage tracking schema.
3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 scope

- Authentication (Supabase Auth)
- Organizations & RBAC (`owner` / `admin` / `member` / `viewer`)
- Dashboard shell with KPI overview
- CRM
- Knowledge Base
- RAG Assistant (UI scaffold; retrieval pipeline pending)
- Audit Logs
- Usage Tracking
- Super Admin

## Architecture notes

- Next.js 16 App Router. Route protection lives in `proxy.ts` (Next 16 renamed
  Middleware to Proxy) and `src/lib/supabase/proxy.ts`.
- Supabase clients: `src/lib/supabase/client.ts` (browser),
  `src/lib/supabase/server.ts` (server components/actions).
- Auth/session/role lookups are centralized in `src/lib/auth/dal.ts`.
- Authorization is enforced primarily via Postgres Row Level Security
  (see the migration); the proxy/DAL checks are optimistic, not the source of
  truth.
