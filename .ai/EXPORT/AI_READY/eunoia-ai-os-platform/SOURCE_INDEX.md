<!-- tokens: 4004 / budget 4000 -->

# Source Index — eunoia-ai-os-platform

## Annotated Tree

`eunoia-ai-os-platform/` — project root
  └── `AI_READY/` — project directory
      └── `AI_READY/eunoia-ai-os-platform/` — project directory
  └── `audit/` — project directory
  └── `docs/` — documentation and guides
      └── `docs/architecture/` — project directory
      └── `docs/devops/` — project directory
      └── `docs/exhibition-audit/` — project directory
      └── `docs/exhibition-final/` — project directory
      └── `docs/exhibition-live/` — project directory
      └── `docs/knowledge/` — project directory
      └── `docs/operations/` — project directory
          └── `docs/operations/grafana/` — project directory
      └── `docs/runbooks/` — project directory
      └── `docs/sprint-0.9/` — project directory
      └── `docs/sprint-0.95/` — project directory
      └── `docs/workspace-intelligence/` — project directory
  └── `downloads/` — project directory
      └── `downloads/reference/` — project directory
  └── `knowledge/` — project directory
      └── `knowledge/assets/` — static assets
          └── `knowledge/assets/brand/` — project directory
          └── `knowledge/assets/clients/` — project directory
          └── `knowledge/assets/company/` — project directory
          └── `knowledge/assets/contracts/` — project directory
          └── `knowledge/assets/faqs/` — project directory
          └── `knowledge/assets/marketing/` — project directory
          └── `knowledge/assets/media/` — project directory
          └── `knowledge/assets/projects/` — project directory
          └── `knowledge/assets/raw/` — project directory
          └── `knowledge/assets/reference/` — project directory
          └── `knowledge/assets/services/` — service / business logic
          └── `knowledge/assets/sops/` — project directory
      └── `knowledge/checksums/` — project directory
      └── `knowledge/contracts/` — project directory
      └── `knowledge/dictionaries/` — project directory
          └── `knowledge/dictionaries/ai/` — project directory
          └── `knowledge/dictionaries/business/` — project directory
          └── `knowledge/dictionaries/cities/` — project directory
          └── `knowledge/dictionaries/companies/` — project directory
          └── `knowledge/dictionaries/countries/` — project directory
          └── `knowledge/dictionaries/crm/` — project directory
          └── `knowledge/dictionaries/industries/` — project directory
          └── `knowledge/dictionaries/marketing/` — project directory
          └── `knowledge/dictionaries/people/` — project directory
          └── `knowledge/dictionaries/products/` — project directory
          └── `knowledge/dictionaries/services/` — service / business logic
          └── `knowledge/dictionaries/system/` — project directory
          └── `knowledge/dictionaries/technologies/` — project directory
      └── `knowledge/docs/` — documentation and guides
      └── `knowledge/embeddings/` — project directory
      └── `knowledge/extracted/` — project directory
          └── `knowledge/extracted/clients/` — project directory
          └── `knowledge/extracted/company/` — project directory
          └── `knowledge/extracted/entities/` — project directory
          └── `knowledge/extracted/faqs/` — project directory
          └── `knowledge/extracted/projects/` — project directory
          └── `knowledge/extracted/relationships/` — project directory
          └── `knowledge/extracted/services/` — service / business logic
          └── `knowledge/extracted/sops/` — project directory
          └── `knowledge/extracted/taxonomy/` — project directory
      └── `knowledge/generator/` — project directory
      └── `knowledge/glossary/` — project directory
      └── `knowledge/graph/` — project directory
      └── `knowledge/index/` — project directory
      └── `knowledge/manifests/` — project directory
      └── `knowledge/objects/` — project directory
      └── `knowledge/packs/` — project directory
          └── `knowledge/packs/demo-enterprise-v1/` — project directory
      └── `knowledge/processed/` — project directory
          └── `knowledge/processed/assets/` — static assets
          └── `knowledge/processed/chunks/` — project directory
          └── `knowledge/processed/entities/` — project directory
          └── `knowledge/processed/index/` — project directory
          └── `knowledge/processed/search/` — project directory
      └── `knowledge/prompts/` — project directory
      └── `knowledge/reports/` — project directory
          └── `knowledge/reports/duplicates/` — project directory
          └── `knowledge/reports/imports/` — project directory
          └── `knowledge/reports/quality/` — project directory
          └── `knowledge/reports/statistics/` — project directory
      └── `knowledge/schemas/` — data models and schema definitions
      └── `knowledge/scripts/` — scripts and executables
      └── `knowledge/taxonomy/` — project directory
      └── `knowledge/templates/` — project directory
          └── `knowledge/templates/import/` — project directory
      └── `knowledge/tools/` — project directory
      └── `knowledge/uploads/` — project directory
  └── `ops/` — project directory
      └── `ops/deploy/` — project directory
      └── `ops/docs/` — documentation and guides
      └── `ops/maintenance/` — project directory
      └── `ops/monitoring/` — project directory
      └── `ops/restore/` — project directory
      └── `ops/scripts/` — scripts and executables
  └── `public/` — static assets
  └── `scripts/` — scripts and executables
      └── `scripts/exhibition/` — project directory
      └── `scripts/knowledge/` — project directory
      └── `scripts/launch/` — project directory
  └── `secrets/` — project directory
  └── `src/` — main source code
      └── `src/app/` — application / UI layer
          └── `src/app/_landing/` — project directory
          └── `src/app/api/` — API / route handlers
          └── `src/app/auth/` — project directory
          └── `src/app/dashboard/` — project directory
          └── `src/app/invite/` — project directory
          └── `src/app/login/` — project directory
          └── `src/app/onboarding/` — project directory
          └── `src/app/privacy/` — project directory
          └── `src/app/signup/` — project directory
          └── `src/app/terms/` — project directory
      └── `src/lib/` — shared library / core utilities
          └── `src/lib/ai/` — project directory
          └── `src/lib/auth/` — project directory
          └── `src/lib/health/` — project directory
          └── `src/lib/knowledge/` — project directory
          └── `src/lib/logger/` — project directory
          └── `src/lib/stripe/` — project directory
          └── `src/lib/supabase/` — project directory
  └── `supabase/` — project directory
      └── `supabase/migrations/` — project directory
  └── `tools/` — project directory
      └── `tools/bootstrap/` — project directory

## Document Index

| Path | Category | Date | Summary | Authority |
| --- | --- | --- | --- | --- |
| `BILLING_ARCHITECTURE.md` | architecture | — | Eunoia AI OS uses a Stripe-based subscription billing system designed for multi- | canonical (by recency; no declared status) |
| `README.md` | readme | — | AI Operating System for hotels, resorts, hospitality groups, and diving centers  | canonical (by recency; no declared status) |
| `audit/architecture.md` | architecture | — | Architecture Audit — Eunoia AI OS | superseded |
| `docs/04_ARCHITECTURE.md` | architecture | — | PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback", "/"] ``` | canonical (by recency; no declared status) |
| `docs/KNOWLEDGE_ARCHITECTURE.md` | architecture | — | The Knowledge Brain is the single source of truth for all content ingested into  | canonical (by recency; no declared status) |
| `docs/MULTITENANT_ARCHITECTURE.md` | architecture | 2026-06-29 | Multi-Tenant Architecture — Eunoia AI OS | canonical (by recency; no declared status) |
| `docs/architecture/AI_OS_ALIGNMENT_REPORT.md` | architecture | — | AI OS — Knowledge Alignment Report | superseded |
| `docs/architecture/AI_OS_KNOWLEDGE_ALIGNMENT.md` | architecture | — | Purpose ------- This document defines which responsibilities remain in Eunoia AI | canonical (by recency; no declared status) |
| `docs/architecture/BOUNDARY_RULES.md` | architecture | — | Boundary Rules — AI OS ↔ Knowledge Cloud | canonical (by recency; no declared status) |
| `docs/architecture/KNOWLEDGE_CONSUMER_SPEC.md` | architecture | — | Knowledge Consumer Specification | canonical (by recency; no declared status) |
| `docs/architecture/KNOWLEDGE_RESOLVER.md` | architecture | — | Purpose ------- Define how AI OS maps queries and context to installed Knowledge | canonical (by recency; no declared status) |
| `docs/architecture/MIGRATION_PLAN_FROM_KB2.md` | architecture | — | Migration Plan — KB2 → Knowledge Cloud + AI OS Consumer | superseded |
| `docs/architecture/PACKAGE_MANAGER_SPEC.md` | architecture | — | Knowledge Package Manager (KPM) — Spec | canonical (by recency; no declared status) |
| `docs/exhibition-final/10_ARCHITECTURE_REVIEW.md` | architecture | 2026-07-12 | ARCHITECTURE REVIEW **Date**: 2026-07-12   **Perspective**: Principal Architect  | superseded |
| `audit/roadmap.md` | roadmap | — | Recommended Roadmap — Eunoia AI OS | canonical (by recency; no declared status) |
| `docs/15_ROADMAP.md` | roadmap | — | Core platform — everything a single property needs to get value from AI. | historical |
| `docs/17_DECISIONS.md` | decision | — | 17 — Architecture Decision Records | canonical (by recency; no declared status) |
| `docs/architecture/INSTALLATION_PIPELINE.md` | architecture | — | Purpose ------- Describe the step-by-step install-time pipeline used by the KPM  | canonical (by recency; no declared status) |
| `docs/architecture/KNOWLEDGE_PACK_LIFECYCLE.md` | architecture | — | Overview -------- Defines the stages a Knowledge Pack traverses from authoring i | superseded |
| `docs/exhibition-final/13_POST_EXHIBITION_ROADMAP.md` | roadmap | 2026-07-12 | POST-EXHIBITION ROADMAP **Date**: 2026-07-12   **Horizon**: 90 days after Tuesda | superseded |
| `INVESTOR_READINESS.md` | business | 2026-07-07 | INVESTOR READINESS **Eunoia AI OS — Pre-Seed Investment Technical Due Diligence* | canonical (by recency; no declared status) |
| `docs/exhibition-final/08_INVESTOR_PITCH.md` | business | 2026-07-12 | INVESTOR PITCH **Technical Due Diligence Brief — Eunoia AI OS**   **Date**: 2026 | canonical (by recency; no declared status) |
| `docs/FOUNDER_REPORT.md` | interview | 2026-06-28 | FOUNDER REPORT ## Eunoia AI OS — Plain English Status as of 2026-06-28 | canonical (by recency; no declared status) |
| `FIRST_CUSTOMER_RISK_REPORT.md` | risk | 2026-07-07 | FIRST CUSTOMER RISK REPORT **Repository**: eunoia-ai-os-platform   **Date**: 202 | canonical (by recency; no declared status) |
| `docs/exhibition-audit/SALES_PLAYBOOK.md` | playbook | 2026-07-12 | SALES PLAYBOOK **Eunoia AI OS — Industry-Specific Presentation Guide**   **Date* | canonical (by recency; no declared status) |
| `docs/exhibition-final/06_DEMO_PLAYBOOK.md` | playbook | 2026-07-12 | DEMO PLAYBOOK **Exhibition Edition — 5-Minute Flow**   **Updated**: 2026-07-12 ( | historical |
| `docs/runbooks/cache-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="cache"} == 0` | canonical (by recency; no declared status) |
| `docs/runbooks/database-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="database"} == 0` or `health_provider_ | canonical (by recency; no declared status) |
| `docs/runbooks/database-lost.md` | playbook | — | **Scenario**: Supabase database is irreversibly lost or corrupted. | canonical (by recency; no declared status) |
| `docs/runbooks/deployment-failure.md` | playbook | — | **Trigger**: Deploy completes but health checks fail, or users report a broken f | canonical (by recency; no declared status) |
| `docs/runbooks/dns-failure.md` | playbook | — | **Scenario**: Domain is not resolving, or DNS propagation is broken. | canonical (by recency; no declared status) |
| `docs/runbooks/email-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="email"} == 0`   OR users report invit | canonical (by recency; no declared status) |
| `docs/runbooks/high-cpu.md` | playbook | — | **Trigger**: CPU usage sustained above 80% for 5+ minutes   OR `process_uptime_s | canonical (by recency; no declared status) |
| `docs/runbooks/high-memory.md` | playbook | — | **Trigger**: `process_memory_heap_used_bytes / process_memory_heap_total_bytes > | canonical (by recency; no declared status) |
| `docs/runbooks/incident-response.md` | playbook | — | Use this runbook for any severity-1 (customer-impacting) incident. | canonical (by recency; no declared status) |
| `docs/runbooks/openai-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="openai"} == 0` OR users report "Assis | canonical (by recency; no declared status) |
| `docs/runbooks/recovery-checklist.md` | playbook | — | Use this checklist after resolving any SEV1 or SEV2 incident to confirm full sys | canonical (by recency; no declared status) |
| `docs/runbooks/region-failure.md` | playbook | — | **Scenario**: Cloud provider region (AWS, GCP, Vercel edge region) is experienci | canonical (by recency; no declared status) |
| `docs/runbooks/rollback.md` | playbook | — | Use this runbook to revert a broken production deployment. | canonical (by recency; no declared status) |
| `docs/runbooks/secrets-lost.md` | playbook | — | **Scenario**: `.env.local` is lost, corrupted, or accidentally committed and rot | canonical (by recency; no declared status) |
| `docs/runbooks/server-lost.md` | playbook | — | **Scenario**: The application server is completely unresponsive or destroyed. Al | canonical (by recency; no declared status) |
| `docs/runbooks/ssl-failure.md` | playbook | — | **Scenario**: SSL certificate expired or is invalid. Browsers show security warn | canonical (by recency; no declared status) |
| `docs/runbooks/storage-lost.md` | playbook | — | **Scenario**: Supabase Storage bucket is deleted, corrupted, or files are lost. | canonical (by recency; no declared status) |
| `knowledge/docs/CONTENT_GUIDELINES.md` | standards | — | The Demo Enterprise Pack v1 is a **framework shell**. It contains: | canonical (by recency; no declared status) |
| `docs/runbooks/queue-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="queue"} == 0` | canonical (by recency; no declared status) |
| `docs/runbooks/storage-down.md` | playbook | — | **Trigger**: `health_provider_up{provider="storage"} == 0` | canonical (by recency; no declared status) |
| `knowledge/packs/demo-enterprise-v1/hotels/playbooks/README.md` | playbook | — | **Pack**: Demo Enterprise Pack v1 (`demo-enterprise-v1`) **Industry**: Hotels (` | canonical (by recency; no declared status) |
| `docs/00_PROJECT_MASTER_CONTEXT.md` | other | — | > The single reference document for anyone joining this project cold. | canonical (by recency; no declared status) |
| `docs/01_EXECUTIVE_SUMMARY.md` | other | — | Eunoia AI OS is a multi-tenant SaaS platform that gives hospitality businesses i | canonical (by recency; no declared status) |
| `docs/02_PRODUCT.md` | other | — | Complete documentation of every page, feature, and user workflow. | historical |
| `docs/03_BUSINESS.md` | other | — | Become the AI operating system of choice for hospitality businesses across the M | canonical (by recency; no declared status) |
| _106 additional document(s) omitted to stay within token budget_ | | | | |
| _72 earlier/historical draft(s) at `01-executive-summary`, `bug-report`, `investor-readiness`, `readme_` | | | | historical |
| _56 template shell / empty document(s) excluded_ | | | | excluded |

## Retrieval Pointers

- For orientation: `README.md`
- For architecture / system design: `BILLING_ARCHITECTURE.md`

_…content truncated at token budget 4000_