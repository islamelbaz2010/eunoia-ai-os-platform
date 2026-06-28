# 20 — Environment Variables

Complete documentation of every environment variable.

---

## Required Variables

### `NEXT_PUBLIC_SUPABASE_URL`
**Where to get**: Supabase dashboard → Project Settings → API → Project URL  
**Format**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`  
**Exposed to browser**: YES (prefixed `NEXT_PUBLIC_`)  
**Security**: Safe to expose. It's a project URL, not a secret. RLS prevents unauthorized access.  
**Used in**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/lib/env.ts`, `src/app/api/health/route.ts`

---

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Where to get**: Supabase dashboard → Project Settings → API → `anon` `public` key  
**Format**: JWT string  
**Exposed to browser**: YES (prefixed `NEXT_PUBLIC_`)  
**Security**: Safe to expose. This key only has permissions defined by RLS policies. Supabase is designed for this key to be public.  
**Used in**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/app/api/health/route.ts`

---

### `SUPABASE_SERVICE_ROLE_KEY`
**Where to get**: Supabase dashboard → Project Settings → API → `service_role` `secret` key  
**Format**: JWT string  
**Exposed to browser**: **NO — NEVER**  
**Security**: This key bypasses RLS. If exposed, anyone can read/write all data.  
**Used in**: `scripts/test-rag.js` (local integration test only)  
**NOT used in**: The Next.js application. Do not add to Vercel environment variables.

---

### `OPENAI_API_KEY`
**Where to get**: OpenAI platform → API Keys  
**Format**: `sk-...`  
**Exposed to browser**: **NO** — protected by `import "server-only"` in `src/lib/ai/openai.ts`  
**Security**: Must stay server-side. Exposure allows anyone to make API calls on your account.  
**Used in**: `src/lib/ai/openai.ts` (via `src/lib/env.ts`)

---

### `NEXT_PUBLIC_APP_URL`
**Purpose**: Canonical URL for OG metadata, sitemap, and PWA manifest  
**Format**: `https://eunoiaos.com` (no trailing slash)  
**Exposed to browser**: YES (prefixed `NEXT_PUBLIC_`)  
**Default if missing**: `https://eunoiaos.com` (hardcoded fallback in `layout.tsx` and `sitemap.ts`)  
**Must set in Vercel**: Yes, for production OG images and sitemap to have correct URLs  
**Used in**: `src/app/layout.tsx`, `src/app/sitemap.ts`

---

## `.env.example` (current content)

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Vercel Environment Setup

Variables to add in Vercel dashboard (Settings → Environment Variables):

| Variable | Environment | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Your anon key |
| `OPENAI_API_KEY` | Production, Preview | Your OpenAI key |
| `NEXT_PUBLIC_APP_URL` | Production | `https://eunoiaos.com` |
| `NEXT_PUBLIC_APP_URL` | Preview | Vercel preview URL |

**Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel** — it is only for local scripts.

---

## Local Development Setup

```bash
cp .env.example .env.local
# Edit .env.local and fill in your values
npm run dev
```

The `.env.local` file is gitignored. Never commit it.

---

## How Variables Are Validated

Server-side variables go through `src/lib/env.ts`:
```typescript
export const env = {
  get OPENAI_API_KEY() { return requireEnv("OPENAI_API_KEY") }
}
// requireEnv() throws: "Missing required environment variable: OPENAI_API_KEY"
```

This means a missing `OPENAI_API_KEY` will crash the server action that tries to access it (not at startup). This is intentional — it fails fast at the point of use with a clear message.

Supabase variables are read directly from `process.env` in the Supabase client factories. Missing values will cause `undefined` to be passed to `createClient`, which throws a Supabase SDK error.

---

## Security Notes

1. The `!` (non-null assertion) used in Supabase client files (`process.env.NEXT_PUBLIC_SUPABASE_URL!`) suppresses TypeScript's null check. This is safe because these are required env vars validated at runtime.

2. `NEXT_PUBLIC_` variables are bundled into the client-side JavaScript. Only put non-secret values here.

3. The `.vercelignore` file excludes `.env.local` from Vercel deployments (redundant — Vercel ignores `.env.local` by default, but explicit is better).
