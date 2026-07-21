# FIRST CLIENT READINESS
**Can a real company use Eunoia AI OS today?**

**Generated**: 2026-07-07 — CTO Forensic Review  
**Branch**: `eunoia-ai-os-platform` — Git SHA: acaa6be  
**Frame**: Think like the first paying customer. Not a beta user. Not an investor. A real Egyptian diving center that needs to run its business.

---

## THE ANSWER

**Short answer**: Not yet as a paid product. Yes as a free beta.

A real company CAN sign up, create an organization, invite their team, upload their knowledge base, use the AI assistant, and manage their CRM pipeline today — for free, technically.

A real company CANNOT be charged money. There is no Stripe integration. There is no way to collect payment. The product is technically beta-ready but commercially inert.

**Days to first paying customer** (realistic, with a developer working full-time): **10–14 days.**

---

## WHAT WORKS TODAY (DEMO-READY)

The following has been verified from source code and is deployable at the live production URL:

### ✅ A team can sign up and get started
- Signup, email verification, login, password reset — all working
- Organization creation on first login
- Invite team members by email → they receive invite link → accept → join org
- Role assignment (owner, admin, member) from day 1
- **Caveat**: Invite emails fail silently in production — RESEND_API_KEY not set in Vercel. Workaround: manually copy and share the invite URL.

### ✅ Staff can upload their knowledge and get AI answers
- Manager pastes SOP text (or employee handbook, pricing guide, dive site information) into the Knowledge Base
- Document is auto-embedded into pgvector HNSW on save
- Staff member opens AI Assistant, asks question in natural language
- Gets cited answer showing which documents were used
- **Caveat**: Text paste only. Cannot upload PDFs or Word documents. This is the #1 friction point for real hospitality businesses who have knowledge in PDFs.

### ✅ Sales team can manage their pipeline
- Create contacts with full CRM fields (email, phone, company, pipeline stage, notes, source)
- Move contacts through pipeline: lead → qualified → proposal → negotiation → won/lost
- Log timeline events (call notes, meeting outcomes)
- Create activities (follow-up tasks with due dates)
- Generate AI insights per contact (lead score, risk score, suggested email/WhatsApp)
- Export contacts to CSV
- **Caveat**: No pagination — after 200 contacts the UI silently truncates

### ✅ Management has visibility
- Dashboard KPIs: contact count, document count, usage events, audit events
- CRM pipeline breakdown: new, qualified, in pipeline, won, lost, conversion rate
- 14-day usage activity chart
- Contact status distribution pie chart
- Full audit trail (who did what, when)

---

## WHAT BREAKS THE EXPERIENCE TODAY

Classified by business impact, not technical complexity.

### CRITICAL — Product unusable without these

**C1: Cannot charge money**
- **Impact**: The product cannot generate revenue. Zero commercial viability.
- **Root cause**: No Stripe integration exists anywhere in the codebase.
- **User experience**: If a customer wants to upgrade from free, there is no button to click, no checkout page, no invoice.
- **Fix**: Integrate Stripe Checkout + webhooks + tier enforcement. **3 developer-days.**

**C2: Invite emails don't work in production**
- **Impact**: Team onboarding is the primary growth mechanism. Inviting a colleague sends no email.
- **Root cause**: `RESEND_API_KEY` is not set in Vercel. `sendInviteEmail()` silently returns without sending.
- **User experience**: Owner invites a colleague → colleague receives nothing → onboarding stalls.
- **Fix**: Add RESEND_API_KEY + FROM_EMAIL to Vercel dashboard. **5 minutes.**

**C3: Migration 0010 (CRM platform) not applied to production**
- **Impact**: Extended CRM features (soft delete, archive, AI insights, pipeline_stage, owner_id) don't exist in the production database schema.
- **Root cause**: `0010_crm_platform_fixed.sql` has not been applied to production Supabase.
- **User experience**: Any action that touches these columns will produce a PostgreSQL error.
- **Fix**: Apply migration in Supabase SQL Editor. **10 minutes.**

**C4: Migrations 0009a + 0009b not applied**
- **Impact**: Enterprise RBAC (9-role system), permission registry, org lifecycle, org settings all exist in TypeScript code but reference DB columns/tables that don't exist in production.
- **Root cause**: Migrations not applied.
- **Fix**: Apply 0009a then 0009b in order. **15 minutes.**

---

### HIGH — Significant friction, early churn risk

**H1: No PDF or document file upload**
- **Impact**: Hospitality businesses store their SOPs, menus, and product information in PDF files and Word documents. Asking them to copy-paste content into a text box is too high-friction for adoption.
- **Root cause**: Knowledge Base only accepts text input (max 50,000 characters). No file upload endpoint exists.
- **User experience**: Manager opens "Add Document" → finds a text area → tries to paste 50-page PDF → gives up.
- **Fix**: Add file upload endpoint (parse PDF/DOCX → extract text → ingest). **2 developer-days.**

**H2: RAG response takes 5–6 seconds with no feedback**
- **Impact**: For a demo, 5–6 seconds of a blank "Thinking..." message kills the impression. Staff won't use a tool that feels broken.
- **Root cause**: `askAssistant()` is a blocking Server Action. No streaming, no progress indicator.
- **Fix**: Convert to ReadableStream / SSE endpoint with token-by-token streaming. **1 developer-day.**

**H3: No usage quota per subscription tier**
- **Impact**: Even if Stripe were wired up, there would be no enforcement of the tier limits. A free user can make unlimited RAG queries (only the 50/hour rate limit applies).
- **Root cause**: `subscription_tier` column exists but is never read in `askAssistant()`.
- **Fix**: Add tier check before rate-limit check. **4 hours** (after Stripe).

**H4: Chat history lost on page refresh**
- **Impact**: Staff use the assistant across multiple sessions. Losing all context on every refresh means they re-type the same questions repeatedly.
- **Root cause**: Chat state is local React state only. No persistence table.
- **Fix**: Create `chat_messages` table + persist/load history. **2 developer-days.**

---

### MEDIUM — Will cause problems after first month

**M1: No pagination on any table**
- **Impact**: After 200 contacts (CRM) or 100 documents (KB), the UI silently shows a subset. Users don't know data is missing.
- **Root cause**: All list queries use Supabase `.limit(N)` without cursor-based pagination.
- **Fix**: Implement cursor-based pagination on CRM, KB, audit log, and settings. **1 developer-day.**

**M2: System prompt is hardcoded and English-only**
- **Impact**: The RAG assistant says "You are Eunoia, an AI assistant for a hospitality property." This is hardcoded in `src/app/dashboard/assistant/actions.ts`. While `OrgSettings.ai.systemPromptPrefix` exists in the type definition, it is never read in the action. Arabic customers will receive English system framing.
- **Fix**: Read `OrgSettings.ai.systemPromptPrefix` in `askAssistant()` and prepend to system prompt. **2 hours.**

**M3: No Arabic RTL interface**
- **Impact**: The stated target market is MENA hospitality. Egyptian diving center staff and managers primarily operate in Arabic. The UI is entirely English.
- **Root cause**: No i18n library, no RTL CSS, no Arabic translations.
- **Fix**: Full Arabic localization + RTL layout. **2–3 weeks.**

**M4: Production error tracking inactive**
- **Impact**: When the first real customer hits a bug, you won't know until they call. Sentry is installed but the DSN is not set in Vercel.
- **Fix**: Add SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN to Vercel. **5 minutes.**

---

### LOW — Polish; won't block first customer

**L1: Prometheus metrics endpoint is public**
- METRICS_TOKEN not set → `/api/metrics` accessible without auth. Low risk (read-only metrics), medium priority.
- **Fix**: Add METRICS_TOKEN to Vercel. **5 minutes.**

**L2: No branded favicon or PWA icons**
- Shows Next.js default favicon. `public/icon.png` referenced in `manifest.ts` doesn't exist.
- **Fix**: Add branded favicon + 192px/512px icons. **1 hour.**

**L3: 13 ESLint errors in codebase**
- In `src/lib/knowledge/importer/validator/index.ts` and scripts. Would fail strict CI.
- **Fix**: Fix `@typescript-eslint/no-explicit-any` and unused variables. **2 hours.**

---

## MINIMUM VIABLE FIRST CUSTOMER PATH

This is the exact sequence to get to the first paying customer:

### Step 1 — Environment fixes (30 minutes, manual)
```
1. Apply migrations in Supabase SQL Editor (in order):
   - 0007_get_usage_totals.sql
   - 0008_health_check.sql
   - 0009a_enum_roles.sql
   - 0009b_enterprise_schema.sql
   - 0010_crm_platform_fixed.sql

2. Add to Vercel environment variables:
   - RESEND_API_KEY     (from resend.com → API Keys)
   - FROM_EMAIL         (e.g., "Eunoia <noreply@yourdomain.com>")
   - SENTRY_DSN         (from sentry.io → Project Settings → Client Keys)
   - NEXT_PUBLIC_SENTRY_DSN  (same value)
   - METRICS_TOKEN      (run: openssl rand -base64 32)
```

### Step 2 — Stripe billing (3 developer-days)
```
- Stripe checkout session for Starter ($99) / Pro ($299) / Enterprise ($499)
- Stripe webhook handler to update organizations.subscription_tier
- Billing page in dashboard (/dashboard/billing)
- Usage quota check in askAssistant() based on subscription_tier
```

### Step 3 — Streaming RAG (1 developer-day)
```
- Convert askAssistant() to a route handler returning ReadableStream
- Update chat.tsx to consume the stream token-by-token
- Add typing indicator and streamed source panel
```

### Step 4 — PDF upload (2 developer-days)
```
- File upload UI in Knowledge Base
- Server-side PDF text extraction (pdf-parse already in package.json as dependency)
- DOCX extraction (mammoth already in package.json as dependency)
- Feed extracted text into existing ingestDocument() pipeline
```

After these 4 steps (~6 developer-days total): **first paying customer can sign up, upload PDFs, get AI answers, manage their CRM pipeline, and pay by credit card.**

---

## READINESS VERDICT BY ROLE

| Role | Can They Use It Today? | Blockers |
|------|----------------------|---------|
| Owner (free beta) | ✅ Yes | None — after env vars set |
| Owner (paid customer) | ❌ No | No Stripe |
| Admin inviting team | ⚠️ Partially | Invite link works; email doesn't |
| Staff using RAG | ✅ Yes | 5–6s wait is friction |
| Sales using CRM | ✅ Yes (after 0010 migration) | Pagination gap |
| Manager viewing analytics | ✅ Yes | No advanced analytics |
| IT team monitoring | ⚠️ Partially | Sentry + Prometheus need env vars |

---

## SUMMARY TABLE

| Blocker | Severity | Effort | Status |
|---------|----------|--------|--------|
| No Stripe billing | CRITICAL | 3 days | Not started |
| Apply migrations 0007–0010 | CRITICAL | 10–30 min | Not applied |
| RESEND_API_KEY in Vercel | CRITICAL | 5 min | Not set |
| No PDF/DOCX upload | HIGH | 2 days | Not started |
| RAG blocking 5–6s | HIGH | 1 day | Not started |
| No usage quota enforcement | HIGH | 4 hrs | Not started |
| No chat history | MEDIUM | 2 days | Not started |
| No pagination | MEDIUM | 1 day | Not started |
| System prompt not configurable | MEDIUM | 2 hrs | 2-line code fix |
| SENTRY_DSN in Vercel | MEDIUM | 5 min | Not set |
| No Arabic UI | MEDIUM | 2–3 weeks | Not started |
| METRICS_TOKEN in Vercel | LOW | 5 min | Not set |
| ESLint 13 errors | LOW | 2 hrs | Not fixed |

**Total to first paying customer**: ~6 developer-days of code + 1 hour of DevOps.
