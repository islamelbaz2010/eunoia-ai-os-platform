"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/auth/audit";
import { hasRole, type OrgRole } from "@/lib/types";

export type SettingsFormState = { error?: string; success?: string } | undefined;

async function requireAdmin() {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership || !hasRole(membership.role, "admin")) {
    throw new Error("You do not have permission to perform this action.");
  }

  return { session, membership };
}

const inviteSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

export async function createInvite(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  let session, membership;
  try {
    ({ session, membership } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_invites").insert({
    organization_id: membership.organization.id,
    email: parsed.data.email,
    role: parsed.data.role,
    invited_by: session.userId,
  });

  if (error) {
    return { error: error.message };
  }

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization_invite.created",
    targetType: "organization_invite",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/dashboard/settings");
  return { success: `Invite sent to ${parsed.data.email}.` };
}

export async function revokeInvite(inviteId: string) {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("organization_id", membership.organization.id);

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization_invite.revoked",
    targetType: "organization_invite",
    targetId: inviteId,
  });

  revalidatePath("/dashboard/settings");
}

export async function updateMemberRole(memberId: string, role: OrgRole) {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id);

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization_member.role_updated",
    targetType: "organization_member",
    targetId: memberId,
    metadata: { role },
  });

  revalidatePath("/dashboard/settings");
}

export async function removeMember(memberId: string) {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id);

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization_member.removed",
    targetType: "organization_member",
    targetId: memberId,
  });

  revalidatePath("/dashboard/settings");
}

export async function acceptInvite(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await verifySession();
  const token = formData.get("token");

  if (!token || typeof token !== "string") {
    return { error: "Missing invite token." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_org_invite", {
    invite_token: token,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: "Invite accepted." };
}
