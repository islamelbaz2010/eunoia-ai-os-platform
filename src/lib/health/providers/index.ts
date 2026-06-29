import "server-only";

import type { HealthProvider } from "../types";
import { environmentProvider } from "./environment";
import { databaseProvider } from "./database";
import { authProvider } from "./auth";
import { storageProvider } from "./storage";
import { openAIProvider } from "./openai";
import { emailProvider } from "./email";
import { cacheProvider } from "./cache";
import { queueProvider } from "./queue";

/**
 * Canonical provider registry — the single place where providers are registered.
 * Both /api/health (readiness) and /api/admin/system (diagnostics) import this.
 *
 * ── Adding a new provider ───────────────────────────────────────────────────
 *
 *   1. Create  src/lib/health/providers/my-service.ts
 *      Implement HealthProvider<TMetadata> (or HealthProvider if no typed metadata).
 *      Export as `myServiceProvider`.
 *
 *   2. Add a feature flag guard inside check() if the service is optional:
 *        if (!isEnabled("ENABLE_MY_SERVICE_HEALTH")) return { status: "disabled", ... }
 *      Import isEnabled from "../utils".
 *
 *   3. Import the provider here and add it to HEALTH_PROVIDERS below.
 *      That's it — no changes needed in manager.ts or the route handlers.
 *
 * ── Provider array contract ─────────────────────────────────────────────────
 *
 *   - critical: true  → failure sets the system to "not_ready" / "degraded"
 *   - critical: false → failure is recorded but does not affect overall health
 *   - Order determines the order in diagnostic output; execution is always parallel
 *
 * ── Adding an alerting channel ──────────────────────────────────────────────
 *
 *   Implement AlertProvider (src/lib/health/alert-provider.ts) in a new file
 *   under src/lib/health/alerts/<channel>.ts, then register it in a separate
 *   ALERT_PROVIDERS array and pass it to a future dispatchAlerts() call from
 *   the route handlers after runHealthCheck() returns.
 */
export const HEALTH_PROVIDERS: HealthProvider[] = [
  environmentProvider,  // critical — required env vars
  databaseProvider,     // critical — PostgreSQL + PostgREST via public.healthcheck()
  authProvider,         // critical — GoTrue Auth service
  storageProvider,      // non-critical — degrades file upload/download only   (ENABLE_STORAGE_HEALTH)
  openAIProvider,       // non-critical — degrades RAG assistant only           (ENABLE_OPENAI_HEALTH)
  emailProvider,        // non-critical — degrades invite emails only           (ENABLE_EMAIL_HEALTH)
  cacheProvider,        // non-critical — disabled until REDIS_URL set          (ENABLE_CACHE_HEALTH)
  queueProvider,        // non-critical — disabled until QUEUE_REDIS_URL set    (ENABLE_QUEUE_HEALTH)
];
