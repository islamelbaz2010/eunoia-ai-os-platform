# FIRST CUSTOMER SPRINT
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Author**: CTO / Commercial Engineering Lead  
**Objective**: Remove every blocker between the current product and Customer #1  
**Decision**: NO GO — 6 P0 blockers must be resolved first (estimated 2 days total)

---

## EXECUTIVE SUMMARY

The platform is architecturally production-ready. The build is clean (22 routes), 62/62 tests pass, TypeScript is error-free, and the core product loop works end-to-end: signup → onboarding → knowledge upload → AI query → invite team.

The problem is not the software. The problem is that **no customer can pay**, **the landing page cannot convert a prospect**, and **three environment variables missing in Vercel would silently break invite emails and expose a metrics endpoint**.

The sprint to acquire Customer #1 is not a feature sprint. It is a **commercial infrastructure sprint**: add billing, add a real landing page, add legal pages, apply pending database migrations, and set five missing environment variables.

Estimated effort: **2 days engineering + 4 hours of manual Vercel/Supabase steps**.

---

## REVENUE BLOCKERS — P0 (Customer cannot pay)

| # | Blocker | Evidence | Effort |
|---|---------|----------|--------|
| R1 | **No Stripe billing integration** | No `billing/` page, no `api/stripe/` routes, no Stripe dependency in `package.json` | 3 days |
| R2 | **No pricing page** | `src/app/page.tsx` has 2 links — "Sign in" and "Get started" — no mention of price | 4 hours |
| R3 | **No subscription enforcement** | `subscription_tier` column exists in DB; no code blocks features by tier | 4 hours (after Stripe) |
| R4 | **No invoice or billing history** | No billing dashboard page exists | included in R1 |

**Impact**: Customer cannot pay. Zero revenue. This is the single biggest blocker.

---

## TECHNICAL BLOCKERS — P0 (Customer cannot use the product)

| # | Blocker | Evidence | Effort |
|---|---------|----------|--------|
| T1 | **Migration 0007 not applied** | `CURRENT_STATE.md`: `0007_get_usage_totals.sql` not applied — Usage page calls `get_usage_totals` RPC which does not exist in production | 10 min manual |
| T2 | **Migration 0008 not applied** | `CURRENT_STATE.md`: `0008_health_check.sql` not applied — `/api/health` references `public.healthcheck()` | 10 min manual |
| T3 | **Migration 0009 not applied** | `ACTIVE_TASKS.md`: "Apply migration 0009 to Supabase" is P0 manual task | 10 min manual |
| T4 | **RESEND_API_KEY missing in Vercel** | `CURRENT_STATE.md`: missing; `email.ts:8-9`: returns null silently — invite emails are never sent | 5 min manual |
| T5 | **METRICS_TOKEN missing in Vercel** | `CURRENT_STATE.md`: "Without this, `/api/metrics` is open to the internet" | 5 min manual |
| T6 | **Migrations 0003–0006 status unknown** | `CURRENT_STATE.md`: "⚠️ untracked / ❓ unknown" for migrations 0003-0006 | 20 min audit |

---

## COMMERCIAL BLOCKERS — P0 (Customer cannot trust or sign up)

| # | Blocker | Evidence | Effort |
|---|---------|----------|--------|
| C1 | **No Terms of Service page** | No `/terms` route, no legal page exists in `src/app/` | 2 hours |
| C2 | **No Privacy Policy page** | No `/privacy` route, no GDPR/data handling disclosure | 2 hours |
| C3 | **Landing page has no value proposition** | `src/app/page.tsx`: 32 lines total, no pricing, no features, no social proof, no contact | 1 day |
| C4 | **No pricing page** | Covered in R2 — also a commercial trust issue | 4 hours |
| C5 | **FROM_EMAIL missing in Vercel** | `CURRENT_STATE.md`: missing; invite emails fall back to `noreply@eunoiaos.com` — unverified domain will hit spam | 5 min |

---

## DEMO BLOCKERS — P1 (Customer cannot see value in a demo)

| # | Blocker | Evidence | Effort |
|---|---------|----------|--------|
| D1 | **5–6 second "Thinking..." blocks UX** | `chat.tsx:96`: renders "Thinking..." with no progress; blocking call in `actions.ts:109` | 1 day |
| D2 | **Chat history lost on refresh** | `chat.tsx`: `messages` in `useState` — no persistence, no recovery | 2 days |
| D3 | **No branded favicon** | `public/` has only `robots.txt` — no `favicon.ico`, no `icon.png` | 30 min |
| D4 | **Scaffold SVGs in public/** | `public/` is missing (only `robots.txt`) but `ACTIVE_TASKS.md` flags removal of default SVGs | 2 min |
| D5 | **No demo data / seed script** | Prospect sees an empty CRM and empty KB — "blank canvas problem" kills demos | 4 hours |
| D6 | **No mobile nav** | `layout.tsx:39`: sidebar is `hidden ... sm:flex` — no mobile menu | 1 day |

---

## PRODUCTION BLOCKERS — P0 (Customer cannot recover from failure)

| # | Blocker | Evidence | Effort |
|---|---------|----------|--------|
| P1 | **SENTRY_DSN not set** | `CURRENT_STATE.md`: missing — zero error visibility in production | 5 min |
| P2 | **No backup strategy documented** | `CURRENT_STATE.md` has runbooks but no automated Supabase backup verification procedure | 2 hours |
| P3 | **Migrations 0003-0006 not committed to git** | `CURRENT_STATE.md`: "untracked" — if Supabase is rebuilt, these are lost | 30 min |

---

## CRITICAL BUGS — Current (Evidence-based)

| # | Bug | Evidence | Severity |
|---|-----|----------|----------|
| B1 | **Signup redirects to dashboard before email confirmation** | `actions.ts:67`: `redirect("/dashboard")` immediately after `signUp()` — Supabase default requires email verification but code skips it | HIGH |
| B2 | **Invite page accepts token silently then redirects — no user feedback on success** | `invite/page.tsx:18-21`: on success it `redirect("/dashboard")` with no toast or confirmation | MEDIUM |
| B3 | **Usage page fails silently if migration 0007 not applied** | `usage/page.tsx:12`: calls `get_usage_totals` RPC — returns null if function doesn't exist, renders "No usage recorded yet" | MEDIUM |
| B4 | **RAG returns stale context** | No re-indexing when a document is deleted — orphaned chunks remain in `kb_chunks` after `knowledge_base_documents` delete cascades (depends on FK cascade config) | MEDIUM |
| B5 | **`package.json` name field was `eunoia-ai-os-app`** | `ACTIVE_TASKS.md` notes fix needed | LOW |

---

## SECURITY ISSUES

| # | Issue | Evidence | Severity |
|---|-------|----------|----------|
| S1 | **Prometheus metrics endpoint is open** | `CURRENT_STATE.md`: "Without METRICS_TOKEN, /api/metrics is open" — exposes memory, process, and health metadata | HIGH |
| S2 | **Sentry DSN not configured** | Zero error visibility means security incidents go undetected | HIGH |
| S3 | **FROM_EMAIL unverified domain** | `email.ts:34`: falls back to `noreply@eunoiaos.com` — if this domain is not verified in Resend, emails are silently dropped or marked spam | MEDIUM |
| S4 | **No rate limiting on auth endpoints** | `actions.ts`: login/signup have no rate limiting beyond Supabase defaults | MEDIUM |
| S5 | **Migrations 0003-0006 not committed** | Schema security policies in those migrations may not be reproducible | HIGH |

---

## PERFORMANCE ISSUES

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| F1 | **Blocking RAG (5-6s cold response)** | `actions.ts:109`: synchronous `openai.chat.completions.create()` + embed in sequence | High — demo killer |
| F2 | **No pagination on CRM** | `CURRENT_STATE.md`: "Silent 200/100/50 row truncation" | Medium |
| F3 | **Dashboard loads 4 queries sequentially via Promise.all** | `page.tsx:113`: uses Promise.all — already optimized | Low |

---

## UX ISSUES

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| U1 | **No mobile navigation** | `layout.tsx:39`: `hidden ... sm:flex` — no hamburger menu | High |
| U2 | **"Thinking..." has no progress indicator** | `chat.tsx:96`: plain text, no spinner or animation | Medium |
| U3 | **Empty states show nothing** | Dashboard with 0 data shows "No usage recorded yet" — not welcoming | Medium |
| U4 | **No onboarding checklist** | First-time user sees empty dashboard with no guidance on what to do | High |
| U5 | **No branded favicon or app icon** | `public/` has only `robots.txt` | Medium |

---

## DEPLOYMENT ISSUES

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| DEP1 | **5 missing Vercel env vars** | `CURRENT_STATE.md`: RESEND_API_KEY, FROM_EMAIL, SENTRY_DSN×2, METRICS_TOKEN | P0 |
| DEP2 | **3 unapplied DB migrations** | `ACTIVE_TASKS.md`: 0007, 0008, 0009 not applied | P0 |
| DEP3 | **Migrations 0003-0006 not in git** | `CURRENT_STATE.md` | P0 risk |

---

## CUSTOMER ONBOARDING ISSUES

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| ON1 | **No welcome email after signup** | `actions.ts:42-67`: signup calls `supabase.auth.signUp()` then `redirect()` — no welcome email sent | High |
| ON2 | **No guided onboarding flow** | After org creation, user lands on empty dashboard | High |
| ON3 | **Onboarding fails if migration 0005 not applied** | `onboarding/actions.ts:33`: calls `create_organization` RPC | P0 risk |
| ON4 | **No demo data option** | New user has empty KB and CRM — value unclear | Medium |

---

## SUPPORT READINESS

| Area | Status | Gap |
|------|--------|-----|
| Error tracking | Sentry installed but DSN not set | No production alerts |
| Audit logs | ✅ Complete — every action logged | Ready |
| Structured logging | ✅ JSON logger with sanitization | Ready |
| Runbooks | ✅ 12 runbooks written | Ready |
| Support email | ❌ No support contact on landing page | Missing |
| Status page | ❌ No public status page | Missing |

---

## MONITORING READINESS

| Area | Status | Gap |
|------|--------|-----|
| Health endpoints | ✅ `/api/live`, `/api/health`, `/api/admin/system` | Ready |
| Prometheus metrics | ✅ `/api/metrics` — needs `METRICS_TOKEN` | Needs env var |
| Grafana dashboard | ✅ JSON file ready to import | Ready |
| Sentry error tracking | ✅ Installed — needs DSN | Needs env var |
| Uptime monitoring | ❌ No uptime monitor configured (BetterStack/UptimeRobot) | 30 min |

---

## LOGGING READINESS

| Area | Status | Notes |
|------|--------|-------|
| Structured JSON logging | ✅ | 6 levels, sanitizer, LOG_LEVEL |
| Request correlation | ✅ | X-Request-ID in proxy.ts |
| Audit logging | ✅ | Fire-and-forget, every action |
| Log aggregation | ❌ | No log drain configured in Vercel |

---

## BACKUPS

| Area | Status | Gap |
|------|--------|-----|
| Supabase automated backups | ❓ Unknown — Supabase Pro has daily PITR | Verify plan |
| Code backup (git) | ✅ GitHub | Many files untracked — see git state |
| Migration files backup | ⚠️ Partial | 0003-0006 not committed |

---

## DISASTER RECOVERY

| Area | Status | Gap |
|------|--------|-----|
| Runbooks exist | ✅ 12 runbooks | Ready |
| RTO estimate | Unknown | Not measured |
| RPO estimate | Unknown | Depends on Supabase backup frequency |
| Tested recovery | ❌ Never tested | Must test before customer data at risk |

---

## LEGAL

| Area | Status | Required |
|------|--------|----------|
| Terms of Service | ❌ Missing | YES — before first customer |
| Privacy Policy | ❌ Missing | YES — GDPR/data protection |
| Data Processing Agreement | ❌ Missing | YES — if customer is EU-based |
| Cookie Policy | ❌ Missing | YES — if analytics added |
| GDPR compliance | ❓ Partial (RLS, audit logs) | Needs legal review |

---

## BILLING / SUBSCRIPTIONS

| Area | Status | Required |
|------|--------|----------|
| Stripe integration | ❌ Not built | P0 for revenue |
| Subscription tiers | Schema exists (`subscription_tier` column) | Not enforced |
| Invoicing | ❌ Not built | P1 |
| Usage-based limits | ❌ Not enforced | P1 |
| Free trial logic | ❌ Not built | P1 |

---

## EMAIL / NOTIFICATIONS

| Area | Status | Gap |
|------|--------|-----|
| Invite emails | ✅ Resend SDK integrated | Needs RESEND_API_KEY in Vercel |
| Password reset | ✅ Via Supabase | Working |
| Welcome email | ❌ Not built | High value for conversion |
| In-app notifications | ❌ Not built | P2 |
| Billing emails | ❌ Not built | Needs Stripe first |

---

## AI / KNOWLEDGE / RAG

| Area | Status | Notes |
|------|--------|-------|
| Document ingestion | ✅ Auto-embeds on save | Working |
| RAG query | ✅ HNSW search + GPT-4o-mini | Working |
| Source citations | ✅ `SourcesPanel` component | Working |
| Rate limiting | ✅ 50 queries/user/hour | Working |
| Streaming responses | ❌ Blocking (5-6s) | P1 demo blocker |
| Chat history | ❌ In-memory only | P2 |
| Document editing / re-ingest | ❌ Delete and re-add only | P1 |

---

## CRM

| Area | Status | Notes |
|------|--------|-------|
| Create contact | ✅ Full Zod validation | Working |
| Edit contact | ✅ `updateContact` action exists | Working |
| Delete contact (soft) | ✅ Admin-gated | Working |
| Pipeline board | ✅ Stage drag-and-drop | Working |
| Timeline events | ✅ Notes, calls, meetings | Working |
| Activities | ✅ Tasks, follow-ups | Working |
| Tags | ✅ Color-tagged contacts | Working |
| CSV import | ✅ `/dashboard/crm/import` | Working |
| Export | ✅ `/api/crm/export` | Working |
| AI insights per contact | ✅ `/dashboard/crm/[id]/contact-ai-insights` | Working |
| Pagination | ❌ 200-row silent truncation | P2 |

---

## DASHBOARD / ANALYTICS

| Area | Status | Notes |
|------|--------|-------|
| KPI cards | ✅ Contacts, KB docs, usage, audit | Working |
| CRM pipeline metrics | ✅ `get_crm_metrics` RPC | Working |
| Usage chart (14 days) | ✅ Recharts AreaChart | Working |
| Contact status donut | ✅ Recharts PieChart | Working |
| Real-time updates | ❌ Page refresh required | P2 |

---

## LANDING PAGE

| Area | Status | Notes |
|------|--------|-------|
| Value proposition | ❌ 1 sentence only | Needs full copy |
| Features list | ❌ Missing | P0 for conversion |
| Pricing section | ❌ Missing | P0 for revenue |
| Social proof | ❌ Missing | P1 |
| CTA (demo, contact) | ❌ Only "Sign in" / "Get started" | P0 |
| Legal links | ❌ Missing | P0 (Terms, Privacy) |

---

## AUTHENTICATION

| Area | Status | Notes |
|------|--------|-------|
| Email/password login | ✅ Working | Supabase GoTrue |
| Signup | ✅ Working | Redirects to dashboard |
| Password reset | ✅ Working | PKCE flow |
| Session management | ✅ HTTP-only cookies | Secure |
| Email verification | ⚠️ Bypassed | Supabase default requires it; code skips |
| OAuth / SSO | ❌ Not built | P2 for enterprise |

---

## ORGANIZATIONS / PERMISSIONS

| Area | Status | Notes |
|------|--------|-------|
| Organization creation | ✅ via `create_organization` RPC | Needs migration 0005 applied |
| Org settings | ✅ Full settings form | Working |
| Role hierarchy | ✅ 9 roles defined | Working |
| Org switcher | ✅ Cookie-based switcher | Working |
| Transfer ownership | ✅ Implemented | Working |
| Archive org | ✅ Implemented | Working |

---

## ADMIN

| Area | Status | Notes |
|------|--------|-------|
| Super admin panel | ✅ Platform-wide org list | Working |
| System health (`/api/admin/system`) | ✅ Full diagnostic | Working |
| Audit logs viewer | ✅ `/dashboard/audit-logs` | Working |

---

## MASTER PRIORITY RANKING

### P0 — Customer Cannot Pay / Onboard / Use Product (Do These First)

| Task | Business Impact | Customer Impact | Revenue Impact | Risk | Hours | Dependencies | ROI | Priority |
|------|----------------|-----------------|----------------|------|-------|--------------|-----|----------|
| Build Stripe billing | 10/10 | 8/10 | 10/10 | Medium | 24h | None | ★★★★★ | P0-1 |
| Create landing page with value prop + pricing | 10/10 | 10/10 | 9/10 | Low | 8h | Pricing decision | ★★★★★ | P0-2 |
| Add Terms of Service + Privacy Policy | 7/10 | 9/10 | 7/10 | Low | 4h | Legal content | ★★★★★ | P0-3 |
| Apply migrations 0007+0008+0009 in Supabase | 9/10 | 9/10 | 8/10 | Low | 0.5h | Supabase access | ★★★★★ | P0-4 |
| Set 5 missing Vercel env vars | 9/10 | 9/10 | 7/10 | Low | 0.5h | Keys in hand | ★★★★★ | P0-5 |
| Commit migrations 0003-0006 to git | 8/10 | 7/10 | 8/10 | High | 0.5h | None | ★★★★★ | P0-6 |

### P1 — Improves Conversion / Demo / Trust

| Task | Business Impact | Customer Impact | Revenue Impact | Risk | Hours | Dependencies | ROI | Priority |
|------|----------------|-----------------|----------------|------|-------|--------------|-----|----------|
| Add pricing page | 9/10 | 8/10 | 9/10 | Low | 4h | Pricing decision | ★★★★★ | P1-1 |
| Streaming RAG responses | 8/10 | 9/10 | 7/10 | Medium | 8h | None | ★★★★ | P1-2 |
| Branded favicon + PWA icon | 6/10 | 7/10 | 5/10 | Low | 1h | Design asset | ★★★★ | P1-3 |
| Demo seed data script | 8/10 | 9/10 | 7/10 | Low | 4h | None | ★★★★ | P1-4 |
| Welcome email after signup | 7/10 | 8/10 | 6/10 | Low | 2h | RESEND_API_KEY | ★★★★ | P1-5 |
| Onboarding checklist / first-run guidance | 7/10 | 9/10 | 6/10 | Low | 6h | None | ★★★ | P1-6 |
| Configure uptime monitor (BetterStack) | 8/10 | 7/10 | 8/10 | Low | 0.5h | BetterStack account | ★★★★★ | P1-7 |
| Configure Sentry DSN in Vercel | 9/10 | 6/10 | 8/10 | Low | 0.25h | Sentry account | ★★★★★ | P1-8 |
| Mobile navigation | 6/10 | 7/10 | 5/10 | Medium | 8h | None | ★★★ | P1-9 |
| Configure Vercel log drain | 7/10 | 5/10 | 6/10 | Low | 0.5h | Vercel integration | ★★★★ | P1-10 |

### P2 — Everything Else (After First Customer)

| Task | Notes |
|------|-------|
| Pagination on CRM/KB/audit tables | Silent truncation is a bug |
| Chat history persistence | 2-day effort |
| Email verification enforcement | Polish after first customer |
| OAuth / SSO | Enterprise requirement |
| Usage quota enforcement | After Stripe |
| In-app notifications | P2 |
| Public status page | Nice to have |

---

## SCORES

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Customer Readiness** | 55/100 | Core product works; landing page, legal, billing absent |
| **Production Readiness** | 72/100 | Was 87/100 but env vars missing + migrations unapplied |
| **Commercial Readiness** | 25/100 | No billing = no revenue |
| **Revenue Readiness** | 10/100 | Nothing collecting money |
| **Go Live Decision** | **NO GO** | 6 P0 blockers must close first |

**Justification**: The technical product is largely ready. The commercial infrastructure — billing, legal, landing page, missing env vars, unapplied migrations — is not. A customer who signs up today cannot pay, would land on an empty dashboard with no guidance, and could not trust a product without a privacy policy or terms of service. Two focused days of engineering + 30 minutes of manual ops closes all P0 blockers and makes Customer #1 acquisition possible.
