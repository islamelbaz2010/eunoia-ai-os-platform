# RLS Audit Report — Sprint 4

**Date**: 2026-06-29  
**Auditor**: Claude Engineering OS (Principal Security Engineer)  
**Migration**: 0009_enterprise_multitenant.sql

---

## Summary

| Category | Finding | Severity | Status |
|----------|---------|----------|--------|
| Organization UPDATE | Owners could not update their own org settings | **Critical** | Fixed in 0009 |
| Profile visibility | Members could not see each other's names in Settings | **High** | Fixed in 0009 |
| Role extensibility | 4 hardcoded roles, no permission registry | **High** | Fixed in 0009 |
| N×M RLS evaluation | `is_org_member()` called once per scanned row | **Medium** | Mitigated (indexes) |
| Cross-tenant access | No cross-tenant data access found | — | Clean |

---

## Table-by-Table Analysis

### `organizations`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view their organization | SELECT | `is_org_member(id)` | ✅ Correct |
| super admins manage organizations | ALL | `is_super_admin()` | ✅ Correct but see note below |
| owners and admins can update their organization | UPDATE | `org_role(id) IN (owner, super_admin, admin)` | ✅ Added in 0009 (was missing) |

**Note**: The `ALL` policy grants super admins INSERT on organizations, which is intentional for the admin panel. The `create_organization` RPC is used by regular users.

**Cross-tenant protection**: `is_org_member(id)` correctly uses the row's own `id` — a user selecting from `organizations` only sees rows where they are a member. ✅

**Archived org access**: Archived orgs remain visible to their members (needed for restoration). The app layer in `getActiveOrganization()` filters to `status = 'active'`. ✅

---

### `profiles`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| users can view own profile | SELECT | `id = auth.uid()` | ✅ |
| users can update own profile | UPDATE | `id = auth.uid()` | ✅ |
| org members can view each other profiles | SELECT | cross-join on org_members | ✅ Added in 0009 |

**Risk of profile policy**: The new cross-org visibility policy allows any org member to see the `full_name` and `avatar_url` of co-members. `is_super_admin` is NOT exposed here — only in `getProfile()` which runs server-side via service role context.

**No cross-org leakage**: The policy joins `organization_members viewer_m` and `organization_members target_m` on the same `organization_id`, so User A in Org X cannot see User B from Org Y. ✅

---

### `organization_members`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view membership rows in their org | SELECT | `is_org_member(organization_id)` | ✅ |
| admins manage membership | ALL | `org_role(organization_id) IN (owner, admin)` | ✅ |

**Gap**: The `ALL` policy does not include `super_admin` (org-level). A super_admin cannot update membership via RLS. This is intentional — membership management is done via SECURITY DEFINER RPCs that perform their own auth checks.

**Cross-tenant protection**: Every query includes `.eq("organization_id", membership.organization.id)` from the server action layer. The RLS `is_org_member` check prevents any read of another tenant's membership rows. ✅

---

### `organization_invites`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| admins manage invites | ALL | `org_role(organization_id) IN (owner, admin)` | ✅ |
| invitee can view own invite | SELECT | `email = auth.users.email` | ✅ |

**Race condition**: Fixed in migration 0006 via `FOR UPDATE` lock in `accept_org_invite`. ✅

**Token security**: Invite tokens are UUIDs (`gen_random_uuid()`). UUIDs v4 are 122 bits of randomness — adequate for this use case. A future improvement could use `gen_random_bytes(32)` for a hex token.

**Resend creates new token**: The `resend_org_invite` RPC generates a fresh UUID token and extends expiry. The old token is invalidated. ✅

---

### `crm_contacts`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view crm contacts | SELECT | `is_org_member(organization_id)` | ✅ |
| members can write crm contacts | INSERT | `is_org_member(organization_id)` | ✅ |
| members can update crm contacts | UPDATE | `is_org_member(organization_id)` | ✅ |
| admins can delete crm contacts | DELETE | `org_role(organization_id) IN (owner, admin)` | ✅ |

**Cross-tenant protection**: Every query has `.eq("organization_id", membership.organization.id)` applied server-side. The RLS check prevents cross-org SELECT even without the app-layer filter. ✅

**Gap (low priority)**: Any member can UPDATE any contact (not just their own). This is acceptable for the current product — a future `org.members.roles` permission check could restrict updates.

---

### `knowledge_base_documents`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view/write/update | SELECT/INSERT/UPDATE | `is_org_member(organization_id)` | ✅ |
| admins can delete kb documents | DELETE | `org_role(organization_id) IN (owner, admin)` | ✅ |
| creator can delete own kb documents | DELETE | `created_by = auth.uid()` | ✅ |

**Intentional design**: The creator-delete policy was added for the embedding-failure cleanup path in `createDocument`. ✅

---

### `knowledge_base_chunks`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view/write/delete | SELECT/INSERT/DELETE | `is_org_member(organization_id)` | ✅ |

**Cross-tenant protection**: `organization_id` is set server-side from `membership.organization.id`. The HNSW vector search RPC also filters by `organization_id`. ✅

---

### `audit_logs`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view audit logs | SELECT | `is_org_member(organization_id)` | ✅ |
| system can insert audit logs | INSERT | `is_org_member(organization_id)` | ✅ |

**Immutability**: No UPDATE or DELETE policy exists. Audit logs cannot be modified after insertion. ✅

---

### `usage_events`

| Policy | Type | Condition | Finding |
|--------|------|-----------|---------|
| members can view/insert usage events | SELECT/INSERT | `is_org_member(organization_id)` | ✅ |

---

### `permissions` (new in 0009)

| Policy | Type | Condition |
|--------|------|-----------|
| authenticated can view permissions | SELECT | `auth.uid() IS NOT NULL` |

Read-only reference table. No INSERT/UPDATE/DELETE from client. ✅

---

### `role_permissions` (new in 0009)

| Policy | Type | Condition |
|--------|------|-----------|
| authenticated can view role permissions | SELECT | `auth.uid() IS NOT NULL` |

Read-only. Seeded by migrations. Changes require a new migration. ✅

---

### `member_permissions` (new in 0009)

| Policy | Type | Condition |
|--------|------|-----------|
| admins manage member permissions | ALL | `org_role(organization_id) IN (owner, super_admin, admin)` |
| members view own permissions | SELECT | `user_id = auth.uid()` or admin |

**Cross-tenant protection**: All queries scoped to `organization_id`. Users can only see their own overrides. ✅

---

## Performance Analysis

### `is_org_member()` and `org_role()` in RLS

These functions are called once per row scanned, not once per query. For a query scanning 10,000 rows, they fire 10,000 times.

**Mitigation applied in 0009**:
- `org_members_user_org_role_idx` — composite index on `(user_id, organization_id, role)` — makes each invocation an index seek instead of a table scan.
- `organizations_status_active_idx` — partial index for active org filtering.
- Both helper functions are `STABLE` — PostgreSQL may cache results within the same query.

**Remaining risk**: At very large scale (millions of rows per org), per-row function calls are still expensive. Future mitigation: move to `set_config`-based session variables set at the start of each request.

---

## SECURITY DEFINER Functions

All RPCs that perform privileged operations are `SECURITY DEFINER` with `SET search_path = public`.

| Function | What it can do |
|----------|---------------|
| `create_organization` | INSERT into organizations + organization_members |
| `accept_org_invite` | INSERT into organization_members (bypasses policy for invitee) |
| `resend_org_invite` | UPDATE token in organization_invites |
| `transfer_org_ownership` | UPDATE roles for two members atomically |
| `archive_organization` | UPDATE org status |
| `restore_organization` | UPDATE org status |
| `update_organization_settings` | UPDATE org name/settings |
| `get_user_effective_permissions` | SELECT from role_permissions + member_permissions |
| `user_has_permission` | Delegates to above |
| `match_kb_chunks` | SELECT from knowledge_base_chunks (bypasses member check) — uses own auth check |

Each RPC performs its own authorization check via `org_role()` or `is_super_admin()` before performing the operation. ✅

---

## Cross-Tenant Isolation Checklist

| Check | Result |
|-------|--------|
| No table allows SELECT without org membership | ✅ |
| No INSERT policy allows inserting into another org | ✅ |
| All server actions use `membership.organization.id` (not client input) | ✅ |
| `organization_id` is never accepted as a parameter to server actions | ✅ |
| HNSW vector search is scoped to `target_org_id` | ✅ |
| Audit logs are scoped to the actor's org | ✅ |
| Profile SELECT policy does not expose profiles across unrelated orgs | ✅ |

---

## Remaining Risks

| Risk | Priority | Recommendation |
|------|----------|----------------|
| Per-row RLS function calls | Medium | At 10M+ rows: migrate to session variable pattern |
| Invite tokens use UUID v4 | Low | Consider `gen_random_bytes(32)` for higher entropy |
| No update RLS on crm_contacts by role | Low | Add permission-based UPDATE policy in future |
| Audit log INSERT is self-attested (actor_id set by caller) | Low | Consider trigger-based audit for tamper resistance |
