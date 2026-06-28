# 01 — Executive Summary

## What Eunoia AI OS Is

Eunoia AI OS is a multi-tenant SaaS platform that gives hospitality businesses in the MENA region (Egypt, UAE, Saudi Arabia) an AI-powered operating system. It is not a generic AI tool — it is purpose-built for hotels, resorts, diving centers, and hospitality groups with features specific to that industry.

## Core Value Proposition

A hotel manager can:
1. Upload their policies, SOPs, and guest FAQs to a **Knowledge Base**
2. Ask any question in natural language and receive an answer **grounded in those exact documents** (RAG assistant)
3. Manage **guest and lead relationships** (CRM) with pipeline tracking
4. **Invite their team** with role-based access (owner / admin / member / viewer)
5. Audit every action taken across the organization
6. Track AI and CRM usage over time

## Why MENA Hospitality

- High-growth market: Egypt (Nile Delta tourism rebound), UAE (post-Expo 2020 hospitality boom), KSA (Vision 2030 mega-projects)
- Multi-language necessity: Staff and guests speak English, Arabic, Russian (Red Sea divers), Italian (Mediterranean tourism)
- Underserved by existing AI tools: Most tools assume English-first, Western workflows
- Diving centers: A niche with specific SOPs (safety briefings, certification records, equipment logs) that benefit heavily from RAG

## Product as Built (Phase 1)

| Module | Status |
|--------|--------|
| Authentication (email + password + OAuth/magic link) | Complete |
| Multi-tenant organizations with RBAC (4 roles) | Complete |
| Organization creation / onboarding | Complete |
| Team invites (token-based, 14-day expiry) | Complete |
| CRM (contacts, pipeline status) | Complete (basic) |
| Knowledge Base (document ingestion, multi-language) | Complete |
| RAG Assistant (pgvector + GPT-4o-mini) | Complete |
| Audit Logs | Complete |
| Usage Tracking | Complete |
| Super Admin (platform-wide org view) | Complete |
| Dashboard KPIs + charts (area + pie) | Complete |
| Health check endpoint | Complete |
| Security headers (CSP, HSTS, X-Frame) | Complete |
| PWA manifest | Complete |
| Sitemap + robots.txt | Complete |

## What is NOT Built Yet

- Email delivery for invites (tokens must be shared manually)
- Password reset flow
- File upload for Knowledge Base (PDF, DOCX) — text paste only
- Multi-organization switcher
- CRM contact editing / deletion
- Document editing / re-ingestion trigger
- Billing / subscription management
- Sentry error tracking
- Streaming AI responses

## Business Model (Inferred from Architecture)

- **SaaS / per-organization subscription**: The multi-tenant RBAC and usage tracking infrastructure is designed for per-org billing
- **Usage metering**: `usage_events` table tracks AI queries (`rag_query`), CRM actions (`crm_contact_created`), and KB actions (`kb_document_created`) — the infrastructure for usage-based billing is already in place
- **Self-serve onboarding**: Users create their own org, no sales touch needed for basic tier

## Competitive Position

- Built specifically for Arabic-language and MENA hospitality context
- Private Knowledge Base per organization (data isolation enforced at Postgres RLS level)
- RAG grounds answers in actual company documents — no hallucinations about policies that don't exist
- Tiered access (owner/admin/member/viewer) suitable for hotel department structure

## Current Infrastructure Cost (estimated)

| Service | Tier | Cost |
|---------|------|------|
| Supabase | Free or Pro | $0 / $25/month |
| Vercel | Hobby or Pro | $0 / $20/month |
| OpenAI | Pay-per-use | ~$0.02 per 1M embedding tokens; GPT-4o-mini ~$0.15/1M input |
| Domain | eunoiaos.com | ~$12/year |

At early-stage traffic, infrastructure cost is effectively $0–$45/month.
