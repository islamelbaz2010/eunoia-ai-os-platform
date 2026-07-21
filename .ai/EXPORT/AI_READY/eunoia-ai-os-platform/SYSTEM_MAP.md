<!-- tokens: 1253 / budget 14000 -->

# System Map — eunoia-ai-os-platform

## Module Map

- `.github/` — CI/CD, issue templates, and project automation
- `audit/` — audit reports and validation outputs
- `docs/` — documentation and guides
- `knowledge/` — knowledge base, schemas, and extraction rules
- `ops/` — operations, backup, deploy, and monitoring
- `public/` — static assets
- `scripts/` — scripts and executables
- `secrets/` — sensitive configuration — handle with care
- `src/` — main source code
- `supabase/` — Supabase migrations and edge functions
- `tools/` — tools module (json, md, ts files)

## Data Model

Entities and structures derived from schema/model files:
- `docs/sprint-0.95/APPLY_MIGRATIONS_0003_to_0008.sql` — candidate schema/model file
- `knowledge/generator/schema-loader.ts` — candidate schema/model file
- `knowledge/packs/demo-enterprise-v1/hotels/analytics/schema.json` — `Hotels — Analytics Schema`
- `knowledge/packs/demo-enterprise-v1/hotels/automation/schema.json` — `Hotels — Automation Schema`
- `knowledge/packs/demo-enterprise-v1/hotels/company/schema.json` — `Hotels — Company Schema`
- `knowledge/packs/demo-enterprise-v1/hotels/faq/schema.json` — `Hotels — FAQ Schema`
- `knowledge/packs/demo-enterprise-v1/hotels/marketing/schema.json` — `Hotels — Marketing Schema`
- `knowledge/packs/demo-enterprise-v1/hotels/operations/schema.json` — `Hotels — Operations Schema`

## Interface Surface

| Surface | Purpose | Auth |
| --- | --- | --- |
| `src/app/api/admin/system/route.ts` | entry / routing file | — |
| `src/app/api/assistant/stream/route.ts` | entry / routing file | — |
| `src/app/api/crm/export/route.ts` | entry / routing file | — |
| `src/app/api/crm/import/route.ts` | entry / routing file | — |
| `src/app/api/crm/insights/route.ts` | entry / routing file | — |
| `src/app/api/health/route.ts` | entry / routing file | — |
| `src/app/api/live/route.ts` | entry / routing file | — |
| `src/app/api/metrics/route.ts` | entry / routing file | — |
| `src/app/api/stripe/checkout/route.ts` | entry / routing file | — |
| `src/app/api/stripe/portal/route.ts` | entry / routing file | — |

## Critical Flows

1. **GET /api/admin/system** — Authenticated diagnostics — answers: "what is the exact state of every dependency?" Requires a… — App Router route handler in `src/app/api/admin/system/route.ts`
2. **POST /api/assistant/stream** — App Router route handler in `src/app/api/assistant/stream/route.ts`
3. **GET /api/crm/export** — App Router route handler in `src/app/api/crm/export/route.ts`
4. **POST /api/crm/import** — App Router route handler in `src/app/api/crm/import/route.ts`
5. **POST /api/crm/insights** — App Router route handler in `src/app/api/crm/insights/route.ts`
6. **GET /api/health** — Readiness probe — answers: "is this instance ready to serve application traffic?" Maps to… — App Router route handler in `src/app/api/health/route.ts`

## Invariants & Sharp Edges

- Server-only boundary enforced in `AI_START_CHECKLIST.md` — source: AI_START_CHECKLIST.md
- Server-only boundary enforced in `CLAUDE.md` — source: CLAUDE.md
- Server-only boundary enforced in `DEPLOYMENT_VALIDATION.md` — source: DEPLOYMENT_VALIDATION.md
- Server-only boundary enforced in `FORENSIC_AUDIT_REPORT.md` — source: FORENSIC_AUDIT_REPORT.md
- Server-only boundary enforced in `INVESTOR_READINESS.md` — source: INVESTOR_READINESS.md

## Excerpts

### `src/lib/health/providers/index.ts`
```ts
import "server-only";

import type { HealthProvider } from "../types";
import { environmentProvider } from "./environment";
import { databaseProvider } from "./database";
import { authProvider } from "./auth";
import { storageProvider } from "./storage";
import { openAIProvider } from "./openai";
import { emailProvider } from "./email";
import { cacheProvider } from "./cache";
import { queueProvider } from "./queue";

/**
 * Canonical provider registry — the single place where providers are registered.
 * Both /api/health (readiness) and /api/admin/system (diagnostics) import this.
 *
 * ── Adding a new provider ───────────────────────────────────────────────────
 *
 *   1. Create  src/lib/health/providers/my-service.ts
 *      Implement HealthProvider<TMetadata> (or HealthProvider if no typed metadata).
```

### `src/lib/knowledge/extractors/rules/index.ts`
```ts
import type { KnowledgeEntity } from "../../types";

// ─── Rule engine ──────────────────────────────────────────────────────────────

export type ExtractionRuleType = "pattern" | "dictionary" | "heuristic";

export interface ExtractionRule {
  readonly name: string;
  readonly ruleType: ExtractionRuleType;
  /** Lower value = higher priority (runs first). Deduplication favours the first seen. */
  readonly priority: number;
  apply(text: string): KnowledgeEntity[];
}

/**
 * Runs a set of ExtractionRules against text in priority order.
 * Entities with the same (type, normalized) key are merged: the first rule's
 * confidence wins; occurrence counts are summed across all rules.
 */
export function runRules(
```
