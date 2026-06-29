// Server-side request context via AsyncLocalStorage.
// Use this to propagate tracing IDs through background jobs, cron tasks,
// and any code that runs outside a normal HTTP request lifecycle.
//
// For in-request code (Server Components, Server Actions):
//   import { headers } from "next/headers";
//   const requestId = (await headers()).get("x-request-id");
//   — this is the primary mechanism for request-scoped tracing.
//
// For non-request code (startup tasks, queue consumers):
//   import { withRequestContext } from "@/lib/logger/context";
//   withRequestContext({ request_id: "job-123" }, async () => { ... });

import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { LogContext } from "./types";

export type RequestContext = Pick<
  LogContext,
  "request_id" | "user_id" | "organization_id" | "session_id" | "correlation_id" | "trace_id" | "route" | "method"
>;

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs fn() with the given context bound to the current async chain.
 * All logger calls inside fn() (and anything it awaits) can read this context
 * via getRequestContext().
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/**
 * Returns the current request context for this async chain, or {} if none is set.
 * Useful for background jobs that call withRequestContext() at the entry point.
 */
export function getRequestContext(): RequestContext {
  return storage.getStore() ?? {};
}

/**
 * Merges additional fields into the current context (in-place mutation).
 * Useful for adding user_id / organization_id after authentication completes.
 */
export function enrichRequestContext(partial: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, partial);
}
