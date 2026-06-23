import "server-only";

import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/ai/chunk";
import { embedTexts } from "@/lib/ai/openai";

export async function ingestDocument(params: {
  documentId: string;
  organizationId: string;
  content: string;
}) {
  const supabase = await createClient();
  const chunks = chunkText(params.content);

  await supabase
    .from("knowledge_base_chunks")
    .delete()
    .eq("document_id", params.documentId);

  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);

  const rows = chunks.map((content, index) => ({
    document_id: params.documentId,
    organization_id: params.organizationId,
    content,
    embedding: JSON.stringify(embeddings[index]),
  }));

  await supabase.from("knowledge_base_chunks").insert(rows);
}
