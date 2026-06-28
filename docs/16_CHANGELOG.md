# 16 — Changelog

Complete commit history with context on what changed and why.

---

## 2026-06-23

### `f6ab637` — Initial commit from Create Next App
**Time**: 10:26 +0300  
**Both repos share this commit** — `eunoia-ai-os-platform` and `eunoia-ai-os-app` were bootstrapped from the same `create-next-app` invocation.  
**Content**: Default Next.js 16 scaffold (page.tsx, layout.tsx, globals.css, package.json, tsconfig.json, eslint.config.mjs, postcss.config.mjs, public/ with stock SVGs)

---

### `e97c48c` — Add Supabase auth, RBAC schema, and dashboard shell
**Time**: 07:50 UTC (10:50 +0300)  
**Scope**: Massive foundational commit  
**What was added**:
- Supabase client files (`client.ts`, `server.ts`, `proxy.ts`)
- Auth DAL (`dal.ts`), auth actions (`login`, `signup`, `logout`)
- Migration `0001_init.sql`: Complete schema (organizations, profiles, organization_members, crm_contacts, knowledge_base_documents, knowledge_base_chunks, audit_logs, usage_events), RLS policies, helper functions, triggers
- Dashboard layout with sidebar navigation
- Dashboard overview page (KPI cards)
- Login page, signup page
- CRM page + contact form + createContact action
- Knowledge Base page + document form
- Audit logs page
- Usage page
- Settings page + invite system (createInvite, revokeInvite, updateMemberRole, removeMember)
- Admin super admin page
- Error boundaries for CRM, KB, Settings
- Loading files for all routes
- `next.config.ts` with Turbopack config

---

### `540dc5e` — Implement RAG pipeline, org invites, role management, and dashboard charts
**Time**: 07:59 UTC  
**What was added**:
- Migration `0002_rag_invites.sql`: HNSW vector index, `match_kb_chunks` RPC, `organization_invites` table + RLS + `accept_org_invite` RPC
- Migration `0003_grants.sql`: Explicit GRANT statements for service_role and authenticated
- `src/lib/ai/openai.ts`: OpenAI client singleton, `embedText`, `embedTexts` (batched)
- `src/lib/ai/chunk.ts`: `chunkText()` function
- `src/lib/ai/ingest.ts`: `ingestDocument()` pipeline
- `src/lib/ai/chunk.test.ts`: Vitest tests for chunking
- `src/lib/types.ts`: TypeScript types, `hasRole()`, `ROLE_RANK`
- `src/lib/utils.ts`: `slugify()`
- `src/lib/utils.test.ts`, `src/lib/types.test.ts`: Unit tests
- `src/lib/logger.ts`: Structured JSON logger
- `src/lib/env.ts`: Server-only env validation
- `src/lib/auth/audit.ts`: `logAuditEvent`, `logUsageEvent`
- Updated `knowledge-base/actions.ts` to call `ingestDocument()`
- Updated `assistant/actions.ts` with full RAG flow (`askAssistant`)
- `assistant/chat.tsx`: Chat UI component
- Dashboard charts: `usage-chart.tsx` (AreaChart), `status-chart.tsx` (PieChart)
- Updated `dashboard/page.tsx` to fetch chart data
- Updated `settings/actions.ts` with role management guards
- `invite/page.tsx`: Invite acceptance page
- `vitest.config.ts`: Vitest configuration
- `scripts/test-rag.js`: Integration test script
- `scripts/test-openai.js`: OpenAI connectivity test

---

### `3ff63ca` — Merge pull request #1
**Time**: 11:04 +0300  
PR: `islamelbaz2010/claude/affectionate-carson-vyp470` → `main`  
This merged the two feature commits (`e97c48c` and `540dc5e`) into main.

---

### `6e8c5ff` — Update .env.example with Supabase and OpenAI keys
**Time**: 11:08 +0300  
Added real environment variable names to `.env.example` (with placeholder values, not real keys).

---

### `524b324` — Update .env.example with placeholder values
**Time**: 11:10 +0300  
Switched from actual key format to `YOUR_*` placeholder format for clarity.

---

### `ca48d97` — Add mandatory organization onboarding flow
**Time**: 08:15 UTC (11:15 +0300)  
**What was added**:
- `/onboarding` page (`src/app/onboarding/page.tsx`)
- `createOrganization()` server action (`src/app/onboarding/actions.ts`)
- Updated `dashboard/layout.tsx` to redirect users with no org membership to `/onboarding`
- Migration `0005_schema_hardening.sql`:
  - FK `ON DELETE SET NULL` on `crm_contacts.created_by`, `kb_documents.created_by`, `audit_logs.actor_id`, `usage_events.actor_id`, `organization_invites.invited_by`
  - `creator can delete own kb documents` policy
  - `create_organization()` RPC (atomic org + owner membership, slug validation, 3-org anti-abuse cap)

---

### `1ef54a3` — Fix invite RLS policy and add organization switcher
**Time**: 08:34 UTC (11:34 +0300)  
**What was fixed/added**:
- Migration `0004_indexes_policies.sql`:
  - Performance indexes: `kb_chunks_document_id_idx`, `kb_documents_updated_at_idx`, `audit_logs_org_created_idx`, `usage_events_org_type_idx`
  - Missing RLS policies: `members can delete kb chunks`, `members can update kb documents`
- Migration `0006_hardening_v2.sql`:
  - Index `org_members_org_role_idx (organization_id, role)`
  - `embedding NOT NULL` constraint (delete NULL rows first)
  - Race condition fix in `accept_org_invite` (FOR UPDATE lock)
- Multiple production hardening changes:
  - `next.config.ts`: Full security headers (CSP, HSTS, X-Frame, etc.)
  - `error.tsx`: Show digest only (no raw error.message)
  - `invite/page.tsx`: Auto-redirect on success, generic error message
  - `assistant/actions.ts`: Question length limit (500 chars), MIN_SIMILARITY filter
  - `openai.ts`: 30s timeout, 2 retries, 512 batch size
  - `usage/page.tsx`: LIMIT 10000
  - `public/robots.txt`
  - `src/app/sitemap.ts`
  - `src/app/manifest.ts`
  - `src/app/layout.tsx`: Full SEO metadata
  - `package.json`: node engines constraint
  - `.nvmrc`: Node 20
  - `.vercelignore`
  - `.env.example`: Added NEXT_PUBLIC_APP_URL
  - `src/app/api/health/route.ts`: Health check endpoint
  - `src/lib/logger.ts`: Structured logger
  - `src/app/auth/callback/route.ts`: OAuth callback handler

**Note on commit message**: The message says "add organization switcher" but no switcher UI is visible in the resulting codebase. The commit addressed the underlying RLS policy and infrastructure issues but the switcher UI itself was not implemented.

---

## Current State (2026-06-28)

- 8 commits total
- All on `main` branch
- 0 open PRs
- Build status: passes (17 routes, 0 TS errors, 0 ESLint errors per previous memory)
- Migrations 0001–0006 written; 0004 and later may still need manual application to Supabase

## Uncommitted Changes

As of the git status snapshot at conversation start, the following files have local modifications not yet committed:

**Modified** (working tree changes against HEAD):
- `.env.example`, `README.md`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`, `package.json`
- `src/app/dashboard/assistant/actions.ts`, `src/app/dashboard/crm/actions.ts`, `src/app/dashboard/crm/contact-form.tsx`, `src/app/dashboard/crm/page.tsx`
- `src/app/dashboard/knowledge-base/actions.ts`, `src/app/dashboard/knowledge-base/document-form.tsx`, `src/app/dashboard/knowledge-base/page.tsx`
- `src/app/dashboard/layout.tsx`, `src/app/dashboard/nav-link.tsx`, `src/app/dashboard/page.tsx`
- `src/app/dashboard/settings/actions.ts`, `src/app/dashboard/settings/invite-form.tsx`, `src/app/dashboard/settings/invite-row.tsx`, `src/app/dashboard/settings/member-row.tsx`, `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/usage/page.tsx`, `src/app/error.tsx`, `src/app/invite/page.tsx`, `src/app/layout.tsx`
- `src/lib/ai/ingest.ts`, `src/lib/ai/openai.ts`, `src/lib/auth/audit.ts`, `src/lib/auth/dal.ts`

**Untracked** (new files not yet staged):
- `.nvmrc`, `.vercelignore`, `public/robots.txt`, `scripts/` (both scripts), `src/app/api/`, `src/app/auth/`, loading/error files, `src/app/manifest.ts`, `src/app/onboarding/`, `src/app/sitemap.ts`, test files, `src/lib/logger.ts`, `src/lib/types.test.ts`, `src/lib/utils.test.ts`, `src/lib/utils.ts`, migration files 0003–0006

These represent Phase 1 production hardening work that has been built but not yet committed to the repository. All this work is in the current HEAD as read by this documentation.
