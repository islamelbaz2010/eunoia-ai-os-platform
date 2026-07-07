"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/auth/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#22d3ee] shadow-lg shadow-indigo-500/25">
              <span className="text-xs font-bold text-white">E</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Eunoia AI OS</span>
          </Link>
          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-white">
            Your team&apos;s hospitality knowledge, ready when the shift starts.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/58">
            Sign in to ask cited AI questions, update CRM activity, and keep your property&apos;s operating knowledge in one private workspace.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["Private RAG", "Team CRM", "Audit trail"].map((item) => (
              <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/65">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="glass-panel w-full p-8">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white lg:hidden">
            <span aria-hidden="true">←</span>
            Eunoia AI OS
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Continue to your AI workspace. Your active organization will open automatically.
          </p>

          <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="you@hotel.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-white/70">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <div className="rounded-lg border border-red-400/25 bg-red-400/8 px-3 py-2 text-sm text-red-200">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Opening workspace..." : "Sign in"}
          </button>

          <p className="text-right text-sm">
            <Link href="/auth/forgot-password" className="text-white/50 hover:text-white/80">
              Forgot password?
            </Link>
          </p>
          </form>

          <p className="mt-6 text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent-2 hover:underline">
              Start a workspace
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
