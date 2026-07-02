import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationMembership, Profile } from "@/lib/types";

export const ACTIVE_ORG_COOKIE = "eunoia-active-org";

export const verifySession = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    return { userId: user.id, email: user.email };
  } catch (e) {
    // Re-throw Next.js redirect/not-found signals — those are control flow, not errors.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NEXT_REDIRECT" || msg === "NEXT_NOT_FOUND") throw e;
    // Any other error (Supabase unreachable, bad credentials): redirect to login.
    redirect("/login");
  }
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
//   2. The first active membership (default for new users)
// The cookie value is validated against the user's actual memberships —
// a stale/tampered cookie value is silently ignored.
export const getActiveOrganization = cache(async (): Promise<OrganizationMembership | null> => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const savedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (savedOrgId) {
    const match = memberships.find((m) => m.organization.id === savedOrgId);
    if (match && match.organization.status === "active") {
      return match;
    }
  }

  return memberships.find((m) => m.organization.status === "active") ?? null;
});

export const getActiveMemberships = cache(async (): Promise<OrganizationMembership[]> => {
  const memberships = await getMemberships();
  return memberships.filter((m) => m.organization.status === "active");
});
