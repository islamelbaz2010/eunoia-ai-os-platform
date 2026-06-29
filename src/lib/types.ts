// Ordered from lowest privilege to highest.
// ROLE_RANK is the authoritative ranking — always use it for comparisons.
export type OrgRole =
  | "guest"
  | "viewer"
  | "editor"
  | "member"       // legacy — preserved for existing data
  | "operator"
  | "manager"
  | "admin"
  | "super_admin"
  | "owner";

export type OrgStatus = "active" | "archived" | "suspended";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
};

export type OrgSettings = {
  branding?: {
    primaryColor?: string;
    logoUrl?: string | null;
  };
  locale?: {
    timezone?: string;
    language?: string;
    currency?: string;
    dateFormat?: string;
    numberFormat?: string;
  };
  business?: {
    country?: string;
    businessType?: string;
    businessHours?: string | null;
  };
  ai?: {
    systemPromptPrefix?: string | null;
    ragMinSimilarity?: number;
    maxQueriesPerHour?: number;
  };
  notifications?: {
    emailOnInvite?: boolean;
    emailOnMemberRemoval?: boolean;
  };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  archived_at: string | null;
  subscription_tier: string;
  settings: OrgSettings;
  metadata: Record<string, unknown>;
  is_super_admin_org: boolean;
};

export type OrganizationMembership = {
  id: string;
  organization: Organization;
  role: OrgRole;
};

// Authoritative role ranking — higher number = more privilege.
// New roles are inserted into the hierarchy without changing existing values
// to preserve backward compatibility with all hasRole() call sites.
export const ROLE_RANK: Record<OrgRole, number> = {
  guest:       0,
  viewer:      1,
  editor:      2,
  member:      3,   // legacy: between viewer and manager
  operator:    4,
  manager:     5,
  admin:       6,
  super_admin: 7,
  owner:       8,
};

export function hasRole(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// Returns true if the role can perform admin-level operations.
// Use this for guards that should work for both admin and owner.
export function isAdminOrAbove(role: OrgRole): boolean {
  return hasRole(role, "admin");
}

// Returns true if the role is owner-only.
export function isOwner(role: OrgRole): boolean {
  return role === "owner";
}

export type Permission = {
  key: string;
  description: string;
  category: string;
};
