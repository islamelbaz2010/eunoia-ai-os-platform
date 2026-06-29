import "server-only";

import type { HealthReport } from "./types";

// 30-second TTL — balances poll frequency against infrastructure probe cost.
// PM2/VPS: single process, cache is shared across all requests.
// Vercel/K8s: each instance has its own cache; no cross-pod sharing (acceptable).
const TTL_MS = 30_000;

interface CacheEntry {
  report: HealthReport;
  cachedAt: number;
  expiresAt: number;
}

let entry: CacheEntry | null = null;

export function getCachedReport(): { report: HealthReport; ageMs: number } | null {
  if (!entry || Date.now() > entry.expiresAt) return null;
  return { report: entry.report, ageMs: Date.now() - entry.cachedAt };
}

export function setCachedReport(report: HealthReport): void {
  const now = Date.now();
  entry = { report, cachedAt: now, expiresAt: now + TTL_MS };
}
