# MASTER FILE INDEX

**Generated**: 2026-06-28  
**Verified against**: Local source code (not from memory or prior AI output)  
**Status**: Every row verified by direct file read

---

## Column Guide

- **Status**: Active | Empty | Missing | Auto-generated | Scaffold
- **Can Delete?**: Safe | Risky | No

---

## Root Configuration Files

| Full Path | Purpose | Lines | Status | Can Delete? |
|-----------|---------|-------|--------|-------------|
| `proxy.ts` | Next.js 16 Proxy (formerly Middleware). Routes all requests through updateSession(). Exports `proxy()` not `middleware()`. PUBLIC_ROUTES defined here | 10 | Active | No |
| `next.config.ts` | Next.js config: security headers (CSP, HSTS, X-Frame), Turbopack root, dev/prod unsafe-eval toggle | 46 | Active | No |
| `package.json` | Dependencies, scripts, Node engine constraint (>=20). Name is "eunoia-ai-os-app" (inherited from scaffold) | 41 | Active | No |
| `package-lock.json` | npm lockfile | ~6000 | Auto | No |
| `tsconfig.json` | TypeScript config: strict, bundler module resolution, `@` alias to `src/` | 35 | Active | No |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache | - | Auto | Safe |
| `vitest.config.ts` | Vitest: node env, `src/**/*.test.ts`, v8 coverage, `@` alias | 20 | Active | No |
| `eslint.config.mjs` | ESLint: next/core-web-vitals + TypeScript, scripts/ allowed require() | 26 | Active | No |
| `postcss.config.mjs` | PostCSS: @tailwindcss/postcss plugin | 7 | Active | No |
| `.nvmrc` | Node version spec: `20` | 1 | Active | Safe |
| `.env.example` | Template: 5 env vars with placeholder values | 5 | Active | No |
| `.env.local` | **REAL CREDENTIALS — NEVER COMMIT** | - | Active | No |
| `.vercelignore` | Excludes scripts/, supabase/, .claude/, *.local, .nvmrc from Vercel | 7 | Active | No |
| `.gitignore` | Standard Next.js gitignore | ~40 | Active | No |
| `CLAUDE.md` | References AGENTS.md | 1 | Active | No |
| `AGENTS.md` | Instruction: read Next.js docs in node_modules before coding | 5 | Active | No |
| `README.md` | Setup guide, migration order, validation scripts, phase 1 scope, architecture notes | 63 | Active | No |
| `next-env.d.ts` | Next.js TypeScript declarations | 3 | Auto | No |
| `.DS_Store` | macOS metadata | - | Auto | Safe |

---

## Public Assets

| Full Path | Purpose | Status | Can Delete? |
|-----------|---------|--------|-------------|
| `public/robots.txt` | Disallows /dashboard/, /invite/, /api/; allows /, /login, /signup | Active | No |
| `public/file.svg` | Default Next.js scaffold SVG | Scaffold | Safe |
| `public/globe.svg` | Default Next.js scaffold SVG | Scaffold | Safe |
| `public/next.svg` | Default Next.js scaffold SVG | Scaffold | Safe |
| `public/vercel.svg` | Default Next.js scaffold SVG | Scaffold | Safe |
| `public/window.svg` | Default Next.js scaffold SVG | Scaffold | Safe |
| `public/icon.png` | **MISSING** — required by manifest.ts for PWA 192×192 icon | Missing | — |
| `public/icon-512.png` | **MISSING** — required by manifest.ts for PWA 512×512 icon | Missing | — |

---

## App Layer — Root

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/layout.tsx` | Root layout: Google Geist font, full SEO metadata, OG/Twitter tags, robots | Server Component | 59 | Active |
| `src/app/page.tsx` | Landing page: hero with Sign in / Get started links | Server Component | 33 | Active |
| `src/app/globals.css` | Design tokens (CSS vars), glass-panel + kpi-card utility classes, radial gradient body | CSS | 41 | Active |
| `src/app/favicon.ico` | Default Next.js favicon (blue "N" logo) | Asset | — | Active (wrong brand) |
| `src/app/manifest.ts` | PWA manifest: name, icons, colors | Server | 17 | Active |
| `src/app/sitemap.ts` | XML sitemap: /, /login, /signup | Server | 11 | Active |
| `src/app/error.tsx` | Global error boundary: shows digest, Try again button | Client Component | 31 | Active |

---

## App Layer — Auth Routes

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/login/page.tsx` | Login form: email + password, useActionState(login) | Client Component | 64 | Active |
| `src/app/signup/page.tsx` | Signup form: fullName + email + password, useActionState(signup) | Client Component | 77 | Active |
| `src/app/auth/callback/route.ts` | PKCE code exchange handler. Calls exchangeCodeForSession, redirects. Uses console.error (should be logger) | Route Handler | 22 | Active |
| `src/app/invite/page.tsx` | Token-based invite acceptance page. Calls accept_org_invite RPC. Generic error message shown on failure | Server Component | 42 | Active |

---

## App Layer — Onboarding

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/onboarding/page.tsx` | Organization creation form: useActionState(createOrganization). Shown to new users with no org | Client Component | 51 | Active |
| `src/app/onboarding/actions.ts` | createOrganization server action: validates name, calls slugify(), calls create_organization RPC | Server Action | 43 | Active |

---

## App Layer — Dashboard

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/layout.tsx` | Dashboard shell: sidebar nav, header, org redirect, super admin nav item | Server Component | 76 | Active |
| `src/app/dashboard/nav-link.tsx` | Active-state navigation link with Lucide icon map | Client Component | 56 | Active |
| `src/app/dashboard/page.tsx` | KPI cards + UsageChart + StatusChart. 3 parallel data fetches | Server Component | 155 | Active |
| `src/app/dashboard/loading.tsx` | Skeleton: 4 pulsing kpi-card boxes | Server Component | 9 | Active |
| `src/app/dashboard/usage-chart.tsx` | Recharts AreaChart for usage over time (14 days) | Client Component | 44 | Active |
| `src/app/dashboard/status-chart.tsx` | Recharts PieChart (donut) for CRM status breakdown | Client Component | 35 | Active |

### CRM

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/crm/page.tsx` | Contact list table (limit 200) + ContactForm | Server Component | 64 | Active |
| `src/app/dashboard/crm/contact-form.tsx` | Add contact form: useActionState(createContact) | Client Component | 48 | Active |
| `src/app/dashboard/crm/actions.ts` | createContact: validates, inserts, fires audit + usage events | Server Action | 73 | Active |
| `src/app/dashboard/crm/loading.tsx` | Skeleton: pulsing table rows | Server Component | 13 | Active |
| `src/app/dashboard/crm/error.tsx` | Error boundary for CRM route | Client Component | ~20 | Active |

### Knowledge Base

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/knowledge-base/page.tsx` | Document list table (limit 100) + DocumentForm | Server Component | 63 | Active |
| `src/app/dashboard/knowledge-base/document-form.tsx` | Add document form: title + language select + content textarea. useActionState(createDocument) | Client Component | 47 | Active |
| `src/app/dashboard/knowledge-base/actions.ts` | createDocument: validates (max 50000 chars), inserts doc, calls ingestDocument, cleans up on failure. Uses console.error (TD-019) | Server Action | 104 | Active |
| `src/app/dashboard/knowledge-base/loading.tsx` | Skeleton UI | Server Component | — | Active |
| `src/app/dashboard/knowledge-base/error.tsx` | Error boundary: shows digest, Try again | Client Component | 23 | Active |

### RAG Assistant

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/assistant/page.tsx` | Renders AssistantChat component | Server Component | 16 | Active |
| `src/app/dashboard/assistant/chat.tsx` | Chat UI: message list, useTransition for async action call, no message persistence | Client Component | 81 | Active |
| `src/app/dashboard/assistant/actions.ts` | askAssistant: embed → match_kb_chunks RPC → filter ≥0.3 → GPT-4o-mini → log usage | Server Action | 126 | Active |
| `src/app/dashboard/assistant/loading.tsx` | Skeleton UI | Server Component | — | Active |

### Settings

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/settings/page.tsx` | Members table + InviteForm + InviteRow table. Shows canManage/isOwner state | Server Component | 114 | Active |
| `src/app/dashboard/settings/actions.ts` | createInvite, revokeInvite, updateMemberRole, removeMember, acceptInvite. Guards: last-owner, self-removal, role escalation | Server Action | 229 | Active |
| `src/app/dashboard/settings/invite-form.tsx` | Send invite form: email + role select (owner only if isOwner). useActionState | Client Component | 47 | Active |
| `src/app/dashboard/settings/invite-row.tsx` | Pending invite row with Revoke button. useTransition | Client Component | 53 | Active |
| `src/app/dashboard/settings/member-row.tsx` | Member row with role dropdown + Remove button. Optimistic UI with rollback | Client Component | 93 | Active |
| `src/app/dashboard/settings/loading.tsx` | Skeleton UI | Server Component | — | Active |
| `src/app/dashboard/settings/error.tsx` | Error boundary: "Failed to load Settings" + digest + Try again | Client Component | 23 | Active |

### Audit Logs

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/audit-logs/page.tsx` | Audit log table: action, target_type, created_at (limit 50) | Server Component | 59 | Active |
| `src/app/dashboard/audit-logs/loading.tsx` | Skeleton UI | Server Component | — | Active |

### Usage

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/usage/page.tsx` | Usage totals by event_type (JS reduce on limit 10000 rows). Known performance issue | Server Component | 45 | Active |
| `src/app/dashboard/usage/loading.tsx` | Skeleton UI | Server Component | — | Active |

### Admin (Super Admin)

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/dashboard/admin/page.tsx` | All organizations table. Redirects non-super-admins to /dashboard | Server Component | 58 | Active |
| `src/app/dashboard/admin/loading.tsx` | Skeleton UI | Server Component | — | Active |

---

## App Layer — API Routes

| Full Path | Purpose | Type | Lines | Status |
|-----------|---------|------|-------|--------|
| `src/app/api/health/route.ts` | GET /api/health: pings Supabase REST with 3s timeout. Returns {status, ts, checks: {db}} | Route Handler | 40 | Active |
| `src/app/api/status/` | **EMPTY DIRECTORY** — no route.ts file. Should be deleted | Empty | 0 | Risky (delete) |

---

## Lib Layer — Auth

| Full Path | Purpose | Lines | Status | server-only? |
|-----------|---------|-------|--------|-------------|
| `src/lib/auth/dal.ts` | verifySession, getProfile, getMemberships, getActiveOrganization — all React.cache() wrapped | 58 | Active | Yes |
| `src/lib/auth/actions.ts` | login, signup, logout Server Actions. Zod v4 validation | 73 | Active | No (use server) |
| `src/lib/auth/audit.ts` | logAuditEvent, logUsageEvent — fire-and-forget, errors caught and logged | 59 | Active | Yes |

---

## Lib Layer — AI

| Full Path | Purpose | Lines | Status | server-only? |
|-----------|---------|-------|--------|-------------|
| `src/lib/ai/openai.ts` | OpenAI singleton (timeout 30s, maxRetries 2), embedText, embedTexts (batched 512) | 49 | Active | Yes |
| `src/lib/ai/chunk.ts` | chunkText: 1000-char chunks, 150-char overlap, CRLF normalized, empty filtered | 19 | Active | No |
| `src/lib/ai/ingest.ts` | ingestDocument: chunk → delete old chunks → embed → insert | 39 | Active | Yes |
| `src/lib/ai/chunk.test.ts` | 6 unit tests for chunkText | 41 | Active | — |

---

## Lib Layer — Supabase

| Full Path | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| `src/lib/supabase/server.ts` | createServerClient with Next.js cookies(). For Server Components, Server Actions, Route Handlers | 28 | Active |
| `src/lib/supabase/client.ts` | createBrowserClient. For Client Components | 8 | Active |
| `src/lib/supabase/proxy.ts` | updateSession(): refreshes JWT in proxy middleware. Defines PUBLIC_ROUTES | 50 | Active |

---

## Lib Layer — Utilities

| Full Path | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| `src/lib/types.ts` | OrgRole, Profile, Organization, OrganizationMembership types, ROLE_RANK, hasRole() | 31 | Active |
| `src/lib/utils.ts` | slugify(): lowercase-hyphenated + 5-char random suffix | 18 | Active |
| `src/lib/env.ts` | requireEnv() lazy getter for server-side env vars. 3 vars only | 21 | Active |
| `src/lib/logger.ts` | Structured JSON logger. error/warn always; info in non-prod; debug in dev only | 29 | Active |
| `src/lib/types.test.ts` | 17 test cases for ROLE_RANK ordering and hasRole() matrix | 39 | Active |
| `src/lib/utils.test.ts` | 6 unit tests for slugify() including DB regex compliance | 48 | Active |

---

## Scripts

| Full Path | Purpose | Lines | Status | Vercel deploy? |
|-----------|---------|-------|--------|----------------|
| `scripts/test-rag.js` | 7-step integration test: connectivity, embedding, chunk insert, vector search, match_kb_chunks RPC, RAG e2e, audit+usage. Full cleanup | 167 | Active | No (.vercelignore) |
| `scripts/test-openai.js` | Single embedding call to verify OpenAI key and connectivity | 17 | Active | No (.vercelignore) |

---

## Database Migrations

| Full Path | Purpose | Lines | Applied to prod? |
|-----------|---------|-------|-----------------|
| `supabase/migrations/0001_init.sql` | Extensions, enums, 8 tables, indexes, helper functions, triggers, RLS policies | 282 | YES (in README) |
| `supabase/migrations/0002_rag_invites.sql` | HNSW vector index, match_kb_chunks RPC, organization_invites table, accept_org_invite function | 110 | YES (in README) |
| `supabase/migrations/0003_grants.sql` | GRANT statements for service_role and authenticated roles + function execute grants | 34 | YES (in README) |
| `supabase/migrations/0004_indexes_policies.sql` | 4 performance indexes, DELETE policy on kb_chunks, UPDATE policy on kb_documents | 29 | UNKNOWN — untracked in git, README omits it |
| `supabase/migrations/0005_schema_hardening.sql` | FK ON DELETE SET NULL (5 FKs), creator delete policy, create_organization RPC | 90 | UNKNOWN — untracked in git, README omits it |
| `supabase/migrations/0006_hardening_v2.sql` | org_members_org_role_idx, embedding NOT NULL, accept_org_invite race fix (FOR UPDATE) | 62 | UNKNOWN — untracked in git, README omits it |

---

## .claude/ Memory Files

| Full Path | Purpose | Status |
|-----------|---------|--------|
| `.claude/MASTER_CONTEXT.md` | Quick-load context for new Claude sessions | Active |
| `.claude/KNOWN_ISSUES.md` | Categorized issue list P1/P2/P3 | Active |
| `.claude/COMMANDS.md` | All runnable commands | Active |
| `.claude/settings.local.json` | Claude Code local settings | Active |

---

## Documentation Files (docs/)

| File | Description | Status |
|------|-------------|--------|
| `docs/README.md` | Navigation index | Active |
| `docs/00_PROJECT_MASTER_CONTEXT.md` | Stack, critical facts | Active |
| `docs/01_EXECUTIVE_SUMMARY.md` | Product overview | Active |
| `docs/02_PRODUCT.md` | Every page, workflow | Active |
| `docs/03_BUSINESS.md` | Vision, market, model | Active |
| `docs/04_ARCHITECTURE.md` | Diagrams, patterns | Active |
| `docs/05_SYSTEM_DESIGN.md` | Sequence diagrams | Active |
| `docs/06_DATABASE.md` | All tables, RLS, RPCs | Active |
| `docs/07_AI.md` | RAG pipeline | Active |
| `docs/08_SECURITY.md` | Threat model, RBAC | Active |
| `docs/09_INFRASTRUCTURE.md` | Vercel, Supabase | Active |
| `docs/10_DEPLOYMENT.md` | Deploy guide | Active |
| `docs/11_DEVOPS.md` | CI/CD, build | Active |
| `docs/12_TESTING.md` | Tests, coverage | Active |
| `docs/13_PERFORMANCE.md` | Bottlenecks, limits | Active |
| `docs/14_TECHNICAL_DEBT.md` | 22 issues | Active |
| `docs/15_ROADMAP.md` | Phase 2-6 | Active |
| `docs/16_CHANGELOG.md` | All commits | Active |
| `docs/17_DECISIONS.md` | 15 ADRs | Active |
| `docs/18_FILE_INVENTORY.md` | Previous file list (superseded by this file) | Superseded |
| `docs/19_API_REFERENCE.md` | Routes, actions, RPCs | Active |
| `docs/20_ENVIRONMENT.md` | Env vars | Active |
| `docs/21_OPERATIONS.md` | SQL runbooks | Active |
| `docs/22_INCIDENT_RESPONSE.md` | P1-P4 playbooks | Active |
| `docs/23_BACKUP_RECOVERY.md` | Backup strategy | Active |
| `docs/24_RELEASE_PROCESS.md` | Deploy checklist | Active |
| `docs/25_FUTURE_IDEAS.md` | Phase 2+ ideas | Active |

---

## eunoia-ai-os-app Repository

| Full Path | Purpose | Status |
|-----------|---------|--------|
| `src/app/page.tsx` | Default "To get started, edit page.tsx" scaffold | Scaffold |
| `src/app/layout.tsx` | Default Geist font layout | Scaffold |
| `src/app/globals.css` | Default Tailwind CSS | Scaffold |
| `src/app/favicon.ico` | Default Next.js favicon | Scaffold |
| `eunoia-ai-os.xlsx` | **Business planning spreadsheet** (binary, 12KB) — ONLY non-scaffold content | Active |
| `~$eunoia-ai-os.xlsx` | Excel temp lock file — should be gitignored | Temp |
| `next.config.ts` | Default Next.js config | Scaffold |
| `package.json` | Default Create Next App dependencies only | Scaffold |

**Note**: `eunoia-ai-os-app` git remote points to `https://github.com/islamelbaz2010/eunoia-ai-os-platform.git` — the same remote as the platform repo. This appears to be a misconfiguration.

---

## Missing Files Summary

| Missing File | Impact | Priority |
|-------------|--------|----------|
| `public/icon.png` | PWA install broken, manifest.ts broken | High |
| `public/icon-512.png` | PWA install broken | High |
| Route handler in `src/app/api/status/` | Misleading empty directory | Low |

## Files to Delete

| File | Reason |
|------|--------|
| `src/app/api/status/` (directory) | Empty, no route.ts, creates confusion |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Default scaffold assets not used by the app |
| `~$eunoia-ai-os.xlsx` in app repo | Excel temp file, should be gitignored |
