import { Users, BookOpen, MessageSquare, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";

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

export default async function DashboardPage() {
  const membership = await getActiveOrganization();
  const kpis = await getKpis(membership?.organization.id);

  const cards = [
    { label: "CRM Contacts", value: kpis.contacts, icon: Users },
    { label: "Knowledge Base Docs", value: kpis.documents, icon: BookOpen },
    { label: "Usage Events (30d)", value: kpis.usageEvents, icon: Activity },
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
    </div>
  );
}
