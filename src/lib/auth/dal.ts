import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, Organization, Profile } from "@/lib/types";

export const ACTIVE_ORG_COOKIE = "eunoia_active_org";

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

export const getMemberships = cache(async () => {
  const session = await verifySession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(id, name, slug, is_super_admin_org)")
    .eq("user_id", session.userId);

  return (data ?? []) as unknown as {
    role: OrgRole;
    organization: Organization;
  }[];
});

export const getActiveOrganization = cache(async () => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const match = activeId
    ? memberships.find((m) => m.organization.id === activeId)
    : undefined;

  return match ?? memberships[0];
});
