import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, getProfile } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import { InviteForm } from "./invite-form";
import { InviteRow } from "./invite-row";
import { MemberRow } from "./member-row";

export default async function SettingsPage() {
  const profile = await getProfile();
  const membership = await getActiveOrganization();
  const canManage = membership ? hasRole(membership.role, "admin") : false;
  const isOwner = membership?.role === "owner";

  const supabase = await createClient();

  const { data: members } = membership
    ? await supabase
        .from("organization_members")
        .select("id, role, profile:profiles(id, full_name)")
        .eq("organization_id", membership.organization.id)
        .limit(100)
    : { data: [] };

  const { data: invites } = membership && canManage
    ? await supabase
        .from("organization_invites")
        .select("id, email, role")
        .eq("organization_id", membership.organization.id)
        .eq("status", "pending")
        .limit(50)
    : { data: [] };

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

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-sm font-medium text-white/70">Members</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((member) => (
              <MemberRow
                key={member.id}
                memberId={member.id}
                name={
                  (member.profile as unknown as { full_name: string | null })
                    ?.full_name ?? "—"
                }
                role={member.role}
                canManage={canManage}
                isOwner={isOwner}
              />
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="glass-panel p-5">
          <h2 className="text-sm font-medium text-white/70">Invite a teammate</h2>
          <div className="mt-3">
            <InviteForm isOwner={isOwner} />
          </div>

          {(invites ?? []).length > 0 && (
            <table className="mt-5 w-full text-left text-sm">
              <thead className="border-b border-border text-white/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(invites ?? []).map((invite) => (
                  <InviteRow
                    key={invite.id}
                    inviteId={invite.id}
                    email={invite.email}
                    role={invite.role}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
