import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { type PermissionKey, ROLE_PERMISSION_DEFAULTS } from "@/lib/auth/permissions";
import type { OrgRole, OrganizationMembership } from "@/lib/types";

// Re-export pure helpers so callers can import everything from authorization.ts
export {
  PermissionResolver,
  RoleResolver,
  PolicyEngine,
} from "@/lib/auth/authorization-utils";

// ─── AuthorizationService ─────────────────────────────────────────────────────
// Cached per-request. Resolves member-level permission overrides from DB on top
// of the local role defaults. DB is the source of truth for custom overrides.

export const resolvePermissions = cache(
  async (
    orgId: string,
    role: OrgRole,
    isSuperAdmin: boolean
  ): Promise<Set<PermissionKey>> => {
    if (isSuperAdmin) {
      return new Set(ROLE_PERMISSION_DEFAULTS.owner);
    }

    const base = new Set<PermissionKey>(ROLE_PERMISSION_DEFAULTS[role]);

    // Load member-level overrides — empty for most users.
    const supabase = await createClient();
    const { data: overrides, error: overrideError } = await supabase
      .from("member_permissions")
      .select("permission_key, granted")
      .eq("organization_id", orgId);

    if (!overrideError && overrides && overrides.length > 0) {
      for (const row of overrides) {
        const key = row.permission_key as PermissionKey;
        if (row.granted) {
          base.add(key);
        } else {
          base.delete(key);
        }
      }
    }

    return base;
  }
);

export const AuthorizationService = {
  async can(
    membership: OrganizationMembership,
    permission: PermissionKey,
    isSuperAdmin = false
  ): Promise<boolean> {
    const perms = await resolvePermissions(
      membership.organization.id,
      membership.role,
      isSuperAdmin
    );
    return perms.has(permission);
  },

  async require(
    membership: OrganizationMembership,
    permission: PermissionKey,
    isSuperAdmin = false
  ): Promise<void> {
    const allowed = await this.can(membership, permission, isSuperAdmin);
    if (!allowed) {
      throw new Error(
        `Permission denied: ${permission}. Your role (${membership.role}) does not allow this action.`
      );
    }
  },

  async getPermissions(
    membership: OrganizationMembership,
    isSuperAdmin = false
  ): Promise<Set<PermissionKey>> {
    return resolvePermissions(
      membership.organization.id,
      membership.role,
      isSuperAdmin
    );
  },
};
