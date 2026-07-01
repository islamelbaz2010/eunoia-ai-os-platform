import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";

type UsageTotals = { event_type: string; total: number };

export default async function UsagePage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  let totals: UsageTotals[] = [];
  if (membership) {
    // Try the O(1) SQL RPC first; fall back to in-memory aggregation if
    // the migration has not yet been applied in this environment.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "get_usage_totals",
      { org_id: membership.organization.id }
    );

    if (!rpcError && rpcResult) {
      totals = rpcResult as UsageTotals[];
    } else {
      const { data: events } = await supabase
        .from("usage_events")
        .select("event_type")
        .eq("organization_id", membership.organization.id)
        .limit(10000);

      if (events && events.length > 0) {
        const counts = (events as { event_type: string }[]).reduce<Record<string, number>>(
          (acc, e) => { acc[e.event_type] = (acc[e.event_type] ?? 0) + 1; return acc; },
          {}
        );
        totals = Object.entries(counts)
          .map(([event_type, total]) => ({ event_type, total }))
          .sort((a, b) => b.total - a.total);
      }
    }
  }

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
