import "server-only";

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifySession, getActiveMemberships } from "@/lib/auth/dal";
import { logAuditEvent } from "@/lib/auth/audit";
import { logger } from "@/lib/logger";

const rowSchema = z.object({
  full_name:     z.string().min(1).max(100).trim(),
  email:         z.email().optional().or(z.literal("")),
  phone:         z.string().max(30).optional(),
  company:       z.string().max(200).optional(),
  website:       z.string().max(500).optional(),
  linkedin_url:  z.string().max(500).optional(),
  notes:         z.string().max(5000).optional(),
  pipeline_stage: z.enum(["lead","qualified","proposal","negotiation","won","lost"]).optional(),
  status:        z.enum(["new","contacted","qualified","won","lost"]).optional(),
});

const bodySchema = z.object({
  orgId: z.string().uuid(),
  rows:  z.array(rowSchema).max(500),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const memberships = await getActiveMemberships();

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { orgId, rows } = parsed.data;

    const isMember = memberships.some(m => m.organization.id === orgId);
    if (!isMember) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const supabase = await createClient();
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 50 to avoid request timeout
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50).map(row => ({
        organization_id: orgId,
        full_name:       row.full_name,
        email:           row.email || null,
        phone:           row.phone || null,
        company:         row.company || null,
        website:         row.website || null,
        linkedin_url:    row.linkedin_url || null,
        notes:           row.notes || null,
        pipeline_stage:  row.pipeline_stage ?? "lead",
        status:          row.status ?? "new",
        source:          "import",
        created_by:      session.userId,
      }));

      const { data, error } = await supabase
        .from("crm_contacts")
        .insert(batch)
        .select("id");

      if (error) {
        if (error.code === "23505") {
          skipped += batch.length;
        } else {
          errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        }
      } else {
        inserted += data?.length ?? 0;
      }
    }

    void logAuditEvent({
      organizationId: orgId,
      actorId: session.userId,
      action: "crm_contacts.imported",
      targetType: "crm_contact",
      metadata: { inserted, skipped, total: rows.length },
    });

    return NextResponse.json({ inserted, skipped, errors });
  } catch (e) {
    logger.error("[crm/import] Error", { error: String(e) });
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
