# Technical Debt Register — Sprint 0.9

**Date**: 2026-07-02  
**Scope**: Code-quality debt identified during production hardening audit

---

## Priority 1 — Structural (fix before Scale)

### TD-001: Pending migrations not applied to production
**Debt**: Migrations 0003–0009 exist in git but are not applied to production Supabase  
**Impact**: Onboarding, org settings, ownership transfer, archive, member permissions all broken  
**Cost**: 15 minutes of manual work in Supabase SQL Editor  
**Payoff**: Unlocks 5 broken features, enables multi-role system, enables enterprise org features  
**Recommendation**: Apply immediately before next user acquisition effort

### TD-002: `dbError()` helper duplicated across 3 files
**Debt**: `dbError()` is copy-pasted into `crm/actions.ts`, `knowledge-base/actions.ts`, `settings/actions.ts`  
**Impact**: Any future Supabase error code needs updating in 3 places  
**Fix**: Extract to `src/lib/db-error.ts`; import in all action files  
**Effort**: 30 minutes  
**Note**: Currently acceptable; extract when adding a 4th action file

### TD-003: Usage chart uses in-memory aggregation on client side
**Debt**: `getUsageOverTime` in `dashboard/page.tsx` loads up to 2000 `usage_events` rows and aggregates in JS  
**Impact**: Silent data truncation at scale; memory pressure on serverless cold starts  
**Fix**: SQL GROUP BY in a new RPC or move to server-side aggregation  
**Effort**: 2 hours  

---

## Priority 2 — Reliability

### TD-004: No pagination on any data table
**Debt**: All data fetches use `.limit()` caps (crm: 200, kb: 100, audit: 50, members: 100)  
**Impact**: Data silently truncated when org grows; no user feedback about cap  
**Fix**: Cursor-based pagination on all 4 tables  
**Effort**: 1 day  

### TD-005: Chat messages not persisted
**Debt**: `AssistantChat` keeps messages in React state only  
**Impact**: Refresh loses all conversation history; no cross-device access  
**Fix**: `chat_messages` table + server action to persist/load  
**Effort**: 2 days  

### TD-006: Authorization service hits DB on every request with no table guard
**Debt**: FIXED in this sprint (added error guard). However, every request still makes a `member_permissions` query that fails silently until migration 0009 is applied.  
**Remaining**: After applying migration 0009, this query will start working and the auth system will fully leverage per-member overrides  
**Effort**: 0 (resolved by migration)

---

## Priority 3 — Maintainability

### TD-007: Server action auth pattern not uniform
**Debt**: Some actions use `requirePermission()`; others use bare `verifySession()` + `getActiveOrganization()`. `settings/actions.ts` has a `requireOrgMembership()` helper that's duplicated elsewhere.  
**Impact**: Inconsistency increases risk of missing auth check in future additions  
**Fix**: Extract `requireOrgMembership()` to `dal.ts` and standardize  
**Effort**: 2 hours  

### TD-008: OpenAI constants defined inline in `openai.ts`
**Debt**: `MAX_ANSWER_TOKENS=1024`, `MIN_SIMILARITY=0.3`, `MAX_CONTEXT_CHUNKS=5` are inline constants with no config surface  
**Impact**: Tuning RAG quality requires code changes and deployment  
**Fix**: Move to `env.ts` with `OPENAI_MAX_TOKENS`, `RAG_MIN_SIMILARITY`, `RAG_MAX_CHUNKS` env vars  
**Effort**: 1 hour  

### TD-009: Rate limit constant defined inline in `assistant/actions.ts`
**Debt**: `RAG_RATE_LIMIT_PER_HOUR=50` is a hardcoded constant  
**Impact**: Cannot adjust without code change; different tiers need different limits  
**Fix**: Move to `env.ts` with `RAG_RATE_LIMIT_PER_HOUR` env var  
**Effort**: 30 minutes  

### TD-010: `settings/actions.ts` overrides `resend_org_invite` RPC behavior
**Debt**: `resendInvite` now directly updates token/expires_at instead of calling the RPC. After migration 0009 is applied, the RPC also updates `resend_count` and `last_resent_at`.  
**Fix after migration**: Replace inline logic with RPC call once migration 0009 is applied  
**Effort**: 15 minutes (after migration)

---

## Not Debt (Intentional Tradeoffs)

- **`member_permissions` fallback to role defaults**: Intentional behavior. Conservative fail = use role permission set. Safe.
- **`settings` column optional in Organization type**: Required until migration 0009 is applied. Remove the optional markers after migration.
- **Usage page 10K row cap in fallback**: Acceptable. The fallback is temporary until `get_usage_totals` RPC is applied.
- **No multi-org switcher**: Product decision. Single active org per session. Org switcher is P1 Sprint 1 feature.
