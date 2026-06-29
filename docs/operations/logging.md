# Structured Logging — Operations Guide

Eunoia AI OS uses a production-grade JSON structured logger at `src/lib/logger.ts`. All log output is newline-delimited JSON, parseable by any log aggregator.

---

## Architecture

```
src/lib/logger.ts          ← Main logger (universal — server + client)
src/lib/logger/types.ts    ← LogLevel, LogContext types
src/lib/logger/context.ts  ← Server-only AsyncLocalStorage for non-request contexts
```

**RULE**: All production code must use `logger.*` — never `console.log/warn/error` directly.

---

## Log Levels

| Level | Value | When to use |
|-------|-------|-------------|
| `trace` | 0 | Finest-grained: loop iterations, internal state |
| `debug` | 1 | Developer diagnostics: variable values, branch paths |
| `info` | 2 | Normal operational events: requests, user actions |
| `warn` | 3 | Unexpected but recoverable: retries, degraded mode |
| `error` | 4 | Errors affecting one request; process continues |
| `fatal` | 5 | Process-level failures; unrecoverable |

**Defaults**: Production = `info` (2). Development = `debug` (1).

Set `LOG_LEVEL=trace` in `.env.local` for maximum verbosity during debugging.

---

## Log Entry Format

Every log entry is a single-line JSON object:

```json
{
  "level": "info",
  "message": "Contact created",
  "ts": "2026-06-29T10:30:00.000Z",
  "environment": "production",
  "build_version": "0.1.0",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "organization_id": "org_456",
  "contact_id": "contact_789",
  "duration": 45
}
```

### Standard Fields

| Field | Type | Source |
|-------|------|--------|
| `level` | string | Log method called |
| `message` | string | First argument |
| `ts` | ISO 8601 | Automatic |
| `environment` | string | `NODE_ENV` |
| `build_version` | string | `BUILD_VERSION` |
| `request_id` | string | `X-Request-ID` header (set in proxy.ts) |
| `correlation_id` | string | Caller-provided |
| `trace_id` | string | Caller-provided (Sentry/OpenTelemetry) |
| `user_id` | string | After `verifySession()` |
| `organization_id` | string | After `verifySession()` |
| `session_id` | string | Caller-provided |
| `route` | string | API path |
| `method` | string | HTTP method |
| `status_code` | number | Response status |
| `duration` | number | Milliseconds |

---

## Usage

```typescript
import { logger } from "@/lib/logger";

// Basic usage
logger.info("User logged in");

// With context
logger.info("Contact created", {
  user_id: session.userId,
  organization_id: session.organizationId,
  contact_id: newContact.id,
  duration: Date.now() - start,
});

// Error with context
logger.error("Database query failed", {
  error: err instanceof Error ? err.message : String(err),
  query: "select_contacts",
  organization_id: session.organizationId,
});

// Warning for degraded state
logger.warn("OpenAI rate limited — RAG query degraded", {
  user_id: session.userId,
  retry_after: "60s",
});

// Fatal — process cannot continue
logger.fatal("Environment variable NEXT_PUBLIC_SUPABASE_URL missing", {
  environment: process.env.NODE_ENV,
});
```

### Including X-Request-ID in Server Actions

```typescript
import { logger } from "@/lib/logger";
import { headers } from "next/headers";

export async function myServerAction() {
  const requestId = (await headers()).get("x-request-id") ?? undefined;
  
  logger.info("Action started", { request_id: requestId });
  // ... action logic
  logger.info("Action completed", { request_id: requestId, duration: ms });
}
```

The `X-Request-ID` is generated (or forwarded) by `proxy.ts` for every request and is readable via `headers()` from `next/headers` in any Server Component or Server Action.

### Non-Request Context (Background Jobs)

```typescript
import { withRequestContext } from "@/lib/logger/context";
import { logger } from "@/lib/logger";
import { randomUUID } from "node:crypto";

await withRequestContext(
  { request_id: `job-${randomUUID()}`, route: "/cron/daily-summary" },
  async () => {
    logger.info("Cron job started");
    // ... job logic — all logger calls will have request_id
  }
);
```

---

## What NEVER to Log

The `sanitize()` function in `logger.ts` automatically redacts these key names:

| Redacted Keys |
|---------------|
| `password`, `passwd` |
| `token`, `access_token`, `refresh_token`, `id_token` |
| `api_key`, `apikey`, `secret`, `private_key` |
| `auth`, `authorization` |
| `cookie`, `cookies` |
| `jwt`, `credential`, `credentials` |
| `x-api-key`, `x-supabase-key` |
| `service_role_key`, `anon_key` |
| `resend_api_key`, `openai_api_key` |
| `ssn`, `credit_card`, `card_number`, `cvv`, `pin` |

**Never** include user emails, phone numbers, addresses, or other PII in log context, even if the key name isn't in the list above.

---

## Log Aggregation

### Vercel

Vercel captures `console.log/error/warn` output automatically. Logs are available in the Vercel dashboard and can be streamed to external services.

### Self-hosted (PM2 / VPS)

PM2 captures stdout/stderr to log files:
```
~/.pm2/logs/eunoia-out.log   # all console.log output
~/.pm2/logs/eunoia-error.log # console.error output
```

Parse with `jq`:
```bash
tail -f ~/.pm2/logs/eunoia-out.log | jq .
tail -f ~/.pm2/logs/eunoia-error.log | jq 'select(.level == "error")'
```

### Grafana Loki

To ship logs to Loki, pipe PM2 log output through Promtail or configure Loki's `alloy` agent to tail the PM2 log files:

```yaml
# /etc/alloy/config.alloy
local.file_match "pm2_logs" {
  path_targets = [{"__path__" = "/home/ubuntu/.pm2/logs/*.log"}]
}

loki.source.file "pm2" {
  targets    = local.file_match.pm2_logs.targets
  forward_to = [loki.write.default.receiver]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Minimum log level to emit |

---

## Performance

The logger is synchronous and writes to `stdout`/`stderr`. JSON serialisation of a typical log entry takes ~1–5μs. This is negligible for all practical use cases.

The `sanitize()` function does a depth-limited object traversal (max depth 6). For very large context objects, avoid passing entire database rows — log only the fields needed for diagnosis.
