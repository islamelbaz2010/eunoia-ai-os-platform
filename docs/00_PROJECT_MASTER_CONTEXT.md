# 00 — Project Master Context

> The single reference document for anyone joining this project cold.

---

## Identity

| Field | Value |
|-------|-------|
| Product name | Eunoia AI OS |
| Tagline | AI Operating System for Hospitality |
| Domain | eunoiaos.com |
| Target regions | Egypt, UAE, Saudi Arabia |
| Target market | Hotels, resorts, hospitality groups, diving centers |
| Guest languages supported | English, Arabic, Russian, Italian |

---

## Repositories

### Active: `eunoia-ai-os-platform`

| Attribute | Value |
|-----------|-------|
| Local path | `/Users/ahmed/Documents/eunoia-ai-os-platform` |
| GitHub | `https://github.com/islamelbaz2010/eunoia-ai-os-platform` |
| Branch | `main` |
| Status | **Production — live code** |
| Framework | Next.js 16.2.9 App Router |
| Node requirement | >=20.0.0 |

### Unused: `eunoia-ai-os-app`

| Attribute | Value |
|-----------|-------|
| Local path | `/Users/ahmed/Documents/eunoia-ai-os-app` |
| GitHub | `https://github.com/islamelbaz2010/eunoia-ai-os` |
| Status | **Empty `create-next-app` scaffold — never developed** |
| Contains | Default Next.js page, `eunoia-ai-os.xlsx` (business planning spreadsheet) |
| Action required | Either delete or develop as a mobile/marketing site |

Both repos share the same initial commit hash (`f6ab637`) — the app repo branched from the same Next.js scaffold but diverged immediately (platform got features; app repo got nothing).

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2.9 |
| React | React + React DOM | 19.2.4 |
| Language | TypeScript | ^5 |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth | — |
| Vector search | pgvector (via Supabase) | — |
| AI embeddings | OpenAI text-embedding-3-small | 1536 dims |
| AI chat | OpenAI gpt-4o-mini | — |
| OpenAI SDK | openai | ^6.44.0 |
| Supabase SDK | @supabase/supabase-js | ^2.108.2 |
| Supabase SSR | @supabase/ssr | ^0.12.0 |
| Styling | Tailwind CSS | ^4 |
| Icons | lucide-react | ^1.21.0 |
| Charts | recharts | ^3.8.1 |
| Validation | zod | ^4.4.3 |
| CSS utilities | clsx | ^2.1.1 |
| Testing | Vitest | ^4.1.9 |
| Test coverage | @vitest/coverage-v8 | ^4.1.9 |
| Deployment | Vercel | — |

---

## People

| Role | Identity |
|------|----------|
| Founder / Owner | Ahmed (islam.elbaz2010@gmail.com) |
| GitHub account | islamelbaz2010 |

---

## Key Architectural Facts

1. **Next.js 16 renamed Middleware to Proxy.** The file is `proxy.ts` at the repo root, not `middleware.ts`. The exported function is `proxy()`, not `middleware()`.

2. **RLS is the security source of truth.** Postgres Row Level Security enforces all data access. The `proxy.ts` and DAL (`dal.ts`) checks are optimistic convenience layers only — they improve UX (early redirects) but are not relied upon for security.

3. **Server-only imports.** All files that access secrets or server-only resources begin with `import "server-only"`. This is enforced: `openai.ts`, `ingest.ts`, `audit.ts`, `dal.ts`, `env.ts`, `server.ts`.

4. **React.cache() for deduplication.** DAL functions (`verifySession`, `getProfile`, `getMemberships`, `getActiveOrganization`) are wrapped in `cache()` so a single render pass never issues the same Supabase query twice.

5. **Fire-and-forget audit logging.** `logAuditEvent()` and `logUsageEvent()` in `audit.ts` are called with `void` — failures are swallowed and logged only, never surfaced to users.

6. **One active organization per session.** `getActiveOrganization()` returns `memberships[0]` — the first org the user belongs to. There is no org switcher in the current UI despite users being allowed to own up to 3 orgs.

7. **Content Security Policy is strict.** In production, `unsafe-eval` is removed from `script-src`. Supabase WSS and OpenAI API are in `connect-src`.

8. **Anti-abuse rate limit in DB.** `create_organization()` RPC enforces max 3 owned orgs per user at the Postgres level.

---

## Environment Variables (complete list)

| Variable | Location | Required | Purpose |
|----------|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Yes | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Yes (scripts only) | Full DB access, bypasses RLS |
| `OPENAI_API_KEY` | `.env.local` | Yes | OpenAI embeddings + chat |
| `NEXT_PUBLIC_APP_URL` | `.env.local` / Vercel | Yes (prod) | Canonical URL for OG/sitemap |

---

## Critical Files

| File | Purpose |
|------|---------|
| `proxy.ts` | Next.js 16 Proxy (replaces middleware) — session refresh + route protection |
| `src/lib/supabase/server.ts` | Server-side Supabase client (uses cookies) |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/proxy.ts` | `updateSession()` — token refresh logic for proxy |
| `src/lib/auth/dal.ts` | Data Access Layer — `verifySession`, `getProfile`, `getMemberships`, `getActiveOrganization` |
| `src/lib/auth/actions.ts` | Auth Server Actions — `login`, `signup`, `logout` |
| `src/lib/auth/audit.ts` | `logAuditEvent`, `logUsageEvent` — fire-and-forget |
| `src/lib/ai/openai.ts` | OpenAI client singleton + `embedText`, `embedTexts` |
| `src/lib/ai/chunk.ts` | `chunkText()` — 1000-char chunks, 150-char overlap |
| `src/lib/ai/ingest.ts` | `ingestDocument()` — chunk → embed → store |
| `src/lib/env.ts` | Server-only env variable validation |
| `src/lib/types.ts` | Shared TypeScript types + `hasRole()` + `ROLE_RANK` |
| `src/lib/utils.ts` | `slugify()` — org slug generation |
| `src/lib/logger.ts` | Structured JSON logger (Vercel-compatible) |
| `next.config.ts` | Security headers + Turbopack config |
| `supabase/migrations/` | 6 migrations — apply in order |

---

## Migration Order

All 6 migrations must be applied in order to a Supabase project:

| File | What it does |
|------|-------------|
| `0001_init.sql` | Schema, enums, RLS, triggers, helper functions |
| `0002_rag_invites.sql` | HNSW index, `match_kb_chunks` RPC, invite table + RLS |
| `0003_grants.sql` | Explicit GRANT statements for service_role + authenticated |
| `0004_indexes_policies.sql` | Performance indexes + missing DELETE/UPDATE policies |
| `0005_schema_hardening.sql` | FK ON DELETE SET NULL, `create_organization` RPC |
| `0006_hardening_v2.sql` | Role index, embedding NOT NULL, invite race-condition fix |

---

## Running Tests

```bash
# Unit tests (no network needed)
npm test

# Integration test — full RAG pipeline
node scripts/test-rag.js

# OpenAI connectivity check
node scripts/test-openai.js

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```
