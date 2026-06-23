"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";
import { ingestDocument } from "@/lib/ai/ingest";

const documentSchema = z.object({
  title: z.string().min(2, { error: "Title is required." }),
  content: z.string().min(10, { error: "Content must be at least 10 characters." }),
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
    return { error: error.message };
  }

  try {
    await ingestDocument({
      documentId: data.id,
      organizationId: membership.organization.id,
      content: parsed.data.content,
    });
  } catch {
    return {
      error:
        "Document saved, but embedding generation failed. Check OPENAI_API_KEY and retry.",
    };
  }

  await Promise.all([
    logAuditEvent({
      organizationId: membership.organization.id,
      actorId: session.userId,
      action: "kb_document.created",
      targetType: "knowledge_base_document",
      targetId: data.id,
    }),
    logUsageEvent({
      organizationId: membership.organization.id,
      actorId: session.userId,
      eventType: "kb_document_created",
    }),
  ]);

  revalidatePath("/dashboard/knowledge-base");
}
