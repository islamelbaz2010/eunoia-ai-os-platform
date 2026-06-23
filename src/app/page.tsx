import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-white/60">
        AI Operating System for Hospitality
      </span>
      <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Eunoia AI OS
      </h1>
      <p className="mt-4 max-w-xl text-base text-white/60">
        Built for hotels, resorts, hospitality groups, and diving centers across Egypt,
        the UAE, and Saudi Arabia.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-white/5"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
