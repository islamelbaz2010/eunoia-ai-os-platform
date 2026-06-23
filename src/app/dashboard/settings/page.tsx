import { getActiveOrganization, getProfile } from "@/lib/auth/dal";

export default async function SettingsPage() {
  const profile = await getProfile();
  const membership = await getActiveOrganization();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-white/60">Account and organization settings.</p>
      </div>

      <div className="glass-panel p-5">
        <h2 className="text-sm font-medium text-white/70">Account</h2>
        <p className="mt-2 text-sm text-white/60">Name: {profile?.full_name ?? "—"}</p>
      </div>

      <div className="glass-panel p-5">
        <h2 className="text-sm font-medium text-white/70">Organization</h2>
        <p className="mt-2 text-sm text-white/60">
          {membership?.organization.name ?? "No organization"} ({membership?.role ?? "—"})
        </p>
      </div>
    </div>
  );
}
