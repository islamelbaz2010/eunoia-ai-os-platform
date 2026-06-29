// Pure authorization helpers — no server dependencies, safe to import in tests.
// AuthorizationService (DB calls) lives in authorization.ts (server-only).

import { type PermissionKey, ROLE_PERMISSION_DEFAULTS } from "@/lib/auth/permissions";
import type { OrgRole, OrganizationMembership } from "@/lib/types";
import { ROLE_RANK } from "@/lib/types";

// ─── PermissionResolver ───────────────────────────────────────────────────────

export const PermissionResolver = {
  // Returns the default permissions for a role (no DB call, no overrides).
  getDefaultPermissions(role: OrgRole): ReadonlySet<PermissionKey> {
    return ROLE_PERMISSION_DEFAULTS[role];
  },

  // Returns true if the given role has the permission by default.
  // Does NOT account for member-level overrides.
  roleHasPermission(role: OrgRole, permission: PermissionKey): boolean {
    return ROLE_PERMISSION_DEFAULTS[role].has(permission);
  },
};

// ─── RoleResolver ─────────────────────────────────────────────────────────────

export const RoleResolver = {
  // Returns all permission keys that differ between two roles.
  diff(
    from: OrgRole,
    to: OrgRole
  ): { added: PermissionKey[]; removed: PermissionKey[] } {
    const fromSet = ROLE_PERMISSION_DEFAULTS[from];
    const toSet = ROLE_PERMISSION_DEFAULTS[to];

    const allKeys = new Set([...fromSet, ...toSet]);
    const added: PermissionKey[] = [];
    const removed: PermissionKey[] = [];

    for (const key of allKeys) {
      if (!fromSet.has(key) && toSet.has(key)) added.push(key);
      if (fromSet.has(key) && !toSet.has(key)) removed.push(key);
    }

    return { added, removed };
  },
};

// ─── PolicyEngine ─────────────────────────────────────────────────────────────
// Future home of ABAC policies. Currently handles ownership-based checks.

export const PolicyEngine = {
  // Returns true if the user can modify a specific resource.
  //
  // Decision tree:
  //   1. Role lacks the permission entirely → false (ownership is irrelevant)
  //   2. Role is admin-level or above → true (full org-wide access)
  //   3. Role has the permission but is below admin → only if user owns the resource
  //
  // This models the real-world pattern where members can edit their own records
  // but admins can edit any record in the organization.
  canModifyResource(
    membership: OrganizationMembership,
    resourceOwnerId: string | null,
    userId: string,
    permission: PermissionKey
  ): boolean {
    if (!PermissionResolver.roleHasPermission(membership.role, permission)) {
      return false;
    }
    if (ROLE_RANK[membership.role] >= ROLE_RANK["admin"]) {
      return true;
    }
    return resourceOwnerId === userId;
  },
};
