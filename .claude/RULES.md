# RULES — Hard Rules for Every Session

These override all defaults. No exceptions.

---

## OUTPUT RULES

**Every session must produce one or more of:**
- Working code
- Passing tests
- Infrastructure improvements
- Security improvements
- Bug fixes
- Performance improvements

**Never produce:**
- Markdown-only sessions (documentation without code)
- Placeholder implementations
- Pseudo-code
- TODO comments left in code
- Commented-out code
- Dead code

If the session ended with more markdown than source code: **session failed.**

---

## CODE RULES

```
ALWAYS:
  ✓ Use Zod v4: parsed.error.issues[0]?.message (not .errors[0])
  ✓ Use useActionState (React 19), not useFormState
  ✓ Use proxy.ts at root, export proxy() (Next.js 16)
  ✓ Import "server-only" on all secret-adjacent server files
  ✓ Call verifySession() at the start of every Server Action
  ✓ Use void logAuditEvent({...}) — fire-and-forget always
  ✓ Use logger.error/warn/info — never console.error/log
  ✓ Validate every Server Action input with Zod before DB access
  ✓ Add .eq("organization_id", membership.organization.id) to every query
  ✓ Check hasRole(membership.role, "admin") before destructive ops

NEVER:
  ✗ Call console.error, console.log, console.warn in production code
  ✗ Add SUPABASE_SERVICE_ROLE_KEY to any cloud environment
  ✗ Skip verifySession() in Server Actions
  ✗ Trust client-supplied organization_id (always use membership.organization.id)
  ✗ Remove import "server-only" from sensitive files
  ✗ Use useFormState (removed in React 19)
  ✗ Create middleware.ts (renamed to proxy.ts in Next.js 16)
  ✗ Call z.email("error message") (Zod v4: z.email({ error: "..." }))
```

---

## SECURITY RULES

- RLS is the real security boundary. App-layer checks are defense-in-depth only.
- Every new table requires RLS enabled + at least one SELECT policy.
- Never expose internal error messages (`error.message`) to the client — use `error.digest` in error.tsx.
- Rate-limit all AI-calling endpoints (currently 50 RAG queries/user/hour).
- Sanitize all user input before embedding (Zod enforces length/type bounds).
- No cross-tenant data access: every query must be scoped to `organization_id`.

---

## DATABASE RULES

- Never edit existing migrations — always create a new migration file.
- Every migration filename: `NNNN_descriptive_name.sql` (next is `0008_...`).
- Migrations must be reversible where possible.
- New functions must be `SECURITY DEFINER SET search_path = public`.
- After writing a migration: add a `GRANT EXECUTE` statement for the right role.
- Always use `CREATE OR REPLACE FUNCTION` (idempotent re-runs).
- Apply migrations to production BEFORE deploying code that depends on them.

---

## TESTING RULES

- All 29 tests must pass before committing.
- New server actions with business logic require at least one unit test.
- Run `npx tsc --noEmit && npm run lint && npm test` before every commit.
- Integration tests (scripts/test-rag.js) are run manually with .env.local.

---

## GIT RULES

- Commits must be atomic (one logical change per commit).
- No unrelated changes in the same commit.
- No dead code, no TODO comments, no placeholder implementations in commits.
- Commit message must describe WHY, not just WHAT.

---

## EXECUTION REPORT TEMPLATE

Output this at the end of every session:

```
# EXECUTION REPORT

Task Completed:
Files Changed:
Tests:          X/29 passing
TypeScript:     Clean / X errors
Lint:           Clean / X warnings
Migration:      None / [filename] — needs manual apply in Supabase
Security Impact:
Performance Impact:
Breaking Changes:
Rollback Required:
Next Highest Priority Task:
Commercial Readiness:     XX%
Production Readiness:     XX/100
```
