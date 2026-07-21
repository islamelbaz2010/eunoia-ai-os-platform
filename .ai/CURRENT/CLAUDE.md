@AGENTS.md
@.claude/RULES.md
@.claude/CURRENT_STATE.md
@.claude/ACTIVE_TASKS.md

---

# Eunoia AI OS — Claude Engineering OS

## BOOT SEQUENCE (runs automatically on every session)

When this file is loaded, execute in order — no exceptions:

```
STEP 1  Read .claude/CURRENT_STATE.md        ← already loaded above via @
STEP 2  Read .claude/ACTIVE_TASKS.md         ← already loaded above via @
STEP 3  Run: npx tsc --noEmit && npm run lint && npm test
STEP 4  Report: "Session ready. Tests: X/29. Active task: [task name]."
STEP 5  Begin top task from ACTIVE_TASKS.md — no confirmation needed
```

## THE "Continue" COMMAND

When the user says any of: **Continue / Go / Next / Resume / Ship it / Keep going**

→ Execute BOOT SEQUENCE  
→ Implement the first `[ ]` task in `.claude/ACTIVE_TASKS.md`  
→ No questions. No planning docs. No confirmation.

## SESSION END (before every response that ends work)

```
1. Update .claude/CURRENT_STATE.md — reflect what changed
2. Update .claude/ACTIVE_TASKS.md — check off completed, add next task
3. Append to .claude/CHANGELOG.md — one entry per session
4. Output the EXECUTION REPORT (template in .claude/RULES.md)
```

## CRITICAL FACTS — Never get these wrong

| Fact | Value |
|------|-------|
| Next.js version | **16.2.9** — `proxy.ts` not `middleware.ts`, export `proxy()` not `middleware()` |
| React version | **19.2.4** — `useActionState` not `useFormState` |
| Zod version | **v4** — `parsed.error.issues[0]?.message`, not `.errors[0]` |
| Tailwind version | **v4** — `@import "tailwindcss"` syntax |
| Security source of truth | **Postgres RLS** — proxy and DAL are convenience layers only |
| Forbidden in Vercel | `SUPABASE_SERVICE_ROLE_KEY` — scripts only, never in cloud env |
| `server-only` files | `dal.ts openai.ts ingest.ts audit.ts env.ts server.ts` |
| Active org | `memberships[0]` — no switcher yet |
| Test count | 29 tests — all must pass before committing |

## KEY FILE MAP

| Task | File |
|------|------|
| Route protection | `proxy.ts` (root) |
| Auth actions | `src/lib/auth/actions.ts` |
| Session + org | `src/lib/auth/dal.ts` |
| RAG query | `src/app/dashboard/assistant/actions.ts` |
| Embeddings + chat | `src/lib/ai/openai.ts` |
| Document ingestion | `src/lib/ai/ingest.ts` |
| Audit + usage logging | `src/lib/auth/audit.ts` |
| Invite + member mgmt | `src/app/dashboard/settings/actions.ts` |
| Email delivery | `src/lib/email.ts` (Resend) |
| DB migrations | `supabase/migrations/0001–0007` |
| Environment vars | `src/lib/env.ts` |
| Structured logging | `src/lib/logger.ts` |

## REFERENCE FILES (read when needed)

- `.claude/PROJECT.md` — Full product + architecture overview
- `.claude/MASTER_TODO.md` — Complete task backlog by priority
- `.claude/ROADMAP.md` — Phase plan and milestones
- `.claude/BUGS.md` — Known bugs and status
- `.claude/DECISIONS.md` — Why we made key architecture choices
- `.claude/COMMANDS.md` — All dev/test/deploy commands
- `.claude/RELEASE.md` — Pre-release and deployment procedure
- `.claude/PROMPTS.md` — Pre-built prompts for common tasks
- `.claude/CHANGELOG.md` — Full history of session changes
- `docs/MASTER_CTO_HANDBOOK.md` — Authoritative deep-dive reference
