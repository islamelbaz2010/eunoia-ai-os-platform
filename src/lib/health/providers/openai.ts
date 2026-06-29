import "server-only";

import type { HealthProvider, ProviderResult } from "../types";
import { isEnabled } from "../utils";

// Presence check only. Never call the OpenAI API from a health endpoint —
// that consumes quota, adds latency, and would fail on rate limits.
// Feature flag: ENABLE_OPENAI_HEALTH=false to disable this provider.
export const openAIProvider: HealthProvider = {
  name: "openai",
  critical: false,

  async check(_signal: AbortSignal): Promise<ProviderResult> {
    if (!isEnabled("ENABLE_OPENAI_HEALTH")) {
      return { status: "disabled", latency_ms: 0 };
    }
    return {
      status: process.env.OPENAI_API_KEY ? "configured" : "missing",
      latency_ms: 0,
    };
  },
};
