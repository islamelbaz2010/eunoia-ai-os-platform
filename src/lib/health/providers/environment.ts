import "server-only";

import type { HealthProvider, ProviderResult } from "../types";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
];

// Typed metadata — the list of which required variables are absent.
// The index signature satisfies Record<string, unknown> while preserving named-property types.
interface EnvironmentMetadata {
  missing: string[];
  [key: string]: unknown;
}

export const environmentProvider: HealthProvider<EnvironmentMetadata> = {
  name: "environment",
  critical: true,

  async check(_signal: AbortSignal): Promise<ProviderResult<EnvironmentMetadata>> {
    const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
    return {
      status: missing.length === 0 ? "ok" : "misconfigured",
      latency_ms: 0,
      metadata: missing.length > 0 ? { missing } : undefined,
    };
  },
};
