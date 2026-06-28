# 05 — System Design

## RAG Query Sequence

```
User → [types question] → AssistantChat (client)
  │
  ├─ useTransition: startTransition(async () => {
  │
  ▼
askAssistant(question)  [Server Action]
  │
  ├─ 1. verifySession() → { userId }
  │       └── supabase.auth.getUser() [validates JWT with Supabase]
  │
  ├─ 2. getActiveOrganization() → { organization: { id, name }, role }
  │
  ├─ 3. Zod validate: 3 ≤ question.length ≤ 500
  │
  ├─ 4. embedText(question)
  │       └── OpenAI POST /v1/embeddings
  │           model: text-embedding-3-small
  │           → number[1536]
  │
  ├─ 5. supabase.rpc("match_kb_chunks", {
  │         query_embedding: JSON.stringify(vector),
  │         target_org_id: orgId,
  │         match_count: 6
  │       })
  │       └── PostgreSQL HNSW cosine search
  │           WHERE organization_id = orgId
  │           AND (is_org_member(orgId) OR is_super_admin())
  │           ORDER BY embedding <=> query_embedding
  │           LIMIT 6
  │           → [{ id, document_id, content, similarity }]
  │
  ├─ 6. Filter: similarity >= 0.3
  │       → if 0 chunks: return "couldn't find anything relevant"
  │
  ├─ 7. Build context:
  │       "[1] chunk_content\n\n[2] chunk_content\n\n..."
  │
  ├─ 8. OpenAI POST /v1/chat/completions
  │       model: gpt-4o-mini, max_tokens: 1024
  │       system: "You are Eunoia, a hospitality AI. Answer only from context. Cite [1],[2]..."
  │       user: "Context:\n{context}\n\nQuestion: {question}"
  │       → answer string
  │
  ├─ 9. void logUsageEvent("rag_query") [fire-and-forget]
  │
  └─ 10. return { answer, sources }
          │
          ▼
AssistantChat: append assistant message to messages[]
User sees answer
```

## Document Ingestion Sequence

```
User → [fills form: title, content, language] → DocumentForm (client)
  │
  ├─ useActionState → form submit
  │
  ▼
createDocument(prevState, formData)  [Server Action]
  │
  ├─ 1. verifySession() + getActiveOrganization()
  │
  ├─ 2. Zod validate: title 2–200, content 10–50000, language enum
  │
  ├─ 3. INSERT INTO knowledge_base_documents
  │       { organization_id, title, content, language, status: "published", created_by }
  │       → { id: docId }
  │
  ├─ 4. try { ingestDocument({ documentId: docId, ... }) }
  │       │
  │       ├─ a. chunkText(content)
  │       │       Sliding window: 1000 chars, 150 overlap
  │       │       → string[]
  │       │
  │       ├─ b. DELETE FROM knowledge_base_chunks
  │       │       WHERE document_id = docId
  │       │       (clears old chunks for re-ingestion idempotency)
  │       │
  │       ├─ c. if chunks.length === 0 → return early
  │       │
  │       ├─ d. embedTexts(chunks)
  │       │       Batched 512/call
  │       │       OpenAI POST /v1/embeddings (batch)
  │       │       → number[][1536]
  │       │
  │       └─ e. INSERT INTO knowledge_base_chunks
  │               [{ document_id, organization_id, content, embedding }] × N
  │
  ├─ 5. CATCH embedding error:
  │       DELETE FROM knowledge_base_documents WHERE id = docId
  │       return { error: "Failed to index document..." }
  │
  ├─ 6. void logAuditEvent("kb_document.created") [fire-and-forget]
  ├─ 7. void logUsageEvent("kb_document_created") [fire-and-forget]
  │
  └─ 8. revalidatePath("/dashboard/knowledge-base")
```

## Authentication Sequence

```
User → /login → LoginPage (client)
  │
  ├─ form submit → login(prevState, formData) [Server Action]
  │     │
  │     ├─ Zod validate: email + password ≥8
  │     │
  │     └─ supabase.auth.signInWithPassword({ email, password })
  │           │ success → session cookie set
  │           │ → redirect("/dashboard")
  │           │
  │           ▼ failure
  │         return { error: error.message }
  │
Every subsequent request:
  │
  ▼
proxy.ts → updateSession(request)
  │
  ├─ createServerClient (reads request.cookies)
  ├─ supabase.auth.getUser()  ← validates JWT
  ├─ if !user AND !publicRoute → redirect /login
  └─ return response with refreshed session cookie
```

## Organization Invite Sequence

```
Admin → Settings page → InviteForm
  │
  ├─ createInvite(prevState, formData)
  │     ├─ requireAdmin()
  │     ├─ prevent owner-invite by non-owner
  │     ├─ Zod validate email + role
  │     └─ INSERT INTO organization_invites { org_id, email, role, invited_by }
  │           expires_at = now() + 14 days
  │           token = gen_random_uuid()
  │
  │  [Manual step: admin shares /invite?token=TOKEN URL with invitee]
  │
  │
Invitee → /invite?token=TOKEN
  │
  └─ page.tsx: await verifySession()
               await supabase.rpc("accept_org_invite", { invite_token: token })
               │
               └─ accept_org_invite(token)  [DB function, SECURITY DEFINER]
                     ├─ SELECT email FROM auth.users WHERE id = auth.uid()
                     ├─ SELECT ... FROM organization_invites
                     │   WHERE token = invite_token
                     │     AND status = 'pending'
                     │     AND expires_at > now()
                     │   FOR UPDATE  ← race-condition lock
                     ├─ if email mismatch → RAISE EXCEPTION
                     ├─ INSERT INTO organization_members (org_id, user_id, role)
                     │   ON CONFLICT DO UPDATE SET role = excluded.role
                     ├─ UPDATE organization_invites SET status = 'accepted'
                     └─ RETURN organization_id
```

## Data Isolation Design

All 8 user-facing tables have `organization_id` as a foreign key. RLS policies require:
- `is_org_member(organization_id)` for reads
- `org_role(organization_id) IN ('owner','admin')` for destructive ops

This means:
- A query from user A against org A will never return org B's data (RLS filters it out)
- Cross-tenant queries are impossible even with crafted requests
- The Supabase anon key + RLS is sufficient for the application; no service role needed at runtime

## Multi-Tenancy

```
Organization A ─┬─ members: [user1(owner), user2(admin), user3(member)]
                ├─ crm_contacts (isolated)
                ├─ kb_documents (isolated)
                ├─ kb_chunks (isolated, own HNSW search space)
                ├─ audit_logs (isolated)
                ├─ usage_events (isolated)
                └─ invites (isolated)

Organization B ─┬─ members: [user4(owner)]
                └─ (completely separate data)
```

Vector search is scoped to `WHERE organization_id = target_org_id` in the `match_kb_chunks` RPC. A hotel group cannot accidentally search another hotel's knowledge base.
