import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bot,
  ScrollText,
  BarChart3,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { getActiveOrganization, getProfile, verifySession } from "@/lib/auth/dal";
import { NavLink } from "./nav-link";
import { logout } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();
  const profile = await getProfile();
  const membership = await getActiveOrganization();

  if (!membership) {
    redirect("/onboarding");
  }

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/crm", icon: Users, label: "CRM" },
    { href: "/dashboard/knowledge-base", icon: BookOpen, label: "Knowledge Base" },
    { href: "/dashboard/assistant", icon: Bot, label: "RAG Assistant" },
    { href: "/dashboard/audit-logs", icon: ScrollText, label: "Audit Logs" },
    { href: "/dashboard/usage", icon: BarChart3, label: "Usage" },
  ];

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-64 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur-xl sm:flex">
        <div className="px-2 py-3">
          <p className="text-lg font-semibold tracking-tight">Eunoia AI OS</p>
          <p className="mt-0.5 truncate text-xs text-white/50">
            {membership?.organization.name ?? "No organization"}
          </p>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {profile?.is_super_admin && (
            <NavLink href="/dashboard/admin" icon={ShieldCheck} label="Super Admin" />
          )}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
          <NavLink href="/dashboard/settings" icon={Settings} label="Settings" />
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
          <p className="text-sm text-white/50">
            {membership?.role ? `Role: ${membership.role}` : ""}
          </p>
          <p className="text-sm text-white/70">{profile?.full_name ?? ""}</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
