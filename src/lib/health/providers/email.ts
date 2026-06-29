import "server-only";

import type { HealthProvider, ProviderResult } from "../types";
import { isEnabled } from "../utils";

// Presence check only. Never call the Resend API from a health endpoint —
// email delivery is non-critical and degrades silently when the key is absent.
// Feature flag: ENABLE_EMAIL_HEALTH=false to disable this provider.
export const emailProvider: HealthProvider = {
  name: "email",
  critical: false,

  async check(_signal: AbortSignal): Promise<ProviderResult> {
    if (!isEnabled("ENABLE_EMAIL_HEALTH")) {
      return { status: "disabled", latency_ms: 0 };
    }
    return {
      status: process.env.RESEND_API_KEY ? "configured" : "missing",
      latency_ms: 0,
    };
  },
};
