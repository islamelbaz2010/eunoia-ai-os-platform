// Health check type contracts.
// No `server-only` here — interfaces are compile-time only.
// Server-only enforcement lives in manager.ts and each provider.

// ── Status vocabulary ────────────────────────────────────────────────────────

export type CheckStatus =
  | "ok"
  | "configured"     // presence check passed (no live call made)
  | "disabled"       // provider not activated (feature flag / missing env var)
  | "degraded"
  | "timeout"
  | "misconfigured"  // required env vars absent
  | "missing"        // optional service key not set
  | `error:${number}`;

// ── Generic result ───────────────────────────────────────────────────────────

/**
 * Result returned by a single provider's check().
 *
 * TMetadata constrains the shape of optional metadata the provider may attach.
 * Use a concrete interface instead of `Record<string, unknown>` to avoid untyped
 * payloads. Providers with no metadata omit the field — TMetadata = never.
 *
 * @example
 *   // Typed metadata:
 *   ProviderResult<{ database: string; server_time: string }>
 *
 *   // No metadata:
 *   ProviderResult  // default TMetadata = Record<string, unknown>, metadata omitted
 */
export interface ProviderResult<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  status: CheckStatus;
  latency_ms: number;
  metadata?: TMetadata;
}

// ── Provider interface ───────────────────────────────────────────────────────

/**
 * Contract every health provider must implement.
 *
 * @param TMetadata - Shape of the optional metadata this provider attaches
 *                    to its ProviderResult. Define a specific interface rather
 *                    than leaving it as Record<string, unknown>.
 *
 * Adding a new provider:
 *   1. Create src/lib/health/providers/my-service.ts
 *   2. Implement this interface (plain object, no class needed)
 *   3. Export as `myServiceProvider`
 *   4. Register in src/lib/health/providers/index.ts
 *
 * @example
 *   interface MyMetadata { endpoint: string; version: string }
 *   export const myServiceProvider: HealthProvider<MyMetadata> = { ... }
 */
export interface HealthProvider<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly name: string;
  /** Failure of a critical provider flips the system to "degraded" / "not_ready". */
  readonly critical: boolean;
  check(signal: AbortSignal): Promise<ProviderResult<TMetadata>>;
}

// ── Aggregated report ────────────────────────────────────────────────────────

/**
 * Provider entry as stored in a HealthReport.
 * Metadata is widened to Record<string, unknown> since the report aggregates
 * results from providers with different TMetadata shapes.
 */
export type ReportProviderEntry = ProviderResult<Record<string, unknown>> & {
  critical: boolean;
};

export interface HealthReport {
  healthy: boolean;
  providers: Record<string, ReportProviderEntry>;
  checked_at: string;
}
