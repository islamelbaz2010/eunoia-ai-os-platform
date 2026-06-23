import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function logAuditEvent(params: {
  organizationId: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    metadata: params.metadata ?? {},
  });
}

export async function logUsageEvent(params: {
  organizationId: string;
  actorId: string;
  eventType: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    event_type: params.eventType,
    quantity: params.quantity ?? 1,
    metadata: params.metadata ?? {},
  });
}
