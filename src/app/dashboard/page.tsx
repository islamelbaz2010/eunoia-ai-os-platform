import Link from "next/link";
import { Users, BookOpen, MessageSquare, Activity, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { UsageChart } from "./usage-chart";
import { StatusChart } from "./status-chart";

type CrmMetrics = {
  total_contacts: number;
  new_contacts_30d: number;
  qualified_count: number;
  won_count: number;
  lost_count: number;
  pipeline_count: number;
  pipeline_value: number | null;
  conversion_rate: number | null;
};

async function getKpis(organizationId: string | undefined) {
  if (!organizationId) {
    return { contacts: 0, documents: 0, usageEvents: 0, auditEvents: 0 };
  }

  const supabase = await createClient();

  const [contacts, documents, usageEvents, auditEvents] = await Promise.all([
    supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("knowledge_base_documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  return {
    contacts: contacts.count ?? 0,
    documents: documents.count ?? 0,
    usageEvents: usageEvents.count ?? 0,
    auditEvents: auditEvents.count ?? 0,
  };
}

async function getCrmMetrics(organizationId: string | undefined): Promise<CrmMetrics | null> {
  if (!organizationId) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_crm_metrics", { org_id: organizationId });
  return (data as CrmMetrics | null) ?? null;
}

async function getUsageOverTime(organizationId: string | undefined) {
  if (!organizationId) return [];
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 14);

  // Fetch only created_at, bounded to 14 days and capped at 2000 rows.
  // For high-volume orgs a proper SQL DATE_TRUNC aggregation is preferred,
  // but this is correct for early-stage traffic.
  const { data } = await supabase
    .from("usage_events")
    .select("created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", since.toISOString())
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const date = new Date(row.created_at).toISOString().slice(5, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

async function getContactStatusBreakdown(organizationId: string | undefined) {
  if (!organizationId) return [];
  const supabase = await createClient();

  // Fetch only the status column, capped at 5000 rows.
  // The distinct-value set for crm_lead_status is fixed (5 values) so
  // JavaScript aggregation is safe at this cardinality.
  const { data } = await supabase
    .from("crm_contacts")
    .select("status")
    .eq("organization_id", organizationId)
    .limit(5000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

export default async function DashboardPage() {
  const membership = await getActiveOrganization();
  const orgId = membership?.organization.id;

  const [kpis, usageOverTime, statusBreakdown, crmMetrics] = await Promise.all([
    getKpis(orgId),
    getUsageOverTime(orgId),
    getContactStatusBreakdown(orgId),
    getCrmMetrics(orgId),
  ]);

  const cards = [
    { label: "CRM Contacts", value: kpis.contacts, icon: Users },
    { label: "Knowledge Base Docs", value: kpis.documents, icon: BookOpen },
    { label: "Usage Events", value: kpis.usageEvents, icon: Activity },
    { label: "Audit Events", value: kpis.auditEvents, icon: MessageSquare },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-white/60">
        Welcome to your Eunoia AI OS workspace.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="kpi-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">{card.label}</p>
              <card.icon size={18} className="text-accent-2" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* CRM Pipeline Metrics */}
      {crmMetrics && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-white/70">CRM Pipeline</p>
            <Link href="/dashboard/crm" className="text-xs text-accent hover:underline">View CRM →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "New (30d)", value: crmMetrics.new_contacts_30d },
              { label: "Qualified", value: crmMetrics.qualified_count },
              { label: "In Pipeline", value: crmMetrics.pipeline_count },
              { label: "Won", value: crmMetrics.won_count },
              { label: "Lost", value: crmMetrics.lost_count },
              {
                label: "Conversion",
                value: crmMetrics.conversion_rate !== null
                  ? `${Math.round(crmMetrics.conversion_rate)}%`
                  : "—",
              },
            ].map(c => (
              <div key={c.label} className="kpi-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/50">{c.label}</p>
                  <TrendingUp size={12} className="text-accent/40" />
                </div>
                <p className="text-xl font-semibold">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5 lg:col-span-2">
          <p className="text-sm font-medium text-white/70">Usage — last 14 days</p>
          <div className="mt-2">
            {usageOverTime.length > 0 ? (
              <UsageChart data={usageOverTime} />
            ) : (
              <p className="py-16 text-center text-sm text-white/40">
                No usage data yet.
              </p>
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <p className="text-sm font-medium text-white/70">Contact status</p>
          <div className="mt-2">
            {statusBreakdown.length > 0 ? (
              <StatusChart data={statusBreakdown} />
            ) : (
              <p className="py-16 text-center text-sm text-white/40">
                No contacts yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
