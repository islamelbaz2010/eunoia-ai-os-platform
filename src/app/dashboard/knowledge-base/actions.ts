"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";
import { ingestDocument } from "@/lib/ai/ingest";
import { logger } from "@/lib/logger";
import { hasRole } from "@/lib/types";

function dbError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "A document with this title already exists.";
  return "An unexpected error occurred. Please try again.";
}

// 50 000 chars ≈ 50 KB ≈ 50 embedding chunks.
// Keeps per-document embedding cost under ~$0.001 and ingest well within
// the 60-second Vercel function timeout even on cold starts.
const MAX_CONTENT_LENGTH = 50_000;

const documentSchema = z.object({
  title: z.string().min(2, { error: "Title is required." }).max(200, { error: "Title must be 200 characters or fewer." }),
  content: z
    .string()
    .min(10, { error: "Content must be at least 10 characters." })
    .max(MAX_CONTENT_LENGTH, {
      error: `Content must be ${MAX_CONTENT_LENGTH.toLocaleString()} characters or fewer.`,
    }),
  language: z.enum(["en", "ar", "ru", "it"]),
});

export type DocumentFormState = { error?: string } | undefined;

export async function createDocument(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return { error: "No organization found for this account." };
  }

  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    language: formData.get("language"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .insert({
      organization_id: membership.organization.id,
      title: parsed.data.title,
      content: parsed.data.content,
      language: parsed.data.language,
      status: "published",
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: dbError(error) };
  }

  try {
    await ingestDocument({
      documentId: data.id,
      organizationId: membership.organization.id,
      content: parsed.data.content,
    });
  } catch (err) {
    // Embedding failed — clean up the orphaned document row so the user
    // can retry without accumulating unindexed document records.
    await supabase
      .from("knowledge_base_documents")
      .delete()
      .eq("id", data.id);

    logger.error("[ingest] Embedding failed for document", { documentId: data.id, error: String(err) });
    return {
      error: "Failed to index document for AI search. Please try again.",
    };
  }

  // Fire-and-forget: audit/usage failures must not surface to the user.
  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "kb_document.created",
    targetType: "knowledge_base_document",
    targetId: data.id,
  });
  void logUsageEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    eventType: "kb_document_created",
  });

  revalidatePath("/dashboard/knowledge-base");
}

export async function deleteDocument(documentId: string): Promise<void> {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    throw new Error("No organization found.");
  }

  const supabase = await createClient();

  // Admins and owners can delete any document.
  // Members can only delete documents they created (mirrors "creator can delete own kb documents" RLS).
  if (!hasRole(membership.role, "admin")) {
    const { data: doc } = await supabase
      .from("knowledge_base_documents")
      .select("created_by")
      .eq("id", documentId)
      .eq("organization_id", membership.organization.id)
      .single();

    if (!doc || doc.created_by !== session.userId) {
      throw new Error("You can only delete documents you created.");
    }
  }

  const { error } = await supabase
    .from("knowledge_base_documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", membership.organization.id);

  if (error) {
    throw new Error(dbError(error));
  }

  void logAuditEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    action: "kb_document.deleted",
    targetType: "knowledge_base_document",
    targetId: documentId,
  });

  revalidatePath("/dashboard/knowledge-base");
}
