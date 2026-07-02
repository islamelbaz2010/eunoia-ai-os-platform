"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

export function CrmSearch({
  defaultValue,
  buildUrl,
}: {
  defaultValue: string;
  buildUrl: (params: Record<string, string | undefined>) => string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(() => {
        router.push(buildUrl({ q: q || undefined, page: "1" }));
      });
    }, 300);
  }

  return (
    <div className="relative w-full max-w-xs">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        placeholder="Search contacts…"
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full rounded-lg border border-border bg-white/5 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-accent/60"
      />
    </div>
  );
}
