# Architecture Audit — Eunoia AI OS

---

## Architecture Score: 85 / 100

The architecture is genuinely strong for an early-stage SaaS. Core patterns are well-chosen and consistently applied.

---

## Stack (Verified)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js | 16.2.9 | App Router, `proxy.ts` pattern ✅ |
| Runtime | React | 19.2.4 | `useActionState` ✅ |
| Database | Supabase (Postgres) | Latest | RLS + PostgREST + pgvector |
| Auth | Supabase GoTrue | Latest | HTTP-only cookies, PKCE |
| AI | OpenAI | SDK v6 | gpt-4o-mini + text-embedding-3-small |
| Email | Resend | v6 | Soft-fail if unconfigured |
| Error Tracking | Sentry | v10.62.0 | 3 configs (client/server/edge) |
| Validation | Zod | v4.4.3 | Correctly used |
| Styling | Tailwind | v4 | `@import "tailwindcss"` syntax ✅ |
| Testing | Vitest | v4.1.9 | 309 tests passing |
| Deployment | Vercel | — | Linked project |

---

## Architectural Patterns

### ✅ Server-First Architecture
- Server Components handle all data fetching
- Server Actions handle all mutations
- Client components scoped to interactive islands only
- Correct "zero client-side data fetching" approach for this use case

### ✅ Three-Layer Auth Guard
1. **Proxy (middleware)** — session cookie refresh + route protection
2. **DAL** — `verifySession()` + `getActiveOrganization()` in every Server Action
3. **Database** — RLS policies as final enforcement

### ✅ Separation of Concerns
| Layer | Files |
|-------|-------|
| Transport | `src/proxy.ts`, `src/lib/supabase/proxy.ts` |
| Data access | `src/lib/auth/dal.ts` |
| Business logic | `src/app/dashboard/*/actions.ts` |
| AI services | `src/lib/ai/openai.ts`, `src/lib/ai/ingest.ts` |
| Email | `src/lib/email.ts` |
| Observability | `src/lib/logger.ts`, `src/lib/health/` |

### ✅ Audit & Usage Logging
Fire-and-forget pattern with `void logAuditEvent({...})` — failures never surface to users. Logged to `audit_logs` and `usage_events` tables.

### ✅ Multi-tenancy
Full org-scoped data access. Every query includes `organization_id`. RLS enforces at DB level. Org switcher persists selection in cookie.

---

## Knowledge Brain Architecture

### What It Is
A **local file system** knowledge management system for the Eunoia agency itself (not a user-facing feature). It:
- Scans `knowledge/assets/raw/` for PDFs, DOCX, markdown files
- Parses them (pdf-parse, mammoth)
- Classifies by category (finance, HR, contracts, etc.)
- Extracts entities, keywords, relationships
- Builds an in-memory graph and CSV indexes
- Writes to `knowledge/index/*.csv`, `knowledge/graph/*.json`

### What It Is NOT
- Not connected to the RAG pipeline (Supabase KB)
- Not user-facing
- Not persisted to any database
- Not deployed (runs as local scripts)

### Architecture Assessment
The knowledge brain is a completely separate system that shares no runtime with the Next.js app. It's a developer/ops tool for ingesting the company's own documents into a structured format. Well-designed for its purpose but:
- The connection between this and the RAG pipeline is missing
- There's no importer that pushes knowledge/ data into Supabase KB
- Documents in `knowledge/assets/raw/` (including sensitive financial PDFs in Arabic) are committed to the repo

### ⚠️ Sensitive Documents in Repo
`knowledge/assets/raw/` contains:
- Arabic financial invoices (PDF)
- HR headcount/salary documents (PDF)
- Corporate registration documents (PDF)
- Client proposals and event budgets (PDF)

These are real business documents committed to the git repository. If this repo is ever made public or shared with contractors, this is a data leak risk.

---

## Layering Violations

### None Found
- `src/lib/` modules do not import from `src/app/`
- Server-only modules correctly use `import "server-only"`
- Client components do not import server modules

---

## Missing Architecture Components

| Component | Priority | Blocker For |
|-----------|----------|-------------|
| Billing/Stripe layer | P0 | Revenue |
| Background jobs | P1 | Async document processing |
| Streaming layer | P1 | RAG UX |
| Cache layer (Redis/Upstash) | P2 | Rate limiting at scale |
| Queue system | P2 | Async AI tasks |
| Multi-region support | P3 | Scale |
| Tenant isolation at infra level | P3 | Enterprise |

---

## Dependency Analysis

### Production Dependencies (Notable)
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `next` | 16.2.9 | Framework | 2 CVEs (postcss, can't fix) |
| `openai` | ^6.44.0 | AI client | None known |
| `@supabase/ssr` | ^0.12.0 | DB+Auth | None known |
| `@sentry/nextjs` | ^10.62.0 | Errors | Deprecated config options |
| `zod` | ^4.4.3 | Validation | None known |
| `recharts` | ^3.8.1 | Charts | Large bundle |
| `natural` | ^8.1.1 | NLP (KB only) | None known |
| `mammoth` | ^1.12.0 | DOCX parsing | Large, scripts only |
| `pdf-parse` | ^2.4.5 | PDF parsing | Scripts only |
| `chokidar` | ^5.0.0 | File watching | Scripts only |
| `fast-glob` | ^3.3.3 | File scanning | Scripts only |

### ⚠️ Large Dependencies Loaded at Runtime
`mammoth`, `pdf-parse`, `natural`, `chokidar`, `fast-glob` are used only by scripts and the knowledge brain. They are listed as production dependencies but never imported in the Next.js app. They increase:
- `node_modules` size
- Docker image size
- Potential cold start time (if tree-shaking misses them)

**Fix**: Move to `devDependencies` or a separate `package.json` in `scripts/`.

### ⚠️ `clsx` Listed as Dependency but Not Used
`package.json` doesn't include `clsx` (already removed per ACTIVE_TASKS.md). Confirmed: `grep -r "clsx" src/` returns nothing.

### Sentry Deprecation Warnings
```
[@sentry/nextjs] DEPRECATION WARNING: disableLogger is deprecated
[@sentry/nextjs] DEPRECATION WARNING: automaticVercelMonitors is deprecated
```
Not breaking today but will break in a future Sentry major.
