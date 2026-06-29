import "server-only";

import type { HealthProvider, ProviderResult } from "../types";
import { isEnabled } from "../utils";

// Non-5xx response (including 401/403 for anon with no public bucket) means
// the Storage microservice is accepting connections. 5xx or timeout = outage.
// Feature flag: ENABLE_STORAGE_HEALTH=false to disable this provider.
export const storageProvider: HealthProvider = {
  name: "storage",
  critical: false,

  async check(signal: AbortSignal): Promise<ProviderResult> {
    if (!isEnabled("ENABLE_STORAGE_HEALTH")) {
      return { status: "disabled", latency_ms: 0 };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return { status: "misconfigured", latency_ms: 0 };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${url}/storage/v1/bucket`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal,
      });
      return {
        status: res.status < 500 ? "ok" : `error:${res.status}`,
        latency_ms: Date.now() - start,
      };
    } catch {
      return { status: "timeout", latency_ms: Date.now() - start };
    }
  },
};
