import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";

export default async function AuditLogsPage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const { data: logs } = membership
    ? await supabase
        .from("audit_logs")
        .select("id, action, target_type, target_id, created_at")
        .eq("organization_id", membership.organization.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-white/60">
          A record of actions taken across your organization.
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Target</th>
              <th className="px-5 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">{log.action}</td>
                <td className="px-5 py-3 text-white/60">
                  {log.target_type ?? "—"}
                </td>
                <td className="px-5 py-3 text-white/60">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-white/40">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
