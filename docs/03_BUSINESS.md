# 03 — Business

## Vision

Become the AI operating system of choice for hospitality businesses across the MENA region — the platform that hotels, resorts, and hospitality groups use to manage knowledge, serve guests intelligently, and operate more efficiently.

## Mission

Give every property — from a 10-room boutique hotel to a 500-room resort chain — access to enterprise-grade AI capabilities that were previously only available to companies with data science teams.

## Target Market

**Primary**: Egypt, UAE, Saudi Arabia — three of the fastest-growing hospitality markets globally.

**Customer profiles**:
1. **Boutique hotels (Egypt)**: 20–100 rooms, 5–20 staff, English + Arabic guests. Pain: knowledge scattered in WhatsApp messages and Word documents.
2. **Diving centers (Red Sea)**: PADI centers, 2–15 staff, multilingual guests (English, Russian, Italian). Pain: safety SOPs need to be accessible to all staff regardless of language.
3. **Resort chains (UAE/KSA)**: 3–10 properties, 50–500+ staff, international guests. Pain: knowledge consistency across properties.

## Languages Supported

| Language | Why |
|----------|-----|
| English | Primary language of international hospitality |
| Arabic | Local staff language; guests from GCC |
| Russian | Largest European tourist group to Red Sea (Egypt) |
| Italian | Second-largest European group to Red Sea; large Red Sea diving community |

## Product-Led Growth Model

1. Founder/manager signs up self-service
2. Creates organization (no sales call needed)
3. Invites team members
4. Adds knowledge base content
5. Immediately gets value from the RAG assistant

## Revenue Model (Designed Infrastructure)

The usage_events table tracks all billable actions:
- `rag_query` — AI assistant queries
- `kb_document_created` — document ingestion (embedding cost)
- `crm_contact_created` — CRM usage

**Planned tiers** (not yet implemented):
- **Starter**: 1 org, 5 users, 100 RAG queries/month, 50 documents
- **Professional**: 1 org, 25 users, 1000 RAG queries/month, unlimited documents
- **Enterprise**: Multiple properties (orgs), unlimited users, unlimited queries, SLA

## Competitive Differentiation

| Feature | Eunoia AI OS | Generic AI tools |
|---------|-------------|-----------------|
| Arabic content | Native | Limited/poor |
| Russian content | Supported | Minimal |
| Hospitality-specific UX | Yes | No |
| Private per-org KB | Yes | Varies |
| MENA data residency | Supabase region configurable | Typically US |
| RBAC for hotel org structure | 4-role system | Generic |
| Multi-property (org) | Yes | Rarely |

## Current Status (2026-06-28)

- Platform: Complete Phase 1 (all core features built)
- Customers: 0 (pre-launch)
- Infrastructure: Ready for production deployment
- Pending: Email delivery, password reset, payment integration

## Growth Strategy

1. **Diving centers first**: Smaller teams, clear pain point (multilingual safety SOPs), high urgency. Egypt Red Sea (Hurghada, Sharm El-Sheikh) as beachhead market.
2. **Reference customer**: Get 1 paying customer in 30 days for case study
3. **Hotel groups**: Expand to multi-property groups using the org switcher (Phase 2)
4. **UAE/KSA expansion**: Leverage Egyptian reference customers

## Investment Readiness

The technical infrastructure is investment-ready:
- Multi-tenant architecture scales horizontally
- Usage metering infrastructure in place for billing
- Security hardening complete (RLS, CSP, HSTS)
- Audit logs for compliance
- The platform demonstrates product-market fit for MENA hospitality

## Notes from `eunoia-ai-os.xlsx`

The `eunoia-ai-os-app` repository contains a business planning Excel file (`eunoia-ai-os.xlsx`, 12KB). This file likely contains detailed business plans, financial models, or product roadmaps. It should be extracted and stored in a documentation system for reference.
