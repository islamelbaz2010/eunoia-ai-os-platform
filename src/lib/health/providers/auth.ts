import "server-only";

import type { HealthProvider, ProviderResult } from "../types";

interface AuthMetadata {
  error?: string;
  [key: string]: unknown;
}

// /auth/v1/settings is a genuinely public GoTrue endpoint — no auth required.
// Returns 200 with enabled provider config on any valid Supabase project.
export const authProvider: HealthProvider<AuthMetadata> = {
  name: "auth",
  critical: true,

  async check(signal: AbortSignal): Promise<ProviderResult<AuthMetadata>> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!url || !key) {
      return { status: "misconfigured", latency_ms: 0 };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        signal,
      });
      return {
        status: res.ok ? "ok" : `error:${res.status}`,
        latency_ms: Date.now() - start,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        status: "timeout",
        latency_ms: Date.now() - start,
        metadata: { error: msg.slice(0, 120) },
      };
    }
  },
};
