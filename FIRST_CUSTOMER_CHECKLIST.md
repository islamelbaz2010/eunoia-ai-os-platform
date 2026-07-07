# FIRST CUSTOMER CHECKLIST
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Owner**: CTO  
**Gate**: Every P0 item must be DONE before Customer #1 conversation

---

## P0 — GATE: Customer Cannot Pay / Onboard / Use Product

### Manual Ops (30–60 minutes total — do first)

- [ ] **Apply migration 0007** in Supabase SQL Editor  
  File: `supabase/migrations/0007_get_usage_totals.sql`  
  Test: Usage page at `/dashboard/usage` shows data instead of "No usage recorded yet"

- [ ] **Apply migration 0008** in Supabase SQL Editor  
  File: `supabase/migrations/0008_health_check.sql`  
  Test: `GET /api/health` returns `{"status":"ready"}` with no errors

- [ ] **Apply migration 0009** in Supabase SQL Editor  
  File: `supabase/migrations/0009_enterprise_multitenant.sql` (or `_fixed.sql` version)  
  Note: ALTER TYPE ADD VALUE — run in a single session, not a transaction  
  Test: Dashboard loads without schema errors

- [ ] **Set `RESEND_API_KEY`** in Vercel Dashboard → Settings → Environment Variables  
  Value: Your Resend API key (from resend.com → API Keys)  
  Test: Send a team invite from Settings page — recipient receives the email

- [ ] **Set `FROM_EMAIL`** in Vercel Dashboard → Settings → Environment Variables  
  Value: `Eunoia AI OS <noreply@yourdomain.com>` (use a verified domain in Resend)  
  Test: Invite emails arrive from this address

- [ ] **Set `METRICS_TOKEN`** in Vercel Dashboard → Settings → Environment Variables  
  Value: `openssl rand -base64 32` (generate a random 32-byte token)  
  Test: `GET /api/metrics` returns 401 without Bearer token

- [ ] **Set `NEXT_PUBLIC_SENTRY_DSN`** in Vercel Dashboard  
  Value: From sentry.io → Project → Settings → Client Keys → DSN  
  Test: Trigger a test error → appears in Sentry dashboard

- [ ] **Set `SENTRY_DSN`** in Vercel Dashboard (same value as above)

- [ ] **Commit migrations 0003–0006 to git**  
  ```bash
  git add supabase/migrations/0003_grants.sql
  git add supabase/migrations/0004_indexes_policies.sql
  git add supabase/migrations/0005_schema_hardening.sql
  git add supabase/migrations/0006_hardening_v2.sql
  git commit -m "chore: commit migrations 0003-0006 to version control"
  ```

### Engineering (2 days)

- [ ] **Stripe billing integration**  
  - Stripe dependency added to `package.json`
  - `src/app/dashboard/billing/page.tsx` — subscription management
  - `src/app/api/stripe/webhook/route.ts` — webhook handler
  - Subscription tiers: Starter $99/mo, Pro $299/mo, Enterprise $499/mo
  - `subscription_tier` column in DB updated on payment
  - Test: Customer can subscribe, Stripe webhook received, tier updated in DB

- [ ] **Landing page rewrite**  
  - `src/app/page.tsx` replaced with full marketing page
  - Value proposition headline
  - Feature list (AI Knowledge Base, CRM, RAG Assistant)
  - Pricing section with 3 tiers
  - CTA buttons: "Book a demo", "Start free trial"
  - Footer with links to Terms, Privacy, Contact
  - Test: Page reads as a product, not a login screen

- [ ] **Terms of Service page**  
  - `src/app/terms/page.tsx` created
  - Linked from landing page footer and signup page
  - Test: `/terms` returns 200 and readable content

- [ ] **Privacy Policy page**  
  - `src/app/privacy/page.tsx` created
  - Mentions Supabase, OpenAI, Resend as data processors
  - Linked from landing page footer and signup page
  - Test: `/privacy` returns 200 and readable content

---

## P1 — GATE: Customer Cannot See Value / Trust Product

### Manual Ops (30 minutes)

- [ ] **Configure uptime monitor**  
  Sign up at BetterStack (or UptimeRobot) — monitor `https://eunoia-ai-os-platform.vercel.app/api/live`  
  Test: Monitor shows green, alert fires on downtime

- [ ] **Configure Vercel log drain**  
  Vercel Dashboard → Settings → Log Drains → add drain to your log aggregator (or Vercel itself)

- [ ] **Verify domain ownership in Resend**  
  Add DNS records for your sending domain so emails pass DKIM/SPF  
  Test: Send invite, check email headers for DKIM=pass

### Engineering (1.5 days)

- [ ] **Pricing page** (standalone `/pricing` route or section on landing page)

- [ ] **Branded favicon** — replace `src/app/favicon.ico`  
  Test: Browser tab shows Eunoia favicon

- [ ] **PWA icons** — `public/icon.png` (192×192) and `public/icon-512.png` (512×512)  
  Test: `src/app/manifest.ts` no longer has broken icon references

- [ ] **Demo seed data script**  
  `scripts/seed-demo.js` — creates 5 sample contacts + 3 KB documents for a "Hospitality" demo org  
  Test: Running script populates a test org with demo-ready data

- [ ] **Streaming RAG responses**  
  New: `src/app/api/assistant/stream/route.ts`  
  Update: `chat.tsx` to consume streaming response  
  Test: "Thinking..." is replaced by incremental token output

- [ ] **Welcome email after signup**  
  Add welcome email in `actions.ts` after `signUp()` succeeds  
  Test: New signup receives welcome email

- [ ] **Onboarding checklist**  
  After org creation: show 3-step guide ("Add a document", "Ask the AI", "Invite your team")  
  Test: New user sees checklist, items check off as completed

---

## P2 — GATE: Polish (After First Customer)

- [ ] Pagination on CRM, KB, audit logs, settings
- [ ] Chat history persistence (new `chat_messages` table)
- [ ] Mobile navigation menu
- [ ] OAuth / Google SSO
- [ ] Public status page
- [ ] In-app notifications
- [ ] Usage quota enforcement (after Stripe is live)
- [ ] Remove scaffold SVGs from `public/`
- [ ] Remove unused `clsx` dependency

---

## VERIFICATION CHECKLIST (run before customer call)

- [ ] `GET https://eunoia-ai-os-platform.vercel.app/api/live` → `{"status":"ok"}`
- [ ] `GET https://eunoia-ai-os-platform.vercel.app/api/health` → `{"status":"ready"}`
- [ ] Sign up as new user → receives welcome email → creates org → lands on dashboard
- [ ] Upload a KB document → AI query returns cited answer
- [ ] Invite a team member → they receive the invite email
- [ ] `/terms` returns 200 with legal content
- [ ] `/privacy` returns 200 with legal content
- [ ] Landing page shows pricing
- [ ] Stripe checkout flow works end-to-end
- [ ] Sentry receives a test error
- [ ] `GET /api/metrics` with wrong Bearer → 401
- [ ] CI pipeline green on main branch
