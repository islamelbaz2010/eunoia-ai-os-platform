# CODE ↔ DOCUMENTATION DIFF
## Eunoia AI OS — Discrepancies, Dead Code, and Gaps

**Date**: 2026-06-28  
**Method**: Every section of documentation compared against verified source code.  
**Verdict format**: MATCH | WRONG | DOC-ONLY | CODE-ONLY | DEAD

---

## 1. Features Documented But NOT Implemented

These appear in documentation as existing features, but the code does not implement them.

| Feature | Documentation Claims | Reality | File(s) | Impact |
|---------|---------------------|---------|---------|--------|
| Organization switcher | Multiple docs mention "users can switch orgs" | `getActiveOrganization()` always returns `memberships[0]` with no UI to change | `dal.ts:56` | Users with multiple orgs are stuck in first org |
| RAG source display in UI | `07_AI.md` documents `sources[]` as returned and visible | `chat.tsx` receives `sources` but never renders them | `assistant/chat.tsx` | RAG citations are invisible to users |
| Chat history | Product docs describe conversational assistant | `useState<Message[]>([])` — lost on page refresh | `assistant/chat.tsx` | Every session starts blank |
| API status endpoint | `src/app/api/status/` directory exists | Empty directory — no `route.ts` file | `src/app/api/status/` | Dead directory creates false expectation |
| `login/page.tsx` and `signup/page.tsx` | Documented as existing | ✅ THESE DO EXIST (verified) | — | (No gap — prior confusion resolved) |
| `admin/page.tsx` | Documented as existing | ✅ EXISTS (verified) | — | (No gap) |
| Email delivery for invites | Invite flow documented as complete | No email transport configured; invite link must be copied manually | `settings/actions.ts` | Invitees never receive invite URL |

---

## 2. Features Implemented But NOT Documented (or Underdocumented)

These exist in code but documentation is missing or thin.

| Feature | Where in Code | Documentation Status | Notes |
|---------|--------------|---------------------|-------|
| `console.error` instead of `logger.error` | `kb/actions.ts:83`, `auth/callback/route.ts:18` | Documented in BUGS.md and FINAL_CTO_REPORT.md but NOT in 07_AI.md or 19_API_REFERENCE.md | Should be in technical debt doc |
| Zod v4 `parsed.error.issues[0]?.message` pattern | All server actions | Referenced in architecture docs but not in 08_SECURITY.md validation table | Minor gap |
| `useTransition` pattern in MemberRow/InviteRow | `settings/member-row.tsx`, `settings/invite-row.tsx` | 04_ARCHITECTURE.md notes exception; 19_API_REFERENCE.md doesn't clarify | Minor gap |
| `acceptInvite` action | `settings/actions.ts` | Listed in API reference but its form trigger (`invite/page.tsx`) is not well documented | Minor gap |
| Usage page `.limit(10000)` | `usage/page.tsx` | Documented in BUGS.md and 13_PERFORMANCE.md | Properly captured |
| Dashboard `.limit(2000)` / `.limit(5000)` | `dashboard/page.tsx` | Documented in BUGS.md and 13_PERFORMANCE.md | Properly captured |
| `eunoia-ai-os-app` git remote misconfiguration | Local git config | Documented in FINAL_CTO_REPORT.md | Properly captured |
| `package.json` name is "eunoia-ai-os-app" | `package.json:2` | Documented in FINAL_CTO_REPORT.md | Properly captured |

---

## 3. Documentation Errors (Code Contradicts Documentation)

| Doc File | Claim in Doc | Reality from Code | Severity |
|----------|-------------|-------------------|---------|
| `00_PROJECT_MASTER_CONTEXT.md` | Lists `clsx ^2.1.1` in tech stack table | `clsx` is in `package.json` but has zero imports in source — dead dependency | MINOR |
| `04_ARCHITECTURE.md` | States all server actions use `useActionState` | `MemberRow` and `InviteRow` use `useTransition` — but this exception IS noted in the same doc | NONE (self-consistent) |
| `19_API_REFERENCE.md` | Lists `/api/health` and `/auth/callback` as the two route handlers | Correct — but `src/app/api/status/` empty directory could mislead | MINOR |
| Prior `.claude/MASTER_CONTEXT.md` (old) | "7 commits" | Git log shows 8 commits | Corrected in current docs |
| `16_CHANGELOG.md` | Documents all 8 commits | ✅ CORRECT — no contradiction | NONE |

---

## 4. Dead Code (Exists in Codebase, Serves No Purpose)

| Item | Type | Location | Why Dead | Action |
|------|------|----------|---------|--------|
| `src/app/api/status/` | Empty directory | `src/app/api/status/` | No `route.ts` file exists inside | Delete directory |
| `public/globe.svg` | Dead asset | `public/globe.svg` | Default Next.js scaffold, not referenced anywhere | Delete |
| `public/file.svg` | Dead asset | `public/file.svg` | Default Next.js scaffold, not referenced anywhere | Delete |
| `public/window.svg` | Dead asset | `public/window.svg` | Default Next.js scaffold, not referenced anywhere | Delete |
| `public/next.svg` | Dead asset | `public/next.svg` | Default Next.js scaffold, not referenced anywhere | Delete |
| `public/vercel.svg` | Dead asset | `public/vercel.svg` | Default Next.js scaffold, not referenced anywhere | Delete |
| `clsx` package | Dead dependency | `package.json` | Listed in dependencies, zero imports in source | Remove from package.json |
| `eunoia-ai-os-app` (entire repo) | Dead repository | `/Users/ahmed/Documents/eunoia-ai-os-app` | Only contains default scaffold + xlsx | Archive or repurpose |
| `~$eunoia-ai-os.xlsx` | Temp file | `eunoia-ai-os-app` repo | Excel temp/lock file | Delete |

---

## 5. Dead Documentation

| Doc File | Status | Reason |
|----------|--------|--------|
| `docs/18_FILE_INVENTORY.md` | SUPERSEDED | `docs/MASTER_FILE_INDEX.md` is more complete and verified; 18_FILE_INVENTORY.md is an earlier, less accurate version |

---

## 6. Unused Components / Routes

| Item | Type | Status | Notes |
|------|------|--------|-------|
| `src/app/api/status/` | Route directory | EMPTY | Not a valid route |
| `knowledge_base_documents.status` field | DB column | PARTIALLY USED | Always set to `published` on create; `draft` and `archived` statuses are in the enum but no UI exists to change them |
| `knowledge_base_documents.language` field | DB column | STORED, NOT USED FOR SEARCH | Language is stored and exposed in form, but `match_kb_chunks` RPC doesn't filter by language |
| `crm_contacts.notes` field | DB column | STORED, NOT IN UI | Notes column exists in schema but `createContact()` doesn't write it and the list page doesn't show it |
| `usage_events.quantity` field | DB column | ALWAYS 1 | Schema allows numeric quantity; app always passes `1` |

---

## 7. Unused Dependencies / Packages

| Package | Status | Location | Action |
|---------|--------|----------|--------|
| `clsx` v2.1.1 | DEAD — zero imports in source | `package.json` | Remove with `npm uninstall clsx` |
| `@vitest/coverage-v8` | INSTALLED, NO COVERAGE SCRIPT | `package.json` devDeps | Keep if planning to add `--coverage` flag; otherwise remove |

---

## 8. Unused Environment Variables

| Variable | Status | Notes |
|---------|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | NOT USED IN APP | Only used in `scripts/test-rag.js`. Listed in `.env.example` — should NOT be added to Vercel. Risk: new developers may add it to Vercel if they blindly import all `.env.example` vars. |
| `NEXT_PUBLIC_APP_URL` | OPTIONAL | Used in `layout.tsx` and `sitemap.ts` with fallback to `"https://eunoiaos.com"`. Not strictly required — app works without it. |

---

## 9. Missing Files Referenced in Code

| File | Referenced By | Status |
|------|--------------|--------|
| `public/icon.png` | `src/app/manifest.ts` (192×192 icon) | MISSING — PWA install broken |
| `public/icon-512.png` | `src/app/manifest.ts` (512×512 icon) | MISSING — PWA install broken |

---

## 10. Migrations: Git Status vs. Application Status

| Migration | Committed to Git? | Applied to Production? | Risk |
|-----------|------------------|----------------------|------|
| `0001_init.sql` | ✅ Yes | ✅ Presumed yes (app runs) | Low |
| `0002_rag_invites.sql` | ✅ Yes | ✅ Presumed yes (RAG works) | Low |
| `0003_grants.sql` | ❌ Untracked | ❓ Unknown | HIGH — if not applied, service_role scripts break |
| `0004_indexes_policies.sql` | ❌ Untracked | ❓ Unknown | HIGH — performance indexes + missing policies |
| `0005_schema_hardening.sql` | ❌ Untracked | ❓ Unknown | HIGH — create_organization RPC + FK fixes |
| `0006_hardening_v2.sql` | ❌ Untracked | ❓ Unknown | HIGH — race condition fix + embedding NOT NULL |

---

## Summary

| Category | Count |
|----------|-------|
| Features documented but not implemented | 5 |
| Features implemented but undocumented | 8 |
| Documentation errors | 1 significant, 3 minor |
| Dead code items | 9 |
| Dead documentation files | 1 |
| Unused DB columns | 4 |
| Dead dependencies | 1 |
| Missing files | 2 |
| Untracked migrations | 4 |
| **Total discrepancies** | **~38** |
