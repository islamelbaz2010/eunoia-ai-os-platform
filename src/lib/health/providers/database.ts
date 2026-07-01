import "server-only";

import type { HealthProvider, ProviderResult } from "../types";

// Calls public.healthcheck() via PostgREST RPC.
// Verifies: PostgreSQL is accepting connections, PostgREST is running, anon key is valid.
// Falls back gracefully when the function isn't deployed yet (migration 0008 pending).

interface DatabaseMetadata {
  database: string | undefined;
  server_time: string | undefined;
  error?: string;
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

      // 404 PGRST202 = PostgREST is up + DB is connected, but the function
      // isn't deployed yet (migration 0008 pending).
      if (res.status === 404) {
        const body = (await res.json().catch(() => ({}))) as { code?: string };
        if (body.code === "PGRST202") {
          return {
            status: "ok",
            latency_ms,
            metadata: { database: undefined, server_time: undefined },
          };
        }
      }

      return { status: `error:${res.status}`, latency_ms };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        status: `error:${msg.slice(0, 60)}`,
        latency_ms: Date.now() - start,
        metadata: { database: undefined, server_time: undefined, error: msg },
      };
    }
  },
};
