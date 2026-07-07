import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan, type BillingSubscription, type PlanLimits } from "./plans";
import type { Organization } from "@/lib/types";

// Fetch the billing subscription for an org. Returns null if not found.
export async function getBillingSubscription(orgId: string): Promise<BillingSubscription | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .single();
  return data as BillingSubscription | null;
}

// Resolve the effective plan limits for an org. Fetches billing subscription.
export async function getOrgPlanLimits(org: Organization): Promise<PlanLimits> {
  const billing = await getBillingSubscription(org.id);
  return getEffectivePlan(billing).limits;
}

// Returns an error string if the limit is exceeded, or null if the action is allowed.

export async function checkMemberLimit(org: Organization): Promise<string | null> {
  const billing = await getBillingSubscription(org.id);
  const plan = getEffectivePlan(billing);
  if (plan.limits.members === null) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  if ((count ?? 0) >= plan.limits.members) {
    return `Your ${plan.name} plan allows up to ${plan.limits.members} team member${plan.limits.members === 1 ? "" : "s"}. Upgrade to add more.`;
  }
  return null;
}

export async function checkContactLimit(org: Organization): Promise<string | null> {
  const billing = await getBillingSubscription(org.id);
  const plan = getEffectivePlan(billing);
  if (plan.limits.contacts === null) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("crm_contacts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .is("deleted_at", null)
    .is("archived_at", null);

  if ((count ?? 0) >= plan.limits.contacts) {
    return `Your ${plan.name} plan allows up to ${plan.limits.contacts} contacts. Upgrade to add more.`;
  }
  return null;
}

export async function checkDocumentLimit(org: Organization): Promise<string | null> {
  const billing = await getBillingSubscription(org.id);
  const plan = getEffectivePlan(billing);
  if (plan.limits.kbDocuments === null) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("knowledge_base_documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  if ((count ?? 0) >= plan.limits.kbDocuments) {
    return `Your ${plan.name} plan allows up to ${plan.limits.kbDocuments} Knowledge Base documents. Upgrade to add more.`;
  }
  return null;
}

export async function checkCsvExportAllowed(org: Organization): Promise<string | null> {
  const billing = await getBillingSubscription(org.id);
  const plan = getEffectivePlan(billing);
  if (!plan.limits.csvExport) {
    return `CSV export is not available on the ${plan.name} plan. Upgrade to Starter or Pro to export contacts.`;
  }
  return null;
}

export async function checkAiInsightsAllowed(org: Organization): Promise<string | null> {
  const billing = await getBillingSubscription(org.id);
  const plan = getEffectivePlan(billing);
  if (!plan.limits.aiInsights) {
    return `AI Insights are not available on the ${plan.name} plan. Upgrade to Pro for per-contact AI analysis.`;
  }
  return null;
}

// Returns the AI query rate limit (per hour) for the org's effective plan.
// Returns null for unlimited.
export async function getAiQueryRateLimit(orgId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .single();
  const plan = getEffectivePlan(data as BillingSubscription | null);
  return plan.limits.aiQueriesPerHour;
}
