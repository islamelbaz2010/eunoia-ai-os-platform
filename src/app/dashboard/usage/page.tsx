import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";

export default async function UsagePage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const { data: totals } = membership
    ? await supabase.rpc("get_usage_totals", { org_id: membership.organization.id })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-white/60">
          Track activity across CRM, Knowledge Base, and the RAG Assistant.
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
          <p className="text-white/40">No usage recorded yet.</p>
        )}
      </div>
    </div>
  );
}
