"use server";

import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logUsageEvent } from "@/lib/auth/audit";
import { logger } from "@/lib/logger";
import { embedText, getOpenAIClient, CHAT_MODEL } from "@/lib/ai/openai";

const questionSchema = z
  .string()
  .min(3, { error: "Ask a more specific question." })
  .max(500, { error: "Question must be 500 characters or fewer." })
  .transform((s) => s.trim());

// Chunks with cosine similarity below this threshold are likely irrelevant.
// Returning them leads to hallucinated answers that reference unrelated content.
const MIN_SIMILARITY = 0.3;

// Per-user, per-org rate limit on AI queries. Keeps OpenAI costs predictable
// for early-stage orgs and prevents runaway abuse before Stripe quotas exist.
const RAG_RATE_LIMIT_PER_HOUR = 50;

// Hard cap on generated tokens — GPT-4o-mini max is 16 384; 1024 is ample for
// a hospitality FAQ answer and keeps per-query cost predictable.
const MAX_ANSWER_TOKENS = 1024;

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

  const supabase = await createClient();

  // Enforce per-user hourly rate limit before calling OpenAI.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", membership.organization.id)
    .eq("actor_id", session.userId)
    .eq("event_type", "rag_query")
    .gte("created_at", since);

  if ((recentCount ?? 0) >= RAG_RATE_LIMIT_PER_HOUR) {
    return { error: `Rate limit reached. You can ask up to ${RAG_RATE_LIMIT_PER_HOUR} questions per hour.` };
  }

  let queryEmbedding: number[];

  try {
    queryEmbedding = await embedText(parsed.data);
  } catch (err) {
    logger.error("[assistant] Embedding error", { error: String(err) });
    return { error: "AI service is temporarily unavailable. Please try again." };
  }

  const { data: matches, error } = await supabase.rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_org_id: membership.organization.id,
    match_count: 6,
  });

  if (error) {
    logger.error("[assistant] match_kb_chunks error", { error: String(error) });
    return { error: "Failed to search Knowledge Base. Please try again." };
  }

  const allSources = (matches ?? []) as {
    id: string;
    document_id: string;
    content: string;
    similarity: number;
  }[];

  // Filter out low-similarity chunks to reduce hallucinations.
  const sources = allSources.filter((s) => s.similarity >= MIN_SIMILARITY);

  if (sources.length === 0) {
    return {
      answer:
        "I couldn't find anything relevant in the Knowledge Base for your question. Try rephrasing or adding documents first.",
      sources: [],
    };
  }

  const context = sources
    .map((source, index) => `[${index + 1}] ${source.content}`)
    .join("\n\n");

  const openai = getOpenAIClient();

  let completionContent: string;
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: MAX_ANSWER_TOKENS,
      messages: [
        {
          role: "system",
          content:
            "You are Eunoia, an AI assistant for a hospitality property. Answer only using the provided context. Cite sources with [1], [2], etc. If the context doesn't contain the answer, say you don't know — never invent information.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${parsed.data}`,
        },
      ],
    });
    completionContent = completion.choices[0]?.message?.content ?? "No answer generated.";
  } catch (err) {
    logger.error("[assistant] Chat completion error", { error: String(err) });
    return { error: "AI service is temporarily unavailable. Please try again." };
  }

  // Fire-and-forget: usage logging failure must not surface to the user.
  void logUsageEvent({
    organizationId: membership.organization.id,
    actorId: session.userId,
    eventType: "rag_query",
  });

  return {
    answer: completionContent,
    sources: sources.map((s) => ({
      id: s.id,
      content: s.content,
      similarity: s.similarity,
    })),
  };
}
