"use server";

import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logUsageEvent } from "@/lib/auth/audit";
import { embedText, getOpenAIClient, CHAT_MODEL } from "@/lib/ai/openai";

const questionSchema = z.string().min(3, { error: "Ask a more specific question." });

export type AssistantResult = {
  answer?: string;
  sources?: { id: string; content: string; similarity: number }[];
  error?: string;
};

export async function askAssistant(question: string): Promise<AssistantResult> {
  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return { error: "No organization found for this account." };
  }

  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid question." };
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(parsed.data);
  } catch {
    return { error: "Embedding generation failed. Check OPENAI_API_KEY." };
  }

  const supabase = await createClient();
  const { data: matches, error } = await supabase.rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_org_id: membership.organization.id,
    match_count: 6,
  });

  if (error) {
    return { error: error.message };
  }

  const sources = (matches ?? []) as {
    id: string;
    document_id: string;
    content: string;
    similarity: number;
  }[];

  if (sources.length === 0) {
    return {
      answer:
        "I couldn't find anything relevant in the Knowledge Base yet. Try adding documents first.",
      sources: [],
    };
  }

  const context = sources
    .map((source, index) => `[${index + 1}] ${source.content}`)
    .join("\n\n");

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are Eunoia, an AI assistant for a hospitality property. Answer only using the provided context. Cite sources with [1], [2], etc. If the context doesn't contain the answer, say you don't know.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${parsed.data}`,
      },
    ],
  });

  await logUsageEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    eventType: "rag_query",
  });

  return {
    answer: completion.choices[0]?.message?.content ?? "No answer generated.",
    sources: sources.map((s) => ({
      id: s.id,
      content: s.content,
      similarity: s.similarity,
    })),
  };
}
