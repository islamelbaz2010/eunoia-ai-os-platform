# PROJECT TIMELINE
## Eunoia AI OS — What Has Been Built, What Remains

**Last updated**: 2026-06-28  
**Source**: Git history (8 commits, all on 2026-06-23) + source code audit

---

## What Has Been Completed

### Phase 1 — Core Platform (Complete)

All work completed on **2026-06-23** in a rapid development sprint using Claude Code.

#### Sprint 1 — Foundation (Commits `f6ab637` → `e97c48c`)
- Next.js 16.2.9 project scaffolding
- Supabase integration (`@supabase/ssr ^0.12.0`)
- Complete database schema: 9 tables, 4 enums, 22 RLS policies, triggers (migration `0001_init.sql`)
- Authentication: login, signup, logout, session refresh via `proxy.ts`
- Data Access Layer: `verifySession()`, `getProfile()`, `getMemberships()`, `getActiveOrganization()`
- Dashboard shell with sidebar navigation
- CRM: contact list + add contact (`createContact()`)
- Knowledge Base: document list + add document form
- Settings: invite system, member management (role change + remove)
- Audit logs page
- Usage tracking page
- Super admin panel (platform-wide org view)
- Error boundaries and loading states for all routes

#### Sprint 2 — AI + Invites + Tests (Commit `540dc5e`)
- RAG pipeline: `chunk.ts` (1000/150 sliding window), `openai.ts` (embedding singleton), `ingest.ts` (chunk → embed → store)
- Migration `0002_rag_invites.sql`: HNSW index, `match_kb_chunks` RPC, `organization_invites` table + `accept_org_invite` RPC
- Migration `0003_grants.sql`: GRANT statements
- Full RAG assistant: `askAssistant()` server action + `chat.tsx` chat UI
- Dashboard charts: AreaChart (usage over time), PieChart (CRM status)
- Invite acceptance page (`/invite?token=...`)
- TypeScript types, `hasRole()`, `ROLE_RANK` (`types.ts`)
- Structured logger (`logger.ts`)
- Environment validation (`env.ts`)
- Audit/usage logging (`audit.ts`)
- 29 unit tests (chunk × 6, types × 17, utils × 6) — all passing
- Integration scripts: `test-rag.js`, `test-openai.js`

#### Sprint 3 — Merge + Config (Commits `3ff63ca` → `524b324`)
- PR merge from `claude/affectionate-carson-vyp470` to `main`
- `.env.example` updated with placeholder values and all required variable names

#### Sprint 4 — Onboarding + Schema Hardening (Commit `ca48d97`)
- Onboarding flow (`/onboarding`) with `createOrganization()` server action
- Dashboard layout redirect → onboarding if no org membership
- Migration `0005_schema_hardening.sql`:
  - FK `ON DELETE SET NULL` on `created_by` / `actor_id` / `invited_by` columns (5 FKs)
  - Creator-can-delete-own-KB-document policy
  - `create_organization()` RPC (atomic, slug validation, max-3-orgs anti-abuse)

#### Sprint 5 — Production Hardening (Commit `1ef54a3`)
- Migration `0004_indexes_policies.sql`: 4 performance indexes, missing RLS policies
- Migration `0006_hardening_v2.sql`: `org_members_org_role_idx`, `embedding NOT NULL`, `FOR UPDATE` lock in `accept_org_invite`
- Security headers in `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Error message hardening: `error.tsx` shows `error.digest` only
- Invite acceptance auto-redirect and generic error message
- `askAssistant()`: 500-char question limit, MIN_SIMILARITY = 0.3 filter
- OpenAI client: 30s timeout, 2 retries, 512 batch size
- Health check endpoint `/api/health`
- Auth callback route handler `/auth/callback`
- PWA manifest, sitemap.ts, robots.txt
- Root layout SEO metadata
- `.nvmrc`, `.vercelignore`

---

## Current Milestone

**Phase 1: Complete**  
**Phase 2: Not started**

As of 2026-06-28, the codebase is in a "complete Phase 1, not yet Phase 2" state. All core features work. Three operational gaps block commercial launch: no password reset, no email invite delivery, no error monitoring.

**Build status**: Passing (29/29 tests, TypeScript clean)  
**Deployment**: Live at eunoiaos.com  
**Customers**: 0  
**Revenue**: $0  

---

## Remaining Milestones

### Milestone 2 — Launch Readiness

**Goal**: Ready to accept first paying customer  
**Estimated effort**: 1 developer × 2 weeks  
**Target date**: ~2026-07-12  

| Task | Effort | Depends On | Priority |
|------|--------|-----------|---------|
| Commit migrations 0003-0006 to git | 0.5h | Nothing | P0 |
| Verify migrations applied to prod Supabase | 1h | Above | P0 |
| Fix 2× console.error → logger.error | 0.5h | Nothing | P0 |
| Install Sentry | 4h | Nothing | P0 |
| Implement password reset | 8h | Nothing | P0 |
| Email delivery for invites (Resend) | 16h | Nothing | P0 |
| Add GitHub Actions CI | 4h | Nothing | P1 |
| Fix usage page O(N) → SQL GROUP BY | 3h | Nothing | P1 |
| Fix dashboard chart O(N) → SQL GROUP BY | 3h | Nothing | P1 |
| Display RAG sources in chat UI | 2h | Nothing | P1 |
| Add rate limiting on `askAssistant()` | 8h | Nothing | P1 |
| **Milestone 2 total** | **~50h** | — | — |

### Milestone 3 — Product Completeness

**Goal**: Feature-complete for power users; ready for sales demos to hotel chains  
**Estimated effort**: 1 developer × 4-6 weeks  
**Target date**: ~2026-08-15  

| Task | Effort |
|------|--------|
| Stripe billing integration | 24h |
| Usage quota enforcement (per-org limits) | 8h |
| CRM edit/delete contacts | 6h |
| KB document edit/delete/re-ingest | 6h |
| Organization switcher | 8h |
| Pagination (CRM, KB, audit, settings) | 8h |
| PWA branded icons + favicon | 2h |
| RAG streaming responses | 8h |
| Conversation history persistence | 16h |
| File upload for KB (PDF, DOCX) | 24h |
| Welcome and transactional emails | 4h |
| **Milestone 3 total** | **~114h** |

### Milestone 4 — Enterprise Readiness

**Goal**: Deployable to multi-property hotel chains; Arabic UI; SLA  
**Estimated effort**: 1-2 developers × 2-3 months  
**Target date**: ~2026-10-01  

| Task | Effort |
|------|--------|
| Multi-property aggregate dashboard | 40h |
| SSO / SAML integration | 40h |
| Data export (CRM CSV, KB export) | 8h |
| Arabic RTL UI | 40h |
| Terms of service + privacy policy pages | 16h |
| REST API for PMS integrations | 40h |
| White-labeling (custom domain per org) | 24h |
| **Milestone 4 total** | **~208h** |

### Milestone 5 — Advanced AI

**Goal**: Next-generation AI capabilities  
**Estimated effort**: 1-2 developers × 2-3 months  
**Target date**: ~2027-01-01  

| Task | Effort |
|------|--------|
| Multi-turn conversation | 16h |
| Language-aware retrieval | 8h |
| Cross-encoder reranking (Cohere Rerank) | 16h |
| Guest-facing embedded chatbot | 40h |
| PMS data pull (reservations → CRM) | 40h |
| KB template marketplace | 60h |
| **Milestone 5 total** | **~180h** |

---

## Dependencies and Critical Path

```
Milestone 2 (Launch Readiness)
  ├── Commit migrations (P0, 30 min) ─────────────────── UNBLOCKED
  ├── Fix console.error (P0, 30 min) ───────────────── UNBLOCKED
  ├── Install Sentry (P0, 4h) ───────────────────────── UNBLOCKED
  ├── Password reset (P0, 8h) ────────────────────────── UNBLOCKED
  ├── Email delivery (P0, 16h) ───────────────────────── UNBLOCKED (needs Resend account)
  └── Rate limiting (P1, 8h) ─────────────────────────── UNBLOCKED
          │
Milestone 3 (Product Completeness)
  ├── Stripe billing (24h) ──────────────────────────── needs: pricing finalized
  ├── Usage quota enforcement (8h) ───────────────────── needs: Stripe done
  ├── CRM edit/delete (6h) ───────────────────────────── UNBLOCKED
  ├── KB edit/delete (6h) ────────────────────────────── UNBLOCKED
  ├── Org switcher (8h) ──────────────────────────────── UNBLOCKED
  └── Pagination (8h) ────────────────────────────────── UNBLOCKED
          │
Milestone 4 (Enterprise)
  ├── Arabic RTL (40h) ───────────────────────────────── needs: designer + RTL CSS expertise
  ├── REST API (40h) ─────────────────────────────────── needs: API design + auth strategy
  └── SSO/SAML (40h) ─────────────────────────────────── needs: enterprise customer driving it
```

---

## Effort Summary

| Milestone | Hours | Calendar (1 dev) | Revenue Gate |
|-----------|-------|-----------------|-------------|
| Phase 1 | ~200h (done) | 1 day (2026-06-23) | — |
| Milestone 2 (Launch) | ~50h | 2 weeks | First beta user |
| Milestone 3 (Complete) | ~114h | 4-6 weeks | First paying customer |
| Milestone 4 (Enterprise) | ~208h | 2-3 months | First enterprise contract |
| Milestone 5 (Advanced AI) | ~180h | 2-3 months | Premium tier |
| **Total remaining** | **~552h** | **~6-8 months** | — |

---

## Git History Reference

| Commit | Date | Summary |
|--------|------|---------|
| `f6ab637` | 2026-06-23 | Initial create-next-app scaffold |
| `e97c48c` | 2026-06-23 | Auth, RBAC schema, dashboard shell, CRM, KB, Settings |
| `540dc5e` | 2026-06-23 | RAG pipeline, AI pipeline, invites, tests, charts |
| `3ff63ca` | 2026-06-23 | Merge PR #1 from claude/affectionate-carson-vyp470 |
| `6e8c5ff` | 2026-06-23 | .env.example with real variable names |
| `524b324` | 2026-06-23 | .env.example with placeholder values |
| `ca48d97` | 2026-06-23 | Onboarding flow, create_organization RPC, schema hardening |
| `1ef54a3` | 2026-06-23 | Security headers, health check, auth callback, hardening migrations |

**Note on `1ef54a3` commit message**: Says "add organization switcher" but no switcher UI was implemented. The commit fixed invite RLS policies and added production hardening. `getActiveOrganization()` still returns `memberships[0]` with no switching mechanism.

**Untracked files** (exist locally, not in git):
- `supabase/migrations/0003-0006` — CRITICAL: commit these immediately
- `scripts/`, `src/app/api/`, `src/app/auth/`, `src/app/onboarding/`, loading files, test files, `src/lib/logger.ts`, `src/lib/utils.ts`, `src/lib/types.ts`, `src/app/manifest.ts`, `src/app/sitemap.ts`
