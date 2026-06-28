"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";
import { hasRole } from "@/lib/types";

const contactSchema = z.object({
  fullName: z.string().min(2, { error: "Name is required." }).max(100, { error: "Name must be 100 characters or fewer." }),
  email: z.email({ error: "Enter a valid email." }).optional().or(z.literal("")),
  phone: z.string().max(30, { error: "Phone must be 30 characters or fewer." }).optional(),
  company: z.string().max(100, { error: "Company must be 100 characters or fewer." }).optional(),
});

export type ContactFormState = { error?: string } | undefined;

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return { error: "No organization found for this account." };
  }

  const parsed = contactSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      organization_id: membership.organization.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Fire-and-forget: audit/usage failures must not surface to the user.
  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.created",
    targetType: "crm_contact",
    targetId: data.id,
  });
  void logUsageEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    eventType: "crm_contact_created",
  });

  revalidatePath("/dashboard/crm");
}

export async function deleteContact(contactId: string): Promise<void> {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership || !hasRole(membership.role, "admin")) {
    throw new Error("Only admins and owners can delete contacts.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id);

  if (error) {
    throw new Error(error.message);
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.deleted",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
}
