"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/auth/audit";
import { hasRole, type OrgRole } from "@/lib/types";
import { sendInviteEmail } from "@/lib/email";

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

  // Admins cannot invite at a role equal to or higher than their own.
  const rawRole = formData.get("role") as string;
  if (rawRole === "owner" && membership.role !== "owner") {
    return { error: "Only owners can invite new owners." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: rawRole,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: invite, error } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: membership.organization.id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: session.userId,
    })
    .select("token")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Best-effort — email send failures must not block the response.
  if (invite?.token) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.userId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://eunoiaos.com";
    void sendInviteEmail({
      to: parsed.data.email,
      inviterName: profile?.full_name ?? profile?.email ?? "A team member",
      orgName: membership.organization.name,
      role: parsed.data.role,
      inviteUrl: `${appUrl}/invite?token=${invite.token}`,
    });
  }

  void logAuditEvent({
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

  void logAuditEvent({
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

  // Only owners can assign the owner role.
  if (role === "owner" && membership.role !== "owner") {
    throw new Error("Only owners can assign the owner role.");
  }

  // Fetch the target member's current role.
  const { data: target, error: fetchError } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id)
    .single();

  if (fetchError || !target) {
    throw new Error("Member not found.");
  }

  // Prevent demoting the last owner.
  if (target.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization.id)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      throw new Error("Cannot change the role of the last owner.");
    }
  }

  await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
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

  // Fetch the target member.
  const { data: target, error: fetchError } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id)
    .single();

  if (fetchError || !target) {
    throw new Error("Member not found.");
  }

  // Prevent removing an owner unless the caller is also an owner.
  if (target.role === "owner" && membership.role !== "owner") {
    throw new Error("Only owners can remove other owners.");
  }

  // Prevent self-removal (must use account deletion or ownership transfer).
  if (target.user_id === session.userId) {
    throw new Error("You cannot remove yourself. Transfer ownership first.");
  }

  // Prevent removing the last owner.
  if (target.role === "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization.id)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      throw new Error("Cannot remove the last owner of an organization.");
    }
  }

  await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
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
