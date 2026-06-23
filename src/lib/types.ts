export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  is_super_admin_org: boolean;
};

export type OrganizationMembership = {
  organization: Organization;
  role: OrgRole;
};

export const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasRole(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
