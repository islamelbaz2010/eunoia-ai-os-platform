import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/dal";

export default async function SuperAdminPage() {
  const profile = await getProfile();

  if (!profile?.is_super_admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Platform-wide visibility across all organizations.
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">Organization</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(organizations ?? []).map((org) => (
              <tr key={org.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">{org.name}</td>
                <td className="px-5 py-3 text-white/60">{org.slug}</td>
                <td className="px-5 py-3 text-white/60">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!organizations || organizations.length === 0) && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-white/40">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
