"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/auth/audit";
import { AuthorizationService } from "@/lib/auth/authorization";
import { Permissions } from "@/lib/auth/permissions";
import { hasRole, type OrgRole, type OrgSettings } from "@/lib/types";
import { sendInviteEmail } from "@/lib/email";

// Translate raw Supabase error codes into safe user-facing messages.
// Never expose internal function names, table names, or schema details to clients.
function dbError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "23505": return "This record already exists.";
    case "23503": return "A required related record was not found.";
    case "PGRST202":
    case "PGRST205": return "This feature requires a pending database migration. Please contact support.";
    default:
      // Surface intentional business-logic errors from RAISE EXCEPTION in RPCs,
      // but only if they don't look like internal schema details.
      if (error.message && !error.message.includes("schema cache") && !error.message.includes("public.")) {
        return error.message;
      }
      return "An unexpected error occurred. Please try again.";
  }
}

export type SettingsFormState = { error?: string; success?: string } | undefined;

// ─── Shared authorization helpers ────────────────────────────────────────────

async function requireOrgMembership() {
  const session = await verifySession();
  const membership = await getActiveOrganization();
  if (!membership) throw new Error("No active organization.");
  return { session, membership };
}

async function requirePermission(permission: Parameters<typeof AuthorizationService.require>[1]) {
  const { session, membership } = await requireOrgMembership();
  await AuthorizationService.require(membership, permission);
  return { session, membership };
}

// ─── Invitation actions ───────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  role: z.enum(["owner", "super_admin", "admin", "manager", "operator", "editor", "member", "viewer", "guest"]),
});

export async function createInvite(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  let session, membership;
  try {
    ({ session, membership } = await requirePermission(Permissions.ORG_MEMBERS_INVITE));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const rawRole = formData.get("role") as string;

  // Only owners can invite at owner level; admins and managers can't escalate.
  if (rawRole === "owner" && membership.role !== "owner") {
    return { error: "Only owners can invite new owners." };
  }
  if (rawRole === "super_admin" && !hasRole(membership.role, "owner")) {
    return { error: "Only owners can assign the super_admin role." };
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
    if (error.code === "23505") return { error: "An invite for this email is already pending." };
    return { error: dbError(error) };
  }

  if (invite?.token) {
    // Get inviter's display name from profile only (email is in auth.users, not profiles)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://eunoiaos.com";
    void sendInviteEmail({
      to: parsed.data.email,
      inviterName: profile?.full_name ?? session.email ?? "A team member",
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

export async function revokeInvite(inviteId: string): Promise<void> {
  const { session, membership } = await requirePermission(Permissions.ORG_INVITES_REVOKE);
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

export async function resendInvite(inviteId: string): Promise<SettingsFormState> {
  const { session, membership } = await requirePermission(Permissions.ORG_MEMBERS_INVITE);
  const supabase = await createClient();

  // Rotate the token and extend expiry directly — no resend_org_invite RPC needed.
  // The RPC (migration 0009) additionally tracks resend_count/last_resent_at, which
  // are non-critical and will be added once that migration is applied.
  const newToken = randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from("organization_invites")
    .update({ token: newToken, expires_at: expiresAt })
    .eq("id", inviteId)
    .eq("organization_id", membership.organization.id)
    .eq("status", "pending")
    .select("email, role")
    .single();

  if (error || !invite) {
    return { error: "Invite not found or is no longer pending." };
  }

  if (invite) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://eunoiaos.com";
    void sendInviteEmail({
      to: invite.email,
      inviterName: profile?.full_name ?? session.email ?? "A team member",
      orgName: membership.organization.name,
      role: invite.role,
      inviteUrl: `${appUrl}/invite?token=${newToken}`,
    });
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization_invite.resent",
    targetType: "organization_invite",
    targetId: inviteId,
  });

  revalidatePath("/dashboard/settings");
  return { success: "Invite resent." };
}

// ─── Member management ────────────────────────────────────────────────────────

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<void> {
  const { session, membership } = await requirePermission(Permissions.ORG_MEMBERS_ROLES);
  const supabase = await createClient();

  if (role === "owner" && membership.role !== "owner") {
    throw new Error("Only owners can assign the owner role.");
  }
  if (role === "super_admin" && !hasRole(membership.role, "owner")) {
    throw new Error("Only owners can assign the super_admin role.");
  }

  const { data: target, error: fetchError } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id)
    .single();

  if (fetchError || !target) throw new Error("Member not found.");

  // Prevent demoting the last owner
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

export async function removeMember(memberId: string): Promise<void> {
  const { session, membership } = await requirePermission(Permissions.ORG_MEMBERS_REMOVE);
  const supabase = await createClient();

  const { data: target, error: fetchError } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("organization_id", membership.organization.id)
    .single();

  if (fetchError || !target) throw new Error("Member not found.");

  if (target.role === "owner" && membership.role !== "owner") {
    throw new Error("Only owners can remove other owners.");
  }

  if (target.user_id === session.userId) {
    throw new Error("You cannot remove yourself. Transfer ownership first.");
  }

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
    return { error: dbError(error) };
  }

  revalidatePath("/dashboard");
  return { success: "Invite accepted." };
}

// ─── Organization settings ────────────────────────────────────────────────────

const orgSettingsSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Organization name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." })
    .trim()
    .optional(),
  timezone: z.string().max(60).optional(),
  language: z.string().max(10).optional(),
  currency: z.string().max(10).optional(),
  primaryColor: z.string().max(20).optional(),
  businessType: z.string().max(50).optional(),
  country: z.string().max(10).optional(),
});

export async function updateOrgSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  let session, membership;
  try {
    ({ session, membership } = await requirePermission(Permissions.ORG_SETTINGS_WRITE));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = orgSettingsSchema.safeParse({
    name: formData.get("name") || undefined,
    timezone: formData.get("timezone") || undefined,
    language: formData.get("language") || undefined,
    currency: formData.get("currency") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    businessType: formData.get("businessType") || undefined,
    country: formData.get("country") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Build the merged settings object
  const current = (membership.organization.settings ?? {}) as OrgSettings;
  const newSettings: OrgSettings = {
    ...current,
    branding: {
      ...current.branding,
      ...(parsed.data.primaryColor !== undefined && { primaryColor: parsed.data.primaryColor }),
    },
    locale: {
      ...current.locale,
      ...(parsed.data.timezone !== undefined && { timezone: parsed.data.timezone }),
      ...(parsed.data.language !== undefined && { language: parsed.data.language }),
      ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
    },
    business: {
      ...current.business,
      ...(parsed.data.businessType !== undefined && { businessType: parsed.data.businessType }),
      ...(parsed.data.country !== undefined && { country: parsed.data.country }),
    },
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization_settings", {
    org_id: membership.organization.id,
    new_name: parsed.data.name ?? null,
    p_settings: newSettings,
    p_metadata: null,
  });

  if (error) {
    return { error: dbError(error) };
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization.settings_updated",
    targetType: "organization",
    targetId: membership.organization.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Organization settings updated." };
}

// ─── Organization lifecycle ───────────────────────────────────────────────────

export async function transferOwnership(newOwnerId: string): Promise<SettingsFormState> {
  let session, membership;
  try {
    ({ session, membership } = await requirePermission(Permissions.ORG_TRANSFER));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_org_ownership", {
    org_id: membership.organization.id,
    new_owner_id: newOwnerId,
  });

  if (error) {
    return { error: dbError(error) };
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization.ownership_transferred",
    targetType: "organization",
    targetId: membership.organization.id,
    metadata: { new_owner_id: newOwnerId },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Ownership transferred." };
}

export async function archiveOrganization(): Promise<SettingsFormState> {
  let session, membership;
  try {
    ({ session, membership } = await requirePermission(Permissions.ORG_ARCHIVE));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_organization", {
    org_id: membership.organization.id,
  });

  if (error) {
    return { error: dbError(error) };
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "organization.archived",
    targetType: "organization",
    targetId: membership.organization.id,
  });

  revalidatePath("/dashboard");
  return { success: "Organization archived." };
}
