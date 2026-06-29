// Readiness probe — answers: "is this instance ready to serve application traffic?"
//
// Maps to Kubernetes readinessProbe. A failure removes this instance from the
// load balancer pool without triggering a container restart.
//
// Makes live infrastructure checks (DB, Auth, Storage) via the provider framework.
// Results are cached for 30s to protect downstream services from polling pressure.
//
// Response shape is intentionally minimal — no provider details, no internal metrics.
// Those live at GET /api/admin/system (authenticated).
// Safe for public uptime monitors: exposes only readiness state + version.
//
// Cache behaviour:
//   HIT  (healthy)   → Cache-Control: public, max-age=30  (CDN may cache)
//   MISS (healthy)   → Cache-Control: public, max-age=30  (CDN may cache)
//   any  (not_ready) → Cache-Control: no-store           (never cache failures)

import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health/manager";
import { getCachedReport, setCachedReport } from "@/lib/health/readiness-cache";
import { recordReport } from "@/lib/health/report-history";
import { HEALTH_PROVIDERS } from "@/lib/health/providers/index";

export const dynamic = "force-dynamic";

const HEALTHY_CACHE_CONTROL = "public, max-age=30, s-maxage=30";
const UNHEALTHY_CACHE_CONTROL = "no-store";

export async function GET() {
  const cached = getCachedReport();

  if (cached) {
    const cacheControl = cached.report.healthy
      ? HEALTHY_CACHE_CONTROL
      : UNHEALTHY_CACHE_CONTROL;

    return NextResponse.json(
      {
        status: cached.report.healthy ? "ready" : "not_ready",
        version: process.env.BUILD_VERSION ?? "unknown",
        timestamp: new Date().toISOString(),
      },
      {
        status: cached.report.healthy ? 200 : 503,
        headers: {
          "Cache-Control": cacheControl,
          "X-Cache": "HIT",
          "X-Cache-Age": String(cached.ageMs),
        },
      }
    );
  }

  const report = await runHealthCheck(HEALTH_PROVIDERS);
  setCachedReport(report);
  recordReport(report); // cache MISS only — history tracks executions, not served responses

  const cacheControl = report.healthy
    ? HEALTHY_CACHE_CONTROL
    : UNHEALTHY_CACHE_CONTROL;

  return NextResponse.json(
    {
      status: report.healthy ? "ready" : "not_ready",
      version: process.env.BUILD_VERSION ?? "unknown",
      timestamp: new Date().toISOString(),
    },
    {
      status: report.healthy ? 200 : 503,
      headers: {
        "Cache-Control": cacheControl,
        "X-Cache": "MISS",
        "X-Cache-Age": "0",
      },
    }
  );
}
