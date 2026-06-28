# ROADMAP

**Product**: Eunoia AI OS  
**Target**: First paying customer as fast as possible.

---

## PHASE 1 — Foundation ✅ COMPLETE

**Goal**: Core SaaS platform working end-to-end.  
**Completed**: 2026-06-28

| Feature | Status |
|---------|--------|
| Auth (signup/login/logout) | ✅ |
| Onboarding (org creation) | ✅ |
| CRM (create + list contacts) | ✅ |
| Knowledge Base (add + ingest docs) | ✅ |
| RAG Assistant (full pipeline) | ✅ |
| Team invites + RBAC (4 roles) | ✅ |
| Audit logs | ✅ |
| Usage tracking | ✅ |
| Super admin panel | ✅ |
| Security headers + RLS | ✅ |
| Health check API | ✅ |
| 29-test suite | ✅ |

---

## PHASE 2 — Launch Readiness 🚧 IN PROGRESS

**Goal**: Commercially deployable — safe to accept payment.  
**Target**: ~2 weeks from 2026-06-29  
**Current completion**: 75%

| Feature | Status | Effort Left |
|---------|--------|-------------|
| Password reset | ✅ Done | — |
| Email invites (Resend) | ✅ Done | — |
| RAG rate limiting | ✅ Done | — |
| Source citations in chat | ✅ Done | — |
| CRM delete | ✅ Done | — |
| KB delete | ✅ Done | — |
| Usage page O(N) fix | ✅ Done | — |
| GitHub Actions CI | ✅ Done | — |
| Sentry error monitoring | ❌ | 4 hours |
| All untracked files committed | ❌ | 30 min |
| Migration 0007 applied in Supabase | ❌ | 5 min manual |
| RESEND_API_KEY in Vercel | ❌ | 5 min manual |
| CRM edit contact | ❌ | 4 hours |
| KB edit document + re-ingest | ❌ | 6 hours |
| Org switcher | ❌ | 1 day |

---

## PHASE 3 — Product Completeness

**Goal**: Feature-complete for hospitality use case.  
**Target**: ~6 weeks from Phase 2 complete

| Feature | Priority |
|---------|----------|
| Stripe billing + subscription tiers | Critical for revenue |
| Usage quota enforcement per tier | Critical for unit economics |
| Streaming RAG responses | High — eliminates 5s wait |
| Chat history persistence | High — core UX |
| Cursor-based pagination | Medium — prevents silent truncation |
| PDF/DOCX document upload | Medium — avoids text paste |
| Arabic RTL UI | Medium — MENA market |
| CRM contact notes | Low |

---

## PHASE 4 — Enterprise

**Goal**: Win first hotel group / multi-property account.  
**Target**: ~3 months from Phase 3

- Multi-property aggregate dashboard
- SSO / SAML
- Data export (CSV/Excel)
- REST API for PMS integrations (Opera, Protel)
- White-labeling (custom domain per org)
- SLA documentation

---

## PHASE 5 — Advanced AI

**Goal**: Differentiated AI capabilities vs generic tools.

- Multi-turn conversation memory
- Language-aware retrieval (Arabic-specific vector index)
- Cross-encoder reranking
- Guest-facing embedded chatbot widget
- PMS integration (auto-pull reservations to CRM)
- Voice input (hospitality use case: hands-free)

---

## PHASE 6 — Platform

**Goal**: Marketplace and ecosystem.

- Knowledge base template marketplace (diving safety, halal, hotel SOPs)
- Staff training / quiz mode
- Mobile companion app (`eunoia-ai-os-app` repo)
- Third-party module SDK

---

## TIMELINE TO FIRST PAYING CUSTOMER

```
Now (2026-06-29)
  ↓ ~1 week
Beta launch (free, invite-only)
  Requirements: Sentry + committed files + RESEND_API_KEY + 0007 applied
  ↓ ~2 more weeks
Paid launch (Starter $99/mo)
  Requirements: Stripe + quota enforcement + edit operations
  ↓ ~1 month
Professional tier ($299/mo)
  Requirements: pagination + streaming + org switcher
```

---

## COMMERCIAL READINESS MILESTONES

| Score | Status | Unlock |
|-------|--------|--------|
| 84% (now) | ✅ | Good foundation |
| 89% | 🎯 Phase 2 | Beta launch ready |
| 93% | 🎯 Phase 3 | Paid launch ready |
| 97% | 🎯 Phase 4 | Enterprise sales |
