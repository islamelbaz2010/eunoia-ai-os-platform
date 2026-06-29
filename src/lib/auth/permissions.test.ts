import { describe, it, expect } from "vitest";
import { Permissions, ROLE_PERMISSION_DEFAULTS, type PermissionKey } from "./permissions";
import type { OrgRole } from "@/lib/types";

describe("Permissions registry", () => {
  it("all permission keys are non-empty strings", () => {
    for (const [name, key] of Object.entries(Permissions)) {
      expect(typeof key, `${name} key`).toBe("string");
      expect(key.length, `${name} key is empty`).toBeGreaterThan(0);
    }
  });

  it("all permission keys follow the category.noun.verb format", () => {
    for (const key of Object.values(Permissions)) {
      // Accepts: "assistant.query", "crm.contacts.read", "org.settings.write" etc.
      expect(key, `${key} format`).toMatch(/^[a-z]+(\.[a-z]+)+$/);
    }
  });

  it("no duplicate permission keys", () => {
    const keys = Object.values(Permissions);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe("ROLE_PERMISSION_DEFAULTS", () => {
  const roles: OrgRole[] = [
    "owner", "super_admin", "admin", "manager",
    "operator", "editor", "member", "viewer", "guest",
  ];

  it("all roles have a permission set defined", () => {
    for (const role of roles) {
      expect(ROLE_PERMISSION_DEFAULTS[role], `${role} has no defaults`).toBeDefined();
    }
  });

  it("owner has all permissions", () => {
    const ownerPerms = ROLE_PERMISSION_DEFAULTS.owner;
    for (const key of Object.values(Permissions)) {
      expect(ownerPerms.has(key as PermissionKey), `owner missing ${key}`).toBe(true);
    }
  });

  it("guest only has assistant.query", () => {
    const guestPerms = ROLE_PERMISSION_DEFAULTS.guest;
    expect(guestPerms.size).toBe(1);
    expect(guestPerms.has(Permissions.ASSISTANT_QUERY)).toBe(true);
  });

  it("viewer cannot delete contacts or documents", () => {
    const viewerPerms = ROLE_PERMISSION_DEFAULTS.viewer;
    expect(viewerPerms.has(Permissions.CRM_CONTACTS_DELETE)).toBe(false);
    expect(viewerPerms.has(Permissions.KNOWLEDGE_DELETE)).toBe(false);
  });

  it("viewer cannot manage members", () => {
    const viewerPerms = ROLE_PERMISSION_DEFAULTS.viewer;
    expect(viewerPerms.has(Permissions.ORG_MEMBERS_INVITE)).toBe(false);
    expect(viewerPerms.has(Permissions.ORG_MEMBERS_REMOVE)).toBe(false);
    expect(viewerPerms.has(Permissions.ORG_MEMBERS_ROLES)).toBe(false);
  });

  it("only owner has org.transfer and org.archive", () => {
    for (const role of roles) {
      if (role === "owner") {
        expect(ROLE_PERMISSION_DEFAULTS[role].has(Permissions.ORG_TRANSFER)).toBe(true);
        expect(ROLE_PERMISSION_DEFAULTS[role].has(Permissions.ORG_ARCHIVE)).toBe(true);
      } else {
        expect(
          ROLE_PERMISSION_DEFAULTS[role].has(Permissions.ORG_TRANSFER),
          `${role} should not have org.transfer`
        ).toBe(false);
        expect(
          ROLE_PERMISSION_DEFAULTS[role].has(Permissions.ORG_ARCHIVE),
          `${role} should not have org.archive`
        ).toBe(false);
      }
    }
  });

  it("only owner has billing.manage", () => {
    for (const role of roles) {
      if (role === "owner") {
        expect(ROLE_PERMISSION_DEFAULTS[role].has(Permissions.BILLING_MANAGE)).toBe(true);
      } else {
        expect(
          ROLE_PERMISSION_DEFAULTS[role].has(Permissions.BILLING_MANAGE),
          `${role} should not have billing.manage`
        ).toBe(false);
      }
    }
  });

  it("strict privilege subset: guest ⊂ admin ⊂ owner", () => {
    // Roles grant different types of access, not just graduated levels —
    // e.g. viewer has audit.read but member does not. The strict subset
    // relationship holds only at the endpoints of the privilege spectrum.
    const isSubset = (a: ReadonlySet<PermissionKey>, b: ReadonlySet<PermissionKey>) =>
      [...a].every((k) => b.has(k));

    expect(isSubset(ROLE_PERMISSION_DEFAULTS.guest, ROLE_PERMISSION_DEFAULTS.admin)).toBe(true);
    expect(isSubset(ROLE_PERMISSION_DEFAULTS.admin, ROLE_PERMISSION_DEFAULTS.owner)).toBe(true);
  });

  it("guest permissions are contained in every other role", () => {
    const isSubset = (a: ReadonlySet<PermissionKey>, b: ReadonlySet<PermissionKey>) =>
      [...a].every((k) => b.has(k));
    const roles: OrgRole[] = ["viewer", "editor", "member", "operator", "manager", "admin", "super_admin", "owner"];
    for (const role of roles) {
      expect(isSubset(ROLE_PERMISSION_DEFAULTS.guest, ROLE_PERMISSION_DEFAULTS[role]), `guest ⊄ ${role}`).toBe(true);
    }
  });

  it("admin has org.settings.write but not billing.manage", () => {
    expect(ROLE_PERMISSION_DEFAULTS.admin.has(Permissions.ORG_SETTINGS_WRITE)).toBe(true);
    expect(ROLE_PERMISSION_DEFAULTS.admin.has(Permissions.BILLING_MANAGE)).toBe(false);
  });

  it("manager can invite but not remove members", () => {
    expect(ROLE_PERMISSION_DEFAULTS.manager.has(Permissions.ORG_MEMBERS_INVITE)).toBe(true);
    expect(ROLE_PERMISSION_DEFAULTS.manager.has(Permissions.ORG_MEMBERS_REMOVE)).toBe(false);
  });

  it("editor has knowledge write but not CRM write", () => {
    expect(ROLE_PERMISSION_DEFAULTS.editor.has(Permissions.KNOWLEDGE_WRITE)).toBe(true);
    expect(ROLE_PERMISSION_DEFAULTS.editor.has(Permissions.CRM_CONTACTS_WRITE)).toBe(false);
  });

  it("operator has CRM write but not knowledge write", () => {
    expect(ROLE_PERMISSION_DEFAULTS.operator.has(Permissions.CRM_CONTACTS_WRITE)).toBe(true);
    expect(ROLE_PERMISSION_DEFAULTS.operator.has(Permissions.KNOWLEDGE_WRITE)).toBe(false);
  });
});
