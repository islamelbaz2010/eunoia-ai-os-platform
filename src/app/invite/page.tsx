import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/dal";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  await verifySession();
  const { token } = searchParams;

  if (!token) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_org_invite", {
    invite_token: token,
  });

  if (!error) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Invite invalid or expired</h1>
        <p className="mt-2 text-sm text-white/60">
          This invite link is no longer valid. Please ask your administrator for a new invite.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Go to dashboard
        </a>
      </div>
    </main>
  );
}
