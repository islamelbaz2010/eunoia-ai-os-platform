# AI OS INDEX

**Generated**: 2026-07-13
**Scope**: All functional domains of eunoia-ai-os-platform

---

## CRM

| Component | Path | Description |
|-----------|------|-------------|
| Contact List | `src/app/dashboard/crm/page.tsx` | Paginated contact table with search |
| Contact Row | `src/app/dashboard/crm/contact-row.tsx` | Client component — delete action |
| CRM Search | `src/app/dashboard/crm/crm-search.tsx` | Real-time search client component |
| Quick Add | `src/app/dashboard/crm/quick-add-contact.tsx` | Inline new contact form |
| Contact Detail | `src/app/dashboard/crm/[id]/page.tsx` | Full contact profile page |
| Edit Modal | `src/app/dashboard/crm/[id]/edit-contact-modal.tsx` | Edit contact inline modal |
| AI Insights | `src/app/dashboard/crm/[id]/contact-ai-insights.tsx` | GPT-generated contact insights |
| Tags | `src/app/dashboard/crm/[id]/contact-tags.tsx` | Tag management on contact |
| Timeline | `src/app/dashboard/crm/[id]/contact-timeline.tsx` | Activity timeline per contact |
| Activities | `src/app/dashboard/crm/[id]/contact-activities.tsx` | Activity feed |
| Activities Page | `src/app/dashboard/crm/activities/page.tsx` | Org-wide activity log |
| Activities Client | `src/app/dashboard/crm/activities/activities-client.tsx` | Client-side activity list |
| Pipeline Board | `src/app/dashboard/crm/pipeline/page.tsx` + `pipeline-board.tsx` | Kanban-style deal pipeline |
| CSV Import Page | `src/app/dashboard/crm/import/page.tsx` | Bulk import UI |
| CSV Importer | `src/app/dashboard/crm/import/csv-importer.tsx` | CSV parse + preview client |
| Server Actions | `src/app/dashboard/crm/actions.ts` | `createContact`, `deleteContact`, `updateContact`, `searchContacts` |
| API Export | `src/app/api/crm/export/route.ts` | CSV export route |
| API Import | `src/app/api/crm/import/route.ts` | CSV bulk import route |
| API Insights | `src/app/api/crm/insights/route.ts` | AI insights generation route |
| DB Migration | `supabase/migrations/0010_crm_platform.sql` | CRM platform schema |

---

## RAG Assistant

| Component | Path | Description |
|-----------|------|-------------|
| Chat UI | `src/app/dashboard/assistant/chat.tsx` | Streaming chat client with `SourcesPanel` |
| Assistant Page | `src/app/dashboard/assistant/page.tsx` | Shell page with session init |
| Server Actions | `src/app/dashboard/assistant/actions.ts` | `askAssistant()` — rate limit, embed, HNSW search, GPT-4o-mini |
| SSE Stream Route | `src/app/api/assistant/stream/route.ts` | `/api/assistant/stream` — sources first, live tokens |
| OpenAI Module | `src/lib/ai/openai.ts` | `createEmbedding()`, `chatCompletion()`, `streamChatCompletion()` |
| Ingest Module | `src/lib/ai/ingest.ts` | Document chunking + embedding + Supabase vector upsert |
| Chunker | `src/lib/ai/chunk.ts` | Text splitting with configurable overlap |
| Rate Limiting | `src/app/dashboard/assistant/actions.ts` | 50 RAG queries/user/hour via `usage_events` count |
| Embedding Model | — | `text-embedding-3-small` (OpenAI) |
| Chat Model | — | `gpt-4o-mini` (OpenAI) |
| Vector Search | — | `pgvector` HNSW on `document_chunks.embedding` |
| DB Migration | `supabase/migrations/0002_rag_invites.sql` | `document_chunks` + `match_documents` RPC |

---

## Billing

| Component | Path | Description |
|-----------|------|-------------|
| Billing Page | `src/app/dashboard/billing/page.tsx` | Subscription status display |
| Upgrade Button | `src/app/dashboard/billing/upgrade-button.tsx` | Stripe Checkout redirect |
| Stripe Client | `src/lib/stripe/client.ts` | Stripe SDK initialisation |
| Plans | `src/lib/stripe/plans.ts` | Starter $99 / Pro $299 / Enterprise $499 per month |
| Quota | `src/lib/stripe/quota.ts` | Per-tier RAG query quota enforcement |
| Checkout Route | `src/app/api/stripe/checkout/route.ts` | Creates Stripe Checkout session |
| Portal Route | `src/app/api/stripe/portal/route.ts` | Opens Stripe Customer Portal |
| Webhook Route | `src/app/api/stripe/webhook/route.ts` | Handles `checkout.session.completed`, `customer.subscription.*` |
| DB Migration | `supabase/migrations/0011_billing.sql` | `subscriptions` table, tier enum, quota columns |
| Architecture Doc | `BILLING_ARCHITECTURE.md` | Billing design decisions |

---

## Knowledge Base

| Component | Path | Description |
|-----------|------|-------------|
| KB Page | `src/app/dashboard/knowledge-base/page.tsx` | Document list view |
| Document Form | `src/app/dashboard/knowledge-base/document-form.tsx` | Upload / create document form |
| Document Row | `src/app/dashboard/knowledge-base/document-row.tsx` | Client component — delete action |
| Server Actions | `src/app/dashboard/knowledge-base/actions.ts` | `addDocument()`, `deleteDocument()` — auto-ingest on save |
| Ingest Pipeline | `src/lib/ai/ingest.ts` | Called on `addDocument()` — chunk → embed → store |
| DB Tables | `supabase/migrations/0001_init.sql` | `documents` + `document_chunks` + `match_documents()` RPC |

---

## Authentication

| Component | Path | Description |
|-----------|------|-------------|
| Session / DAL | `src/lib/auth/dal.ts` | `verifySession()`, `getActiveOrganization()` |
| Auth Actions | `src/lib/auth/actions.ts` | signIn, signUp, signOut, requestPasswordReset, updatePassword |
| Audit Logger | `src/lib/auth/audit.ts` | Fire-and-forget `logAuditEvent()` |
| Authorization | `src/lib/auth/authorization.ts` | `hasRole()` RBAC |
| Permissions | `src/lib/auth/permissions.ts` | Role hierarchy constants |
| Route Guard | `src/proxy.ts` | Protects all `/dashboard/*` routes; exposes `/api/health`, `/api/live` |
| PKCE Callback | `src/app/auth/callback/route.ts` | OAuth PKCE flow completion |
| Forgot Password | `src/app/auth/forgot-password/page.tsx` | Sends reset link via Supabase |
| Update Password | `src/app/auth/update-password/page.tsx` | Sets new password after reset |
| Login Page | `src/app/login/page.tsx` | Email + password sign-in |
| Signup Page | `src/app/signup/page.tsx` | New account registration |
| Invite Accept | `src/app/invite/page.tsx` | `accept_org_invite` RPC via token |
| Onboarding | `src/app/onboarding/page.tsx` + `actions.ts` | Org creation via `create_organization` RPC |
| Email Invites | `src/lib/email.ts` | Resend SDK — sends invite token emails |
| Settings Actions | `src/app/dashboard/settings/actions.ts` | `createInvite`, `revokeInvite`, `updateRole`, `removeMember` |
| DB Migration | `supabase/migrations/0005_schema_hardening.sql` | RLS policies, auth hardening |
| Security Boundary | Postgres RLS | Canonical security layer — app checks are defence-in-depth |

---

## Deployment

| Component | Path | Description |
|-----------|------|-------------|
| Vercel Config | `.vercel/` | Project link to Vercel |
| Next.js Config | `next.config.ts` | Security headers, Sentry wrapping, build config |
| Dockerfile | `Dockerfile` | Container build for non-Vercel deployment |
| Docker Compose (prod) | `docker-compose.production.yml` | Production container stack |
| Docker Compose (staging) | `docker-compose.staging.yml` | Staging container stack |
| PM2 Config | `ecosystem.config.js` | Process management for VPS deployment |
| Nginx Config | `ops/docs/nginx.conf` | Reverse proxy configuration |
| GitHub Actions CI | `.github/workflows/ci.yml` | lint + tsc + test on every push |
| Deploy Scripts | `ops/deploy/deploy.sh` + `deploy.ps1` + `rollback.sh` | Shell deploy and rollback |
| Env Sync | `tools/bootstrap/` | Excel → Vercel env var sync (idempotent) |
| Launch Automation | `scripts/launch/` | Smoke test, webhook validation, env verification, migration SQL |

---

## Bootstrap

| Component | Path | Description |
|-----------|------|-------------|
| Entry | `tools/bootstrap/index.ts` | `npm run bootstrap` — reads Excel, syncs Vercel |
| Excel Reader | `tools/bootstrap/excel.ts` | Parses `.xlsx` env-var sheets (uses `xlsx` package) |
| Vercel Sync | `tools/bootstrap/vercel.ts` | Calls Vercel API; idempotent upsert |
| Lock File | `tools/bootstrap/.bootstrap.lock.json` | Tracks last-synced state |
| Dry Run | `tools/bootstrap/index.ts --dry-run` | Preview changes without applying |
| Report | `tools/bootstrap/BOOTSTRAP_REPORT.md` | Last bootstrap run report |
| Docs | `docs/devops/BOOTSTRAP.md` | Bootstrap usage guide |

---

## Automation (Exhibition / Demo)

| Component | Path | Description |
|-----------|------|-------------|
| Launch | `scripts/exhibition/launch.sh` | Full exhibition launch sequence |
| Seed | `scripts/exhibition/seed-demo.sh` + `seed-demo.ts` | Idempotent demo data seeder |
| Verify | `scripts/exhibition/verify.sh` | 43-check system verification (43/43 PASS) |
| Backup | `scripts/exhibition/backup.sh` | Pre-exhibition data backup |
| Rollback | `scripts/exhibition/rollback.sh` | Restore to backup state |
| Prepare Demo | `scripts/exhibition/prepare-demo.sh` | Pre-demo environment preparation |
| System Report | `scripts/exhibition/collect-system-report.sh` | Collects system status snapshot |
| Doctor | `scripts/doctor.js` | 9-point environment health check |

---

## Monitoring

| Component | Path | Description |
|-----------|------|-------------|
| Liveness Probe | `src/app/api/live/route.ts` | `/api/live` — instant 200, no external calls |
| Readiness Probe | `src/app/api/health/route.ts` | `/api/health` — 8 providers, 30s cache, public |
| Admin Diagnostics | `src/app/api/admin/system/route.ts` | `/api/admin/system` — full detail, auth required |
| Prometheus | `src/app/api/metrics/route.ts` | `/api/metrics` — 15 metrics, Bearer token auth |
| Grafana Dashboard | `docs/operations/grafana/eunoia-system-health.json` | 10-panel importable dashboard |
| Sentry Client | `sentry.client.config.ts` | Browser error capture |
| Sentry Server | `sentry.server.config.ts` | Server error capture |
| Sentry Edge | `sentry.edge.config.ts` | Edge error capture |
| Instrumentation | `src/instrumentation.ts` | Next.js instrumentation hook for Sentry |
| Structured Logger | `src/lib/logger.ts` | 6-level JSON logger with sensitive-key sanitiser |
| Request Correlation | `src/proxy.ts` | `X-Request-ID` generated and propagated |
| Runbooks | `docs/runbooks/` | 19 incident response runbooks |

---

## Streaming

| Component | Path | Description |
|-----------|------|-------------|
| SSE Route | `src/app/api/assistant/stream/route.ts` | Server-Sent Events endpoint for RAG responses |
| Stream Protocol | — | Sources JSON object sent before first token; text tokens streamed live |
| Chat Client | `src/app/dashboard/assistant/chat.tsx` | Reads SSE stream with `EventSource`; renders `SourcesPanel` + blinking cursor |
| Rate Gate | `src/app/dashboard/assistant/actions.ts` | Rate limit enforced before stream opens |
| Auth Gate | `src/app/api/assistant/stream/route.ts` | `verifySession()` called at stream entry |
