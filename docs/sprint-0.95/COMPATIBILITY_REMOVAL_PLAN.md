# Compatibility Code Removal Plan — Sprint 0.95

**Date**: 2026-07-02  
**Status**: All workarounds documented; NONE removed yet (migrations not confirmed applied)  
**Trigger for removal**: Each migration confirmed applied in production Supabase

---

## Overview

8 files contain temporary compatibility code added because migrations were missing. Each entry below specifies exactly what to change, what to change it to, and which migration triggers the removal.

---

## 1. `src/lib/auth/authorization.ts`
**Workaround**: Error guard around `member_permissions` query  
**Why it exists**: Migration 0009 creates the `member_permissions` table. Without it, the query returns PGRST205 (table not found). The guard silently falls back to role defaults.  
**Remove after**: Migration 0009 applied  
**Safe to remove early**: No — removing before 0009 causes every permission check to generate a DB error  

**Current code** (lines 33–48):
```typescript
const { data: overrides, error: overrideError } = await supabase
  .from("member_permissions")
  .select("permission_key, granted")
  .eq("organization_id", orgId);

if (!overrideError && overrides && overrides.length > 0) {
```

**Replace with**:
```typescript
const { data: overrides } = await supabase
  .from("member_permissions")
  .select("permission_key, granted")
  .eq("organization_id", orgId);

if (overrides && overrides.length > 0) {
```

---

## 2. `src/lib/auth/dal.ts`
**Workaround**: Three separate changes for migration-0009 compatibility  
**Why it exists**: Migration 0009 adds `status`, `archived_at`, `subscription_tier`, `settings`, `metadata` columns to `organizations`. Without them, selecting those columns would cause a 42703 error.  
**Remove after**: Migration 0009 applied  

### 2a. `getMemberships()` — restricted SELECT (lines 49–65)
**Current** (selects only 4 columns):
```typescript
.select(`
  id,
  role,
  organization:organizations(
    id,
    name,
    slug,
    is_super_admin_org
  )
`)
```
**Replace with**:
```typescript
.select(`
  id,
  role,
  organization:organizations(
    id,
    name,
    slug,
    is_super_admin_org,
    status,
    archived_at,
    subscription_tier,
    settings,
    metadata
  )
`)
```

### 2b. `getActiveOrganization()` — status-undefined guard (lines 85–95)
**Current**:
```typescript
if (match && (match.organization.status === undefined || match.organization.status === "active")) {
  return match;
}
return (
  memberships.find((m) => m.organization.status === "active" || m.organization.status === undefined) ??
  memberships[0]
);
```
**Replace with**:
```typescript
if (match && match.organization.status === "active") {
  return match;
}
return memberships.find((m) => m.organization.status === "active") ?? null;
```

### 2c. `getActiveMemberships()` — hasStatus guard (lines 101–105)
**Current**:
```typescript
const hasStatus = memberships.some((m) => m.organization.status !== undefined);
if (!hasStatus) return memberships;
return memberships.filter((m) => m.organization.status === "active");
```
**Replace with**:
```typescript
return memberships.filter((m) => m.organization.status === "active");
```

---

## 3. `src/lib/types.ts`
**Workaround**: Optional Organization fields  
**Why it exists**: Without migration 0009, `status`, `archived_at`, etc. don't exist as columns — making them optional prevents TypeScript errors when those fields are undefined at runtime.  
**Remove after**: Migration 0009 applied  

**Current** (lines 58–62):
```typescript
status?: OrgStatus;
archived_at?: string | null;
subscription_tier?: string;
settings?: OrgSettings;
metadata?: Record<string, unknown>;
```
**Replace with** (remove `?` from each):
```typescript
status: OrgStatus;
archived_at: string | null;
subscription_tier: string;
settings: OrgSettings | null;
metadata: Record<string, unknown> | null;
```

---

## 4. `src/app/dashboard/usage/page.tsx`
**Workaround**: RPC fallback to in-memory aggregation  
**Why it exists**: Migration 0007 creates `get_usage_totals()`. Without it, the page would always show empty.  
**Remove after**: Migration 0007 applied  

**Current** (lines 11–38):
```typescript
const { data: rpcResult, error: rpcError } = await supabase.rpc("get_usage_totals", ...);
if (!rpcError && rpcResult) {
  totals = rpcResult as UsageTotals[];
} else {
  // ... fallback aggregation ...
}
```
**Replace with**:
```typescript
const { data: totals } = membership
  ? await supabase.rpc("get_usage_totals", { org_id: membership.organization.id })
  : { data: [] };
```
Also remove the `type UsageTotals = ...` local type — it's on the RPC return type.

---

## 5. `src/app/dashboard/settings/actions.ts`
**Workaround A**: Inline `resendInvite` without RPC  
**Why it exists**: `resend_org_invite()` RPC is in migration 0009.  
**Remove after**: Migration 0009 applied  

**Current** (lines 158–196): Directly updates token and expires_at on organization_invites.  
**Replace with**:
```typescript
const { data: newToken, error } = await supabase.rpc("resend_org_invite", {
  invite_id: inviteId,
});
if (error || !newToken) return { error: "Failed to resend invite." };
const { data: invite } = await supabase
  .from("organization_invites")
  .select("email, role")
  .eq("id", inviteId)
  .single();
```

**Workaround B**: `dbError()` PGRST202 special case  
**Why it exists**: Prevents "Could not find the function public.xxx..." from reaching the client.  
**Remove after**: Migration 0009 applied — all referenced RPCs will exist  
**Note**: Keep the `dbError()` helper itself — it handles legitimate DB errors (23505, etc.). Only remove the PGRST202/PGRST205 cases once all migrations are applied.

---

## 6. `src/app/onboarding/actions.ts`
**Workaround**: Friendly error message for missing `create_organization` RPC  
**Why it exists**: Without migration 0005, `create_organization` returns PGRST202.  
**Remove after**: Migration 0005 applied  

**Current** (lines 37–44):
```typescript
if (error) {
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return { error: "Workspace creation is temporarily unavailable. Please contact support." };
  }
  if (error.message && !error.message.includes("public.") && !error.message.includes("schema cache")) {
    return { error: error.message };
  }
  return { error: "Failed to create workspace. Please try again." };
}
```
**Replace with**:
```typescript
if (error) {
  return { error: error.message };
}
```

---

## 7. `src/lib/health/providers/database.ts`
**Workaround**: PGRST202 treated as "ok"  
**Why it exists**: Without migration 0008, `healthcheck()` RPC doesn't exist. PGRST202 proves PostgREST + DB connectivity but not actual query execution.  
**Remove after**: Migration 0008 applied  

**Current** (lines 61–69):
```typescript
if (res.status === 404) {
  const body = (await res.json().catch(() => ({}))) as { code?: string };
  if (body.code === "PGRST202") {
    return {
      status: "ok",
      latency_ms,
      metadata: { database: undefined, server_time: undefined },
    };
  }
}
```
**Replace with**: Remove the entire `if (res.status === 404)` block. A 404 response should be treated as `error:404`.

---

## 8. `src/app/dashboard/org-switcher-actions.ts`
**Workaround**: `status === undefined` check  
**Why it exists**: Without migration 0009, org status is always undefined.  
**Remove after**: Migration 0009 applied  

**Current** (line 15):
```typescript
(m.organization.status === undefined || m.organization.status === "active")
```
**Replace with**:
```typescript
m.organization.status === "active"
```

---

## Removal Sequence

```
Apply migration 0005 → remove onboarding/actions.ts workaround
Apply migration 0007 → remove usage/page.tsx fallback
Apply migration 0008 → remove database.ts PGRST202 block
Apply migration 0009 → remove 5 remaining workarounds simultaneously:
  - authorization.ts error guard
  - dal.ts column restriction + status guards (3 functions)
  - types.ts optional fields
  - settings/actions.ts inline resendInvite + PGRST202 cases
  - org-switcher-actions.ts undefined check
```

After all removals: run `npx tsc --noEmit && npm run lint && npm test` to confirm clean.
