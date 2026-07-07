import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import {
  getActiveOrganization,
  getActiveMemberships,
  getProfile,
  verifySession,
} from "@/lib/auth/dal";
import { NavLink } from "./nav-link";
import type { IconName } from "./nav-link";
import { logout } from "@/lib/auth/actions";
import { OrgSwitcher } from "./org-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();
  const profile = await getProfile();
  const membership = await getActiveOrganization();
  const memberships = await getActiveMemberships();

  if (!membership && !profile?.is_super_admin) {
    redirect("/onboarding");
  }

  const navItems: { href: string; icon: IconName; label: string }[] = [
    { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/dashboard/crm", icon: "users", label: "CRM" },
    { href: "/dashboard/knowledge-base", icon: "book", label: "Knowledge Base" },
    { href: "/dashboard/assistant", icon: "bot", label: "RAG Assistant" },
    { href: "/dashboard/audit-logs", icon: "audit", label: "Audit Logs" },
    { href: "/dashboard/usage", icon: "usage", label: "Usage" },
    { href: "/dashboard/billing", icon: "billing", label: "Billing" },
  ];

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-64 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur-xl sm:flex">
        <div className="px-2 py-3">
          <p className="text-lg font-semibold tracking-tight">Eunoia AI OS</p>
          {memberships.length > 1 ? (
            <div className="mt-1">
              <OrgSwitcher
                memberships={memberships}
                activeOrgId={membership?.organization.id ?? ""}
              />
            </div>
          ) : (
            <p className="mt-0.5 truncate text-xs text-white/50">
              {membership?.organization.name ?? "No organization"}
            </p>
          )}
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {profile?.is_super_admin && (
            <NavLink href="/dashboard/admin" icon="admin" label="Super Admin" />
          )}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
          <NavLink href="/dashboard/settings" icon="settings" label="Settings" />
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {membership?.role && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-white/40 capitalize">
                {membership.role.replace("_", " ")}
              </span>
            )}
            {membership?.organization.subscription_tier && membership.organization.subscription_tier !== "free" && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-white/40 uppercase">
                {membership.organization.subscription_tier}
              </span>
            )}
          </div>
          <p className="text-sm text-white/70">{profile?.full_name ?? ""}</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
