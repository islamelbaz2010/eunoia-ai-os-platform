import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health/manager";
import { HEALTH_PROVIDERS } from "@/lib/health/providers/index";

export const dynamic = "force-dynamic";

// TEMPORARY debug endpoint — remove after production diagnosis
export async function GET() {
  const report = await runHealthCheck(HEALTH_PROVIDERS);
  return NextResponse.json(report);
}
