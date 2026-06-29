import "server-only";

import type { HealthProvider, ProviderResult } from "../types";
import { isEnabled } from "../utils";

// Redis / Upstash cache health provider.
// Disabled until REDIS_URL is added to the environment.
// Feature flag: ENABLE_CACHE_HEALTH=false to suppress even when REDIS_URL is set.
//
// To activate: add REDIS_URL, install a Redis client (ioredis or @upstash/redis),
// and replace the stub body with a real PING check.
export const cacheProvider: HealthProvider = {
  name: "cache",
  critical: false,

  async check(_signal: AbortSignal): Promise<ProviderResult> {
    if (!isEnabled("ENABLE_CACHE_HEALTH") || !process.env.REDIS_URL) {
      return { status: "disabled", latency_ms: 0 };
    }

    // Stub — implement Redis PING here once Redis is added to the stack.
    return { status: "disabled", latency_ms: 0 };
  },
};
