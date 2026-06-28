import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase connectivity — ping the REST API with the anon key.
  // RLS will return 0 rows for anon, but a 200 response confirms
  // that PostgREST is reachable and the API key is accepted.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      checks.db = "misconfigured";
    } else {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/organizations?select=id&limit=0`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          signal: AbortSignal.timeout(3000),
        }
      );
      checks.db = res.ok ? "ok" : `error:${res.status}`;
    }
  } catch {
    checks.db = "unreachable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", ts: Date.now(), checks },
    { status: allOk ? 200 : 503 }
  );
}
