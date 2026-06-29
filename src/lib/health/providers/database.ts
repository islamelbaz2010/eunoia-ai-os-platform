import "server-only";

import type { HealthProvider, ProviderResult } from "../types";

// Calls public.healthcheck() via PostgREST RPC.
// Verifies: PostgreSQL is accepting connections, PostgREST is running, anon key is valid.
// The function (migration 0008) uses SECURITY INVOKER and touches no business table.

// Typed metadata — confirmed fields returned by public.healthcheck() JSONB.
// The index signature satisfies Record<string, unknown> while preserving named-property types.
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

      if (!res.ok) {
        return { status: `error:${res.status}`, latency_ms };
      }

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
    } catch {
      return { status: "timeout", latency_ms: Date.now() - start };
    }
  },
};
