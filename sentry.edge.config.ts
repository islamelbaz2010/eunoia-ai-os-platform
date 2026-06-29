// Sentry Edge Runtime SDK initialisation.
// Loaded via src/instrumentation.ts when NEXT_RUNTIME === "edge".
// proxy.ts runs in Edge Runtime on Vercel — errors here propagate to this config.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: process.env.BUILD_VERSION,
  environment: process.env.NODE_ENV,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Lower sample rate for edge — higher volume and lower value per trace.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
});
