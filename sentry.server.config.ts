// Sentry Node.js server-side SDK initialisation.
// Loaded via src/instrumentation.ts when NEXT_RUNTIME === "nodejs".

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: process.env.BUILD_VERSION,
  environment: process.env.NODE_ENV,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  // 10 % trace sampling in production keeps Sentry costs predictable.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Do not capture sensitive request data automatically.
  // Individual error boundaries and Server Actions may attach safe context manually.
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["x-supabase-key"];
    }
    // Never log query strings that might contain tokens.
    if (event.request) {
      delete event.request.query_string;
    }
    return event;
  },
});
