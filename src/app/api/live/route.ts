// Liveness probe — answers: "is this Node.js process alive?"
//
// Maps to Kubernetes livenessProbe. A failure here means the container
// should be restarted. A 200 response means the Next.js runtime is functional.
//
// Contract:
//   200  → process is alive; runtime is handling requests
//   5xx  → Next.js itself could not load this module (catastrophic failure)
//
// Makes NO external calls. Response time is always sub-millisecond.
// Safe for any polling interval (K8s every 5s, uptime monitors every 30s).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
