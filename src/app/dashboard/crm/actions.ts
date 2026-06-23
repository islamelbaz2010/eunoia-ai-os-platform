"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";

const contactSchema = z.object({
  fullName: z.string().min(2, { error: "Name is required." }),
  email: z.email({ error: "Enter a valid email." }).optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
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

  await Promise.all([
    logAuditEvent({
      organizationId: membership.organization.id,
      actorId: session.userId,
      action: "crm_contact.created",
      targetType: "crm_contact",
      targetId: data.id,
    }),
    logUsageEvent({
      organizationId: membership.organization.id,
      actorId: session.userId,
      eventType: "crm_contact_created",
    }),
  ]);

  revalidatePath("/dashboard/crm");
}
