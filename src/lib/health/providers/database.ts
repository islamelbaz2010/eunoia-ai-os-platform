import "server-only";

import type { HealthProvider, ProviderResult } from "../types";

// Calls public.healthcheck() via PostgREST RPC.
// Verifies: PostgreSQL is accepting connections, PostgREST is running, anon key is valid.
// Falls back to checking the PostgREST root if the function doesn't exist yet
// (i.e., before migration 0008 has been applied in production).

interface DatabaseMetadata {
  database: string | undefined;
  server_time: string | undefined;
  [key: string]: unknown;
}

export const databaseProvider: HealthProvider<DatabaseMetadata> = {
  name: "database",
  critical: true,

  async check(signal: AbortSignal): Promise<ProviderResult<DatabaseMetadata>> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return { status: "misconfigured", latency_ms: 0 };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${url}/rest/v1/rpc/healthcheck`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal,
      });

      const latency_ms = Date.now() - start;

      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          server_time?: string;
          database?: string;
        };
        return {
          status: "ok",
          latency_ms,
          metadata: {
            database: data.database,
            server_time: data.server_time,
          },
        };
      }

      // 404 means the healthcheck() function isn't deployed yet (migration 0008 pending).
      // Fall back to verifying PostgREST is up via its root endpoint.
      if (res.status === 404) {
        return await postgrestFallback(url, key, signal);
      }

      return { status: `error:${res.status}`, latency_ms };
    } catch {
      return { status: "timeout", latency_ms: Date.now() - start };
    }
  },
};

async function postgrestFallback(
  url: string,
  key: string,
  signal: AbortSignal
): Promise<ProviderResult<DatabaseMetadata>> {
  const start = Date.now();
  try {
    // GET /rest/v1/ returns the OpenAPI schema — proves PostgREST + DB are live.
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal,
    });
    return {
      status: res.ok ? "ok" : `error:${res.status}`,
      latency_ms: Date.now() - start,
      metadata: { database: undefined, server_time: undefined },
    };
  } catch {
    return { status: "timeout", latency_ms: Date.now() - start };
  }
}
