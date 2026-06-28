# 25 — Future Ideas

Unscoped ideas for future exploration. Not committed to any timeline.

---

## AI / RAG

- **Streaming responses**: `openai.chat.completions.create({ stream: true })` + Next.js `ReadableStream`. Would require converting `askAssistant()` from a regular server action to a streaming Route Handler.

- **Source citations in UI**: The `AssistantResult.sources` array is already returned by the server action but `chat.tsx` discards it. Render as collapsible "Sources" section below each answer.

- **Multi-turn conversation**: Pass conversation history to GPT context. Store as `[{ role, content }]` in database. Cap at last 10 turns to manage token costs.

- **Language-aware retrieval**: Add `language text DEFAULT NULL` parameter to `match_kb_chunks` RPC. Filter `WHERE language = target_language` when provided.

- **Reranking**: After HNSW retrieves 20 candidates, use a cross-encoder (BGE-reranker via HuggingFace, or Cohere Rerank API) to select top 6. Improves answer quality for complex queries.

- **Semantic chunking**: Split documents at paragraph/heading boundaries rather than fixed character windows. Better preserves semantic units. Use regex for markdown/HTML or a proper parser.

- **Hypothetical document embedding (HyDE)**: Generate a hypothetical answer to the question, embed it, then use that embedding to search the KB. Can improve recall for questions phrased very differently from the source text.

- **Document Q&A**: Allow "ask about document X" directly, bypassing vector search and passing the full document content as context. Useful for long reference documents.

- **URL ingestion**: Accept a URL, fetch and extract text, ingest as KB document. Useful for ingesting existing web documentation.

## Product

- **Guest-facing chatbot widget**: Embed RAG assistant on hotel website. Answers guest questions 24/7. Need rate limiting + anonymous access mode.

- **Mobile app**: The `eunoia-ai-os-app` repo is currently empty. Could become a React Native app (Expo) or a Next.js PWA companion for mobile staff.

- **Staff training quizzes**: Generate multiple-choice questions from KB content. Test staff knowledge on policies and procedures.

- **Knowledge gap detection**: Analyze unanswered RAG queries (those that returned 0 relevant chunks) to identify missing documentation.

- **Arabic RTL UI**: Full right-to-left layout for Arabic-language interface. Tailwind v4 has RTL support. Would require `dir="rtl"` on html element and RTL utility classes.

- **Notification system**: Notify admins when new invites are pending, when documents need review, or when the KB hasn't been updated in 30+ days.

## Infrastructure

- **Supabase Edge Functions**: Move audit/usage logging to Edge Functions for guaranteed delivery (fire-and-forget from Next.js can still fail if the process dies).

- **Redis rate limiting**: Use Upstash Redis for per-org rate limiting on RAG queries. Prevents cost runaway and ensures fair use.

- **Webhook support**: Allow organizations to register webhooks for events (e.g., `crm_contact.created`, `rag_query`). Enables PMS integrations.

- **Background embedding queue**: Large document ingestion (>50k chars) could be offloaded to a background job (Vercel Cron, Supabase Edge Function, or a queue) to avoid function timeouts.

## Business

- **Knowledge base templates**: Pre-populated KB documents for common hospitality categories (check-in/check-out, pool safety, dining policies, COVID protocols, etc.). Accelerates time to value.

- **Multi-language onboarding**: Arabic-language signup flow and onboarding guide for Arabic-speaking hotel managers.

- **Property type customization**: Different default KB sections for "hotel" vs "diving center" vs "resort".

- **White-labeling**: Allow enterprise customers to use their own domain, logo, and color scheme.
