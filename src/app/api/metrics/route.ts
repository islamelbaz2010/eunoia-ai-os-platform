// Prometheus metrics endpoint.
//
// Returns process, memory, health-provider, and application metrics
// in Prometheus text exposition format (text/plain; version=0.0.4).
//
// Authentication:
//   If METRICS_TOKEN is set, Bearer token is required in the Authorization header.
//   If METRICS_TOKEN is not set, the endpoint is open (useful in local dev).
//
// Scrape interval:
//   Recommended: 15s — 30s (matches the /api/health readiness cache TTL).
//   Do NOT reduce below 10s — provider status is read from the in-memory ring
//   buffer and does not trigger live infrastructure checks.
//
// Note on counters:
//   health_checks_total and http_request_id counters reset on process restart.
//   This is expected behaviour for a single VPS / PM2 deployment.
//   For serverless / multi-instance deployments, use a Redis-backed counter.

import { NextResponse } from "next/server";
import { getHistory, getCheckStats } from "@/lib/health/report-history";

export const dynamic = "force-dynamic";

function metric(
  lines: string[],
  type: "gauge" | "counter",
  name: string,
  help: string,
  labelsAndValues: Array<{ labels?: Record<string, string>; value: number }>
): void {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);
  for (const { labels, value } of labelsAndValues) {
    if (labels && Object.keys(labels).length > 0) {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`${name}{${labelStr}} ${value}`);
    } else {
      lines.push(`${name} ${value}`);
    }
  }
  lines.push("");
}

export async function GET(request: Request): Promise<Response> {
  // ── Bearer token auth ────────────────────────────────────────────────────
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = request.headers.get("authorization");
    if (!auth || auth !== `Bearer ${token}`) {
      return new Response("Unauthorized\n", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  const lines: string[] = [];

  // ── Process uptime ───────────────────────────────────────────────────────
  metric(lines, "gauge", "process_uptime_seconds", "Number of seconds since the Node.js process started", [
    { value: Math.floor(process.uptime()) },
  ]);

  // ── Memory ───────────────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  metric(lines, "gauge", "process_memory_heap_used_bytes", "Heap memory in use", [
    { value: mem.heapUsed },
  ]);
  metric(lines, "gauge", "process_memory_heap_total_bytes", "Total heap memory allocated", [
    { value: mem.heapTotal },
  ]);
  metric(lines, "gauge", "process_memory_rss_bytes", "Resident set size", [
    { value: mem.rss },
  ]);
  metric(lines, "gauge", "process_memory_external_bytes", "Memory used by external C++ objects", [
    { value: mem.external },
  ]);
  metric(lines, "gauge", "process_memory_array_buffers_bytes", "ArrayBuffer and SharedArrayBuffer memory", [
    { value: mem.arrayBuffers },
  ]);

  // ── Application info ─────────────────────────────────────────────────────
  metric(
    lines,
    "gauge",
    "app_info",
    "Application information (always 1 — read labels for values)",
    [
      {
        labels: {
          version: process.env.BUILD_VERSION ?? "unknown",
          node_version: process.version,
          environment: process.env.NODE_ENV ?? "unknown",
        },
        value: 1,
      },
    ]
  );

  // ── Health provider status ───────────────────────────────────────────────
  // Source: latest entry in the in-memory ring buffer.
  // Does NOT trigger a live infrastructure check on every scrape.
  const history = getHistory();
  const latest = history.at(-1);

  if (latest) {
    const entries = Object.entries(latest.providers).map(([name, result]) => {
      // Map status string to a numeric value Prometheus can track.
      // 1 = ok / configured / disabled (non-failure states)
      // 0 = degraded / timeout / error / missing / misconfigured
      const isUp = ["ok", "configured", "disabled"].includes(result.status) ? 1 : 0;
      return {
        labels: { provider: name },
        value: isUp,
      };
    });
    if (entries.length > 0) {
      metric(
        lines,
        "gauge",
        "health_provider_up",
        "Whether a health provider check succeeded (1=ok, 0=degraded or error)",
        entries
      );
    }

    metric(
      lines,
      "gauge",
      "health_system_up",
      "Overall system health (1=healthy, 0=degraded)",
      [{ value: latest.healthy ? 1 : 0 }]
    );

    metric(
      lines,
      "gauge",
      "health_last_check_timestamp_seconds",
      "Unix timestamp of the last health check execution",
      [{ value: Math.floor(new Date(latest.checked_at).getTime() / 1000) }]
    );
  }

  // ── Health check counters ────────────────────────────────────────────────
  const stats = getCheckStats();
  metric(lines, "counter", "health_checks_total", "Total health checks executed since last restart", [
    { value: stats.total },
  ]);
  metric(lines, "counter", "health_checks_healthy_total", "Total healthy health checks since last restart", [
    { value: stats.healthy },
  ]);

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
