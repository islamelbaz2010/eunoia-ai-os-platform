import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifySession, getMemberships } from "@/lib/auth/dal";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await verifySession();
  const memberships = await getMemberships();

  if (memberships.length > 0) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: pendingInvites } = await supabase
    .from("organization_invites")
    .select("id, token, role, organization:organizations(name)")
    .eq("email", session.email)
    .eq("status", "pending");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-1 text-sm text-white/60">
          Every account belongs to an organization. Create yours to continue.
        </p>

        {pendingInvites && pendingInvites.length > 0 && (
          <div className="mt-6 space-y-2 rounded-lg border border-border bg-white/5 p-4">
            <p className="text-sm text-white/70">You have a pending invitation:</p>
            {pendingInvites.map((invite) => (
              <a
                key={invite.id}
                href={`/invite?token=${invite.token}`}
                className="block rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
              >
                Join {(invite.organization as unknown as { name: string } | null)?.name ?? "organization"}
              </a>
            ))}
            <p className="text-center text-xs text-white/40">— or create your own workspace below —</p>
          </div>
        )}

        <OnboardingForm />
      </div>
    </main>
  );
}
