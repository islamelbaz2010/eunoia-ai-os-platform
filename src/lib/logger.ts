// Production structured JSON logger.
//
// ALL production code must use this logger — never console.log/warn/error directly.
// Output is newline-delimited JSON, parseable by any log aggregator
// (Sentry, Datadog, Logtail, CloudWatch, Grafana Loki, etc.).
//
// Log level hierarchy: trace(0) < debug(1) < info(2) < warn(3) < error(4) < fatal(5)
// Set LOG_LEVEL env var to control the minimum emitted level.
// Defaults: production=info  |  development=debug
//
// NEVER log: passwords, tokens, API keys, cookies, JWTs, session data, PII.
// sanitize() strips known sensitive key names from all context objects.

import type { LogContext, LogLevel } from "@/lib/logger/types";
import { LOG_LEVELS } from "@/lib/logger/types";

// ── Sensitive field sanitisation ─────────────────────────────────────────────

const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = new Set([
  "password", "passwd", "token", "access_token", "refresh_token", "id_token",
  "api_key", "apikey", "secret", "private_key", "auth", "authorization",
  "cookie", "cookies", "jwt", "credential", "credentials",
  "x-api-key", "x-supabase-key", "service_role_key", "anon_key",
  "resend_api_key", "openai_api_key",
  "ssn", "credit_card", "card_number", "cvv", "pin",
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitize(v, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : sanitize(val, depth + 1);
  }
  return result;
}

// ── Log level control ────────────────────────────────────────────────────────

function resolveMinLevel(): number {
  const envLevel = (process.env.LOG_LEVEL ?? "").toLowerCase() as LogLevel;
  if (envLevel in LOG_LEVELS) return LOG_LEVELS[envLevel];
  return process.env.NODE_ENV === "production" ? LOG_LEVELS.info : LOG_LEVELS.debug;
}

// Resolved once at module load. Changing LOG_LEVEL at runtime has no effect.
const MIN_LEVEL = resolveMinLevel();

// ── Core write function ──────────────────────────────────────────────────────

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry = JSON.stringify({
    level,
    message,
    ts: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    build_version: process.env.BUILD_VERSION,
    ...(context ? (sanitize(context) as LogContext) : {}),
  });

  // Route to the correct console method so log aggregators apply proper severity.
  // The logger IS the abstraction — using console here is intentional output routing.
  if (level === "error" || level === "fatal") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

// ── Public API ───────────────────────────────────────────────────────────────
//
// Backward-compatible with the previous logger.ts API.
// Optionally pass a LogContext for structured enrichment:
//
//   logger.info("Contact created", { user_id, organization_id, contact_id });
//
// To include X-Request-ID from a Server Action or route handler:
//   import { headers } from "next/headers";
//   const requestId = (await headers()).get("x-request-id") ?? undefined;
//   logger.info("Action called", { request_id: requestId });

export const logger = {
  /** Finest-grained: internal state, loop iterations. Suppressed above debug level. */
  trace: (message: string, context?: LogContext) => write("trace", message, context),

  /** Developer diagnostics: variable values, branch paths. Off in production. */
  debug: (message: string, context?: LogContext) => write("debug", message, context),

  /** Normal operational events: requests, user actions, background tasks. */
  info: (message: string, context?: LogContext) => write("info", message, context),

  /** Unexpected but recoverable: retries, degraded mode, missing optional config. */
  warn: (message: string, context?: LogContext) => write("warn", message, context),

  /** Errors affecting one request/operation; process continues. */
  error: (message: string, context?: LogContext) => write("error", message, context),

  /** Process-level failure; unrecoverable. Usually followed by process exit. */
  fatal: (message: string, context?: LogContext) => write("fatal", message, context),
};

// Re-export types for callers that want to type their context objects.
export type { LogContext, LogLevel } from "@/lib/logger/types";
