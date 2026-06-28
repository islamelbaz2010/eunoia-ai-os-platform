import "server-only";

import OpenAI from "openai";
import { env } from "@/lib/env";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";

// OpenAI text-embedding-3-small supports up to 2048 inputs per batch.
const EMBED_BATCH_SIZE = 512;

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
  }
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAIClient();

  // Batch to stay well under the 2048-input API limit.
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    results.push(...response.data.map((d) => d.embedding));
  }
  return results;
}
