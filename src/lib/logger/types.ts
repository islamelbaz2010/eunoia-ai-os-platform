// Shared types for the structured logging system.
// Importable from both server and client code — no "server-only" guard here.

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/** Fields that may appear in any structured log entry. */
export interface LogContext {
  // Request tracing
  request_id?: string;
  correlation_id?: string;
  trace_id?: string;

  // Auth context (set explicitly by callers after verifySession)
  user_id?: string;
  organization_id?: string;
  session_id?: string;

  // HTTP context
  route?: string;
  method?: string;
  status_code?: number;
  duration?: number;

  // Arbitrary additional fields (must not contain secrets — enforced by sanitize())
  [key: string]: unknown;
}
