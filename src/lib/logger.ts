// Structured JSON logger — output is captured by Vercel runtime logs
// and is parseable by any log aggregator (Sentry, Datadog, Logtail, etc.).
// Keep all messages under 512 chars per line to avoid Vercel log truncation.

type LogLevel = "error" | "warn" | "info" | "debug";
type LogContext = Record<string, unknown>;

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = JSON.stringify({
    level,
    message,
    ts: new Date().toISOString(),
    ...context,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const logger = {
  error: (message: string, context?: LogContext) => write("error", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  info: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== "production") write("info", message, context);
  },
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") write("debug", message, context);
  },
};
