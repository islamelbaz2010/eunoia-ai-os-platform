"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/auth/actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

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
            Build the private AI brain for your hospitality team.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/58">
            Create your account, name your workspace, then add the first policy, menu, SOP, or lead. The first setup takes a few focused minutes.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "Create account",
              "Name your workspace",
              "Upload knowledge or add a contact",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/65">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-accent-2">
                  {index + 1}
                </span>
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
          <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Start with a secure login. You&apos;ll create your organization workspace next.
          </p>

          <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fullName" className="text-sm text-white/70">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Jane Doe"
            />
          </div>
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
              placeholder="At least 8 characters"
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
            {pending ? "Creating secure account..." : "Create account"}
          </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-white/40">
            No credit card needed for setup. Invite your team after the workspace is ready.
          </p>

          <p className="mt-6 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
