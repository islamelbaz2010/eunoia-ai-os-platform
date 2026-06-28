"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  book: BookOpen,
  bot: Bot,
  audit: ScrollText,
  usage: BarChart3,
  admin: ShieldCheck,
  settings: Settings,
};

export type IconName = keyof typeof icons;

export function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const Icon = icons[icon];

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
