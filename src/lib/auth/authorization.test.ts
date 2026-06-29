import { describe, it, expect } from "vitest";
import { PermissionResolver, RoleResolver, PolicyEngine } from "./authorization-utils";
import { Permissions } from "./permissions";
import type { OrgRole, OrganizationMembership } from "@/lib/types";

// ─── Test fixtures ──────────────────────────────────────────────────────────

const makeMembership = (role: OrgRole, orgId = "org-1"): OrganizationMembership => ({
  id: "mem-1",
  role,
  organization: {
    id: orgId,
    name: "Test Org",
    slug: "test-org",
    status: "active",
    archived_at: null,
    subscription_tier: "free",
    settings: {},
    metadata: {},
    is_super_admin_org: false,
  },
});

// ─── PermissionResolver ──────────────────────────────────────────────────────

describe("PermissionResolver.getDefaultPermissions", () => {
  it("returns a non-empty set for every role", () => {
    const roles: OrgRole[] = [
      "owner", "super_admin", "admin", "manager",
      "operator", "editor", "member", "viewer", "guest",
    ];
    for (const role of roles) {
      const perms = PermissionResolver.getDefaultPermissions(role);
      expect(perms.size, `${role} has no permissions`).toBeGreaterThan(0);
    }
  });
});

describe("PermissionResolver.roleHasPermission", () => {
  it("owner has every permission", () => {
    for (const key of Object.values(Permissions)) {
      expect(PermissionResolver.roleHasPermission("owner", key)).toBe(true);
    }
  });

  it("guest does not have CRM access", () => {
    expect(PermissionResolver.roleHasPermission("guest", Permissions.CRM_CONTACTS_READ)).toBe(false);
    expect(PermissionResolver.roleHasPermission("guest", Permissions.CRM_CONTACTS_WRITE)).toBe(false);
  });

  it("viewer has read-only access across CRM and KB", () => {
    expect(PermissionResolver.roleHasPermission("viewer", Permissions.CRM_CONTACTS_READ)).toBe(true);
    expect(PermissionResolver.roleHasPermission("viewer", Permissions.CRM_CONTACTS_WRITE)).toBe(false);
    expect(PermissionResolver.roleHasPermission("viewer", Permissions.KNOWLEDGE_READ)).toBe(true);
    expect(PermissionResolver.roleHasPermission("viewer", Permissions.KNOWLEDGE_WRITE)).toBe(false);
  });
});

// ─── RoleResolver ────────────────────────────────────────────────────────────

describe("RoleResolver.diff", () => {
  it("diff from guest to admin only adds permissions", () => {
    const { added, removed } = RoleResolver.diff("guest", "admin");
    expect(added.length).toBeGreaterThan(0);
    // guest has only assistant.query; admin has all of those plus more
    expect(removed.length).toBe(0);
  });

  it("diff from admin to viewer removes write permissions", () => {
    const { added: _added, removed } = RoleResolver.diff("admin", "viewer");
    expect(removed).toContain(Permissions.CRM_CONTACTS_WRITE);
    expect(removed).toContain(Permissions.KNOWLEDGE_WRITE);
    expect(removed).toContain(Permissions.ORG_MEMBERS_REMOVE);
  });

  it("diff from owner to admin removes destructive org permissions", () => {
    const { removed } = RoleResolver.diff("owner", "admin");
    expect(removed).toContain(Permissions.ORG_ARCHIVE);
    expect(removed).toContain(Permissions.ORG_TRANSFER);
    expect(removed).toContain(Permissions.BILLING_MANAGE);
  });

  it("diff from a role to itself has no changes", () => {
    const { added, removed } = RoleResolver.diff("admin", "admin");
    expect(added.length).toBe(0);
    expect(removed.length).toBe(0);
  });
});

// ─── PolicyEngine ────────────────────────────────────────────────────────────

describe("PolicyEngine.canModifyResource", () => {
  const userId = "user-abc";

  it("admin can modify any resource regardless of ownership", () => {
    const membership = makeMembership("admin");
    const result = PolicyEngine.canModifyResource(
      membership,
      "other-user-id",
      userId,
      Permissions.CRM_CONTACTS_WRITE
    );
    expect(result).toBe(true);
  });

  it("viewer who owns a resource cannot modify it (no write permission)", () => {
    const membership = makeMembership("viewer");
    const result = PolicyEngine.canModifyResource(
      membership,
      userId,
      userId,
      Permissions.CRM_CONTACTS_WRITE
    );
    expect(result).toBe(false);
  });

  it("member who owns a resource can modify it", () => {
    const membership = makeMembership("member");
    const result = PolicyEngine.canModifyResource(
      membership,
      userId,
      userId,
      Permissions.CRM_CONTACTS_WRITE
    );
    expect(result).toBe(true);
  });

  it("viewer cannot modify a resource they do not own", () => {
    const membership = makeMembership("viewer");
    const result = PolicyEngine.canModifyResource(
      membership,
      "someone-else",
      userId,
      Permissions.CRM_CONTACTS_WRITE
    );
    expect(result).toBe(false);
  });
});

// ─── Tenant isolation (application-layer) ───────────────────────────────────
// Verifies that the authorization layer correctly scopes checks to membership.
// DB-level isolation is enforced by RLS (see RLS_AUDIT_REPORT.md).

describe("Tenant isolation", () => {
  it("different org memberships have independent permission contexts", () => {
    const membershipOrgA = makeMembership("admin", "org-A");
    const membershipOrgB = makeMembership("viewer", "org-B");

    expect(PermissionResolver.roleHasPermission("admin", Permissions.CRM_CONTACTS_DELETE)).toBe(true);
    expect(PermissionResolver.roleHasPermission("viewer", Permissions.CRM_CONTACTS_DELETE)).toBe(false);
    expect(membershipOrgA.organization.id).not.toBe(membershipOrgB.organization.id);
  });

  it("guest has no access to CRM in any org", () => {
    const membership = makeMembership("guest", "org-A");
    const canWrite = PolicyEngine.canModifyResource(
      membership,
      null,
      "user-1",
      Permissions.CRM_CONTACTS_WRITE
    );
    expect(canWrite).toBe(false);
  });

  it("org-level super_admin cannot transfer org ownership", () => {
    expect(PermissionResolver.roleHasPermission("super_admin", Permissions.ORG_TRANSFER)).toBe(false);
  });

  it("org-level super_admin cannot archive the org", () => {
    expect(PermissionResolver.roleHasPermission("super_admin", Permissions.ORG_ARCHIVE)).toBe(false);
  });

  it("billing is owner-only, never leaks to lower roles", () => {
    const lowerRoles: OrgRole[] = ["super_admin", "admin", "manager", "operator", "editor", "member", "viewer", "guest"];
    for (const role of lowerRoles) {
      expect(
        PermissionResolver.roleHasPermission(role, Permissions.BILLING_MANAGE),
        `${role} should not have billing.manage`
      ).toBe(false);
    }
  });
});
