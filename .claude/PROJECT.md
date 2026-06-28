# PROJECT — Eunoia AI OS

## Product

**Eunoia AI OS** is a multi-tenant SaaS AI operating system for the MENA hospitality industry.

**Target market**: Hotels, resorts, and diving centers in Egypt (Red Sea), UAE, and Saudi Arabia.  
**Beachhead**: Egyptian diving centers (Hurghada, Sharm El-Sheikh).  
**Domain**: https://eunoiaos.com  
**Languages**: English, Arabic, Russian, Italian (documents and interface).

**Core value**: A hotel manager uploads policies, SOPs, and guest FAQs. Staff ask questions in any language. They get cited, accurate answers from the hotel's own documents — not hallucinations.

---

## Revenue Model

| Tier | Users | RAG Queries/Month | Price |
|------|-------|------------------|-------|
| Starter | 5 | 100 | $99/month |
| Professional | 25 | 1,000 | $299/month |
| Enterprise | Unlimited | Unlimited | $499+/month |

**Unit economics**: Infra cost ~$5-10/customer/month → ~95% gross margin at scale.

---

## Tech Stack (Verified from Source)

| Layer | Technology | Version | Breaking Changes |
|-------|-----------|---------|-----------------|
| Framework | Next.js | **16.2.9** | Middleware → Proxy; `proxy.ts` at root |
| UI | React | **19.2.4** | `useActionState` not `useFormState` |
| Language | TypeScript | `^5` | Strict mode |
| Database | Supabase (PostgreSQL + Auth + pgvector) | — | — |
| Supabase SDK | @supabase/supabase-js | `^2.108.2` | — |
| Supabase SSR | @supabase/ssr | `^0.12.0` | — |
| AI Embeddings | OpenAI text-embedding-3-small | 1536 dims | — |
| AI Chat | OpenAI gpt-4o-mini | — | — |
| OpenAI SDK | openai | `^6.44.0` | — |
| CSS | Tailwind CSS | **v4** | `@import "tailwindcss"` syntax |
| Icons | lucide-react | `^1.21.0` | — |
| Charts | recharts | `^3.8.1` | — |
| Validation | Zod | **v4.4.3** | `.issues[0]?.message` not `.errors` |
| Testing | Vitest | `^4.1.9` | — |
| Email | Resend | `^6.16.0` | — |
| Deployment | Vercel | — | Pro plan required (60s timeout) |
| Node | 20+ | — | `.nvmrc` pins to 20 |

---

## Architecture

```
BROWSER
  └── Client Components (React 19): forms, charts, chat, nav
          │ HTTPS
VERCEL EDGE
  └── proxy.ts — Next.js 16 Proxy (formerly Middleware)
      ├── Public routes: /, /login, /signup, /auth/callback, /auth/forgot-password, /api/health
      ├── Unauthenticated → redirect /login
      └── Authenticated on /login or /signup → redirect /dashboard
          │
VERCEL FUNCTIONS (Next.js App Router)
  ├── Server Components — render pages, fetch data from DAL
  ├── Server Actions — all mutations (Zod → auth → org → DB)
  └── Route Handlers — /api/health, /auth/callback
          │
    SUPABASE                          OPENAI API
    ├── PostgreSQL (9 tables)          ├── text-embedding-3-small
    ├── GoTrue Auth (JWT + cookies)    │   (1536 dims, batches of 512)
    ├── pgvector HNSW                  └── gpt-4o-mini
    └── Row Level Security (ALL tables)    (max 1024 tokens)
```

---

## Database: 9 Tables + 8 PostgreSQL Functions

**Tables**: `organizations`, `profiles`, `organization_members`, `crm_contacts`, `knowledge_base_documents`, `knowledge_base_chunks`, `audit_logs`, `usage_events`, `organization_invites`

**Enums**: `org_role` (owner/admin/member/viewer), `kb_status` (draft/published/archived), `crm_lead_status` (new/contacted/qualified/won/lost), `invite_status` (pending/accepted/revoked/expired)

**RPCs**: `is_org_member`, `org_role`, `is_super_admin`, `match_kb_chunks`, `accept_org_invite`, `create_organization`, `get_usage_totals`, `handle_new_user` (trigger), `set_updated_at` (trigger)

**Migrations**: 7 files (`0001_init.sql` → `0007_get_usage_totals.sql`). Apply all in order.

---

## RBAC

| Role | Rank | Can Do |
|------|------|--------|
| `viewer` | 0 | Read all org data |
| `member` | 1 | Read + create CRM contacts, KB documents |
| `admin` | 2 | Member + invite/remove members, delete CRM/KB, change roles |
| `owner` | 3 | Admin + assign owner role; last owner protection |

```typescript
// src/lib/types.ts
export const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 }
export function hasRole(role: OrgRole, minimum: OrgRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}
```

---

## AI Pipeline

**Document ingestion**:
```
User submits (title + text + language)
→ INSERT knowledge_base_documents
→ chunkText() [1000 chars, 150 overlap]
→ embedTexts() in batches of 512 [text-embedding-3-small]
→ INSERT knowledge_base_chunks (document_id, org_id, content, embedding vector(1536))
```

**RAG query**:
```
User asks question
→ Rate limit check (50/user/hour via usage_events)
→ embedText(question)
→ match_kb_chunks() HNSW search [cosine, top 6]
→ Filter similarity ≥ 0.3
→ gpt-4o-mini [system prompt + context + question, max 1024 tokens]
→ Return {answer, sources[]}
→ void logUsageEvent("rag_query")
```

---

## Key Constants

| Constant | Value | File |
|----------|-------|------|
| `CHUNK_SIZE` | 1000 chars | `src/lib/ai/chunk.ts` |
| `CHUNK_OVERLAP` | 150 chars | `src/lib/ai/chunk.ts` |
| `EMBED_BATCH_SIZE` | 512 | `src/lib/ai/openai.ts` |
| `MIN_SIMILARITY` | 0.3 (cosine) | `src/app/dashboard/assistant/actions.ts` |
| `MAX_ANSWER_TOKENS` | 1024 | `src/app/dashboard/assistant/actions.ts` |
| `RAG_RATE_LIMIT_PER_HOUR` | 50 | `src/app/dashboard/assistant/actions.ts` |
| `MAX_CONTENT_LENGTH` | 50,000 chars | `src/app/dashboard/knowledge-base/actions.ts` |

---

## File Structure (Key Files)

```
proxy.ts                                   # Next.js 16 Proxy (route protection)
next.config.ts                             # Security headers, Turbopack
src/
  app/
    layout.tsx                             # Root layout, SEO, fonts
    error.tsx                              # Global error boundary
    manifest.ts                            # PWA manifest
    sitemap.ts                             # XML sitemap
    login/page.tsx                         # Login form [CLIENT]
    signup/page.tsx                        # Signup form [CLIENT]
    auth/
      callback/route.ts                    # PKCE code exchange
      forgot-password/page.tsx             # Password reset request [CLIENT]
      update-password/page.tsx             # Password reset form [CLIENT]
    onboarding/
      page.tsx                             # Org creation
      actions.ts                           # createOrganization()
    invite/page.tsx                        # Invite acceptance [SERVER]
    api/
      health/route.ts                      # Health check (public)
    dashboard/
      layout.tsx                           # Dashboard shell, auth guard
      page.tsx                             # KPI overview + charts
      crm/
        page.tsx                           # Contact list [SERVER]
        contact-form.tsx                   # Create contact [CLIENT]
        contact-row.tsx                    # Delete contact [CLIENT]
        actions.ts                         # createContact, deleteContact
      knowledge-base/
        page.tsx                           # Document list [SERVER]
        document-form.tsx                  # Add document [CLIENT]
        document-row.tsx                   # Delete document [CLIENT]
        actions.ts                         # createDocument, deleteDocument
      assistant/
        page.tsx                           # Chat page [SERVER wrapper]
        chat.tsx                           # RAG chat + SourcesPanel [CLIENT]
        actions.ts                         # askAssistant() [SERVER]
        loading.tsx
      settings/
        page.tsx                           # Team management [SERVER]
        actions.ts                         # createInvite, revokeInvite, updateMemberRole, removeMember
        invite-form.tsx                    # [CLIENT]
        invite-row.tsx                     # [CLIENT]
        member-row.tsx                     # [CLIENT]
      admin/
        page.tsx                           # Super admin — all orgs [SERVER]
  lib/
    ai/
      openai.ts                            # [SERVER-ONLY] OpenAI client, embedText, embedTexts
      chunk.ts                             # chunkText() — pure function
      ingest.ts                            # [SERVER-ONLY] ingestDocument()
      chunk.test.ts                        # 6 unit tests
    auth/
      dal.ts                               # [SERVER-ONLY] verifySession, getProfile, getActiveOrganization
      actions.ts                           # login, signup, logout, requestPasswordReset, updatePassword
      audit.ts                             # [SERVER-ONLY] logAuditEvent, logUsageEvent
    supabase/
      client.ts                            # Browser Supabase client
      server.ts                            # [SERVER-ONLY] Server Supabase client
      proxy.ts                             # updateSession() for proxy.ts
    email.ts                               # [SERVER-ONLY] sendInviteEmail() via Resend
    env.ts                                 # [SERVER-ONLY] Validated env vars
    logger.ts                              # Structured JSON logger
    types.ts                               # Shared TS types, hasRole(), ROLE_RANK
    utils.ts                               # slugify()
    types.test.ts                          # 17 unit tests
    utils.test.ts                          # 6 unit tests
supabase/migrations/
  0001_init.sql                            # All tables, enums, RLS, triggers
  0002_rag_invites.sql                     # HNSW index, match_kb_chunks, invites
  0003_grants.sql                          # GRANT statements
  0004_indexes_policies.sql               # Performance indexes, KB UPDATE/DELETE policies
  0005_schema_hardening.sql               # FK fixes, create_organization RPC
  0006_hardening_v2.sql                   # Race fix, NOT NULL embedding, role index
  0007_get_usage_totals.sql               # SQL GROUP BY RPC for usage page
```
