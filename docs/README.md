# Eunoia AI OS — Engineering Knowledge Base

> **Single Source of Truth.** Every claim in this documentation is verified against source code, migrations, and git history as of 2026-06-28.

## Start Here

| Document | When to read it |
|----------|----------------|
| [MASTER_CTO_HANDBOOK.md](MASTER_CTO_HANDBOOK.md) | **New CTO / Lead Engineer** — complete project in one document (30 sections) |
| [QUICK_START_FOR_NEW_DEVELOPER.md](QUICK_START_FOR_NEW_DEVELOPER.md) | **New Developer** — productive in 60 minutes (5 pages) |
| [PROJECT_TIMELINE.md](PROJECT_TIMELINE.md) | **Status + Milestones** — what's done, what's next, effort estimates |

---

## Product & Business

| Document | Contents |
|----------|----------|
| [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) | Product + business in under 2 pages |
| [02_PRODUCT.md](02_PRODUCT.md) | Every feature, every page, every workflow |
| [03_BUSINESS.md](03_BUSINESS.md) | Vision, market, pricing strategy, growth model |
| [15_ROADMAP.md](15_ROADMAP.md) | Phase 2–6 feature roadmap |
| [FOUNDER_REPORT.md](FOUNDER_REPORT.md) | Plain English: stage, risks, strengths, revenue timeline |

---

## Architecture & Design

| Document | Contents |
|----------|----------|
| [04_ARCHITECTURE.md](04_ARCHITECTURE.md) | High-level architecture, component diagram, data flow |
| [05_SYSTEM_DESIGN.md](05_SYSTEM_DESIGN.md) | Sequence diagrams: RAG query, document ingestion, invite flow |
| [17_DECISIONS.md](17_DECISIONS.md) | Architecture Decision Records (ADRs) |
| [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) | Internal + external dependency map, circular dep check |

---

## Database

| Document | Contents |
|----------|----------|
| [06_DATABASE.md](06_DATABASE.md) | Every table, column, index, RLS policy, RPC, enum |
| [MASTER_FILE_INDEX.md](MASTER_FILE_INDEX.md) | Every file in both repos — verified row by row |

---

## AI & RAG

| Document | Contents |
|----------|----------|
| [07_AI.md](07_AI.md) | Embedding pipeline, chunking strategy, RAG, prompt design, limitations |

---

## Security

| Document | Contents |
|----------|----------|
| [08_SECURITY.md](08_SECURITY.md) | Auth, RLS, CSP, RBAC, threat model, known gaps |

---

## API & Integration

| Document | Contents |
|----------|----------|
| [19_API_REFERENCE.md](19_API_REFERENCE.md) | All routes, server actions, Supabase RPCs, table queries |
| [20_ENVIRONMENT.md](20_ENVIRONMENT.md) | Every environment variable — what it is, where it goes |

---

## Infrastructure & Deployment

| Document | Contents |
|----------|----------|
| [09_INFRASTRUCTURE.md](09_INFRASTRUCTURE.md) | Vercel, Supabase, logging, health check, CDN, backups |
| [10_DEPLOYMENT.md](10_DEPLOYMENT.md) | Step-by-step deploy guide |
| [11_DEVOPS.md](11_DEVOPS.md) | CI/CD, scripts, health checks |
| [24_RELEASE_PROCESS.md](24_RELEASE_PROCESS.md) | How to ship a release safely |

---

## Testing & Quality

| Document | Contents |
|----------|----------|
| [12_TESTING.md](12_TESTING.md) | Test suite, coverage, integration scripts |
| [13_PERFORMANCE.md](13_PERFORMANCE.md) | Query limits, O(N) bottlenecks, HNSW performance |

---

## Current Status & Tasks

| Document | Contents |
|----------|----------|
| [IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) | Every feature: documented vs. implemented vs. status vs. confidence |
| [FEATURE_COMPLETENESS.md](FEATURE_COMPLETENESS.md) | % completion per feature across 9 dimensions |
| [MASTER_TODO.md](MASTER_TODO.md) | P0/P1/P2/P3 task list with hours, dependencies, risk, business value |
| [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md) | Can this be sold today? Every blocker with effort + impact |
| [14_TECHNICAL_DEBT.md](14_TECHNICAL_DEBT.md) | All known technical debt, prioritized by risk |

---

## Audit & Verification

| Document | Contents |
|----------|----------|
| [FINAL_CTO_REPORT.md](FINAL_CTO_REPORT.md) | Complete audit report: 52 files read, 22 issues found |
| [CODE_DOC_DIFF.md](CODE_DOC_DIFF.md) | All discrepancies: dead code, doc errors, missing files |
| [PROJECT_HEALTH.md](PROJECT_HEALTH.md) | 13-category scored health assessment |
| [FINAL_SCORE.md](FINAL_SCORE.md) | 12-category score recalculated from source code (78/100) |
| [VERIFICATION_SUMMARY.md](VERIFICATION_SUMMARY.md) | Audit coverage stats + final YES/NO documentation sync answer |

---

## Operations & Incidents

| Document | Contents |
|----------|----------|
| [21_OPERATIONS.md](21_OPERATIONS.md) | Runbooks, common operations |
| [22_INCIDENT_RESPONSE.md](22_INCIDENT_RESPONSE.md) | On-call playbook |
| [23_BACKUP_RECOVERY.md](23_BACKUP_RECOVERY.md) | Data recovery strategy |

---

## History & Future

| Document | Contents |
|----------|----------|
| [16_CHANGELOG.md](16_CHANGELOG.md) | Full commit-by-commit history with context |
| [18_FILE_INVENTORY.md](18_FILE_INVENTORY.md) | Earlier file inventory (superseded by MASTER_FILE_INDEX.md) |
| [25_FUTURE_IDEAS.md](25_FUTURE_IDEAS.md) | Unscoped ideas and experiments |

---

## Quick Reference

### Repository
| Repo | Path | Status |
|------|------|--------|
| `eunoia-ai-os-platform` | `/Users/ahmed/Documents/eunoia-ai-os-platform` | **Active — production code** |
| `eunoia-ai-os-app` | `/Users/ahmed/Documents/eunoia-ai-os-app` | **Empty scaffold — unused** |

### Common Commands
```bash
cp .env.example .env.local   # First-time setup
npm install
npm run dev                  # http://localhost:3000
npm test                     # 29 unit tests
npx tsc --noEmit             # TypeScript check
npm run lint                 # ESLint
npm run build                # Production build
node scripts/test-rag.js     # Full RAG integration test (needs .env.local)
```

### Security Rules (Never Violate)
- `SUPABASE_SERVICE_ROLE_KEY` must **never** be added to Vercel environment variables
- `import "server-only"` must stay on: `dal.ts`, `audit.ts`, `openai.ts`, `ingest.ts`, `env.ts`, `server.ts`
- RLS is the security source of truth — app-layer checks are UX only
- Errors never expose internals to the browser — only `error.digest` shown
- Audit logging is always fire-and-forget: `void logAuditEvent({...})`
