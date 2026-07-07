import Link from "next/link";
import { Users, BookOpen, MessageSquare, Activity, TrendingUp, Bot, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { UsageChart } from "./usage-chart";
import { StatusChart } from "./status-chart";
import { EmptyState } from "./empty-state";

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
  const isFirstRun = kpis.contacts === 0 && kpis.documents === 0 && kpis.usageEvents === 0;
  const setupSteps = [
    {
      title: "Add your first knowledge document",
      description: "Paste a policy, menu, FAQ, or SOP so the assistant has trusted source material.",
      href: "/dashboard/knowledge-base",
      cta: "Add knowledge",
      icon: BookOpen,
    },
    {
      title: "Ask a cited AI question",
      description: "Test the assistant with a real staff question and verify the source panel.",
      href: "/dashboard/assistant",
      cta: "Ask assistant",
      icon: Bot,
    },
    {
      title: "Add a CRM contact",
      description: "Capture a lead, travel agent, guest, or partner to see the pipeline come alive.",
      href: "/dashboard/crm",
      cta: "Add contact",
      icon: Users,
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-2">
            {membership?.organization.name ?? "Workspace"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
            {isFirstRun
              ? "Your workspace is ready. Start with knowledge, then test the assistant and add the first CRM contact."
              : "Monitor knowledge, CRM, usage, and audit activity across your hospitality workspace."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/assistant" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            Ask AI
          </Link>
          <Link href="/dashboard/knowledge-base" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
            Add knowledge
          </Link>
        </div>
      </div>

      {isFirstRun && (
        <section className="mt-6 rounded-2xl border border-accent/20 bg-accent/8 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">First five minutes</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/58">
                Complete these three actions to turn an empty workspace into a working customer demo.
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
              0 of 3 completed
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {setupSteps.map((step, index) => (
              <Link
                key={step.href}
                href={step.href}
                className="group rounded-xl border border-white/10 bg-[#08090d]/45 p-4 transition hover:border-accent/35 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent-2">
                    <step.icon size={17} />
                  </span>
                  <ArrowRight size={16} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-white">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/50">{step.description}</p>
                  <p className="mt-3 text-xs font-medium text-accent-2">{step.cta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
              <EmptyState
                icon={Activity}
                title="Usage will appear after the first action"
                description="Ask the assistant, add knowledge, or update CRM records to start building an activity timeline."
                actions={[
                  { href: "/dashboard/assistant", label: "Ask AI" },
                  { href: "/dashboard/knowledge-base", label: "Add knowledge", variant: "secondary" },
                ]}
              />
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <p className="text-sm font-medium text-white/70">Contact status</p>
          <div className="mt-2">
            {statusBreakdown.length > 0 ? (
              <StatusChart data={statusBreakdown} />
            ) : (
              <EmptyState
                icon={Users}
                title="No contacts yet"
                description="Add your first lead, guest, travel agent, or partner to start tracking pipeline health."
                actions={[{ href: "/dashboard/crm", label: "Open CRM" }]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
