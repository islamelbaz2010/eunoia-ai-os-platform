# DEPENDENCY GRAPH

**Generated**: 2026-06-28  
**Verified from**: package.json + source imports (no assumptions)

---

## External Dependencies

### Runtime (Production)

| Package | Version | Purpose | Used In |
|---------|---------|---------|---------|
| `next` | 16.2.9 | Full-stack framework (App Router, Server Actions, Turbopack) | Everything |
| `react` | 19.2.4 | UI library | All components |
| `react-dom` | 19.2.4 | React DOM renderer | Root layout |
| `@supabase/ssr` | ^0.12.0 | SSR-aware Supabase client factory | `lib/supabase/*.ts` |
| `@supabase/supabase-js` | ^2.108.2 | Supabase client base | `lib/supabase/*.ts`, `scripts/` |
| `openai` | ^6.44.0 | OpenAI SDK (embeddings + chat completions) | `lib/ai/openai.ts`, `scripts/` |
| `recharts` | ^3.8.1 | Chart library | `dashboard/usage-chart.tsx`, `dashboard/status-chart.tsx` |
| `zod` | ^4.4.3 | Schema validation | All server actions |
| `clsx` | ^2.1.1 | Conditional classname utility | **IMPORTED IN package.json but NOT found in source scans** |
| `lucide-react` | ^1.21.0 | Icon library | `dashboard/nav-link.tsx`, `dashboard/page.tsx` |

### Note on `clsx`
`clsx` is listed in dependencies but no source file imports it. This may be dead code from the initial scaffold or a dependency of another package. It is safe to remove from package.json if not being used — but verify first with `grep -r "clsx" src/`.

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/postcss` | ^4 | Tailwind CSS v4 PostCSS integration |
| `@types/node` | ^20 | Node.js TypeScript types |
| `@types/react` | ^19 | React TypeScript types |
| `@types/react-dom` | ^19 | React DOM types |
| `@vitest/coverage-v8` | ^4.1.9 | Code coverage provider |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.2.9 | Next.js ESLint rules |
| `tailwindcss` | ^4 | CSS framework |
| `typescript` | ^5 | TypeScript compiler |
| `vitest` | ^4.1.9 | Test runner |

---

## Internal Module Dependency Graph

```
proxy.ts
  └─ lib/supabase/proxy.ts (updateSession)
       └─ @supabase/ssr (createServerClient)

src/lib/
├── supabase/
│   ├── server.ts          ← createClient() for server
│   │   └─ @supabase/ssr
│   ├── client.ts          ← createClient() for browser
│   │   └─ @supabase/ssr
│   └── proxy.ts           ← updateSession() for proxy.ts
│       └─ @supabase/ssr
│
├── auth/
│   ├── dal.ts             ← verifySession, getProfile, getMemberships, getActiveOrganization
│   │   ├─ server-only
│   │   ├─ react (cache)
│   │   ├─ next/navigation (redirect)
│   │   ├─ lib/supabase/server
│   │   └─ lib/types
│   ├── actions.ts         ← login, signup, logout
│   │   ├─ next/navigation (redirect)
│   │   ├─ zod
│   │   └─ lib/supabase/server
│   └── audit.ts           ← logAuditEvent, logUsageEvent
│       ├─ server-only
│       ├─ lib/supabase/server
│       └─ lib/logger
│
├── ai/
│   ├── openai.ts          ← embedText, embedTexts, getOpenAIClient
│   │   ├─ server-only
│   │   ├─ openai
│   │   └─ lib/env
│   ├── chunk.ts           ← chunkText (no deps, pure function)
│   └── ingest.ts          ← ingestDocument
│       ├─ server-only
│       ├─ lib/supabase/server
│       ├─ lib/ai/chunk
│       └─ lib/ai/openai
│
├── env.ts                 ← requireEnv, env accessor
│   └─ server-only
│
├── logger.ts              ← structured JSON logger (no deps)
│
├── types.ts               ← OrgRole, Profile, etc., ROLE_RANK, hasRole
│   └─ (no external deps)
│
└── utils.ts               ← slugify
    └─ (no external deps)

src/app/
├── layout.tsx
│   └─ next/font/google (Geist, Geist_Mono)
│
├── page.tsx
│   └─ next/link
│
├── manifest.ts
│   └─ next (MetadataRoute.Manifest)
│
├── sitemap.ts
│   └─ next (MetadataRoute.Sitemap)
│
├── error.tsx
│   └─ (react client hooks)
│
├── login/page.tsx
│   ├─ react (useActionState)
│   ├─ next/link
│   └─ lib/auth/actions
│
├── signup/page.tsx
│   ├─ react (useActionState)
│   ├─ next/link
│   └─ lib/auth/actions
│
├── auth/callback/route.ts
│   ├─ next/server
│   └─ lib/supabase/server
│
├── onboarding/
│   ├─ page.tsx
│   │   └─ react (useActionState)
│   └─ actions.ts
│       ├─ next/navigation
│       ├─ zod
│       ├─ lib/supabase/server
│       ├─ lib/auth/dal
│       └─ lib/utils
│
├── invite/page.tsx
│   ├─ next/navigation
│   ├─ lib/supabase/server
│   └─ lib/auth/dal
│
├── api/
│   ├─ health/route.ts
│   │   └─ next/server
│   └─ status/ (EMPTY DIRECTORY)
│
└── dashboard/
    ├─ layout.tsx
    │   ├─ next/navigation
    │   ├─ lib/auth/dal
    │   ├─ lib/auth/actions
    │   └─ ./nav-link
    │
    ├─ nav-link.tsx
    │   ├─ next/link
    │   ├─ next/navigation
    │   └─ lucide-react
    │
    ├─ page.tsx
    │   ├─ lucide-react
    │   ├─ lib/supabase/server
    │   ├─ lib/auth/dal
    │   ├─ ./usage-chart
    │   └─ ./status-chart
    │
    ├─ usage-chart.tsx
    │   └─ recharts
    │
    ├─ status-chart.tsx
    │   └─ recharts
    │
    ├─ crm/
    │   ├─ page.tsx → lib/supabase/server, lib/auth/dal, ./contact-form
    │   ├─ contact-form.tsx → react, ./actions
    │   └─ actions.ts → next/cache, zod, lib/supabase/server, lib/auth/dal, lib/auth/audit
    │
    ├─ knowledge-base/
    │   ├─ page.tsx → lib/supabase/server, lib/auth/dal, ./document-form
    │   ├─ document-form.tsx → react, ./actions
    │   └─ actions.ts → next/cache, zod, lib/supabase/server, lib/auth/dal, lib/auth/audit, lib/ai/ingest
    │
    ├─ assistant/
    │   ├─ page.tsx → ./chat
    │   ├─ chat.tsx → react, ./actions
    │   └─ actions.ts → zod, lib/supabase/server, lib/auth/dal, lib/auth/audit, lib/logger, lib/ai/openai
    │
    ├─ settings/
    │   ├─ page.tsx → lib/supabase/server, lib/auth/dal, lib/types, ./invite-form, ./invite-row, ./member-row
    │   ├─ actions.ts → next/cache, zod, lib/supabase/server, lib/auth/dal, lib/auth/audit, lib/types
    │   ├─ invite-form.tsx → react, ./actions
    │   ├─ invite-row.tsx → react, ./actions
    │   └─ member-row.tsx → react, lib/types, ./actions
    │
    ├─ audit-logs/page.tsx → lib/supabase/server, lib/auth/dal
    ├─ usage/page.tsx → lib/supabase/server, lib/auth/dal
    └─ admin/page.tsx → next/navigation, lib/supabase/server, lib/auth/dal
```

---

## Circular Dependencies

**None detected.** The dependency flow is strictly:

```
Components → Server Actions → DAL → Supabase Client → (external)
                           → AI Lib → (external)
                           → Types/Utils → (no deps)
```

---

## Unused Packages

| Package | Evidence |
|---------|---------|
| `clsx` | Listed in package.json, no `import clsx` found in `src/` by source inspection |

---

## Critical Import Rules (Enforced)

Files with `import "server-only"` — will throw at build time if imported from a Client Component:

- `src/lib/auth/dal.ts`
- `src/lib/auth/audit.ts`
- `src/lib/ai/openai.ts`
- `src/lib/ai/ingest.ts`
- `src/lib/env.ts`
- `src/lib/supabase/server.ts`

---

## Bundle Impact Notes

- `recharts` (~300KB minified) is the largest client-side dependency. Only imported in `usage-chart.tsx` and `status-chart.tsx`.
- `lucide-react` uses tree-shaking — only the imported icons are bundled.
- `@supabase/ssr` is ~50KB but is used in the server-only path (not client bundle).
- `openai` SDK is server-only via `import "server-only"` — never in client bundle.
- `zod` v4 is ~20KB and used only in server actions — not in client bundle.
