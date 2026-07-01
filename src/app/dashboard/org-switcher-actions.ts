"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMemberships, verifySession, ACTIVE_ORG_COOKIE } from "@/lib/auth/dal";

export async function switchOrganization(orgId: string): Promise<void> {
  await verifySession();

  const memberships = await getMemberships();
  const match = memberships.find(
    (m) =>
      m.organization.id === orgId &&
      (m.organization.status === undefined || m.organization.status === "active")
  );

  if (!match) {
    throw new Error("You are not a member of that organization.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
