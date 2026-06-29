// Next.js instrumentation hook — initialises the Sentry SDK on the server
// before any request handling begins. This file is automatically discovered
// by Next.js 15+; no configuration in next.config.ts is required.
//
// Sentry is initialised here (not in middleware or route handlers) so that
// SDK context is available for the entire request lifecycle.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
