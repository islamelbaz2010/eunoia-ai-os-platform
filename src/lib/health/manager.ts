import "server-only";

import type { HealthProvider, HealthReport, ReportProviderEntry } from "./types";

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Isolates a single provider execution.
 *
 * Providers should catch their own errors and never reject — but this wrapper
 * is the final safety net. An unexpected throw from provider.check() is caught
 * here and converted to a "timeout" result rather than propagating to
 * Promise.allSettled's rejected branch. This makes the isolation guarantee
 * explicit rather than relying on implicit Promise.allSettled behaviour.
 */
async function safeCheck(
  provider: HealthProvider,
  signal: AbortSignal
): Promise<{ name: string; entry: ReportProviderEntry }> {
  const start = Date.now();
  try {
    const result = await provider.check(signal);
    return {
      name: provider.name,
      entry: { ...result, critical: provider.critical },
    };
  } catch {
    return {
      name: provider.name,
      entry: { status: "timeout", latency_ms: Date.now() - start, critical: provider.critical },
    };
  }
}

/**
 * Runs all providers in parallel under a shared AbortController timeout.
 *
 * Promise.allSettled semantics guarantee every provider executes to completion
 * (or times out) regardless of what other providers do. A single provider
 * failing, throwing, or timing out NEVER prevents the remaining providers
 * from executing — this is the core reliability guarantee of the framework.
 *
 * Execution path:
 *   1. All safeCheck() calls start simultaneously (parallel, not sequential).
 *   2. The shared AbortController fires after timeoutMs — providers that
 *      respect the signal will abort; those that don't are left to settle.
 *   3. Promise.allSettled collects all outcomes.
 *   4. For each outcome: fulfilled → record entry; rejected (safeCheck bug)
 *      → fallback timeout entry (defensive dead-code branch).
 *   5. healthy=false if any critical provider has status !== "ok".
 *
 * Adding a new provider:
 *   Register in src/lib/health/providers/index.ts — no changes needed here.
 */
export async function runHealthCheck(
  providers: HealthProvider[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HealthReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const checkedAt = new Date().toISOString();

  try {
    const settled = await Promise.allSettled(
      providers.map((p) => safeCheck(p, controller.signal))
    );

    const providerResults: Record<string, ReportProviderEntry> = {};
    let healthy = true;

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      const provider = providers[i];

      if (outcome.status === "fulfilled") {
        const { name, entry } = outcome.value;
        providerResults[name] = entry;
        if (entry.critical && entry.status !== "ok") {
          healthy = false;
        }
      } else {
        // safeCheck() itself threw — should be impossible, but handled defensively.
        providerResults[provider.name] = {
          status: "timeout",
          latency_ms: timeoutMs,
          critical: provider.critical,
        };
        if (provider.critical) healthy = false;
      }
    }

    return { healthy, providers: providerResults, checked_at: checkedAt };
  } finally {
    clearTimeout(timer);
  }
}
