# Bug Report — Sprint 0.9

**Date**: 2026-07-02  
**Status at close**: 4 fixed in code, 5 require manual migration steps

---

## P0 — Critical

### BUG-001: New user onboarding completely broken [OPEN — requires migration]
**Status**: Not fixed in code (requires DB migration)  
**Root cause**: `create_organization` RPC defined in migration 0005, not applied to production  
**Symptom**: New users complete signup but cannot create a workspace; see "Workspace creation is temporarily unavailable" (after our fix; previously showed internal Supabase schema details)  
**Impact**: Any new paying customer cannot onboard  
**Fix required**: Apply migrations 0003–0009 in Supabase SQL Editor  
**Workaround**: Manually create org for new customers in Supabase dashboard  

### BUG-002: Usage page always showed "No usage recorded yet." [FIXED ✅]
**Status**: Fixed in `src/app/dashboard/usage/page.tsx`  
**Root cause**: `get_usage_totals` RPC (migration 0007) not applied to production; code had no fallback  
**Symptom**: Usage page always showed empty state even when events existed  
**Fix**: Try RPC first; fall back to direct `usage_events` aggregation with 10K row cap  
**Commit**: Included in this session

---

## P1 — High

### BUG-003: Supabase internal errors exposed to clients [FIXED ✅]
**Status**: Fixed across 5 files  
**Root cause**: All server actions returned `error.message` from Supabase errors directly, which includes internal function names, table names, and schema details (e.g., "Could not find the function public.get_usage_totals(org_id) in the schema cache")  
**Affected files**: `settings/actions.ts` (6 places), `crm/actions.ts` (2), `knowledge-base/actions.ts` (2), `onboarding/actions.ts` (1)  
**Fix**: Added `dbError()` helper per file that translates Supabase error codes to safe user messages. Intentional RPC `RAISE EXCEPTION` messages (business logic, not schema details) are still passed through.  
**Security impact**: Closes an information disclosure vector; no schema details leak to users

### BUG-004: `resendInvite` action always failed [FIXED ✅]
**Status**: Fixed in `src/app/dashboard/settings/actions.ts`  
**Root cause**: Called `resend_org_invite` RPC (migration 0009, not applied)  
**Symptom**: Resending an invite returned "Could not find function..." error (internal details) to the user  
**Fix**: Inlined the RPC logic — generates a new UUID token, updates `token` and `expires_at` on the invite row, resends the email. Equivalent behavior without requiring the RPC. (Migration 0009 additionally tracks `resend_count`/`last_resent_at` columns; those will start populating once applied.)  
**Commit**: Included in this session

### BUG-005: Authorization service made failing DB calls on every protected action [FIXED ✅]
**Status**: Fixed in `src/lib/auth/authorization.ts`  
**Root cause**: `resolvePermissions()` queries `member_permissions` table which doesn't exist in production (migration 0009)  
**Symptom**: Every Server Action call silently generated a Supabase 404 error in logs; adding noise that masks real errors  
**Fix**: Check `overrideError` from the query; if the table is missing, skip overrides and use role defaults. Security impact: zero — the fallback is role-based defaults which are the correct pre-migration behavior.  
**Commit**: Included in this session

### BUG-006: updateOrgSettings broken [OPEN — requires migration]
**Status**: Not fixed in code  
**Root cause**: `update_organization_settings` RPC (migration 0009) not applied; `settings` JSONB column also doesn't exist yet  
**Symptom**: Admin trying to update org name/timezone/language sees: "This feature requires a pending database migration." (after our fix; previously showed schema details)  
**Fix required**: Apply migration 0009  

### BUG-007: transferOwnership broken [OPEN — requires migration]
**Status**: Not fixed in code  
**Root cause**: `transfer_org_ownership` RPC (migration 0009) not applied  
**Symptom**: Safe error message shown (after our fix)  
**Fix required**: Apply migration 0009  

### BUG-008: archiveOrganization broken [OPEN — requires migration]
**Status**: Not fixed in code  
**Root cause**: `archive_organization` RPC (migration 0009) not applied  
**Symptom**: Safe error message shown (after our fix)  
**Fix required**: Apply migration 0009  

---

## P2 — Medium

### BUG-009: Pagination absent on all data tables
**Status**: Open  
**Impact**: CRM silently capped at 200 rows, KB at 100, audit logs at 50, members at 100  
**Fix**: Cursor-based pagination (P2 backlog item)  

### BUG-010: Chat history not persisted
**Status**: Open (known gap)  
**Impact**: Page refresh loses all conversation  
**Fix**: `chat_messages` table + persistence (P2 backlog item)  

### BUG-011: Dashboard usage chart uses client-side aggregation with 2000-row cap
**Status**: Open  
**Impact**: At scale (>2000 usage events), chart is silently incomplete  
**Fix**: Server-side aggregation or cursor pagination on usage_events  

---

## P3 — Minor

### BUG-012: Missing PWA icons
**public/icon.png` (192px) and `public/icon-512.png` (512px) referenced by manifest.ts but missing.  
**Impact**: PWA install is broken (banner may not appear)  

### BUG-013: Default Next.js favicon
**`src/app/favicon.ico` is the default Next.js icon.  
**Impact**: Browser tab shows generic icon  

---

## Fixed Summary

| Bug | Severity | Fixed |
|-----|----------|-------|
| BUG-001: Onboarding broken | P0 | ❌ Needs migration |
| BUG-002: Usage page empty | P0 | ✅ |
| BUG-003: Error message leakage | P1 | ✅ |
| BUG-004: resendInvite broken | P1 | ✅ |
| BUG-005: Auth DB noise | P1 | ✅ |
| BUG-006: updateOrgSettings broken | P1 | ❌ Needs migration |
| BUG-007: transferOwnership broken | P1 | ❌ Needs migration |
| BUG-008: archiveOrganization broken | P1 | ❌ Needs migration |
| BUG-009: No pagination | P2 | ❌ Backlog |
| BUG-010: No chat history | P2 | ❌ Backlog |
| BUG-011: Chart capped at 2000 | P2 | ❌ Backlog |
| BUG-012: Missing PWA icons | P3 | ❌ Backlog |
| BUG-013: Default favicon | P3 | ❌ Backlog |
