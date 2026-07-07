# Customer Journey Validation
**Generated**: 2026-07-07  
**Validated against**: Source code + migration files  
**Note**: Steps marked ⚠️ depend on Supabase migration status (unknown for 0003–0006, 0009–0010)

---

## Journey Overview

```
Landing → Sign Up → Organization Creation → Free Trial
→ Upload Knowledge → Knowledge Processing → AI Assistant
→ Streaming Response → Citation → Dashboard
→ Upgrade → Stripe Checkout → Webhook → Subscription Active
→ CRM → Analytics → Team Invite
```

---

## Step 1: Landing Page

**Route**: `GET /`  
**File**: `src/app/page.tsx` + `src/app/_landing/`  
**Status**: ✅ WORKS

- Hero, Problem, Solution, HowItWorks, Industries, AiFeatures, CrmSection, Roi sections all render
- Pricing section shows Starter ($99), Pro ($299), Enterprise (Custom) — links to `/signup` ✅
- Demo request form calls `sendDemoRequestEmail()` → requires `RESEND_API_KEY` + `DEMO_REQUEST_EMAIL` ⚠️
- FAQ section has mailto link pointing to `hello@eunoiaos.com` — verify this is the correct email
- "Get started" → `/signup` ✅

**Blockers**: None (landing loads without env vars)  
**Issues**: Demo request form silent-fails without `RESEND_API_KEY`

---

## Step 2: Sign Up

**Route**: `POST /signup` → `signup()` Server Action  
**File**: `src/app/signup/page.tsx`, `src/lib/auth/actions.ts`  
**Status**: ✅ WORKS (conditional on Supabase email confirmation setting)

- Validates fullName (≥2 chars), email (RFC), password (≥8 chars) with Zod v4 ✅
- Calls `supabase.auth.signUp()` → creates user in auth.users ✅
- On success → redirects to `/dashboard` (proxy checks session)

**Critical dependency**: Supabase email confirmation setting
- If `Confirm email` = **OFF** (recommended for B2B): signup creates session immediately → `/dashboard` works ✅
- If `Confirm email` = **ON**: signup doesn't create session → user hits `/dashboard` → proxy redirects to `/login` → confusing UX ❌

**Action required**: Supabase Dashboard → Authentication → Providers → Email → **Disable "Confirm email"** for B2B use case, OR add a "check your email" state to the signup page.

---

## Step 3: Organization Creation (Onboarding)

**Route**: `POST /onboarding` → `createOrganization()` Server Action  
**File**: `src/app/onboarding/actions.ts`, `supabase/migrations/0005_schema_hardening.sql`  
**Status**: 🔴 BLOCKED (migration 0005 status unknown in production)

- After signup, proxy sees authenticated user with no organization → DAL returns null → layout redirects to `/onboarding` ✅
- Validates org name (2–80 chars) ✅
- Calls `supabase.rpc("create_organization", { org_name, org_slug })` — function defined in migration 0005

**If 0005 is NOT applied**: RPC returns error → user sees "Failed to create workspace" ❌  
**If 0005 IS applied**: org is created → membership with `owner` role created → user lands at `/dashboard` ✅

**Side effect (migration 0011)**: After org creation, `organizations_create_billing_subscription` trigger fires → creates `billing_subscriptions` row with 14-day trial. If 0011 is not applied, no billing row exists (billing page shows empty state gracefully).

**Blocker**: Apply migration 0005 → verify `create_organization` function exists.

---

## Step 4: Free Trial Activation

**Route**: Automatic (DB trigger on org creation)  
**File**: `supabase/migrations/0011_billing.sql`  
**Status**: 🔴 BLOCKED (0011 not applied)

- `organizations_create_billing_subscription` trigger auto-creates `billing_subscriptions` with `status='trialing'`, `trial_ends_at = now() + 14 days` ✅ (in migration)
- Billing page (`/dashboard/billing`) reads this row and shows plan + trial countdown
- If 0011 not applied: billing table doesn't exist → billing page throws DB error

**Graceful degradation**: The billing page query uses `.single()` without throwing on null, so the page renders with "No active organization" or empty plan — it won't crash the whole dashboard.

**Action**: Apply 0011 BEFORE any user signs up in production (or backfill via the migration's Part 6).

---

## Step 5: Upload Knowledge

**Route**: `POST /dashboard/knowledge-base` → `createDocument()` Server Action  
**File**: `src/app/dashboard/knowledge-base/actions.ts`, `src/lib/ai/ingest.ts`  
**Status**: ✅ WORKS (requires OPENAI_API_KEY)

Flow:
1. Validates title (2–200 chars) + content (10–50,000 chars) + language (en/ar/ru/it) ✅
2. Quota check: `checkDocumentLimit()` → compares current doc count vs plan limit ✅
3. Inserts document to `knowledge_base_documents` ✅
4. Calls `ingestDocument()` → chunks content → embeds via `text-embedding-3-small` → inserts to `knowledge_base_chunks` ✅
5. Cleanup on ingest failure: deletes orphaned document row ✅
6. Logs audit event + usage event (fire-and-forget) ✅
7. Revalidates `/dashboard/knowledge-base` ✅

**Blockers**: `OPENAI_API_KEY` must be set (it is ✅). `knowledge_base_chunks` table must have the `pgvector` extension enabled (in migration 0001/0002).

---

## Step 6: Knowledge Processing (Embedding)

**File**: `src/lib/ai/ingest.ts`, `src/lib/ai/chunk.ts`  
**Status**: ✅ WORKS

- `chunkText()` splits content into chunks for embedding ✅
- `embedTexts()` calls OpenAI `text-embedding-3-small` in batches of 512 ✅
- Embeddings stored as `vector(1536)` in `knowledge_base_chunks` ✅
- HNSW index (from migration 0004) speeds up similarity search ✅

**Potential issue**: Vercel function timeout. For very large documents (near 50k chars limit), embedding ~100 chunks may approach the 10-second soft timeout on Vercel Hobby plan. Pro/Enterprise plans have 300s timeout. Monitor for `FUNCTION_INVOCATION_TIMEOUT` errors.

---

## Step 7: AI Assistant Query

**Route**: `POST /api/assistant/stream`  
**File**: `src/app/api/assistant/stream/route.ts`  
**Status**: ✅ WORKS (requires OPENAI_API_KEY + knowledge_base_chunks data)

Flow:
1. Auth: `verifySession()` + `getActiveOrganization()` ✅
2. Validates question (3–500 chars) ✅
3. Tier-aware rate limit: `getAiQueryRateLimit()` → checks `billing_subscriptions` → defaults to 50/hr fallback if table missing ✅
4. Embeds question via `text-embedding-3-small` ✅
5. Vector search: `match_kb_chunks()` RPC (defined in migration 0002) ✅
6. Filters chunks below 0.3 similarity threshold ✅
7. Streams GPT-4o-mini completion via OpenAI SDK streaming ✅
8. Usage logged fire-and-forget ✅

**If no documents**: Returns "couldn't find anything relevant" message without calling GPT ✅  
**SSE headers**: `X-Accel-Buffering: no` (disables nginx/Vercel proxy buffering) ✅

---

## Step 8: Streaming Response

**File**: `src/app/dashboard/assistant/chat.tsx`  
**Status**: ✅ WORKS

Protocol:
1. `{type:"sources", sources:[...]}` — arrives first (~1s), UI shows source panel ✅
2. `{type:"delta", content:"..."}` — per-token, blinking cursor shown ✅
3. `{type:"done"}` — stream complete, cursor removed ✅
4. `{type:"error", message:"..."}` — on failure, shows error toast ✅

AbortController cleanup on unmount ✅  
Disabled submit button during streaming ✅

---

## Step 9: Source Citations

**File**: `src/app/dashboard/assistant/chat.tsx` (`SourcesPanel`)  
**Status**: ✅ WORKS

- Sources panel appears after first SSE event ✅
- Shows each chunk with: position index [1], content preview (200 chars), similarity % ✅
- Collapsible (Show/Hide N sources button) ✅
- Citations in answer text use `[1]`, `[2]` etc. (model-generated, not code-enforced) ✅

---

## Step 10: Dashboard

**Route**: `GET /dashboard`  
**File**: `src/app/dashboard/page.tsx`  
**Status**: ⚠️ PARTIAL (depends on migrations)

KPIs: contacts, documents, usage events, audit events (COUNT queries, always works) ✅  
CRM pipeline metrics: `get_crm_metrics()` RPC → requires migration 0010 ⚠️  
Usage chart: 14-day activity from `usage_events` table ✅  
Contact status chart: status breakdown from `crm_contacts` ✅  
First-run setup guide: shows when all counts are 0 ✅

**If 0010 not applied**: `getCrmMetrics()` returns null → CRM pipeline section hidden gracefully ✅

---

## Step 11: Upgrade (Stripe Checkout)

**Route**: `POST /api/stripe/checkout` → UpgradeButton client component  
**File**: `src/app/dashboard/billing/upgrade-button.tsx`, `src/app/api/stripe/checkout/route.ts`  
**Status**: 🔴 BLOCKED (Stripe not configured)

Flow:
1. User clicks "Upgrade to Starter" → `UpgradeButton` ✅
2. `fetch("/api/stripe/checkout", {planId:"starter", interval:"monthly"})` ✅
3. Route validates request (owner role required) ✅
4. Checks `isStripeConfigured()` → returns 503 if `STRIPE_SECRET_KEY` missing ❌
5. Creates/retrieves Stripe customer → persists `stripe_customer_id` ✅
6. Creates Checkout Session with 14-day trial ✅
7. Returns `{url}` → client redirects to Stripe hosted checkout ✅

**Blockers**:
- `STRIPE_SECRET_KEY` not set in Vercel
- Stripe products + price IDs not created
- If user clicks Upgrade with no Stripe: toast error "Billing is not configured on this instance."

**Success URL**: `${NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=1`  
**Cancel URL**: `${NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=1`  
**Note**: Success/cancel pages don't parse the query params yet (no success toast shown). Low priority.

---

## Step 12: Stripe Webhook → Subscription Active

**Route**: `POST /api/stripe/webhook`  
**File**: `src/app/api/stripe/webhook/route.ts`  
**Status**: 🔴 BLOCKED (0011 not applied, webhook not registered)

Flow after checkout completes:
1. Stripe fires `checkout.session.completed` → raw body + Stripe-Signature header
2. Webhook verifies signature via `stripe.webhooks.constructEvent()` ✅
3. Routes to `handleCheckoutCompleted()` → calls `process_stripe_event()` RPC ✅
4. Stripe then fires `customer.subscription.created` → `syncSubscription()` ✅
5. `process_stripe_event()` RPC updates `billing_subscriptions` + `organizations.subscription_tier` ✅
6. Idempotent: duplicate events are no-ops ✅

**Stripe API version**: `2026-06-24.dahlia` — period dates are on `SubscriptionItem`, not `Subscription` ✅ (fixed)

**Blockers**:
- Migration 0011 not applied → `process_stripe_event` RPC doesn't exist
- `STRIPE_WEBHOOK_SECRET` not set
- Webhook endpoint not registered in Stripe Dashboard

---

## Step 13: CRM

**Route**: `GET /dashboard/crm`  
**File**: `src/app/dashboard/crm/page.tsx`  
**Status**: ⚠️ PARTIAL (full functionality requires migration 0010)

Base contacts table: works with migrations 0001–0002 ✅  
Advanced fields (pipeline_stage, owner_id, archived_at, deleted_at, source): requires 0010 ⚠️  
CRM search (`CrmSearch`), pipeline board (`/dashboard/crm/pipeline`): requires 0010 ⚠️  
Contact detail page (`/dashboard/crm/[id]`): requires 0010 ⚠️  

`searchParams` now correctly typed as `Promise<{...}>` and awaited ✅ (fixed this session)

**Contact limit quota**: `checkContactLimit()` in `createContact()` — defaults to free plan limits (25 contacts) if billing table missing ✅

---

## Step 14: Analytics / Usage

**Route**: `GET /dashboard/usage`  
**File**: `src/app/dashboard/usage/page.tsx`  
**Status**: 🔴 BLOCKED (migration 0007 not applied)

- Calls `get_usage_totals()` RPC → defined in migration 0007
- If 0007 not applied: RPC not found → page shows empty state (graceful) ⚠️

Actually the code falls back: if the RPC errors, `totals` is empty array → EmptyState shown. Not a crash but the page shows nothing useful.

---

## Step 15: Team Invites

**Route**: Settings → Invite member  
**File**: `src/app/dashboard/settings/actions.ts`, `src/lib/email.ts`  
**Status**: ⚠️ PARTIAL

- Invite created in DB ✅
- Email sent via Resend if `RESEND_API_KEY` is set ⚠️ (silently skipped if missing)
- Invite accept at `/invite?token=...` calls `accept_org_invite()` RPC (migration 0006) ⚠️
- `searchParams` on invite page now correctly awaited ✅ (fixed this session)

**Invite URL**: `${NEXT_PUBLIC_APP_URL}/invite?token={uuid}` ✅

---

## Summary Table

| Step | Feature | Status | Blocker |
|------|---------|--------|---------|
| 1 | Landing page | ✅ | — |
| 2 | Sign up | ✅* | Email confirmation setting |
| 3 | Org creation | 🔴 | Migration 0005 |
| 4 | Free trial | 🔴 | Migration 0011 |
| 5 | Upload Knowledge | ✅ | OPENAI_API_KEY (set) |
| 6 | Embedding/processing | ✅ | — |
| 7 | AI assistant query | ✅ | — |
| 8 | Streaming response | ✅ | — |
| 9 | Source citations | ✅ | — |
| 10 | Dashboard KPIs | ✅ | — |
| 10 | Dashboard CRM metrics | ⚠️ | Migration 0010 |
| 11 | Upgrade (Stripe) | 🔴 | Stripe setup |
| 12 | Webhook/subscription | 🔴 | Migration 0011 + Stripe |
| 13 | CRM basic | ✅ | — |
| 13 | CRM advanced | ⚠️ | Migration 0010 |
| 14 | Usage analytics | ⚠️ | Migration 0007 |
| 15 | Team invites | ⚠️ | RESEND_API_KEY |

*Sign up depends on email confirmation setting in Supabase.
