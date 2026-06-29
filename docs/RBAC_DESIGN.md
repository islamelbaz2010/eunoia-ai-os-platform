# RBAC Design — Eunoia AI OS

**Date**: 2026-06-29  
**Sprint**: 4 — Enterprise Multi-Tenant Core  
**Status**: Implemented

---

## Overview

Eunoia AI OS uses a hybrid RBAC (Role-Based Access Control) system:

- **Role defaults**: Each role has a fixed default permission set (stored in `role_permissions`)
- **Member overrides**: Admins can grant or deny individual permissions per member (`member_permissions`)
- **Platform super admin**: The `profiles.is_super_admin` flag bypasses all org-level checks
- **DB enforcement**: RLS policies enforce tenant isolation at the database layer
- **App enforcement**: `AuthorizationService` enforces permissions at the server action layer

---

## Role Hierarchy

```
owner          (rank 8) — Full control, billing, ownership transfer
  └─ super_admin (rank 7) — All ops except destructive org actions + billing
       └─ admin    (rank 6) — Team + content management, no billing
            └─ manager  (rank 5) — Team operations, limited admin
                 └─ operator  (rank 4) — CRM write + KB read + assistant
                      └─ editor (rank 3.5) — KB write + assistant
                           └─ member  (rank 3) — Legacy: CRM + KB write
                                └─ viewer (rank 1) — Read-only + reports
                                     └─ guest  (rank 0) — Assistant only
```

Note: `viewer` and `member` have different permission profiles — neither is a strict subset of the other. `viewer` has `audit.read` / `usage.read` for reporting but no write access. `member` has write access but no reporting.

---

## Permission Matrix

| Permission | owner | super_admin | admin | manager | operator | editor | member | viewer | guest |
|-----------|-------|------------|-------|---------|----------|--------|--------|--------|-------|
| **CRM** | | | | | | | | | |
| crm.contacts.read | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| crm.contacts.write | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| crm.contacts.delete | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| crm.contacts.export | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Knowledge Base** | | | | | | | | | |
| knowledge.documents.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| knowledge.documents.write | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| knowledge.documents.delete | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI Assistant** | | | | | | | | | |
| assistant.query | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Organization** | | | | | | | | | |
| org.settings.read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.settings.write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.members.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| org.members.invite | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.members.remove | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.members.roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.invites.read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.invites.revoke | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.archive | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org.transfer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Billing** | | | | | | | | | |
| billing.read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| billing.manage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Reporting** | | | | | | | | | |
| audit.read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| usage.read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Permission Resolution Flow

```
Request → Server Action
  ↓
verifySession()           (Supabase auth, HTTP-only cookie)
  ↓
getActiveOrganization()   (DAL, React.cache(), cookie-aware)
  ↓
AuthorizationService.require(membership, Permissions.X)
  ↓
resolvePermissions(orgId, role, isSuperAdmin)  [React.cache()]
  ├─ isSuperAdmin → all permissions
  ├─ ROLE_PERMISSION_DEFAULTS[role]   (local TypeScript registry, no DB)
  └─ member_permissions table overrides (DB call, cached per request)
  ↓
Permission allowed? → proceed
Permission denied?  → throw "Permission denied: X"
```

---

## Member-Level Overrides

Stored in `member_permissions (organization_id, user_id, permission_key, granted)`.

- `granted = true`: Grants a permission not in the role's default set (extra access)
- `granted = false`: Revokes a permission that is in the role's default set (restricted access)

**Example**: An `operator` who also needs `crm.contacts.delete` for a specific workflow gets `granted=true` for that permission, without being promoted to `manager`.

---

## Authorization Layer Components

| Component | File | Purpose |
|-----------|------|---------|
| `AuthorizationService` | `authorization.ts` | Server-side, DB-aware, cached |
| `PermissionResolver` | `authorization-utils.ts` | Pure, synchronous role checks |
| `RoleResolver` | `authorization-utils.ts` | Role diff, upgrade/downgrade analysis |
| `PolicyEngine` | `authorization-utils.ts` | Ownership-based resource access |
| `Permissions` | `permissions.ts` | Typed permission key constants |
| `ROLE_PERMISSION_DEFAULTS` | `permissions.ts` | Local mirror of DB seed |

---

## Future Extensibility

### Custom Roles (Phase 5+)

The `org_role` enum is a controlled extension point. New roles can be added via:
```sql
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'custom_role' AFTER 'manager';
```

Then seed `role_permissions` for the new role. No application code changes required.

### ABAC (Attribute-Based Access Control)

The `PolicyEngine` is the seam point for ABAC expansion:
- `canModifyResource()` already handles ownership-based rules
- Future: add context conditions (time-based, IP-based, resource-attribute-based)
- Future: `member_permissions` can grow an `conditions` JSONB column

### Future Billing Integration

The `billing.read` and `billing.manage` permissions are already defined and seeded. When Stripe is integrated:
1. Create a billing settings page
2. Guard with `Permissions.BILLING_MANAGE`
3. No schema changes required

---

## Security Properties

| Property | How Enforced |
|----------|-------------|
| Tenant isolation | RLS `is_org_member()` on every table |
| Role integrity | `org_role` is a typed enum — no arbitrary strings |
| Permission immutability | Default permissions change only via migrations |
| Last-owner protection | `removeMember` and `updateMemberRole` check owner count |
| Privilege escalation prevention | Actions check `membership.role !== "owner"` before assigning owner/super_admin |
| Server-side auth only | `membership.organization.id` always comes from the DAL, never from client input |
