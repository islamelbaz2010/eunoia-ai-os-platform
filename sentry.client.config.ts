// Sentry browser / client-side SDK initialisation.
// Loaded automatically by Next.js when NEXT_PUBLIC_SENTRY_DSN is set.
// Keep this file lean — it is bundled into the client JavaScript.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Freeze the release to the version baked at build time.
  release: process.env.BUILD_VERSION,

  environment: process.env.NODE_ENV,

  // Disabled entirely when DSN is absent (dev without Sentry configured).
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10 % trace sampling in production; 100 % in dev for easy debugging.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replays disabled — no PII risk from DOM snapshots.
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,

  // Strip sensitive headers from captured events before they leave the browser.
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
    }
    return event;
  },
});
