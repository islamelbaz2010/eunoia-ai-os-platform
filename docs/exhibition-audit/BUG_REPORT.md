# BUG REPORT
**Eunoia AI OS — All Issues Found During Audit**  
**Date**: 2026-07-12  
**Severity**: CRITICAL / HIGH / MEDIUM / LOW

---

## CRITICAL — Functional Breakage

### BUG-001: Demo Request Form Fails Silently
**Severity**: CRITICAL  
**Location**: `src/app/_landing/demo-actions.ts:24` + Vercel environment  
**Symptom**: Visitor fills the "Book a Demo" form on the landing page, clicks submit, sees "Failed to send your request. Please email us directly at hello@eunoiaos.com"  
**Root Cause**: `RESEND_API_KEY` is not set in Vercel environment variables. `getResendClient()` returns null. `sendDemoRequestEmail()` throws. The error is caught and returned to the user.  
**Evidence**:
```typescript
// email.ts:85
if (!client) {
  logger.warn("[email] RESEND_API_KEY not set — demo request not emailed", { from: email });
  return; // silently skips — but sendDemoRequestEmail throws when client is null
}
```
Actually, looking more carefully: `getResendClient()` returns null when key is missing. Then `client.emails.send()` throws a TypeError (cannot call .emails on null), which is caught and returned as `{ error: "Failed to send..." }`.  
**Impact**: Every exhibition visitor who fills the demo form sees an error. Zero leads captured.  
**Fix**: Set `RESEND_API_KEY` + `FROM_EMAIL` + `DEMO_REQUEST_EMAIL` in Vercel dashboard.  
**Steps to Reproduce**: Visit landing page → scroll to Demo section → fill form → click "Book a Demo" → see error message.

---

### BUG-002: Billing Upgrade Buttons Disabled
**Severity**: CRITICAL  
**Location**: `src/app/dashboard/billing/page.tsx:253` + `src/lib/stripe/plans.ts:61-84`  
**Symptom**: Upgrade to Starter and Upgrade to Pro buttons show "This plan is not yet available."  
**Root Cause**: `STRIPE_STARTER_MONTHLY_PRICE_ID` and `STRIPE_PRO_MONTHLY_PRICE_ID` are not set in Vercel. `plan.monthlyPriceId` is null. The billing page correctly checks `const notConfigured = !priceId` and passes `disabled={notConfigured}`.  
**Evidence**:
```typescript
// plans.ts:62
monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? null,
// billing/page.tsx:253
const notConfigured = !priceId;
// ...
disabled={notConfigured}
disabledReason={notConfigured ? "This plan is not yet available." : undefined}
```
**Impact**: No revenue collection is possible. Investor demo shows broken billing flow.  
**Fix**: Create products and prices in Stripe dashboard. Add env vars to Vercel.

---

### BUG-003: Migration 0009 Not Confirmed Applied — dal.ts May Fail for All Users
**Severity**: CRITICAL  
**Location**: `src/lib/auth/dal.ts:51-68` + `supabase/migrations/0009b_enterprise_schema.sql`  
**Symptom**: After login, redirected to `/onboarding` or sees error — cannot access dashboard.  
**Root Cause**: `getMemberships()` in dal.ts selects `status`, `subscription_tier`, `settings`, `metadata`, `is_super_admin_org` from `organizations` table. These columns are added in migration 0009. If not applied, the Supabase query fails with a schema error, which `verifySession()` catches and redirects to login.  
**Evidence**:
```typescript
// dal.ts:54-68
const { data } = await supabase
  .from("organization_members")
  .select(`
    id, role,
    organization:organizations(
      id, name, slug, status, archived_at,
      subscription_tier, settings, metadata, is_super_admin_org
    )
  `)
```
**Status**: Cannot confirm without Supabase access. ACTIVE_TASKS.md lists this as P0 manual task.  
**Fix**: Apply `0009a_enum_roles.sql` then `0009b_enterprise_schema.sql` in Supabase SQL Editor.

---

### BUG-004: Migration 0011 Not Confirmed Applied — Billing Page Crashes
**Severity**: CRITICAL  
**Location**: `src/app/dashboard/billing/page.tsx:104-108`  
**Symptom**: Dashboard billing page shows error or crashes when accessed.  
**Root Cause**: `billing/page.tsx` queries `billing_subscriptions` table which is created in migration 0011. If not applied, the table doesn't exist and the query returns an error.  
**Evidence**:
```typescript
// billing/page.tsx:104-108
const { data: billingRaw } = await supabase
  .from("billing_subscriptions")
  .select("*")
  .eq("organization_id", orgId)
  .single();
```
Note: The page doesn't crash (it has `error.tsx` boundary), but shows an incorrect state.  
**Fix**: Apply `0011_billing.sql` in Supabase SQL Editor.

---

## HIGH — Functional Issues

### BUG-005: CRM Page Crashes if Migration 0010 Not Applied
**Severity**: HIGH  
**Location**: `src/app/dashboard/crm/page.tsx:62-74`  
**Symptom**: CRM page shows error boundary after login.  
**Root Cause**: `search_crm_contacts` RPC is called on every CRM page load. This function is created in migration 0010. If not applied, the RPC call returns an error.  
**Fix**: Apply migration 0010 (use `0010_crm_platform_fixed.sql` — it is the correct version).

---

### BUG-006: Usage Page Broken if Migration 0007 Not Applied
**Severity**: HIGH  
**Location**: `src/app/dashboard/usage/page.tsx`  
**Symptom**: Usage page shows error or zero values.  
**Root Cause**: `get_usage_totals` SQL function is created in migration 0007. If not applied, the RPC fails and the page falls back to direct query.  
**Fix**: Apply migration 0007.

---

### BUG-007: Invite Emails Never Sent
**Severity**: HIGH  
**Location**: `src/lib/email.ts:28-30`  
**Symptom**: Admin sends team invite. Invitee never receives email. Admin sees success message.  
**Root Cause**: Same as BUG-001 — RESEND_API_KEY missing. `sendInviteEmail()` silently skips when client is null (line 29-31: `if (!client) { logger.warn(...); return; }`).  
**Impact**: Team onboarding is broken. New hires can't be invited by email.  
**Note**: This is silent — admin never knows the email wasn't sent.  
**Fix**: Set RESEND_API_KEY in Vercel.

---

### BUG-008: No Chat History — Conversation Lost on Refresh
**Severity**: HIGH  
**Location**: `src/app/dashboard/assistant/chat.tsx:6`  
**Symptom**: User asks AI assistant questions. Refreshes the page. All conversation history is gone.  
**Root Cause**: Messages are stored in React state only (`useState<Message[]>([])`). No database persistence.  
**Impact**: Every user session starts with empty conversation. Can't refer back to previous AI answers.  
**Fix**: Create `chat_messages` table + migration + load/save in `chat.tsx`.

---

### BUG-009: Demo Request Email Error Message Exposes Internal Email
**Severity**: MEDIUM-HIGH  
**Location**: `src/app/_landing/demo-actions.ts:22`  
**Symptom**: When email fails, user sees: "Please email us directly at hello@eunoiaos.com"  
**Problem**: This confirms the company email to scrapers. Also shows users an internal fallback that may be confusing.  
**Fix**: Change fallback message to a more professional alternative without exposing email in error state. Better: just display a support form or Calendly link.

---

### BUG-010: FAQ Incorrect Role Claim
**Severity**: HIGH (misleading to customers)  
**Location**: `src/app/_landing/faq.tsx:35`  
**Symptom**: FAQ states "Eunoia AI OS has 9 role levels: Owner, Super Admin, Admin, Manager, Operator, Editor, Member, Viewer, and Guest."  
**Actual implementation**: Only 4 primary roles exist: `owner`, `admin`, `member`, `viewer`. Manager, Operator, Editor, Guest do not exist in the schema.  
**Evidence**: `src/lib/types.ts` and `src/lib/auth/permissions.ts` — role hierarchy is `owner > admin > member > viewer`.  
**Impact**: Customer signs up expecting 9 role levels. Gets 4. Support ticket and trust issue.  
**Fix**: Correct FAQ to match actual implementation.

---

### BUG-011: Pricing Page CSV Feature Inconsistency
**Severity**: MEDIUM-HIGH  
**Location**: `src/app/_landing/pricing.tsx` vs `src/lib/stripe/plans.ts`  
**Symptom**: Pricing page shows "CSV import & export" as a Pro-only feature. But `plans.ts` gives CSV access to Starter plan. Users on Starter can use CSV import in the dashboard but are told they can't on the landing page.  
**Impact**: Customers pay for Pro thinking they need CSV. Starter customers don't try CSV import they actually have access to.  
**Fix**: Add "CSV import & export" to the Starter pricing card, or restrict it in `plans.ts`.

---

### BUG-012: No Mobile Navigation in Dashboard
**Severity**: HIGH  
**Location**: `src/app/dashboard/layout.tsx:40`  
**Symptom**: On mobile devices, the dashboard sidebar is hidden (`hidden sm:flex`). No hamburger menu or bottom nav exists. Mobile users see the main content with no way to navigate between sections.  
**Evidence**:
```tsx
<aside className="hidden w-64 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur-xl sm:flex">
```
**Impact**: Mobile users are stuck on whichever dashboard page they land on.  
**Fix**: Add mobile hamburger menu + drawer, or a bottom tab bar for mobile.

---

### BUG-013: Metrics Endpoint Open to Internet
**Severity**: HIGH (Security)  
**Location**: `src/app/api/metrics/route.ts` + `METRICS_TOKEN` env var  
**Symptom**: `/api/metrics` returns full Prometheus metrics to any unauthenticated request when `METRICS_TOKEN` is not set.  
**Root Cause**: The route checks for `METRICS_TOKEN` and skips auth if not set.  
**Evidence**: CURRENT_STATE.md confirms "METRICS_TOKEN → ❌ missing"  
**Fix**: Set METRICS_TOKEN in Vercel (5 min: `openssl rand -base64 32`).

---

## MEDIUM — UX and Consistency Issues

### BUG-014: Knowledge Base Document Limit Silently Truncated
**Severity**: MEDIUM  
**Location**: `src/app/dashboard/knowledge-base/page.tsx:21`  
**Symptom**: Organization with more than 100 documents only sees 100. No message indicates documents are missing.  
**Evidence**: `.limit(100)` hardcoded in query.  
**Fix**: Add pagination or at least a message: "Showing 100 of N documents."

---

### BUG-015: `#features` Anchor Scrolls to Wrong Section
**Severity**: MEDIUM  
**Location**: `src/app/_landing/nav.tsx:37` → points to `src/app/_landing/solution.tsx`  
**Issue**: The nav link labeled "Features" scrolls to `solution.tsx` which is titled "The solution to your training problem" — not a features overview. Should scroll to `AiFeatures` section or be renamed "Solution" in the nav.  
**Fix**: Rename nav item from "Features" to "Solution" or move `id="features"` to `ai-features.tsx`.

---

### BUG-016: Usage Dashboard Chart Fetches 2000 Rows in JavaScript
**Severity**: MEDIUM (Performance)  
**Location**: `src/app/dashboard/page.tsx:71-87`  
**Issue**: `getUsageOverTime()` fetches up to 2000 `usage_events` rows and aggregates them in JavaScript. For an active org, this is O(N) JavaScript compute on every dashboard load.  
**Fix**: SQL `DATE_TRUNC` aggregation at DB level — one query, one pass.

---

### BUG-017: Status Chart Fetches 5000 Rows for a Simple Count
**Severity**: MEDIUM (Performance)  
**Location**: `src/app/dashboard/page.tsx:91-108`  
**Issue**: `getContactStatusBreakdown()` fetches up to 5000 contacts just to count by status. Should use `GROUP BY status` at DB level.  
**Fix**: SQL `GROUP BY status` query.

---

### BUG-018: No Confirmation Dialog Before Deleting Contacts
**Severity**: MEDIUM (UX)  
**Location**: `src/app/dashboard/crm/contact-row.tsx`  
**Issue**: Clicking delete on a contact triggers immediate soft-delete with no confirmation. One mis-click loses a contact record.  
**Fix**: Add a confirmation dialog or toast with undo functionality.

---

### BUG-019: CSP `unsafe-inline` Weakens XSS Protection
**Severity**: MEDIUM (Security)  
**Location**: Production HTTP headers (verified in curl response)  
**Issue**: CSP header includes `script-src 'self' 'unsafe-inline'`. This allows inline scripts to execute, removing CSP's primary XSS protection.  
**Impact**: If an XSS vector is found, CSP provides no defense.  
**Fix**: Remove `'unsafe-inline'`, use nonce-based CSP instead. Next.js 15 supports this natively.

---

### BUG-020: No Rate Limiting on Authentication Endpoints
**Severity**: MEDIUM (Security)  
**Location**: `src/proxy.ts` — no rate limit applied to `/login` or `/signup`  
**Issue**: An attacker can brute-force passwords or enumerate accounts with no throttling.  
**Fix**: Add Upstash Rate Limit or Vercel Edge Config-based rate limiting on auth routes.

---

### BUG-021: PWA Manifest References Missing Icons
**Severity**: MEDIUM  
**Location**: `src/app/manifest.ts` + `public/` directory  
**Issue**: The PWA manifest references `icon.png` (192×192) and `icon-512.png` (512×512) which do not exist in the `public/` directory.  
**Impact**: PWA install fails. Browser console shows 404 errors.  
**Fix**: Create and add PNG icons to `public/`.

---

### BUG-022: Default Next.js Favicon Still in Use
**Severity**: MEDIUM  
**Location**: `src/app/favicon.ico`  
**Issue**: The default Next.js favicon.ico is in place. Visitors see the generic Next.js icon in browser tabs.  
**Fix**: Replace with branded Eunoia favicon.

---

## LOW — Polish Issues

### BUG-023: No robots.txt
**Severity**: LOW (SEO)  
**Fix**: Add `public/robots.txt` with appropriate crawl rules.

### BUG-024: No OpenGraph Image
**Severity**: LOW (Marketing)  
**Fix**: Add `src/app/opengraph-image.tsx` with branded social preview.

### BUG-025: Footer Has No Social Links
**Severity**: LOW  
**Location**: `src/app/_landing/footer.tsx`

### BUG-026: No Custom 404 Page
**Severity**: LOW  
**Fix**: Add `src/app/not-found.tsx`.

### BUG-027: Unused scaffold SVGs in public/
**Severity**: LOW  
**Files**: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`  
**Fix**: Delete them.

### BUG-028: No Markdown Rendering in AI Responses
**Severity**: LOW  
**Location**: `src/app/dashboard/assistant/chat.tsx`  
**Issue**: AI responses containing markdown (bold, lists, code) are rendered as raw text.

### BUG-029: No "Copy Answer" Button on AI Responses
**Severity**: LOW  
**Location**: `chat.tsx`

### BUG-030: Annual Billing Stripe Price IDs Missing
**Severity**: LOW  
**Location**: `src/lib/stripe/plans.ts:64`  
**Issue**: Annual price IDs shown in billing UI but not configured.
