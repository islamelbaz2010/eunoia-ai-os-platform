import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { EmptyState } from "../empty-state";

type UsageTotals = { event_type: string; total: number };

export default async function UsagePage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  let totals: UsageTotals[] = [];
  if (membership) {
    const { data } = await supabase.rpc("get_usage_totals", {
      org_id: membership.organization.id,
    });
    totals = (data ?? []) as UsageTotals[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
          Track activity across CRM, Knowledge Base, and the RAG Assistant. This page starts filling in as your team uses the workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(totals ?? []).map(({ event_type, total }: { event_type: string; total: number }) => (
          <div key={event_type} className="kpi-card p-5">
            <p className="text-sm capitalize text-white/60">
              {event_type.replaceAll("_", " ")}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{total}</p>
          </div>
        ))}
        {(!totals || totals.length === 0) && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              icon={Activity}
              title="No usage recorded yet"
              description="Ask one AI question, add a knowledge document, or update CRM to create the first usage events."
              actions={[
                { href: "/dashboard/assistant", label: "Ask AI" },
                { href: "/dashboard/knowledge-base", label: "Add knowledge", variant: "secondary" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
