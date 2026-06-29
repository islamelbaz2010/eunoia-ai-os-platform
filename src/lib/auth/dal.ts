import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationMembership, Profile } from "@/lib/types";

export const ACTIVE_ORG_COOKIE = "eunoia-active-org";

export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const session = await verifySession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_super_admin")
    .eq("id", session.userId)
    .single();

  return data ?? null;
});

export const getMemberships = cache(async (): Promise<OrganizationMembership[]> => {
  const session = await verifySession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select(`
      id,
      role,
      organization:organizations(
        id,
        name,
        slug,
        status,
        archived_at,
        subscription_tier,
        settings,
        metadata,
        is_super_admin_org
      )
    `)
    .eq("user_id", session.userId);

  return (data ?? []) as unknown as OrganizationMembership[];
});

// Returns the user's active organization, resolving from:
//   1. The eunoia-active-org cookie (user's explicit selection)
//   2. The first membership (default for new users)
// The cookie value is validated against the user's actual memberships —
// a stale/tampered cookie value is silently ignored.
export const getActiveOrganization = cache(async (): Promise<OrganizationMembership | null> => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const savedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (savedOrgId) {
    const match = memberships.find((m) => m.organization.id === savedOrgId);
    // Only accept the cookie value if the user is still a member of that org
    // and the org is active. Archived orgs are excluded from the switcher.
    if (match && match.organization.status === "active") {
      return match;
    }
  }

  // Fall back to first active membership
  return memberships.find((m) => m.organization.status === "active") ?? memberships[0];
});

// Returns all memberships where the org is still active.
export const getActiveMemberships = cache(async (): Promise<OrganizationMembership[]> => {
  const memberships = await getMemberships();
  return memberships.filter((m) => m.organization.status === "active");
});
