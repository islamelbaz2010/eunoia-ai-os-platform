// Authenticated diagnostics — answers: "what is the exact state of every dependency?"
//
// Requires a valid Supabase session. Returns 401 JSON for unauthenticated callers.
// Exposes full infrastructure detail: per-provider status + latency + metadata,
// memory metrics, process uptime, Node version, build version, and check history.
//
// Never cached — always fresh for operational decisions.
// Use this endpoint for: internal dashboards, ops alerting, incident investigation.
//
// Kubernetes note: use /api/live for liveness and /api/health for readiness.
// This endpoint is for humans and monitoring tools, not for automated probes.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runHealthCheck } from "@/lib/health/manager";
import { recordReport, getHistory } from "@/lib/health/report-history";
import { HEALTH_PROVIDERS } from "@/lib/health/providers/index";

export const dynamic = "force-dynamic";

// Derived once per process start — stable across requests within the same instance.
const PROCESS_STARTED_AT = new Date(Date.now() - process.uptime() * 1000).toISOString();

export async function GET() {
  const start = Date.now();

  // Auth check — return 401 JSON, not a browser redirect.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always run a fresh check — admin diagnostics must never serve cached data.
  const report = await runHealthCheck(HEALTH_PROVIDERS);
  recordReport(report);

  const mem = process.memoryUsage();

  return NextResponse.json(
    {
      status: report.healthy ? "healthy" : "degraded",
      version: process.env.BUILD_VERSION ?? "unknown",
      environment: process.env.NODE_ENV ?? "unknown",
      timestamp: new Date().toISOString(),
      started_at: PROCESS_STARTED_AT,
      uptime_s: Math.floor(process.uptime()),
      node: process.version,
      latency_ms: Date.now() - start,
      memory: {
        heap_used_mb: Math.round(mem.heapUsed / 1_048_576),
        heap_total_mb: Math.round(mem.heapTotal / 1_048_576),
        rss_mb: Math.round(mem.rss / 1_048_576),
        external_mb: Math.round(mem.external / 1_048_576),
        array_buffers_mb: Math.round(mem.arrayBuffers / 1_048_576),
      },
      providers: report.providers,
      history: getHistory(),
    },
    {
      status: report.healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
