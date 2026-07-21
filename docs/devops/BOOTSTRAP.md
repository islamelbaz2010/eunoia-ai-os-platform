# Production Bootstrap System

Single-command production environment configuration from a single source of truth.

---

## Overview

The bootstrap system reads credentials from `secrets/eunoia-ai-os.xlsx`, generates `.env.production.master`, syncs every variable to Vercel (production + preview + development), then runs the three validation scripts and produces a markdown report.

```
secrets/eunoia-ai-os.xlsx
        │
        ▼
tools/bootstrap/excel.ts       ← parse Excel
        │
        ▼
tools/bootstrap/env.ts         ← transform + auto-expand
        │
        ├── .env.production.master  ← written to project root
        │
        ▼
tools/bootstrap/vercel.ts      ← idempotent Vercel sync
        │
        ├── verify_vercel_env.sh
        ├── validate_webhook.sh
        └── smoke_test.sh
        │
        ▼
tools/bootstrap/report.ts      ← BOOTSTRAP_REPORT.md
```

---

## Prerequisites

| Requirement | Check |
|---|---|
| Node.js ≥ 20 | `node --version` |
| Vercel CLI authenticated | `vercel whoami` |
| `secrets/eunoia-ai-os.xlsx` exists | `ls secrets/` |
| Project linked to Vercel | `cat .vercel/project.json` |

Install Vercel CLI if needed:
```bash
npm i -g vercel@latest
vercel login
vercel link  # link to eunoia-ai-os-platform project
```

---

## Usage

### Full bootstrap (syncs to Vercel)

```bash
npm run bootstrap
```

### Dry run (no Vercel writes, generates .env.production.master only)

```bash
npm run bootstrap:dry-run
```

### Run directly with tsx

```bash
npx tsx tools/bootstrap/index.ts
npx tsx tools/bootstrap/index.ts --dry-run
```

---

## What It Does (14 Steps)

| Step | Action |
|---|---|
| 1 | Read `secrets/eunoia-ai-os.xlsx` |
| 2 | Build env var map (auto-expand `NEXT_PUBLIC_*` variants, resolve `METRICS_TOKEN`) |
| 3 | Write `.env.production.master` |
| 4 | List current Vercel env vars |
| 5 | For each var: skip if hash matches lock file (identical) |
| 6 | Add missing variables to Vercel |
| 7 | Update changed variables in Vercel (remove then re-add) |
| 8 | Sync Production environment |
| 9 | Sync Preview environment |
| 10 | Sync Development environment |
| 11 | Run `scripts/launch/verify_vercel_env.sh` |
| 12 | Run `scripts/launch/validate_webhook.sh` |
| 13 | Run `scripts/launch/smoke_test.sh` |
| 14 | Write `tools/bootstrap/BOOTSTRAP_REPORT.md` |

---

## Idempotency

Running bootstrap twice produces the same result:

- **Hash cache**: `tools/bootstrap/.bootstrap.lock.json` stores SHA-256 hashes of the last synced value per variable per environment.
- If the hash matches and the variable exists in Vercel → **skipped** (no Vercel API call).
- If the hash differs → **updated** (remove then re-add).
- If the variable is new → **added**.

The lock file is gitignored. Delete it to force a full re-sync:

```bash
rm tools/bootstrap/.bootstrap.lock.json
npm run bootstrap
```

---

## Excel Structure

The system reads `secrets/eunoia-ai-os.xlsx` using a multi-pass parser:

**Pass 1** — Rows where the `site` column is a valid `UPPER_CASE` env var name and `stutus` (sic) has the value.

**Pass 2** — Known aliases for human-readable labels:
| Site label | Env var |
|---|---|
| `publishable key` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `secret key` | `STRIPE_SECRET_KEY` |
| `signing secret` | `STRIPE_WEBHOOK_SECRET` |
| `whatsapp meta_access_token` | `META_ACCESS_TOKEN` |

**Pass 3** — Inline `KEY=VALUE` strings in the `SUPABASE_ANON_KEY=` column.

Later passes override earlier ones for the same key.

---

## Auto-Expansion

The following keys are automatically expanded with a `NEXT_PUBLIC_` counterpart:

| Source key | Also creates |
|---|---|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` |

---

## Static Variables

These are injected regardless of Excel content:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://eunoia-ai-os-platform.vercel.app` |

---

## METRICS_TOKEN Auto-Generation

If `METRICS_TOKEN` is missing or set to the placeholder `change-me-in-production`, the system generates a cryptographically secure random token (`openssl rand -base64 32` equivalent). The generated value is written to `.env.production.master` and synced to Vercel.

---

## Forbidden Variables

These are written to `.env.production.master` as comments but **never uploaded to Vercel**:

| Variable | Reason |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts only — never in cloud env |
| `SENTRY_AUTH_TOKEN` | CI only — source map upload at build time |

---

## Output Files

| File | Description | Gitignored |
|---|---|---|
| `.env.production.master` | All env vars, forbidden ones commented out | ✅ |
| `tools/bootstrap/.bootstrap.lock.json` | SHA-256 hash cache for idempotent sync | ✅ |
| `tools/bootstrap/BOOTSTRAP_REPORT.md` | Full sync report from last run | ✅ |

---

## Module Reference

| File | Responsibility |
|---|---|
| `types.ts` | All TypeScript types and interfaces |
| `utils.ts` | `sha256`, `generateToken`, `execVercel`, `runScript`, logging |
| `excel.ts` | Parse `secrets/*.xlsx` → `RawEnvRecord[]` |
| `metrics.ts` | Resolve `METRICS_TOKEN` (keep or generate) |
| `env.ts` | Transform raw records → `EnvVar[]`, write `.env.production.master` |
| `vercel.ts` | Lock file management, `vercel env ls` parsing, sync logic |
| `report.ts` | Generate markdown report from `BootstrapResult` |
| `index.ts` | Orchestrates all 14 steps |

---

## Troubleshooting

**`Error: Excel file not found`**  
Ensure `secrets/eunoia-ai-os.xlsx` exists. The `secrets/` directory is gitignored.

**`vercel: command not found`**  
```bash
npm i -g vercel@latest
```

**`Not logged into Vercel`**  
```bash
vercel login
```

**`vercel env add` fails with "already exists"**  
The system handles this by removing then re-adding. If it still fails, delete the lock file and re-run.

**Sync looks wrong after manual Vercel changes**  
Delete the lock file to force comparison against the Excel source:
```bash
rm tools/bootstrap/.bootstrap.lock.json
npm run bootstrap
```

**Smoke tests fail**  
Check `tools/bootstrap/BOOTSTRAP_REPORT.md` for script stdout/stderr. Common causes:
- Vercel deployment not yet propagated (wait 30s, re-run `npm run bootstrap`)
- DNS not configured for custom domain
- Supabase migrations not applied
