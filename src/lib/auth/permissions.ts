// Permission key registry — single source of truth for all permission strings.
// These keys mirror the `permissions` table seeded in migration 0009.
// Add new permissions in a new migration; update this file in the same PR.

export const Permissions = {
  // ── CRM ────────────────────────────────────────────────────────────────────
  CRM_CONTACTS_READ:    "crm.contacts.read",
  CRM_CONTACTS_WRITE:   "crm.contacts.write",
  CRM_CONTACTS_DELETE:  "crm.contacts.delete",
  CRM_CONTACTS_EXPORT:  "crm.contacts.export",

  // ── Knowledge Base ─────────────────────────────────────────────────────────
  KNOWLEDGE_READ:   "knowledge.documents.read",
  KNOWLEDGE_WRITE:  "knowledge.documents.write",
  KNOWLEDGE_DELETE: "knowledge.documents.delete",

  // ── AI Assistant ───────────────────────────────────────────────────────────
  ASSISTANT_QUERY: "assistant.query",

  // ── Organization ───────────────────────────────────────────────────────────
  ORG_SETTINGS_READ:   "org.settings.read",
  ORG_SETTINGS_WRITE:  "org.settings.write",
  ORG_MEMBERS_READ:    "org.members.read",
  ORG_MEMBERS_INVITE:  "org.members.invite",
  ORG_MEMBERS_REMOVE:  "org.members.remove",
  ORG_MEMBERS_ROLES:   "org.members.roles",
  ORG_INVITES_READ:    "org.invites.read",
  ORG_INVITES_REVOKE:  "org.invites.revoke",
  ORG_ARCHIVE:         "org.archive",
  ORG_TRANSFER:        "org.transfer",

  // ── Billing ────────────────────────────────────────────────────────────────
  BILLING_READ:   "billing.read",
  BILLING_MANAGE: "billing.manage",

  // ── Reporting ──────────────────────────────────────────────────────────────
  AUDIT_READ: "audit.read",
  USAGE_READ:  "usage.read",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// Local permission registry: mirrors the DB seed in migration 0009.
// Used by the AuthorizationService as a performance cache — the DB is the
// authoritative source, this is only consulted for the default role grants.
// Member-level overrides ALWAYS require a DB read.
import type { OrgRole } from "@/lib/types";

export const ROLE_PERMISSION_DEFAULTS: Record<OrgRole, ReadonlySet<PermissionKey>> = {
  owner: new Set(Object.values(Permissions) as PermissionKey[]),

  super_admin: new Set([
    Permissions.CRM_CONTACTS_READ,    Permissions.CRM_CONTACTS_WRITE,
    Permissions.CRM_CONTACTS_DELETE,  Permissions.CRM_CONTACTS_EXPORT,
    Permissions.KNOWLEDGE_READ,       Permissions.KNOWLEDGE_WRITE,
    Permissions.KNOWLEDGE_DELETE,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_SETTINGS_READ,    Permissions.ORG_SETTINGS_WRITE,
    Permissions.ORG_MEMBERS_READ,     Permissions.ORG_MEMBERS_INVITE,
    Permissions.ORG_MEMBERS_REMOVE,   Permissions.ORG_MEMBERS_ROLES,
    Permissions.ORG_INVITES_READ,     Permissions.ORG_INVITES_REVOKE,
    Permissions.BILLING_READ,
    Permissions.AUDIT_READ,           Permissions.USAGE_READ,
  ] as PermissionKey[]),

  admin: new Set([
    Permissions.CRM_CONTACTS_READ,    Permissions.CRM_CONTACTS_WRITE,
    Permissions.CRM_CONTACTS_DELETE,  Permissions.CRM_CONTACTS_EXPORT,
    Permissions.KNOWLEDGE_READ,       Permissions.KNOWLEDGE_WRITE,
    Permissions.KNOWLEDGE_DELETE,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_SETTINGS_READ,    Permissions.ORG_SETTINGS_WRITE,
    Permissions.ORG_MEMBERS_READ,     Permissions.ORG_MEMBERS_INVITE,
    Permissions.ORG_MEMBERS_REMOVE,   Permissions.ORG_MEMBERS_ROLES,
    Permissions.ORG_INVITES_READ,     Permissions.ORG_INVITES_REVOKE,
    Permissions.AUDIT_READ,           Permissions.USAGE_READ,
  ] as PermissionKey[]),

  manager: new Set([
    Permissions.CRM_CONTACTS_READ,    Permissions.CRM_CONTACTS_WRITE,
    Permissions.CRM_CONTACTS_DELETE,  Permissions.CRM_CONTACTS_EXPORT,
    Permissions.KNOWLEDGE_READ,       Permissions.KNOWLEDGE_WRITE,
    Permissions.KNOWLEDGE_DELETE,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_SETTINGS_READ,
    Permissions.ORG_MEMBERS_READ,     Permissions.ORG_MEMBERS_INVITE,
    Permissions.ORG_INVITES_READ,     Permissions.ORG_INVITES_REVOKE,
    Permissions.AUDIT_READ,           Permissions.USAGE_READ,
  ] as PermissionKey[]),

  operator: new Set([
    Permissions.CRM_CONTACTS_READ, Permissions.CRM_CONTACTS_WRITE,
    Permissions.KNOWLEDGE_READ,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_MEMBERS_READ,
  ] as PermissionKey[]),

  editor: new Set([
    Permissions.KNOWLEDGE_READ, Permissions.KNOWLEDGE_WRITE,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_MEMBERS_READ,
  ] as PermissionKey[]),

  member: new Set([
    // legacy role — same grants as before the permission system was introduced
    Permissions.CRM_CONTACTS_READ,  Permissions.CRM_CONTACTS_WRITE,
    Permissions.KNOWLEDGE_READ,     Permissions.KNOWLEDGE_WRITE,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_MEMBERS_READ,
  ] as PermissionKey[]),

  viewer: new Set([
    Permissions.CRM_CONTACTS_READ,
    Permissions.KNOWLEDGE_READ,
    Permissions.ASSISTANT_QUERY,
    Permissions.ORG_MEMBERS_READ,
    Permissions.AUDIT_READ,
    Permissions.USAGE_READ,
  ] as PermissionKey[]),

  guest: new Set([
    Permissions.ASSISTANT_QUERY,
  ] as PermissionKey[]),
};
