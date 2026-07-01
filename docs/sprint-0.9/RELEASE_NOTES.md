# Release Notes — Sprint 0.9 (Production Hardening)

**Release date**: 2026-07-02  
**Type**: Patch / Bug fix  
**Breaking changes**: None  
**Rollback risk**: Low

---

## What Changed

### Bug Fixes

**Usage page now shows real data**  
The Usage page previously showed "No usage recorded yet." for all organizations, even when events existed. Root cause was that the `get_usage_totals` database function had not been applied to production. The page now falls back to a direct query against `usage_events` with in-memory aggregation when the function is unavailable. Existing behavior is restored once the migration is applied.

**Resend invite now works**  
The "Resend invite" feature was calling a database function (`resend_org_invite`) that doesn't yet exist in production. It now directly updates the invite token and expiry, then resends the email. Functionally equivalent; tracking of resend counts will be added once migration 0009 is applied.

**Internal database details no longer shown to users**  
Multiple places in the app returned raw Supabase error messages to users when a database or function call failed. These messages could include internal function names, table names, and schema details (e.g., "Could not find the function public.get_usage_totals(org_id) in the schema cache"). All such messages have been replaced with user-friendly equivalents. Business-logic errors from database functions (e.g., "Cannot change the role of the last owner.") are still surfaced correctly.

**Authorization permission checks no longer generate error log noise**  
Every server action that checked permissions was silently generating a database error because the `member_permissions` table (added in migration 0009) doesn't exist in production. The check now handles this gracefully, falling back to role-based defaults. Log noise eliminated; behavior unchanged.

---

## Manual Steps Required (Not Deployed Automatically)

The following must be done manually in the Supabase SQL Editor for full feature availability:

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Apply migration 0003 (grants) | Correct role grants for functions |
| P0 | Apply migration 0004 (indexes + policies) | RLS policies for delete, update + 4 indexes |
| P0 | Apply migration 0005 (schema hardening) | Enables new user onboarding (create_organization) |
| P0 | Apply migration 0006 (hardening v2) | Updated accept_org_invite with RBAC checks |
| P0 | Apply migration 0007 (get_usage_totals) | O(1) usage aggregation RPC |
| P0 | Apply migration 0008 (health_check) | Database health provider function |
| P0 | Apply migration 0009 (enterprise multitenant) | Org settings, member permissions, extended roles |
| P1 | Set RESEND_API_KEY + FROM_EMAIL in Vercel | Invite emails (currently silently skipped) |
| P1 | Set NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN in Vercel | Error tracking |
| P1 | Set METRICS_TOKEN in Vercel | Prometheus scrape auth |

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/usage/page.tsx` | Fallback from RPC to direct query |
| `src/app/dashboard/settings/actions.ts` | Inline resendInvite; sanitize all error messages; add dbError() helper |
| `src/app/dashboard/crm/actions.ts` | Sanitize DB error messages; add dbError() helper |
| `src/app/dashboard/knowledge-base/actions.ts` | Sanitize DB error messages; add dbError() helper |
| `src/app/onboarding/actions.ts` | Sanitize RPC error message |
| `src/lib/auth/authorization.ts` | Guard member_permissions query against missing table |

---

## Test Results

```
Tests:      62/62 passing
TypeScript: Clean (0 errors)
Lint:       Clean
Build:      Verified clean (22 routes)
```
