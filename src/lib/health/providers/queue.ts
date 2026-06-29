import "server-only";

import type { HealthProvider, ProviderResult } from "../types";
import { isEnabled } from "../utils";

// Background job queue health provider (BullMQ, Inngest, etc.).
// Disabled until QUEUE_REDIS_URL is added to the environment.
// Feature flag: ENABLE_QUEUE_HEALTH=false to suppress even when QUEUE_REDIS_URL is set.
//
// To activate: add QUEUE_REDIS_URL, install the matching queue client,
// and implement a check for: queue reachable, worker count > 0, DLQ depth in bounds.
export const queueProvider: HealthProvider = {
  name: "queue",
  critical: false,

  async check(_signal: AbortSignal): Promise<ProviderResult> {
    if (!isEnabled("ENABLE_QUEUE_HEALTH") || !process.env.QUEUE_REDIS_URL) {
      return { status: "disabled", latency_ms: 0 };
    }

    // Stub — implement queue health check here once a queue is added to the stack.
    return { status: "disabled", latency_ms: 0 };
  },
};
