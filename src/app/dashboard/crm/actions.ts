"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";
import { hasRole, type CrmPipelineStage, type CrmActivityType, type CrmTimelineEventType } from "@/lib/types";

// ─── Shared error translation ─────────────────────────────────────────────────

function dbError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "A contact with this email already exists.";
  if (error.message) return error.message;
  return "An unexpected error occurred. Please try again.";
}

async function requireMembership() {
  const session = await verifySession();
  const membership = await getActiveOrganization();
  if (!membership) throw new Error("No active organization.");
  return { session, membership };
}

async function requireAdmin() {
  const { session, membership } = await requireMembership();
  if (!hasRole(membership.role, "admin")) {
    throw new Error("Only admins and owners can perform this action.");
  }
  return { session, membership };
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const phoneRegex = /^\+?[\d\s\-().]{7,30}$/;

const contactSchema = z.object({
  fullName:    z.string().min(2, { error: "Name must be at least 2 characters." }).max(100, { error: "Name must be 100 characters or fewer." }).trim(),
  email:       z.email({ error: "Enter a valid email address." }).optional().or(z.literal("")),
  phone:       z.string().regex(phoneRegex, { error: "Enter a valid phone number." }).optional().or(z.literal("")),
  company:     z.string().max(200, { error: "Company must be 200 characters or fewer." }).trim().optional().or(z.literal("")),
  website:     z.url({ error: "Enter a valid URL (include https://)." }).optional().or(z.literal("")),
  linkedinUrl: z.url({ error: "Enter a valid LinkedIn URL." }).optional().or(z.literal("")),
  notes:       z.string().max(5000, { error: "Notes must be 5000 characters or fewer." }).optional().or(z.literal("")),
  status:      z.enum(["new","contacted","qualified","won","lost"]).optional(),
  stage:       z.enum(["lead","qualified","proposal","negotiation","won","lost"]).optional(),
  ownerId:     z.string().uuid().optional().or(z.literal("")),
  source:      z.string().max(50).optional(),
});

export type ContactFormState = { error?: string; duplicates?: { id: string; full_name: string; email: string | null }[] } | undefined;

// ─── Create contact ───────────────────────────────────────────────────────────

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const session = await verifySession();
  const membership = await getActiveOrganization();
  if (!membership) return { error: "No active organization." };

  const raw = {
    fullName:    formData.get("fullName"),
    email:       formData.get("email"),
    phone:       formData.get("phone"),
    company:     formData.get("company"),
    website:     formData.get("website"),
    linkedinUrl: formData.get("linkedinUrl"),
    notes:       formData.get("notes"),
    status:      formData.get("status") || undefined,
    stage:       formData.get("stage") || undefined,
    ownerId:     formData.get("ownerId") || undefined,
    source:      formData.get("source") || "manual",
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // Duplicate detection
  const { data: dupes } = await supabase.rpc("check_crm_duplicate", {
    org_id: membership.organization.id,
    p_email: parsed.data.email || null,
    p_name: parsed.data.fullName,
    exclude_id: null,
  });

  if (dupes && dupes.length > 0 && formData.get("confirmed") !== "true") {
    return { error: "Possible duplicates found.", duplicates: dupes };
  }

  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      organization_id: membership.organization.id,
      full_name:       parsed.data.fullName,
      email:           parsed.data.email   || null,
      phone:           parsed.data.phone   || null,
      company:         parsed.data.company || null,
      website:         parsed.data.website || null,
      linkedin_url:    parsed.data.linkedinUrl || null,
      notes:           parsed.data.notes   || null,
      status:          parsed.data.status  ?? "new",
      pipeline_stage:  (parsed.data.stage ?? "lead") as CrmPipelineStage,
      owner_id:        parsed.data.ownerId || null,
      source:          parsed.data.source  ?? "manual",
      created_by:      session.userId,
    })
    .select("id")
    .single();

  if (error) return { error: dbError(error) };

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.created",
    targetType: "crm_contact",
    targetId: data.id,
    metadata: { full_name: parsed.data.fullName, source: parsed.data.source ?? "manual" },
  });
  void logUsageEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    eventType: "crm_contact_created",
  });

  revalidatePath("/dashboard/crm");
  revalidatePath("/dashboard/crm/pipeline");
}

// ─── Update contact ───────────────────────────────────────────────────────────

export async function updateContact(
  contactId: string,
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const { session, membership } = await requireMembership();

  const parsed = contactSchema.safeParse({
    fullName:    formData.get("fullName"),
    email:       formData.get("email"),
    phone:       formData.get("phone"),
    company:     formData.get("company"),
    website:     formData.get("website"),
    linkedinUrl: formData.get("linkedinUrl"),
    notes:       formData.get("notes"),
    status:      formData.get("status") || undefined,
    stage:       formData.get("stage") || undefined,
    ownerId:     formData.get("ownerId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // Duplicate detection (exclude self)
  const { data: dupes } = await supabase.rpc("check_crm_duplicate", {
    org_id: membership.organization.id,
    p_email: parsed.data.email || null,
    p_name: null,
    exclude_id: contactId,
  });

  if (dupes && dupes.length > 0 && formData.get("confirmed") !== "true") {
    return { error: "Another contact with this email already exists.", duplicates: dupes };
  }

  const { error } = await supabase
    .from("crm_contacts")
    .update({
      full_name:      parsed.data.fullName,
      email:          parsed.data.email   || null,
      phone:          parsed.data.phone   || null,
      company:        parsed.data.company || null,
      website:        parsed.data.website || null,
      linkedin_url:   parsed.data.linkedinUrl || null,
      notes:          parsed.data.notes   || null,
      status:         parsed.data.status  ?? "new",
      pipeline_stage: (parsed.data.stage ?? "lead") as CrmPipelineStage,
      owner_id:       parsed.data.ownerId || null,
    })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id)
    .is("deleted_at", null);

  if (error) return { error: dbError(error) };

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.updated",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { fields: Object.keys(parsed.data) },
  });

  revalidatePath("/dashboard/crm");
  revalidatePath("/dashboard/crm/pipeline");
  revalidatePath(`/dashboard/crm/${contactId}`);
}

// ─── Update pipeline stage (drag-and-drop) ────────────────────────────────────

export async function updateContactStage(contactId: string, stage: CrmPipelineStage): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_contacts")
    .update({ pipeline_stage: stage })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id)
    .is("deleted_at", null);

  if (error) throw new Error(dbError(error));

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.stage_changed",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { stage },
  });

  revalidatePath("/dashboard/crm");
  revalidatePath("/dashboard/crm/pipeline");
  revalidatePath(`/dashboard/crm/${contactId}`);
}

// ─── Soft delete / restore ────────────────────────────────────────────────────

export async function softDeleteContact(contactId: string): Promise<void> {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("crm_contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id)
    .is("deleted_at", null);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.soft_deleted",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
}

export async function restoreContact(contactId: string): Promise<void> {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("crm_contacts")
    .update({ deleted_at: null })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.restored",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
}

export async function hardDeleteContact(contactId: string): Promise<void> {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id);

  if (error) throw new Error(dbError(error));

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.permanently_deleted",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
  redirect("/dashboard/crm");
}

// For backward compat, the old deleteContact now routes to softDelete for admins
export async function deleteContact(contactId: string): Promise<void> {
  return softDeleteContact(contactId);
}

// ─── Archive / restore from archive ──────────────────────────────────────────

export async function archiveContact(contactId: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_contacts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id)
    .is("deleted_at", null);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.archived",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
  revalidatePath(`/dashboard/crm/${contactId}`);
}

export async function unarchiveContact(contactId: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_contacts")
    .update({ archived_at: null })
    .eq("id", contactId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.unarchived",
    targetType: "crm_contact",
    targetId: contactId,
  });

  revalidatePath("/dashboard/crm");
  revalidatePath(`/dashboard/crm/${contactId}`);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

const tagSchema = z.object({
  name:  z.string().min(1, { error: "Tag name is required." }).max(40, { error: "Tag name must be 40 characters or fewer." }).trim(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, { error: "Enter a valid hex color." }).optional(),
});

export type TagFormState = { error?: string } | undefined;

export async function createTag(
  _prevState: TagFormState,
  formData: FormData
): Promise<TagFormState> {
  const { session, membership } = await requireMembership();

  const parsed = tagSchema.safeParse({
    name:  formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tags")
    .insert({
      organization_id: membership.organization.id,
      name:            parsed.data.name,
      color:           parsed.data.color ?? "#6366f1",
      created_by:      session.userId,
    });

  if (error) {
    if (error.code === "23505") return { error: "A tag with this name already exists." };
    return { error: dbError(error) };
  }

  revalidatePath("/dashboard/crm");
  return undefined;
}

export async function assignTag(contactId: string, tagId: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_contact_tags")
    .insert({ contact_id: contactId, tag_id: tagId, assigned_by: session.userId });

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.tag_assigned",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { tag_id: tagId },
  });

  revalidatePath(`/dashboard/crm/${contactId}`);
}

export async function removeTag(contactId: string, tagId: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("tag_id", tagId);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_contact.tag_removed",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { tag_id: tagId },
  });

  revalidatePath(`/dashboard/crm/${contactId}`);
}

export async function deleteTag(tagId: string): Promise<void> {
  const { session, membership } = await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("crm_tags")
    .delete()
    .eq("id", tagId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_tag.deleted",
    targetType: "crm_tag",
    targetId: tagId,
  });

  revalidatePath("/dashboard/crm");
}

// ─── Timeline events ──────────────────────────────────────────────────────────

const timelineSchema = z.object({
  eventType: z.enum(["note","call","meeting","email","whatsapp","system"]),
  title:     z.string().min(1, { error: "Title is required." }).max(200, { error: "Title must be 200 characters or fewer." }).trim(),
  body:      z.string().max(10000, { error: "Body must be 10 000 characters or fewer." }).optional().or(z.literal("")),
});

export type TimelineFormState = { error?: string } | undefined;

export async function createTimelineEvent(
  contactId: string,
  _prevState: TimelineFormState,
  formData: FormData
): Promise<TimelineFormState> {
  const { session, membership } = await requireMembership();

  const parsed = timelineSchema.safeParse({
    eventType: formData.get("eventType"),
    title:     formData.get("title"),
    body:      formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_timeline_events")
    .insert({
      organization_id: membership.organization.id,
      contact_id:      contactId,
      event_type:      parsed.data.eventType as CrmTimelineEventType,
      title:           parsed.data.title,
      body:            parsed.data.body || null,
      created_by:      session.userId,
    });

  if (error) return { error: dbError(error) };

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_timeline.event_created",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { event_type: parsed.data.eventType },
  });

  revalidatePath(`/dashboard/crm/${contactId}`);
}

export async function deleteTimelineEvent(contactId: string, eventId: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_timeline_events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_timeline.event_deleted",
    targetType: "crm_contact",
    targetId: contactId,
    metadata: { event_id: eventId },
  });

  revalidatePath(`/dashboard/crm/${contactId}`);
}

// ─── Activities ───────────────────────────────────────────────────────────────

const activitySchema = z.object({
  type:      z.enum(["task","follow_up","call","meeting","email"]),
  title:     z.string().min(1, { error: "Title is required." }).max(200, { error: "Title must be 200 characters or fewer." }).trim(),
  dueAt:     z.preprocess(
    (v): unknown => {
      if (!v || v === "") return undefined;
      const s = String(v as string);
      // datetime-local produces "YYYY-MM-DDTHH:mm" without timezone — append UTC offset
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00.000Z`;
      return s;
    },
    z.string().datetime({ offset: true }).optional()
  ),
  ownerId:   z.string().uuid().optional().or(z.literal("")),
  contactId: z.string().uuid().optional().or(z.literal("")),
});

export type ActivityFormState = { error?: string } | undefined;

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const { session, membership } = await requireMembership();

  const parsed = activitySchema.safeParse({
    type:      formData.get("type"),
    title:     formData.get("title"),
    dueAt:     formData.get("dueAt") || undefined,
    ownerId:   formData.get("ownerId") || undefined,
    contactId: formData.get("contactId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_activities")
    .insert({
      organization_id: membership.organization.id,
      contact_id:      parsed.data.contactId || null,
      type:            parsed.data.type as CrmActivityType,
      title:           parsed.data.title,
      due_at:          parsed.data.dueAt || null,
      owner_id:        parsed.data.ownerId || session.userId,
      created_by:      session.userId,
    });

  if (error) return { error: dbError(error) };

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_activity.created",
    targetType: "crm_contact",
    targetId: parsed.data.contactId || membership.organization.id,
    metadata: { type: parsed.data.type },
  });

  revalidatePath("/dashboard/crm/activities");
  if (parsed.data.contactId) revalidatePath(`/dashboard/crm/${parsed.data.contactId}`);
  return undefined;
}

export async function completeActivity(activityId: string, contactId?: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_activities")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", activityId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_activity.completed",
    targetType: "crm_activity",
    targetId: activityId,
  });

  revalidatePath("/dashboard/crm/activities");
  if (contactId) revalidatePath(`/dashboard/crm/${contactId}`);
}

export async function deleteActivity(activityId: string, contactId?: string): Promise<void> {
  const { session, membership } = await requireMembership();
  const supabase = await createClient();

  await supabase
    .from("crm_activities")
    .delete()
    .eq("id", activityId)
    .eq("organization_id", membership.organization.id);

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "crm_activity.deleted",
    targetType: "crm_activity",
    targetId: activityId,
  });

  revalidatePath("/dashboard/crm/activities");
  if (contactId) revalidatePath(`/dashboard/crm/${contactId}`);
}
