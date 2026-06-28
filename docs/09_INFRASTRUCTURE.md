# 09 — Infrastructure

## Deployment Platform: Vercel

The application is designed for Vercel deployment (evidenced by `.vercelignore`, Vercel-specific README mention, and `next.config.ts` patterns).

### Vercel Configuration

**`.vercelignore`** excludes from deployment:
```
scripts/         ← integration test scripts (not needed at runtime)
supabase/        ← SQL migration files (not executed by Vercel)
.claude/         ← Claude Code settings
*.local          ← local env files
.env.local / .env.*.local
.nvmrc
```

**`.nvmrc`**: Node 20 (matches `engines: { node: ">=20.0.0" }` in `package.json`)

### Vercel Environment Variables Required

Must be set in the Vercel dashboard (not committed to git):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | **Only needed for scripts; do not add to Vercel** |
| `OPENAI_API_KEY` | From OpenAI platform |
| `NEXT_PUBLIC_APP_URL` | e.g., `https://eunoiaos.com` |

**IMPORTANT**: `SUPABASE_SERVICE_ROLE_KEY` should NOT be added to Vercel environment variables — it is only used by local integration scripts. The Next.js application uses the anon key + RLS for all operations.

### Turbopack

`next.config.ts` enables Turbopack:
```typescript
turbopack: {
  root: __dirname,  // Required for monorepo-style setups and consistent path resolution
}
```

Turbopack is Next.js 16's default bundler. It is significantly faster than Webpack for development builds.

---

## Database Platform: Supabase

### Supabase Architecture

```
Supabase Project
├── PostgreSQL database (managed)
│   ├── auth schema (managed by Supabase Auth)
│   │   └── auth.users  ← source of truth for identities
│   └── public schema (our schema)
│       └── All our tables, functions, policies
├── PostgREST (auto-generated REST API)
│   └── Serves all table/RPC calls from the app
├── Supabase Auth (GoTrue)
│   └── JWT issuance, session management
├── Realtime (WebSockets)
│   └── Not currently used
└── Storage
    └── Not currently used
```

### Supabase Auth Configuration

The application uses email+password authentication. The `/auth/callback` route handles PKCE code exchange for OAuth/magic link flows (infrastructure is in place even if not currently enabled in the Supabase dashboard).

Key Supabase Auth settings to verify:
- **Email confirmation**: Should be enabled for production (if off, users don't verify email)
- **Session duration**: Default is 1 hour access token, 30-day refresh
- **PKCE flow**: Must be enabled for the `/auth/callback` route to work

### pgvector

The `vector` extension must be enabled in the Supabase project settings before running migrations. Supabase supports pgvector natively.

The HNSW index (`vector_cosine_ops`) is created in migration `0002_rag_invites.sql`. HNSW requires pgvector ≥ 0.5.0. Supabase's managed Postgres includes a recent version.

### Supabase Client Selection in the App

| Where | Client | Why |
|-------|--------|-----|
| Server Components + Actions | `@supabase/ssr` `createServerClient` | Reads cookies from Next.js `cookies()` |
| Browser / Client Components | `@supabase/ssr` `createBrowserClient` | Reads cookies from `document.cookie` |
| Proxy | `@supabase/ssr` `createServerClient` | Reads from `NextRequest.cookies` |
| Scripts | `@supabase/supabase-js` `createClient` | Service role key, bypasses RLS |

---

## Domain: eunoiaos.com

Referenced in:
- `src/app/layout.tsx` as `APP_URL` default
- `src/app/sitemap.ts` as `BASE_URL` default

**Pending**: Domain must be configured in Vercel project settings pointing to the deployed app.

---

## Environment Variable Flow

```
Local dev:
  .env.local (git-ignored) → process.env → src/lib/env.ts validation → usage

Production (Vercel):
  Vercel dashboard "Environment Variables" → process.env → src/lib/env.ts → usage
```

### env.ts Validation

```typescript
// src/lib/env.ts (server-only)
export const env = {
  get SUPABASE_URL() { return requireEnv("NEXT_PUBLIC_SUPABASE_URL") },
  get SUPABASE_ANON_KEY() { return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
  get OPENAI_API_KEY() { return requireEnv("OPENAI_API_KEY") },
}
```

This throws at access time (not import time) with a clear error message if a variable is missing. Used by `openai.ts` only. Supabase clients read env vars directly (Supabase SSR pattern).

---

## Logging

**File**: `src/lib/logger.ts`

Structured JSON logger compatible with Vercel's log aggregation:
```json
{ "level": "error", "message": "[audit] Failed...", "ts": "2026-06-28T...", "error": "..." }
```

- `error` and `warn` always log (production + development)
- `info` only logs in non-production
- `debug` only logs in development

**Log aggregation**: Ready for Datadog, Logtail, or Axiom — all can parse structured JSON from Vercel function logs. Sentry integration is pending (no DSN configured yet).

---

## Health Check

**Endpoint**: `GET /api/health`
**Force dynamic**: `export const dynamic = "force-dynamic"` (no caching)
**Timeout**: 3-second abort signal on Supabase ping

Use this endpoint for:
- Uptime monitoring (Uptime Robot, Better Uptime, etc.)
- Vercel deployment health checks
- Load balancer health checks

Expected response (healthy):
```json
{ "status": "ok", "ts": 1719561600000, "checks": { "db": "ok" } }
```

Expected response (Supabase down):
```json
{ "status": "degraded", "ts": 1719561600000, "checks": { "db": "unreachable" } }
// HTTP 503
```

---

## CDN / Static Assets

- Static files in `public/` are served by Vercel CDN
- Next.js `_next/static/` chunks are cached by Vercel CDN
- Images use Next.js `<Image>` component only in `eunoia-ai-os-app` (not in platform)
- Platform app uses raw `<img>` nowhere (no `next/image` usage in platform)

**Missing assets**:
- `public/icon.png` (192×192) — referenced by PWA manifest, NOT PRESENT
- `public/icon-512.png` (512×512) — referenced by PWA manifest, NOT PRESENT
- These must be uploaded before PWA install will work

---

## Backup and Recovery

Supabase Pro plan includes:
- Daily database backups (7-day retention on Pro, 30 days on Enterprise)
- Point-in-time recovery (Pro plan)

Free plan: No automated backups. Manual backup via pg_dump or Supabase dashboard.

**For Free plan**: Run weekly manual export:
```bash
# Requires supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql
```
