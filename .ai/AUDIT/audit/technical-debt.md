# Technical Debt Audit — Eunoia AI OS

**Technical Debt Score: 58 / 100 (lower = more debt)**

---

## CRITICAL DEBT (Must Fix Before Next Deployment)

### TD-001: TypeScript Error in quality-report.ts
**Root Cause**: `FileMetadata` used without import  
**File**: `scripts/knowledge/quality-report.ts:58`  
**Impact**: Build fails, CI fails, Vercel deployments fail  
**Fix**: Add `import type { FileMetadata } from "../../src/lib/knowledge/importer/types";`  
**Effort**: 1 minute  
**Risk if deferred**: Every push fails CI permanently

### TD-002: 13 ESLint Errors
**Root Cause**: Knowledge layer scripts added without resolving lint issues  
**Files**: `scripts/knowledge/watch-assets.ts`, `src/lib/knowledge/importer/parser/index.ts`, `src/lib/knowledge/importer/validator/index.ts`  
**Impact**: CI lint step fails on every push  
**Fix**: Prefix unused vars with `_`, annotate `any` types properly  
**Effort**: 30 minutes  
**Risk if deferred**: All PRs will show failed CI status

### TD-003: Docker Healthcheck String Mismatch
**Root Cause**: `/api/live` returns `{"status":"ok"}` but Dockerfile checks for `"status":"live"`  
**File**: `Dockerfile:84`  
**Impact**: All Docker containers are permanently marked unhealthy  
**Fix**: Change grep string  
**Effort**: 1 minute  
**Risk if deferred**: Docker deployment completely broken

### TD-004: `output: "standalone"` Missing
**Root Cause**: Dockerfile expects standalone Next.js output but next.config.ts doesn't set it  
**Impact**: Docker deployment fails (no server.js exists)  
**Fix**: Add `output: "standalone"` to nextConfig  
**Effort**: 5 minutes  
**Risk if deferred**: Docker deployment completely broken

---

## HIGH DEBT (Next Sprint)

### TD-005: Duplicate Migration Files
**Root Cause**: Multiple iterations of 0009 and 0010 left in migrations directory  
**Files**: `0009_enterprise_multitenant.sql`, `0009_enterprise_multitenant_fixed.sql`, `0009a_enum_roles.sql`, `0009b_enterprise_schema.sql`, `0010_crm_platform.sql`, `0010_crm_platform_fixed.sql`  
**Impact**: DBA confusion, risk of applying wrong migration  
**Fix**: Move `0009_*.sql` (non-fixed), `0009a`, `0009b`, `0010_crm_platform.sql` (non-fixed) to `supabase/migrations/archive/` with `DO_NOT_APPLY` in name  
**Effort**: 10 minutes  
**Risk**: Medium — a new team member could apply the wrong file

### TD-006: No `updateDocument` Action
**Root Cause**: Feature not implemented  
**Impact**: Users cannot correct knowledge base documents; old content cannot be updated  
**Fix**: Implement `updateDocument(id, data)` + re-ingest pipeline  
**Effort**: 6 hours  
**Risk**: Medium — data quality degrades over time

### TD-007: Stale Documentation (CURRENT_STATE.md, CI Release Summary)
**Root Cause**: Documentation not updated when tests expanded  
**Impact**: Developer confusion, wrong expectations  
**Files**: `.claude/CURRENT_STATE.md`, `.github/workflows/ci.yml` (Release summary hardcodes "29/29")  
**Fix**: Update docs and CI summary  
**Effort**: 20 minutes

### TD-008: `mammoth`/`pdf-parse`/`natural`/`chokidar`/`fast-glob` in Production Dependencies
**Root Cause**: Knowledge brain dependencies added to main package.json  
**Impact**: Larger Docker image, longer installs, potential cold start impact  
**Fix**: Move to `devDependencies` or separate `package.json`  
**Effort**: 30 minutes + verify no runtime imports

### TD-009: Sensitive Documents Committed to Repo
**Root Cause**: `knowledge/assets/raw/` contains real Arabic business PDFs  
**Impact**: Data leak risk if repo is shared/made public  
**Files**: Arabic financial invoices, HR salary documents, corporate registration  
**Fix**: Add `knowledge/assets/raw/` to `.gitignore`, remove from git history  
**Effort**: 2 hours (git filter-branch or git-filter-repo)  
**Risk**: HIGH if repo is shared

### TD-010: Sentry Deprecation Warnings
**Root Cause**: `disableLogger` and `automaticVercelMonitors` options deprecated  
**Impact**: Will become errors in next Sentry major version  
**Fix**: Replace with `webpack.treeshake.removeDebugLogging` and `webpack.automaticVercelMonitors`  
**Effort**: 30 minutes

---

## MEDIUM DEBT

### TD-011: `crm/actions.ts` Too Long (650+ lines)
**Root Cause**: All CRM mutations in one file  
**Impact**: Hard to navigate, test, and review  
**Fix**: Split into `contacts.ts`, `tags.ts`, `timeline.ts`, `activities.ts`  
**Effort**: 2 hours (refactor + update imports)

### TD-012: No Pagination Implementation
**Root Cause**: Not built yet  
**Impact**: Silent data truncation at scale; poor UX for power users  
**Fix**: Cursor-based pagination for CRM, KB, audit logs, team members  
**Effort**: 1 day

### TD-013: Usage Aggregation in JavaScript
**Root Cause**: Quick implementation  
**Files**: `dashboard/page.tsx:getUsageOverTime()`, `dashboard/page.tsx:getContactStatusBreakdown()`  
**Impact**: Fetches up to 7000 rows then aggregates in JS  
**Fix**: Add SQL functions for date-bucketed aggregation  
**Effort**: 2 hours

### TD-014: No Streaming RAG
**Root Cause**: Not implemented yet  
**Impact**: 5–15 second blocking wait for every query  
**Fix**: Implement streaming via Route Handler + ReadableStream  
**Effort**: 1 day

### TD-015: Rate Limiting via DB Count (not Redis)
**Root Cause**: No Redis available  
**Impact**: Every rate-limited request executes a DB COUNT query; at scale this adds latency and DB load  
**Fix**: Add Upstash Redis from Vercel Marketplace; use sliding window rate limiter  
**Effort**: 4 hours

### TD-016: `deleteContact` Backward-Compat Alias
**Root Cause**: API changed from hard-delete to soft-delete; old callers need alias  
**Impact**: Confusion about what delete does; dead code path  
**Fix**: Remove alias; update all callers to use `softDeleteContact` directly  
**Effort**: 30 minutes

---

## LOW DEBT

### TD-017: PWA Icons Missing
**Files**: `public/icon.png`, `public/icon-512.png`  
**Impact**: PWA install broken  
**Effort**: 1 hour (design + export)

### TD-018: Default Next.js Favicon
**File**: `src/app/favicon.ico`  
**Impact**: Unprofessional appearance  
**Effort**: 30 minutes

### TD-019: Scaffold SVGs in public/
**Files**: `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`  
**Impact**: Dead files, minor clutter  
**Effort**: 2 minutes

### TD-020: CI Release Summary Hardcodes Test Count
**File**: `.github/workflows/ci.yml` (Release summary)  
**Impact**: Incorrect reporting  
**Effort**: 5 minutes

### TD-021: .DS_Store Files Committed
**Files**: `.DS_Store` in root, `src/app/`, `src/lib/`, `docs/`, `knowledge/`, `supabase/`  
**Impact**: Noise in git history  
**Fix**: Add to `.gitignore` and `git rm --cached`  
**Effort**: 5 minutes

---

## Debt Summary

| Priority | Count | Total Effort |
|----------|-------|-------------|
| Critical | 4 | ~45 min |
| High | 6 | ~12 hours |
| Medium | 6 | ~3 days |
| Low | 5 | ~3 hours |
| **Total** | **21 items** | **~4 days** |
