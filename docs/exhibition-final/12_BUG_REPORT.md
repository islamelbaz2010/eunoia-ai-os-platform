# BUG REPORT
**Date**: 2026-07-12  
**Scope**: All bugs found during source-code audit  
**Status**: Fixed (this session) vs. Outstanding (still open)

---

## FIXED THIS SESSION

### BUG-010: FAQ Role Count Claim
**Severity**: MEDIUM (credibility)  
**File**: `src/app/_landing/faq.tsx:33`  
**Status**: ✅ FIXED  
**Description**: The FAQ stated "Eunoia AI OS has 9 role levels: Owner, Super Admin, Admin, Manager, Operator, Editor, Member, Viewer, and Guest." The actual code has 4 roles: owner, admin, member, viewer. The discrepancy would be immediately spotted by a developer or an enterprise buyer reviewing the product.  
**Fix**: Updated to accurate "four access levels: Owner, Admin, Member, Viewer" with descriptions.

---

### BUG-011: Pricing Page CSV Inconsistency
**Severity**: LOW (trust)  
**File**: `src/app/_landing/pricing.tsx`  
**Status**: ✅ FIXED  
**Description**: The Pro plan listed "CSV import & export" as a differentiator. But Starter also has `csvExport: true` and `csvImport: true` in `src/lib/stripe/plans.ts`. The landing page was selling Starter as having fewer features than it actually has.  
**Fix**: Added "CSV import & export" to Starter plan features list.

---

### BUG-012: Duplicate Export CSV Link in CRM
**Severity**: LOW (UX confusion)  
**File**: `src/app/dashboard/crm/page.tsx`  
**Status**: ✅ FIXED  
**Description**: Two "Export CSV" links appeared on the same page. One in the page header navigation (with `download` attribute, correct). One inside the contact table header (without `download` attribute, confusing). The table version was redundant and inconsistent.  
**Fix**: Removed the table-header Export CSV link. The header version remains.

---

## OUTSTANDING BUGS

### BUG-001: Demo Request Form Error (P0 — CRITICAL)
**Severity**: CRITICAL  
**File**: `src/lib/email.ts` + `src/app/_landing/demo-actions.ts`  
**Status**: ❌ OUTSTANDING (infrastructure, not code)  
**Description**: `sendDemoRequestEmail()` throws when `RESEND_API_KEY` is not set. The catch block in `submitDemoRequest()` returns `{ error: "Failed to send your request. Please email us directly at hello@eunoiaos.com" }`. Visitors at the exhibition see an error message when filling the demo request form.  
**Fix**: Add RESEND_API_KEY to Vercel environment variables. 5 minutes.

---

### BUG-002: Billing Upgrade Button Disabled (P0)
**Severity**: HIGH  
**File**: `src/app/dashboard/billing/upgrade-button.tsx`  
**Status**: ❌ OUTSTANDING (infrastructure, not code)  
**Description**: When `STRIPE_STARTER_MONTHLY_PRICE_ID` is null (env var not set), the upgrade button is disabled with "This plan is not yet available." No revenue can be collected.  
**Fix**: Add Stripe env vars to Vercel. Create products in Stripe dashboard. Copy price IDs. 20 minutes.

---

### BUG-003: Missing Sentry DSN
**Severity**: MEDIUM  
**File**: Vercel environment variables  
**Status**: ❌ OUTSTANDING (infrastructure)  
**Description**: Sentry v10.62.0 is installed and instrumented. Without DSN, no errors are captured in production. If the app crashes during the exhibition, there's no context for debugging.  
**Fix**: Create Sentry project, copy DSN, add to Vercel. 5 minutes.

---

### BUG-004: Metrics Endpoint Open
**Severity**: MEDIUM  
**File**: `src/app/api/metrics/route.ts` (checks `METRICS_TOKEN`)  
**Status**: ❌ OUTSTANDING (infrastructure)  
**Description**: `/api/metrics` is designed to require `Authorization: Bearer <token>`. But when `METRICS_TOKEN` is not set, the check `process.env.METRICS_TOKEN` is falsy — the endpoint may be open depending on implementation. Prometheus scraper metrics should not be publicly visible.  
**Fix**: Generate token with `openssl rand -base64 32`. Add as `METRICS_TOKEN` in Vercel. 3 minutes.

---

### BUG-005: Migration State Ambiguity
**Severity**: MEDIUM  
**File**: `supabase/migrations/`  
**Status**: ❌ OUTSTANDING  
**Description**: Multiple conflicting files for 0009 and 0010:
- `0009_enterprise_multitenant.sql` (deprecated)
- `0009_enterprise_multitenant_fixed.sql` (deprecated)
- `0009a_enum_roles.sql` (current)
- `0009b_enterprise_schema.sql` (current)
- `0010_crm_platform.sql` (deprecated)
- `0010_crm_platform_fixed.sql` (current)

An operator could apply the wrong file and corrupt the schema. Unknown which migrations have been applied to production Supabase.  
**Fix**: Move deprecated files to `supabase/migrations/deprecated/`. Create a `MIGRATION_STATUS.md` with applied/not-applied status.

---

### BUG-006: No Mobile Dashboard Navigation
**Severity**: HIGH  
**File**: `src/app/dashboard/layout.tsx:56` — `hidden ... sm:flex`  
**Status**: ❌ OUTSTANDING  
**Description**: The dashboard sidebar is hidden on screens narrower than 640px. There is no mobile navigation alternative. A user accessing the dashboard from a phone sees content with no way to navigate.  
**Exhibition impact**: If any visitor at the booth tries to open the product on their phone, they will see a broken experience.  
**Fix**: Add hamburger menu + drawer navigation for mobile. ~3 hours of work.  
**Mitigation**: Demo only on laptop.

---

### BUG-007: Chat History Lost on Refresh
**Severity**: MEDIUM  
**File**: `src/app/dashboard/assistant/chat.tsx:45` — `useState<Message[]>([])`  
**Status**: ❌ OUTSTANDING (known limitation)  
**Description**: Chat messages are in React state. Page refresh or navigation away resets the conversation. Users who accidentally refresh during a demo lose all context.  
**Fix**: Persist messages to `chat_messages` table with migration. ~2 days of work.  
**Mitigation**: Warn users; don't refresh during demo.

---

### BUG-008: Knowledge Base Text-Only Input
**Severity**: MEDIUM (feature gap)  
**File**: `src/app/dashboard/knowledge-base/document-form.tsx`  
**Status**: ❌ OUTSTANDING (known limitation)  
**Description**: The KB form is text-paste only. Users cannot upload PDFs, Word documents, or text files. The first question at every demo will be "Can I upload my PDF?"  
**Fix**: Integrate mammoth (already installed) + pdf-parse (already installed) for file parsing. ~4-6 hours.  
**Note**: mammoth and pdf-parse are already in package.json but unused — they were likely planned for this feature.

---

### BUG-009: No Success Toast on CRM Quick-Add
**Severity**: LOW  
**File**: `src/app/dashboard/crm/quick-add-contact.tsx`  
**Status**: ❌ OUTSTANDING  
**Description**: After submitting the quick-add contact form, the page reloads silently. There's no "Contact added!" notification. Users may double-click or wonder if it worked.  
**Note**: Sonner `<Toaster />` is already installed in the dashboard layout. Needs just a `toast.success()` call on form action success.  
**Fix**: 30 minutes.

---

### BUG-014: KB Document Limit No Warning (Mitigated)
**Severity**: LOW  
**File**: `src/app/dashboard/knowledge-base/page.tsx`  
**Status**: ✅ MITIGATED this session  
**Description**: `.limit(100)` on the KB query silently truncated results. Users with >100 documents would see only 100 with no indication that documents were hidden.  
**Mitigation applied**: Added document count + "(showing first 100)" indicator in the table header.  
**Full fix**: Implement pagination (2 hours).

---

## Severity Summary

| Severity | Count | Fixed This Session | Outstanding |
|----------|-------|-------------------|-------------|
| CRITICAL (P0) | 2 | 0 | 2 (infrastructure) |
| HIGH | 2 | 0 | 2 |
| MEDIUM | 5 | 1 (FAQ) | 4 |
| LOW | 5 | 2 (CSV, duplicate link) | 3 |
| **Total** | **14** | **3** | **11** |
