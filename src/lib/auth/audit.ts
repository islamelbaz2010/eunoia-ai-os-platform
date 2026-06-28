import "server-only";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// These helpers are intentionally fire-and-forget: a failure in audit/usage
// logging must never surface to the user or roll back a successful operation.

export async function logAuditEvent(params: {
  organizationId: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    logger.error("[audit] Failed to write audit log", {
      action: params.action,
      orgId: params.organizationId,
      error: String(err),
    });
  }
}

export async function logUsageEvent(params: {
  organizationId: string;
  actorId: string;
  eventType: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("usage_events").insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      event_type: params.eventType,
      quantity: params.quantity ?? 1,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    logger.error("[audit] Failed to write usage event", {
      eventType: params.eventType,
      orgId: params.organizationId,
      error: String(err),
    });
  }
}
