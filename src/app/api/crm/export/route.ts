import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySession, getActiveMemberships } from "@/lib/auth/dal";
import { logger } from "@/lib/logger";

function escapeCSV(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifySession();
    const memberships = await getActiveMemberships();

    const orgId = req.nextUrl.searchParams.get("org");
    if (!orgId) return NextResponse.json({ error: "Missing org parameter." }, { status: 400 });

    const isMember = memberships.some(m => m.organization.id === orgId);
    if (!isMember) return NextResponse.json({ error: "Access denied." }, { status: 403 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("full_name, email, phone, company, website, linkedin_url, status, pipeline_stage, source, notes, created_at")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      logger.error("[crm/export] Query error", { error: String(error) });
      return NextResponse.json({ error: "Export failed." }, { status: 500 });
    }

    const headers = ["full_name","email","phone","company","website","linkedin_url","status","pipeline_stage","source","notes","created_at"];
    const csvLines = [
      headers.join(","),
      ...(data ?? []).map(row =>
        headers.map(h => escapeCSV((row as Record<string, unknown>)[h] as string | null)).join(",")
      ),
    ];

    const csv = csvLines.join("\n");
    const filename = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    logger.error("[crm/export] Error", { error: String(e) });
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
