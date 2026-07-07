import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: readonly EmptyStateAction[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-5 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <Icon size={20} className="text-accent-2" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
        {description}
      </p>
      {actions.length > 0 && (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === "secondary"
                  ? "rounded-lg border border-border px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
                  : "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
