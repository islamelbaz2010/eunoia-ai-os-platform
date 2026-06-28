# 15 — Roadmap

## Phase 1 (Complete)

Core platform — everything a single property needs to get value from AI.

- [x] Authentication (email/password)
- [x] Multi-tenant organizations with RBAC (4 roles)
- [x] Organization creation / onboarding
- [x] Team invites (token-based, 14-day expiry)
- [x] CRM (contacts, pipeline status tracking)
- [x] Knowledge Base (text ingestion, multi-language)
- [x] RAG Assistant (pgvector HNSW + GPT-4o-mini)
- [x] Audit Logs
- [x] Usage Tracking
- [x] Super Admin panel
- [x] Dashboard KPIs + charts
- [x] Security headers (CSP, HSTS, X-Frame)
- [x] Health check endpoint
- [x] PWA manifest + sitemap + robots.txt
- [x] Integration test scripts

## Phase 2 — Launch Readiness (Next Sprint)

Must-have for production launch with paying customers.

- [ ] **Email delivery for invites** (Resend or SendGrid)
- [ ] **Password reset flow** (`/forgot-password`)
- [ ] **PWA icons** (upload branded icon.png + icon-512.png)
- [ ] **Sentry error tracking** (add DSN to Vercel env)
- [ ] **Payment integration** (Stripe subscription management)
- [ ] **Usage-based billing enforcement** (check quota before allowing AI queries)
- [ ] **Email verification enforcement** (require confirmed email before dashboard access)

## Phase 3 — Product Completeness

Make the platform feature-complete for power users.

- [ ] **CRM edit/delete contacts**
- [ ] **CRM status changes** (drag-and-drop pipeline or inline dropdown)
- [ ] **KB document edit/delete/re-ingest**
- [ ] **File upload for KB** (PDF, DOCX via Supabase Storage)
- [ ] **Conversation persistence** (save RAG chat history)
- [ ] **Source citations display** (show which KB chunk answered each question)
- [ ] **Streaming RAG responses** (Next.js streaming + OpenAI stream:true)
- [ ] **Pagination** for CRM, KB, audit logs
- [ ] **Organization switcher** (multi-property management)
- [ ] **Rate limiting** on RAG queries (Upstash Redis)

## Phase 4 — Enterprise

For hotel chains and multi-property groups.

- [ ] **Multi-property dashboard** (aggregate KPIs across organizations)
- [ ] **SSO / SAML** (enterprise identity providers)
- [ ] **Custom roles / permissions** (beyond the 4-level system)
- [ ] **Data export** (CRM to CSV, audit logs to CSV)
- [ ] **Arabic UI** (RTL layout, Arabic dashboard labels)
- [ ] **API access** (REST API for integrations)
- [ ] **Webhook notifications** (integration with hotel PMS)
- [ ] **White-labeling** (custom domain per org, custom branding)

## Phase 5 — Advanced AI

Next-generation hospitality AI capabilities.

- [ ] **Multi-turn conversation** (conversation history in context)
- [ ] **Language-aware retrieval** (filter KB by document language)
- [ ] **Reranking** (BGE-reranker or Cohere Rerank API)
- [ ] **Document Q&A** (ask about a specific document directly)
- [ ] **Guest-facing chatbot** (embed on hotel website)
- [ ] **Property intelligence** (AI insights from CRM + usage data)
- [ ] **Automated guest follow-up** (AI-drafted CRM responses)
- [ ] **PMS integration** (pull reservations into CRM automatically)

## Phase 6 — Platform

Beyond single-product into an ecosystem.

- [ ] **Marketplace** (pre-built knowledge base templates for hotel categories)
- [ ] **Staff training mode** (quiz staff on policy knowledge)
- [ ] **Compliance tracking** (ensure all SOPs are up to date)
- [ ] **Analytics dashboard** (which questions are asked most, knowledge gaps)
- [ ] **Mobile app** (eunoia-ai-os-app repo becomes the mobile companion)
