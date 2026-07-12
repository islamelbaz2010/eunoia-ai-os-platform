# POST-EXHIBITION ROADMAP
**Date**: 2026-07-12  
**Horizon**: 90 days after Tuesday

---

## Immediate (Week 1: First customers close)

### TASK 1: Activate Billing
**Priority**: P0  
**Time**: 20 minutes  
**Why**: You have customers who want to pay. Don't make them wait.  

Actions:
1. Create Stripe products and price IDs
2. Set Stripe env vars in Vercel
3. Apply migration 0011
4. Test checkout with test card 4242 4242 4242 4242
5. Switch to live Stripe keys for actual payments

---

### TASK 2: Configure Email Delivery
**Priority**: P0  
**Time**: 5 minutes  

Actions:
1. Get Resend API key
2. Add to Vercel env vars
3. Test invite email delivery
4. Test demo request email delivery
5. Verify `FROM_EMAIL` domain is verified in Resend (or use provided resend.dev domain temporarily)

---

### TASK 3: Fix Sentry + Metrics Auth
**Priority**: P1  
**Time**: 10 minutes  

Actions:
1. Create Sentry project, copy DSN
2. Generate METRICS_TOKEN
3. Add both to Vercel
4. Trigger a test error to verify Sentry capture

---

### TASK 4: Apply All Pending Migrations
**Priority**: P0  
**Time**: 20 minutes  

Order:
```
supabase/migrations/0007_get_usage_totals.sql
supabase/migrations/0008_health_check.sql
supabase/migrations/0009a_enum_roles.sql
supabase/migrations/0009b_enterprise_schema.sql
supabase/migrations/0010_crm_platform_fixed.sql
supabase/migrations/0011_billing.sql
```

---

## Sprint 1 (Weeks 2-3: First 10 Customers Onboarded)

### TASK 5: PDF/Word File Upload for Knowledge Base
**Priority**: P1  
**Time**: 4-6 hours  
**Why**: The #1 objection at the exhibition will be "I can't upload my existing documents."  
**Implementation**: `mammoth` (already installed for .docx) + `pdf-parse` (already installed for .pdf) in the KB document form. Process the file, extract text, pass through existing `ingestDocument()` pipeline.

---

### TASK 6: Mobile Dashboard Navigation
**Priority**: P1  
**Time**: 3 hours  
**Why**: Any customer who accesses the dashboard from a phone sees no navigation.  
**Implementation**: Add hamburger button to dashboard header on mobile. Toggle a drawer with the sidebar nav items. Use existing Tailwind classes.

---

### TASK 7: Analytics Installation
**Priority**: P1  
**Time**: 1 hour  
**Why**: Without analytics, you have no idea what's happening after launch. You can't optimize what you can't measure.  
**Implementation**: Install Posthog (`@posthog/js`). Add `<PostHogProvider>` in `layout.tsx`. Track: page views, signup, org creation, first KB doc added, first AI query, invite sent, plan upgrade.

---

### TASK 8: Success Toast for CRM Quick-Add
**Priority**: P2  
**Time**: 30 minutes  
**Implementation**: In `quick-add-contact.tsx`, detect form action success and call `toast.success("Contact added!")`. Sonner is already installed.

---

## Sprint 2 (Weeks 4-6: Revenue Track)

### TASK 9: Edit Contact
**Priority**: P1  
**Time**: 4 hours  
**Why**: Contacts can be created and deleted but not edited. If a prospect changes their phone number, there's no way to update it except delete + recreate.  
**Implementation**: `updateContact()` action (already exists in `crm/actions.ts`). Add edit modal or inline editing to `ContactRow`. The backend is ready.

---

### TASK 10: Edit Knowledge Base Document + Re-Ingest
**Priority**: P1  
**Time**: 6 hours  
**Why**: Documents change. SOPs get updated. Menus change seasonally. Currently a user must delete and recreate to update a document.  
**Implementation**: `updateDocument(id, data)` Server Action → delete existing chunks → re-run `ingestDocument()` on new content.

---

### TASK 11: Chat History Persistence
**Priority**: P2  
**Time**: 2 days  
**Why**: Every page refresh loses conversation context. For a knowledge management product used daily, this is a UX problem that erodes trust.  
**Implementation**: New `chat_messages` table. Migration 0012. Save user + assistant messages per session. Load on mount. Add "New conversation" button.

---

### TASK 12: Quota Enforcement UI
**Priority**: P2  
**Time**: 2 hours  
**Why**: Users who exceed their plan limits (contacts, documents, members) see an error from the Server Action but no upgrade path is offered in context.  
**Implementation**: When a quota error is returned, show an inline upgrade CTA alongside the error message. Link to `/dashboard/billing`.

---

## Sprint 3 (Weeks 7-10: Scale)

### TASK 13: Pagination for All Tables
**Priority**: P2  
**Time**: 1 day  
**Why**: Knowledge Base is capped at 100 docs with no pagination. Audit Logs don't paginate. Settings member list doesn't paginate. At scale, all tables truncate silently.

---

### TASK 14: Dashboard Aggregation with SQL
**Priority**: P2  
**Time**: 2 hours  
**Why**: `getUsageOverTime()` fetches 2000 rows and aggregates in JS. `getContactStatusBreakdown()` fetches 5000 rows. Replace with SQL GROUP BY for efficiency and correctness at scale.  
**Implementation**: Use `DATE_TRUNC('day', created_at)` for usage; `COUNT(*) GROUP BY status` for contacts. New RPCs or inline SQL functions.

---

### TASK 15: Migration Cleanup
**Priority**: P2  
**Time**: 2 hours  
**Why**: 4 conflicting files for migration 0009 and 2 for 0010 create deployment risk.  
**Implementation**: 
1. Move `0009_enterprise_multitenant.sql`, `0009_enterprise_multitenant_fixed.sql`, `0010_crm_platform.sql` to `supabase/migrations/deprecated/`
2. Add `MIGRATION_STATUS.md` documenting which migrations are applied in production
3. Verify `supabase db push` or equivalent would work cleanly

---

### TASK 16: Arabic UI (Partial)
**Priority**: P1 for MENA market  
**Time**: 3-5 days  
**Why**: Arabic-speaking hotel staff expect Arabic UI, not just Arabic AI. The current product has Arabic language support in the AI but the dashboard UI is English-only.  
**Implementation**: RTL layout support in Tailwind (`dir="rtl"` on `<html>`). Key UI strings in an i18n file. Start with: navigation labels, dashboard KPI labels, CRM stage names.

---

## 90-Day Goals

| Goal | Metric |
|------|--------|
| Paying customers | 10 |
| MRR | $1,000+ |
| Stripe activated | ✅ |
| Email delivery working | ✅ |
| PDF/Word upload | ✅ |
| Mobile navigation | ✅ |
| Analytics installed | ✅ |
| Chat persistence | In progress |
| Arabic UI (partial) | In progress |
