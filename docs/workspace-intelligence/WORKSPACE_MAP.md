# WORKSPACE MAP

**Generated**: 2026-07-13
**Scope**: Two-repository enterprise workspace — Eunoia AI OS

---

## Repositories

| ID | Name | Path | Role |
|----|------|------|------|
| KC | eunoia-knowledge-cloud | `~/Documents/eunoia-knowledge-cloud` | Enterprise Knowledge Factory |
| Platform | eunoia-ai-os-platform | `~/Documents/Projects/02-Eunoia-AI-OS/eunoia-ai-os-platform` | AI Runtime Platform |

---

## Purpose

### Repository A — eunoia-knowledge-cloud (KC)

Produces structured, versioned, signed Knowledge Packs for consumption by the AI OS. Defines the canonical schemas, taxonomy, industry packs, country contexts, generator pipeline, validation specification, publisher contract, and pack registry design. Currently at architecture phase (KC-0 COMPLETE; KC-1 implementation not started).

### Repository B — eunoia-ai-os-platform (Platform)

The live, multi-tenant SaaS runtime. Consumes knowledge packs, powers the RAG assistant, CRM, knowledge base, billing, authentication, and observability stack. Deployed to Vercel. Production-live at `eunoia-ai-os-platform.vercel.app`.

---

## Relationship

```
eunoia-knowledge-cloud
  │
  │  produces → signed Knowledge Packs (manifest.json + checksums)
  │
  └──► eunoia-ai-os-platform
         │
         ├── src/lib/knowledge/   ← runtime consumer / local adapter
         ├── knowledge/            ← local working knowledge store
         └── scripts/knowledge/   ← local pipeline (pre-KC bridge)
```

The formal contract between the two repositories is defined in:
- KC: `docs/architecture/11-ai-os-contract.md`
- Platform: `docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md`

The alignment document explicitly designates KC as the sole canonical knowledge producer and Platform as the pure runtime consumer. Platform's current local ingestion code (`src/lib/knowledge/importer`, `scripts/knowledge/*`) is a bridge implementation pending KC-1 delivery.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Eunoia Enterprise Workspace                   │
│                                                             │
│  ┌────────────────────────┐   ┌─────────────────────────┐  │
│  │  eunoia-knowledge-cloud│   │ eunoia-ai-os-platform   │  │
│  │                        │   │                         │  │
│  │  Industries (7)        │   │  Next.js 16 App         │  │
│  │  Countries (4)         │──►│  Supabase + pgvector    │  │
│  │  Core Domains (7)      │   │  OpenAI GPT-4o-mini     │  │
│  │  Generator Pipeline    │   │  Stripe Billing         │  │
│  │  Manifest + Checksums  │   │  Sentry + Prometheus    │  │
│  │  5 Canonical Schemas   │   │  Vercel (deployed)      │  │
│  └────────────────────────┘   └─────────────────────────┘  │
│         PRODUCER                      CONSUMER              │
└─────────────────────────────────────────────────────────────┘
```

---

## Ownership

| Area | Owner Repository | Notes |
|------|-----------------|-------|
| Knowledge schemas | KC | Canonical. Platform must not redefine. |
| Industry taxonomy | KC | 7 industries defined as folder stubs |
| Country context | KC | Egypt, Saudi, UAE, Global |
| Core domain modules | KC | ai, business, crm, finance, hr, legal, marketing |
| Generator pipeline | KC | `src/core/generator/*` — 13 TypeScript modules |
| Pack manifests | KC | `manifests/manifest.json` |
| AI/RAG runtime | Platform | `src/lib/ai/` |
| CRM runtime | Platform | `src/app/dashboard/crm/` |
| Auth & sessions | Platform | `src/lib/auth/` + Supabase |
| Billing | Platform | `src/lib/stripe/` + Stripe |
| Database migrations | Platform | `supabase/migrations/` (11 files) |
| Observability | Platform | health framework, Sentry, Prometheus |
| Local knowledge store | Platform | `knowledge/` working directory |
| Local knowledge scripts | Platform | `scripts/knowledge/` (bridge, pre-KC) |
