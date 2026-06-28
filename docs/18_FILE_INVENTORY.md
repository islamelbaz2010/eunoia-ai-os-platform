# 18 — File Inventory

Every file in `eunoia-ai-os-platform`, its purpose, and status.

---

## Root

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Dependencies, scripts, Node engine constraint | Active |
| `package-lock.json` | Lockfile | Active |
| `tsconfig.json` | TypeScript config (strict mode, path alias `@` → `src/`) | Active |
| `next.config.ts` | Next.js config: security headers, Turbopack | Active |
| `eslint.config.mjs` | ESLint config (Next.js rules) | Active |
| `postcss.config.mjs` | PostCSS config (Tailwind v4 plugin) | Active |
| `vitest.config.ts` | Vitest config: node environment, path alias, coverage | Active |
| `proxy.ts` | Next.js 16 Proxy (route protection, session refresh) | Active |
| `next-env.d.ts` | Next.js TypeScript env types (auto-generated, do not edit) | Auto |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache (gitignored) | Build artifact |
| `.env.example` | Template for `.env.local` | Active |
| `.env.local` | Real secrets (gitignored, never commit) | Local only |
| `.gitignore` | Git exclusions | Active |
| `.vercelignore` | Vercel deployment exclusions | Active |
| `.nvmrc` | Node version: 20 | Active |
| `README.md` | Project setup + architecture summary | Active |
| `CLAUDE.md` | Claude Code instructions (references AGENTS.md) | Active |
| `AGENTS.md` | Claude Code agent instructions (Next.js 16 warning) | Active |
| `.DS_Store` | macOS artifact — should be in .gitignore (not yet) | Ignored artifact |

---

## `public/`

| File | Purpose | Status |
|------|---------|--------|
| `robots.txt` | Search engine crawl directives | Active |
| `file.svg` | Default Next.js scaffold SVG | Unused — delete |
| `globe.svg` | Default Next.js scaffold SVG | Unused — delete |
| `next.svg` | Default Next.js scaffold SVG | Unused — delete |
| `vercel.svg` | Default Next.js scaffold SVG | Unused — delete |
| `window.svg` | Default Next.js scaffold SVG | Unused — delete |
| `icon.png` | PWA icon 192×192 — **MISSING** | Needed — create |
| `icon-512.png` | PWA icon 512×512 — **MISSING** | Needed — create |

---

## `src/app/`

| File | Purpose | Status |
|------|---------|--------|
| `layout.tsx` | Root layout: fonts, dark mode, SEO metadata | Active |
| `page.tsx` | Landing page (public) | Active |
| `globals.css` | Tailwind v4, CSS custom properties, glass/kpi classes | Active |
| `error.tsx` | Global error boundary | Active |
| `favicon.ico` | Browser favicon | Active (default, needs branding) |
| `manifest.ts` | PWA manifest | Active |
| `sitemap.ts` | XML sitemap generator | Active |

---

## `src/app/auth/`

| File | Purpose | Status |
|------|---------|--------|
| `callback/route.ts` | PKCE OAuth code exchange handler | Active |

---

## `src/app/api/`

| File | Purpose | Status |
|------|---------|--------|
| `health/route.ts` | GET /api/health — Supabase connectivity check | Active |
| `status/` | **Empty directory** | Delete or add a route |

---

## `src/app/login/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Login form (email + password) | Active |

---

## `src/app/signup/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Signup form (name + email + password) | Active |

---

## `src/app/onboarding/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Org creation form | Active |
| `actions.ts` | `createOrganization()` server action | Active |

---

## `src/app/invite/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Invite acceptance (reads ?token, calls RPC, redirects) | Active |

---

## `src/app/dashboard/`

| File | Purpose | Status |
|------|---------|--------|
| `layout.tsx` | Dashboard shell, sidebar, auth+org guard | Active |
| `page.tsx` | Overview: KPIs + charts | Active |
| `loading.tsx` | Dashboard loading state | Active (minimal) |
| `nav-link.tsx` | Sidebar NavLink client component | Active |
| `usage-chart.tsx` | Recharts AreaChart (usage over time) | Active |
| `status-chart.tsx` | Recharts PieChart (CRM status breakdown) | Active |

---

## `src/app/dashboard/crm/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Contact list table | Active |
| `contact-form.tsx` | Add contact form (client) | Active |
| `actions.ts` | `createContact()` server action | Active |
| `error.tsx` | Error boundary | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/knowledge-base/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Document list table | Active |
| `document-form.tsx` | Add document form (client) | Active |
| `actions.ts` | `createDocument()` server action | Active |
| `error.tsx` | Error boundary | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/assistant/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Page shell | Active |
| `chat.tsx` | Chat UI client component | Active |
| `actions.ts` | `askAssistant()` server action (full RAG) | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/audit-logs/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Audit log table | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/usage/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Usage totals by event type | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/settings/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Members + invite list | Active |
| `invite-form.tsx` | Send invite form (client) | Active |
| `invite-row.tsx` | Revoke invite button (client) | Active |
| `member-row.tsx` | Change role + remove member (client) | Active |
| `actions.ts` | createInvite, revokeInvite, updateMemberRole, removeMember, acceptInvite | Active |
| `error.tsx` | Error boundary | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/app/dashboard/admin/`

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Super admin org list | Active |
| `loading.tsx` | Loading state | Active (minimal) |

---

## `src/lib/ai/`

| File | Purpose | Status |
|------|---------|--------|
| `openai.ts` | OpenAI client singleton, `embedText`, `embedTexts` | Active (server-only) |
| `chunk.ts` | `chunkText()` — sliding window chunker | Active |
| `ingest.ts` | `ingestDocument()` — chunk+embed+store pipeline | Active (server-only) |
| `chunk.test.ts` | Vitest unit tests for chunking | Active |

---

## `src/lib/auth/`

| File | Purpose | Status |
|------|---------|--------|
| `dal.ts` | `verifySession`, `getProfile`, `getMemberships`, `getActiveOrganization` | Active (server-only) |
| `actions.ts` | `login`, `signup`, `logout` server actions | Active |
| `audit.ts` | `logAuditEvent`, `logUsageEvent` (fire-and-forget) | Active (server-only) |

---

## `src/lib/supabase/`

| File | Purpose | Status |
|------|---------|--------|
| `client.ts` | Browser Supabase client factory | Active |
| `server.ts` | Server Supabase client factory (cookies) | Active (server-only) |
| `proxy.ts` | `updateSession()` for session refresh in proxy | Active |

---

## `src/lib/`

| File | Purpose | Status |
|------|---------|--------|
| `env.ts` | Server-only validated env accessor | Active (server-only) |
| `logger.ts` | Structured JSON logger | Active |
| `types.ts` | TypeScript types + `hasRole` + `ROLE_RANK` | Active |
| `utils.ts` | `slugify()` | Active |
| `types.test.ts` | Vitest tests for types | Active |
| `utils.test.ts` | Vitest tests for utils | Active |

---

## `supabase/migrations/`

| File | Purpose | Status |
|------|---------|--------|
| `0001_init.sql` | Base schema, RLS, triggers, helper functions | Applied |
| `0002_rag_invites.sql` | HNSW index, match_kb_chunks RPC, invites | Applied |
| `0003_grants.sql` | Explicit GRANT statements | Applied |
| `0004_indexes_policies.sql` | Performance indexes + missing RLS policies | **Pending** (apply in Supabase dashboard) |
| `0005_schema_hardening.sql` | FK ON DELETE SET NULL, create_organization RPC | **Pending** |
| `0006_hardening_v2.sql` | Role index, embedding NOT NULL, invite race fix | **Pending** |

---

## `scripts/`

| File | Purpose | Status |
|------|---------|--------|
| `test-openai.js` | Verify OpenAI connectivity (ping embedding) | Active (local only) |
| `test-rag.js` | Full RAG integration test (7 checks) | Active (local only) |

---

## `eunoia-ai-os-app` Repo

| File | Purpose | Notes |
|------|---------|-------|
| `src/app/page.tsx` | Default Next.js scaffold page | Never customized |
| `src/app/layout.tsx` | Default Next.js scaffold layout | Never customized |
| `src/app/globals.css` | Default Tailwind styles | Never customized |
| `src/app/favicon.ico` | Default favicon | — |
| `eunoia-ai-os.xlsx` | Business planning spreadsheet | Cannot read binary; contains business context |
| Everything else | Default `create-next-app` files | Unused |

**Verdict**: This repository is an empty placeholder. The `eunoia-ai-os.xlsx` file likely contains business/product planning data that should be extracted and stored in the company's documentation system.
