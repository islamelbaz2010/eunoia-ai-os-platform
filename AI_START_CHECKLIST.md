# AI_START_CHECKLIST.md
**Purpose**: Every AI assistant (Claude, Gemini, GPT, Cursor) that touches this codebase MUST read this before writing a single line of code.  
**Last updated**: 2026-07-07 — Forensic Audit Revision

---

## STEP 1 — Read These Files First (In Order)

```
1. PROJECT_CONTEXT.md        ← business vision, architecture, roadmap
2. .claude/CURRENT_STATE.md  ← what is working, what is not (WARNING: partially stale)
3. .claude/ACTIVE_TASKS.md   ← current sprint
4. .claude/RULES.md          ← hard rules, non-negotiable
5. .claude/BUGS.md           ← known issues (WARNING: partially stale — see below)
```

---

## STEP 2 — Run Before Touching Code

```bash
npx tsc --noEmit        # Must show 0 errors in src/ (1 known error in scripts/)
npm run lint            # 13 known ESLint errors — verify yours aren't new
npm test                # Must show 309 tests passing
```

---

## STEP 3 — Framework Reality Check

This is NOT standard Next.js. You will get it wrong if you use defaults.

| What you think | What is actually true |
|---------------|----------------------|
| `middleware.ts` handles routing | ❌ — file is `proxy.ts` at ROOT, exports `proxy()` not `middleware()` |
| `useFormState` from React DOM | ❌ — React 19: use `useActionState` |
| `z.email("error message")` | ❌ — Zod v4: `z.email({ error: "message" })` |
| `parsed.error.errors[0]` | ❌ — Zod v4: `parsed.error.issues[0]?.message` |
| `@import 'tailwindcss/base'` | ❌ — Tailwind v4: `@import "tailwindcss"` |
| `import "server-only"` is optional | ❌ — REQUIRED on all secret-adjacent files |

---

## STEP 4 — Security Rules (Non-Negotiable)

Every Server Action MUST follow this pattern:

```typescript
"use server";
// REQUIRED imports
import { verifySession, getActiveOrganization } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/auth/audit";
import * as z from "zod";

export async function doSomething(input: FormData) {
  // Step 1: Auth — ALWAYS first
  const session = await verifySession();
  const membership = await getActiveOrganization();
  if (!membership) return { error: "No active organization." };

  // Step 2: Validate input with Zod
  const parsed = schema.safeParse({ ... });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Step 3: DB query — ALWAYS scoped to organization_id from membership (NEVER client-supplied)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("your_table")
    .select("...")
    .eq("organization_id", membership.organization.id);  // ← mandatory

  // Step 4: Audit log — fire-and-forget
  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "your_entity.action",
    ...
  });
}
```

**NEVER**:
- Skip `verifySession()` at the start
- Use `organization_id` from form input or URL params
- Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env
- Use `console.log/error/warn` — use `logger.info/error/warn`
- Trust `membership.organization.id` from client props

---

## STEP 5 — Architecture Alerts

### Two Separate "Knowledge" Systems in AI OS (Do Not Confuse)

| System | Location | Purpose | Connected to Supabase? |
|--------|----------|---------|----------------------|
| SaaS KB (Product) | `src/app/dashboard/knowledge-base/` | Customers upload docs → RAG | ✅ YES |
| Local Knowledge Pipeline (Transitional) | `src/lib/knowledge/` + `knowledge/` | Founder's company assets — being redesigned as KPM consumer | ❌ NO — intentionally in-memory |

The RAG Assistant at `/dashboard/assistant` uses **Supabase** (knowledge_base_chunks table + pgvector HNSW). The `KnowledgeRepository` class is **intentionally in-memory** as a transitional implementation — it will become a KPM (Knowledge Package Manager) consumer once Knowledge Cloud delivers signed packs. This is an approved architectural decision per `docs/architecture/AI_OS_ALIGNMENT_REPORT.md`. Do NOT try to wire KnowledgeRepository to Supabase directly — that is not the KB-3 architecture.

### Three-Repository Relationship (Critical Context)

| Repository | Role | Your Rules |
|-----------|------|-----------|
| `eunoia-ai-os-platform` (THIS REPO) | ACTIVE — Commercial SaaS | All application development here |
| `eunoia-knowledge-cloud` | INDEPENDENT KNOWLEDGE FACTORY — produces Knowledge Packs | Do NOT sync code automatically; do NOT move code unless explicitly justified |
| `eunoia-ai-os-app` | ARCHIVED PROTOTYPE — 1 commit only | Never develop here; never migrate code from here |

### KB-3 Dependencies (Do Not Start KPM Until These Are Done)

The approved conditions from `docs/architecture/AI_OS_ALIGNMENT_REPORT.md` before starting KB-3:
1. Freeze stable contracts: manifest.json schema, resolver API, telemetry schema
2. Fix KC-1 critical issues (add GeneratorPipeline interface, fix IMetadataExtractor, remove fs.readFileSync from pure builder)
3. Commit KC-1 to Knowledge Cloud main branch
4. Build KC-2 Registry in Knowledge Cloud

Do NOT implement KPM, KnowledgeRepositoryAdapter, or any KC↔AI OS bridge until these conditions are met.

### Migration Landmine

There are **conflicting migration files** in `supabase/migrations/`:
- `0009_enterprise_multitenant.sql` — OLD, has bugs
- `0009_enterprise_multitenant_fixed.sql` — OLD fix attempt, superceded
- `0009a_enum_roles.sql` + `0009b_enterprise_schema.sql` — **CORRECT ONES to apply**
- `0010_crm_platform.sql` — OLD version
- `0010_crm_platform_fixed.sql` — **CORRECT ONE to apply**

**Apply ONLY**: 0009a → 0009b → 0010_crm_platform_fixed.sql (in that order)

### The `_assetSeq` Problem

`src/lib/knowledge/knowledge.ts` line 34 has a module-level counter:
```typescript
let _assetSeq = 0;
function nextCanonicalId(): string { return `KB-${String(++_assetSeq).padStart(6, "0")}`; }
```
This resets on every deploy/restart. `KB-000001` will appear multiple times across restarts. Never rely on canonicalId for cross-session identity.

---

## STEP 6 — Current Known Defects

### CRITICAL — Fix Before Demo

| ID | Issue | File | Fix |
|----|-------|------|-----|
| ENV-1 | RESEND_API_KEY missing in Vercel | Vercel Dashboard | Add env var |
| ENV-2 | METRICS_TOKEN missing in Vercel | Vercel Dashboard | Prometheus is public |
| ENV-3 | SENTRY_DSN missing in Vercel | Vercel Dashboard | Errors invisible |
| DB-1 | Migration 0007 not applied in prod | Supabase SQL Editor | Usage page broken |
| DB-2 | Migration 0008 not applied in prod | Supabase SQL Editor | Health check DB fn missing |

### HIGH — Fix Before Release

| ID | Issue | File | Notes |
|----|-------|------|-------|
| LINT-1 | 13 ESLint errors | validator/index.ts, scripts/* | CI fails |
| TS-1 | 1 TypeScript error | scripts/knowledge/quality-report.ts | Missing FileMetadata type |
| UX-1 | RAG blocks 5–6s | assistant/actions.ts | No streaming |
| UX-2 | Chat history lost on refresh | assistant/chat.tsx | No persistence |
| DATA-1 | Tables truncate silently | CRM (200), KB (100), Audit (50) | No pagination |

### MEDIUM — Fix This Sprint

| ID | Issue | File | Notes |
|----|-------|------|-------|
| KB-1 | KB: no document edit | knowledge-base/actions.ts | Only add/delete |
| KB-2 | No PDF/DOCX upload | knowledge-base/ | Text paste only |
| BIZ-1 | No Stripe billing | Missing entirely | Cannot charge money |
| BIZ-2 | No quota enforcement | assistant/actions.ts | Rate limit only |

---

## STEP 7 — Environment Variables Required

| Variable | Local | Vercel | Required For |
|----------|-------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Everything |
| `OPENAI_API_KEY` | ✅ | ✅ | RAG + embeddings |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | Email links |
| `RESEND_API_KEY` | ❓ | ❌ | Team invites |
| `FROM_EMAIL` | ❓ | ❌ | Team invites |
| `NEXT_PUBLIC_SENTRY_DSN` | ❓ | ❌ | Client error tracking |
| `SENTRY_DSN` | ❓ | ❌ | Server error tracking |
| `METRICS_TOKEN` | ❓ | ❌ | Prometheus auth |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ NEVER | Scripts ONLY |

---

## STEP 8 — Branching Reality

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | Behind by 30+ commits | GitHub default — stale |
| `eunoia-ai-os-platform` | **Production branch** | All feature work here |
| `sprint-2` | Partially merged | CRM UI fixes — verify merge status |
| `feature/knowledge-brain` | Merged | Knowledge layer experiments |
| `fix/crm-production` | Merged via PR #2 | CRM production fixes |
| `backup/sprint1-production` | Archive | Safety backup |

**Current work always goes on `eunoia-ai-os-platform`.**  
**Do NOT push to `main` without a PR review.**

---

## STEP 9 — Test Coverage Reality

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| types.test.ts | 7 | hasRole() function |
| utils.test.ts | ~20 | Utility functions |
| authorization.test.ts | ~20 | Role authorization |
| permissions.test.ts | ~20 | Permission checks |
| knowledge.test.ts | ~30 | processAsset, chunking, search |
| repository.test.ts | ~30 | KnowledgeRepository CRUD |
| importer/importer.test.ts | 43 | Scanner, Parser, Classifier, Validator, Registry |
| chunk.test.ts | ~10 | Text chunking |
| crm.test.ts | ~10 | CRM validation |
| **TOTAL** | **309** | **Pure functions + lib only** |

**ZERO tests for**: Server Actions, API routes, UI components, database queries, authentication flows, email sending, audit logging.

---

## STEP 10 — Commit Discipline

Before every commit:
```bash
npx tsc --noEmit   # 0 errors in src/
npm run lint       # 0 NEW errors beyond existing 13
npm test           # 309/309 passing
```

Commit message format (mandatory):
```
type(scope): description — WHY not WHAT

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `security` `refactor` `docs` `chore` `test` `perf`
