<!-- tokens: 677 / budget 10000 -->

# Project Brief — eunoia-ai-os-platform

## Consumption Contract

This AI Package is a curated substitute for uploading the repository. Use the files in this order: PROJECT_BRIEF.md → SYSTEM_MAP.md → DECISIONS.md → SOURCE_INDEX.md → MANIFEST.json. MANIFEST.json is machine-only and never uploaded. Confidence labels: 🟢 High (code-derived or verified), 🟡 Medium (doc-derived, dated), 🔴 Low (inferred). Unknown claims are declared gaps with a source path.

## Identity

- **Name:** eunoia-ai-os-platform
- **Type:** Product Service
- **Purpose:** AI Operating System for hotels, resorts, hospitality groups, and diving centers across Egypt, the UAE, and Saudi Arabia.
- **Repo URL:** https://github.com/islamelbaz2010/eunoia-ai-os-platform.git
- **Status:** active (last activity 2026-07-12)

## What it does

_No expanded purpose narrative found beyond the one-line purpose._ Add a README 'What it does' or business overview section.

## How it works

🟡 Eunoia AI OS uses a Stripe-based subscription billing system designed for multi-tenant SaaS

— source: architecture docs / SOURCE_INDEX.md

## Ground Truth

- **Primary language:** TypeScript
- **Languages:** TypeScript, Shell, CSS
- **Frameworks:** Next.js, React
- **Package managers:** npm
- **Major dependencies:**
  - `@sentry/nextjs` (^10.62.0) — source: package.json
  - `@supabase/ssr` (^0.12.0) — source: package.json
  - `@supabase/supabase-js` (^2.108.2) — source: package.json
  - `chokidar` (^5.0.0) — source: package.json
  - `fast-glob` (^3.3.3) — source: package.json
  - `file-type` (^22.0.1) — source: package.json
  - `gray-matter` (^4.0.3) — source: package.json
  - `lucide-react` (^1.21.0) — source: package.json
  - `mammoth` (^1.12.0) — source: package.json
  - `mime-types` (^3.0.2) — source: package.json
- **Testing:** Vitest
- **Databases:** Supabase (PostgreSQL)
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Branch:** `main`

## Current State

- Repository active as of 2026-07-12 — source: git last commit date.
- **Known risks:**
  - **Counters reset on restart** — Use `increase()` or `rate()` in Prometheus queries, not raw counter values.
  - **No HTTP request metrics** — HTTP request counting requires persistent state not available in serverless. For full HTTP metrics, consider Datadog APM or New Relic.
  - **Single-process** — Metrics reflect one Node.js process. For multi-instance deployments, Prometheus aggregates across all instances automatically.
  - **Provider status is buffered** — `/api/metrics` reads from the ring buffer, not from live infrastructure. If no health checks have run (fresh restart), provider metrics are omitted.

## Known Gaps

_No major documentation gaps detected._