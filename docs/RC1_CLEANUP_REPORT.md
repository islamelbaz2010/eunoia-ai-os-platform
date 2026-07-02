# RC1 Cleanup Report

**Date**: 2026-07-03  
**Branch**: main  
**Trigger**: All 13 migration verification checks passed  
**Tests**: 62/62  
**TypeScript**: 0 errors  
**Lint**: Clean  

---

## Summary

RC1 Cleanup removes every temporary compatibility workaround introduced while
migrations 0005–0009 were missing from the production Supabase instance.
The production schema is now the single source of truth; all defensive
branches, optional field workarounds, RPC fallbacks, and migration-pending
comments have been eliminated.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Removed optional markers from 5 Organization fields |
| `src/lib/auth/dal.ts` | Full org column select; strict active-org logic |
| `src/app/dashboard/usage/page.tsx` | Removed O(N) fallback aggregation |
| `src/app/onboarding/actions.ts` | Removed PGRST202/PGRST205 error branches |
| `src/lib/auth/authorization.ts` | Removed migration-pending comment |
| `src/app/dashboard/settings/actions.ts` | Switched to `resend_org_invite` RPC; removed `PGRST202`/`PGRST205` from `dbError`; removed unused `randomUUID` import |
| `src/lib/health/providers/database.ts` | Removed PGRST202 health-check fallback |
| `src/app/dashboard/knowledge-base/actions.ts` | Removed migration reference comment |
| `src/lib/auth/permissions.ts` | Removed migration-number references from comments |
| `src/lib/logger.ts` | Removed "backward-compatible" note |
| `src/lib/health/manager.ts` | Removed "defensive dead-code branch" note |

---

## Code Removed

### 1. Organization type optional fields (`src/lib/types.ts`)

Before — 5 fields were `?` optional with a migration comment:
```ts
status?: OrgStatus;
archived_at?: string | null;
subscription_tier?: string;
settings?: OrgSettings;
metadata?: Record<string, unknown>;
```

After — strict types, always present:
```ts
status: OrgStatus;
archived_at: string | null;
subscription_tier: string;
settings: OrgSettings;
metadata: Record<string, unknown>;
```

### 2. Restricted org column select (`src/lib/auth/dal.ts`)

Before — selected only 4 org columns to avoid PGRST errors on missing columns:
```ts
organization:organizations(id, name, slug, is_super_admin_org)
```

After — full production schema:
```ts
organization:organizations(
  id, name, slug, status, archived_at,
  subscription_tier, settings, metadata, is_super_admin_org
)
```

### 3. Dual-path active-org resolution (`src/lib/auth/dal.ts`)

Before — two branches: one for `status === "active"`, one for `status === undefined`:
```ts
if (match && (match.organization.status === undefined || match.organization.status === "active"))
memberships.find(m => m.organization.status === "active" || m.organization.status === undefined)
```

After — single strict check:
```ts
if (match && match.organization.status === "active")
memberships.find(m => m.organization.status === "active") ?? null
```

### 4. `getActiveMemberships` compatibility branch (`src/lib/auth/dal.ts`)

Before — short-circuited if `status` was missing on any membership:
```ts
const hasStatus = memberships.some(m => m.organization.status !== undefined);
if (!hasStatus) return memberships;
return memberships.filter(m => m.organization.status === "active");
```

After — always filters:
```ts
return memberships.filter(m => m.organization.status === "active");
```

### 5. Usage page O(N) fallback (`src/app/dashboard/usage/page.tsx`)

Before — 20 lines: tried RPC, fell back to fetching up to 10 000 events and
aggregating them in JS memory if the RPC wasn't available.

After — 4 lines: calls `get_usage_totals` RPC directly.

### 6. Onboarding PGRST error handling (`src/app/onboarding/actions.ts`)

Before:
```ts
if (error.code === "PGRST202" || error.code === "PGRST205") {
  return { error: "Workspace creation is temporarily unavailable..." };
}
if (error.message && !error.message.includes("public.") && !error.message.includes("schema cache")) {
  return { error: error.message };
}
return { error: "Failed to create workspace. Please try again." };
```

After:
```ts
return { error: error.message || "Failed to create workspace. Please try again." };
```

### 7. Settings `resendInvite` manual token rotation (`src/app/dashboard/settings/actions.ts`)

Before — bypassed `resend_org_invite` RPC; manually rotated token with a direct
`UPDATE`, skipping `resend_count`/`last_resent_at` tracking:
```ts
const newToken = randomUUID();
const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
await supabase.from("organization_invites").update({ token: newToken, expires_at: expiresAt })…
```

After — uses the production RPC:
```ts
const { data: newToken } = await supabase.rpc("resend_org_invite", { invite_id: inviteId });
```

Also removed unused `import { randomUUID } from "node:crypto"`.

### 8. Settings `dbError` PGRST cases (`src/app/dashboard/settings/actions.ts`)

Before — two migration-pending catch cases:
```ts
case "PGRST202":
case "PGRST205": return "This feature requires a pending database migration…";
```

After — removed; generic handler surfaces `error.message` directly.

### 9. Database health PGRST202 fallback (`src/lib/health/providers/database.ts`)

Before — a 404 with code PGRST202 was treated as `status: "ok"` (migration not applied yet):
```ts
if (res.status === 404) {
  const body = await res.json().catch(() => ({}));
  if (body.code === "PGRST202") {
    return { status: "ok", latency_ms, metadata: { … } };
  }
}
```

After — a 404 is always an error:
```ts
return { status: `error:${res.status}`, latency_ms, metadata: { … } };
```

---

## Technical Debt Eliminated

| Debt Item | Root Cause | Resolution |
|-----------|-----------|------------|
| Optional Organization fields | Migrations 0009 not applied | Fields now required, schema verified |
| Restricted DB select | PGRST errors on unknown columns | Full column list now safe to select |
| Dual active-org branches | `status` field missing pre-0009 | Single strict `status === "active"` check |
| `getActiveMemberships` short-circuit | Same | Removed |
| Usage page O(N) fallback | `get_usage_totals` RPC missing | RPC path only |
| Manual invite resend logic | `resend_org_invite` RPC missing | RPC used; tracks `resend_count` |
| PGRST202/205 catch blocks | RPCs/tables missing pre-migration | Removed across 3 files |
| Healthcheck PGRST202 passthrough | `healthcheck()` function missing | Treated as error |
| 9 stale migration-reference comments | Documentation of workarounds | Removed or reworded |

---

## Architecture Improvements

- **Organization model is now strict**: removing `?` from 5 fields makes the type system enforce
  that `status`, `archived_at`, `subscription_tier`, `settings`, and `metadata` are always
  populated. TypeScript will catch any code path that assumes they might be missing.

- **`getActiveOrganization` returns `null` instead of fallback**: previously fell back to
  `memberships[0]` (any status). Now returns `null` if no active org exists, which forces
  call sites to handle the missing-org case explicitly rather than silently operating on an
  archived or suspended org.

- **`resendInvite` now tracks audit data**: switching to the `resend_org_invite` RPC means
  `resend_count` and `last_resent_at` are maintained on every resend, enabling future
  rate-limiting and analytics on invite abuse.

- **Health check is now an honest signal**: the database provider previously reported `ok`
  when `healthcheck()` didn't exist. It now reports the actual HTTP status, so a
  misconfigured or missing function surfaces as a real failure.

---

## Remaining Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Users with no active orgs (archived/suspended) now see a null membership | Low | `getActiveOrganization` returns `null`; all call sites already guard against null membership |
| `resend_org_invite` RPC authorization differs from old direct UPDATE | None | RPC enforces `org_role IN ('owner', 'super_admin', 'admin')` — same gate as the `requirePermission` check in the app layer |
| Health check false failures if `healthcheck()` is ever dropped | Very low | The function is now idempotent (`CREATE OR REPLACE`) and owned by the service |

---

## Next Step

Await explicit approval before beginning Sprint 1.
