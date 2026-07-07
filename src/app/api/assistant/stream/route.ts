import "server-only";

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { logUsageEvent } from "@/lib/auth/audit";
import { logger } from "@/lib/logger";
import { embedText, getOpenAIClient, CHAT_MODEL } from "@/lib/ai/openai";
import { getAiQueryRateLimit } from "@/lib/stripe/quota";

const questionSchema = z
  .string()
  .min(3, { error: "Ask a more specific question." })
  .max(500, { error: "Question must be 500 characters or fewer." })
  .transform((s) => s.trim());

const MIN_SIMILARITY = 0.3;
const RAG_RATE_LIMIT_FALLBACK = 50;
const MAX_ANSWER_TOKENS = 1024;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function encode(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = questionSchema.safeParse((body as { question?: unknown }).question);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid question." },
      { status: 400 }
    );
  }
  const question = parsed.data;

  // Auth — verifySession throws on failure; proxy has already checked the cookie
  // but we validate again here as defence-in-depth for this sensitive endpoint.
  let session: Awaited<ReturnType<typeof verifySession>>;
  let membership: Awaited<ReturnType<typeof getActiveOrganization>>;
  try {
    [session, membership] = await Promise.all([verifySession(), getActiveOrganization()]);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!membership) {
    return NextResponse.json({ error: "No active organization." }, { status: 403 });
  }

  const supabase = await createClient();
  const orgId = membership.organization.id;
  const userId = session.userId;

  // Rate limit — tier-aware, checked before any OpenAI call to contain costs.
  const rateLimit = await getAiQueryRateLimit(orgId).catch(() => RAG_RATE_LIMIT_FALLBACK);

  if (rateLimit !== null) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("actor_id", userId)
      .eq("event_type", "rag_query")
      .gte("created_at", since);

    if ((recentCount ?? 0) >= rateLimit) {
      return NextResponse.json(
        { error: `Rate limit reached. Your plan allows up to ${rateLimit} AI queries per hour. Upgrade for more.` },
        { status: 429 }
      );
    }
  }

  // Embed query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(question);
  } catch (err) {
    logger.error("[assistant/stream] Embedding error", { error: String(err) });
    return NextResponse.json(
      { error: "AI service is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }

  // Vector search
  const { data: matches, error: searchError } = await supabase.rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_org_id: orgId,
    match_count: 6,
  });

  if (searchError) {
    logger.error("[assistant/stream] match_kb_chunks error", { error: String(searchError) });
    return NextResponse.json(
      { error: "Failed to search Knowledge Base. Please try again." },
      { status: 503 }
    );
  }

  const allSources = (matches ?? []) as {
    id: string;
    document_id: string;
    content: string;
    similarity: number;
  }[];

  const sources = allSources.filter((s) => s.similarity >= MIN_SIMILARITY);

  const sourcesPayload = sources.map((s) => ({
    id: s.id,
    content: s.content,
    similarity: s.similarity,
  }));

  // No relevant sources — stream a helpful message without calling the LLM.
  if (sources.length === 0) {
    void logUsageEvent({ organizationId: orgId, actorId: userId, eventType: "rag_query" });
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encode({ type: "sources", sources: [] }));
        controller.enqueue(
          encode({
            type: "delta",
            content:
              "I couldn't find anything relevant in the Knowledge Base for your question. Try rephrasing or adding documents first.",
          })
        );
        controller.enqueue(encode({ type: "done" }));
        controller.close();
      },
    });
    return new Response(body, { headers: SSE_HEADERS });
  }

  const context = sources
    .map((source, i) => `[${i + 1}] ${source.content}`)
    .join("\n\n");

  const openai = getOpenAIClient();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send sources immediately — UI shows them before the answer starts streaming.
        controller.enqueue(encode({ type: "sources", sources: sourcesPayload }));

        const completion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          max_tokens: MAX_ANSWER_TOKENS,
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are Eunoia, an AI assistant. Answer only using the provided context. Cite sources with [1], [2], etc. If the context doesn't contain the answer, say you don't know — never invent information.",
            },
            {
              role: "user",
              content: `Context:\n${context}\n\nQuestion: ${question}`,
            },
          ],
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encode({ type: "delta", content: delta }));
          }
        }

        controller.enqueue(encode({ type: "done" }));
      } catch (err) {
        logger.error("[assistant/stream] Completion error", { error: String(err) });
        controller.enqueue(
          encode({ type: "error", message: "AI service is temporarily unavailable. Please try again." })
        );
      } finally {
        controller.close();
        // Fire-and-forget — usage logging must never fail a streaming response.
        void logUsageEvent({ organizationId: orgId, actorId: userId, eventType: "rag_query" });
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
