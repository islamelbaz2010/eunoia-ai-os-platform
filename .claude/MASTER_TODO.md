# MASTER TODO

**Last synced**: 2026-06-29  
**Work from ACTIVE_TASKS.md — this is the full backlog.**

---

## P0 — LAUNCH BLOCKERS (Must complete before first paid customer)

| # | Task | Effort | Files |
|---|------|--------|-------|
| P0-1 | Commit all untracked files to git | 30 min | `git add -A` |
| P0-2 | Apply migration 0007 to Supabase | 5 min | Manual: Supabase SQL Editor |
| P0-3 | Set `RESEND_API_KEY` + `FROM_EMAIL` in Vercel | 5 min | Manual: Vercel Dashboard |
| P0-4 | Sentry error monitoring | 4 hours | `next.config.ts`, `src/app/layout.tsx` |
| P0-5 | Verify migrations 0003-0006 applied to production | 1 hour | Supabase Dashboard |

---

## P1 — CORE PRODUCT (Complete before scaling)

| # | Task | Effort | Files |
|---|------|--------|-------|
| P1-1 | CRM: edit contact + status change | 4 hours | `crm/actions.ts`, `crm/contact-row.tsx` |
| P1-2 | KB: edit document + re-ingest | 6 hours | `knowledge-base/actions.ts`, new edit form |
| P1-3 | Org switcher (multi-org users) | 1 day | `dal.ts`, `dashboard/layout.tsx`, new component |
| P1-4 | Streaming RAG responses | 1 day | `assistant/actions.ts`, `chat.tsx`, new API route |
| P1-5 | Delete `src/app/api/status/` | 2 min | `rm -rf src/app/api/status/` |
| P1-6 | Fix `package.json` name | 2 min | `package.json:2` |
| P1-7 | Remove unused `clsx` | 2 min | `npm uninstall clsx` |
| P1-8 | Delete scaffold SVGs from `public/` | 2 min | `rm public/*.svg` (5 files) |
| P1-9 | GitHub Actions: add build step with dummy env | 30 min | `.github/workflows/ci.yml` |

---

## P2 — COMMERCIAL FEATURES (Complete before paid launch)

| # | Task | Effort | Files |
|---|------|--------|-------|
| P2-1 | Stripe billing integration | 3 days | `src/app/dashboard/billing/`, `src/app/api/stripe/` |
| P2-2 | Usage quota enforcement per tier | 4 hours | `assistant/actions.ts`, new quota check |
| P2-3 | Cursor-based pagination on all tables | 1 day | 4 page components |
| P2-4 | Chat history persistence | 2 days | New migration + `chat_messages` table |
| P2-5 | Organization invitation: resend expired invites | 2 hours | `settings/actions.ts` |
| P2-6 | CRM: contact notes field | 4 hours | DB migration + `crm/actions.ts` |

---

## P3 — POLISH (Nice to have before launch)

| # | Task | Effort | Files |
|---|------|--------|-------|
| P3-1 | PWA icons (`public/icon.png` + `public/icon-512.png`) | 1 hour | `public/` |
| P3-2 | Branded favicon (replace Next.js default) | 30 min | `src/app/favicon.ico` |
| P3-3 | Skeleton loading states (all dashboard routes) | 1 day | All `loading.tsx` files |
| P3-4 | Language-aware RAG retrieval | 2 days | `assistant/actions.ts`, migration |
| P3-5 | Arabic RTL UI support | 3 days | `src/app/globals.css`, `layout.tsx` |
| P3-6 | PDF/DOCX document ingestion | 3 days | New `src/lib/ai/parse.ts`, Supabase Storage |

---

## P4 — ENTERPRISE (Phase 4+)

| # | Task | Effort |
|---|------|--------|
| P4-1 | Multi-property aggregate dashboard | 2 weeks |
| P4-2 | SSO / SAML authentication | 2 weeks |
| P4-3 | Data export (CSV) | 2 days |
| P4-4 | REST API for PMS integrations | 2 weeks |
| P4-5 | White-labeling (custom domain per org) | 3 weeks |
| P4-6 | Staff training / quiz mode | 1 week |
| P4-7 | Guest-facing embedded chatbot | 2 weeks |

---

## COMPLETED

- [x] Auth: signup, login, logout, PKCE callback
- [x] Auth: password reset (forgot + update pages + actions)
- [x] Onboarding: org creation (create_organization RPC)
- [x] Dashboard: KPI overview + Recharts charts
- [x] CRM: create + list + delete contacts
- [x] Knowledge Base: add + list + delete documents
- [x] RAG Assistant: full pipeline (embed → search → GPT → cite)
- [x] RAG: source citations displayed in chat UI
- [x] RAG: per-user hourly rate limiting (50/hour)
- [x] Team settings: invite + revoke + accept + role change + remove
- [x] Email invites: Resend SDK integration
- [x] Audit logs: immutable, fire-and-forget
- [x] Usage tracking: per-event, SQL aggregation RPC
- [x] Usage page: O(1) SQL GROUP BY (was O(N) JS)
- [x] Super admin panel
- [x] Health check API (public, unauthenticated)
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] RLS on all 9 tables
- [x] Structured JSON logger
- [x] GitHub Actions CI (lint + tsc + test)
- [x] 29-test Vitest suite
- [x] Supabase migration 0007 (get_usage_totals RPC)
- [x] .env.example: RESEND_API_KEY + FROM_EMAIL documented
